import type { FastifyPluginAsync } from "fastify";
import { courseModule } from "./course/index.js";
import { courseYearModule } from "./courseYear/index.js";
import { semesterModule } from "./semester/index.js";
import { unitModule } from "./unit/index.js";
import { requireSuperAdmin } from "../../plugins/index.js";

type ImportedSemester = { units?: unknown[] };
type ImportedYear = { semesters?: ImportedSemester[] };
type ImportedCourse = { id: string; name: string; duration: number; years: ImportedYear[] };

export const academicsModule: FastifyPluginAsync = async (app) => {
  app.post<{ Body: { apiUrl: string; apiKey?: string } }>("/academic/import", { preHandler: requireSuperAdmin() }, async (request, reply) => {
    if (!request.body.apiUrl) return reply.code(400).send({ error: "API URL is required" });

    const headers: Record<string, string> = { Accept: "application/json" };
    if (request.body.apiKey) headers.Authorization = `Bearer ${request.body.apiKey}`;
    const response = await fetch(request.body.apiUrl, { headers });
    if (!response.ok) return reply.code(response.status).send({ error: `Institution API returned ${response.status}` });

    const payload = await response.json() as unknown;
    const rawCourses = Array.isArray(payload) ? payload : payload && typeof payload === "object" && Array.isArray((payload as { courses?: unknown }).courses) ? (payload as { courses: unknown[] }).courses : [];
    const courses: ImportedCourse[] = rawCourses.flatMap((rawCourse, courseIndex) => {
      if (!rawCourse || typeof rawCourse !== "object") return [];
      const course = rawCourse as Record<string, unknown>;
      const name = typeof course.name === "string" ? course.name.trim() : "";
      if (!name) return [];
      const years = Array.isArray(course.years) ? course.years.filter((year): year is ImportedYear => Boolean(year && typeof year === "object")) : [];
      return [{ id: `imported-course-${courseIndex}`, name, duration: years.length || 1, years }];
    });
    const importedUnits = courses.reduce((courseTotal, course) => courseTotal + course.years.reduce((yearTotal, year) => yearTotal + (year.semesters ?? []).reduce((semesterTotal, semester) => semesterTotal + (semester.units?.length ?? 0), 0), 0), 0);
    return reply.send({ importedCourses: courses.length, importedUnits, data: courses });
  });

  await app.register(courseModule);
  await app.register(courseYearModule);
  await app.register(semesterModule);
  await app.register(unitModule);
};
