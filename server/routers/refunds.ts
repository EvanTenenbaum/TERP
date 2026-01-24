/**
 * Refunds Router
 * API endpoints for processing refunds on returns
 */

import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { getDb } from "../db";
import { transactions, transactionLinks, returns } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

export const refundsRouter = router({
  // Get all refunds
  getAll: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z
        .object({
          limit: z.number().min(1).max(1000).default(100),
          offset: z.number().min(0).default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const limit = input?.limit ?? 100;
      const offset = input?.offset ?? 0;

      // Get all refund transactions via transaction links
      const refunds = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          date: transactions.transactionDate,
          notes: transactions.notes,
          createdBy: transactions.createdBy,
          createdAt: transactions.createdAt,
          originalTransactionId: transactionLinks.parentTransactionId,
          transactionLinkType: transactionLinks.transactionLinkType,
        })
        .from(transactions)
        .innerJoin(
          transactionLinks,
          eq(transactions.id, transactionLinks.childTransactionId)
        )
        .where(eq(transactionLinks.transactionLinkType, "REFUND_OF"))
        .orderBy(desc(transactions.transactionDate))
        .limit(limit)
        .offset(offset);

      return refunds;
    }),

  // Get refund by ID
  getById: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [transaction] = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, input.id));

      if (!transaction) {
        throw new Error("Refund transaction not found");
      }

      // Get the link to original transaction
      const [link] = await db
        .select()
        .from(transactionLinks)
        .where(
          and(
            eq(transactionLinks.childTransactionId, input.id),
            eq(transactionLinks.transactionLinkType, "REFUND_OF")
          )
        );

      return {
        ...transaction,
        originalTransactionId: link?.parentTransactionId,
      };
    }),

  // Process a refund for a return
  // SECURITY: createdBy is derived from authenticated context, not from input
  create: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        returnId: z.number(),
        originalTransactionId: z.number(),
        amount: z.string(),
        paymentMethod: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const createdBy = getAuthenticatedUserId(ctx);
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Wrap in transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // Verify return exists
        const [returnRecord] = await tx
          .select()
          .from(returns)
          .where(eq(returns.id, input.returnId));

        if (!returnRecord) {
          throw new Error("Return not found");
        }

        // Verify original transaction exists
        const [originalTx] = await tx
          .select()
          .from(transactions)
          .where(eq(transactions.id, input.originalTransactionId));

        if (!originalTx) {
          throw new Error("Original transaction not found");
        }

        // Check for duplicate refund for this return
        // Look for existing refund transactions that mention this return ID
        const existingRefundsForReturn = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(
            and(
              eq(transactions.transactionType, "REFUND"),
              sql`${transactions.notes} LIKE ${`%return #${input.returnId}%`}`
            )
          )
          .limit(1);

        if (existingRefundsForReturn.length > 0) {
          throw new Error(
            `A refund already exists for return #${input.returnId}. ` +
            `Duplicate refunds are not allowed. Existing refund ID: ${existingRefundsForReturn[0].id}`
          );
        }

        // Check for duplicate refund for the same original transaction
        const existingRefundsForTransaction = await tx
          .select({ id: transactionLinks.childTransactionId })
          .from(transactionLinks)
          .where(
            and(
              eq(transactionLinks.parentTransactionId, input.originalTransactionId),
              eq(transactionLinks.transactionLinkType, "REFUND_OF")
            )
          )
          .limit(1);

        if (existingRefundsForTransaction.length > 0) {
          throw new Error(
            `A refund already exists for transaction #${input.originalTransactionId}. ` +
            `Duplicate refunds are not allowed. Existing refund ID: ${existingRefundsForTransaction[0].id}`
          );
        }

        // Create refund transaction
        const txNumber = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const [refundTx] = await tx.insert(transactions).values({
          transactionNumber: txNumber,
          transactionType: "REFUND",
          clientId: originalTx.clientId,
          amount: `-${input.amount}`, // Negative for refund
          transactionDate: new Date(),
          transactionStatus: "COMPLETED",
          notes: input.notes || `Refund for return #${input.returnId}`,
          createdBy,
        });

        // Link refund to original transaction
        await tx.insert(transactionLinks).values({
          parentTransactionId: input.originalTransactionId,
          childTransactionId: refundTx.insertId,
          transactionLinkType: "REFUND_OF",
          linkAmount: input.amount.toString(),
          notes: `Refund for return #${input.returnId}`,
          createdBy,
        });

        return { id: refundTx.insertId };
      });

      return result;
    }),

  // Get refunds for a specific return
  getByReturn: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ returnId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Find transactions with notes mentioning this return ID
      const refunds = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          date: transactions.transactionDate,
          metadata: transactions.metadata,
          notes: transactions.notes,
          createdBy: transactions.createdBy,
          createdAt: transactions.createdAt,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.transactionType, "REFUND"),
            sql`${transactions.notes} LIKE ${`%return #${input.returnId}%`}`
          )
        )
        .orderBy(desc(transactions.transactionDate));

      return refunds;
    }),

  // Get refunds for a specific original transaction
  getByOriginalTransaction: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ transactionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const refunds = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          date: transactions.transactionDate,
          metadata: transactions.metadata,
          notes: transactions.notes,
          createdBy: transactions.createdBy,
          createdAt: transactions.createdAt,
          linkAmount: transactionLinks.linkAmount,
        })
        .from(transactions)
        .innerJoin(
          transactionLinks,
          eq(transactions.id, transactionLinks.childTransactionId)
        )
        .where(
          and(
            eq(transactionLinks.parentTransactionId, input.transactionId),
            eq(transactionLinks.transactionLinkType, "REFUND_OF")
          )
        )
        .orderBy(desc(transactions.transactionDate));

      return refunds;
    }),

  // Get refund statistics
  getStats: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const stats = await db
        .select({
          totalRefunds: sql<number>`COUNT(*)`,
          totalAmount: sql<string>`SUM(ABS(CAST(${transactions.amount} AS DECIMAL(15,2))))`,
        })
        .from(transactions)
        .where(eq(transactions.transactionType, "REFUND"));

      return stats[0] || {
        totalRefunds: 0,
        totalAmount: "0.00",
      };
    }),
});
