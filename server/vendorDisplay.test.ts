import { describe, expect, it } from "vitest";

import { getVendorDisplayName } from "./vendorDisplay";

describe("getVendorDisplayName", () => {
  it("prefers the direct canonical client name", () => {
    expect(
      getVendorDisplayName(42, "North Coast Supply", "Legacy Mapping Name")
    ).toBe("North Coast Supply");
  });

  it("falls back to the mapped supplier name when direct lookup is missing", () => {
    expect(getVendorDisplayName(42, null, "Legacy Mapping Name")).toBe(
      "Legacy Mapping Name"
    );
  });

  it("uses a user-facing supplier fallback only when no real name is available", () => {
    expect(getVendorDisplayName(42, null, null)).toBe("Supplier #42");
  });
});
