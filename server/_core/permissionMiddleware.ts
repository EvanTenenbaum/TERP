import { TRPCError } from "@trpc/server";
import { middleware } from "./trpc";
import { hasPermission, hasAllPermissions, hasAnyPermission, isSuperAdmin } from "../services/permissionService";
import { logger } from "./logger";
import { env } from "./env";

// Public demo user constants
const PUBLIC_USER_EMAIL = env.PUBLIC_DEMO_USER_EMAIL || "demo+public@terp-app.local";
const PUBLIC_USER_OPEN_ID = env.PUBLIC_DEMO_USER_ID || "public-demo-user";

/**
 * Check if a user is the public demo user
 * Matches by openId, email, or the synthetic id of -1
 */
function isPublicDemoUser(user: { id: number; openId: string; email: string | null }): boolean {
  return (
    user.id === -1 ||
    user.openId === PUBLIC_USER_OPEN_ID ||
    user.email === PUBLIC_USER_EMAIL
  );
}

/**
 * Permission Checking Middleware for tRPC
 * 
 * This middleware enforces RBAC permissions on tRPC procedures.
 * It provides three variants:
 * 1. requirePermission - Requires a single permission
 * 2. requireAllPermissions - Requires ALL of the specified permissions
 * 3. requireAnyPermission - Requires ANY of the specified permissions
 * 
 * Super Admins bypass all permission checks.
 * Public demo users get automatic read permissions.
 */

/**
 * Middleware that requires a single permission
 * 
 * Usage:
 * ```
 * export const myProcedure = protectedProcedure
 *   .use(requirePermission('orders:create'))
 *   .query(async ({ ctx }) => {
 *     // User has 'orders:create' permission
 *   });
 * ```
 */
export function requirePermission(permissionName: string) {
  return middleware(async ({ ctx, next }) => {
    // Require authentication - no public access
    if (!ctx.user) {
      logger.warn({ 
        msg: "Permission check failed: no user", 
        permission: permissionName 
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required to perform this action",
      });
    }

    // Public demo user gets read permissions automatically
    const isPublic = isPublicDemoUser(ctx.user);
    logger.debug({
      msg: "Permission check - public user check",
      isPublic,
      userId: ctx.user.id,
      openId: ctx.user.openId,
      email: ctx.user.email,
      expectedOpenId: PUBLIC_USER_OPEN_ID,
      expectedEmail: PUBLIC_USER_EMAIL,
      permission: permissionName,
    });
    
    if (isPublic && permissionName.endsWith(':read')) {
      logger.info({ 
        msg: "Permission granted to public user for read operation", 
        permission: permissionName,
        userId: ctx.user.id,
        email: ctx.user.email
      });
      return next({ ctx });
    }

    const userId = ctx.user.openId; // Use user's openId

    // Super Admins bypass all permission checks
    const isSA = await isSuperAdmin(userId);
    if (isSA) {
      logger.debug({ 
        msg: "Permission check bypassed for Super Admin", 
        userId, 
        permission: permissionName 
      });
      return next({ ctx });
    }

    // Check if user has the required permission
    const hasIt = await hasPermission(userId, permissionName);

    if (!hasIt) {
      logger.warn({ 
        msg: "Permission denied", 
        userId, 
        permission: permissionName 
      });
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You do not have permission to perform this action. Required permission: ${permissionName}`,
      });
    }

    logger.debug({ 
      msg: "Permission check passed", 
      userId, 
      permission: permissionName 
    });

    return next({ ctx });
  });
}

/**
 * Middleware that requires ALL of the specified permissions
 * 
 * Usage:
 * ```
 * export const myProcedure = protectedProcedure
 *   .use(requireAllPermissions(['orders:create', 'orders:view_pricing']))
 *   .query(async ({ ctx }) => {
 *     // User has both permissions
 *   });
 * ```
 */
export function requireAllPermissions(permissionNames: string[]) {
  return middleware(async ({ ctx, next }) => {
    // Require authentication - no public access
    if (!ctx.user) {
      logger.warn({ 
        msg: "Permission check failed: no user", 
        permissions: permissionNames 
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required to perform this action",
      });
    }

    // Public demo user gets read permissions automatically
    if (isPublicDemoUser(ctx.user)) {
      // Check if ALL required permissions are read permissions
      const allReadPermissions = permissionNames.every(p => p.endsWith(':read'));
      if (allReadPermissions) {
        logger.debug({ 
          msg: "Permission granted to public user for read operations", 
          permissions: permissionNames,
          userId: ctx.user.id,
          email: ctx.user.email
        });
        return next({ ctx });
      } else {
        // Public user can't perform write operations
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Public users can only perform read operations",
        });
      }
    }

    const userId = ctx.user.openId;

    // Super Admins bypass all permission checks
    const isSA = await isSuperAdmin(userId);
    if (isSA) {
      logger.debug({ 
        msg: "Permission check bypassed for Super Admin", 
        userId, 
        permissions: permissionNames 
      });
      return next({ ctx });
    }

    // Check if user has ALL required permissions
    const hasAll = await hasAllPermissions(userId, permissionNames);

    if (!hasAll) {
      logger.warn({ 
        msg: "Permission denied (requires ALL)", 
        userId, 
        permissions: permissionNames 
      });
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You do not have permission to perform this action. Required permissions: ${permissionNames.join(", ")}`,
      });
    }

    logger.debug({ 
      msg: "Permission check passed (ALL)", 
      userId, 
      permissions: permissionNames 
    });

    return next({ ctx });
  });
}

/**
 * Middleware that requires ANY of the specified permissions
 * 
 * Usage:
 * ```
 * export const myProcedure = protectedProcedure
 *   .use(requireAnyPermission(['orders:create', 'quotes:create']))
 *   .query(async ({ ctx }) => {
 *     // User has at least one of the permissions
 *   });
 * ```
 */
export function requireAnyPermission(permissionNames: string[]) {
  return middleware(async ({ ctx, next }) => {
    // Require authentication - no public access
    if (!ctx.user) {
      logger.warn({ 
        msg: "Permission check failed: no user", 
        permissions: permissionNames 
      });
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required to perform this action",
      });
    }

    // Public demo user gets read permissions automatically
    if (isPublicDemoUser(ctx.user)) {
      // Check if ANY required permission is a read permission
      const hasReadPermission = permissionNames.some(p => p.endsWith(':read'));
      if (hasReadPermission) {
        logger.debug({ 
          msg: "Permission granted to public user for read operation", 
          permissions: permissionNames,
          userId: ctx.user.id,
          email: ctx.user.email
        });
        return next({ ctx });
      } else {
        // Public user can't perform write operations
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Public users can only perform read operations",
        });
      }
    }

    const userId = ctx.user.openId;

    // Super Admins bypass all permission checks
    const isSA = await isSuperAdmin(userId);
    if (isSA) {
      logger.debug({ 
        msg: "Permission check bypassed for Super Admin", 
        userId, 
        permissions: permissionNames 
      });
      return next({ ctx });
    }

    // Check if user has ANY of the required permissions
    const hasAny = await hasAnyPermission(userId, permissionNames);

    if (!hasAny) {
      logger.warn({ 
        msg: "Permission denied (requires ANY)", 
        userId, 
        permissions: permissionNames 
      });
      throw new TRPCError({
        code: "FORBIDDEN",
        message: `You do not have permission to perform this action. Required permissions (any): ${permissionNames.join(", ")}`,
      });
    }

    logger.debug({ 
      msg: "Permission check passed (ANY)", 
      userId, 
      permissions: permissionNames 
    });

    return next({ ctx });
  });
}
