import { Q } from '@nozbe/watermelondb';
import AsyncStorage from '@react-native-async-storage/async-storage';
import database from './database';
import BleUnitMapping from './models/BleUnitMapping';
import SelectedUnit from './models/SelectedUnit';
import {
  decryptLocalValue,
  encryptLocalValue,
} from '../security/localStorageCrypto';
import { normalizeUnitCode as normalizeCode } from '../utils/unitCodes';

export type UnitMappingRole = 'student' | 'lecturer';

export interface UnitMappingOwner {
  userId: string;
  role: UnitMappingRole;
  institutionId?: string | null;
}

export interface StoredUnitMapping {
  unitCode: string;
  unitName?: string;
  bleId: string;
}

const normalizeBleId = (value: string): string => {
  const raw = String(value || '')
    .trim()
    .toUpperCase();
  if (!raw) return '';
  const stripped = raw.replace(/^0X/i, '').replace(/^[UR]/i, '');
  const numeric = Number(stripped);
  return Number.isInteger(numeric) && numeric >= 0 && numeric <= 7999
    ? String(numeric)
    : '';
};

const ownerWhere = (owner: UnitMappingOwner) => [
  Q.where('user_id', owner.userId),
  Q.where('role', owner.role),
  Q.where('institution_id', owner.institutionId || ''),
];
const selectedCollection = () =>
  database.collections.get<SelectedUnit>('selected_units');

export async function loadSelectedUnitCodes(
  owner: UnitMappingOwner,
): Promise<string[]> {
  if (!owner.userId) return [];
  const records = await selectedCollection()
    .query(...ownerWhere(owner))
    .fetch();
  return (
    await Promise.all(
      records.map(record =>
        decryptLocalValue(
          record.unitCode,
          `selected_units|${owner.userId}|${owner.role}|${
            owner.institutionId || ''
          }`,
        ),
      ),
    )
  )
    .filter((code: string | null): code is string => Boolean(code))
    .map(normalizeCode);
}

export async function saveSelectedUnitCodes(
  owner: UnitMappingOwner,
  codes: string[],
): Promise<void> {
  if (!owner.userId) return;
  const normalized = [...new Set(codes.map(normalizeCode).filter(Boolean))];
  const existing = await selectedCollection()
    .query(...ownerWhere(owner))
    .fetch();
  const ownerAad = `selected_units|${owner.userId}|${owner.role}|${
    owner.institutionId || ''
  }`;
  const decoded = await Promise.all(
    existing.map(async record => ({
      record,
      code: normalizeCode(
        (await decryptLocalValue(record.unitCode, ownerAad)) || '',
      ),
    })),
  );
  const byCode = new Map(decoded.map(({ record, code }) => [code, record]));
  const operations = decoded
    .filter(({ code }) => !normalized.includes(code))
    .map(({ record }) => record.prepareDestroyPermanently());
  const encryptedCodes = new Map(
    await Promise.all(
      normalized.map(
        async code => [code, await encryptLocalValue(code, ownerAad)] as const,
      ),
    ),
  );
  const creates = normalized.filter(code => !byCode.has(code));
  for (const code of normalized) {
    const record = byCode.get(code);
    if (record)
      operations.push(
        record.prepareUpdate(model => {
          model.unitCode = encryptedCodes.get(code) || '';
          model.selectedAt = Date.now();
        }),
      );
  }
  const createRecords = creates.map(code =>
    selectedCollection().prepareCreate(model => {
      model.userId = owner.userId;
      model.role = owner.role;
      model.institutionId = owner.institutionId || '';
      model.unitCode = encryptedCodes.get(code) || '';
      model.selectedAt = Date.now();
    }),
  );
  if (operations.length || createRecords.length)
    await database.write(async () =>
      database.batch(...operations, ...createRecords),
    );
}

export async function loadUnitMappings(
  owner: UnitMappingOwner,
): Promise<StoredUnitMapping[]> {
  if (!owner.userId) return [];
  const records = await database.collections
    .get<BleUnitMapping>('ble_unit_mappings')
    .query(...ownerWhere(owner))
    .fetch();
  const aad = (field: string) =>
    `ble_unit_mappings|${owner.userId}|${owner.role}|${
      owner.institutionId || ''
    }|${field}`;
  return Promise.all(
    records.map(async record => {
      const bleId = normalizeBleId(
        (await decryptLocalValue(record.bleId, aad('ble_id'))) || '',
      );
      return {
        unitCode: record.unitCode,
        unitName:
          (await decryptLocalValue(record.unitName, aad('unit_name'))) ||
          undefined,
        bleId,
      };
    }),
  );
}

