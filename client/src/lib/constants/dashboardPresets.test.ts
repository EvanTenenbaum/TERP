import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT_ID, LAYOUT_PRESETS } from "./dashboardPresets";

describe("dashboardPresets", () => {
  it("uses operations as the default layout", () => {
    expect(DEFAULT_LAYOUT_ID).toBe("operations");
  });

  it("shows standard operations widgets by default in operations layout", () => {
    const operations = LAYOUT_PRESETS.operations.widgets;
    const visibleIds = operations.filter(w => w.isVisible).map(w => w.id);

    expect(visibleIds).toEqual(
      expect.arrayContaining([
        "sales-by-client",
        "cash-flow",
        "inventory-snapshot",
        "available-cash",
        "total-debt",
        "transaction-snapshot",
        "sales-comparison",
        "profitability",
        "matchmaking-opportunities",
        "workflow-queue",
        "inbox",
      ])
    );
  });

  it("keeps advanced widgets hidden by default in operations layout", () => {
    const operations = LAYOUT_PRESETS.operations.widgets;
    const hiddenIds = operations.filter(w => !w.isVisible).map(w => w.id);

    expect(hiddenIds).toEqual(
      expect.arrayContaining([
        "workflow-activity",
        "smart-opportunities",
        "aging-inventory",
        "client-debt-leaderboard",
      ])
    );
  });
});
