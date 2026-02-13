/**
 * Intake Receipts Router
 * FEAT-008: Intake Verification System (MEET-064 to MEET-066)
 *
 * Provides API endpoints for:
 * - Creating and managing intake receipts
 * - Farmer verification via shareable token
 * - Stacker verification with actual quantities
 * - Discrepancy reporting and resolution
 * - Receipt finalization
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";

import {
  intakeReceipts,
  intakeReceiptItems,
  intakeDiscrepancies,
  clients,
  products,
  users,
} from "../../drizzle/schema";
import { eq, desc, sql, and, or, gte, lte, like } from "drizzle-orm";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { logger } from "../_core/logger";
import { sendNotification } from "../services/notificationService";
import { withTransaction } from "../dbTransaction";
import crypto from "crypto";

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

const intakeReceiptStatusSchema = z.enum([
  "PENDING",
  "FARMER_VERIFIED",
  "STACKER_VERIFIED",
  "FINALIZED",
  "DISPUTED",
]);

const verificationStatusSchema = z.enum(["PENDING", "VERIFIED", "DISCREPANCY"]);

const resolutionSchema = z.enum(["ACCEPTED", "ADJUSTED", "REJECTED"]);

const createReceiptItemSchema = z.object({
  productId: z.number().int().positive().optional().nullable(),
  productName: z.string().min(1, "Product name is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unit: z.string().min(1, "Unit is required"),
  expectedPrice: z.number().min(0).optional().nullable(),
});

const createReceiptSchema = z.object({
  supplierId: z.number().int().positive("Supplier ID is required"),
  items: z.array(createReceiptItemSchema).min(1, "At least one item is required"),
  notes: z.string().optional(),
});

const verificationItemSchema = z.object({
  itemId: z.number().int().positive(),
  actualQuantity: z.number().min(0, "Actual quantity cannot be negative"),
  status: verificationStatusSchema,
  notes: z.string().optional(),
});

const listReceiptsSchema = z.object({
  limit: z.number().min(1).max(1000).optional().default(50),
  offset: z.number().min(0).optional().default(0),
  status: intakeReceiptStatusSchema.optional(),
  supplierId: z.number().int().positive().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate a secure random token for shareable links
 */
function generateShareableToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Generate receipt number in format IR-YYYY-XXXXX
 */
async function generateReceiptNumber(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `IR-${year}-`;

  // Get the count of receipts for this year
  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(intakeReceipts)
    .where(like(intakeReceipts.receiptNumber, `${prefix}%`));

  const count = result?.count ?? 0;
  const nextNumber = count + 1;

  return `${prefix}${nextNumber.toString().padStart(5, "0")}`;
}

/**
 * Calculate discrepancy details
 */
function calculateDiscrepancy(expected: number, actual: number) {
  const difference = actual - expected;
  const percentageDiff = expected !== 0 ? (difference / expected) * 100 : 0;
  return {
    difference,
    percentageDiff: Math.round(percentageDiff * 100) / 100,
    hasDiscrepancy: Math.abs(difference) > 0.0001, // Account for floating point
  };
}

// ============================================================================
// ROUTER
// ============================================================================

