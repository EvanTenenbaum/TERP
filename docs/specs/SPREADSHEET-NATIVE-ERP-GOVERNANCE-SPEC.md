# Specification: Spreadsheet-Native ERP Governance

**Task:** ARCH-SS-001: Governance Contract for Spreadsheet-Native TERP Fork  
**Status:** Draft  
**Priority:** CRITICAL  
**Estimate:** 20h planning / governance  
**Module:** Cross-product architecture, frontend UX, workflow governance  
**Dependencies:** [FEATURE-SPREADSHEET-VIEW-SPEC.md](./FEATURE-SPREADSHEET-VIEW-SPEC.md), [SPREADSHEET-VIEW-INTEGRATION-ANALYSIS.md](./SPREADSHEET-VIEW-INTEGRATION-ANALYSIS.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), existing TERP workspaces and tRPC contracts  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

The TERP fork aims to become a **spreadsheet-native ERP**: most internal work should happen in sheet-style surfaces with in-grid editing, bulk operations, linked tables, and minimal navigation friction.

This idea can fail in a predictable way if it is treated as a visual redesign only:

- critical behaviors are dropped during migration
- workflow logic gets hidden inside ad hoc cells, drawers, and exceptions
- sidecars become a lazy fallback and recreate the old UI inside the new shell
- module teams invent different grid behaviors and sheet patterns
- admin customization drifts into no-code app building
- parity regressions are discovered only after users lose trust

This governance spec exists to prevent that outcome.

It defines the **non-negotiable rules, contracts, and delivery gates** for the fork before module-by-module blueprinting begins.

## 2. Product Goal

Create a TERP fork where internal modules feel like **disciplined workbooks and sheets**, while preserving TERP's existing validation, permissions, auditability, and workflow rigor.

The result should be:

- faster than today's page-and-form workflow for dense operational work
- simpler to learn than the current mixed-surface UI
- safer than a generic spreadsheet because TERP owns all logic and transitions
- configurable by admins at the presentation layer without enabling formula or workflow programming

## 3. Non-Goals

The fork is explicitly **not** intended to become:

- a general spreadsheet product
- a formula engine
- a no-code workflow builder
- an Airtable/Notion-style app-construction platform
- a total replacement for every TERP surface regardless of fit
- a mobile-first UI system

## 4. User Stories

1. **As an operations user**, I want most daily work to happen in grid-first sheets so that I can move faster with less clicking and mode switching.
2. **As a manager**, I want multi-step workflows shown as adjacent tables or explicit review stages so that status progression is visible and controlled.
3. **As an admin**, I want to configure layouts, columns, and sheet visibility without creating new business logic so that the fork stays maintainable.
4. **As a product owner**, I want clear parity gates so that the fork does not drop critical functionality and then claw it back later.
5. **As an engineer**, I want one consistent interaction grammar so that new modules do not become custom one-off grids.

## 5. Core Product Decisions

### 5.1 Canonical Surface Model

The fork uses the following hierarchy:

- **Sidebar module = workbook**
- **Current submodule = sheet tab**
- **Sheet = one or more related tables**
- **Sidecar = supporting context surface only**
- **Modal = explicit confirmation or complex focused task**

### 5.2 Default Interaction Model

The default internal TERP work surface is a sheet, not a page-level form.

Users should normally complete work through:

- cell edit
- copy/paste
- drag-fill on approved fields
- row selection + explicit actions
- adjacent linked tables
- limited, purposeful sidecars

### 5.3 Business Logic Ownership

TERP owns all logic.

Users and admins may configure presentation, but they may not create:

- formulas
- automation logic
- state machines
- workflow transitions
- custom derived-field expressions
- cross-table business behavior

## 6. Hard Constraints

### 6.1 Runtime / Hosting Constraints

The fork must be fully self-hosted for UI and UX runtime.

Allowed:

