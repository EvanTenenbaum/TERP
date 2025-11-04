import { getDb } from "./db";
import {
  todoTaskActivity,
  users,
  type TodoTaskActivity,
  type InsertTodoTaskActivity,
} from "../drizzle/schema";
import { eq, desc } from "drizzle-orm";

/**
 * Todo Task Activity Database Access Layer
 * Handles audit trail for task changes
 */

// ============================================================================
// TASK ACTIVITY QUERIES
// ============================================================================

/**
 * Get all activity for a task
 */
export async function getTaskActivity(taskId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const activity = await db
    .select({
      id: todoTaskActivity.id,
      taskId: todoTaskActivity.taskId,
      userId: todoTaskActivity.userId,
      action: todoTaskActivity.action,
      fieldChanged: todoTaskActivity.fieldChanged,
      oldValue: todoTaskActivity.oldValue,
      newValue: todoTaskActivity.newValue,
      createdAt: todoTaskActivity.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(todoTaskActivity)
    .innerJoin(users, eq(todoTaskActivity.userId, users.id))
    .where(eq(todoTaskActivity.taskId, taskId))
    .orderBy(desc(todoTaskActivity.createdAt));

  return activity;
}

/**
 * Log a task activity event
 */
export async function logTaskActivity(
  data: InsertTodoTaskActivity
): Promise<TodoTaskActivity> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db
    .insert(todoTaskActivity)
    .values(data)
    .$returningId();

  const [newActivity] = await db
    .select()
    .from(todoTaskActivity)
    .where(eq(todoTaskActivity.id, result.id))
    .limit(1);

  if (!newActivity) throw new Error("Failed to log activity");

  return newActivity;
}

/**
 * Log task creation
 */
export async function logTaskCreated(
  taskId: number,
  userId: number
): Promise<void> {
  await logTaskActivity({
    taskId,
    userId,
    action: "created",
  });
}

/**
 * Log task update
 */
export async function logTaskUpdated(
  taskId: number,
  userId: number,
  fieldChanged: string,
  oldValue: string | null,
  newValue: string | null
): Promise<void> {
  await logTaskActivity({
    taskId,
    userId,
    action: "updated",
    fieldChanged,
    oldValue,
    newValue,
  });
}

/**
 * Log task status change
 */
export async function logTaskStatusChanged(
  taskId: number,
  userId: number,
  oldStatus: string,
  newStatus: string
): Promise<void> {
  await logTaskActivity({
    taskId,
    userId,
    action: "status_changed",
    fieldChanged: "status",
    oldValue: oldStatus,
    newValue: newStatus,
  });
}

/**
 * Log task assignment
 */
export async function logTaskAssigned(
  taskId: number,
  userId: number,
  assignedToName: string | null
): Promise<void> {
  await logTaskActivity({
    taskId,
    userId,
    action: "assigned",
    fieldChanged: "assigned_to",
    newValue: assignedToName,
  });
}

/**
 * Log task completion
 */
export async function logTaskCompleted(
  taskId: number,
  userId: number
): Promise<void> {
  await logTaskActivity({
    taskId,
    userId,
    action: "completed",
  });
}

/**
 * Log task deletion
 */
export async function logTaskDeleted(
  taskId: number,
  userId: number
): Promise<void> {
  await logTaskActivity({
    taskId,
    userId,
    action: "deleted",
  });
}

/**
 * Get recent activity for a user
 */
export async function getUserRecentActivity(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const activity = await db
    .select({
      id: todoTaskActivity.id,
      taskId: todoTaskActivity.taskId,
      userId: todoTaskActivity.userId,
      action: todoTaskActivity.action,
      fieldChanged: todoTaskActivity.fieldChanged,
      oldValue: todoTaskActivity.oldValue,
      newValue: todoTaskActivity.newValue,
      createdAt: todoTaskActivity.createdAt,
      userName: users.name,
    })
    .from(todoTaskActivity)
    .innerJoin(users, eq(todoTaskActivity.userId, users.id))
    .where(eq(todoTaskActivity.userId, userId))
    .orderBy(desc(todoTaskActivity.createdAt))
    .limit(limit);

  return activity;
}
