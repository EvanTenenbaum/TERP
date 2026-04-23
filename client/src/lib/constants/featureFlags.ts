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
  /**
   * TER-1295: PageHeader one-primary-action invariant.
   *
   * The `<PageHeader>` component always runs a development-mode advisory
   * check that counts primary (`variant="default"`) buttons in its
   * `actions` slot and logs a `console.error` when more than one is
   * detected. That check is compiled only into dev builds (stripped in
   * production via `process.env.NODE_ENV === "development"`).
   *
   * This flag exists to let operators opt into broader enforcement or
   * telemetry downstream (e.g. admin surfacing, lint gating) without
   * removing the dev-time log.
   *
   * See: docs/ux-review/02-Implementation_Strategy.md §4.11
   * Linear: TER-1295
   */
  uxV2PageHeaderInvariant: "ux.v2.page-header-invariant",
  /**
   * UX v2 persisted sidebar open-group state.
   *
   * When enabled, the `AppSidebar` reads the open/closed state of navigation
   * groups from `localStorage` on mount and writes back on every accordion
   * toggle, so the user's sidebar layout survives page refreshes and
   * navigation. When disabled, the sidebar falls back to the default
   * route-driven open-group behavior.
   *
   * See: docs/ux-review/02-Implementation_Strategy.md §4.6
   * Linear: TER-1306
   */
  uxV2NavPersist: "ux.v2.nav-persist",
} as const;

export type FeatureFlagKey = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS];
