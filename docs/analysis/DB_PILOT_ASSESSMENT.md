# Database Pilot Validation Status and Rollout Plan (Dec 11, 2025)

## Current State (last 48 hours)

- Schema drift remediation completed on Dec 10: all 28 validation issues from the pilot were resolved by renaming Drizzle fields to match MySQL columns and updating related indexes; validation now shows **0 issues across 120 tables**.
- CI coverage was added via `.github/workflows/schema-validation.yml`, running `pnpm validate:schema` against a MySQL service on PRs/pushes touching Drizzle or server code and uploading validation artifacts.
- Latest validation snapshot confirms the pilot approach (DB-first, non-destructive) is successful and ready to scale.

## Outstanding Gaps

- **TypeScript and test debt:** ~100 pre-existing TypeScript errors and 52 failing tests remain untouched; vipPortal admin diagnostics also pending.
- **Data coverage:** Production still has data in only 36/119 tables (30%). Ten critical tables tied to recently fixed features remain empty: `todo_lists`, `todo_tasks`, `todo_list_members`, `comments`, `comment_mentions`, `userDashboardPreferences`, `dashboard_widget_layouts`, `dashboard_kpi_configs`, `pricing_rules`, and `pricing_profiles`.
- **Known schema debt:** Prior report flagged issues like missing `adjustmentReason` on `inventoryMovements` and a duplicate mapping on `orderStatusHistory`; DATA-001 generators also need schema validation.

## Rollout Plan

1. **Lock in validation coverage**
   - Keep the new schema-validation CI workflow mandatory for PRs/pushes touching Drizzle/server code.
   - Run `pnpm validate:schema` against the production database after pulling latest migrations to capture a fresh report before seeding.
2. **Stabilize the codebase for data work**
   - Schedule a dedicated task to clear the ~100 TypeScript errors and 52 failing tests so schema/data issues are not hidden by noise.
   - Triage the vipPortal admin diagnostics called out in the QA follow-up before widening rollout.
3. **Seed critical empty tables (priority)**
   - Implement or refresh generators for the ten critical tables above, targeting the recommended volumes (e.g., ~30 lists/200 tasks; ~100 comments attached to existing orders/clients) to exercise recent fixes.
   - Run generators in staging first, verify referential integrity, then apply to production once validation is green and capture record counts for sign-off.
4. **Address residual schema debt**
   - Create migrations to add `adjustmentReason` to `inventoryMovements` and fix the `orderStatusHistory` duplicate mapping.
   - Validate and repair the DATA-001 generators against the live schema before reuse.
5. **Operationalize reseeding**
   - Use the existing production reseed guide once validation is stable to refresh realistic mock data while preserving strains/users, and document results for repeatability.
