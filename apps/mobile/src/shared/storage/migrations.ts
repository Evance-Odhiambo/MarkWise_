import {
  schemaMigrations,
  createTable,
  unsafeExecuteSql,
} from '@nozbe/watermelondb/Schema/migrations';

export const appMigrations = schemaMigrations({
  migrations: [
    {
      toVersion: 2,
      steps: [
        createTable({
          name: 'in_person_attendance_records',
          columns: [
            { name: 'local_id', type: 'string' },
            { name: 'session_id', type: 'string' },
            { name: 'unit_code', type: 'string' },
            { name: 'lecture_room', type: 'string' },
            { name: 'session_start', type: 'number' },
            { name: 'scanned_at', type: 'number' },
            { name: 'method', type: 'string' },
            { name: 'raw_payload', type: 'string' },
            { name: 'device_id', type: 'string' },
            { name: 'status', type: 'string' },
            { name: 'sync_attempts', type: 'number' },
            { name: 'last_sync_error', type: 'string', isOptional: true },
          ],
        }),
        createTable({
          name: 'in_person_sessions',
          columns: [
            { name: 'session_id', type: 'string' },
            { name: 'unit_code', type: 'string' },
            { name: 'lecture_room', type: 'string' },
            { name: 'session_start', type: 'number' },
            { name: 'expires_at', type: 'number' },
            { name: 'session_nonce', type: 'number' },
            { name: 'status', type: 'string' },
          ],
        }),
        createTable({
          name: 'pending_attendance_sync',
          columns: [
            { name: 'record_id', type: 'string' },
            { name: 'attempts', type: 'number' },
            { name: 'last_error', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 3,
      steps: [
        unsafeExecuteSql(
          'ALTER TABLE in_person_attendance_records DROP COLUMN lecture_room;',
        ),
        unsafeExecuteSql(
          'ALTER TABLE in_person_sessions DROP COLUMN lecture_room;',
        ),
      ],
    },
    {
      toVersion: 4,
      steps: [
        createTable({
          name: 'selected_units',
          columns: [
            { name: 'user_id', type: 'string' },
            { name: 'role', type: 'string' },
            { name: 'institution_id', type: 'string', isOptional: true },
            { name: 'unit_code', type: 'string' },
            { name: 'selected_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 5,
      steps: [
        createTable({
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
      ],
    },
    {
      toVersion: 6,
      steps: [
        createTable({
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
    },
    {
      toVersion: 7,
      steps: [
        unsafeExecuteSql(
          'ALTER TABLE in_person_attendance_records ADD COLUMN owner_user_id TEXT;',
        ),
      ],
    },
    {
      toVersion: 8,
      steps: [
        unsafeExecuteSql(
          'ALTER TABLE in_person_sessions ADD COLUMN ble_unit_id INTEGER;',
        ),
      ],
    },
    {
      toVersion: 9,
      steps: [
        createTable({
          name: 'attendance_session_manifests',
          columns: [
            { name: 'session_id', type: 'string' },
            { name: 'unit_code', type: 'string' },
            { name: 'ble_unit_id', type: 'number' },
            { name: 'session_nonce', type: 'number' },
            { name: 'session_start', type: 'number' },
            { name: 'expires_at', type: 'number' },
            { name: 'issued_at', type: 'number' },
            { name: 'issuer_id', type: 'string' },
            { name: 'key_id', type: 'string' },
            { name: 'signature', type: 'string' },
            { name: 'trusted_at', type: 'number' },
          ],
        }),
      ],
    },
    {
      toVersion: 10,
      steps: [
        unsafeExecuteSql(
          'ALTER TABLE in_person_attendance_records ADD COLUMN relay_eligible INTEGER;',
        ),
        unsafeExecuteSql(
          'ALTER TABLE in_person_attendance_records ADD COLUMN relay_method TEXT;',
        ),
        unsafeExecuteSql(
          'ALTER TABLE attendance_session_manifests ADD COLUMN ble_rotation_seconds INTEGER;',
        ),
        unsafeExecuteSql(
          'ALTER TABLE attendance_session_manifests ADD COLUMN qr_rotation_seconds INTEGER;',
        ),
        unsafeExecuteSql(
          'ALTER TABLE attendance_session_manifests ADD COLUMN pin_rotation_seconds INTEGER;',
        ),
        createTable({
          name: 'pending_pin_submissions',
          columns: [
            { name: 'unit_code', type: 'string' },
            { name: 'session_id', type: 'string', isOptional: true },
            { name: 'pin', type: 'string' },
            { name: 'scanned_at', type: 'number' },
            { name: 'device_id', type: 'string', isOptional: true },
            { name: 'status', type: 'string' },
            { name: 'sync_attempts', type: 'number' },
            { name: 'last_error', type: 'string', isOptional: true },
            { name: 'created_at', type: 'number' },
          ],
        }),
        createTable({
          name: 'received_ble_counters',
          columns: [
            { name: 'session_id', type: 'string' },
            { name: 'nonce', type: 'number' },
            { name: 'ble_unit_id', type: 'number' },
            { name: 'last_counter', type: 'number' },
            { name: 'last_seen_at', type: 'number' },
          ],
        }),
      ],
    },
  ],
});
