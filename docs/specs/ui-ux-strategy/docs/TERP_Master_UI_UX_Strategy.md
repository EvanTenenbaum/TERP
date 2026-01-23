# TERP_Master_UI_UX_Strategy.md

**Title:** TERP Master UI/UX Strategy  
**Goal:** a reusable, decisive UX strategy that makes TERP *faster than a spreadsheet* while staying *safer than a spreadsheet*.

This is a **strategy document**, not a prescriptive implementation script.
It is designed to be ingested by AI agents and converted into executable plans, PRs, and UI changes.

---

## Section 1: Executive Summary

### The core problem
TERP’s current modal-heavy data entry is too slow for high-velocity operations. The user wants “really simple data entry” and a spreadsheet-like feel, while explicitly rejecting a “glorified spreadsheet.”

### Strategic approach
Adopt a single, scalable UX doctrine (Velocity → Safety → Context) expressed through a universal **Work Surface** interaction model: Sticky Context Header + Work Grid + Inspector Panel + Status Bar. This yields spreadsheet speed while enforcing ERP correctness.

### Top 5 highest-confidence recommendations
1. **Standardize the Work Surface** as the primary interaction shell for high-frequency workflows.
2. **Unify PO + Intake UX** via a *compressed* “Direct Intake” experience, while keeping underlying business events distinct.
3. **Adopt hybrid editing**: inline for primitives, inspector panel for meaningful objects.
4. **Establish keyboard + save-state contracts** that are consistent across modules.
5. **Protect scope** with a Feature Preservation System (no silent deletions; golden flows; canonical feature inventory).

### Expected impact
- 2–5× faster entry loops (fewer clicks, fewer screens)
- lower error rate (timed validation + constraints)
- increased user trust (visible save state, undo)
- scalable UI consistency across modules

---

## Section 2: Meta-Analysis Summary

### Source material evaluated
- User-provided AI reports (3+), including research synthesis, strategy proposals, and a workflow compression insight.
- Visual mockups / screenshots.
- Repo context, patterns, and existing specs (notably ledger feature spec).

### Overall quality assessment
- Reports show strong convergence on: keyboard-first, command palette, grid + inspector pattern, progressive disclosure.
- Weakness: several recommendations were presented as universal “best practices” without strict boundaries, risking UX drift and inconsistent search patterns.

### Key convergences
- Replace modal-heavy forms with inline/hybrid editing.
- Command palette as power-user accelerator.
- Progressive disclosure via inspector panel.
- Smart defaults + typeahead for speed.

### Key divergences requiring resolution
- “Spreadsheet UI” vs “post-spreadsheet Work Surfaces.”
- Whether command palette should serve as universal search (rejected).
- Whether PO and Intake should be merged at data-model level (rejected).

### What was missing from all reports
- A robust **feature preservation system** to prevent AI-driven scope loss.
- Hard boundaries for **command palette scope** and **inline editing scope**.
- A universal contract for focus behavior + save-state.

---

## Section 3: The User’s Actual Problem

### Stated needs (explicit)
- “Really simple data entry.”
- “Spreadsheet-like speed.”
- Avoid a “glorified spreadsheet.”

### Observed underlying needs
- Workflow compression: capture reality (“I got this from this vendor at this cost”) without navigating multiple modules.
- Consistency: predictable keyboard behavior everywhere.
- Trust: clear saving/validation state.

### Jobs-to-be-done
**When** I receive product and need to enter it quickly,
**I want** a single continuous flow where I can input vendor + line items without modal interruptions,
**so that** I can stay in motion, avoid mistakes, and finish intake in minutes.

---

## Section 4: Design Principles (Synthesized)

Limit: 6 principles (more becomes noise).

### 1) Velocity is a workflow contract, not a UI shape
**Principle:** speed comes from stable focus, predictable keys, and continuous flow — not merely from a grid.

**Applies to TERP:** the same velocity loop must exist in Intake, Sales Orders, Inventory counts, and ledger adjustments.

**Anti-pattern:** a grid that feels fast but causes accidental edits or focus jumps.

---