- open-source packages bundled into the TERP app
- vendored open-source code maintained in the repo
- locally hosted fonts, icons, themes, and assets
- commercial packages only if the team explicitly chooses them and they remain self-hosted at runtime

Forbidden:

- hosted spreadsheet/workspace UI dependencies
- third-party runtime services required for core sheet behavior
- embedded external UIs that become critical to normal workflow
- outside domains required for editing, rendering, layout, or workflow interaction

### 6.2 Data / Backend Constraints

The fork is a presentation-layer fork unless explicitly approved otherwise.

- existing tRPC routers and services remain the source of truth
- existing validation, RBAC, audit logging, and data integrity rules remain authoritative
- no silent bypass of current business logic
- no new schema changes without explicit approval
- no duplication of business rules into client-only logic

### 6.3 Device Strategy

The fork is **desktop-first**.

- desktop and laptop are primary
- tablet landscape is secondary
- mobile supports review/light actions only unless a specific module proves otherwise

## 7. Explicit Exception Registry

The following surfaces are intentionally **not** sheet-primary unless explicitly reconsidered later:

| Surface                        | Reason for Exception                                             | Allowed Spreadsheet Influence         | Default Primary Surface    |
| ------------------------------ | ---------------------------------------------------------------- | ------------------------------------- | -------------------------- |
| Calendar / Scheduling          | temporal visualization is core, not optional                     | side tables, inspector summaries      | calendar / schedule view   |
| Image-heavy Photography Review | media review is core and cannot be reduced to cells              | queue tables may launch media review  | image review workspace     |
| Customer-facing Live Shopping  | customer experience and real-time presentation dominate          | internal queue sheets may support ops | dedicated live shopping UI |
| VIP Portal                     | customer-facing portal and appointment UX need tailored surfaces | back-office support sheets allowed    | portal-specific UI         |

Rules:

- exception surfaces must be declared, not drift into existence accidentally
- exception status does not remove parity obligations
- exception surfaces may still use sheet-adjacent internal support views

## 8. Sheet Archetypes

Every sheet must fit one of the archetypes below. New archetypes require explicit approval.

### 8.1 Registry Sheet

Purpose:

- manage large sets of entities

Examples:

- clients
- suppliers
- products
- inventory batches

Shape:

- 1 primary table
- optional compact summary row
- optional inspector sidecar

### 8.2 Document Sheet

Purpose:

- work with headers plus line items

Examples:

- sales orders
- quotes
- purchase orders
- bills
- returns

Shape:

- table A: document headers
- table B: selected document line items
- optional totals/status block
- optional document inspector

### 8.3 Queue Sheet

Purpose:

- process operational work in priority order

Examples:

- receiving queue
- shipping queue
- samples queue
- intake verification

Shape:

- 1 primary queue table
- optional selected-record detail table
- status strip with filters/counts

### 8.4 Conveyor Sheet

Purpose:

- show controlled multi-step progression across adjacent stages

Examples:

- draft -> review -> approved -> released
- pending -> picking -> packed -> ready

Shape:

- 2 to 4 adjacent filtered tables of the same entity type
- rows move through explicit actions, not hidden formulas

### 8.5 Review Sheet

Purpose:

- compare source, review, and exception states

Examples:

- approvals
- reconciliations
- discrepancy review

Shape:

- source table
- review table
- exceptions table
- optional notes/history sidecar

### 8.6 Setup Sheet

Purpose:

- configure system-owned options safely

Examples:

- pricing rule presentation
- locations
- feature-flag views
- user access views

Shape:

- one or more narrow tables
- strong validation
- explicit warnings for impactful changes

## 9. Table Composition Rules

### 9.1 Table Budget

- most sheets should contain **1 primary table**
- complex sheets may contain **2 or 3 related tables**
- more than 3 persistent tables requires design review

### 9.2 Relationship Requirement

Multiple tables on one sheet are allowed only if the relationship is clear:

- same entity across stages
- parent/child records
- source vs exception split
- current selection driving secondary detail

