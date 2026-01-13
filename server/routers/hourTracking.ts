/**
 * Hour Tracking Router
 * Sprint 5 Track E: MEET-048 - Hour Tracking
 *
 * Provides functionality for:
 * - Clock in/out
 * - Timesheet management
 * - Hours worked reports
 * - Overtime calculation
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { timeEntries, overtimeRules } from "../../drizzle/schema-scheduling";
import { users } from "../../drizzle/schema";
import { eq, and, sql, desc, gte, lte } from "drizzle-orm";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate hours from two dates in minutes
 */
function calculateMinutes(start: Date, end: Date): number {
  return Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
}

/**
 * Format minutes as HH:MM
 */
function formatMinutesAsTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// ============================================================================
// ROUTER
// ============================================================================

export const hourTrackingRouter = router({
  // ==========================================================================
  // CLOCK IN/OUT
  // ==========================================================================

  /**
   * Clock in for current user
   */
  clockIn: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .input(
      z
        .object({
          notes: z.string().optional(),
          shiftId: z.number().int().optional(),
          deviceInfo: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);
      const now = new Date();
      const today = now.toISOString().split("T")[0];

      // Check if already clocked in today
      const [existing] = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, userId),
            eq(timeEntries.entryDate, today),
            eq(timeEntries.status, "active")
          )
        )
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Already clocked in. Please clock out first before clocking in again.",
        });
      }

      const [result] = await db.insert(timeEntries).values({
        userId,
        entryDate: today,
        clockIn: now,
        entryType: "regular",
        status: "active",
        shiftId: input?.shiftId || null,
        notes: input?.notes || null,
        clockInDevice: input?.deviceInfo || null,
      });

      return {
        id: result.insertId,
        clockInTime: now.toISOString(),
        success: true,
      };
    }),

  /**
   * Clock out for current user
   */
  clockOut: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .input(
      z
        .object({
          notes: z.string().optional(),
          deviceInfo: z.string().optional(),
        })
        .optional()
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);
      const now = new Date();

      // Find active time entry
      const [activeEntry] = await db
        .select()
        .from(timeEntries)
        .where(
          and(eq(timeEntries.userId, userId), eq(timeEntries.status, "active"))
        )
        .orderBy(desc(timeEntries.clockIn))
        .limit(1);

      if (!activeEntry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not clocked in. Please clock in first.",
        });
      }

      // Calculate total hours
      const totalMinutes = calculateMinutes(activeEntry.clockIn, now);
      const breakMinutes = activeEntry.totalBreakMinutes || 0;
      const workedMinutes = totalMinutes - breakMinutes;

      // Get overtime rules
      const [otRule] = await db
        .select()
        .from(overtimeRules)
        .where(
          and(
            eq(overtimeRules.isDefault, true),
            eq(overtimeRules.isActive, true)
          )
        )
        .limit(1);

      const dailyThreshold = otRule?.dailyThresholdMinutes || 480; // 8 hours default
      const regularMinutes = Math.min(workedMinutes, dailyThreshold);
      const overtimeMinutes = Math.max(0, workedMinutes - dailyThreshold);

      // Update time entry
      await db
        .update(timeEntries)
        .set({
          clockOut: now,
          totalHours: workedMinutes,
          regularHours: regularMinutes,
          overtimeHours: overtimeMinutes,
          status: "completed",
          notes: input?.notes
            ? `${activeEntry.notes || ""}\n${input.notes}`.trim()
            : activeEntry.notes,
          clockOutDevice: input?.deviceInfo || null,
        })
        .where(eq(timeEntries.id, activeEntry.id));

      return {
        id: activeEntry.id,
        clockOutTime: now.toISOString(),
        totalHours: formatMinutesAsTime(workedMinutes),
        regularHours: formatMinutesAsTime(regularMinutes),
        overtimeHours: formatMinutesAsTime(overtimeMinutes),
        success: true,
      };
    }),

  /**
   * Start break
   */
  startBreak: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);
      const now = new Date();

      // Find active time entry
      const [activeEntry] = await db
        .select()
        .from(timeEntries)
        .where(
          and(eq(timeEntries.userId, userId), eq(timeEntries.status, "active"))
        )
        .orderBy(desc(timeEntries.clockIn))
        .limit(1);

      if (!activeEntry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not clocked in. Please clock in first.",
        });
      }

      if (activeEntry.breakStart && !activeEntry.breakEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Already on break. Please end break first.",
        });
      }

      await db
        .update(timeEntries)
        .set({ breakStart: now, breakEnd: null })
        .where(eq(timeEntries.id, activeEntry.id));

      return { breakStartTime: now.toISOString(), success: true };
    }),

  /**
   * End break
   */
  endBreak: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);
      const now = new Date();

      // Find active time entry with active break
      const [activeEntry] = await db
        .select()
        .from(timeEntries)
        .where(
          and(eq(timeEntries.userId, userId), eq(timeEntries.status, "active"))
        )
        .orderBy(desc(timeEntries.clockIn))
        .limit(1);

      if (!activeEntry) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not clocked in.",
        });
      }

      if (!activeEntry.breakStart || activeEntry.breakEnd) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Not currently on break.",
        });
      }

      const breakMinutes = calculateMinutes(activeEntry.breakStart, now);
      const totalBreakMinutes =
        (activeEntry.totalBreakMinutes || 0) + breakMinutes;

      await db
        .update(timeEntries)
        .set({ breakEnd: now, totalBreakMinutes })
        .where(eq(timeEntries.id, activeEntry.id));

      return {
        breakEndTime: now.toISOString(),
        breakDuration: formatMinutesAsTime(breakMinutes),
        totalBreakTime: formatMinutesAsTime(totalBreakMinutes),
        success: true,
      };
    }),

  /**
   * Get current clock status
   */
  getCurrentStatus: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Find active time entry
      const [activeEntry] = await db
        .select()
        .from(timeEntries)
        .where(
          and(eq(timeEntries.userId, userId), eq(timeEntries.status, "active"))
        )
        .orderBy(desc(timeEntries.clockIn))
        .limit(1);

      if (!activeEntry) {
        return {
          isClockedIn: false,
          isOnBreak: false,
          currentEntry: null,
        };
      }

      const now = new Date();
      const elapsedMinutes = calculateMinutes(activeEntry.clockIn, now);
      const breakMinutes = activeEntry.totalBreakMinutes || 0;

      return {
        isClockedIn: true,
        isOnBreak: activeEntry.breakStart && !activeEntry.breakEnd,
        currentEntry: {
          id: activeEntry.id,
          clockIn: activeEntry.clockIn,
          entryDate: activeEntry.entryDate,
          elapsedTime: formatMinutesAsTime(elapsedMinutes),
          totalBreakTime: formatMinutesAsTime(breakMinutes),
          workedTime: formatMinutesAsTime(elapsedMinutes - breakMinutes),
        },
      };
    }),

  // ==========================================================================
  // TIME ENTRIES MANAGEMENT
  // ==========================================================================

  /**
   * List time entries
   */
  listTimeEntries: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .input(
      z.object({
        userId: z.number().int().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        status: z
          .enum(["active", "completed", "adjusted", "approved", "rejected"])
          .optional(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const authUserId = getAuthenticatedUserId(ctx);
      const targetUserId = input.userId || authUserId;

      const conditions = [eq(timeEntries.userId, targetUserId)];

      if (input.startDate) {
        conditions.push(gte(timeEntries.entryDate, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(timeEntries.entryDate, input.endDate));
      }
      if (input.status) {
        conditions.push(eq(timeEntries.status, input.status));
      }

      const entries = await db
        .select({
          entry: timeEntries,
          user: users,
        })
        .from(timeEntries)
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .where(and(...conditions))
        .orderBy(desc(timeEntries.entryDate), desc(timeEntries.clockIn))
        .limit(input.limit)
        .offset(input.offset);

      return entries.map(e => ({
        ...e.entry,
        userName: e.user?.name || "Unknown",
        formattedTotal: formatMinutesAsTime(e.entry.totalHours || 0),
        formattedRegular: formatMinutesAsTime(e.entry.regularHours || 0),
        formattedOvertime: formatMinutesAsTime(e.entry.overtimeHours || 0),
      }));
    }),

  /**
   * Manual time entry (for managers)
   */
  createManualEntry: protectedProcedure
    .use(requirePermission("scheduling:manage"))
    .input(
      z.object({
        userId: z.number().int(),
        entryDate: z.string(),
        clockIn: z.string(), // ISO datetime
        clockOut: z.string(), // ISO datetime
        entryType: z
          .enum([
            "regular",
            "overtime",
            "holiday",
            "sick",
            "vacation",
            "training",
          ])
          .default("regular"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const managerId = getAuthenticatedUserId(ctx);

      const clockInDate = new Date(input.clockIn);
      const clockOutDate = new Date(input.clockOut);
      const totalMinutes = calculateMinutes(clockInDate, clockOutDate);

      // Get overtime rules
      const [otRule] = await db
        .select()
        .from(overtimeRules)
        .where(
          and(
            eq(overtimeRules.isDefault, true),
            eq(overtimeRules.isActive, true)
          )
        )
        .limit(1);

      const dailyThreshold = otRule?.dailyThresholdMinutes || 480;
      const regularMinutes = Math.min(totalMinutes, dailyThreshold);
      const overtimeMinutes = Math.max(0, totalMinutes - dailyThreshold);

      const [result] = await db.insert(timeEntries).values({
        userId: input.userId,
        entryDate: input.entryDate,
        clockIn: clockInDate,
        clockOut: clockOutDate,
        entryType: input.entryType,
        status: "completed",
        totalHours: totalMinutes,
        regularHours: regularMinutes,
        overtimeHours: overtimeMinutes,
        notes: input.notes || null,
        adjustedById: managerId,
        adjustedAt: new Date(),
        adjustmentReason: "Manual entry by manager",
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Adjust time entry
   */
  adjustTimeEntry: protectedProcedure
    .use(requirePermission("scheduling:manage"))
    .input(
      z.object({
        entryId: z.number().int(),
        clockIn: z.string().optional(),
        clockOut: z.string().optional(),
        reason: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const managerId = getAuthenticatedUserId(ctx);

      // Get existing entry
      const [entry] = await db
        .select()
        .from(timeEntries)
        .where(eq(timeEntries.id, input.entryId))
        .limit(1);

      if (!entry) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Time entry not found",
        });
      }

      const clockInDate = input.clockIn
        ? new Date(input.clockIn)
        : entry.clockIn;
      const clockOutDate = input.clockOut
        ? new Date(input.clockOut)
        : entry.clockOut;

      let totalMinutes = 0;
      let regularMinutes = 0;
      let overtimeMinutes = 0;

      if (clockOutDate) {
        totalMinutes =
          calculateMinutes(clockInDate, clockOutDate) -
          (entry.totalBreakMinutes || 0);

        const [otRule] = await db
          .select()
          .from(overtimeRules)
          .where(
            and(
              eq(overtimeRules.isDefault, true),
              eq(overtimeRules.isActive, true)
            )
          )
          .limit(1);

        const dailyThreshold = otRule?.dailyThresholdMinutes || 480;
        regularMinutes = Math.min(totalMinutes, dailyThreshold);
        overtimeMinutes = Math.max(0, totalMinutes - dailyThreshold);
      }

      await db
        .update(timeEntries)
        .set({
          clockIn: clockInDate,
          clockOut: clockOutDate,
          totalHours: totalMinutes,
          regularHours: regularMinutes,
          overtimeHours: overtimeMinutes,
          status: "adjusted",
          adjustedById: managerId,
          adjustedAt: new Date(),
          adjustmentReason: input.reason,
        })
        .where(eq(timeEntries.id, input.entryId));

      return { success: true };
    }),

  /**
   * Approve time entry
   */
  approveTimeEntry: protectedProcedure
    .use(requirePermission("scheduling:manage"))
    .input(z.object({ entryId: z.number().int() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const managerId = getAuthenticatedUserId(ctx);

      await db
        .update(timeEntries)
        .set({
          status: "approved",
          approvedById: managerId,
          approvedAt: new Date(),
        })
        .where(eq(timeEntries.id, input.entryId));

      return { success: true };
    }),

  // ==========================================================================
  // TIMESHEET MANAGEMENT
  // ==========================================================================

  /**
   * Get timesheet for user in date range
   */
  getTimesheet: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .input(
      z.object({
        userId: z.number().int().optional(),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const authUserId = getAuthenticatedUserId(ctx);
      const targetUserId = input.userId || authUserId;

      const entries = await db
        .select()
        .from(timeEntries)
        .where(
          and(
            eq(timeEntries.userId, targetUserId),
            gte(timeEntries.entryDate, input.startDate),
            lte(timeEntries.entryDate, input.endDate)
          )
        )
        .orderBy(timeEntries.entryDate, timeEntries.clockIn);

      // Calculate totals
      let totalRegular = 0;
      let totalOvertime = 0;
      let totalSick = 0;
      let totalVacation = 0;
      let totalHoliday = 0;
      let totalTraining = 0;

      for (const entry of entries) {
        const minutes = entry.totalHours || 0;
        switch (entry.entryType) {
          case "regular":
          case "overtime":
            totalRegular += entry.regularHours || 0;
            totalOvertime += entry.overtimeHours || 0;
            break;
          case "sick":
            totalSick += minutes;
            break;
          case "vacation":
            totalVacation += minutes;
            break;
          case "holiday":
            totalHoliday += minutes;
            break;
          case "training":
            totalTraining += minutes;
            break;
        }
      }

      const grandTotal =
        totalRegular +
        totalOvertime +
        totalSick +
        totalVacation +
        totalHoliday +
        totalTraining;

      return {
        entries: entries.map(e => ({
          ...e,
          formattedTotal: formatMinutesAsTime(e.totalHours || 0),
        })),
        summary: {
          regularHours: formatMinutesAsTime(totalRegular),
          overtimeHours: formatMinutesAsTime(totalOvertime),
          sickHours: formatMinutesAsTime(totalSick),
          vacationHours: formatMinutesAsTime(totalVacation),
          holidayHours: formatMinutesAsTime(totalHoliday),
          trainingHours: formatMinutesAsTime(totalTraining),
          grandTotal: formatMinutesAsTime(grandTotal),
          regularMinutes: totalRegular,
          overtimeMinutes: totalOvertime,
          grandTotalMinutes: grandTotal,
        },
      };
    }),

  // ==========================================================================
  // REPORTS
  // ==========================================================================

  /**
   * Get hours worked report
   */
  getHoursReport: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        userId: z.number().int().optional(),
        groupBy: z.enum(["day", "week", "employee"]).default("day"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      if (input.groupBy === "employee") {
        // Group by employee
        const results = await db
          .select({
            userId: timeEntries.userId,
            userName: users.name,
            totalMinutes: sql<number>`SUM(${timeEntries.totalHours})`,
            regularMinutes: sql<number>`SUM(${timeEntries.regularHours})`,
            overtimeMinutes: sql<number>`SUM(${timeEntries.overtimeHours})`,
            entryCount: sql<number>`COUNT(*)`,
          })
          .from(timeEntries)
          .leftJoin(users, eq(timeEntries.userId, users.id))
          .where(
            and(
              gte(timeEntries.entryDate, input.startDate),
              lte(timeEntries.entryDate, input.endDate),
              input.userId ? eq(timeEntries.userId, input.userId) : undefined
            )
          )
          .groupBy(timeEntries.userId, users.name)
          .orderBy(users.name);

        return results.map(r => ({
          userId: r.userId,
          userName: r.userName,
          totalHours: formatMinutesAsTime(r.totalMinutes || 0),
          regularHours: formatMinutesAsTime(r.regularMinutes || 0),
          overtimeHours: formatMinutesAsTime(r.overtimeMinutes || 0),
          entryCount: r.entryCount,
        }));
      } else {
        // Group by day or week
        const groupExpr =
          input.groupBy === "week"
            ? sql`YEARWEEK(${timeEntries.entryDate})`
            : timeEntries.entryDate;

        const results = await db
          .select({
            period: groupExpr,
            totalMinutes: sql<number>`SUM(${timeEntries.totalHours})`,
            regularMinutes: sql<number>`SUM(${timeEntries.regularHours})`,
            overtimeMinutes: sql<number>`SUM(${timeEntries.overtimeHours})`,
            entryCount: sql<number>`COUNT(*)`,
          })
          .from(timeEntries)
          .where(
            and(
              gte(timeEntries.entryDate, input.startDate),
              lte(timeEntries.entryDate, input.endDate),
              input.userId ? eq(timeEntries.userId, input.userId) : undefined
            )
          )
          .groupBy(groupExpr)
          .orderBy(groupExpr);

        return results.map(r => ({
          period: r.period,
          totalHours: formatMinutesAsTime(r.totalMinutes || 0),
          regularHours: formatMinutesAsTime(r.regularMinutes || 0),
          overtimeHours: formatMinutesAsTime(r.overtimeMinutes || 0),
          entryCount: r.entryCount,
        }));
      }
    }),

  /**
   * Get overtime report
   */
  getOvertimeReport: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get employees with overtime
      const results = await db
        .select({
          userId: timeEntries.userId,
          userName: users.name,
          overtimeMinutes: sql<number>`SUM(${timeEntries.overtimeHours})`,
          regularMinutes: sql<number>`SUM(${timeEntries.regularHours})`,
          totalMinutes: sql<number>`SUM(${timeEntries.totalHours})`,
          daysWithOvertime: sql<number>`COUNT(DISTINCT CASE WHEN ${timeEntries.overtimeHours} > 0 THEN ${timeEntries.entryDate} END)`,
        })
        .from(timeEntries)
        .leftJoin(users, eq(timeEntries.userId, users.id))
        .where(
          and(
            gte(timeEntries.entryDate, input.startDate),
            lte(timeEntries.entryDate, input.endDate)
          )
        )
        .groupBy(timeEntries.userId, users.name)
        .having(sql`SUM(${timeEntries.overtimeHours}) > 0`)
        .orderBy(desc(sql`SUM(${timeEntries.overtimeHours})`));

      // Get overtime rules for context
      const [otRule] = await db
        .select()
        .from(overtimeRules)
        .where(
          and(
            eq(overtimeRules.isDefault, true),
            eq(overtimeRules.isActive, true)
          )
        )
        .limit(1);

      return {
        employees: results.map(r => ({
          userId: r.userId,
          userName: r.userName,
          overtimeHours: formatMinutesAsTime(r.overtimeMinutes || 0),
          regularHours: formatMinutesAsTime(r.regularMinutes || 0),
          totalHours: formatMinutesAsTime(r.totalMinutes || 0),
          daysWithOvertime: r.daysWithOvertime,
          overtimePercentage:
            r.totalMinutes && r.totalMinutes > 0
              ? Math.round(((r.overtimeMinutes || 0) / r.totalMinutes) * 100)
              : 0,
        })),
        overtimeRule: otRule
          ? {
              dailyThreshold: formatMinutesAsTime(
                otRule.dailyThresholdMinutes || 480
              ),
              weeklyThreshold: formatMinutesAsTime(
                otRule.weeklyThresholdMinutes || 2400
              ),
              multiplier: (otRule.overtimeMultiplier || 150) / 100,
            }
          : null,
      };
    }),

  // ==========================================================================
  // OVERTIME RULES MANAGEMENT
  // ==========================================================================

  /**
   * List overtime rules
   */
  listOvertimeRules: protectedProcedure
    .use(requirePermission("scheduling:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const rules = await db
        .select()
        .from(overtimeRules)
        .orderBy(overtimeRules.name);

      return rules.map(r => ({
        ...r,
        dailyThresholdFormatted: formatMinutesAsTime(
          r.dailyThresholdMinutes || 480
        ),
        weeklyThresholdFormatted: formatMinutesAsTime(
          r.weeklyThresholdMinutes || 2400
        ),
      }));
    }),

  /**
   * Create overtime rule
   */
  createOvertimeRule: protectedProcedure
    .use(requirePermission("admin"))
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        dailyThresholdMinutes: z.number().int().min(0).default(480),
        weeklyThresholdMinutes: z.number().int().min(0).default(2400),
        overtimeMultiplier: z.number().int().min(100).default(150),
        doubleOvertimeMultiplier: z.number().int().min(100).default(200),
        dailyDoubleThresholdMinutes: z.number().int().optional(),
        weeklyDoubleThresholdMinutes: z.number().int().optional(),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // If setting as default, unset other defaults
      if (input.isDefault) {
        await db
          .update(overtimeRules)
          .set({ isDefault: false })
          .where(eq(overtimeRules.isDefault, true));
      }

      const [result] = await db.insert(overtimeRules).values({
        name: input.name,
        description: input.description || null,
        dailyThresholdMinutes: input.dailyThresholdMinutes,
        weeklyThresholdMinutes: input.weeklyThresholdMinutes,
        overtimeMultiplier: input.overtimeMultiplier,
        doubleOvertimeMultiplier: input.doubleOvertimeMultiplier,
        dailyDoubleThresholdMinutes: input.dailyDoubleThresholdMinutes || null,
        weeklyDoubleThresholdMinutes:
          input.weeklyDoubleThresholdMinutes || null,
        isDefault: input.isDefault,
      });

      return { id: result.insertId, success: true };
    }),

  /**
   * Update overtime rule
   */
  updateOvertimeRule: protectedProcedure
    .use(requirePermission("admin"))
    .input(
      z.object({
        id: z.number().int(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        dailyThresholdMinutes: z.number().int().min(0).optional(),
        weeklyThresholdMinutes: z.number().int().min(0).optional(),
        overtimeMultiplier: z.number().int().min(100).optional(),
        doubleOvertimeMultiplier: z.number().int().min(100).optional(),
        dailyDoubleThresholdMinutes: z.number().int().optional().nullable(),
        weeklyDoubleThresholdMinutes: z.number().int().optional().nullable(),
        isActive: z.boolean().optional(),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...updates } = input;

      // If setting as default, unset other defaults
      if (updates.isDefault) {
        await db
          .update(overtimeRules)
          .set({ isDefault: false })
          .where(eq(overtimeRules.isDefault, true));
      }

      await db
        .update(overtimeRules)
        .set(updates)
        .where(eq(overtimeRules.id, id));

      return { success: true };
    }),
});
