import { getDb } from "./db";
import {
  todoTasks,
  type TodoTask,
  type InsertTodoTask,
} from "../drizzle/schema";
import { eq, and, desc, asc, isNotNull, sql } from "drizzle-orm";

/**
 * Todo Tasks Database Access Layer
 * Handles CRUD operations for tasks within lists
 */

// ============================================================================
// TASK QUERIES
// ============================================================================

/**
 * Get all tasks in a list with pagination
 * PERF-003: Added pagination support
 */
export async function getListTasks(
  listId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoTasks)
    .where(eq(todoTasks.listId, listId));
  const total = Number(countResult?.count ?? 0);

  // Get paginated tasks
  const tasks = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.listId, listId))
    .orderBy(asc(todoTasks.position), desc(todoTasks.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: tasks,
    total,
    limit,
    offset,
    hasMore: offset + tasks.length < total,
  };
}

/**
 * Get tasks assigned to a specific user with pagination
 * PERF-003: Added pagination support
 */
export async function getUserAssignedTasks(
  userId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(todoTasks)
    .where(eq(todoTasks.assignedTo, userId));
  const total = Number(countResult?.count ?? 0);

  // Get paginated tasks
  const tasks = await db
    .select()
    .from(todoTasks)
    .where(eq(todoTasks.assignedTo, userId))
    .orderBy(desc(todoTasks.dueDate), desc(todoTasks.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: tasks,
    total,
    limit,
    offset,
    hasMore: offset + tasks.length < total,
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
 * Get overdue tasks
 */
export async function getOverdueTasks(): Promise<TodoTask[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();

  const tasks = await db
    .select()
    .from(todoTasks)
    .where(
      and(
        isNotNull(todoTasks.dueDate),
        sql`${todoTasks.dueDate} < ${now}`,
        eq(todoTasks.isCompleted, false)
      )
    )
    .orderBy(asc(todoTasks.dueDate));

  return tasks;
}

/**
 * Get tasks due soon (within next 7 days)
 */
export async function getTasksDueSoon(): Promise<TodoTask[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const tasks = await db
    .select()
    .from(todoTasks)
    .where(
      and(
        isNotNull(todoTasks.dueDate),
        sql`${todoTasks.dueDate} >= ${now}`,
        sql`${todoTasks.dueDate} <= ${sevenDaysFromNow}`,
        eq(todoTasks.isCompleted, false)
      )
    )
    .orderBy(asc(todoTasks.dueDate));

  return tasks;
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
