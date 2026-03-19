# PowersheetGrid Boundary Contract

Date: `2026-03-19`
Status: `boundary-published-not-frozen`
Owning gate: `G2` shared runtime foundation ([G2-runtime-gate.md](./G2-runtime-gate.md))

## Purpose

Define what other TERP modules may reuse now from the Orders spreadsheet-runtime package, and what remains blocked until the shared runtime foundation is honestly ready.

This document is repo truth for cross-module dependency claims on `PowersheetGrid`. It is a boundary contract, not a broad freeze authorization.

## Current Readiness

- `PowersheetGrid` is the only sanctioned shared spreadsheet runtime seam in the repo.
- `G2` remains `partial`, so the seam is still under active foundation work.
- Every Orders foundation-shared requirement (`ORD-SS-*`, `ORD-SF-*`) is still `implemented-not-surfaced`, which remains rollout-blocking for capability promotion.

## Safe To Reuse Now

Other module teams may reuse the Orders process model immediately:

- roadmap and gate structure
- machine-readable state, closure-packet, and limitation-packet workflow
- proof-row taxonomy and evidence expectations
- requirement mapping, ownership classification, and planning terminology
- coordinator plus read-only-sidecar operating model while a gate is unstable

Other module teams may reference `PowersheetGrid` only as the named shared seam for planning, dependency mapping, and future adapter design preparation.

## Not Safe To Depend On Yet

Other module teams may not treat the current Orders implementation as a frozen technical adapter contract.

Blocked until the prerequisite gate below passes:

- mounting a new module adapter directly against the current `PowersheetGrid` behavior or prop shape
- copying the current Orders shared-runtime wiring as if it were stable API
- claiming coverage for `ORD-SS-*` or `ORD-SF-*` capability classes on another module
- relying on current sort/filter-safe targeting as portable foundation behavior
- relying on current fill-handle evidence as reload-safe persistence proof

## Published Portability Constraints

### `ORD-SS-012` / `SALE-ORD-031`

Sort/filter-safe targeting is a foundation portability constraint, not a portable guarantee.

- Orders still cannot live-prove this invariant on the originating document surface because sort/filter is disabled there.
- Until a live sort/filter-capable surface proves the invariant, no other module may claim `ORD-SS-012` coverage or use Orders as proof that sort/filter-retargeting is safe.
- If another module eventually enables sort/filter, that module needs its own explicit live-proof lane before declaring the capability closed with evidence.

### `ORD-SS-008` / `SALE-ORD-022`

Fill-handle propagation is proven only for the shipped route interaction on the tested build.

- The current closure packet proves `3,4 -> 5,6` route propagation on the live Orders surface.
- The current evidence does not prove a separate reload or persistence round-trip.
- Other modules may not inherit a reload-safe or persistence-safe fill guarantee from Orders yet.

## Future Module Adapter Readiness Gate

Broad parallel technical adapter work stays blocked until all of the following are true:

1. `G2` is `closed with evidence`.
2. `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035` each have a closure packet or explicit limitation packet.
3. This boundary contract is promoted from `boundary-published-not-frozen` to a named frozen interface contract for `PowersheetGrid`.
4. Shared-seam ownership is explicitly reopened for module adapters instead of remaining centralized under the Orders foundation gate.

Even after that gate opens, no module may mark a foundation-shared capability as surfaced, complete, or live-proven while the originating Orders requirement still carries `surfacingStatus: "implemented-not-surfaced"`.

## Operating Rule Until Then

- Share the process model now.
- Keep technical shared-foundation changes centralized.
- Do not treat Orders as broad adapter-ready runtime truth yet.
