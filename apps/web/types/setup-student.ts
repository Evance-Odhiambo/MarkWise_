export interface Student {
  id: string;
  name: string;
  admissionNumber: string;
  course: string;
}

export type ImportMethod = "api" | "csv" | "manual";
