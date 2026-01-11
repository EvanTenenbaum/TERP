/**
 * Todo Lists Router
 * API endpoints for todo list management
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as todoListsDb from "../todoListsDb";
import * as permissions from "../services/todoPermissions";
import { requirePermission } from "../_core/permissionMiddleware";
import { createSafeUnifiedResponse } from "../_core/pagination";

export const todoListsRouter = router({
  // List todo lists with pagination
  // BUG-034: Standardized .list procedure for API consistency
  list: protectedProcedure
    .use(requirePermission("todos:read"))
    .input(
      z.object({
        limit: z.number().min(1).max(1000).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        search: z.string().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      let lists = await todoListsDb.getUserLists(ctx.user.id);

      // Apply search filter if provided
      if (input?.search) {
        const searchLower = input.search.toLowerCase();
        lists = lists.filter(
          (list) =>
            list.name?.toLowerCase().includes(searchLower) ||
            list.description?.toLowerCase().includes(searchLower)
        );
      }

      // Apply pagination
      const paginatedLists = lists.slice(offset, offset + limit);

      return createSafeUnifiedResponse(paginatedLists, lists.length, limit, offset);
    }),

  // Get all lists accessible by current user
  // BUG-034: Standardized pagination response
  getMyLists: protectedProcedure.use(requirePermission("todos:read")).query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");
    const lists = await todoListsDb.getUserLists(ctx.user.id);
    return createSafeUnifiedResponse(lists, lists.length, 50, 0);
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
  // BUG-034: Standardized pagination response
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
      return createSafeUnifiedResponse(members, members.length, 50, 0);
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
