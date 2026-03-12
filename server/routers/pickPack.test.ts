import { describe, expect, it } from "vitest";

import { isPickPackQueueEligible, mapPickPackDisplayStatus } from "./pickPack";

describe("isPickPackQueueEligible", () => {
  it("allows only non-draft sales into the queue", () => {
    expect(isPickPackQueueEligible({ orderType: "SALE", isDraft: false })).toBe(
      true
    );
    expect(isPickPackQueueEligible({ orderType: "sale", isDraft: 0 })).toBe(
      true
    );
    expect(isPickPackQueueEligible({ orderType: "QUOTE", isDraft: 1 })).toBe(
      false
    );
    expect(isPickPackQueueEligible({ orderType: "SALE", isDraft: true })).toBe(
      false
    );
    expect(isPickPackQueueEligible({ orderType: "SALE", isDraft: null })).toBe(
      false
    );
  });
});

describe("mapPickPackDisplayStatus", () => {
  it("defaults missing statuses to pending", () => {
    expect(mapPickPackDisplayStatus(null, null)).toBe("PENDING");
  });

  it("collapses active in-flight work into partial", () => {
    expect(mapPickPackDisplayStatus("PICKING", "READY_FOR_PACKING")).toBe(
      "PARTIAL"
    );
    expect(mapPickPackDisplayStatus("PACKED", "PACKED")).toBe("PARTIAL");
  });

  it("keeps ready orders distinct until fulfillment closes them", () => {
    expect(mapPickPackDisplayStatus("READY", "PACKED")).toBe("READY");
  });

  it("marks shipped fulfillment states as shipped regardless of pick-pack status", () => {
    expect(mapPickPackDisplayStatus("READY", "SHIPPED")).toBe("SHIPPED");
    expect(mapPickPackDisplayStatus("PENDING", "DELIVERED")).toBe("SHIPPED");
  });
});
