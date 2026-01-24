import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as advancedTagFeatures from "../advancedTagFeatures";
import { requirePermission } from "../_core/permissionMiddleware";

export const advancedTagFeaturesRouter = router({
  // Boolean tag search
  booleanSearch: protectedProcedure
    .input(z.object({
      searchExpression: z.string()
    }))
    .query(async ({ input }) => {
      const productIds = await advancedTagFeatures.booleanTagSearch(input.searchExpression);
      return { productIds };
    }),

  // Tag hierarchy
  createHierarchy: protectedProcedure
    .input(z.object({
      parentTagId: z.number(),
      childTagId: z.number()
    }))
    .mutation(async ({ input }) => {
      return await advancedTagFeatures.createTagHierarchy(
        input.parentTagId,
        input.childTagId
      );
    }),

  getChildren: protectedProcedure
    .input(z.object({
      tagId: z.number()
    }))
    .query(async ({ input }) => {
      return await advancedTagFeatures.getTagChildren(input.tagId);
    }),

  getAncestors: protectedProcedure
    .input(z.object({
      tagId: z.number()
    }))
    .query(async ({ input }) => {
      return await advancedTagFeatures.getTagAncestors(input.tagId);
    }),

  // Tag maintenance
  mergeTags: protectedProcedure
    .input(z.object({
      sourceTagId: z.number(),
      targetTagId: z.number()
    }))
    .mutation(async ({ input }) => {
      await advancedTagFeatures.mergeTags(input.sourceTagId, input.targetTagId);
      return { success: true };
    }),

  // Tag groups
  createGroup: protectedProcedure
    .input(z.object({
      name: z.string(),
      description: z.string(),
      color: z.string(),
      createdBy: z.number()
    }))
    .mutation(async ({ input }) => {
      return await advancedTagFeatures.createTagGroup(
        input.name,
        input.description,
        input.color,
        input.createdBy
      );
    }),

  addToGroup: protectedProcedure
    .input(z.object({
      groupId: z.number(),
      tagId: z.number()
    }))
    .mutation(async ({ input }) => {
      await advancedTagFeatures.addTagToGroup(input.groupId, input.tagId);
      return { success: true };
    }),

  getGroupTags: protectedProcedure
    .input(z.object({
      groupId: z.number()
    }))
    .query(async ({ input }) => {
      return await advancedTagFeatures.getTagsInGroup(input.groupId);
    }),

  // Tag statistics
  getUsageStats: protectedProcedure
    .query(async () => {
      return await advancedTagFeatures.getTagUsageStats();
    }),

  // Bulk operations
  bulkAddTags: protectedProcedure
    .input(z.object({
      productIds: z.array(z.number()),
      tagIds: z.array(z.number())
    }))
    .mutation(async ({ input }) => {
      await advancedTagFeatures.bulkAddTags(input.productIds, input.tagIds);
      return { success: true };
    }),

  bulkRemoveTags: protectedProcedure
    .input(z.object({
      productIds: z.array(z.number()),
      tagIds: z.array(z.number())
    }))
    .mutation(async ({ input }) => {
      await advancedTagFeatures.bulkRemoveTags(input.productIds, input.tagIds);
      return { success: true };
    }),
});

