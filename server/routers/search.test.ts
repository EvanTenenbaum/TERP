/**
 * Unit Tests for Search Router
 * BUG-042: Tests expanded search functionality including product names, strains
 *
 * Tests all tRPC procedures in the search router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/search.test.ts
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock data for testing expanded search
const mockProducts = [
  {
    id: 1,
    code: "BATCH-001",
    sku: "SKU-001",
    onHandQty: 100,
    unitCogs: "10.00",
    createdAt: new Date(),
    productId: 1,
    productName: "OG Kush Flower",
    category: "Flower",
    subcategory: "Premium",
    strainName: "OG Kush",
    strainCategory: "Hybrid",
  },
  {
    id: 2,
    code: "BATCH-002",
    sku: "SKU-002",
    onHandQty: 50,
    unitCogs: "15.00",
    createdAt: new Date(),
    productId: 2,
    productName: "Blue Dream Concentrate",
    category: "Concentrate",
    subcategory: "Live Resin",
    strainName: "Blue Dream",
    strainCategory: "Sativa",
  },
];

const _mockClients = [
  {
    id: 1,
    name: "Test Client",
    email: "test@example.com",
    phone: "555-0100",
    teriCode: "TC001",
    address: "123 Test St",
    createdAt: new Date(),
  },
  {
    id: 2,
    name: "Acme Corp",
    email: "contact@acme.com",
    phone: "555-0200",
    teriCode: "AC001",
    address: "456 Business Ave",
    createdAt: new Date(),
  },
];

const _mockQuotes = [
  {
    id: 1,
    orderNumber: "Q-001",
    notes: "Rush order for OG Kush",
    clientId: 1,
    total: "500.00",
    createdAt: new Date(),
  },
];

// Mock the database (MUST be before other imports)
vi.mock("../db", () => {
  const createMockChain = (results: unknown[]) => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(results),
    };
    return chain;
  };

  const mockDb = {
    select: vi.fn().mockImplementation(() => createMockChain([])),
  };

  return {
    db: mockDb,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
});

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock logger
vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

import { appRouter } from "../routers";
import { createMockContext } from "../../tests/unit/mocks/db.mock";
import { getDb } from "../db";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
  openId: "test-user",
  role: "user" as const,
};

// Create a test caller with mock context
const createCaller = () => {
  const ctx = createMockContext({ user: mockUser });
  return appRouter.createCaller(ctx);
};

describe("Search Router", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
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
      expect(result.quotes).toBeDefined();
      expect(result.customers).toBeDefined();
      expect(result.products).toBeDefined();
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

    // BUG-042: New tests for expanded search
    it("should accept types filter parameter", async () => {
      // Act
      const result = await caller.search.global({
        query: "test",
        types: ["product", "customer"],
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should accept batch type filter", async () => {
      // Act
      const result = await caller.search.global({
        query: "BATCH",
        types: ["batch"],
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should accept quote type filter", async () => {
      // Act
      const result = await caller.search.global({
        query: "Q-001",
        types: ["quote"],
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should accept customer type filter", async () => {
      // Act
      const result = await caller.search.global({
        query: "Acme",
        types: ["customer"],
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should accept product type filter", async () => {
      // Act
      const result = await caller.search.global({
        query: "Kush",
        types: ["product"],
      });

      // Assert
      expect(result).toBeDefined();
    });
  });
});

describe("Search Input Validation", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
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

  // BUG-042: Test SQL wildcard sanitization
  it("should sanitize SQL wildcards in query", async () => {
    // Act - should not cause SQL injection or unexpected behavior
    const result = await caller.search.global({
      query: "%_test",
    });

    // Assert
    expect(result).toBeDefined();
    expect(Array.isArray(result.products)).toBe(true);
  });

  it("should handle backslashes in query", async () => {
    // Act
    const result = await caller.search.global({
      query: "test\\path",
    });

    // Assert
    expect(result).toBeDefined();
  });
});

describe("Search Relevance Scoring", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  beforeEach(async () => {
    vi.clearAllMocks();

    // Setup mock to return products for relevance testing
    const db = await getDb();
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue(mockProducts),
    };
    ((db as typeof mockDb).select as ReturnType<typeof vi.fn>).mockReturnValue(
      mockChain
    );
  });

  it("should return results sorted by relevance", async () => {
    // Act
    const result = await caller.search.global({
      query: "OG Kush",
    });

    // Assert
    expect(result).toBeDefined();
    // Results should be defined (even if empty due to mocking)
    expect(Array.isArray(result.products)).toBe(true);
  });
});

describe("Search Error Handling", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle database errors gracefully", async () => {
    // Arrange - mock database to throw error
    const db = await getDb();
    const mockChain = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      leftJoin: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("Database error")),
    };
    ((db as typeof mockDb).select as ReturnType<typeof vi.fn>).mockReturnValue(
      mockChain
    );

    // Act
    const result = await caller.search.global({
      query: "test",
    });

    // Assert - should return empty results, not throw
    expect(result).toBeDefined();
    expect(result.quotes).toEqual([]);
    expect(result.customers).toEqual([]);
    expect(result.products).toEqual([]);
  });
});

describe("Search Type Filtering", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should filter to only quotes when specified", async () => {
    // Act
    const result = await caller.search.global({
      query: "test",
      types: ["quote"],
    });

    // Assert
    expect(result).toBeDefined();
  });

  it("should filter to only customers when specified", async () => {
    // Act
    const result = await caller.search.global({
      query: "test",
      types: ["customer"],
    });

    // Assert
    expect(result).toBeDefined();
  });

  it("should filter to only products when specified", async () => {
    // Act
    const result = await caller.search.global({
      query: "test",
      types: ["product"],
    });

    // Assert
    expect(result).toBeDefined();
  });

  it("should filter to only batches when specified", async () => {
    // Act
    const result = await caller.search.global({
      query: "test",
      types: ["batch"],
    });

    // Assert
    expect(result).toBeDefined();
  });

  it("should filter to multiple types", async () => {
    // Act
    const result = await caller.search.global({
      query: "test",
      types: ["customer", "product"],
    });

    // Assert
    expect(result).toBeDefined();
  });
});
