import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class CachedUnitStudent extends Model {
  static table = 'cached_unit_students';
  @field('unit_code') unitCode!: string;
  @field('student_id') studentId!: string;
  @field('student_name') studentName!: string;
  @field('admission_number') admissionNumber!: string;
  @field('synced_at') syncedAt!: number;
}
