# Checkpoint 3 Blast Radius (TER-488..TER-491)

## Scope

- TER-488 / CF-009: sales pricing validation guidance behavior
- TER-489 / CF-011: non-shipping CTA semantics + RBAC visibility
- TER-490 / CF-012: status-control reliability and filter/focus stability
- TER-491 / CF-013: New Sale label/discoverability consistency

## Touched Domains

- UI: `client/src/components/orders/OrderStatusActions.tsx`
- Orders work-surface behavior: `client/src/components/work-surface/OrdersWorkSurface.tsx`
- Pick & Pack keyboard/list behavior: `client/src/components/work-surface/PickPackWorkSurface.tsx`
- Test coverage: `client/src/components/orders/OrderStatusActions.test.tsx`

## Risk Review

- Pricing guidance: no data-path changes; copy/validation behavior only.
- CTA semantics: RBAC visibility corrected from disabled-state to visibility-gated payment action.
- Status reliability: transition map aligned with server state machine and empty-list keyboard underflow guarded.
- Discoverability: New Sale paths remain unchanged and covered by existing workspace/layout tests.

## Regression Targets

- Orders runtime oracle domain
- Pick & Pack runtime oracle domain
- Cross-surface smoke (sales/orders/pick-pack/accounting navigation)
