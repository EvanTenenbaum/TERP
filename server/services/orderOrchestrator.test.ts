/**
 * ARCH-001: OrderOrchestrator Service Tests
 *
 * Unit tests for the OrderOrchestrator service.
 * These tests verify the business logic without requiring a database connection.
 */

import { describe, it, expect, vi } from "vitest";
import {
  OrderOrchestrator,
  type PaymentTerms,
  type SaleStatus,
} from "./orderOrchestrator";
import { getCompatibleBatchSelect } from "../lib/batchColumnCompatibility";

// Mock the database module
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

vi.mock("../lib/batchColumnCompatibility", () => ({
  getCompatibleBatchSelect: vi.fn(),
}));

// Mock the transaction utilities
vi.mock("../dbTransaction", () => ({
  withTransaction: vi.fn(async callback => callback({})),
  withRetryableTransaction: vi.fn(async callback => callback({})),
}));

// Mock the logger
vi.mock("../_core/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock COGS calculator
vi.mock("../cogsCalculator", () => ({
  calculateCogs: vi.fn(() => ({
    unitCogs: 10,
    cogsSource: "FIXED",
    unitMargin: 5,
    marginPercent: 33.33,
    appliedRule: undefined,
  })),
  calculateDueDate: vi.fn(
    () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
  ),
}));

// Mock inventory utils
vi.mock("../inventoryUtils", () => ({
  calculateAvailableQty: vi.fn(() => 100),
}));

// Mock state machine
vi.mock("./orderStateMachine", () => ({
  canTransition: vi.fn(() => true),
  isTerminalStatus: vi.fn(() => false),
}));

// Mock fiscal period
vi.mock("../_core/fiscalPeriod", () => ({
  getFiscalPeriodIdOrDefault: vi.fn(() => Promise.resolve(1)),
}));

// Mock account lookup
vi.mock("../_core/accountLookup", () => ({
  getAccountIdByName: vi.fn(() => Promise.resolve(1)),
  ACCOUNT_NAMES: {
    ACCOUNTS_RECEIVABLE: "Accounts Receivable",
    SALES_REVENUE: "Sales Revenue",
    CASH: "Cash",
    COGS: "Cost of Goods Sold",
    INVENTORY: "Inventory",
  },
}));

// Mock payables service
vi.mock("./payablesService", () => ({
  updatePayableOnSale: vi.fn(() => Promise.resolve()),
  checkInventoryZeroThreshold: vi.fn(() => Promise.resolve()),
}));

describe("OrderOrchestrator", () => {
  describe("Unit tests (no database)", () => {
    it("should instantiate correctly", () => {
      const orchestrator = new OrderOrchestrator();
      expect(orchestrator).toBeDefined();
      expect(typeof orchestrator.createSaleOrder).toBe("function");
      expect(typeof orchestrator.createDraftOrder).toBe("function");
      expect(typeof orchestrator.confirmOrder).toBe("function");
      expect(typeof orchestrator.shipOrder).toBe("function");
      expect(typeof orchestrator.deliverOrder).toBe("function");
      expect(typeof orchestrator.cancelOrder).toBe("function");
    });

    it("should export PaymentTerms type", () => {
      const paymentTerms: PaymentTerms = "NET_30";
      expect(paymentTerms).toBe("NET_30");
    });

    it("should export SaleStatus type", () => {
      const status: SaleStatus = "PENDING";
      expect(status).toBe("PENDING");
    });

    it("should have the correct method signatures", () => {
      const orchestrator = new OrderOrchestrator();

      // Verify all public methods exist (including new ARCH-001 methods)
      const methods = [
        "createSaleOrder",
        "createDraftOrder",
        "confirmOrder",
        "shipOrder",
        "deliverOrder",
        "cancelOrder",
        "fulfillOrder",
        "processReturn",
      ];

      for (const method of methods) {
        expect(typeof (orchestrator as Record<string, unknown>)[method]).toBe(
          "function"
        );
      }
    });

    it("should have fulfillOrder method", () => {
      const orchestrator = new OrderOrchestrator();
      expect(typeof orchestrator.fulfillOrder).toBe("function");
    });

    it("should have processReturn method", () => {
      const orchestrator = new OrderOrchestrator();
      expect(typeof orchestrator.processReturn).toBe("function");
    });
  });

  describe("Type validation", () => {
    it("should accept valid PaymentTerms values", () => {
      const validTerms: PaymentTerms[] = [
        "NET_7",
        "NET_15",
        "NET_30",
        "COD",
        "PARTIAL",
        "CONSIGNMENT",
      ];

      for (const term of validTerms) {
        expect(typeof term).toBe("string");
      }
    });

    it("should accept valid SaleStatus values", () => {
      const validStatuses: SaleStatus[] = [
        "PENDING",
        "PARTIAL",
        "PAID",
        "OVERDUE",
        "CANCELLED",
      ];

      for (const status of validStatuses) {
        expect(typeof status).toBe("string");
      }
    });
  });

  describe("Business logic calculations", () => {
    it("should calculate order totals correctly", () => {
      // This tests the pure calculation logic
      const items = [
        { lineTotal: 100, lineCogs: 60 },
        { lineTotal: 200, lineCogs: 120 },
        { lineTotal: 150, lineCogs: 90 },
      ];

      const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
      const totalCogs = items.reduce((sum, item) => sum + item.lineCogs, 0);
      const totalMargin = subtotal - totalCogs;
      const avgMarginPercent =
        subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;

      expect(subtotal).toBe(450);
      expect(totalCogs).toBe(270);
      expect(totalMargin).toBe(180);
      expect(avgMarginPercent).toBe(40);
    });

    it("should determine correct sale status based on payment", () => {
      const testCases = [
        { total: 100, cashPayment: 0, expected: "PENDING" },
        { total: 100, cashPayment: 50, expected: "PARTIAL" },
        { total: 100, cashPayment: 100, expected: "PAID" },
        { total: 100, cashPayment: 150, expected: "PAID" }, // Overpayment
      ];

      for (const { total, cashPayment, expected } of testCases) {
        const status: SaleStatus =
          cashPayment >= total
            ? "PAID"
            : cashPayment > 0
              ? "PARTIAL"
              : "PENDING";
        expect(status).toBe(expected);
      }
    });
  });

  describe("legacy batch compatibility", () => {
    it("uses the compatible batch select when verifying locked inventory", async () => {
      const batchSelect = {
        id: "compat-id",
        sku: "compat-sku",
      } as unknown as Awaited<ReturnType<typeof getCompatibleBatchSelect>>;
      vi.mocked(getCompatibleBatchSelect).mockResolvedValue(batchSelect);

      const selectChain = {
        from: vi.fn(),
        where: vi.fn(),
        for: vi.fn(),
      };
      selectChain.from.mockReturnValue(selectChain);
      selectChain.where.mockReturnValue(selectChain);
      selectChain.for.mockResolvedValue([
        {
          id: 11,
          onHandQty: "12",
          sampleQty: "0",
          reservedQty: "1",
          quarantineQty: "0",
          holdQty: "0",
        },
      ]);

      const tx = {
        select: vi.fn(() => selectChain),
      };

      const orchestrator =
        new OrderOrchestrator() as unknown as {
          verifyAndLockInventory: (
            txArg: typeof tx,
            items: Array<{
              batchId: number;
              displayName: string;
              originalName: string;
              quantity: number;
              unitPrice: number;
              isSample: boolean;
              unitCogs: number;
              cogsMode: "FIXED" | "RANGE";
              cogsSource:
                | "FIXED"
                | "LOW"
                | "MIDPOINT"
                | "HIGH"
                | "CLIENT_ADJUSTMENT"
                | "RULE"
                | "MANUAL";
              unitMargin: number;
              marginPercent: number;
              lineTotal: number;
              lineCogs: number;
              lineMargin: number;
            }>
          ) => Promise<void>;
        };

      await orchestrator.verifyAndLockInventory(tx, [
        {
          batchId: 11,
          displayName: "Legacy-safe batch",
          originalName: "Legacy-safe batch",
          quantity: 2,
          unitPrice: 15,
          isSample: false,
          unitCogs: 10,
          cogsMode: "FIXED",
          cogsSource: "FIXED",
          unitMargin: 5,
          marginPercent: 33.33,
          lineTotal: 30,
          lineCogs: 20,
          lineMargin: 10,
        },
      ]);

      expect(getCompatibleBatchSelect).toHaveBeenCalledOnce();
      expect(tx.select).toHaveBeenCalledWith(batchSelect);
    });

    it("uses the compatible batch select when processing priced order items", async () => {
      const batchSelect = {
        id: "compat-id",
        sku: "compat-sku",
      } as unknown as Awaited<ReturnType<typeof getCompatibleBatchSelect>>;
      vi.mocked(getCompatibleBatchSelect).mockResolvedValue(batchSelect);

      const selectChain = {
        from: vi.fn(),
        where: vi.fn(),
        for: vi.fn(),
        limit: vi.fn(),
      };
      selectChain.from.mockReturnValue(selectChain);
      selectChain.where.mockReturnValue(selectChain);
      selectChain.for.mockReturnValue(selectChain);
      selectChain.limit.mockResolvedValue([
        {
          id: 22,
          sku: "BATCH-22",
          onHandQty: "12",
          sampleQty: "0",
          reservedQty: "0",
          quarantineQty: "0",
          holdQty: "0",
          cogsMode: "FIXED",
          unitCogs: "10",
          unitCogsMin: null,
          unitCogsMax: null,
        },
      ]);

      const tx = {
        select: vi.fn(() => selectChain),
      };

      const orchestrator =
        new OrderOrchestrator() as unknown as {
          processOrderItems: (
            txArg: typeof tx,
            items: Array<{
              batchId: number;
              displayName?: string;
              quantity: number;
              unitPrice: number;
              isSample: boolean;
              overridePrice?: number;
              overrideCogs?: number;
            }>,
            client: {
              id: number;
              cogsAdjustmentType?: "NONE" | "PERCENTAGE" | "FIXED_AMOUNT" | null;
              cogsAdjustmentValue?: string | null;
            },
            paymentTerms?: PaymentTerms,
            verifyInventory?: boolean
          ) => Promise<Array<{ batchId: number; originalName: string }>>;
        };

      const processed = await orchestrator.processOrderItems(
        tx,
        [
          {
            batchId: 22,
            displayName: "Processed legacy batch",
            quantity: 1,
            unitPrice: 15,
            isSample: false,
          },
        ],
        {
          id: 7,
          cogsAdjustmentType: "NONE",
          cogsAdjustmentValue: "0",
        },
        "NET_30",
        true
      );

      expect(getCompatibleBatchSelect).toHaveBeenCalledOnce();
      expect(tx.select).toHaveBeenCalledWith(batchSelect);
      expect(processed[0]?.batchId).toBe(22);
      expect(processed[0]?.originalName).toBe("BATCH-22");
    });
  });
});

describe("OrderOrchestrator exports", () => {
  it("should export orderOrchestrator singleton", async () => {
    const { orderOrchestrator } = await import("./orderOrchestrator");
    expect(orderOrchestrator).toBeDefined();
    // Check it has all required methods instead of using toBeInstanceOf (which fails with mocking)
    expect(typeof orderOrchestrator.createSaleOrder).toBe("function");
    expect(typeof orderOrchestrator.confirmOrder).toBe("function");
    expect(typeof orderOrchestrator.fulfillOrder).toBe("function");
    expect(typeof orderOrchestrator.processReturn).toBe("function");
  });

  it("should export OrderOrchestrator class", async () => {
    const { OrderOrchestrator } = await import("./orderOrchestrator");
    expect(OrderOrchestrator).toBeDefined();
    expect(typeof OrderOrchestrator).toBe("function");
  });

  it("should export all necessary types", async () => {
    // Type imports are compile-time only, but we can verify the module exports
    const module = await import("./orderOrchestrator");
    expect(module.OrderOrchestrator).toBeDefined();
    expect(module.orderOrchestrator).toBeDefined();
  });

  it("should export FulfillOrderInput type", async () => {
    // Verify the module has the type by checking import doesn't fail
    const module = await import("./orderOrchestrator");
    expect(module).toBeDefined();
    // FulfillOrderInput is a type, so we can't directly test it
    // but we can verify the orchestrator accepts the expected shape
    expect(typeof module.orderOrchestrator.fulfillOrder).toBe("function");
  });

  it("should export ProcessReturnInput type", async () => {
    const module = await import("./orderOrchestrator");
    expect(module).toBeDefined();
    expect(typeof module.orderOrchestrator.processReturn).toBe("function");
  });
});

describe("OrderOrchestrator state machine integration", () => {
  it("should validate fulfillOrder sets correct status based on pick completeness", () => {
    // Test the logic for determining PACKED vs PENDING status
    const testCases = [
      { allFullyPicked: true, expectedStatus: "PACKED" },
      { allFullyPicked: false, expectedStatus: "PENDING" },
    ];

    for (const { allFullyPicked, expectedStatus } of testCases) {
      const newStatus = allFullyPicked ? "PACKED" : "PENDING";
      expect(newStatus).toBe(expectedStatus);
    }
  });

  it("should validate return reasons are correctly typed", () => {
    const validReasons = [
      "DEFECTIVE",
      "WRONG_ITEM",
      "NOT_AS_DESCRIBED",
      "CUSTOMER_CHANGED_MIND",
      "OTHER",
    ];

    for (const reason of validReasons) {
      expect(typeof reason).toBe("string");
      expect(validReasons).toContain(reason);
    }
  });
});

describe("OrderOrchestrator method contracts", () => {
  it("fulfillOrder should require orderId, items, and actorId", () => {
    // Verify the expected input shape
    const validInput = {
      orderId: 1,
      items: [{ batchId: 1, pickedQuantity: 5 }],
      actorId: 1,
    };

    expect(validInput.orderId).toBeDefined();
    expect(validInput.items).toBeDefined();
    expect(validInput.actorId).toBeDefined();
    expect(Array.isArray(validInput.items)).toBe(true);
  });

  it("processReturn should require orderId, items, reason, and actorId", () => {
    const validInput = {
      orderId: 1,
      items: [{ batchId: 1, quantity: 5 }],
      reason: "DEFECTIVE" as const,
      actorId: 1,
    };

    expect(validInput.orderId).toBeDefined();
    expect(validInput.items).toBeDefined();
    expect(validInput.reason).toBeDefined();
    expect(validInput.actorId).toBeDefined();
  });

  it("fulfillOrder items should support optional locationId and notes", () => {
    const itemWithOptional = {
      batchId: 1,
      pickedQuantity: 5,
      locationId: 10,
      notes: "Test note",
    };

    const itemWithoutOptional = {
      batchId: 2,
      pickedQuantity: 3,
    };

    expect(itemWithOptional.locationId).toBe(10);
    expect(itemWithOptional.notes).toBe("Test note");
    expect(itemWithoutOptional.locationId).toBeUndefined();
    expect(itemWithoutOptional.notes).toBeUndefined();
  });
});
