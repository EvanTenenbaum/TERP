/**
 * Consolidated navigation information architecture checks.
 * TER-600: Updated to reflect the 11-item sidebar navigation structure.
 */

import { describe, it, expect } from "vitest";
import { navigationItems, buildNavigationGroups } from "./navigation";

const paths = navigationItems.map(item => item.path);

const sidebarItems = navigationItems.filter(
  item => item.sidebarVisible !== false
);
const hiddenItems = navigationItems.filter(
  item => item.sidebarVisible === false
);

describe("consolidated navigation IA", () => {
  it("includes the new consolidated workspace entry points", () => {
    expect(paths).toContain("/sales");
    expect(paths).toContain("/relationships");
    expect(paths).toContain("/demand-supply");
    expect(paths).toContain("/inventory");
    expect(paths).toContain("/credits");
    expect(paths).toContain("/notifications");
    expect(paths).toContain("/settings/cogs");
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
    expect(paths).not.toContain("/inbox");
  });

  // TER-600: Validate the 11-item sidebar structure
  it("has exactly 11 sidebar-visible items", () => {
    expect(sidebarItems).toHaveLength(11);
  });

  it("has correct sidebar-visible items per group", () => {
    const sidebarPaths = sidebarItems.map(item => item.path);

    // Sell group: Sales, Relationships, Demand & Supply
    expect(sidebarPaths).toContain("/sales");
    expect(sidebarPaths).toContain("/relationships");
    expect(sidebarPaths).toContain("/demand-supply");

    // Buy group: Inventory, Purchase Orders
    expect(sidebarPaths).toContain("/inventory");
    expect(sidebarPaths).toContain("/purchase-orders");

    // Finance group: Accounting, Credits, Reports
    expect(sidebarPaths).toContain("/accounting");
    expect(sidebarPaths).toContain("/credits");
    expect(sidebarPaths).toContain("/analytics");

    // Admin group: Calendar, Settings, Notifications
    expect(sidebarPaths).toContain("/calendar");
    expect(sidebarPaths).toContain("/settings");
    expect(sidebarPaths).toContain("/notifications");
  });

  // TER-597: Absorbed items are hidden from sidebar but present in full list
  it("keeps absorbed items in navigationItems for Command Palette continuity", () => {
    // Sales absorbed items
    expect(paths).toContain("/sales?tab=pick-pack");
    expect(paths).toContain("/sales-sheets");
    expect(paths).toContain("/live-shopping");

    // Inventory absorbed items
    expect(paths).toContain("/photography");
    expect(paths).toContain("/samples");

    // Admin absorbed items
    expect(paths).toContain("/users");
    expect(paths).toContain("/scheduling");
    expect(paths).toContain("/time-clock");
    expect(paths).toContain("/todos");
  });

  it("marks absorbed items as sidebarVisible: false", () => {
    const sidebarHiddenPaths = hiddenItems.map(item => item.path);

    // Absorbed items must NOT be sidebar-visible
    expect(sidebarHiddenPaths).toContain("/sales-sheets");
    expect(sidebarHiddenPaths).toContain("/live-shopping");
    expect(sidebarHiddenPaths).toContain("/photography");
    expect(sidebarHiddenPaths).toContain("/samples");
    expect(sidebarHiddenPaths).toContain("/users");
    expect(sidebarHiddenPaths).toContain("/scheduling");
    expect(sidebarHiddenPaths).toContain("/time-clock");
    expect(sidebarHiddenPaths).toContain("/todos");
  });

  it("buildNavigationGroups returns only sidebar-visible items", () => {
    const groups = buildNavigationGroups();
    const groupedPaths = groups.flatMap(g => g.items.map(i => i.path));

    // Sidebar-visible items must be present
    expect(groupedPaths).toContain("/sales");
    expect(groupedPaths).toContain("/inventory");
    expect(groupedPaths).toContain("/accounting");

    // Absorbed items must NOT appear in sidebar groups
    expect(groupedPaths).not.toContain("/sales-sheets");
    expect(groupedPaths).not.toContain("/photography");
    expect(groupedPaths).not.toContain("/users");
    expect(groupedPaths).not.toContain("/scheduling");
    expect(groupedPaths).not.toContain("/todos");
  });

  it("has the correct group assignments for sidebar items", () => {
    const sellItems = sidebarItems.filter(i => i.group === "sales");
    const buyItems = sidebarItems.filter(i => i.group === "inventory");
    const financeItems = sidebarItems.filter(i => i.group === "finance");
    const adminItems = sidebarItems.filter(i => i.group === "admin");

    expect(sellItems).toHaveLength(3);
    expect(buyItems).toHaveLength(2);
    expect(financeItems).toHaveLength(3);
    expect(adminItems).toHaveLength(3);
  });
});
