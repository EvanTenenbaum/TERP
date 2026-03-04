# Checkpoint 3 RED Adversarial Notes (TER-489, TER-490)

## TER-489 (CF-011)

- Invalid numeric inputs: no new numeric parser paths introduced.
- RBAC boundary: payment CTA now hidden when accounting permissions are absent (previously disabled/visible).
- Mode behavior: non-shipping default remains active via sales mode resolver.
- Failed-save preservation: no mutation contract changes in this ticket.

Rollback reference:

- Revert CTA visibility change in `OrdersWorkSurface.tsx` to prior disabled-state behavior if unauthorized users lose required discoverability unexpectedly.

## TER-490 (CF-012)

- Transition integrity: UI transition map now matches server (`PACKED` no longer offers `PENDING`).
- Filter race UX: deterministic filtered-out messaging remains intact in Orders/PickPack surfaces.
- Keyboard stability: empty-list navigation guards prevent negative index drift.

Rollback reference:

- Revert transition-map alignment and keyboard guards if user-reported flow regression appears; keep server transition authority unchanged.
