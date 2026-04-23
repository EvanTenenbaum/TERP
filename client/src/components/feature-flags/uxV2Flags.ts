/**
 * UX v2 Feature Flags (TER-1283 epic)
 *
 * Centralized registry of feature-flag keys that gate the "Manus" UX v2 wave.
 * All UX v2 primitives (ManusSheet, Manus breadcrumbs, etc.) read flags via
 * `useFeatureFlag(UX_V2_FLAGS.XXX)` so that rollout can be staged per
 * surface in the feature-flags admin UI without code changes.
 *
 * Flag semantics:
 *
 * - `ux.v2.drawer` — Enables the ManusSheet primitive (TER-1294) in place of
 *   the legacy `@/components/ui/sheet` drawer. When disabled, call sites
 *   should fall back to the existing Sheet component. Default when flag is
 *   absent from the server response: **disabled** (safe default).
 * - `ux.v2.glossary` — Gates the TER-1315 glossary rollout. When enabled,
 *   surfaces swap any remaining non-canonical terminology (Customer/Buyer/
 *   Sales Order/Vendor Invoice/Item/Inventory Line) for the canonical forms
 *   defined in `client/src/config/glossary.ts`. The codemod + ESLint rule
 *   `terp/no-restricted-glossary` enforce the same contract at build time;
 *   the flag lets product control the runtime rollout window. Default when
 *   absent: **disabled**.
 * - `ux.v2.workspace-tabs` — Enables the two-level tab rail in
 *   `LinearWorkspaceShell` when a workspace config declares `tabGroups`
 *   (TER-1305). When disabled, the shell falls back to the single flat
 *   `tabs` rail so deep links keep working unchanged. Default when flag is
 *   absent from the server response: **disabled** (safe default).
 * - `ux.v2.filter-bar` — Enables the standardized `WorkspaceFilterBar` slot
 *   on `LinearWorkspaceShell` (TER-1310) plus the `useWorkspaceFilter()`
 *   URL-state hook. When disabled, surfaces should continue to render their
 *   own ad-hoc filter bars. Default when flag is absent from the server
 *   response: **disabled** (safe default).
 *
 * Add new UX v2 flags to `UX_V2_FLAGS` below; do NOT hard-code flag strings
 * at call sites.
 */

/**
 * UX v2 feature flag keys. Keys are namespaced `ux.v2.*` to keep them grouped
 * in the feature-flags admin and to disambiguate from legacy `work-surface-*`
 * flags in `useWorkSurfaceFeatureFlags`.
 */
export const UX_V2_FLAGS = {
  /** Enforced ManusSheet drawer primitive (TER-1294). */
  DRAWER: "ux.v2.drawer",
  /** Canonical terminology rollout (TER-1315). */
  GLOSSARY: "ux.v2.glossary",
  /**
   * Two-level workspace tab rail driven by `WorkspaceConfig.tabGroups`
   * (TER-1305). Disabled by default — shell renders the legacy flat `tabs`
   * rail when this flag is off even if `tabGroups` is present.
   */
  WORKSPACE_TABS: "ux.v2.workspace-tabs",
  /** Workspace-level filter bar slot + useWorkspaceFilter hook (TER-1310). */
  FILTER_BAR: "ux.v2.filter-bar",
} as const;

export type UxV2FlagKey = (typeof UX_V2_FLAGS)[keyof typeof UX_V2_FLAGS];

/**
 * Default-off predicate. Call sites should prefer
 * `useFeatureFlag(UX_V2_FLAGS.DRAWER).enabled` directly, but this helper is
 * provided for non-React contexts where we only have a raw flags map.
 */
export function isUxV2FlagEnabled(
  flags: Record<string, boolean> | undefined,
  flag: UxV2FlagKey
): boolean {
  return flags?.[flag] ?? false;
}
