/**
 * Comments Router
 * API endpoints for universal polymorphic comments and @mentions
 *
 * PERF-003: Added pagination support
 * SPRINT-A: Added comprehensive TypeScript types (Task 3)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as commentsDb from "../commentsDb";
import * as inboxDb from "../inboxDb";
import * as mentionParser from "../services/mentionParser";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  DEFAULT_PAGE_SIZE,
} from "../_core/pagination";
import { type Comment } from "../../drizzle/schema";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Commentable entity types that can have comments attached
 */
export const CommentableTypeSchema = z.enum([
  "order",
  "batch",
  "client",
  "product",
  "invoice",
  "note",
  "task",
]);
export type CommentableType = z.infer<typeof CommentableTypeSchema>;

/**
 * Comment with user information from database join
 */
export interface CommentWithUser {
  id: number;
  commentableType: string;
  commentableId: number;
  userId: number;
  content: string;
  isResolved: boolean;
  resolvedAt: Date | null;
  resolvedBy: number | null;
  createdAt: Date;
  updatedAt: Date;
  userName: string | null;
  userEmail: string;
}

/**
 * Mention with user information from database join
 */
export interface MentionWithUser {
  id: number;
  commentId: number;
  mentionedUserId: number;
  mentionedByUserId: number;
  createdAt: Date;
  mentionedUserName: string | null;
  mentionedUserEmail: string;
}

/**
 * User mention with comment context
 */
export interface UserMentionWithContext {
  id: number;
  commentId: number;
  mentionedUserId: number;
  mentionedByUserId: number;
  createdAt: Date;
  commentContent: string;
  commentableType: string;
  commentableId: number;
  mentionedByUserName: string | null;
}

/**
 * Paginated comments response
 */
