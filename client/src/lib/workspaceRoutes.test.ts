import { describe, expect, it } from "vitest";
import {
  buildOperationsWorkspacePath,
  normalizeOperationsTab,
} from "./workspaceRoutes";

describe("workspaceRoutes operations aliases", () => {
  it("normalizes legacy operations tab aliases", () => {
    // TER-815: "intake" is now its own first-class tab (no longer aliases "receiving")
    expect(normalizeOperationsTab("intake")).toBe("intake");
    expect(normalizeOperationsTab("pick-pack")).toBe("shipping");
    expect(normalizeOperationsTab("receiving")).toBe("receiving");
    expect(normalizeOperationsTab("shipping")).toBe("shipping");
  });

  it("builds canonical inventory workspace paths", () => {
    // TER-815: "intake" routes to its own dedicated tab
    expect(buildOperationsWorkspacePath("intake")).toBe(
      "/inventory?tab=intake"
    );
    expect(
      buildOperationsWorkspacePath("pick-pack", { mode: "spreadsheet" })
    ).toBe("/inventory?tab=shipping&mode=spreadsheet");
  });
});