export async function saveUnitMappings(
  owner: UnitMappingOwner,
  units: StoredUnitMapping[],
): Promise<void> {
  if (!owner.userId) return;
  const normalized = new Map<string, StoredUnitMapping>();
  for (const unit of units) {
    const code = normalizeCode(unit.unitCode);
    const bleId = normalizeBleId(unit.bleId || '');
    if (code && bleId) normalized.set(code, { ...unit, unitCode: code, bleId });
  }

  const collection =
    database.collections.get<BleUnitMapping>('ble_unit_mappings');
  const existing = await collection.query(...ownerWhere(owner)).fetch();
  const aad = (field: string) =>
    `ble_unit_mappings|${owner.userId}|${owner.role}|${
      owner.institutionId || ''
    }|${field}`;
  const decoded = await Promise.all(
    existing.map(async record => ({
      record,
      code: normalizeCode(record.unitCode),
    })),
  );
  const existingByCode = new Map(
    decoded.map(({ record, code }) => [code, record]),
  );
  // Upsert only the mappings received from the server. Responses may be
  // partial (for example, lecturer search results), so never delete unrelated
  // cached mappings here. Cache deletion is explicit via clearUnitMappings.
  const operations: ReturnType<typeof collection.prepareCreate>[] = [];

  // Pre-encrypt all values BEFORE creating operations (WatermelonDB batching requirement)
  const encryptedData = new Map<string, { name: string; bleId: string }>();
  for (const unit of normalized.values()) {
    const encryptedName = await encryptLocalValue(
      unit.unitName,
      aad('unit_name'),
    );
    const encryptedBleId = await encryptLocalValue(unit.bleId, aad('ble_id'));
    encryptedData.set(unit.unitCode, {
      name: encryptedName || '',
      bleId: encryptedBleId || '',
    });
  }

  // Now build operations synchronously with pre-encrypted values
  for (const unit of normalized.values()) {
    const record = existingByCode.get(unit.unitCode);
    const encrypted = encryptedData.get(unit.unitCode)!;

    if (record) {
      operations.push(
        record.prepareUpdate(model => {
          model.unitName = encrypted.name;
          model.bleId = encrypted.bleId;
          model.syncedAt = Date.now();
        }),
      );
    } else {
      operations.push(
        collection.prepareCreate(model => {
          model.userId = owner.userId;
          model.role = owner.role;
          model.institutionId = owner.institutionId || '';
          model.unitCode = unit.unitCode;
          model.unitName = encrypted.name;
          model.bleId = encrypted.bleId;
          model.syncedAt = Date.now();
        }),
      );
    }
  }
  if (operations.length)
    await database.write(async () => database.batch(...operations));
}

export async function clearUnitMappings(
  owner: UnitMappingOwner,
): Promise<void> {
  if (!owner.userId) return;
  const records = await database.collections
    .get<BleUnitMapping>('ble_unit_mappings')
    .query(...ownerWhere(owner))
    .fetch();
  if (records.length)
    await database.write(async () =>
      database.batch(
        ...records.map(record => record.prepareDestroyPermanently()),
      ),
    );
  await AsyncStorage.removeItem(`@markwise/ble-unit-mappings/${owner.role}/v1`);
}

export async function clearSelectedUnitSelections(
  userId: string,
  role: UnitMappingRole,
  institutionId?: string | null,
): Promise<void> {
  const records = await selectedCollection()
    .query(
      Q.where('user_id', userId),
      Q.where('role', role),
      ...(institutionId ? [Q.where('institution_id', institutionId)] : []),
    )
    .fetch();
  if (records.length)
    await database.write(async () =>
      database.batch(
        ...records.map(record => record.prepareDestroyPermanently()),
      ),
    );
  // Remove the legacy key after migration/logout.
  await AsyncStorage.removeItem(
    `@markwise/${role}-unit-selection/${userId}/v1`,
  );
  await AsyncStorage.removeItem(
    `@markwise/${role}-unit-selection/${userId}/initialized-v1`,
  );
  await AsyncStorage.removeItem(`@markwise/${role}-unit-selection-v1`);
}
