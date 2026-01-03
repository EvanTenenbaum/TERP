import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { getDb } from "../db";
import {
  calendars,
  calendarUserAccess,
  calendarEvents,
  appointmentTypes,
  calendarAvailability,
  calendarBlockedDates,
} from "../../drizzle/schema";
import { and, eq, gte, lte, desc, asc, isNull, inArray } from "drizzle-orm";

/**
 * Calendars Management Router
 * CAL-001: Multi-Calendar Architecture
 * CAL-002: Availability & Booking Foundation
 * Production-ready implementation
 */

// ============================================================================
// CAL-001: Multi-Calendar Management
// ============================================================================

export const calendarsManagementRouter = router({
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

      // Get calendars where user has access or is admin
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

      // Check user has access to this calendar
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

  // Create a new calendar (admin only)
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

      // If setting as default, unset any existing default
      if (input.isDefault) {
        await db
          .update(calendars)
          .set({ isDefault: false })
          .where(eq(calendars.isDefault, true));
      }

      // Create the calendar
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

      // Grant admin access to the creator
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

      // Check user has admin access
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

      // If setting as default, unset any existing default
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

  // Archive a calendar (soft delete)
  archive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has admin access
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

      // Check user has admin access
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

  // ============================================================================
  // User Access Management
  // ============================================================================

  // List users with access to a calendar
  listUsers: protectedProcedure
    .input(z.object({ calendarId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has access to view this calendar's users
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

      const users = await db
        .select()
        .from(calendarUserAccess)
        .where(eq(calendarUserAccess.calendarId, input.calendarId));

      return users;
    }),

  // Add user access to a calendar
  addUser: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        userId: z.number(),
        accessLevel: z.enum(["view", "edit", "admin"]).default("view"),
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

      // Add user access (will fail if already exists due to unique constraint)
      try {
        await db.insert(calendarUserAccess).values({
          calendarId: input.calendarId,
          userId: input.userId,
          accessLevel: input.accessLevel,
        });
      } catch (error: unknown) {
        const err = error as { code?: string };
        if (err.code === "ER_DUP_ENTRY") {
          // Update existing access level
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
          throw error;
        }
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

      // Prevent removing self if you're the only admin
      if (input.userId === currentUserId) {
        const admins = await db
          .select()
          .from(calendarUserAccess)
          .where(
            and(
              eq(calendarUserAccess.calendarId, input.calendarId),
              eq(calendarUserAccess.accessLevel, "admin")
            )
          );

        if (admins.length <= 1) {
          throw new Error("Cannot remove the last admin from a calendar");
        }
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

  // ============================================================================
  // CAL-002: Appointment Types Management
  // ============================================================================

  // List appointment types for a calendar
  listAppointmentTypes: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        includeInactive: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has access to this calendar
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

      const types = await db
        .select()
        .from(appointmentTypes)
        .where(
          and(
            eq(appointmentTypes.calendarId, input.calendarId),
            input.includeInactive ? undefined : eq(appointmentTypes.isActive, true)
          )
        )
        .orderBy(asc(appointmentTypes.name));

      return types;
    }),

  // Create an appointment type
  createAppointmentType: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        duration: z.number().min(5).max(480), // 5 mins to 8 hours
        bufferBefore: z.number().min(0).max(120).default(0),
        bufferAfter: z.number().min(0).max(120).default(0),
        minNoticeHours: z.number().min(0).max(720).default(24), // up to 30 days
        maxAdvanceDays: z.number().min(1).max(365).default(30),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#F59E0B"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has edit/admin access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["edit", "admin"])
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Edit access required to create appointment types");
      }

      const [newType] = await db
        .insert(appointmentTypes)
        .values({
          calendarId: input.calendarId,
          name: input.name,
          description: input.description || null,
          duration: input.duration,
          bufferBefore: input.bufferBefore,
          bufferAfter: input.bufferAfter,
          minNoticeHours: input.minNoticeHours,
          maxAdvanceDays: input.maxAdvanceDays,
          color: input.color,
        })
        .$returningId();

      return { id: newType.id, ...input };
    }),

  // Update an appointment type
  updateAppointmentType: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        duration: z.number().min(5).max(480).optional(),
        bufferBefore: z.number().min(0).max(120).optional(),
        bufferAfter: z.number().min(0).max(120).optional(),
        minNoticeHours: z.number().min(0).max(720).optional(),
        maxAdvanceDays: z.number().min(1).max(365).optional(),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the appointment type to find its calendar
      const [type] = await db
        .select()
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, input.id))
        .limit(1);

      if (!type) {
        throw new Error("Appointment type not found");
      }

      // Check user has edit/admin access to the calendar
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, type.calendarId),
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["edit", "admin"])
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Edit access required to update appointment types");
      }

      const updateData: Partial<typeof appointmentTypes.$inferInsert> = {};
      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.duration !== undefined) updateData.duration = input.duration;
      if (input.bufferBefore !== undefined) updateData.bufferBefore = input.bufferBefore;
      if (input.bufferAfter !== undefined) updateData.bufferAfter = input.bufferAfter;
      if (input.minNoticeHours !== undefined) updateData.minNoticeHours = input.minNoticeHours;
      if (input.maxAdvanceDays !== undefined) updateData.maxAdvanceDays = input.maxAdvanceDays;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await db
        .update(appointmentTypes)
        .set(updateData)
        .where(eq(appointmentTypes.id, input.id));

      return { success: true };
    }),

  // Delete an appointment type
  deleteAppointmentType: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the appointment type to find its calendar
      const [type] = await db
        .select()
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, input.id))
        .limit(1);

      if (!type) {
        throw new Error("Appointment type not found");
      }

      // Check user has admin access to the calendar
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, type.calendarId),
            eq(calendarUserAccess.userId, userId),
            eq(calendarUserAccess.accessLevel, "admin")
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Admin access required to delete appointment types");
      }

      await db.delete(appointmentTypes).where(eq(appointmentTypes.id, input.id));

      return { success: true };
    }),

  // ============================================================================
  // CAL-002: Availability Rules Management
  // ============================================================================

  // List availability rules for a calendar
  listAvailability: protectedProcedure
    .input(z.object({ calendarId: z.number() }))
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has access to this calendar
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

      const availability = await db
        .select()
        .from(calendarAvailability)
        .where(eq(calendarAvailability.calendarId, input.calendarId))
        .orderBy(asc(calendarAvailability.dayOfWeek), asc(calendarAvailability.startTime));

      return availability;
    }),

  // Set availability for a calendar (replaces all rules for a day)
  setAvailability: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        dayOfWeek: z.number().min(0).max(6), // 0 = Sunday, 6 = Saturday
        slots: z.array(
          z.object({
            startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), // HH:MM or HH:MM:SS
            endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has edit/admin access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["edit", "admin"])
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Edit access required to set availability");
      }

      // Normalize time format to HH:MM:SS
      const normalizeTime = (time: string): string => {
        return time.length === 5 ? `${time}:00` : time;
      };

      // Delete existing availability for this day
      await db
        .delete(calendarAvailability)
        .where(
          and(
            eq(calendarAvailability.calendarId, input.calendarId),
            eq(calendarAvailability.dayOfWeek, input.dayOfWeek)
          )
        );

      // Insert new slots
      if (input.slots.length > 0) {
        await db.insert(calendarAvailability).values(
          input.slots.map((slot) => ({
            calendarId: input.calendarId,
            dayOfWeek: input.dayOfWeek,
            startTime: normalizeTime(slot.startTime),
            endTime: normalizeTime(slot.endTime),
          }))
        );
      }

      return { success: true };
    }),

  // ============================================================================
  // CAL-002: Blocked Dates Management
  // ============================================================================

  // List blocked dates for a calendar
  listBlockedDates: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        startDate: z.string().optional(), // ISO date
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has access to this calendar
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

      let conditions = [eq(calendarBlockedDates.calendarId, input.calendarId)];

      if (input.startDate) {
        conditions.push(gte(calendarBlockedDates.date, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(calendarBlockedDates.date, new Date(input.endDate)));
      }

      const blocked = await db
        .select()
        .from(calendarBlockedDates)
        .where(and(...conditions))
        .orderBy(asc(calendarBlockedDates.date));

      return blocked;
    }),

  // Add a blocked date
  addBlockedDate: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        date: z.string(), // ISO date
        reason: z.string().max(255).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has edit/admin access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, input.calendarId),
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["edit", "admin"])
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Edit access required to add blocked dates");
      }

      const [newBlocked] = await db
        .insert(calendarBlockedDates)
        .values({
          calendarId: input.calendarId,
          date: new Date(input.date),
          reason: input.reason || null,
        })
        .$returningId();

      return { id: newBlocked.id, ...input };
    }),

  // Remove a blocked date
  removeBlockedDate: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the blocked date to find its calendar
      const [blocked] = await db
        .select()
        .from(calendarBlockedDates)
        .where(eq(calendarBlockedDates.id, input.id))
        .limit(1);

      if (!blocked) {
        throw new Error("Blocked date not found");
      }

      // Check user has edit/admin access to the calendar
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, blocked.calendarId),
            eq(calendarUserAccess.userId, userId),
            inArray(calendarUserAccess.accessLevel, ["edit", "admin"])
          )
        )
        .limit(1);

      if (access.length === 0) {
        throw new Error("Edit access required to remove blocked dates");
      }

      await db.delete(calendarBlockedDates).where(eq(calendarBlockedDates.id, input.id));

      return { success: true };
    }),

  // ============================================================================
  // CAL-002: Get Available Slots (Core Booking Logic)
  // ============================================================================

  getSlots: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        appointmentTypeId: z.number(),
        startDate: z.string(), // ISO date
        endDate: z.string(), // ISO date
        slotIntervalMinutes: z.number().min(5).max(60).default(15),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has access to this calendar
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

      // Get the appointment type
      const [appointmentType] = await db
        .select()
        .from(appointmentTypes)
        .where(
          and(
            eq(appointmentTypes.id, input.appointmentTypeId),
            eq(appointmentTypes.calendarId, input.calendarId),
            eq(appointmentTypes.isActive, true)
          )
        )
        .limit(1);

      if (!appointmentType) {
        throw new Error("Appointment type not found or inactive");
      }

      // Get availability rules
      const availabilityRules = await db
        .select()
        .from(calendarAvailability)
        .where(eq(calendarAvailability.calendarId, input.calendarId));

      // Get blocked dates
      const blockedDates = await db
        .select()
        .from(calendarBlockedDates)
        .where(
          and(
            eq(calendarBlockedDates.calendarId, input.calendarId),
            gte(calendarBlockedDates.date, new Date(input.startDate)),
            lte(calendarBlockedDates.date, new Date(input.endDate))
          )
        );

      const blockedDateSet = new Set(
        blockedDates.map((b) => b.date instanceof Date ? b.date.toISOString().split("T")[0] : String(b.date))
      );

      // Get existing events
      const existingEvents = await db
        .select({
          startDate: calendarEvents.startDate,
          startTime: calendarEvents.startTime,
          endDate: calendarEvents.endDate,
          endTime: calendarEvents.endTime,
        })
        .from(calendarEvents)
        .where(
          and(
            eq(calendarEvents.calendarId, input.calendarId),
            gte(calendarEvents.startDate, new Date(input.startDate)),
            lte(calendarEvents.endDate, new Date(input.endDate)),
            isNull(calendarEvents.deletedAt)
          )
        );

      // Build availability map by day of week
      const availabilityByDay: Map<number, Array<{ start: string; end: string }>> = new Map();
      for (const rule of availabilityRules) {
        const day = rule.dayOfWeek;
        if (!availabilityByDay.has(day)) {
          availabilityByDay.set(day, []);
        }
        availabilityByDay.get(day)!.push({
          start: rule.startTime,
          end: rule.endTime,
        });
      }

      // Calculate minimum booking time (now + minNoticeHours)
      const now = new Date();
      const minBookingTime = new Date(now.getTime() + appointmentType.minNoticeHours * 60 * 60 * 1000);

      // Calculate maximum booking date
      const maxBookingDate = new Date(now);
      maxBookingDate.setDate(maxBookingDate.getDate() + appointmentType.maxAdvanceDays);

      // Total slot duration including buffers
      const totalDuration = appointmentType.bufferBefore + appointmentType.duration + appointmentType.bufferAfter;

      // Generate slots for each day
      const slots: Record<string, string[]> = {};
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      // Limit query to max 3 months
      const maxEndDate = new Date(startDate);
      maxEndDate.setMonth(maxEndDate.getMonth() + 3);
      if (endDate > maxEndDate) {
        throw new Error("Date range cannot exceed 3 months");
      }

      for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split("T")[0];

        // Skip if date is blocked
        if (blockedDateSet.has(dateStr)) {
          continue;
        }

        // Skip if date is beyond max advance days
        if (date > maxBookingDate) {
          continue;
        }

        const dayOfWeek = date.getDay(); // 0 = Sunday
        const dayAvailability = availabilityByDay.get(dayOfWeek);

        if (!dayAvailability || dayAvailability.length === 0) {
          continue;
        }

        const daySlots: string[] = [];

        for (const window of dayAvailability) {
          // Parse start and end times
          const [startHour, startMin] = window.start.split(":").map(Number);
          const [endHour, endMin] = window.end.split(":").map(Number);

          const windowStartMinutes = startHour * 60 + startMin;
          const windowEndMinutes = endHour * 60 + endMin;

          // Generate slots at intervals
          for (
            let slotStart = windowStartMinutes;
            slotStart + totalDuration <= windowEndMinutes;
            slotStart += input.slotIntervalMinutes
          ) {
            const slotHour = Math.floor(slotStart / 60);
            const slotMinute = slotStart % 60;
            const slotTime = `${slotHour.toString().padStart(2, "0")}:${slotMinute.toString().padStart(2, "0")}`;

            // Create a datetime for this slot to check against minBookingTime
            const slotDateTime = new Date(date);
            slotDateTime.setHours(slotHour, slotMinute, 0, 0);

            // Skip if slot is before minimum booking time
            if (slotDateTime < minBookingTime) {
              continue;
            }

            // Check if slot conflicts with existing events
            const slotEndMinutes = slotStart + totalDuration;
            let hasConflict = false;

            for (const event of existingEvents) {
              const eventDateStr = event.startDate instanceof Date
                ? event.startDate.toISOString().split("T")[0]
                : String(event.startDate);

              if (eventDateStr !== dateStr) {
                continue;
              }

              if (!event.startTime || !event.endTime) {
                // All-day event - entire day is blocked
                hasConflict = true;
                break;
              }

              const [eventStartHour, eventStartMin] = event.startTime.split(":").map(Number);
              const [eventEndHour, eventEndMin] = event.endTime.split(":").map(Number);

              const eventStartMinutes = eventStartHour * 60 + eventStartMin;
              const eventEndMinutes = eventEndHour * 60 + eventEndMin;

              // Check for overlap (including buffer)
              const effectiveSlotStart = slotStart;
              const effectiveSlotEnd = slotEndMinutes;

              if (effectiveSlotStart < eventEndMinutes && effectiveSlotEnd > eventStartMinutes) {
                hasConflict = true;
                break;
              }
            }

            if (!hasConflict) {
              daySlots.push(slotTime);
            }
          }
        }

        if (daySlots.length > 0) {
          slots[dateStr] = daySlots;
        }
      }

      return slots;
    }),
});
