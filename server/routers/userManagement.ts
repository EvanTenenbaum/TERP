import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { strictlyProtectedProcedure, router } from "../_core/trpc";
import { simpleAuth } from "../_core/simpleAuth";
import * as db from "../db";
import { users } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";
import { logAuditEvent, AuditEventType } from "../auditLogger";
import { logger } from "../_core/logger";

export const userManagementRouter = router({
  // List all users - requires authentication and users:read permission
  listUsers: strictlyProtectedProcedure
    .use(requirePermission("users:read"))
    .query(async () => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      const allUsers = await database
        .select({
          id: users.id,
          openId: users.openId,
          email: users.email,
          name: users.name,
          role: users.role,
          lastSignedIn: users.lastSignedIn,
          createdAt: users.createdAt,
          deletedAt: users.deletedAt,
        })
        .from(users)
        .where(sql`${users.deletedAt} IS NULL`);

      return allUsers;
    }),

  // Create a new user - requires authentication and users:manage permission
  createUser: strictlyProtectedProcedure
    .use(requirePermission("users:manage"))
    .input(
      z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(4, "Password must be at least 4 characters"),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const user = await simpleAuth.createUser(
          input.username,
          input.password,
          input.name || input.username
        );

        // Log audit event for user creation
        await logAuditEvent({
          eventType: AuditEventType.USER_LOGIN, // Using closest available type for user management
          entityType: "user",
          entityId: user.id,
          userId: ctx.user.id,
          afterState: {
            email: user.email,
            name: user.name,
          },
          metadata: {
            action: "user.create",
            createdByEmail: ctx.user.email,
          },
        });

        logger.info({
          msg: "User created",
          newUserEmail: input.username,
          actorId: ctx.user.id,
          actorEmail: ctx.user.email,
        });

        return {
          success: true,
          user: {
            id: user.id,
            username: user.email,
            name: user.name,
          },
        };
      } catch (error) {
        if (error instanceof Error && error.message === "User already exists") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "A user with this username already exists",
          });
        }
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }
    }),

  // Delete a user - requires authentication and users:manage permission
  deleteUser: strictlyProtectedProcedure
    .use(requirePermission("users:manage"))
    .input(
      z.object({
        username: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const database = await db.getDb();
      if (!database) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      }

      // Find the user to delete
      const userToDelete = await db.getUserByEmail(input.username);
      if (!userToDelete) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Prevent self-deletion
      if (userToDelete.id === ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You cannot delete your own account",
        });
      }

      // Check if this is the last admin user
      if (userToDelete.role === "admin") {
        const adminCount = await database
          .select({ count: sql<number>`count(*)` })
          .from(users)
          .where(sql`${users.role} = 'admin' AND ${users.deletedAt} IS NULL`);

        if (adminCount[0]?.count <= 1) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message:
              "Cannot delete the last admin user. At least one admin must remain in the system.",
          });
        }
      }

      // Soft delete the user (set deletedAt timestamp)
      await database
        .update(users)
        .set({ deletedAt: new Date() })
        .where(eq(users.email, input.username));

      // Log audit event for user deletion
      await logAuditEvent({
        eventType: AuditEventType.USER_LOGOUT, // Using closest available type
        entityType: "user",
        entityId: userToDelete.id,
        userId: ctx.user.id,
        beforeState: {
          email: userToDelete.email,
          name: userToDelete.name,
          role: userToDelete.role,
        },
        metadata: {
          action: "user.delete",
          deletedByEmail: ctx.user.email,
          reason: input.reason || "No reason provided",
        },
      });

      logger.info({
        msg: "User deleted",
        deletedUserEmail: input.username,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
        reason: input.reason,
      });

      return { success: true };
    }),

  // Reset user password - requires authentication and users:manage permission
  resetPassword: strictlyProtectedProcedure
    .use(requirePermission("users:manage"))
    .input(
      z.object({
        username: z.string(),
        newPassword: z
          .string()
          .min(4, "Password must be at least 4 characters"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserByEmail(input.username);

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      // Hash new password
      const passwordHash = await simpleAuth.hashPassword(input.newPassword);

      // Update user with new password hash
      await db.upsertUser({
        ...user,
        loginMethod: passwordHash,
      });

      // Log audit event for password reset
      await logAuditEvent({
        eventType: AuditEventType.PERMISSION_CHANGED, // Using closest available type
        entityType: "user",
        entityId: user.id,
        userId: ctx.user.id,
        metadata: {
          action: "user.password_reset",
          targetUserEmail: user.email,
          resetByEmail: ctx.user.email,
        },
      });

      logger.info({
        msg: "User password reset",
        targetUserEmail: input.username,
        actorId: ctx.user.id,
        actorEmail: ctx.user.email,
      });

      return { success: true };
    }),
});
