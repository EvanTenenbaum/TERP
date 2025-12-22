/**
 * Todo Tasks Router
 * API endpoints for task management within lists
 * 
 * PERF-003: Added pagination support
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as todoTasksDb from "../todoTasksDb";
import * as todoActivityDb from "../todoActivityDb";
import * as inboxDb from "../inboxDb";
import * as permissions from "../services/todoPermissions";
import { requirePermission } from "../_core/permissionMiddleware";
import { DEFAULT_PAGE_SIZE, createSafeUnifiedResponse } from "../_core/pagination";

export const todoTasksRouter = router({
  // Get all tasks in a list with pagination
  // PERF-003: Added pagination support
  getListTasks: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        listId: z.number(),
        limit: z.number().min(1).max(100).default(DEFAULT_PAGE_SIZE).optional(),
        offset: z.number().min(0).default(0).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanViewList(ctx.user.id, input.listId);

      const limit = input.limit ?? DEFAULT_PAGE_SIZE;
      const offset = input.offset ?? 0;

      // DB function already returns structured pagination response
      // { items: TodoTask[], total: number, limit: number, offset: number, hasMore: boolean }
      const result = await todoTasksDb.getListTasks(input.listId, limit, offset);
      
      // Return in unified format compatible with frontend
      return {
        items: result.items,
        nextCursor: null,
        hasMore: result.hasMore,
        pagination: { total: result.total, limit: result.limit, offset: result.offset }
      };
    }),

  // Get tasks assigned to current user with pagination
  // PERF-003: Added pagination support
  getMyTasks: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(DEFAULT_PAGE_SIZE).optional(),
        offset: z.number().min(0).default(0).optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      
      const limit = input?.limit ?? DEFAULT_PAGE_SIZE;
      const offset = input?.offset ?? 0;
      
      // DB function already returns structured pagination response
      // { items: TodoTask[], total: number, limit: number, offset: number, hasMore: boolean }
      const result = await todoTasksDb.getUserAssignedTasks(ctx.user.id, limit, offset);
      
      // Return in unified format compatible with frontend
      return {
        items: result.items,
        nextCursor: null,
        hasMore: result.hasMore,
        pagination: { total: result.total, limit: result.limit, offset: result.offset }
      };
    }),

  // Get a specific task by ID
  getById: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanViewTask(ctx.user.id, input.taskId);

      return await todoTasksDb.getTaskById(input.taskId);
    }),

  // Create a new task
  create: protectedProcedure.use(requirePermission("todos:create"))
    .input(
      z.object({
        listId: z.number(),
        title: z.string().min(1).max(500),
        description: z.string().optional(),
        status: z
          .enum(["todo", "in_progress", "done"])
          .optional()
          .default("todo"),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.date().optional(),
        assignedTo: z.number().optional(),
        position: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditList(ctx.user.id, input.listId);

      const task = await todoTasksDb.createTask({
        ...input,
        createdBy: ctx.user.id,
      });

      // Log activity
      await todoActivityDb.logTaskCreated(task.id, ctx.user.id);

      // Create inbox item if assigned to someone
      if (input.assignedTo && input.assignedTo !== ctx.user.id) {
        await inboxDb.createInboxItem({
          userId: input.assignedTo,
          sourceType: "task_assignment",
          sourceId: task.id,
          referenceType: "task",
          referenceId: task.id,
          title: `New task assigned: ${task.title}`,
          description: task.description,
          status: "unread",
        });
      }

      return task;
    }),

  // Update a task
  update: protectedProcedure.use(requirePermission("todos:update"))
    .input(
      z.object({
        taskId: z.number(),
        title: z.string().min(1).max(500).optional(),
        description: z.string().optional(),
        status: z.enum(["todo", "in_progress", "done"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        dueDate: z.date().optional().nullable(),
        position: z.number().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditTask(ctx.user.id, input.taskId);

      const oldTask = await todoTasksDb.getTaskById(input.taskId);
      if (!oldTask) throw new Error("Task not found");

      const { taskId, ...updateData } = input;
      const updatedTask = await todoTasksDb.updateTask(taskId, updateData);

      // Log status change if status was updated
      if (input.status && input.status !== oldTask.status) {
        await todoActivityDb.logTaskStatusChanged(
          taskId,
          ctx.user.id,
          oldTask.status,
          input.status
        );
      }

      // Log other changes
      if (input.title && input.title !== oldTask.title) {
        await todoActivityDb.logTaskUpdated(
          taskId,
          ctx.user.id,
          "title",
          oldTask.title,
          input.title
        );
      }

      return updatedTask;
    }),

  // Delete a task
  delete: protectedProcedure.use(requirePermission("todos:delete"))
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanDeleteTask(ctx.user.id, input.taskId);

      // Log deletion before deleting
      await todoActivityDb.logTaskDeleted(input.taskId, ctx.user.id);

      await todoTasksDb.deleteTask(input.taskId);
      return { success: true };
    }),

  // Mark task as completed
  complete: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanCompleteTask(ctx.user.id, input.taskId);

      const task = await todoTasksDb.completeTask(input.taskId, ctx.user.id);

      // Log completion
      await todoActivityDb.logTaskCompleted(input.taskId, ctx.user.id);

      return task;
    }),

  // Mark task as incomplete
  uncomplete: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditTask(ctx.user.id, input.taskId);

      const task = await todoTasksDb.uncompleteTask(input.taskId);

      // Log status change
      await todoActivityDb.logTaskStatusChanged(
        input.taskId,
        ctx.user.id,
        "done",
        "todo"
      );

      return task;
    }),

  // Assign task to a user
  assign: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        taskId: z.number(),
        userId: z.number().nullable(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanAssignTask(ctx.user.id, input.taskId);

      const task = await todoTasksDb.assignTask(input.taskId, input.userId);

      // Log assignment
      await todoActivityDb.logTaskAssigned(
        input.taskId,
        ctx.user.id,
        input.userId ? `User ${input.userId}` : null
      );

      // Create inbox item if assigned to someone other than current user
      if (input.userId && input.userId !== ctx.user.id) {
        await inboxDb.createInboxItem({
          userId: input.userId,
          sourceType: "task_assignment",
          sourceId: task.id,
          referenceType: "task",
          referenceId: task.id,
          title: `Task assigned to you: ${task.title}`,
          description: task.description,
          status: "unread",
        });
      }

      return task;
    }),

  // Reorder tasks in a list
  reorder: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        listId: z.number(),
        taskPositions: z.array(
          z.object({
            taskId: z.number(),
            position: z.number(),
          })
        ),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditList(ctx.user.id, input.listId);

      await todoTasksDb.reorderTasks(input.listId, input.taskPositions);
      return { success: true };
    }),

  // Get overdue tasks
  // BUG-034: Standardized pagination response
  getOverdue: protectedProcedure.use(requirePermission("todos:read")).query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");
    const tasks = await todoTasksDb.getOverdueTasks();
    return createSafeUnifiedResponse(tasks, tasks.length, 50, 0);
  }),

  // Get tasks due soon
  // BUG-034: Standardized pagination response
  getDueSoon: protectedProcedure.use(requirePermission("todos:read")).query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");
    const tasks = await todoTasksDb.getTasksDueSoon();
    return createSafeUnifiedResponse(tasks, tasks.length, 50, 0);
  }),

  // Get task statistics for a list
  getListStats: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        listId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanViewList(ctx.user.id, input.listId);

      return await todoTasksDb.getListTaskStats(input.listId);
    }),
});
