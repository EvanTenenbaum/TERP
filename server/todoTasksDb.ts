import { getDb } from "./db";
import {
  todoTasks,
  type TodoTask,
  type InsertTodoTask,
} from "../drizzle/schema";
import { eq, and, desc, asc, isNotNull, sql } from "drizzle-orm";
import {
  PaginatedResult,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./_core/pagination";

/**
 * Todo Tasks Database Access Layer
 * Handles CRUD operations for tasks within lists
 */

// ============================================================================
// TODO TASKS QUERIES
// ============================================================================

/**
 * Get all tasks in a list with pagination
 * BUG-034: Returns PaginatedResult with cursor-based pagination
 */
export async function getListTasks(
  listId: number,
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<TodoTask>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoTasks)
    .where(eq(todoTasks.listId, listId));
  const total = Number(countResult?.count ?? 0);

  // Build query with optional cursor
  let whereCondition = eq(todoTasks.listId, listId);
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      whereCondition = and(
        eq(todoTasks.listId, listId),
        sql`${todoTasks.id} > ${cursorId}`
      ) as typeof whereCondition;
    }
  }

  // Get paginated tasks
  const tasks = await db
    .select()
    .from(todoTasks)
    .where(whereCondition)
    .orderBy(asc(todoTasks.position), desc(todoTasks.createdAt))
    .limit(limit + 1);

  const hasMore = tasks.length > limit;
  const items = hasMore ? tasks.slice(0, limit) : tasks;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get tasks assigned to a specific user with pagination
 * BUG-034: Returns PaginatedResult with cursor-based pagination
 */
export async function getUserAssignedTasks(
  userId: number,
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<TodoTask>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoTasks)
    .where(eq(todoTasks.assignedTo, userId));
  const total = Number(countResult?.count ?? 0);

  // Build query with optional cursor
  let whereCondition = eq(todoTasks.assignedTo, userId);
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      whereCondition = and(
        eq(todoTasks.assignedTo, userId),
        sql`${todoTasks.id} > ${cursorId}`
      ) as typeof whereCondition;
    }
  }

  // Get paginated tasks
  const tasks = await db
    .select()
    .from(todoTasks)
    .where(whereCondition)
    .orderBy(desc(todoTasks.dueDate), desc(todoTasks.createdAt))
    .limit(limit + 1);

  const hasMore = tasks.length > limit;
  const items = hasMore ? tasks.slice(0, limit) : tasks;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get a specific task by ID
 */
export async function getTaskById(taskId: number): Promise<TodoTask | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [task] = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.id, taskId))
    .limit(1);

  return task || null;
}

/**
 * Create a new task
 */
export async function createTask(data: InsertTodoTask): Promise<TodoTask> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get the next position in the list
  const [maxPosition] = await db
    .select({ max: sql<number>`MAX(${todoTasks.position})` })
    .from(todoTasks)
    .where(eq(todoTasks.listId, data.listId));

  const nextPosition = (maxPosition?.max ?? -1) + 1;

  const [result] = await db
    .insert(todoTasks)
    .values({
      ...data,
      position: data.position ?? nextPosition,
    })
    .$returningId();

  const [newTask] = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.id, result.id))
    .limit(1);

  if (!newTask) throw new Error("Failed to create task");

  return newTask;
}

/**
 * Update a task
 */
export async function updateTask(
  taskId: number,
  data: Partial<InsertTodoTask>
): Promise<TodoTask> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(todoTasks).set(data).where(eq(todoTasks.id, taskId));

  const [updated] = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.id, taskId))
    .limit(1);

  if (!updated) throw new Error("Task not found after update");

  return updated;
}

/**
 * Mark a task as completed
 */
export async function completeTask(
  taskId: number,
  completedBy: number
): Promise<TodoTask> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(todoTasks)
    .set({
      isCompleted: true,
      status: "done",
      completedAt: new Date(),
      completedBy,
    })
    .where(eq(todoTasks.id, taskId));

  const [updated] = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.id, taskId))
    .limit(1);

  if (!updated) throw new Error("Task not found after completion");

  return updated;
}

/**
 * Mark a task as incomplete
 */
export async function uncompleteTask(taskId: number): Promise<TodoTask> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(todoTasks)
    .set({
      isCompleted: false,
      status: "todo",
      completedAt: null,
      completedBy: null,
    })
    .where(eq(todoTasks.id, taskId));

  const [updated] = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.id, taskId))
    .limit(1);

  if (!updated) throw new Error("Task not found after uncomplete");

  return updated;
}

