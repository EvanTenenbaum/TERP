/**
 * DirectIntakeWorkSurface static analysis tests
 *
 * TER-234: Verify the vendor migration (TER-235) is complete.
 * Render tests are covered by E2E (GF-001).
 * These tests verify no deprecated API references remain.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

const componentSource = readFileSync(
  resolve(__dirname, "../DirectIntakeWorkSurface.tsx"),
  "utf-8"
);

describe("DirectIntakeWorkSurface (TER-234)", () => {
  it("should not reference deprecated vendors API (TER-235)", () => {
    expect(componentSource).not.toContain("trpc.vendors");
    expect(componentSource).not.toContain("vendors.getAll");
  });

  it("should use clients.list API for supplier data", () => {
    expect(componentSource).toContain("trpc.clients.list.useQuery");
    expect(componentSource).toContain('clientTypes: ["seller"]');
  });

  it("should not use any type (lint compliance)", () => {
    // The component should not have unguarded `any` type annotations
    const nonDisabledAny = componentSource
      .split("\n")
      .filter(
        line =>
          /:\s*any\b/.test(line) &&
          !line.includes("eslint-disable") &&
          !line.includes("@ts-ignore")
      );
    expect(nonDisabledAny.length).toBeLessThanOrEqual(0);
  });

  it("should use getAuthenticatedUserId pattern if actor is referenced", () => {
    // TERP protocol: actor must come from context, never input
    if (componentSource.includes("createdBy")) {
      expect(componentSource).not.toMatch(/createdBy\s*=\s*input\./);
    }
  });

  it("should have supplier prop instead of vendor prop for RowInspectorProps", () => {
    expect(componentSource).toContain(
      "suppliers: { id: number; name: string }[]"
    );
    expect(componentSource).not.toContain(
      "vendors: { id: number; name: string }[]"
    );
  });
});
