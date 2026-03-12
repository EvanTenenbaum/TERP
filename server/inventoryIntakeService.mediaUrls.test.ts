import { describe, expect, it, vi, beforeEach } from "vitest";
import { eq } from "drizzle-orm";
import { createMockDb } from "./test-utils/testDb";

const { getDbMock } = vi.hoisted(() => ({
  getDbMock: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: getDbMock,
}));

// Inventory code generation uses a DB sequence; mock it so processIntake is deterministic in tests.
vi.mock("./sequenceDb", () => ({
  getNextSequence: vi.fn(async (name: string, length: number) => {
    const prefix = name === "lot_code" ? "LOT-" : "BATCH-";
    return `${prefix}${"1".repeat(length)}`;
  }),
}));

vi.mock("./lib/batchInsertCompatibility", async () => {
  const { batches } = await import("../drizzle/schema");

  return {
    insertBatchWithCompatibility: vi.fn(async (tx, payload) => {
      const [created] = await tx
        .insert(batches)
        .values({
          code: payload.code,
          sku: payload.sku,
          productId: payload.productId,
          lotId: payload.lotId,
          batchStatus: payload.batchStatus,
          grade: payload.grade ?? null,
          cogsMode: payload.cogsMode,
          unitCogs: payload.unitCogs,
          unitCogsMin: payload.unitCogsMin,
          unitCogsMax: payload.unitCogsMax,
          paymentTerms: payload.paymentTerms,
          ownershipType: payload.ownershipType ?? "CONSIGNED",
          metadata: payload.metadata,
          onHandQty: payload.onHandQty,
          sampleQty: payload.sampleQty,
          reservedQty: payload.reservedQty,
          quarantineQty: payload.quarantineQty,
          holdQty: payload.holdQty,
          defectiveQty: payload.defectiveQty,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        })
        .$returningId();

      return created.id;
    }),
  };
});

import { processIntake } from "./inventoryIntakeService";
import { productImages } from "../drizzle/schema";

describe("inventoryIntakeService - mediaUrls", () => {
  let database: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    database = createMockDb();
    getDbMock.mockResolvedValue(database);
  });

  it("persists intake-uploaded mediaUrls into product_images (batch images)", async () => {
    const result = await processIntake({
      vendorName: "Evergreen Supply",
      brandName: "Evergreen Farms",
      productName: "Blue Dream",
      category: "Flower",
      quantity: 10,
      cogsMode: "FIXED",
      unitCogs: "10.00",
      paymentTerms: "NET_30",
      location: { site: "SITE-1" },
      mediaUrls: [
        {
          url: "https://example.com/a.jpg",
          fileName: "a.jpg",
          fileType: "image/jpeg",
          fileSize: 123,
        },
        {
          url: "https://example.com/b.jpg",
          fileName: "b.jpg",
          fileType: "image/jpeg",
          fileSize: 456,
        },
      ],
      userId: 1,
    });

    const rows = (await database
      .select()
      .from(productImages)
      .where(eq(productImages.batchId, result.batch.id))) as Array<{
      imageUrl?: string;
      isPrimary?: boolean;
    }>;

    expect(rows.length).toBe(2);
    expect(rows.some(r => Boolean(r.isPrimary))).toBe(true);
    expect(rows.map(r => r.imageUrl)).toEqual([
      "https://example.com/a.jpg",
      "https://example.com/b.jpg",
    ]);
  });
});
