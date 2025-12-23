import { getDb } from "../../db";
import { eq, and, inArray, sql } from "drizzle-orm";
import { 
  liveShoppingSessions, 
  sessionCartItems, 
  SessionCartItem 
} from "../../../drizzle/schema-live-shopping";
import { batches, products } from "../../../drizzle/schema";
import { sessionPricingService } from "./sessionPricingService";
import { sessionEventManager } from "../../lib/sse/sessionEventManager";
import { financialMath } from "../../utils/financialMath";

export interface AddItemRequest {
  sessionId: number;
  batchId: number;
  quantity: number;
  addedByRole: "HOST" | "CLIENT";
}

export interface CartSummary {
  items: (SessionCartItem & {
    productName: string;
    batchCode: string;
    subtotal: string;
  })[];
  totalValue: string;
  itemCount: number;
}

/**
 * Calculate available quantity from batch inventory fields
 * Available = onHandQty - reservedQty - holdQty - quarantineQty
 */
function calculateStaticAvailableQty(batch: {
  onHandQty: string | null;
  reservedQty: string | null;
  holdQty: string | null;
  quarantineQty: string | null;
}): string {
  const onHand = batch.onHandQty || "0";
  const reserved = batch.reservedQty || "0";
  const hold = batch.holdQty || "0";
  const quarantine = batch.quarantineQty || "0";
  
  // Available = onHand - reserved - hold - quarantine
  let available = financialMath.subtract(onHand, reserved);
  available = financialMath.subtract(available, hold);
  available = financialMath.subtract(available, quarantine);
  
  return available;
}

/**
 * Get "soft hold" quantity - items in active session carts that haven't been converted to orders yet
 * This prevents overselling during concurrent live shopping sessions
 */
async function getSoftHoldQty(tx: any, batchId: number, excludeSessionId?: number): Promise<string> {
  // Build where conditions
  const conditions = [
    eq(sessionCartItems.batchId, batchId),
    inArray(liveShoppingSessions.status, ["ACTIVE", "PAUSED"]),
  ];
  
  // Optionally exclude current session (when updating own cart)
  if (excludeSessionId) {
    conditions.push(sql`${sessionCartItems.sessionId} != ${excludeSessionId}`);
  }
  
  const result = await tx
    .select({ 
      total: sql<string>`COALESCE(SUM(${sessionCartItems.quantity}), 0)` 
    })
    .from(sessionCartItems)
    .innerJoin(liveShoppingSessions, eq(sessionCartItems.sessionId, liveShoppingSessions.id))
    .where(and(...conditions));
    
  return result[0]?.total || "0";
}

/**
 * Calculate net available quantity accounting for soft holds
 */
async function calculateNetAvailableQty(
  tx: any, 
  batch: {
    onHandQty: string | null;
    reservedQty: string | null;
    holdQty: string | null;
    quarantineQty: string | null;
  },
  batchId: number,
  excludeSessionId?: number
): Promise<string> {
  const staticAvailable = calculateStaticAvailableQty(batch);
  const softHeld = await getSoftHoldQty(tx, batchId, excludeSessionId);
  return financialMath.subtract(staticAvailable, softHeld);
}