### 2) Compress the UX, not the business events
**Principle:** unify the surface area while keeping underlying events distinct.

**Applies to TERP:** “Direct Intake” can auto-create PO + Receipt + Batches, but the system must retain event boundaries for accounting/inventory correctness.

**Anti-pattern:** collapsing the schema until “planned vs received” becomes ambiguous.

---

### 3) Hybrid editing: inline primitives, inspector for meaning
**Principle:** inline editing is for safe, low-coupling values. Meaningful objects belong in the inspector.

**Applies to TERP:** qty/cost/status inline; everything that impacts accounting meaning or requires history belongs in the panel.

**Anti-pattern:** turning the grid into a complex form with dozens of interdependent fields.

---

### 4) Reward early, punish late validation timing
**Principle:** validation must protect without interrupting.

**Applies to TERP:** errors should surface on blur or commit attempt, not while typing.

**Anti-pattern:** red errors shouting while the user is mid-entry.

---

### 5) One mental model across modules
**Principle:** the same interaction grammar (keys, panel, save state) must apply across TERP.

**Applies to TERP:** Work Surface template should repeat consistently; agents must not invent bespoke paradigms per module.

**Anti-pattern:** every page feels like a different app.

---

### 6) Protect scope explicitly
**Principle:** redesign must not delete features or specs through “simplification.”

**Applies to TERP:** preserve ledger functionality and any workflow described in existing docs.

**Anti-pattern:** “prettier but less capable.”

---

## Section 5: Recommended Interface Architecture

### Overall layout and navigation model

TERP should standardize on two top-level surface types:

1. **Work Surfaces** (for execution):
   - Intake / Direct Intake
   - Sales Orders
   - Inventory Count
   - Pricing Updates
   - Ledger adjustments / reconciliations

2. **Review Surfaces** (for analysis):
   - reports
   - dashboards
   - history views

The mistake to avoid is mixing “entry” and “analysis” into one grid.

### Primary interaction patterns

- Work Surface template (Header + Grid + Inspector + Status)
- Inline primitives editing
- Inspector for meaningful objects
- Bulk action bar on multi-select
- Command palette for actions/nav

### Component hierarchy (conceptual)

- `WorkSurfaceShell`
  - `ContextHeader`
  - `PrimaryGrid`
  - `InspectorPanel`
  - `StatusBar`

### Information architecture

Work Surfaces should be **role-first** and **task-first**, not “database-table-first.”

---

## Section 6: Detailed Specifications

### 6.1 The Intake / PO Entry Interface (Primary Focus)

#### Core decision
Implement a unified Intake/PO Work Surface that supports two modes:

- **Mode A: Standard PO** (planning)  
  Status = Draft/Planned

- **Mode B: Direct Intake** (compressed reality entry)  
  Status = Received (auto) + creates intake receipt + batches behind the scenes

**Why this is correct:** it matches the user’s desire for speed while preserving the correctness of business events.

---

### Layout specification

**Sticky Context Header (batch-level):**
- Vendor
- Warehouse/Location
- Payment Terms
- Date (Received/Order)
- Source

**Primary Grid (line-level):**
- Item (typeahead + quick create)
- Qty
- Unit
- Unit Cost
- Total
- Notes (optional)
- Status (read-only in direct intake, editable in standard PO)

**Inspector Panel (selected row):**
- extended item details
- batch attributes
- audit/history
- advanced fields

**Status Bar:**
- total qty
- total cost
- save-state
- validation state

---

### Interaction flows (step-by-step)

#### Happy path — Direct Intake
1. User opens **Direct Intake** work surface.
2. Focus starts on Vendor.
3. User selects vendor → header fills defaults (terms/location).
4. Focus moves to Grid row 1 Item.
5. User types strain/product name → typeahead suggests.
6. Tab to Qty → enter value.
7. Tab to Unit cost → enter value.
8. Enter commits row and creates next row.
9. Cmd+S or Commit button finalizes.
10. System creates PO + Receipt + Batches and displays ✅ Saved.

#### Happy path — Standard PO
Same, but status is Draft and receipt creation is separate.

