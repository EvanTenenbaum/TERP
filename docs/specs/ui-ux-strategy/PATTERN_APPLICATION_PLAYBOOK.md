# PATTERN_APPLICATION_PLAYBOOK.md

> **Purpose**: Universal adapter for applying the TERP UX system to any module without drift.

## 1. Decision Rules (Grid vs Panel vs Form)

### Rule Set

1. **Use a Work Surface** when the user completes >5 similar actions per session or edits rows in sequence.
2. **Use a Primary Grid** when:
   - rows represent line items or counts
   - actions are repeated and low‑coupling
3. **Use a Form** when:
   - a single record is edited rarely
   - fields are interdependent and error‑prone
4. **Use the Inspector** when:
   - a row has complex fields or audit context
   - editing should not block the grid

### Decision Tree (Text)

```
Is this a high-frequency workflow?
 ├─ No → Use Form or Review Surface
 └─ Yes
    ├─ Does the user edit multiple rows/line items in sequence?
    │   ├─ Yes → Work Surface + Primary Grid
    │   └─ No → Work Surface + Panel-only
    └─ Are there complex fields or audit context?
        ├─ Yes → Inspector Panel for complex edits
        └─ No → Inline edit primitives only
```

---

## 1.1 Review Surfaces vs Work Surfaces

- **Work Surface**: execution‑heavy workflows (intake, orders, inventory adjustments).
- **Review Surface**: read‑only or analysis‑heavy views (dashboards, audits, reports).
- If a screen mixes execution + analysis, **split modes** inside the same shell rather than mixing in one grid.

---

## 2. Direct Intake vs Standard PO Logic

### Direct Intake (Compressed Reality)

- **Use when**: goods already received and quantity/cost is known.
- **Behavior**: auto‑create PO + receipt + batches; status = Received.
- **UI rules**:
  - header defaults apply immediately
  - status is read‑only in grid

### Standard PO (Planning)

- **Use when**: order is planned but not received.
- **Behavior**: creates PO only; status = Draft/Planned.
- **UI rules**:
  - receipt creation is separate
  - status editable

**Never** merge the schema events; compress UX only.

---

## 3. Cmd+K Command Palette Rules

- Cmd+K is for **actions and navigation**, not field selection.
- Use Cmd+K to:
  - create new PO/intake
  - jump to ledger/client/vendor
  - run bulk actions
- Do **not** use Cmd+K for:
  - selecting products/vendors inside a grid
  - replacing local filtering

---

## 4. Keyboard Accessibility (Global Contract)

**Must be consistent everywhere**:

- Tab: next field/cell
- Shift+Tab: previous
- Enter: commit edit; if row valid, create next row
- Esc: cancel edit or close inspector
- Cmd/Ctrl+Z: undo last destructive action

If any module cannot support this, it must log an exception in ASSUMPTION_LOG.md.

---

## 5. Progressive Disclosure Rules

- If a field is used in **80%+ sessions**, it is core and must be visible.
- Rare or advanced fields belong in the inspector panel or a collapsed section.
- No “More” menus for required fields.

---

## 6. Smart Defaults by Module

| Module       | Smart Defaults                      | Visibility Rules         |
| ------------ | ----------------------------------- | ------------------------ |
| Intake       | vendor terms, location, last source | Always visible in header |
| Sales Orders | customer, payment terms             | Visible in header        |
| Inventory    | location, count type                | Visible in header        |
| Pricing      | vendor/category                     | Visible in header        |
| Ledger       | period, account                     | Visible near entry grid  |

---

## 7. Anti‑drift Checklist

Before merging any UX change, confirm:

- [ ] Work Surface shell used for high‑frequency workflows.
- [ ] Inline edits restricted to primitives.
- [ ] Inspector used for complex objects.
- [ ] Save‑state indicator visible.
- [ ] Validation timing contract respected.
- [ ] Cmd+K used only for navigation/actions.
- [ ] Feature Preservation Matrix updated or referenced.
