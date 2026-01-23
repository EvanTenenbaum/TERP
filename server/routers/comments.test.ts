/**
 * Comments Router Tests
 * Tests for universal polymorphic comments and @mentions
 *
 * NOTE: These are integration tests that require a real database connection.
 * They are skipped in unit test mode. Run with DATABASE_URL set to execute.
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb } from "../db";
import * as commentsDb from "../commentsDb";
import { users, comments } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

// Skip all tests if no database connection available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb("Comments System", () => {
  let testUserId: number;
  let testCommentId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create a test user
    const [result] = await db
      .insert(users)
      .values({
        openId: `test_open_id_${Date.now()}`,
        email: `test_comments_${Date.now()}@example.com`,
        name: "Test User",
        role: "admin",
      })
      .$returningId();

    testUserId = result.id;
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;

    // Clean up test data
    if (testCommentId) {
      await db.delete(comments).where(eq(comments.id, testCommentId));
    }
    if (testUserId) {
      await db.delete(users).where(eq(users.id, testUserId));
    }
  });

  describe("Comment Creation", () => {
    it("should create a comment successfully", async () => {
      const comment = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment content",
      });

      expect(comment).toBeDefined();
      expect(comment.id).toBeGreaterThan(0);
      expect(comment.content).toBe("Test comment content");
      expect(comment.userId).toBe(testUserId);
      expect(comment.commentableType).toBe("inventory_batch");
      expect(comment.commentableId).toBe(1);

      testCommentId = comment.id;
    });

    it("should retrieve comments for an entity", async () => {
      const entityComments = await commentsDb.getEntityComments(
        "inventory_batch",
        1
      );

      expect(entityComments).toBeDefined();
      expect(Array.isArray(entityComments)).toBe(true);
      expect(entityComments.length).toBeGreaterThan(0);
    });

    it("should get a specific comment by ID", async () => {
      const comment = await commentsDb.getCommentById(testCommentId);

      expect(comment).toBeDefined();
      expect(comment?.id).toBe(testCommentId);
      expect(comment?.content).toBe("Test comment content");
    });
  });

  describe("Comment Updates", () => {
    it("should update a comment", async () => {
      const updated = await commentsDb.updateComment(testCommentId, {
        content: "Updated comment content",
      });

      expect(updated).toBeDefined();
      expect(updated.content).toBe("Updated comment content");
    });
  });

  describe("Comment Resolution", () => {
    it("should mark a comment as resolved", async () => {
      const resolved = await commentsDb.resolveComment(
        testCommentId,
        testUserId
      );

      expect(resolved).toBeDefined();
      expect(resolved.isResolved).toBe(true);
      expect(resolved.resolvedBy).toBe(testUserId);
      expect(resolved.resolvedAt).toBeDefined();
    });

    it("should mark a comment as unresolved", async () => {
      const unresolved = await commentsDb.unresolveComment(testCommentId);

      expect(unresolved).toBeDefined();
      expect(unresolved.isResolved).toBe(false);
      expect(unresolved.resolvedBy).toBeNull();
      expect(unresolved.resolvedAt).toBeNull();
    });

    it("should count unresolved comments", async () => {
      const count = await commentsDb.getUnresolvedCommentsCount(
        "inventory_batch",
        1
      );

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Comment Mentions", () => {
    it("should create mentions for a comment", async () => {
      await commentsDb.createMentions(testCommentId, [testUserId], testUserId);

      const mentions = await commentsDb.getCommentMentions(testCommentId);

      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
      expect(mentions.length).toBeGreaterThan(0);
    });

    it("should get user mentions", async () => {
      const userMentions = await commentsDb.getUserMentions(testUserId);

      expect(userMentions).toBeDefined();
      expect(Array.isArray(userMentions)).toBe(true);
    });

    it("should delete comment mentions", async () => {
      await commentsDb.deleteCommentMentions(testCommentId);

      const mentions = await commentsDb.getCommentMentions(testCommentId);

      expect(mentions).toBeDefined();
      expect(mentions.length).toBe(0);
    });
  });

  describe("Comment Deletion", () => {
    it("should delete a comment", async () => {
      await commentsDb.deleteComment(testCommentId);

      const comment = await commentsDb.getCommentById(testCommentId);

      expect(comment).toBeNull();

      // Reset testCommentId so cleanup doesn't fail
      testCommentId = 0;
    });
  });
});