### 9.3 Anti-Clutter Rule

If a secondary table is always visible but rarely used, it should become:

- collapsible, or
- moved into a sidecar, or
- removed from the sheet

## 10. Sidecar Rules

### 10.1 Purpose

Sidecars exist for support context, not as a disguised legacy page.

Allowed sidecar uses:

- comments
- attachments
- audit history
- activity log
- rich detail preview
- relationship context
- validation explanation
- media preview when not primary

Disallowed sidecar uses:

- ordinary routine editing that should happen in-grid
- entire old forms copied into a drawer by default
- mandatory navigation for the main happy path

### 10.2 Sidecar Budget

A sheet should remain functional without opening a sidecar for common repetitive work.

Sidecars are acceptable when they support:

- high-context review
- advanced detail not suited to cells
- rare but important exceptions

### 10.3 Escalation Trigger

If users must open a sidecar for more than half of the primary happy-path steps, the sheet design fails review.

## 11. Admin Customization Contract

### 11.1 What Users May Customize

Users may:

- reorder columns
- resize columns
- hide/show allowed columns
- pin columns
- sort
- filter
- group where supported
- choose density
- save named views
- choose default personal view

### 11.2 What Admins May Customize

Admins may:

- choose which sheets are visible to roles or teams
- choose which prebuilt tables appear on a sheet
- choose default visible columns
- choose default filters, sorts, and grouping
- choose labels from approved naming inputs
- choose available sidecar panels
- choose which prebuilt workflow-table arrangements are enabled

### 11.3 What Neither Users Nor Admins May Create

Neither users nor admins may create:

- formulas
- custom computed fields
- state-transition rules
- branching workflow logic
- automation scripts
- custom validations beyond approved configuration inputs
- arbitrary new data models

### 11.4 Governance Principle

Admins may configure **presentation of prebuilt ERP behaviors**. They may not create new behaviors.

## 12. Column Model Contract

### 12.1 Allowed Column Types

The fork uses a fixed column-type registry:

- short text
- long text
- integer
- decimal
- quantity
- currency
- percentage
- date
- datetime
- checkbox
- status dropdown
- autocomplete lookup
- relation chip
- badge / readonly status
- derived readonly

### 12.2 Per-Column Behavior Flags

Every editable column must explicitly declare:

- editable: yes/no
- bulk-editable: yes/no
- paste-allowed: yes/no
- fill-allowed: yes/no
- clear-allowed: yes/no
- requires-confirmation: yes/no
- permission-scope
- validation-source
- optimistic-lock participation

### 12.3 Derived Fields

Derived fields are:

- defined by TERP
- rendered as readonly
- recalculated by TERP-controlled logic
- never user-authored

## 13. Workflow / Action Contract

### 13.1 Core Rule

A **cell edit changes data**.  
An **explicit action changes workflow state**.

Examples of explicit actions:

- Send to Review
- Approve
- Return to Draft
- Receive
- Mark Exception
- Release to Shipping
- Pack
- Archive

### 13.2 Conveyor Behavior

Adjacent workflow tables are views into one entity set filtered by state.

Rows do not move because a user manually drags them to a new table.  
Rows move because TERP executed an explicit transition and the filtered views updated.

### 13.3 Drag-Drop Guardrail

Free drag between workflow tables is disallowed by default for critical operational flows.

If drag-drop is ever introduced, it must:

- call the same explicit transition action under the hood
- respect permissions
- show validation failures clearly
- preserve audit logs
- pass a flow-specific review

### 13.4 Batch Actions

Bulk workflow actions must declare:

- eligible row states
- permission requirements
- validation rules
- partial-failure behavior
- audit logging behavior
- undo or recovery expectations

## 14. Validation Model

Validation must exist at four levels:

