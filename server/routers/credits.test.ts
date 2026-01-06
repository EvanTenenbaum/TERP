/**
 * Integration Tests for Credits Router
 *
 * Tests all tRPC procedures in the credits router.
 * Uses AAA (Arrange, Act, Assert) pattern for clarity.
 *
 * @module server/routers/credits.test.ts
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock the credits module
vi.mock("../creditsDb");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import { db as _db } from "../db";
import * as creditsDb from "../creditsDb";

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
  });
};

describe("Credits Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("create", () => {
    it("should create a new credit", async () => {
      // Arrange
      const input = {
        clientId: 1,
        creditAmount: "100.00",
        creditReason: "Promotional credit",
        notes: "Welcome bonus",
      };

      const mockCredit = {
        id: 1,
        creditNumber: "CR-001",
        ...input,
        amountRemaining: "100.00",
        amountUsed: "0",
        status: "ACTIVE",
        createdBy: 1,
      };

      vi.mocked(creditsDb.generateCreditNumber).mockResolvedValue("CR-001");
      vi.mocked(creditsDb.createCredit).mockResolvedValue(mockCredit);

      // Act
      const result = await caller.credits.create(input);

      // Assert
      expect(result).toEqual(mockCredit);
      expect(creditsDb.generateCreditNumber).toHaveBeenCalled();
      expect(creditsDb.createCredit).toHaveBeenCalledWith(
        expect.objectContaining({
          creditNumber: "CR-001",
          clientId: 1,
          creditAmount: "100.00",
          status: "ACTIVE",
        })
      );
    });
  });

  describe("getById", () => {
    it("should retrieve credit by ID", async () => {
      // Arrange
      const mockCredit = {
        id: 1,
        creditNumber: "CR-001",
        clientId: 1,
        creditAmount: "100.00",
        amountRemaining: "50.00",
        status: "ACTIVE",
      };

      vi.mocked(creditsDb.getCreditById).mockResolvedValue(mockCredit);

      // Act
      const result = await caller.credits.getById({ creditId: 1 });

      // Assert
      expect(result).toEqual(mockCredit);
      expect(creditsDb.getCreditById).toHaveBeenCalledWith(1);
    });
  });

  describe("getByNumber", () => {
    it("should retrieve credit by number", async () => {
      // Arrange
      const mockCredit = {
        id: 1,
        creditNumber: "CR-001",
        clientId: 1,
        creditAmount: "100.00",
      };

      vi.mocked(creditsDb.getCreditByNumber).mockResolvedValue(mockCredit);

      // Act
      const result = await caller.credits.getByNumber({
        creditNumber: "CR-001",
      });

      // Assert
      expect(result).toEqual(mockCredit);
      expect(creditsDb.getCreditByNumber).toHaveBeenCalledWith("CR-001");
    });
  });

  describe("getByClient", () => {
    it("should retrieve all credits for a client", async () => {
      // Arrange
      const mockCredits = [
        { id: 1, creditNumber: "CR-001", clientId: 1, status: "ACTIVE" },
        { id: 2, creditNumber: "CR-002", clientId: 1, status: "USED" },
      ];

      vi.mocked(creditsDb.getCreditsByClient).mockResolvedValue(mockCredits);

      // Act
      const result = await caller.credits.getByClient({ clientId: 1 });

      // Assert
      expect(result).toEqual(mockCredits);
      expect(creditsDb.getCreditsByClient).toHaveBeenCalledWith(1, false);
    });

    it("should retrieve only active credits when activeOnly is true", async () => {
      // Arrange
      const mockActiveCredits = [
        { id: 1, creditNumber: "CR-001", clientId: 1, status: "ACTIVE" },
      ];

      vi.mocked(creditsDb.getCreditsByClient).mockResolvedValue(
        mockActiveCredits
      );

      // Act
      const result = await caller.credits.getByClient({
        clientId: 1,
        activeOnly: true,
      });

      // Assert
      expect(result).toEqual(mockActiveCredits);
      expect(creditsDb.getCreditsByClient).toHaveBeenCalledWith(1, true);
    });
  });

  describe("getBalance", () => {
    it("should retrieve client credit balance", async () => {
      // Arrange
      const mockBalance = {
        clientId: 1,
        totalCredits: "200.00",
        totalUsed: "75.00",
        totalRemaining: "125.00",
      };

      vi.mocked(creditsDb.getClientCreditBalance).mockResolvedValue(
        mockBalance
      );

      // Act
      const result = await caller.credits.getBalance({ clientId: 1 });

      // Assert
      expect(result).toEqual(mockBalance);
      expect(creditsDb.getClientCreditBalance).toHaveBeenCalledWith(1);
    });
  });

  describe("applyCredit", () => {
    // QA-TEST-003: Skipped - applyCredit involves complex invoice updates and
    // transaction creation that requires integration testing; verified via E2E tests
    it.skip("should apply credit to an invoice", async () => {
      // Arrange
      const input = {
        creditId: 1,
        invoiceId: 100,
        amountToApply: "50.00",
        notes: "Applied to invoice #100",
      };

      const mockResult = {
        success: true,
        creditId: 1,
        invoiceId: 100,
        amountApplied: "50.00",
        remainingCredit: "50.00",
      };

      vi.mocked(creditsDb.applyCredit).mockResolvedValue(mockResult);

      // Act
      const result = await caller.credits.applyCredit(input);

      // Assert
      expect(result).toEqual(mockResult);
      expect(creditsDb.applyCredit).toHaveBeenCalledWith(
        expect.objectContaining({
          creditId: 1,
          invoiceId: 100,
          amountToApply: "50.00",
        })
      );
    });
  });

  describe("Edge Cases", () => {
    it("should handle zero credit amount", async () => {
      // Arrange
      const input = {
        clientId: 1,
        creditAmount: "0.00",
        creditReason: "Test",
      };

      const mockCredit = {
        id: 1,
        creditNumber: "CR-002",
        ...input,
        amountRemaining: "0.00",
        status: "ACTIVE",
      };

      vi.mocked(creditsDb.generateCreditNumber).mockResolvedValue("CR-002");
      vi.mocked(creditsDb.createCredit).mockResolvedValue(mockCredit);

      // Act
      const result = await caller.credits.create(input);

      // Assert
      expect(result.creditAmount).toBe("0.00");
    });

    it("should handle empty credits list", async () => {
      // Arrange
      vi.mocked(creditsDb.getCreditsByClient).mockResolvedValue([]);

      // Act
      const result = await caller.credits.getByClient({ clientId: 999 });

      // Assert
      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });
});
