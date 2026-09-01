import type { FastifyPluginAsync } from "fastify";
import {
  importLecturers,
  type ImportRequest,
  type ImportResponse,
} from "./lecturer.service.js";
import { hashPassword, verifyPassword } from "../admin/admin.service.js";
import {
  requireAttendanceRole,
  requireRoles,
  requireSuperAdmin,
} from "../../plugins/index.js";
import { cleanIdentifier } from "../../shared/identifiers.js";

interface LoginBody {
  email: string;
  password: string;
}

interface LecturerVerificationBody {
  institutionId: string;
  staffNumber: string;
}

interface LecturerRegistrationBody extends LecturerVerificationBody {
  name: string;
  email: string;
  password: string;
}

interface BulkCreateBody {
  institutionId: string;
  lecturers: Array<{ name: string; staffNumber: string; email?: string }>;
}

interface TeachingUnitSelection {
  unitId: string;
  // Which course(s) this lecturer teaches this unit for, when it's offered
  // under more than one. Omitted/null/empty = unrestricted - the lecturer
  // teaches every course this unit is offered under (today's default, and
  // the only possibility for the common case of a unit offered under just
  // one course).
  courseIds?: string[] | null;
}

interface TeachingUnitSelectionBody {
  selections?: TeachingUnitSelection[];
  // Legacy shape, still sent by the mobile app (which has no course
  // concept at all) - treated as `selections` with every unit unrestricted.
  unitIds?: string[];
}

// Rows read back from LecturerUnit for one lecturer, grouped per unit: a
// null courseId anywhere in the group means unrestricted for that unit.
function groupLecturerUnitAssignments(
  rows: Array<{ unitId: string; courseId: string | null }>,
): Array<{ unitId: string; courseIds: string[] | null }> {
  const byUnit = new Map<string, Set<string | null>>();
  for (const { unitId, courseId } of rows) {
    const set = byUnit.get(unitId) ?? new Set<string | null>();
    set.add(courseId);
    byUnit.set(unitId, set);
  }
  return [...byUnit.entries()].map(([unitId, courseIdSet]) => ({
    unitId,
    courseIds: courseIdSet.has(null)
      ? null
      : [...courseIdSet].filter((id): id is string => id !== null),
  }));
}

