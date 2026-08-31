import { Model } from '@nozbe/watermelondb';
import { field } from '@nozbe/watermelondb/decorators';

export default class AttendanceSessionManifest extends Model {
  static table = 'attendance_session_manifests';
  @field('session_id') sessionId!: string;
  @field('unit_code') unitCode!: string;
  @field('ble_unit_id') bleUnitId!: number | null;
  @field('session_nonce') sessionNonce!: number;
  @field('session_start') sessionStart!: number;
  @field('expires_at') expiresAt!: number;
  @field('issued_at') issuedAt!: number;
  @field('issuer_id') issuerId!: string;
  @field('key_id') keyId!: string;
  @field('signature') signature!: string;
  @field('trusted_at') trustedAt!: number;
  @field('ble_rotation_seconds') bleRotationSeconds!: number | null;
  @field('qr_rotation_seconds') qrRotationSeconds!: number | null;
  @field('pin_rotation_seconds') pinRotationSeconds!: number | null;
}
