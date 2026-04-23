export const FEATURE_FLAGS = {
  spreadsheetNativePilot: "spreadsheet-native-pilot",
  /**
   * Enables the UX v2 unified 3-state surface primitive
   * (OperationalStateSurface) for data-bearing components.
   */
  uxV2States: "ux.v2.states",
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
