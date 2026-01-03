import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../../_core/trpc";
import { getDb } from "../../db";
import { appointmentTypes, calendarUserAccess } from "../../../drizzle/schema";
import { and, eq } from "drizzle-orm";

/**
 * Calendars Appointments Router
 * CAL-002: Appointment type management
 * Extracted from calendarsManagement.ts for better maintainability
 */
export const calendarsAppointmentsRouter = router({
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

      const types = await db
        .select()
        .from(appointmentTypes)
        .where(
          and(
            eq(appointmentTypes.calendarId, input.calendarId),
            input.includeInactive ? undefined : eq(appointmentTypes.isActive, true)
          )
        );

      return types;
    }),

  // Create an appointment type
  createAppointmentType: protectedProcedure
    .input(
      z.object({
        calendarId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        duration: z.number().min(5).max(480),
        bufferBefore: z.number().min(0).max(120).default(0),
        bufferAfter: z.number().min(0).max(120).default(0),
        minNoticeHours: z.number().min(0).max(720).default(24),
        maxAdvanceDays: z.number().min(1).max(365).default(30),
        color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).default("#F59E0B"),
        isActive: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check user has admin or edit access
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

      if (access.length === 0 || access[0].accessLevel === "view") {
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
          isActive: input.isActive,
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

      // Get the appointment type to check calendar access
      const [type] = await db
        .select()
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, input.id))
        .limit(1);

      if (!type) {
        throw new Error("Appointment type not found");
      }

      // Check user has admin or edit access
      const access = await db
        .select()
        .from(calendarUserAccess)
        .where(
          and(
            eq(calendarUserAccess.calendarId, type.calendarId),
            eq(calendarUserAccess.userId, userId)
          )
        )
        .limit(1);

      if (access.length === 0 || access[0].accessLevel === "view") {
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

      // Get the appointment type
      const [type] = await db
        .select()
        .from(appointmentTypes)
        .where(eq(appointmentTypes.id, input.id))
        .limit(1);

      if (!type) {
        throw new Error("Appointment type not found");
      }

      // Check user has admin access
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

      await db
        .delete(appointmentTypes)
        .where(eq(appointmentTypes.id, input.id));

      return { success: true };
    }),
});
