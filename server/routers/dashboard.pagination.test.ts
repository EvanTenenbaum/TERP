/**
 * Integration Tests for Dashboard Pagination (RF-002)
 *
 * Tests pagination functionality for dashboard list endpoints.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/dashboard.pagination.test.ts
 */

import { describe, it, expect, beforeAll, afterEach, vi } from "vitest";
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
vi.mock("../services/payablesService");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import * as arApDb from "../arApDb";
import * as payablesService from "../services/payablesService";

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

  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(payablesService.listPayables).mockReset();
    vi.mocked(arApDb.getInvoices).mockReset();
    vi.mocked(arApDb.getPayments).mockReset();
    vi.mocked(arApDb.getOutstandingReceivables).mockReset();
    vi.mocked(arApDb.calculateARAging).mockReset();
    vi.useRealTimers();
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

    it("should aggregate multiple invoices for the same client", async () => {
      // Arrange
      const today = new Date();
      const fiftyDaysAgo = new Date(today);
      fiftyDaysAgo.setDate(today.getDate() - 50);
      const tenDaysAgo = new Date(today);
      tenDaysAgo.setDate(today.getDate() - 10);

      vi.mocked(arApDb.getOutstandingReceivables).mockResolvedValue({
        invoices: [
          {
            id: 1,
            customerId: 101,
            amountDue: "1000.00",
            invoiceDate: fiftyDaysAgo,
          },
          {
            id: 2,
            customerId: 101,
            amountDue: "500.00",
            invoiceDate: tenDaysAgo,
          },
          {
            id: 3,
            customerId: 202,
            amountDue: "1200.00",
            invoiceDate: tenDaysAgo,
          },
        ],
        total: 3,
      });
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
      expect(result.total).toBe(2);

      const client101 = result.data.find(client => client.customerId === 101);
      expect(client101).toBeDefined();
      expect(client101?.currentDebt).toBe(1500);
      expect(client101?.oldestDebt).toBeGreaterThanOrEqual(49);

      const client202 = result.data.find(client => client.customerId === 202);
      expect(client202).toBeDefined();
      expect(client202?.currentDebt).toBe(1200);
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

  describe("getVendorsNeedingPayment with pagination", () => {
    it("should aggregate sold-out unpaid payables by vendor", async () => {
      // Arrange
      vi.mocked(payablesService.listPayables).mockResolvedValue({
        items: [
          {
            id: 1,
            vendorClientId: 11,
            vendorName: "North Coast Supply",
            amountDue: "800.00",
            status: "DUE",
            inventoryZeroAt: new Date("2026-02-01"),
            createdAt: new Date("2026-01-20"),
          },
          {
            id: 2,
            vendorClientId: 11,
            vendorName: "North Coast Supply",
            amountDue: "200.00",
            status: "PARTIAL",
            inventoryZeroAt: new Date("2026-01-28"),
            createdAt: new Date("2026-01-19"),
          },
          {
            id: 3,
            vendorClientId: 22,
            vendorName: "Ridgeline Farms",
            amountDue: "500.00",
            status: "DUE",
            inventoryZeroAt: new Date("2026-02-05"),
            createdAt: new Date("2026-01-25"),
          },
          {
            id: 4,
            vendorClientId: 33,
            vendorName: "Already Paid Vendor",
            amountDue: "0.00",
            status: "DUE",
            inventoryZeroAt: new Date("2026-02-05"),
            createdAt: new Date("2026-01-25"),
          },
          {
            id: 5,
            vendorClientId: 44,
            vendorName: "Not Sold-Out Yet",
            amountDue: "900.00",
            status: "DUE",
            inventoryZeroAt: null,
            createdAt: new Date("2026-01-22"),
          },
        ],
        total: 5,
      } as unknown as Awaited<ReturnType<typeof payablesService.listPayables>>);

      // Act
      const result = await caller.dashboard.getVendorsNeedingPayment({
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(result.total).toBe(2);
      expect(result.data[0].vendorName).toBe("North Coast Supply");
      expect(result.data[0].amountDue).toBe(1000);
      expect(result.data[0].soldOutBatches).toBe(2);
      expect(result.data[1].vendorName).toBe("Ridgeline Farms");
      expect(result.data[1].amountDue).toBe(500);
    });

    it("should fetch all payable pages before aggregating vendors", async () => {
      // Arrange
      vi.mocked(payablesService.listPayables)
        .mockResolvedValueOnce({
          items: [
            {
              id: 101,
              vendorClientId: 11,
              vendorName: "North Coast Supply",
              amountDue: "100.00",
              status: "DUE",
              inventoryZeroAt: new Date("2026-02-01"),
              createdAt: new Date("2026-01-20"),
            },
          ],
          total: 3,
        } as unknown as Awaited<
          ReturnType<typeof payablesService.listPayables>
        >)
        .mockResolvedValueOnce({
          items: [
            {
              id: 102,
              vendorClientId: 22,
              vendorName: "Ridgeline Farms",
              amountDue: "200.00",
              status: "DUE",
              inventoryZeroAt: new Date("2026-02-02"),
              createdAt: new Date("2026-01-21"),
            },
          ],
          total: 3,
        } as unknown as Awaited<
          ReturnType<typeof payablesService.listPayables>
        >)
        .mockResolvedValueOnce({
          items: [
            {
              id: 103,
              vendorClientId: 11,
              vendorName: "North Coast Supply",
              amountDue: "50.00",
              status: "PARTIAL",
              inventoryZeroAt: new Date("2026-02-03"),
              createdAt: new Date("2026-01-22"),
            },
          ],
          total: 3,
        } as unknown as Awaited<
          ReturnType<typeof payablesService.listPayables>
        >);

      // Act
      const result = await caller.dashboard.getVendorsNeedingPayment({
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(payablesService.listPayables).toHaveBeenCalledTimes(3);
      expect(result.total).toBe(2);

      const vendor11 = result.data.find(v => v.vendorClientId === 11);
      expect(vendor11).toBeDefined();
      expect(vendor11?.amountDue).toBe(150);
      expect(vendor11?.soldOutBatches).toBe(2);

      const vendor22 = result.data.find(v => v.vendorClientId === 22);
      expect(vendor22).toBeDefined();
      expect(vendor22?.amountDue).toBe(200);
    });

    it("should prioritize dueDate age when dueDate exists", async () => {
      // Arrange
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-02-20T12:00:00.000Z"));

      vi.mocked(payablesService.listPayables).mockResolvedValue({
        items: [
          {
            id: 201,
            vendorClientId: 99,
            vendorName: "Due Date Vendor",
            amountDue: "300.00",
            status: "DUE",
            inventoryZeroAt: new Date("2026-02-19"), // 1 day ago
            dueDate: new Date("2026-01-10"), // 41 days ago
            createdAt: new Date("2026-01-01"),
          },
        ],
        total: 1,
      } as unknown as Awaited<ReturnType<typeof payablesService.listPayables>>);

      // Act
      const result = await caller.dashboard.getVendorsNeedingPayment({
        limit: 10,
        offset: 0,
      });

      // Assert
      expect(result.total).toBe(1);
      expect(result.data[0].vendorClientId).toBe(99);
      expect(result.data[0].oldestDueDays).toBeGreaterThanOrEqual(40);
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