/**
 * Delete a task
 */
export async function deleteTask(taskId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(todoTasks).where(eq(todoTasks.id, taskId));
}

/**
 * Reorder tasks in a list
 */
export async function reorderTasks(
  listId: number,
  taskPositions: Array<{ taskId: number; position: number }>
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Update each task's position
  for (const { taskId, position } of taskPositions) {
    await db
      .update(todoTasks)
      .set({ position })
      .where(and(eq(todoTasks.id, taskId), eq(todoTasks.listId, listId)));
  }
}

/**
 * Assign a task to a user
 */
export async function assignTask(
  taskId: number,
  userId: number | null
): Promise<TodoTask> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(todoTasks)
    .set({ assignedTo: userId })
    .where(eq(todoTasks.id, taskId));

  const [updated] = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.id, taskId))
    .limit(1);

  if (!updated) throw new Error("Task not found after assignment");

  return updated;
}

/**
 * Get overdue tasks with pagination
 * BUG-034: Returns PaginatedResult instead of raw array
 */
export async function getOverdueTasks(
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<TodoTask>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const now = new Date();

  const baseCondition = and(
    isNotNull(todoTasks.dueDate),
    sql`${todoTasks.dueDate} < ${now}`,
    eq(todoTasks.isCompleted, false)
  );

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoTasks)
    .where(baseCondition);
  const total = Number(countResult?.count ?? 0);

  // Build query with optional cursor
  let whereCondition = baseCondition;
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      whereCondition = and(baseCondition, sql`${todoTasks.id} > ${cursorId}`);
    }
  }

  const tasks = await db
    .select()
    .from(todoTasks)
    .where(whereCondition)
    .orderBy(asc(todoTasks.dueDate))
    .limit(limit + 1);

  const hasMore = tasks.length > limit;
  const items = hasMore ? tasks.slice(0, limit) : tasks;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get tasks due soon (within next 7 days) with pagination
 * BUG-034: Returns PaginatedResult instead of raw array
 */
export async function getTasksDueSoon(
  options?: { limit?: number; cursor?: string | null }
): Promise<PaginatedResult<TodoTask>> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const limit = Math.min(options?.limit || DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE);
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const baseCondition = and(
    isNotNull(todoTasks.dueDate),
    sql`${todoTasks.dueDate} >= ${now}`,
    sql`${todoTasks.dueDate} <= ${sevenDaysFromNow}`,
    eq(todoTasks.isCompleted, false)
  );

  // Get total count
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoTasks)
    .where(baseCondition);
  const total = Number(countResult?.count ?? 0);

  // Build query with optional cursor
  let whereCondition = baseCondition;
  if (options?.cursor) {
    const cursorId = parseInt(options.cursor, 10);
    if (!isNaN(cursorId)) {
      whereCondition = and(baseCondition, sql`${todoTasks.id} > ${cursorId}`);
    }
  }

  const tasks = await db
    .select()
    .from(todoTasks)
    .where(whereCondition)
    .orderBy(asc(todoTasks.dueDate))
    .limit(limit + 1);

  const hasMore = tasks.length > limit;
  const items = hasMore ? tasks.slice(0, limit) : tasks;
  const lastItem = items[items.length - 1];
  const nextCursor = hasMore && lastItem ? String(lastItem.id) : null;

  return {
    items,
    nextCursor,
    hasMore,
    total,
  };
}

/**
 * Get task statistics for a list
 */
export async function getListTaskStats(listId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [stats] = await db
    .select({
      total: sql<number>`COUNT(*)`,
      completed: sql<number>`SUM(CASE WHEN ${todoTasks.isCompleted} = true THEN 1 ELSE 0 END)`,
      todo: sql<number>`SUM(CASE WHEN ${todoTasks.status} = 'todo' THEN 1 ELSE 0 END)`,
      inProgress: sql<number>`SUM(CASE WHEN ${todoTasks.status} = 'in_progress' THEN 1 ELSE 0 END)`,
      overdue: sql<number>`SUM(CASE WHEN ${todoTasks.dueDate} < NOW() AND ${todoTasks.isCompleted} = false THEN 1 ELSE 0 END)`,
    })
    .from(todoTasks)
    .where(eq(todoTasks.listId, listId));

  return {
    total: Number(stats?.total ?? 0),
    completed: Number(stats?.completed ?? 0),
    todo: Number(stats?.todo ?? 0),
    inProgress: Number(stats?.inProgress ?? 0),
    overdue: Number(stats?.overdue ?? 0),
  };
}
