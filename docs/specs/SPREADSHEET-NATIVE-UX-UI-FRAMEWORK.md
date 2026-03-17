# Specification: Spreadsheet-Native UX/UI Framework

**Task:** ARCH-SS-003: Cross-Module UX/UI Framework for Spreadsheet-Native TERP  
**Status:** Draft  
**Priority:** CRITICAL  
**Estimate:** 28h design / framework planning  
**Module:** Cross-product UX and UI system  
**Dependencies:** [SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md](./SPREADSHEET-NATIVE-ERP-GOVERNANCE-SPEC.md), [SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md](./SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md), [SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md](./SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md), [ATOMIC_UX_STRATEGY.md](./ui-ux-strategy/ATOMIC_UX_STRATEGY.md)  
**Spec Author:** Codex  
**Spec Date:** 2026-03-13

---

## 1. Problem Statement

The fork needs more than a grid engine. It needs one coherent **UX/UI framework** that can be applied across future module blueprints without forcing every module to rediscover:

- how a workbook feels
- how a sheet is structured
- where actions live
- how status is shown
- how users interpret totals, warnings, and exceptions
- what visual density is appropriate for ERP work

Without a shared framework, even a technically consistent sheet engine will still feel like multiple products.

## 2. Framework Goal

Define the cross-module design language for spreadsheet-native TERP so every module blueprint inherits:

- one mental model
- one structural layout grammar
- one interaction vocabulary
- one visual system direction
- one content and status language
- one accessibility and performance stance

## 3. Design Intent

The product should feel:

- operational
- calm
- dense but legible
- trustworthy
- keyboard-first
- faster than current TERP without feeling raw or unfinished

The fork should not feel:

- like a generic admin table kit
- like a consumer spreadsheet clone
- like a blank white grid with hidden magic
- like a dashboard pretending to be an execution surface

## 4. User Experience Doctrine

The framework inherits and sharpens the TERP work-surface doctrine:

1. **Velocity first**
2. **Safety always visible**
3. **Context without clutter**
4. **Keyboard consistency over local cleverness**
5. **Spreadsheet power without spreadsheet freedom**
6. **Progressive disclosure instead of modal sprawl**

## 5. Mental Model

Users should be able to explain the product with simple language:

- “The left sidebar is where I choose my workbook.”
- “The tabs at the top are sheets inside that workbook.”
- “Each sheet has one main table and maybe one or two supporting tables.”
- “I do fast edits in the table.”
- “If something is more complex, it opens in the inspector.”
- “If something changes the workflow, I click an explicit action.”

If users need a longer explanation than that, the framework has failed.

## 6. Navigation Framework

### 6.1 Global Navigation

Global navigation remains:

- left sidebar workbook navigation
- top sheet tab row within the workbook
- command palette for global navigation and actions

The framework does not add a second competing primary navigation system.

### 6.2 Workbook Identity

Each workbook must communicate:

- what domain it covers
- what type of work users complete there
- what sheets are available

Workbook identity should come from:

- title
- short description
- sheet set
- stable iconography

### 6.3 Sheet Identity

Each sheet must communicate:

- what entity or workflow it represents
- what the primary table is
- what the supporting table(s) do
- what the primary actions are

## 7. Layout Framework

### 7.1 Canonical Sheet Layout

Every sheet follows this structure:

1. sheet header
2. command strip
3. primary sheet body
4. optional supporting tables
5. inspector / approved sidecar
6. status bar

### 7.2 Layout Zones

#### Header Zone

Contains:

- sheet title
- short descriptor
- workbook context
- optional high-signal metadata only

Must not become a dashboard.

#### Command Strip Zone

Contains:

- local search
- filters
- view selector
- create/import/export actions where applicable
- primary workflow actions
- selection summary

#### Body Zone

Contains:

- one primary table
- optional linked support tables
- empty/loading/error treatment inside the relevant table regions

#### Status Zone

Contains:

- save state
- warning counts
- derived totals or counts
- refresh/background indicators

### 7.3 Layout Density

Default density should optimize for operational work, not visual breathing room.

Framework stance:

- compact by default on desktop
- standard as optional user preference
- generous spacing reserved for customer-facing or review-heavy exception surfaces

### 7.4 Width Discipline

Horizontal space is a product requirement, not a styling preference.

Rules:

- default desktop sheet layouts must show all `P0` queue columns without horizontal scrolling when the inspector is closed
- if a side-by-side layout causes `P0` columns to spill horizontally, the secondary region must collapse or stack before the primary table does
- the primary table always gets width priority over supporting tables, inspector panels, badges, and pilot-status messaging
- supporting tables must earn visible width by answering the next obvious operational question
- non-essential metadata belongs in compact cells, supporting tables, or the inspector instead of widening the primary grid

