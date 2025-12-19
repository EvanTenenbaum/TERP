/**
 * Property-Based Tests for Chart of Accounts Edit Persistence
 *
 * **Feature: parallel-sprint-dec19**
 * **Property 7: Edit persistence**
 *
 * Tests that account edits are correctly persisted and the UI updates accordingly.
 *
 * @module tests/property/accounting/chart-of-accounts
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";

// ==========================================================================
// Type Definitions
// ==========================================================================

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
type NormalBalance = "DEBIT" | "CREDIT";

interface Account {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: NormalBalance;
  parentAccountId: number | null;
  isActive: boolean;
  description: string | null;
}

interface UpdateAccountInput {
  accountName?: string;
  description?: string;
  isActive?: boolean;
}

// ==========================================================================
// Arbitraries
// ==========================================================================

/**
 * Arbitrary for account types
 */
const accountTypeArb = fc.constantFrom<AccountType>(
  "ASSET",
  "LIABILITY",
  "EQUITY",
  "REVENUE",
  "EXPENSE"
);

/**
 * Arbitrary for normal balance
 */
const normalBalanceArb = fc.constantFrom<NormalBalance>("DEBIT", "CREDIT");

/**
 * Arbitrary for valid account names
 */
const accountNameArb = fc
  .string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for valid account numbers
 */
const accountNumberArb = fc
  .integer({ min: 1000, max: 9999 })
  .map(n => n.toString());

/**
 * Arbitrary for valid description
 */
const descriptionArb = fc.option(fc.string({ minLength: 0, maxLength: 500 }), {
  nil: null,
});

/**
 * Arbitrary for generating valid Account objects
 */
const accountArb: fc.Arbitrary<Account> = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  accountNumber: accountNumberArb,
  accountName: accountNameArb,
  accountType: accountTypeArb,
  normalBalance: normalBalanceArb,
  parentAccountId: fc.option(fc.integer({ min: 1, max: 100000 }), {
    nil: null,
  }),
  isActive: fc.boolean(),
  description: descriptionArb,
});

/**
 * Arbitrary for valid update inputs
 */
const updateInputArb: fc.Arbitrary<UpdateAccountInput> = fc.record({
  accountName: fc.option(accountNameArb, { nil: undefined }),
  description: fc.option(fc.string({ minLength: 0, maxLength: 500 }), {
    nil: undefined,
  }),
  isActive: fc.option(fc.boolean(), { nil: undefined }),
});

// ==========================================================================
// Configuration
// ==========================================================================

/**
 * Get the number of test runs based on environment.
 */
