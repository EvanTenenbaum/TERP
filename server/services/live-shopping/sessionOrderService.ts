/**
 * Session Order Service (P4-T01, P4-T02)
 * Handles converting live shopping sessions to orders and generating sales sheets
 */
import { getDb } from "../../db";
import { eq } from "drizzle-orm";
import { liveShoppingSessions } from "../../../drizzle/schema-live-shopping";
import { sessionCartService } from "./sessionCartService";
import { createOrder } from "../../ordersDb";
import { saveSalesSheet } from "../../salesSheetsDb";
import { sessionCreditService } from "./sessionCreditService";
import { sessionEventManager } from "../../lib/sse/sessionEventManager";

export interface ConversionResult {
  success: boolean;
  orderId?: number;
  salesSheetId?: number;
  warnings: string[];
}

export interface ConversionOptions {
  sessionId: number;
  userId: number;
  paymentTerms?:
    | "NET_7"
    | "NET_15"
    | "NET_30"
    | "COD"
    | "PARTIAL"
    | "CONSIGNMENT";
  generateSalesSheet?: boolean;
  bypassCreditCheck?: boolean;
  internalNotes?: string;
}

export const sessionOrderService = {
  /**
   * Convert a Live Shopping Session Cart into a formal Order
   * P4-T01 Implementation
   */
  async convertSessionToOrder(
    options: ConversionOptions
  ): Promise<ConversionResult> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const warnings: string[] = [];

    // 1. Fetch Session
    const session = await db.query.liveShoppingSessions.findFirst({
      where: eq(liveShoppingSessions.id, options.sessionId),
    });

    if (!session) throw new Error("Session not found");
    if (session.status === "CONVERTED" || session.status === "ENDED") {
      throw new Error("Session is already closed");
    }

    // 2. Fetch Cart and filter to only TO_PURCHASE items
    const cart = await sessionCartService.getCart(options.sessionId);
    const purchaseItems = cart.items.filter(item => item.itemStatus === "TO_PURCHASE");
    
    if (purchaseItems.length === 0) {
      throw new Error("Cannot convert session to order: No items marked 'To Purchase'. Please mark items as 'To Purchase' before converting.");
    }

    // 3. Credit Check (Skip if bypassing)
    if (!options.bypassCreditCheck) {
      const creditResult = await sessionCreditService.validateCartCredit(
        options.sessionId,
        session.clientId
      );

      if (!creditResult.isApproved) {
        throw new Error(`Credit Validation Failed: ${creditResult.message}`);
      }

      if (creditResult.warningLevel === "APPROACHING") {
        warnings.push(creditResult.message);
      }
    }

    // 4. Prepare Order Items (only TO_PURCHASE items)
    const orderItems = purchaseItems.map((item) => ({
      batchId: item.batchId,
      quantity: parseFloat(item.quantity.toString()),
      unitPrice: parseFloat(item.unitPrice.toString()),
      isSample: item.isSample || false,
      // Pass the negotiated session price as an override to ensure it sticks
      overridePrice: parseFloat(item.unitPrice.toString()),
      // Use original item name/display name
      displayName: item.productName,
    }));

    // 5. Create Order via OrdersDb
    // This handles inventory locks and transaction consistency
    const newOrder = await createOrder({
      orderType: "SALE",
      clientId: session.clientId,
      items: orderItems,
      createdBy: options.userId,
      paymentTerms: options.paymentTerms || "NET_30",
      notes: [
        `Live Shopping Session #${session.roomCode}`,
        options.internalNotes,
      ]
        .filter(Boolean)
        .join("\n"),
    });

    // 6. Generate Sales Sheet (Optional)
    let salesSheetId: number | undefined;
    if (options.generateSalesSheet) {
      try {
        salesSheetId = await this.generateSalesSheetFromCart(
          session.clientId,
          cart,
          options.userId,
          newOrder.id,
          session.roomCode
        );
      } catch (e: unknown) {
        warnings.push(`Failed to generate sales sheet: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 7. Update Session Status
    await db
      .update(liveShoppingSessions)
      .set({
        status: "CONVERTED",
        endedAt: new Date(),
      })
      .where(eq(liveShoppingSessions.id, options.sessionId));

    // 8. Emit session ended event
    sessionEventManager.emit(sessionEventManager.getRoomId(options.sessionId), {
      type: "SESSION_ENDED",
      data: {
        status: "CONVERTED",
        orderId: newOrder.id,
        salesSheetId,
      },
    });

    return {
      success: true,
      orderId: newOrder.id,
      salesSheetId,
      warnings,
    };
  },

  /**
   * Generate a Sales Sheet from cart data
   * P4-T02 Implementation
   */
  async generateSalesSheetFromCart(
    clientId: number,
    cart: Awaited<ReturnType<typeof sessionCartService.getCart>>,
    userId: number,
    referenceOrderId?: number,
    roomCode?: string
  ): Promise<number> {
    // Map cart items to Sales Sheet Schema
    const sheetItems = cart.items.map((item, index) => {
      const price = parseFloat(item.unitPrice.toString());
      const qty = parseFloat(item.quantity.toString());

      return {
        id: index + 1,
        name: item.productName,
        category: "Live Shopping",
        basePrice: price,
        retailPrice: price,
        finalPrice: price,
        quantity: qty,
        vendor: "Internal",
        priceMarkup: 0,
        // Mark samples in metadata
        grade: item.isSample ? "SAMPLE" : "STANDARD",
        appliedRules: [],
      };
    });

    const totalValue = sheetItems.reduce(
      (sum, i) => sum + (i.finalPrice || 0) * (i.quantity || 1),
      0
    );

    const result = await saveSalesSheet({
      clientId: clientId,
      createdBy: userId,
      items: sheetItems,
      totalValue: totalValue,
    });

    return result;
  },

  /**
   * Generate a Sales Sheet snapshot without ending the session
   * Useful for sending previews to clients during the session
   */
  async generateSessionSnapshot(
    sessionId: number,
    userId: number
  ): Promise<number> {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const session = await db.query.liveShoppingSessions.findFirst({
      where: eq(liveShoppingSessions.id, sessionId),
    });

    if (!session) throw new Error("Session not found");

    const cart = await sessionCartService.getCart(sessionId);

    if (cart.items.length === 0) {
      throw new Error("Cannot generate snapshot from empty cart");
    }

    return await this.generateSalesSheetFromCart(
      session.clientId,
      cart,
      userId,
      undefined,
      session.roomCode
    );
  },
};
