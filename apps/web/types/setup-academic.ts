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
  yearId: string;
  units: AcademicUnit[];
}

export interface AcademicYear {
  id: string;
  yearNumber: number;
  courseId: string;
  semesters: AcademicSemester[];
}

export interface AcademicCourse {
  id: string;
  name: string;
  duration: number; // Number of years
  years: AcademicYear[];
}

export type ImportMethod = "api" | "csv" | "manual";