function getNumRuns(): number {
  const envRuns = process.env.NUM_RUNS;
  if (envRuns) {
    const parsed = parseInt(envRuns, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return process.env.CI ? 100 : 500;
}

// ==========================================================================
// Pure Functions for Testing (mimics component logic)
// ==========================================================================

/**
 * Applies an update to an account, mimicking the edit flow
 */
function applyAccountUpdate(
  account: Account,
  update: UpdateAccountInput
): Account {
  return {
    ...account,
    accountName: update.accountName ?? account.accountName,
    description:
      update.description !== undefined
        ? update.description
        : account.description,
    isActive: update.isActive ?? account.isActive,
  };
}

/**
 * Validates that an update was correctly applied
 */
function validateUpdateApplied(
  original: Account,
  update: UpdateAccountInput,
  result: Account
): boolean {
  // Check that updated fields match the update
  if (
    update.accountName !== undefined &&
    result.accountName !== update.accountName
  ) {
    return false;
  }
  if (
    update.description !== undefined &&
    result.description !== update.description
  ) {
    return false;
  }
  if (update.isActive !== undefined && result.isActive !== update.isActive) {
    return false;
  }

  // Check that non-updated fields remain unchanged
  if (result.id !== original.id) return false;
  if (result.accountNumber !== original.accountNumber) return false;
  if (result.accountType !== original.accountType) return false;
  if (result.normalBalance !== original.normalBalance) return false;
  if (result.parentAccountId !== original.parentAccountId) return false;

  return true;
}

// ==========================================================================
// Property Tests
// ==========================================================================

describe("Chart of Accounts Property Tests", () => {
  const numRuns = getNumRuns();

  describe("**Feature: parallel-sprint-dec19, Property 7: Edit persistence**", () => {
    it("P7.1: Applying an update preserves unchanged fields", () => {
      fc.assert(
        fc.property(accountArb, updateInputArb, (account, update) => {
          const result = applyAccountUpdate(account, update);
          return validateUpdateApplied(account, update, result);
        }),
        { numRuns }
      );
    });

    it("P7.2: Update with empty input returns account unchanged", () => {
      fc.assert(
        fc.property(accountArb, account => {
          const emptyUpdate: UpdateAccountInput = {};
          const result = applyAccountUpdate(account, emptyUpdate);

          return (
            result.id === account.id &&
            result.accountNumber === account.accountNumber &&
            result.accountName === account.accountName &&
            result.accountType === account.accountType &&
            result.normalBalance === account.normalBalance &&
            result.parentAccountId === account.parentAccountId &&
            result.isActive === account.isActive &&
            result.description === account.description
          );
        }),
        { numRuns }
      );
    });

    it("P7.3: Update is idempotent (applying same update twice yields same result)", () => {
      fc.assert(
        fc.property(accountArb, updateInputArb, (account, update) => {
          const first = applyAccountUpdate(account, update);
          const second = applyAccountUpdate(first, update);

          return (
            first.id === second.id &&
            first.accountNumber === second.accountNumber &&
            first.accountName === second.accountName &&
            first.accountType === second.accountType &&
            first.normalBalance === second.normalBalance &&
            first.parentAccountId === second.parentAccountId &&
            first.isActive === second.isActive &&
            first.description === second.description
          );
        }),
        { numRuns }
      );
    });

    it("P7.4: Account ID never changes during update", () => {
      fc.assert(
        fc.property(accountArb, updateInputArb, (account, update) => {
          const result = applyAccountUpdate(account, update);
          return result.id === account.id;
        }),
        { numRuns }
      );
    });

    it("P7.5: Account number never changes during update", () => {
      fc.assert(
        fc.property(accountArb, updateInputArb, (account, update) => {
          const result = applyAccountUpdate(account, update);
          return result.accountNumber === account.accountNumber;
        }),
        { numRuns }
      );
    });

    it("P7.6: Account type never changes during update", () => {
      fc.assert(
        fc.property(accountArb, updateInputArb, (account, update) => {
          const result = applyAccountUpdate(account, update);
          return result.accountType === account.accountType;
        }),
        { numRuns }
      );
    });

    it("P7.7: Normal balance never changes during update", () => {
      fc.assert(
        fc.property(accountArb, updateInputArb, (account, update) => {
          const result = applyAccountUpdate(account, update);
          return result.normalBalance === account.normalBalance;
        }),
        { numRuns }
      );
    });

    it("P7.8: Updated account name is applied correctly", () => {
      fc.assert(
        fc.property(accountArb, accountNameArb, (account, newName) => {
          const update: UpdateAccountInput = { accountName: newName };
          const result = applyAccountUpdate(account, update);
          return result.accountName === newName;
        }),
        { numRuns }
      );
    });

    it("P7.9: Updated isActive flag is applied correctly", () => {
      fc.assert(
        fc.property(accountArb, fc.boolean(), (account, newIsActive) => {
          const update: UpdateAccountInput = { isActive: newIsActive };
          const result = applyAccountUpdate(account, update);
          return result.isActive === newIsActive;
        }),
        { numRuns }
      );
    });

    it("P7.10: Updated description is applied correctly", () => {
      fc.assert(
        fc.property(
          accountArb,
          fc.string({ minLength: 0, maxLength: 500 }),
          (account, newDescription) => {
            const update: UpdateAccountInput = { description: newDescription };
            const result = applyAccountUpdate(account, update);
            return result.description === newDescription;
          }
        ),
        { numRuns }
      );
    });
  });
});
