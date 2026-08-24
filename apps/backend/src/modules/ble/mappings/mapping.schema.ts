export interface UnitBleMapping {
  id: string;
  bleId: string;
  code: string;
  name: string;
}

export interface BleMappingResponse {
  version: string;
  generatedAt: string;
  unitMappings: Record<string, UnitBleMapping>;
}

export const UNIT_BLE_ID_MIN = 0;
export const UNIT_BLE_ID_MAX = 7999;

export function formatBleId(value: number): string {
  return value.toString().padStart(4, "0");
}

export function isValidBleId(bleId: string): boolean {
  return /^\d{4}$/.test(bleId);
}

export function isValidUnitBleId(bleId: string): boolean {
  if (!isValidBleId(bleId)) return false;
  const numericId = Number(bleId);
  return numericId >= UNIT_BLE_ID_MIN && numericId <= UNIT_BLE_ID_MAX;
}
