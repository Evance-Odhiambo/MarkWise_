import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const appSchemaDef = appSchema({
  version: 10,
  tables: [
    tableSchema({
      name: 'ble_unit_mappings',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'institution_id', type: 'string', isOptional: true },
        { name: 'unit_code', type: 'string' },
        { name: 'unit_name', type: 'string', isOptional: true },
        { name: 'ble_id', type: 'string' },
        { name: 'synced_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'selected_units',
      columns: [
        { name: 'user_id', type: 'string' },
        { name: 'role', type: 'string' },
        { name: 'institution_id', type: 'string', isOptional: true },
        { name: 'unit_code', type: 'string' },
        { name: 'selected_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'in_person_attendance_records',
      columns: [
        { name: 'local_id', type: 'string' },
        { name: 'session_id', type: 'string' },
        { name: 'unit_code', type: 'string' },
        { name: 'session_start', type: 'number' },
        { name: 'scanned_at', type: 'number' },
        { name: 'method', type: 'string' },
        { name: 'raw_payload', type: 'string' },
        { name: 'device_id', type: 'string' },
        { name: 'status', type: 'string' },
        { name: 'sync_attempts', type: 'number' },
        { name: 'last_sync_error', type: 'string', isOptional: true },
        { name: 'owner_user_id', type: 'string', isOptional: true },
        { name: 'relay_eligible', type: 'number', isOptional: true },
        { name: 'relay_method', type: 'string', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'in_person_sessions',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'unit_code', type: 'string' },
        { name: 'session_start', type: 'number' },
        { name: 'expires_at', type: 'number' },
        { name: 'session_nonce', type: 'number' },
        { name: 'ble_unit_id', type: 'number', isOptional: true },
        { name: 'status', type: 'string' },
      ],
    }),
    tableSchema({
      name: 'attendance_session_manifests',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'unit_code', type: 'string' },
        { name: 'ble_unit_id', type: 'number', isOptional: true },
        { name: 'session_nonce', type: 'number' },
        { name: 'session_start', type: 'number' },
        { name: 'expires_at', type: 'number' },
        { name: 'issued_at', type: 'number' },
        { name: 'issuer_id', type: 'string' },
        { name: 'key_id', type: 'string' },
        { name: 'signature', type: 'string' },
        { name: 'trusted_at', type: 'number' },
        { name: 'ble_rotation_seconds', type: 'number', isOptional: true },
        { name: 'qr_rotation_seconds', type: 'number', isOptional: true },
        { name: 'pin_rotation_seconds', type: 'number', isOptional: true },
      ],
    }),
    tableSchema({
      name: 'pending_attendance_sync',
      columns: [
        { name: 'record_id', type: 'string' },
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'pending_pin_submissions',
      columns: [
        { name: 'unit_code', type: 'string' },
        { name: 'session_id', type: 'string', isOptional: true },
        // AES-GCM encrypted (see shared/security/localStorageCrypto.ts) — the
        // raw PIN digits are never written to SQLite in plaintext.
        { name: 'pin', type: 'string' },
        { name: 'scanned_at', type: 'number' },
        { name: 'device_id', type: 'string', isOptional: true },
        { name: 'status', type: 'string' },
        { name: 'sync_attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'received_ble_counters',
      columns: [
        { name: 'session_id', type: 'string' },
        { name: 'nonce', type: 'number' },
        { name: 'ble_unit_id', type: 'number' },
        { name: 'last_counter', type: 'number' },
        { name: 'last_seen_at', type: 'number' },
      ],
    }),
    tableSchema({
      name: 'cached_unit_students',
      columns: [
        { name: 'unit_code', type: 'string' },
        { name: 'student_id', type: 'string' },
        { name: 'student_name', type: 'string' },
        { name: 'admission_number', type: 'string' },
        { name: 'synced_at', type: 'number' },
      ],
    }),
  ],
});
