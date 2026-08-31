import { Q } from '@nozbe/watermelondb';
import database from './database';
import CachedUnitStudent from './models/CachedUnitStudent';
import { normalizeUnitCode } from '../utils/unitCodes';

export type CachedStudent = {
  unitCode: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  syncedAt: number;
};

const collection = () =>
  database.collections.get<CachedUnitStudent>('cached_unit_students');
export async function saveUnitStudents(
  unitCode: string,
  students: Omit<CachedStudent, 'unitCode' | 'syncedAt'>[],
) {
  const normalizedUnitCode = normalizeUnitCode(unitCode);
  if (!normalizedUnitCode) return;
  const now = Date.now();
  await database.write(async () => {
    const existing = await collection()
      .query(Q.where('unit_code', normalizedUnitCode))
      .fetch();
    await database.batch(
      ...existing.map(item => item.prepareDestroyPermanently()),
      ...students.map(student =>
        collection().prepareCreate(model => {
          model.unitCode = normalizedUnitCode;
          model.studentId = student.studentId;
          model.studentName = student.studentName;
          model.admissionNumber = student.admissionNumber;
          model.syncedAt = now;
        }),
      ),
    );
  });
}

export async function getUnitStudents(
  unitCode: string,
): Promise<CachedStudent[]> {
  const normalizedUnitCode = normalizeUnitCode(unitCode);
  const records = await collection()
    .query(Q.where('unit_code', normalizedUnitCode))
    .fetch();
  return records.map(record => ({
    unitCode: record.unitCode,
    studentId: record.studentId,
    studentName: record.studentName,
    admissionNumber: record.admissionNumber,
    syncedAt: record.syncedAt,
  }));
}
