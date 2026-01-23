import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  liveShoppingSessions,
  sessionCartItems,
} from "../../drizzle/schema-live-shopping";
import { clients, users, products, batches } from "../../drizzle/schema";
import { eq, and, desc, like, or, sql, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sessionCartService } from "../services/live-shopping/sessionCartService";
import { sessionPricingService } from "../services/live-shopping/sessionPricingService";
import { sessionOrderService } from "../services/live-shopping/sessionOrderService";
import { sessionCreditService } from "../services/live-shopping/sessionCreditService";
import { sessionTimeoutService } from "../services/live-shopping/sessionTimeoutService";
import { sessionPickListService, warehouseEventManager } from "../services/live-shopping/sessionPickListService";
// ordersDb available for future direct order operations
import { sessionEventManager } from "../lib/sse/sessionEventManager";
import { randomUUID } from "crypto";

export const liveShoppingRouter = router({
  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new Live Shopping Session
   */
  createSession: protectedProcedure
    .use(requirePermission("orders:create")) // Re-using order permission for now
    .input(
      z.object({
        clientId: z.number(),
        title: z.string().optional(),
        scheduledAt: z.string().optional(), // ISO string
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      // BUG-094 FIX: Validate that client exists before inserting
      const clientExists = await db.query.clients.findFirst({
        where: eq(clients.id, input.clientId),
        columns: { id: true },
      });

      if (!clientExists) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Client with ID ${input.clientId} does not exist`,
        });
      }

      const userId = getAuthenticatedUserId(ctx);
      const roomCode = randomUUID(); // Unique room ID

      const [result] = await db.insert(liveShoppingSessions).values({
        hostUserId: userId,
        clientId: input.clientId,
        status: input.scheduledAt ? "SCHEDULED" : "ACTIVE",
        roomCode,
        title: input.title || "Live Shopping Session",
        scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
        startedAt: input.scheduledAt ? null : new Date(), // If no schedule, start immediately
        internalNotes: input.internalNotes,
      });

      return { sessionId: result.insertId, roomCode };
    }),

  /**
   * List sessions with filters
   */
  listSessions: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        status: z.enum(["SCHEDULED", "ACTIVE", "PAUSED", "ENDED", "CONVERTED", "CANCELLED"]).optional(),
        clientId: z.number().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      const conditions = [];
      if (input.status) conditions.push(eq(liveShoppingSessions.status, input.status));
      if (input.clientId) conditions.push(eq(liveShoppingSessions.clientId, input.clientId));

      const sessions = await db
        .select({
          id: liveShoppingSessions.id,
          title: liveShoppingSessions.title,
          status: liveShoppingSessions.status,
          scheduledAt: liveShoppingSessions.scheduledAt,
          startedAt: liveShoppingSessions.startedAt,
          createdAt: liveShoppingSessions.createdAt,
          clientName: clients.name,
          hostName: users.name,
          itemCount: sql<number>`(SELECT COUNT(*) FROM ${sessionCartItems} WHERE ${sessionCartItems.sessionId} = ${liveShoppingSessions.id})`,
        })
        .from(liveShoppingSessions)
        .leftJoin(clients, eq(liveShoppingSessions.clientId, clients.id))
        .leftJoin(users, eq(liveShoppingSessions.hostUserId, users.id))
        .where(and(...conditions))
        .orderBy(desc(liveShoppingSessions.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return sessions;
    }),

  /**
   * Get single session details
   */
  getSession: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
        with: {
          client: true,
          host: true,
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      // Get Cart Details via Service
      const cart = await sessionCartService.getCart(input.sessionId);

      return { ...session, cart };
    }),

  /**
   * Update Session Status
   */
  updateSessionStatus: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        status: z.enum(["ACTIVE", "PAUSED", "ENDED", "CANCELLED"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });

      const updates: any = { status: input.status };
      
      // Set timestamps based on status transition
      if (input.status === "ACTIVE") {
        // Only set startedAt if it wasn't set before (resuming shouldn't reset start time ideally, but simpler for now)
        // Better logic: set startedAt only if null
        updates.startedAt = sql`COALESCE(${liveShoppingSessions.startedAt}, NOW())`;
      } else if (input.status === "ENDED" || input.status === "CANCELLED") {
        updates.endedAt = new Date();
      }

      await db
        .update(liveShoppingSessions)
        .set(updates)
        .where(eq(liveShoppingSessions.id, input.sessionId));

      // Emit status change event
      sessionEventManager.emitStatusChange(input.sessionId, input.status);

      return { success: true };
    }),

  // ==========================================================================
  // CART OPERATIONS
  // ==========================================================================

  /**
   * Add item to cart
   */
  addToCart: protectedProcedure
    .use(requirePermission("orders:update")) // Assuming write access to orders allows selling
    .input(
      z.object({
        sessionId: z.number(),
        batchId: z.number(),
        quantity: z.number().positive(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await sessionCartService.addItem({
          sessionId: input.sessionId,
          batchId: input.batchId,
          quantity: input.quantity,
          addedByRole: "HOST",
        });
        return { success: true };
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e.message || "Failed to add item to cart",
        });
      }
    }),

  /**
   * Remove item from cart
   */
  removeFromCart: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await sessionCartService.removeItem(input.sessionId, input.cartItemId);
      return { success: true };
    }),

  /**
   * Update cart item quantity
   */
  updateCartQuantity: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        quantity: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        await sessionCartService.updateQuantity(
          input.sessionId,
          input.cartItemId,
          input.quantity
        );
        return { success: true };
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e.message || "Failed to update quantity",
        });
      }
    }),

  // ==========================================================================
  // LIVE CONTROLS (Pricing, Highlights)
  // ==========================================================================

  /**
   * Set Override Price for a product in this session
   */
  setOverridePrice: protectedProcedure
    .use(requirePermission("orders:update")) // Ideally needs specific pricing permission
    .input(
      z.object({
        sessionId: z.number(),
        productId: z.number(),
        price: z.number().min(0),
      })
    )
    .mutation(async ({ input }) => {
      // 1. Store the override in the pricing service
      await sessionPricingService.setSessionOverride(
        input.sessionId,
        input.productId,
        input.price
      );
      
      // 2. Update existing cart items with new price in a single query
      const db = await getDb();
      if (db) {
        await db.update(sessionCartItems)
          .set({ unitPrice: input.price.toString() })
          .where(and(
            eq(sessionCartItems.sessionId, input.sessionId),
            eq(sessionCartItems.productId, input.productId)
          ));
      }

      // 3. Emit cart update to notify all connected clients
      await sessionCartService.emitCartUpdate(input.sessionId);
      return { success: true };
    }),

  /**
   * Highlight a product (Showcase)
   */
  highlightProduct: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        batchId: z.number(), // Highlighting specific batch usually
        isHighlighted: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Reset others if we are highlighting one
      if (input.isHighlighted) {
        await db
          .update(sessionCartItems)
          .set({ isHighlighted: false })
          .where(eq(sessionCartItems.sessionId, input.sessionId));
      }

      // Update specific item if it exists in cart, otherwise we might need a separate 'activeProduct' field on session
      // For now, assume we only highlight items IN the cart
      await db
        .update(sessionCartItems)
        .set({ isHighlighted: input.isHighlighted })
        .where(and(
          eq(sessionCartItems.sessionId, input.sessionId),
          eq(sessionCartItems.batchId, input.batchId)
        ));

      // Emit highlight event
      if (input.isHighlighted) {
        sessionEventManager.emitHighlight(input.sessionId, input.batchId);
      }
      
      // Also update cart view
      await sessionCartService.emitCartUpdate(input.sessionId);
      
      return { success: true };
    }),

  /**
   * Helper: Search Products for the Host Panel
   */
  searchProducts: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ query: z.string().min(1, "Search query cannot be empty") }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Return empty results if query is empty or just whitespace
      const trimmedQuery = input.query.trim();
      if (!trimmedQuery) {
        return [];
      }

      // Search batches available
      const results = await db
        .select({
          batchId: batches.id,
          productId: products.id,
          productName: products.nameCanonical,
          batchCode: batches.code,
          onHand: batches.onHandQty,
          reserved: batches.reservedQty,
          unitCogs: batches.unitCogs,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .where(
          or(
            like(products.nameCanonical, `%${trimmedQuery}%`),
            like(batches.code, `%${trimmedQuery}%`)
          )
        )
        .limit(20);

      return results;
    }),

  // ==========================================================================
  // FINALIZE
  // ==========================================================================

  /**
   * Toggle Sample Status (P4-T03)
   */
  toggleCartItemSample: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        isSample: z.boolean(),
      })
    )
    .mutation(async ({ input }) => {
      await sessionCartService.toggleItemSampleStatus(
        input.sessionId,
        input.cartItemId,
        input.isSample
      );
      return { success: true };
    }),

  /**
   * Check Credit Status (P4-T04)
   * Used by UI to show warnings before checkout
   */
  checkCreditStatus: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      return await sessionCreditService.validateCartCredit(
        input.sessionId,
        session.clientId
      );
    }),

  /**
   * Generate Sales Sheet Snapshot (P4-T02)
   * Can be done without ending session
   */
  generateSalesSheet: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);

      try {
        const sheetId = await sessionOrderService.generateSessionSnapshot(
          input.sessionId,
          userId
        );
        return { success: true, salesSheetId: sheetId };
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e.message || "Failed to generate sales sheet",
        });
      }
    }),

  /**
   * End Session and Optionally Convert to Order (Enhanced P4-T01)
   */
  endSession: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        sessionId: z.number(),
        convertToOrder: z.boolean().default(false),
        generateSalesSheet: z.boolean().default(false),
        paymentTerms: z
          .enum(["NET_7", "NET_15", "NET_30", "COD", "PARTIAL", "CONSIGNMENT"])
          .optional(),
        bypassCreditCheck: z.boolean().default(false),
        internalNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = getAuthenticatedUserId(ctx);

      // If just ending without conversion
      if (!input.convertToOrder) {
        await db
          .update(liveShoppingSessions)
          .set({ status: "ENDED", endedAt: new Date() })
          .where(eq(liveShoppingSessions.id, input.sessionId));

        sessionEventManager.emitStatusChange(input.sessionId, "ENDED");
        return { success: true };
      }

      // Perform conversion via service (P4-T01)
      try {
        const result = await sessionOrderService.convertSessionToOrder({
          sessionId: input.sessionId,
          userId,
          paymentTerms: input.paymentTerms,
          generateSalesSheet: input.generateSalesSheet,
          bypassCreditCheck: input.bypassCreditCheck,
          internalNotes: input.internalNotes,
        });

        return result;
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e.message || "Failed to convert session to order",
        });
      }
    }),

  // ==========================================================================
  // ITEM STATUS MANAGEMENT (Three-Status Workflow)
  // ==========================================================================

  /**
   * Update item status (Sample Request, Interested, To Purchase)
   * Can be called by both staff and clients
   */
  updateItemStatus: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        status: z.enum(["SAMPLE_REQUEST", "INTERESTED", "TO_PURCHASE"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await db
        .update(sessionCartItems)
        .set({ itemStatus: input.status })
        .where(
          and(
            eq(sessionCartItems.sessionId, input.sessionId),
            eq(sessionCartItems.id, input.cartItemId)
          )
        );

      // Emit status change event for real-time updates
      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "ITEM_STATUS_CHANGED",
        payload: {
          cartItemId: input.cartItemId,
          newStatus: input.status,
          timestamp: new Date().toISOString(),
        },
      });

      // Also update cart view
      await sessionCartService.emitCartUpdate(input.sessionId);

      return { success: true };
    }),

  /**
   * Add item directly with a specific status
   * Allows adding items as Sample Request, Interested, or To Purchase
   */
  addItemWithStatus: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        batchId: z.number(),
        quantity: z.number().positive(),
        status: z.enum(["SAMPLE_REQUEST", "INTERESTED", "TO_PURCHASE"]),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const cartItemId = await sessionCartService.addItemWithStatus({
          sessionId: input.sessionId,
          batchId: input.batchId,
          quantity: input.quantity,
          addedByRole: "HOST",
          itemStatus: input.status,
        });
        return { success: true, cartItemId };
      } catch (e: any) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: e.message || "Failed to add item to cart",
        });
      }
    }),

  /**
   * Get items grouped by status for the session
   */
  getItemsByStatus: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const cart = await sessionCartService.getCart(input.sessionId);

      const sampleRequests = cart.items.filter(i => i.itemStatus === "SAMPLE_REQUEST");
      const interested = cart.items.filter(i => i.itemStatus === "INTERESTED");
      const toPurchase = cart.items.filter(i => i.itemStatus === "TO_PURCHASE");

      return {
        sampleRequests,
        interested,
        toPurchase,
        totals: {
          sampleRequestCount: sampleRequests.length,
          interestedCount: interested.length,
          toPurchaseCount: toPurchase.length,
          toPurchaseValue: toPurchase.reduce(
            (sum, i) => sum + parseFloat(i.quantity.toString()) * parseFloat(i.unitPrice.toString()),
            0
          ),
        },
      };
    }),

  // ==========================================================================
  // PRICE NEGOTIATION WORKFLOW (FEATURE-003)
  // ==========================================================================

  /**
   * Request price negotiation for an item
   * Client can propose a new price for a cart item
   */
  requestNegotiation: protectedProcedure
    .use(requirePermission("orders:read")) // VIP clients can also negotiate
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        proposedPrice: z.number().positive(),
        reason: z.string().optional(),
        quantity: z.number().positive().optional(), // Can also negotiate on quantity
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = getAuthenticatedUserId(ctx);

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
        requestedBy: userId,
        requestedAt: new Date().toISOString(),
        history: [
          {
            action: "REQUEST",
            price: input.proposedPrice,
            quantity: input.quantity,
            by: userId,
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
          negotiationData: negotiationData, // Drizzle handles JSON serialization
        })
        .where(eq(sessionCartItems.id, input.cartItemId));

      // Emit negotiation event for real-time updates
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
   * Respond to a negotiation request
   * Host can accept, reject, or counter-offer
   */
  respondToNegotiation: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
        response: z.enum(["ACCEPT", "REJECT", "COUNTER"]),
        counterPrice: z.number().positive().optional(), // Required if response is COUNTER
        counterQuantity: z.number().positive().optional(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = getAuthenticatedUserId(ctx);

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

      if (!negotiationData || !negotiationData.history) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid negotiation data" });
      }

      // Add response to history
      negotiationData.history.push({
        action: input.response,
        price: input.response === "COUNTER" ? input.counterPrice : null,
        quantity: input.counterQuantity,
        by: userId,
        at: new Date().toISOString(),
        reason: input.reason,
      });

      const updates: Record<string, unknown> = {};

      if (input.response === "ACCEPT") {
        // Apply the negotiated price
        updates.unitPrice = negotiationData.proposedPrice.toString();
        updates.negotiationStatus = "ACCEPTED";
        negotiationData.status = "ACCEPTED";
        negotiationData.finalPrice = negotiationData.proposedPrice;
        negotiationData.acceptedAt = new Date().toISOString();
        negotiationData.acceptedBy = userId;
      } else if (input.response === "REJECT") {
        updates.negotiationStatus = "REJECTED";
        negotiationData.status = "REJECTED";
        negotiationData.rejectedAt = new Date().toISOString();
        negotiationData.rejectedBy = userId;
        negotiationData.rejectionReason = input.reason;
      } else if (input.response === "COUNTER") {
        if (!input.counterPrice) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Counter price is required" });
        }
        updates.negotiationStatus = "COUNTER_OFFERED";
        negotiationData.status = "COUNTER_OFFERED";
        negotiationData.counterPrice = input.counterPrice;
        negotiationData.counterQuantity = input.counterQuantity;
      }

      updates.negotiationData = negotiationData; // Drizzle handles JSON serialization

      await db
        .update(sessionCartItems)
        .set(updates as Partial<typeof sessionCartItems.$inferInsert>)
        .where(eq(sessionCartItems.id, input.cartItemId));

      // Emit negotiation response event
      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "NEGOTIATION_RESPONSE",
        payload: {
          cartItemId: input.cartItemId,
          response: input.response,
          counterPrice: input.counterPrice,
          timestamp: new Date().toISOString(),
        },
      });

      // Also update cart view
      await sessionCartService.emitCartUpdate(input.sessionId);

      return { success: true };
    }),

  /**
   * Accept counter-offer
   * Client accepts the counter-offer from host
   */
  acceptCounterOffer: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = getAuthenticatedUserId(ctx);

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
        by: userId,
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
          negotiationData: negotiationData, // Drizzle handles JSON serialization
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
   */
  getNegotiationHistory: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(
      z.object({
        sessionId: z.number(),
        cartItemId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

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

  /**
   * Get all active negotiations in a session
   */
  getActiveNegotiations: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const items = await db
        .select({
          id: sessionCartItems.id,
          productId: sessionCartItems.productId,
          batchId: sessionCartItems.batchId,
          quantity: sessionCartItems.quantity,
          unitPrice: sessionCartItems.unitPrice,
          negotiationStatus: sessionCartItems.negotiationStatus,
          negotiationData: sessionCartItems.negotiationData,
          productName: products.nameCanonical,
        })
        .from(sessionCartItems)
        .leftJoin(products, eq(sessionCartItems.productId, products.id))
        .where(
          and(
            eq(sessionCartItems.sessionId, input.sessionId),
            sql`${sessionCartItems.negotiationStatus} IS NOT NULL AND ${sessionCartItems.negotiationStatus} != 'ACCEPTED' AND ${sessionCartItems.negotiationStatus} != 'REJECTED'`
          )
        );

      return items.map((item) => {
        let negotiation = null;
        if (item.negotiationData) {
          // Drizzle returns JSON as parsed object, but handle string case for safety
          negotiation = typeof item.negotiationData === "string"
            ? JSON.parse(item.negotiationData)
            : item.negotiationData;
        }
        return {
          ...item,
          negotiation,
        };
      });
    }),

  // ==========================================================================
  // ACTIVE SESSIONS (MEET-075-BE)
  // ==========================================================================

  /**
   * Get all active sessions across the organization
   */
  getActive: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const sessions = await db
        .select({
          id: liveShoppingSessions.id,
          title: liveShoppingSessions.title,
          status: liveShoppingSessions.status,
          roomCode: liveShoppingSessions.roomCode,
          startedAt: liveShoppingSessions.startedAt,
          expiresAt: liveShoppingSessions.expiresAt,
          timeoutSeconds: liveShoppingSessions.timeoutSeconds,
          lastActivityAt: liveShoppingSessions.lastActivityAt,
          clientId: liveShoppingSessions.clientId,
          clientName: clients.name,
          hostUserId: liveShoppingSessions.hostUserId,
          hostName: users.name,
          itemCount: sql<number>`(SELECT COUNT(*) FROM ${sessionCartItems} WHERE ${sessionCartItems.sessionId} = ${liveShoppingSessions.id})`,
          cartValue: sql<string>`(SELECT COALESCE(SUM(${sessionCartItems.quantity} * ${sessionCartItems.unitPrice}), 0) FROM ${sessionCartItems} WHERE ${sessionCartItems.sessionId} = ${liveShoppingSessions.id})`,
        })
        .from(liveShoppingSessions)
        .leftJoin(clients, eq(liveShoppingSessions.clientId, clients.id))
        .leftJoin(users, eq(liveShoppingSessions.hostUserId, users.id))
        .where(inArray(liveShoppingSessions.status, ["ACTIVE", "PAUSED"]))
        .orderBy(desc(liveShoppingSessions.startedAt));

      const now = new Date();
      return sessions.map((session) => ({
        ...session,
        remainingSeconds: session.expiresAt
          ? Math.max(0, Math.floor((session.expiresAt.getTime() - now.getTime()) / 1000))
          : -1,
        isNearingTimeout:
          session.expiresAt && session.expiresAt.getTime() - now.getTime() < 300000,
      }));
    }),

  // ==========================================================================
  // SESSION TIMEOUT MANAGEMENT (MEET-075-BE)
  // ==========================================================================

  getTimeoutStatus: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return await sessionTimeoutService.getTimeoutStatus(input.sessionId);
    }),

  extendTimeout: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        additionalMinutes: z.number().min(1).max(240).default(60),
      })
    )
    .mutation(async ({ input }) => {
      const additionalSeconds = input.additionalMinutes * 60;
      return await sessionTimeoutService.extendTimeout(input.sessionId, additionalSeconds);
    }),

  configureTimeout: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        timeoutMinutes: z.number().min(0).max(480),
        autoReleaseEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const timeoutSeconds = input.timeoutMinutes * 60;
      await sessionTimeoutService.initializeTimeout(input.sessionId, timeoutSeconds);
      return await sessionTimeoutService.getTimeoutStatus(input.sessionId);
    }),

  disableTimeout: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ sessionId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
      // Disable timeout by setting expiresAt to null
      await db.update(liveShoppingSessions)
        .set({ expiresAt: null, timeoutSeconds: 0 })
        .where(eq(liveShoppingSessions.id, input.sessionId));
      return { success: true };
    }),

  // ==========================================================================
  // WAREHOUSE PICK LIST (MEET-075-BE)
  // ==========================================================================

  getConsolidatedPickList: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      return await sessionPickListService.getConsolidatedPickList();
    }),

  getSessionPickList: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      return await sessionPickListService.getSessionPickList(input.sessionId);
    }),

  getActiveSessionsSummary: protectedProcedure
    .use(requirePermission("orders:read"))
    .query(async () => {
      return await sessionPickListService.getActiveSessionsSummary();
    }),

  // ==========================================================================
  // SESSION NOTES/COMMENTS (MEET-075-BE)
  // ==========================================================================

  updateSessionNotes: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        notes: z.string().max(5000),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = getAuthenticatedUserId(ctx);
      const timestamp = new Date().toISOString();

      await db.update(liveShoppingSessions)
        .set({
          internalNotes: input.notes,
          lastActivityAt: new Date(),
        })
        .where(eq(liveShoppingSessions.id, input.sessionId));

      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "NOTES_UPDATED",
        payload: {
          sessionId: input.sessionId,
          notes: input.notes,
          updatedBy: userId,
          timestamp,
        },
      });

      return { success: true };
    }),

  getSessionNotes: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
        columns: {
          internalNotes: true,
          updatedAt: true,
        },
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      return {
        notes: session.internalNotes || "",
        lastUpdated: session.updatedAt,
      };
    }),

  // ==========================================================================
  // ENHANCED CANCEL SESSION (MEET-075-BE)
  // ==========================================================================

  cancelSession: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(
      z.object({
        sessionId: z.number(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = getAuthenticatedUserId(ctx);
      const now = new Date();

      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Session not found" });
      }

      if (session.status === "CONVERTED" || session.status === "CANCELLED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Session is already ${session.status.toLowerCase()}`,
        });
      }

      const cartItems = await db
        .select({
          id: sessionCartItems.id,
          batchId: sessionCartItems.batchId,
          quantity: sessionCartItems.quantity,
        })
        .from(sessionCartItems)
        .where(eq(sessionCartItems.sessionId, input.sessionId));

      const cancellationNote = input.reason
        ? `[CANCELLED] ${now.toISOString()} by user ${userId}: ${input.reason}`
        : `[CANCELLED] ${now.toISOString()} by user ${userId}`;

      await db.update(liveShoppingSessions)
        .set({
          status: "CANCELLED",
          endedAt: now,
          internalNotes: sql`CONCAT(COALESCE(${liveShoppingSessions.internalNotes}, ''), '\n', ${cancellationNote})`,
        })
        .where(eq(liveShoppingSessions.id, input.sessionId));

      sessionEventManager.emitStatusChange(input.sessionId, "CANCELLED");

      sessionEventManager.emit(sessionEventManager.getRoomId(input.sessionId), {
        type: "SESSION_CANCELLED",
        payload: {
          sessionId: input.sessionId,
          reason: input.reason,
          cancelledBy: userId,
          releasedItems: cartItems.length,
          timestamp: now.toISOString(),
        },
      });

      await sessionPickListService.notifyPickListUpdate(input.sessionId, "ITEM_REMOVED");

      return {
        success: true,
        releasedItems: cartItems.length,
        message: `Session cancelled. ${cartItems.length} items released from soft hold.`,
      };
    }),

  // ==========================================================================
  // ENHANCED CREDIT CHECK (MEET-075-BE)
  // ==========================================================================

  getDetailedCreditStatus: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ sessionId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      const creditResult = await sessionCreditService.validateCartCredit(
        input.sessionId,
        session.clientId
      );

      const exposure = await sessionCreditService.getDraftExposure(input.sessionId);

      const cart = await sessionCartService.getCart(input.sessionId);
      const toPurchaseItems = cart.items.filter((i) => i.itemStatus === "TO_PURCHASE");
      const toPurchaseValue = toPurchaseItems.reduce(
        (sum, i) => sum + parseFloat(i.quantity.toString()) * parseFloat(i.unitPrice.toString()),
        0
      );

      return {
        ...creditResult,
        breakdown: {
          toPurchaseValue,
          interestedValue: exposure.totalCartValue - toPurchaseValue - exposure.sampleValue,
          sampleValue: exposure.sampleValue,
          totalCartValue: exposure.totalCartValue,
          toPurchaseCount: toPurchaseItems.length,
          totalItemCount: cart.itemCount,
        },
        percentUtilized: creditResult.creditLimit > 0
          ? ((creditResult.projectedExposure / creditResult.creditLimit) * 100).toFixed(1)
          : "N/A",
      };
    }),
});
