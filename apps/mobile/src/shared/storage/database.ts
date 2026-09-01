import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { appSchemaDef } from './schema';
import { appMigrations } from './migrations';
import BleUnitMapping from './models/BleUnitMapping';
import InPersonAttendanceRecord from './models/InPersonAttendanceRecord';
import InPersonSession from './models/InPersonSession';
import PendingAttendanceSync from './models/PendingAttendanceSync';
import SelectedUnit from './models/SelectedUnit';
import CachedUnitStudent from './models/CachedUnitStudent';
import AttendanceSessionManifest from './models/AttendanceSessionManifest';
import PendingPinSubmission from './models/PendingPinSubmission';
import ReceivedBleCounter from './models/ReceivedBleCounter';

const adapter = new SQLiteAdapter({
  schema: appSchemaDef,
  migrations: appMigrations,
  dbName: 'markwise',
  // JSI mode talks to SQLite synchronously in-process instead of over the
  // async bridge — every read/write across the app (including several that
  // already run during cold start) is meaningfully faster. Falls back to
  // the bridge automatically on setups where JSI isn't available.
  jsi: true,
});

export const database = new Database({
  adapter,
  modelClasses: [
    BleUnitMapping,
    InPersonAttendanceRecord,
    InPersonSession,
    PendingAttendanceSync,
    SelectedUnit,
    CachedUnitStudent,
    AttendanceSessionManifest,
    PendingPinSubmission,
    ReceivedBleCounter,
  ],
});

export default database;
