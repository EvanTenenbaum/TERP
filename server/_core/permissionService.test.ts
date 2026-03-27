import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb, mockIsSuperAdmin } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockIsSuperAdmin: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: mockGetDb,
}));

vi.mock("./cache", () => ({
  default: {
    get: vi.fn(() => null),
    set: vi.fn(),
    delete: vi.fn(),
    invalidatePattern: vi.fn(),
  },
  CacheKeys: {
    calendarEventPermission: (
      userId: number,
      eventId: number,
      permission: string
    ) => `perm:${userId}:${eventId}:${permission}`,
  },
  CacheTTL: {
    SHORT: 60,
    MEDIUM: 300,
  },
}));

vi.mock("../services/permissionService", () => ({
  isSuperAdmin: mockIsSuperAdmin,
}));

import PermissionService from "./permissionService";

describe("PermissionService super admin handling", () => {
  beforeEach(() => {
    mockGetDb.mockReset();
    mockGetDb.mockResolvedValue({
      select: vi.fn(),
    });
    mockIsSuperAdmin.mockReset();
  });

  it("grants event permission through the canonical super-admin path", async () => {
    mockIsSuperAdmin.mockResolvedValue(true);

    await expect(
      PermissionService.hasPermission(42, 1001, "MANAGE")
    ).resolves.toBe(true);
    expect(mockIsSuperAdmin).toHaveBeenCalledWith("42");
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it("grants batch permissions through the canonical super-admin path", async () => {
    mockIsSuperAdmin.mockResolvedValue(true);

    await expect(
      PermissionService.batchCheckPermissions(42, [11, 12], "VIEW")
    ).resolves.toEqual({ 11: true, 12: true });
    expect(mockIsSuperAdmin).toHaveBeenCalledWith("42");
    expect(mockGetDb).not.toHaveBeenCalled();
  });
});
