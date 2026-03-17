# Specification: Spreadsheet-Native Save, Transaction, and Undo Contract

**Task:** ARCH-SS-004: Save, Transaction, and Undo Contract for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** CRITICAL  
**Estimate:** 26h planning / interaction architecture  
**Module:** Persistence semantics, recovery, user trust  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), [SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md](./SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md), [SPREADSHEET-NATIVE-UX-UI-FRAMEWORK.md](./SPREADSHEET-NATIVE-UX-UI-FRAMEWORK.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

Spreadsheet-native UX creates strong expectations:

- cell edits save quickly
- visible changes are trustworthy
- mistakes are recoverable
- workflow actions are explicit

ERP reality is stricter:

- some changes can save instantly
- some changes must be grouped
- some actions are transactional
- some actions are reversible only through compensating actions
- some actions should never pretend to be undoable

This contract defines one persistence and recovery model so the fork does not drift into confusing save behavior or fake undo promises.

## 2. Core Principle

Users should always know:

- whether they changed local draft state or committed system state
- whether the system is saving, saved, blocked, or conflicted
- whether an action is undoable, reversible, or irreversible

## 3. Persistence Classes

Every sheet interaction must belong to one of these classes.

### 3.1 Class A: Immediate Field Commit

Use for:

- safe primitive edits on existing records
- low-coupling changes
- high-frequency operational tweaks

Examples:

- quantity adjustment note
- status-safe text update
- non-critical metadata edit

Behavior:

- commit from cell or inspector on defined checkpoint
- show `Saving` then `Saved` or `Needs attention`
- conflict/error is tied back to the row or field

### 3.2 Class B: Row Commit

Use for:

- new rows or rows with multiple dependent fields that must validate together

Examples:

- new intake line
- draft adjustment row
- staged line-item addition

Behavior:

- changes may remain local until row commit
- row cannot enter committed state until row-level validation passes
- invalid row stays visible with actionable errors

### 3.3 Class C: Document Commit

Use for:

- parent/child structures where the document must stay coherent

Examples:

- sales order header + lines
- invoice draft + items
- purchase order draft + receiving linkage

Behavior:

- local edits may span header, lines, and derived totals
- document readiness is shown clearly
- commit point is explicit

### 3.4 Class D: Workflow Transition Action

Use for:

- changes to business state or stage

Examples:

- approve
- release
- receive
- pack
- close period

Behavior:

- always explicit action
- never treated as a casual cell edit
- response must communicate success, partial success, or blocking reason

### 3.5 Class E: Background / Queued Operation

Use for:

- long-running or multi-record operations

Examples:

- large import
- document generation
- bulk reconciliation
- mass transition job

Behavior:

- queue state shown explicitly
- background progress visible after initiation
- user is not told the work is complete until completion is real

## 4. Save Vocabulary

The product uses the same top-level save states everywhere:

- `Saved`
- `Saving`
- `Needs attention`

Substates may exist internally, but the user-facing top level must remain stable.

Allowed subordinate qualifiers:

- queued
- validating
- conflict
- retry needed

## 5. Save Trigger Rules

### 5.1 Allowed Trigger Types

- cell blur
- explicit confirm inside cell editor
- row commit
- explicit document save
- explicit workflow action
- explicit background action start

### 5.2 Disallowed Trigger Types

- silent save on focus movement with no stable checkpoint
- saving while a value is mid-entry in ways that create false errors
- module-specific autosave behavior that contradicts the class definitions

## 6. Validation and Commit Order

The system must validate in this order where relevant:

1. field constraints
2. row readiness
3. document/process readiness
4. permission and concurrency truth
5. commit / action execution

The UI must not imply successful save before all required checks for that class are complete.

## 7. Transaction Model

### 7.1 Transaction Types

- `single-record transaction`
- `row bundle transaction`
- `document transaction`
- `bulk action transaction`
- `background job with compensating records`

### 7.2 Transaction Boundaries

Each blueprint must specify:

- transaction owner
- unit of failure
- unit of retry
- partial success rules
- user-visible recovery path

### 7.3 Partial Success Rules

Partial success is allowed only when explicitly defined.

Required:

- clear summary of success vs failure
- preserved context for failed items
- no fake all-or-nothing messaging

## 8. Undo vs Reversal Contract

### 8.1 Definitions

`Undo`:

- a short-window user convenience for recently committed destructive or reversible interactions

`Reversal`:

- a domain action that records a compensating change in the system of record

### 8.2 Undo Eligibility

Immediate undo is allowed only when:

- the action is operationally safe to reverse quickly
- the domain allows restoration without ambiguity
- audit remains intact

Examples that may allow undo:

- row delete from a draft set
- local staged removal before final save
- reversible bulk remove from a temporary work list

### 8.3 Reversal-Only Actions

These must not be marketed as simple undo if business truth changes materially:

- posted accounting entries
- received inventory with downstream effects
- released shipping actions
- credit decisions with external impact
- period close actions

These require explicit reversal/correction flows instead.

## 9. Undo Window Contract

Default rule:

- destructive convenience undo window: **10 seconds**

Rules:

- undo availability must be visually obvious
- undo must describe exactly what it will restore
- undo must not cross page reload/session boundaries unless explicitly designed

## 10. Conflict Contract

### 10.1 Conflict Types

- record changed elsewhere
- permission changed mid-session
- workflow state changed before action commit
- supporting record deleted or invalidated

### 10.2 User Response Requirements

For conflicts, the UI must:

- identify the affected row/document/action
- distinguish conflict from validation failure
- offer a clear next step: refresh, reapply, inspect, or abandon local change

## 11. Error Recovery Contract

Every persistence class must define:

- what failed
- what remains local
- what committed successfully
- what needs user action

The user must never have to guess whether data was saved.

## 12. Draft State Contract

Draft state is allowed only when explicitly declared.

Possible draft scopes:

- row draft
- document draft
- import draft
- bulk-action staging draft

Rules:

- draft state must be visible
- draft state must survive only as long as intentionally designed
- stale drafts must be recoverable or safely discardable

## 13. Bulk Action Persistence Contract

Bulk actions must declare:

- selection scope
- validation mode
- transaction mode
- partial success policy
- undo eligibility
- reversal path if not undoable

Default rule:

- a bulk action is not undoable unless explicitly approved as safe

## 14. Background Operation Contract

Background operations must provide:

- initiation acknowledgment
- persistent progress visibility
- final result summary
- retry path where relevant
- audit-safe history

## 15. Status Bar Integration

The sheet status bar must reflect:

- current save state
- blocking validation count
- background job activity when relevant
- conflict presence when relevant

The status bar must not falsely imply whole-sheet safety when only one row is saved.

## 16. Inspector Integration

Inspector edits must obey the same persistence class rules as in-grid edits.

Disallowed:

- inspector-specific save semantics that contradict the sheet
- hidden background save with no visible status

## 17. Offline / Network Degradation Contract

The fork is not offline-first, but it must degrade honestly.

Required:

- visible network failure state
- no false “Saved” state while requests are failing
- preserved local draft where safe

Disallowed:

- pretending to queue offline work unless that queue is real and supported

## 18. Audit Contract

All committed operations must remain auditable.

Undo or reversal behavior must not destroy:

- who acted
- what changed
- when it changed
- why it changed when rationale is required

## 19. Blueprint Requirements

Every module blueprint must declare for each important action:

- persistence class
- trigger
- validation scope
- transaction boundary
- partial success rule
- undo or reversal behavior
- conflict behavior
- user-visible state language

## 20. Testing Requirements

### 20.1 Unit Tests

- save-state transitions
- undo eligibility rules
- conflict-state classification
- draft lifecycle behavior

### 20.2 Integration Tests

- row commit with validation failure
- document save with partial invalid state
- explicit transition action with blocking backend response
- queued action showing real pending state

### 20.3 E2E Tests

- edit existing safe field -> save -> refresh truth reflected
- edit draft row -> commit -> error -> correction -> success
- document with mixed valid/invalid changes -> readiness shown accurately
- destructive action -> undo within window -> restored state
- irreversible action -> explicit reversal path required

## 21. Adversarial QA Findings and Resolutions

### Finding 1: “Users may still think every visible change is already saved.”

Risk:

- spreadsheet mental model causes false certainty

Resolution:

- defined persistence classes
- required visible distinction between local draft and committed state

### Finding 2: “Undo could become a dishonest promise for accounting and fulfillment.”

Risk:

- product exposes undo where only reversal is legitimate

Resolution:

- separated convenience undo from domain reversal
- declared reversal-only action class for high-impact business changes

### Finding 3: “Document flows could still break if header and lines have mixed save behavior.”

Risk:

- users see conflicting saved/not-saved states inside one document

Resolution:

- added explicit document commit class and readiness requirement
- forced blueprint-level declaration of transaction boundaries

### Finding 4: “Background jobs are often the place where UI trust collapses.”

Risk:

- queued work is misrepresented as complete

Resolution:

- added explicit background-operation contract and persistent progress requirements

### Finding 5: “Modules could still invent custom save semantics.”

Risk:

- one sheet auto-saves on blur, another on timeout, another on close

Resolution:

- limited save triggers to a small approved set
- required each module blueprint to classify every important action

## 22. Approval Checklist

- [ ] Product approves persistence classes and user-visible save language
- [ ] Engineering approves transaction boundary expectations
- [ ] UX approves draft vs committed-state clarity
- [ ] QA approves undo/reversal distinction and testing scope
- [ ] Accounting / ops stakeholders approve reversal-only handling for high-impact flows
