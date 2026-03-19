import { describe, expect, it, vi } from "vitest";

vi.mock("ag-grid-enterprise", () => ({
  LicenseManager: {
    setLicenseKey: vi.fn(),
  },
}));

import { normalizeAgGridLicenseKey } from "./ag-grid-license";

describe("normalizeAgGridLicenseKey", () => {
  it("returns null for nullish or blank values", () => {
    expect(normalizeAgGridLicenseKey(undefined)).toBeNull();
    expect(normalizeAgGridLicenseKey(null)).toBeNull();
    expect(normalizeAgGridLicenseKey("")).toBeNull();
    expect(normalizeAgGridLicenseKey("   ")).toBeNull();
  });

  it("trims surrounding whitespace from configured keys", () => {
    expect(normalizeAgGridLicenseKey("  test-license-key  ")).toBe(
      "test-license-key"
    );
  });
});
