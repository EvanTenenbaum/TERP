# P2 Remaining Initiative

**Date:** 2026-04-07  
**Status:** Recovery checkpoint normalized on branch  
**Module:** Spreadsheet-native sales, operations, relationships, and accounting continuity  
**Scope:** Complete the remaining P2 initiative without a redesign or broad refactor

## Purpose

This package turns the remaining Wave 7-9 initiative into a spec-driven execution lane.

It preserves the working doctrine already proven in the latest local tranche:

- keep the human problems full-size
- keep the code changes seam-sized
- reuse existing building blocks instead of redesigning TERP
- require runtime/browser proof before calling a seam done
- require bounded adversarial review before closing a tranche

## Baseline

Recovery work on 2026-04-07 separated the remaining initiative into 3 truth buckets:

- already on `main` with acceptance-criteria proof:
  - order-side retrieval improvements in the availability browser
  - order search by client name in global search / Cmd+K and the orders queue
  - payment confirmation with remaining-balance feedback
- recovered onto the TER-1067 branch with fresh proof:
  - copy-for-chat from the Sales Catalogue
  - overdue invoice contact visibility
  - record-payment submit re-entry guard
- still analysis or planning inputs, not yet implementation:
  - tranche seam audits, dependency graph, and tracker normalization artifacts

Use the reconciliation packet in this folder as the authority for what was actually proven. Do not treat old session narration or the unmerged `docs/initiatives/...` proposal as canonical on `main`.

## Remaining Initiative

The remaining initiative now reduces to four tranches:

1. operator retrieval defaults, portable cuts, and product identity
2. retrieval-to-commit continuity in the sales flow
3. operations and settlement continuity
4. deferred backlog decision pass

## Document Map

- [00-program-charter.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/00-program-charter.md)
  Entry-point charter for the initiative.
- [requirements/README.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/requirements/README.md)
  Human problems, user stories, acceptance criteria, and success definition.
- [design/README.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/design/README.md)
  Improved execution framework, tranche design, UI craft gates, and QA / Claude review contract.
- [tasks/README.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/tasks/README.md)
  Execution checklist and Linear mapping for the remaining initiative.
- [Implement.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/Implement.md)
  Live implementation-side checkpoint log and evidence expectations.
- [Documentation.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/Documentation.md)
  QA, handoff, and reopen guidance for the initiative.
- [reconciliation/2026-04-07-ter-1067-reconciliation.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reconciliation/2026-04-07-ter-1067-reconciliation.md)
  Source-of-truth report for repo, PR, proof, and tracker alignment.
- [evidence/ter-1067/README.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/evidence/ter-1067/README.md)
  Index of the proof bundle, runtime screenshots, and verification commands used for TER-1067.
- [reviews/2026-04-07-scope-alignment-review.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reviews/2026-04-07-scope-alignment-review.md)
  Canonical-home decision and doc-system alignment.
- [reviews/2026-04-07-adversarial-review.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reviews/2026-04-07-adversarial-review.md)
  Bounded hostile pass for the TER-1067 recovery diff and proof packet.
- [reviews/2026-04-07-recovery-scorecard.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/reviews/2026-04-07-recovery-scorecard.md)
  Combined closeout scorecard for recovery completeness.
- [analysis/p2-dependency-graph.md](/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/p2-remaining-initiative/analysis/p2-dependency-graph.md)
  Rebuilt dependency map for TER-1068 through TER-1071.

## Guardrails

- No major navigation rewrite.
- No new module architecture.
- No broad refactor disguised as UX cleanup.
- No whole-page AI authorship.
- No completion claim without tests, runtime proof, and tracker writeback.
- No UI change that only makes sense after explanation.
- `docs/specs/spreadsheet-native-foundation/p2-remaining-initiative` remains the canonical repo home on `main`.
- PR 569's `docs/initiatives/...` packet is useful recovery input, but it is not authoritative unless explicitly promoted later.

## Definition Of Done

The remaining initiative is complete when:

- the top brokerage moments feel like one continuous operating loop
- the remaining high-frequency seams are closed without redesigning TERP
- each tranche closes with code proof, browser proof, and Claude adversarial review
- deferred items are explicitly promoted or parked instead of silently lingering
