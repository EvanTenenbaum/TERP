import { z } from "zod";
import { router, vipPortalProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  liveShoppingSessions,
  sessionCartItems,
} from "../../drizzle/schema-live-shopping";
import { batches, products, productMedia } from "../../drizzle/schema";
import { eq, and, or, like, gt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sessionCartService } from "../services/live-shopping/sessionCartService";
import { sessionEventManager } from "../lib/sse/sessionEventManager";

export const vipPortalLiveShoppingRouter = router({
  // ============================================================================
  // SESSION DISCOVERY
  // ============================================================================

  /**
   * Check if client has an active session
   * Used to show "active session" banner in VIP Portal
   */
  getActiveSession: vipPortalProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      // Validate client ownership
      if (input.clientId !== ctx.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied",
        });
      }

      // Find active or scheduled session for this client
      const session = await db.query.liveShoppingSessions.findFirst({
        where: and(
          eq(liveShoppingSessions.clientId, input.clientId),
          or(
            eq(liveShoppingSessions.status, "ACTIVE"),
            eq(liveShoppingSessions.status, "SCHEDULED"),
            eq(liveShoppingSessions.status, "PAUSED")
          )
        ),
        with: {
          host: {
            columns: {
              name: true,
            },
          },
        },
        orderBy: (sessions, { desc }) => [desc(sessions.createdAt)],
      });

      if (!session) {
        return { session: null };
      }

      return {
        session: {
          id: session.id,
          roomCode: session.roomCode,
          title: session.title,
          status: session.status,
          hostName: session.host?.name || "Staff",
          scheduledAt: session.scheduledAt,
        },
      };
    }),

  // ============================================================================
  // SESSION INTERACTION
  // ============================================================================

  /**
   * Client joins a session via Room Code
   * Validates that the logged-in client is the intended participant.
   */
  joinSession: vipPortalProcedure
    .input(z.object({ roomCode: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database unavailable",
        });

      // 1. Find Session
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.roomCode, input.roomCode),
        with: {
          host: true,
        },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // 2. Validate Ownership
      if (session.clientId !== ctx.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to join this session.",
        });
      }

      // 3. Get Current Cart
      const cart = await sessionCartService.getCart(session.id);

      return {
        session: {
          id: session.id,
          title: session.title,
          status: session.status,
          hostName: session.host?.name || "Staff",
          roomCode: session.roomCode,
        },
        cart,
      };
    }),

  /**
   * Get details of a specific batch (used when Host highlights an item)
   * Requires sessionId to verify the client has access to this session
   */
  getBatchDetails: vipPortalProcedure
    .input(z.object({ 
      batchId: z.number(),
      sessionId: z.number() // Required to verify session ownership
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify session ownership first
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid session",
        });
      }

      const result = await db
        .select({
          batchId: batches.id,
          code: batches.code,
          productName: products.nameCanonical,
          description: products.description,
          imageUrl: productMedia.url,
          // Note: Price comes from pricing engine, not stored on products
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .leftJoin(productMedia, eq(products.id, productMedia.productId))
        .where(eq(batches.id, input.batchId))
        .limit(1);

      if (!result.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Item not found" });
      }

      return result[0];
    }),

  /**
   * Add Item to Cart (Client Role)
   */
  addToCart: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        batchId: z.number(),
        quantity: z.number().min(0.0001),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify Session Ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid session",
        });
      }

      try {
        await sessionCartService.addItem({
          sessionId: input.sessionId,
          batchId: input.batchId,
          quantity: input.quantity,
          addedByRole: "CLIENT",
        });

        // Notify via SSE (Handled inside service, but we ensure cart is returned)
        const updatedCart = await sessionCartService.getCart(input.sessionId);
        return updatedCart;
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err.message || "Failed to add item",
        });
      }
    }),

  /**
   * Update Item Quantity
   */
  updateQuantity: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        quantity: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify Session Ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid session",
        });
      }

      try {
        await sessionCartService.updateQuantity(
          input.sessionId,
          input.cartItemId,
          input.quantity
        );
        return { success: true };
      } catch (err: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: err.message || "Failed to update quantity",
        });
      }
    }),

  /**
   * Remove Item from Cart
   */
  removeItem: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      // Verify Session Ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid session",
        });
      }

      await sessionCartService.removeItem(input.sessionId, input.cartItemId);
      return { success: true };
    }),

  /**
   * Request Checkout
   * Signals to the Host that the client is done and ready to convert to order.
   */
  requestCheckout: vipPortalProcedure
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");

      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Invalid session",
        });
      }

      if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Session is not active",
        });
      }

      // We emit a custom event that the Host UI will listen for
      // Note: We might want to persist this state in DB in future, but for now it's an event
      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "CLIENT_CHECKOUT_REQUEST",
        payload: {
          clientId: ctx.clientId,
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true, message: "Host notified" };
    }),

  // ============================================================================
  // ITEM STATUS MANAGEMENT (Customer-Facing)
  // ============================================================================

  /**
   * Customer updates item status (Sample Request, Interested, To Purchase)
   */
  updateItemStatus: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        status: z.enum(["SAMPLE_REQUEST", "INTERESTED", "TO_PURCHASE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate session ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Session is not active" });
      }

      // Update item status
      await sessionCartService.updateItemStatus(input.sessionId, input.cartItemId, input.status);

      // Emit event for real-time updates to staff
      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "ITEM_STATUS_CHANGED",
        payload: {
          cartItemId: input.cartItemId,
          newStatus: input.status,
          changedBy: "CLIENT",
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true };
    }),

  /**
   * Customer adds item directly with a specific status
   */
  addItemWithStatus: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        batchId: z.number(),
        quantity: z.number().positive(),
        status: z.enum(["SAMPLE_REQUEST", "INTERESTED", "TO_PURCHASE"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate session ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Session is not active" });
      }

      try {
        const cartItemId = await sessionCartService.addItemWithStatus({
          sessionId: input.sessionId,
          batchId: input.batchId,
          quantity: input.quantity,
          addedByRole: "CLIENT",
          itemStatus: input.status,
        });
        return { success: true, cartItemId };
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e.message || "Failed to add item",
        });
      }
    }),

  /**
   * Customer searches for products to add to session
   * Allows customers to find and add items themselves
   */
  searchProducts: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        query: z.string().min(1),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate session ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Session is not active" });
      }

      const trimmedQuery = input.query.trim();
      if (!trimmedQuery) {
        return [];
      }

      // Search for available products - only show basic info to clients
      const results = await db
        .select({
          batchId: batches.id,
          productId: products.id,
          productName: products.nameCanonical,
          batchCode: batches.code,
          available: batches.onHandQty,
          // Don't expose COGS or internal pricing to clients
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .where(
          and(
            or(
              like(products.nameCanonical, `%${trimmedQuery}%`),
              like(batches.code, `%${trimmedQuery}%`)
            ),
            gt(batches.onHandQty, "0") // Only show in-stock items (onHandQty is varchar)
          )
        )
        .limit(15);

      return results;
    }),

  /**
   * Get customer's items grouped by status
   */
  getMyItemsByStatus: vipPortalProcedure
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate session ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      const cart = await sessionCartService.getCart(input.sessionId);

      const sampleRequests = cart.items.filter((i) => i.itemStatus === "SAMPLE_REQUEST");
      const interested = cart.items.filter((i) => i.itemStatus === "INTERESTED");
      const toPurchase = cart.items.filter((i) => i.itemStatus === "TO_PURCHASE");

      return {
        sampleRequests,
        interested,
        toPurchase,
        totals: {
          sampleRequestCount: sampleRequests.length,
          interestedCount: interested.length,
          toPurchaseCount: toPurchase.length,
          toPurchaseValue: toPurchase.reduce(
            (sum, i) =>
              sum + parseFloat(i.quantity.toString()) * parseFloat(i.unitPrice.toString()),
            0
          ),
        },
      };
    }),

  // ============================================================================
  // PRICE NEGOTIATION (FEATURE-003)
  // ============================================================================

  /**
   * Request price negotiation for an item
   * Customer proposes a new price for a cart item
   */
  requestNegotiation: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        proposedPrice: z.number().positive(),
        reason: z.string().optional(),
        quantity: z.number().positive().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate session ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      if (session.status !== "ACTIVE" && session.status !== "PAUSED") {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Session is not active" });
      }

      // Get current cart item
      const cartItem = await db.query.sessionCartItems.findFirst({
        where: and(
          eq(sessionCartItems.sessionId, input.sessionId),
          eq(sessionCartItems.id, input.cartItemId)
        ),
      });

      if (!cartItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cart item not found" });
      }

      const currentPrice = parseFloat(cartItem.unitPrice?.toString() || "0");

      // Store negotiation request in metadata
      const negotiationData = {
        status: "PENDING",
        originalPrice: currentPrice,
        proposedPrice: input.proposedPrice,
        proposedQuantity: input.quantity,
        reason: input.reason,
        requestedBy: ctx.clientId,
        requestedAt: new Date().toISOString(),
        history: [
          {
            action: "REQUEST",
            price: input.proposedPrice,
            quantity: input.quantity,
            by: ctx.clientId,
            at: new Date().toISOString(),
            reason: input.reason,
          },
        ],
      };

      // Update cart item with negotiation status
      await db
        .update(sessionCartItems)
        .set({
          negotiationStatus: "PENDING",
          negotiationData: negotiationData,
        })
        .where(eq(sessionCartItems.id, input.cartItemId));

      // Emit negotiation event for real-time updates to staff
      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "NEGOTIATION_REQUESTED",
        payload: {
          cartItemId: input.cartItemId,
          proposedPrice: input.proposedPrice,
          originalPrice: currentPrice,
          timestamp: new Date().toISOString(),
        },
      });

      return { success: true, negotiationId: input.cartItemId };
    }),

  /**
   * Accept counter-offer from host
   * Customer accepts the counter-offer price
   */
  acceptCounterOffer: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate session ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      // Get current cart item with negotiation data
      const cartItem = await db.query.sessionCartItems.findFirst({
        where: and(
          eq(sessionCartItems.sessionId, input.sessionId),
          eq(sessionCartItems.id, input.cartItemId)
        ),
      });

      if (!cartItem || !cartItem.negotiationData) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Negotiation not found" });
      }

      // Drizzle returns JSON as parsed object, but handle string case for safety
      const negotiationData = typeof cartItem.negotiationData === "string"
        ? JSON.parse(cartItem.negotiationData)
        : cartItem.negotiationData;

      if (!negotiationData || negotiationData.status !== "COUNTER_OFFERED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "No counter-offer to accept" });
      }

      // Add acceptance to history
      negotiationData.history.push({
        action: "ACCEPT_COUNTER",
        price: negotiationData.counterPrice,
        by: ctx.clientId,
        at: new Date().toISOString(),
      });

      negotiationData.status = "ACCEPTED";
      negotiationData.finalPrice = negotiationData.counterPrice;
      negotiationData.acceptedAt = new Date().toISOString();

      // Apply the counter-offer price
      await db
        .update(sessionCartItems)
        .set({
          unitPrice: negotiationData.counterPrice.toString(),
          quantity: negotiationData.counterQuantity?.toString() || cartItem.quantity,
          negotiationStatus: "ACCEPTED",
          negotiationData: negotiationData,
        })
        .where(eq(sessionCartItems.id, input.cartItemId));

      // Emit acceptance event
      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "COUNTER_OFFER_ACCEPTED",
        payload: {
          cartItemId: input.cartItemId,
          finalPrice: negotiationData.counterPrice,
          timestamp: new Date().toISOString(),
        },
      });

      // Also update cart view
      await sessionCartService.emitCartUpdate(input.sessionId);

      return { success: true, finalPrice: negotiationData.counterPrice };
    }),

  /**
   * Get negotiation history for an item
   * Customer can view negotiation details
   */
  getNegotiationHistory: vipPortalProcedure
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Validate session ownership
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session || session.clientId !== ctx.clientId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Invalid session" });
      }

      const cartItem = await db.query.sessionCartItems.findFirst({
        where: and(
          eq(sessionCartItems.sessionId, input.sessionId),
          eq(sessionCartItems.id, input.cartItemId)
        ),
      });

      if (!cartItem) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Cart item not found" });
      }

      if (!cartItem.negotiationData) {
        return { hasNegotiation: false, history: [] };
      }

      // Drizzle returns JSON as parsed object, but handle string case for safety
      const negotiationData = typeof cartItem.negotiationData === "string"
        ? JSON.parse(cartItem.negotiationData)
        : cartItem.negotiationData;

      if (!negotiationData) {
        return { hasNegotiation: false, history: [] };
      }

      return {
        hasNegotiation: true,
        status: negotiationData.status,
        originalPrice: negotiationData.originalPrice,
        proposedPrice: negotiationData.proposedPrice,
        counterPrice: negotiationData.counterPrice,
        finalPrice: negotiationData.finalPrice,
        history: negotiationData.history || [],
      };
    }),
});
