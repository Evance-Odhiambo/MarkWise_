import type { FastifyPluginAsync } from "fastify";
import { courseModule } from "./course/index.js";
import { courseYearModule } from "./courseYear/index.js";
import { semesterModule } from "./semester/index.js";
import { unitModule } from "./unit/index.js";
import { requireRoles } from "../../plugins/index.js";

type ImportedUnit = {
  id?: string;
  name: string;
  code: string;
  semesterId?: string;
};

type ImportedSemester = {
  id?: string;
  name: string;
  semesterNum: number;
  yearId?: string;
  units: ImportedUnit[];
};

type ImportedYear = {
  id?: string;
  yearNumber: number;
  courseId?: string;
  semesters: ImportedSemester[];
};

type ImportedCourse = {
  id: string;
  name: string;
  duration: number;
  years: ImportedYear[];
};

export const academicsModule: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { apiUrl: string; apiKey?: string } }>(
    "/academic/import",
    { preHandler: requireRoles("SUPER_ADMIN", "INSTITUTION_ADMIN") },
    async (request, reply) => {
      if (!request.body.apiUrl)
        return reply.code(400).send({ error: "API URL is required" });

      const headers: Record<string, string> = { Accept: "application/json" };
      if (request.body.apiKey)
        headers.Authorization = `Bearer ${request.body.apiKey}`;
      const response = await fetch(request.body.apiUrl, { headers });
      if (!response.ok)
        return reply
          .code(response.status)
          .send({ error: `Institution API returned ${response.status}` });

      const payload = (await response.json()) as unknown;
      const rawCourses = Array.isArray(payload)
        ? payload
        : payload &&
            typeof payload === "object" &&
            Array.isArray((payload as { courses?: unknown }).courses)
          ? (payload as { courses: unknown[] }).courses
          : [];

      const courses: ImportedCourse[] = rawCourses.flatMap(
        (rawCourse, courseIndex) => {
          if (!rawCourse || typeof rawCourse !== "object") return [];
          const courseObj = rawCourse as Record<string, unknown>;
          const name =
            typeof courseObj.name === "string"
              ? courseObj.name.trim()
              : typeof courseObj.courseName === "string"
                ? courseObj.courseName.trim()
                : typeof courseObj.course_name === "string"
                  ? courseObj.course_name.trim()
                  : typeof courseObj.title === "string"
                    ? courseObj.title.trim()
                    : "";
          if (!name) return [];

          const courseId =
            typeof courseObj.id === "string"
              ? courseObj.id
              : `imported-course-${courseIndex}`;

          const rawYears = Array.isArray(courseObj.years)
            ? courseObj.years
            : [];

          const years: ImportedYear[] = rawYears.flatMap(
            (rawYear, yearIndex) => {
              if (!rawYear || typeof rawYear !== "object") return [];
              const yearObj = rawYear as Record<string, unknown>;
              const yearNumber =
                typeof yearObj.yearNumber === "number"
                  ? yearObj.yearNumber
                  : typeof yearObj.year_number === "number"
                    ? yearObj.year_number
                    : typeof yearObj.year === "number"
                      ? yearObj.year
                      : yearIndex + 1;

              const yearId =
                typeof yearObj.id === "string"
                  ? yearObj.id
                  : `imported-year-${courseIndex}-${yearNumber}`;

              const rawSemesters = Array.isArray(yearObj.semesters)
                ? yearObj.semesters
                : Array.isArray(yearObj.terms)
                  ? yearObj.terms
                  : [];

              const semesters: ImportedSemester[] = rawSemesters.flatMap(
                (rawSem, semIndex) => {
                  if (!rawSem || typeof rawSem !== "object") return [];
                  const semObj = rawSem as Record<string, unknown>;
                  const semesterNum =
                    typeof semObj.semesterNum === "number"
                      ? semObj.semesterNum
                      : typeof semObj.semester_number === "number"
                        ? semObj.semester_number
                        : typeof semObj.semesterNumber === "number"
                          ? semObj.semesterNumber
                          : typeof semObj.number === "number"
                            ? semObj.number
                            : semIndex + 1;

                  const semName =
                    typeof semObj.name === "string" && semObj.name.trim()
                      ? semObj.name.trim()
                      : typeof semObj.semester_name === "string" &&
                          semObj.semester_name.trim()
                        ? semObj.semester_name.trim()
                        : `Semester ${semesterNum}`;

                  const semId =
                    typeof semObj.id === "string"
                      ? semObj.id
                      : `imported-sem-${courseIndex}-${yearNumber}-${semesterNum}`;

                  const rawUnits = Array.isArray(semObj.units)
                    ? semObj.units
                    : Array.isArray(semObj.modules)
                      ? semObj.modules
                      : Array.isArray(semObj.courses)
                        ? semObj.courses
                        : [];

                  const units: ImportedUnit[] = rawUnits.flatMap(
                    (rawUnit, unitIndex) => {
                      if (!rawUnit || typeof rawUnit !== "object") return [];
                      const unitObj = rawUnit as Record<string, unknown>;
                      const code = (
                        typeof unitObj.code === "string"
                          ? unitObj.code
                          : typeof unitObj.unit_code === "string"
                            ? unitObj.unit_code
                            : typeof unitObj.unitCode === "string"
                              ? unitObj.unitCode
                              : ""
                      )
                        .trim()
                        .toUpperCase();

                      const unitName = (
                        typeof unitObj.name === "string"
                          ? unitObj.name
                          : typeof unitObj.unit_name === "string"
                            ? unitObj.unit_name
                            : typeof unitObj.unitName === "string"
                              ? unitObj.unitName
                              : typeof unitObj.title === "string"
                                ? unitObj.title
                                : ""
                      ).trim();

                      if (!code || !unitName) return [];

                      return [
                        {
                          id:
                            typeof unitObj.id === "string"
                              ? unitObj.id
                              : `imported-unit-${courseIndex}-${yearNumber}-${semesterNum}-${unitIndex}`,
                          name: unitName,
                          code,
                          semesterId: semId,
                        },
                      ];
                    },
                  );

                  return [
                    {
                      id: semId,
                      name: semName,
                      semesterNum,
                      yearId,
                      units,
                    },
                  ];
                },
              );

              return [
                {
                  id: yearId,
                  yearNumber,
                  courseId,
                  semesters,
                },
              ];
            },
          );

          const duration =
            typeof courseObj.duration === "number" && courseObj.duration > 0
              ? courseObj.duration
              : years.length || 1;

          return [
            {
              id: courseId,
              name,
              duration,
              years,
            },
          ];
        },
      );

      const importedUnits = courses.reduce(
        (courseTotal, course) =>
          courseTotal +
          course.years.reduce(
            (yearTotal, year) =>
              yearTotal +
              year.semesters.reduce(
                (semesterTotal, semester) =>
                  semesterTotal + semester.units.length,
                0,
              ),
            0,
          ),
        0,
      );

      return reply.send({
        importedCourses: courses.length,
        importedUnits,
        data: courses,
      });
    },
  );

  await app.register(courseModule);
  await app.register(courseYearModule);
  await app.register(semesterModule);
  await app.register(unitModule);
};
