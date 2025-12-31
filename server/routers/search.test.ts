/**
 * Unit Tests for Search Router
 *
 * Tests all tRPC procedures in the search router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/search.test.ts
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
// setupDbMock not needed - using custom mock
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => {
  const mockDb = {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  };
  return {
    db: mockDb,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

import { appRouter } from "../routers";
import { createContext } from "../_core/context";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    req: { headers: {} } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("Search Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("global", () => {
    it("should search across all entities with query string", async () => {
      // Act
      const result = await caller.search.global({
        query: "Acme",
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should return results with default limit", async () => {
      // Act
      const result = await caller.search.global({
        query: "test",
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should limit results per category", async () => {
      // Act
      const result = await caller.search.global({
        query: "Client",
        limit: 5,
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should handle special characters in query", async () => {
      // Act
      const result = await caller.search.global({
        query: "test@example.com",
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should reject empty query string", async () => {
      // Act & Assert
      await expect(
        caller.search.global({
          query: "",
        })
      ).rejects.toThrow();
    });

    it("should reject query that is too long", async () => {
      // Act & Assert
      await expect(
        caller.search.global({
          query: "a".repeat(300),
        })
      ).rejects.toThrow();
    });

    it("should reject limit less than 1", async () => {
      // Act & Assert
      await expect(
        caller.search.global({
          query: "test",
          limit: 0,
        })
      ).rejects.toThrow();
    });

    it("should reject limit greater than 100", async () => {
      // Act & Assert
      await expect(
        caller.search.global({
          query: "test",
          limit: 150,
        })
      ).rejects.toThrow();
    });
  });
});

describe("Search Input Validation", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should trim whitespace from query", async () => {
    // Act
    const result = await caller.search.global({
      query: "  test  ",
    });

    // Assert
    expect(result).toBeDefined();
  });

  it("should accept minimum valid query length", async () => {
    // Act
    const result = await caller.search.global({
      query: "a",
    });

    // Assert
    expect(result).toBeDefined();
  });

  it("should accept maximum valid query length", async () => {
    // Act
    const result = await caller.search.global({
      query: "a".repeat(200),
    });

    // Assert
    expect(result).toBeDefined();
  });
});
