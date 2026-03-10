import { describe, expect, it } from "vitest";
import {
  buildDisplaySettingsPayload,
  shouldFallbackDisplaySettingsUserPrefs,
  shouldFallbackLegacyDisplaySettingsUserPrefs,
} from "./organizationSettings";

describe("organizationSettings display payload", () => {
  it("falls back to safe defaults when user preferences are unavailable", () => {
    const result = buildDisplaySettingsPayload(
      {
        grade_field_enabled: true,
        expected_delivery_enabled: true,
        cogs_display_mode: "VISIBLE",
        packaged_unit_enabled: true,
      },
      null
    );

    expect(result.user).toEqual({
      showCogsInOrders: true,
      showMarginInOrders: true,
      showGradeField: true,
      hideExpectedDelivery: false,
      defaultWarehouseId: null,
    });
    expect(result.display).toEqual({
      showGradeField: true,
      gradeFieldRequired: false,
      showExpectedDelivery: true,
      showCogsInOrders: true,
      showMarginInOrders: true,
      cogsDisplayMode: "VISIBLE",
      packagedUnitEnabled: true,
    });
  });

  it("honors persisted user preferences when they are available", () => {
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
      }
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
      cogsDisplayMode: "HIDDEN",
      packagedUnitEnabled: false,
    });
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
