# Scope Alignment Review

## Decision

`docs/specs/spreadsheet-native-foundation/p2-remaining-initiative` remains the canonical repo home for the remaining initiative.

## Why

- It is the only initiative packet already merged to `main`.
- It already encodes the seam-first, proof-first execution rules the recovery needs.
- Promoting PR 569's `docs/initiatives/...` tree wholesale would create a second active documentation system without tracker or merge-history authority.

## What Was Re-Homed

The following missing artifacts were recreated here instead of under `docs/initiatives/...`:

- reconciliation report
- adversarial review report
- recovery scorecard
- tranche seam-analysis docs
- dependency graph
- TER-1067 evidence index

## Scope Boundaries Preserved

- no redesign
- no foundational debate reset
- no silent doc-system fork
- no tranche advancement without proof and tracker writeback

## Implication For PR 569

PR 569 remains useful as recovery evidence, but its doc tree is not authoritative and should not be merged blindly.
