/**
 * Scheduling Router
 * Sprint 4 Track D: FEAT-005-BE - Scheduling & Referral APIs
 *
 * Provides CRUD operations for:
 * - Rooms (meeting rooms, loading docks)
 * - Room bookings
 * - Employee shifts
 * - Shift templates
 * - Appointment check-ins
 * - Delivery schedules
 * - Appointment referrals
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  rooms,
  roomBookings,
  employeeShifts,
  shiftTemplates,
  appointmentStatusHistory,
  appointmentCheckIns,
  deliverySchedules,
  appointmentReferrals,
} from "../../drizzle/schema-scheduling";
import { calendarEvents, clients, users } from "../../drizzle/schema";
import { eq, and, desc, gte, lte, or, sql, isNull, inArray, ne } from "drizzle-orm";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Normalize time string to HH:MM:SS format
 */
function normalizeTime(time: string): string {
  if (time.length === 5) {
    return `${time}:00`;
  }
  return time;
}

/**
 * Parse a date string (YYYY-MM-DD) to a Date object
 */
function parseDate(dateStr: string): Date {
  return new Date(dateStr + "T00:00:00.000Z");
}

// ============================================================================
// ROOM MANAGEMENT - MEET-047
// ============================================================================

const roomInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  roomType: z.enum(["meeting", "loading"]),
  capacity: z.number().int().positive().optional().default(1),
  features: z.array(z.string()).optional().default([]),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#3B82F6"),
  displayOrder: z.number().int().optional().default(0),
  locationId: z.number().int().optional(),
});

const roomBookingInputSchema = z.object({
  roomId: z.number().int(),
  calendarEventId: z.number().int().optional(),
  title: z.string().max(255).optional(),
  description: z.string().optional(),
  bookingDate: z.string(), // YYYY-MM-DD
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/), // HH:MM or HH:MM:SS
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  clientId: z.number().int().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// SHIFT MANAGEMENT - MEET-050
// ============================================================================

const shiftInputSchema = z.object({
  userId: z.number().int(),
  shiftDate: z.string(), // YYYY-MM-DD
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  shiftType: z.enum(["regular", "overtime", "on_call", "training"]).optional().default("regular"),
  locationId: z.number().int().optional(),
  notes: z.string().optional(),
});

const shiftTemplateInputSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
  breakStart: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  breakEnd: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().default("#10B981"),
});

// ============================================================================
// DELIVERY SCHEDULE - MEET-034
// ============================================================================

const deliveryScheduleInputSchema = z.object({
  referenceType: z.enum(["order", "purchase_order", "sample"]),
  referenceId: z.number().int(),
  expectedDate: z.string(), // YYYY-MM-DD
  confirmedDate: z.string().optional(),
  expectedTimeStart: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  expectedTimeEnd: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
  carrier: z.string().max(255).optional(),
  trackingNumber: z.string().max(255).optional(),
  deliveryAddress: z.string().optional(),
  deliveryNotes: z.string().optional(),
  alertDaysBefore: z.number().int().min(0).max(30).optional().default(1),
});

// ============================================================================
// REFERRAL TRACKING - FEAT-005-BE
// ============================================================================

const referralInputSchema = z.object({
  calendarEventId: z.number().int(),
  referralSource: z.enum([
    "existing_client",
    "employee",
    "website",
    "social_media",
    "advertisement",
    "trade_show",
    "other",
  ]),
  referringClientId: z.number().int().optional(),
  referringEmployeeId: z.number().int().optional(),
  referralCode: z.string().max(50).optional(),
  referralNotes: z.string().optional(),
  attributionDate: z.string().optional(), // YYYY-MM-DD
  conversionValue: z.number().int().optional(),
});

// ============================================================================
// ROUTER
// ============================================================================

