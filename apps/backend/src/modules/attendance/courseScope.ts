import type { PrismaClient } from "../../generated/prisma/client.js";

/**
 * Enforces a lecturer's course-scoped teaching assignment at attendance-
 * marking time. A unit offered under multiple courses can be taught as one
 * shared class (the lecturer's LecturerUnit rows for this unit include a
 * courseId: null row - "unrestricted") or as separate per-course sections
 * (one LecturerUnit row per course they actually teach). In the latter
 * case, a student whose own course isn't among those rows is rejected even
 * though they're genuinely enrolled in the unit - they're enrolled in a
 * different lecturer's section of it.
 *
 * Permissive by design in the edge cases that shouldn't normally occur:
 * no LecturerUnit rows at all for (lecturerId, unitId) is treated as
 * unrestricted, rather than locking out every student, since the absence
 * of assignment data is far more likely a data gap than an intentional
 * "teach this to nobody."
 */
export async function assertLecturerCourseScope(
  prisma: PrismaClient,
  lecturerId: string,
  unitId: string,
  studentCourseId: string,
): Promise<void> {
  const scopes = await prisma.lecturerUnit.findMany({
    where: { lecturerId, unitId },
    select: { courseId: true },
  });
  if (scopes.length === 0) return;
  const allowed = scopes.some(
    (scope) => scope.courseId === null || scope.courseId === studentCourseId,
  );
  if (!allowed) throw new Error("WRONG_COURSE_SECTION");
}
