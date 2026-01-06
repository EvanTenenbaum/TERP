/**
 * Tests for dataProvider abstraction layer
 *
 * The dataProvider provides a consistent interface for data access
 * regardless of the underlying implementation (direct DB, Redis cache, offline store, etc.)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { User } from "../../drizzle/schema";
import { dataProvider } from "./dataProvider";
import * as db from "../db";

// Mock the database
vi.mock("../db", () => ({
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
  query: {
    users: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

describe("dataProvider", () => {
  const mockUser: User = {
    id: 1,
    openId: "user_123",
    email: "test@example.com",
    name: "Test User",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUser", () => {
    it("should get user by ID", async () => {
      // Arrange
      vi.mocked(db.getUser).mockResolvedValue(mockUser);

      // Act
      const user = await dataProvider.getUser("user_123");

      // Assert
      expect(user).toEqual(mockUser);
      expect(db.getUser).toHaveBeenCalledWith("user_123");
    });

    it("should return null for non-existent user", async () => {
      // Arrange
      vi.mocked(db.getUser).mockResolvedValue(null);

      // Act
      const user = await dataProvider.getUser("nonexistent");

      // Assert
      expect(user).toBeNull();
    });
  });

  describe("getUserByEmail", () => {
    it("should get user by email", async () => {
      // Arrange
      vi.mocked(db.getUserByEmail).mockResolvedValue(mockUser);

      // Act
      const user = await dataProvider.getUserByEmail("test@example.com");

      // Assert
      expect(user).toEqual(mockUser);
      expect(db.getUserByEmail).toHaveBeenCalledWith("test@example.com");
    });

    it("should return null for non-existent email", async () => {
      // Arrange
      vi.mocked(db.getUserByEmail).mockResolvedValue(null);

      // Act
      const user = await dataProvider.getUserByEmail("nonexistent@example.com");

      // Assert
      expect(user).toBeNull();
    });
  });

  // NOTE: Removed invalid test "should expose query builder"
  // The DataProvider interface doesn't include a query property -
  // it provides getUser/getUserByEmail methods instead.

  describe("getProvider", () => {
    it("should return the current provider name", () => {
      // Act
      const providerName = dataProvider.getProvider();

      // Assert
      expect(providerName).toBe("drizzle");
    });
  });
});
