# P2 Remaining Initiative Charter

## Objective

Finish the remaining Wave 7-9 continuity work without redesigning TERP.

The objective is to close the remaining operator, sales, operations, and settlement seams using the same narrow, proof-first execution approach already used in the latest local tranche.

## Initiative Scope

In scope:

- operator retrieval defaults
- portable cuts and saved-cut continuity
- product identity consistency
- retrieval-to-commit continuity
- operations and settlement continuity
- explicit deferred-backlog decisions
- tranche-level Claude adversarial review

Out of scope:

- major IA or navigation redesign
- whole-module rewrites
- broad refactors not justified by a seam blocker
- opportunistic dashboard expansion

## Success Checks

- the remaining high-frequency human moments feel continuous instead of stitched together
- each tranche lands through seam-sized implementation rather than redesign
- UI craft quality improves alongside functionality
- every tranche closes with local proof, browser proof, and Claude review
- tracker state matches reality by the end of the initiative

## Constraints

- reuse existing building blocks first
- preserve the current spreadsheet-native direction
- no duplicate action surfaces or nonfunctional UI chrome
- no completion claims without evidence

## Decision Hotspots

- how portable cuts should travel across surfaces without creating a new system
- how much of product identity belongs in default rows vs inspector/detail context
- where retrieval-to-commit context should surface without turning the order flow into a dashboard
- how much consignment payout reporting belongs in this initiative vs a follow-on settlement lane

## Exit Rule

This initiative ends when the remaining non-deferred seam work is closed with evidence and the deferred items are explicitly parked or promoted.