### 7.5 Column Priority Model

Every high-frequency sheet must classify visible data into:

- `P0`: must be visible in the default queue/grid
- `P1`: useful but optional in alternate views or secondary presets
- `P2`: inspector/supporting-table-only context

Rules:

- `P0` columns are the only columns allowed to consume the default width budget
- `P1` columns must not become default-visible if they create routine horizontal scroll
- `P2` data must not leak back into the main grid as “just one more column”

## 8. Table Framework

### 8.1 Primary Table Priority

Every sheet must clearly communicate which table is the main work surface.

Signals:

- largest area
- strongest heading
- primary action strip proximity
- selection ownership

### 8.2 Supporting Table Rules

Supporting tables should:

- answer the next obvious question
- reduce navigation
- not compete visually with the primary table

Supporting tables should not:

- duplicate the same information in another shape
- exist “just in case”
- require interpretation gymnastics

Supporting-table layout rules:

- default sheets may show at most one dominant supporting table at a time on high-frequency operational surfaces
- secondary lanes or additional support tables must stack below the primary table unless each visible table can still show its `P0` columns without horizontal scroll
- summary strips should be preferred over whole extra tables when only 3-5 key facts are needed

### 8.3 Table Ornamentation

Tables should avoid heavy decorative chrome.

Preferred styling:

- subtle region boundaries
- clear headings
- low-noise dividers
- restrained status color

## 9. Command Framework

### 9.1 Action Hierarchy

Actions must be categorized consistently:

- primary workflow action
- secondary sheet action
- bulk action
- table-local utility
- global workbook action

### 9.2 Action Placement

- primary actions live in the command strip or bulk action bar
- destructive or exceptional actions live in inspector or explicit action menus
- hidden overflow menus should not hold core path actions

### 9.3 Search Hierarchy

The product must distinguish:

- global command/search
- sheet-local search
- field/typeahead lookup

These may never feel like the same tool.

## 10. State Language Framework

### 10.1 Save State Language

The whole product uses the same save vocabulary:

- `Saved`
- `Saving`
- `Needs attention`

No module-specific synonyms like:

- Syncing
- Confirming
- Updating
- Dirty

unless the save/transaction contract explicitly allows a subordinate state.

### 10.2 Data State Language

All sheets must use consistent state categories:

- loading
- refreshing
- empty
- filtered empty
- warning
- blocking error
- stale

### 10.3 Workflow State Language

Workflow states may vary by domain, but their presentation should follow shared rules:

- explicit label
- explicit stage ownership
- explicit actionability
- no color-only meaning

## 11. Visual System Framework

### 11.1 Visual Direction

The UI should feel like **modern operations software**, not like:

- spreadsheet nostalgia cosplay
- finance-terminal mimicry
- generic Tailwind dashboard boilerplate

Target impression:

- restrained confidence
- dense precision
- calm structure
- visible status hierarchy

### 11.2 Typography

Typography must support:

- dense tabular data
- scannable labels
- compact supporting text

Recommended approach:

- one strong UI sans family with excellent numeric rendering
- one monospace or tabular-numeric strategy for quantities, money, and IDs

Typography hierarchy:

- workbook/sheet title
- table heading
- column heading
- row value
- support text / hint text

### 11.3 Color Roles

Color should primarily communicate:

- state
- emphasis
- selection
- warnings
- destructive risk
- background layering

Color must not:

- over-brand every surface
- create dashboard-like noise
- turn each module into a separate theme

### 11.4 Surface Hierarchy

The framework should establish clear visual layers:

- app background
- workbook shell
- sheet shell
- table region
- selected row/cell
- inspector/sidecar
- modal

Each layer must remain visually distinct without looking heavy.

## 12. Component Framework

### 12.1 Required Shared Component Families

- workbook shell components
- sheet shell components
- table region wrappers
- command strip components
- view selector components
- bulk action bars
- status badges and save-state indicators
- inspector primitives
- empty/loading/error states
- sheet-scoped filter controls

### 12.2 Column and Cell Design Principles

Cells should optimize for:

- fast recognition
- low ambiguity
- obvious editability
- obvious locking
- compact but readable status

### 12.3 Editor Design Principles

Editors should:

- feel native to the table
- commit predictably
- clearly signal validation issues
- not expand into mini-forms unless truly necessary

## 13. Inspector Framework

### 13.1 Inspector Role

The inspector is where users go for:

- complexity
- context
- rationale
- history
- related records

