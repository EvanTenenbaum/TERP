import { getDb } from "./db";
import {
  todoLists,
  todoListMembers,
  users,
  type TodoList,
  type InsertTodoList,
  type TodoListMember,
  type InsertTodoListMember,
} from "../drizzle/schema";
import { eq, and, or, desc, sql } from "drizzle-orm";
import {
  PaginatedResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./_core/pagination";

/**
 * Todo Lists Database Access Layer
 * Handles CRUD operations for todo lists and list membership
 */

// ============================================================================
// TODO LISTS QUERIES
// ============================================================================

/**
 * Get all lists accessible by a user (owned + shared) with pagination
 * BUG-034: Returns PaginatedResult instead of raw array
 */
export async function getUserLists(
  userId: number,
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<TodoList>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // Build base query
  let baseQuery = db
    .selectDistinct({
      id: todoLists.id,
      name: todoLists.name,
      description: todoLists.description,
      ownerId: todoLists.ownerId,
      isShared: todoLists.isShared,
      createdAt: todoLists.createdAt,
      updatedAt: todoLists.updatedAt,
    })
    .from(todoLists)
    .leftJoin(todoListMembers, eq(todoLists.id, todoListMembers.listId))
    .where(
      or(eq(todoLists.ownerId, userId), eq(todoListMembers.userId, userId))
    );

  // Apply cursor if provided
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      baseQuery = db
        .selectDistinct({
          id: todoLists.id,
          name: todoLists.name,
          description: todoLists.description,
          ownerId: todoLists.ownerId,
          isShared: todoLists.isShared,
          createdAt: todoLists.createdAt,
          updatedAt: todoLists.updatedAt,
        })
        .from(todoLists)
        .leftJoin(todoListMembers, eq(todoLists.id, todoListMembers.listId))
        .where(
          and(
            or(eq(todoLists.ownerId, userId), eq(todoListMembers.userId, userId)),
            sql`${todoLists.id} < ${cursorId}`
          )
        );
    }
  }

  const lists = await baseQuery.orderBy(desc(todoLists.updatedAt)).limit(limit + 1);

  // Get total count
  const countQuery = await db
    .selectDistinct({ id: todoLists.id })
    .from(todoLists)
    .leftJoin(todoListMembers, eq(todoLists.id, todoListMembers.listId))
    .where(
      or(eq(todoLists.ownerId, userId), eq(todoListMembers.userId, userId))
    );
  const total = countQuery.length;

  const hasMore = lists.length > limit;
  const items = hasMore ? lists.slice(0, limit) : lists;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items: items as TodoList[],
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get a specific list by ID
 */
export async function getListById(listId: number): Promise<TodoList | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [list] = await db
    .select()
    .from(todoLists)
    .where(eq(todoLists.id, listId))
    .limit(1);

  return list || null;
}

/**
 * Create a new todo list
 */
export async function createList(data: InsertTodoList): Promise<TodoList> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(todoLists).values(data).$returningId();

  const [newList] = await db
    .select()
    .from(todoLists)
    .where(eq(todoLists.id, result.id))
    .limit(1);

  if (!newList) throw new Error("Failed to create list");

  return newList;
}

/**
 * Update a todo list
 */
export async function updateList(
  listId: number,
  data: Partial<InsertTodoList>
): Promise<TodoList> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(todoLists).set(data).where(eq(todoLists.id, listId));

  const [updated] = await db
    .select()
    .from(todoLists)
    .where(eq(todoLists.id, listId))
    .limit(1);

  if (!updated) throw new Error("List not found after update");

  return updated;
}

/**
 * Delete a todo list
 */
export async function deleteList(listId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(todoLists).where(eq(todoLists.id, listId));
}

// ============================================================================
// LIST MEMBERS QUERIES
// ============================================================================

/**
 * Member with user info type for list members query
 */
type ListMemberWithUser = {
  id: number;
  listId: number;
  userId: number;
  role: "owner" | "editor" | "viewer";
  addedAt: Date;
  addedBy: number | null;
  userName: string;
  userEmail: string;
};

/**
 * Get all members of a list with pagination
 * BUG-034: Returns PaginatedResult instead of raw array
 */
export async function getListMembers(
  listId: number,
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<ListMemberWithUser>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  let query = db
    .select({
      id: todoListMembers.id,
      listId: todoListMembers.listId,
      userId: todoListMembers.userId,
      role: todoListMembers.role,
      addedAt: todoListMembers.addedAt,
      addedBy: todoListMembers.addedBy,
      userName: users.name,
      userEmail: users.email,
    })
    .from(todoListMembers)
    .innerJoin(users, eq(todoListMembers.userId, users.id))
    .where(eq(todoListMembers.listId, listId));

  // Apply cursor if provided
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      query = db
        .select({
          id: todoListMembers.id,
          listId: todoListMembers.listId,
          userId: todoListMembers.userId,
          role: todoListMembers.role,
          addedAt: todoListMembers.addedAt,
          addedBy: todoListMembers.addedBy,
          userName: users.name,
          userEmail: users.email,
        })
        .from(todoListMembers)
        .innerJoin(users, eq(todoListMembers.userId, users.id))
        .where(
          and(
            eq(todoListMembers.listId, listId),
            sql`${todoListMembers.id} > ${cursorId}`
          )
        );
    }
  }

  const members = await query.orderBy(todoListMembers.addedAt).limit(limit + 1);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoListMembers)
    .where(eq(todoListMembers.listId, listId));
  const total = Number(countResult?.count ?? 0);

  const hasMore = members.length > limit;
  const items = hasMore ? members.slice(0, limit) : members;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items: items as ListMemberWithUser[],
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get a user's role in a list
 */
export async function getUserRoleInList(
  userId: number,
  listId: number
): Promise<"owner" | "editor" | "viewer" | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if user is owner
  const [list] = await db
    .select()
    .from(todoLists)
    .where(eq(todoLists.id, listId))
    .limit(1);

  if (list?.ownerId === userId) {
    return "owner";
  }

  // Check if user is a member
  const [member] = await db
    .select()
    .from(todoListMembers)
    .where(
      and(
        eq(todoListMembers.listId, listId),
        eq(todoListMembers.userId, userId)
      )
    )
    .limit(1);

  return member?.role || null;
}

/**
 * Add a member to a list
 */
export async function addListMember(
  data: InsertTodoListMember
): Promise<TodoListMember> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(todoListMembers).values(data).$returningId();

  const [newMember] = await db
    .select()
    .from(todoListMembers)
    .where(eq(todoListMembers.id, result.id))
    .limit(1);

  if (!newMember) throw new Error("Failed to add member");

  return newMember;
}

/**
 * Update a member's role in a list
 */
export async function updateListMemberRole(
  listId: number,
  userId: number,
  role: "owner" | "editor" | "viewer"
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(todoListMembers)
    .set({ role })
    .where(
      and(
        eq(todoListMembers.listId, listId),
        eq(todoListMembers.userId, userId)
      )
    );
}

/**
 * Remove a member from a list
 */
export async function removeListMember(
  listId: number,
  userId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(todoListMembers)
    .where(
      and(
        eq(todoListMembers.listId, listId),
        eq(todoListMembers.userId, userId)
      )
    );
}

/**
 * Check if a user has access to a list
 */
export async function userHasAccessToList(
  userId: number,
  listId: number
): Promise<boolean> {
  const role = await getUserRoleInList(userId, listId);
  return role !== null;
}
