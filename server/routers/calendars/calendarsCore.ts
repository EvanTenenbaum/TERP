import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../../_core/trpc";
import { getDb } from "../../db";
import { calendars, calendarUserAccess } from "../../../drizzle/schema";
import { and, eq, desc, asc } from "drizzle-orm";

/**
 * Calendars Core Router
 * CAL-001: Calendar CRUD operations
 * Extracted from calendarsManagement.ts for better maintainability
 */
export const calendarsCoreRouter = router({
  // List all calendars accessible by the user
  list: protectedProcedure
    .input(
      z.object({
        includeArchived: z.boolean().default(false),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userAccessCalendars = await db
        .select({
          id: calendars.id,
          name: calendars.name,
          description: calendars.description,
          color: calendars.color,
          type: calendars.type,
          isDefault: calendars.isDefault,
          isArchived: calendars.isArchived,
          ownerId: calendars.ownerId,
          createdAt: calendars.createdAt,
          updatedAt: calendars.updatedAt,
          accessLevel: calendarUserAccess.accessLevel,
        })
        .from(calendars)
        .innerJoin(calendarUserAccess, eq(calendars.id, calendarUserAccess.calendarId))
        .where(
          and(
            eq(calendarUserAccess.userId, userId),
            input?.includeArchived ? undefined : eq(calendars.isArchived, false)
          )
        )
        .orderBy(desc(calendars.isDefault), asc(calendars.name));

      return userAccessCalendars;
    }),

  // Get a single calendar by ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.id),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Access denied to this calendar");
      }

      const [calendar] = await db
        .select()
        .from(calendars)
        .where(eq(calendars.id, input.id))
        .limit(1);

      if (!calendar) {
        throw new Error("Calendar not found");
      }

      return {
        ...calendar,
        accessLevel: access[0].accessLevel,
      };
    }),

  // Create a new calendar
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#3B82F6"),
        type: z.enum(["workspace", "personal"]).default("workspace"),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      if (input.isDefault) {
        await db
          .update(calendars)
          .set({ isDefault: false })
          .where(eq(calendars.isDefault, true));
      }

      const [newCalendar] = await db
        .insert(calendars)
        .values({
          name: input.name,
          description: input.description || null,
          color: input.color,
          type: input.type,
          isDefault: input.isDefault,
          ownerId: userId,
        })
        .$returningId();

      await db.insert(calendarUserAccess).values({
        calendarId: newCalendar.id,
        userId: userId,
        accessLevel: "admin",
      });

      return { id: newCalendar.id, ...input };
    }),

  // Update a calendar
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.id),
            eq(calendarUserAccess.userId, userId),
            eq(calendarUserAccess.accessLevel, "admin")
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Admin access required to update calendar");
      }

      if (input.isDefault) {
        await db
          .update(calendars)
          .set({ isDefault: false })
          .where(eq(calendars.isDefault, true));
      }

      const updateData: Partial<typeof calendars.$inferInsert> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.isDefault !== undefined) updateData.isDefault = input.isDefault;

      await db
        .update(calendars)
        .set(updateData)
        .where(eq(calendars.id, input.id));

      return { success: true };
    }),

  // Archive a calendar
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.id),
            eq(calendarUserAccess.userId, userId),
            eq(calendarUserAccess.accessLevel, "admin")
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Admin access required to archive calendar");
      }

      await db
        .update(calendars)
        .set({ isArchived: true })
        .where(eq(calendars.id, input.id));

      return { success: true };
    }),

  // Restore an archived calendar
  restore: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.id),
            eq(calendarUserAccess.userId, userId),
            eq(calendarUserAccess.accessLevel, "admin")
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Admin access required to restore calendar");
      }

      await db
        .update(calendars)
        .set({ isArchived: false })
        .where(eq(calendars.id, input.id));

      return { success: true };
    }),
});
