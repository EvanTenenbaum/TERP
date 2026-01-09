/**
 * Admin Setup Router
 *
 * One-time setup endpoint to promote users to admin role.
 * This is a temporary utility - should be removed after initial setup.
 *
 * Security:
 * - Uses a secret key that must match ADMIN_SETUP_KEY env var
 * - SEC-012: Rate limited to 5 requests per minute per IP
 * - SEC-012: All actions are audit logged
 */

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../_core/db";
import { users, auditLogs } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { logger } from "../_core/logger";

// SEC-012: In-memory rate limiter for admin setup endpoints
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }

  if (record.count >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

// SEC-012: Audit logging helper for admin setup actions
async function logAdminSetupAction(
  action: string,
  details: Record<string, unknown>,
  success: boolean,
  ip?: string
): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    await db.insert(auditLogs).values({
      actorId: 0, // System/anonymous action
      entity: "admin_setup",
      entityId: 0,
      action: `ADMIN_SETUP_${action}`,
      after: JSON.stringify({ ...details, success, ip, timestamp: new Date().toISOString() }),
      reason: success ? "Success" : "Failed attempt",
    });

    logger.info({ action, details, success, ip }, "Admin setup action logged");
  } catch (error) {
    logger.error({ error, action }, "Failed to log admin setup action");
  }
}

// Helper to extract IP from context
function getClientIp(ctx: unknown): string {
  const context = ctx as { req?: { ip?: string; headers?: { "x-forwarded-for"?: string } } };
  return context?.req?.ip || context?.req?.headers?.["x-forwarded-for"] || "unknown";
}

// Secret key for admin setup - set this in your environment
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || "terp-admin-setup-2024";

export const adminSetupRouter = router({
  /**
   * List all users (for finding the user to promote)
   * Requires the setup key for security
   * SEC-012: Rate limited and audit logged
   */
  listUsers: publicProcedure
    .input(z.object({
      setupKey: z.string(),
    }))
    .query(async ({ input, ctx }) => {
      const ip = getClientIp(ctx);

      // SEC-012: Check rate limit
      if (!checkRateLimit(ip)) {
        await logAdminSetupAction("LIST_USERS", { reason: "rate_limited" }, false, ip);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      if (input.setupKey !== ADMIN_SETUP_KEY) {
        await logAdminSetupAction("LIST_USERS", { reason: "invalid_key" }, false, ip);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid setup key",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const allUsers = await db
        .select({
          id: users.id,
          openId: users.openId,
          email: users.email,
          name: users.name,
          role: users.role,
        })
        .from(users)
        .limit(100);

      await logAdminSetupAction("LIST_USERS", { userCount: allUsers.length }, true, ip);
      return allUsers;
    }),

  /**
   * Promote a user to admin role
   * Requires the setup key for security
   * SEC-012: Rate limited and audit logged
   */
  promoteToAdmin: publicProcedure
    .input(z.object({
      setupKey: z.string(),
      userId: z.number().optional(),
      email: z.string().optional(),
      openId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = getClientIp(ctx);

      // SEC-012: Check rate limit
      if (!checkRateLimit(ip)) {
        await logAdminSetupAction("PROMOTE_USER", { reason: "rate_limited" }, false, ip);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      if (input.setupKey !== ADMIN_SETUP_KEY) {
        await logAdminSetupAction("PROMOTE_USER", { reason: "invalid_key", target: input.userId || input.email || input.openId }, false, ip);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid setup key",
        });
      }

      if (!input.userId && !input.email && !input.openId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide userId, email, or openId",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Build the where clause
      let whereClause;
      if (input.userId) {
        whereClause = eq(users.id, input.userId);
      } else if (input.email) {
        whereClause = eq(users.email, input.email);
      } else if (input.openId) {
        whereClause = eq(users.openId, input.openId);
      }

      // Update the user's role
      await db
        .update(users)
        .set({ role: "admin" })
        .where(whereClause!);

      await logAdminSetupAction("PROMOTE_USER", { userId: input.userId, email: input.email, openId: input.openId }, true, ip);

      return {
        success: true,
        message: "User promoted to admin successfully",
      };
    }),

  /**
   * Promote ALL users to admin (use with caution!)
   * Requires the setup key for security
   * SEC-012: Rate limited and audit logged
   */
  promoteAllToAdmin: publicProcedure
    .input(z.object({
      setupKey: z.string(),
      confirmPhrase: z.string(), // Must be "I understand this promotes all users"
    }))
    .mutation(async ({ input, ctx }) => {
      const ip = getClientIp(ctx);

      // SEC-012: Check rate limit
      if (!checkRateLimit(ip)) {
        await logAdminSetupAction("PROMOTE_ALL", { reason: "rate_limited" }, false, ip);
        throw new TRPCError({
          code: "TOO_MANY_REQUESTS",
          message: "Too many requests. Please try again later.",
        });
      }

      if (input.setupKey !== ADMIN_SETUP_KEY) {
        await logAdminSetupAction("PROMOTE_ALL", { reason: "invalid_key" }, false, ip);
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid setup key",
        });
      }

      if (input.confirmPhrase !== "I understand this promotes all users") {
        await logAdminSetupAction("PROMOTE_ALL", { reason: "invalid_confirmation" }, false, ip);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid confirmation phrase",
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Update all users to admin
      await db.execute(sql`UPDATE users SET role = 'admin'`);

      await logAdminSetupAction("PROMOTE_ALL", { action: "all_users_promoted" }, true, ip);

      return {
        success: true,
        message: "All users promoted to admin successfully",
      };
    }),
});
