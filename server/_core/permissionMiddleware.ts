import { TRPCError } from "@trpc/server";
import { middleware } from "./trpc";
import { hasPermission, hasAllPermissions, hasAnyPermission, isSuperAdmin } from "../services/permissionService";
import { logger } from "./logger";

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
    // PUBLIC ACCESS MODE: Allow all permissions when no user is present
    // User explicitly requested public access for production site verification
    // TODO: Re-enable permission checks when ready for secure access
    if (!ctx.user) {
      logger.debug({ 
        msg: "Permission check bypassed: public access mode (no user)", 
        permission: permissionName 
      });
      return next({ ctx });
    }

    const userId = ctx.user.openId; // Use Clerk user ID

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
    // PUBLIC ACCESS MODE: Allow all permissions when no user is present
    // User explicitly requested public access for production site verification
    // TODO: Re-enable permission checks when ready for secure access
    if (!ctx.user) {
      logger.debug({ 
        msg: "Permission check bypassed: public access mode (no user)", 
        permissions: permissionNames 
      });
      return next({ ctx });
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
    // PUBLIC ACCESS MODE: Allow all permissions when no user is present
    // User explicitly requested public access for production site verification
    // TODO: Re-enable permission checks when ready for secure access
    if (!ctx.user) {
      logger.debug({ 
        msg: "Permission check bypassed: public access mode (no user)", 
        permissions: permissionNames 
      });
      return next({ ctx });
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
