import { describe, expect, it } from "vitest";
import { getStatusBadgeVariant } from "./statusBadge";

describe("getStatusBadgeVariant", () => {
  it("maps active states to default", () => {
    expect(getStatusBadgeVariant("active")).toBe("default");
    expect(getStatusBadgeVariant("READY_FOR_PACKING")).toBe("default");
    expect(getStatusBadgeVariant("triggered")).toBe("default");
  });

  it("maps draft and scheduled states to secondary", () => {
    expect(getStatusBadgeVariant("draft")).toBe("secondary");
    expect(getStatusBadgeVariant("scheduled")).toBe("secondary");
    expect(getStatusBadgeVariant("reviewed")).toBe("secondary");
  });

  it("maps danger states to destructive", () => {
    expect(getStatusBadgeVariant("overdue")).toBe("destructive");
    expect(getStatusBadgeVariant("blocked")).toBe("destructive");
  });

  it("maps completed states to outline", () => {
    expect(getStatusBadgeVariant("completed")).toBe("outline");
    expect(getStatusBadgeVariant("paid")).toBe("outline");
    expect(getStatusBadgeVariant("archived")).toBe("outline");
  });

  it("falls back to outline for unknown statuses", () => {
    expect(getStatusBadgeVariant("mystery-status")).toBe("outline");
  });
});
