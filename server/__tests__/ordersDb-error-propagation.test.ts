/**
 * ST-050: Error Propagation Tests
 * Verifies that errors in ordersDb functions properly propagate
 * instead of being silently swallowed
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as ordersDb from "../ordersDb";
import { getDb } from "../db";

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("ST-050: Error Propagation in ordersDb", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getOrderById - JSON parsing errors", () => {
    it("should throw error when order items JSON is corrupted", async () => {
      // Mock DB to return order with invalid JSON
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([
          {
            id: 123,
            orderNumber: "O-123",
            items: "{invalid json", // Corrupted JSON
            subtotal: "100",
            total: "100",
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Should throw error, not return empty items array
      await expect(ordersDb.getOrderById(123)).rejects.toThrow(
        /Data corruption detected.*order 123/
      );
    });

    it("should successfully parse valid JSON", async () => {
      const validItems = [
        {
          batchId: 1,
          displayName: "Test Product",
          quantity: 10,
          unitPrice: 5,
          lineTotal: 50,
        },
      ];

      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([
          {
            id: 123,
            orderNumber: "O-123",
            items: JSON.stringify(validItems),
            subtotal: "50",
            total: "50",
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const result = await ordersDb.getOrderById(123);
      expect(result).toBeDefined();
      expect(result?.items).toEqual(validItems);
    });
  });

  describe("getOrdersByClient - JSON parsing errors", () => {
    it("should throw error when any order has corrupted JSON", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          {
            id: 1,
            orderNumber: "O-1",
            items: JSON.stringify([{ batchId: 1, quantity: 5 }]),
            subtotal: "50",
          },
          {
            id: 2,
            orderNumber: "O-2",
            items: "{corrupted", // Corrupted JSON
            subtotal: "100",
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Should throw when encountering corrupted data
      await expect(ordersDb.getOrdersByClient(1)).rejects.toThrow(
        /Data corruption detected.*order 2/
      );
    });
  });

  describe("getAllOrders - JSON parsing errors", () => {
    it("should throw error when any order has corrupted JSON", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        leftJoin: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        offset: vi.fn().mockResolvedValue([
          {
            orders: {
              id: 1,
              orderNumber: "O-1",
              items: '{"invalid": json}', // Invalid JSON
              subtotal: "50",
            },
            clients: { id: 1, name: "Test Client" },
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      // Should throw when encountering corrupted data
      await expect(ordersDb.getAllOrders()).rejects.toThrow(
        /Data corruption detected.*order 1/
      );
    });
  });

  describe("Error message format", () => {
    it("should include order ID and helpful context in error message", async () => {
      const mockDb = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockResolvedValue([
          {
            id: 999,
            orderNumber: "O-999",
            items: "not valid json",
            subtotal: "100",
          },
        ]),
      };

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      try {
        await ordersDb.getOrderById(999);
        expect.fail("Should have thrown error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const errorMessage = (error as Error).message;
        // Verify error message contains helpful information
        expect(errorMessage).toMatch(/Data corruption detected/);
        expect(errorMessage).toMatch(/order 999/);
        expect(errorMessage).toMatch(/data remediation/);
      }
    });
  });
});
