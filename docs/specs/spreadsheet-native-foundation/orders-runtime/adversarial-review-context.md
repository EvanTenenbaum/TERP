# Orders Runtime Adversarial Review Context

_Generated from `ter-795-state.json`. Attach this context before bounded adversarial reviews._

- Active atomic card: `TER-795`
- Gate verdict: `partial`
- Live reference build: `build-mmxzi3to` via deployment `eb16abcf-6c41-4939-a2bf-dd5687c0cc3a`
- Deploy commit: `1e248c932623ad6c5248a7f18b4e1d23f128b297`
- Persona: `sales-manager`
- Next move: `SALE-ORD-020` — Move to the next independent TER-795 row with one isolated multi-cell edit packet.

## Accepted Rows

- `SALE-ORD-019`
- `SALE-ORD-022`
- `SALE-ORD-030`
- `SALE-ORD-032`

## Remaining Rows

- `SALE-ORD-020`
- `SALE-ORD-021`
- `SALE-ORD-029`
- `SALE-ORD-031`
- `SALE-ORD-035`

## Acceptance Criteria

- `SALE-ORD-019`: full drag shift cmd and scope-selection proof across required surfaces
- `SALE-ORD-020`: multi-cell edit pricing autosave proof
- `SALE-ORD-021`: approved-field paste proof on staging
- `SALE-ORD-022`: deployed-build proof that quantity fill propagates `3,4 -> 5,6` or an explicit limitation packet
- `SALE-ORD-029`: clear-style actions and structured edit rejection proof
- `SALE-ORD-031`: sort/filter-safe targeting proof
- `SALE-ORD-035`: failure-mode bundle proof beyond immediate invalid-edit rejection

## Prior Review Conclusions

- `TER-795 row031 review 2026-03-19`: `SALE-ORD-022` could not be promoted before ship; `SALE-ORD-031` should stay partial because the live Orders document surface still disables sort/filter.
- `TER-795 post-ship review 2026-03-19`: `SALE-ORD-022` remains acceptable as closed with evidence, with one residual caution that the probe proves live propagation rather than a separate reload or persistence round-trip.

## Probe Packets

- `SALE-ORD-019` -> `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-selection-closure-packet.json` (closed with evidence)
- `SALE-ORD-022` -> `output/playwright/orders-runtime-g2/2026-03-19/orders-runtime-fill-handle-closure-packet.json` (closed with evidence)
- `SALE-ORD-030` -> `output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-closure-packet.json` (closed with evidence)
- `SALE-ORD-032` -> `output/playwright/orders-runtime-g2/2026-03-18/orders-runtime-g2-closure-packet.json` (closed with evidence)
