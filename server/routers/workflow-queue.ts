/**
 * Workflow Queue Router
 * Initiative: 1.3 Workflow Queue Management
 *
 * Provides tRPC endpoints for:
 * - Workflow status management (CRUD)
 * - Batch queue management
 * - Status change history tracking
 *
 * @module server/routers/workflow-queue.ts
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { TRPCError } from "@trpc/server";
import * as workflowQueries from "../db/queries/workflow-queue";

/**
 * Input validation schemas
 */
const createStatusSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(50),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  order: z.number().int().min(0),
});

const updateStatusSchema = z.object({
  id: z.number().int().positive(),
  name: z.string().min(1).max(100).optional(),
  slug: z.string().min(1).max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  order: z.number().int().min(0).optional(),
});

const updateBatchStatusSchema = z.object({
  batchId: z.number().int().positive(),
  toStatusId: z.number().int().positive(),
  notes: z.string().optional(),
});

/**
 * Workflow Queue Router
 */
export const workflowQueueRouter = router({
  // ============================================================================
  // WORKFLOW STATUS MANAGEMENT
  // ============================================================================

  /**
   * List all active workflow statuses
   * Permission: workflow:read
   */
  listStatuses: protectedProcedure
    .use(requirePermission("workflow:read"))
    .query(async () => {
      return workflowQueries.getAllActiveStatuses();
    }),

  /**
   * Get a single workflow status by ID
   * Permission: workflow:read
   */
  getStatus: protectedProcedure
    .use(requirePermission("workflow:read"))
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const status = await workflowQueries.getStatusById(input.id);

      if (!status) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Workflow status not found",
        });
      }

      return status;
    }),

  /**
   * Create a new workflow status
   * Permission: workflow:manage
   */
  createStatus: protectedProcedure
    .use(requirePermission("workflow:manage"))
    .input(createStatusSchema)
    .mutation(async ({ input }) => {
      return workflowQueries.createStatus(input);
    }),

  /**
   * Update an existing workflow status
   * Permission: workflow:manage
   */
  updateStatus: protectedProcedure
    .use(requirePermission("workflow:manage"))
    .input(updateStatusSchema)
    .mutation(async ({ input }) => {
      const { id, ...updates } = input;
      return workflowQueries.updateStatus(id, updates);
    }),

  /**
   * Delete (soft delete) a workflow status
   * Permission: workflow:manage
   */
  deleteStatus: protectedProcedure
    .use(requirePermission("workflow:manage"))
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      await workflowQueries.deleteStatus(input.id);
      return { success: true };
    }),

  /**
   * Reorder workflow statuses
   * Permission: workflow:manage
   */
  reorderStatuses: protectedProcedure
    .use(requirePermission("workflow:manage"))
    .input(
      z.object({
        statusIds: z.array(z.number().int().positive()),
      })
    )
    .mutation(async ({ input }) => {
      await workflowQueries.reorderStatuses(input.statusIds);
      return { success: true };
    }),

  // ============================================================================
  // BATCH QUEUE MANAGEMENT
  // ============================================================================

  /**
   * Get all batches grouped by workflow status
   * Permission: workflow:read
   */
  getQueues: protectedProcedure
    .use(requirePermission("workflow:read"))
    .query(async () => {
      return workflowQueries.getBatchesByStatus();
    }),

  /**
   * Get batches for a specific workflow status
   * Permission: workflow:read
   */
  getBatchesByStatus: protectedProcedure
    .use(requirePermission("workflow:read"))
    .input(z.object({ statusId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return workflowQueries.getBatchesByStatusId(input.statusId);
    }),

  /**
   * Update a batch's workflow status
   * Permission: workflow:update
   */
  updateBatchStatus: protectedProcedure
    .use(requirePermission("workflow:update"))
    .input(updateBatchStatusSchema)
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;

      if (!userId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "User ID not found in context",
        });
      }

      await workflowQueries.updateBatchStatus(
        input.batchId,
        input.toStatusId,
        userId,
        input.notes
      );

      return { success: true };
    }),

  // ============================================================================
  // STATUS HISTORY
  // ============================================================================

  /**
   * Get status change history for a specific batch
   * Permission: workflow:read
   */
  getBatchHistory: protectedProcedure
    .use(requirePermission("workflow:read"))
    .input(z.object({ batchId: z.number().int().positive() }))
    .query(async ({ input }) => {
      return workflowQueries.getBatchStatusHistory(input.batchId);
    }),

  /**
   * Get recent status changes across all batches
   * Permission: workflow:read
   */
  getRecentChanges: protectedProcedure
    .use(requirePermission("workflow:read"))
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).optional().default(50),
      })
    )
    .query(async ({ input }) => {
      return workflowQueries.getRecentStatusChanges(input.limit);
    }),
});
