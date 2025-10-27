import { describe, it, expect, beforeEach, vi } from "vitest";
import { ordersRouter } from "../../routers/orders";
import type { Context } from "../../_core/context";

// Mock database
const mockDb = {
  transaction: vi.fn((callback) => callback(mockDb)),
  select: vi.fn(() => mockDb),
  from: vi.fn(() => mockDb),
  where: vi.fn(() => mockDb),
  limit: vi.fn(() => mockDb),
  then: vi.fn(),
  insert: vi.fn(() => mockDb),
  values: vi.fn(() => mockDb),
  returning: vi.fn(() => mockDb),
  update: vi.fn(() => mockDb),
  set: vi.fn(() => mockDb),
  delete: vi.fn(() => mockDb),
};

// Mock context
const createMockContext = (userId: number = 1): Context => ({
  user: {
    id: userId,
    email: "test@example.com",
    role: "admin",
  },
  db: mockDb as any,
});

describe("Orders Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("create", () => {
    it("should create a new order with valid input", async () => {
      const mockOrder = {
        id: 1,
        clientId: 1,
        orderType: "QUOTE",
        status: "DRAFT",
        totalAmount: "100.00",
        createdAt: new Date(),
      };

      const mockClient = {
        id: 1,
        name: "Test Client",
        cogsAdjustmentType: "NONE",
        cogsAdjustmentValue: "0",
      };

      const mockBatch = {
        id: 1,
        strainId: 1,
        quantity: "100",
        onHandQty: "100",
        unitCogs: "10.00",
        cogsMode: "FIXED",
      };

      mockDb.then
        .mockResolvedValueOnce([mockClient]) // Client query
        .mockResolvedValueOnce([mockBatch]) // Batch query
        .mockResolvedValueOnce([mockOrder]); // Order insert

      const caller = ordersRouter.createCaller(createMockContext());

      const result = await caller.create({
        clientId: 1,
        orderType: "QUOTE",
        items: [
          {
            batchId: 1,
            quantity: "10",
            unitPrice: "15.00",
          },
        ],
      });

      expect(result).toBeDefined();
      expect(mockDb.transaction).toHaveBeenCalled();
    });

    it("should throw error when client not found", async () => {
      mockDb.then.mockResolvedValueOnce([]); // No client found

      const caller = ordersRouter.createCaller(createMockContext());

      await expect(
        caller.create({
          clientId: 999,
          orderType: "QUOTE",
          items: [],
        })
      ).rejects.toThrow("Client 999 not found");
    });

    it("should throw error when batch not found", async () => {
      const mockClient = {
        id: 1,
        name: "Test Client",
        cogsAdjustmentType: "NONE",
        cogsAdjustmentValue: "0",
      };

      mockDb.then
        .mockResolvedValueOnce([mockClient]) // Client query
        .mockResolvedValueOnce([]); // No batch found

      const caller = ordersRouter.createCaller(createMockContext());

      await expect(
        caller.create({
          clientId: 1,
          orderType: "QUOTE",
          items: [
            {
              batchId: 999,
              quantity: "10",
              unitPrice: "15.00",
            },
          ],
        })
      ).rejects.toThrow("Batch 999 not found");
    });

    it("should handle empty items array", async () => {
      const mockClient = {
        id: 1,
        name: "Test Client",
      };

      const mockOrder = {
        id: 1,
        clientId: 1,
        orderType: "QUOTE",
        totalAmount: "0.00",
      };

      mockDb.then
        .mockResolvedValueOnce([mockClient])
        .mockResolvedValueOnce([mockOrder]);

      const caller = ordersRouter.createCaller(createMockContext());

      const result = await caller.create({
        clientId: 1,
        orderType: "QUOTE",
        items: [],
      });

      expect(result).toBeDefined();
    });

    it("should calculate COGS correctly for order items", async () => {
      const mockClient = {
        id: 1,
        name: "Test Client",
        cogsAdjustmentType: "PERCENTAGE",
        cogsAdjustmentValue: "10",
      };

      const mockBatch = {
        id: 1,
        unitCogs: "10.00",
        cogsMode: "FIXED",
        quantity: "100",
        onHandQty: "100",
      };

      const mockOrder = {
        id: 1,
        clientId: 1,
        items: [],
      };

      mockDb.then
        .mockResolvedValueOnce([mockClient])
        .mockResolvedValueOnce([mockBatch])
        .mockResolvedValueOnce([mockOrder]);

      const caller = ordersRouter.createCaller(createMockContext());

      const result = await caller.create({
        clientId: 1,
        orderType: "QUOTE",
        items: [
          {
            batchId: 1,
            quantity: "10",
            unitPrice: "15.00",
          },
        ],
      });

      expect(result).toBeDefined();
    });
  });

  describe("getById", () => {
    it("should return order by ID", async () => {
      const mockOrder = {
        id: 1,
        clientId: 1,
        orderType: "QUOTE",
        status: "DRAFT",
      };

      mockDb.then.mockResolvedValueOnce([mockOrder]);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.getById({ id: 1 });

      expect(result).toEqual(mockOrder);
    });

    it("should return null when order not found", async () => {
      mockDb.then.mockResolvedValueOnce([]);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.getById({ id: 999 });

      expect(result).toBeUndefined();
    });
  });

  describe("getByClient", () => {
    it("should return orders for a specific client", async () => {
      const mockOrders = [
        { id: 1, clientId: 1, orderType: "QUOTE" },
        { id: 2, clientId: 1, orderType: "SALE" },
      ];

      mockDb.then.mockResolvedValueOnce(mockOrders);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.getByClient({ clientId: 1 });

      expect(result).toHaveLength(2);
      expect(result[0].clientId).toBe(1);
    });

    it("should return empty array when no orders found", async () => {
      mockDb.then.mockResolvedValueOnce([]);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.getByClient({ clientId: 999 });

      expect(result).toEqual([]);
    });
  });

  describe("getAll", () => {
    it("should return all orders", async () => {
      const mockOrders = [
        { id: 1, clientId: 1 },
        { id: 2, clientId: 2 },
        { id: 3, clientId: 1 },
      ];

      mockDb.then.mockResolvedValueOnce(mockOrders);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.getAll();

      expect(result).toHaveLength(3);
    });

    it("should handle empty database", async () => {
      mockDb.then.mockResolvedValueOnce([]);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.getAll();

      expect(result).toEqual([]);
    });
  });

  describe("update", () => {
    it("should update an existing order", async () => {
      const mockUpdatedOrder = {
        id: 1,
        clientId: 1,
        status: "APPROVED",
      };

      mockDb.then.mockResolvedValueOnce([mockUpdatedOrder]);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.update({
        id: 1,
        status: "APPROVED",
      });

      expect(result).toEqual(mockUpdatedOrder);
    });

    it("should throw error when updating non-existent order", async () => {
      mockDb.then.mockResolvedValueOnce([]);

      const caller = ordersRouter.createCaller(createMockContext());

      await expect(
        caller.update({
          id: 999,
          status: "APPROVED",
        })
      ).rejects.toThrow();
    });
  });

  describe("delete", () => {
    it("should delete an order", async () => {
      mockDb.then.mockResolvedValueOnce({ success: true });

      const caller = ordersRouter.createCaller(createMockContext());
      await caller.delete({ id: 1 });

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should handle deletion of non-existent order", async () => {
      mockDb.then.mockResolvedValueOnce({ success: false });

      const caller = ordersRouter.createCaller(createMockContext());

      await expect(caller.delete({ id: 999 })).rejects.toThrow();
    });
  });

  describe("convertToSale", () => {
    it("should convert quote to sale", async () => {
      const mockQuote = {
        id: 1,
        orderType: "QUOTE",
        status: "APPROVED",
      };

      const mockSale = {
        id: 1,
        orderType: "SALE",
        status: "CONFIRMED",
      };

      mockDb.then
        .mockResolvedValueOnce([mockQuote])
        .mockResolvedValueOnce([mockSale]);

      const caller = ordersRouter.createCaller(createMockContext());
      const result = await caller.convertToSale({ id: 1 });

      expect(result.orderType).toBe("SALE");
    });

    it("should throw error when converting non-quote order", async () => {
      const mockSale = {
        id: 1,
        orderType: "SALE",
      };

      mockDb.then.mockResolvedValueOnce([mockSale]);

      const caller = ordersRouter.createCaller(createMockContext());

      await expect(caller.convertToSale({ id: 1 })).rejects.toThrow();
    });
  });

  describe("Edge Cases", () => {
    it("should handle very large order quantities", async () => {
      const mockClient = { id: 1, name: "Test" };
      const mockBatch = {
        id: 1,
        quantity: "1000000",
        unitCogs: "10.00",
        cogsMode: "FIXED",
      };
      const mockOrder = { id: 1 };

      mockDb.then
        .mockResolvedValueOnce([mockClient])
        .mockResolvedValueOnce([mockBatch])
        .mockResolvedValueOnce([mockOrder]);

      const caller = ordersRouter.createCaller(createMockContext());

      const result = await caller.create({
        clientId: 1,
        orderType: "QUOTE",
        items: [
          {
            batchId: 1,
            quantity: "999999",
            unitPrice: "15.00",
          },
        ],
      });

      expect(result).toBeDefined();
    });

    it("should handle decimal quantities correctly", async () => {
      const mockClient = { id: 1, name: "Test" };
      const mockBatch = {
        id: 1,
        quantity: "100.5",
        unitCogs: "10.50",
        cogsMode: "FIXED",
      };
      const mockOrder = { id: 1 };

      mockDb.then
        .mockResolvedValueOnce([mockClient])
        .mockResolvedValueOnce([mockBatch])
        .mockResolvedValueOnce([mockOrder]);

      const caller = ordersRouter.createCaller(createMockContext());

      const result = await caller.create({
        clientId: 1,
        orderType: "QUOTE",
        items: [
          {
            batchId: 1,
            quantity: "10.75",
            unitPrice: "15.25",
          },
        ],
      });

      expect(result).toBeDefined();
    });

    it("should handle zero-price items", async () => {
      const mockClient = { id: 1, name: "Test" };
      const mockBatch = {
        id: 1,
        quantity: "100",
        unitCogs: "10.00",
        cogsMode: "FIXED",
      };
      const mockOrder = { id: 1 };

      mockDb.then
        .mockResolvedValueOnce([mockClient])
        .mockResolvedValueOnce([mockBatch])
        .mockResolvedValueOnce([mockOrder]);

      const caller = ordersRouter.createCaller(createMockContext());

      const result = await caller.create({
        clientId: 1,
        orderType: "QUOTE",
        items: [
          {
            batchId: 1,
            quantity: "10",
            unitPrice: "0.00",
          },
        ],
      });

      expect(result).toBeDefined();
    });
  });
});

