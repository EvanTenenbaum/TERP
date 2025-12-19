/**
 * Comments Router
 * API endpoints for universal polymorphic comments and @mentions
 * 
 * PERF-003: Added pagination support
 */

import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as commentsDb from "../commentsDb";
import * as inboxDb from "../inboxDb";
import * as mentionParser from "../services/mentionParser";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  paginationInputSchema,
  createPaginatedResponse,
  DEFAULT_PAGE_SIZE,
} from "../_core/pagination";

export const commentsRouter = router({
  // Get all comments for an entity with pagination
  // PERF-003: Added pagination support
  getEntityComments: protectedProcedure.use(requirePermission("comments:read"))
    .input(
      z.object({
        commentableType: z.string(),
        commentableId: z.number(),
        limit: z.number().min(1).max(100).default(DEFAULT_PAGE_SIZE).optional(),
        offset: z.number().min(0).default(0).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const limit = input.limit ?? DEFAULT_PAGE_SIZE;
      const offset = input.offset ?? 0;

      const result = await commentsDb.getEntityComments(
        input.commentableType,
        input.commentableId,
        limit,
        offset
      );

      return result;
    }),

  // Get a specific comment by ID
  getById: protectedProcedure.use(requirePermission("comments:read"))
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await commentsDb.getCommentById(input.commentId);
    }),

  // Create a new comment
  create: protectedProcedure.use(requirePermission("comments:create"))
    .input(
      z.object({
        commentableType: z.string(),
        commentableId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Create the comment
      const comment = await commentsDb.createComment({
        commentableType: input.commentableType,
        commentableId: input.commentableId,
        userId: ctx.user.id,
        content: input.content,
      });

      // Parse mentions from content
      const mentionedUserIds = mentionParser.parseMentions(input.content);

      // Create mentions
      if (mentionedUserIds.length > 0) {
        await commentsDb.createMentions(
          comment.id,
          mentionedUserIds,
          ctx.user.id
        );

        // Create inbox items for each mentioned user
        for (const userId of mentionedUserIds) {
          if (userId !== ctx.user.id) {
            // Don't create inbox item for self-mentions
            await inboxDb.createInboxItem({
              userId,
              sourceType: "mention",
              sourceId: comment.id,
              referenceType: input.commentableType,
              referenceId: input.commentableId,
              title: `${ctx.user.name || "Someone"} mentioned you in a comment`,
              description: mentionParser.extractPlainText(input.content),
              status: "unread",
            });
          }
        }
      }

      return comment;
    }),

  // Update a comment
  update: protectedProcedure.use(requirePermission("comments:update"))
    .input(
      z.object({
        commentId: z.number(),
        content: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Get existing comment to verify ownership
      const existingComment = await commentsDb.getCommentById(input.commentId);
      if (!existingComment) {
        throw new Error("Comment not found");
      }
      if (existingComment.userId !== ctx.user.id) {
        throw new Error("You can only edit your own comments");
      }

      // Update the comment
      const comment = await commentsDb.updateComment(input.commentId, {
        content: input.content,
      });

      // Delete old mentions
      await commentsDb.deleteCommentMentions(input.commentId);

      // Parse new mentions
      const mentionedUserIds = mentionParser.parseMentions(input.content);

      // Create new mentions
      if (mentionedUserIds.length > 0) {
        await commentsDb.createMentions(
          comment.id,
          mentionedUserIds,
          ctx.user.id
        );

        // Create inbox items for newly mentioned users
        for (const userId of mentionedUserIds) {
          if (userId !== ctx.user.id) {
            await inboxDb.createInboxItem({
              userId,
              sourceType: "mention",
              sourceId: comment.id,
              referenceType: comment.commentableType,
              referenceId: comment.commentableId,
              title: `${ctx.user.name || "Someone"} mentioned you in a comment`,
              description: mentionParser.extractPlainText(input.content),
              status: "unread",
            });
          }
        }
      }

      return comment;
    }),

  // Delete a comment
  delete: protectedProcedure.use(requirePermission("comments:delete"))
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      // Get existing comment to verify ownership
      const existingComment = await commentsDb.getCommentById(input.commentId);
      if (!existingComment) {
        throw new Error("Comment not found");
      }
      if (existingComment.userId !== ctx.user.id) {
        throw new Error("You can only delete your own comments");
      }

      await commentsDb.deleteComment(input.commentId);
      return { success: true };
    }),

  // Mark comment as resolved
  resolve: protectedProcedure.use(requirePermission("comments:read"))
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await commentsDb.resolveComment(input.commentId, ctx.user.id);
    }),

  // Mark comment as unresolved
  unresolve: protectedProcedure.use(requirePermission("comments:read"))
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await commentsDb.unresolveComment(input.commentId);
    }),

  // Get unresolved comments count for an entity
  getUnresolvedCount: protectedProcedure.use(requirePermission("comments:read"))
    .input(
      z.object({
        commentableType: z.string(),
        commentableId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      const count = await commentsDb.getUnresolvedCommentsCount(
        input.commentableType,
        input.commentableId
      );
      return { count };
    }),

  // Get mentions for a comment
  getCommentMentions: protectedProcedure.use(requirePermission("comments:read"))
    .input(
      z.object({
        commentId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");

      return await commentsDb.getCommentMentions(input.commentId);
    }),

  // Get all mentions for current user
  getMyMentions: protectedProcedure.use(requirePermission("comments:read")).query(async ({ ctx }) => {
    if (!ctx.user) throw new Error("Unauthorized");

    return await commentsDb.getUserMentions(ctx.user.id);
  }),
});
