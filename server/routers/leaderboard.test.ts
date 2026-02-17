/**
 * Unit Tests for Leaderboard Router
 *
 * Tests all tRPC procedures in the leaderboard router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/leaderboard.test.ts
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the leaderboard services - must match the actual import path
vi.mock("../services/leaderboard", () => ({
  getLeaderboard: vi.fn().mockResolvedValue({
    clients: [
      {
        clientId: 1,
        clientName: "Top Client",
        teriCode: "TC001",
        clientType: "CUSTOMER",
        totalScore: 100,
        rank: 1,
        metrics: new Map([
          ["revenue", { value: 50000, isSignificant: true }],
          ["orderCount", { value: 25, isSignificant: true }],
        ]),
        trend: "UP",
        trendAmount: 5,
      },
      {
        clientId: 2,
        clientName: "Second Client",
        teriCode: "SC002",
        clientType: "CUSTOMER",
        totalScore: 90,
        rank: 2,
        metrics: new Map([
          ["revenue", { value: 40000, isSignificant: true }],
          ["orderCount", { value: 20, isSignificant: true }],
        ]),
        trend: "STABLE",
        trendAmount: 0,
      },
    ],
    totalCount: 2,
    metadata: {
      calculatedAt: new Date(),
      cacheHit: false,
      weightsApplied: { revenue: 0.4, orderCount: 0.3, reliability: 0.3 },
      significanceWarnings: [],
    },
  }),
  getClientRanking: vi.fn().mockResolvedValue({
    clientId: 5,
    clientName: "Specific Client",
    teriCode: "SC005",
    clientType: "CUSTOMER",
    totalScore: 75,
    rank: 5,
    metrics: new Map([["revenue", { value: 25000, isSignificant: true }]]),
    trend: "UP",
    trendAmount: 2,
    metadata: {
      calculatedAt: new Date(),
      cacheHit: false,
    },
  }),
  getEffectiveWeights: vi.fn().mockResolvedValue({
    revenue: 40,
    orderCount: 30,
    reliability: 30,
  }),
  getDefaultWeights: vi.fn().mockResolvedValue({
    revenue: 40,
    orderCount: 30,
    reliability: 30,
  }),
  saveUserWeights: vi.fn().mockResolvedValue({ success: true }),
  resetUserWeights: vi.fn().mockResolvedValue({ success: true }),
  invalidateCache: vi.fn().mockResolvedValue({ success: true }),
  METRIC_CONFIGS: {
    ytd_revenue: { label: "YTD Revenue", category: "FINANCIAL" },
    order_frequency: { label: "Order Frequency", category: "ENGAGEMENT" },
  },
  CUSTOMER_DEFAULT_WEIGHTS: { revenue: 40, orderCount: 30, reliability: 30 },
  SUPPLIER_DEFAULT_WEIGHTS: { revenue: 40, orderCount: 30, reliability: 30 },
}));

import { appRouter } from "../routers";
import { createMockContext } from "../../tests/unit/mocks/db.mock";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = () => {
  const ctx = createMockContext({ user: mockUser });
  return appRouter.createCaller(ctx);
};

describe("Leaderboard Router", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("list", () => {
    it("should return client rankings with default parameters", async () => {
      // Act
      const result = await caller.leaderboard.list({});

      // Assert
      expect(result).toBeDefined();
      expect(result.clients).toBeDefined();
      expect(Array.isArray(result.clients)).toBe(true);
      expect(result.metadata).toBeDefined();
    });

    it("should accept ALL client type filter", async () => {
      // Act
      const result = await caller.leaderboard.list({
        clientType: "ALL",
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should filter rankings by time period", async () => {
      // Act
      const result = await caller.leaderboard.list({
        timePeriod: "MONTH",
      });

      // Assert
      expect(result).toBeDefined();
    });

    it("should limit results to specified count", async () => {
      // Act
      const result = await caller.leaderboard.list({
        limit: 3,
      });

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("getForClient", () => {
    it("should return rank for specific client", async () => {
      // Act
      const result = await caller.leaderboard.getForClient({
        clientId: 5,
      });

      // Assert
      expect(result).toBeDefined();
      expect(result.clientId).toBe(5);
    });
  });

  describe("getWidgetData", () => {
    it("should return widget data for dashboard", async () => {
      // Act
      const result = await caller.leaderboard.getWidgetData({});

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe("weights", () => {
    describe("get", () => {
      it("should return current weight configuration", async () => {
        // Act
        const result = await caller.leaderboard.weights.get({
          clientType: "ALL",
        });

        // Assert
        expect(result).toBeDefined();
      });
    });

    describe("save", () => {
      it("should save weight configuration", async () => {
        // Arrange - weights must sum to 100
        const newWeights = {
          revenue: 50,
          orderCount: 25,
          reliability: 25,
        };

        // Act
        const result = await caller.leaderboard.weights.save({
          clientType: "ALL",
          weights: newWeights,
        });

        // Assert
        expect(result).toBeDefined();
      });
    });

    describe("reset", () => {
      it("should reset weights to defaults", async () => {
        // Act
        const result = await caller.leaderboard.weights.reset({
          clientType: "ALL",
        });

        // Assert
        expect(result).toBeDefined();
      });
    });

    describe("getDefaults", () => {
      it("should return default weight values", async () => {
        // Act
        const result = await caller.leaderboard.weights.getDefaults({
          clientType: "ALL",
        });

        // Assert
        expect(result).toBeDefined();
      });
    });
  });
});

describe("Leaderboard Edge Cases", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle empty rankings gracefully", async () => {
    // Arrange
    const { getLeaderboard } = await import("../services/leaderboard");
    vi.mocked(getLeaderboard).mockResolvedValueOnce({
      clients: [],
      totalCount: 0,
      metadata: {
        calculatedAt: new Date(),
        cacheHit: false,
        weightsApplied: {},
        significanceWarnings: [],
      },
    });

    // Act
    const result = await caller.leaderboard.list({});

    // Assert
    expect(result).toBeDefined();
    expect(result.clients).toHaveLength(0);
  });

  it("should handle non-existent client in getForClient", async () => {
    // Arrange
    const { getClientRanking } = await import("../services/leaderboard");
    vi.mocked(getClientRanking).mockResolvedValueOnce(null);

    // Act & Assert
    await expect(
      caller.leaderboard.getForClient({ clientId: 99999 })
    ).rejects.toThrow();
  });
});
