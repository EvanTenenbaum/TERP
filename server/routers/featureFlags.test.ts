import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Hoisted mocks so vi.mock factories can reference them.
const getAuditHistory = vi.hoisted(() => vi.fn());

vi.mock("../services/featureFlagService", () => ({
  featureFlagService: {
    getAuditHistory,
  },
}));

vi.mock("../featureFlagsDb", () => ({
  featureFlagsDb: {},
}));

vi.mock("../services/seedFeatureFlags", () => ({
  seedFeatureFlags: vi.fn(),
}));

vi.mock("../services/permissionService", () => setupPermissionMock());
vi.mock("../db", () => setupDbMock());

import type { User } from "../../drizzle/schema";
import { appRouter } from "../routers";

const adminUser: User = {
  id: 1,
  openId: "admin-1",
  email: "admin@example.com",
  name: "Admin User",
  role: "admin",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const createCaller = () =>
  appRouter.createCaller({
    req: {} as never,
    res: {} as never,
    user: adminUser,
  });

describe("featureFlags.getAuditHistory (TER-1156)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns an empty list when the audit log query fails", async () => {
    getAuditHistory.mockRejectedValue(
      new Error("Table 'feature_flag_audit_logs' doesn't exist")
    );

    const caller = createCaller();
    const result = await caller.featureFlags.getAuditHistory({ limit: 100 });

    expect(result).toEqual([]);
    expect(getAuditHistory).toHaveBeenCalledWith(undefined, 100);
  });

  it("returns real audit rows on success", async () => {
    const rows = [
      { id: 1, flagKey: "foo", action: "update", createdAt: new Date() },
    ];
    getAuditHistory.mockResolvedValue(rows);

    const caller = createCaller();
    const result = await caller.featureFlags.getAuditHistory({
      flagKey: "foo",
      limit: 10,
    });

    expect(result).toEqual(rows);
    expect(getAuditHistory).toHaveBeenCalledWith("foo", 10);
  });

  it("returns an empty list when no history exists", async () => {
    getAuditHistory.mockResolvedValue([]);

    const caller = createCaller();
    const result = await caller.featureFlags.getAuditHistory({ limit: 50 });

    expect(result).toEqual([]);
  });
});
