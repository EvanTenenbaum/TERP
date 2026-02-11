# Owner Dashboard Feature Flag Rollout (2026-02-11)

## Goal

Ship the Owner Command Center dashboard behind a feature flag so:

- `OFF` = existing standard dashboard behavior.
- `ON` = owner-focused 6-card command center replaces `/` and `/dashboard`.

## Feature Flag

- Key: `owner-command-center-dashboard`
- Name: `Owner Command Center Dashboard`
- Default: `false` (safe by default)
- Seed path:
  - `server/services/seedFeatureFlags.ts`
  - `scripts/seed/seeders/seed-feature-flags.ts`
  - Runtime startup seeding via `seedAllDefaults()`

## Routing Behavior

- `client/src/pages/DashboardHomePage.tsx` is the dashboard entry page.
- It reads the flag from `FeatureFlagContext`.
- If enabled: render `OwnerCommandCenterDashboard`.
- Else: render existing `DashboardV3`.

## Owner Dashboard Composition (widget reuse)

- `InventorySnapshotWidget`
- `AgingInventoryWidget`
- `OwnerCashDecisionPanel`
- `OwnerDebtPositionWidget`
- `OwnerVendorsNeedPaymentWidget`
- `OwnerQuickCardsWidget`

No new backend domain added. Owner widgets reuse existing APIs and card wiring.

## Backend Contract Hardening

`getVendorsNeedingPayment`:

- Fetches all payable pages (not only first page).
- Computes age by `dueDate` first, then `inventoryZeroAt`, then `createdAt`.
- Keeps sold-out + unpaid filtering.

## Deployment Safety

- Flag defaults to `OFF`.
- Deploying code does not change the user-facing dashboard until flag is explicitly enabled.
- Rollback path:
  - Toggle flag `OFF` immediately in Feature Flags admin.
  - If needed, revert code branch and redeploy.

## Validation Checklist

1. Health check passes after deploy.
2. With flag `OFF`, `/dashboard` shows standard dashboard.
3. Toggle flag `ON` in Feature Flags admin.
4. Reload `/dashboard` and verify owner card layout renders.
5. Verify `Vendors Who Need To Get Paid` card shows data and links to bills.
6. Verify mobile and desktop screenshots for both states.
