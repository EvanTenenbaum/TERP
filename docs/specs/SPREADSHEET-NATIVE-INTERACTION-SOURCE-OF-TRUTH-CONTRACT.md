# Specification: Spreadsheet-Native Interaction Source of Truth Contract

**Task:** ARCH-SS-009: Interaction Source of Truth and Preservation Contract for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** CRITICAL  
**Estimate:** 14h planning / migration safety design  
**Module:** Cross-product architecture, migration safety, parity proof  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md](./SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md), [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv), [FLOW_GUIDE.md](../reference/FLOW_GUIDE.md), [USER_FLOWS.md](../features/USER_FLOWS.md), [FEATURE_PRESERVATION_MATRIX.md](./ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

The spreadsheet-native fork cannot be planned safely from memory, screenshots, or high-level module names.

TERP already has a large interaction inventory, but it is spread across multiple documents with different purposes:

- one document is row-level and exhaustive
- one is narrative and easier to read
- one is feature- and journey-level
- one is redesign-specific preservation proof
- older source assets still exist behind the working documents

If teams treat those documents as interchangeable, the fork will drift in predictable ways:

- low-visibility flows will be missed
- API-only and background flows will be silently dropped
- hidden routes and exception surfaces will be forgotten
- one module blueprint will preserve more than another
- disagreements about "what exists today" will be settled by opinion instead of evidence

This contract exists to stop that.

## 2. Core Principle

Before any workbook or module blueprint is approved, the current TERP interaction surface must be reconciled against the canonical source set defined here.

No spreadsheet-native blueprint may proceed on module intuition alone.

## 3. What Counts as Interaction Coverage

For this fork, an interaction is anything that changes, retrieves, validates, routes, advances, exports, or confirms meaningful ERP work.

Coverage includes:

- visible UI page flows
- hidden routes that users can still reach
- inspector and drawer actions
- inline edit and bulk actions
- workflow transitions
- validation and readiness checks
- reports and exports
- print and document outputs
- API-only flows that support a visible workflow
- background and scheduled actions that users depend on indirectly
- permission-gated variants of the same flow

Coverage does not mean only "buttons on screens."

## 4. Canonical Source Set

The following source set must be used together.

### 4.1 Primary Operational Inventory

| Source                                                    | Current Role                              | Why It Matters                                                                                                       |
| --------------------------------------------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv) | canonical row-level interaction inventory | most exhaustive working list of current procedures, permissions, routes, implementation status, and business purpose |
| [FLOW_GUIDE.md](../reference/FLOW_GUIDE.md)               | narrative companion to the matrix         | explains domains, entity groupings, lifecycle states, and human-readable business structure                          |

Observed current repo snapshot:

- `USER_FLOW_MATRIX.csv` currently contains **509 flow rows**, **33 domains**, and **106 domain/entity groupings**
- `FLOW_GUIDE.md` currently contains **27 domain sections** and **102 entity sections**

These counts are intentionally recorded because mismatch risk is real.

### 4.1.1 Stable Flow Row Key Requirement

`USER_FLOW_MATRIX.csv` does not currently expose a dedicated row ID column.

For spreadsheet-native migration work, every matrix row must therefore be referenced by a derived stable key:

`<Domain>|<Entity>|<Flow Name>|<tRPC Procedure>|<UI Entry Paths or NoUI>`

Rules:

- use the exact CSV cell values after trimming surrounding whitespace
- if `UI Entry Paths` is blank, use `NoUI`
- if multiple UI entry paths exist, keep the full literal cell value
- do not substitute preservation-matrix IDs like `ACCT-001` for matrix rows

This rule exists because unstable row references will make capability ledgers untrustworthy.

### 4.2 Feature and Journey Layer

| Source                                                                                 | Current Role                   | Why It Matters                                                                                   |
| -------------------------------------------------------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------ |
| [USER_FLOWS.md](../features/USER_FLOWS.md)                                             | feature-module and journey map | captures major features, exclusions, golden flows, and route-level product framing               |
| [FEATURE_PRESERVATION_MATRIX.md](./ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md)      | redesign preservation overlay  | maps current surfaces to future UX patterns and highlights what must not be lost during redesign |
| [FEATURE_PRESERVATION_SYSTEM.md](./ui-ux-strategy/docs/FEATURE_PRESERVATION_SYSTEM.md) | preservation process           | defines anti-deletion process and evidence hierarchy for redesign work                           |

### 4.3 Customer-Alignment and Provenance Layer

| Source                                                                                                      | Current Role                          | Why It Matters                                                                     |
| ----------------------------------------------------------------------------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------- |
| [User_Flow_Matrix_Alignment_Report.md](../meeting-analysis-2026-01-11/User_Flow_Matrix_Alignment_Report.md) | customer-requirement coverage overlay | shows what customer-requested behaviors are represented, missing, or under-modeled |
| [docs/assets/ST-045/TERP_User_Flow_Matrix_FULL.csv](../assets/ST-045/TERP_User_Flow_Matrix_FULL.csv)        | source/provenance asset               | earlier fuller-generation asset for recovery, comparison, and discrepancy analysis |
| [docs/assets/ST-045/TERP_Flow_Guide.md](../assets/ST-045/TERP_Flow_Guide.md)                                | source/provenance asset               | earlier fuller-generation guide for recovery and drift investigation               |
| [docs/assets/ST-045/_\_UPDATED._](../assets/ST-045/)                                                        | intermediate working assets           | useful when current reference docs and older source assets disagree                |

