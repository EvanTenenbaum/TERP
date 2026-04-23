/**
 * UX v2 Feature Flags (TER-1283 epic)
 *
 * Centralized registry of feature-flag keys that gate the "Manus" UX v2 wave.
 * All UX v2 primitives (ManusSheet, Manus breadcrumbs, etc.) read flags via
 * `useFeatureFlag(UX_V2_FLAGS.DRAWER)` so that rollout can be staged per
 * surface in the feature-flags admin UI without code changes.
 *
 * Flag semantics:
 *
 * - `ux.v2.drawer` — Enables the ManusSheet primitive (TER-1294) in place of
 *   the legacy `@/components/ui/sheet` drawer. When disabled, call sites
 *   should fall back to the existing Sheet component. Default when flag is
 *   absent from the server response: **disabled** (safe default).
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
