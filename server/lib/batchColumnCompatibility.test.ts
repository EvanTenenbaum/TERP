import { beforeEach, describe, expect, it, vi } from "vitest";

import { batches } from "../../drizzle/schema";
import {
  getCompatibleBatchSelect,
  resetBatchColumnCompatibilityCacheForTests,
} from "./batchColumnCompatibility";
import { getDb } from "../db";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("batchColumnCompatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetBatchColumnCompatibilityCacheForTests();
  });

  it("returns native batch columns when the full schema is available", async () => {
    const execute = vi.fn().mockResolvedValue([
      [
        { COLUMN_NAME: "deleted_at" },
        { COLUMN_NAME: "version" },
        { COLUMN_NAME: "isPhotographyComplete" },
        { COLUMN_NAME: "paymentTerms" },
        { COLUMN_NAME: "ownership_type" },
        { COLUMN_NAME: "amountPaid" },
        { COLUMN_NAME: "photo_session_event_id" },
        { COLUMN_NAME: "quarantineQty" },
        { COLUMN_NAME: "holdQty" },
        { COLUMN_NAME: "defectiveQty" },
        { COLUMN_NAME: "publishEcom" },
        { COLUMN_NAME: "publishB2b" },
      ],
    ]);

    vi.mocked(getDb).mockResolvedValue({
      execute,
    } as Awaited<ReturnType<typeof getDb>>);

    const select = await getCompatibleBatchSelect();

    expect(select.deletedAt).toBe(batches.deletedAt);
    expect(select.isPhotographyComplete).toBe(batches.isPhotographyComplete);
    expect(select.paymentTerms).toBe(batches.paymentTerms);
    expect(select.ownershipType).toBe(batches.ownershipType);
    expect(select.amountPaid).toBe(batches.amountPaid);
  });

  it("synthesizes safe defaults for missing optional batch columns", async () => {
    const execute = vi.fn().mockResolvedValue([
      [
        { COLUMN_NAME: "id" },
        { COLUMN_NAME: "code" },
        { COLUMN_NAME: "sku" },
        { COLUMN_NAME: "productId" },
        { COLUMN_NAME: "lotId" },
        { COLUMN_NAME: "batchStatus" },
        { COLUMN_NAME: "onHandQty" },
        { COLUMN_NAME: "sampleQty" },
        { COLUMN_NAME: "reservedQty" },
        { COLUMN_NAME: "createdAt" },
        { COLUMN_NAME: "updatedAt" },
      ],
    ]);

    vi.mocked(getDb).mockResolvedValue({
      execute,
    } as Awaited<ReturnType<typeof getDb>>);

    const select = await getCompatibleBatchSelect();

    expect(select.isPhotographyComplete).not.toBe(
      batches.isPhotographyComplete
    );
    expect(select.paymentTerms).not.toBe(batches.paymentTerms);
    expect(select.ownershipType).not.toBe(batches.ownershipType);
    expect(select.amountPaid).not.toBe(batches.amountPaid);
    expect(select.photoSessionEventId).not.toBe(batches.photoSessionEventId);
  });

  it("falls back to SHOW COLUMNS when information_schema is unavailable", async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("information_schema denied"))
      .mockResolvedValueOnce([
        [
          { Field: "id" },
          { Field: "code" },
          { Field: "sku" },
          { Field: "productId" },
          { Field: "lotId" },
          { Field: "batchStatus" },
          { Field: "onHandQty" },
          { Field: "sampleQty" },
          { Field: "reservedQty" },
          { Field: "createdAt" },
          { Field: "updatedAt" },
        ],
      ]);

    vi.mocked(getDb).mockResolvedValue({
      execute,
    } as Awaited<ReturnType<typeof getDb>>);

    const select = await getCompatibleBatchSelect();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(select.deletedAt).not.toBe(batches.deletedAt);
    expect(select.isPhotographyComplete).not.toBe(
      batches.isPhotographyComplete
    );
  });

  it("uses a conservative legacy column set when schema detection fails entirely", async () => {
    const execute = vi
      .fn()
      .mockRejectedValueOnce(new Error("information_schema denied"))
      .mockRejectedValueOnce(new Error("show columns denied"));

    vi.mocked(getDb).mockResolvedValue({
      execute,
    } as Awaited<ReturnType<typeof getDb>>);

    const select = await getCompatibleBatchSelect();

    expect(execute).toHaveBeenCalledTimes(2);
    expect(select.deletedAt).not.toBe(batches.deletedAt);
    expect(select.version).not.toBe(batches.version);
    expect(select.isPhotographyComplete).not.toBe(
      batches.isPhotographyComplete
    );
    expect(select.paymentTerms).not.toBe(batches.paymentTerms);
  });
});
