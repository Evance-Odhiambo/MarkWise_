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

const adapter = new SQLiteAdapter({
  schema: appSchemaDef,
  migrations: appMigrations,
  dbName: 'markwise',
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
  ],
});

export default database;