| Level              | Purpose                  | Example                          |
| ------------------ | ------------------------ | -------------------------------- |
| Cell               | field-level correctness  | invalid quantity, missing date   |
| Row                | record-level readiness   | required fields incomplete       |
| Table              | operational review       | 5 rows blocked, 2 exceptions     |
| Process / Document | business-state readiness | order cannot release to shipping |

Rules:

- validation must be visible, not hidden in console or toast only
- a valid cell does not imply a valid row
- a valid row does not imply a valid document/process

## 15. Permissions Contract

### 15.1 Visible Locking

If a field cannot be edited, it must look locked before interaction.

Disallowed pattern:

- let user type into a cell
- fail late with a generic error

Preferred pattern:

- visually locked cell
- clear tooltip or affordance
- action not shown if unavailable

### 15.2 Role-Safe Views

Saved views, sheet presets, and table configurations must respect role-based access.

No view may expose:

- columns a role should not see
- actions a role should not run
- related data a role should not inspect

## 16. Concurrency and Data Integrity

### 16.1 Concurrency Rules

The sheet engine must support:

- row version awareness
- stale-row detection
- conflict response on save/mutation
- targeted refresh of affected rows where possible

### 16.2 Required Behaviors

- show when a row was updated elsewhere
- distinguish validation failures from concurrency failures
- avoid full-sheet reloads when row-level refresh is possible
- preserve unsaved local work when safe

### 16.3 Source of Truth

There is one source of truth: TERP backend state.

The sheet engine may maintain local edit state, but it may not invent alternate truth.

## 17. State, Navigation, and Saved View Contract

### 17.1 URL Rules

Workbook, sheet, active record selection, and major view mode should be URL-addressable where reasonable.

### 17.2 Saved Views

Saved views may persist:

- column layout
- sorting
- filters
- grouping
- density
- pinned columns

Saved views may not persist:

- hidden permission bypasses
- cross-role leakage
- custom business behavior

### 17.3 Command Surface

Every sheet must provide clear access to:

- current sheet name
- table labels
- filters
- selection count
- available actions
- save state or refresh status

## 18. Accessibility and Usability Contract

### 18.1 Accessibility

The fork targets WCAG 2.2 AA where applicable.

Required:

- full keyboard navigation
- visible focus states
- screen-reader-safe labels for actions and locked cells
- non-color-only error signaling
- reduced-motion support where motion exists

### 18.2 Keyboard Contract

Keyboard-first behavior must be consistent across sheets.

At minimum:

- move focus across cells
- enter edit mode
- commit/cancel edits
- select rows
- run primary bulk actions
- open contextual sidecar when available

### 18.3 Discoverability

The UI must not rely on hidden spreadsheet conventions alone.

Every sheet needs visible:

- action strip
- filter cues
- validation summaries
- state counts where useful

## 19. Performance Contract

### 19.1 Required Performance Behaviors

- row virtualization for large tables
- lazy loading for secondary tables where appropriate
- capped default result windows for queue sheets
- efficient column rendering for wide registries
- explicit refresh policy for live or semi-live tables

### 19.2 Performance Anti-Patterns

Disallowed:

- loading full child datasets for every visible row by default
- polling every table on every sheet
- rendering hidden sidecar-heavy content eagerly

## 20. Async Operation Contract

Not all ERP work completes synchronously.

The sheet system must support operations that are:

- immediate
- optimistic but reversible
- queued / backgrounded
- long-running with progress

Examples:

- document generation
- large imports
- reconciliation jobs
- bulk status transitions with downstream effects

Rules:

- async actions must show clear pending, success, partial-failure, and failed states
- background operations must be discoverable after the initiating toast disappears
- sheets must not pretend a background job finished when it has only been queued
- affected rows must show queued/in-progress states where relevant
- retries must preserve auditability

## 21. Clipboard, Import, and Export Contract

Spreadsheet-native UX creates strong user expectations around copy/paste and export.

Required rules:

