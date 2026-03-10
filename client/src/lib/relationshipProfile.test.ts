import {
  buildRelationshipProfilePath,
  resolveRelationshipProfileSection,
} from "./relationshipProfile";

describe("relationshipProfile helpers", () => {
  it("prefers the section query parameter", () => {
    expect(resolveRelationshipProfileSection("?section=money")).toBe("money");
  });

  it("maps legacy tab names into the new sections", () => {
    expect(resolveRelationshipProfileSection("?tab=needs")).toBe(
      "sales-pricing"
    );
    expect(resolveRelationshipProfileSection("?tab=payments")).toBe("money");
    expect(resolveRelationshipProfileSection("?tab=calendar")).toBe("activity");
  });

  it("falls back to overview", () => {
    expect(resolveRelationshipProfileSection("")).toBe("overview");
    expect(resolveRelationshipProfileSection("?tab=unknown")).toBe("overview");
  });

  it("builds canonical section paths", () => {
    expect(buildRelationshipProfilePath(42, "activity")).toBe(
      "/clients/42?section=activity"
    );
  });
});
