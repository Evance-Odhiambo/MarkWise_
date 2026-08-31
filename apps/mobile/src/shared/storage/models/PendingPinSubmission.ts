import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class PendingPinSubmission extends Model {
  static table = 'pending_pin_submissions';
  @field('unit_code') unitCode!: string;
  @field('session_id') sessionId!: string | null;
  /** AES-GCM encrypted — see shared/security/localStorageCrypto.ts. */
  @field('pin') pin!: string;
  @field('scanned_at') scannedAt!: number;
  @field('device_id') deviceId!: string | null;
  @field('status') status!: string;
  @field('sync_attempts') syncAttempts!: number;
  @field('last_error') lastError!: string | null;
  @field('created_at') createdAt!: number;
}