- paste behavior must be deterministic and field-safe
- bulk paste may only affect columns explicitly marked paste-allowed
- partial paste failures must identify the failed cells/rows
- import tools must not bypass validation or permissions
- exports must respect role-safe column visibility and data access
- derived fields may export as values, but never as editable source logic

Disallowed:

- silent truncation of pasted data
- hidden coercion that changes business meaning
- imports that skip the normal TERP mutation path without explicit approval

## 22. Design System and Interaction Consistency Contract

The fork must feel like one product, not a collection of module-specific grid experiments.

Required shared systems:

- one primary internal grid engine for sheet surfaces
- one sheet shell
- one command-strip pattern
- one inspector / sidecar pattern
- one column-type registry
- one action-bar pattern
- one validation pattern language
- one save/conflict status language

New sheet-level chrome or interaction patterns require review if they:

- change basic selection behavior
- change edit commit/cancel behavior
- invent new action placement
- redefine sidecar semantics
- introduce module-specific keyboard rules

## 23. Observability and Telemetry Contract

The fork must be measurable during rollout.

At minimum, instrument:

- sheet opens
- saved-view usage
- sidecar open frequency
- bulk action usage
- validation failure frequency
- concurrency conflict frequency
- rollback-triggering incidents
- average completion time for pilot workflows

This telemetry exists to detect:

- hidden parity regressions
- sidecar overuse
- broken workflow transitions
- unusable sheet layouts

## 24. Architecture Review Triggers

The following changes require explicit product + engineering review before implementation:

- a new sheet archetype
- a new column type
- more than 3 persistent tables on a sheet
- a new always-on sidecar class
- free drag-drop workflow transitions
- custom admin programmability beyond current contract
- a new external runtime dependency for core sheet behavior
- any schema change proposed in support of spreadsheet-native UX

## 25. Capability Ledger and Parity Gate

### 25.1 Capability Ledger

Before migrating any module, the team must build a ledger of current capabilities:

- route / module
- repo snapshot and source appendix metadata
- source references from the interaction source-of-truth contract
- current user jobs
- critical actions
- success criteria
- permissions and validations
- hidden dependencies
- integrations
- current exceptions
- required evidence

Every ledger must be grounded in:

- [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv)
- [FLOW_GUIDE.md](../reference/FLOW_GUIDE.md)
- [USER_FLOWS.md](../features/USER_FLOWS.md)
- [FEATURE_PRESERVATION_MATRIX.md](./ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md)

If those sources disagree, the discrepancy must be recorded before blueprinting continues.

Unresolved discrepancy rule:

- unresolved `P0` or `P1` source disagreements block blueprint approval
- unresolved `P2` disagreements require owner, due date, and explicit temporary assumption

Each capability must be classified as:

- `sheet-native`
- `sheet + sidecar`
- `exception surface`
- `intentionally deferred`
- `rejected with evidence`

No capability may remain unclassified.

### 25.2 Module Parity Gate

A module is not considered migrated until:

- all relevant interaction sources have been reconciled and attached to the module source appendix
- no unresolved `P0` or `P1` source discrepancies remain
- critical happy paths are faster or equal to current TERP
- no P0/P1 workflow is missing
- validations and permissions match current TERP
- audit behavior is preserved
- exception handling is proven
- rollback remains available

### 25.3 Anti-Clawback Rule

If a capability is removed during migration, it must be explicitly recorded with:

- reason
- owner
- risk level
- recovery plan
- acceptance sign-off

Silent functional loss is not allowed.

## 26. Delivery and Rollout Contract

### 26.1 Required Delivery Order

1. Governance contract
2. Interaction source-of-truth contract
3. Sheet engine contract
4. Capability ledgers
5. 1-2 pilot module blueprints
6. Pilot implementation behind fork controls / feature gates
7. Side-by-side parity verification
8. Broader module rollout

### 26.2 Pilot Selection Criteria

Pilot modules should:

