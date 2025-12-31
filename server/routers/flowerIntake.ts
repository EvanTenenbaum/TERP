/**
 * WS-007: Flower Intake Router
 * Handles complex flower intake with branching logic for value application
 * 
 * Note: This router works with the existing batches schema structure.
 * Intake-specific fields are stored in the metadata JSON field.
 */

import { z } from "zod";
import { router, adminProcedure, publicProcedure } from "../_core/trpc";
import { db } from "../db";
import { batches, clients, products, lots, users } from "../../drizzle/schema";
import { eq, and, desc, sql, isNull } from "drizzle-orm";

// Intake type enum
const intakeTypeEnum = z.enum(['PURCHASE', 'CLIENT_DROPOFF', 'CONSIGNMENT', 'OTHER']);

// Interface for intake metadata stored in batches.metadata
interface IntakeMetadata {
  intakeType?: string;
  dropoffClientId?: number;
  isPendingValuation?: boolean;
  originalIntakeValue?: number;
  valuedAt?: string;
  valuedBy?: number;
  valuationNotes?: string;
  intakeNotes?: string;
}

// Helper to parse metadata
function parseMetadata(metadata: string | null): IntakeMetadata {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
  }
}

// Helper to stringify metadata
function stringifyMetadata(metadata: IntakeMetadata): string {
  return JSON.stringify(metadata);
}

export const flowerIntakeRouter = router({
  /**
   * Flower intake with flow selection
   * Supports both "Apply Value Now" and "Add to Inventory Only" flows
   */
  create: adminProcedure
    .input(z.object({
      // Standard intake fields
      productId: z.number(),
      lotId: z.number(),
      quantity: z.number(),
      
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

      // Generate batch code
      const batchCode = `BATCH-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
      const sku = `SKU-${Date.now()}`;

      // Build metadata
      const metadata: IntakeMetadata = {
        intakeType: input.intakeType,
        dropoffClientId: input.dropoffClientId,
        isPendingValuation: !input.applyValueNow && input.intakeType === 'CLIENT_DROPOFF',
        originalIntakeValue: input.applyValueNow ? calculatedValue : undefined,
        valuedAt: input.applyValueNow ? new Date().toISOString() : undefined,
        valuedBy: input.applyValueNow ? ctx.user.id : undefined,
        intakeNotes: input.notes,
      };

      // Create batch record
      const [newBatch] = await db.insert(batches).values({
        code: batchCode,
        sku,
        productId: input.productId,
        lotId: input.lotId,
        cogsMode: 'FIXED',
        paymentTerms: 'COD',
        onHandQty: String(input.quantity),
        batchStatus: 'LIVE',
        metadata: stringifyMetadata(metadata),
      });

      let newClientBalance: number | undefined;

      // If applying value now, update client tab
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
      }

      return {
        batchId: newBatch.insertId,
        batchCode,
        isPendingValuation: !input.applyValueNow && input.intakeType === 'CLIENT_DROPOFF',
        tabCreditApplied: input.applyValueNow ? calculatedValue : undefined,
        newClientBalance,
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
      // Get all batches and filter by metadata
      const allBatches = await db
        .select({
          id: batches.id,
          code: batches.code,
          productId: batches.productId,
          onHandQty: batches.onHandQty,
          metadata: batches.metadata,
          createdAt: batches.createdAt,
        })
        .from(batches)
        .where(isNull(batches.deletedAt))
        .orderBy(desc(batches.createdAt));

      // Filter by pending valuation in metadata
      const pendingBatches = allBatches.filter(b => {
        const meta = parseMetadata(b.metadata);
        if (!meta.isPendingValuation) return false;
        if (input.clientId && meta.dropoffClientId !== input.clientId) return false;
        return true;
      });

      // Get client names for the results
      const results = await Promise.all(pendingBatches.map(async (b) => {
        const meta = parseMetadata(b.metadata);
        let clientName = 'Unknown';
        
        if (meta.dropoffClientId) {
          const [client] = await db
            .select({ name: clients.name })
            .from(clients)
            .where(eq(clients.id, meta.dropoffClientId));
          clientName = client?.name || 'Unknown';
        }

        // Get product info
        const [product] = await db
          .select({ name: products.name })
          .from(products)
          .where(eq(products.id, b.productId));

        const intakeDate = b.createdAt || new Date();
        const daysPending = Math.floor((Date.now() - intakeDate.getTime()) / (1000 * 60 * 60 * 24));
        
        return {
          batchId: b.id,
          batchCode: b.code,
          productId: b.productId,
          productName: product?.name || 'Unknown',
          quantity: parseFloat(b.onHandQty || '0'),
          clientId: meta.dropoffClientId || 0,
          clientName,
          intakeDate,
          daysPending,
        };
      }));

      // Filter by age if specified
      if (input.olderThanDays) {
        return results.filter(r => r.daysPending >= input.olderThanDays!);
      }

      return results;
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

      const meta = parseMetadata(batch.metadata);

      if (!meta.isPendingValuation) {
        throw new Error('Batch is not pending valuation');
      }

      // Calculate value
      const quantity = parseFloat(batch.onHandQty || '0');
      let calculatedValue = 0;
      if (input.totalValue) {
        calculatedValue = input.totalValue;
      } else if (input.valuePerUnit) {
        calculatedValue = input.valuePerUnit * quantity;
      } else {
        throw new Error('Value is required');
      }

      // Update metadata
      meta.isPendingValuation = false;
      meta.originalIntakeValue = calculatedValue;
      meta.valuedAt = new Date().toISOString();
      meta.valuedBy = ctx.user.id;
      meta.valuationNotes = input.notes;

      // Update batch
      await db
        .update(batches)
        .set({
          metadata: stringifyMetadata(meta),
        })
        .where(eq(batches.id, input.batchId));

      let newClientBalance = 0;

      // Apply to client tab if requested
      if (input.applyToClientTab && meta.dropoffClientId) {
        // Get current client balance
        const [client] = await db
          .select({ totalOwed: clients.totalOwed })
          .from(clients)
          .where(eq(clients.id, meta.dropoffClientId));

        const currentBalance = parseFloat(client?.totalOwed as string || '0');
        newClientBalance = currentBalance - calculatedValue;

        // Update client balance
        await db
          .update(clients)
          .set({ totalOwed: String(newClientBalance) })
          .where(eq(clients.id, meta.dropoffClientId));
      }

      return {
        success: true,
        tabCreditApplied: calculatedValue,
        newClientBalance,
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
    // Get all batches and filter by metadata
    const allBatches = await db
      .select({
        onHandQty: batches.onHandQty,
        metadata: batches.metadata,
        createdAt: batches.createdAt,
      })
      .from(batches)
      .where(isNull(batches.deletedAt));

    // Filter by pending valuation
    const pendingBatches = allBatches.filter(b => {
      const meta = parseMetadata(b.metadata);
      return meta.isPendingValuation === true;
    });

    const totalQuantity = pendingBatches.reduce(
      (sum, b) => sum + parseFloat(b.onHandQty || '0'),
      0
    );

    // Find oldest pending
    let oldestDays = 0;
    if (pendingBatches.length > 0) {
      const oldest = pendingBatches.reduce((oldest, b) => {
        if (!b.createdAt) return oldest;
        if (!oldest.createdAt) return b;
        return b.createdAt < oldest.createdAt ? b : oldest;
      }, pendingBatches[0]);

      if (oldest.createdAt) {
        oldestDays = Math.floor((Date.now() - oldest.createdAt.getTime()) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      pendingCount: pendingBatches.length,
      totalQuantity,
      oldestPendingDays: oldestDays,
    };
  }),
});
