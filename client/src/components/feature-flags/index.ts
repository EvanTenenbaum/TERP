/**
 * Feature Flag Components
 *
 * Provides UI components for feature flag integration.
 */

export { FeatureFlag, ModuleGate, RequireFeature } from "./FeatureFlag";

/**
 * TER-1295: ux.v2.page-header-invariant
 *
 * Canonical flag key for the PageHeader one-primary-action invariant. The
 * development-mode advisory `console.error` inside `<PageHeader>` is always
 * compiled in dev builds (and stripped from production) — this constant lets
 * downstream callers (admin UIs, enforcement tooling, telemetry) reference
 * the flag without duplicating the string literal.
 */
export const UX_V2_PAGE_HEADER_INVARIANT_FLAG =
  "ux.v2.page-header-invariant" as const;
