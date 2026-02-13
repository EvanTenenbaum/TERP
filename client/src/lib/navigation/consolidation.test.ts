import { describe, expect, it } from "vitest";
import { resolveRelationshipsTab } from "./consolidation";

describe("resolveRelationshipsTab", () => {
  it("defaults to clients when no tab or seller filter exists", () => {
    expect(resolveRelationshipsTab("")).toBe("clients");
    expect(resolveRelationshipsTab("?hasDebt=true")).toBe("clients");
  });

  it("keeps valid explicit tabs", () => {
    expect(resolveRelationshipsTab("?tab=clients")).toBe("clients");
    expect(resolveRelationshipsTab("?tab=suppliers")).toBe("suppliers");
  });

  it("routes seller-oriented legacy filters to suppliers", () => {
    expect(resolveRelationshipsTab("?clientTypes=seller")).toBe("suppliers");
    expect(resolveRelationshipsTab("?clientTypes=buyer,seller")).toBe(
      "suppliers"
    );
  });

  it("falls back from invalid tab values using seller filter detection", () => {
    expect(resolveRelationshipsTab("?tab=unknown&clientTypes=seller")).toBe(
      "suppliers"
    );
    expect(resolveRelationshipsTab("?tab=unknown")).toBe("clients");
  });
});
