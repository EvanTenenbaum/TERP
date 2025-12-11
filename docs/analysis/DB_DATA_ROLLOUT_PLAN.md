# Database, Table, and Data Rollout Plan (Updated Dec 11, 2025)

## Purpose

Deliver a production-ready rollout for the database/table/data initiative that locks in the validated schema workflow, seeds critical tables with realistic mock data, resolves remaining schema debt, and makes reseeding/monitoring repeatable.

## Current Snapshot (past 48 hours)

- Pilot validation succeeded: all 28 schema drift issues were fixed and the latest run shows **0 issues across 120 tables** with CI coverage now enforcing `pnpm validate:schema` on Drizzle/server changes.【F:docs/analysis/DB_PILOT_ASSESSMENT.md†L4-L13】
- Data coverage remains thin: production has data in only 36/119 tables; ten priority tables tied to recent fixes are empty (`todo_lists`, `todo_tasks`, `todo_list_members`, `comments`, `comment_mentions`, `userDashboardPreferences`, `dashboard_widget_layouts`, `dashboard_kpi_configs`, `pricing_rules`, `pricing_profiles`).【F:docs/analysis/DB_PILOT_ASSESSMENT.md†L15-L19】
- Outstanding debt that blocks confidence: ~100 TS errors, 52 failing tests, and unresolved schema gaps like `adjustmentReason` on `inventoryMovements` and duplicate mapping on `orderStatusHistory`.【F:docs/analysis/DB_PILOT_ASSESSMENT.md†L15-L23】

## Immediate Next Steps (next 3 days)

- **Validate production before touching data (Day 0):** Run the `adminSchema.validate` snippet from `DATA-010-FINAL-STATUS.md`, archive JSON/MD artifacts under `docs/analysis/validation-reports/<date>/`, and flag any drift before seeding.
- **Stage the ten empty tables (Day 1):** Refresh or add generators for todos/comments/dashboards/pricing, run them in staging, and capture before/after counts plus referential integrity checks.
- **Production seed after green validation (Day 2):** Apply the generators to production once validation is clean, add smoke checks for todos/comments/dashboards/pricing flows, and record inserted volumes for audit.
- **Schema clean-up follow-up (Day 3):** Ship migrations for `inventoryMovements.adjustmentReason` and the `orderStatusHistory` duplicate mapping, then rerun validation to ensure zero drift before closing the rollout.

## Phase 0 – Preconditions (same day)

- ✅ Confirm active sessions to avoid conflicts (done).【F:docs/ACTIVE_SESSIONS.md†L57-L74】
- 🚦 Branch hygiene: stay on `claude/db-plan-f9b211` to satisfy QA hook.
- 📋 Deliverables: refreshed session entry, this plan document, and roadmap validation before final commit.

## Phase 1 – Lock In Validation (0.5 day)

- Run production `adminSchema.validate` (snippet in `DATA-010-FINAL-STATUS.md`) to capture a fresh JSON/Markdown report before seeding; archive artifacts in `docs/analysis/validation-reports/<date>/`.
- Keep `.github/workflows/schema-validation.yml` gating PRs; fail builds on any drift.
- Add a lightweight runbook section for rerunning validation after migrations and after each reseed.

## Phase 2 – Stabilize Code/Test Surface (1 day parallel while validation runs)

- Schedule a focused pass to clear the ~100 TS errors and 52 failing tests so schema/data regressions are visible.【F:docs/analysis/DB_PILOT_ASSESSMENT.md†L15-L17】
- Triage vipPortal admin diagnostics flagged in prior QA to avoid blocking future seeds.
- Exit criteria: clean `pnpm typecheck` + green critical test suites.

## Phase 3 – Seed Priority Tables (1 day, staging then prod)

- Implement/refresh generators for the ten empty tables with realistic volumes (e.g., ~30 lists/200 tasks; ~100 comments anchored to existing orders/clients; dashboards/pricing rules linked to live products).【F:docs/analysis/DB_PILOT_ASSESSMENT.md†L17-L19】
- Run in staging first, verify referential integrity and row counts, then apply to production once Phase 1 is green; record before/after counts for audit.
- Add smoke checks to ensure recent feature fixes remain covered (todos, comments, dashboards, pricing flows).

## Phase 4 – Finish Schema Debt (0.5 day)

- Add migrations for `inventoryMovements.adjustmentReason` and fix the duplicate mapping on `orderStatusHistory`; rerun validation to confirm zero drift.【F:docs/analysis/DB_PILOT_ASSESSMENT.md†L19-L23】
- Validate DATA-001 generators against live schema before reuse to avoid reintroducing drift.

## Phase 5 – Operational Reseed & Monitoring (0.5 day)

- Follow `PRODUCTION_RESEED_GUIDE.md` once validation is clean to load realistic mock data while preserving strains/users; log counts and sample checks.
- Schedule recurring reseed/validation cadence (e.g., weekly or before major QA cycles) and wire alerts to schema-validation artifacts failing in CI.

## Success Criteria

- Validation: zero drift on production and CI after migrations/seeds.
- Data: priority tables populated with coherent records that exercise todos, comments, dashboards, and pricing flows.
- Reliability: TS/test debt cleared enough for data regressions to surface; reseed + validation runbooks documented and repeatable.
