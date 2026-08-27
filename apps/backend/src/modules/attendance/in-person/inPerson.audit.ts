import type { PrismaClient } from "../../../generated/prisma/client.js";

export class InPersonAudit {
  constructor(private readonly prisma: PrismaClient) {}

  write(
    event: string,
    actorId: string,
    success: boolean,
    reason?: string,
    metadata?: object,
  ) {
    return this.prisma.auditLog.create({
      data: {
        event,
        actorId,
        role: "student",
        success,
        reason,
        metadata: metadata as any,
      },
    });
  }
}
