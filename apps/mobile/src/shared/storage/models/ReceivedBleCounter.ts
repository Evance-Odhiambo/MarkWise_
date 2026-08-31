import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

/** Tracks the last-seen BLE rotation counter per session for replay/regression checks. */
export default class ReceivedBleCounter extends Model {
  static table = 'received_ble_counters';
  @field('session_id') sessionId!: string;
  @field('nonce') nonce!: number;
  @field('ble_unit_id') bleUnitId!: number;
  @field('last_counter') lastCounter!: number;
  @field('last_seen_at') lastSeenAt!: number;
}
