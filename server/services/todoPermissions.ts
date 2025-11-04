import { getUserRoleInList } from "../todoListsDb";
import { getTaskById } from "../todoTasksDb";

/**
 * Todo Permissions Service
 * Handles permission checks for todo lists and tasks
 */

// ============================================================================
// LIST PERMISSIONS
// ============================================================================

/**
 * Check if a user can view a list
 */
export async function canViewList(
  userId: number,
  listId: number
): Promise<boolean> {
  const role = await getUserRoleInList(userId, listId);
  return role !== null; // Any role can view
}

/**
 * Check if a user can edit a list (name, description)
 */
export async function canEditList(
  userId: number,
  listId: number
): Promise<boolean> {
  const role = await getUserRoleInList(userId, listId);
  return role === "owner" || role === "editor";
}

/**
 * Check if a user can delete a list
 */
export async function canDeleteList(
  userId: number,
  listId: number
): Promise<boolean> {
  const role = await getUserRoleInList(userId, listId);
  return role === "owner"; // Only owner can delete
}

/**
 * Check if a user can manage list members
 */
export async function canManageListMembers(
  userId: number,
  listId: number
): Promise<boolean> {
  const role = await getUserRoleInList(userId, listId);
  return role === "owner"; // Only owner can manage members
}

// ============================================================================
// TASK PERMISSIONS
// ============================================================================

/**
 * Check if a user can view a task
 */
export async function canViewTask(
  userId: number,
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;

  return await canViewList(userId, task.listId);
}

/**
 * Check if a user can edit a task
 */
export async function canEditTask(
  userId: number,
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;

  return await canEditList(userId, task.listId);
}

/**
 * Check if a user can delete a task
 */
export async function canDeleteTask(
  userId: number,
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;

  const role = await getUserRoleInList(userId, task.listId);
  return role === "owner" || role === "editor";
}

/**
 * Check if a user can assign a task
 */
export async function canAssignTask(
  userId: number,
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;

  const role = await getUserRoleInList(userId, task.listId);
  return role === "owner" || role === "editor";
}

/**
 * Check if a user can complete a task
 */
export async function canCompleteTask(
  userId: number,
  taskId: number
): Promise<boolean> {
  const task = await getTaskById(taskId);
  if (!task) return false;

  const role = await getUserRoleInList(userId, task.listId);

  // Owner and editor can always complete
  if (role === "owner" || role === "editor") return true;

  // Assigned user can complete their own task
  if (task.assignedTo === userId) return true;

  return false;
}

// ============================================================================
// PERMISSION HELPERS
// ============================================================================

/**
 * Assert that a user can view a list (throws error if not)
 */
export async function assertCanViewList(
  userId: number,
  listId: number
): Promise<void> {
  const can = await canViewList(userId, listId);
  if (!can) {
    throw new Error("You do not have permission to view this list");
  }
}

/**
 * Assert that a user can edit a list (throws error if not)
 */
export async function assertCanEditList(
  userId: number,
  listId: number
): Promise<void> {
  const can = await canEditList(userId, listId);
  if (!can) {
    throw new Error("You do not have permission to edit this list");
  }
}

/**
 * Assert that a user can delete a list (throws error if not)
 */
export async function assertCanDeleteList(
  userId: number,
  listId: number
): Promise<void> {
  const can = await canDeleteList(userId, listId);
  if (!can) {
    throw new Error("You do not have permission to delete this list");
  }
}

/**
 * Assert that a user can view a task (throws error if not)
 */
export async function assertCanViewTask(
  userId: number,
  taskId: number
): Promise<void> {
  const can = await canViewTask(userId, taskId);
  if (!can) {
    throw new Error("You do not have permission to view this task");
  }
}

/**
 * Assert that a user can edit a task (throws error if not)
 */
export async function assertCanEditTask(
  userId: number,
  taskId: number
): Promise<void> {
  const can = await canEditTask(userId, taskId);
  if (!can) {
    throw new Error("You do not have permission to edit this task");
  }
}

/**
 * Assert that a user can delete a task (throws error if not)
 */
export async function assertCanDeleteTask(
  userId: number,
  taskId: number
): Promise<void> {
  const can = await canDeleteTask(userId, taskId);
  if (!can) {
    throw new Error("You do not have permission to delete this task");
  }
}

/**
 * Assert that a user can assign a task (throws error if not)
 */
export async function assertCanAssignTask(
  userId: number,
  taskId: number
): Promise<void> {
  const can = await canAssignTask(userId, taskId);
  if (!can) {
    throw new Error("You do not have permission to assign this task");
  }
}

/**
 * Assert that a user can complete a task (throws error if not)
 */
export async function assertCanCompleteTask(
  userId: number,
  taskId: number
): Promise<void> {
  const can = await canCompleteTask(userId, taskId);
  if (!can) {
    throw new Error("You do not have permission to complete this task");
  }
}
