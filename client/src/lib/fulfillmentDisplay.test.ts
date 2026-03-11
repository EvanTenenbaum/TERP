import { describe, expect, it } from "vitest";
import {
  getFulfillmentDisplayLabel,
  mapToFulfillmentDisplayStatus,
} from "./fulfillmentDisplay";

describe("fulfillmentDisplay", () => {
  it("maps legacy shipping statuses into the simplified operator vocabulary", () => {
    expect(mapToFulfillmentDisplayStatus("READY_FOR_PACKING")).toBe("PENDING");
    expect(mapToFulfillmentDisplayStatus("PENDING")).toBe("PENDING");
    expect(mapToFulfillmentDisplayStatus("PACKED")).toBe("READY");
    expect(mapToFulfillmentDisplayStatus("SHIPPED")).toBe("SHIPPED");
  });

  it("returns user-facing labels for simplified shipping states", () => {
    expect(getFulfillmentDisplayLabel("READY_FOR_PACKING")).toBe("Pending");
    expect(getFulfillmentDisplayLabel("PACKED")).toBe("Ready");
    expect(getFulfillmentDisplayLabel("SHIPPED")).toBe("Shipped");
  });
});
