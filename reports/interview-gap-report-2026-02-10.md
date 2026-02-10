# Interview Gap Report: Jan 29, 2026 Customer Meeting

Date: 2026-02-10  
Repo: /Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard  
Branch: `codex/owner-dashboard-reuse-20260210`  
Baseline commit: `726d4de9`

## Executive Summary (Plain Language)

- The user does not want "more dashboards". They want one morning control screen that answers 4 questions fast: what is low, what is aging, what must be paid, and where money is at risk.
- The strongest requirement is decision speed, not analytic depth.
- Current app already has most needed building blocks (inventory snapshot, aging, cash, debt, client outreach), but they were not composed or labeled for this workflow by default.
- We upgraded the default operations layout to an owner-first command center using existing widgets (reuse-first, no new widget framework).
- We fixed a key data-quality issue in debt ranking by aggregating multiple invoices per client into one risk row.
- Biggest remaining gaps are policy/safety features (debt warning gates and payment permission split), plus clearer payables breakdown (due now vs overdue vs due soon).
- The existing master analysis is directionally right; it over-indexes on building new components where reuse of existing widgets gets most value faster.
- Recommended sequence: finish reuse-first MEET tasks now, then implement rule-based debt and permission controls.

## What We Heard (Evidence)

Source: `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/docs/meeting-analysis/2026-01-29/TERP_Annotated_Transcript.md`

1. "Inventory would be where I'd like it to pop up." (01:49-02:05)
2. "This job is like Tetris... what are you out of... what's about to go bad... what am I going to lose money on." (02:10-02:18)
3. "On dashboard... payables, due payables... total units on hand." (04:16-04:27)
4. "It'd be cool to see... categories... in various price brackets." (04:28-04:50)
5. "We'll need a little explanation on these" (leaderboard metrics). (12:30-12:49)
6. Customer explicitly asks for debt warnings to stop extending risky credit. (11:14-11:27)
7. Calendar is explicitly "later version thing." (05:34-05:46)

## Independent Analysis (Transcript-First)

### User goals / jobs to be done

- Start the day and make priority decisions in under 2 minutes.
- Protect margin by preventing aged inventory loss and debt deterioration.
- Know exactly who to pay and when without opening multiple pages.
- Quickly identify clients needing outreach.

### Pain points

- Current path to category + price-bracket inventory insight is too many clicks and feels brittle.
- Financial risk signals are fragmented across pages.
- Important terms are too technical (especially in leaderboard views).

### Explicit requests vs implied needs

- Explicit: dashboard should show payables, inventory aging, inventory by categories/brackets, cash, debt risk.
- Implied: default view must be operational and plain-language; not a generic analytics board.

### Constraints

- Avoid adding unnecessary complexity.
- Avoid shipping half-finished quality (trust risk is high).
- Keep role safety in payment actions.

### Success criteria

- Owner can answer the "Tetris four" questions immediately after login.
- One click from each critical card to the action page.
- Risky debt and overdue payables are visible and prioritized.

## Review of Pre-Existing Analysis

Reviewed: `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/docs/meeting-analysis/2026-01-29/TERP_MASTER_ANALYSIS.md`

### What it got right

- Correctly identified the "Tetris" mental model.
- Correctly prioritized debt-risk warning as a high-value request.
- Correctly emphasized simplification and plain-language labeling.

### What it missed or over-weighted

- It leaned too much toward net-new UI surface proposals; the repo already had enough widgets to get close to needs with composition + copy + small logic upgrades.
- It did not strongly enforce a reuse-first delivery sequence tied to current routes/widgets.

### Net assessment

- Directionally solid, but needed a practical "build-this-next using what exists" translation.

## Master Analysis and Priorities

1. **Owner Morning Command Center default**  
   Confidence: High  
   Recommendation: Build now (reuse existing widgets)
2. **Debt risk visibility + credit safety gating**  
   Confidence: High  
   Recommendation: Build now (policy layer, not new widget framework)
3. **Payables urgency clarity (overdue vs due soon)**  
   Confidence: High  
   Recommendation: Build now
4. **Inventory category + price bracket clarity**  
   Confidence: High  
   Recommendation: Build now
5. **Plain-language metric explanations**  
   Confidence: Medium-High  
   Recommendation: Build now
6. **Landing page preference**  
   Confidence: Medium  
   Recommendation: Build next
7. **Client external login names**  
   Confidence: Medium  
   Recommendation: Build next
