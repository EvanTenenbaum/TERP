import { describe, it, expect, vi } from "vitest";
import type { Request, Response } from "express";
import { setupDbMock } from "../test-utils/testDb";

const adminUser = {
  id: 1,
  role: "admin" as const,
  email: "admin@terp.test",
  name: "Admin User",
};

const createHarness = async () => {
  // Ensure each test has a fresh mocked DB instance (no cross-test bleed).
  vi.resetModules();
  vi.doMock("../db", () => setupDbMock());

  const [{ appRouter }, { createContext }, { db }, { productImages }] =
    await Promise.all([
      import("../routers"),
      import("../_core/context"),
      import("../db"),
      import("../../drizzle/schema"),
    ]);

  const req = { headers: {}, cookies: {} } as Request;
  const res = {} as Response;
  const ctx = await createContext({ req, res });

  const caller = appRouter.createCaller({
    ...ctx,
    user: adminUser,
  });

  return { caller, db, productImages };
};

describe("Photography Router - markComplete guards", () => {
  it("rejects completion when there are zero photos", async () => {
    const { caller } = await createHarness();

    await expect(
      caller.photography.markComplete({ batchId: 12345 })
    ).rejects.toThrow(/At least one photo is required/i);
  });

  it("allows completion when imageUrls are provided (creates photos)", async () => {
    const { caller, db, productImages } = await createHarness();
    const batchId = 111;

    await caller.photography.markComplete({
      batchId,
      imageUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });

    const rows = await db.select().from(productImages);

    expect(rows.length).toBe(2);
    expect(rows.some(r => r.isPrimary)).toBe(true);
  });

  it("repairs primary when photos exist but none are primary", async () => {
    const { caller, db, productImages } = await createHarness();
    const batchId = 222;

    await db.insert(productImages).values({
      batchId,
      imageUrl: "https://example.com/x.jpg",
      isPrimary: false,
      sortOrder: 0,
      status: "APPROVED",
      uploadedBy: adminUser.id,
      uploadedAt: new Date(),
    });

    await caller.photography.markComplete({ batchId });

    const rows = await db.select().from(productImages);

    expect(rows.length).toBe(1);
    expect(rows[0]?.isPrimary).toBe(true);
  });
});
