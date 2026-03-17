# Specification: Spreadsheet-Native Sheet Engine Contract

**Task:** ARCH-SS-002: Shared Sheet Engine Contract for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** CRITICAL  
**Estimate:** 24h planning / architecture  
**Module:** Cross-product sheet engine, shared UI system  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), [ATOMIC_UX_STRATEGY.md](./ui-ux-strategy/ATOMIC_UX_STRATEGY.md), [FEATURE_PRESERVATION_MATRIX.md](./ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

The spreadsheet-native fork cannot succeed if each module invents its own grid behavior, save semantics, focus rules, selection model, and sidecar behavior.

The product needs one shared **sheet engine** that defines:

- how workbooks, sheets, tables, and sidecars fit together
- how selection, editing, saving, validation, and linked tables behave
- how users move predictably through high-density operational work
- how the fork remains sheet-native without becoming chaotic

Without this contract, module blueprints will drift and the fork will devolve into custom page-by-page reinvention.

## 2. Scope

This contract governs the common internal runtime for all sheet-primary TERP surfaces.

In scope:

- workbook shell
- sheet shell
- table containers
- action strip
- status bar
- inspector and approved sidecars
- selection model
- edit model
- linked-table coordination
- focus and keyboard behavior
- state ownership
- loading and refresh behavior
- accessibility and performance requirements

Out of scope:

- module-specific workflows
- reporting template details
- save/transaction semantics beyond engine integration points
- customer-facing exception surfaces

## 3. Engine Goals

The sheet engine must make the following true across modules:

1. Users immediately recognize how a sheet works, regardless of module.
2. Primary repetitive work happens in-grid with minimal context switching.
3. Complex meaning and history are available without leaving the sheet.
4. Workflow actions feel explicit and safe, not spreadsheet-magical.
5. Module teams implement domain behavior without redefining interaction grammar.

## 4. Engine Non-Goals

The sheet engine is not:

- a general-purpose app builder
- a freeform canvas layout system
- a formula runtime
- a workflow engine
- a replacement for all exception surfaces
- a justification for module-specific grid behavior drift

## 5. Canonical Surface Hierarchy

The engine assumes the following hierarchy:

- **Workbook**: a sidebar module and its sheet collection
- **Sheet**: one execution surface composed of one or more related tables
- **Table**: the primary or supporting row/column work area
- **Inspector**: the default detailed side panel for the current row/record
- **Sidecar**: a broader supporting panel class approved by governance
- **Modal**: last-resort focused interaction for confirmation or exceptional complexity

Rules:

- all sheet-primary surfaces must render inside the same workbook and sheet shell
- tables do not own global layout or toolbar behavior
- inspectors and sidecars do not redefine keyboard/focus contracts

## 6. Core Engine Primitives

### 6.1 Workbook Shell

Responsibilities:

- render workbook title and identity
- host the active sheet tab row
- persist workbook-level context when appropriate
- keep workbook navigation stable across sheets

Must not:

- introduce module-specific workflow chrome
- overload the shell with domain actions

### 6.2 Sheet Shell

Responsibilities:

- render sheet title, description, and context
- host the command strip
- host the main sheet layout grid
- host the status bar
- own URL-level state for active sheet and major sheet mode

### 6.3 Command Strip

Responsibilities:

- show active filters
- expose primary actions
- show selection count
- expose local search entry
- expose view selector
- expose sheet-safe create/import/export actions

Rules:

- command strip actions must be visible and named, not icon-only by default
- primary actions must not move around across modules

### 6.4 Table Container

Responsibilities:

- render a labeled table region
- expose table-local empty/loading/error state
- coordinate selection and edit state with the engine
- expose table metadata such as row count, stage, and active sort/filter

Rules:

- every visible table needs a clear label
- every supporting table must justify its existence through a defined relationship
- table containers must expose enough layout metadata for width-budget enforcement

### 6.5 Inspector

The inspector is the default detailed panel for:

- complex field editing
- comments
- attachments
- audit details
- related-record summary
- validation explanation

Rules:

- inspector is non-modal
- inspector is context-bound to selection
- inspector open/close behavior is consistent across sheets
- the inspector is a secondary context surface, not the happy-path action center

### 6.6 Status Bar

Responsibilities:

- display save state
- display warnings / blocking counts
- display relevant summary counts or totals
- display background job or refresh signals where appropriate

Required top-level states:

- `Saved`
- `Saving`
- `Needs attention`

## 7. Table Roles

The engine supports the following table roles:

- `primary`
- `child-detail`
- `stage-lane`
- `exception-lane`
- `summary-support`
- `setup-support`

Rules:

- every sheet must designate exactly one primary table
- supporting tables may not overshadow the primary table
- supporting tables must declare what drives their content
- stage-lane layouts must collapse before they force primary-table `P0` columns off-screen

## 7.1 Width Budget Contract

The engine must support width-budget enforcement for high-frequency sheets.

Required behaviors:

- declare `P0`, `P1`, and `P2` column priorities
- allow default views to pin a stable identifier/action spine on the left
- collapse, stack, or hide secondary regions before forcing default primary-table horizontal scroll
- cap default desktop inspector width on high-frequency sheets to a narrow companion rail rather than a dominant panel

Disallowed:

- relying on user column resizing as the primary fix for poor default width choices
- showing multiple stage lanes by default when each lane cannot fit its `P0` columns
- permanently visible pilot/education chrome that steals width from the main table

## 8. Linked-Table Coordination Contract

### 8.1 Coordination Types

The engine supports four linked-table relationships:

1. `selection-driven detail`
2. `same-entity stage partition`
3. `source vs exceptions`
4. `document header vs document lines`

### 8.2 Required Behaviors

When one table drives another:

- the driving relationship must be visually obvious
- empty state must explain why the target table is empty
- target-table refresh must be scoped where possible
- loading a target table must not destroy the user's place in the source table

### 8.3 Selection Persistence

The engine must define whether selection is:

- table-local only
- sheet-global for the current entity
- URL-persisted where beneficial

Default rule:

- one primary active selection per sheet
- supporting tables may have secondary local selection only when needed

## 9. Row Identity Contract

Every row shown in a sheet must have a stable engine identity independent of visual sort or grouping.

Minimum required row identity fields:

- `entityType`
- `entityId`
- `rowKey`
- `recordVersion` when available
- `tableRole`

This identity is required for:

- selection persistence
- conflict detection
- partial refresh
- background update reconciliation
- undo targeting

## 10. Edit Model Contract

### 10.1 Engine Modes

The engine distinguishes:

- `navigation mode`
- `selection mode`
- `edit mode`
- `bulk-action mode`
- `inspector focus mode`

Only one primary mode may own keyboard intent at a time.

### 10.2 Inline vs Inspector Boundary

Inline editing is for:

- safe primitive values
- low-coupling edits
- repetitive high-frequency changes

Inspector editing is for:

- coupled field groups
- meaning-rich objects
- comments, attachments, history, or rationale
- edits needing deeper explanation or guardrails

### 10.3 Edit Lifecycle

Every inline editable cell must follow the same lifecycle:

1. focus cell
2. enter edit mode
3. mutate local edit buffer
4. validate at the defined checkpoint
5. commit or reject
6. report save/result state

### 10.4 Edit Anti-Patterns

Disallowed:

- module-specific commit timing without explicit review
- hidden auto-corrections that materially change meaning
- multi-field objects flattened into misleading single cells

## 11. Selection Model Contract

### 11.1 Selection Types

The engine supports:

- single row selection
- multi-row selection
- cell focus
- range selection only if engine-approved and field-safe

### 11.2 Bulk Action Scope

Bulk actions must operate on:

- the explicit selected row set, or
- the explicit filtered set only when the UI names that scope clearly

Disallowed:

- implicit “all rows” actions without clear scoping
- background scope expansion hidden from users

### 11.3 Cross-Table Selection Rules

Selecting rows in a supporting table must not silently replace the primary-table selection unless the sheet explicitly defines that behavior.

## 12. Focus and Keyboard Contract

The sheet engine owns:

- focus rings
- arrow navigation between cells
- tab navigation between actionable regions
- enter / escape semantics
- inspector open / close semantics
- bulk-action invocation entry

Required defaults:

- `Enter`: edit cell or open inspector depending on focus context
- `Esc`: cancel current edit or close inspector
- `Tab`: move predictably within active editing context
- `Shift+Tab`: reverse predictably

The engine must prevent:

- focus traps between grid and inspector
- module-specific remapping of core keys
- unannounced keyboard side effects

## 13. Local vs Server State Ownership

### 13.1 Local Engine State

Allowed local state:

- current selection
- in-progress edit buffer
- open inspector/sidecar state
- local sort/filter/view state
- table expansion/collapse state

### 13.2 Server-Backed State

Must remain server-authoritative:

- business record truth
- workflow state
- derived domain calculations
- permissions
- audit trail
- final save outcome

### 13.3 Reconciliation Rule

The engine may buffer interaction state, but it must reconcile visibly when backend truth differs.

## 14. Loading, Empty, Error, and Refresh States

Each table must support explicit states for:

- initial load
- incremental refresh
- empty
- filtered-empty
- partial error
- blocking error
- stale data

Rules:

- empty must not look like broken
- refresh must not feel like initial load
- stale indicators must be lighter than blocking error signals

## 15. Refresh Model Integration Points

The engine must support the following refresh patterns:

- row-level refresh
- table-level refresh
- linked-table refresh
- sheet-level refresh

Preferred order:

1. row
2. target table
3. current sheet
4. full workbook

The engine should always choose the smallest truthful refresh scope.

## 16. Clipboard and Fill Integration Points

The engine must provide one shared path for:

- copy
- paste
- fill
- bulk clear

Rules:

- a column opts into these behaviors explicitly
- failures return row/cell-level diagnostics
- clipboard behavior must not vary by module without review

## 17. Sidecar Integration Contract

All non-modal support panels must integrate through the engine.

The engine must know:

- which sidecar type is open
- what record/context it is bound to
- whether it has unsaved state
- whether keyboard ownership belongs to it

Sidecars may not:

- hijack global save semantics
- replace the primary action strip
- obscure validation or save state

## 18. Responsive Layout Contract

Default breakpoints:

- desktop: table + inspector side-by-side where appropriate
- tablet: primary table prioritized, inspector as slide-over when necessary
- mobile: sheet access may degrade to review/light-edit mode

Rules:

- responsive behavior must preserve the same interaction grammar
- responsive mode must not introduce modal-only core workflows on desktop-first sheets
- desktop defaults should cap high-frequency inspector widths at roughly one narrow companion column, not one half of the canvas

## 19. Accessibility Contract

The engine must provide:

- semantic region labeling for workbook, sheet, table, inspector, and status bar
- visible focus
- non-color-only status cues
- aria-live support for save state and blocking feedback
- keyboard parity across modules

## 20. Performance Contract

The engine must be designed for:

- virtualization-friendly tables
- linked-table lazy loading
- large but bounded operational datasets
- minimal rerender churn on selection and inspector changes

Performance anti-patterns:

- loading child tables for every visible row
- rerendering all tables on single-row selection changes
- coupling inspector state to full sheet rerender

## 21. Extension Contract

Module teams may extend the engine by:

- defining column schemas
- supplying actions
- declaring linked-table relationships
- supplying domain-specific inspector content

Module teams may not extend the engine by:

- redefining core key bindings
- introducing custom save-state language
- inventing new table roles without approval
- bypassing shared selection/edit infrastructure

## 22. Implementation Surface

The sheet engine should resolve into a small set of reusable components and hooks:

- `WorkbookShell`
- `SheetShell`
- `SheetCommandStrip`
- `SheetStatusBar`
- `SheetTableRegion`
- `SheetInspectorHost`
- `useSheetSelection`
- `useSheetKeyboard`
- `useLinkedTables`
- `useSheetStatus`

This is a contract target, not a final file map.

## 23. Testing Requirements

### 23.1 Unit Tests

- focus and keyboard state machine
- selection transitions
- linked-table derivation logic
- row identity stability
- table state rendering rules

### 23.2 Integration Tests

- inspector bound to selection
- partial table refresh without full sheet reset
- range/cell editing integration on approved fields
- table-role coordination across a document sheet

### 23.3 E2E Tests

- open sheet -> select row -> inspector opens -> edit -> save state reflects result
- select row in primary table -> supporting table updates without context loss
- multi-select -> bulk action -> state and status bar update correctly
- conflict arrives while editing -> engine displays recoverable state

## 24. Adversarial QA Findings and Resolutions

### Finding 1: “This could still devolve into module-specific mini-frameworks.”

Risk:

- module teams bypass shared hooks and create one-off grid behavior

Resolution:

- formalized an extension contract and a shared primitive list
- prohibited module-level redefinition of key bindings, save language, and table roles

### Finding 2: “Linked tables are underspecified and could create ambiguous selection behavior.”

Risk:

- adjacent tables fight for primary selection and confuse users

Resolution:

- defined coordination types
- established a default single primary selection rule
- required explicit behavior for supporting-table selection

### Finding 3: “The engine could become a save-model dumping ground.”

Risk:

- engine and transaction semantics blur together

Resolution:

- limited this contract to engine integration points
- reserved persistence semantics for the dedicated save/transaction contract

### Finding 4: “Responsive behavior could quietly reintroduce modal-heavy UX.”

Risk:

- tablet/mobile implementations break the desktop-first doctrine

Resolution:

- added explicit responsive rules that preserve interaction grammar
- prohibited responsive-only modalization of normal desktop workflows

### Finding 5: “Complexity could hide in sidecars and erode sheet-native behavior.”

Risk:

- drawers become pages-in-disguise

Resolution:

- bound all sidecars to engine state
- prohibited sidecars from owning global actions or save semantics

## 25. Approval Checklist

- [ ] Product approves workbook/sheet/table/inspector hierarchy
- [ ] Engineering approves the shared engine primitive list
- [ ] Engineering approves the linked-table and selection contracts
- [ ] UX approves the focus, keyboard, and responsive rules
- [ ] QA approves the adversarial findings as sufficiently mitigated
