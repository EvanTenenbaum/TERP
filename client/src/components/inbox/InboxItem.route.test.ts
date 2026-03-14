import { describe, expect, it } from "vitest";

import { buildInboxEntityRoute } from "./InboxItem";

describe("buildInboxEntityRoute", () => {
  it("routes core entities into canonical workspace paths", () => {
    expect(buildInboxEntityRoute("order", 55)).toBe("/orders?id=55");
    expect(buildInboxEntityRoute("invoice", 91)).toBe(
      "/accounting?tab=invoices&id=91"
    );
    expect(buildInboxEntityRoute("payment", 12)).toBe(
      "/accounting?tab=payments&id=12"
    );
    expect(buildInboxEntityRoute("bill", 16)).toBe(
      "/accounting?tab=bills&id=16"
    );
    expect(buildInboxEntityRoute("batch", 478)).toBe("/inventory?batchId=478");
  });

  it("returns null for unsupported entities", () => {
    expect(buildInboxEntityRoute("unknown", 1)).toBeNull();
  });
});
