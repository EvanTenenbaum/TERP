export const FEATURE_FLAGS = {
  spreadsheetNativePilot: "spreadsheet-native-pilot",
  /**
   * Enables the UX v2 unified 3-state surface primitive
   * (OperationalStateSurface) for data-bearing components.
   */
  uxV2States: "ux.v2.states",
  /**
   * UX v2 grid numeric defaults.
   *
   * When enabled, `SpreadsheetPilotGrid` auto-applies right-alignment,
   * tabular-nums styling, and locale-aware value formatters to column
   * definitions whose `cellDataType` is "currency", "number", or "percent".
   * Explicit `cellClass` / `valueFormatter` overrides on a ColDef are
   * preserved (no clobbering).
   *
   * See: docs/ux-review/02-Implementation_Strategy.md §4.2
   * Linear: TER-1285
   */
  uxV2Grid: "ux.v2.grid",
  /**
   * TER-1297: Enables the central route registry backing `<AppBreadcrumb>`.
   *
   * When enabled, the breadcrumb derives its segment titles from
   * `client/src/config/routes.ts` and asynchronously resolves dynamic id
   * segments (e.g. `/clients/:id`) to human-friendly names via tRPC. When
   * disabled the component falls back to the legacy `navigationItems` +
   * `customRouteNames` lookup. Default when absent from the server
   * response: **disabled** (safe default).
   */
  uxV2BreadcrumbRegistry: "ux.v2.breadcrumb-registry",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
