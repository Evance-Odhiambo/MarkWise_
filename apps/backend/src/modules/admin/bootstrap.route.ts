import type { FastifyPluginAsync } from "fastify";
import { hashPassword } from "./admin.service.js";

/**
 * Bootstrap route for creating super admin
 * Should be disabled in production after initial setup
 */
export const bootstrapRoutes: FastifyPluginAsync = async (app) => {
  /**
   * POST /api/v1/admin/bootstrap/super-admin
   * Creates the initial super admin user
   * Only works if no super admin exists
   */
  app.post("/bootstrap/super-admin", async (request, reply) => {
    // Check if super admin already exists
    const existing = await app.prisma.admin.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { id: true, email: true },
    });

    if (existing) {
      return reply.code(409).send({
        error: "Super admin already exists",
        email: existing.email,
        message: "A super admin has already been created. Please use the login endpoint.",
      });
    }

    // Get credentials from request body or environment variables
    const body = request.body as Record<string, unknown>;
    const fullName = (body?.fullName as string) || process.env.SUPER_ADMIN_NAME || "MarkWise Super Admin";
    const email = ((body?.email as string) || process.env.SUPER_ADMIN_EMAIL || "").toLowerCase();
    const password = (body?.password as string) || process.env.SUPER_ADMIN_PASSWORD || "";

    if (!email || !password) {
      return reply.code(400).send({
        error: "Email and password are required",
        message: "Provide them in the request body or set SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD environment variables.",
      });
    }

    if (password.length < 8) {
      return reply.code(400).send({
        error: "Password must be at least 8 characters",
      });
    }

    // Check if email already exists
    const existingEmail = await app.prisma.admin.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingEmail) {
      return reply.code(409).send({
        error: "An admin with this email already exists",
      });
    }

    try {
      // Create super admin
      const admin = await app.prisma.admin.create({
        data: {
          fullName,
          email,
          passwordHash: await hashPassword(password),
          role: "SUPER_ADMIN",
        },
        select: {
          id: true,
          fullName: true,
          email: true,
          role: true,
          createdAt: true,
        },
      });

      app.log.info({ adminId: admin.id, email: admin.email }, "Super admin created via bootstrap endpoint");

      return reply.code(201).send({
        success: true,
        message: "Super admin created successfully",
        admin: {
          id: admin.id,
          fullName: admin.fullName,
          email: admin.email,
          role: admin.role,
          createdAt: admin.createdAt,
        },
      });
    } catch (error) {
      app.log.error({ error }, "Failed to create super admin");
      return reply.code(500).send({
        error: "Failed to create super admin",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });

  /**
   * GET /api/v1/admin/bootstrap/status
   * Check if super admin exists
   */
  app.get("/bootstrap/status", async (_request, reply) => {
    const superAdmin = await app.prisma.admin.findFirst({
      where: { role: "SUPER_ADMIN" },
      select: { email: true, createdAt: true },
    });

    if (superAdmin) {
      return reply.send({
        exists: true,
        message: "Super admin has been created",
        email: superAdmin.email,
        createdAt: superAdmin.createdAt,
      });
    }

    return reply.send({
      exists: false,
      message: "No super admin exists yet. Use POST /bootstrap/super-admin to create one.",
    });
  });
};
