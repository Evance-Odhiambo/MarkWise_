export type UnitSelectionRole = 'student' | 'lecturer';

export interface Unit {
  id?: string;
  code: string;
  name: string;
}

export interface SelectedUnit extends Unit {
  selected: boolean;
}

export interface StudentSemester {
  semesterNumber: number;
  name: string;
  units: Unit[];
}

export interface StudentYear {
  yearNumber: number;
  semester: StudentSemester[];
}
