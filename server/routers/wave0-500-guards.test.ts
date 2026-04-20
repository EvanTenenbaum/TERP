/**
 * Regression tests for TER-1147: defensive handling on /orders/new.
 *
 * These procedures must never 500 the page when their backing tables are
 * missing or legacy. They should log and return empty/default shapes:
 *
 *   - credit.getVisibilitySettings (was unguarded → 500 on missing table)
 *   - referrals.getSettings        (guard only caught .code, not .errno/wrapped)
 *   - referrals.getPendingCredits  (same guard gap)
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

vi.mock("../db", () => setupDbMock());
vi.mock("../services/permissionService", () => setupPermissionMock());

import * as dbModule from "../db";
import { appRouter } from "../routers";
import { createContext } from "../_core/context";

const mockUser = {
  id: 1,
  email: "admin@terp.com",
  name: "Admin User",
  role: "admin",
};

async function createCaller() {
  const ctx = await createContext({
    req: { headers: {} } as Record<string, unknown>,
    res: {} as Record<string, unknown>,
  });
  return appRouter.createCaller({ ...ctx, user: mockUser });
}

/**
 * Build a drizzle query chain whose terminal await rejects with the given error.
 * Every chain step returns `self` so .from().leftJoin().where().orderBy().limit()
 * compositions still work before the final resolution.
 */
function buildChainRejectingWith(error: unknown) {
  const chain: Record<string, unknown> = {};
  const passthrough = () => chain;
  chain.from = vi.fn(passthrough);
  chain.leftJoin = vi.fn(passthrough);
  chain.innerJoin = vi.fn(passthrough);
  chain.where = vi.fn(passthrough);
  chain.orderBy = vi.fn(passthrough);
  chain.limit = vi.fn(() => Promise.reject(error));
  chain.offset = vi.fn(() => Promise.reject(error));
  chain.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.reject(error).then(resolve, reject);
  return chain;
}

describe("TER-1147: wave-0 /orders/new defensive guards", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  describe("credit.getVisibilitySettings", () => {
    it("returns defaults (does not 500) when credit_visibility_settings table is missing", async () => {
      const err = Object.assign(
        new Error(
          "Table 'terp.credit_visibility_settings' doesn't exist"
        ),
        { code: "ER_NO_SUCH_TABLE", errno: 1146 }
      );
      vi.mocked(dbModule.db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        buildChainRejectingWith(err)
      );

      const result = await caller.credit.getVisibilitySettings({});
      expect(result).toBeDefined();
      expect(result.showCreditInClientList).toBe(true);
      expect(result.creditEnforcementMode).toBe("WARNING");
    });
  });

  describe("referrals.getSettings", () => {
    it("returns defaults when error only exposes errno (no .code field)", async () => {
      // drizzle/mysql2 sometimes surfaces errors with errno but without the
      // string code — the original isLegacySchemaError guard missed these.
      const err = Object.assign(
        new Error("Unknown table 'referral_credit_settings'"),
        { errno: 1146 }
      );
      vi.mocked(dbModule.db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        buildChainRejectingWith(err)
      );

      const result = await caller.referrals.getSettings();
      expect(result).toEqual({ globalPercentage: 10.0, tierSettings: [] });
    });
  });

  describe("referrals.getPendingCredits", () => {
    it("returns empty result when error is nested under .cause (drizzle wrap)", async () => {
      const inner = Object.assign(
        new Error("Table 'terp.referral_credits' doesn't exist"),
        { code: "ER_NO_SUCH_TABLE", errno: 1146 }
      );
      const outer = Object.assign(new Error("Failed query: select ..."), {
        cause: inner,
      });
      vi.mocked(dbModule.db.select as ReturnType<typeof vi.fn>).mockReturnValue(
        buildChainRejectingWith(outer)
      );

      const result = await caller.referrals.getPendingCredits({ clientId: 42 });
      expect(result).toEqual({
        totalPending: 0,
        totalAvailable: 0,
        credits: [],
      });
    });
  });
});
