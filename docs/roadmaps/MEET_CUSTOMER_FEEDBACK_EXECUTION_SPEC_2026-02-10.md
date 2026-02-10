# MEET Customer Feedback Execution Spec (Build-Ready)

Date: 2026-02-10
Owner: Product + Engineering
Source Interview: Jan 29, 2026 customer meeting
Master Roadmap Section: `docs/roadmaps/MASTER_ROADMAP.md` -> "Customer Feedback (Jan 29, 2026 Meeting)"
Reuse-First Companion Plan: `docs/roadmaps/MEET_WIDGET_REUSE_EXECUTION_PLAN_2026-02-10.md`

## Purpose

Turn the `MEET-*` tasks into implementation-ready work so engineers can build without guesswork and PM can validate outcomes against customer needs.

Primary implementation constraint for current wave: reuse existing widgets and existing APIs first, and only add new UI/features where gaps remain after reuse.

## Product Intent (Non-Negotiable)

- Prioritize decision speed in the first 2 minutes of app usage.
- Use plain language in high-stakes workflows (money, debt, aging inventory).
- Surface risk early (aging, debt, payables) with clear next actions.
- Keep role safety tight for payment actions.
- Prefer defaults that match real daily workflow over feature completeness hidden behind customization.

## Delivery Sequence

### Wave 1: Command Center Foundation

- `MEET-002` Dashboard inventory snapshot by category and bracket
- `MEET-004` Dashboard payables summary hardening
- `MEET-006` Cash on hand clarity + confidence
- `MEET-031` Simplified price category filtering

### Wave 2: Risk + Clarity + Safety

- `MEET-008` Debt warning system
- `MEET-020` Leaderboard metric explanations + simple mode
- `MEET-026` Payment permission split and UI gating

### Wave 3: Preference + Profile Quality

- `MEET-029` Default landing page preference
- `MEET-013` Client external login name fields

## MEET-002: Dashboard inventory snapshot by category

### Why

Customer wants dashboard-first triage instead of manual list-builder work.

### Build scope

- Extend snapshot to include configurable price buckets per category.
- Add bracket totals: count of batches, total units, total value.
- Add one-click drilldown links from bracket rows to filtered inventory page.

### Acceptance criteria

1. Given a category with inventory, when dashboard loads, then bracket summaries are visible without extra clicks.
2. Given a bracket row, when clicked, then inventory page opens filtered to that category and bracket.
3. Given no bracket data, existing category summary still renders with no error.

### Estimate

- 16h

## MEET-004: Dashboard payables summary (verify/enhance)

### Why

Customer needs immediate clarity on who to pay and what is due now.

### Build scope

- Show total payables due, due in next 7 days, overdue payables, and top vendors.
- Add plain-language labels.
- Add CTA deep link to payables queue.

### Acceptance criteria

1. Given unpaid bills, dashboard shows due-now, next-7-day, and overdue values.
2. Vendor names are human-readable when mapping exists.
3. CTA lands on payables list with due/overdue context.

### Estimate

- 8h

## MEET-006: Cash on hand display (verify AvailableCash)

### Why

Customer needs a trustworthy cash-on-hand number for daily decisions.

### Build scope

- Keep existing data model.
- Improve interpretability: formula, freshness, data-quality warnings.

### Acceptance criteria

1. Widget displays formula and consistent values.
2. Missing cash locations show warning + setup CTA.
3. Stale or partial source state shows explicit warning text.

### Estimate

- 4h

## MEET-008: Debt warning system for at-risk clients

### Why

Customer explicitly asked for warnings before extending more credit to risky clients.

### Build scope

- Define risk thresholds for aging, payment velocity, and utilization.
- Show warnings in client profile, order creation, and dashboard risk surface.
- Add policy mode (informational, override required, hard block).

### Acceptance criteria

1. Risk threshold breach shows warning with reasons.
2. Approval policy enforces override workflow.
3. Overrides are audit-logged (user, timestamp, reason).

### Estimate

- 24h

## MEET-013: Store client Metrc/login names

### Why

Customer needs login names in client records for operational handoffs.

### Build scope

- Add optional `metrcName` and `portalLoginName` fields.
- Add create/edit/profile/list/search support.

### Acceptance criteria

1. Values persist and display.
2. Search returns matching clients.
3. Empty fields remain optional and clean.

### Estimate

- 8h

## MEET-020: Metric explanations for leaderboard

### Why

Customer likes leaderboard concept but needs simpler understanding and less overload.

### Build scope

- Add inline glossary/tooltips for key terms.
- Add simple mode with reduced columns.
- Add plain-language trend explanation panel.

### Acceptance criteria

1. Explanations appear at point of use.
2. Simple mode reduces columns and improves scan speed.
3. Trend area explains movement in plain language.

### Estimate

- 12h

## MEET-026: Payment permission levels (RBAC enhancement)

### Why

Receiving payments is higher risk and should not be broadly accessible.

### Build scope

- Add granular permissions: `payments:receive`, `payments:disburse`, `payments:approve_override`.
- Gate API procedures and UI visibility.

### Acceptance criteria

1. Unauthorized receive/disburse actions are blocked and/or hidden.
2. Role bundles reflect owner/accounting/assistant boundaries.
3. Unauthorized API calls return safe permission errors.

### Estimate

- 12h

## MEET-029: Default landing page user preference

### Why

Customer wants control over first screen (often Inventory first).

### Build scope

- Add `defaultLandingPage` to user preferences.
- Values: `dashboard`, `inventory`, `accounting-dashboard`.
- Route root honors preference with safe fallback.

### Acceptance criteria

1. Preference set to inventory lands user on inventory at app root.
2. Unset preference falls back to dashboard.
3. Preference changes apply next app load.

### Estimate

- 8h

## MEET-031: Simplified price category filtering

### Why

Current price-category path is complex and time-consuming.

### Build scope

- Add preset bracket chips for common ranges.
- Add saved filter profiles for owner workflow.
- Keep advanced filters behind explicit toggle.

### Acceptance criteria

1. Preset filters apply in one click.
2. Active filter summary explains exactly what is shown.
3. Saved presets are reusable in quick filter list.

### Estimate

- 16h
