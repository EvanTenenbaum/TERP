# UX_PATTERN_REGISTRY.md

**Status:** CANONICAL

This registry defines the **approved UX patterns** for TERP.
AI agents must use these patterns when implementing UI.

If an agent believes a new pattern is necessary, it must:
1) justify why existing patterns fail, and
2) add the new pattern here with usage constraints.

---

## Pattern 01 — Work Surface

**Intent:** A reusable interaction shell for high-frequency workflows.

**Components:**
- Sticky Context Header
- Primary Work Grid
- Inspector Panel (right)
- Status Bar / Summary Footer

**Use when:**
- repetitive entry
- bulk operations
- user needs to stay in flow

**Avoid when:**
- a workflow is truly infrequent and complex (rare in TERP)

---

## Pattern 02 — Sticky Context Header

**Intent:** Establish batch scope and defaults.

**Includes (examples):**
- vendor/customer
- warehouse/location
- date
- payment terms
- source

**Rules:**
- fields used most frequently belong here
- must not scroll away
- must not be overcrowded

---

## Pattern 03 — Primary Work Grid

**Intent:** Dense display + fast entry.

**Rules:**
- keyboard-first navigation
- inline edit primitives only
- supports multi-select
- supports row creation without losing focus

**Minimum features:**
- tab/enter behavior is deterministic
- row-level validation on commit

---

## Pattern 04 — Inspector Panel (Right)

**Intent:** Edit complex objects without leaving context.

**Rules:**
- never blocks the grid
- opens based on selection
- contains advanced fields + audit/history
- can be closed with Esc

---

## Pattern 05 — Bulk Action Bar

**Intent:** Show context-aware actions when multiple rows are selected.

**Rules:**
- appears only on selection >1
- shows count + actions
- destructive actions require confirmation + undo

---

## Pattern 06 — Save-State Indicator

**Intent:** Make persistence trustworthy.

**Allowed states:**
- ✅ Saved
- 🟡 Saving…
- 🔴 Needs attention

**Rules:**
- never hide the state
- errors must be actionable (link to row/field)

---

## Pattern 07 — Validation Timing (Reward early, punish late)

**Intent:** Reduce frustration and speed entry.

**Rules:**
- success may show instantly
- error shows on blur or commit attempt
- never show “required missing” while typing

---

## Pattern 08 — Command Palette (Actions + Navigation)

**Intent:** global entry point for actions.

**Rules:**
- not used for field-level selection
- shows shortcut hints
- fuzzy match allowed

---

## Pattern 09 — Smart Defaults

**Intent:** Reduce repeated entry.

**Examples:**
- default warehouse per org
- default payment terms per vendor
- last-used source

**Rules:**
- defaults must be visible and editable
- never hide important assumptions

---

## Pattern 10 — Quick Create (Constrained)

**Intent:** create missing records without breaking flow.

**Examples:**
- inline product create from grid item cell
- new vendor creation from combobox

**Rules:**
- minimal required fields only
- creation must not spawn nested modals

---

## Anti-Patterns (Explicitly banned)

- Nested modals
- Wizards for simple entry
- Multiple competing search systems
- “Empty white UI” with no signifiers
- Grid used as a report + entry + analysis mashup

