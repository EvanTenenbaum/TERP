import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockGetDb: vi.fn(),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("../db", () => ({
  getDb: mocks.mockGetDb,
}));

vi.mock("../_core/logger", () => ({
  logger: mocks.logger,
}));

const buildPayload = () => ({
  code: "BATCH-001",
  sku: "SKU-001",
  productId: 1,
  lotId: 2,
  batchStatus: "AWAITING_INTAKE",
  grade: "A",
  isSample: 0,
  sampleOnly: 0,
  sampleAvailable: 0,
  cogsMode: "FIXED",
  unitCogs: "25.0000",
  unitCogsMin: null,
  unitCogsMax: null,
  paymentTerms: "CONSIGNMENT",
  ownershipType: "CONSIGNED",
  amountPaid: "0",
  metadata: "{\"poNumber\":\"PO-1\"}",
  onHandQty: "10",
  sampleQty: "0",
  reservedQty: "0",
  quarantineQty: "0",
  holdQty: "0",
  defectiveQty: "0",
});

describe("batchInsertCompatibility", () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.mockGetDb.mockReset();
    mocks.logger.info.mockReset();
    mocks.logger.warn.mockReset();
  });

  it("omits unavailable modern-only columns for legacy staging schemas", async () => {
    const { buildCompatibleBatchInsertEntries } = await import(
      "./batchInsertCompatibility"
    );

    const entries = buildCompatibleBatchInsertEntries(
      new Set([
        "code",
        "sku",
        "productId",
        "lotId",
        "batchStatus",
        "grade",
        "cogsMode",
        "unitCogs",
        "paymentTerms",
        "ownership_type",
        "metadata",
        "onHandQty",
        "sampleQty",
        "reservedQty",
        "quarantineQty",
        "holdQty",
        "defectiveQty",
        "createdAt",
        "updatedAt",
      ]),
      buildPayload()
    );

    const columns = entries.map(([column]) => column);
    expect(columns).not.toContain("deleted_at");
    expect(columns).not.toContain("isPhotographyComplete");
    expect(columns).toContain("code");
    expect(columns).toContain("onHandQty");
    expect(columns).toContain("ownership_type");
  });

  it("logs once when the staging schema is missing modern batch columns", async () => {
    mocks.mockGetDb.mockResolvedValue({
      execute: vi.fn().mockResolvedValue([
        [
          { columnName: "code" },
          { columnName: "sku" },
          { columnName: "productId" },
          { columnName: "lotId" },
          { columnName: "batchStatus" },
        ],
      ]),
    });

    const { getBatchColumnSet } = await import("./batchInsertCompatibility");

    const columns = await getBatchColumnSet();
    expect(columns.has("code")).toBe(true);
    expect(columns.has("deleted_at")).toBe(false);
    expect(columns.has("isPhotographyComplete")).toBe(false);
    expect(mocks.logger.info).toHaveBeenCalledTimes(1);
  });

  it("executes a compatible insert and returns insertId from mysql array results", async () => {
    mocks.mockGetDb.mockResolvedValue({
      execute: vi.fn().mockResolvedValue([
        [
          { columnName: "code" },
          { columnName: "version" },
          { columnName: "sku" },
          { columnName: "productId" },
          { columnName: "lotId" },
          { columnName: "batchStatus" },
          { columnName: "grade" },
          { columnName: "cogsMode" },
          { columnName: "unitCogs" },
          { columnName: "paymentTerms" },
          { columnName: "ownership_type" },
          { columnName: "metadata" },
          { columnName: "onHandQty" },
          { columnName: "sampleQty" },
          { columnName: "reservedQty" },
          { columnName: "quarantineQty" },
          { columnName: "holdQty" },
          { columnName: "defectiveQty" },
          { columnName: "createdAt" },
          { columnName: "updatedAt" },
        ],
      ]),
    });

    const tx = {
      execute: vi.fn().mockResolvedValue([{ insertId: 42 }]),
    };

    const { insertBatchWithCompatibility } = await import(
      "./batchInsertCompatibility"
    );

    await expect(insertBatchWithCompatibility(tx, buildPayload())).resolves.toBe(
      42
    );
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it("returns insertId when drizzle exposes a direct result header", async () => {
    mocks.mockGetDb.mockResolvedValue({
      execute: vi.fn().mockResolvedValue([
        [
          { columnName: "code" },
          { columnName: "version" },
          { columnName: "sku" },
          { columnName: "productId" },
          { columnName: "lotId" },
          { columnName: "batchStatus" },
          { columnName: "grade" },
          { columnName: "cogsMode" },
          { columnName: "unitCogs" },
          { columnName: "paymentTerms" },
          { columnName: "ownership_type" },
          { columnName: "metadata" },
          { columnName: "onHandQty" },
          { columnName: "sampleQty" },
          { columnName: "reservedQty" },
          { columnName: "quarantineQty" },
          { columnName: "holdQty" },
          { columnName: "defectiveQty" },
          { columnName: "createdAt" },
          { columnName: "updatedAt" },
        ],
      ]),
    });

    const tx = {
      execute: vi.fn().mockResolvedValue({ insertId: 77 }),
    };

    const { insertBatchWithCompatibility } = await import(
      "./batchInsertCompatibility"
    );

    await expect(insertBatchWithCompatibility(tx, buildPayload())).resolves.toBe(
      77
    );
    expect(tx.execute).toHaveBeenCalledTimes(1);
  });

  it("preserves intake-specific ownership and grade values when the schema supports them", async () => {
    const { buildCompatibleBatchInsertEntries } = await import(
      "./batchInsertCompatibility"
    );

    const entries = buildCompatibleBatchInsertEntries(
      new Set(["grade", "ownership_type", "amountPaid"]),
      {
        ...buildPayload(),
        grade: "Premium",
        ownershipType: "OFFICE_OWNED",
        amountPaid: "125.00",
      }
    );

    expect(entries).toEqual([
      ["grade", "Premium"],
      ["ownership_type", "OFFICE_OWNED"],
      ["amountPaid", "125.00"],
    ]);
  });
});