export const lecturerRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/me",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const lecturer = await app.prisma.lecturer.findUnique({
        where: { id: request.user.id },
        select: {
          id: true,
          fullName: true,
          email: true,
          staffNumber: true,
          institutionId: true,
          institution: { select: { name: true } },
          auth: { select: { email: true } },
        },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });

      return reply.send({
        userId: lecturer.id,
        name: lecturer.fullName,
        email: lecturer.email ?? lecturer.auth?.email ?? null,
        staffNumber: lecturer.staffNumber,
        institutionId: lecturer.institutionId,
        institutionName: lecturer.institution.name,
      });
    },
  );

  app.delete(
    "/me",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      await app.prisma.$transaction(async (transaction) => {
        await transaction.lecturerAuth.deleteMany({
          where: { lecturerId: request.user.id },
        });
        // Keep the institutional lecturer record and teaching history, but remove account credentials.
        await transaction.lecturer.update({
          where: { id: request.user.id },
          data: { email: null, passwordHash: null },
        });
      });
      return reply.send({ success: true });
    },
  );

  app.get<{ Querystring: { q?: string; limit?: string } }>(
    "/units/catalog",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const lecturer = await app.prisma.lecturer.findUnique({
        where: { id: request.user.id },
        select: { institutionId: true },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });

      const query = request.query.q?.trim() || "";
      const parsedLimit = Number.parseInt(request.query.limit || "50", 10);
      const limit = Number.isFinite(parsedLimit)
        ? Math.min(Math.max(parsedLimit, 1), 100)
        : 50;
      
      // Get units from Unit table, along with which course(s) each is
      // offered under - the frontend only needs to show a course picker
      // when a unit has more than one.
      const units = await app.prisma.unit.findMany({
        where: {
          institutionId: lecturer.institutionId,
          ...(query
            ? {
                OR: [
                  { code: { contains: query, mode: "insensitive" } },
                  { name: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        orderBy: { code: "asc" },
        take: limit,
        select: {
          id: true,
          code: true,
          name: true,
          bleId: true,
          offerings: {
            select: {
              semester: {
                select: {
                  courseYear: { select: { course: { select: { id: true, name: true } } } },
                },
              },
            },
          },
        },
      });

      const unitsWithCourses = units.map(({ offerings, ...unit }) => {
        const courseMap = new Map<string, { id: string; name: string }>();
        for (const offering of offerings) {
          const course = offering.semester.courseYear.course;
          if (!courseMap.has(course.id)) courseMap.set(course.id, course);
        }
        return { ...unit, courses: [...courseMap.values()] };
      });

      // Also get units from BleMapping that aren't in Unit table
      const unitCodes = new Set(units.map(u => u.code));
      const bleMappings = await app.prisma.bleMapping.findMany({
        where: {
          institutionId: lecturer.institutionId,
          ...(query
            ? {
                unitCode: { contains: query, mode: "insensitive" },
              }
            : {}),
        },
        orderBy: { unitCode: "asc" },
        take: limit,
        select: { unitCode: true, unitBleId: true },
      });

      // Add BleMapping units that don't exist in Unit table
      const additionalUnits = bleMappings
        .filter(mapping => mapping.unitCode && !unitCodes.has(mapping.unitCode))
        .map(mapping => ({
          id: `ble-${mapping.unitCode}`, // Synthetic ID for BleMapping units
          code: mapping.unitCode!,
          name: mapping.unitCode!, // Use code as name since we don't have a name field
          bleId: mapping.unitBleId,
          courses: [] as { id: string; name: string }[],
        }));

      const allUnits = [...unitsWithCourses, ...additionalUnits];

      const assignments = await app.prisma.lecturerUnit.findMany({
        where: { lecturerId: request.user.id },
        select: { unitId: true, courseId: true },
      });
      const selections = groupLecturerUnitAssignments(assignments);
      return reply.send({
        units: allUnits,
        // Legacy flat shape, kept for the mobile app (no course concept).
        selectedUnitIds: selections.map((s) => s.unitId),
        // Richer shape for the web UI's per-course scoping.
        selections,
      });
    },
  );

  app.get<{ Params: { unitCode: string } }>(
    "/units/:unitCode/roster",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const lecturer = await app.prisma.lecturer.findUnique({
        where: { id: request.user.id },
        select: { institutionId: true },
      });
      const unitCode = cleanIdentifier(request.params.unitCode);
      if (!lecturer || !unitCode)
        return reply.code(400).send({ error: "A valid unit code is required" });

      // First try to find unit with full hierarchy
      const unit = await app.prisma.unit.findFirst({
        where: {
          code: unitCode,
          institutionId: lecturer.institutionId,
        },
        select: {
          id: true,
          enrollments: {
            orderBy: { student: { admissionNumber: "asc" } },
            select: {
              student: {
                select: { id: true, name: true, admissionNumber: true, courseId: true },
              },
            },
          },
        },
      });

      // If unit not found in Unit table, query enrollments directly by
      // unitCode. This handles cases where unit exists in BleMapping but
      // not in Unit table - there's no Unit.id here for a LecturerUnit
      // course-scoping row to attach to, so nothing to narrow by.
      let enrollments = unit?.enrollments;
      if (!unit) {
        enrollments = await app.prisma.enrollment.findMany({
          where: {
            unit: {
              code: unitCode,
              institutionId: lecturer.institutionId,
            },
          },
          orderBy: { student: { admissionNumber: "asc" } },
          select: {
            student: {
              select: { id: true, name: true, admissionNumber: true, courseId: true },
            },
          },
        });
      }

      if (!enrollments || enrollments.length === 0) {
        // Return empty roster instead of 404 - unit exists but has no enrollments
        return reply.send({
          unitCode,
          students: [],
        });
      }

      // Narrow to this lecturer's course-scoped section(s) for the unit, if
      // they've selected any - see LecturerUnit.courseId in schema.prisma.
      if (unit) {
        const scopes = await app.prisma.lecturerUnit.findMany({
          where: { lecturerId: request.user.id, unitId: unit.id },
          select: { courseId: true },
        });
        const unrestricted =
          scopes.length === 0 || scopes.some((s) => s.courseId === null);
        if (!unrestricted) {
          const allowedCourseIds = new Set(scopes.map((s) => s.courseId));
          enrollments = enrollments.filter((e) =>
            allowedCourseIds.has(e.student.courseId),
          );
        }
      }

      return reply.send({
        unitCode,
        students: enrollments.map(({ student }) => ({
          studentId: student.id,
          studentName: student.name,
          admissionNumber: student.admissionNumber,
        })),
      });
    },
  );

  app.post<{ Body: TeachingUnitSelectionBody }>(
    "/units",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      // Accept the new per-unit course-scoped `selections` shape, or the
      // legacy flat `unitIds` shape still sent by the mobile app (which has
      // no course concept) - a legacy submission always creates an
      // unrestricted (courseId: null) row per unit.
      let selections: TeachingUnitSelection[];
      if (Array.isArray(request.body.selections)) {
        selections = request.body.selections.filter(
          (s): s is TeachingUnitSelection => !!s && typeof s.unitId === "string",
        );
      } else if (Array.isArray(request.body.unitIds)) {
        selections = request.body.unitIds
          .filter((id): id is string => typeof id === "string")
          .map((unitId) => ({ unitId, courseIds: null }));
      } else {
        return reply.code(400).send({ error: "Unit selections must be an array" });
      }

      // Dedupe by unitId - last one wins if the client sent the same unit twice.
      const byUnitId = new Map<string, TeachingUnitSelection>();
      for (const selection of selections) byUnitId.set(selection.unitId, selection);
      selections = [...byUnitId.values()];

      const lecturer = await app.prisma.lecturer.findUnique({
        where: { id: request.user.id },
        select: { institutionId: true },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });

      const unitIds = selections.map((s) => s.unitId);
      const validUnits = await app.prisma.unit.findMany({
        where: {
          id: { in: unitIds },
          institutionId: lecturer.institutionId,
        },
        select: {
          id: true,
          offerings: {
            select: {
              semester: {
                select: { courseYear: { select: { course: { select: { id: true } } } } },
              },
            },
          },
        },
      });
      if (validUnits.length !== unitIds.length)
        return reply
          .code(400)
          .send({
            error: "One or more units are not part of your institution",
          });

      const offeredCourseIdsByUnit = new Map(
        validUnits.map((u) => [
          u.id,
          new Set(u.offerings.map((o) => o.semester.courseYear.course.id)),
        ]),
      );

      // One row per selection with no courseIds (unrestricted), or one row
      // per selected course - silently dropping any courseId that isn't
      // actually one of the unit's real offerings (a stale or tampered
      // client payload shouldn't be able to create a meaningless row).
      const rows: { lecturerId: string; unitId: string; courseId: string | null }[] = [];
      for (const selection of selections) {
        const offeredCourseIds = offeredCourseIdsByUnit.get(selection.unitId) ?? new Set();
        const requestedCourseIds = (selection.courseIds ?? []).filter((id) =>
          offeredCourseIds.has(id),
        );
        if (requestedCourseIds.length === 0) {
          rows.push({ lecturerId: request.user.id, unitId: selection.unitId, courseId: null });
        } else {
          for (const courseId of requestedCourseIds)
            rows.push({ lecturerId: request.user.id, unitId: selection.unitId, courseId });
        }
      }

      await app.prisma.$transaction(async (transaction) => {
        await transaction.lecturerUnit.deleteMany({
          where: { lecturerId: request.user.id },
        });
        if (rows.length > 0)
          await transaction.lecturerUnit.createMany({ data: rows });
      });

      const savedSelections = groupLecturerUnitAssignments(rows);
      return reply.send({
        success: true,
        selectedUnitIds: unitIds,
        selections: savedSelections,
      });
    },
  );

  app.get(
    "/units",
    { preHandler: requireAttendanceRole("lecturer") },
    async (request, reply) => {
      const assignments = await app.prisma.lecturerUnit.findMany({
        where: { lecturerId: request.user.id },
        orderBy: { unit: { code: "asc" } },
        select: { unit: { select: { id: true, code: true, name: true } } },
      });

      // A lecturer can now have multiple rows per unit (one per course-
      // scoped section) - dedupe to the distinct units for this simple list.
      const seen = new Set<string>();
      const units = assignments
        .map(({ unit }) => unit)
        .filter((unit) => {
          if (seen.has(unit.id)) return false;
          seen.add(unit.id);
          return true;
        });

      return reply.send({ units });
    },
  );

  app.post<{ Body: LecturerVerificationBody }>(
    "/verify",
    async (request, reply) => {
      const institutionId = request.body.institutionId?.trim();
      const staffNumber = cleanIdentifier(request.body.staffNumber);
      if (!institutionId || !staffNumber) {
        return reply
          .code(400)
          .send({ error: "Institution ID and staff number are required" });
      }

      const lecturer = await app.prisma.lecturer.findFirst({
        where: { institutionId, staffNumber },
        select: { fullName: true },
      });

      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });
      return reply.send({ valid: true, name: lecturer.fullName });
    },
  );

  app.post<{ Body: LecturerRegistrationBody }>(
    "/register",
    async (request, reply) => {
      const institutionId = request.body.institutionId?.trim();
      const staffNumber = cleanIdentifier(request.body.staffNumber);
      const name = request.body.name?.trim();
      const email = request.body.email;
      const password = request.body.password;
      const normalizedEmail = email?.trim().toLowerCase();
      if (
        !institutionId ||
        !staffNumber ||
        !name ||
        !normalizedEmail ||
        !password
      ) {
        return reply
          .code(400)
          .send({ error: "All registration fields are required" });
      }
      if (password.length < 8)
        return reply
          .code(400)
          .send({ error: "Password must be at least 8 characters" });

      const lecturer = await app.prisma.lecturer.findFirst({
        where: { institutionId, staffNumber },
        select: { id: true, fullName: true, auth: { select: { id: true } } },
      });
      if (!lecturer)
        return reply.code(404).send({ error: "Lecturer record not found" });
      if (lecturer.fullName.trim() !== name)
        return reply
          .code(400)
          .send({ error: "Name does not match the lecturer record" });
      if (lecturer.auth)
        return reply
          .code(409)
          .send({ error: "This lecturer account is already registered" });

      try {
        const passwordHash = await hashPassword(password);
        await app.prisma.$transaction(async (transaction) => {
          await transaction.lecturer.update({
            where: { id: lecturer.id },
            data: { email: normalizedEmail, passwordHash },
          });
          await transaction.lecturerAuth.create({
            data: {
              lecturerId: lecturer.id,
              email: normalizedEmail,
              passwordHash,
            },
          });
        });

        return reply.code(201).send({ success: true, userId: lecturer.id });
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("Unique constraint")
        ) {
          return reply
            .code(409)
            .send({ error: "That email address is already in use" });
        }
        throw error;
      }
    },
  );

  app.get<{ Querystring: { institutionId?: string } }>(
    "/",
    { preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (request, reply) => {
      const institutionId = request.query.institutionId;
      if (!institutionId)
        return reply.code(400).send({ error: "Institution ID is required" });
      if (
        request.user.role !== "SUPER_ADMIN" &&
        request.user.institutionId !== institutionId
      ) {
        return reply
          .code(403)
          .send({
            error: "You can only view lecturers for your own institution",
          });
      }

      const lecturers = await app.prisma.lecturer.findMany({
        where: { institutionId },
        orderBy: { fullName: "asc" },
        select: { id: true, fullName: true, staffNumber: true },
      });

      return reply.send({
        lecturers: lecturers.map((lecturer) => ({
          id: lecturer.id,
          name: lecturer.fullName,
          staffNumber: lecturer.staffNumber,
        })),
      });
    },
  );

  app.post<{ Body: LoginBody }>("/login", async (request, reply) => {
    const email = request.body.email?.trim().toLowerCase();
    const password = request.body.password;
    if (!email || !password)
      return reply.code(400).send({ error: "Email and password are required" });

    const auth = await app.prisma.lecturerAuth.findUnique({
      where: { email },
      include: { lecturer: true },
    });
    if (
      !auth?.passwordHash ||
      !(await verifyPassword(password, auth.passwordHash))
    ) {
      return reply.code(401).send({ error: "Invalid credentials" });
    }

    return reply.send({
      userId: auth.lecturer.id,
      name: auth.lecturer.fullName,
      email: auth.email,
      institutionId: auth.lecturer.institutionId,
      staffNumber: auth.lecturer.staffNumber,
      token: await app.jwt.sign({
        id: auth.lecturer.id,
        role: "lecturer",
        institutionId: auth.lecturer.institutionId,
      }),
    });
  });

  app.post<{ Body: BulkCreateBody }>(
    "/",
    { preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (request, reply) => {
      const { institutionId, lecturers } = request.body;
      if (!institutionId || !Array.isArray(lecturers)) {
        return reply
          .code(400)
          .send({ error: "Institution ID and lecturers are required" });
      }

      if (
        request.user.role !== "SUPER_ADMIN" &&
        request.user.institutionId !== institutionId
      ) {
        return reply
          .code(403)
          .send({
            error: "You can only save lecturers for your own institution",
          });
      }

      const createdLecturers = [];
      for (const lecturerInput of lecturers) {
        const name = lecturerInput.name?.trim();
        const staffNumber = cleanIdentifier(lecturerInput.staffNumber);
        if (!name || !staffNumber) continue;

        // Prevent cross-institution staff number hijacking: if a lecturer
        // record already exists for this staffNumber but belongs to a
        // different institution, reject the entire request.
        const existing = await app.prisma.lecturer.findFirst({
          where: { 
            staffNumber,
            institutionId: { not: institutionId }
          },
          select: { institutionId: true },
        });
        if (existing) {
          return reply.code(409).send({
            error: `Staff number "${staffNumber}" is already registered to another institution`,
          });
        }

        const existingInInstitution = await app.prisma.lecturer.findFirst({
          where: { institutionId, staffNumber },
          select: { id: true },
        });
        const lecturer = existingInInstitution
          ? await app.prisma.lecturer.update({
              where: { id: existingInInstitution.id },
              data: { fullName: name },
              select: { id: true, fullName: true, staffNumber: true },
            })
          : await app.prisma.lecturer.create({
              data: { fullName: name, staffNumber, institutionId },
              select: { id: true, fullName: true, staffNumber: true },
            });
        createdLecturers.push(lecturer);
      }

      return reply.send({ lecturers: createdLecturers });
    },
  );

  app.post<{ Body: ImportRequest }>(
    "/import",
    { preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (request, reply) => {
      try {
        const institutionId = (request.body as { institutionId?: string })
          .institutionId;
        if (
          request.user.role !== "SUPER_ADMIN" &&
          request.user.institutionId !== institutionId
        ) {
          return reply
            .code(403)
            .send({
              error: "You can only import lecturers for your own institution",
            });
        }

        const result = await importLecturers(request.body);

        if (result.status !== 200) {
          return reply.code(result.status).send(result.body);
        }

        const response = result.body as ImportResponse;
        return reply.send(response);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes("fetch")) {
          return reply
            .code(502)
            .send({
              error: `Failed to connect to institution API: ${err.message}`,
            });
        }
        return reply.code(500).send({
          error:
            err instanceof Error ? err.message : "An unexpected error occurred",
        });
      }
    },
  );
};