export const schedulingRouter = router({
  // ==========================================================================
  // ROOM CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new room
   */
  createRoom: protectedProcedure
    .use(requirePermission("calendar:create"))
    .input(roomInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [result] = await db.insert(rooms).values({
        name: input.name,
        description: input.description || null,
        roomType: input.roomType,
        capacity: input.capacity,
        features: input.features,
        color: input.color,
        displayOrder: input.displayOrder,
        locationId: input.locationId || null,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List all rooms
   */
  listRooms: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(
      z.object({
        roomType: z.enum(["meeting", "loading"]).optional(),
        isActive: z.boolean().optional().default(true),
        locationId: z.number().int().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];
      if (input?.isActive !== undefined) {
        conditions.push(eq(rooms.isActive, input.isActive));
      }
      if (input?.roomType) {
        conditions.push(eq(rooms.roomType, input.roomType));
      }
      if (input?.locationId) {
        conditions.push(eq(rooms.locationId, input.locationId));
      }
      conditions.push(isNull(rooms.deletedAt));

      const result = await db
        .select()
        .from(rooms)
        .where(and(...conditions))
        .orderBy(rooms.displayOrder, rooms.name);

      return result;
    }),

  /**
   * Get a single room by ID
   */
  getRoom: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(z.object({ id: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [room] = await db
        .select()
        .from(rooms)
        .where(and(eq(rooms.id, input.id), isNull(rooms.deletedAt)))
        .limit(1);

      if (!room) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Room not found" });
      }

      return room;
    }),

  /**
   * Update a room
   */
  updateRoom: protectedProcedure
    .use(requirePermission("calendar:update"))
    .input(
      z.object({
        id: z.number().int(),
        data: roomInputSchema.partial(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(rooms)
        .set(input.data)
        .where(eq(rooms.id, input.id));

      return { success: true };
    }),

  /**
   * Delete (soft) a room
   */
  deleteRoom: protectedProcedure
    .use(requirePermission("calendar:delete"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(rooms)
        .set({ isActive: false, deletedAt: new Date() })
        .where(eq(rooms.id, input.id));

      return { success: true };
    }),

  // ==========================================================================
  // ROOM BOOKING OPERATIONS
  // ==========================================================================

  /**
   * Create a room booking
   */
  createBooking: protectedProcedure
    .use(requirePermission("calendar:create"))
    .input(roomBookingInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);
      const bookingDate = parseDate(input.bookingDate);

      // Check for conflicts
      const conflicts = await db
        .select()
        .from(roomBookings)
        .where(
          and(
            eq(roomBookings.roomId, input.roomId),
            eq(roomBookings.bookingDate, bookingDate),
            ne(roomBookings.status, "cancelled"),
            or(
              // New booking starts during existing booking
              and(
                lte(roomBookings.startTime, normalizeTime(input.startTime)),
                gte(roomBookings.endTime, normalizeTime(input.startTime))
              ),
              // New booking ends during existing booking
              and(
                lte(roomBookings.startTime, normalizeTime(input.endTime)),
                gte(roomBookings.endTime, normalizeTime(input.endTime))
              ),
              // New booking contains existing booking
              and(
                gte(roomBookings.startTime, normalizeTime(input.startTime)),
                lte(roomBookings.endTime, normalizeTime(input.endTime))
              )
            )
          )
        );

      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Time slot conflicts with existing booking",
        });
      }

      const [result] = await db.insert(roomBookings).values({
        roomId: input.roomId,
        calendarEventId: input.calendarEventId || null,
        title: input.title || null,
        description: input.description || null,
        bookingDate: bookingDate,
        startTime: normalizeTime(input.startTime),
        endTime: normalizeTime(input.endTime),
        bookedById: userId,
        clientId: input.clientId || null,
        notes: input.notes || null,
        status: "pending",
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List bookings for a date range
   */
  listBookings: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        roomId: z.number().int().optional(),
        status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]).optional(),
        clientId: z.number().int().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        gte(roomBookings.bookingDate, parseDate(input.startDate)),
        lte(roomBookings.bookingDate, parseDate(input.endDate)),
      ];

      if (input.roomId) {
        conditions.push(eq(roomBookings.roomId, input.roomId));
      }
      if (input.status) {
        conditions.push(eq(roomBookings.status, input.status));
      }
      if (input.clientId) {
        conditions.push(eq(roomBookings.clientId, input.clientId));
      }

      const result = await db
        .select({
          booking: roomBookings,
          room: rooms,
          client: clients,
          bookedBy: users,
        })
        .from(roomBookings)
        .leftJoin(rooms, eq(roomBookings.roomId, rooms.id))
        .leftJoin(clients, eq(roomBookings.clientId, clients.id))
        .leftJoin(users, eq(roomBookings.bookedById, users.id))
        .where(and(...conditions))
        .orderBy(roomBookings.bookingDate, roomBookings.startTime);

      return result.map((r) => ({
        ...r.booking,
        room: r.room,
        client: r.client,
        bookedBy: r.bookedBy,
      }));
    }),

  /**
   * Update booking status
   */
  updateBookingStatus: protectedProcedure
    .use(requirePermission("calendar:update"))
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["pending", "confirmed", "in_progress", "completed", "cancelled"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(roomBookings)
        .set({
          status: input.status,
          notes: input.notes,
        })
        .where(eq(roomBookings.id, input.id));

      return { success: true };
    }),

  /**
   * Cancel a booking
   */
  cancelBooking: protectedProcedure
    .use(requirePermission("calendar:update"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(roomBookings)
        .set({ status: "cancelled" })
        .where(eq(roomBookings.id, input.id));

      return { success: true };
    }),

  /**
   * Check room availability
   */
  checkAvailability: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(
      z.object({
        roomId: z.number().int(),
        date: z.string(),
        startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
        endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/),
        excludeBookingId: z.number().int().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const bookingDate = parseDate(input.date);
      const conditions = [
        eq(roomBookings.roomId, input.roomId),
        eq(roomBookings.bookingDate, bookingDate),
        ne(roomBookings.status, "cancelled"),
        or(
          and(
            lte(roomBookings.startTime, normalizeTime(input.startTime)),
            gte(roomBookings.endTime, normalizeTime(input.startTime))
          ),
          and(
            lte(roomBookings.startTime, normalizeTime(input.endTime)),
            gte(roomBookings.endTime, normalizeTime(input.endTime))
          ),
          and(
            gte(roomBookings.startTime, normalizeTime(input.startTime)),
            lte(roomBookings.endTime, normalizeTime(input.endTime))
          )
        ),
      ];

      if (input.excludeBookingId) {
        conditions.push(ne(roomBookings.id, input.excludeBookingId));
      }

      const conflicts = await db
        .select()
        .from(roomBookings)
        .where(and(...conditions));

      return {
        available: conflicts.length === 0,
        conflicts: conflicts,
      };
    }),

  /**
   * Get available time slots for a room on a given date
   */
  getAvailableSlots: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(
      z.object({
        roomId: z.number().int(),
        date: z.string(),
        slotDuration: z.number().int().min(15).max(480).default(30), // minutes
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const bookingDate = parseDate(input.date);

      // Get all bookings for the day
      const bookings = await db
        .select()
        .from(roomBookings)
        .where(
          and(
            eq(roomBookings.roomId, input.roomId),
            eq(roomBookings.bookingDate, bookingDate),
            ne(roomBookings.status, "cancelled")
          )
        )
        .orderBy(roomBookings.startTime);

      // Generate time slots from 8 AM to 6 PM
      const slots: { startTime: string; endTime: string; available: boolean }[] = [];
      const startHour = 8;
      const endHour = 18;
      const slotDuration = input.slotDuration;

      for (let hour = startHour; hour < endHour; hour++) {
        for (let minute = 0; minute < 60; minute += slotDuration) {
          if (hour === endHour - 1 && minute + slotDuration > 60) break;

          const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:00`;
          const endMinute = minute + slotDuration;
          const endHourAdjusted = hour + Math.floor(endMinute / 60);
          const endMinuteAdjusted = endMinute % 60;
          const endTime = `${endHourAdjusted.toString().padStart(2, "0")}:${endMinuteAdjusted.toString().padStart(2, "0")}:00`;

          // Check if slot conflicts with any booking
          const isAvailable = !bookings.some((booking) => {
            const bookingStart = booking.startTime;
            const bookingEnd = booking.endTime;
            return (
              (startTime >= bookingStart && startTime < bookingEnd) ||
              (endTime > bookingStart && endTime <= bookingEnd) ||
              (startTime <= bookingStart && endTime >= bookingEnd)
            );
          });

          slots.push({ startTime, endTime, available: isAvailable });
        }
      }

      return slots;
    }),

  // ==========================================================================
  // APPOINTMENT WITH ROOM BOOKING
  // ==========================================================================

  /**
   * Create appointment with room booking in one operation
   */
  createAppointmentWithRoom: protectedProcedure
    .use(requirePermission("calendar:create"))
    .input(
      z.object({
        // Calendar event details
        title: z.string().min(1),
        description: z.string().optional(),
        startDate: z.string(),
        startTime: z.string(),
        endTime: z.string(),
        clientId: z.number().int().optional(),
        // Room booking
        roomId: z.number().int(),
        // Referral (optional)
        referral: referralInputSchema.omit({ calendarEventId: true }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);
      const eventDate = parseDate(input.startDate);

      // Check room availability first
      const conflicts = await db
        .select()
        .from(roomBookings)
        .where(
          and(
            eq(roomBookings.roomId, input.roomId),
            eq(roomBookings.bookingDate, eventDate),
            ne(roomBookings.status, "cancelled"),
            or(
              and(
                lte(roomBookings.startTime, normalizeTime(input.startTime)),
                gte(roomBookings.endTime, normalizeTime(input.startTime))
              ),
              and(
                lte(roomBookings.startTime, normalizeTime(input.endTime)),
                gte(roomBookings.endTime, normalizeTime(input.endTime))
              )
            )
          )
        );

      if (conflicts.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Room is not available at the selected time",
        });
      }

      // Create calendar event
      const [eventResult] = await db.insert(calendarEvents).values({
        title: input.title,
        description: input.description || null,
        startDate: eventDate,
        endDate: eventDate,
        startTime: normalizeTime(input.startTime),
        endTime: normalizeTime(input.endTime),
        eventType: "MEETING", // Use MEETING for appointments
        status: "SCHEDULED",
        module: "GENERAL",
        createdBy: userId,
        assignedTo: userId,
        clientId: input.clientId || null,
      });

      const eventId = eventResult.insertId;

      // Create room booking linked to calendar event
      const [bookingResult] = await db.insert(roomBookings).values({
        roomId: input.roomId,
        calendarEventId: eventId,
        title: input.title,
        bookingDate: eventDate,
        startTime: normalizeTime(input.startTime),
        endTime: normalizeTime(input.endTime),
        bookedById: userId,
        clientId: input.clientId || null,
        status: "confirmed",
      });

      // Create referral if provided
      let referralId: number | null = null;
      if (input.referral) {
        const [referralResult] = await db.insert(appointmentReferrals).values({
          calendarEventId: eventId,
          referralSource: input.referral.referralSource,
          referringClientId: input.referral.referringClientId || null,
          referringEmployeeId: input.referral.referringEmployeeId || null,
          referralCode: input.referral.referralCode || null,
          referralNotes: input.referral.referralNotes || null,
          attributionDate: input.referral.attributionDate ? parseDate(input.referral.attributionDate) : null,
          conversionValue: input.referral.conversionValue || null,
        });
        referralId = referralResult.insertId;
      }

      return {
        eventId,
        bookingId: bookingResult.insertId,
        referralId,
        success: true,
      };
    }),

  // ==========================================================================
  // EMPLOYEE SHIFT OPERATIONS - MEET-050
  // ==========================================================================

  /**
   * Create an employee shift
   */
  createShift: protectedProcedure
    .use(requirePermission("users:update"))
    .input(shiftInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const createdById = getAuthenticatedUserId(ctx);

      const [result] = await db.insert(employeeShifts).values({
        userId: input.userId,
        shiftDate: parseDate(input.shiftDate),
        startTime: normalizeTime(input.startTime),
        endTime: normalizeTime(input.endTime),
        breakStart: input.breakStart ? normalizeTime(input.breakStart) : null,
        breakEnd: input.breakEnd ? normalizeTime(input.breakEnd) : null,
        shiftType: input.shiftType,
        locationId: input.locationId || null,
        notes: input.notes || null,
        createdById,
        status: "scheduled",
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List shifts for a date range
   */
  listShifts: protectedProcedure
    .use(requirePermission("users:read"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        userId: z.number().int().optional(),
        status: z.enum(["scheduled", "started", "completed", "absent", "cancelled"]).optional(),
        locationId: z.number().int().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        gte(employeeShifts.shiftDate, parseDate(input.startDate)),
        lte(employeeShifts.shiftDate, parseDate(input.endDate)),
      ];

      if (input.userId) {
        conditions.push(eq(employeeShifts.userId, input.userId));
      }
      if (input.status) {
        conditions.push(eq(employeeShifts.status, input.status));
      }
      if (input.locationId) {
        conditions.push(eq(employeeShifts.locationId, input.locationId));
      }

      const result = await db
        .select({
          shift: employeeShifts,
          user: users,
        })
        .from(employeeShifts)
        .leftJoin(users, eq(employeeShifts.userId, users.id))
        .where(and(...conditions))
        .orderBy(employeeShifts.shiftDate, employeeShifts.startTime);

      return result.map((r) => ({
        ...r.shift,
        user: r.user,
      }));
    }),

  /**
   * Update shift status
   */
  updateShiftStatus: protectedProcedure
    .use(requirePermission("users:update"))
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["scheduled", "started", "completed", "absent", "cancelled"]),
        actualStartTime: z.string().optional(),
        actualEndTime: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const updateData: Record<string, unknown> = { status: input.status };
      if (input.actualStartTime) {
        updateData.actualStartTime = new Date(input.actualStartTime);
      }
      if (input.actualEndTime) {
        updateData.actualEndTime = new Date(input.actualEndTime);
      }
      if (input.notes) {
        updateData.notes = input.notes;
      }

      await db
        .update(employeeShifts)
        .set(updateData)
        .where(eq(employeeShifts.id, input.id));

      return { success: true };
    }),

  /**
   * Delete a shift
   */
  deleteShift: protectedProcedure
    .use(requirePermission("users:delete"))
    .input(z.object({ id: z.number().int() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db.delete(employeeShifts).where(eq(employeeShifts.id, input.id));

      return { success: true };
    }),

  // ==========================================================================
  // SHIFT TEMPLATES
  // ==========================================================================

  /**
   * Create a shift template
   */
  createShiftTemplate: protectedProcedure
    .use(requirePermission("users:update"))
    .input(shiftTemplateInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [result] = await db.insert(shiftTemplates).values({
        name: input.name,
        description: input.description || null,
        startTime: normalizeTime(input.startTime),
        endTime: normalizeTime(input.endTime),
        breakStart: input.breakStart ? normalizeTime(input.breakStart) : null,
        breakEnd: input.breakEnd ? normalizeTime(input.breakEnd) : null,
        color: input.color,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List shift templates
   */
  listShiftTemplates: protectedProcedure
    .use(requirePermission("users:read"))
    .input(z.object({ isActive: z.boolean().optional().default(true) }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];
      if (input?.isActive !== undefined) {
        conditions.push(eq(shiftTemplates.isActive, input.isActive));
      }

      const result = await db
        .select()
        .from(shiftTemplates)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(shiftTemplates.name);

      return result;
    }),

  /**
   * Apply shift template to create shifts
   */
  applyShiftTemplate: protectedProcedure
    .use(requirePermission("users:update"))
    .input(
      z.object({
        templateId: z.number().int(),
        userIds: z.array(z.number().int()),
        dates: z.array(z.string()), // Array of YYYY-MM-DD dates
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const createdById = getAuthenticatedUserId(ctx);

      // Get template
      const [template] = await db
        .select()
        .from(shiftTemplates)
        .where(eq(shiftTemplates.id, input.templateId))
        .limit(1);

      if (!template) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Shift template not found" });
      }

      // Create shifts for each user and date combination
      const shifts: Array<{
        userId: number;
        shiftDate: Date;
        startTime: string;
        endTime: string;
        breakStart: string | null;
        breakEnd: string | null;
        shiftType: "regular" | "overtime" | "on_call" | "training";
        createdById: number;
        status: "scheduled" | "started" | "completed" | "absent" | "cancelled";
      }> = [];

      for (const userId of input.userIds) {
        for (const date of input.dates) {
          shifts.push({
            userId,
            shiftDate: parseDate(date),
            startTime: template.startTime,
            endTime: template.endTime,
            breakStart: template.breakStart,
            breakEnd: template.breakEnd,
            shiftType: "regular",
            createdById,
            status: "scheduled",
          });
        }
      }

      if (shifts.length > 0) {
        await db.insert(employeeShifts).values(shifts);
      }

      return { created: shifts.length, success: true };
    }),

  // ==========================================================================
  // DELIVERY SCHEDULES - MEET-034
  // ==========================================================================

  /**
   * Create a delivery schedule
   */
  createDeliverySchedule: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(deliveryScheduleInputSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const createdById = getAuthenticatedUserId(ctx);

      const [result] = await db.insert(deliverySchedules).values({
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        expectedDate: parseDate(input.expectedDate),
        confirmedDate: input.confirmedDate ? parseDate(input.confirmedDate) : null,
        expectedTimeStart: input.expectedTimeStart ? normalizeTime(input.expectedTimeStart) : null,
        expectedTimeEnd: input.expectedTimeEnd ? normalizeTime(input.expectedTimeEnd) : null,
        carrier: input.carrier || null,
        trackingNumber: input.trackingNumber || null,
        deliveryAddress: input.deliveryAddress || null,
        deliveryNotes: input.deliveryNotes || null,
        alertDaysBefore: input.alertDaysBefore,
        status: "pending",
        createdById,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * List delivery schedules
   */
  listDeliverySchedules: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        referenceType: z.enum(["order", "purchase_order", "sample"]).optional(),
        status: z.enum(["pending", "confirmed", "in_transit", "delivered", "delayed", "cancelled"]).optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];

      if (input?.startDate) {
        conditions.push(gte(deliverySchedules.expectedDate, parseDate(input.startDate)));
      }
      if (input?.endDate) {
        conditions.push(lte(deliverySchedules.expectedDate, parseDate(input.endDate)));
      }
      if (input?.referenceType) {
        conditions.push(eq(deliverySchedules.referenceType, input.referenceType));
      }
      if (input?.status) {
        conditions.push(eq(deliverySchedules.status, input.status));
      }

      const result = await db
        .select()
        .from(deliverySchedules)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(deliverySchedules.expectedDate);

      return result;
    }),

  /**
   * Update delivery schedule status
   */
  updateDeliveryStatus: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["pending", "confirmed", "in_transit", "delivered", "delayed", "cancelled"]),
        confirmedDate: z.string().optional(),
        actualDate: z.string().optional(),
        trackingNumber: z.string().optional(),
        deliveryNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const updateData: Record<string, unknown> = { status: input.status };
      if (input.confirmedDate) updateData.confirmedDate = parseDate(input.confirmedDate);
      if (input.actualDate) updateData.actualDate = parseDate(input.actualDate);
      if (input.trackingNumber) updateData.trackingNumber = input.trackingNumber;
      if (input.deliveryNotes) updateData.deliveryNotes = input.deliveryNotes;

      await db
        .update(deliverySchedules)
        .set(updateData)
        .where(eq(deliverySchedules.id, input.id));

      return { success: true };
    }),

  /**
   * Get overdue deliveries
   */
  getOverdueDeliveries: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const result = await db
        .select()
        .from(deliverySchedules)
        .where(
          and(
            lte(deliverySchedules.expectedDate, today),
            inArray(deliverySchedules.status, ["pending", "confirmed", "in_transit", "delayed"])
          )
        )
        .orderBy(deliverySchedules.expectedDate);

      return result;
    }),

  // ==========================================================================
  // APPOINTMENT REFERRALS - FEAT-005-BE
  // ==========================================================================

  /**
   * Create a referral for an appointment
   */
  createReferral: protectedProcedure
    .use(requirePermission("calendar:create"))
    .input(referralInputSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [result] = await db.insert(appointmentReferrals).values({
        calendarEventId: input.calendarEventId,
        referralSource: input.referralSource,
        referringClientId: input.referringClientId || null,
        referringEmployeeId: input.referringEmployeeId || null,
        referralCode: input.referralCode || null,
        referralNotes: input.referralNotes || null,
        attributionDate: input.attributionDate ? parseDate(input.attributionDate) : null,
        conversionValue: input.conversionValue || null,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Get referral by appointment
   */
  getReferralByAppointment: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(z.object({ calendarEventId: z.number().int() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const result = await db
        .select({
          referral: appointmentReferrals,
          referringClient: clients,
          referringEmployee: users,
        })
        .from(appointmentReferrals)
        .leftJoin(clients, eq(appointmentReferrals.referringClientId, clients.id))
        .leftJoin(users, eq(appointmentReferrals.referringEmployeeId, users.id))
        .where(eq(appointmentReferrals.calendarEventId, input.calendarEventId))
        .limit(1);

      if (result.length === 0) return null;

      return {
        ...result[0].referral,
        referringClient: result[0].referringClient,
        referringEmployee: result[0].referringEmployee,
      };
    }),

  /**
   * Get referral statistics
   */
  getReferralStats: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get count by source
      const bySource = await db
        .select({
          source: appointmentReferrals.referralSource,
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(${appointmentReferrals.conversionValue}), 0)`,
        })
        .from(appointmentReferrals)
        .groupBy(appointmentReferrals.referralSource);

      // Get top referring clients
      const topClients = await db
        .select({
          clientId: appointmentReferrals.referringClientId,
          clientName: clients.name,
          count: sql<number>`COUNT(*)`,
        })
        .from(appointmentReferrals)
        .leftJoin(clients, eq(appointmentReferrals.referringClientId, clients.id))
        .where(eq(appointmentReferrals.referralSource, "existing_client"))
        .groupBy(appointmentReferrals.referringClientId, clients.name)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(10);

      return {
        bySource,
        topReferringClients: topClients,
      };
    }),

  // ==========================================================================
  // APPOINTMENT CHECK-INS - MEET-046
  // ==========================================================================

  /**
   * Create or update appointment check-in
   */
  checkIn: protectedProcedure
    .use(requirePermission("calendar:update"))
    .input(
      z.object({
        calendarEventId: z.number().int(),
        clientId: z.number().int().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);

      // Check if check-in already exists
      const [existing] = await db
        .select()
        .from(appointmentCheckIns)
        .where(eq(appointmentCheckIns.calendarEventId, input.calendarEventId))
        .limit(1);

      if (existing) {
        // Update existing check-in
        await db
          .update(appointmentCheckIns)
          .set({
            checkInTime: new Date(),
            status: "checked_in",
            handledById: userId,
            notes: input.notes,
          })
          .where(eq(appointmentCheckIns.id, existing.id));

        return { id: existing.id, success: true };
      }

      // Create new check-in
      const [result] = await db.insert(appointmentCheckIns).values({
        calendarEventId: input.calendarEventId,
        clientId: input.clientId || null,
        checkInTime: new Date(),
        status: "checked_in",
        handledById: userId,
        notes: input.notes || null,
      });

      // Record status change
      await db.insert(appointmentStatusHistory).values({
        calendarEventId: input.calendarEventId,
        previousStatus: "scheduled",
        newStatus: "checked_in",
        changedById: userId,
        notes: "Client checked in",
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Update check-in status (in_progress, completed, no_show)
   */
  updateCheckInStatus: protectedProcedure
    .use(requirePermission("calendar:update"))
    .input(
      z.object({
        id: z.number().int(),
        status: z.enum(["waiting", "checked_in", "in_progress", "completed", "no_show"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = getAuthenticatedUserId(ctx);

      // Get current check-in
      const [checkIn] = await db
        .select()
        .from(appointmentCheckIns)
        .where(eq(appointmentCheckIns.id, input.id))
        .limit(1);

      if (!checkIn) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Check-in not found" });
      }

      const updateData: Record<string, unknown> = {
        status: input.status,
        handledById: userId,
      };

      if (input.notes) {
        updateData.notes = input.notes;
      }

      if (input.status === "completed") {
        updateData.checkOutTime = new Date();
      }

      await db
        .update(appointmentCheckIns)
        .set(updateData)
        .where(eq(appointmentCheckIns.id, input.id));

      // Record status change
      await db.insert(appointmentStatusHistory).values({
        calendarEventId: checkIn.calendarEventId,
        previousStatus: checkIn.status,
        newStatus: input.status,
        changedById: userId,
        notes: input.notes,
      });

      return { success: true };
    }),

  /**
   * Get today's appointments with check-in status
   */
  getTodaysAppointments: protectedProcedure
    .use(requirePermission("calendar:read"))
    .input(
      z.object({
        roomId: z.number().int().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Get today's bookings
      const conditions = [
        gte(roomBookings.bookingDate, today),
        lte(roomBookings.bookingDate, today),
        ne(roomBookings.status, "cancelled"),
      ];

      if (input?.roomId) {
        conditions.push(eq(roomBookings.roomId, input.roomId));
      }

      const bookings = await db
        .select({
          booking: roomBookings,
          room: rooms,
          client: clients,
          calendarEvent: calendarEvents,
        })
        .from(roomBookings)
        .leftJoin(rooms, eq(roomBookings.roomId, rooms.id))
        .leftJoin(clients, eq(roomBookings.clientId, clients.id))
        .leftJoin(calendarEvents, eq(roomBookings.calendarEventId, calendarEvents.id))
        .where(and(...conditions))
        .orderBy(roomBookings.startTime);

      // Get check-in status for each booking
      const eventIds = bookings
        .filter((b) => b.calendarEvent?.id)
        .map((b) => b.calendarEvent!.id);

      let checkIns: Array<typeof appointmentCheckIns.$inferSelect> = [];
      if (eventIds.length > 0) {
        checkIns = await db
          .select()
          .from(appointmentCheckIns)
          .where(inArray(appointmentCheckIns.calendarEventId, eventIds));
      }

      const checkInMap = new Map(checkIns.map((c) => [c.calendarEventId, c]));

      return bookings.map((b) => ({
        ...b.booking,
        room: b.room,
        client: b.client,
        event: b.calendarEvent,
        checkIn: b.calendarEvent ? checkInMap.get(b.calendarEvent.id) || null : null,
      }));
    }),

  /**
   * Get live queue (appointments waiting or in progress)
   */
  getLiveQueue: protectedProcedure
    .use(requirePermission("calendar:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const result = await db
        .select({
          checkIn: appointmentCheckIns,
          client: clients,
          event: calendarEvents,
          room: rooms,
        })
        .from(appointmentCheckIns)
        .leftJoin(clients, eq(appointmentCheckIns.clientId, clients.id))
        .leftJoin(calendarEvents, eq(appointmentCheckIns.calendarEventId, calendarEvents.id))
        .leftJoin(roomBookings, eq(appointmentCheckIns.calendarEventId, roomBookings.calendarEventId))
        .leftJoin(rooms, eq(roomBookings.roomId, rooms.id))
        .where(inArray(appointmentCheckIns.status, ["waiting", "checked_in", "in_progress"]))
        .orderBy(appointmentCheckIns.queuePosition, appointmentCheckIns.checkInTime);

      return result.map((r) => ({
        ...r.checkIn,
        client: r.client,
        event: r.event,
        room: r.room,
      }));
    }),
});
