import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { 
  liveShoppingSessions, 
  sessionCartItems, 
  sessionPriceOverrides 
} from "../../drizzle/schema-live-shopping";
import { clients, users, products, batches } from "../../drizzle/schema";
import { eq, and, desc, like, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { sessionCartService } from "../services/live-shopping/sessionCartService";
import { sessionPricingService } from "../services/live-shopping/sessionPricingService";
import * as ordersDb from "../ordersDb";
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
      sessionEventManager.emitSessionStatus(input.sessionId, input.status);

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
      sessionEventManager.emitHighlight(input.sessionId, input.isHighlighted ? input.batchId : null);
      
      // Also update cart view
      await sessionCartService.emitCartUpdate(input.sessionId);
      
      return { success: true };
    }),

  /**
   * Helper: Search Products for the Host Panel
   */
  searchProducts: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ query: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      
      // Search batches available
      const results = await db
        .select({
          batchId: batches.id,
          productId: products.id,
          productName: products.nameCanonical,
          batchCode: batches.code,
          onHand: batches.onHandQty,
          reserved: batches.reservedQty,
          unitCost: batches.unitCost,
        })
        .from(batches)
        .innerJoin(products, eq(batches.productId, products.id))
        .where(
          or(
            like(products.nameCanonical, `%${input.query}%`),
            like(batches.code, `%${input.query}%`)
          )
        )
        .limit(20);

      return results;
    }),

  // ==========================================================================
  // FINALIZE
  // ==========================================================================

  /**
   * End Session and Optionally Convert to Order
   */
  endSession: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(
      z.object({
        sessionId: z.number(),
        convertToOrder: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const userId = getAuthenticatedUserId(ctx);

      // 1. Get Session & Cart
      const session = await db.query.liveShoppingSessions.findFirst({
        where: eq(liveShoppingSessions.id, input.sessionId),
      });

      if (!session) throw new TRPCError({ code: "NOT_FOUND" });

      if (session.status === "ENDED" || session.status === "CONVERTED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Session already ended" });
      }

      let orderId: number | undefined;

      // 2. Convert to Order logic
      if (input.convertToOrder) {
        const cart = await sessionCartService.getCart(input.sessionId);
        
        if (cart.items.length === 0) {
           throw new TRPCError({ code: "BAD_REQUEST", message: "Cannot convert empty session to order" });
        }

        const lineItems = cart.items.map(item => ({
          batchId: item.batchId,
          quantity: parseFloat(item.quantity as string),
          unitPrice: parseFloat(item.unitPrice as string),
          isSample: false, // Defaulting to false for now
          // We pass overrideCogs/Price if needed, but ordersDb.createOrder calculates COGS. 
          // We need to ensure the price we negotiated in session sticks.
          overridePrice: parseFloat(item.unitPrice as string), 
        }));

        // Call existing Orders Logic
        const newOrder = await ordersDb.createOrder({
          orderType: "SALE",
          clientId: session.clientId,
          items: lineItems,
          createdBy: userId,
          notes: `Created from Live Shopping Session #${session.id} (${session.title})`,
          paymentTerms: "NET_30", // Default, host should probably edit later
        });
        
        orderId = newOrder.id;
      }

      // 3. Update Session Status
      await db
        .update(liveShoppingSessions)
        .set({
          status: input.convertToOrder ? "CONVERTED" : "ENDED",
          endedAt: new Date(),
        })
        .where(eq(liveShoppingSessions.id, input.sessionId));

      // Emit final event
      sessionEventManager.emitSessionStatus(
        input.sessionId, 
        input.convertToOrder ? "CONVERTED" : "ENDED"
      );

      return { success: true, orderId };
    }),
});
