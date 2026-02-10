import { describe, expect, it } from "vitest";
import { DEFAULT_LAYOUT_ID, LAYOUT_PRESETS } from "./dashboardPresets";

describe("dashboardPresets", () => {
  it("uses operations as the default layout", () => {
    expect(DEFAULT_LAYOUT_ID).toBe("operations");
  });

  it("shows owner-triage widgets by default in operations layout", () => {
    const operations = LAYOUT_PRESETS.operations.widgets;
    const visibleIds = operations.filter(w => w.isVisible).map(w => w.id);

    expect(visibleIds).toEqual(
      expect.arrayContaining([
        "inventory-snapshot",
        "aging-inventory",
        "available-cash",
        "total-debt",
        "client-debt-leaderboard",
        "transaction-snapshot",
      ])
    );
  });

  it("keeps advanced/comparison widgets hidden by default in operations layout", () => {
    const operations = LAYOUT_PRESETS.operations.widgets;
    const hiddenIds = operations.filter(w => !w.isVisible).map(w => w.id);

    expect(hiddenIds).toEqual(
      expect.arrayContaining([
        "sales-comparison",
        "profitability",
        "workflow-queue",
        "smart-opportunities",
        "matchmaking-opportunities",
        "inbox",
      ])
    );
  });
});
