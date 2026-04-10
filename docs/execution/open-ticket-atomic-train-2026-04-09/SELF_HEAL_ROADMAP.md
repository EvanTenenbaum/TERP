# Self-Heal Roadmap

Goal: move every current April 9 train confidence score above `95`.

## Roadmap

1. Close stale evidence-only gaps
   - add missing foundation evidence for the workspace transition skeleton
   - make the review packet reference the real shell code and test coverage instead of only `Implement.md`

1. Strengthen proof structure
   - add an explicit per-ticket browser assertion index
   - split coupled browser proofs where one test was standing in for too many tickets
   - make redirect-state proof independent from seeded queue-state proof

2. Strengthen sales warning-state truth
   - create a dedicated browser proof for warning-tinted sales rows
   - verify the proof order reaches both invoice `PARTIAL` and linked order `saleStatus=PARTIAL`
   - heal any backend mismatch uncovered by that proof instead of relaxing the assertion

3. Strengthen live-runtime mutual exclusion
   - add explicit `data-testid` roots for classic and pilot intake surfaces
   - assert exactly one intake surface is present in the live browser

4. Strengthen non-vacuous finance proof
   - keep AP proof seeded across distinct vendors
   - assert global overdue AP total is greater than one before filtered/global comparison is scored

5. Tighten staging gate language
   - make gate-fail tickets and mandatory staging spot-check tickets explicit in the packet
   - keep unresolved runtime-json corroboration items visibly staged rather than silently implied as complete

## Executed

- Done: foundation evidence packet now documents `TER-1093` and `TER-1094`, including `LinearWorkspaceShell` transition-skeleton code and test coverage
- Done: per-ticket browser assertion index added to `operations-review-packet.md`
- Done: dedicated sales warning-row browser proof added in `april-09-ui-regressions.spec.ts`
- Done: payment recording / allocation / void flows now synchronize linked order `saleStatus` in `server/routers/payments.ts`
- Done: intake browser proof split so `TER-1117` has its own live-runtime mutual-exclusion test
- Done: `direct-intake-surface` and `intake-pilot-surface` test ids added for strict browser exclusion checks
- Done: procurement redirect handoff proof now runs before any confirmed-PO queue seed is created
- Done: AP narrowing proof now asserts distinct vendors and a global overdue AP total greater than one
- Done: staging gate / rollback context expanded in `operations-review-packet.md`

## Still required for >95 everywhere

- `TER-1110`
  - rerun the strengthened row-tint proof on a fresh local or staging app once auth/startup instability stops blocking the clean browser pass
- `TER-1125`
  - add stronger tolerance justification or broader data-volume proof
- `TER-1128`
  - validate the AP narrowing proof against the deployed staging data state after merge
