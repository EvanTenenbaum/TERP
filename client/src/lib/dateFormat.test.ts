import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "./dateFormat";

describe("dateFormat display helpers", () => {
  it("formats ISO timestamps for display instead of exposing raw values", () => {
    expect(
      formatDate("2026-04-09T12:34:56.000Z", "medium", "MM/DD/YYYY")
    ).toBe("04/09/2026");
  });

  it("formats ISO timestamps with time for display", () => {
    expect(
      formatDateTime(
        "2026-04-09T12:34:56.000Z",
        "medium",
        "short",
        "MM/DD/YYYY"
      )
    ).toContain("04/09/2026");
  });

  it("returns N/A for invalid display dates", () => {
    expect(formatDate("not-a-date", "medium", "MM/DD/YYYY")).toBe("N/A");
  });
});
