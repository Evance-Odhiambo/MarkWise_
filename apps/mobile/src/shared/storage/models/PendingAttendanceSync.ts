import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class PendingAttendanceSync extends Model {
  static table = 'pending_attendance_sync';
  @field('record_id') recordId!: string;
  @field('attempts') attempts!: number;
  @field('last_error') lastError!: string | null;
  @field('created_at') createdAt!: number;
}
