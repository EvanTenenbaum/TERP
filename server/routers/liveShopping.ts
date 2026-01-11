import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  liveShoppingSessions,
  sessionCartItems,
} from "../../drizzle/schema-live-shopping";
import { clients, users, products, batches } from "../../drizzle/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sessionCartService } from "../services/live-shopping/sessionCartService";
import { sessionPricingService } from "../services/live-shopping/sessionPricingService";
import { sessionOrderService } from "../services/live-shopping/sessionOrderService";
import { sessionCreditService } from "../services/live-shopping/sessionCreditService";
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
});
