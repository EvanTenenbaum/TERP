import { z } from "zod";
import { publicProcedure, router, vipPortalProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  appointmentRequests,
  appointmentTypes,
  billLineItems,
  bills,
  calendarAvailability,
  calendarBlockedDates,
  calendarEvents,
  calendars,
  clientCatalogViews,
  clientDraftInterests,
  clientInterestListItems,
  clientInterestLists,
  clientNeeds,
  clientTransactions,
  clients,
  invoiceLineItems,
  invoices,
  batches,
  products,
  vendorSupply,
  vipPortalAuth,
  vipPortalConfigurations,
} from "../../drizzle/schema";
import * as liveCatalogService from "../services/liveCatalogService";
import * as pricingEngine from "../pricingEngine";
import * as priceAlertsService from "../services/priceAlertsService";
import { eq, and, desc, gte, lte, sql, like, or, inArray, isNull } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../_core/permissionMiddleware";
import type { MetricType } from "../services/leaderboard";
import { jsPDF } from "jspdf";
import { getNotificationRepository, resolveRecipient } from "../services/notificationRepository";

/**
 * Map legacy leaderboard type to new metric type
 */
function mapLegacyTypeToMetric(
  legacyType: string
): MetricType | "master_score" {
  switch (legacyType) {
    case "ytd_spend":
      return "ytd_revenue";
    case "payment_speed":
      return "average_days_to_pay";
    case "order_frequency":
      return "order_frequency";
    case "credit_utilization":
      return "credit_utilization";
    case "ontime_payment_rate":
      return "on_time_payment_rate";
    default:
      return "master_score";
  }
}

type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;
type SlotMap = Record<string, string[]>;

function toMinutes(time: string | null): number | null {
  if (!time) return null;
  const [hours, minutes] = time.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
}

function formatDateKey(date: Date | string): string {
  const value = date instanceof Date ? date : new Date(date);
  return value.toISOString().split("T")[0] ?? "";
}

function formatCurrencyValue(value: string | number | null | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
  return numericValue.toFixed(2);
}

function formatQuantityValue(value: string | number | null | undefined): string {
  const numericValue = typeof value === "number" ? value : Number(value ?? 0);
  return numericValue.toFixed(2);
}

async function getActiveAppointmentType(
  db: Database,
  calendarId: number,
  appointmentTypeId: number
) {
  const [appointmentType] = await db
    .select()
    .from(appointmentTypes)
    .where(
      and(
        eq(appointmentTypes.id, appointmentTypeId),
        eq(appointmentTypes.calendarId, calendarId),
        eq(appointmentTypes.isActive, true)
      )
    )
    .limit(1);

  if (!appointmentType) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Appointment type not found or inactive",
    });
  }

  return appointmentType;
}

async function buildAvailableSlots(
  db: Database,
  calendarId: number,
  appointmentTypeId: number,
  startDate: string,
  endDate: string,
  slotIntervalMinutes = 30
): Promise<SlotMap> {
  const appointmentType = await getActiveAppointmentType(
    db,
    calendarId,
    appointmentTypeId
  );

  const availabilityRules = await db
    .select()
    .from(calendarAvailability)
    .where(eq(calendarAvailability.calendarId, calendarId));

  if (availabilityRules.length === 0) {
    return {};
  }

  const blockedDates = await db
    .select()
    .from(calendarBlockedDates)
    .where(
      and(
        eq(calendarBlockedDates.calendarId, calendarId),
        gte(calendarBlockedDates.date, new Date(startDate)),
        lte(calendarBlockedDates.date, new Date(endDate))
      )
    );

  const blockedDateSet = new Set(
    blockedDates.map((entry) => formatDateKey(entry.date))
  );

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
        eq(calendarEvents.calendarId, calendarId),
        gte(calendarEvents.startDate, new Date(startDate)),
        lte(calendarEvents.endDate, new Date(endDate)),
        isNull(calendarEvents.deletedAt)
      )
    );

  const pendingRequests = await db
    .select({
      requestedSlot: appointmentRequests.requestedSlot,
      status: appointmentRequests.status,
    })
    .from(appointmentRequests)
    .where(
      and(
        eq(appointmentRequests.calendarId, calendarId),
        eq(appointmentRequests.appointmentTypeId, appointmentTypeId),
        gte(appointmentRequests.requestedSlot, new Date(startDate)),
        lte(appointmentRequests.requestedSlot, new Date(endDate)),
        or(
          eq(appointmentRequests.status, "pending"),
          eq(appointmentRequests.status, "approved")
        )
      )
    );

  const pendingByDate = pendingRequests.reduce<Record<string, number[]>>(
    (acc, request) => {
      const pendingDate =
        request.requestedSlot instanceof Date
          ? request.requestedSlot
          : new Date(request.requestedSlot);
      const dateKey = formatDateKey(pendingDate);
      const minutes = pendingDate.getHours() * 60 + pendingDate.getMinutes();
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(minutes);
      return acc;
    },
    {}
  );

  const availabilityByDay = availabilityRules.reduce<
    Map<number, Array<{ start: string; end: string }>>
  >((acc, rule) => {
    if (!acc.has(rule.dayOfWeek)) {
      acc.set(rule.dayOfWeek, []);
    }
    acc.get(rule.dayOfWeek)!.push({
      start: rule.startTime,
      end: rule.endTime,
    });
    return acc;
  }, new Map());

  const now = new Date();
  const minBookingTime = new Date(
    now.getTime() + appointmentType.minNoticeHours * 60 * 60 * 1000
  );

  const maxBookingDate = new Date(now);
  maxBookingDate.setDate(maxBookingDate.getDate() + appointmentType.maxAdvanceDays);

  const totalDuration =
    appointmentType.bufferBefore +
    appointmentType.duration +
    appointmentType.bufferAfter;

  const slots: SlotMap = {};
  const start = new Date(startDate);
  const end = new Date(endDate);

  const maxRangeEnd = new Date(start);
  maxRangeEnd.setMonth(maxRangeEnd.getMonth() + 3);
  if (end > maxRangeEnd) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Date range cannot exceed 3 months",
    });
  }

  for (
    const dateCursor = new Date(start);
    dateCursor <= end;
    dateCursor.setDate(dateCursor.getDate() + 1)
  ) {
    const dateKey = formatDateKey(dateCursor);

    if (blockedDateSet.has(dateKey)) {
      continue;
    }

    if (dateCursor > maxBookingDate) {
      continue;
    }

    const dayAvailability = availabilityByDay.get(dateCursor.getDay());
    if (!dayAvailability || dayAvailability.length === 0) {
      continue;
    }

    const daySlots: string[] = [];

    for (const window of dayAvailability) {
      const windowStart = toMinutes(window.start);
      const windowEnd = toMinutes(window.end);
      if (windowStart === null || windowEnd === null) {
        continue;
      }

      for (
        let slotStart = windowStart;
        slotStart + totalDuration <= windowEnd;
        slotStart += slotIntervalMinutes
      ) {
        const slotHour = Math.floor(slotStart / 60);
        const slotMinute = slotStart % 60;
        const slotTime = `${slotHour.toString().padStart(2, "0")}:${slotMinute
          .toString()
          .padStart(2, "0")}`;

        const slotDateTime = new Date(dateCursor);
        slotDateTime.setHours(slotHour, slotMinute, 0, 0);

        if (slotDateTime < minBookingTime) {
          continue;
        }

        const slotEndMinutes = slotStart + totalDuration;
        let hasConflict = false;

        for (const event of existingEvents) {
          const eventDateKey = formatDateKey(event.startDate);
          if (eventDateKey !== dateKey) {
            continue;
          }

          const eventStart = toMinutes(event.startTime ?? null);
          const eventEnd = toMinutes(event.endTime ?? null);
          if (eventStart === null || eventEnd === null) {
            hasConflict = true;
            break;
          }

          if (slotStart < eventEnd && slotEndMinutes > eventStart) {
            hasConflict = true;
            break;
          }
        }

        if (!hasConflict) {
          const pendingTimes = pendingByDate[dateKey] ?? [];
          if (pendingTimes.some((pendingStart) => pendingStart === slotStart)) {
            hasConflict = true;
          }
        }

        if (!hasConflict) {
          daySlots.push(slotTime);
        }
      }
    }

    if (daySlots.length > 0) {
      slots[dateKey] = daySlots;
    }
  }

  return slots;
}

