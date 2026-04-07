# P2 Remaining Initiative

**Date:** 2026-04-07  
**Status:** Draft for execution  
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

The following seams are already closed locally with proof and should be treated as the starting point for the remaining initiative:

- order-side retrieval improvements in the availability browser
- order search by client name in global search and Cmd+K
- copy-for-chat from the Sales Catalogue
- overdue invoice contact visibility
- payment confirmation with remaining-balance feedback
- local Domscribe/runtime repair so browser proof is available again

These changes are part of the active local worktree and must be reconciled against Linear as proof-backed execution, not re-planned as net-new product work.

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

## Guardrails

- No major navigation rewrite.
- No new module architecture.
- No broad refactor disguised as UX cleanup.
- No whole-page AI authorship.
- No completion claim without tests, runtime proof, and tracker writeback.
- No UI change that only makes sense after explanation.

## Definition Of Done

The remaining initiative is complete when:

- the top brokerage moments feel like one continuous operating loop
- the remaining high-frequency seams are closed without redesigning TERP
- each tranche closes with code proof, browser proof, and Claude adversarial review
- deferred items are explicitly promoted or parked instead of silently lingering
