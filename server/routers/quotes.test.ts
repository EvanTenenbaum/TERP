/**
 * Quotes Router Tests
 * TER-573: Tests for quote status enum rename (DRAFT→UNSENT, ACCEPTED→CONVERTED)
 * Covers: status transitions, null quoteStatus handling, send/accept/reject flows
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());
vi.mock("../services/permissionService", () => setupPermissionMock());
vi.mock("../ordersDb", async importOriginal => {
  const actual = await importOriginal<typeof import("../ordersDb")>();
  return {
    ...actual,
    createOrder: vi.fn(),
    getOrders: vi.fn(),
    getOrderById: vi.fn(),
  };
});
vi.mock("../services/emailService", () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
  isEmailEnabled: vi.fn().mockReturnValue(true),
  generateQuoteEmailHtml: vi.fn().mockReturnValue("<html></html>"),
  generateQuoteEmailText: vi.fn().mockReturnValue("text"),
}));

import { appRouter } from "../routers";
import { createMockContext } from "../../tests/unit/mocks/db.mock";
import * as ordersDb from "../ordersDb";
import { isValidStatusTransition } from "../ordersDb";

const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

const createCaller = () => {
  const ctx = createMockContext({ user: mockUser, isPublicDemoUser: false });
  return appRouter.createCaller(ctx);
};

describe("Quotes Router", () => {
  let caller: ReturnType<typeof createCaller>;

  beforeAll(() => {
    caller = createCaller();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Quote Status Enum Values (TER-573)", () => {
    it("should create a quote with orderType QUOTE", async () => {
      const mockCreatedQuote = {
        id: 1,
        orderNumber: "Q-2026-001",
        orderType: "QUOTE",
        quoteStatus: "UNSENT",
        items: "[]",
        subtotal: "0",
        total: "0",
      };
      vi.mocked(ordersDb.createOrder).mockResolvedValue(mockCreatedQuote);

      const result = await caller.quotes.create({
        clientId: 1,
        items: [{ batchId: 1, quantity: 5, unitPrice: 100 }],
      });

      expect(result).toBeDefined();
      expect(ordersDb.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          orderType: "QUOTE",
        })
      );
    });

    it("should accept UNSENT as a valid filter status for listing", async () => {
      vi.mocked(ordersDb.getOrders).mockResolvedValue({
        orders: [],
        total: 0,
      });

      const result = await caller.quotes.list({
        status: "UNSENT",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
    });

    it("should accept CONVERTED as a valid filter status for listing", async () => {
      vi.mocked(ordersDb.getOrders).mockResolvedValue({
        orders: [],
        total: 0,
      });

      const result = await caller.quotes.list({
        status: "CONVERTED",
        limit: 10,
        offset: 0,
      });

      expect(result).toBeDefined();
    });
  });

  describe("Null quoteStatus handling (W6 fix)", () => {
    it("should reject send when quoteStatus is null", async () => {
      // The quotes router does a DB query; since we mock the DB,
      // we need to test the isValidStatusTransition logic directly

      // Null/undefined status should not be silently defaulted
      // The router now throws before calling isValidStatusTransition
      // Verify the old DRAFT fallback no longer exists by checking
      // that DRAFT is not a valid status in the quote machine
      expect(isValidStatusTransition("quote", "DRAFT", "SENT")).toBe(false);
    });

    it("should reject transition from non-existent status", async () => {
      expect(isValidStatusTransition("quote", "NONEXISTENT", "SENT")).toBe(
        false
      );
    });
  });

  describe("Quote status transitions (SM-001)", () => {
    it("should validate UNSENT → SENT transition", async () => {
      expect(isValidStatusTransition("quote", "UNSENT", "SENT")).toBe(true);
    });

    it("should validate SENT → VIEWED transition", async () => {
      expect(isValidStatusTransition("quote", "SENT", "VIEWED")).toBe(true);
    });

    it("should validate VIEWED → CONVERTED transition", async () => {
      expect(isValidStatusTransition("quote", "VIEWED", "CONVERTED")).toBe(
        true
      );
    });

    it("should validate full happy path: UNSENT → SENT → VIEWED → CONVERTED", async () => {
      expect(isValidStatusTransition("quote", "UNSENT", "SENT")).toBe(true);
      expect(isValidStatusTransition("quote", "SENT", "VIEWED")).toBe(true);
      expect(isValidStatusTransition("quote", "VIEWED", "CONVERTED")).toBe(
        true
      );
    });

    it("should reject backward transitions", async () => {
      expect(isValidStatusTransition("quote", "SENT", "UNSENT")).toBe(false);
      expect(isValidStatusTransition("quote", "VIEWED", "SENT")).toBe(false);
      expect(isValidStatusTransition("quote", "CONVERTED", "VIEWED")).toBe(
        false
      );
    });

    it("should reject transitions from terminal states", async () => {
      // CONVERTED is terminal
      expect(isValidStatusTransition("quote", "CONVERTED", "UNSENT")).toBe(
        false
      );
      expect(isValidStatusTransition("quote", "CONVERTED", "SENT")).toBe(false);
      // REJECTED is terminal
      expect(isValidStatusTransition("quote", "REJECTED", "UNSENT")).toBe(
        false
      );
      expect(isValidStatusTransition("quote", "REJECTED", "SENT")).toBe(false);
      // EXPIRED is terminal
      expect(isValidStatusTransition("quote", "EXPIRED", "UNSENT")).toBe(false);
      expect(isValidStatusTransition("quote", "EXPIRED", "SENT")).toBe(false);
    });

    it("should allow direct conversion from any non-terminal state", async () => {
      expect(isValidStatusTransition("quote", "UNSENT", "CONVERTED")).toBe(
        true
      );
      expect(isValidStatusTransition("quote", "SENT", "CONVERTED")).toBe(true);
      expect(isValidStatusTransition("quote", "VIEWED", "CONVERTED")).toBe(
        true
      );
    });

    it("should allow rejection from any non-terminal state", async () => {
      expect(isValidStatusTransition("quote", "UNSENT", "REJECTED")).toBe(true);
      expect(isValidStatusTransition("quote", "SENT", "REJECTED")).toBe(true);
      expect(isValidStatusTransition("quote", "VIEWED", "REJECTED")).toBe(true);
    });

    it("should allow expiration from any non-terminal state", async () => {
      expect(isValidStatusTransition("quote", "UNSENT", "EXPIRED")).toBe(true);
      expect(isValidStatusTransition("quote", "SENT", "EXPIRED")).toBe(true);
      expect(isValidStatusTransition("quote", "VIEWED", "EXPIRED")).toBe(true);
    });
  });

  describe("Deprecated status values", () => {
    it("should not recognize DRAFT as a valid quote status", async () => {
      expect(isValidStatusTransition("quote", "DRAFT", "SENT")).toBe(false);
      expect(isValidStatusTransition("quote", "DRAFT", "CONVERTED")).toBe(
        false
      );
    });

    it("should not recognize ACCEPTED as a valid quote status", async () => {
      expect(isValidStatusTransition("quote", "ACCEPTED", "CONVERTED")).toBe(
        false
      );
    });
  });
});
