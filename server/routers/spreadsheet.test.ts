import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

const mockInventoryResponse = vi.hoisted(() => ({
  rows: [],
  nextCursor: null,
  hasMore: false,
}));

const mockClientResponse = vi.hoisted(() => ({
  summary: { total: 0, balance: 0, yearToDate: 0 },
  rows: [],
}));

const getInventoryGridData = vi.hoisted(() =>
  vi.fn().mockResolvedValue(mockInventoryResponse)
);
const getClientGridData = vi.hoisted(() =>
  vi.fn().mockResolvedValue(mockClientResponse)
);

vi.mock("../services/spreadsheetViewService", () => ({
  getInventoryGridData,
  getClientGridData,
  transformInventoryRecord: vi.fn(),
  transformClientOrderRows: vi.fn(),
}));

vi.mock("../services/permissionService", () => setupPermissionMock());

vi.mock("../db", () => setupDbMock());

const isEnabled = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("../services/featureFlagService", () => ({
  featureFlagService: {
    isEnabled,
  },
}));

import type { User } from "../../drizzle/schema";
import { appRouter } from "../routers";
import { TRPCError } from "@trpc/server";

const testUser: User = {
  id: 1,
  openId: "user-1",
  email: "user@example.com",
  name: "Test User",
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
    user: testUser,
  });

describe("spreadsheet router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isEnabled.mockResolvedValue(true);
  });

  it("returns inventory grid data when feature flag enabled", async () => {
    const caller = createCaller();

    const result = await caller.spreadsheet.getInventoryGridData({ limit: 10 });

    expect(getInventoryGridData).toHaveBeenCalledWith({ limit: 10 });
    expect(result).toEqual(mockInventoryResponse);
  });

  it("throws when feature flag is disabled", async () => {
    isEnabled.mockResolvedValue(false);
    const caller = createCaller();

    await expect(
      caller.spreadsheet.getInventoryGridData({ limit: 5 })
    ).rejects.toBeInstanceOf(TRPCError);
  });

  it("returns client grid data when flag enabled", async () => {
    const caller = createCaller();

    const result = await caller.spreadsheet.getClientGridData({ clientId: 99 });

    expect(getClientGridData).toHaveBeenCalledWith({ clientId: 99 });
    expect(result).toEqual(mockClientResponse);
  });
});
