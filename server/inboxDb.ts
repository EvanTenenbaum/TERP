import { getDb } from "./db";
import {
  inboxItems,
  type InboxItem,
  type InsertInboxItem,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import {
  PaginatedResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./_core/pagination";

/**
 * Inbox Database Access Layer
 * Handles unified inbox for mentions and task assignments
 */

// ============================================================================
// INBOX ITEMS QUERIES
// ============================================================================

/**
 * Get all inbox items for a user with pagination
 * PERF-003: Added pagination support
 */
export async function getUserInboxItems(
  userId: number,
  includeArchived = false,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereCondition = includeArchived
    ? eq(inboxItems.userId, userId)
    : and(eq(inboxItems.userId, userId), eq(inboxItems.isArchived, false));

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inboxItems)
    .where(whereCondition);
  const total = Number(countResult?.count ?? 0);

  // Get paginated items
  const items = await db
    .select()
    .from(inboxItems)
    .where(whereCondition)
    .orderBy(desc(inboxItems.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items,
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
  };
}

/**
 * Get unread inbox items for a user with pagination
 * BUG-034: Returns PaginatedResult instead of raw array
 */
export async function getUnreadInboxItems(
  userId: number,
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<InboxItem>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const whereCondition = and(
    eq(inboxItems.userId, userId),
    eq(inboxItems.status, "unread"),
    eq(inboxItems.isArchived, false)
  );

  // Apply cursor if provided
  let cursorCondition = whereCondition;
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      cursorCondition = and(whereCondition, sql`${inboxItems.id} < ${cursorId}`);
    }
  }

  const items = await db
    .select()
    .from(inboxItems)
    .where(cursorCondition)
    .orderBy(desc(inboxItems.createdAt))
    .limit(limit + 1);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inboxItems)
    .where(whereCondition);
  const total = Number(countResult?.count ?? 0);

  const hasMore = items.length > limit;
  const trimmedItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = trimmedItems[trimmedItems.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items: trimmedItems,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get inbox items by status with pagination
 * BUG-034: Returns PaginatedResult instead of raw array
 */
export async function getInboxItemsByStatus(
  userId: number,
  status: "unread" | "seen" | "completed",
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<InboxItem>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const whereCondition = and(
    eq(inboxItems.userId, userId),
    eq(inboxItems.status, status),
    eq(inboxItems.isArchived, false)
  );

  // Apply cursor if provided
  let cursorCondition = whereCondition;
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      cursorCondition = and(whereCondition, sql`${inboxItems.id} < ${cursorId}`);
    }
  }

  const items = await db
    .select()
    .from(inboxItems)
    .where(cursorCondition)
    .orderBy(desc(inboxItems.createdAt))
    .limit(limit + 1);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(inboxItems)
    .where(whereCondition);
  const total = Number(countResult?.count ?? 0);

  const hasMore = items.length > limit;
  const trimmedItems = hasMore ? items.slice(0, limit) : items;
  const lastItem = trimmedItems[trimmedItems.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items: trimmedItems,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get a specific inbox item by ID
 */
export async function getInboxItemById(
  itemId: number
): Promise<InboxItem | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [item] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  return item || null;
}

/**
 * Create a new inbox item
 */
export async function createInboxItem(
  data: InsertInboxItem
): Promise<InboxItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(inboxItems).values(data).$returningId();

  const [newItem] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, result.id))
    .limit(1);

  if (!newItem) throw new Error("Failed to create inbox item");

  return newItem;
}

/**
 * Mark an inbox item as seen
 */
export async function markInboxItemAsSeen(itemId: number): Promise<InboxItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(inboxItems)
    .set({
      status: "seen",
      seenAt: new Date(),
    })
    .where(eq(inboxItems.id, itemId));

  const [updated] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!updated) throw new Error("Inbox item not found after update");

  return updated;
}

/**
 * Mark an inbox item as completed
 */
export async function markInboxItemAsCompleted(
  itemId: number
): Promise<InboxItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(inboxItems)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(eq(inboxItems.id, itemId));

  const [updated] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!updated) throw new Error("Inbox item not found after update");

  return updated;
}

/**
 * Mark an inbox item as unread
 */
export async function markInboxItemAsUnread(
  itemId: number
): Promise<InboxItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(inboxItems)
    .set({
      status: "unread",
      seenAt: null,
      completedAt: null,
    })
    .where(eq(inboxItems.id, itemId));

  const [updated] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!updated) throw new Error("Inbox item not found after update");

  return updated;
}

/**
 * Archive an inbox item
 */
export async function archiveInboxItem(itemId: number): Promise<InboxItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(inboxItems)
    .set({ isArchived: true })
    .where(eq(inboxItems.id, itemId));

  const [updated] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!updated) throw new Error("Inbox item not found after archive");

  return updated;
}

/**
 * Unarchive an inbox item
 */
export async function unarchiveInboxItem(itemId: number): Promise<InboxItem> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(inboxItems)
    .set({ isArchived: false })
    .where(eq(inboxItems.id, itemId));

  const [updated] = await db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.id, itemId))
    .limit(1);

  if (!updated) throw new Error("Inbox item not found after unarchive");

  return updated;
}

/**
 * Delete an inbox item
 */
export async function deleteInboxItem(itemId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(inboxItems).where(eq(inboxItems.id, itemId));
}

/**
 * Get inbox statistics for a user
 */
export async function getUserInboxStats(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      unread: sql<number>`SUM(CASE WHEN ${inboxItems.status} = 'unread' THEN 1 ELSE 0 END)`,
      seen: sql<number>`SUM(CASE WHEN ${inboxItems.status} = 'seen' THEN 1 ELSE 0 END)`,
      completed: sql<number>`SUM(CASE WHEN ${inboxItems.status} = 'completed' THEN 1 ELSE 0 END)`,
      archived: sql<number>`SUM(CASE WHEN ${inboxItems.isArchived} = true THEN 1 ELSE 0 END)`,
    })
    .from(inboxItems)
    .where(eq(inboxItems.userId, userId));

  return {
    total: Number(stats?.total ?? 0),
    unread: Number(stats?.unread ?? 0),
    seen: Number(stats?.seen ?? 0),
    completed: Number(stats?.completed ?? 0),
    archived: Number(stats?.archived ?? 0),
  };
}

/**
 * Auto-archive old completed items (older than 30 days)
 */
export async function autoArchiveOldItems(): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db
    .update(inboxItems)
    .set({ isArchived: true })
    .where(
      and(
        eq(inboxItems.status, "completed"),
        eq(inboxItems.isArchived, false),
        sql`${inboxItems.completedAt} < ${thirtyDaysAgo}`
      )
    );

  // MySQL returns [ResultSetHeader, FieldPacket[]] - access affectedRows from first element
  const resultHeader = Array.isArray(result) ? result[0] : result;
  return (resultHeader as { affectedRows?: number })?.affectedRows ?? 0;
}

/**
 * Bulk mark items as seen
 */
export async function bulkMarkAsSeen(itemIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (itemIds.length === 0) return;

  await db
    .update(inboxItems)
    .set({
      status: "seen",
      seenAt: new Date(),
    })
    .where(sql`${inboxItems.id} IN (${sql.join(itemIds, sql`, `)})`);
}

/**
 * Bulk mark items as completed
 */
export async function bulkMarkAsCompleted(itemIds: number[]): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (itemIds.length === 0) return;

  await db
    .update(inboxItems)
    .set({
      status: "completed",
      completedAt: new Date(),
    })
    .where(sql`${inboxItems.id} IN (${sql.join(itemIds, sql`, `)})`);
}
