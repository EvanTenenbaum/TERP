import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockGetDb, mockGetUserById, mockIsSuperAdmin } = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  mockGetUserById: vi.fn(),
  mockIsSuperAdmin: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: mockGetDb,
  getUserById: mockGetUserById,
}));

vi.mock("../calendarDb");

vi.mock("../_core/cache", () => ({
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

vi.mock("../_core/timezoneService", () => ({
  TimezoneService: {
    convertTimezone: vi.fn(() => ({
      date: "2025-11-01",
      time: "10:00",
    })),
  },
}));

import { calendarRouter } from "./calendar";

describe("Calendar Router super-admin RBAC bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns private events for RBAC-only super admins reached through numeric actor ids", async () => {
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockReturnThis(),
    };

    mockGetDb.mockResolvedValue(mockDb);
    mockGetUserById.mockResolvedValue({
      id: 42,
      openId: "rbac-super-admin",
    });
    mockIsSuperAdmin.mockImplementation(
      async userId => userId === "rbac-super-admin"
    );

    mockDb.where.mockReturnValueOnce(mockDb);
    mockDb.limit.mockReturnValueOnce(mockDb);
    mockDb.offset.mockResolvedValueOnce([
      {
        id: 7,
        title: "Private finance review",
        startDate: "2025-11-01",
        endDate: "2025-11-01",
        startTime: "10:00:00",
        endTime: "11:00:00",
        timezone: "America/Los_Angeles",
        createdBy: 9,
        assignedTo: 11,
        visibility: "PRIVATE",
        deletedAt: null,
      },
    ]);
    mockDb.where.mockResolvedValueOnce([]);

    const caller = calendarRouter.createCaller({
      user: { id: 42, openId: "rbac-super-admin" },
    } as { user: { id: number; openId: string } });

    const result = await caller.getEvents({
      startDate: "2025-11-01",
      endDate: "2025-11-30",
    });

    expect(mockGetUserById).toHaveBeenCalledWith(42);
    expect(mockIsSuperAdmin).toHaveBeenCalledWith("rbac-super-admin");
    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(7);
  });
});
