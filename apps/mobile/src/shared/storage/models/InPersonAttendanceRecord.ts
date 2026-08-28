import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class InPersonAttendanceRecord extends Model {
  static table = 'in_person_attendance_records';
  @field('local_id') localId!: string;
  @field('session_id') sessionId!: string;
  @field('unit_code') unitCode!: string;
  @field('session_start') sessionStart!: number;
  @field('scanned_at') scannedAt!: number;
  @field('method') method!: string;
  @field('raw_payload') rawPayload!: string;
  @field('device_id') deviceId!: string;
  @field('status') status!: string;
  @field('sync_attempts') syncAttempts!: number;
  @field('last_sync_error') lastSyncError!: string | null;
  @field('owner_user_id') ownerUserId!: string | null;
}
