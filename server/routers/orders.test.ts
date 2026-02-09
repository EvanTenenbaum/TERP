import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the orders module
vi.mock("../ordersDb");

// Mock the soft delete utilities
vi.mock("../utils/softDelete", () => ({
  softDelete: vi.fn(),
  restoreDeleted: vi.fn(),
}));

import { appRouter } from "../routers";
import { createContext, isPublicDemoUser } from "../_core/context";
import * as ordersDb from "../ordersDb";
import { softDelete } from "../utils/softDelete";

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
    isPublicDemoUser: isPublicDemoUser(mockUser),
  });
};

describe("Orders Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("create", () => {
    it("should create a new quote order", async () => {
      // Arrange
      const input = {
        orderType: "QUOTE" as const,
        isDraft: false,
        clientId: 1,
        items: [
          {
            batchId: 1,
            displayName: "OG Kush - Premium",
            quantity: 10,
            unitPrice: 150,
            isSample: false,
          },
        ],
        validUntil: "2024-12-31",
        notes: "Test quote",
      };

      const mockOrder = {
        id: 1,
        orderNumber: "Q-2024-001",
        ...input,
        createdBy: 1,
        createdAt: new Date(),
      };

      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result).toEqual(mockOrder);
      expect(ordersDb.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: "QUOTE",
          clientId: 1,
          createdBy: 1,
        })
      );
    });

    it("should create a new sale order", async () => {
      // Arrange
      const input = {
        orderType: "SALE" as const,
        isDraft: false,
        clientId: 2,
        items: [
          {
            batchId: 2,
            quantity: 5,
            unitPrice: 120,
            isSample: false,
          },
        ],
        paymentTerms: "NET_30" as const,
        notes: "Test sale",
      };

      const mockOrder = {
        id: 2,
        orderNumber: "S-2024-001",
        ...input,
        createdBy: 1,
      };

      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.orderType).toBe("SALE");
      expect(result.paymentTerms).toBe("NET_30");
    });

    it("should create a draft order", async () => {
      // Arrange
      const input = {
        orderType: "QUOTE" as const,
        isDraft: true,
        clientId: 1,
        items: [
          {
            batchId: 1,
            quantity: 10,
            unitPrice: 150,
            isSample: false,
          },
        ],
      };

      const mockOrder = {
        id: 3,
        ...input,
        createdBy: 1,
      };

      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.isDraft).toBe(true);
    });

    it("should create order with sample items", async () => {
      // Arrange
      const input = {
        orderType: "QUOTE" as const,
        clientId: 1,
        items: [
          {
            batchId: 1,
            quantity: 1,
            unitPrice: 0,
            isSample: true,
          },
        ],
      };

      const mockOrder = {
        id: 4,
        ...input,
        createdBy: 1,
      };

      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.items[0].isSample).toBe(true);
    });
  });

  describe("getById", () => {
    it("should retrieve an order by ID", async () => {
      // Arrange
      const mockOrder = {
        id: 1,
        orderNumber: "Q-2024-001",
        orderType: "QUOTE",
        clientId: 1,
        items: [],
      };

      vi.mocked(ordersDb.getOrderById).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.getById({ id: 1 });

      // Assert
      expect(result).toEqual(mockOrder);
      expect(ordersDb.getOrderById).toHaveBeenCalledWith(1);
    });

    it("should throw NOT_FOUND error for non-existent order", async () => {
      // Arrange
      vi.mocked(ordersDb.getOrderById).mockResolvedValue(null);

      // Act & Assert - Router now throws TRPCError with NOT_FOUND code
      await expect(caller.orders.getById({ id: 999 })).rejects.toThrow(
        "Order with ID 999 not found"
      );
    });
  });

  describe("getByClient", () => {
    it("should retrieve all orders for a client", async () => {
      // Arrange
      const mockOrders = [
        { id: 1, orderType: "QUOTE", clientId: 1 },
        { id: 2, orderType: "SALE", clientId: 1 },
      ];

      vi.mocked(ordersDb.getOrdersByClient).mockResolvedValue(mockOrders);

      // Act
      const result = await caller.orders.getByClient({ clientId: 1 });

      // Assert
      expect(result).toHaveLength(2);
      expect(ordersDb.getOrdersByClient).toHaveBeenCalledWith(1, undefined);
    });

    it("should filter by order type", async () => {
      // Arrange
      const mockOrders = [{ id: 1, orderType: "QUOTE", clientId: 1 }];

      vi.mocked(ordersDb.getOrdersByClient).mockResolvedValue(mockOrders);

      // Act
      const result = await caller.orders.getByClient({
        clientId: 1,
        orderType: "QUOTE",
      });

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].orderType).toBe("QUOTE");
    });
  });

  describe("getAll", () => {
    it("should retrieve all orders", async () => {
      // Arrange
      const mockOrders = [
        { id: 1, orderType: "QUOTE" },
        { id: 2, orderType: "SALE" },
      ];

      vi.mocked(ordersDb.getAllOrders).mockResolvedValue(mockOrders);

      // Act
      const result = await caller.orders.getAll();

      // Assert - Now returns paginated response
      expect(result.items).toHaveLength(2);
      expect(ordersDb.getAllOrders).toHaveBeenCalled();
    });

    it("should filter by order type", async () => {
      // Arrange
      const mockOrders = [{ id: 1, orderType: "QUOTE" }];

      vi.mocked(ordersDb.getAllOrders).mockResolvedValue(mockOrders);

      // Act
      const result = await caller.orders.getAll({ orderType: "QUOTE" });

      // Assert - Now returns paginated response
      expect(result.items).toHaveLength(1);
    });

    it("should filter by draft status", async () => {
      // Arrange
      const mockOrders = [{ id: 1, isDraft: true }];

      vi.mocked(ordersDb.getAllOrders).mockResolvedValue(mockOrders);

      // Act
      const result = await caller.orders.getAll({ isDraft: true });

      // Assert - Now returns paginated response
      expect(result.items[0].isDraft).toBe(true);
    });

    it("should support pagination", async () => {
      // Arrange
      const mockOrders = [{ id: 11, orderType: "SALE" }];

      vi.mocked(ordersDb.getAllOrders).mockResolvedValue(mockOrders);

      // Act
      await caller.orders.getAll({ limit: 10, offset: 10 });

      // Assert
      expect(ordersDb.getAllOrders).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 10, offset: 10 })
      );
    });

    it("should pass placeholder status filters through to db normalization", async () => {
      vi.mocked(ordersDb.getAllOrders).mockResolvedValue([]);

      await caller.orders.getAll({
        isDraft: false,
        fulfillmentStatus: "undefined",
        quoteStatus: "all",
      });

      expect(ordersDb.getAllOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          isDraft: false,
          fulfillmentStatus: "undefined",
          quoteStatus: "all",
        })
      );
    });

    it("should forward status filters for db-side normalization", async () => {
      vi.mocked(ordersDb.getAllOrders).mockResolvedValue([]);

      await caller.orders.getAll({
        fulfillmentStatus: "shipped" as unknown as string,
      });

      expect(ordersDb.getAllOrders).toHaveBeenCalledWith(
        expect.objectContaining({
          fulfillmentStatus: "shipped",
        })
      );
    });
  });

  describe("update", () => {
    it("should update order notes", async () => {
      // Arrange
      const input = {
        id: 1,
        notes: "Updated notes",
      };

      const mockUpdatedOrder = {
        id: 1,
        notes: "Updated notes",
      };

      vi.mocked(ordersDb.updateOrder).mockResolvedValue(mockUpdatedOrder);

      // Act
      const result = await caller.orders.update(input);

      // Assert
      expect(result.notes).toBe("Updated notes");
      // ST-026: updateOrder now takes (id, updates, version) for optimistic locking
      expect(ordersDb.updateOrder).toHaveBeenCalledWith(
        1,
        { notes: "Updated notes" },
        undefined
      );
    });

    it("should update validUntil date", async () => {
      // Arrange
      const input = {
        id: 1,
        validUntil: "2024-12-31",
      };

      const mockUpdatedOrder = {
        id: 1,
        validUntil: "2024-12-31",
      };

      vi.mocked(ordersDb.updateOrder).mockResolvedValue(mockUpdatedOrder);

      // Act
      const result = await caller.orders.update(input);

      // Assert
      expect(result.validUntil).toBe("2024-12-31");
    });
  });

  describe("delete", () => {
    it("should soft delete an order", async () => {
      // Arrange
      // Mock softDelete to return 1 affected row
      vi.mocked(softDelete).mockResolvedValue(1);

      // Act
      const result = await caller.orders.delete({ id: 1 });

      // Assert
      expect(result.success).toBe(true);
      expect(softDelete).toHaveBeenCalledWith(expect.anything(), 1);
    });
  });

  describe("convertToSale", () => {
    it("should convert quote to sale", async () => {
      // Arrange
      const input = {
        quoteId: 1,
        paymentTerms: "NET_30" as const,
        notes: "Converted to sale",
      };

      const mockSaleOrder = {
        id: 2,
        orderType: "SALE",
        paymentTerms: "NET_30",
        notes: "Converted to sale",
      };

      vi.mocked(ordersDb.convertQuoteToSale).mockResolvedValue(mockSaleOrder);

      // Act
      const result = await caller.orders.convertToSale(input);

      // Assert
      expect(result.orderType).toBe("SALE");
      expect(result.paymentTerms).toBe("NET_30");
      expect(ordersDb.convertQuoteToSale).toHaveBeenCalledWith(input);
    });

    it("should convert with cash payment", async () => {
      // Arrange
      const input = {
        quoteId: 1,
        paymentTerms: "PARTIAL" as const,
        cashPayment: 500,
      };

      const mockSaleOrder = {
        id: 2,
        orderType: "SALE",
        paymentTerms: "PARTIAL",
        cashPayment: 500,
      };

      vi.mocked(ordersDb.convertQuoteToSale).mockResolvedValue(mockSaleOrder);

      // Act
      const result = await caller.orders.convertToSale(input);

      // Assert
      expect(result.cashPayment).toBe(500);
    });
  });

  describe("confirmDraftOrder", () => {
    it("should confirm a draft order", async () => {
      // Arrange
      const input = {
        orderId: 1,
        paymentTerms: "NET_30" as const,
        notes: "Confirmed",
      };

      const mockConfirmedOrder = {
        id: 1,
        isDraft: false,
        paymentTerms: "NET_30",
        confirmedBy: 1,
      };

      vi.mocked(ordersDb.confirmDraftOrder).mockResolvedValue(
        mockConfirmedOrder
      );

      // Act
      const result = await caller.orders.confirmDraftOrder(input);

      // Assert
      expect(result.isDraft).toBe(false);
      expect(ordersDb.confirmDraftOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 1,
          confirmedBy: 1,
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty items array", async () => {
      // Arrange
      const input = {
        orderType: "QUOTE" as const,
        clientId: 1,
        items: [],
      };

      const mockOrder = {
        id: 1,
        ...input,
        createdBy: 1,
      };

      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.items).toHaveLength(0);
    });

    it("should handle orders with override prices", async () => {
      // Arrange
      const input = {
        orderType: "QUOTE" as const,
        clientId: 1,
        items: [
          {
            batchId: 1,
            quantity: 10,
            unitPrice: 150,
            isSample: false,
            overridePrice: 140,
          },
        ],
      };

      const mockOrder = {
        id: 1,
        ...input,
        createdBy: 1,
      };

      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.items[0].overridePrice).toBe(140);
    });

    it("should handle COD payment terms", async () => {
      // Arrange
      const input = {
        orderType: "SALE" as const,
        clientId: 1,
        items: [
          {
            batchId: 1,
            quantity: 10,
            unitPrice: 150,
            isSample: false,
          },
        ],
        paymentTerms: "COD" as const,
      };

      const mockOrder = {
        id: 1,
        ...input,
        createdBy: 1,
      };

      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockOrder);

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.paymentTerms).toBe("COD");
    });
  });
});
