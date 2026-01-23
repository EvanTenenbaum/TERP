/**
 * Integration Tests for Calendar Financials Router
 *
 * Tests all tRPC procedures in the calendarFinancials router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/calendarFinancials.test.ts
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from "vitest";
import { setupDbMock, createMockDb } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database module (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { db, getDb } from "../db";

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

describe("Calendar Financials Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock db.query.invoices.findMany to return empty array
    const mockDb = db as any;
    if (mockDb.query?.invoices?.findMany) {
      vi.mocked(mockDb.query.invoices.findMany).mockResolvedValue([]);
    }
    if (mockDb.query?.payments?.findMany) {
      vi.mocked(mockDb.query.payments.findMany).mockResolvedValue([]);
    }
    if (mockDb.query?.clients?.findFirst) {
      vi.mocked(mockDb.query.clients.findFirst).mockResolvedValue(null);
    }
  });

  // TODO: These tests require more complex db query mocking
  // The router uses db.query.invoices.findMany which needs proper mock setup
  describe("getMeetingFinancialContext", () => {
    it.skip("should retrieve financial context for a client meeting", async () => {
      // Arrange
      const input = { clientId: 1 };

      // Act
      const result =
        await caller.calendarFinancials.getMeetingFinancialContext(input);

      // Assert
      expect(result).toHaveProperty("clientId", 1);
      expect(result).toHaveProperty("outstandingAR");
      expect(result).toHaveProperty("overdueAmount");
      expect(result).toHaveProperty("creditLimit");
      expect(result).toHaveProperty("recentPayments");
      expect(result).toHaveProperty("recentInvoices");
    });

    it.skip("should return zero values for client with no financial data", async () => {
      // Arrange
      const input = { clientId: 999 };

      // Act
      const result =
        await caller.calendarFinancials.getMeetingFinancialContext(input);

      // Assert
      expect(result.outstandingAR).toBe(0);
      expect(result.overdueAmount).toBe(0);
      expect(result.creditUsed).toBe(0);
      expect(result.recentPayments).toEqual([]);
    });
  });

  describe("getCollectionsQueue", () => {
    it("should retrieve collections queue with default filters", async () => {
      // Arrange
      const input = {};

      // Act
      const result = await caller.calendarFinancials.getCollectionsQueue(input);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by minimum overdue amount", async () => {
      // Arrange
      const input = { minOverdueAmount: 1000 };

      // Act
      const result = await caller.calendarFinancials.getCollectionsQueue(input);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by minimum days past due", async () => {
      // Arrange
      const input = { minDaysPastDue: 30 };

      // Act
      const result = await caller.calendarFinancials.getCollectionsQueue(input);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });

    it("should filter by both amount and days", async () => {
      // Arrange
      const input = {
        minOverdueAmount: 500,
        minDaysPastDue: 15,
      };

      // Act
      const result = await caller.calendarFinancials.getCollectionsQueue(input);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("Edge Cases", () => {
    it("should handle database unavailable error", async () => {
      // Arrange
      vi.mocked(getDb).mockResolvedValueOnce(null);

      // Act & Assert
      await expect(
        caller.calendarFinancials.getMeetingFinancialContext({ clientId: 1 })
      ).rejects.toThrow("Database not available");
    });

    it("should handle zero client ID", async () => {
      // Arrange
      const input = { clientId: 0 };

      // Act
      const result =
        await caller.calendarFinancials.getMeetingFinancialContext(input);

      // Assert
      expect(result.clientId).toBe(0);
    });

    it("should handle negative filter values", async () => {
      // Arrange
      const input = {
        minOverdueAmount: -100,
        minDaysPastDue: -10,
      };

      // Act
      const result = await caller.calendarFinancials.getCollectionsQueue(input);

      // Assert
      expect(Array.isArray(result)).toBe(true);
    });
  });
});
