export type AttendanceMode = 'online' | 'in-person';

export type AttendanceMethod = 'qr' | 'ble' | 'pin';

export type AttendanceStatus = 'pending' | 'active' | 'completed';

export interface AttendanceSession {
  id: string;
  mode: AttendanceMode;
  method: AttendanceMethod;
  status: AttendanceStatus;
  startTime: string;
  endTime?: string;
  expiresAt: string;
  pin?: string;
  unitId?: string;
  unitName?: string;
  lecturerId?: string;
  lecturerName?: string;
  attendedCount?: number;
  expectedCount?: number;
}

export interface StudentAttendance {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  status: 'present' | 'absent' | 'late';
  markedAt: string;
  method: AttendanceMethod;
}
