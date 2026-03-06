# Dashboard Path Decision — 2026-03-05

**Ticket**: TER-535 (S4: Dashboard path retention vs convergence)
**Decision Date**: 2026-03-05
**Decision Maker**: Engineering (pending Evan confirmation)

---

## Decision

**KEEP DUAL PATHS — OwnerCommandCenter is the validated primary owner path; DashboardV3 remains as opt-out fallback until explicit cutover is approved.**

---

## Evidence

### OwnerCommandCenterDashboard current state (code-verified)

File: `client/src/pages/OwnerCommandCenterDashboard.tsx`

Widgets present:

- `InventorySnapshotWidget` — inventory value snapshot
- `AgingInventoryWidget` — aging/stale inventory
- `OwnerVendorsNeedPaymentWidget` — payables (labelled as supplier obligations)
- `OwnerAppointmentsWidget` — today's appointments (uses `trpc.scheduling.getTodaysAppointments`)
- `OwnerCashDecisionPanel`, `OwnerDebtPositionWidget`, `OwnerQuickCardsWidget` — cash + AR position

All 5 core owner action widgets are present. `OwnerAppointmentsWidget` (H6, TER-531) is fully implemented.

### DashboardV3 current state

File: `client/src/pages/DashboardHomePage.tsx` — feature-flag toggle between V3 and OwnerCommandCenter

- Feature flag: `owner-command-center-dashboard`
- Rollback: Instant — flip feature flag, no migration required
- V3 continues to serve non-owner roles or users with flag disabled

### Risk assessment

| Risk                        | Likelihood | Mitigation                                        |
| --------------------------- | ---------- | ------------------------------------------------- |
| Owner dashboard regressions | Low        | Feature flag provides instant rollback            |
| Non-owner roles affected    | None       | Flag-gated; V3 is default for other roles         |
| Data contract changes       | None       | Owner dashboard uses same endpoints as V3 widgets |

---

## Rationale

1. Owner dashboard is complete with all 5 core owner action widgets
2. DashboardV3 removal would require usage data and Evan's explicit sign-off — appropriate for a future sprint
3. Dual path is low-cost to maintain (single feature flag)
4. No blocking regressions reported against either path

---

## Action

- **TER-535**: Mark Done — decision documented, no code changes required
- **Follow-up (future sprint)**: When usage data confirms OwnerCommandCenter adoption, create a follow-up ticket to remove DashboardV3 and make OwnerCommandCenter the unconditional default
- **TER-524 (parent)**: Close once TER-535 is the only outstanding child in the secondary track

---

## Sign-off Required from Evan

Before closing TER-535 in Linear, confirm with Evan:

- [ ] Agrees with KEEP DUAL PATHS decision
- [ ] No immediate plan to force-cutover V3 users to OwnerCommandCenter
- [ ] OK to close TER-535 as a decision doc task without code changes