8. **Calendar integration work**  
   Confidence: High  
   Recommendation: Defer

## Mapping: Findings vs App, Commits, Roadmap

| Finding / Need                            | Transcript evidence                             | Current app status                             | Evidence in code                                                                                                                                                                                                                                                                                                                                                               | Commit evidence                                                                                                                         | Roadmap mapping    | Recommendation                                                    |
| ----------------------------------------- | ----------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------ | ----------------------------------------------------------------- |
| Owner-first morning dashboard             | 01:49-02:18                                     | **Partial -> improved in this branch**         | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/lib/constants/dashboardPresets.ts`, `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/pages/DashboardV3.tsx`                                                                                                                                                                     | Working-tree changes on `codex/owner-dashboard-reuse-20260210`                                                                          | MEET-002           | Keep as default, lock in after QA signoff                         |
| Aging inventory "what might go bad"       | 02:10-02:18, 04:56-05:02                        | **Addressed**                                  | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/components/dashboard/widgets-v2/AgingInventoryWidget.tsx`, `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/server/routers/inventory.ts` (`getAgingSummary`)                                                                                                                               | Existing + working-tree polish                                                                                                          | MEET-002           | Keep widget front-and-center                                      |
| Inventory by category and bracket         | 03:28-03:49, 04:28-04:50                        | **Partial**                                    | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/components/dashboard/widgets-v2/InventorySnapshotWidget.tsx`, `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/server/routers/dashboard.ts` (`getInventorySnapshot`)                                                                                                                       | Existing                                                                                                                                | MEET-002, MEET-031 | Add bracket-level breakout to existing snapshot payload/UI        |
| Payables due clarity                      | 04:16-04:27                                     | **Partial**                                    | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/components/dashboard/widgets-v2/AvailableCashWidget.tsx`, `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/components/dashboard/widgets-v2/TotalDebtWidget.tsx`, `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/server/routers/cashAudit.ts` (`getCashDashboard`) | Existing                                                                                                                                | MEET-004, MEET-006 | Add due-now / overdue / next-7-day segmentation in existing cards |
| Debt risk warning and credit stop control | 11:14-11:27                                     | **Partial** (visibility yes, policy gating no) | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/components/dashboard/widgets-v2/ClientDebtLeaderboard.tsx`, `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/server/routers/dashboard.ts` (`getClientDebt` aggregation fix)                                                                                                                | Working-tree change + test in `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/server/routers/dashboard.pagination.test.ts` | MEET-008           | Implement threshold engine + override workflow + audit log        |
| Who to reach out to                       | 06:29-07:01                                     | **Addressed (basic)**                          | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/components/dashboard/widgets-v2/MatchmakingOpportunitiesWidget.tsx`, `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/server/routers/matchingEnhanced.ts`                                                                                                                                  | Existing + copy improvements in working tree                                                                                            | MEET-020           | Keep widget; add simpler labels and reasons                       |
| Simpler language, fewer confusing metrics | 12:30-12:49                                     | **Partial**                                    | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/client/src/lib/constants/dashboardPresets.ts` (metadata copy), leaderboard page still dense                                                                                                                                                                                                                       | Existing + working-tree copy improvements                                                                                               | MEET-020           | Add glossary tooltips + simple leaderboard mode                   |
| Payment permission split                  | Safety requirement implied in debt/payment flow | **Missing** (coarse permissions)               | `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/server/routers/payments.ts` currently uses `accounting:*`                                                                                                                                                                                                                                                         | Existing                                                                                                                                | MEET-026           | Add granular receive/disburse/override permissions                |
| Landing page preference (inventory first) | 01:49-02:05                                     | **Missing**                                    | No `defaultLandingPage` preference found in routing/prefs                                                                                                                                                                                                                                                                                                                      | Existing                                                                                                                                | MEET-029           | Add user pref + app root redirect logic                           |
| Client external login names               | 08:09-08:16                                     | **Missing**                                    | No `metrcName`/`portalLoginName` fields found                                                                                                                                                                                                                                                                                                                                  | Existing                                                                                                                                | MEET-013           | Add optional fields in schema + form + search                     |

## Proposed Roadmap Updates (Build-Ready)

Primary roadmap references:

- `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/docs/roadmaps/MASTER_ROADMAP.md`
- `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/docs/roadmaps/MEET_CUSTOMER_FEEDBACK_EXECUTION_SPEC_2026-02-10.md`
- `/Users/evan/spec-erp-docker/TERP/TERP-codex-owner-dashboard/docs/roadmaps/MEET_WIDGET_REUSE_EXECUTION_PLAN_2026-02-10.md`

### 1) MEET-002A: Owner Command Center default composition (reuse-only)

- Problem: right cards existed, but default dashboard was not owner-triage optimized.
- Proposed change: lock operations preset to owner-critical cards first; keep advanced cards hidden.
- Acceptance criteria:
  - Given a first login, when dashboard loads, then owner triage cards are visible in top viewport.
  - Given customization panel, when advanced cards are needed, then user can opt in without changing defaults.
  - Given mobile view, when dashboard opens, then critical cards stack in priority order.

### 2) MEET-002B: Inventory snapshot bracket breakout (within existing widget)

- Problem: category totals exist, but bracket-level detail still requires extra workflow.
- Proposed change: extend `getInventorySnapshot` and existing widget to include bracket slices.
- Acceptance criteria:
  - Given category row, user sees bracket counts/values directly.
  - Clicking bracket opens inventory filtered to that category+bracket.

### 3) MEET-004A: Payables urgency segmentation in existing financial cards

- Problem: scheduled payables shown, but urgency split is incomplete.
- Proposed change: expose and display `overdue`, `due today`, `due in 7 days` in current card surfaces.
- Acceptance criteria:
  - Dashboard shows 3 explicit urgency buckets with amounts.
  - Each bucket links to the filtered bills queue.

### 4) MEET-006A: Cash formula and data-confidence clarity

- Problem: users see numbers but not confidence or formula context.
- Proposed change: add short formula text + freshness + missing-source warning in cash panel.
- Acceptance criteria:
  - Widget displays formula (`cash on hand - scheduled payables = available`).
  - If source data is stale/partial, warning text is visible.

### 5) MEET-008A: Debt risk threshold engine

- Problem: debt rows exist, but no policy automation.
- Proposed change: compute risk band from debt age, payment velocity, utilization.
- Acceptance criteria:
  - Risk band appears in dashboard and client profile.
  - Risk reasons are visible in plain language.

### 6) MEET-008B: Credit override workflow

- Problem: no enforceable stop/override path when risk is high.
- Proposed change: add policy modes (inform, require-override, hard-block) to order flow.
- Acceptance criteria:
  - High-risk client triggers policy behavior at order/credit step.
  - Override requires reason and is audit logged.

### 7) MEET-020A: Simple metric mode + inline glossary

- Problem: customers report confusion with leaderboard terminology.
- Proposed change: simple-mode toggle with fewer columns and inline definitions.
- Acceptance criteria:
  - "Simple mode" reduces visible columns to core ranking + one reason.
  - Term hover/help text exists for each metric family.

### 8) MEET-026A: Split payment permissions

- Problem: current `accounting:*` permission granularity is too broad for operational risk.
- Proposed change: add `payments:receive`, `payments:disburse`, `payments:approve_override` and gate UI + API.
- Acceptance criteria:
  - Unauthorized users cannot execute blocked payment actions via UI or API.
  - Role bundles reflect owner/accounting/assistant boundaries.

### 9) MEET-029A + MEET-013A (profile quality wave)

- Problem: operator preferences and client identity details are missing.
- Proposed change: add default landing preference and optional client login-name fields.
- Acceptance criteria:
  - User can select landing page (`dashboard`, `inventory`, `accounting-dashboard`).
  - Client records support `metrcName` and `portalLoginName`; searchable and optional.

## QA Snapshot For This Branch

Validated in this worktree:

- `pnpm typecheck` ✅
- Targeted eslint on changed dashboard files ✅
- Dashboard test matrix (55 tests) ✅
- `pnpm build` ✅
- Playwright workflow dashboard suite against deployed app (10/10) ✅

Known environment limitation:

- `pnpm check:dashboard` fails without `DATABASE_URL` in local env (not a code regression).

## Appendix: Generated Visual Mockups

- Reuse-first owner mockup (desktop):  
  `/tmp/terp-owner-dashboard-mockups-v4/owner-command-center-1920.png`
- Reuse-first owner mockup (high-res desktop):  
  `/tmp/terp-owner-dashboard-mockups-v4/owner-command-center-2560.png`
- Reuse-first owner mockup (mobile):  
  `/tmp/terp-owner-dashboard-mockups-v4/owner-command-center-mobile-430x932.png`
