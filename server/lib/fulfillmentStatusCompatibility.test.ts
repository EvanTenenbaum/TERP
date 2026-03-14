import { beforeEach, describe, expect, it, vi } from "vitest";

import { getDb } from "../db";
import {
  getStoredFulfillmentStatus,
  resetFulfillmentStatusCompatibilityCacheForTests,
} from "./fulfillmentStatusCompatibility";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

describe("fulfillmentStatusCompatibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetFulfillmentStatusCompatibilityCacheForTests();
  });

  it("maps READY_FOR_PACKING to legacy PENDING enums", async () => {
    vi.mocked(getDb).mockResolvedValue({
      execute: vi.fn().mockResolvedValue([
        [
          {
            COLUMN_TYPE:
              "enum('DRAFT','CONFIRMED','PENDING','PACKED','SHIPPED','DELIVERED','RETURNED','RESTOCKED','RETURNED_TO_VENDOR','CANCELLED')",
          },
        ],
      ]),
    } as Awaited<ReturnType<typeof getDb>>);

    await expect(getStoredFulfillmentStatus("READY_FOR_PACKING")).resolves.toBe(
      "PENDING"
    );
  });

  it("keeps READY_FOR_PACKING when the enum already supports it", async () => {
    vi.mocked(getDb).mockResolvedValue({
      execute: vi.fn().mockResolvedValue([
        [
          {
            COLUMN_TYPE:
              "enum('DRAFT','CONFIRMED','READY_FOR_PACKING','PACKED','SHIPPED')",
          },
        ],
      ]),
    } as Awaited<ReturnType<typeof getDb>>);

    await expect(getStoredFulfillmentStatus("READY_FOR_PACKING")).resolves.toBe(
      "READY_FOR_PACKING"
    );
  });
});