---

### Keyboard navigation map
This must comply with the global keyboard contract in `TERP_UX_DOCTRINE.md`.

Key behaviors to enforce:
- Tab advances cell editing
- Enter commits row
- Esc cancels edit or closes inspector

---

### Validation rules and timing
- Vendor required to commit batch
- Item required to commit a row
- Qty must be > 0
- Cost must be >= 0
- Required-field errors appear on blur or commit attempt

---

### Error handling patterns
- row-level inline errors with jump-to-field
- summary indicator in status bar
- undo toast for row deletes

---

### 6.2 Patterns for Other Modules

#### Sales / Orders
Work Surface:
- Header: customer, date, terms
- Grid: products, qty, price
- Inspector: notes, special terms
- Status: totals, payment status

#### Inventory Audit
Work Surface:
- Header: location, date
- Grid: item, expected qty, actual qty
- Inspector: batch details
- Status: variance summary

#### Pricing Updates
Work Surface:
- Header: vendor or category filter
- Grid: product, cost, wholesale price
- Inspector: margin rules, history

#### Ledger
Ledger should follow Work Surface principles where high-frequency adjustments are needed, but must preserve existing ledger spec.

---

## Section 7: Technical Implementation Guidance

This section provides **technical alignment**, not an implementation plan.

### Component libraries / patterns
Given TERP stack:
- React + TypeScript
- Tailwind
- shadcn/ui
- tRPC

Recommended:
- command palette: `cmdk`
- inspector: shadcn `Sheet`
- validation: Zod + existing schemas

### State management
- local UI state for fast entry
- commit via tRPC
- keep save-state visible

### Performance
- debounce typeahead (200–300ms)
- cancel stale requests
- cache recent queries

### Accessibility
- visible focus rings
- predictable keyboard map

### Testing strategy
- prioritize golden flows
- ensure keyboard behavior is tested

---

## Section 8: What NOT to Do

### Explicit anti-patterns
- nested modals
- wizard flows for simple entry
- command palette used as field selector
- grid used as report+entry+analysis all-in-one
- hiding frequently used fields behind “More”

### Rejected recommendations & why
- “Make everything searchable via Cmd+K”: creates competing search models and breaks user expectations.
- “Fully merge PO and intake at schema level”: risks accounting and lifecycle ambiguity.

---

## Section 9: Prioritized Roadmap (strategy-level)

This section is intentionally minimal, since you requested **strategy-first**.

The doctrine should be rolled out wherever applicable by AI agents, guided by:
- Work Surface template
- pattern registry
- feature preservation system

---

## Section 10: Open Questions and Risks

### Open questions requiring validation
- Which header fields are truly “always present” in direct intake?
- What are the common edge cases (partial receipts, split costs, refunds)?

### Risks
- scope loss during refactor → mitigated by Feature Preservation System
- inconsistent keyboard behavior → mitigated by keyboard contract
- silent data corruption from workflow compression → mitigated by “compress UX, not business events” rule

---

## Appendix A: Report-by-report assessment (summary)

### Report 1 — Research synthesis / post-spreadsheet rationale
- Strength: strong patterns + validation timing + hybrid editing insight
- Risk: may over-credit command palette as universal mechanism

### Report 2 — Velocity Grid v2 + Direct Intake nuance
- Strength: crucial workflow compression insight
- Risk: could tempt overly aggressive data-model merging

### Report 3 — FluxFrame system framing
- Strength: cohesive system vocabulary
- Risk: some visual language details are unnecessary/overly prescriptive

---

## Appendix B: Divergence resolution log (high-level)

- Cmd+K scope: actions/nav only (resolved)
- Inline vs panel boundary: primitives inline, meaning in inspector (resolved)
- PO vs Intake merging: unify UX, preserve event model (resolved)

---

## Appendix C: Evidence bibliography (tiered)

Tier 1:
- user’s explicit request: fast/simple entry without “glorified spreadsheet”

Tier 2:
- workflow observed: modal friction + context switching

Tier 3–6:
- external research patterns used only as support, not as primary truth

