/**
 * Consolidated navigation information architecture checks.
 */

import { describe, it, expect } from "vitest";
import { navigationItems } from "./navigation";

const paths = navigationItems.map(item => item.path);

describe("consolidated navigation IA", () => {
  it("includes the new consolidated workspace entry points", () => {
    expect(paths).toContain("/sales");
    expect(paths).toContain("/relationships");
    expect(paths).toContain("/demand-supply");
    expect(paths).toContain("/inventory");
    expect(paths).toContain("/credits");
  });

  it("removes legacy split navigation entry points from the sidebar", () => {
    expect(paths).not.toContain("/quotes");
    expect(paths).not.toContain("/returns");
    expect(paths).not.toContain("/needs");
    expect(paths).not.toContain("/interest-list");
    expect(paths).not.toContain("/vendor-supply");
    expect(paths).not.toContain("/matchmaking");
    expect(paths).not.toContain("/products");
    expect(paths).not.toContain("/vendors");
    expect(paths).not.toContain("/credit-settings");
  });
});
