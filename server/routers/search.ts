/**
 * Global Search Router
 * Provides unified search across quotes, customers, and products
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { clients, batches, orders } from "../../drizzle/schema";
import { like, or, and, eq, sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

export const searchRouter = router({
  /**
   * Global search across quotes, customers, and products
   */
  global: protectedProcedure
    .use(requirePermission("clients:read")) // Basic read permission required
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(10),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const searchTerm = `%${input.query}%`;
      const limit = input.limit;

      // Search quotes (orders with orderType = 'QUOTE')
      const quotes = await db
        .select({
          id: orders.id,
          type: sql<string>`'quote'`.as("type"),
          name: sql<string>`CONCAT('Quote #', ${orders.id})`.as("name"),
          description: orders.notes,
          orderNumber: orders.orderNumber,
          clientId: orders.clientId,
          total: orders.total,
          createdAt: orders.createdAt,
        })
        .from(orders)
        .where(
          and(
            eq(orders.orderType, "QUOTE"),
            or(
              like(sql`CAST(${orders.id} AS CHAR)`, searchTerm),
              like(orders.orderNumber || "", searchTerm),
              like(orders.notes || "", searchTerm)
            )
          )
        )
        .limit(limit);

      // Search customers (clients)
      const customers = await db
        .select({
          id: clients.id,
          type: sql<string>`'customer'`.as("type"),
          name: clients.name,
          description: clients.email,
          clientId: clients.id,
          email: clients.email,
          phone: clients.phone,
          createdAt: clients.createdAt,
        })
        .from(clients)
        .where(
          or(
            like(clients.name || "", searchTerm),
            like(clients.email || "", searchTerm),
            like(clients.phone || "", searchTerm),
            like(clients.teriCode || "", searchTerm)
          )
        )
        .limit(limit);

      // Search products (batches)
      const products = await db
        .select({
          id: batches.id,
          type: sql<string>`'product'`.as("type"),
          code: batches.code,
          sku: batches.sku,
          batchId: batches.id,
          onHandQty: batches.onHandQty,
          unitCogs: batches.unitCogs,
          createdAt: batches.createdAt,
        })
        .from(batches)
        .where(
          or(
            like(batches.code, searchTerm),
            like(batches.sku, searchTerm)
          )
        )
        .limit(limit);

      return {
        quotes: quotes.map((q) => ({
          id: q.id,
          type: "quote" as const,
          title: `Quote #${q.orderNumber || q.id}`,
          description: q.description || undefined,
          url: `/quotes?selected=${q.id}`,
          metadata: {
            orderNumber: q.orderNumber,
            total: q.total,
            clientId: q.clientId,
          },
        })),
        customers: customers.map((c) => ({
          id: c.id,
          type: "customer" as const,
          title: c.name || "Unknown",
          description: c.description || undefined,
          url: `/clients/${c.id}`,
          metadata: {
            email: c.email,
            phone: c.phone,
          },
        })),
        products: products.map((p) => ({
          id: p.id,
          type: "product" as const,
          title: p.code || "Unknown",
          description: p.sku || undefined,
          url: `/inventory/${p.id}`,
          metadata: {
            quantityAvailable: p.onHandQty,
            unitPrice: p.unitCogs,
          },
        })),
      };
    }),
});

