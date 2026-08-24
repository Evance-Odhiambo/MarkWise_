import type { PrismaClient } from "../../generated/prisma/client.js";
import {
  getBleMappings,
  getLecturerBleMappings,
  getStudentBleMappings,
  getNextUnitBleId,
} from "./mappings/mapping.service.js";
import type { BleMappingResponse } from "./mappings/mapping.schema.js";

/**
 * Backend coordinator for institution BLE mappings.
 *
 * BLE hardware remains on the mobile clients; this manager owns the
 * authoritative Unit.bleId mapping and the snapshots consumed by clients.
 */
export class BleManager {
  constructor(private readonly prisma: PrismaClient) {}

  getMappings(institutionId?: string | null): Promise<BleMappingResponse> {
    return getBleMappings(this.prisma, institutionId);
  }

  getNextUnitBleId(): Promise<string> {
    return getNextUnitBleId(this.prisma);
  }

  getLecturerMappings(lecturerId: string) {
    return getLecturerBleMappings(this.prisma, lecturerId);
  }

  getStudentMappings(studentId: string) {
    return getStudentBleMappings(this.prisma, studentId);
  }
}

export function createBleManager(prisma: PrismaClient): BleManager {
  return new BleManager(prisma);
}
