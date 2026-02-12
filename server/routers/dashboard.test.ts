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
import * as dashboardDb from "../dashboardDb";
import * as inventoryDb from "../inventoryDb";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} } as Record<string, unknown>,
    res: {} as Record<string, unknown>,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("Dashboard Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("getKpis", () => {
    it("should retrieve dashboard KPIs", async () => {
      // Arrange
      const mockInventoryStats = {
        totalInventoryValue: 50000,
        totalBatches: 100,
      };

      const mockPaidInvoices = {
        invoices: [
          { id: 1, totalAmount: "1000.00", status: "PAID" },
          { id: 2, totalAmount: "2000.00", status: "PAID" },
        ],
        totalCount: 2,
      };

      const mockActiveInvoices = {
        invoices: [
          { id: 3, status: "SENT" },
          { id: 4, status: "SENT" },
          { id: 5, status: "SENT" },
        ],
        totalCount: 3,
      };

      // All invoices (combined paid and active) - used for period-over-period calculations
      const mockAllInvoices = {
        invoices: [
          { id: 1, totalAmount: "1000.00", status: "PAID", invoiceDate: new Date().toISOString() },
          { id: 2, totalAmount: "2000.00", status: "PAID", invoiceDate: new Date().toISOString() },
          { id: 3, status: "SENT", invoiceDate: new Date().toISOString() },
          { id: 4, status: "SENT", invoiceDate: new Date().toISOString() },
          { id: 5, status: "SENT", invoiceDate: new Date().toISOString() },
        ],
        totalCount: 5,
      };

      vi.mocked(inventoryDb.getDashboardStats).mockResolvedValue(
        mockInventoryStats
      );
      vi.mocked(arApDb.getOutstandingReceivables).mockResolvedValue({
        total: 5000,
      });
      vi.mocked(arApDb.getInvoices)
        .mockResolvedValueOnce(mockPaidInvoices)    // First call: PAID invoices
        .mockResolvedValueOnce(mockActiveInvoices)  // Second call: SENT invoices
        .mockResolvedValueOnce(mockAllInvoices);    // Third call: All invoices

      // Act
      const result = await caller.dashboard.getKpis();

      // Assert
      expect(result).toHaveProperty("totalRevenue", 3000);
      expect(result).toHaveProperty("activeOrders", 3);
      expect(result).toHaveProperty("inventoryValue", 50000);
      expect(result).toHaveProperty("lowStockCount", 0);
    });

    it("should handle empty invoices", async () => {
      // Arrange
      vi.mocked(inventoryDb.getDashboardStats).mockResolvedValue({
        totalInventoryValue: 0,
      });
      vi.mocked(arApDb.getOutstandingReceivables).mockResolvedValue({
        total: 0,
      });
      vi.mocked(arApDb.getInvoices).mockResolvedValue({ invoices: [] });

      // Act
      const result = await caller.dashboard.getKpis();

      // Assert
      expect(result.totalRevenue).toBe(0);
      expect(result.activeOrders).toBe(0);
    });
  });

  describe("getLayout", () => {
    it("should retrieve user widget layout", async () => {
      // Arrange
      const mockLayout = {
        userId: 1,
        widgets: [
          {
            widgetType: "revenue",
            position: 0,
            width: 4,
            height: 2,
            isVisible: true,
          },
          {
            widgetType: "orders",
            position: 1,
            width: 4,
            height: 2,
            isVisible: true,
          },
        ],
      };

      vi.mocked(dashboardDb.getUserWidgetLayout).mockResolvedValue(mockLayout);

      // Act
      const result = await caller.dashboard.getLayout();

      // Assert
      expect(result).toEqual(mockLayout);
      expect(dashboardDb.getUserWidgetLayout).toHaveBeenCalledWith(1);
    });

    it("should return empty layout for new user", async () => {
      // Arrange
      vi.mocked(dashboardDb.getUserWidgetLayout).mockResolvedValue({
        widgets: [],
      });

      // Act
      const result = await caller.dashboard.getLayout();

      // Assert
      expect(result.widgets).toEqual([]);
    });
  });

  describe("saveLayout", () => {
    it("should save user widget layout", async () => {
      // Arrange
      const input = {
        widgets: [
          {
            widgetType: "revenue",
            position: 0,
            width: 4,
            height: 2,
            isVisible: true,
          },
          {
            widgetType: "inventory",
            position: 1,
            width: 4,
            height: 3,
            isVisible: false,
          },
        ],
      };

      const mockSavedLayout = {
        userId: 1,
        ...input,
      };

      vi.mocked(dashboardDb.saveUserWidgetLayout).mockResolvedValue(
        mockSavedLayout
      );

      // Act
      const result = await caller.dashboard.saveLayout(input);

      // Assert
      expect(result).toEqual(mockSavedLayout);
      expect(dashboardDb.saveUserWidgetLayout).toHaveBeenCalledWith(
        1,
        input.widgets
      );
    });

    it("should save layout with custom widget config", async () => {
      // Arrange
      const input = {
        widgets: [
          {
            widgetType: "chart",
            position: 0,
            width: 6,
            height: 4,
            isVisible: true,
            config: { chartType: "line", period: "30d" },
          },
        ],
      };

      vi.mocked(dashboardDb.saveUserWidgetLayout).mockResolvedValue({
        userId: 1,
        ...input,
      });

      // Act
      const result = await caller.dashboard.saveLayout(input);

      // Assert
      expect(result.widgets[0].config).toEqual({
        chartType: "line",
        period: "30d",
      });
    });
  });

  describe("Edge Cases", () => {
    it("should handle null inventory stats", async () => {
      // Arrange
      vi.mocked(inventoryDb.getDashboardStats).mockResolvedValue(null);
      vi.mocked(arApDb.getOutstandingReceivables).mockResolvedValue({
        total: 0,
      });
      vi.mocked(arApDb.getInvoices).mockResolvedValue({ invoices: [] });

      // Act
      const result = await caller.dashboard.getKpis();

      // Assert
      expect(result.inventoryValue).toBe(0);
    });

    it("should handle empty widget array", async () => {
      // Arrange
      const input = { widgets: [] };

      vi.mocked(dashboardDb.saveUserWidgetLayout).mockResolvedValue({
        userId: 1,
        widgets: [],
      });

      // Act
      const result = await caller.dashboard.saveLayout(input);

      // Assert
      expect(result.widgets).toHaveLength(0);
    });
  });
});