import { z } from "zod";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import {
  publicProcedure,
  strictlyProtectedProcedure,
  router,
} from "../_core/trpc";
import { simpleAuth } from "../_core/simpleAuth";
import * as db from "../db";
import { logAuditEvent, AuditEventType } from "../auditLogger";
import { logger } from "../_core/logger";
import { env } from "../_core/env";

export const authRouter = router({
  me: publicProcedure.query(opts => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),

  // Update current user's profile (name, email)
  updateProfile: strictlyProtectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required").optional(),
        email: z.string().email("Invalid email format").optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      // Check if email is being changed and if it's already taken
      if (input.email && input.email !== user.email) {
        const existingUser = await db.getUserByEmail(input.email);
        if (existingUser && existingUser.id !== user.id) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Email is already in use by another user",
          });
        }
      }

      // Update user profile
      await db.upsertUser({
        ...user,
        name: input.name ?? user.name,
        email: input.email ?? user.email,
      });

      // Log audit event
      await logAuditEvent({
        eventType: AuditEventType.CONFIG_CHANGED,
        entityType: "user",
        entityId: user.id,
        userId: user.id,
        beforeState: {
          name: user.name,
          email: user.email,
        },
        afterState: {
          name: input.name ?? user.name,
          email: input.email ?? user.email,
        },
        metadata: {
          action: "profile.update",
        },
      });

      logger.info({
        msg: "User profile updated",
        userId: user.id,
        changes: {
          name: input.name !== user.name,
          email: input.email !== user.email,
        },
      });

      // Return updated user data
      const updatedUser = await db.getUser(user.openId);
      return {
        success: true,
        user: {
          id: updatedUser?.id,
          name: updatedUser?.name,
          email: updatedUser?.email,
        },
      };
    }),

  // Change current user's password
  changePassword: strictlyProtectedProcedure
    .input(
      z.object({
        currentPassword: z.string().min(1, "Current password is required"),
        newPassword: z
          .string()
          .min(4, "Password must be at least 4 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      // Verify current password
      const isValid = await simpleAuth.verifyPassword(
        input.currentPassword,
        user.loginMethod || ""
      );

      if (!isValid) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Current password is incorrect",
        });
      }

      // Hash new password
      const newPasswordHash = await simpleAuth.hashPassword(input.newPassword);

      // Update password
      await db.upsertUser({
        ...user,
        loginMethod: newPasswordHash,
      });

      // Log audit event
      await logAuditEvent({
        eventType: AuditEventType.PERMISSION_CHANGED,
        entityType: "user",
        entityId: user.id,
        userId: user.id,
        metadata: {
          action: "password.change",
          selfChange: true,
        },
      });

      logger.info({
        msg: "User password changed",
        userId: user.id,
      });

      return { success: true };
    }),

  /**
   * Get auth token for automated testing
   * Requires a valid email/password combination
   * Returns the session token that can be set as a cookie
   *
   * Only available when ENABLE_TEST_AUTH=true or NODE_ENV !== 'production'
   */
  getTestToken: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      // Only allow in non-production or when explicitly enabled
      const isTestMode =
        env.enableTestAuth || process.env.NODE_ENV !== "production";

      if (!isTestMode) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Test auth is not enabled in production",
        });
      }

      // Find user
      const user = await db.getUserByEmail(input.email);
      if (!user || !user.loginMethod) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Verify password
      const isValid = await bcrypt.compare(input.password, user.loginMethod);
      if (!isValid) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid credentials",
        });
      }

      // Create token
      const token = simpleAuth.createSessionToken(user);

      logger.info({ msg: "Test token generated", email: input.email });

      return {
        token,
        cookieName: COOKIE_NAME,
        user: {
          id: user.id,
          email: user.email,
          role: user.role,
        },
      };
    }),
});
