import { describe, expect, it } from "vitest";

import {
  getDefaultQuoteValidUntilDate,
  resolveQuoteValidUntilDate,
} from "./quoteValidity";

describe("quoteValidity", () => {
  it("defaults quote validity to about 30 days from now", () => {
    const now = Date.now();
    const validUntil = getDefaultQuoteValidUntilDate().getTime();
    const diffDays = (validUntil - now) / (24 * 60 * 60 * 1000);

    expect(diffDays).toBeGreaterThan(29);
    expect(diffDays).toBeLessThan(31);
  });

  it("preserves explicit quote validity inputs", () => {
    expect(
      resolveQuoteValidUntilDate("2026-05-01T00:00:00.000Z").toISOString()
    ).toBe("2026-05-01T00:00:00.000Z");
  });
});