## 5. Source Precedence Rules

When these sources disagree, use this order:

1. **Current code and current behavior**
   - routers, services, route definitions, permissions, and verified runtime behavior are the final arbiter
2. **`USER_FLOW_MATRIX.csv`**
   - this is the primary working inventory for row-level interaction coverage
3. **`FLOW_GUIDE.md`**
   - use it for narrative structure, lifecycle context, and human-readable grouping
4. **`USER_FLOWS.md`**
   - use it for module intent, exclusions, golden flows, and product-journey framing
5. **`FEATURE_PRESERVATION_MATRIX.md`**
   - use it for redesign preservation mapping and migration risk framing
6. **Alignment and provenance documents**
   - use them to explain gaps, recover drift, and validate customer-request coverage

Important rule:

- `USER_FLOWS.md` is not exhaustive enough to substitute for `USER_FLOW_MATRIX.csv`
- `FLOW_GUIDE.md` is not authoritative enough to excuse missing rows from `USER_FLOW_MATRIX.csv`
- ST-045 assets are provenance and recovery sources, not the day-to-day working truth unless a discrepancy requires them

## 6. Known Drift and Mismatch Risks

The source set is strong, but not perfectly uniform.

### 6.1 Matrix vs Guide Coverage Shape

Current repo evidence shows:

- `USER_FLOW_MATRIX.csv` has 33 domains
- `FLOW_GUIDE.md` has 27 domain sections

This means the guide is not sufficient by itself for exhaustive migration planning.

### 6.2 High-Level Features vs Row-Level Flows

`USER_FLOWS.md` is extremely useful, but it operates at feature and journey level rather than every procedure-level interaction.

Risk:

- a blueprint can preserve the visible feature while losing lower-level actions, transitions, report paths, or permission variants

### 6.3 Working Docs vs Provenance Assets

The ST-045 assets are much larger than the current reference docs.

Observed current repo snapshot:

- `TERP_Flow_Guide.md` under `docs/assets/ST-045/` has 18,313 lines
- `FLOW_GUIDE.md` under `docs/reference/` has 1,454 lines

This does not automatically mean the reference guide is wrong. It does mean provenance cannot be ignored when investigating gaps.

### 6.4 Hidden and API-Only Flows

The matrix includes:

- hidden routes
- background and scheduled entry points
- API-only flows

Those must still be classified during spreadsheet-native planning, even when the new fork will not expose them as a primary sheet surface.

## 7. Required Artifact Stack Before Any Module Blueprint

Every workbook or module blueprint must include four inputs:

1. **Source appendix**
   - repo snapshot metadata
   - exact matrix rows
   - relevant flow-guide sections
   - relevant feature-module sections
   - preservation-matrix rows
   - relevant golden flows
   - code references when docs are incomplete or disputed
2. **Capability ledger**
   - capability-level mapping into sheet-native, sheet-plus-sidecar, or exception handling
3. **Discrepancy log**
   - any mismatch between sources or code
4. **Exception declaration**
   - anything intentionally left outside the sheet-primary model

If any of these are missing, the blueprint is not ready.

## 8. Required Source Appendix Structure

Every source appendix must record:

- repo commit SHA or branch snapshot used for the analysis
- extraction date
- owner
- whether the appendix was checked against current code or docs only
- unresolved discrepancy count by criticality

### 8.1 Required Source Appendix Fields

Each blueprint must include a short source appendix using a format like:

```md
## Source Appendix

Snapshot:

- Commit: <sha-or-branch>
- Extracted: <date>
- Checked Against Code: yes/no

| Source Type         | Reference                                                | Relevant Rows / Sections | Code Refs                            | Why It Matters                    | Open Questions                  |
| ------------------- | -------------------------------------------------------- | ------------------------ | ------------------------------------ | --------------------------------- | ------------------------------- | -------------------- | ---------------------------- | ------------------------------------------------- | ------------------------------------------------------------------- |
| Flow Matrix         | docs/reference/USER_FLOW_MATRIX.csv                      | Accounting               | Payments                             | Receive Client Payment            | accounting.receiveClientPayment | /accounting/payments | server/routers/accounting.ts | defines payment intake interaction and entry path | payment preview marked API-only but surfaced in current payment UX? |
| Flow Guide          | docs/reference/FLOW_GUIDE.md                             | Domain 1.2 Payments      | server/routers/accounting.ts         | lifecycle and accounting grouping | none                            |
| Feature Map         | docs/features/USER_FLOWS.md                              | DF-003, DF-054, GF-004   | client route + router refs as needed | journey and golden-flow context   | none                            |
| Preservation Matrix | docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md | ACCT-008..010            | current route refs as needed         | redesign parity requirement       | none                            |
```

