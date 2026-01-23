import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the inventory modules
vi.mock("../inventoryDb");
vi.mock("../inventoryUtils");
vi.mock("../inventoryIntakeService");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import * as inventoryDb from "../inventoryDb";
import * as inventoryUtils from "../inventoryUtils";

// Mock user for authenticated requests
const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

// Create a test caller with mock context
const createCaller = async () => {
  const ctx = await createContext({
    req: { headers: {} } as any,
    res: {} as any,
  });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

describe("Inventory Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("list", () => {
    it("should list batches with pagination", async () => {
      // Arrange
      const mockBatches = {
        items: [
          {
            id: 1,
            code: "BATCH-001",
            productName: "Product A",
            onHandQty: "100",
          },
          {
            id: 2,
            code: "BATCH-002",
            productName: "Product B",
            onHandQty: "200",
          },
        ],
        hasMore: true,
        nextCursor: "cursor-123",
      };

      vi.mocked(inventoryDb.getBatchesWithDetails).mockResolvedValue(
        mockBatches
      );

      // Act
      const result = await caller.inventory.list({ limit: 50 });

      // Assert
      expect(result).toEqual(mockBatches);
      expect(result.items).toHaveLength(2);
      expect(result.hasMore).toBe(true);
    });

    it("should search batches by query", async () => {
      // Arrange
      const mockSearchResults = {
        items: [{ id: 1, code: "BATCH-001", productName: "Searched Product" }],
        hasMore: false,
        nextCursor: null,
      };

      vi.mocked(inventoryDb.searchBatches).mockResolvedValue(mockSearchResults);

      // Act
      const result = await caller.inventory.list({
        limit: 50,
        query: "Searched",
      });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(inventoryDb.searchBatches).toHaveBeenCalledWith(
        "Searched",
        50,
        undefined
      );
    });

    it("should filter batches by status", async () => {
      // Arrange
      const mockFilteredBatches = {
        items: [{ id: 1, status: "ACTIVE" }],
        hasMore: false,
        nextCursor: null,
      };

      vi.mocked(inventoryDb.getBatchesWithDetails).mockResolvedValue(
        mockFilteredBatches
      );

      // Act
      const result = await caller.inventory.list({
        limit: 50,
        status: "LIVE",
      });

      // Assert
      expect(result.items).toHaveLength(1);
      expect(inventoryDb.getBatchesWithDetails).toHaveBeenCalledWith(
        50,
        undefined,
        { status: "LIVE", category: undefined }
      );
    });
  });

  describe("dashboardStats", () => {
    it("should return dashboard statistics", async () => {
      // Arrange
      const mockStats = {
        totalBatches: 100,
        activeBatches: 75,
        totalValue: 50000,
        lowStockCount: 5,
      };

      vi.mocked(inventoryDb.getDashboardStats).mockResolvedValue(mockStats);

      // Act
      const result = await caller.inventory.dashboardStats();

      // Assert
      expect(result).toEqual(mockStats);
      expect(inventoryDb.getDashboardStats).toHaveBeenCalled();
    });

    it("should return default values if stats fetch returns null", async () => {
      // Arrange
      vi.mocked(inventoryDb.getDashboardStats).mockResolvedValue(null);

      // Act
      const result = await caller.inventory.dashboardStats();

      // Assert - Router now returns empty defaults instead of throwing
      expect(result.totalUnits).toBe(0);
      expect(result.totalInventoryValue).toBe(0);
    });
  });

  describe("getById", () => {
    it("should retrieve batch with locations and audit logs", async () => {
      // Arrange
      const mockBatch = {
        id: 1,
        code: "BATCH-001",
        productName: "Test Product",
        onHandQty: "100",
        reservedQty: "10",
      };

      const mockLocations = [
        { id: 1, location: "Warehouse A", quantity: "50" },
        { id: 2, location: "Warehouse B", quantity: "50" },
      ];

      const mockAuditLogs = [
        { id: 1, action: "CREATED", timestamp: new Date() },
      ];

      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(inventoryDb.getBatchLocations).mockResolvedValue(mockLocations);
      vi.mocked(inventoryDb.getAuditLogsForEntity).mockResolvedValue(
        mockAuditLogs
      );
      vi.mocked(inventoryUtils.calculateAvailableQty).mockReturnValue(90);

      // Act
      const result = await caller.inventory.getById(1);

      // Assert
      expect(result.batch).toEqual(mockBatch);
      expect(result.locations).toEqual(mockLocations);
      expect(result.auditLogs).toEqual(mockAuditLogs);
      expect(result.availableQty).toBe(90);
    });

    it("should throw error for non-existent batch", async () => {
      // Arrange
      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(null);

      // Act & Assert
      await expect(caller.inventory.getById(999)).rejects.toThrow();
    });
  });

  describe("intake", () => {
    it.skip("should create new batch from intake", async () => {
      // Note: This test is skipped because it uses dynamic imports which are hard to mock
      // The intake functionality is tested via E2E tests instead
    });
  });

  describe("updateStatus", () => {
    it.skip("should update batch status with audit log", async () => {
      // Arrange
      vi.clearAllMocks();
      const mockBatch = {
        id: 1,
        code: "BATCH-001",
        status: "LIVE",
      };

      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(inventoryUtils.isValidStatusTransition).mockReturnValue(true);
      vi.mocked(inventoryUtils.createAuditSnapshot).mockReturnValue({});
      vi.mocked(inventoryDb.updateBatchStatus).mockResolvedValue(undefined);
      vi.mocked(inventoryDb.createAuditLog).mockResolvedValue(undefined);

      // Act
      const result = await caller.inventory.updateStatus({
        id: 1,
        status: "SOLD",
        reason: "Sold to customer",
      });

      // Assert
      expect(result.success).toBe(true);
      expect(inventoryDb.updateBatchStatus).toHaveBeenCalledWith(1, "SOLD");
      expect(inventoryDb.createAuditLog).toHaveBeenCalled();
    });

    it("should reject invalid status transition", async () => {
      // Arrange
      const mockBatch = {
        id: 1,
        status: "SOLD",
      };

      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(inventoryUtils.isValidStatusTransition).mockReturnValue(false);

      // Act & Assert
      await expect(
        caller.inventory.updateStatus({
          id: 1,
          status: "ACTIVE",
          reason: "Invalid transition",
        })
      ).rejects.toThrow();
    });

    it("should throw error for non-existent batch", async () => {
      // Arrange
      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(null);

      // Act & Assert
      await expect(
        caller.inventory.updateStatus({
          id: 999,
          status: "SOLD",
          reason: "Test",
        })
      ).rejects.toThrow();
    });
  });

  describe("adjustQty", () => {
    it("should adjust batch quantity and create audit log", async () => {
      // Arrange
      const mockBatch = {
        id: 1,
        onHandQty: "100",
      };

      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(inventoryUtils.parseQty).mockReturnValue(100);
      vi.mocked(inventoryUtils.formatQty).mockReturnValue("110");
      vi.mocked(inventoryUtils.createAuditSnapshot).mockReturnValue({});
      vi.mocked(inventoryDb.updateBatchQty).mockResolvedValue(undefined);
      vi.mocked(inventoryDb.createAuditLog).mockResolvedValue(undefined);

      // Act
      const result = await caller.inventory.adjustQty({
        id: 1,
        field: "onHandQty",
        adjustment: 10,
        reason: "Found additional units",
      });

      // Assert
      expect(result.success).toBe(true);
      expect(inventoryDb.updateBatchQty).toHaveBeenCalledWith(
        1,
        "onHandQty",
        "110"
      );
      expect(inventoryDb.createAuditLog).toHaveBeenCalled();
    });

    it("should reject negative quantity adjustment", async () => {
      // Arrange
      const mockBatch = {
        id: 1,
        onHandQty: "10",
      };

      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(inventoryUtils.parseQty).mockReturnValue(10);

      // Act & Assert
      await expect(
        caller.inventory.adjustQty({
          id: 1,
          field: "onHandQty",
          adjustment: -20, // Would result in negative
          reason: "Test",
        })
      ).rejects.toThrow("Quantity cannot be negative");
    });

    it("should handle different quantity fields", async () => {
      // Arrange
      const mockBatch = {
        id: 1,
        reservedQty: "50",
      };

      vi.mocked(inventoryDb.getBatchById).mockResolvedValue(mockBatch);
      vi.mocked(inventoryUtils.parseQty).mockReturnValue(50);
      vi.mocked(inventoryUtils.formatQty).mockReturnValue("45");
      vi.mocked(inventoryUtils.createAuditSnapshot).mockReturnValue({});
      vi.mocked(inventoryDb.updateBatchQty).mockResolvedValue(undefined);
      vi.mocked(inventoryDb.createAuditLog).mockResolvedValue(undefined);

      // Act
      const result = await caller.inventory.adjustQty({
        id: 1,
        field: "reservedQty",
        adjustment: -5,
        reason: "Released reservation",
      });

      // Assert
      expect(result.success).toBe(true);
      expect(inventoryDb.updateBatchQty).toHaveBeenCalledWith(
        1,
        "reservedQty",
        "45"
      );
    });
  });

  describe("vendors", () => {
    it("should list all vendors when no query provided", async () => {
      // Arrange
      const mockVendors = [
        { id: 1, name: "Vendor A" },
        { id: 2, name: "Vendor B" },
      ];

      vi.mocked(inventoryDb.getAllVendors).mockResolvedValue(mockVendors);

      // Act
      const result = await caller.inventory.vendors({});

      // Assert - Now returns paginated response
      expect(result.items).toEqual(mockVendors);
      expect(inventoryDb.getAllVendors).toHaveBeenCalled();
    });

    it("should search vendors by query", async () => {
      // Arrange
      const mockSearchResults = [{ id: 1, name: "Vendor ABC" }];

      vi.mocked(inventoryDb.searchVendors).mockResolvedValue(mockSearchResults);

      // Act
      const result = await caller.inventory.vendors({ query: "ABC" });

      // Assert - Now returns paginated response
      expect(result.items).toEqual(mockSearchResults);
      expect(inventoryDb.searchVendors).toHaveBeenCalledWith("ABC");
    });
  });

  describe("brands", () => {
    it("should list all brands when no query provided", async () => {
      // Arrange
      const mockBrands = [
        { id: 1, name: "Brand A" },
        { id: 2, name: "Brand B" },
      ];

      vi.mocked(inventoryDb.getAllBrands).mockResolvedValue(mockBrands);

      // Act
      const result = await caller.inventory.brands({});

      // Assert - Now returns paginated response
      expect(result.items).toEqual(mockBrands);
      expect(inventoryDb.getAllBrands).toHaveBeenCalled();
    });

    it("should search brands by query", async () => {
      // Arrange
      const mockSearchResults = [{ id: 1, name: "Brand XYZ" }];

      vi.mocked(inventoryDb.searchBrands).mockResolvedValue(mockSearchResults);

      // Act
      const result = await caller.inventory.brands({ query: "XYZ" });

      // Assert - Now returns paginated response
      expect(result.items).toEqual(mockSearchResults);
      expect(inventoryDb.searchBrands).toHaveBeenCalledWith("XYZ");
    });
  });

  describe("seed", () => {
    it("should seed inventory data", async () => {
      // Arrange
      vi.mocked(inventoryDb.seedInventoryData).mockResolvedValue(undefined);

      // Act
      const result = await caller.inventory.seed();

      // Assert
      expect(result.success).toBe(true);
      expect(inventoryDb.seedInventoryData).toHaveBeenCalled();
    });
  });

  describe("Edge Cases and Error Handling", () => {
    it("should handle empty batch list", async () => {
      // Arrange
      vi.mocked(inventoryDb.getBatchesWithDetails).mockResolvedValue({
        items: [],
        hasMore: false,
        nextCursor: null,
      });

      // Act
      const result = await caller.inventory.list({ limit: 50 });

      // Assert
      expect(result.items).toHaveLength(0);
      expect(result.hasMore).toBe(false);
    });

    it("should handle cursor-based pagination", async () => {
      // Arrange
      const mockPage2 = {
        items: [{ id: 3, code: "BATCH-003" }],
        hasMore: false,
        nextCursor: null,
      };

      vi.mocked(inventoryDb.getBatchesWithDetails).mockResolvedValue(mockPage2);

      // Act
      const result = await caller.inventory.list({
        limit: 50,
        cursor: 123, // cursor is a number (batch ID), not a string
      });

      // Assert
      expect(result).toEqual(mockPage2);
      expect(inventoryDb.getBatchesWithDetails).toHaveBeenCalledWith(50, 123, {
        status: undefined,
        category: undefined,
      });
    });
  });
});