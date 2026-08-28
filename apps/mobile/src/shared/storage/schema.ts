import { appSchema, tableSchema } from '@nozbe/watermelondb';

export const appSchemaDef = appSchema({
  version: 8,
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
      name: 'pending_attendance_sync',
      columns: [
        { name: 'record_id', type: 'string' },
        { name: 'attempts', type: 'number' },
        { name: 'last_error', type: 'string', isOptional: true },
        { name: 'created_at', type: 'number' },
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