/**
 * VIP Portal Router
 * Client-facing endpoints for the VIP Client Portal
 */
export const vipPortalRouter = router({
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  
  auth: router({
    // Login with email and password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: eq(vipPortalAuth.email, input.email),
          with: {
            client: true,
          },
        });

        if (!authRecord || !authRecord.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const isValid = await bcrypt.compare(input.password, authRecord.passwordHash);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Generate session token
        const sessionToken = crypto.randomUUID();
        const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Update auth record
        await db.update(vipPortalAuth)
          .set({
            sessionToken,
            sessionExpiresAt,
            lastLoginAt: new Date(),
            loginCount: sql`${vipPortalAuth.loginCount} + 1`,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        // Update client last login
        await db.update(clients)
          .set({ vipPortalLastLogin: new Date() })
          .where(eq(clients.id, authRecord.clientId));

        return {
          sessionToken,
          clientId: authRecord.clientId,
          clientName: authRecord.client?.name,
        };
      }),

    // Verify session token
    verifySession: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Check if this is an impersonation token
        if (input.sessionToken.startsWith("imp_")) {
          // Parse impersonation token: imp_{clientId}_{timestamp}_{uuid}
          const parts = input.sessionToken.split("_");
          if (parts.length >= 3) {
            const clientId = parseInt(parts[1], 10);
            const timestamp = parseInt(parts[2], 10);
            const expiresAt = timestamp + (2 * 60 * 60 * 1000); // 2 hours from creation
            
            if (Date.now() > expiresAt) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Impersonation session expired",
              });
            }
            
            // Get client info
            const client = await db.query.clients.findFirst({
              where: eq(clients.id, clientId),
            });
            
            if (!client || !client.vipPortalEnabled) {
              throw new TRPCError({
                code: "UNAUTHORIZED",
                message: "Invalid impersonation session",
              });
            }
            
            // Get auth record for email
            const authRecord = await db.query.vipPortalAuth.findFirst({
              where: eq(vipPortalAuth.clientId, clientId),
            });
            
            return {
              clientId,
              clientName: client.name,
              email: authRecord?.email || "impersonation@admin",
              isImpersonation: true,
            };
          }
        }
        
        // Regular session token verification
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: and(
            eq(vipPortalAuth.sessionToken, input.sessionToken),
            gte(vipPortalAuth.sessionExpiresAt, new Date())
          ),
          with: {
            client: true,
          },
        });

        if (!authRecord) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired session",
          });
        }

        return {
          clientId: authRecord.clientId,
          clientName: authRecord.client?.name,
          email: authRecord.email,
          isImpersonation: false,
        };
      }),

    // Logout
    logout: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(vipPortalAuth)
          .set({
            sessionToken: null,
            sessionExpiresAt: null,
          })
          .where(eq(vipPortalAuth.sessionToken, input.sessionToken));

        return { success: true };
      }),

    // Request password reset
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: eq(vipPortalAuth.email, input.email),
        });

        if (!authRecord) {
          // Don't reveal if email exists
          return { success: true };
        }

        const resetToken = crypto.randomUUID();
        const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.update(vipPortalAuth)
          .set({
            resetToken,
            resetTokenExpiresAt,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        // Send password reset email via notification service
        try {
          const { sendNotification } = await import("../services/notificationService");
          const appUrl = process.env.APP_URL || "https://terp-app-b9s35.ondigitalocean.app";
          await sendNotification({
            userId: authRecord.clientId,
            type: "warning",
            title: "Password Reset Request",
            message: `Click here to reset your VIP Portal password: ${appUrl}/vip-portal/reset-password?token=${resetToken}`,
            channels: ["email"],
            metadata: {
              type: "password_reset",
              token: resetToken,
              expiresAt: resetTokenExpiresAt.toISOString(),
            },
            category: "system",
          });
        } catch (emailError) {
          // Log but don't fail - user can still use the token
          console.error("Failed to send password reset email:", emailError);
        }

        return { success: true };
      }),

    // Reset password with token
    resetPassword: publicProcedure
      .input(z.object({
        resetToken: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: and(
            eq(vipPortalAuth.resetToken, input.resetToken),
            gte(vipPortalAuth.resetTokenExpiresAt, new Date())
          ),
        });

        if (!authRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset token",
          });
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 10);

        await db.update(vipPortalAuth)
          .set({
            passwordHash,
            resetToken: null,
            resetTokenExpiresAt: null,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        return { success: true };
      }),
  }),

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  config: router({
    // Get portal configuration
    get: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        if (!config) {
          // Return default configuration with all fields matching schema
          return {
            id: 0,
            clientId: input.clientId,
            moduleDashboardEnabled: true as boolean,
            moduleLiveCatalogEnabled: false as boolean,
            moduleArEnabled: true as boolean,
            moduleApEnabled: true as boolean,
            moduleTransactionHistoryEnabled: true as boolean,
            moduleVipTierEnabled: false as boolean,
            moduleCreditCenterEnabled: false as boolean,
            moduleMarketplaceNeedsEnabled: true as boolean,
            moduleMarketplaceSupplyEnabled: true as boolean,
            featuresConfig: null as null,
            advancedOptions: null as null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }

        return config;
      }),
  }),

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  
  dashboard: router({
    // Get dashboard KPIs
    getKPIs: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const client = await db.query.clients.findFirst({
          where: eq(clients.id, input.clientId),
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // Calculate YTD spend from transactions
        const ytdStart = new Date(new Date().getFullYear(), 0, 1);
        const ytdTransactions = await db
          .select()
          .from(clientTransactions)
          .where(and(
            eq(clientTransactions.clientId, input.clientId),
            sql`${clientTransactions.transactionDate} >= ${ytdStart.toISOString().split('T')[0]}`,
            eq(clientTransactions.transactionType, "INVOICE")
          ));

        const ytdSpend = ytdTransactions.reduce(
          (sum, tx) => sum + parseFloat(tx.amount.toString()), 
          0
        );

        // Count active needs and supply
        const activeNeeds = await db
          .select({ count: sql<number>`count(*)` })
          .from(clientNeeds)
          .where(and(
            eq(clientNeeds.clientId, input.clientId),
            eq(clientNeeds.status, "ACTIVE")
          ));

        // Calculate credit utilization based on total owed
        // Note: creditLimit is not in the clients schema, so we use a default or skip this metric
        const currentBalance = parseFloat(client.totalOwed || "0");
        // Credit utilization would require a creditLimit field - for now, return 0
        const creditUtilization = 0;

        // Count active supply listings for this client (as seller)
        const activeSupply = await db
          .select({ count: sql<number>`count(*)` })
          .from(vendorSupply)
          .where(and(
            eq(vendorSupply.vendorId, input.clientId),
            eq(vendorSupply.status, "AVAILABLE")
          ));

        return {
          currentBalance,
          ytdSpend,
          creditUtilization: Math.round(creditUtilization * 100) / 100,
          activeNeedsCount: Number(activeNeeds[0]?.count || 0),
          activeSupplyCount: Number(activeSupply[0]?.count || 0),
        };
      }),
  }),

  // ============================================================================
  // ACCOUNTS RECEIVABLE
  // ============================================================================
  
  ar: router({
    getInvoices: publicProcedure
      .input(z.object({
        clientId: z.number(),
        search: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { clientId, search, status } = input;
        
        // Build query conditions
        let conditions = [eq(invoices.customerId, clientId)];
        
        if (search) {
          conditions.push(like(invoices.invoiceNumber, `%${search}%`));
        }
        
        if (status) {
          conditions.push(eq(invoices.status, status as any));
        }
        
        // Fetch invoices
        const clientInvoices = await db
          .select()
          .from(invoices)
          .where(and(...conditions))
          .orderBy(desc(invoices.invoiceDate));
        
        // Calculate summary
        const totalOutstanding = clientInvoices
          .filter(inv => inv.status !== "PAID" && inv.status !== "VOID")
          .reduce((sum, inv) => sum + parseFloat(inv.amountDue.toString()), 0);
        
        const overdueAmount = clientInvoices
          .filter(inv => inv.status === "OVERDUE")
          .reduce((sum, inv) => sum + parseFloat(inv.amountDue.toString()), 0);
        
        const openInvoiceCount = clientInvoices
          .filter(inv => inv.status !== "PAID" && inv.status !== "VOID")
          .length;
        
        return {
          summary: {
            totalOutstanding,
            overdueAmount,
            openInvoiceCount,
          },
          invoices: clientInvoices,
        };
      }),
  }),

  // ============================================================================
  // ACCOUNTS PAYABLE
  // ============================================================================
  
  ap: router({
    getBills: publicProcedure
      .input(z.object({
        clientId: z.number(),
        search: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { clientId, search, status } = input;
        
        // Build query conditions
        let conditions = [eq(bills.vendorId, clientId)];
        
        if (search) {
          conditions.push(like(bills.billNumber, `%${search}%`));
        }
        
        if (status) {
          conditions.push(eq(bills.status, status as any));
        }
        
        // Fetch bills
        const clientBills = await db
          .select()
          .from(bills)
          .where(and(...conditions))
          .orderBy(desc(bills.billDate));
        
        // Calculate summary
        const totalOwed = clientBills
          .filter(bill => bill.status !== "PAID" && bill.status !== "VOID")
          .reduce((sum, bill) => sum + parseFloat(bill.amountDue.toString()), 0);
        
        const overdueAmount = clientBills
          .filter(bill => bill.status === "OVERDUE")
          .reduce((sum, bill) => sum + parseFloat(bill.amountDue.toString()), 0);
        
        const openBillCount = clientBills
          .filter(bill => bill.status !== "PAID" && bill.status !== "VOID")
          .length;
        
        return {
          summary: {
            totalOwed,
            overdueAmount,
            openBillCount,
          },
          bills: clientBills,
        };
      }),
  }),

  // ============================================================================
  // TRANSACTION HISTORY
  // ============================================================================
  
  transactions: router({
    getHistory: publicProcedure
      .input(z.object({
        clientId: z.number(),
        search: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { clientId, search, type, status } = input;
        
        // Build query conditions
        let conditions = [eq(clientTransactions.clientId, clientId)];
        
        if (search) {
          conditions.push(like(clientTransactions.transactionNumber, `%${search}%`));
        }
        
        if (type) {
          conditions.push(eq(clientTransactions.transactionType, type as any));
        }
        
        if (status) {
          conditions.push(eq(clientTransactions.paymentStatus, status as any));
        }
        
        // Fetch transactions
        const txList = await db
          .select()
          .from(clientTransactions)
          .where(and(...conditions))
          .orderBy(desc(clientTransactions.transactionDate))
          .limit(100);
        
        // Calculate summary
        const totalCount = txList.length;
        const totalValue = txList.reduce(
          (sum, tx) => sum + parseFloat(tx.amount.toString()), 
          0
        );
        const lastTransactionDate = txList.length > 0 
          ? txList[0].transactionDate 
          : null;
        
        return {
          summary: {
            totalCount,
            totalValue,
            lastTransactionDate,
          },
          transactions: txList,
        };
      }),
  }),

  // ============================================================================
  // MARKETPLACE - NEEDS
  // ============================================================================
  
  marketplace: router({
    // Get client needs
    getNeeds: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const needs = await db
          .select()
          .from(clientNeeds)
          .where(eq(clientNeeds.clientId, input.clientId))
          .orderBy(desc(clientNeeds.createdAt));

        return needs;
      }),

    // Create client need
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    createNeed: vipPortalProcedure
      .input(z.object({
        strain: z.string().optional(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
        expiresInDays: z.number().default(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get clientId from verified VIP portal session (not from input)
        const clientId = ctx.clientId;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

        const [result] = await db.insert(clientNeeds).values({
          clientId,
          strain: input.strain,
          category: input.category,
          quantityMin: input.quantity?.toString(),
          quantityMax: input.quantity?.toString(),
          priceMax: input.priceMax?.toString(),
          notes: input.notes,
          expiresAt: expiresAt,
          status: "ACTIVE",
          priority: "MEDIUM",
          createdByClientId: clientId, // VIP portal client attribution (BUG-037 fix)
        });

        return { needId: Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0 };
      }),

    // Update client need
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    updateNeed: vipPortalProcedure
      .input(z.object({
        id: z.number(),
        strain: z.string().optional(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get clientId from verified VIP portal session (not from input)
        const clientId = ctx.clientId;
        const { id, ...updateData } = input;

        await db.update(clientNeeds)
          .set({
            strain: updateData.strain,
            category: updateData.category,
            quantityMin: updateData.quantity?.toString(),
            quantityMax: updateData.quantity?.toString(),
            priceMax: updateData.priceMax?.toString(),
            notes: updateData.notes,
          })
          .where(and(
            eq(clientNeeds.id, id),
            eq(clientNeeds.clientId, clientId)
          ));

        return { success: true };
      }),

    // Cancel client need
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    cancelNeed: vipPortalProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get clientId from verified VIP portal session (not from input)
        const clientId = ctx.clientId;
        
        await db.update(clientNeeds)
          .set({ status: "CANCELLED" })
          .where(and(
            eq(clientNeeds.id, input.id),
            eq(clientNeeds.clientId, clientId)
          ));

        return { success: true };
      }),

    // Get client supply listings
    getSupply: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // For now, returning empty array as vendorSupply uses vendorId
        // In production, this would require a schema update or junction table
        // to link clients to their supply listings
        return [];
      }),

    // Create supply listing
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    createSupply: vipPortalProcedure
      .input(z.object({
        strain: z.string(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
        expiresInDays: z.number().default(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.clientId;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

        // Create supply listing in vendorSupply table (client acts as vendor/seller)
        const [result] = await db.insert(vendorSupply).values({
          vendorId: clientId,
          strain: input.strain,
          category: input.category,
          quantityAvailable: input.quantity.toString(),
          unitPrice: input.priceMin?.toString() || null,
          notes: input.notes,
          availableUntil: expiresAt,
          status: "AVAILABLE",
          createdAt: new Date(),
          createdByClientId: clientId, // VIP portal client attribution (BUG-037 fix)
        });

        return { supplyId: Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0 };
      }),

    // Update supply listing
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    updateSupply: vipPortalProcedure
      .input(z.object({
        id: z.number(),
        strain: z.string(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.clientId;
        const { id, ...updateData } = input;

        // Verify ownership before update
        const existing = await db.query.vendorSupply.findFirst({
          where: and(
            eq(vendorSupply.id, id),
            eq(vendorSupply.vendorId, clientId)
          ),
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Supply listing not found or not owned by you",
          });
        }

        await db.update(vendorSupply)
          .set({
            strain: updateData.strain,
            category: updateData.category,
            quantityAvailable: updateData.quantity.toString(),
            unitPrice: updateData.priceMin?.toString() || null,
            notes: updateData.notes,
            updatedAt: new Date(),
          })
          .where(eq(vendorSupply.id, id));

        return { success: true };
      }),

    // Cancel supply listing
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    cancelSupply: vipPortalProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.clientId;

        // Verify ownership before cancellation
        const existing = await db.query.vendorSupply.findFirst({
          where: and(
            eq(vendorSupply.id, input.id),
            eq(vendorSupply.vendorId, clientId)
          ),
        });

        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Supply listing not found or not owned by you",
          });
        }

        // Soft delete by setting status to EXPIRED (CANCELLED is not a valid status)
        await db.update(vendorSupply)
          .set({
            status: "EXPIRED",
            updatedAt: new Date(),
          })
          .where(eq(vendorSupply.id, input.id));

        return { success: true };
      }),
  }),

  // ============================================================================
  // LEADERBOARD
  // ============================================================================
  
  leaderboard: router({
    // Get leaderboard data for client (enhanced with unified leaderboard services)
    getLeaderboard: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get client's VIP portal configuration
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        // Read leaderboard settings from featuresConfig JSON
        const leaderboardConfig = config?.featuresConfig?.leaderboard;
        const isLeaderboardEnabled = leaderboardConfig?.enabled ?? false;

        if (!config || !isLeaderboardEnabled) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Leaderboard not enabled for this client",
          });
        }

        const displayMode = (leaderboardConfig?.displayMode || 'blackbox') as 'blackbox' | 'transparent';
        const showSuggestions = leaderboardConfig?.showSuggestions ?? true;
        const minimumClients = leaderboardConfig?.minimumClients ?? 5;
        // Use 'type' field from existing config, map to new metric types
        const legacyType = leaderboardConfig?.type || 'ytd_spend';
        const primaryMetric = mapLegacyTypeToMetric(legacyType);

        // Import unified leaderboard services
        const { 
          getLeaderboard: getUnifiedLeaderboard, 
          sanitizeForVipPortal,
        } = await import('../services/leaderboard');

        // Get all VIP clients count for minimum threshold check
        const vipClients = await db.query.clients.findMany({
          where: eq(clients.vipPortalEnabled, true),
        });

        if (vipClients.length < minimumClients) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Leaderboard requires at least ${minimumClients} VIP clients`,
          });
        }

        // Get leaderboard using unified service
        const leaderboardResult = await getUnifiedLeaderboard({
          clientType: "CUSTOMER", // VIP Portal is for customers
          sortBy: primaryMetric,
          sortOrder: "desc",
          limit: 100, // Get all for ranking
        });

        // Sanitize for VIP Portal (remove PII from other clients)
        const sanitizedResult = sanitizeForVipPortal(
          leaderboardResult,
          input.clientId,
          displayMode,
          primaryMetric
        );

        // Build entries to show (top 3, client's position, surrounding ranks, last place)
        const entriesToShow = new Set<number>();
        entriesToShow.add(1);
        entriesToShow.add(2);
        entriesToShow.add(3);
        entriesToShow.add(sanitizedResult.clientRank);
        if (sanitizedResult.clientRank > 1) entriesToShow.add(sanitizedResult.clientRank - 1);
        if (sanitizedResult.clientRank < sanitizedResult.totalParticipants) entriesToShow.add(sanitizedResult.clientRank + 1);
        entriesToShow.add(sanitizedResult.totalParticipants);

        const entries = sanitizedResult.entries
          .filter(r => entriesToShow.has(r.rank))
          .map(r => ({
            rank: r.rank,
            // Only show client ID for the requesting client (already sanitized)
            clientId: r.isCurrentClient ? input.clientId : undefined,
            metricValue: displayMode === 'transparent' ? r.metricValue : undefined,
            isCurrentClient: r.isCurrentClient,
          }));

        return {
          leaderboardType: legacyType, // Return legacy type for backward compatibility
          displayMode,
          clientRank: sanitizedResult.clientRank,
          totalClients: sanitizedResult.totalParticipants,
          entries,
          suggestions: showSuggestions ? sanitizedResult.suggestions : [],
          lastUpdated: sanitizedResult.lastUpdated,
        };
      }),

    // Get available metrics for VIP Portal configuration
    getAvailableMetrics: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        // Verify client exists and has VIP portal enabled
        const client = await db.query.clients.findFirst({
          where: eq(clients.id, input.clientId),
        });

        if (!client || !client.vipPortalEnabled) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "VIP Portal not enabled for this client",
          });
        }

        // Return available metrics for customers (VIP Portal users)
        const { METRIC_CONFIGS } = await import('../services/leaderboard');
        
        const customerMetrics = Object.entries(METRIC_CONFIGS)
          .filter(([_, config]) => 
            config.applicableTo.includes('CUSTOMER')
          )
          .map(([key, config]) => ({
            type: key,
            name: config.name,
            description: config.description,
            category: config.category,
          }));

        return {
          metrics: customerMetrics,
          defaultPrimaryMetric: 'ytd_revenue',
        };
      }),
  }),

  // ============================================================================
  // APPOINTMENT BOOKING (VIP-C-01)
  // ============================================================================
  appointments: router({
    listCalendars: vipPortalProcedure.query(async () => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const availableCalendars = await db
        .select()
        .from(calendars)
        .where(or(eq(calendars.isArchived, false), isNull(calendars.isArchived)));

      if (availableCalendars.length === 0) {
        return [];
      }

      const calendarIds = availableCalendars.map((calendar) => calendar.id);

      const activeAppointmentTypes = await db
        .select({
          id: appointmentTypes.id,
          calendarId: appointmentTypes.calendarId,
          name: appointmentTypes.name,
          description: appointmentTypes.description,
          duration: appointmentTypes.duration,
          color: appointmentTypes.color,
        })
        .from(appointmentTypes)
        .where(
          and(
            inArray(appointmentTypes.calendarId, calendarIds),
            eq(appointmentTypes.isActive, true)
          )
        );

      const availability = await db
        .select({
          calendarId: calendarAvailability.calendarId,
        })
        .from(calendarAvailability)
        .where(inArray(calendarAvailability.calendarId, calendarIds));

      const calendarsWithTypes = availableCalendars
        .filter((calendar) =>
          availability.some((entry) => entry.calendarId === calendar.id)
        )
        .map((calendar) => ({
          id: calendar.id,
          name: calendar.name,
          description: calendar.description ?? "",
          appointmentTypes: activeAppointmentTypes
            .filter((type) => type.calendarId === calendar.id)
            .map((type) => ({
              id: type.id,
              name: type.name,
              description: type.description ?? "",
              durationMinutes: type.duration,
              color: type.color,
            })),
        }))
        .filter((calendar) => calendar.appointmentTypes.length > 0);

      return calendarsWithTypes;
    }),

    getSlots: vipPortalProcedure
      .input(
        z.object({
          calendarId: z.number(),
          appointmentTypeId: z.number(),
          startDate: z.string(),
          endDate: z.string(),
          slotIntervalMinutes: z.number().min(5).max(60).default(30).optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }

        const interval = input.slotIntervalMinutes ?? 30;
        return buildAvailableSlots(
          db,
          input.calendarId,
          input.appointmentTypeId,
          input.startDate,
          input.endDate,
          interval
        );
      }),

    request: vipPortalProcedure
      .input(
        z.object({
          calendarId: z.number(),
          appointmentTypeId: z.number(),
          requestedSlot: z.string(),
          notes: z.string().max(1000).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }

        const { calendarId, appointmentTypeId, requestedSlot, notes } = input;
        const clientId = ctx.clientId;

        if (!clientId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "VIP session required" });
        }

        const requestedDate = new Date(requestedSlot);
        if (Number.isNaN(requestedDate.getTime())) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid requested time" });
        }

        const dateKey = formatDateKey(requestedDate);
        const slotLabel = `${requestedDate
          .getHours()
          .toString()
          .padStart(2, "0")}:${requestedDate.getMinutes().toString().padStart(2, "0")}`;

        const available = await buildAvailableSlots(
          db,
          calendarId,
          appointmentTypeId,
          dateKey,
          dateKey
        );

        if (!available[dateKey] || !available[dateKey]?.includes(slotLabel)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Selected time is no longer available",
          });
        }

        const [created] = await db
          .insert(appointmentRequests)
          .values({
            calendarId,
            appointmentTypeId,
            requestedById: clientId,
            requestedSlot: requestedDate,
            notes: notes ?? null,
            status: "pending",
          })
          .$returningId();

        return {
          success: true,
          requestId: created.id,
          message: "Appointment request submitted successfully",
        };
      }),

    listMyRequests: vipPortalProcedure.query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      }

      const clientId = ctx.clientId;
      if (!clientId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "VIP session required" });
      }

      const requests = await db
        .select()
        .from(appointmentRequests)
        .where(eq(appointmentRequests.requestedById, clientId))
        .orderBy(desc(appointmentRequests.createdAt));

      const typeIds = Array.from(
        new Set(requests.map((request) => request.appointmentTypeId))
      );

      const typeMap =
        typeIds.length > 0
          ? new Map(
              (
                await db
                  .select({
                    id: appointmentTypes.id,
                    name: appointmentTypes.name,
                    color: appointmentTypes.color,
                  })
                  .from(appointmentTypes)
                  .where(inArray(appointmentTypes.id, typeIds))
              ).map((type) => [type.id, type])
            )
          : new Map<number, { id: number; name: string; color: string | null }>();

      return requests.map((request) => ({
        id: request.id,
        calendarId: request.calendarId,
        appointmentTypeId: request.appointmentTypeId,
        appointmentTypeName: typeMap.get(request.appointmentTypeId)?.name ?? "Appointment",
        color: typeMap.get(request.appointmentTypeId)?.color ?? "#0EA5E9",
        requestedSlot: request.requestedSlot,
        status: request.status,
        notes: request.notes ?? "",
      }));
    }),
  }),

  // ============================================================================
  // IN-APP NOTIFICATIONS (VIP-C-02)
  // ============================================================================
  notifications: router({
    list: vipPortalProcedure
      .input(
        z
          .object({
            limit: z.number().min(1).max(100).default(20),
            offset: z.number().min(0).default(0),
          })
          .optional()
      )
      .query(async ({ input, ctx }) => {
        const repo = await getNotificationRepository();
        const recipient = resolveRecipient({
          recipientType: "client",
          clientId: ctx.clientId,
        });

        const limit = input?.limit ?? 20;
        const offset = input?.offset ?? 0;

        const items = await repo.listNotifications(recipient, limit, offset);
        const unreadCount = await repo.countUnread(recipient);

        return {
          items,
          unreadCount,
        };
      }),

    markRead: vipPortalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const repo = await getNotificationRepository();
        const recipient = resolveRecipient({
          recipientType: "client",
          clientId: ctx.clientId,
        });

        await repo.markRead(input.id, recipient);
        const unreadCount = await repo.countUnread(recipient);

        return { success: true, unreadCount };
      }),

    markAllRead: vipPortalProcedure.mutation(async ({ ctx }) => {
      const repo = await getNotificationRepository();
      const recipient = resolveRecipient({
        recipientType: "client",
        clientId: ctx.clientId,
      });

      await repo.markAllRead(recipient);

      return { success: true, unreadCount: 0 };
    }),
  }),

  // ============================================================================
  // DOCUMENT GENERATION (VIP-B-01)
  // ============================================================================
  documents: router({
    downloadInvoicePdf: vipPortalProcedure
      .input(z.object({ invoiceId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }

        const invoice = await db.query.invoices.findFirst({
          where: eq(invoices.id, input.invoiceId),
        });

        if (!invoice || invoice.customerId !== ctx.clientId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this invoice",
          });
        }

        const lineItems = await db.query.invoiceLineItems.findMany({
          where: eq(invoiceLineItems.invoiceId, invoice.id),
        });

        const client = await db.query.clients.findFirst({
          where: eq(clients.id, invoice.customerId),
        });

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("TERP VIP Portal", 14, 18);
        doc.setFontSize(12);
        doc.text(`Invoice ${invoice.invoiceNumber}`, 14, 28);
        doc.text(`Client: ${client?.name ?? invoice.customerId}`, 14, 36);
        doc.text(
          `Date: ${formatDateKey(invoice.invoiceDate ?? new Date()).replace(/-/g, "/")}`,
          14,
          44
        );

        let y = 54;
        doc.text("Line Items", 14, y);
        y += 6;

        if (lineItems.length === 0) {
          doc.text("No line items", 14, y);
          y += 8;
        } else {
          lineItems.forEach((item) => {
            doc.text(
              `${item.description} — ${formatQuantityValue(item.quantity)} x $${formatCurrencyValue(
                item.unitPrice
              )} = $${formatCurrencyValue(item.lineTotal)}`,
              14,
              y
            );
            y += 6;
          });
        }

        y += 4;
        doc.text(`Subtotal: $${formatCurrencyValue(invoice.subtotal)}`, 14, y);
        y += 6;
        doc.text(`Tax: $${formatCurrencyValue(invoice.taxAmount)}`, 14, y);
        y += 6;
        doc.text(`Total: $${formatCurrencyValue(invoice.totalAmount)}`, 14, y);
        y += 6;
        doc.text(`Amount Due: $${formatCurrencyValue(invoice.amountDue)}`, 14, y);

        const pdfBase64 = doc.output("datauristring").split(",")[1] ?? "";

        return {
          pdf: pdfBase64,
          fileName: `invoice-${invoice.invoiceNumber}.pdf`,
        };
      }),

    downloadBillPdf: vipPortalProcedure
      .input(z.object({ billId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        }

        const bill = await db.query.bills.findFirst({
          where: eq(bills.id, input.billId),
        });

        if (!bill || bill.vendorId !== ctx.clientId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You do not have access to this bill",
          });
        }

        const lineItems = await db.query.billLineItems.findMany({
          where: eq(billLineItems.billId, bill.id),
        });

        const doc = new jsPDF();
        doc.setFontSize(16);
        doc.text("TERP VIP Portal", 14, 18);
        doc.setFontSize(12);
        doc.text(`Bill ${bill.billNumber}`, 14, 28);
        doc.text(
          `Date: ${formatDateKey(bill.billDate ?? new Date()).replace(/-/g, "/")}`,
          14,
          36
        );

        let y = 46;
        doc.text("Line Items", 14, y);
        y += 6;

        if (lineItems.length === 0) {
          doc.text("No line items", 14, y);
          y += 8;
        } else {
          lineItems.forEach((item) => {
            doc.text(
              `${item.description} — ${formatQuantityValue(item.quantity)} x $${formatCurrencyValue(
                item.unitPrice
              )} = $${formatCurrencyValue(item.lineTotal)}`,
              14,
              y
            );
            y += 6;
          });
        }

        y += 4;
        doc.text(`Subtotal: $${formatCurrencyValue(bill.subtotal)}`, 14, y);
        y += 6;
        doc.text(`Tax: $${formatCurrencyValue(bill.taxAmount)}`, 14, y);
        y += 6;
        doc.text(`Total: $${formatCurrencyValue(bill.totalAmount)}`, 14, y);
        y += 6;
        doc.text(`Amount Due: $${formatCurrencyValue(bill.amountDue)}`, 14, y);

        const pdfBase64 = doc.output("datauristring").split(",")[1] ?? "";

        return {
          pdf: pdfBase64,
          fileName: `bill-${bill.billNumber}.pdf`,
        };
      }),
  }),

  // ============================================================================
  // LIVE CATALOG (CLIENT-FACING)
  // ============================================================================
  
  liveCatalog: router({
    // Get catalog with filters
    get: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        brand: z.array(z.string()).optional(),
        grade: z.array(z.string()).optional(),
        stockLevel: z.enum(['all', 'in_stock', 'low_stock']).optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'price', 'category', 'date']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.vipPortalClientId;
        if (!clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }
        
        // Get client configuration
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, clientId),
        });
        
        // If Live Catalog is disabled, return empty
        if (!config || !config.moduleLiveCatalogEnabled) {
          return {
            items: [],
            total: 0,
            appliedFilters: input,
          };
        }
        
        // Get catalog using service
        const result = await liveCatalogService.getCatalog(clientId, input);
        
        // Map service response to UI-expected format
        const mappedItems = result.items.map(item => ({
          id: item.batchId,
          name: item.itemName,
          category: item.category,
          subcategory: item.subcategory,
          brand: item.brand,
          grade: item.grade,
          retailPrice: item.retailPrice,
          basePrice: item.basePrice,
          markup: item.markup,
          quantity: item.quantity,
          stockLevel: item.stockLevel,
          inDraft: item.inDraft,
          imageUrl: item.imageUrl,
        }));
        
        return {
          items: mappedItems,
          total: result.total,
          appliedFilters: input,
        };
      }),
    
    // Get filter options
    getFilterOptions: publicProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.vipPortalClientId;
        if (!clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }
        
        // Get filter options using service
        return await liveCatalogService.getFilterOptions(clientId);
      }),
    
    // Get draft interests
    getDraftInterests: publicProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.vipPortalClientId;
        if (!clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }
        
        const drafts = await db.query.clientDraftInterests.findMany({
          where: eq(clientDraftInterests.clientId, clientId),
        });
        
        if (drafts.length === 0) {
          return {
            items: [],
            totalItems: 0,
            totalValue: '0.00',
            hasChanges: false,
          };
        }
        
        // Get batch details
        const batchIds = drafts.map(d => d.batchId);
        const batchesData = await db
          .select({
            batch: batches,
            product: products,
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .where(inArray(batches.id, batchIds));
        
        // Get client pricing
        const clientRules = await pricingEngine.getClientPricingRules(clientId);
        
        // Calculate current prices
        const inventoryItems = batchesData.map(({ batch, product }) => ({
          id: batch.id,
          name: batch.sku || `Batch #${batch.id}`,
          category: product?.category,
          subcategory: product?.subcategory ?? undefined,
          strain: undefined,
          basePrice: parseFloat(batch.unitCogs || '0'),
          quantity: parseFloat(batch.onHandQty || '0'),
          grade: batch.grade || undefined,
          vendor: undefined,
        }));
        
        let pricedItems;
        try {
          pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);
        } catch (error) {
          pricedItems = inventoryItems.map(item => ({
            ...item,
            retailPrice: item.basePrice,
            priceMarkup: 0,
            appliedRules: [],
          }));
        }
        
        // Build items with change detection
        const items = drafts.map(draft => {
          const pricedItem = pricedItems.find(p => p.id === draft.batchId);
          const batchData = batchesData.find(b => b.batch.id === draft.batchId);
          
          if (!pricedItem || !batchData) {
            return null;
          }
          
          const currentPrice = pricedItem.retailPrice;
          const currentQuantity = pricedItem.quantity ?? 0;
          const stillAvailable = currentQuantity > 0;
          
          // For simplicity, assume no price/quantity at add time (no historical tracking yet)
          // In production, you'd store these values when adding to draft
          const priceChanged = false;
          const quantityChanged = false;
          
          return {
            id: draft.id,
            batchId: draft.batchId,
            itemName: pricedItem.name,
            category: pricedItem.category,
            subcategory: pricedItem.subcategory,
            retailPrice: currentPrice.toFixed(2),
            quantity: currentQuantity.toFixed(2),
            addedAt: draft.addedAt,
            priceChanged,
            priceAtAdd: undefined,
            quantityChanged,
            quantityAtAdd: undefined,
            stillAvailable,
          };
        }).filter(item => item !== null);
        
        const totalValue = items.reduce((sum, item) => sum + parseFloat(item.retailPrice), 0);
        const hasChanges = items.some(item => item.priceChanged || item.quantityChanged || !item.stillAvailable);
        
        return {
          items,
          totalItems: items.length,
          totalValue: totalValue.toFixed(2),
          hasChanges,
        };
      }),
    
    // Add to draft
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    addToDraft: vipPortalProcedure
      .input(z.object({
        batchId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        // Check if batch exists
        const batch = await db.query.batches.findFirst({
          where: eq(batches.id, input.batchId),
        });
        
        if (!batch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Batch not found",
          });
        }
        
        // Check if already in draft
        const existing = await db.query.clientDraftInterests.findFirst({
          where: and(
            eq(clientDraftInterests.clientId, clientId),
            eq(clientDraftInterests.batchId, input.batchId)
          ),
        });
        
        if (existing) {
          return {
            success: true,
            draftId: existing.id,
          };
        }
        
        // Add to draft
        const result = await db.insert(clientDraftInterests).values({
          clientId,
          batchId: input.batchId,
        });
        
        return {
          success: true,
          draftId: Number(Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0),
        };
      }),
    
    // Remove from draft
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    removeFromDraft: vipPortalProcedure
      .input(z.object({
        draftId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        // Check if draft exists and belongs to client
        const draft = await db.query.clientDraftInterests.findFirst({
          where: eq(clientDraftInterests.id, input.draftId),
        });
        
        if (!draft) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Draft item not found",
          });
        }
        
        if (draft.clientId !== clientId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Draft item belongs to a different client",
          });
        }
        
        await db.delete(clientDraftInterests).where(eq(clientDraftInterests.id, input.draftId));
        
        return { success: true };
      }),
    
    // Clear draft
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    clearDraft: vipPortalProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        const result = await db.delete(clientDraftInterests).where(eq(clientDraftInterests.clientId, clientId));
        
        return {
          success: true,
          itemsCleared: Array.isArray(result) ? (result[0] as { affectedRows?: number })?.affectedRows ?? 0 : 0 || 0,
        };
      }),
    
    // Submit interest list
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    submitInterestList: vipPortalProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        // Get draft items
        const drafts = await db.query.clientDraftInterests.findMany({
          where: eq(clientDraftInterests.clientId, clientId),
        });
        
        if (drafts.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Draft is empty",
          });
        }
        
        // Get batch details and calculate prices
        const batchIds = drafts.map(d => d.batchId);
        const batchesData = await db
          .select({
            batch: batches,
            product: products,
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .where(inArray(batches.id, batchIds));
        
        // Get client pricing
        const clientRules = await pricingEngine.getClientPricingRules(clientId);
        
        // Calculate current prices
        const inventoryItems = batchesData.map(({ batch, product }) => ({
          id: batch.id,
          name: batch.sku || `Batch #${batch.id}`,
          category: product?.category,
          subcategory: product?.subcategory ?? undefined,
          strain: undefined,
          basePrice: parseFloat(batch.unitCogs || '0'),
          quantity: parseFloat(batch.onHandQty || '0'),
          grade: batch.grade || undefined,
          vendor: undefined,
        }));
        
        let pricedItems;
        try {
          pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);
        } catch (error) {
          pricedItems = inventoryItems.map(item => ({
            ...item,
            retailPrice: item.basePrice,
            priceMarkup: 0,
            appliedRules: [],
          }));
        }
        
        // Calculate totals
        const totalValue = pricedItems.reduce((sum, item) => sum + item.retailPrice, 0);
        
        // Use transaction to create interest list and items
        const result = await db.transaction(async (tx) => {
          // Create interest list
          const listResult = await tx.insert(clientInterestLists).values({
            clientId,
            status: 'NEW',
            totalItems: drafts.length,
            totalValue: totalValue.toFixed(2),
          });
          
          const interestListId = Number((listResult as unknown as { insertId: number }).insertId);
          
          // Create interest list items
          const itemsToInsert = drafts.map(draft => {
            const pricedItem = pricedItems.find(p => p.id === draft.batchId);
            const batchData = batchesData.find(b => b.batch.id === draft.batchId);
            
            if (!pricedItem || !batchData) {
              throw new Error(`Batch ${draft.batchId} not found`);
            }
            
            return {
              interestListId,
              batchId: draft.batchId,
              itemName: pricedItem.name,
              category: pricedItem.category || null,
              subcategory: pricedItem.subcategory || null,
              priceAtInterest: pricedItem.retailPrice.toFixed(2),
              quantityAtInterest: (pricedItem.quantity ?? 0).toFixed(2),
            };
          });
          
          await tx.insert(clientInterestListItems).values(itemsToInsert);
          
          // Clear draft
          await tx.delete(clientDraftInterests).where(eq(clientDraftInterests.clientId, clientId));
          
          return {
            interestListId,
            totalItems: drafts.length,
            totalValue: totalValue.toFixed(2),
          };
        });
        
        return {
          success: true,
          ...result,
        };
      }),
    
    // Saved views
    views: router({
      // List saved views
      list: publicProcedure
        .query(async ({ ctx }) => {
          const db = await getDb();
        if (!db) throw new Error("Database not available");
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          const clientId = ctx.vipPortalClientId;
          if (!clientId) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Not authenticated",
            });
          }
          
          const views = await db.query.clientCatalogViews.findMany({
            where: eq(clientCatalogViews.clientId, clientId),
            orderBy: (clientCatalogViews, { desc }) => [desc(clientCatalogViews.createdAt)],
          });
          
          return { views };
        }),
      
      // Save a view
      // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
      save: vipPortalProcedure
        .input(z.object({
          name: z.string().min(1).max(100),
          filters: z.object({
            category: z.string().optional().nullable(),
            brand: z.array(z.string()).optional(),
            grade: z.array(z.string()).optional(),
            stockLevel: z.enum(['all', 'in_stock', 'low_stock']).optional(),
            priceMin: z.number().optional(),
            priceMax: z.number().optional(),
            search: z.string().optional(),
          }),
        }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;
          
          // Check if name already exists
          const existing = await db.query.clientCatalogViews.findFirst({
            where: and(
              eq(clientCatalogViews.clientId, clientId),
              eq(clientCatalogViews.name, input.name)
            ),
          });
          
          if (existing) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A view with this name already exists",
            });
          }
          
          const result = await db.insert(clientCatalogViews).values({
            clientId,
            name: input.name,
            filters: input.filters,
          });
          
          return {
            success: true,
            viewId: Number(Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0),
          };
        }),
      
      // Delete a view
      // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
      delete: vipPortalProcedure
        .input(z.object({
          viewId: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;
          
          // Check if view exists and belongs to client
          const view = await db.query.clientCatalogViews.findFirst({
            where: eq(clientCatalogViews.id, input.viewId),
          });
          
          if (!view) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "View not found",
            });
          }
          
          if (view.clientId !== clientId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "View belongs to a different client",
            });
          }
          
          await db.delete(clientCatalogViews).where(eq(clientCatalogViews.id, input.viewId));
          
          return { success: true };
        }),
    }),

    // ============================================================================
    // PRICE ALERTS
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    // ============================================================================
    priceAlerts: router({
      // Get all active price alerts for the client
      list: vipPortalProcedure.query(async ({ ctx }) => {
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;

        const alerts = await priceAlertsService.getClientPriceAlerts(clientId);
        return alerts;
      }),

      // Create a new price alert
      create: vipPortalProcedure
        .input(
          z.object({
            batchId: z.number(),
            targetPrice: z.number().positive(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;

          const result = await priceAlertsService.createPriceAlert(
            clientId,
            input.batchId,
            input.targetPrice
          );

          if (!result.success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: result.message || "Failed to create price alert",
            });
          }

          return result;
        }),

      // Deactivate a price alert
      deactivate: vipPortalProcedure
        .input(z.object({ alertId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;

          const result = await priceAlertsService.deactivatePriceAlert(
            input.alertId,
            clientId
          );

          if (!result.success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: result.message || "Failed to deactivate price alert",
            });
          }

          return result;
        }),
    }),
  }),
});