### 13.2 Inspector Structure

The inspector should consistently use:

- summary section
- editable details section
- activity / audit section
- optional related-items section

### 13.3 Inspector Tone

The inspector should feel:

- supportive
- informative
- secondary to the sheet, not equal to it

## 14. Empty, Loading, and Error Experience

### 14.1 Empty States

Empty states must distinguish:

- no data exists yet
- filters removed all rows
- selection is required to populate a supporting table

### 14.2 Loading States

Loading must distinguish:

- first load
- secondary table loading
- inspector loading
- refresh in place

### 14.3 Error States

Error messaging should be:

- specific enough to act on
- plain-language
- localized to the affected zone where possible

## 15. Content and UX Writing Framework

### 15.1 Tone

Content should be:

- plain
- direct
- operational
- low-jargon

### 15.2 Labels

Labels should prefer familiar domain language over internal implementation terms.

### 15.3 Action Copy

Actions should be verbs, not nouns:

- `Approve`
- `Send to Review`
- `Receive`
- `Release`

### 15.4 Feedback Copy

Feedback should answer:

- what happened
- whether user action is still needed
- what to do next if blocked

## 16. Accessibility Framework

The framework must support:

- keyboard-first operation
- strong focus visibility
- readable contrast in dense tables
- non-color-only status encoding
- screen-reader-safe naming of tables, regions, and actions

## 17. Responsive Framework

### 17.1 Desktop

Desktop is the primary design target.

Expected:

- full table experience
- side-by-side inspector where useful
- full command strip

### 17.2 Tablet

Tablet preserves sheet structure, but may:

- simplify the visible command strip
- move inspector into a slide-over
- prioritize the primary table over supporting tables

### 17.3 Mobile

Mobile is not the primary authoring environment.

Allowed mobile behaviors:

- review
- search
- light updates
- approvals

Disallowed by default:

- full dense workbook authoring

## 18. Motion and Feedback Framework

Motion should support orientation, not decoration.

Allowed:

- panel transitions
- selection/highlight transitions
- status change feedback

Disallowed:

- ornamental motion unrelated to work
- delayed interactions caused by animation

## 19. Anti-Patterns

The framework explicitly forbids:

- dashboard overload on execution sheets
- excessive module theming
- modal-heavy core flows
- icon-only action discovery for high-value actions
- freeform layout experimentation per module
- inconsistent save-state language
- hidden workflow transitions inside cell semantics
- blank spreadsheet styling with no operational framing

## 20. Blueprint Consumption Rules

Every future module blueprint must inherit this framework and specify:

- workbook identity
- sheet type
- primary table
- supporting table(s)
- command strip contents
- inspector sections
- save/warning state usage
- responsive treatment
- any approved deviations

## 21. Review Gates

A module blueprint fails UX/UI review if it:

- introduces a new primary layout pattern without approval
- hides critical actions in overflow
- relies on sidecars for the happy path
- uses unsupported status language
- makes the primary table visually secondary
- adds module-specific keyboard behavior

## 22. Adversarial QA Findings and Resolutions

### Finding 1: “This framework could still be too generic to guide real blueprints.”

Risk:

- module teams claim compliance while interpreting everything loosely

Resolution:

- added blueprint consumption rules and explicit failure conditions
- defined concrete zones, hierarchies, and action placement rules

### Finding 2: “A spreadsheet-native product can still become visually bland and confusing.”

Risk:

- minimalism collapses into blank-table UX with weak orientation

Resolution:

- defined identity requirements for workbooks, sheets, tables, and states
- required visible command and status zones

### Finding 3: “Dense ERP UI may become unreadable if visual hierarchy is too flat.”

Risk:

- users lose track of primary vs supporting work

Resolution:

- defined primary-table priority, surface hierarchy, and restrained ornamentation rules

### Finding 4: “Cross-module consistency may be broken by local theming and clever patterns.”

Risk:

- modules drift into mini-brands or custom workflow chrome

Resolution:

- prohibited excessive module theming and unapproved layout patterns
- standardized state language and action hierarchy

### Finding 5: “Desktop-first could be misread as mobile-neglect.”

Risk:

- modules accidentally promise parity where it is unrealistic

Resolution:

- stated explicit desktop/tablet/mobile expectations
- clarified that mobile is review/light-action by default

## 23. Approval Checklist

- [ ] Product approves the mental model and action language
- [ ] UX approves the layout, density, and visual direction
- [ ] Engineering approves the shared component families
- [ ] QA approves the anti-pattern list and review gates
- [ ] Module owners agree future blueprints will inherit this framework
