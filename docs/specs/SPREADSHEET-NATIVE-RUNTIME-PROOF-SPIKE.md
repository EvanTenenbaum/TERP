# Specification: Spreadsheet-Native Runtime Proof Spike

**Task:** ARCH-SS-016  
**Status:** Draft  
**Priority:** HIGH  
**Spec Date:** 2026-03-14

## 1. Runtime Decision Rule

AG Grid Community is the provisional baseline because:

- it is already installed in TERP
- it is already used in work-surface and spreadsheet code paths
- it is self-hosted and compatible with the fork’s runtime constraint

It is not locked in permanently.

It must pass this proof spike before implementation proceeds.

## 2. Must-Pass Scenarios

| Scenario                      | Why It Matters                                             | Pass Rule                                                                   |
| ----------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------------- |
| multi-table coordination      | pilots require header/detail and stage-lane layouts        | changing primary selection updates supporting tables without losing context |
| keyboard-first flow           | existing TERP work surfaces already rely on keyboard speed | selection, edit, commit, cancel, and focus-return work consistently         |
| guarded paste and bulk edit   | spreadsheet-native ERP lives or dies on safe dense editing | protected fields block safely and eligible fields update predictably        |
| safe fill behavior            | users expect batch edits without formula creation          | fill works only on approved fields and never bypasses validation            |
| locked cells by permission    | sheet UIs make everything look editable unless constrained | locked cells present locked state before interaction                        |
| dropdown/autocomplete editors | orders and inventory both need lookup-rich editing         | editors support dense entry without dropping validation                     |
| validation presentation       | ERP must expose blocked workflows clearly                  | cell, row, and process readiness states all remain visible                  |
| inspector integration         | fork still needs detailed context without page hopping     | row selection and inspector state stay synchronized                         |
| deep-linkable selection state | ledgers and proof need URL-stable reproduction             | workbook route plus selected record can be reproduced reliably              |
| pilot-scale performance       | dense grid value disappears if interaction latency spikes  | pilot data loads and edits remain responsive on staging-like data           |

## 3. Pilot Surfaces Used for the Spike

- existing grid-aware work surfaces
- existing inventory spreadsheet prototype
- pilot prototype shells built against the new adapter contracts

The current UI may provide proof mechanics, but it must not define the future layout.

## 4. Failure Rule

If AG Grid Community fails any must-pass scenario:

- stop pilot implementation
- record the specific failed scenario
- reopen the runtime decision with the smallest possible alternative evaluation

No silent fallback to custom one-off behavior is allowed.

## 5. Shared Staging Rollout Rule

The current TERP staging app remains a dress rehearsal for production behavior.

Until a separate pilot environment is explicitly approved:

- shared staging defaults to the classic workbook surfaces
- sheet-native pilot surfaces stay behind the `spreadsheet-native-pilot` feature flag
- active pilot sessions should refetch rollout state on a short interval so rollback does not depend on manual reload or window refocus
- shared workbook pages should not expose a visible sheet-native pilot toggle until a dedicated pilot entry surface is intentionally approved
- hidden `surface=sheet-native` query parameters must not activate pilot surfaces when the pilot flag is off
- stale pilot URLs should be normalized back to the classic route with a reversible replace-state navigation

This keeps the pilot easy to disable without spinning up a second staging app or leaving confusing alternate paths exposed to normal staging users.
