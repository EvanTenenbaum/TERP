import { afterEach, describe, expect, it } from "vitest";
import {
  __testables,
  type QARole,
} from "../../../../tests-e2e/oracles/auth-fixtures";

const ORIGINAL_ENV = {
  E2E_ALLOW_ADMIN_FALLBACK: process.env.E2E_ALLOW_ADMIN_FALLBACK,
  E2E_ALLOW_ROLE_MISMATCH: process.env.E2E_ALLOW_ROLE_MISMATCH,
};

afterEach(() => {
  process.env.E2E_ALLOW_ADMIN_FALLBACK = ORIGINAL_ENV.E2E_ALLOW_ADMIN_FALLBACK;
  process.env.E2E_ALLOW_ROLE_MISMATCH = ORIGINAL_ENV.E2E_ALLOW_ROLE_MISMATCH;
});

describe("oracle auth fixture policy", () => {
  it("does not allow admin fallback unless explicitly enabled", () => {
    delete process.env.E2E_ALLOW_ADMIN_FALLBACK;
    const config = __testables.getAuthConfig();
    expect(config.allowAdminFallback).toBe(false);

    process.env.E2E_ALLOW_ADMIN_FALLBACK = "true";
    const enabled = __testables.getAuthConfig();
    expect(enabled.allowAdminFallback).toBe(true);
  });

  it("prioritizes role credentials before any admin fallback", () => {
    process.env.E2E_ALLOW_ADMIN_FALLBACK = "true";
    const candidates = __testables.getRoleCredentialCandidates("SalesManager");

    expect(candidates.length).toBeGreaterThan(1);
    expect(candidates[0].source).toContain("TEST_USERS.salesManager");
    expect(candidates[candidates.length - 1].source).toContain(
      "admin fallback"
    );
  });

  it("enforces strict role email matching by default", () => {
    const matrix: Array<[QARole, string, boolean]> = [
      ["SalesRep", "qa.salesrep@terp.test", true],
      ["SalesRep", "qa.superadmin@terp.test", false],
      ["InventoryManager", "qa.invmanager@terp.test", true],
      ["Fulfillment", "qa.warehouse@terp.test", true],
      ["AccountingManager", "qa.accountant@terp.test", true],
    ];

    for (const [role, email, expected] of matrix) {
      expect(__testables.isEmailAllowedForRole(role, email)).toBe(expected);
    }
  });
});
