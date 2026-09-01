import crypto from "node:crypto";
import type { PrismaClient } from "../../../generated/prisma/client.js";
import {
  formatBleId,
  UNIT_BLE_ID_MAX,
  UNIT_BLE_ID_MIN,
  type BleMappingResponse,
  type UnitBleMapping,
} from "./mapping.schema.js";

function createMappingVersion(
  unitMappings: Record<string, UnitBleMapping>,
): string {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ unitMappings }))
    .digest("hex");
}

export async function getBleMappings(
  prisma: PrismaClient,
  institutionId?: string | null,
): Promise<BleMappingResponse> {
  const units = await prisma.unit.findMany({
    where: {
      bleId: { not: null },
      ...(institutionId ? { institutionId } : {}),
    },
    select: { id: true, bleId: true, name: true, code: true },
    orderBy: { bleId: "asc" },
  });

  const unitMappings: Record<string, UnitBleMapping> = {};
  for (const unit of units) {
    if (!unit.bleId) continue;
    unitMappings[unit.bleId] = {
      id: unit.id,
      bleId: unit.bleId,
      code: unit.code,
      name: unit.name,
    };
  }

  return {
    version: createMappingVersion(unitMappings),
    generatedAt: new Date().toISOString(),
    unitMappings,
  };
}

export function buildAvailableUnitBleIds(
  usedIds: Set<string>,
  count: number,
): string[] {
  const available: string[] = [];

  for (let id = UNIT_BLE_ID_MIN; id <= UNIT_BLE_ID_MAX; id += 1) {
    const bleId = formatBleId(id);
    if (!usedIds.has(bleId)) {
      available.push(bleId);
      if (available.length >= count) return available;
    }
  }

  if (available.length < count) {
    throw new Error(
      `No available BLE ID in range ${formatBleId(UNIT_BLE_ID_MIN)}-${formatBleId(UNIT_BLE_ID_MAX)}`,
    );
  }

  return available;
}

export async function getNextUnitBleId(prisma: PrismaClient): Promise<string> {
  const units = await prisma.unit.findMany({
    where: { bleId: { not: null } },
    select: { bleId: true },
  });
  const usedIds = new Set(
    units.flatMap((unit) => (unit.bleId ? [unit.bleId] : [])),
  );

  return buildAvailableUnitBleIds(usedIds, 1)[0];
}

export async function getLecturerBleMappings(
  prisma: PrismaClient,
  lecturerId: string,
) {
  const lecturer = await prisma.lecturer.findUnique({
    where: { id: lecturerId },
    select: { institutionId: true },
  });
  if (!lecturer) return { units: [] };

  const units = await prisma.unit.findMany({
    // Lecturers select units from their institution at attendance time; they
    // are not restricted to lecturerUnit assignment rows.
    where: {
      institutionId: lecturer.institutionId,
      bleId: { not: null },
    },
    select: { code: true, bleId: true },
    orderBy: { code: "asc" },
  });

  return {
    units: units.flatMap((unit) =>
      unit.bleId ? [{ unitCode: unit.code, bleId: unit.bleId }] : [],
    ),
  };
}

export async function getStudentBleMappings(
  prisma: PrismaClient,
  studentId: string,
) {
  const units = await prisma.unit.findMany({
    where: {
      enrollments: { some: { studentId } },
      bleId: { not: null },
    },
    select: { code: true, name: true, bleId: true },
    orderBy: { code: "asc" },
  });

  return {
    units: units.flatMap((unit) =>
      unit.bleId
        ? [{ unitCode: unit.code, unitName: unit.name, bleId: unit.bleId }]
        : [],
    ),
  };
}
