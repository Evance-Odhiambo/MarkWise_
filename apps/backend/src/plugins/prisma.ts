import fp from "fastify-plugin";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../config/index.js";
import { createTenantMiddleware, type TenantContext } from "./multi-tenancy.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
    tenantMiddleware: ReturnType<typeof createTenantMiddleware>;
  }
  
  interface FastifyRequest {
    tenantContext?: TenantContext;
  }
}

export const prismaPlugin = fp(async (app) => {
  const adapter = new PrismaPg({
    connectionString: env.databaseUrl,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: env.databasePoolMax,
  });
  const prisma = new PrismaClient({ adapter });

  await prisma.$connect();
  
  // Create and attach tenant middleware
  const tenantMiddleware = createTenantMiddleware(prisma);
  
  app.decorate("prisma", prisma);
  app.decorate("tenantMiddleware", tenantMiddleware);

  // Add hook to automatically set tenant context from JWT for authenticated routes
  app.addHook("onRequest", async (request) => {
    // Skip for public routes
    if (!request.user) {
      return;
    }

    const user = request.user as any;
    
    // Create tenant context based on user role
    const tenantContext: TenantContext = {
      institutionId: user.institutionId || null,
      role: user.role || "unknown",
      bypassTenantFilter: user.role === "SUPER_ADMIN", // Super admin can see all data
    };

    request.tenantContext = tenantContext;
    tenantMiddleware.setTenantContext(tenantContext);
  });

  // Clear tenant context after request
  app.addHook("onResponse", async () => {
    tenantMiddleware.clearTenantContext();
  });

  app.addHook("onClose", async () => {
    await prisma.$disconnect();
  });
});
