/**
 * Admin Setup Router
 * 
 * One-time setup endpoint to promote users to admin role.
 * This is a temporary utility - should be removed after initial setup.
 * 
 * Security: Uses a secret key that must match ADMIN_SETUP_KEY env var
 */

import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../_core/db";
import { users } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Secret key for admin setup - set this in your environment
const ADMIN_SETUP_KEY = process.env.ADMIN_SETUP_KEY || "terp-admin-setup-2024";

export const adminSetupRouter = router({
  /**
   * List all users (for finding the user to promote)
   * Requires the setup key for security
   */
  listUsers: publicProcedure
    .input(z.object({ 
      setupKey: z.string() 
    }))
    .query(async ({ input }) => {
      if (input.setupKey !== ADMIN_SETUP_KEY) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid setup key"
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
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

      return allUsers;
    }),

  /**
   * Promote a user to admin role
   * Requires the setup key for security
   */
  promoteToAdmin: publicProcedure
    .input(z.object({
      setupKey: z.string(),
      userId: z.number().optional(),
      email: z.string().optional(),
      openId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      if (input.setupKey !== ADMIN_SETUP_KEY) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid setup key"
        });
      }

      if (!input.userId && !input.email && !input.openId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide userId, email, or openId"
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
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
      const result = await db
        .update(users)
        .set({ role: "admin" })
        .where(whereClause!);

      return { 
        success: true, 
        message: "User promoted to admin successfully" 
      };
    }),

  /**
   * Promote ALL users to admin (use with caution!)
   * Requires the setup key for security
   */
  promoteAllToAdmin: publicProcedure
    .input(z.object({
      setupKey: z.string(),
      confirmPhrase: z.string(), // Must be "I understand this promotes all users"
    }))
    .mutation(async ({ input }) => {
      if (input.setupKey !== ADMIN_SETUP_KEY) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid setup key"
        });
      }

      if (input.confirmPhrase !== "I understand this promotes all users") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid confirmation phrase"
        });
      }

      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available"
        });
      }

      // Update all users to admin
      await db.execute(sql`UPDATE users SET role = 'admin'`);

      return { 
        success: true, 
        message: "All users promoted to admin successfully" 
      };
    }),
});
