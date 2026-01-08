/**
 * Warehouse Transfers Router
 * API endpoints for transferring inventory between warehouse locations
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { batchLocations, inventoryMovements } from "../../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

export const warehouseTransfersRouter = router({
  // Transfer batch quantity between locations
  transfer: protectedProcedure
    .use(requirePermission("inventory:transfer"))
    .input(
      z.object({
        batchId: z.number(),
        fromLocationId: z.number().optional(),
        toSite: z.string(),
        toZone: z.string().optional(),
        toRack: z.string().optional(),
        toShelf: z.string().optional(),
        toBin: z.string().optional(),
        quantity: z.string(),
        notes: z.string().optional(),
        performedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Wrap in transaction for atomicity
      const result = await db.transaction(async (tx) => {
        // If fromLocationId provided, reduce quantity from that location
        if (input.fromLocationId) {
          const [fromLocation] = await tx
            .select()
            .from(batchLocations)
            .where(eq(batchLocations.id, input.fromLocationId))
            .for("update"); // Row-level lock

          if (!fromLocation) {
            throw new Error("Source location not found");
          }

          const currentQty = parseFloat(fromLocation.qty);
          const transferQty = parseFloat(input.quantity);

          if (currentQty < transferQty) {
            throw new Error("Insufficient quantity at source location");
          }

          const newQty = currentQty - transferQty;

          if (newQty === 0) {
            // Remove location record if quantity is zero
            await tx.delete(batchLocations).where(eq(batchLocations.id, input.fromLocationId));
          } else {
            // Update quantity
            await tx
              .update(batchLocations)
              .set({ qty: newQty.toString() })
              .where(eq(batchLocations.id, input.fromLocationId));
          }
        }

        // Check if destination location already exists for this batch
        const [existingToLocation] = await tx
          .select()
          .from(batchLocations)
          .where(
            and(
              eq(batchLocations.batchId, input.batchId),
              eq(batchLocations.site, input.toSite),
              input.toZone ? eq(batchLocations.zone, input.toZone) : sql`${batchLocations.zone} IS NULL`,
              input.toRack ? eq(batchLocations.rack, input.toRack) : sql`${batchLocations.rack} IS NULL`,
              input.toShelf ? eq(batchLocations.shelf, input.toShelf) : sql`${batchLocations.shelf} IS NULL`,
              input.toBin ? eq(batchLocations.bin, input.toBin) : sql`${batchLocations.bin} IS NULL`
            )
          )
          .for("update");

        if (existingToLocation) {
          // Add to existing location
          const currentQty = parseFloat(existingToLocation.qty);
          const transferQty = parseFloat(input.quantity);
          const newQty = currentQty + transferQty;

          await tx
            .update(batchLocations)
            .set({ qty: newQty.toString() })
            .where(eq(batchLocations.id, existingToLocation.id));
        } else {
          // Create new location record
          await tx.insert(batchLocations).values({
            batchId: input.batchId,
            site: input.toSite,
            zone: input.toZone,
            rack: input.toRack,
            shelf: input.toShelf,
            bin: input.toBin,
            qty: input.quantity,
          });
        }

        // Record inventory movement for tracking
        await tx.insert(inventoryMovements).values({
          batchId: input.batchId,
          inventoryMovementType: "TRANSFER",
          quantityChange: `0`, // Net change is zero (just moving location)
          quantityBefore: "0", // Not applicable for transfers
          quantityAfter: "0", // Not applicable for transfers
          referenceType: "WAREHOUSE_TRANSFER",
          referenceId: null,
          reason: input.notes || `Transfer to ${input.toSite}${input.toZone ? `/${input.toZone}` : ""}${input.toRack ? `/${input.toRack}` : ""}${input.toShelf ? `/${input.toShelf}` : ""}${input.toBin ? `/${input.toBin}` : ""}`,
          performedBy: input.performedBy,
        });

        return { success: true };
      });

      return result;
    }),

  // Get transfer history for a batch
  getTransferHistory: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const transfers = await db
        .select()
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.batchId, input.batchId),
            eq(inventoryMovements.inventoryMovementType, "TRANSFER")
          )
        )
        .orderBy(desc(inventoryMovements.createdAt));

      return transfers;
    }),

  // Get current locations for a batch
  getBatchLocations: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const locations = await db
        .select()
        .from(batchLocations)
        .where(eq(batchLocations.batchId, input.batchId))
        .orderBy(batchLocations.site, batchLocations.zone, batchLocations.rack);

      return locations;
    }),

  // Get transfer statistics
  getStats: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const stats = await db
      .select({
        totalTransfers: sql<number>`COUNT(*)`,
        recentTransfers: sql<number>`SUM(CASE WHEN ${inventoryMovements.createdAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END)`,
      })
      .from(inventoryMovements)
      .where(eq(inventoryMovements.inventoryMovementType, "TRANSFER"));

    return stats[0] || {
      totalTransfers: 0,
      recentTransfers: 0,
    };
  }),
});
