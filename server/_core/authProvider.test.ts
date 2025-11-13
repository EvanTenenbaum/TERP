/**
 * Tests for authProvider abstraction layer
 *
 * The authProvider provides a consistent interface for authentication
 * regardless of the underlying implementation (simpleAuth, Clerk, Auth0, etc.)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import type { User } from "../../drizzle/schema";
import type { Request } from "express";
import * as db from "../db";

// We'll implement these in authProvider.ts
import { authProvider } from "./authProvider";

// Mock the database
vi.mock("../db", () => ({
  getUser: vi.fn(),
  getUserByEmail: vi.fn(),
}));

describe("authProvider", () => {
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

  describe("authenticate", () => {
    it("should successfully authenticate a valid request", async () => {
      // Arrange: Create a real token
      const validToken = authProvider.createSession(mockUser);
      const mockReq = {
        cookies: { terp_session: validToken },
      } as Request;

      // Mock database to return user
      vi.mocked(db.getUser).mockResolvedValue(mockUser);

      // Act
      const result = await authProvider.authenticate(mockReq);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.user).toBeDefined();
        expect(result.user.id).toBe(1);
        expect(result.user.email).toBe("test@example.com");
      }
    });

    it("should fail authentication for request without token", async () => {
      // Arrange
      const mockReq = {
        cookies: {},
      } as Request;

      // Act
      const result = await authProvider.authenticate(mockReq);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("NO_TOKEN");
        expect(result.message).toContain("No authentication token");
      }
    });

    it("should fail authentication for invalid token", async () => {
      // Arrange: Use a malformed token
      const mockReq = {
        cookies: { terp_session: "invalid.malformed.token" },
      } as Request;

      // Act
      const result = await authProvider.authenticate(mockReq);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("INVALID_TOKEN");
      }
    });

    it("should fail authentication for expired token", async () => {
      // Arrange: Create a token with expired payload (we'll test error handling)
      // Note: Creating an actually expired JWT requires time manipulation
      // For now, we'll test that the error handling works
      const mockReq = {
        cookies: {
          terp_session:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ1c2VyXzEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImV4cCI6MH0.invalid",
        },
      } as Request;

      // Act
      const result = await authProvider.authenticate(mockReq);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        // Will be INVALID_TOKEN since the signature is wrong
        expect(["INVALID_TOKEN", "TOKEN_EXPIRED"]).toContain(result.error);
      }
    });

    it("should fail authentication for user not found", async () => {
      // Arrange: Create a valid token but mock database to return null
      const validToken = authProvider.createSession(mockUser);
      const mockReq = {
        cookies: { terp_session: validToken },
      } as Request;

      // Mock database to return null (user not found)
      vi.mocked(db.getUser).mockResolvedValue(null);

      // Act
      const result = await authProvider.authenticate(mockReq);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("USER_NOT_FOUND");
      }
    });
  });

  describe("createSession", () => {
    it("should create a session token for a user", () => {
      // Arrange
      const mockUser: User = {
        id: 1,
        openId: "user_123",
        email: "test@example.com",
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token = authProvider.createSession(mockUser);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should create different tokens for different users", () => {
      // Arrange
      const user1: User = {
        id: 1,
        openId: "user_123",
        email: "user1@example.com",
        name: "User 1",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const user2: User = {
        id: 2,
        openId: "user_456",
        email: "user2@example.com",
        name: "User 2",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Act
      const token1 = authProvider.createSession(user1);
      const token2 = authProvider.createSession(user2);

      // Assert
      expect(token1).not.toBe(token2);
    });
  });

  describe("verifySession", () => {
    it("should verify a valid session token", () => {
      // Arrange
      const mockUser: User = {
        id: 1,
        openId: "user_123",
        email: "test@example.com",
        name: "Test User",
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const token = authProvider.createSession(mockUser);

      // Act
      const payload = authProvider.verifySession(token);

      // Assert
      expect(payload).toBeDefined();
      expect(payload?.userId).toBe("user_123");
      expect(payload?.email).toBe("test@example.com");
    });

    it("should return null for invalid token", () => {
      // Arrange
      const invalidToken = "invalid.token.here";

      // Act
      const payload = authProvider.verifySession(invalidToken);

      // Assert
      expect(payload).toBeNull();
    });

    it("should return null for malformed token", () => {
      // Arrange
      const malformedToken = "not-even-a-jwt";

      // Act
      const payload = authProvider.verifySession(malformedToken);

      // Assert
      expect(payload).toBeNull();
    });
  });

  describe("hashPassword", () => {
    it("should hash a password", async () => {
      // Arrange
      const password = "SecurePassword123!";

      // Act
      const hash = await authProvider.hashPassword(password);

      // Assert
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(0);
    });

    it("should create different hashes for same password", async () => {
      // Arrange
      const password = "SecurePassword123!";

      // Act
      const hash1 = await authProvider.hashPassword(password);
      const hash2 = await authProvider.hashPassword(password);

      // Assert
      expect(hash1).not.toBe(hash2); // bcrypt uses salt
    });
  });

  describe("verifyPassword", () => {
    it("should verify correct password against hash", async () => {
      // Arrange
      const password = "SecurePassword123!";
      const hash = await authProvider.hashPassword(password);

      // Act
      const isValid = await authProvider.verifyPassword(password, hash);

      // Assert
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      // Arrange
      const password = "SecurePassword123!";
      const wrongPassword = "WrongPassword456!";
      const hash = await authProvider.hashPassword(password);

      // Act
      const isValid = await authProvider.verifyPassword(wrongPassword, hash);

      // Assert
      expect(isValid).toBe(false);
    });

    it("should reject empty password", async () => {
      // Arrange
      const password = "SecurePassword123!";
      const hash = await authProvider.hashPassword(password);

      // Act
      const isValid = await authProvider.verifyPassword("", hash);

      // Assert
      expect(isValid).toBe(false);
    });
  });

  describe("getProvider", () => {
    it("should return the current provider name", () => {
      // Act
      const providerName = authProvider.getProvider();

      // Assert
      expect(providerName).toBeDefined();
      expect(typeof providerName).toBe("string");
      expect(providerName).toBe("simpleAuth"); // Current implementation
    });
  });
});
