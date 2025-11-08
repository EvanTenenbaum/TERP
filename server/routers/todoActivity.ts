/**
 * Todo Activity Router
 * API endpoints for task activity and audit trail
 */

import { z } from "zod";
import { router } from "../_core/trpc";
import * as todoActivityDb from "../todoActivityDb";
import * as permissions from "../services/todoPermissions";
import { requirePermission } from "../_core/permissionMiddleware";

export const todoActivityRouter = router({
  // Get activity for a specific task
  getTaskActivity: requirePermission("todos:read")
    .input(
      z.object({
        taskId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify user has access to the task
      await permissions.assertCanViewTask(ctx.user.id, input.taskId);

      return await todoActivityDb.getTaskActivity(input.taskId);
    }),

  // Get recent activity for current user
  getMyRecentActivity: requirePermission("todos:read")
    .input(
      z
        .object({
          limit: z.number().optional().default(50),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await todoActivityDb.getUserRecentActivity(
        ctx.user.id,
        input?.limit ?? 50
      );
    }),
});
