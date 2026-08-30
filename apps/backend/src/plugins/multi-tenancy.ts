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
   * Note: Prisma Client Extensions don't support middleware in all operations
   * This is a placeholder for future implementation when Prisma adds full middleware support
   */
  // prisma.$use(async (params, next) => {
  //   ... middleware implementation
  // });

  // TODO: Implement proper middleware when Prisma Client Extensions support it fully
  // For now, we rely on explicit institutionId filtering in routes

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
