import type { FastifyPluginAsync } from "fastify";
import { buildAvailableUnitBleIds } from "../ble/mappings/mapping.service.js";
import { requireRoles, requireSuperAdmin } from "../../plugins/index.js";

interface InstitutionCreateBody {
  name: string;
}
interface InstitutionQueryParams {
  id?: string;
}
interface SetupUnitInput {
  name: string;
  code: string;
}
interface SetupSemesterInput {
  name: string;
  semesterNum: number;
  units?: SetupUnitInput[];
}
interface SetupYearInput {
  yearNumber: number;
  semesters?: SetupSemesterInput[];
}
interface SetupCourseInput {
  name: string;
  duration: number;
  years?: SetupYearInput[];
}
interface SetupBody {
  courses: SetupCourseInput[];
}
interface SetupParams {
  institutionId: string;
}

const superAdminAccess = { preHandler: requireSuperAdmin() };
const institutionListAccess = {
  preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN"),
};
const institutionSetupAccess = {
  preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN"),
};

export function canAccessInstitution(
  request: { user: { role: string; institutionId: string | null } },
  institutionId: string,
) {
  return (
    request.user.role === "SUPER_ADMIN" ||
    request.user.institutionId === institutionId
  );
}

export function canListInstitutions(user: {
  role: string;
  institutionId: string | null;
}) {
  return user.role === "SUPER_ADMIN" || user.role === "INSTITUTION_ADMIN";
}

export function buildInstitutionListWhere(user: {
  role: string;
  institutionId: string | null;
}) {
  if (user.role === "SUPER_ADMIN") return {};
  if (user.role === "INSTITUTION_ADMIN" && user.institutionId)
    return { id: user.institutionId };
  return { id: "__no_institution__" };
}

function clean(value: string | undefined) {
  return value?.trim() ?? "";
}

