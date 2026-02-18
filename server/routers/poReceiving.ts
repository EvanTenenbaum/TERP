/**
 * PO Receiving Router
 * API endpoints for receiving purchase orders and updating inventory
 */

import { z } from "zod";
import {
  protectedProcedure,
  router,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { getDb } from "../db";
import {
  purchaseOrders,
  purchaseOrderItems,
  batches,
  inventoryMovements,
  intakeSessions,
  products,
  clients,
  lots,
  batchLocations,
  locations,
} from "../../drizzle/schema";
import { eq, and, desc, sql, or, isNull } from "drizzle-orm";
import { logger } from "../_core/logger";
import { TRPCError } from "@trpc/server";

export const poReceivingRouter = router({
  // Receive a purchase order (create intake session and update inventory)
  receive: protectedProcedure
    .input(
      z.object({
        poId: z.number(),
        receivedItems: z.array(
          z.object({
            poItemId: z.number(),
            receivedQuantity: z.string(),
            batchId: z.number().optional(), // If receiving into existing batch
            newBatchData: z
              .object({
                // If creating new batch
                productId: z.number(),
                lotCode: z.string(),
                costPerUnit: z.string(),
              })
              .optional(),
          })
        ),
        receivedBy: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Wrap in transaction for atomicity
      const result = await db.transaction(async tx => {
        // Verify PO exists
        const [po] = await tx
          .select()
          .from(purchaseOrders)
          .where(eq(purchaseOrders.id, input.poId))
          .for("update");

        if (!po) {
          throw new Error("Purchase order not found");
        }

        // Create intake session for this receipt
        const sessionNumber = `IS-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const validPaymentTerms = [
          "COD",
          "NET_7",
          "NET_15",
          "NET_30",
          "CONSIGNMENT",
          "PARTIAL",
        ] as const;
        const paymentTermsValue = validPaymentTerms.includes(
          po.paymentTerms as (typeof validPaymentTerms)[number]
        )
          ? (po.paymentTerms as (typeof validPaymentTerms)[number])
          : "NET_30";
        // TER-97: po.vendorId is now nullable; fall back to supplierClientId (same clients.id space)
        const receivingVendorId = po.vendorId ?? po.supplierClientId;
        if (!receivingVendorId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `PO #${po.poNumber} has no vendorId or supplierClientId — cannot receive`,
          });
        }
        const [intakeSession] = await tx.insert(intakeSessions).values({
          sessionNumber,
          vendorId: receivingVendorId,
          receiveDate: new Date(),
          status: "COMPLETED",
          internalNotes: input.notes || `Receiving PO #${po.poNumber}`,
          receivedBy: input.receivedBy,
          paymentTerms: paymentTermsValue,
        });

        const intakeSessionId = intakeSession.insertId;

        // Process each received item
        for (const item of input.receivedItems) {
          let batchId = item.batchId;

          // Create new batch if needed
          if (!batchId && item.newBatchData) {
            const batchCode = `B-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const batchSku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            const receivedQty = parseFloat(item.receivedQuantity);

            const [newBatch] = await tx.insert(batches).values({
              code: batchCode,
              sku: batchSku,
              productId: item.newBatchData.productId,
              lotId: 1, // Default lot ID - will be updated with proper lot in enhanced flow
              onHandQty: item.receivedQuantity.toString(),
              reservedQty: "0",
              quarantineQty: "0",
              holdQty: "0",
              defectiveQty: "0",
              sampleQty: "0",
              unitCogs: item.newBatchData.costPerUnit?.toString() || "0",
              cogsMode: "FIXED",
              paymentTerms: "NET_30",
              batchStatus: "AWAITING_INTAKE",
            });
            batchId = newBatch.insertId;

            // INV-005: Record inventory movement for new batch creation
            await tx.insert(inventoryMovements).values({
              batchId,
              inventoryMovementType: "INTAKE",
              quantityChange: `+${receivedQty}`,
              quantityBefore: "0",
              quantityAfter: receivedQty.toString(),
              referenceType: "PO_RECEIPT",
              referenceId: input.poId,
              notes: `New batch created from PO #${po.poNumber}`,
              performedBy: input.receivedBy,
            });

            logger.info({
              msg: "INV-005: Created new batch on goods receipt",
              batchId,
              batchCode,
              quantity: receivedQty,
              poId: input.poId,
            });
          } else if (batchId) {
            // Update existing batch quantity (exclude soft-deleted)
            const [batch] = await tx
              .select()
              .from(batches)
              .where(and(eq(batches.id, batchId), isNull(batches.deletedAt)))
              .for("update");

            if (!batch) {
              throw new Error(`Batch ${batchId} not found`);
            }

            const currentQty = parseFloat(batch.onHandQty || "0");
            const receivedQty = parseFloat(item.receivedQuantity);
            const newQty = currentQty + receivedQty;

            await tx
              .update(batches)
              .set({ onHandQty: newQty.toString() })
              .where(eq(batches.id, batchId));

            // Record inventory movement
            await tx.insert(inventoryMovements).values({
              batchId,
              inventoryMovementType: "INTAKE",
              quantityChange: `+${receivedQty}`,
              quantityBefore: currentQty.toString(),
              quantityAfter: newQty.toString(),
              referenceType: "PO_RECEIPT",
              referenceId: input.poId,
              notes: `Received from PO #${po.poNumber}`,
              performedBy: input.receivedBy,
            });
          }

          // Update PO item received quantity
          const [poItem] = await tx
            .select()
            .from(purchaseOrderItems)
            .where(eq(purchaseOrderItems.id, item.poItemId));

          if (poItem) {
            const currentReceived = parseFloat(poItem.quantityReceived || "0");
            const newReceived =
              currentReceived + parseFloat(item.receivedQuantity);

            await tx
              .update(purchaseOrderItems)
              .set({ quantityReceived: newReceived.toString() })
              .where(eq(purchaseOrderItems.id, item.poItemId));
          }
        }

        // Update PO status to RECEIVED if all items received
        const [poItems] = await tx
          .select({
            allReceived: sql<number>`
              SUM(CASE 
                WHEN CAST(${purchaseOrderItems.quantityReceived} AS DECIMAL(15,4)) >= CAST(${purchaseOrderItems.quantityOrdered} AS DECIMAL(15,4)) 
                THEN 1 
                ELSE 0 
              END) = COUNT(*)
            `,
          })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, input.poId));

        if (poItems && poItems.allReceived) {
          await tx
            .update(purchaseOrders)
            .set({ purchaseOrderStatus: "RECEIVED" })
            .where(eq(purchaseOrders.id, input.poId));
        } else {
          // Partially received
          await tx
            .update(purchaseOrders)
            .set({ purchaseOrderStatus: "RECEIVING" })
            .where(eq(purchaseOrders.id, input.poId));
        }

        return { intakeSessionId, success: true };
      });

      return result;
    }),

  // Get receiving history for a PO
  getReceivingHistory: protectedProcedure
    .input(z.object({ poId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const history = await db
        .select()
        .from(inventoryMovements)
        .where(
          and(
            eq(inventoryMovements.referenceType, "PO_RECEIPT"),
            eq(inventoryMovements.referenceId, input.poId),
            isNull(inventoryMovements.deletedAt)
          )
        )
        .orderBy(desc(inventoryMovements.createdAt));

      return history;
    }),

  // Get PO items with received quantities
  getPOItemsWithReceipts: protectedProcedure
    .input(z.object({ poId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const items = await db
        .select({
          id: purchaseOrderItems.id,
          productId: purchaseOrderItems.productId,
          quantityOrdered: purchaseOrderItems.quantityOrdered,
          quantityReceived: purchaseOrderItems.quantityReceived,
          unitCost: purchaseOrderItems.unitCost,
          remainingQuantity: sql<string>`
            CAST(${purchaseOrderItems.quantityOrdered} AS DECIMAL(15,4)) - 
            COALESCE(CAST(${purchaseOrderItems.quantityReceived} AS DECIMAL(15,4)), 0)
          `,
        })
        .from(purchaseOrderItems)
        .where(eq(purchaseOrderItems.purchaseOrderId, input.poId));

      return items;
    }),

  // Get receiving statistics
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const stats = await db
      .select({
        totalReceipts: sql<number>`COUNT(DISTINCT ${inventoryMovements.referenceId})`,
        recentReceipts: sql<number>`
          COUNT(DISTINCT CASE
            WHEN ${inventoryMovements.createdAt} >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            THEN ${inventoryMovements.referenceId}
          END)
        `,
      })
      .from(inventoryMovements)
      .where(
        and(
          eq(inventoryMovements.referenceType, "PO_RECEIPT"),
          isNull(inventoryMovements.deletedAt)
        )
      );

    return (
      stats[0] || {
        totalReceipts: 0,
        recentReceipts: 0,
      }
    );
  }),

  // Get purchase orders pending receiving (CONFIRMED, RECEIVING status)
  getPendingReceiving: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const pendingPOs = await db
      .select({
        id: purchaseOrders.id,
        poNumber: purchaseOrders.poNumber,
        supplierClientId: purchaseOrders.supplierClientId,
        vendorId: purchaseOrders.vendorId,
        purchaseOrderStatus: purchaseOrders.purchaseOrderStatus,
        orderDate: purchaseOrders.orderDate,
        expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
        total: purchaseOrders.total,
        notes: purchaseOrders.notes,
        confirmedAt: purchaseOrders.confirmedAt,
      })
      .from(purchaseOrders)
      .where(
        or(
          eq(purchaseOrders.purchaseOrderStatus, "CONFIRMED"),
          eq(purchaseOrders.purchaseOrderStatus, "RECEIVING")
        )
      )
      .orderBy(purchaseOrders.expectedDeliveryDate);

    // Get items for each PO
    const results = await Promise.all(
      pendingPOs.map(async po => {
        const items = await db
          .select({
            id: purchaseOrderItems.id,
            productId: purchaseOrderItems.productId,
            quantityOrdered: purchaseOrderItems.quantityOrdered,
            quantityReceived: purchaseOrderItems.quantityReceived,
            unitCost: purchaseOrderItems.unitCost,
            totalCost: purchaseOrderItems.totalCost,
            productName: products.nameCanonical,
            category: products.category,
          })
          .from(purchaseOrderItems)
          .leftJoin(
            products,
            and(
              eq(purchaseOrderItems.productId, products.id),
              isNull(products.deletedAt)
            )
          )
          .where(eq(purchaseOrderItems.purchaseOrderId, po.id));

        // Get supplier info (exclude soft-deleted)
        let supplierName = "Unknown";
        if (po.supplierClientId) {
          const [supplier] = await db
            .select({ name: clients.name })
            .from(clients)
            .where(
              and(
                eq(clients.id, po.supplierClientId),
                isNull(clients.deletedAt)
              )
            );
          supplierName = supplier?.name || "Unknown";
        }

        return {
          ...po,
          supplierName,
          items,
          itemCount: items.length,
          receivedItemCount: items.filter(
            i =>
              parseFloat(i.quantityReceived || "0") >=
              parseFloat(i.quantityOrdered)
          ).length,
        };
      })
    );

    return results;
  }),

  // Enhanced goods receiving with batch creation and location assignment
  receiveGoodsWithBatch: protectedProcedure
    .input(
      z.object({
        purchaseOrderId: z.number(),
        items: z
          .array(
            z.object({
              poItemId: z.number(),
              quantity: z.number().positive("Quantity must be greater than 0"),
              locationId: z.number().optional(),
              locationData: z
                .object({
                  site: z.string(),
                  zone: z.string().optional(),
                  rack: z.string().optional(),
                  shelf: z.string().optional(),
                  bin: z.string().optional(),
                })
                .optional(),
              lotNumber: z.string().optional(),
              expirationDate: z.string().optional(),
              notes: z.string().optional(),
            })
          )
          .min(1, "At least one item is required"),
        receivingNotes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      logger.info(
        { poId: input.purchaseOrderId, itemCount: input.items.length },
        "[Receiving] Starting goods receiving"
      );

      // Verify PO exists and is in receivable status
      const [po] = await db
        .select()
        .from(purchaseOrders)
        .where(eq(purchaseOrders.id, input.purchaseOrderId));

      if (!po) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Purchase order not found",
        });
      }

      if (!["CONFIRMED", "RECEIVING"].includes(po.purchaseOrderStatus)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Purchase order cannot be received from ${po.purchaseOrderStatus} status`,
        });
      }

      // Get PO items with product info (exclude soft-deleted products)
      const poItems = await db
        .select({
          item: purchaseOrderItems,
          product: products,
        })
        .from(purchaseOrderItems)
        .leftJoin(
          products,
          and(
            eq(purchaseOrderItems.productId, products.id),
            isNull(products.deletedAt)
          )
        )
        .where(eq(purchaseOrderItems.purchaseOrderId, input.purchaseOrderId));

      const poItemMap = new Map(poItems.map(i => [i.item.id, i]));

      const createdBatches: Array<{
        id: number;
        code: string;
        quantity: number;
      }> = [];

      // Process each received item in a transaction
      await db.transaction(async tx => {
        // Create or get lot for this receiving
        const lotCode = await generateLotCode(db);
        // TER-97: po.vendorId is now nullable; fall back to supplierClientId for legacy column
        const lotVendorId = po.vendorId ?? po.supplierClientId;
        if (!lotVendorId) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `PO #${po.poNumber} has no vendorId or supplierClientId — cannot create lot`,
          });
        }
        const [newLot] = await tx.insert(lots).values({
          code: lotCode,
          vendorId: lotVendorId,
          supplierClientId: po.supplierClientId,
          date: new Date(),
          notes: input.receivingNotes || `Receiving from PO #${po.poNumber}`,
        });
        const lotId = newLot.insertId;

        for (const item of input.items) {
          const poItemData = poItemMap.get(item.poItemId);
          if (!poItemData) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `PO item ${item.poItemId} not found`,
            });
          }

          const { item: poItem, product } = poItemData;

          // Check if receiving more than ordered
          const remainingToReceive =
            parseFloat(poItem.quantityOrdered) -
            parseFloat(poItem.quantityReceived || "0");
          if (item.quantity > remainingToReceive) {
            logger.warn(
              {
                poItemId: item.poItemId,
                ordered: poItem.quantityOrdered,
                alreadyReceived: poItem.quantityReceived,
                receiving: item.quantity,
              },
              "[Receiving] Receiving more than ordered"
            );
          }

          // Generate batch code
          const batchCode = await generateBatchCode(
            db,
            product?.nameCanonical || "BATCH"
          );
          const batchSku =
            `${product?.nameCanonical?.substring(0, 10) || "SKU"}-${Date.now()}`.replace(
              /[^a-zA-Z0-9-]/g,
              ""
            );

          // Create batch
          const [newBatch] = await tx.insert(batches).values({
            code: batchCode,
            sku: batchSku,
            productId: poItem.productId,
            lotId,
            onHandQty: item.quantity.toString(),
            sampleQty: "0",
            reservedQty: "0",
            quarantineQty: "0",
            holdQty: "0",
            defectiveQty: "0",
            unitCogs: poItem.unitCost,
            cogsMode: "FIXED",
            paymentTerms: ([
              "COD",
              "NET_7",
              "NET_15",
              "NET_30",
              "CONSIGNMENT",
              "PARTIAL",
            ].includes(po.paymentTerms ?? "")
              ? po.paymentTerms
              : "NET_30") as
              | "COD"
              | "NET_7"
              | "NET_15"
              | "NET_30"
              | "CONSIGNMENT"
              | "PARTIAL",
            batchStatus: "AWAITING_INTAKE",
            metadata: JSON.stringify({
              lotNumber: item.lotNumber,
              expirationDate: item.expirationDate,
              receivingNotes: item.notes,
              poNumber: po.poNumber,
              poItemId: item.poItemId,
            }),
          });

          const batchId = newBatch.insertId;

          // INV-005: Record inventory movement for new batch creation
          await tx.insert(inventoryMovements).values({
            batchId,
            inventoryMovementType: "INTAKE",
            quantityChange: `+${item.quantity}`,
            quantityBefore: "0",
            quantityAfter: item.quantity.toString(),
            referenceType: "PO_RECEIPT",
            referenceId: input.purchaseOrderId,
            notes: `New batch from PO #${po.poNumber}, lot ${lotCode}`,
            performedBy: getAuthenticatedUserId({ user: ctx.user }),
          });

          // Create batch location if provided
          if (item.locationId || item.locationData) {
            let locationData = item.locationData;

            // If locationId provided, get the location data (exclude soft-deleted)
            if (item.locationId) {
              const [loc] = await tx
                .select()
                .from(locations)
                .where(
                  and(
                    eq(locations.id, item.locationId),
                    isNull(locations.deletedAt)
                  )
                );
              if (loc) {
                locationData = {
                  site: loc.site,
                  zone: loc.zone || undefined,
                  rack: loc.rack || undefined,
                  shelf: loc.shelf || undefined,
                  bin: loc.bin || undefined,
                };
              }
            }

            if (locationData) {
              await tx.insert(batchLocations).values({
                batchId,
                site: locationData.site,
                zone: locationData.zone || null,
                rack: locationData.rack || null,
                shelf: locationData.shelf || null,
                bin: locationData.bin || null,
                qty: item.quantity.toString(),
              });
            }
          }

          // Update PO item received quantity
          const newReceived =
            parseFloat(poItem.quantityReceived || "0") + item.quantity;
          await tx
            .update(purchaseOrderItems)
            .set({ quantityReceived: newReceived.toString() })
            .where(eq(purchaseOrderItems.id, item.poItemId));

          // Record inventory movement
          await tx.insert(inventoryMovements).values({
            batchId,
            inventoryMovementType: "INTAKE",
            quantityChange: `+${item.quantity}`,
            quantityBefore: "0",
            quantityAfter: item.quantity.toString(),
            referenceType: "PO_RECEIPT",
            referenceId: input.purchaseOrderId,
            notes: `Received from PO #${po.poNumber}`,
            performedBy: getAuthenticatedUserId(ctx),
          });

          createdBatches.push({
            id: batchId,
            code: batchCode,
            quantity: item.quantity,
          });

          logger.info(
            { batchId, batchCode, quantity: item.quantity },
            "[Receiving] Batch created"
          );
        }

        // Update PO status based on received quantities
        const updatedItems = await tx
          .select({
            quantityOrdered: purchaseOrderItems.quantityOrdered,
            quantityReceived: purchaseOrderItems.quantityReceived,
          })
          .from(purchaseOrderItems)
          .where(eq(purchaseOrderItems.purchaseOrderId, input.purchaseOrderId));

        const allReceived = updatedItems.every(
          i =>
            parseFloat(i.quantityReceived || "0") >=
            parseFloat(i.quantityOrdered)
        );
        const anyReceived = updatedItems.some(
          i => parseFloat(i.quantityReceived || "0") > 0
        );

        const newStatus = allReceived
          ? "RECEIVED"
          : anyReceived
            ? "RECEIVING"
            : po.purchaseOrderStatus;

        await tx
          .update(purchaseOrders)
          .set({
            purchaseOrderStatus: newStatus,
            actualDeliveryDate: allReceived ? new Date() : null,
          })
          .where(eq(purchaseOrders.id, input.purchaseOrderId));

        logger.info(
          {
            poId: input.purchaseOrderId,
            newStatus,
            batchCount: createdBatches.length,
          },
          "[Receiving] Goods received"
        );
      });

      return {
        success: true,
        batches: createdBatches,
        batchCount: createdBatches.length,
      };
    }),

  // Get available locations for receiving
  getAvailableLocations: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const availableLocations = await db
      .select()
      .from(locations)
      .where(and(eq(locations.isActive, 1), isNull(locations.deletedAt)))
      .orderBy(
        locations.site,
        locations.zone,
        locations.rack,
        locations.shelf,
        locations.bin
      );

    return availableLocations.map(loc => ({
      id: loc.id,
      label: [loc.site, loc.zone, loc.rack, loc.shelf, loc.bin]
        .filter(Boolean)
        .join(" > "),
      site: loc.site,
      zone: loc.zone,
      rack: loc.rack,
      shelf: loc.shelf,
      bin: loc.bin,
    }));
  }),
});

// Helper function to generate lot code
async function generateLotCode(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>
): Promise<string> {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(lots)
    .where(sql`DATE(${lots.date}) = CURRENT_DATE`);
  const seq = String((count[0]?.count || 0) + 1).padStart(3, "0");
  return `LOT-${dateStr}-${seq}`;
}

// Helper function to generate batch code
async function generateBatchCode(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  productName: string
): Promise<string> {
  const date = new Date();
  const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(
    date.getDate()
  ).padStart(2, "0")}`;
  const prefix = productName
    .substring(0, 3)
    .toUpperCase()
    .replace(/[^A-Z]/g, "X");
  const count = await db
    .select({ count: sql<number>`count(*)` })
    .from(batches)
    .where(sql`DATE(${batches.createdAt}) = CURRENT_DATE`);
  const seq = String((count[0]?.count || 0) + 1).padStart(3, "0");
  return `${prefix}-${dateStr}-${seq}`;
}
