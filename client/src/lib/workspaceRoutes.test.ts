import { describe, expect, it } from "vitest";
import {
  buildOperationsWorkspacePath,
  normalizeOperationsTab,
} from "./workspaceRoutes";

describe("workspaceRoutes operations aliases", () => {
  it("normalizes legacy operations tab aliases", () => {
    expect(normalizeOperationsTab("intake")).toBe("receiving");
    expect(normalizeOperationsTab("pick-pack")).toBe("shipping");
    expect(normalizeOperationsTab("receiving")).toBe("receiving");
    expect(normalizeOperationsTab("shipping")).toBe("shipping");
  });

  it("builds canonical inventory workspace paths", () => {
    expect(buildOperationsWorkspacePath("intake")).toBe(
      "/inventory?tab=receiving"
    );
    expect(
      buildOperationsWorkspacePath("pick-pack", { mode: "spreadsheet" })
    ).toBe("/inventory?tab=shipping&mode=spreadsheet");
  });
});
