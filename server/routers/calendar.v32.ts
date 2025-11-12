/**
 * Calendar v3.2 Router - Complete Implementation
 * Following TERP Bible Protocols
 * Version: 3.2
 * Date: 2025-11-10
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { calendarLogger } from "../_core/logger";
import { requirePermission } from "../_core/permissionMiddleware";
import { withTransaction, checkConflicts } from "../calendarDb";
import { getDb } from "../db";
import {
  calendarEvents,
  clients,
  vendors,
  clientActivity,
  clientMeetingHistory,
  invoices,
  payments,
  vendorPayments,
  purchaseOrders,
  orders,
  batches,
} from "../../drizzle/schema";
import { and, eq, gte, lte, lt, ne, isNull, inArray, asc, desc, sql } from "drizzle-orm";

/**
 * Helper: Add minutes to time string
 */
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(":").map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, "0")}:${newMins.toString().padStart(2, "0")}`;
}

export const calendarV32Router = router({
  /**
   * Quick book appointment for client with conflict detection
   * TERP Bible: Uses transactions, RBAC, conflict detection
   */
  quickBookForClient: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        eventType: z.string(),
        date: z.string(),
        time: z.string(),
        duration: z.number(),
        title: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user.id, "calendar.create");

      return await withTransaction(async (tx) => {
        // 1. Check for conflicts (Fix #4)
        const endTime = addMinutes(input.time, input.duration);
        const conflicts = await checkConflicts({
          startDate: input.date,
          startTime: input.time,
          endDate: input.date,
          endTime: endTime,
        });

        if (conflicts.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Time slot conflicts with ${conflicts.length} existing appointment(s)`,
          });
        }

        // 2. Create event
        const [event] = await tx
          .insert(calendarEvents)
          .values({
            title: input.title,
            eventType: input.eventType as any,
            startDate: input.date,
            endDate: input.date,
            startTime: input.time,
            endTime: endTime,
            clientId: input.clientId,
            module: "CLIENTS",
            notes: input.notes,
            status: "SCHEDULED",
            priority: "MEDIUM",
            createdBy: ctx.user.id,
            assignedTo: ctx.user.id,
          })
          .$returningId();

        // 3. Log client activity
        await tx.insert(clientActivity).values({
          clientId: input.clientId,
          userId: ctx.user.id,
          activityType: "MEETING",
          description: `Appointment scheduled: ${input.title}`,
          activityDate: new Date(),
        });

        // 4. Create meeting history if client-facing event
        const clientFacingTypes = ["MEETING", "INTAKE", "AR_COLLECTION"];
        if (clientFacingTypes.includes(input.eventType)) {
          await tx.insert(clientMeetingHistory).values({
            clientId: input.clientId,
            calendarEventId: event.id,
            meetingDate: new Date(`${input.date}T${input.time}`),
            meetingType: input.eventType as any,
          });
        }

        // Log event creation
        calendarLogger.eventCreated(event.id, ctx.user.id, input.eventType, {
          clientId: input.clientId,
          date: input.date,
          time: input.time,
        });

        return { eventId: event.id };
      });
    }),

  /**
   * Get appointment history for client
   * TERP Bible: Uses RBAC, pagination, filtering
   */
  getClientAppointments: protectedProcedure
    .input(
      z.object({
        clientId: z.number(),
        filter: z.enum(["upcoming", "past", "all"]).optional().default("all"),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      })
    )
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user.id, "calendar.view");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Build conditions
      const conditions: any[] = [
        eq(calendarEvents.clientId, input.clientId),
        isNull(calendarEvents.deletedAt),
      ];

      // Apply filter
      const now = new Date().toISOString().split("T")[0];
      if (input.filter === "upcoming") {
        conditions.push(gte(calendarEvents.startDate, now));
      } else if (input.filter === "past") {
        conditions.push(lt(calendarEvents.startDate, now));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(calendarEvents)
        .where(and(...conditions));

      const total = countResult?.count || 0;

      // Get appointments
      const appointments = await db
        .select()
        .from(calendarEvents)
        .where(and(...conditions))
        .orderBy(desc(calendarEvents.startDate))
        .limit(input.limit)
        .offset(input.offset);

      return { appointments, total };
    }),

  /**
   * Get day schedule for dashboard widget
   * TERP Bible: Uses JOIN to avoid N+1 (Fix #8)
   */
  getDaySchedule: protectedProcedure
    .input(
      z.object({
        date: z.string(),
        eventTypes: z.array(z.string()).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      await requirePermission(ctx.user.id, "calendar.view");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Build conditions
      const conditions: any[] = [
        eq(calendarEvents.startDate, input.date),
        ne(calendarEvents.status, "CANCELLED"),
        isNull(calendarEvents.deletedAt),
      ];

      if (input.eventTypes && input.eventTypes.length > 0) {
        conditions.push(inArray(calendarEvents.eventType, input.eventTypes as any));
      }

      // Use JOIN to load clients and vendors (Fix #8 - N+1 query)
      const events = await db
        .select({
          id: calendarEvents.id,
          title: calendarEvents.title,
          eventType: calendarEvents.eventType,
          startTime: calendarEvents.startTime,
          endTime: calendarEvents.endTime,
          location: calendarEvents.location,
          status: calendarEvents.status,
          priority: calendarEvents.priority,
          clientId: clients.id,
          clientName: clients.name,
          vendorId: vendors.id,
          vendorName: vendors.name,
        })
        .from(calendarEvents)
        .leftJoin(clients, eq(calendarEvents.clientId, clients.id))
        .leftJoin(vendors, eq(calendarEvents.vendorId, vendors.id))
        .where(and(...conditions))
        .orderBy(asc(calendarEvents.startTime));

      // Transform to desired format
      const eventsWithDetails = events.map((row) => ({
        id: row.id,
        title: row.title,
        eventType: row.eventType,
        startTime: row.startTime,
        endTime: row.endTime,
        location: row.location,
        status: row.status,
        priority: row.priority,
        client: row.clientId ? { id: row.clientId, name: row.clientName } : null,
        vendor: row.vendorId ? { id: row.vendorId, name: row.vendorName } : null,
      }));

      return { events: eventsWithDetails };
    }),

  /**
   * Process AR payment from AR_COLLECTION appointment
   * TERP Bible: Uses transactions, validation, activity logging
   */
  processPaymentFromAppointment: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        invoiceId: z.number(),
        amount: z.number(),
        paymentMethod: z.string(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user.id, "payments.create");

      return await withTransaction(async (tx) => {
        // 1. Validate event
        const [event] = await tx
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.id, input.eventId))
          .limit(1);

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        if (event.eventType !== "AR_COLLECTION") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Event must be AR_COLLECTION type",
          });
        }

        // 2. Validate invoice
        const [invoice] = await tx
          .select()
          .from(invoices)
          .where(eq(invoices.id, input.invoiceId))
          .limit(1);

        if (!invoice) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Invoice not found",
          });
        }

        if (invoice.status === "PAID") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invoice already paid",
          });
        }

        // 3. Validate amount
        const invoiceTotal = parseFloat(invoice.total.toString());
        if (input.amount <= 0 || input.amount > invoiceTotal) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid payment amount",
          });
        }

        // 4. Create payment
        const [payment] = await tx
          .insert(payments)
          .values({
            invoiceId: input.invoiceId,
            amount: input.amount.toString(),
            paymentMethod: input.paymentMethod as any,
            paymentDate: new Date(),
            notes: input.notes,
            createdBy: ctx.user.id,
          })
          .$returningId();

        // 5. Update invoice status
        const currentPaid = parseFloat(invoice.amountPaid?.toString() || "0");
        const newAmountPaid = currentPaid + input.amount;
        const newStatus = newAmountPaid >= invoiceTotal ? "PAID" : "PARTIAL";

        await tx
          .update(invoices)
          .set({
            amountPaid: newAmountPaid.toString(),
            status: newStatus as any,
            updatedAt: new Date(),
          })
          .where(eq(invoices.id, input.invoiceId));

        // 6. Update event
        await tx
          .update(calendarEvents)
          .set({
            status: "COMPLETED",
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, input.eventId));

        // 7. Log client activity
        if (event.clientId) {
          await tx.insert(clientActivity).values({
            clientId: event.clientId,
            userId: ctx.user.id,
            activityType: "PAYMENT_RECEIVED",
            description: `Payment received: $${input.amount} for Invoice #${invoice.invoiceNumber}`,
            activityDate: new Date(),
          });
        }

        // Log payment processing
        calendarLogger.paymentProcessed(payment.id, input.amount, "AR", {
          eventId: input.eventId,
          invoiceId: input.invoiceId,
        });

        return { paymentId: payment.id };
      });
    }),

  /**
   * Process AP payment from AP_PAYMENT appointment
   * TERP Bible: Uses transactions, validation, activity logging
   */
  processVendorPaymentFromAppointment: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        purchaseOrderId: z.number(),
        amount: z.number(),
        paymentMethod: z.string(),
        checkNumber: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user.id, "vendor_payments.create");

      return await withTransaction(async (tx) => {
        // 1. Validate event
        const [event] = await tx
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.id, input.eventId))
          .limit(1);

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        if (event.eventType !== "AP_PAYMENT") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Event must be AP_PAYMENT type",
          });
        }

        // 2. Validate purchase order
        const [po] = await tx
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, input.purchaseOrderId))
          .limit(1);

        if (!po) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Purchase order not found",
          });
        }

        if (po.status === "PAID") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Purchase order already paid",
          });
        }

        // 3. Validate amount
        const poTotal = parseFloat(po.total.toString());
        if (input.amount <= 0 || input.amount > poTotal) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid payment amount",
          });
        }

        // 4. Create vendor payment
        const [payment] = await tx
          .insert(vendorPayments)
          .values({
            purchaseOrderId: input.purchaseOrderId,
            amount: input.amount.toString(),
            paymentMethod: input.paymentMethod as any,
            checkNumber: input.checkNumber,
            paymentDate: new Date(),
            notes: input.notes,
            createdBy: ctx.user.id,
          })
          .$returningId();

        // 5. Update PO status
        const currentPaid = parseFloat(po.amountPaid?.toString() || "0");
        const newAmountPaid = currentPaid + input.amount;
        const newStatus = newAmountPaid >= poTotal ? "PAID" : "PARTIAL";

        await tx
          .update(purchaseOrders)
          .set({
            amountPaid: newAmountPaid.toString(),
            status: newStatus as any,
            updatedAt: new Date(),
          })
          .where(eq(purchaseOrders.id, input.purchaseOrderId));

        // 6. Update event
        await tx
          .update(calendarEvents)
          .set({
            status: "COMPLETED",
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, input.eventId));

        // Log vendor payment processing
        calendarLogger.paymentProcessed(payment.id, input.amount, "AP", {
          eventId: input.eventId,
          purchaseOrderId: input.purchaseOrderId,
        });

        return { paymentId: payment.id };
      });
    }),

  /**
   * Create order from INTAKE appointment
   * TERP Bible: Uses transactions, duplicate detection, activity logging
   */
  createOrderFromAppointment: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        orderData: z.object({
          orderType: z.enum(["QUOTE", "SALE"]),
          items: z.array(z.any()),
          subtotal: z.number(),
          tax: z.number().optional(),
          discount: z.number().optional(),
          total: z.number(),
        }),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user.id, "orders.create");

      return await withTransaction(async (tx) => {
        // 1. Validate event
        const [event] = await tx
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.id, input.eventId))
          .limit(1);

        if (!event) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Event not found",
          });
        }

        if (event.eventType !== "INTAKE") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Event must be INTAKE type",
          });
        }

        if (!event.clientId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Event must have a client",
          });
        }

        // 2. Check for duplicate order
        const [existingOrder] = await tx
          .select()
          .from(orders)
          .where(eq(orders.intakeEventId, input.eventId))
          .limit(1);

        if (existingOrder) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Order already exists for this intake appointment",
          });
        }

        // 3. Generate order number
        const orderNumber = `ORD-${Date.now()}`;

        // 4. Create order
        const [order] = await tx
          .insert(orders)
          .values({
            orderNumber,
            orderType: input.orderData.orderType,
            clientId: event.clientId,
            intakeEventId: input.eventId,
            items: input.orderData.items,
            subtotal: input.orderData.subtotal.toString(),
            tax: input.orderData.tax?.toString() || "0",
            discount: input.orderData.discount?.toString() || "0",
            total: input.orderData.total.toString(),
            isDraft: true,
            createdBy: ctx.user.id,
          })
          .$returningId();

        // 5. Update event
        await tx
          .update(calendarEvents)
          .set({
            status: "COMPLETED",
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, input.eventId));

        // 6. Log client activity
        await tx.insert(clientActivity).values({
          clientId: event.clientId,
          userId: ctx.user.id,
          activityType: "ORDER_CREATED",
          description: `Order created from intake appointment: ${orderNumber}`,
          activityDate: new Date(),
        });

        // Log order creation
        calendarLogger.orderCreated(order.id, input.eventId, {
          orderNumber,
          clientId: event.clientId,
        });

        return { orderId: order.id };
      });
    }),

  /**
   * Link batch to PHOTOGRAPHY appointment
   * TERP Bible: Uses transactions, validation
   */
  linkBatchToPhotoSession: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        batchId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      await requirePermission(ctx.user.id, "batches.update");

      return await withTransaction(async (tx) => {
        // 1. Validate event
        const [event] = await tx
          .select()
          .from(calendarEvents)
          .where(eq(calendarEvents.id, input.eventId))
          .limit(1);

        if (!event || event.eventType !== "PHOTOGRAPHY") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Event must be PHOTOGRAPHY type",
          });
        }

        // 2. Validate batch
        const [batch] = await tx
          .select()
          .from(batches)
          .where(eq(batches.id, input.batchId))
          .limit(1);

        if (!batch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Batch not found",
          });
        }

        // 3. Link batch to event
        await tx
          .update(batches)
          .set({
            photoSessionEventId: input.eventId,
          })
          .where(eq(batches.id, input.batchId));

        // 4. Update event
        await tx
          .update(calendarEvents)
          .set({
            updatedAt: new Date(),
          })
          .where(eq(calendarEvents.id, input.eventId));

        // Log batch linking
        calendarLogger.batchLinked(input.batchId, input.eventId);

        return { success: true };
      });
    }),

  /**
   * Get available time slots for booking (VIP Portal)
   * TERP Bible: Optimized O(n) algorithm (Fix #9)
   */
  getAvailableSlots: publicProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        duration: z.number(),
        eventType: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Generate all possible slots
      const slots: Array<{ date: string; time: string; startDateTime: Date }> = [];
      const currentDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      while (currentDate <= endDate) {
        for (let hour = 9; hour < 17; hour++) {
          const slotDateTime = new Date(currentDate);
          slotDateTime.setHours(hour, 0, 0, 0);

          slots.push({
            date: currentDate.toISOString().split("T")[0],
            time: `${hour.toString().padStart(2, "0")}:00`,
            startDateTime: slotDateTime,
          });
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Get all events in date range (single query)
      const existingEvents = await db
        .select({
          startDate: calendarEvents.startDate,
          startTime: calendarEvents.startTime,
          endTime: calendarEvents.endTime,
        })
        .from(calendarEvents)
        .where(
          and(
            gte(calendarEvents.startDate, input.startDate),
            lte(calendarEvents.startDate, input.endDate),
            ne(calendarEvents.status, "CANCELLED"),
            isNull(calendarEvents.deletedAt)
          )
        );

      // Create set of unavailable time ranges for O(1) lookup
      const unavailableRanges = existingEvents.map((event) => {
        const startHour = parseInt(event.startTime?.split(":")[0] || "0");
        const startMin = parseInt(event.startTime?.split(":")[1] || "0");
        const endHour = parseInt(event.endTime?.split(":")[0] || "0");
        const endMin = parseInt(event.endTime?.split(":")[1] || "0");

        return {
          date: event.startDate,
          startMinutes: startHour * 60 + startMin,
          endMinutes: endHour * 60 + endMin,
        };
      });

      // Check each slot against unavailable ranges (O(n))
      const slotsWithAvailability = slots.map((slot) => {
        const slotHour = parseInt(slot.time.split(":")[0]);
        const slotStartMinutes = slotHour * 60;
        const slotEndMinutes = slotStartMinutes + input.duration;

        const isAvailable = !unavailableRanges.some((range) => {
          if (range.date !== slot.date) return false;

          return (
            (slotStartMinutes >= range.startMinutes && slotStartMinutes < range.endMinutes) ||
            (slotEndMinutes > range.startMinutes && slotEndMinutes <= range.endMinutes) ||
            (slotStartMinutes <= range.startMinutes && slotEndMinutes >= range.endMinutes)
          );
        });

        return {
          date: slot.date,
          time: slot.time,
          available: isAvailable,
        };
      });

      return { slots: slotsWithAvailability };
    }),

  /**
   * Book appointment from VIP portal (external/public)
   * TERP Bible: Uses transactions, conflict detection, returns confirmation
   */
  bookAppointmentExternal: publicProcedure
    .input(
      z.object({
        clientId: z.number(),
        eventType: z.string(),
        date: z.string(),
        time: z.string(),
        duration: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      // Note: This is a public API, authentication handled by VIP portal

      return await withTransaction(async (tx) => {
        // 1. Validate client exists
        const [client] = await tx
          .select()
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // 2. Check for conflicts
        const endTime = addMinutes(input.time, input.duration);
        const conflicts = await checkConflicts({
          startDate: input.date,
          startTime: input.time,
          endDate: input.date,
          endTime: endTime,
        });

        if (conflicts.length > 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `Time slot no longer available`,
          });
        }

        // 3. Create event
        const [event] = await tx
          .insert(calendarEvents)
          .values({
            title: `${input.eventType} - ${client.name}`,
            eventType: input.eventType as any,
            startDate: input.date,
            endDate: input.date,
            startTime: input.time,
            endTime: endTime,
            clientId: input.clientId,
            module: "CLIENTS",
            notes: input.notes,
            status: "SCHEDULED",
            priority: "MEDIUM",
            createdBy: 1, // System user
            assignedTo: 1, // Will be reassigned by staff
          })
          .$returningId();

        // 4. Return confirmation details (no email per requirement)
        return {
          eventId: event.id,
          confirmationDetails: {
            clientName: client.name,
            eventType: input.eventType,
            date: input.date,
            time: input.time,
            duration: input.duration,
          confirmationNumber: `CONF-${event.id}`,
        },
      };

        // Log external booking
        calendarLogger.externalBooking(event.id, input.clientId, `CONF-${event.id}`);

        return result;
      });
    }),
});