export const intakeReceiptsRouter = router({
  // -------------------------------------------------------------------------
  // MEET-064-BE: Intake Receipt Tool API
  // -------------------------------------------------------------------------

  /**
   * Create a new intake receipt with items
   */
  createReceipt: protectedProcedure
    .input(createReceiptSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      // Verify supplier exists
      const [supplier] = await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.supplierId))
        .limit(1);

      if (!supplier) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Supplier not found" });
      }

      // Generate receipt number and shareable token
      const receiptNumber = await generateReceiptNumber(db);
      const shareableToken = generateShareableToken();

      // Create the receipt
      const [receiptResult] = await db.insert(intakeReceipts).values({
        receiptNumber,
        supplierId: input.supplierId,
        status: "PENDING",
        notes: input.notes,
        shareableToken,
        createdBy: userId,
      });

      const receiptId = receiptResult.insertId;

      // Create receipt items
      const itemsToInsert = input.items.map((item) => ({
        receiptId,
        productId: item.productId ?? null,
        productName: item.productName,
        expectedQuantity: item.quantity.toString(),
        unit: item.unit,
        expectedPrice: item.expectedPrice?.toString() ?? null,
        verificationStatus: "PENDING",
      }));

      await db.insert(intakeReceiptItems).values(itemsToInsert);

      logger.info(
        { receiptId, receiptNumber, supplierId: input.supplierId, itemCount: input.items.length },
        "[IntakeReceipts] Receipt created"
      );

      // Build shareable URL
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
      const shareableUrl = `${baseUrl}/intake/verify/${shareableToken}`;

      return {
        id: receiptId,
        receiptNumber,
        status: "PENDING" as const,
        shareableUrl,
        shareableToken,
        createdAt: new Date(),
      };
    }),

  /**
   * Get a receipt by ID with all details
   */
  getReceipt: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get receipt
      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.id, input.id))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
      }

      // Get items
      const items = await db
        .select({
          id: intakeReceiptItems.id,
          productId: intakeReceiptItems.productId,
          productName: intakeReceiptItems.productName,
          expectedQuantity: intakeReceiptItems.expectedQuantity,
          actualQuantity: intakeReceiptItems.actualQuantity,
          unit: intakeReceiptItems.unit,
          expectedPrice: intakeReceiptItems.expectedPrice,
          verificationStatus: intakeReceiptItems.verificationStatus,
          discrepancyNotes: intakeReceiptItems.discrepancyNotes,
          createdAt: intakeReceiptItems.createdAt,
        })
        .from(intakeReceiptItems)
        .where(eq(intakeReceiptItems.receiptId, input.id));

      // Get discrepancies
      const discrepancies = await db
        .select()
        .from(intakeDiscrepancies)
        .where(eq(intakeDiscrepancies.receiptId, input.id));

      // Get supplier info
      let supplierInfo = null;
      if (receipt.supplierId) {
        const [supplier] = await db
          .select({ id: clients.id, name: clients.name, email: clients.email, phone: clients.phone })
          .from(clients)
          .where(eq(clients.id, receipt.supplierId))
          .limit(1);
        supplierInfo = supplier || null;
      }

      // Get creator info
      let creatorInfo = null;
      if (receipt.createdBy) {
        const [creator] = await db
          .select({ id: users.id, name: users.name, email: users.email })
          .from(users)
          .where(eq(users.id, receipt.createdBy))
          .limit(1);
        creatorInfo = creator || null;
      }

      return {
        ...receipt,
        items,
        discrepancies,
        supplier: supplierInfo,
        creator: creatorInfo,
      };
    }),

  /**
   * List receipts with filters and pagination
   */
  listReceipts: protectedProcedure
    .input(listReceiptsSchema.optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      // Build conditions
      const conditions = [];

      if (input?.status) {
        conditions.push(eq(intakeReceipts.status, input.status));
      }

      if (input?.supplierId) {
        conditions.push(eq(intakeReceipts.supplierId, input.supplierId));
      }

      if (input?.startDate) {
        conditions.push(gte(intakeReceipts.createdAt, new Date(input.startDate)));
      }

      if (input?.endDate) {
        conditions.push(lte(intakeReceipts.createdAt, new Date(input.endDate)));
      }

      if (input?.search) {
        conditions.push(like(intakeReceipts.receiptNumber, `%${input.search}%`));
      }

      // Execute query with item count subquery
      const baseQuery = db
        .select({
          id: intakeReceipts.id,
          receiptNumber: intakeReceipts.receiptNumber,
          supplierId: intakeReceipts.supplierId,
          status: intakeReceipts.status,
          farmerVerifiedAt: intakeReceipts.farmerVerifiedAt,
          stackerVerifiedAt: intakeReceipts.stackerVerifiedAt,
          finalizedAt: intakeReceipts.finalizedAt,
          notes: intakeReceipts.notes,
          createdBy: intakeReceipts.createdBy,
          createdAt: intakeReceipts.createdAt,
          updatedAt: intakeReceipts.updatedAt,
          supplierName: clients.name,
          itemCount: sql<number>`(SELECT COUNT(*) FROM ${intakeReceiptItems} WHERE ${intakeReceiptItems.receiptId} = ${intakeReceipts.id})`,
        })
        .from(intakeReceipts)
        .leftJoin(clients, eq(intakeReceipts.supplierId, clients.id));

      const query = conditions.length > 0
        ? baseQuery.where(and(...conditions))
        : baseQuery;

      const receipts = await query
        .orderBy(desc(intakeReceipts.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count
      const countQuery = conditions.length > 0
        ? db.select({ count: sql<number>`COUNT(*)` }).from(intakeReceipts).where(and(...conditions))
        : db.select({ count: sql<number>`COUNT(*)` }).from(intakeReceipts);

      const [countResult] = await countQuery;
      const total = countResult?.count ?? receipts.length;

      return createSafeUnifiedResponse(receipts, total, limit, offset);
    }),

  /**
   * Get receipt by shareable token (public endpoint for farmer verification)
   */
  getReceiptByToken: protectedProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get receipt by token
      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.shareableToken, input.token))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found or invalid token" });
      }

      // Get items (limited info for public view)
      const items = await db
        .select({
          id: intakeReceiptItems.id,
          productName: intakeReceiptItems.productName,
          expectedQuantity: intakeReceiptItems.expectedQuantity,
          unit: intakeReceiptItems.unit,
          expectedPrice: intakeReceiptItems.expectedPrice,
          verificationStatus: intakeReceiptItems.verificationStatus,
        })
        .from(intakeReceiptItems)
        .where(eq(intakeReceiptItems.receiptId, receipt.id));

      // Get supplier name
      let supplierName = null;
      if (receipt.supplierId) {
        const [supplier] = await db
          .select({ name: clients.name })
          .from(clients)
          .where(eq(clients.id, receipt.supplierId))
          .limit(1);
        supplierName = supplier?.name || null;
      }

      return {
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        status: receipt.status,
        supplierName,
        items,
        notes: receipt.notes,
        farmerVerifiedAt: receipt.farmerVerifiedAt,
        createdAt: receipt.createdAt,
      };
    }),

  /**
   * Generate a new receipt number (preview only)
   */
  generateReceiptNumber: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const receiptNumber = await generateReceiptNumber(db);
      return { receiptNumber };
    }),

  // -------------------------------------------------------------------------
  // MEET-065-BE: Verification Process API
  // -------------------------------------------------------------------------

  /**
   * Farmer acknowledges receipt (via shareable token)
   */
  verifyAsFarmer: protectedProcedure
    .input(z.object({
      token: z.string().min(1),
      acknowledged: z.boolean(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get receipt by token
      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.shareableToken, input.token))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found or invalid token" });
      }

      // Verify status allows farmer verification
      if (receipt.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Receipt cannot be verified by farmer from ${receipt.status} status`,
        });
      }

      if (!input.acknowledged) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Farmer must acknowledge the receipt",
        });
      }

      // Update receipt status
      const updatedNotes = input.notes
        ? `${receipt.notes || ""}\nFarmer notes: ${input.notes}`.trim()
        : receipt.notes;

      await db
        .update(intakeReceipts)
        .set({
          status: "FARMER_VERIFIED",
          farmerVerifiedAt: new Date(),
          notes: updatedNotes,
        })
        .where(eq(intakeReceipts.id, receipt.id));

      logger.info(
        { receiptId: receipt.id, receiptNumber: receipt.receiptNumber },
        "[IntakeReceipts] Farmer verified receipt"
      );

      return {
        receiptId: receipt.id,
        newStatus: "FARMER_VERIFIED" as const,
        farmerVerifiedAt: new Date(),
      };
    }),

  /**
   * Stacker verifies receipt with actual quantities
   */
  verifyAsStacker: protectedProcedure
    .input(z.object({
      receiptId: z.number().int().positive(),
      verifications: z.array(verificationItemSchema).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      // Get receipt
      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.id, input.receiptId))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
      }

      // Verify status allows stacker verification
      if (receipt.status !== "FARMER_VERIFIED" && receipt.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Receipt cannot be verified by stacker from ${receipt.status} status`,
        });
      }

      const discrepanciesFound: Array<{
        itemId: number;
        expected: number;
        actual: number;
        difference: number;
      }> = [];

      let hasDiscrepancy = false;

      // Process each verification
      for (const verification of input.verifications) {
        // Get the item
        const [item] = await db
          .select()
          .from(intakeReceiptItems)
          .where(
            and(
              eq(intakeReceiptItems.id, verification.itemId),
              eq(intakeReceiptItems.receiptId, input.receiptId)
            )
          )
          .limit(1);

        if (!item) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Item ${verification.itemId} not found in this receipt`,
          });
        }

        const expected = parseFloat(item.expectedQuantity);
        const actual = verification.actualQuantity;
        const { difference, hasDiscrepancy: itemHasDiscrepancy } = calculateDiscrepancy(expected, actual);

        // Update item
        await db
          .update(intakeReceiptItems)
          .set({
            actualQuantity: actual.toString(),
            verificationStatus: verification.status,
            discrepancyNotes: verification.notes,
          })
          .where(eq(intakeReceiptItems.id, verification.itemId));

        // Record discrepancy if found
        if (verification.status === "DISCREPANCY" || itemHasDiscrepancy) {
          hasDiscrepancy = true;

          // Insert discrepancy record
          await db.insert(intakeDiscrepancies).values({
            receiptId: input.receiptId,
            itemId: verification.itemId,
            expectedQuantity: expected.toString(),
            actualQuantity: actual.toString(),
            difference: difference.toString(),
          });

          discrepanciesFound.push({
            itemId: verification.itemId,
            expected,
            actual,
            difference,
          });
        }
      }

      // Determine new status
      const newStatus = hasDiscrepancy ? "DISPUTED" : "STACKER_VERIFIED";

      // Update receipt status
      await db
        .update(intakeReceipts)
        .set({
          status: newStatus,
          stackerVerifiedAt: new Date(),
          stackerVerifiedBy: userId,
        })
        .where(eq(intakeReceipts.id, input.receiptId));

      // If discrepancy found, notify the receipt creator (not generic admin)
      let creatorNotified = false;
      if (hasDiscrepancy && receipt.createdBy) {
        try {
          await sendNotification({
            userId: receipt.createdBy,
            type: "warning",
            title: `Discrepancy Found: ${receipt.receiptNumber}`,
            message: `${discrepanciesFound.length} item(s) have quantity discrepancies requiring resolution.`,
            link: `/intake/receipts/${input.receiptId}`,
            category: "order",
          });
          creatorNotified = true;
          logger.info(
            { receiptId: input.receiptId, creatorId: receipt.createdBy, discrepancyCount: discrepanciesFound.length },
            "[IntakeReceipts] Discrepancy notification sent to creator"
          );
        } catch (error) {
          logger.error(
            { error, receiptId: input.receiptId, creatorId: receipt.createdBy },
            "[IntakeReceipts] Failed to send discrepancy notification"
          );
        }
      }

      logger.info(
        { receiptId: input.receiptId, newStatus, discrepancyCount: discrepanciesFound.length },
        "[IntakeReceipts] Stacker verified receipt"
      );

      return {
        receiptId: input.receiptId,
        newStatus,
        discrepancies: discrepanciesFound,
        creatorNotified,
      };
    }),

  /**
   * Report a discrepancy for a specific item
   */
  reportDiscrepancy: protectedProcedure
    .input(z.object({
      receiptId: z.number().int().positive(),
      itemId: z.number().int().positive(),
      actualQuantity: z.number().min(0),
      notes: z.string().min(1, "Discrepancy notes are required"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      // Get receipt
      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.id, input.receiptId))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
      }

      // Get item
      const [item] = await db
        .select()
        .from(intakeReceiptItems)
        .where(
          and(
            eq(intakeReceiptItems.id, input.itemId),
            eq(intakeReceiptItems.receiptId, input.receiptId)
          )
        )
        .limit(1);

      if (!item) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found in this receipt" });
      }

      const expected = parseFloat(item.expectedQuantity);
      const actual = input.actualQuantity;
      const { difference } = calculateDiscrepancy(expected, actual);

      // Update item status
      await db
        .update(intakeReceiptItems)
        .set({
          actualQuantity: actual.toString(),
          verificationStatus: "DISCREPANCY",
          discrepancyNotes: input.notes,
        })
        .where(eq(intakeReceiptItems.id, input.itemId));

      // Create discrepancy record
      const [discrepancyResult] = await db.insert(intakeDiscrepancies).values({
        receiptId: input.receiptId,
        itemId: input.itemId,
        expectedQuantity: expected.toString(),
        actualQuantity: actual.toString(),
        difference: difference.toString(),
      });

      // Update receipt status to DISPUTED
      await db
        .update(intakeReceipts)
        .set({ status: "DISPUTED" })
        .where(eq(intakeReceipts.id, input.receiptId));

      // Notify receipt creator
      if (receipt.createdBy) {
        try {
          await sendNotification({
            userId: receipt.createdBy,
            type: "warning",
            title: `Discrepancy Reported: ${receipt.receiptNumber}`,
            message: `Item "${item.productName}" has a discrepancy of ${difference.toFixed(4)} ${item.unit}.`,
            link: `/intake/receipts/${input.receiptId}`,
            category: "order",
          });
        } catch (error) {
          logger.error(
            { error, receiptId: input.receiptId },
            "[IntakeReceipts] Failed to send discrepancy notification"
          );
        }
      }

      logger.info(
        { receiptId: input.receiptId, itemId: input.itemId, difference },
        "[IntakeReceipts] Discrepancy reported"
      );

      return {
        discrepancyId: discrepancyResult.insertId,
        expected,
        actual,
        difference,
        newReceiptStatus: "DISPUTED" as const,
      };
    }),

  /**
   * Resolve a discrepancy (admin action)
   */
  resolveDiscrepancy: protectedProcedure
    .input(z.object({
      discrepancyId: z.number().int().positive(),
      resolution: resolutionSchema,
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      // Get discrepancy
      const [discrepancy] = await db
        .select()
        .from(intakeDiscrepancies)
        .where(eq(intakeDiscrepancies.id, input.discrepancyId))
        .limit(1);

      if (!discrepancy) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Discrepancy not found" });
      }

      if (discrepancy.resolution) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Discrepancy has already been resolved",
        });
      }

      // Update discrepancy
      await db
        .update(intakeDiscrepancies)
        .set({
          resolution: input.resolution,
          resolutionNotes: input.notes,
          resolvedBy: userId,
          resolvedAt: new Date(),
        })
        .where(eq(intakeDiscrepancies.id, input.discrepancyId));

      // Update item verification status based on resolution
      const newItemStatus = input.resolution === "REJECTED" ? "DISCREPANCY" : "VERIFIED";
      await db
        .update(intakeReceiptItems)
        .set({ verificationStatus: newItemStatus })
        .where(eq(intakeReceiptItems.id, discrepancy.itemId));

      // Check if all discrepancies for this receipt are resolved
      const unresolvedDiscrepancies = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(intakeDiscrepancies)
        .where(
          and(
            eq(intakeDiscrepancies.receiptId, discrepancy.receiptId),
            sql`${intakeDiscrepancies.resolution} IS NULL`
          )
        );

      const hasUnresolved = (unresolvedDiscrepancies[0]?.count ?? 0) > 0;

      // If all resolved, update receipt status to STACKER_VERIFIED
      if (!hasUnresolved) {
        await db
          .update(intakeReceipts)
          .set({ status: "STACKER_VERIFIED" })
          .where(eq(intakeReceipts.id, discrepancy.receiptId));
      }

      logger.info(
        { discrepancyId: input.discrepancyId, resolution: input.resolution, allResolved: !hasUnresolved },
        "[IntakeReceipts] Discrepancy resolved"
      );

      return {
        discrepancyId: input.discrepancyId,
        resolution: input.resolution,
        allDiscrepanciesResolved: !hasUnresolved,
        newReceiptStatus: hasUnresolved ? "DISPUTED" : "STACKER_VERIFIED",
      };
    }),

  /**
   * Finalize receipt (complete the intake process)
   */
  finalizeReceipt: protectedProcedure
    .input(z.object({
      receiptId: z.number().int().positive(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const userId = ctx.user?.id;
      if (!userId) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "User not authenticated" });
      }

      // Get receipt
      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.id, input.receiptId))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
      }

      // Verify status allows finalization
      if (receipt.status !== "STACKER_VERIFIED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Receipt cannot be finalized from ${receipt.status} status. Must be STACKER_VERIFIED.`,
        });
      }

      // Check for unresolved discrepancies
      const unresolvedDiscrepancies = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(intakeDiscrepancies)
        .where(
          and(
            eq(intakeDiscrepancies.receiptId, input.receiptId),
            sql`${intakeDiscrepancies.resolution} IS NULL`
          )
        );

      if ((unresolvedDiscrepancies[0]?.count ?? 0) > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot finalize receipt with unresolved discrepancies",
        });
      }

      // Update notes if provided
      const updatedNotes = input.notes
        ? `${receipt.notes || ""}\nFinalization notes: ${input.notes}`.trim()
        : receipt.notes;

      // Finalize receipt
      await db
        .update(intakeReceipts)
        .set({
          status: "FINALIZED",
          finalizedAt: new Date(),
          finalizedBy: userId,
          notes: updatedNotes,
        })
        .where(eq(intakeReceipts.id, input.receiptId));

      // Notify receipt creator of finalization
      if (receipt.createdBy) {
        try {
          await sendNotification({
            userId: receipt.createdBy,
            type: "success",
            title: `Receipt Finalized: ${receipt.receiptNumber}`,
            message: "The intake receipt has been verified and finalized.",
            link: `/intake/receipts/${input.receiptId}`,
            category: "order",
          });
        } catch (error) {
          logger.error(
            { error, receiptId: input.receiptId },
            "[IntakeReceipts] Failed to send finalization notification"
          );
        }
      }

      logger.info(
        { receiptId: input.receiptId, receiptNumber: receipt.receiptNumber, finalizedBy: userId },
        "[IntakeReceipts] Receipt finalized"
      );

      return {
        receiptId: input.receiptId,
        receiptNumber: receipt.receiptNumber,
        status: "FINALIZED" as const,
        finalizedAt: new Date(),
        finalizedBy: userId,
      };
    }),

  /**
   * Get pending receipts requiring verification
   */
  getPendingVerification: protectedProcedure
    .input(z.object({
      type: z.enum(["farmer", "stacker", "admin"]).optional(),
      limit: z.number().min(1).max(100).optional().default(20),
      offset: z.number().min(0).optional().default(0),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const limit = input?.limit ?? 20;
      const offset = input?.offset ?? 0;

      // Determine which statuses to filter by based on type
      let statusFilter;
      switch (input?.type) {
        case "farmer":
          statusFilter = eq(intakeReceipts.status, "PENDING");
          break;
        case "stacker":
          statusFilter = or(
            eq(intakeReceipts.status, "PENDING"),
            eq(intakeReceipts.status, "FARMER_VERIFIED")
          );
          break;
        case "admin":
          statusFilter = eq(intakeReceipts.status, "DISPUTED");
          break;
        default:
          statusFilter = or(
            eq(intakeReceipts.status, "PENDING"),
            eq(intakeReceipts.status, "FARMER_VERIFIED"),
            eq(intakeReceipts.status, "DISPUTED")
          );
      }

      const receipts = await db
        .select({
          id: intakeReceipts.id,
          receiptNumber: intakeReceipts.receiptNumber,
          supplierId: intakeReceipts.supplierId,
          status: intakeReceipts.status,
          createdAt: intakeReceipts.createdAt,
          supplierName: clients.name,
        })
        .from(intakeReceipts)
        .leftJoin(clients, eq(intakeReceipts.supplierId, clients.id))
        .where(statusFilter)
        .orderBy(desc(intakeReceipts.createdAt))
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(intakeReceipts)
        .where(statusFilter);

      const total = countResult?.count ?? receipts.length;

      return createSafeUnifiedResponse(receipts, total, limit, offset);
    }),

  /**
   * Update receipt (before finalization)
   */
  updateReceipt: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      notes: z.string().optional(),
      supplierId: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.id, input.id))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
      }

      if (receipt.status === "FINALIZED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot update a finalized receipt",
        });
      }

      const updateData: Record<string, unknown> = {};
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.supplierId !== undefined) updateData.supplierId = input.supplierId;

      if (Object.keys(updateData).length > 0) {
        await db
          .update(intakeReceipts)
          .set(updateData)
          .where(eq(intakeReceipts.id, input.id));
      }

      return { success: true, receiptId: input.id };
    }),

  /**
   * Delete receipt (only if PENDING)
   */
  deleteReceipt: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [receipt] = await db
        .select()
        .from(intakeReceipts)
        .where(eq(intakeReceipts.id, input.id))
        .limit(1);

      if (!receipt) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Receipt not found" });
      }

      if (receipt.status !== "PENDING") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only PENDING receipts can be deleted",
        });
      }

      // Delete receipt and items in transaction to prevent orphaned records
      await withTransaction(async (tx) => {
        // Delete child records first
        await tx
          .delete(intakeReceiptItems)
          .where(eq(intakeReceiptItems.receiptId, input.id));

        // Then delete parent
        await tx
          .delete(intakeReceipts)
          .where(eq(intakeReceipts.id, input.id));
      });

      logger.info(
        { receiptId: input.id, receiptNumber: receipt.receiptNumber },
        "[IntakeReceipts] Receipt deleted"
      );

      return { success: true };
    }),
});
