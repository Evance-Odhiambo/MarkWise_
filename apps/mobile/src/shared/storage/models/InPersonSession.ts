import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class InPersonSession extends Model {
  static table = 'in_person_sessions';
  @field('session_id') sessionId!: string;
  @field('unit_code') unitCode!: string;
  @field('session_start') sessionStart!: number;
  @field('expires_at') expiresAt!: number;
  @field('session_nonce') sessionNonce!: number;
  @field('ble_unit_id') bleUnitId?: number;
  @field('status') status!: string;
}
