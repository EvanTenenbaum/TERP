import { describe, expect, it } from "vitest";
import {
  buildDisplaySettingsPayload,
  normalizeCogsDisplayMode,
  shouldFallbackDisplaySettingsUserPrefs,
  shouldFallbackLegacyDisplaySettingsUserPrefs,
} from "./organizationSettings";

describe("organizationSettings display payload", () => {
  it("normalizes legacy visible mode to admin-only and hides cost data for unauthorized viewers", () => {
    const result = buildDisplaySettingsPayload(
      {
        grade_field_enabled: true,
        expected_delivery_enabled: true,
        cogs_display_mode: "VISIBLE",
        packaged_unit_enabled: true,
      },
      null,
      { canViewCogsData: false }
    );

    expect(result.user).toEqual({
      showCogsInOrders: false,
      showMarginInOrders: false,
      showGradeField: true,
      hideExpectedDelivery: false,
      defaultWarehouseId: null,
    });
    expect(result.display).toEqual({
      showGradeField: true,
      gradeFieldRequired: false,
      showExpectedDelivery: true,
      showCogsInOrders: false,
      showMarginInOrders: false,
      canViewCogsData: false,
      cogsDisplayMode: "ADMIN_ONLY",
      packagedUnitEnabled: true,
    });
  });

  it("honors persisted user preferences for authorized cost viewers", () => {
    const result = buildDisplaySettingsPayload(
      {
        grade_field_enabled: true,
        grade_field_required: true,
        expected_delivery_enabled: true,
        cogs_display_mode: "HIDDEN",
        packaged_unit_enabled: false,
      },
      {
        defaultWarehouseId: 42,
        showCogsInOrders: false,
        showMarginInOrders: false,
        showGradeField: false,
        hideExpectedDelivery: true,
      },
      { canViewCogsData: true }
    );

    expect(result.user).toEqual({
      defaultWarehouseId: 42,
      showCogsInOrders: false,
      showMarginInOrders: false,
      showGradeField: false,
      hideExpectedDelivery: true,
    });
    expect(result.display).toEqual({
      showGradeField: false,
      gradeFieldRequired: true,
      showExpectedDelivery: false,
      showCogsInOrders: false,
      showMarginInOrders: false,
      canViewCogsData: true,
      cogsDisplayMode: "HIDDEN",
      packagedUnitEnabled: false,
    });
  });

  it("forces hidden mode to suppress cost metrics even for authorized viewers", () => {
    const result = buildDisplaySettingsPayload(
      {
        cogs_display_mode: "HIDDEN",
      },
      {
        defaultWarehouseId: null,
        showCogsInOrders: true,
        showMarginInOrders: true,
        showGradeField: true,
        hideExpectedDelivery: false,
      },
      { canViewCogsData: true }
    );

    expect(result.display.showCogsInOrders).toBe(false);
    expect(result.display.showMarginInOrders).toBe(false);
    expect(result.display.canViewCogsData).toBe(true);
    expect(result.display.cogsDisplayMode).toBe("HIDDEN");
  });

  it("normalizes any non-hidden mode to admin-only", () => {
    expect(normalizeCogsDisplayMode("VISIBLE")).toBe("ADMIN_ONLY");
    expect(normalizeCogsDisplayMode("ADMIN_ONLY")).toBe("ADMIN_ONLY");
    expect(normalizeCogsDisplayMode(undefined)).toBe("ADMIN_ONLY");
    expect(normalizeCogsDisplayMode("HIDDEN")).toBe("HIDDEN");
  });

  it("only treats user preference schema drift as recoverable", () => {
    expect(
      shouldFallbackDisplaySettingsUserPrefs(
        new Error("Unknown column 'user_preferences.show_grade_field'")
      )
    ).toBe(true);
    expect(
      shouldFallbackLegacyDisplaySettingsUserPrefs(
        new Error("Unknown column 'user_preferences.default_warehouse_id'")
      )
    ).toBe(true);
    expect(
      shouldFallbackDisplaySettingsUserPrefs(new Error("Database timeout"))
    ).toBe(false);
  });
});
