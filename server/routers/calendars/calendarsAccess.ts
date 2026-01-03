import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../../_core/trpc";
import { getDb } from "../../db";
import { calendars, calendarUserAccess, users } from "../../../drizzle/schema";
import { and, eq, ne } from "drizzle-orm";

/**
 * Calendars Access Router
 * CAL-001: User access and permissions management
 * Extracted from calendarsManagement.ts for better maintainability
 */
export const calendarsAccessRouter = router({
  // List users with access to a calendar
  listUsers: protectedProcedure
    .input(z.object({ calendarId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Access denied to this calendar");
      }

      const calendarUsers = await db
        .select({
          userId: calendarUserAccess.userId,
          accessLevel: calendarUserAccess.accessLevel,
          addedAt: calendarUserAccess.createdAt,
          userName: users.name,
          userEmail: users.email,
        })
        .from(calendarUserAccess)
        .innerJoin(users, eq(calendarUserAccess.userId, users.id))
        .where(eq(calendarUserAccess.calendarId, input.calendarId));

      return calendarUsers;
    }),

  // Add user access to a calendar
  addUser: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        userId: z.number(),
        accessLevel: z.enum(["view", "edit", "admin"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check current user has admin access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, currentUserId),
            eq(calendarUserAccess.accessLevel, "admin")
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Admin access required to add users");
      }

      // Check if user already has access
      const existingAccess = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, input.userId)
          )
        )
        .limit(1);

      if (existingAccess.length > 0) {
        // Update existing access
        await db
          .update(calendarUserAccess)
          .set({ accessLevel: input.accessLevel })
          .where(
            and(
              eq(calendarUserAccess.calendarId, input.calendarId),
              eq(calendarUserAccess.userId, input.userId)
            )
          );
      } else {
        // Create new access
        await db.insert(calendarUserAccess).values({
          calendarId: input.calendarId,
          userId: input.userId,
          accessLevel: input.accessLevel,
        });
      }

      return { success: true };
    }),

  // Remove user access from a calendar
  removeUser: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currentUserId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check current user has admin access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, currentUserId),
            eq(calendarUserAccess.accessLevel, "admin")
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Admin access required to remove users");
      }

      // Prevent removing the last admin
      const adminCount = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.accessLevel, "admin")
          )
        );

      const targetAccess = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, input.userId)
          )
        )
        .limit(1);

      if (
        adminCount.length === 1 &&
        targetAccess.length > 0 &&
        targetAccess[0].accessLevel === "admin"
      ) {
        throw new Error("Cannot remove the last admin from a calendar");
      }

      await db
        .delete(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, input.userId)
          )
        );

      return { success: true };
    }),
});
