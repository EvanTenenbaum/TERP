/**
 * Inbox Router
 * API endpoints for unified inbox management
 * 
 * PERF-003: Added pagination support
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as inboxDb from "../inboxDb";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  paginationInputSchema,
  createPaginatedResponse,
  createSafeUnifiedResponse,
  DEFAULT_PAGE_SIZE,
} from "../_core/pagination";

export const inboxRouter = router({
  // Get all inbox items for current user with pagination
  // PERF-003: Added pagination support
  getMyItems: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z
        .object({
          includeArchived: z.boolean().optional().default(false),
          limit: z.number().min(1).max(100).default(DEFAULT_PAGE_SIZE).optional(),
          offset: z.number().min(0).default(0).optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const limit = input?.limit ?? DEFAULT_PAGE_SIZE;
      const offset = input?.offset ?? 0;

      return await inboxDb.getUserInboxItems(
        ctx.user.id,
        input?.includeArchived ?? false,
        limit,
        offset
      );
    }),

  // Get unread inbox items
  // BUG-034: Standardized pagination response
  getUnread: protectedProcedure.use(requirePermission("todos:read")).query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");

    const items = await inboxDb.getUnreadInboxItems(ctx.user.id);
    return createSafeUnifiedResponse(items, items.length, 50, 0);
  }),

  // Get inbox items by status
  // BUG-034: Standardized pagination response
  getByStatus: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        status: z.enum(["unread", "seen", "completed"]),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const items = await inboxDb.getInboxItemsByStatus(ctx.user.id, input.status);
      return createSafeUnifiedResponse(items, items.length, 50, 0);
    }),

  // Get a specific inbox item
  getById: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const item = await inboxDb.getInboxItemById(input.itemId);

      // Verify ownership
      if (item && item.userId !== ctx.user.id) {
        throw new Error("You can only view your own inbox items");
      }

      return item;
    }),

  // Mark item as seen
  markAsSeen: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify ownership
      const item = await inboxDb.getInboxItemById(input.itemId);
      if (!item || item.userId !== ctx.user.id) {
        throw new Error("You can only modify your own inbox items");
      }

      return await inboxDb.markInboxItemAsSeen(input.itemId);
    }),

  // Mark item as completed
  markAsCompleted: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify ownership
      const item = await inboxDb.getInboxItemById(input.itemId);
      if (!item || item.userId !== ctx.user.id) {
        throw new Error("You can only modify your own inbox items");
      }

      return await inboxDb.markInboxItemAsCompleted(input.itemId);
    }),

  // Mark item as unread
  markAsUnread: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify ownership
      const item = await inboxDb.getInboxItemById(input.itemId);
      if (!item || item.userId !== ctx.user.id) {
        throw new Error("You can only modify your own inbox items");
      }

      return await inboxDb.markInboxItemAsUnread(input.itemId);
    }),

  // Archive an item
  archive: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify ownership
      const item = await inboxDb.getInboxItemById(input.itemId);
      if (!item || item.userId !== ctx.user.id) {
        throw new Error("You can only modify your own inbox items");
      }

      return await inboxDb.archiveInboxItem(input.itemId);
    }),

  // Unarchive an item
  unarchive: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify ownership
      const item = await inboxDb.getInboxItemById(input.itemId);
      if (!item || item.userId !== ctx.user.id) {
        throw new Error("You can only modify your own inbox items");
      }

      return await inboxDb.unarchiveInboxItem(input.itemId);
    }),

  // Delete an inbox item
  delete: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify ownership
      const item = await inboxDb.getInboxItemById(input.itemId);
      if (!item || item.userId !== ctx.user.id) {
        throw new Error("You can only delete your own inbox items");
      }

      await inboxDb.deleteInboxItem(input.itemId);
      return { success: true };
    }),

  // Get inbox statistics
  getStats: protectedProcedure.use(requirePermission("todos:read")).query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");

    return await inboxDb.getUserInboxStats(ctx.user.id);
  }),

  // Bulk mark items as seen
  bulkMarkAsSeen: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify all items belong to current user
      for (const itemId of input.itemIds) {
        const item = await inboxDb.getInboxItemById(itemId);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("You can only modify your own inbox items");
        }
      }

      await inboxDb.bulkMarkAsSeen(input.itemIds);
      return { success: true };
    }),

  // Bulk mark items as completed
  bulkMarkAsCompleted: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        itemIds: z.array(z.number()),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Verify all items belong to current user
      for (const itemId of input.itemIds) {
        const item = await inboxDb.getInboxItemById(itemId);
        if (!item || item.userId !== ctx.user.id) {
          throw new Error("You can only modify your own inbox items");
        }
      }

      await inboxDb.bulkMarkAsCompleted(input.itemIds);
      return { success: true };
    }),

  // Auto-archive old completed items
  autoArchiveOld: protectedProcedure.use(requirePermission("todos:read")).mutation(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");

    const count = await inboxDb.autoArchiveOldItems();
    return { archivedCount: count };
  }),
});
