export interface AcademicUnit {
  id: string;
  name: string;
  code: string;
  semesterId: string;
}

export interface AcademicSemester {
  id: string;
  name: string;
  semesterNum: number;
  courseYearId: string;
  units: AcademicUnit[];
}

export interface AcademicCourseYear {
  id: string;
  year: number;
  courseId: string;
  semesters: AcademicSemester[];
}

export interface AcademicCourse {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  courseYears: AcademicCourseYear[];
}

export type ImportMethod = "api" | "csv" | "manual";
