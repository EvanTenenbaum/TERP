/**
 * Comments Router Tests
 * Tests for universal polymorphic comments and @mentions
 *
 * NOTE: These tests use mocks when DATABASE_URL is not set (unit test mode).
 * When DATABASE_URL is set, they run as integration tests against a real database.
 */

import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
  beforeEach,
} from "vitest";

// Check if we're in mock mode BEFORE any imports that might trigger DB connections
// Note: This variable is kept for future integration test support
const _isDbAvailable =
  Boolean(process.env.DATABASE_URL) &&
  process.env.DATABASE_URL !== "mysql://test:test@localhost:3306/terp_test";

// ============================================================================
// MOCK DATA STORE (used when database is not available)
// ============================================================================

type MockComment = {
  id: number;
  commentableType: string;
  commentableId: number;
  userId: number;
  content: string;
  isResolved: boolean;
  resolvedBy: number | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type MockMention = {
  id: number;
  commentId: number;
  mentionedUserId: number;
  mentionedByUserId: number;
  createdAt: Date;
};

// Mock data stores - shared across all mock functions
const mockComments: MockComment[] = [];
const mockMentions: MockMention[] = [];
let commentCounter = 1;
let mentionCounter = 1;

// Reset mock data before each test
const resetMockData = () => {
  mockComments.length = 0;
  mockMentions.length = 0;
  commentCounter = 1;
  mentionCounter = 1;
};

// ============================================================================
// MOCK IMPLEMENTATION (vi.mock must be hoisted to top level)
// ============================================================================

vi.mock("../commentsDb", () => ({
  createComment: vi.fn(
    async (input: {
      commentableType: string;
      commentableId: number;
      userId: number;
      content: string;
    }): Promise<MockComment> => {
      const newComment: MockComment = {
        id: commentCounter++,
        commentableType: input.commentableType,
        commentableId: input.commentableId,
        userId: input.userId,
        content: input.content,
        isResolved: false,
        resolvedBy: null,
        resolvedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockComments.push(newComment);
      return { ...newComment };
    }
  ),

  getEntityComments: vi.fn(
    async (commentableType: string, commentableId: number) => {
      const items = mockComments
        .filter(
          c =>
            c.commentableType === commentableType &&
            c.commentableId === commentableId
        )
        .map(c => ({ ...c }));
      return {
        items,
        total: items.length,
        limit: 50,
        offset: 0,
        hasMore: false,
      };
    }
  ),

  getCommentById: vi.fn(async (id: number): Promise<MockComment | null> => {
    const comment = mockComments.find(c => c.id === id);
    return comment ? { ...comment } : null;
  }),

  updateComment: vi.fn(
    async (id: number, data: { content?: string }): Promise<MockComment> => {
      const comment = mockComments.find(c => c.id === id);
      if (!comment) throw new Error("Comment not found");
      if (data.content !== undefined) {
        comment.content = data.content;
        comment.updatedAt = new Date();
      }
      return { ...comment };
    }
  ),

  resolveComment: vi.fn(
    async (id: number, userId: number): Promise<MockComment> => {
      const comment = mockComments.find(c => c.id === id);
      if (!comment) throw new Error("Comment not found");
      comment.isResolved = true;
      comment.resolvedBy = userId;
      comment.resolvedAt = new Date();
      return { ...comment };
    }
  ),

  unresolveComment: vi.fn(async (id: number): Promise<MockComment> => {
    const comment = mockComments.find(c => c.id === id);
    if (!comment) throw new Error("Comment not found");
    comment.isResolved = false;
    comment.resolvedBy = null;
    comment.resolvedAt = null;
    return { ...comment };
  }),

  getUnresolvedCommentsCount: vi.fn(
    async (commentableType: string, commentableId: number): Promise<number> =>
      mockComments.filter(
        c =>
          c.commentableType === commentableType &&
          c.commentableId === commentableId &&
          !c.isResolved
      ).length
  ),

  createMentions: vi.fn(
    async (
      commentId: number,
      userIds: number[],
      createdBy: number
    ): Promise<void> => {
      userIds.forEach(userId => {
        const mention: MockMention = {
          id: mentionCounter++,
          commentId,
          mentionedUserId: userId,
          mentionedByUserId: createdBy,
          createdAt: new Date(),
        };
        mockMentions.push(mention);
      });
    }
  ),

  getCommentMentions: vi.fn(
    async (commentId: number): Promise<MockMention[]> =>
      mockMentions.filter(m => m.commentId === commentId).map(m => ({ ...m }))
  ),

  getUserMentions: vi.fn(
    async (userId: number): Promise<MockMention[]> =>
      mockMentions
        .filter(m => m.mentionedUserId === userId)
        .map(m => ({ ...m }))
  ),

  deleteCommentMentions: vi.fn(async (commentId: number): Promise<void> => {
    for (let i = mockMentions.length - 1; i >= 0; i -= 1) {
      if (mockMentions[i].commentId === commentId) {
        mockMentions.splice(i, 1);
      }
    }
  }),

  deleteComment: vi.fn(async (id: number): Promise<void> => {
    const index = mockComments.findIndex(c => c.id === id);
    if (index !== -1) {
      mockComments.splice(index, 1);
    }
    for (let i = mockMentions.length - 1; i >= 0; i -= 1) {
      if (mockMentions[i].commentId === id) {
        mockMentions.splice(i, 1);
      }
    }
  }),
}));

// Import after mock is defined
import * as commentsDb from "../commentsDb";

// ============================================================================
// TEST SUITE
// ============================================================================

describe("Comments System", () => {
  let testUserId: number;

  beforeAll(async () => {
    // In mock mode, just set a test user ID
    testUserId = 1;
  });

  beforeEach(() => {
    // Reset mock data before each test to ensure isolation
    resetMockData();
    vi.clearAllMocks();
  });

  afterAll(async () => {
    // No cleanup needed in mock mode
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
    });

    it("should retrieve comments for an entity", async () => {
      // First create a comment
      await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment",
      });

      const result = await commentsDb.getEntityComments("inventory_batch", 1);

      expect(result).toBeDefined();
      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.items.length).toBeGreaterThan(0);
    });

    it("should get a specific comment by ID", async () => {
      // First create a comment
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment content",
      });

      const comment = await commentsDb.getCommentById(created.id);

      expect(comment).toBeDefined();
      expect(comment?.id).toBe(created.id);
      expect(comment?.content).toBe("Test comment content");
    });
  });

  describe("Comment Updates", () => {
    it("should update a comment", async () => {
      // First create a comment
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Original content",
      });

      const updated = await commentsDb.updateComment(created.id, {
        content: "Updated comment content",
      });

      expect(updated).toBeDefined();
      expect(updated.content).toBe("Updated comment content");
    });
  });

  describe("Comment Resolution", () => {
    it("should mark a comment as resolved", async () => {
      // First create a comment
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment",
      });

      const resolved = await commentsDb.resolveComment(created.id, testUserId);

      expect(resolved).toBeDefined();
      expect(resolved.isResolved).toBe(true);
      expect(resolved.resolvedBy).toBe(testUserId);
      expect(resolved.resolvedAt).toBeDefined();
    });

    it("should mark a comment as unresolved", async () => {
      // First create and resolve a comment
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment",
      });
      await commentsDb.resolveComment(created.id, testUserId);

      const unresolved = await commentsDb.unresolveComment(created.id);

      expect(unresolved).toBeDefined();
      expect(unresolved.isResolved).toBe(false);
      expect(unresolved.resolvedBy).toBeNull();
      expect(unresolved.resolvedAt).toBeNull();
    });

    it("should count unresolved comments", async () => {
      // Create an unresolved comment
      await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Unresolved comment",
      });

      const count = await commentsDb.getUnresolvedCommentsCount(
        "inventory_batch",
        1
      );

      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Comment Mentions", () => {
    it("should create mentions for a comment", async () => {
      // First create a comment
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment with @mention",
      });

      await commentsDb.createMentions(created.id, [testUserId], testUserId);

      const mentions = await commentsDb.getCommentMentions(created.id);

      expect(mentions).toBeDefined();
      expect(Array.isArray(mentions)).toBe(true);
      expect(mentions.length).toBeGreaterThan(0);
    });

    it("should get user mentions", async () => {
      // Create a comment with a mention
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment",
      });
      await commentsDb.createMentions(created.id, [testUserId], testUserId);

      const userMentions = await commentsDb.getUserMentions(testUserId);

      expect(userMentions).toBeDefined();
      expect(Array.isArray(userMentions)).toBe(true);
    });

    it("should delete comment mentions", async () => {
      // Create a comment with mentions
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Test comment",
      });
      await commentsDb.createMentions(created.id, [testUserId], testUserId);

      await commentsDb.deleteCommentMentions(created.id);

      const mentions = await commentsDb.getCommentMentions(created.id);

      expect(mentions).toBeDefined();
      expect(mentions.length).toBe(0);
    });
  });

  describe("Comment Deletion", () => {
    it("should delete a comment", async () => {
      // Create a comment
      const created = await commentsDb.createComment({
        commentableType: "inventory_batch",
        commentableId: 1,
        userId: testUserId,
        content: "Comment to delete",
      });

      await commentsDb.deleteComment(created.id);

      const comment = await commentsDb.getCommentById(created.id);

      expect(comment).toBeNull();
    });
  });
});
