/**
 * Todo Lists Router
 * API endpoints for todo list management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as todoListsDb from "../todoListsDb";
import * as permissions from "../services/todoPermissions";
import { requirePermission } from "../_core/permissionMiddleware";

export const todoListsRouter = router({
  // Get all lists accessible by current user
  getMyLists: protectedProcedure.use(requirePermission("todos:read")).query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");
    const lists = await todoListsDb.getUserLists(ctx.user.id);
    // HOTFIX (BUG-033): Wrap in paginated response structure
    return {
      items: lists,
      nextCursor: null,
      hasMore: false,
    };
  }),

  // Get a specific list by ID
  getById: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        listId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanViewList(ctx.user.id, input.listId);

      return await todoListsDb.getListById(input.listId);
    }),

  // Create a new list
  create: protectedProcedure.use(requirePermission("todos:create"))
    .input(
      z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        isShared: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await todoListsDb.createList({
        name: input.name,
        description: input.description,
        ownerId: ctx.user.id,
        isShared: input.isShared,
      });
    }),

  // Update a list
  update: protectedProcedure.use(requirePermission("todos:update"))
    .input(
      z.object({
        listId: z.number(),
        name: z.string().min(1).max(255),
        description: z.string().optional(),
        isShared: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditList(ctx.user.id, input.listId);

      const { listId, ...updateData } = input;
      return await todoListsDb.updateList(listId, updateData);
    }),

  // Delete a list
  delete: protectedProcedure.use(requirePermission("todos:delete"))
    .input(
      z.object({
        listId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanDeleteList(ctx.user.id, input.listId);

      await todoListsDb.deleteList(input.listId);
      return { success: true };
    }),

  // Get list members
  getMembers: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        listId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanViewList(ctx.user.id, input.listId);

      const members = await todoListsDb.getListMembers(input.listId);
      // HOTFIX (BUG-033): Wrap in paginated response structure
      return {
        items: members,
        nextCursor: null,
        hasMore: false,
      };
    }),

  // Add a member to a list
  addMember: protectedProcedure.use(requirePermission("todos:create"))
    .input(
      z.object({
        listId: z.number(),
        userId: z.number(),
        role: z
          .enum(["owner", "editor", "viewer"])
          .optional()
          .default("editor"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditList(ctx.user.id, input.listId);

      return await todoListsDb.addListMember({
        listId: input.listId,
        userId: input.userId,
        role: input.role,
        addedBy: ctx.user.id,
      });
    }),

  // Update member role
  updateMemberRole: protectedProcedure.use(requirePermission("todos:update"))
    .input(
      z.object({
        listId: z.number(),
        userId: z.number(),
        role: z.enum(["owner", "editor", "viewer"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditList(ctx.user.id, input.listId);

      await todoListsDb.updateListMemberRole(
        input.listId,
        input.userId,
        input.role
      );
      return { success: true };
    }),

  // Remove a member from a list
  removeMember: protectedProcedure.use(requirePermission("todos:delete"))
    .input(
      z.object({
        listId: z.number(),
        userId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      await permissions.assertCanEditList(ctx.user.id, input.listId);

      await todoListsDb.removeListMember(input.listId, input.userId);
      return { success: true };
    }),

  // Get user's role in a list
  getMyRole: protectedProcedure.use(requirePermission("todos:read"))
    .input(
      z.object({
        listId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const role = await todoListsDb.getUserRoleInList(
        ctx.user.id,
        input.listId
      );
      return { role };
    }),
});