export const sessionCartService = {
  /**
   * Add an item to the session cart.
   * Uses database transaction to prevent race conditions.
   * Validates session status, inventory availability (including soft holds), and calculates real-time price.
   */
  async addItem(req: AddItemRequest): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Use transaction for atomicity
    await db.transaction(async (tx) => {
      // 1. Validate Session
      const session = await tx
        .select()
        .from(liveShoppingSessions)
        .where(eq(liveShoppingSessions.id, req.sessionId))
        .limit(1);

      if (!session.length) throw new Error("Session not found");
      if (session[0].status !== "ACTIVE" && session[0].status !== "PAUSED") {
        throw new Error(`Cannot add items to session with status: ${session[0].status}`);
      }

      // 2. Validate Inventory (Batch)
      const batch = await tx
        .select({
          id: batches.id,
          productId: batches.productId,
          code: batches.code,
          onHandQty: batches.onHandQty,
          reservedQty: batches.reservedQty,
          holdQty: batches.holdQty,
          quarantineQty: batches.quarantineQty,
        })
        .from(batches)
        .where(eq(batches.id, req.batchId))
        .limit(1);

      if (!batch.length) throw new Error("Batch not found");

      // 3. Check existing cart quantity for this batch in THIS session
      const existingItem = await tx
        .select()
        .from(sessionCartItems)
        .where(
          and(
            eq(sessionCartItems.sessionId, req.sessionId),
            eq(sessionCartItems.batchId, req.batchId)
          )
        )
        .limit(1);

      const currentOwnQty = existingItem.length ? existingItem[0].quantity : "0";
      const newTotalQty = financialMath.add(currentOwnQty, req.quantity);

      // 4. Calculate NET available (accounting for soft holds from OTHER sessions)
      // We exclude our own session since we're updating our own cart
      const netAvailable = await calculateNetAvailableQty(
        tx, 
        batch[0], 
        req.batchId, 
        req.sessionId // Exclude our session from soft hold calculation
      );

      // 5. Strict Inventory Check
      if (financialMath.gt(newTotalQty, netAvailable)) {
        throw new Error(
          `Insufficient inventory. Requested: ${newTotalQty}, Available: ${netAvailable}`
        );
      }

      // 6. Calculate Price (outside transaction is fine, read-only)
      const priceResult = await sessionPricingService.calculateEffectivePrice(
        req.sessionId,
        req.batchId,
        session[0].clientId
      );

      // 7. Update or Insert
      if (existingItem.length > 0) {
        // Update existing line item
        await tx
          .update(sessionCartItems)
          .set({
            quantity: newTotalQty,
            unitPrice: priceResult.finalPrice,
            updatedAt: new Date(),
          })
          .where(eq(sessionCartItems.id, existingItem[0].id));
      } else {
        // Insert new line item
        await tx.insert(sessionCartItems).values({
          sessionId: req.sessionId,
          batchId: req.batchId,
          productId: batch[0].productId,
          quantity: financialMath.toFixed(req.quantity, 4),
          unitPrice: priceResult.finalPrice,
          addedByRole: req.addedByRole,
        });
      }
    });

    // Emit event OUTSIDE transaction (after commit)
    await this.emitCartUpdate(req.sessionId);
  },

  /**
   * Remove an item from the cart
   */
  async removeItem(sessionId: number, cartItemId: number): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await db
      .delete(sessionCartItems)
      .where(
        and(
          eq(sessionCartItems.id, cartItemId),
          eq(sessionCartItems.sessionId, sessionId)
        )
      );

    await this.emitCartUpdate(sessionId);
  },

  /**
   * Update quantity of an existing item
   * Uses database transaction to prevent race conditions.
   */
  async updateQuantity(
    sessionId: number,
    cartItemId: number,
    newQuantity: number
  ): Promise<void> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    if (newQuantity <= 0) {
      return this.removeItem(sessionId, cartItemId);
    }

    await db.transaction(async (tx) => {
      // Get current item to find batchId
      const currentItem = await tx
        .select()
        .from(sessionCartItems)
        .where(
          and(
            eq(sessionCartItems.id, cartItemId),
            eq(sessionCartItems.sessionId, sessionId)
          )
        )
        .limit(1);

      if (!currentItem.length) throw new Error("Item not found");

      // Validate Inventory
      const batch = await tx
        .select({
          onHandQty: batches.onHandQty,
          reservedQty: batches.reservedQty,
          holdQty: batches.holdQty,
          quarantineQty: batches.quarantineQty,
        })
        .from(batches)
        .where(eq(batches.id, currentItem[0].batchId))
        .limit(1);

      // Calculate net available (excluding our own session's current hold)
      const netAvailable = await calculateNetAvailableQty(
        tx, 
        batch[0], 
        currentItem[0].batchId,
        sessionId // Exclude our session
      );

      // Check if new quantity exceeds available
      if (financialMath.gt(newQuantity, netAvailable)) {
        throw new Error(`Insufficient inventory. Max available: ${netAvailable}`);
      }

      await tx
        .update(sessionCartItems)
        .set({
          quantity: financialMath.toFixed(newQuantity, 4),
          updatedAt: new Date(),
        })
        .where(eq(sessionCartItems.id, cartItemId));
    });

    await this.emitCartUpdate(sessionId);
  },

  /**
   * Get full cart details for a session
   */
  async getCart(sessionId: number): Promise<CartSummary> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const rows = await db
      .select({
        cartItem: sessionCartItems,
        productName: products.nameCanonical,
        batchCode: batches.code,
      })
      .from(sessionCartItems)
      .innerJoin(products, eq(sessionCartItems.productId, products.id))
      .innerJoin(batches, eq(sessionCartItems.batchId, batches.id))
      .where(eq(sessionCartItems.sessionId, sessionId));

    let totalValue = "0.00";
    
    const items = rows.map((row) => {
      const subtotal = financialMath.multiply(
        row.cartItem.quantity,
        row.cartItem.unitPrice
      );
      totalValue = financialMath.add(totalValue, subtotal);

      return {
        ...row.cartItem,
        productName: row.productName,
        batchCode: row.batchCode,
        subtotal: financialMath.toFixed(subtotal),
      };
    });

    return {
      items,
      totalValue,
      itemCount: items.length,
    };
  },

  /**
   * Helper to emit cart updates via SSE
   */
  async emitCartUpdate(sessionId: number) {
    const cart = await this.getCart(sessionId);
    sessionEventManager.emitCartUpdate(sessionId, cart.items);
  }
};
