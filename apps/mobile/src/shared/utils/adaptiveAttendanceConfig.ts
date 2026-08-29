import { API_BASE_URL } from '../constants';
import {
  readBleMappingsCache,
  isBleMappingsCacheFresh,
  cacheBleMappings,
  fetchBleMappingsFromApi,
  runWithBleMapppingsFetchLock,
} from '../storage/bleCache';
import {
  loadUnitMappings,
  saveUnitMappings,
  UnitMappingRole,
  StoredUnitMapping,
  UnitMappingOwner,
  clearUnitMappings,
} from '../storage/unitMappings';

const normalizeCode = (value: string) =>
  String(value || '')
    .toUpperCase()
    .replace(/\s+/g, '')
    .replace(/[^A-Z0-9]/g, '');

const normalizeBleId = (value: string): string => {
  const raw = String(value || '').trim().toUpperCase();
  if (!raw) return '';
  const stripped = raw.replace(/^0X/i, '').replace(/^[UR]/i, '');
  const parsed = Number(stripped);
  return Number.isInteger(parsed) && parsed >= 0 && parsed <= 7999
    ? String(parsed)
    : '';
};

class AdaptiveAttendanceConfig {
  private role: UnitMappingRole | null = null;
  private mappings = new Map<string, string>();
  private codeToId = new Map<string, number>();
  private selectedCodes = new Set<string>();
  private institutionId: string | null = null;
  private userId: string | null = null;
  private initialized = false;

  async initialize(
    role: UnitMappingRole,
    selectedCodes: string[],
    institutionId?: string | null,
    userId?: string | null,
  ) {
    this.role = role;
    this.institutionId = institutionId || null;
    this.userId = userId || null;
    this.selectedCodes = new Set(
      selectedCodes.map(normalizeCode).filter(Boolean),
    );
    const cached = this.userId
      ? await loadUnitMappings({
          userId: this.userId,
          role,
          institutionId: this.institutionId,
        })
      : [];
    if (cached.length) {
      this.replaceMappings(cached);
    } else {
      this.clearMemory();
    }
    this.initialized = true;
    return this.getAllUnits();
  }

  async syncSelectedUnits(
    token: string,
    selectedCodes: string[] = [...this.selectedCodes],
    userId = this.userId || '',
  ) {
    if (!this.role || !token || !userId) return this.getAllUnits();
    const role = this.role;
    const selected = new Set(selectedCodes.map(normalizeCode).filter(Boolean));

    const cached = await readBleMappingsCache(role);
    if (cached && isBleMappingsCacheFresh(cached)) {
      const units = cached.mappings.filter(unit =>
        selected.has(normalizeCode(unit.unitCode)),
      );
      if (units.length) {
        this.selectedCodes = selected;
        this.replaceMappings(units);
        await saveUnitMappings(
          { userId, role, institutionId: this.institutionId },
          units,
        );
        return this.getAllUnits();
      }
    }

    const remote = await runWithBleMapppingsFetchLock(
      `ble-mappings:${role}:${userId}`,
      async () => {
        const cachedFresh = await readBleMappingsCache(role);
        if (cachedFresh && isBleMappingsCacheFresh(cachedFresh)) {
          const units = cachedFresh.mappings.filter(unit =>
            selected.has(normalizeCode(unit.unitCode)),
          );
          if (units.length) return units;
        }

        const fetched = await fetchBleMappingsFromApi(role, token);
        if (!fetched) return [] as StoredUnitMapping[];
        await cacheBleMappings(role, fetched.mappings, fetched.version);
        return fetched.mappings.filter(unit =>
          selected.has(normalizeCode(unit.unitCode)),
        );
      },
    );

    this.selectedCodes = selected;
    this.replaceMappings(remote);
    await saveUnitMappings(
      { userId, role, institutionId: this.institutionId },
      remote,
    );
    return this.getAllUnits();
  }

  async setSelectedUnits(
    role: UnitMappingRole,
    selectedCodes: string[],
    userId = this.userId || '',
    institutionId = this.institutionId,
  ) {
    this.role = role;
    this.userId = userId || null;
    this.institutionId = institutionId || null;
    this.selectedCodes = new Set(selectedCodes.map(normalizeCode));
    const cached = userId
      ? await loadUnitMappings({
          userId,
          role,
          institutionId: this.institutionId,
        })
      : [];
    const units = cached.filter(unit =>
      this.selectedCodes.has(normalizeCode(unit.unitCode)),
    );
    this.replaceMappings(units);
    if (userId)
      await saveUnitMappings(
        { userId, role, institutionId: this.institutionId },
        units,
      );
    return this.getAllUnits();
  }

  async clearForUser(owner: UnitMappingOwner) {
    await clearUnitMappings(owner);
    if (this.userId === owner.userId && this.role === owner.role) {
      this.clearMemory();
      this.initialized = false;
    }
  }

  getUnitId(unitCode: string): number | null {
    return this.codeToId.get(normalizeCode(unitCode)) ?? null;
  }

  getUnitCodeFromId(unitId: string | number): string | null {
    const numericId =
      typeof unitId === 'number'
        ? unitId
        : /^0x/i.test(unitId)
        ? parseInt(unitId, 16)
        : parseInt(unitId, 10);
    if (Number.isNaN(numericId)) return null;
    return (
      this.mappings.get(String(numericId).padStart(4, '0')) ||
      this.mappings.get(`0x${numericId.toString(16).toUpperCase()}`) ||
      null
    );
  }

  getAllUnits() {
    const units: StoredUnitMapping[] = [];
    const seen = new Set<string>();
    for (const [key, code] of this.mappings) {
      if (key.startsWith('0x') || seen.has(code)) continue;
      seen.add(code);
      units.push({ unitCode: code, bleId: key });
    }
    return units;
  }

  isInitialized() {
    return this.initialized;
  }
  normalizeCode(code: string) {
    return normalizeCode(code);
  }

  private replaceMappings(units: StoredUnitMapping[]) {
    this.clearMemory();
    for (const unit of units) {
      const code = normalizeCode(unit.unitCode);
      const bleId = normalizeBleId(unit.bleId);
      const id = Number(bleId);
      if (!code || !bleId || !Number.isInteger(id) || id < 0 || id > 7999)
        continue;
      this.mappings.set(String(id).padStart(4, '0'), code);
      this.mappings.set(`0x${id.toString(16).toUpperCase()}`, code);
      this.codeToId.set(code, id);
    }
  }

  private clearMemory() {
    this.mappings.clear();
    this.codeToId.clear();
  }
}

export const adaptiveConfig = new AdaptiveAttendanceConfig();
