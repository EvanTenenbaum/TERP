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
  bills,
  users,
} from "../../drizzle/schema";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { logger } from "../_core/logger";
import { createSafeUnifiedResponse } from "../_core/pagination";

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

      // Get total cash on hand from all active cash locations
      const cashOnHandResult = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${cashLocations.currentBalance} AS DECIMAL(15,2))), 0)`,
        })
        .from(cashLocations)
        .where(eq(cashLocations.isActive, true));

      const totalCashOnHand = Number(cashOnHandResult[0]?.total || 0);

      // Get scheduled payables (upcoming bills that are pending/partial)
      const todayStr = new Date().toISOString().split("T")[0];
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

      const scheduledPayables = Number(scheduledPayablesResult[0]?.total || 0);

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
        result.map((loc) => ({
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

      logger.info({ msg: "[CashAudit] Cash location updated", locationId: input.locationId });

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

      logger.info({ msg: "[CashAudit] Getting location balance", locationId: input.locationId });

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
});
