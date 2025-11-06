/**
 * Integration Tests for Orders Router
 *
 * Tests all tRPC procedures in the orders router using the light scenario data.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";

const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

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

describe("Orders Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;
  let testClientId: number;
  let testBatchId: number;
  let testQuoteId: number;
  let testSaleId: number;

  beforeAll(async () => {
    caller = createCaller();

    // Get a test client from seeded data
    const clients = await caller.clients.list({ limit: 1 });
    testClientId = clients[0].id;

    // Get a test batch from seeded inventory
    const inventory = await caller.inventory.list({ limit: 1 });
    testBatchId = inventory[0].id;
  });

  describe("create", () => {
    it("should create a quote", async () => {
      // Arrange
      const input = {
        orderType: "QUOTE" as const,
        clientId: testClientId,
        items: [
          {
            batchId: testBatchId,
            quantity: 10,
            unitPrice: 50.0,
            isSample: false,
          },
        ],
        validUntil: "2024-12-31",
        notes: "Test quote",
      };

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderType).toBe("QUOTE");
      expect(result.clientId).toBe(testClientId);
      expect(result.items).toHaveLength(1);
      expect(result.totalAmount).toBe(500.0); // 10 * 50

      testQuoteId = result.id;
    });

    it("should create a sale order", async () => {
      // Arrange
      const input = {
        orderType: "SALE" as const,
        clientId: testClientId,
        items: [
          {
            batchId: testBatchId,
            quantity: 5,
            unitPrice: 60.0,
            isSample: false,
          },
        ],
        paymentTerms: "NET_30" as const,
        notes: "Test sale",
      };

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderType).toBe("SALE");
      expect(result.paymentTerms).toBe("NET_30");
      expect(result.totalAmount).toBe(300.0); // 5 * 60

      testSaleId = result.id;
    });

    it("should create a draft order", async () => {
      // Arrange
      const input = {
        orderType: "SALE" as const,
        isDraft: true,
        clientId: testClientId,
        items: [
          {
            batchId: testBatchId,
            quantity: 3,
            unitPrice: 40.0,
            isSample: false,
          },
        ],
      };

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.isDraft).toBe(true);
      expect(result.totalAmount).toBe(120.0); // 3 * 40
    });

    it("should handle sample items correctly", async () => {
      // Arrange
      const input = {
        orderType: "SALE" as const,
        clientId: testClientId,
        items: [
          {
            batchId: testBatchId,
            quantity: 1,
            unitPrice: 0,
            isSample: true,
          },
        ],
        paymentTerms: "COD" as const,
      };

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.items[0].isSample).toBe(true);
      expect(result.totalAmount).toBe(0); // Samples are free
    });
  });

  describe("getById", () => {
    it("should retrieve an order by ID", async () => {
      // Arrange
      const input = { id: testQuoteId };

      // Act
      const result = await caller.orders.getById(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.id).toBe(testQuoteId);
      expect(result.orderType).toBe("QUOTE");
    });

    it("should return null for non-existent order", async () => {
      // Arrange
      const input = { id: 999999 };

      // Act
      const result = await caller.orders.getById(input);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe("getByClient", () => {
    it("should retrieve all orders for a client", async () => {
      // Arrange
      const input = { clientId: testClientId };

      // Act
      const result = await caller.orders.getByClient(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      result.forEach(order => {
        expect(order.clientId).toBe(testClientId);
      });
    });

    it("should filter orders by type", async () => {
      // Arrange
      const input = {
        clientId: testClientId,
        orderType: "QUOTE" as const,
      };

      // Act
      const result = await caller.orders.getByClient(input);

      // Assert
      expect(result).toBeDefined();
      result.forEach(order => {
        expect(order.orderType).toBe("QUOTE");
      });
    });
  });

  describe("getAll", () => {
    it("should retrieve all orders", async () => {
      // Arrange
      const input = {};

      // Act
      const result = await caller.orders.getAll(input);

      // Assert
      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it("should filter by order type", async () => {
      // Arrange
      const input = { orderType: "SALE" as const };

      // Act
      const result = await caller.orders.getAll(input);

      // Assert
      expect(result).toBeDefined();
      result.forEach(order => {
        expect(order.orderType).toBe("SALE");
      });
    });

    it("should respect pagination", async () => {
      // Arrange
      const input = { limit: 5, offset: 0 };

      // Act
      const result = await caller.orders.getAll(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.length).toBeLessThanOrEqual(5);
    });
  });

  describe("update", () => {
    it("should update order notes", async () => {
      // Arrange
      const input = {
        id: testQuoteId,
        notes: "Updated test notes",
      };

      // Act
      const result = await caller.orders.update(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.notes).toBe("Updated test notes");
    });

    it("should update validUntil date", async () => {
      // Arrange
      const input = {
        id: testQuoteId,
        validUntil: "2025-12-31",
      };

      // Act
      const result = await caller.orders.update(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.validUntil).toBe("2025-12-31");
    });
  });

  describe("convertToSale", () => {
    it("should convert a quote to a sale", async () => {
      // Arrange
      const input = {
        quoteId: testQuoteId,
        paymentTerms: "NET_15" as const,
        notes: "Converted from quote",
      };

      // Act
      const result = await caller.orders.convertToSale(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.orderType).toBe("SALE");
      expect(result.paymentTerms).toBe("NET_15");
      expect(result.totalAmount).toBe(500.0); // Same as original quote
    });
  });

  describe("confirmDraftOrder", () => {
    it("should confirm a draft order", async () => {
      // Arrange
      // First create a draft
      const draft = await caller.orders.create({
        orderType: "SALE" as const,
        isDraft: true,
        clientId: testClientId,
        items: [
          {
            batchId: testBatchId,
            quantity: 2,
            unitPrice: 75.0,
            isSample: false,
          },
        ],
      });

      const input = {
        orderId: draft.id,
        paymentTerms: "NET_7" as const,
        notes: "Confirmed draft order",
      };

      // Act
      const result = await caller.orders.confirmDraftOrder(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.isDraft).toBe(false);
      expect(result.paymentTerms).toBe("NET_7");
    });
  });

  describe("delete", () => {
    it("should delete an order", async () => {
      // Arrange
      const input = { id: testSaleId };

      // Act
      const result = await caller.orders.delete(input);

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);

      // Verify order is deleted
      const deletedOrder = await caller.orders.getById({ id: testSaleId });
      expect(deletedOrder).toBeNull();
    });
  });

  describe("business logic", () => {
    it("should calculate total amount correctly with multiple items", async () => {
      // Arrange
      const input = {
        orderType: "SALE" as const,
        clientId: testClientId,
        items: [
          {
            batchId: testBatchId,
            quantity: 10,
            unitPrice: 50.0,
            isSample: false,
          },
          {
            batchId: testBatchId,
            quantity: 5,
            unitPrice: 60.0,
            isSample: false,
          },
        ],
        paymentTerms: "NET_30" as const,
      };

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.totalAmount).toBe(800.0); // (10 * 50) + (5 * 60)
    });

    it("should handle price overrides correctly", async () => {
      // Arrange
      const input = {
        orderType: "SALE" as const,
        clientId: testClientId,
        items: [
          {
            batchId: testBatchId,
            quantity: 10,
            unitPrice: 50.0,
            overridePrice: 45.0, // Discounted price
            isSample: false,
          },
        ],
        paymentTerms: "NET_30" as const,
      };

      // Act
      const result = await caller.orders.create(input);

      // Assert
      expect(result.totalAmount).toBe(450.0); // 10 * 45 (override price)
    });
  });
});
