import { describe, expect, it } from "vitest";

import { mapPickPackDisplayStatus } from "./pickPack";

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
