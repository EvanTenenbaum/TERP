import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RelationshipRoleBadge } from "./RelationshipRoleBadge";
import { RELATIONSHIP_ROLE_TOKENS } from "@/lib/statusTokens";

describe("RelationshipRoleBadge", () => {
  it("renders semantic token classes for known relationship roles", () => {
    render(
      <>
        <RelationshipRoleBadge role="Customer" />
        <RelationshipRoleBadge role="Supplier" />
      </>
    );

    expect(
      screen.getByTestId("relationship-role-badge-Customer").className
    ).toContain(RELATIONSHIP_ROLE_TOKENS.Customer);
    expect(
      screen.getByTestId("relationship-role-badge-Supplier").className
    ).toContain(RELATIONSHIP_ROLE_TOKENS.Supplier);
  });
});
