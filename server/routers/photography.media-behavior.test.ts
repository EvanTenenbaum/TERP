/**
 * @vitest-environment node
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import type { TrpcContext } from "../_core/context";

vi.mock("../db", () => setupDbMock());
const permissionMocks = vi.hoisted(() => ({
  hasPermission: vi.fn().mockResolvedValue(true),
  hasAllPermissions: vi.fn().mockResolvedValue(true),
  hasAnyPermission: vi.fn().mockResolvedValue(true),
  isSuperAdmin: vi.fn().mockResolvedValue(false),
  getUserPermissions: vi.fn().mockResolvedValue(new Set(["*"])),
  getUserRoles: vi
    .fn()
    .mockResolvedValue([{ id: 1, name: "Inventory Manager" }]),
  clearPermissionCache: vi.fn(),
}));

vi.mock("../services/permissionService", () => ({
  ...permissionMocks,
  default: permissionMocks,
}));

import { photographyRouter, isVisibleImageStatus } from "./photography";
import { db } from "../db";

function mockSelectSequence(resultSets: unknown[][]): void {
  let i = 0;
  vi.mocked(db.select).mockImplementation((() => {
    const rows = resultSets[i++] ?? [];
    const builder: {
      from: ReturnType<typeof vi.fn>;
      leftJoin: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
      orderBy: ReturnType<typeof vi.fn>;
      groupBy: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      offset: ReturnType<typeof vi.fn>;
      then: (resolve: (value: unknown[]) => unknown) => unknown;
    } = {
      from: vi.fn(() => builder),
      leftJoin: vi.fn(() => builder),
      where: vi.fn(() => builder),
      orderBy: vi.fn(() => builder),
      groupBy: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      offset: vi.fn(() => builder),
      then: resolve => resolve(rows),
    };
    return builder;
  }) as never);
}

const now = new Date();
const adminUser = {
  id: 1,
  openId: "admin-1",
  email: "admin@terp.test",
  name: "Admin User",
  role: "admin" as const,
  loginMethod: null,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

const standardUser = {
  id: 2,
  openId: "user-2",
  email: "user@terp.test",
  name: "Standard User",
  role: "user" as const,
  loginMethod: null,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
  lastSignedIn: now,
};

const baseContext = {
  req: { headers: {} } as TrpcContext["req"],
  res: {} as TrpcContext["res"],
  isPublicDemoUser: false,
};

function createAdminCaller() {
  return photographyRouter.createCaller({
    ...baseContext,
    user: adminUser,
  });
}

function createUserCaller() {
  return photographyRouter.createCaller({
    ...baseContext,
    user: standardUser,
  });
}

describe("photographyRouter media behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    permissionMocks.hasPermission.mockResolvedValue(true);
    permissionMocks.hasAllPermissions.mockResolvedValue(true);
    permissionMocks.hasAnyPermission.mockResolvedValue(true);
    permissionMocks.isSuperAdmin.mockResolvedValue(false);
  });

  it("treats only pending/approved/null statuses as visible", () => {
    expect(isVisibleImageStatus(null)).toBe(true);
    expect(isVisibleImageStatus(undefined)).toBe(true);
    expect(isVisibleImageStatus("APPROVED")).toBe(true);
    expect(isVisibleImageStatus("PENDING")).toBe(true);
    expect(isVisibleImageStatus("ARCHIVED")).toBe(false);
    expect(isVisibleImageStatus("REJECTED")).toBe(false);
  });

  it("reassigns visible primary after admin delete", async () => {
    mockSelectSequence([
      [{ batchId: 101, productId: null }],
      [{ id: 5001, isPrimary: false, sortOrder: 1 }],
    ]);

    const updateWhere = vi.fn().mockResolvedValue({ changes: 1 });
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    vi.mocked(db.update).mockReturnValue({ set: updateSet } as never);

    await createAdminCaller().delete({ imageId: 5000 });

    // Soft delete: first update sets deletedAt, then primary reassignment
    expect(updateSet).toHaveBeenCalledTimes(3);
    expect(updateSet.mock.calls[0][0]).toMatchObject({
      deletedAt: expect.any(Date),
    });
    expect(updateSet).toHaveBeenNthCalledWith(2, { isPrimary: false });
    expect(updateSet).toHaveBeenNthCalledWith(3, { isPrimary: true });
  });

  it("reassigns visible primary after protected deletePhoto", async () => {
    mockSelectSequence([
      [{ id: 7000, batchId: 102, productId: null, isPrimary: true }],
      [{ id: 7001, isPrimary: false, sortOrder: 0 }],
    ]);

    const updateWhere = vi.fn().mockResolvedValue({ changes: 1 });
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    vi.mocked(db.update).mockReturnValue({ set: updateSet } as never);

    await createUserCaller().deletePhoto({ photoId: 7000 });

    // Soft delete: first update sets deletedAt, then primary reassignment
    expect(updateSet).toHaveBeenCalledTimes(3);
    expect(updateSet.mock.calls[0][0]).toMatchObject({
      deletedAt: expect.any(Date),
    });
    expect(updateSet).toHaveBeenNthCalledWith(2, { isPrimary: false });
    expect(updateSet).toHaveBeenNthCalledWith(3, { isPrimary: true });
  });

  it("rejects completeSession when batch has only hidden photos", async () => {
    mockSelectSequence([
      [{ id: 300, metadata: null }],
      [
        { id: 1, status: "ARCHIVED", isPrimary: true },
        { id: 2, status: "REJECTED", isPrimary: false },
      ],
    ]);

    await expect(
      createUserCaller().completeSession({ batchId: 300 })
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "At least one photo is required to complete photography",
    });
  });

  it("computes coverage from visible-image counts", async () => {
    mockSelectSequence([
      [{ count: 12 }], // total visible images
      [{ count: 3 }], // live batches without visible photos
      [{ count: 15 }], // total live batches
    ]);

    const stats = await createAdminCaller().getStats();

    expect(stats).toEqual({
      totalImages: 12,
      batchesWithPhotos: 12,
      batchesWithoutPhotos: 3,
      coveragePercent: 80,
    });
  });

  it("allows a non-admin inventory user to read the photography queue", async () => {
    mockSelectSequence([
      [
        {
          batchId: 42,
          batchCode: "BATCH-42",
          batchStatus: "LIVE",
          productName: "Blue Dream",
          strainName: "Blue Dream",
          createdAt: now,
          hasImages: 0,
        },
      ],
      [
        {
          batchId: 42,
          batchStatus: "LIVE",
          createdAt: now,
          hasImages: 0,
        },
      ],
    ]);

    const queue = await createUserCaller().getQueue({});

    expect(permissionMocks.hasPermission).toHaveBeenCalledWith(
      "user-2",
      "inventory:read"
    );
    expect(queue.items).toHaveLength(1);
    expect(queue.items[0]).toMatchObject({
      batchId: 42,
      productName: "Blue Dream",
      status: "PENDING",
    });
  });

  it("blocks queue access when the user lacks inventory read permission", async () => {
    permissionMocks.hasPermission.mockResolvedValue(false);

    await expect(createUserCaller().getQueue({})).rejects.toMatchObject({
      code: "FORBIDDEN",
      message:
        "You do not have permission to perform this action. Required permission: inventory:read",
    });
  });

  it("allows a non-admin inventory user to complete photography when update permission is granted", async () => {
    mockSelectSequence([
      [{ id: 300, productId: 12 }],
      [],
      [{ id: 9001, isPrimary: true, status: "APPROVED", sortOrder: 0 }],
    ]);

    const updateWhere = vi.fn().mockResolvedValue({ changes: 1 });
    const updateSet = vi.fn(() => ({ where: updateWhere }));
    vi.mocked(db.update).mockReturnValue({ set: updateSet } as never);

    const result = await createUserCaller().markComplete({ batchId: 300 });

    expect(permissionMocks.hasPermission).toHaveBeenCalledWith(
      "user-2",
      "inventory:update"
    );
    expect(result).toEqual({ success: true });
    expect(updateSet).toHaveBeenCalledWith({
      isPhotographyComplete: true,
      updatedAt: expect.any(Date),
    });
  });

  it("blocks completion when the user lacks inventory update permission", async () => {
    permissionMocks.hasPermission.mockResolvedValue(false);

    await expect(
      createUserCaller().markComplete({ batchId: 300 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message:
        "You do not have permission to perform this action. Required permission: inventory:update",
    });
  });
});
