/**
 * Sprint 4 Track B: Client 360 View Router
 *
 * Comprehensive API for client management including:
 * - 4.B.1: ENH-002 - Client 360 Pod (getClient360)
 * - 4.B.4: MEET-012 - Client Tagging with Referrer
 * - 4.B.5: MEET-013 - Referrer Lookup
 * - 4.B.6: MEET-021 - Client Wants/Needs Tracking
 * - 4.B.7: MEET-020 - Suggested Buyers
 * - 4.B.8: MEET-022 - Reverse Lookup (Product Connections)
 * - 4.B.10: WS-011 - Quick Customer Creation
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  clients,
  orders,
  batches,
  clientTransactions,
  clientActivity,
  clientCommunications,
  users,
} from "../../drizzle/schema";
import {
  eq,
  desc,
  and,
  sql,
  like,
  or,
  count,
  sum,
  avg,
  inArray,
} from "drizzle-orm";

export const client360Router = router({
  // ============================================================================
  // 4.B.1: ENH-002 - Client 360 View
  // ============================================================================

  /**
   * Get comprehensive Client 360 view data
   * Includes: client info, purchase history, order history, balance/credit, notes, activity
   */
  getClient360: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        clientId: z.number(),
        includePurchaseHistory: z.boolean().default(true),
        includeOrderHistory: z.boolean().default(true),
        includeActivity: z.boolean().default(true),
        includeWants: z.boolean().default(true),
        activityLimit: z.number().default(20),
        orderLimit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get client basic info
      const [client] = await db
        .select()
        .from(clients)
        .where(
          and(eq(clients.id, input.clientId), sql`${clients.deletedAt} IS NULL`)
        )
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Get referrer info if exists
      let referrer = null;
      if (client.referredByClientId) {
        const [referrerData] = await db
          .select({
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          })
          .from(clients)
          .where(eq(clients.id, client.referredByClientId))
          .limit(1);
        referrer = referrerData || null;
      }

      // Get referral count (clients referred by this client)
      const [referralCount] = await db
        .select({ count: count() })
        .from(clients)
        .where(
          and(
            eq(clients.referredByClientId, input.clientId),
            sql`${clients.deletedAt} IS NULL`
          )
        );

      // Get order summary
      const [orderStats] = await db
        .select({
          totalOrders: count(),
          totalRevenue: sum(orders.total),
          avgOrderValue: avg(orders.total),
        })
        .from(orders)
        .where(eq(orders.clientId, input.clientId));

      // Get recent orders if requested
      let recentOrders: Array<{
        id: number;
        orderNumber: string | null;
        fulfillmentStatus: string | null;
        total: string | null;
        createdAt: Date | null;
      }> = [];
      if (input.includeOrderHistory) {
        recentOrders = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            fulfillmentStatus: orders.fulfillmentStatus,
            total: orders.total,
            createdAt: orders.createdAt,
          })
          .from(orders)
          .where(eq(orders.clientId, input.clientId))
          .orderBy(desc(orders.createdAt))
          .limit(input.orderLimit);
      }

      // Get transaction summary
      const [transactionStats] = await db
        .select({
          totalTransactions: count(),
          pendingPayments: sum(
            sql`CASE WHEN ${clientTransactions.paymentStatus} != 'PAID' THEN ${clientTransactions.amount} ELSE 0 END`
          ),
          totalPaid: sum(
            sql`CASE WHEN ${clientTransactions.paymentStatus} = 'PAID' THEN ${clientTransactions.amount} ELSE 0 END`
          ),
        })
        .from(clientTransactions)
        .where(eq(clientTransactions.clientId, input.clientId));

      // Get recent activity if requested
      let recentActivity: Array<{
        id: number;
        activityType: string;
        metadata: unknown;
        createdAt: Date | null;
        userName: string | null;
      }> = [];
      if (input.includeActivity) {
        recentActivity = await db
          .select({
            id: clientActivity.id,
            activityType: clientActivity.activityType,
            metadata: clientActivity.metadata,
            createdAt: clientActivity.createdAt,
            userName: users.name,
          })
          .from(clientActivity)
          .leftJoin(users, eq(clientActivity.userId, users.id))
          .where(eq(clientActivity.clientId, input.clientId))
          .orderBy(desc(clientActivity.createdAt))
          .limit(input.activityLimit);
      }

      // Get communications summary
      const [commsStats] = await db
        .select({
          totalCommunications: count(),
          lastCommunicationAt: sql<Date>`MAX(${clientCommunications.communicatedAt})`,
        })
        .from(clientCommunications)
        .where(eq(clientCommunications.clientId, input.clientId));

      // Get purchase history summary (products bought) - items stored as JSON in orders.items
      let purchaseHistory: Array<{
        productId: number | null;
        productName: string | null;
        totalQuantity: string | number;
        totalSpent: string | number;
        lastPurchased: Date | null;
      }> = [];
      if (input.includePurchaseHistory) {
        // Since order items are stored as JSON, we'll aggregate orders by client
        // and parse the items JSON to extract product info
        try {
          const purchaseResults = await db.execute(
            sql`SELECT
              b.productId as product_id,
              p.nameCanonical as product_name,
              COUNT(DISTINCT o.id) as order_count,
              MAX(o.created_at) as last_purchased
            FROM orders o
            INNER JOIN batches b ON JSON_CONTAINS(o.items, JSON_OBJECT('batchId', b.id))
            INNER JOIN products p ON b.productId = p.id
            WHERE o.client_id = ${input.clientId} AND o.deleted_at IS NULL
            GROUP BY b.productId, p.nameCanonical
            ORDER BY last_purchased DESC
            LIMIT 20`
          );

          const results = purchaseResults as unknown as Array<{
            product_id: number;
            product_name: string;
            order_count: number;
            last_purchased: Date;
          }>;

          purchaseHistory = results.map(r => ({
            productId: r.product_id,
            productName: r.product_name,
            totalQuantity: r.order_count,
            totalSpent: 0,
            lastPurchased: r.last_purchased,
          }));
        } catch {
          // If JSON parsing fails, return empty purchase history
          purchaseHistory = [];
        }
      }

      // Get active client wants count
      let activeWantsCount = 0;
      if (input.includeWants) {
        try {
          const wantsResult = await db.execute(
            sql`SELECT COUNT(*) as count FROM client_wants WHERE client_id = ${input.clientId} AND status = 'ACTIVE'`
          );
          const wantsData = wantsResult as unknown as Array<{ count: number }>;
          activeWantsCount = wantsData[0]?.count || 0;
        } catch {
          // Table may not exist yet
          activeWantsCount = 0;
        }
      }

      return {
        client: {
          ...client,
          referrer,
          referralCount: referralCount?.count || 0,
        },
        orderSummary: {
          totalOrders: Number(orderStats?.totalOrders || 0),
          totalRevenue: parseFloat(String(orderStats?.totalRevenue || "0")),
          avgOrderValue: parseFloat(String(orderStats?.avgOrderValue || "0")),
        },
        transactionSummary: {
          totalTransactions: Number(transactionStats?.totalTransactions || 0),
          pendingPayments: parseFloat(
            String(transactionStats?.pendingPayments || "0")
          ),
          totalPaid: parseFloat(String(transactionStats?.totalPaid || "0")),
        },
        communicationsSummary: {
          totalCommunications: Number(commsStats?.totalCommunications || 0),
          lastCommunicationAt: commsStats?.lastCommunicationAt || null,
        },
        recentOrders,
        recentActivity,
        purchaseHistory,
        activeWantsCount,
      };
    }),

  // ============================================================================
  // 4.B.4/4.B.5: MEET-012/MEET-013 - Referrer Tagging and Lookup
  // ============================================================================

  /**
   * Set referrer for a client
   */
  setReferrer: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(
      z.object({
        clientId: z.number(),
        referrerClientId: z.number().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Prevent self-referral
      if (input.referrerClientId === input.clientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Client cannot refer themselves",
        });
      }

      // Prevent circular referrals
      if (input.referrerClientId) {
        const [referrer] = await db
          .select({ referredByClientId: clients.referredByClientId })
          .from(clients)
          .where(eq(clients.id, input.referrerClientId))
          .limit(1);

        if (referrer?.referredByClientId === input.clientId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Circular referral detected",
          });
        }
      }

      await db
        .update(clients)
        .set({ referredByClientId: input.referrerClientId })
        .where(eq(clients.id, input.clientId));

      // Log activity
      if (ctx.user) {
        await db.insert(clientActivity).values({
          clientId: input.clientId,
          userId: ctx.user.id,
          activityType: "UPDATED",
          metadata: {
            field: "referrer",
            referrerClientId: input.referrerClientId,
          },
        });
      }

      return { success: true };
    }),

  /**
   * Get clients referred by a specific client
   */
  getClientReferrals: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        referrerClientId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const referrals = await db
        .select({
          id: clients.id,
          name: clients.name,
          teriCode: clients.teriCode,
          email: clients.email,
          phone: clients.phone,
          isBuyer: clients.isBuyer,
          isSeller: clients.isSeller,
          totalSpent: clients.totalSpent,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(
          and(
            eq(clients.referredByClientId, input.referrerClientId),
            sql`${clients.deletedAt} IS NULL`
          )
        )
        .orderBy(desc(clients.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: count() })
        .from(clients)
        .where(
          and(
            eq(clients.referredByClientId, input.referrerClientId),
            sql`${clients.deletedAt} IS NULL`
          )
        );

      return {
        referrals,
        total: countResult?.count || 0,
      };
    }),

  /**
   * Search clients by referrer name/code
   */
  searchByReferrer: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        referrerSearch: z.string().min(1),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // First find matching referrer clients
      const referrers = await db
        .select({ id: clients.id })
        .from(clients)
        .where(
          and(
            or(
              like(clients.name, `%${input.referrerSearch}%`),
              like(clients.teriCode, `%${input.referrerSearch}%`)
            ),
            sql`${clients.deletedAt} IS NULL`
          )
        )
        .limit(10);

      if (referrers.length === 0) {
        return { clients: [], referrerIds: [] };
      }

      const referrerIds = referrers.map(r => r.id);

      // Find clients referred by these referrers
      const referredClients = await db
        .select({
          id: clients.id,
          name: clients.name,
          teriCode: clients.teriCode,
          referredByClientId: clients.referredByClientId,
          email: clients.email,
          totalSpent: clients.totalSpent,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(
          and(
            inArray(clients.referredByClientId, referrerIds),
            sql`${clients.deletedAt} IS NULL`
          )
        )
        .orderBy(desc(clients.createdAt))
        .limit(input.limit);

      return {
        clients: referredClients,
        referrerIds,
      };
    }),

  /**
   * Get referral statistics
   */
  getReferralStats: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Top referrers
      const topReferrers = await db
        .select({
          referrerId: clients.referredByClientId,
          referralCount: count(),
        })
        .from(clients)
        .where(
          and(
            sql`${clients.referredByClientId} IS NOT NULL`,
            sql`${clients.deletedAt} IS NULL`
          )
        )
        .groupBy(clients.referredByClientId)
        .orderBy(desc(count()))
        .limit(input.limit);

      // Enrich with referrer names
      const referrerIds = topReferrers
        .map(r => r.referrerId)
        .filter((id): id is number => id !== null);

      let referrerNames: Record<number, { name: string; teriCode: string }> =
        {};
      if (referrerIds.length > 0) {
        const referrerData = await db
          .select({
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          })
          .from(clients)
          .where(inArray(clients.id, referrerIds));

        referrerNames = Object.fromEntries(
          referrerData.map(r => [r.id, { name: r.name, teriCode: r.teriCode }])
        );
      }

      // Total stats
      const [totalStats] = await db
        .select({
          totalClientsWithReferrer: count(),
        })
        .from(clients)
        .where(
          and(
            sql`${clients.referredByClientId} IS NOT NULL`,
            sql`${clients.deletedAt} IS NULL`
          )
        );

      const [totalReferrers] = await db
        .select({
          uniqueReferrers: sql<number>`COUNT(DISTINCT ${clients.referredByClientId})`,
        })
        .from(clients)
        .where(
          and(
            sql`${clients.referredByClientId} IS NOT NULL`,
            sql`${clients.deletedAt} IS NULL`
          )
        );

      return {
        topReferrers: topReferrers.map(r => ({
          referrerId: r.referrerId,
          referrerName: r.referrerId ? referrerNames[r.referrerId]?.name : null,
          referrerCode: r.referrerId
            ? referrerNames[r.referrerId]?.teriCode
            : null,
          referralCount: Number(r.referralCount),
        })),
        totalClientsWithReferrer: Number(
          totalStats?.totalClientsWithReferrer || 0
        ),
        uniqueReferrers: Number(totalReferrers?.uniqueReferrers || 0),
      };
    }),

  /**
   * Get referral tree for a client (who referred who chain)
   */
  getReferralTree: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        clientId: z.number(),
        maxDepth: z.number().default(5),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get upward chain (who referred this client)
      const upwardChain: Array<{
        id: number;
        name: string;
        teriCode: string;
        level: number;
      }> = [];
      let currentId: number | null = input.clientId;
      let level = 0;

      while (currentId && level < input.maxDepth) {
        const [currentClient] = await db
          .select({
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
            referredByClientId: clients.referredByClientId,
          })
          .from(clients)
          .where(eq(clients.id, currentId))
          .limit(1);

        if (!currentClient || !currentClient.referredByClientId) break;

        const [referrer] = await db
          .select({
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
            referredByClientId: clients.referredByClientId,
          })
          .from(clients)
          .where(eq(clients.id, currentClient.referredByClientId))
          .limit(1);

        if (referrer) {
          upwardChain.push({
            id: referrer.id,
            name: referrer.name,
            teriCode: referrer.teriCode,
            level: ++level,
          });
          currentId = referrer.referredByClientId;
        } else {
          break;
        }
      }

      // Get downward tree (who this client referred)
      const downwardReferrals = await db
        .select({
          id: clients.id,
          name: clients.name,
          teriCode: clients.teriCode,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(
          and(
            eq(clients.referredByClientId, input.clientId),
            sql`${clients.deletedAt} IS NULL`
          )
        )
        .orderBy(desc(clients.createdAt))
        .limit(50);

      return {
        upwardChain: upwardChain.reverse(), // From top referrer down to direct referrer
        directReferrals: downwardReferrals,
      };
    }),

  // ============================================================================
  // 4.B.7: MEET-020 - Suggested Buyers
  // ============================================================================

  /**
   * Get suggested buyers for a product based on purchase history
   */
  getSuggestedBuyers: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        productId: z.number().optional(),
        inventoryItemId: z.number().optional(),
        categoryId: z.number().optional(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      if (!input.productId && !input.inventoryItemId && !input.categoryId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Must provide productId, inventoryItemId, or categoryId",
        });
      }

      let productIdToUse = input.productId;

      // If inventoryItemId (batchId) is provided, get the product
      if (input.inventoryItemId && !productIdToUse) {
        const [item] = await db
          .select({ productId: batches.productId })
          .from(batches)
          .where(eq(batches.id, input.inventoryItemId))
          .limit(1);
        productIdToUse = item?.productId;
      }

      // Since order items are stored as JSON in orders.items, use raw SQL
      // to find clients who purchased this product
      // Build parameterized query to prevent SQL injection
      // Using Drizzle's sql template for safe parameter binding
      const baseQuery = sql`
        SELECT
          o.client_id as clientId,
          c.name as clientName,
          c.teri_code as clientCode,
          c.email as clientEmail,
          COUNT(DISTINCT o.id) as purchaseCount,
          SUM(o.total) as totalSpent,
          MAX(o.created_at) as lastPurchaseDate,
          AVG(o.total) as avgOrderValue
        FROM orders o
        INNER JOIN clients c ON o.client_id = c.id
        INNER JOIN batches b ON JSON_CONTAINS(o.items, JSON_OBJECT('batchId', b.id))
        INNER JOIN products p ON b.productId = p.id
        WHERE o.deleted_at IS NULL AND c.deleted_at IS NULL
      `;

      // Build conditions with safe parameter binding
      const conditions: ReturnType<typeof sql>[] = [];
      if (productIdToUse) {
        conditions.push(sql`AND b.productId = ${productIdToUse}`);
      }
      if (input.categoryId) {
        conditions.push(sql`AND p.category = ${String(input.categoryId)}`);
      }

      // Combine base query with conditions and limit
      const fullQuery = sql`
        ${baseQuery}
        ${conditions.length > 0 ? sql.join(conditions, sql` `) : sql``}
        GROUP BY o.client_id, c.name, c.teri_code, c.email
        ORDER BY purchaseCount DESC, lastPurchaseDate DESC
        LIMIT ${input.limit}
      `;

      const suggestedBuyersResult = await db.execute(fullQuery);

      const suggestedBuyers = suggestedBuyersResult as unknown as Array<{
        clientId: number;
        clientName: string;
        clientCode: string;
        clientEmail: string | null;
        purchaseCount: number;
        totalSpent: string;
        lastPurchaseDate: Date;
        avgOrderValue: string;
      }>;

      return {
        suggestedBuyers: suggestedBuyers
          .map(buyer => ({
            clientId: buyer.clientId,
            clientName: buyer.clientName,
            clientCode: buyer.clientCode,
            clientEmail: buyer.clientEmail,
            purchaseCount: Number(buyer.purchaseCount),
            totalQuantity: 0, // Not available from current query
            lastPurchaseDate: buyer.lastPurchaseDate,
            avgOrderValue: parseFloat(String(buyer.avgOrderValue || "0")),
            score:
              Number(buyer.purchaseCount) * 10 +
              (buyer.lastPurchaseDate
                ? ((365 -
                    Math.min(
                      365,
                      Math.floor(
                        (Date.now() - buyer.lastPurchaseDate.getTime()) /
                          86400000
                      )
                    )) /
                    365) *
                  5
                : 0),
          }))
          .sort((a, b) => b.score - a.score),
      };
    }),

  // ============================================================================
  // 4.B.8: MEET-022 - Reverse Lookup (Product Connections)
  // ============================================================================

  /**
   * Get all clients connected to a product (purchased, want, wishlist)
   */
  getProductConnections: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        productId: z.number(),
        inventoryItemId: z.number().optional(),
        includeWants: z.boolean().default(true),
        includePurchases: z.boolean().default(true),
        limit: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const connections: Array<{
        clientId: number;
        clientName: string;
        clientCode: string;
        connectionType: "PURCHASED" | "WANTS" | "WISHLIST";
        details: unknown;
        date: Date | null;
      }> = [];

      // Get clients who purchased this product (items stored as JSON in orders.items)
      if (input.includePurchases) {
        try {
          const purchasersResult = await db.execute(
            sql`SELECT
              o.client_id as clientId,
              c.name as clientName,
              c.teri_code as clientCode,
              COUNT(DISTINCT o.id) as orderCount,
              MAX(o.created_at) as lastPurchaseDate
            FROM orders o
            INNER JOIN clients c ON o.client_id = c.id
            INNER JOIN batches b ON JSON_CONTAINS(o.items, JSON_OBJECT('batchId', b.id))
            WHERE b.productId = ${input.productId} AND o.deleted_at IS NULL
            GROUP BY o.client_id, c.name, c.teri_code
            ORDER BY lastPurchaseDate DESC
            LIMIT ${input.limit}`
          );

          const purchasers = purchasersResult as unknown as Array<{
            clientId: number;
            clientName: string;
            clientCode: string;
            orderCount: number;
            lastPurchaseDate: Date;
          }>;

          for (const p of purchasers) {
            connections.push({
              clientId: p.clientId,
              clientName: p.clientName,
              clientCode: p.clientCode,
              connectionType: "PURCHASED",
              details: {
                orderCount: Number(p.orderCount),
                totalQuantity: 0,
              },
              date: p.lastPurchaseDate,
            });
          }
        } catch {
          // If JSON parsing fails, skip purchase connections
        }
      }

      // Get clients who want this product (from client_wants table if it exists)
      if (input.includeWants) {
        try {
          const wants = await db.execute(
            sql`SELECT
              cw.client_id,
              c.name as client_name,
              c.teri_code as client_code,
              cw.priority,
              cw.notes,
              cw.created_at
            FROM client_wants cw
            INNER JOIN clients c ON cw.client_id = c.id
            WHERE cw.product_id = ${input.productId} AND cw.status = 'ACTIVE'
            ORDER BY cw.created_at DESC
            LIMIT ${input.limit}`
          );

          const wantsData = wants as unknown as Array<{
            client_id: number;
            client_name: string;
            client_code: string;
            priority: string;
            notes: string;
            created_at: Date;
          }>;

          for (const w of wantsData) {
            connections.push({
              clientId: w.client_id,
              clientName: w.client_name,
              clientCode: w.client_code,
              connectionType: "WANTS",
              details: {
                priority: w.priority,
                notes: w.notes,
              },
              date: w.created_at,
            });
          }
        } catch {
          // Table may not exist yet
        }
      }

      return {
        connections,
        productId: input.productId,
      };
    }),

  // ============================================================================
  // 4.B.10: WS-011 - Quick Customer Creation
  // ============================================================================

  /**
   * Quick create a client with minimal required fields
   */
  quickCreate: protectedProcedure
    .use(requirePermission("clients:create"))
    .input(
      z.object({
        name: z.string().min(1).max(255),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().max(50).optional(),
        isBuyer: z.boolean().default(true),
        isSeller: z.boolean().default(false),
        referredByClientId: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Generate a unique TERI code
      const prefix = input.name
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 3);

      // Find the next available code with this prefix
      const existingCodes = await db
        .select({ teriCode: clients.teriCode })
        .from(clients)
        .where(like(clients.teriCode, `${prefix}%`));

      let suffix = 1;
      let newCode = prefix;
      const existingCodeSet = new Set(existingCodes.map(c => c.teriCode));

      while (existingCodeSet.has(newCode)) {
        suffix++;
        newCode = `${prefix}${suffix}`;
      }

      // Create the client
      const [result] = await db.insert(clients).values({
        teriCode: newCode,
        name: input.name,
        email: input.email || null,
        phone: input.phone || null,
        isBuyer: input.isBuyer,
        isSeller: input.isSeller,
        referredByClientId: input.referredByClientId || null,
      });

      const clientId = Number(result.insertId);

      // Log activity
      await db.insert(clientActivity).values({
        clientId,
        userId: ctx.user.id,
        activityType: "CREATED",
        metadata: { source: "quick_create" },
      });

      // Get the created client
      const [newClient] = await db
        .select({
          id: clients.id,
          teriCode: clients.teriCode,
          name: clients.name,
          email: clients.email,
          phone: clients.phone,
          isBuyer: clients.isBuyer,
          isSeller: clients.isSeller,
        })
        .from(clients)
        .where(eq(clients.id, clientId))
        .limit(1);

      return {
        success: true,
        client: newClient,
      };
    }),

  /**
   * Search for potential auto-fill suggestions based on partial input
   */
  getAutoFillSuggestions: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        query: z.string().min(2),
        field: z.enum(["name", "email", "phone"]),
        limit: z.number().default(5),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      let fieldColumn;
      switch (input.field) {
        case "name":
          fieldColumn = clients.name;
          break;
        case "email":
          fieldColumn = clients.email;
          break;
        case "phone":
          fieldColumn = clients.phone;
          break;
      }

      const suggestions = await db
        .select({
          value: fieldColumn,
          clientId: clients.id,
          clientName: clients.name,
        })
        .from(clients)
        .where(
          and(
            like(fieldColumn, `%${input.query}%`),
            sql`${clients.deletedAt} IS NULL`
          )
        )
        .limit(input.limit);

      return {
        suggestions: suggestions.map(s => ({
          value: s.value,
          clientId: s.clientId,
          clientName: s.clientName,
        })),
      };
    }),
});
