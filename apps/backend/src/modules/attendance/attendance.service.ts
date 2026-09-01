import type { Prisma, PrismaClient } from "../../generated/prisma/client.js";
import type { RedisClientType } from "redis";
import {
  MAX_ONLINE_SESSION_MINUTES,
  normalizeUnitCode,
} from "./attendance.schema.js";

export class AttendanceService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly redis: RedisClientType | null = null,
  ) {}

  private async findUnitByCode(
    code: string,
    institutionId: string,
    select: { id: true; name: true; code: true },
  ) {
    // Always filter to the given institution so identical unit codes at
    // different institutions never collide. Unit.code is unique per
    // institution (see schema.prisma), so this is now a direct lookup
    // rather than a chain traversal through semester/courseYear/course.
    const unit = await this.prisma.unit.findFirst({
      where: { code, institutionId },
      select,
    });
    if (unit) return unit;

    // Fallback: try normalized comparison within the same institution.
    const units = await this.prisma.unit.findMany({
      where: { institutionId },
      select,
    });
    return (
      units.find(
        (u) => normalizeUnitCode(u.code) === normalizeUnitCode(code),
      ) ?? null
    );
  }

  private sessionCacheKey(sessionId: string) {
    return `markwise:attendance:session:${sessionId}`;
  }

  async audit(input: {
    event: string;
    actorId?: string;
    role?: "student" | "lecturer";
    sessionId?: string;
    deviceId?: string;
    ipAddress?: string;
    success: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  }) {
    await this.prisma.auditLog.create({
      data: {
        ...input,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
      },
    });
  }

  async createOnlineSession(input: {
    lecturerId: string;
    unitCode: string;
    expiresAt: Date;
  }) {
    const unitCode = normalizeUnitCode(input.unitCode);
    if (!unitCode) throw new Error("Unit code is required");

    // Resolve the lecturer's institution so we scope everything correctly.
    const lecturer = await this.prisma.lecturer.findUnique({
      where: { id: input.lecturerId },
      select: { institutionId: true },
    });
    if (!lecturer) throw new Error("Lecturer not found");

    const assignment = await this.prisma.lecturerUnit.findMany({
      where: { lecturerId: input.lecturerId },
      select: { unit: { select: { code: true } } },
    });
    const assignedUnit = assignment.find(
      ({ unit }) => normalizeUnitCode(unit.code) === unitCode,
    );
    if (!assignedUnit) {
      await this.audit({
        event: "ONLINE_SESSION_CREATE",
        actorId: input.lecturerId,
        role: "lecturer",
        success: false,
        reason: "UNIT_NOT_ASSIGNED",
        metadata: { unitCode },
      });
      throw new Error("You are not assigned to this unit");
    }

    const maximumExpiry = new Date(
      Date.now() + MAX_ONLINE_SESSION_MINUTES * 60 * 1000,
    );
    const expiresAt =
      input.expiresAt < maximumExpiry ? input.expiresAt : maximumExpiry;

    const session = await this.prisma.onlineAttendanceSession.create({
      data: {
        lecturerId: input.lecturerId,
        institutionId: lecturer.institutionId,
        unitCode: assignedUnit.unit.code,
        expiresAt,
      },
    });
    await this.audit({
      event: "ONLINE_SESSION_CREATE",
      actorId: input.lecturerId,
      role: "lecturer",
      sessionId: session.id,
      success: true,
      metadata: { unitCode },
    });
    return session;
  }

  getLecturerOnlineSessions(lecturerId: string) {
    return this.prisma.onlineAttendanceSession.findMany({
      where: { lecturerId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { records: true } } },
    });
  }

  async getOnlineSession(sessionId: string) {
    const cacheKey = this.sessionCacheKey(sessionId);
    if (this.redis?.isReady) {
      try {
        const cached = await this.redis.get(cacheKey);
        if (cached) return JSON.parse(cached) as Record<string, unknown>;
      } catch {
        // Cache failure must never block attendance.
      }
    }

    const session = await this.prisma.onlineAttendanceSession.findUnique({
      where: { id: sessionId },
      include: { _count: { select: { records: true } } },
    });

    if (!session) return null;
    const unit = await this.findUnitByCode(session.unitCode, session.institutionId, {
      id: true,
      name: true,
      code: true,
    });
    const expired = session.endedAt !== null || session.expiresAt <= new Date();
    const result = {
      ...session,
      unitName: unit?.name ?? null,
      unitCode: unit?.code ?? session.unitCode,
      status: expired ? "expired" : session.status,
    };

    if (this.redis?.isReady && !expired) {
      try {
        const ttl = Math.max(
          1,
          Math.min(
            10,
            Math.ceil((session.expiresAt.getTime() - Date.now()) / 1000),
          ),
        );
        await this.redis.set(cacheKey, JSON.stringify(result), { EX: ttl });
      } catch {
        // Cache failure must never block attendance.
      }
    }
    return result;
  }

  async submitOnlineAttendance(input: {
    sessionId: string;
    studentId: string;
    deviceId?: string;
    ipAddress?: string;
    deviceVerified?: boolean;
  }) {
    const student = await this.prisma.student.findUnique({
      where: { id: input.studentId },
      select: { admissionNumber: true, institutionId: true },
    });
    if (!student) {
      await this.audit({
        event: "ONLINE_ATTENDANCE_SUBMIT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "STUDENT_NOT_FOUND",
      });
      return { success: false, blocked: true as const };
    }

    const session = await this.prisma.onlineAttendanceSession.findUnique({
      where: { id: input.sessionId },
      select: { unitCode: true, expiresAt: true, endedAt: true, institutionId: true },
    });
    if (!session || session.endedAt || session.expiresAt <= new Date()) {
      await this.audit({
        event: "ONLINE_ATTENDANCE_SUBMIT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "SESSION_CLOSED",
      });
      return { success: false, blocked: true as const };
    }

    // Strict institution boundary: a student from institution A cannot mark
    // attendance for a session run at institution B.
    if (session.institutionId !== student.institutionId) {
      await this.audit({
        event: "ONLINE_ATTENDANCE_SUBMIT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "INSTITUTION_MISMATCH",
      });
      return { success: false, blocked: true as const };
    }

    if (!input.deviceId?.trim()) {
      await this.audit({
        event: "ONLINE_ATTENDANCE_SUBMIT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "DEVICE_REQUIRED",
      });
      return { success: false, blocked: true as const };
    }

    const boundDevices = await this.prisma.studentDevice.findMany({
      where: { userId: input.studentId, role: "student" },
      select: { deviceKey: true },
    });
    if (
      !input.deviceVerified &&
      boundDevices.length > 0 &&
      !boundDevices.some((device) => device.deviceKey === input.deviceId)
    ) {
      await this.audit({
        event: "ONLINE_DEVICE_CONFLICT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "DIFFERENT_DEVICE",
      });
      return { success: false, blocked: true as const };
    }
    if (!input.deviceVerified && boundDevices.length === 0) {
      const deviceOwner = await this.prisma.studentDevice.findUnique({
        where: { deviceKey: input.deviceId },
        select: { userId: true },
      });
      if (deviceOwner && deviceOwner.userId !== input.studentId) {
        await this.audit({
          event: "ONLINE_DEVICE_CONFLICT",
          actorId: input.studentId,
          role: "student",
          sessionId: input.sessionId,
          deviceId: input.deviceId,
          ipAddress: input.ipAddress,
          success: false,
          reason: "DEVICE_BOUND_TO_OTHER_ACCOUNT",
        });
        return { success: false, blocked: true as const };
      }
      try {
        await this.prisma.studentDevice.create({
          data: {
            userId: input.studentId,
            deviceKey: input.deviceId,
            role: "student",
          },
        });
      } catch (error: unknown) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "P2002"
        ) {
          await this.audit({
            event: "ONLINE_DEVICE_CONFLICT",
            actorId: input.studentId,
            role: "student",
            sessionId: input.sessionId,
            deviceId: input.deviceId,
            ipAddress: input.ipAddress,
            success: false,
            reason: "DEVICE_BOUND_TO_OTHER_ACCOUNT",
          });
          return { success: false, blocked: true as const };
        }
        throw error;
      }
    } else if (!input.deviceVerified) {
      await this.prisma.studentDevice.update({
        where: {
          userId_deviceKey: {
            userId: input.studentId,
            deviceKey: input.deviceId,
          },
        },
        data: { lastUsedAt: new Date() },
      });
    }

    const unit = await this.findUnitByCode(session.unitCode, session.institutionId, {
      id: true,
      name: true,
      code: true,
    });
    if (!unit) {
      await this.audit({
        event: "ONLINE_ATTENDANCE_SUBMIT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "UNIT_NOT_FOUND",
      });
      return { success: false, blocked: true as const };
    }

    const enrolled = await this.prisma.enrollment.findUnique({
      where: {
        studentId_unitId: { studentId: input.studentId, unitId: unit.id },
      },
      select: { id: true },
    });
    if (!enrolled) {
      await this.audit({
        event: "ONLINE_ATTENDANCE_SUBMIT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "NOT_ENROLLED",
      });
      return { success: false, blocked: true as const };
    }

    const existingDevice = input.deviceId
      ? await this.prisma.onlineAttendanceRecord.findFirst({
          where: { sessionId: input.sessionId, deviceId: input.deviceId },
          select: { studentId: true },
        })
      : null;
    if (existingDevice && existingDevice.studentId !== input.studentId) {
      await this.audit({
        event: "ONLINE_DEVICE_CONFLICT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: false,
        reason: "DEVICE_USED_BY_OTHER_STUDENT",
      });
      return { success: false, blocked: true as const };
    }

    try {
      const record = await this.prisma.onlineAttendanceRecord.create({
        data: {
          sessionId: input.sessionId,
          studentId: input.studentId,
          admissionNumber: student.admissionNumber,
          unitCode: normalizeUnitCode(session.unitCode),
          deviceId: input.deviceId,
          ipAddress: input.ipAddress,
        },
      });
      await this.audit({
        event: "ONLINE_ATTENDANCE_SUBMIT",
        actorId: input.studentId,
        role: "student",
        sessionId: input.sessionId,
        deviceId: input.deviceId,
        ipAddress: input.ipAddress,
        success: true,
      });
      return { success: true as const, record };
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        await this.audit({
          event: "ONLINE_ATTENDANCE_DUPLICATE",
          actorId: input.studentId,
          role: "student",
          sessionId: input.sessionId,
          deviceId: input.deviceId,
          ipAddress: input.ipAddress,
          success: false,
          reason: "DUPLICATE_SUBMISSION",
        });
        return { success: false, duplicate: true as const };
      }
      throw error;
    }
  }

  async endOnlineSession(sessionId: string, lecturerId: string) {
    const result = await this.prisma.onlineAttendanceSession.updateMany({
      where: { id: sessionId, lecturerId, endedAt: null },
      data: { status: "ended", endedAt: new Date() },
    });
    if (result.count > 0 && this.redis?.isReady) {
      await this.redis
        .del(this.sessionCacheKey(sessionId))
        .catch(() => undefined);
    }
    return result;
  }

  async getOnlineSessionAttendees(sessionId: string, lecturerId: string) {
    const session = await this.prisma.onlineAttendanceSession.findFirst({
      where: { id: sessionId, lecturerId },
      select: { id: true },
    });
    if (!session) return null;

    return this.prisma.onlineAttendanceRecord.findMany({
      where: { sessionId },
      orderBy: { markedAt: "asc" },
      select: {
        id: true,
        studentId: true,
        admissionNumber: true,
        unitCode: true,
        markedAt: true,
      },
    });
  }
}
