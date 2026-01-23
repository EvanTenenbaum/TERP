# TERP_UX_DOCTRINE.md

**Status:** ACTIVE CANONICAL GUIDANCE  
**Primary objective:** make TERP feel *faster than a spreadsheet* while staying *safer than a spreadsheet*.

This document is intentionally **strategy-first** and **contract-oriented**.
It is designed for AI agents to ingest and apply across modules **without inventing new UX paradigms**.

---

## 1) The TERP UX Doctrine

TERP is a high-velocity operations ERP. Users are not browsing data for fun.
They are executing repeated workflows under time pressure.

### The Doctrine (3-layer system)

Every high-frequency TERP surface must express three layers, in this order:

1. **Velocity**: speed of thought, input never fights you.
2. **Safety**: prevent expensive mistakes without interrupting flow.
3. **Context**: keep meaning, history, and consequences visible without leaving the work surface.

This is the foundation for scaling TERP without turning it into:
- a fragile spreadsheet clone, or
- a slow enterprise UI labyrinth.

---

## 2) Layer 1: Velocity (Speed of Thought)

### Goal
User can keep hands on keyboard and stay in motion through repetitive entry.

### Non‑negotiables
- **Keyboard-first**: core loops must be executable without mouse.
- **Deterministic focus**: focus never “teleports” without user intent.
- **Predictable keystrokes**: Tab/Enter/Esc behave the same everywhere.
- **No core-flow modals**: modals break velocity, increase fatigue, and kill context.

### Keyboard Contract (TERP-wide)
This contract must be consistent across Work Surfaces.

- **Tab**: advance to next editable field/cell.
- **Shift+Tab**: go back.
- **Enter**:
  - if editing a field/cell → commit the edit
  - if on a row with required fields valid → commit row and advance
  - if on selection (not editing) → open inspector (right panel)
- **Esc**:
  - if editing → cancel edit (revert field only)
  - if inspector open → close inspector
  - never discard committed work silently
- **Cmd/Ctrl+Z**: undo last destructive change (where feasible)

### Speed is not “grid UI”
A grid can help velocity, but velocity is primarily:
- stable selection & focus,
- fast create → commit loops,
- minimal context switching.

---

## 3) Layer 2: Safety (Error Prevention Without Interruption)

### Goal
Prevent costly mistakes while keeping the user in flow.

### Validation Timing Contract (“Reward early, punish late”)

- **Reward early**: show success immediately when discrete action completes (e.g., vendor selected).
- **Punish late**: show error only on:
  - field blur, OR
  - submit/commit attempt.
- **Never** show “required field missing” while the user is still typing.

### Safety Patterns (preferred)
- **Soft warnings** for unusual values (not hard blocks).
- **Hard validation** only when committing a record or producing downstream consequences.
- **Undo + soft delete** for destructive actions.
- **Constraint-as-assistance**: valid options are discoverable via typeahead/combobox.

### The Save-State Contract
Every Work Surface shows one of three states:

- ✅ **Saved**
- 🟡 **Saving…**
- 🔴 **Needs attention** (blocking validation before commit)

No other ambiguous states are allowed.

---

## 4) Layer 3: Context (Progressive Disclosure + Meaning In Place)

### Goal
Users should not need to navigate away from where they are working to understand what they’re doing.

### Context must be shown as:
- **Inspector Panel** (right side) for the selected object
- **Status bar** for totals, counts, save state, warnings
- **Inline micro-context** (tooltips, small helper text) where needed

### Progressive Disclosure Contract
- Fields used in **80%+ sessions** are *core*, not “advanced.”
- “Advanced” fields live in the inspector panel or collapsible sections.
- Progressive disclosure must be **behavior-based**, not designer preference.

---

## 5) The Work Surface Pattern (Universal Template)

A **Work Surface** is the canonical TERP interaction surface for high-frequency workflows.

### Anatomy

A) **Sticky Context Header**
- establishes the batch/session scope
- sets defaults (warehouse/location, vendor/customer, date)
- exposes critical metadata

B) **Primary Work Grid**
- dense entry/overview
- bulk selection
- inline editing for safe primitives

C) **Inspector Panel (right)**
- full object editing
- complex fields
- audit/history
- context-aware actions

D) **Status Bar / Summary Footer**
- totals
- save-state
- validation state

### Why Work Surfaces are not “glorified spreadsheets”
Because they include:
- opinionated constraints,
- validation timing,
- predictable actions,
- contextual editing (inspector),
- and clear system state.

---

## 6) Inline vs Inspector Rules (Hard Boundary)

### Inline editing is allowed for:
- quantity
- unit cost / price
- status toggles
- simple notes

### Inspector-only editing for:
- multi-field dependent objects
- accounting-impactful fields
- anything requiring history/audit context
- anything requiring complex validation

---

## 7) Command Palette Doctrine

### Purpose
Command palette is for **navigation + actions**.

### Explicit boundary
**Cmd/Ctrl+K is NOT for field-level record selection**.

- vendor/product selection belongs inside the workflow controls
- command palette is for:
  - create new PO / direct intake
  - jump to ledger
  - open vendor profile
  - run bulk actions
  - navigate modules

This prevents “multiple competing search UIs” confusion.

---

## 8) Banned patterns (global)

- Nested modals
- Full-screen blocking modals for core loops
- Multi-page wizards for simple entry
- Multiple different keyboard paradigms across modules
- UI that requires remembering values across screens
- “Anything goes anywhere” spreadsheet cells without constraints

---

## 9) What success looks like

Users should describe TERP as:
- “fast”
- “predictable”
- “hard to mess up”
- “I never lose my place”

Performance + correctness + calmness are the brand.

