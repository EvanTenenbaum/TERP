/**
 * Integration Tests for Dashboard Pagination (RF-002)
 *
 * Tests pagination functionality for dashboard list endpoints.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/dashboard.pagination.test.ts
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the database modules
vi.mock("../arApDb");
vi.mock("../dashboardDb");
vi.mock("../inventoryDb");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import * as arApDb from "../arApDb";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
  role: "admin",
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

describe("Dashboard Pagination (RF-002)", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("getSalesByClient with pagination", () => {
    it("should support limit parameter", async () => {
      // Arrange
      const mockInvoices = {
        invoices: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          totalAmount: "1000.00",
        })),
        total: 50,
      };

      vi.mocked(arApDb.getInvoices).mockResolvedValue(mockInvoices);

      // Act
      const result = await caller.dashboard.getSalesByClient({
        timePeriod: "LIFETIME",
        limit: 10,
      });

      // Assert
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeLessThanOrEqual(10);
      expect(result.total).toBe(50);
    });

    it("should support offset parameter", async () => {
      // Arrange
      const mockInvoices = {
        invoices: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          totalAmount: "1000.00",
        })),
        total: 50,
      };

      vi.mocked(arApDb.getInvoices).mockResolvedValue(mockInvoices);

      // Act
      const result = await caller.dashboard.getSalesByClient({
        timePeriod: "LIFETIME",
        limit: 10,
        offset: 20,
      });

      // Assert
      expect(result.data).toBeDefined();
      expect(result.offset).toBe(20);
    });

    it("should return pagination metadata", async () => {
      // Arrange
      const mockInvoices = {
        invoices: Array.from({ length: 50 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          totalAmount: "1000.00",
        })),
        total: 50,
      };

      vi.mocked(arApDb.getInvoices).mockResolvedValue(mockInvoices);

      // Act
      const result = await caller.dashboard.getSalesByClient({
        timePeriod: "LIFETIME",
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("offset");
      expect(result).toHaveProperty("hasMore");
      expect(result.hasMore).toBe(true);
    });

    it("should handle last page correctly", async () => {
      // Arrange
      // Create 25 invoices spread across 25 customers
      const mockInvoices = {
        invoices: Array.from({ length: 25 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          totalAmount: "1000.00",
        })),
        total: 25,
      };

      vi.mocked(arApDb.getInvoices).mockResolvedValue(mockInvoices);

      // Act
      const result = await caller.dashboard.getSalesByClient({
        timePeriod: "LIFETIME",
        limit: 10,
        offset: 20,
      });

      // Assert
      expect(result.hasMore).toBe(false);
      expect(result.data.length).toBe(5); // 25 total - 20 offset = 5 remaining
    });
  });

  describe("getCashCollected with pagination", () => {
    it("should support pagination parameters", async () => {
      // Arrange
      const mockPayments = {
        payments: Array.from({ length: 100 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          amount: "500.00",
          paymentType: "RECEIVED",
        })),
        total: 100,
      };

      vi.mocked(arApDb.getPayments).mockResolvedValue(mockPayments);

      // Act
      const result = await caller.dashboard.getCashCollected({
        months: 24,
        limit: 20,
        offset: 0,
      });

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("limit", 20);
      expect(result).toHaveProperty("offset", 0);
      expect(result).toHaveProperty("hasMore");
    });
  });

  describe("getClientDebt with pagination", () => {
    it("should support pagination parameters", async () => {
      // Arrange
      const mockReceivables = {
        invoices: Array.from({ length: 30 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          amountDue: "1500.00",
        })),
        total: 30,
      };

      vi.mocked(arApDb.getOutstandingReceivables).mockResolvedValue(
        mockReceivables
      );
      vi.mocked(arApDb.calculateARAging).mockResolvedValue({
        current: 0,
        days30: 0,
        days60: 0,
        days90: 0,
        over90: 0,
      });

      // Act
      const result = await caller.dashboard.getClientDebt({
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result.data.length).toBeLessThanOrEqual(10);
    });
  });

  describe("getClientProfitMargin with pagination", () => {
    it("should support pagination parameters", async () => {
      // Arrange
      const mockInvoices = {
        invoices: Array.from({ length: 40 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          totalAmount: "2000.00",
        })),
        total: 40,
      };

      vi.mocked(arApDb.getInvoices).mockResolvedValue(mockInvoices);

      // Act
      const result = await caller.dashboard.getClientProfitMargin({
        limit: 15,
        offset: 0,
      });

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      expect(result.data.length).toBeLessThanOrEqual(15);
    });
  });

  describe("pagination edge cases", () => {
    it("should handle empty results", async () => {
      // Arrange
      vi.mocked(arApDb.getInvoices).mockResolvedValue({
        invoices: [],
        total: 0,
      });

      // Act
      const result = await caller.dashboard.getSalesByClient({
        timePeriod: "LIFETIME",
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle offset beyond total", async () => {
      // Arrange
      vi.mocked(arApDb.getInvoices).mockResolvedValue({
        invoices: [],
        total: 10,
      });

      // Act
      const result = await caller.dashboard.getSalesByClient({
        timePeriod: "LIFETIME",
        limit: 10,
        offset: 100,
      });

      // Assert
      expect(result.data).toEqual([]);
      expect(result.hasMore).toBe(false);
    });

    it("should use default pagination when not specified", async () => {
      // Arrange
      const mockInvoices = {
        invoices: Array.from({ length: 20 }, (_, i) => ({
          id: i + 1,
          customerId: i + 1,
          totalAmount: "1000.00",
        })),
        total: 20,
      };

      vi.mocked(arApDb.getInvoices).mockResolvedValue(mockInvoices);

      // Act
      const result = await caller.dashboard.getSalesByClient({
        timePeriod: "LIFETIME",
      });

      // Assert
      expect(result).toHaveProperty("data");
      expect(result).toHaveProperty("total");
      // Should have default limit (50)
      expect(result.limit).toBe(50);
      expect(result.offset).toBe(0);
    });
  });
});
