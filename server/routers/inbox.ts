/**
 * Inbox Router
 * API endpoints for unified inbox management
 */

import { z } from "zod";
import { router } from "../_core/trpc";
import * as inboxDb from "../inboxDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const inboxRouter = router({
  // Get all inbox items for current user
  getMyItems: requirePermission("todos:read")
    .input(
      z
        .object({
          includeArchived: z.boolean().optional().default(false),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await inboxDb.getUserInboxItems(
        ctx.user.id,
        input?.includeArchived ?? false
      );
    }),

  // Get unread inbox items
  getUnread: requirePermission("todos:read").query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");

    return await inboxDb.getUnreadInboxItems(ctx.user.id);
  }),

  // Get inbox items by status
  getByStatus: requirePermission("todos:read")
    .input(
      z.object({
        status: z.enum(["unread", "seen", "completed"]),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await inboxDb.getInboxItemsByStatus(ctx.user.id, input.status);
    }),

  // Get a specific inbox item
  getById: requirePermission("todos:read")
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
  markAsSeen: requirePermission("todos:read")
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
  markAsCompleted: requirePermission("todos:read")
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
  markAsUnread: requirePermission("todos:read")
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
  archive: requirePermission("todos:read")
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
  unarchive: requirePermission("todos:read")
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
  delete: requirePermission("todos:read")
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
  getStats: requirePermission("todos:read").query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");

    return await inboxDb.getUserInboxStats(ctx.user.id);
  }),

  // Bulk mark items as seen
  bulkMarkAsSeen: requirePermission("todos:read")
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
  bulkMarkAsCompleted: requirePermission("todos:read")
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
  autoArchiveOld: requirePermission("todos:read").mutation(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");

    const count = await inboxDb.autoArchiveOldItems();
    return { archivedCount: count };
  }),
});
