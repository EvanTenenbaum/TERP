/**
 * Cash Audit Router
 * API endpoints for cash audit system including:
 * - Dashboard cash overview (MEET-001)
 * - Multi-location cash tracking (MEET-002)
 * - In/Out ledger management (MEET-003)
 * - Shift payment tracking (MEET-004)
 *
 * Feature: FEAT-007 Cash Audit System
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  cashLocations,
  cashLocationTransactions,
  shiftAudits,
  bills,
  bankAccounts,
  users,
} from "../../drizzle/schema";
import { eq, and, sql, inArray, desc, gte, lte } from "drizzle-orm";
import { logger } from "../_core/logger";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { isSchemaDriftError } from "../_core/dbErrors";

// ============================================================================
// MEET-001: Dashboard Available Money API
// ============================================================================

export const cashAuditRouter = router({
  /**
   * Get cash dashboard summary
   * Returns total cash on hand, scheduled payables, and available cash
   */
  getCashDashboard: protectedProcedure
    .use(requirePermission("accounting:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({ msg: "[CashAudit] Getting cash dashboard summary" });

      let totalCashOnHand = 0;

      try {
        // Primary path: FEAT-007 cash locations table.
        const cashOnHandResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(${cashLocations.currentBalance} AS DECIMAL(15,2))), 0)`,
          })
          .from(cashLocations)
          .where(eq(cashLocations.isActive, true));

        totalCashOnHand = Number(cashOnHandResult[0]?.total || 0);
      } catch (error) {
        if (!isSchemaDriftError(error, ["cash_locations"])) {
          throw error;
        }

        logger.warn(
          {
            error: error instanceof Error ? error.message : String(error),
          },
          "[CashAudit] cash_locations missing, falling back to bankAccounts"
        );

        try {
          const fallbackResult = await db
            .select({
              total: sql<string>`COALESCE(SUM(CAST(${bankAccounts.currentBalance} AS DECIMAL(15,2))), 0)`,
            })
            .from(bankAccounts)
            .where(
              and(
                eq(bankAccounts.isActive, true),
                sql`${bankAccounts.deletedAt} IS NULL`
              )
            );

          totalCashOnHand = Number(fallbackResult[0]?.total || 0);
        } catch (fallbackError) {
          if (
            !isSchemaDriftError(fallbackError, [
              "bankaccounts",
              "bank_accounts",
            ])
          ) {
            throw fallbackError;
          }

          logger.warn(
            {
              error:
                fallbackError instanceof Error
                  ? fallbackError.message
                  : String(fallbackError),
            },
            "[CashAudit] bank accounts fallback table unavailable, using zero cash on hand"
          );
        }
      }

      let scheduledPayables = 0;
      try {
        const scheduledPayablesResult = await db
          .select({
            total: sql<string>`COALESCE(SUM(CAST(${bills.amountDue} AS DECIMAL(15,2))), 0)`,
          })
          .from(bills)
          .where(
            and(
              inArray(bills.status, ["PENDING", "PARTIAL", "APPROVED"]),
              sql`${bills.deletedAt} IS NULL`,
              sql`CAST(${bills.amountDue} AS DECIMAL(15,2)) > 0`
            )
          );

        scheduledPayables = Number(scheduledPayablesResult[0]?.total || 0);
      } catch (error) {
        if (!isSchemaDriftError(error, ["bills"])) {
          throw error;
        }

        logger.warn(
          { error: error instanceof Error ? error.message : String(error) },
          "[CashAudit] bills table unavailable, scheduled payables defaulting to zero"
        );
      }

      // Calculate available cash
      const availableCash = totalCashOnHand - scheduledPayables;

      return {
        totalCashOnHand,
        scheduledPayables,
        availableCash,
        lastUpdated: new Date(),
      };
    }),

  // ============================================================================
  // MEET-002: Multi-Location Cash API
  // ============================================================================

  /**
   * List all cash locations with their balances
   */
  listLocations: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        includeInactive: z.boolean().optional().default(false),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({ msg: "[CashAudit] Listing cash locations", input });

      const conditions = [];
      if (!input.includeInactive) {
        conditions.push(eq(cashLocations.isActive, true));
      }

      const locationsQuery = db
        .select({
          id: cashLocations.id,
          name: cashLocations.name,
          currentBalance: cashLocations.currentBalance,
          isActive: cashLocations.isActive,
          createdAt: cashLocations.createdAt,
          updatedAt: cashLocations.updatedAt,
        })
        .from(cashLocations);

      const result =
        conditions.length > 0
          ? await locationsQuery
              .where(and(...conditions))
              .limit(input.limit)
              .offset(input.offset)
          : await locationsQuery.limit(input.limit).offset(input.offset);

      // Get count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cashLocations)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return createSafeUnifiedResponse(
        result.map(loc => ({
          ...loc,
          currentBalance: Number(loc.currentBalance || 0),
        })),
        Number(countResult[0]?.count || 0),
        input.limit,
        input.offset
      );
    }),

  /**
   * Create a new cash location (admin only)
   */
  createLocation: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(
      z.object({
        name: z.string().min(1).max(255),
        initialBalance: z.number().optional().default(0),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Creating cash location",
        name: input.name,
        userId: ctx.user.id,
      });

      // Insert the new location
      const result = await db.insert(cashLocations).values({
        name: input.name,
        currentBalance: input.initialBalance.toFixed(2),
        isActive: true,
      });

      const locationId = Number(result[0].insertId);

      // If there's an initial balance, record it as a transaction
      if (input.initialBalance > 0) {
        await db.insert(cashLocationTransactions).values({
          locationId,
          transactionType: "IN",
          amount: input.initialBalance.toFixed(2),
          description: "Initial balance",
          referenceType: "MANUAL",
          createdBy: ctx.user.id,
        });
      }

      logger.info({ msg: "[CashAudit] Cash location created", locationId });

      return {
        id: locationId,
        name: input.name,
        currentBalance: input.initialBalance,
        isActive: true,
      };
    }),

  /**
   * Update a cash location (rename or deactivate)
   */
  updateLocation: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(
      z.object({
        locationId: z.number(),
        name: z.string().min(1).max(255).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Updating cash location",
        locationId: input.locationId,
        userId: ctx.user.id,
      });

      // Check location exists
      const [existing] = await db
        .select()
        .from(cashLocations)
        .where(eq(cashLocations.id, input.locationId));

      if (!existing) {
        throw new Error("Location not found");
      }

      // Build update object
      const updates: Record<string, unknown> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.isActive !== undefined) updates.isActive = input.isActive;

      if (Object.keys(updates).length === 0) {
        return existing;
      }

      await db
        .update(cashLocations)
        .set(updates)
        .where(eq(cashLocations.id, input.locationId));

      // Fetch updated record
      const [updated] = await db
        .select()
        .from(cashLocations)
        .where(eq(cashLocations.id, input.locationId));

      logger.info({
        msg: "[CashAudit] Cash location updated",
        locationId: input.locationId,
      });

      return {
        ...updated,
        currentBalance: Number(updated.currentBalance || 0),
      };
    }),

  /**
   * Get single location balance and details
   */
  getLocationBalance: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ locationId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Getting location balance",
        locationId: input.locationId,
      });

      const [location] = await db
        .select({
          id: cashLocations.id,
          name: cashLocations.name,
          currentBalance: cashLocations.currentBalance,
          isActive: cashLocations.isActive,
          createdAt: cashLocations.createdAt,
          updatedAt: cashLocations.updatedAt,
        })
        .from(cashLocations)
        .where(eq(cashLocations.id, input.locationId));

      if (!location) {
        throw new Error("Location not found");
      }

      // Get recent transactions count
      const transactionCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cashLocationTransactions)
        .where(eq(cashLocationTransactions.locationId, input.locationId));

      return {
        ...location,
        currentBalance: Number(location.currentBalance || 0),
        transactionCount: Number(transactionCount[0]?.count || 0),
      };
    }),

  /**
   * Transfer cash between locations with full audit trail
   */
  transferBetweenLocations: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(
      z.object({
        fromLocationId: z.number(),
        toLocationId: z.number(),
        amount: z.number().positive(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Transferring between locations",
        from: input.fromLocationId,
        to: input.toLocationId,
        amount: input.amount,
        userId: ctx.user.id,
      });

      // Validate locations exist and are active
      const [fromLocation] = await db
        .select()
        .from(cashLocations)
        .where(
          and(
            eq(cashLocations.id, input.fromLocationId),
            eq(cashLocations.isActive, true)
          )
        );

      if (!fromLocation) {
        throw new Error("Source location not found or inactive");
      }

      const [toLocation] = await db
        .select()
        .from(cashLocations)
        .where(
          and(
            eq(cashLocations.id, input.toLocationId),
            eq(cashLocations.isActive, true)
          )
        );

      if (!toLocation) {
        throw new Error("Destination location not found or inactive");
      }

      // Check sufficient balance
      const fromBalance = Number(fromLocation.currentBalance || 0);
      if (fromBalance < input.amount) {
        throw new Error(
          `Insufficient balance. Available: $${fromBalance.toFixed(2)}, Requested: $${input.amount.toFixed(2)}`
        );
      }

      const transferDescription =
        input.description ||
        `Transfer from ${fromLocation.name} to ${toLocation.name}`;

      // Update source location balance (decrease)
      await db
        .update(cashLocations)
        .set({
          currentBalance: (fromBalance - input.amount).toFixed(2),
        })
        .where(eq(cashLocations.id, input.fromLocationId));

      // Update destination location balance (increase)
      const toBalance = Number(toLocation.currentBalance || 0);
      await db
        .update(cashLocations)
        .set({
          currentBalance: (toBalance + input.amount).toFixed(2),
        })
        .where(eq(cashLocations.id, input.toLocationId));

      // Record OUT transaction for source location
      const outResult = await db.insert(cashLocationTransactions).values({
        locationId: input.fromLocationId,
        transactionType: "TRANSFER",
        amount: input.amount.toFixed(2),
        description: transferDescription,
        referenceType: "TRANSFER",
        transferToLocationId: input.toLocationId,
        createdBy: ctx.user.id,
      });

      // Record IN transaction for destination location
      const inResult = await db.insert(cashLocationTransactions).values({
        locationId: input.toLocationId,
        transactionType: "TRANSFER",
        amount: input.amount.toFixed(2),
        description: transferDescription,
        referenceType: "TRANSFER",
        transferFromLocationId: input.fromLocationId,
        createdBy: ctx.user.id,
      });

      logger.info({
        msg: "[CashAudit] Transfer completed",
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        amount: input.amount,
      });

      return {
        success: true,
        fromLocation: {
          id: input.fromLocationId,
          name: fromLocation.name,
          previousBalance: fromBalance,
          newBalance: fromBalance - input.amount,
        },
        toLocation: {
          id: input.toLocationId,
          name: toLocation.name,
          previousBalance: toBalance,
          newBalance: toBalance + input.amount,
        },
        amount: input.amount,
        transactionIds: {
          out: Number(outResult[0].insertId),
          in: Number(inResult[0].insertId),
        },
        timestamp: new Date(),
      };
    }),

  // ============================================================================
  // MEET-003: In/Out Ledger API
  // ============================================================================

  /**
   * Get transaction ledger for a location with filters
   */
  getLocationLedger: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        locationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        transactionType: z.enum(["IN", "OUT", "TRANSFER"]).optional(),
        limit: z.number().min(1).max(500).default(100),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Getting location ledger",
        locationId: input.locationId,
        filters: {
          startDate: input.startDate,
          endDate: input.endDate,
          transactionType: input.transactionType,
        },
      });

      // Verify location exists
      const [location] = await db
        .select({ id: cashLocations.id, name: cashLocations.name })
        .from(cashLocations)
        .where(eq(cashLocations.id, input.locationId));

      if (!location) {
        throw new Error("Location not found");
      }

      // Build conditions
      const conditions = [
        eq(cashLocationTransactions.locationId, input.locationId),
      ];

      if (input.startDate) {
        conditions.push(
          gte(cashLocationTransactions.createdAt, input.startDate)
        );
      }
      if (input.endDate) {
        conditions.push(lte(cashLocationTransactions.createdAt, input.endDate));
      }
      if (input.transactionType) {
        conditions.push(
          eq(cashLocationTransactions.transactionType, input.transactionType)
        );
      }

      // Get transactions with user info
      const transactions = await db
        .select({
          id: cashLocationTransactions.id,
          locationId: cashLocationTransactions.locationId,
          transactionType: cashLocationTransactions.transactionType,
          amount: cashLocationTransactions.amount,
          description: cashLocationTransactions.description,
          referenceType: cashLocationTransactions.referenceType,
          referenceId: cashLocationTransactions.referenceId,
          transferToLocationId: cashLocationTransactions.transferToLocationId,
          transferFromLocationId:
            cashLocationTransactions.transferFromLocationId,
          createdBy: cashLocationTransactions.createdBy,
          createdByName: users.name,
          createdAt: cashLocationTransactions.createdAt,
        })
        .from(cashLocationTransactions)
        .leftJoin(users, eq(cashLocationTransactions.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(cashLocationTransactions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      // Get count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cashLocationTransactions)
        .where(and(...conditions));

      // Calculate running balance (for display purposes)
      // Note: This is a simplified calculation - in production, you might want
      // to calculate this more precisely based on actual transaction order
      const balanceResult = await db
        .select({
          totalIn: sql<string>`COALESCE(SUM(CASE WHEN ${cashLocationTransactions.transactionType} = 'IN' OR (${cashLocationTransactions.transactionType} = 'TRANSFER' AND ${cashLocationTransactions.transferFromLocationId} IS NOT NULL) THEN CAST(${cashLocationTransactions.amount} AS DECIMAL(15,2)) ELSE 0 END), 0)`,
          totalOut: sql<string>`COALESCE(SUM(CASE WHEN ${cashLocationTransactions.transactionType} = 'OUT' OR (${cashLocationTransactions.transactionType} = 'TRANSFER' AND ${cashLocationTransactions.transferToLocationId} IS NOT NULL) THEN CAST(${cashLocationTransactions.amount} AS DECIMAL(15,2)) ELSE 0 END), 0)`,
        })
        .from(cashLocationTransactions)
        .where(and(...conditions));

      const totalIn = Number(balanceResult[0]?.totalIn || 0);
      const totalOut = Number(balanceResult[0]?.totalOut || 0);

      return {
        location: {
          id: location.id,
          name: location.name,
        },
        transactions: createSafeUnifiedResponse(
          transactions.map(tx => ({
            ...tx,
            amount: Number(tx.amount || 0),
          })),
          Number(countResult[0]?.count || 0),
          input.limit,
          input.offset
        ),
        summary: {
          totalIn,
          totalOut,
          netChange: totalIn - totalOut,
        },
      };
    }),

  /**
   * Record an IN or OUT transaction
   */
  recordTransaction: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(
      z.object({
        locationId: z.number(),
        transactionType: z.enum(["IN", "OUT"]),
        amount: z.number().positive(),
        description: z.string().min(1),
        referenceType: z
          .enum(["ORDER", "VENDOR_PAYMENT", "MANUAL"])
          .optional()
          .default("MANUAL"),
        referenceId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Recording transaction",
        locationId: input.locationId,
        type: input.transactionType,
        amount: input.amount,
        userId: ctx.user.id,
      });

      // Verify location exists and is active
      const [location] = await db
        .select()
        .from(cashLocations)
        .where(
          and(
            eq(cashLocations.id, input.locationId),
            eq(cashLocations.isActive, true)
          )
        );

      if (!location) {
        throw new Error("Location not found or inactive");
      }

      const currentBalance = Number(location.currentBalance || 0);

      // For OUT transactions, check sufficient balance
      if (input.transactionType === "OUT" && currentBalance < input.amount) {
        throw new Error(
          `Insufficient balance. Available: $${currentBalance.toFixed(2)}, Requested: $${input.amount.toFixed(2)}`
        );
      }

      // Calculate new balance
      const newBalance =
        input.transactionType === "IN"
          ? currentBalance + input.amount
          : currentBalance - input.amount;

      // Update location balance
      await db
        .update(cashLocations)
        .set({
          currentBalance: newBalance.toFixed(2),
        })
        .where(eq(cashLocations.id, input.locationId));

      // Record transaction
      const result = await db.insert(cashLocationTransactions).values({
        locationId: input.locationId,
        transactionType: input.transactionType,
        amount: input.amount.toFixed(2),
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        createdBy: ctx.user.id,
      });

      const transactionId = Number(result[0].insertId);

      logger.info({
        msg: "[CashAudit] Transaction recorded",
        transactionId,
        locationId: input.locationId,
        type: input.transactionType,
        amount: input.amount,
      });

      return {
        id: transactionId,
        locationId: input.locationId,
        locationName: location.name,
        transactionType: input.transactionType,
        amount: input.amount,
        description: input.description,
        referenceType: input.referenceType,
        referenceId: input.referenceId,
        previousBalance: currentBalance,
        newBalance,
        timestamp: new Date(),
      };
    }),

  /**
   * Export ledger to CSV format
   */
  exportLedger: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        locationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        transactionType: z.enum(["IN", "OUT", "TRANSFER"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Exporting ledger",
        locationId: input.locationId,
        filters: {
          startDate: input.startDate,
          endDate: input.endDate,
          transactionType: input.transactionType,
        },
      });

      // Verify location exists
      const [location] = await db
        .select({ id: cashLocations.id, name: cashLocations.name })
        .from(cashLocations)
        .where(eq(cashLocations.id, input.locationId));

      if (!location) {
        throw new Error("Location not found");
      }

      // Build conditions
      const conditions = [
        eq(cashLocationTransactions.locationId, input.locationId),
      ];

      if (input.startDate) {
        conditions.push(
          gte(cashLocationTransactions.createdAt, input.startDate)
        );
      }
      if (input.endDate) {
        conditions.push(lte(cashLocationTransactions.createdAt, input.endDate));
      }
      if (input.transactionType) {
        conditions.push(
          eq(cashLocationTransactions.transactionType, input.transactionType)
        );
      }

      // Get all transactions for export (no pagination limit for export)
      const transactions = await db
        .select({
          id: cashLocationTransactions.id,
          transactionType: cashLocationTransactions.transactionType,
          amount: cashLocationTransactions.amount,
          description: cashLocationTransactions.description,
          referenceType: cashLocationTransactions.referenceType,
          referenceId: cashLocationTransactions.referenceId,
          transferToLocationId: cashLocationTransactions.transferToLocationId,
          transferFromLocationId:
            cashLocationTransactions.transferFromLocationId,
          createdByName: users.name,
          createdAt: cashLocationTransactions.createdAt,
        })
        .from(cashLocationTransactions)
        .leftJoin(users, eq(cashLocationTransactions.createdBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(cashLocationTransactions.createdAt));

      // Build CSV content
      const csvHeaders = [
        "ID",
        "Date",
        "Type",
        "In",
        "Out",
        "Description",
        "Reference Type",
        "Reference ID",
        "Created By",
      ];

      const csvRows = transactions.map(tx => {
        const amount = Number(tx.amount || 0);

        // Determine IN or OUT column based on transaction type
        // For TRANSFER: check transferFromLocationId (incoming) vs transferToLocationId (outgoing)
        let inAmount = "";
        let outAmount = "";
        if (tx.transactionType === "IN") {
          inAmount = amount.toFixed(2);
        } else if (tx.transactionType === "OUT") {
          outAmount = amount.toFixed(2);
        } else if (tx.transactionType === "TRANSFER") {
          // Transfers have a direction based on the location perspective:
          // - transferFromLocationId set = funds came FROM another location TO this one (IN)
          // - transferToLocationId set = funds went TO another location FROM this one (OUT)
          if (tx.transferFromLocationId) {
            inAmount = amount.toFixed(2);
          } else if (tx.transferToLocationId) {
            outAmount = amount.toFixed(2);
          }
        }

        return [
          tx.id,
          tx.createdAt ? new Date(tx.createdAt).toISOString() : "",
          tx.transactionType,
          inAmount,
          outAmount,
          `"${(tx.description || "").replace(/"/g, '""')}"`,
          tx.referenceType || "",
          tx.referenceId || "",
          tx.createdByName || "",
        ];
      });

      // Generate CSV string
      const csvContent = [
        csvHeaders.join(","),
        ...csvRows.map(row => row.join(",")),
      ].join("\n");

      // Calculate summary
      let totalIn = 0;
      let totalOut = 0;
      transactions.forEach(tx => {
        const amount = Number(tx.amount || 0);
        if (tx.transactionType === "IN") {
          totalIn += amount;
        } else if (tx.transactionType === "OUT") {
          totalOut += amount;
        }
      });

      return {
        location: {
          id: location.id,
          name: location.name,
        },
        filename: `ledger_${location.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.csv`,
        csv: csvContent,
        summary: {
          totalIn,
          totalOut,
          netChange: totalIn - totalOut,
          transactionCount: transactions.length,
        },
        exportedAt: new Date(),
      };
    }),

  // ============================================================================
  // MEET-004: Shift Payment Tracking API
  // ============================================================================

  /**
   * Get current shift payments for a location
   * Returns active shift info and all transactions within the shift period
   */
  getShiftPayments: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        locationId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Getting shift payments",
        locationId: input.locationId,
      });

      // Verify location exists
      const [location] = await db
        .select()
        .from(cashLocations)
        .where(eq(cashLocations.id, input.locationId));

      if (!location) {
        throw new Error("Location not found");
      }

      // Find active shift or create one if none exists
      let [activeShift] = await db
        .select()
        .from(shiftAudits)
        .where(
          and(
            eq(shiftAudits.locationId, input.locationId),
            eq(shiftAudits.status, "ACTIVE")
          )
        );

      // If no active shift, create one
      if (!activeShift) {
        const currentBalance = Number(location.currentBalance || 0);
        const result = await db.insert(shiftAudits).values({
          locationId: input.locationId,
          shiftStart: new Date(),
          startingBalance: currentBalance.toFixed(2),
          expectedBalance: currentBalance.toFixed(2),
          status: "ACTIVE",
        });

        const shiftId = Number(result[0].insertId);
        [activeShift] = await db
          .select()
          .from(shiftAudits)
          .where(eq(shiftAudits.id, shiftId));
      }

      // Get transactions since shift start
      const transactions = await db
        .select({
          id: cashLocationTransactions.id,
          transactionType: cashLocationTransactions.transactionType,
          amount: cashLocationTransactions.amount,
          description: cashLocationTransactions.description,
          referenceType: cashLocationTransactions.referenceType,
          referenceId: cashLocationTransactions.referenceId,
          createdByName: users.name,
          createdAt: cashLocationTransactions.createdAt,
        })
        .from(cashLocationTransactions)
        .leftJoin(users, eq(cashLocationTransactions.createdBy, users.id))
        .where(
          and(
            eq(cashLocationTransactions.locationId, input.locationId),
            gte(cashLocationTransactions.createdAt, activeShift.shiftStart)
          )
        )
        .orderBy(desc(cashLocationTransactions.createdAt));

      // Calculate shift totals
      let totalIn = 0;
      let totalOut = 0;
      transactions.forEach(tx => {
        const amount = Number(tx.amount || 0);
        if (tx.transactionType === "IN") {
          totalIn += amount;
        } else if (tx.transactionType === "OUT") {
          totalOut += amount;
        } else if (tx.transactionType === "TRANSFER") {
          // Transfers are tracked separately in ledger
          // For shift purposes, they affect balance but aren't "received"
        }
      });

      const startingBalance = Number(activeShift.startingBalance || 0);
      const expectedBalance = startingBalance + totalIn - totalOut;

      return {
        shiftId: activeShift.id,
        shiftStart: activeShift.shiftStart,
        location: {
          id: location.id,
          name: location.name,
          currentBalance: Number(location.currentBalance || 0),
        },
        startingBalance,
        totalReceived: totalIn,
        totalPaidOut: totalOut,
        expectedBalance,
        transactionCount: transactions.length,
        transactions: transactions.map(tx => ({
          ...tx,
          amount: Number(tx.amount || 0),
        })),
      };
    }),

  /**
   * Reset/close a shift with reconciliation
   * Creates an audit trail entry with variance if any
   */
  resetShift: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(
      z.object({
        locationId: z.number(),
        actualCashCount: z.number().nonnegative(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Resetting shift",
        locationId: input.locationId,
        actualCashCount: input.actualCashCount,
        userId: ctx.user.id,
      });

      // Verify location exists
      const [location] = await db
        .select()
        .from(cashLocations)
        .where(eq(cashLocations.id, input.locationId));

      if (!location) {
        throw new Error("Location not found");
      }

      // Find active shift
      const [activeShift] = await db
        .select()
        .from(shiftAudits)
        .where(
          and(
            eq(shiftAudits.locationId, input.locationId),
            eq(shiftAudits.status, "ACTIVE")
          )
        );

      if (!activeShift) {
        throw new Error("No active shift found for this location");
      }

      // Get transactions since shift start to calculate expected balance
      const transactions = await db
        .select({
          transactionType: cashLocationTransactions.transactionType,
          amount: cashLocationTransactions.amount,
        })
        .from(cashLocationTransactions)
        .where(
          and(
            eq(cashLocationTransactions.locationId, input.locationId),
            gte(cashLocationTransactions.createdAt, activeShift.shiftStart)
          )
        );

      let totalIn = 0;
      let totalOut = 0;
      transactions.forEach(tx => {
        const amount = Number(tx.amount || 0);
        if (tx.transactionType === "IN") {
          totalIn += amount;
        } else if (tx.transactionType === "OUT") {
          totalOut += amount;
        }
      });

      const startingBalance = Number(activeShift.startingBalance || 0);
      const expectedBalance = startingBalance + totalIn - totalOut;
      const variance = input.actualCashCount - expectedBalance;

      const now = new Date();

      // Update the shift to closed status
      await db
        .update(shiftAudits)
        .set({
          shiftEnd: now,
          expectedBalance: expectedBalance.toFixed(2),
          actualCount: input.actualCashCount.toFixed(2),
          variance: variance.toFixed(2),
          status: "CLOSED",
          notes: input.notes,
          resetBy: ctx.user.id,
          resetAt: now,
        })
        .where(eq(shiftAudits.id, activeShift.id));

      // Update location balance to actual count (reconciled)
      await db
        .update(cashLocations)
        .set({
          currentBalance: input.actualCashCount.toFixed(2),
        })
        .where(eq(cashLocations.id, input.locationId));

      // If there's a variance, record it as a transaction for audit purposes
      if (variance !== 0) {
        const varianceType = variance > 0 ? "IN" : "OUT";
        const varianceAmount = Math.abs(variance);
        await db.insert(cashLocationTransactions).values({
          locationId: input.locationId,
          transactionType: varianceType,
          amount: varianceAmount.toFixed(2),
          description: `Shift reconciliation variance: ${variance > 0 ? "Over" : "Short"} by $${varianceAmount.toFixed(2)}`,
          referenceType: "MANUAL",
          createdBy: ctx.user.id,
        });
      }

      // Create new shift starting now
      const newShiftResult = await db.insert(shiftAudits).values({
        locationId: input.locationId,
        shiftStart: now,
        startingBalance: input.actualCashCount.toFixed(2),
        expectedBalance: input.actualCashCount.toFixed(2),
        status: "ACTIVE",
      });

      const newShiftId = Number(newShiftResult[0].insertId);

      logger.info({
        msg: "[CashAudit] Shift reset completed",
        closedShiftId: activeShift.id,
        newShiftId,
        variance,
      });

      return {
        previousShiftId: activeShift.id,
        previousBalance: startingBalance,
        expectedBalance,
        actualCount: input.actualCashCount,
        variance,
        variancePercent:
          expectedBalance !== 0
            ? ((variance / expectedBalance) * 100).toFixed(2)
            : "0.00",
        isCleanAudit: variance === 0,
        auditEntryId: activeShift.id,
        newShiftId,
        newShiftStart: now,
        timestamp: now,
      };
    }),

  /**
   * Get shift audit history for a location
   */
  getShiftHistory: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        locationId: z.number(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info({
        msg: "[CashAudit] Getting shift history",
        locationId: input.locationId,
      });

      // Build conditions
      const conditions = [eq(shiftAudits.locationId, input.locationId)];

      if (input.startDate) {
        conditions.push(gte(shiftAudits.shiftStart, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(shiftAudits.shiftStart, input.endDate));
      }

      // Get shift audits with user info
      const shifts = await db
        .select({
          id: shiftAudits.id,
          locationId: shiftAudits.locationId,
          shiftStart: shiftAudits.shiftStart,
          shiftEnd: shiftAudits.shiftEnd,
          startingBalance: shiftAudits.startingBalance,
          expectedBalance: shiftAudits.expectedBalance,
          actualCount: shiftAudits.actualCount,
          variance: shiftAudits.variance,
          status: shiftAudits.status,
          notes: shiftAudits.notes,
          resetByName: users.name,
          resetAt: shiftAudits.resetAt,
          createdAt: shiftAudits.createdAt,
        })
        .from(shiftAudits)
        .leftJoin(users, eq(shiftAudits.resetBy, users.id))
        .where(and(...conditions))
        .orderBy(desc(shiftAudits.shiftStart))
        .limit(input.limit)
        .offset(input.offset);

      // Get count
      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shiftAudits)
        .where(and(...conditions));

      // Calculate variance statistics
      const closedShifts = shifts.filter(s => s.status === "CLOSED");
      const varianceStats = closedShifts.reduce(
        (acc, shift) => {
          const variance = Number(shift.variance || 0);
          acc.totalVariance += variance;
          if (variance !== 0) acc.shiftsWithVariance++;
          if (variance > 0) acc.totalOver += variance;
          if (variance < 0) acc.totalShort += Math.abs(variance);
          return acc;
        },
        { totalVariance: 0, shiftsWithVariance: 0, totalOver: 0, totalShort: 0 }
      );

      return {
        shifts: createSafeUnifiedResponse(
          shifts.map(s => ({
            ...s,
            startingBalance: Number(s.startingBalance || 0),
            expectedBalance: Number(s.expectedBalance || 0),
            actualCount: Number(s.actualCount || 0),
            variance: Number(s.variance || 0),
          })),
          Number(countResult[0]?.count || 0),
          input.limit,
          input.offset
        ),
        statistics: {
          ...varianceStats,
          cleanAudits: closedShifts.length - varianceStats.shiftsWithVariance,
          cleanAuditRate:
            closedShifts.length > 0
              ? ((closedShifts.length - varianceStats.shiftsWithVariance) /
                  closedShifts.length) *
                100
              : 100,
        },
      };
    }),
});
