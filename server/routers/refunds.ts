/**
 * Refunds Router
 * API endpoints for processing refunds on returns
 */

import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { transactions, transactionLinks, returns } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

export const refundsRouter = router({
  // Get all refunds
  getAll: publicProcedure
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
          date: transactions.date,
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
        .orderBy(desc(transactions.date))
        .limit(limit)
        .offset(offset);

      return refunds;
    }),

  // Get refund by ID
  getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
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
  create: publicProcedure
    .input(
      z.object({
        returnId: z.number(),
        originalTransactionId: z.number(),
        amount: z.string(),
        paymentMethod: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]),
        notes: z.string().optional(),
        createdBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
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

        // Create refund transaction
        const [refundTx] = await tx.insert(transactions).values({
          type: "REFUND",
          amount: `-${input.amount}`, // Negative for refund
          date: new Date(),
          paymentMethod: input.paymentMethod,
          notes: input.notes || `Refund for return #${input.returnId}`,
          createdBy: input.createdBy,
        });

        // Link refund to original transaction
        await tx.insert(transactionLinks).values({
          parentTransactionId: input.originalTransactionId,
          childTransactionId: refundTx.insertId,
          linkType: "REFUND_OF",
          linkAmount: input.amount,
          notes: `Refund for return #${input.returnId}`,
          createdBy: input.createdBy,
        });

        return { id: refundTx.insertId };
      });

      return result;
    }),

  // Get refunds for a specific return
  getByReturn: publicProcedure.input(z.object({ returnId: z.number() })).query(async ({ input }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Find transactions with notes mentioning this return ID
    const refunds = await db
      .select({
        id: transactions.id,
        amount: transactions.amount,
        date: transactions.date,
        paymentMethod: transactions.paymentMethod,
        notes: transactions.notes,
        createdBy: transactions.createdBy,
        createdAt: transactions.createdAt,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.type, "REFUND"),
          sql`${transactions.notes} LIKE ${`%return #${input.returnId}%`}`
        )
      )
      .orderBy(desc(transactions.date));

    return refunds;
  }),

  // Get refunds for a specific original transaction
  getByOriginalTransaction: publicProcedure
    .input(z.object({ transactionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const refunds = await db
        .select({
          id: transactions.id,
          amount: transactions.amount,
          date: transactions.date,
          paymentMethod: transactions.paymentMethod,
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
        .orderBy(desc(transactions.date));

      return refunds;
    }),

  // Get refund statistics
  getStats: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const stats = await db
      .select({
        totalRefunds: sql<number>`COUNT(*)`,
        totalAmount: sql<string>`SUM(ABS(CAST(${transactions.amount} AS DECIMAL(15,2))))`,
        cashRefunds: sql<number>`SUM(CASE WHEN ${transactions.paymentMethod} = 'CASH' THEN 1 ELSE 0 END)`,
        cardRefunds: sql<number>`SUM(CASE WHEN ${transactions.paymentMethod} IN ('CREDIT_CARD', 'DEBIT_CARD') THEN 1 ELSE 0 END)`,
      })
      .from(transactions)
      .where(eq(transactions.type, "REFUND"));

    return stats[0] || {
      totalRefunds: 0,
      totalAmount: "0.00",
      cashRefunds: 0,
      cardRefunds: 0,
    };
  }),
});
