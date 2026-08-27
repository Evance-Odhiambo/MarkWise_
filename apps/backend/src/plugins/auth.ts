import jwt from "@fastify/jwt";
import fp from "fastify-plugin";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/index.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: {
      id: string;
      role: "SUPER_ADMIN" | "INSTITUTION_ADMIN" | "student" | "lecturer";
      institutionId: string | null;
    };
    user: {
      id: string;
      role: "SUPER_ADMIN" | "INSTITUTION_ADMIN" | "student" | "lecturer";
      institutionId: string | null;
    };
  }
}

export const authPlugin = fp(async (app) => {
  await app.register(jwt, { secret: env.jwtSecret });
});

export function requireRoles(
  ...roles: Array<"SUPER_ADMIN" | "INSTITUTION_ADMIN">
) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Authentication required" });
    }

    if (!roles.includes(request.user.role as (typeof roles)[number])) {
      return reply.code(403).send({ error: "Insufficient permissions" });
    }
  };
}

export function requireSuperAdmin() {
  return requireRoles("SUPER_ADMIN");
}

export function requireInstitutionAdmin() {
  return requireRoles("INSTITUTION_ADMIN");
}

export function requireAttendanceRole(...roles: Array<"lecturer" | "student">) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Authentication required" });
    }

    const normalizedRole = String(request.user.role).toLowerCase();
    if (!roles.includes(normalizedRole as "lecturer" | "student")) {
      return reply.code(403).send({ error: "Attendance role required" });
    }
  };
}

export function requireBleMappingAccess(
  ...roles: Array<"SUPER_ADMIN" | "INSTITUTION_ADMIN" | "student" | "lecturer">
) {
  const allowed =
    roles.length > 0
      ? roles
      : ["SUPER_ADMIN", "INSTITUTION_ADMIN", "student", "lecturer"];
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify();
    } catch {
      return reply.code(401).send({ error: "Authentication required" });
    }
    if (!allowed.includes(request.user.role as (typeof allowed)[number])) {
      return reply.code(403).send({ error: "BLE mapping access required" });
    }
  };
}