## 9. Migration Workflow Required by This Contract

For every module or workbook:

1. Extract all relevant rows from `USER_FLOW_MATRIX.csv`
2. Find the corresponding sections in `FLOW_GUIDE.md`
3. Map to `USER_FLOWS.md` feature IDs and golden flows
4. Crosswalk to `FEATURE_PRESERVATION_MATRIX.md`
5. Identify hidden routes, API-only flows, reports, and background actions
6. Build the capability ledger from that evidence
7. Record every discrepancy explicitly
8. Only then design the spreadsheet-native blueprint

This order is mandatory because design-first migration planning is exactly how functionality gets lost.

### 9.1 Discrepancy Stop Rule

Blueprint approval must stop when:

- any `P0` or `P1` capability has unresolved disagreement between docs and code
- any relevant matrix row cannot be mapped or intentionally classified
- any permission or validation behavior is still inferred rather than evidenced

`P2` discrepancies may proceed only if they have:

- a named owner
- a due date
- an explicit temporary assumption
- a compensating verification note

## 10. Rules for Not Losing Functionality

### 10.1 No Unaccounted Relevant Matrix Rows

If a matrix row is relevant to the module in scope, it must end up as one of:

- preserved sheet-native behavior
- preserved sheet-plus-sidecar behavior
- preserved exception-surface behavior
- intentionally deferred with owner and evidence
- rejected with evidence and approval

Ignoring a row is not allowed.

### 10.2 No Feature-Only Preservation Claims

It is not enough to say:

- "Orders are covered"
- "Accounting is covered"
- "Inventory is basically preserved"

The proof must go down to capability-level interactions.

### 10.3 No Hidden-Route Blind Spots

Hidden routes, non-sidebar routes, and internal utility flows still count if users or the system rely on them.

### 10.4 No API-Only Amnesia

If a current visible workflow depends on an API-only row or background action, that dependency must stay intact even if it is not exposed as a standalone sheet.

### 10.5 No Exception-Surface Escape Hatch

Declaring a module an exception does not remove the obligation to preserve the underlying functionality.

### 10.6 No Undocumented-Code Blind Spot

If code reveals a capability that is missing from the current source docs:

- the discrepancy must be logged immediately
- the missing flow must be added to the working source set before the blueprint is approved

The new team should not normalize documentation gaps as "close enough."

## 11. Required Output from Capability Ledgers

Every capability ledger created after this contract must include source traceability for each row:

- repo snapshot used
- matrix row or exact procedure reference
- flow-guide section reference
- feature ID(s)
- preservation-matrix row(s)
- golden-flow ID(s), if applicable
- discrepancy note, if applicable

This is required so that the ledger proves current-state coverage instead of acting as a fresh brainstorm.

## 12. Adversarial QA Findings and Resolutions

### Finding 1: "You are still trusting docs that may already be stale."

Risk:

- the fork preserves documentation, not reality

Resolution:

- made current code and verified behavior the top precedence layer
- required a discrepancy log whenever docs and code disagree

### Finding 2: "Teams will read `USER_FLOWS.md` and skip the matrix because it is easier."

Risk:

- high-level feature coverage masks missing interactions

Resolution:

- made `USER_FLOW_MATRIX.csv` the primary working inventory
- explicitly prohibited feature-only preservation claims

### Finding 3: "The matrix does not have stable row IDs, so teams will cite rows inconsistently."

Risk:

- source appendices and ledgers cannot be reconciled across teams

Resolution:

- added a derived stable row-key rule for matrix references
- prohibited substituting preservation-matrix IDs for matrix rows

### Finding 4: "Background and API-only behavior will still get dropped because nobody sees it in the UI."

Risk:

- spreadsheet-native fork breaks indirect workflow support and reporting integrity

Resolution:

- explicitly included API-only, background, scheduled, export, and output flows in scope

### Finding 5: "The older ST-045 assets will confuse people and create duplicate truth."

Risk:

- teams cherry-pick whichever document supports the story they want

Resolution:

- defined ST-045 as provenance and recovery material, not working truth unless discrepancy investigation requires it

### Finding 6: "Module blueprints will still move forward without a disciplined appendix."

Risk:

- capability ledgers look complete but have weak source grounding

Resolution:

- required a source appendix as a pre-blueprint artifact
- required source-traceability fields in every capability ledger row

### Finding 7: "The team will carry unresolved P0/P1 discrepancies forward because the docs feel mostly aligned."

Risk:

- blueprint quality looks high while the most dangerous gaps remain open

Resolution:

- added an explicit discrepancy stop rule
- blocked blueprint approval on unresolved high-criticality disagreements

## 13. Decision

This contract becomes the mandatory intake step between the high-level spreadsheet-native architecture docs and any workbook- or module-specific blueprinting.

In plain terms:

- first reconcile what TERP actually does
- then map it into sheets
- never the other way around
