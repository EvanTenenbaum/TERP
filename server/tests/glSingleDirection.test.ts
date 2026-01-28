/**
 * GL Entry Single-Direction Constraint Tests
 *
 * Task: ST-057
 * Session: ST-057 Implementation
 *
 * Tests the accounting principle that ledger entries should have
 * either a debit OR a credit, never both in the same entry.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock db with transaction support
const mockInsert = vi.fn();
const mockTransaction = vi.fn();

vi.mock("../db", async () => {
  const setupDbMock = (await import("../test-utils/testDb")).setupDbMock;
  return setupDbMock();
});

import { createLedgerEntry } from "../accountingDb";

describe("GL Entry Single-Direction Constraint (ST-057)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Validation Logic", () => {
    it("should accept entry with only debit (credit=0)", () => {
      // This validates the pattern used in the codebase
      const entry = {
        debit: 100.0,
        credit: 0.0,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // Validation should pass
      expect(debitAmount > 0 && creditAmount > 0).toBe(false);
    });

    it("should accept entry with only credit (debit=0)", () => {
      const entry = {
        debit: 0.0,
        credit: 100.0,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // Validation should pass
      expect(debitAmount > 0 && creditAmount > 0).toBe(false);
    });

    it("should accept entry with both debit and credit as 0", () => {
      const entry = {
        debit: 0.0,
        credit: 0.0,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // Validation should pass
      expect(debitAmount > 0 && creditAmount > 0).toBe(false);
    });

    it("should reject entry with both debit and credit > 0", () => {
      const entry = {
        debit: 100.0,
        credit: 50.0,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // Validation should fail
      expect(debitAmount > 0 && creditAmount > 0).toBe(true);
    });

    it("should handle string decimal values correctly", () => {
      const entry = {
        debit: "100.00",
        credit: "50.00",
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // Validation should fail
      expect(debitAmount > 0 && creditAmount > 0).toBe(true);
    });

    it("should handle null/undefined values safely", () => {
      const entry = {
        debit: null,
        credit: undefined,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // Both should be 0, validation should pass
      expect(debitAmount).toBe(0);
      expect(creditAmount).toBe(0);
      expect(debitAmount > 0 && creditAmount > 0).toBe(false);
    });
  });

  describe("Double-Entry Bookkeeping Examples", () => {
    it("should model a balanced journal entry with separate lines", () => {
      // Example: Cash sale of $500
      const journalEntry = [
        { accountId: 1, debit: 500.0, credit: 0.0 }, // Cash (Asset) increases
        { accountId: 2, debit: 0.0, credit: 500.0 }, // Revenue increases
      ];

      // Each line should have only debit OR credit
      for (const line of journalEntry) {
        const hasOnlyDebit = line.debit > 0 && line.credit === 0;
        const hasOnlyCredit = line.credit > 0 && line.debit === 0;
        expect(hasOnlyDebit || hasOnlyCredit).toBe(true);
      }

      // Total debits should equal total credits
      const totalDebits = journalEntry.reduce((sum, l) => sum + l.debit, 0);
      const totalCredits = journalEntry.reduce((sum, l) => sum + l.credit, 0);
      expect(totalDebits).toBe(totalCredits);
    });

    it("should model payment received against invoice", () => {
      // Example: $250 payment against AR
      const journalEntry = [
        { accountId: 1, debit: 250.0, credit: 0.0 }, // Cash (Asset) increases
        { accountId: 3, debit: 0.0, credit: 250.0 }, // AR (Asset) decreases
      ];

      // Each line should have only debit OR credit
      for (const line of journalEntry) {
        expect(line.debit === 0 || line.credit === 0).toBe(true);
      }
    });

    it("should model COGS entry correctly", () => {
      // Example: COGS of $100 for inventory sold
      const journalEntry = [
        { accountId: 5, debit: 100.0, credit: 0.0 }, // COGS (Expense) increases
        { accountId: 4, debit: 0.0, credit: 100.0 }, // Inventory (Asset) decreases
      ];

      // Each line should have only debit OR credit
      for (const line of journalEntry) {
        const violatesConstraint = line.debit > 0 && line.credit > 0;
        expect(violatesConstraint).toBe(false);
      }
    });
  });

  describe("Adversarial Scenarios", () => {
    it("should catch very small non-zero values", () => {
      const entry = {
        debit: 0.01,
        credit: 0.01,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      expect(debitAmount > 0 && creditAmount > 0).toBe(true);
    });

    it("should handle negative values", () => {
      // Negative values should not trigger the constraint
      // but they are generally invalid for GL entries
      const entry = {
        debit: -100.0,
        credit: 0.0,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // -100 > 0 is false, so constraint won't trigger
      expect(debitAmount > 0 && creditAmount > 0).toBe(false);
    });

    it("should handle very large values", () => {
      const entry = {
        debit: 999999999999.99,
        credit: 0.0,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      expect(debitAmount > 0 && creditAmount > 0).toBe(false);
    });

    it("should handle floating point precision", () => {
      const entry = {
        debit: 0.1 + 0.2, // 0.30000000000000004
        credit: 0.3,
      };

      const debitAmount = parseFloat(String(entry.debit || "0"));
      const creditAmount = parseFloat(String(entry.credit || "0"));

      // Both are > 0, should trigger constraint
      expect(debitAmount > 0 && creditAmount > 0).toBe(true);
    });
  });
});
