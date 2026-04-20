/**
 * Activity Router (TER-1056)
 *
 * Unified dashboard activity feed. Pulls recent rows from orders, payments,
 * and inventory_movements, merges them into a single timeline, and exposes a
 * filtered/paginated view tailored for the dashboard activity widget.
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import {
  clients,
  inventoryMovements,
  orders as ordersTable,
  payments as paymentsTable,
  users,
} from "../../drizzle/schema";
import { and, desc, eq, isNull, sql } from "drizzle-orm";

export const ACTIVITY_TYPES = [
  "all",
  "orders",
  "payments",
  "inventory",
  "user_actions",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface ActivityFeedItem {
  id: string;
  type: "order" | "payment" | "inventory" | "user_action";
  title: string;
  subtitle: string;
  timestamp: string;
  href?: string;
  amount?: number;
}

export interface ActivityFeedResponse {
  items: ActivityFeedItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  generatedAt: string;
}

const getFeedInputSchema = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  offset: z.number().int().min(0).default(0),
  type: z.enum(ACTIVITY_TYPES).default("all"),
});

/**
 * Pull window: how far back we look before merging and sorting.
 * We cap at (offset + limit) * 2 to give the merge enough headroom without
 * scanning entire tables.
 */
function poolSize(offset: number, limit: number): number {
  return Math.min(500, Math.max(limit + offset, 50) * 2);
}

async function fetchOrderActivity(pool: number): Promise<ActivityFeedItem[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: ordersTable.id,
      orderNumber: ordersTable.orderNumber,
      orderType: ordersTable.orderType,
      total: ordersTable.total,
      fulfillmentStatus: ordersTable.fulfillmentStatus,
      saleStatus: ordersTable.saleStatus,
      confirmedAt: ordersTable.confirmedAt,
      createdAt: ordersTable.createdAt,
      clientName: clients.name,
    })
    .from(ordersTable)
    .leftJoin(clients, eq(ordersTable.clientId, clients.id))
    .where(and(isNull(ordersTable.deletedAt), sql`${ordersTable.isDraft} = 0`))
    .orderBy(desc(ordersTable.createdAt))
    .limit(pool);

  return rows.map(row => {
    const ts = row.confirmedAt ?? row.createdAt ?? new Date();
    const label = row.orderType === "QUOTE" ? "Quote" : "Order";
    const status = row.fulfillmentStatus ?? row.saleStatus ?? "Updated";
    return {
      id: `order-${row.id}`,
      type: "order" as const,
      title: `${label} ${row.orderNumber ?? `#${row.id}`}`,
      subtitle: [row.clientName?.trim() || "Unassigned client", humanize(status)]
        .filter(Boolean)
        .join(" · "),
      timestamp: new Date(ts).toISOString(),
      href: `/sales/orders/${row.id}`,
      amount: Number(row.total || 0),
    };
  });
}

async function fetchPaymentActivity(
  pool: number
): Promise<ActivityFeedItem[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: paymentsTable.id,
      paymentNumber: paymentsTable.paymentNumber,
      paymentType: paymentsTable.paymentType,
      amount: paymentsTable.amount,
      paymentDate: paymentsTable.paymentDate,
      createdAt: paymentsTable.createdAt,
      customerName: clients.name,
    })
    .from(paymentsTable)
    .leftJoin(clients, eq(paymentsTable.customerId, clients.id))
    .where(isNull(paymentsTable.deletedAt))
    .orderBy(desc(paymentsTable.createdAt))
    .limit(pool);

  return rows.map(row => {
    const ts = row.createdAt ?? row.paymentDate ?? new Date();
    const direction =
      row.paymentType === "SENT" ? "Payment sent" : "Payment received";
    return {
      id: `payment-${row.id}`,
      type: "payment" as const,
      title: `${direction} ${row.paymentNumber ?? `#${row.id}`}`,
      subtitle: row.customerName?.trim() || "Counterparty not recorded",
      timestamp: new Date(ts).toISOString(),
      href: "/accounting/payments",
      amount: Number(row.amount || 0),
    };
  });
}

async function fetchInventoryActivity(
  pool: number
): Promise<ActivityFeedItem[]> {
  const db = await getDb();
  if (!db) return [];

  const rows = await db
    .select({
      id: inventoryMovements.id,
      batchId: inventoryMovements.batchId,
      type: inventoryMovements.inventoryMovementType,
      quantityChange: inventoryMovements.quantityChange,
      referenceType: inventoryMovements.referenceType,
      createdAt: inventoryMovements.createdAt,
    })
    .from(inventoryMovements)
    .where(isNull(inventoryMovements.deletedAt))
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(pool);

  return rows.map(row => ({
    id: `inventory-${row.id}`,
    type: "inventory" as const,
    title: `${humanize(row.type)} · Batch #${row.batchId}`,
    subtitle: [
      `${Number(row.quantityChange || 0) >= 0 ? "+" : ""}${Number(
        row.quantityChange || 0
      )} units`,
      row.referenceType ? humanize(row.referenceType) : null,
    ]
      .filter(Boolean)
      .join(" · "),
    timestamp: new Date(row.createdAt ?? new Date()).toISOString(),
    href: `/inventory?batch=${row.batchId}`,
  }));
}

async function fetchUserActionActivity(
  pool: number
): Promise<ActivityFeedItem[]> {
  const db = await getDb();
  if (!db) return [];

  // User actions surface authentication events from the main users table.
  // The audit log is entity-scoped and already exposed via the auditLogs
  // router; here we surface only the coarse sign-in signal the owner watches
  // from the dashboard.
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      lastSignedIn: users.lastSignedIn,
    })
    .from(users)
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.lastSignedIn))
    .limit(pool);

  return rows.map(row => ({
    id: `user-login-${row.id}`,
    type: "user_action" as const,
    title: `${row.name ?? row.email ?? `User #${row.id}`} signed in`,
    subtitle: row.email ?? "",
    timestamp: new Date(row.lastSignedIn ?? new Date()).toISOString(),
  }));
}

function humanize(value: string | null | undefined): string {
  if (!value) return "Updated";
  return value
    .toLowerCase()
    .split("_")
    .map(p => (p ? p[0].toUpperCase() + p.slice(1) : p))
    .join(" ");
}

export const activityRouter = router({
  getFeed: protectedProcedure
    .use(requirePermission("dashboard:read"))
    .input(getFeedInputSchema)
    .query(async ({ input }): Promise<ActivityFeedResponse> => {
      const pool = poolSize(input.offset, input.limit);

      const sourceLoaders: Record<
        Exclude<ActivityType, "all">,
        () => Promise<ActivityFeedItem[]>
      > = {
        orders: () => fetchOrderActivity(pool),
        payments: () => fetchPaymentActivity(pool),
        inventory: () => fetchInventoryActivity(pool),
        user_actions: () => fetchUserActionActivity(pool),
      };

      const keys: Array<Exclude<ActivityType, "all">> =
        input.type === "all"
          ? ["orders", "payments", "inventory", "user_actions"]
          : [input.type];

      const results = await Promise.all(keys.map(k => sourceLoaders[k]()));
      const merged = results.flat();

      merged.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const total = merged.length;
      const page = merged.slice(input.offset, input.offset + input.limit);

      return {
        items: page,
        total,
        limit: input.limit,
        offset: input.offset,
        hasMore: input.offset + page.length < total,
        generatedAt: new Date().toISOString(),
      };
    }),
});