export interface PaginatedCommentsResponse {
  items: CommentWithUser[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

/**
 * Unresolved comments count response
 */
export interface UnresolvedCountResponse {
  count: number;
}

/**
 * Delete operation success response
 */
export interface DeleteSuccessResponse {
  success: true;
}

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

/**
 * Schema for getting entity comments with pagination
 */
export const getEntityCommentsInputSchema = z.object({
  commentableType: z.string().min(1, "Commentable type is required"),
  commentableId: z.number().int().positive("Commentable ID must be a positive integer"),
  limit: z.number().int().min(1).max(100).default(DEFAULT_PAGE_SIZE).optional(),
  offset: z.number().int().min(0).default(0).optional(),
});
export type GetEntityCommentsInput = z.infer<typeof getEntityCommentsInputSchema>;

/**
 * Schema for getting a comment by ID
 */
export const getCommentByIdInputSchema = z.object({
  commentId: z.number().int().positive("Comment ID must be a positive integer"),
});
export type GetCommentByIdInput = z.infer<typeof getCommentByIdInputSchema>;

/**
 * Schema for creating a new comment
 */
export const createCommentInputSchema = z.object({
  commentableType: z.string().min(1, "Commentable type is required"),
  commentableId: z.number().int().positive("Commentable ID must be a positive integer"),
  content: z.string().min(1, "Comment content is required").max(10000, "Comment content is too long"),
});
export type CreateCommentInput = z.infer<typeof createCommentInputSchema>;

/**
 * Schema for updating a comment
 */
export const updateCommentInputSchema = z.object({
  commentId: z.number().int().positive("Comment ID must be a positive integer"),
  content: z.string().min(1, "Comment content is required").max(10000, "Comment content is too long"),
});
export type UpdateCommentInput = z.infer<typeof updateCommentInputSchema>;

/**
 * Schema for comment ID operations (delete, resolve, unresolve, getMentions)
 */
export const commentIdInputSchema = z.object({
  commentId: z.number().int().positive("Comment ID must be a positive integer"),
});
export type CommentIdInput = z.infer<typeof commentIdInputSchema>;

/**
 * Schema for entity identification (for unresolved count)
 */
export const entityIdentifierInputSchema = z.object({
  commentableType: z.string().min(1, "Commentable type is required"),
  commentableId: z.number().int().positive("Commentable ID must be a positive integer"),
});
export type EntityIdentifierInput = z.infer<typeof entityIdentifierInputSchema>;

// ============================================================================
// ROUTER DEFINITION
// ============================================================================

export const commentsRouter = router({
  /**
   * Get all comments for an entity with pagination
   * PERF-003: Added pagination support
   */
  getEntityComments: protectedProcedure
    .use(requirePermission("comments:read"))
    .input(getEntityCommentsInputSchema)
    .query(async ({ input, ctx }): Promise<PaginatedCommentsResponse> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const limit = input.limit ?? DEFAULT_PAGE_SIZE;
      const offset = input.offset ?? 0;

      const result = await commentsDb.getEntityComments(
        input.commentableType,
        input.commentableId,
        limit,
        offset
      );

      return result as PaginatedCommentsResponse;
    }),

  /**
   * Get a specific comment by ID
   */
  getById: protectedProcedure
    .use(requirePermission("comments:read"))
    .input(getCommentByIdInputSchema)
    .query(async ({ input, ctx }): Promise<CommentWithUser | null> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const comment = await commentsDb.getCommentById(input.commentId);
      return comment as CommentWithUser | null;
    }),

  /**
   * Create a new comment with @mention parsing
   */
  create: protectedProcedure
    .use(requirePermission("comments:create"))
    .input(createCommentInputSchema)
    .mutation(async ({ input, ctx }): Promise<Comment> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Create the comment
      const comment = await commentsDb.createComment({
        commentableType: input.commentableType,
        commentableId: input.commentableId,
        userId: ctx.user.id,
        content: input.content,
      });

      // Parse mentions from content
      const mentionedUserIds = mentionParser.parseMentions(input.content);

      // Create mentions and inbox items
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

  /**
   * Update an existing comment (owner only)
   */
  update: protectedProcedure
    .use(requirePermission("comments:update"))
    .input(updateCommentInputSchema)
    .mutation(async ({ input, ctx }): Promise<Comment> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Get existing comment to verify ownership
      const existingComment = await commentsDb.getCommentById(input.commentId);
      if (!existingComment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }
      if (existingComment.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only edit your own comments",
        });
      }

      // Update the comment
      const comment = await commentsDb.updateComment(input.commentId, {
        content: input.content,
      });

      // Delete old mentions
      await commentsDb.deleteCommentMentions(input.commentId);

      // Parse new mentions
      const mentionedUserIds = mentionParser.parseMentions(input.content);

      // Create new mentions and inbox items
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

  /**
   * Delete a comment (owner only)
   */
  delete: protectedProcedure
    .use(requirePermission("comments:delete"))
    .input(commentIdInputSchema)
    .mutation(async ({ input, ctx }): Promise<DeleteSuccessResponse> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      // Get existing comment to verify ownership
      const existingComment = await commentsDb.getCommentById(input.commentId);
      if (!existingComment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Comment not found",
        });
      }
      if (existingComment.userId !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own comments",
        });
      }

      await commentsDb.deleteComment(input.commentId);
      return { success: true };
    }),

  /**
   * Mark a comment as resolved
   */
  resolve: protectedProcedure
    .use(requirePermission("comments:read"))
    .input(commentIdInputSchema)
    .mutation(async ({ input, ctx }): Promise<Comment> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      return await commentsDb.resolveComment(input.commentId, ctx.user.id);
    }),

  /**
   * Mark a comment as unresolved
   */
  unresolve: protectedProcedure
    .use(requirePermission("comments:read"))
    .input(commentIdInputSchema)
    .mutation(async ({ input, ctx }): Promise<Comment> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      return await commentsDb.unresolveComment(input.commentId);
    }),

  /**
   * Get unresolved comments count for an entity
   */
  getUnresolvedCount: protectedProcedure
    .use(requirePermission("comments:read"))
    .input(entityIdentifierInputSchema)
    .query(async ({ input, ctx }): Promise<UnresolvedCountResponse> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const count = await commentsDb.getUnresolvedCommentsCount(
        input.commentableType,
        input.commentableId
      );
      return { count };
    }),

  /**
   * Get all mentions for a specific comment
   */
  getCommentMentions: protectedProcedure
    .use(requirePermission("comments:read"))
    .input(commentIdInputSchema)
    .query(async ({ input, ctx }): Promise<MentionWithUser[]> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const mentions = await commentsDb.getCommentMentions(input.commentId);
      return mentions as MentionWithUser[];
    }),

  /**
   * Get all mentions for the current authenticated user
   */
  getMyMentions: protectedProcedure
    .use(requirePermission("comments:read"))
    .query(async ({ ctx }): Promise<UserMentionWithContext[]> => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required",
        });
      }

      const mentions = await commentsDb.getUserMentions(ctx.user.id);
      return mentions as UserMentionWithContext[];
    }),
});
