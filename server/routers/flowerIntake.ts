/**
 * WS-007: Flower Intake Router
 * Handles complex flower intake with branching logic for value application
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../trpc";
import { db } from "../db";
import { batches, clients, journalEntries, journalEntryLines, users } from "../../drizzle/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

// Intake type enum
const intakeTypeEnum = z.enum(['PURCHASE', 'CLIENT_DROPOFF', 'CONSIGNMENT', 'OTHER']);

export const flowerIntakeRouter = router({
  /**
   * Flower intake with flow selection
   * Supports both "Apply Value Now" and "Add to Inventory Only" flows
   */
  create: adminProcedure
    .input(z.object({
      // Standard intake fields
      productId: z.number(),
      strain: z.string(),
      quantity: z.number(),
      unit: z.string(),
      locationId: z.number().optional(),
      
      // Flow selection
      intakeType: intakeTypeEnum,
      dropoffClientId: z.number().optional(), // Required if CLIENT_DROPOFF
      
      // Option A: Apply value now
      applyValueNow: z.boolean().default(false),
      valuePerUnit: z.number().optional(),
      totalValue: z.number().optional(),
      
      // Common
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate client is provided for CLIENT_DROPOFF
      if (input.intakeType === 'CLIENT_DROPOFF' && !input.dropoffClientId) {
        throw new Error('Client is required for client drop-off intake');
      }

      // Calculate total value if applying now
      let calculatedValue = 0;
      if (input.applyValueNow) {
        if (input.totalValue) {
          calculatedValue = input.totalValue;
        } else if (input.valuePerUnit) {
          calculatedValue = input.valuePerUnit * input.quantity;
        } else {
          throw new Error('Value is required when applying value now');
        }
      }

      // Generate batch number
      const batchNumber = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

      // Create batch record
      const [newBatch] = await db.insert(batches).values({
        batchNumber,
        productId: input.productId,
        strain: input.strain,
        quantity: String(input.quantity),
        unit: input.unit,
        locationId: input.locationId,
        intakeType: input.intakeType,
        dropoffClientId: input.dropoffClientId,
        isPendingValuation: !input.applyValueNow && input.intakeType === 'CLIENT_DROPOFF',
        originalIntakeValue: input.applyValueNow ? String(calculatedValue) : null,
        valuedAt: input.applyValueNow ? new Date() : null,
        valuedBy: input.applyValueNow ? ctx.user.id : null,
        notes: input.notes,
        createdBy: ctx.user.id,
        batchStatus: 'LIVE',
      });

      let journalEntryId: number | undefined;
      let newClientBalance: number | undefined;

      // If applying value now, create journal entry and update client tab
      if (input.applyValueNow && input.dropoffClientId) {
        // Get current client balance
        const [client] = await db
          .select({ totalOwed: clients.totalOwed })
          .from(clients)
          .where(eq(clients.id, input.dropoffClientId));

        const currentBalance = parseFloat(client?.totalOwed as string || '0');
        newClientBalance = currentBalance - calculatedValue;

        // Update client balance
        await db
          .update(clients)
          .set({ totalOwed: String(newClientBalance) })
          .where(eq(clients.id, input.dropoffClientId));

        // Create journal entry
        const [je] = await db.insert(journalEntries).values({
          entryNumber: `JE-INTAKE-${Date.now()}`,
          entryDate: new Date(),
          description: `Flower intake from client - ${input.strain} (${input.quantity} ${input.unit})`,
          status: 'POSTED',
          createdBy: ctx.user.id,
        });

        journalEntryId = je.insertId;

        // Create journal entry lines (Debit Inventory, Credit AR)
        await db.insert(journalEntryLines).values([
          {
            journalEntryId: journalEntryId,
            accountCode: '1400', // Inventory
            description: `Inventory - ${input.strain}`,
            debit: String(calculatedValue),
            credit: '0',
          },
          {
            journalEntryId: journalEntryId,
            accountCode: '1200', // Accounts Receivable
            description: `AR Credit - Client flower drop-off`,
            debit: '0',
            credit: String(calculatedValue),
          },
        ]);
      }

      return {
        batchId: newBatch.insertId,
        batchNumber,
        isPendingValuation: !input.applyValueNow && input.intakeType === 'CLIENT_DROPOFF',
        tabCreditApplied: input.applyValueNow ? calculatedValue : undefined,
        newClientBalance,
        journalEntryId,
      };
    }),

  /**
   * Get pending valuations
   */
  getPendingValuations: adminProcedure
    .input(z.object({
      clientId: z.number().optional(),
      olderThanDays: z.number().optional(),
    }))
    .query(async ({ input }) => {
      let query = db
        .select({
          batchId: batches.id,
          batchNumber: batches.batchNumber,
          productId: batches.productId,
          strain: batches.strain,
          quantity: batches.quantity,
          unit: batches.unit,
          clientId: batches.dropoffClientId,
          clientName: clients.name,
          intakeDate: batches.createdAt,
        })
        .from(batches)
        .leftJoin(clients, eq(batches.dropoffClientId, clients.id))
        .where(eq(batches.isPendingValuation, true))
        .orderBy(desc(batches.createdAt));

      const results = await query;

      return results.map(r => {
        const intakeDate = r.intakeDate || new Date();
        const daysPending = Math.floor((Date.now() - intakeDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          batchId: r.batchId,
          batchNumber: r.batchNumber,
          productId: r.productId,
          strain: r.strain || 'Unknown',
          quantity: parseFloat(r.quantity as string),
          unit: r.unit || 'EA',
          clientId: r.clientId || 0,
          clientName: r.clientName || 'Unknown',
          intakeDate,
          daysPending,
        };
      });
    }),

  /**
   * Apply valuation to pending batch
   */
  applyValuation: adminProcedure
    .input(z.object({
      batchId: z.number(),
      valuePerUnit: z.number().optional(),
      totalValue: z.number().optional(),
      applyToClientTab: z.boolean().default(true),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get batch details
      const [batch] = await db
        .select()
        .from(batches)
        .where(eq(batches.id, input.batchId));

      if (!batch) {
        throw new Error('Batch not found');
      }

      if (!batch.isPendingValuation) {
        throw new Error('Batch is not pending valuation');
      }

      // Calculate value
      const quantity = parseFloat(batch.quantity as string);
      let calculatedValue = 0;
      if (input.totalValue) {
        calculatedValue = input.totalValue;
      } else if (input.valuePerUnit) {
        calculatedValue = input.valuePerUnit * quantity;
      } else {
        throw new Error('Value is required');
      }

      // Update batch
      await db
        .update(batches)
        .set({
          isPendingValuation: false,
          originalIntakeValue: String(calculatedValue),
          valuedAt: new Date(),
          valuedBy: ctx.user.id,
          valuationNotes: input.notes,
        })
        .where(eq(batches.id, input.batchId));

      let newClientBalance = 0;
      let journalEntryId = 0;

      // Apply to client tab if requested
      if (input.applyToClientTab && batch.dropoffClientId) {
        // Get current client balance
        const [client] = await db
          .select({ totalOwed: clients.totalOwed })
          .from(clients)
          .where(eq(clients.id, batch.dropoffClientId));

        const currentBalance = parseFloat(client?.totalOwed as string || '0');
        newClientBalance = currentBalance - calculatedValue;

        // Update client balance
        await db
          .update(clients)
          .set({ totalOwed: String(newClientBalance) })
          .where(eq(clients.id, batch.dropoffClientId));

        // Create journal entry
        const [je] = await db.insert(journalEntries).values({
          entryNumber: `JE-VAL-${Date.now()}`,
          entryDate: new Date(),
          description: `Valuation applied - ${batch.strain} (${quantity} ${batch.unit})`,
          status: 'POSTED',
          createdBy: ctx.user.id,
        });

        journalEntryId = je.insertId;

        // Create journal entry lines
        await db.insert(journalEntryLines).values([
          {
            journalEntryId,
            accountCode: '1400', // Inventory
            description: `Inventory - ${batch.strain}`,
            debit: String(calculatedValue),
            credit: '0',
          },
          {
            journalEntryId,
            accountCode: '1200', // Accounts Receivable
            description: `AR Credit - Deferred flower valuation`,
            debit: '0',
            credit: String(calculatedValue),
          },
        ]);
      }

      return {
        success: true,
        tabCreditApplied: calculatedValue,
        newClientBalance,
        journalEntryId,
      };
    }),

  /**
   * Preview tab balance change
   */
  previewBalance: publicProcedure
    .input(z.object({
      clientId: z.number(),
      value: z.number(),
    }))
    .query(async ({ input }) => {
      const [client] = await db
        .select({ totalOwed: clients.totalOwed })
        .from(clients)
        .where(eq(clients.id, input.clientId));

      const currentBalance = parseFloat(client?.totalOwed as string || '0');
      const projectedBalance = currentBalance - input.value;

      return {
        currentBalance,
        creditAmount: input.value,
        projectedBalance,
      };
    }),

  /**
   * Get pending valuation stats for dashboard
   */
  getStats: adminProcedure.query(async () => {
    const results = await db
      .select({
        count: sql<number>`COUNT(*)`,
        totalQuantity: sql<number>`SUM(CAST(${batches.quantity} AS DECIMAL))`,
      })
      .from(batches)
      .where(eq(batches.isPendingValuation, true));

    const oldestPending = await db
      .select({ createdAt: batches.createdAt })
      .from(batches)
      .where(eq(batches.isPendingValuation, true))
      .orderBy(batches.createdAt)
      .limit(1);

    const oldestDays = oldestPending.length > 0 && oldestPending[0].createdAt
      ? Math.floor((Date.now() - oldestPending[0].createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 0;

    return {
      pendingCount: results[0]?.count || 0,
      totalQuantity: results[0]?.totalQuantity || 0,
      oldestPendingDays: oldestDays,
    };
  }),
});
