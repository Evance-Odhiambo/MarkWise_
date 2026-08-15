import type { AcademicCourse } from "../types/academic";

interface ParseResult {
  headers: string[];
  courses: AcademicCourse[];
}

export function parseCsv(csvText: string): ParseResult {
  const lines = csvText.split("\n").map((line) => line.trim()).filter(Boolean);

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  const headers = parseCsvLine(lines[0]);

  const requiredColumns = ["courseName", "duration"];
  const optionalColumns = ["yearNumber", "semesterName", "semesterNumber", "unitName", "unitCode"];

  const missing = requiredColumns.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    throw new Error(
      `Missing required columns: ${missing.join(", ")}. Required columns: ${requiredColumns.join(", ")}. Optional columns: ${optionalColumns.join(", ")}`
    );
  }

  const headerIndex = new Map(headers.map((h, i) => [h, i]));

  const courseMap = new Map<string, AcademicCourse>();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);

    const courseName = values[headerIndex.get("courseName")!];
    const duration = parseInt(values[headerIndex.get("duration")!], 10);

    if (!courseName || isNaN(duration)) continue;

    const courseKey = courseName;
    let course = courseMap.get(courseKey);

    if (!course) {
      course = {
        id: `course-${courseMap.size + 1}`,
        name: courseName,
        duration,
        description: null,
        years: [],
      };
      courseMap.set(courseKey, course);

      // Auto-generate years and semesters based on duration
      for (let year = 1; year <= duration; year++) {
        course.years.push({
          id: `year-${course.id}-${year}`,
          yearNumber: year,
          courseId: course.id,
          semesters: [
            {
              id: `sem-${course.id}-${year}-1`,
              name: "Semester 1",
              semesterNum: 1,
              yearId: `year-${course.id}-${year}`,
              units: [],
            },
            {
              id: `sem-${course.id}-${year}-2`,
              name: "Semester 2",
              semesterNum: 2,
              yearId: `year-${course.id}-${year}`,
              units: [],
            },
          ],
        });
      }
    }

    // Add units if year/semester info provided
    const yearNum = parseInt(values[headerIndex.get("yearNumber")!] || "0", 10);
    const unitName = values[headerIndex.get("unitName")!];
    const unitCode = values[headerIndex.get("unitCode")!];

    if (yearNum && unitName && unitCode) {
      const year = course.years.find((y) => y.yearNumber === yearNum);
      if (year && year.semesters.length > 0) {
        const semesterNum = parseInt(
          values[headerIndex.get("semesterNumber")!] || "1",
          10
        );
        const semester = year.semesters.find((s) => s.semesterNum === semesterNum) || year.semesters[0];
        
        // Check if unit already exists
        const existingUnit = semester.units.find((u) => u.code === unitCode);
        if (!existingUnit) {
          semester.units.push({
            id: `unit-${semester.id}-${unitCode}`,
            name: unitName,
            code: unitCode,
            semesterId: semester.id,
          });
        }
      }
    }
  }

  return {
    headers,
    courses: Array.from(courseMap.values()),
  };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}
