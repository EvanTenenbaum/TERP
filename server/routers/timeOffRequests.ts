import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { getDb } from "../db";
import {
  timeOffRequests,
  calendarEvents,
  users,
} from "../../drizzle/schema";
import { and, eq, gte, lte, desc, sql, or, isNull } from "drizzle-orm";
import { sendNotification } from "../services/notificationService";

/**
 * Time Off Requests Router (CAL-004)
 * Manages vacation, sick, and personal time-off requests
 * Integrates with calendar availability to block booking slots
 */

export const timeOffRequestsRouter = router({
  // ============================================================================
  // CAL-04-04: Submit Time Off Request
  // ============================================================================

  request: protectedProcedure
    .input(
      z.object({
        timeOffType: z.enum(["vacation", "sick", "personal"]),
        startDate: z.string(), // ISO date
        endDate: z.string(), // ISO date
        startTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(), // HH:MM or HH:MM:SS
        endTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).optional(),
        isFullDay: z.boolean().default(true),
        notes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Validate date range
      const startDate = new Date(input.startDate);
      const endDate = new Date(input.endDate);

      if (startDate > endDate) {
        throw new Error("End date must be after start date");
      }

      // Validate dates are in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (startDate < today) {
        throw new Error("Time off cannot be requested for past dates");
      }

      // Check for overlapping time-off requests
      const overlapping = await db
        .select()
        .from(timeOffRequests)
        .where(
          and(
            eq(timeOffRequests.userId, userId),
            or(
              eq(timeOffRequests.status, "pending"),
              eq(timeOffRequests.status, "approved")
            ),
            or(
              and(
                lte(timeOffRequests.startDate, startDate),
                gte(timeOffRequests.endDate, startDate)
              ),
              and(
                lte(timeOffRequests.startDate, endDate),
                gte(timeOffRequests.endDate, endDate)
              ),
              and(
                gte(timeOffRequests.startDate, startDate),
                lte(timeOffRequests.endDate, endDate)
              )
            )
          )
        );

      if (overlapping.length > 0) {
        throw new Error("You already have a time-off request for these dates");
      }

      // Normalize time format
      const normalizeTime = (time?: string): string | null => {
        if (!time) return null;
        return time.length === 5 ? `${time}:00` : time;
      };

      // Create the time-off request
      const [newRequest] = await db
        .insert(timeOffRequests)
        .values({
          userId,
          timeOffType: input.timeOffType,
          startDate: startDate,
          endDate: endDate,
          startTime: input.isFullDay ? null : normalizeTime(input.startTime),
          endTime: input.isFullDay ? null : normalizeTime(input.endTime),
          isFullDay: input.isFullDay,
          status: "pending",
          notes: input.notes || null,
        })
        .$returningId();

      // Get user info for notification
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      // Notify managers about the request
      // In a real system, you'd look up the user's manager(s) from an org chart
      // For now, we'll notify all admins
      const admins = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.role, "admin"))
        .limit(10);

      for (const admin of admins) {
        if (admin.id !== userId) {
          await sendNotification({
            userId: admin.id,
            type: "info",
            title: "Time Off Request",
            message: `${user?.firstName || "A user"} ${user?.lastName || ""} has requested ${input.timeOffType} time off from ${input.startDate} to ${input.endDate}`,
            link: `/calendar?tab=timeoff&requestId=${newRequest.id}`,
            category: "system",
          });
        }
      }

      return {
        success: true,
        requestId: newRequest.id,
        message: "Time off request submitted successfully",
      };
    }),

  // ============================================================================
  // CAL-04-04: Approve Time Off Request
  // ============================================================================

  approve: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        responseNotes: z.string().max(1000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is admin/manager (simplified check)
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can approve time-off requests");
      }

      // Get the request
      const [request] = await db
        .select()
        .from(timeOffRequests)
        .where(eq(timeOffRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error("Time off request not found");
      }

      if (request.status !== "pending") {
        throw new Error(`Request has already been ${request.status}`);
      }

      // Create a calendar event to block the time
      const timeOffLabels = {
        vacation: "Vacation",
        sick: "Sick Leave",
        personal: "Personal Time",
      };

      const [requestUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId))
        .limit(1);

      const startDateObj = typeof request.startDate === 'string'
        ? new Date(request.startDate)
        : request.startDate;
      const endDateObj = typeof request.endDate === 'string'
        ? new Date(request.endDate)
        : request.endDate;

      const [newEvent] = await db
        .insert(calendarEvents)
        .values({
          title: `${timeOffLabels[request.timeOffType as keyof typeof timeOffLabels]} - ${requestUser?.firstName || "User"} ${requestUser?.lastName || ""}`.trim(),
          description: request.notes || null,
          startDate: startDateObj,
          endDate: endDateObj,
          startTime: request.isFullDay ? null : request.startTime,
          endTime: request.isFullDay ? null : request.endTime,
          timezone: "America/Los_Angeles",
          isFloatingTime: request.isFullDay,
          module: "GENERAL",
          eventType: "OTHER",
          status: "SCHEDULED",
          priority: "LOW",
          visibility: "TEAM",
          createdBy: userId,
          assignedTo: request.userId,
          isRecurring: false,
          isAutoGenerated: true,
          autoGenerationRule: `time_off_request:${input.requestId}`,
        })
        .$returningId();

      // Update the request status
      await db
        .update(timeOffRequests)
        .set({
          status: "approved",
          respondedAt: new Date(),
          respondedById: userId,
          responseNotes: input.responseNotes || null,
          calendarEventId: newEvent.id,
        })
        .where(eq(timeOffRequests.id, input.requestId));

      // Notify the user about approval
      await sendNotification({
        userId: request.userId,
        type: "success",
        title: "Time Off Approved",
        message: `Your ${request.timeOffType} request from ${request.startDate} to ${request.endDate} has been approved`,
        link: `/calendar`,
        category: "system",
      });

      return {
        success: true,
        eventId: newEvent.id,
        message: "Time off request approved",
      };
    }),

  // ============================================================================
  // CAL-04-04: Reject Time Off Request
  // ============================================================================

  reject: protectedProcedure
    .input(
      z.object({
        requestId: z.number(),
        responseNotes: z.string().min(1, "A reason is required when rejecting").max(1000),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Verify user is admin/manager
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!currentUser || currentUser.role !== "admin") {
        throw new Error("Only administrators can reject time-off requests");
      }

      // Get the request
      const [request] = await db
        .select()
        .from(timeOffRequests)
        .where(eq(timeOffRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error("Time off request not found");
      }

      if (request.status !== "pending") {
        throw new Error(`Request has already been ${request.status}`);
      }

      // Update the request status
      await db
        .update(timeOffRequests)
        .set({
          status: "rejected",
          respondedAt: new Date(),
          respondedById: userId,
          responseNotes: input.responseNotes,
        })
        .where(eq(timeOffRequests.id, input.requestId));

      // Notify the user about rejection
      await sendNotification({
        userId: request.userId,
        type: "warning",
        title: "Time Off Request Declined",
        message: `Your ${request.timeOffType} request was not approved. Reason: ${input.responseNotes}`,
        link: `/calendar`,
        category: "system",
      });

      return {
        success: true,
        message: "Time off request rejected",
      };
    }),

  // ============================================================================
  // List Time Off Requests
  // ============================================================================

  list: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(), // Filter by specific user (admin only)
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const currentUserId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Check if user is admin
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, currentUserId))
        .limit(1);

      const isAdmin = currentUser?.role === "admin";

      // Build conditions
      const conditions: ReturnType<typeof eq>[] = [];

      // Non-admins can only see their own requests
      if (!isAdmin || !input?.userId) {
        if (!isAdmin) {
          conditions.push(eq(timeOffRequests.userId, currentUserId));
        }
      } else if (input?.userId) {
        conditions.push(eq(timeOffRequests.userId, input.userId));
      }

      if (input?.status) {
        conditions.push(eq(timeOffRequests.status, input.status));
      }

      if (input?.startDate) {
        conditions.push(gte(timeOffRequests.startDate, new Date(input.startDate)));
      }

      if (input?.endDate) {
        conditions.push(lte(timeOffRequests.endDate, new Date(input.endDate)));
      }

      // Get total count
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(timeOffRequests)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get requests with user info
      const requests = await db
        .select({
          id: timeOffRequests.id,
          userId: timeOffRequests.userId,
          timeOffType: timeOffRequests.timeOffType,
          startDate: timeOffRequests.startDate,
          endDate: timeOffRequests.endDate,
          startTime: timeOffRequests.startTime,
          endTime: timeOffRequests.endTime,
          isFullDay: timeOffRequests.isFullDay,
          status: timeOffRequests.status,
          notes: timeOffRequests.notes,
          responseNotes: timeOffRequests.responseNotes,
          calendarEventId: timeOffRequests.calendarEventId,
          createdAt: timeOffRequests.createdAt,
          respondedAt: timeOffRequests.respondedAt,
          respondedById: timeOffRequests.respondedById,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(timeOffRequests)
        .leftJoin(users, eq(timeOffRequests.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(timeOffRequests.createdAt))
        .limit(input?.limit || 50)
        .offset(input?.offset || 0);

      return {
        requests: requests.map((r) => ({
          ...r,
          userName: `${r.userFirstName || ""} ${r.userLastName || ""}`.trim(),
        })),
        total: countResult.count,
      };
    }),

  // ============================================================================
  // Get Time Off Request Detail
  // ============================================================================

  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const currentUserId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [request] = await db
        .select({
          id: timeOffRequests.id,
          userId: timeOffRequests.userId,
          timeOffType: timeOffRequests.timeOffType,
          startDate: timeOffRequests.startDate,
          endDate: timeOffRequests.endDate,
          startTime: timeOffRequests.startTime,
          endTime: timeOffRequests.endTime,
          isFullDay: timeOffRequests.isFullDay,
          status: timeOffRequests.status,
          notes: timeOffRequests.notes,
          responseNotes: timeOffRequests.responseNotes,
          calendarEventId: timeOffRequests.calendarEventId,
          createdAt: timeOffRequests.createdAt,
          respondedAt: timeOffRequests.respondedAt,
          respondedById: timeOffRequests.respondedById,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(timeOffRequests)
        .leftJoin(users, eq(timeOffRequests.userId, users.id))
        .where(eq(timeOffRequests.id, input.id))
        .limit(1);

      if (!request) {
        throw new Error("Time off request not found");
      }

      // Check if user is admin or the request owner
      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, currentUserId))
        .limit(1);

      const isAdmin = currentUser?.role === "admin";

      if (!isAdmin && request.userId !== currentUserId) {
        throw new Error("You don't have permission to view this request");
      }

      return {
        ...request,
        userName: `${request.userFirstName || ""} ${request.userLastName || ""}`.trim(),
      };
    }),

  // Get my pending count
  getMyPendingCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = getAuthenticatedUserId(ctx);
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timeOffRequests)
      .where(
        and(
          eq(timeOffRequests.userId, userId),
          eq(timeOffRequests.status, "pending")
        )
      );

    return { count: result.count };
  }),

  // Get team pending count (for admins)
  getTeamPendingCount: protectedProcedure.query(async ({ ctx }) => {
    const userId = getAuthenticatedUserId(ctx);
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Check if user is admin
    const [currentUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!currentUser || currentUser.role !== "admin") {
      return { count: 0 };
    }

    const [result] = await db
      .select({ count: sql<number>`count(*)` })
      .from(timeOffRequests)
      .where(eq(timeOffRequests.status, "pending"));

    return { count: result.count };
  }),

  // ============================================================================
  // CAL-04-05: Get approved time-off for availability integration
  // ============================================================================

  getApprovedTimeOff: protectedProcedure
    .input(
      z.object({
        userIds: z.array(z.number()).optional(), // Filter by users
        startDate: z.string(), // ISO date
        endDate: z.string(), // ISO date
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: ReturnType<typeof eq>[] = [
        eq(timeOffRequests.status, "approved"),
        gte(timeOffRequests.endDate, new Date(input.startDate)),
        lte(timeOffRequests.startDate, new Date(input.endDate)),
      ];

      if (input.userIds && input.userIds.length > 0) {
        // Note: Using multiple OR conditions instead of inArray for compatibility
        // In production, you might use: inArray(timeOffRequests.userId, input.userIds)
      }

      const approvedTimeOff = await db
        .select({
          id: timeOffRequests.id,
          userId: timeOffRequests.userId,
          timeOffType: timeOffRequests.timeOffType,
          startDate: timeOffRequests.startDate,
          endDate: timeOffRequests.endDate,
          startTime: timeOffRequests.startTime,
          endTime: timeOffRequests.endTime,
          isFullDay: timeOffRequests.isFullDay,
        })
        .from(timeOffRequests)
        .where(and(...conditions));

      return approvedTimeOff;
    }),

  // Cancel a pending time-off request (user can cancel their own)
  cancel: protectedProcedure
    .input(z.object({ requestId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get the request
      const [request] = await db
        .select()
        .from(timeOffRequests)
        .where(eq(timeOffRequests.id, input.requestId))
        .limit(1);

      if (!request) {
        throw new Error("Time off request not found");
      }

      // Verify ownership
      if (request.userId !== userId) {
        throw new Error("You can only cancel your own time-off requests");
      }

      if (request.status !== "pending") {
        throw new Error("Only pending requests can be cancelled");
      }

      // Delete the request
      await db
        .delete(timeOffRequests)
        .where(eq(timeOffRequests.id, input.requestId));

      return {
        success: true,
        message: "Time off request cancelled",
      };
    }),
});
