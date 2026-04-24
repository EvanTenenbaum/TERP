/**
 * PermissionService.batchCheckPermissions — unit tests
 *
 * Tests the creator-bypass (admin) path: when a user created all events,
 * batchCheckPermissions returns true for all event IDs.
 *
 * Also covers:
 *  - Empty eventIds returns empty map
 *  - Non-creator with COMPANY visibility gets VIEW
 *  - Non-creator with PRIVATE visibility is denied
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { setupDbMock } from "../test-utils/testDb";

// Mock dependencies BEFORE imports
vi.mock("./db", () => setupDbMock());
vi.mock("../services/permissionService", () => ({
  isSuperAdmin: vi.fn().mockResolvedValue(false),
}));
vi.mock("./cache", () => ({
  default: {
    get: vi.fn().mockReturnValue(null),
    set: vi.fn(),
    delete: vi.fn(),
    clear: vi.fn(),
  },
  CacheKeys: {
    calendarEventPermission: vi.fn(
      (userId: number, eventId: number, perm: string) =>
        `cal:perm:${userId}:${eventId}:${perm}`
    ),
  },
  CacheTTL: {
    SHORT: 60,
    MEDIUM: 300,
    LONG: 3600,
  },
}));

import { PermissionService } from "./permissionService";
import { getDb } from "./db";

describe("PermissionService.batchCheckPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty map when eventIds is empty", async () => {
    const result = await PermissionService.batchCheckPermissions(1, [], "VIEW");
    expect(result).toEqual({});
  });

  it("admin bypass: creator user gets true for all their events", async () => {
    const adminUserId = 42;

    // Mock db: returns events all created by adminUserId
    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
    };

    const mockEvents = [
      {
        id: 10,
        createdBy: adminUserId,
        assignedTo: null,
        visibility: "PRIVATE",
        deletedAt: null,
      },
      {
        id: 11,
        createdBy: adminUserId,
        assignedTo: null,
        visibility: "PRIVATE",
        deletedAt: null,
      },
      {
        id: 12,
        createdBy: adminUserId,
        assignedTo: null,
        visibility: "PRIVATE",
        deletedAt: null,
      },
    ];

    // First where call: fetching events → return mockEvents
    // Second where call: fetching explicit permissions → return []
    mockDb.where.mockResolvedValueOnce(mockEvents).mockResolvedValueOnce([]);

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await PermissionService.batchCheckPermissions(
      adminUserId,
      [10, 11, 12],
      "MANAGE"
    );

    // Creator always has MANAGE — all three should be true
    expect(result[10]).toBe(true);
    expect(result[11]).toBe(true);
    expect(result[12]).toBe(true);
  });

  it("non-creator with COMPANY visibility gets VIEW permission", async () => {
    const viewerId = 99;
    const creatorId = 1;

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
    };

    const mockEvents = [
      {
        id: 20,
        createdBy: creatorId,
        assignedTo: null,
        visibility: "COMPANY",
        deletedAt: null,
      },
    ];

    mockDb.where.mockResolvedValueOnce(mockEvents).mockResolvedValueOnce([]);

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await PermissionService.batchCheckPermissions(
      viewerId,
      [20],
      "VIEW"
    );

    expect(result[20]).toBe(true);
  });

  it("non-creator with PRIVATE visibility is denied VIEW", async () => {
    const viewerId = 99;
    const creatorId = 1;

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
    };

    const mockEvents = [
      {
        id: 30,
        createdBy: creatorId,
        assignedTo: null,
        visibility: "PRIVATE",
        deletedAt: null,
      },
    ];

    mockDb.where.mockResolvedValueOnce(mockEvents).mockResolvedValueOnce([]);

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await PermissionService.batchCheckPermissions(
      viewerId,
      [30],
      "VIEW"
    );

    // Private event — non-creator is denied
    expect(result[30]).toBe(false);
  });

  it("event IDs not found in the database get false", async () => {
    const userId = 7;

    const mockDb = {
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn(),
    };

    // Database returns no events (e.g. deleted or non-existent)
    mockDb.where.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await PermissionService.batchCheckPermissions(
      userId,
      [999, 1000],
      "VIEW"
    );

    expect(result[999]).toBe(false);
    expect(result[1000]).toBe(false);
  });
});
