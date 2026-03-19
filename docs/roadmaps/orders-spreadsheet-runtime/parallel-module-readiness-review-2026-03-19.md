# Parallel Module Readiness Review

Date: `2026-03-19`

## Purpose

Preserve the current answer, adversarial QA, and corrected execution guidance for whether the Orders spreadsheet-runtime rollout is mature enough to let other module teams start in parallel.

This note is repo truth for the Orders initiative. It is not a cross-module rollout authorization.

## Reviewed Question

Do we have enough AG Grid and spreadsheet-runtime learnings from Orders that other module teams can start in parallel using this implementation as the foundation?

## Sources

- Current Orders roadmap package:
  - [README.md](./README.md)
  - [Roadmap 1 - G2 shared runtime foundation](./roadmap-1-g2-shared-runtime-foundation.md)
- Current gate and state truth:
  - [G2-runtime-gate.md](../../specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md)
  - [Implement.md](../../specs/spreadsheet-native-foundation/orders-runtime/Implement.md)
  - [ter-795-state.json](../../specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json)
- Current contract shape:
  - [ordersRolloutContract.ts](../../../client/src/lib/spreadsheet-native/ordersRolloutContract.ts)
- External adversarial review artifact:
  - [Claude review report](/Users/evan/.codex-runs/claude-qa/20260319T224014Z-users-evan-codex-runs-claude-qa-input-module-parallelization-rea-c8ee47/report.md)

## Corrected Verdict

The Orders rollout is ready to share its process model, but not ready to authorize broad parallel technical adapter work on the shared spreadsheet runtime.

Safe to parallelize now:

- roadmap and gate structure
- machine-readable state and closure-packet workflow
- proof taxonomy and evidence expectations
- module requirement mapping and ownership classification
- planning work for future module adapters

Not safe to parallelize yet:

- unrestricted edits against `PowersheetGrid` as if the shared seam were frozen
- cross-module adapter implementation that assumes the current foundation-shared capabilities are stable and portable
- any module claiming coverage for foundation-shared capability classes before Orders closes the originating gate honestly

## Why The Earlier Optimistic Answer Was Rejected

1. `G2` is still `partial`.
   The current shared runtime gate still has open proof rows: `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, `SALE-ORD-031`, and `SALE-ORD-035`.

2. Foundation-shared requirements are still rollout-blocked.
   In [ordersRolloutContract.ts](../../../client/src/lib/spreadsheet-native/ordersRolloutContract.ts), every `ORD-SS-*` and `ORD-SF-*` requirement still carries `surfacingStatus: "implemented-not-surfaced"`, and the active roadmap package treats that status as blocking.

3. Sort/filter safety is still not portable.
   `SALE-ORD-031` remains `partial` because the live Orders document surface still disables sort/filter, so this path cannot yet be live-proven on the originating module.

4. Fill-handle proof still carries a persistence caveat.
   `SALE-ORD-022` is acceptable as closed with evidence for shipped-route propagation, but the current evidence still does not prove a separate reload or persistence round-trip.

5. The process foundation is stronger than the technical foundation.
   The durable roadmap package, state file, proof packets, and probe cadence are reusable now. The underlying shared runtime seam still needs a documented frozen interface before other module teams can safely build adapters against it.

## Required Prerequisites Before Parallel Technical Module Work

Do not authorize parallel technical adapter work for other modules until all of the following are true:

1. `G2` is promoted to `closed with evidence`.
2. `SALE-ORD-020`, `SALE-ORD-021`, `SALE-ORD-029`, and `SALE-ORD-035` each have a closure packet or explicit limitation packet.
3. A `PowersheetGrid` interface-freeze document exists in the repo and names the stable boundary other modules are allowed to target.
4. The `SALE-ORD-031` sort/filter limitation is published as a foundation constraint, or another live surface proves the invariant directly.
5. The `SALE-ORD-022` fill-handle persistence caveat is explicitly attached to the shared capability until a reload round-trip probe closes it.

## Operating Guidance Right Now

- Other teams may start module chartering, requirement mapping, proof-row inventory, and planning lanes immediately.
- Other teams may not treat Orders as a fully proven shared runtime reference yet.
- Shared-seam changes should remain centralized until the Orders foundation gate is closed and the interface boundary is frozen.

## Next Repo Follow-Through

The next implementation pass should encode this decision into repo truth instead of leaving it as a chat-only conclusion. The implementation scope should include:

- a repo-native `PowersheetGrid` interface-freeze document
- explicit portability constraints for `ORD-SS-008` and `ORD-SS-012`
- roadmap wording that separates reusable process scaffolding from reusable technical foundation
- a concrete prerequisite gate for future module adapter work
