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
  ],
});
