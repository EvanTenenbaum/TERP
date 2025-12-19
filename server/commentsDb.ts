import { getDb } from "./db";
import {
  comments,
  commentMentions,
  users,
  type Comment,
  type InsertComment,
  type CommentMention,
  type InsertCommentMention,
} from "../drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

/**
 * Comments Database Access Layer
 * Handles universal polymorphic comments and @mentions
 */

// ============================================================================
// COMMENTS QUERIES
// ============================================================================

/**
 * Get all comments for an entity with pagination
 * PERF-003: Added pagination support
 */
export async function getEntityComments(
  commentableType: string,
  commentableId: number,
  limit: number = 50,
  offset: number = 0
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get total count for pagination
  const [countResult] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(comments)
    .where(
      and(
        eq(comments.commentableType, commentableType),
        eq(comments.commentableId, commentableId)
      )
    );
  const total = Number(countResult?.count ?? 0);

  // Get paginated comments
  const entityComments = await db
    .select({
      id: comments.id,
      commentableType: comments.commentableType,
      commentableId: comments.commentableId,
      userId: comments.userId,
      content: comments.content,
      isResolved: comments.isResolved,
      resolvedAt: comments.resolvedAt,
      resolvedBy: comments.resolvedBy,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(
      and(
        eq(comments.commentableType, commentableType),
        eq(comments.commentableId, commentableId)
      )
    )
    .orderBy(desc(comments.createdAt))
    .limit(limit)
    .offset(offset);

  return {
    items: entityComments,
    total,
    limit,
    offset,
    hasMore: offset + entityComments.length < total,
  };
}

/**
 * Get a specific comment by ID
 */
export async function getCommentById(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [comment] = await db
    .select({
      id: comments.id,
      commentableType: comments.commentableType,
      commentableId: comments.commentableId,
      userId: comments.userId,
      content: comments.content,
      isResolved: comments.isResolved,
      resolvedAt: comments.resolvedAt,
      resolvedBy: comments.resolvedBy,
      createdAt: comments.createdAt,
      updatedAt: comments.updatedAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(comments)
    .innerJoin(users, eq(comments.userId, users.id))
    .where(eq(comments.id, commentId))
    .limit(1);

  return comment || null;
}

/**
 * Create a new comment
 */
export async function createComment(data: InsertComment): Promise<Comment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(comments).values(data).$returningId();

  const [newComment] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, result.id))
    .limit(1);

  if (!newComment) throw new Error("Failed to create comment");

  return newComment;
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: number,
  data: Partial<InsertComment>
): Promise<Comment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(comments).set(data).where(eq(comments.id, commentId));

  const [updated] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!updated) throw new Error("Comment not found after update");

  return updated;
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.delete(comments).where(eq(comments.id, commentId));
}

/**
 * Mark a comment as resolved
 */
export async function resolveComment(
  commentId: number,
  resolvedBy: number
): Promise<Comment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(comments)
    .set({
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy,
    })
    .where(eq(comments.id, commentId));

  const [updated] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!updated) throw new Error("Comment not found after resolve");

  return updated;
}

/**
 * Mark a comment as unresolved
 */
export async function unresolveComment(commentId: number): Promise<Comment> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(comments)
    .set({
      isResolved: false,
      resolvedAt: null,
      resolvedBy: null,
    })
    .where(eq(comments.id, commentId));

  const [updated] = await db
    .select()
    .from(comments)
    .where(eq(comments.id, commentId))
    .limit(1);

  if (!updated) throw new Error("Comment not found after unresolve");

  return updated;
}

/**
 * Get unresolved comments count for an entity
 */
export async function getUnresolvedCommentsCount(
  commentableType: string,
  commentableId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(comments)
    .where(
      and(
        eq(comments.commentableType, commentableType),
        eq(comments.commentableId, commentableId),
        eq(comments.isResolved, false)
      )
    );

  return Number(result?.count ?? 0);
}

// ============================================================================
// COMMENT MENTIONS QUERIES
// ============================================================================

/**
 * Get all mentions in a comment
 */
export async function getCommentMentions(commentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const mentions = await db
    .select({
      id: commentMentions.id,
      commentId: commentMentions.commentId,
      mentionedUserId: commentMentions.mentionedUserId,
      mentionedByUserId: commentMentions.mentionedByUserId,
      createdAt: commentMentions.createdAt,
      mentionedUserName: users.name,
      mentionedUserEmail: users.email,
    })
    .from(commentMentions)
    .innerJoin(users, eq(commentMentions.mentionedUserId, users.id))
    .where(eq(commentMentions.commentId, commentId))
    .orderBy(commentMentions.createdAt);

  return mentions;
}

/**
 * Create a mention
 */
export async function createMention(
  data: InsertCommentMention
): Promise<CommentMention> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [result] = await db.insert(commentMentions).values(data).$returningId();

  const [newMention] = await db
    .select()
    .from(commentMentions)
    .where(eq(commentMentions.id, result.id))
    .limit(1);

  if (!newMention) throw new Error("Failed to create mention");

  return newMention;
}

/**
 * Create multiple mentions for a comment
 */
export async function createMentions(
  commentId: number,
  mentionedUserIds: number[],
  mentionedByUserId: number
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (mentionedUserIds.length === 0) return;

  const mentionsData = mentionedUserIds.map(userId => ({
    commentId,
    mentionedUserId: userId,
    mentionedByUserId,
  }));

  await db.insert(commentMentions).values(mentionsData);
}

/**
 * Delete all mentions for a comment
 */
export async function deleteCommentMentions(commentId: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(commentMentions)
    .where(eq(commentMentions.commentId, commentId));
}

/**
 * Get all mentions for a user
 */
export async function getUserMentions(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const mentions = await db
    .select({
      id: commentMentions.id,
      commentId: commentMentions.commentId,
      mentionedUserId: commentMentions.mentionedUserId,
      mentionedByUserId: commentMentions.mentionedByUserId,
      createdAt: commentMentions.createdAt,
      commentContent: comments.content,
      commentableType: comments.commentableType,
      commentableId: comments.commentableId,
      mentionedByUserName: users.name,
    })
    .from(commentMentions)
    .innerJoin(comments, eq(commentMentions.commentId, comments.id))
    .innerJoin(users, eq(commentMentions.mentionedByUserId, users.id))
    .where(eq(commentMentions.mentionedUserId, userId))
    .orderBy(desc(commentMentions.createdAt));

  return mentions;
}
