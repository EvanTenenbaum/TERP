# Calm Power Redesign Execution Artifacts

This folder contains execution artifacts for the Atomic Roadmap v2 rollout.

## North Star Charter (Mandatory)
- Charter: `north-star/NORTH_STAR_CHARTER.md`
- Scorecard template: `north-star/NORTH_STAR_SCORECARD_TEMPLATE.json`
- Decision log: `north-star/NORTH_STAR_DECISION_LOG.md`

The North Star Charter is required for Sales, Inventory, and Purchase Orders redesign work.
No scoped module can be marked complete without:
- A completed North Star scorecard
- No automatic-fail anti-patterns
- A passing gate result (>= 22/24)

## Plan Amendment Rule (PAR) (Mandatory)
- `par/PAR-PREBUILD-TEMPLATE.md`
- `par/PAR-INFLIGHT-AMENDMENT-TEMPLATE.md`
- `par/PAR-POSTBUILD-TEMPLATE.md`

Every scoped change must run PAR pre-build and post-build. In-flight amendments are required when metrics regress or red-lines appear.

## Phase 0 Outputs
- `P0_SOURCE_HIERARCHY.md`
- `P0_ROUTE_MANIFEST.csv`
- `P0_CANONICAL_PARITY_MANIFEST.csv`
- `P0_SCOPE_REGISTER.md`
- `P0_BASELINE_DEFECT_LEDGER.md`
- `P0_TRUTH_RECONCILIATION.md`

Generate these with:

```bash
pnpm uiux:p0:all
```

## Local Seed + Login Skip
- Seed for redesign testing: `pnpm seed:redesign:v2`
- Verify seed only: `pnpm seed:redesign:v2:verify`
- Local auth bypass policy: `P0_LOCAL_LOGIN_SKIP_POLICY.md`

## Slice Lab Routes
- `/slice-v1-lab/purchase-orders`
- `/slice-v1-lab/product-intake`
- `/slice-v1-lab/inventory`

These are intentionally isolated from production navigation behavior.
