import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb, mockGetUserById, mockIsSuperAdmin } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetUserById: vi.fn(),
  mockIsSuperAdmin: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: mockGetDb,
  getUserById: mockGetUserById,
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
    mockGetUserById.mockReset();
    mockIsSuperAdmin.mockReset();
  });

  it("grants event permission through the canonical super-admin path", async () => {
    mockGetUserById.mockResolvedValue({ id: 42, openId: "rbac-super-admin" });
    mockIsSuperAdmin.mockResolvedValue(true);

    await expect(
      PermissionService.hasPermission(42, 1001, "MANAGE")
    ).resolves.toBe(true);
    expect(mockGetUserById).toHaveBeenCalledWith(42);
    expect(mockIsSuperAdmin).toHaveBeenCalledWith("rbac-super-admin");
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it("grants batch permissions through the canonical super-admin path", async () => {
    mockGetUserById.mockResolvedValue({ id: 42, openId: "rbac-super-admin" });
    mockIsSuperAdmin.mockResolvedValue(true);

    await expect(
      PermissionService.batchCheckPermissions(42, [11, 12], "VIEW")
    ).resolves.toEqual({ 11: true, 12: true });
    expect(mockGetUserById).toHaveBeenCalledWith(42);
    expect(mockIsSuperAdmin).toHaveBeenCalledWith("rbac-super-admin");
    expect(mockGetDb).not.toHaveBeenCalled();
  });

  it("falls back to the numeric user id when no openId record exists", async () => {
    mockGetUserById.mockResolvedValue(undefined);
    mockIsSuperAdmin.mockResolvedValue(true);

    await expect(
      PermissionService.hasPermission(42, 1001, "MANAGE")
    ).resolves.toBe(true);
    expect(mockIsSuperAdmin).toHaveBeenCalledWith("42");
  });
});