- fit registry/document/queue patterns naturally
- be high-frequency workflows
- avoid exception surfaces first
- expose the most important sheet-engine risks early

### 26.3 Rollback Requirement

Every migrated module must preserve a low-risk rollback path to the previous surface until parity is proven.

### 26.4 Legacy Coexistence Rule

Until a module clears the parity gate, legacy and sheet-native surfaces may coexist.

Rules:

- coexistence must be explicit and temporary
- capability comparisons must use the same underlying backend truth
- new feature work on migrating modules must account for both surfaces until cutover
- final cutover requires evidence, not preference

## 27. UI Technology Contract

### 27.1 Grid Engine Requirements

The chosen grid engine must support or allow TERP to implement:

- self-hosted runtime
- keyboard-first editing
- copy/paste
- fill behavior for approved fields
- custom editors
- linked-table coordination
- locked/read-only cells
- large dataset performance
- accessible focus behavior

### 27.2 Library Selection Rule

No library may be adopted only because its demo looks spreadsheet-like.

Selection must be based on TERP-specific fit:

- workflow safety
- maintainability
- parity support
- licensing clarity
- long-term operability in a self-hosted product

## 28. Testing Requirements

### 28.1 Unit Tests

- column-type behavior rules
- action eligibility logic
- validation summaries
- selection and linked-table coordination

### 28.2 Integration Tests

- sheet-to-router mutation flows
- permission-safe view rendering
- concurrency conflict handling
- saved-view persistence

### 28.3 E2E Tests

- high-frequency happy paths per migrated module
- multi-step conveyor transitions
- bulk edit / paste on approved fields
- exception recovery
- rollback verification

### 28.4 UX Verification

Each migrated sheet must include evidence for:

- time-to-complete vs current UI
- number of context switches
- sidecar dependence
- validation clarity

## 29. Success Metrics

| Metric                           | Target                                                               | Measurement Method        |
| -------------------------------- | -------------------------------------------------------------------- | ------------------------- |
| Critical capability preservation | 100% of P0/P1 capabilities classified and addressed before migration | capability ledger review  |
| Silent feature loss              | 0                                                                    | parity audits             |
| Sidecar dependence on happy path | less than 50% of primary steps require sidecar                       | task walkthrough evidence |
| Admin programmability creep      | 0 formula/workflow-building features                                 | governance review         |
| Time-to-complete on pilot flows  | equal or better than current TERP                                    | moderated workflow tests  |
| Grid interaction consistency     | one shared contract across pilot modules                             | UX QA review              |

## 30. Open Questions

- [ ] Which grid engine best satisfies the sheet-engine contract with the least long-term lock-in?
- [ ] Which 1-2 TERP modules should be the pilot migration candidates?
- [ ] Which admin customization controls belong in V1 versus later phases?
- [ ] Which sheet-level grouping and saved-view behaviors should be global versus module-specific?

## 31. Approval Checklist

- [ ] Product owner approves the exception registry
- [ ] Product owner approves the admin customization contract
- [ ] Engineering approves the sheet archetypes and action contract
- [ ] Engineering approves the rollback and parity gate
- [ ] QA approves the capability-ledger and anti-clawback process

---

## Appendix A: Snowball Prevention Controls

The following controls are mandatory because they directly prevent spreadsheet-native scope from turning into a fragmented mess:

1. **Exception registry**
2. **Sheet archetype limit**
3. **Sidecar budget**
4. **Table budget**
5. **Capability ledger**
6. **Anti-clawback rule**
7. **Admin configuration ceiling**
8. **Explicit workflow action contract**
9. **Parity gate before module completion**
10. **Rollback availability during rollout**

## Appendix B: Decision Summary

This fork is approved only under the following framing:

- spreadsheet-native for most internal work
- exception surfaces preserved where the sheet model is a bad fit
- no formulas
- no no-code workflow creation
- admins configure presentation, not behavior
- TERP backend remains the source of truth
- parity evidence is required before declaring migration success
