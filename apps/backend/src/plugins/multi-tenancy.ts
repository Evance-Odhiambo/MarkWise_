import type { PrismaClient } from "../generated/prisma/client.js";

/**
 * Multi-tenancy middleware for Prisma
 * Automatically filters queries by institutionId based on authenticated user context
 */

// Models that should be scoped by institutionId
const TENANT_SCOPED_MODELS = new Set([
  "student",
  "lecturer",
  "course",
  "conductedSession",
  "onlineAttendanceSession",
  "bleMapping",
  "bleSyncLog",
]);

// Models that have institutionId but shouldn't be auto-filtered (e.g., Institution itself, Admin)
const EXCLUDED_MODELS = new Set([
  "institution",
  "admin",
  "onboardingRequest",
]);

export interface TenantContext {
  institutionId: string | null;
  role: string;
  bypassTenantFilter?: boolean; // For super admin operations
}

/**
 * Create a tenant-aware Prisma client
 */
export function createTenantMiddleware(prisma: PrismaClient) {
  // Store tenant context per request using AsyncLocalStorage pattern
  let currentTenantContext: TenantContext | null = null;

  /**
   * Set tenant context for the current operation
   */
  const setTenantContext = (context: TenantContext) => {
    currentTenantContext = context;
  };

  /**
   * Clear tenant context
   */
  const clearTenantContext = () => {
    currentTenantContext = null;
  };

  /**
   * Get current tenant context
   */
  const getTenantContext = (): TenantContext | null => {
    return currentTenantContext;
  };

  /**
   * Prisma middleware to automatically inject institutionId filters
   */
  prisma.$use(async (params, next) => {
    const context = getTenantContext();

    // Skip if no context or if bypassing filter (super admin)
    if (!context || context.bypassTenantFilter) {
      return next(params);
    }

    // Skip for excluded models
    if (EXCLUDED_MODELS.has(params.model || "")) {
      return next(params);
    }

    // Only apply to tenant-scoped models
    if (!TENANT_SCOPED_MODELS.has(params.model || "")) {
      return next(params);
    }

    // Skip if no institutionId in context (shouldn't happen, but safety check)
    if (!context.institutionId) {
      return next(params);
    }

    const institutionId = context.institutionId;

    // Inject institutionId filter for queries
    switch (params.action) {
      case "findUnique":
      case "findFirst":
      case "findMany":
      case "count":
      case "aggregate":
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        
        // Don't override if institutionId is explicitly set
        if (params.args.where.institutionId === undefined) {
          params.args.where.institutionId = institutionId;
        }
        break;

      case "create":
      case "createMany":
        params.args = params.args || {};
        params.args.data = params.args.data || {};
        
        // For createMany, handle array of data
        if (params.action === "createMany" && Array.isArray(params.args.data)) {
          params.args.data = params.args.data.map((item: any) => ({
            ...item,
            institutionId: item.institutionId || institutionId,
          }));
        } else {
          // For single create, inject institutionId if not set
          if (!params.args.data.institutionId) {
            params.args.data.institutionId = institutionId;
          }
        }
        break;

      case "update":
      case "updateMany":
      case "delete":
      case "deleteMany":
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        
        // Add institutionId to where clause to prevent cross-tenant modifications
        if (params.args.where.institutionId === undefined) {
          params.args.where.institutionId = institutionId;
        }
        break;

      case "upsert":
        params.args = params.args || {};
        params.args.where = params.args.where || {};
        params.args.create = params.args.create || {};
        params.args.update = params.args.update || {};
        
        // Add to where clause
        if (params.args.where.institutionId === undefined) {
          params.args.where.institutionId = institutionId;
        }
        
        // Add to create data
        if (!params.args.create.institutionId) {
          params.args.create.institutionId = institutionId;
        }
        break;
    }

    return next(params);
  });

  return {
    setTenantContext,
    clearTenantContext,
    getTenantContext,
  };
}

/**
 * Helper to execute a query with tenant context
 */
export async function withTenantContext<T>(
  context: TenantContext,
  operation: () => Promise<T>,
  middleware: ReturnType<typeof createTenantMiddleware>
): Promise<T> {
  try {
    middleware.setTenantContext(context);
    return await operation();
  } finally {
    middleware.clearTenantContext();
  }
}