export const institutionRoutes: FastifyPluginAsync = async (app) => {
  app.get("/public", async (_request, reply) => {
    const institutions = await app.prisma.institution.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    });

    return reply.send({ institutions });
  });

  const listInstitutions = async (
    request: { user: { role: string; institutionId: string | null } },
    reply: { send: (value: unknown) => unknown },
  ) => {
    if (!canListInstitutions(request.user))
      return reply.send({ institutions: [] });

    const institutions = await app.prisma.institution.findMany({
      where: buildInstitutionListWhere(request.user),
      orderBy: { createdAt: "desc" },
    });

    return reply.send({
      institutions: institutions.map((institution) => ({
        id: institution.id,
        name: institution.name,
        metadata: institution.metadata,
      })),
    });
  };

  app.get("/", institutionListAccess, listInstitutions);
  app.get("/institutions", institutionListAccess, listInstitutions);

  const createInstitution = async (
    request: { body: InstitutionCreateBody },
    reply: { code: (status: number) => { send: (value: unknown) => unknown } },
  ) => {
    const name = clean(request.body.name);
    if (!name)
      return reply.code(400).send({ error: "Institution name is required" });
    const institution = await app.prisma.institution.create({ data: { name } });
    return reply.code(201).send({ institution });
  };

  app.post<{ Body: InstitutionCreateBody }>(
    "/",
    superAdminAccess,
    createInstitution,
  );
  app.post<{ Body: InstitutionCreateBody }>(
    "/institutions",
    superAdminAccess,
    createInstitution,
  );

  const deleteInstitution = async (
    request: { query: InstitutionQueryParams },
    reply: {
      code: (status: number) => { send: (value: unknown) => unknown };
      send: (value: unknown) => unknown;
    },
  ) => {
    if (!request.query.id)
      return reply.code(400).send({ error: "Institution ID is required" });
    await app.prisma.institution.delete({ where: { id: request.query.id } });
    return reply.send({ success: true });
  };

  app.delete<{ Querystring: InstitutionQueryParams }>(
    "/",
    superAdminAccess,
    deleteInstitution,
  );
  app.delete<{ Querystring: InstitutionQueryParams }>(
    "/institutions",
    superAdminAccess,
    deleteInstitution,
  );

  app.get<{ Params: SetupParams }>(
    "/:institutionId/setup",
    institutionSetupAccess,
    async (request, reply) => {
      if (!canAccessInstitution(request, request.params.institutionId))
        return reply
          .code(403)
          .send({
            error:
              "Only a super admin or the owning institution admin can access institution setup",
          });

      const courses = await app.prisma.course.findMany({
        where: { institutionId: request.params.institutionId },
        orderBy: { name: "asc" },
        include: {
          years: {
            orderBy: { yearNumber: "asc" },
            include: {
              semester: {
                orderBy: { semesterNumber: "asc" },
                include: { units: { orderBy: { code: "asc" } } },
              },
            },
          },
        },
      });

      return reply.send({
        courses: courses.map((course) => ({
          id: course.id,
          name: course.name,
          duration: course.years.length || 1,
          years: course.years.map((year) => ({
            id: year.id,
            yearNumber: year.yearNumber,
            courseId: course.id,
            semesters: year.semester.map((semester) => ({
              id: semester.id,
              name: semester.name,
              semesterNum: semester.semesterNumber,
              yearId: year.id,
              units: semester.units.map((unit) => ({
                id: unit.id,
                name: unit.name,
                code: unit.code,
                semesterId: semester.id,
              })),
            })),
          })),
        })),
      });
    },
  );

  app.post<{ Params: SetupParams; Body: SetupBody }>(
    "/:institutionId/setup",
    institutionSetupAccess,
    async (request, reply) => {
      const institutionId = request.params.institutionId;
      if (!canAccessInstitution(request, institutionId))
        return reply
          .code(403)
          .send({
            error:
              "Only a super admin or the owning institution admin can update institution setup",
          });
      if (!Array.isArray(request.body.courses))
        return reply.code(400).send({ error: "Courses must be an array" });

      await app.prisma.$transaction(async (transaction) => {
        const allUsedBleIds = new Set(
          (
            await transaction.unit.findMany({
              where: { bleId: { not: null } },
              select: { bleId: true },
            })
          ).flatMap((unit) => (unit.bleId ? [unit.bleId] : [])),
        );

        for (const courseInput of request.body.courses) {
          const courseName = clean(courseInput.name);
          if (!courseName) continue;
          let course = await transaction.course.findFirst({
            where: { institutionId, name: courseName },
          });
          if (!course)
            course = await transaction.course.create({
              data: { name: courseName, institutionId },
            });

          for (const yearInput of courseInput.years ?? []) {
            if (
              !Number.isInteger(yearInput.yearNumber) ||
              yearInput.yearNumber < 1
            )
              continue;
            const year = await transaction.courseYear.upsert({
              where: {
                courseId_yearNumber: {
                  courseId: course.id,
                  yearNumber: yearInput.yearNumber,
                },
              },
              update: {},
              create: { courseId: course.id, yearNumber: yearInput.yearNumber },
            });
            for (const semesterInput of yearInput.semesters ?? []) {
              const semesterNumber =
                Number.isInteger(semesterInput.semesterNum) &&
                semesterInput.semesterNum > 0
                  ? semesterInput.semesterNum
                  : 1;
              const semester = await transaction.semester.upsert({
                where: {
                  courseYearId_semesterNumber: {
                    courseYearId: year.id,
                    semesterNumber,
                  },
                },
                update: {
                  name:
                    clean(semesterInput.name) || `Semester ${semesterNumber}`,
                },
                create: {
                  courseYearId: year.id,
                  semesterNumber,
                  name:
                    clean(semesterInput.name) || `Semester ${semesterNumber}`,
                },
              });

              for (const unitInput of semesterInput.units ?? []) {
                const code = clean(unitInput.code).toUpperCase();
                const name = clean(unitInput.name);
                if (!code || !name) continue;

                const existingUnit = await transaction.unit.findFirst({
                  where: { semesterId: semester.id, code },
                });
                if (existingUnit) {
                  const nextBleId =
                    existingUnit.bleId ??
                    buildAvailableUnitBleIds(allUsedBleIds, 1)[0];
                  await transaction.unit.update({
                    where: { id: existingUnit.id },
                    data: {
                      code,
                      name,
                      bleId: existingUnit.bleId ?? nextBleId,
                    },
                  });
                  if (!existingUnit.bleId) allUsedBleIds.add(nextBleId);
                } else {
                  const [nextBleId] = buildAvailableUnitBleIds(
                    allUsedBleIds,
                    1,
                  );
                  await transaction.unit.create({
                    data: {
                      semesterId: semester.id,
                      code,
                      name,
                      bleId: nextBleId,
                    },
                  });
                  allUsedBleIds.add(nextBleId);
                }
              }
            }
          }
        }
      });

      return reply.send({ success: true, message: "Academic setup saved" });
    },
  );
};
