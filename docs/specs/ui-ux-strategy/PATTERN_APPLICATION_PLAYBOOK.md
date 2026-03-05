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
  - jump to ledger/client/supplier
  - run bulk actions
- Do **not** use Cmd+K for:
  - selecting products/suppliers inside a grid
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

| Module       | Smart Defaults                        | Visibility Rules         |
| ------------ | ------------------------------------- | ------------------------ |
| Intake       | supplier terms, location, last source | Always visible in header |
| Sales Orders | customer, payment terms               | Visible in header        |
| Inventory    | location, count type                  | Visible in header        |
| Pricing      | supplier/category                     | Visible in header        |
| Ledger       | period, account                       | Visible near entry grid  |

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

---

## 8. Layout Specifications (Red Hat QA Addition)

### 8.1 Work Surface Shell Dimensions

```
┌─────────────────────────────────────────────────────────────────┐
│ Context Header (sticky)                            h: 64-80px   │
├─────────────────────────────────────────────────────────┬───────┤
│                                                         │       │
│                                                         │       │
│                                                         │  I    │
│                   Primary Grid                          │  n    │
│                   (fill remaining)                      │  s    │
│                                                         │  p    │
│                                                         │  e    │
│                                                         │  c    │
│                                                         │  t    │
│                                                         │  o    │
│                                                         │  r    │
│                                                         │       │
│                                                         │  w:   │
│                                                         │ 360-  │
│                                                         │ 400px │
├─────────────────────────────────────────────────────────┴───────┤
│ Status Bar (sticky bottom)                         h: 48px      │
└─────────────────────────────────────────────────────────────────┘
```

### 8.2 Spacing System

All spacing follows an 8px base unit:

| Token      | Value | Usage                      |
| ---------- | ----- | -------------------------- |
| `space-xs` | 4px   | Icon gaps, tight inline    |
| `space-sm` | 8px   | Cell padding, field gaps   |
| `space-md` | 16px  | Section padding, card gaps |
| `space-lg` | 24px  | Header padding             |
| `space-xl` | 32px  | Major section gaps         |

### 8.3 Grid Cell Specifications

| Property          | Value          | Notes                          |
| ----------------- | -------------- | ------------------------------ |
| Row height        | 40px           | Touch-friendly minimum         |
| Cell padding      | 8px horizontal | Consistent with space-sm       |
| Min column width  | 80px           | Prevents truncation issues     |
| Max column width  | 400px          | User-resizable                 |
| Header row height | 44px           | Slightly taller than data rows |

### 8.4 Inspector Panel Specifications

| Breakpoint  | Inspector Behavior | Width |
| ----------- | ------------------ | ----- |
| ≥1440px     | Fixed right panel  | 400px |
| 1280-1439px | Fixed right panel  | 360px |
| 1024-1279px | Slide-over sheet   | 400px |
| <1024px     | Full-screen sheet  | 100%  |

**Inspector Anatomy**:

```
┌─────────────────────────────────────┐
│ [←] Record Title              [×]  │  Header: 56px
├─────────────────────────────────────┤
│                                     │
│  Primary Details Section            │
│                                     │
├─────────────────────────────────────┤
│  Audit / History Section            │
│                                     │
├─────────────────────────────────────┤
│  [Secondary Action]  [Primary CTA]  │  Footer: 64px
└─────────────────────────────────────┘
```

---

## 9. Component Composition Patterns

### 9.1 Work Surface Shell Structure

```tsx
// Recommended component hierarchy
<WorkSurfaceShell>
  <ContextHeader>
    <ContextHeaderField label="Supplier" value={supplier} />
    <ContextHeaderField label="Location" value={location} />
    <ContextHeaderActions>
      <Button>Save Draft</Button>
      <Button variant="primary">Finalize</Button>
    </ContextHeaderActions>
  </ContextHeader>

  <WorkSurfaceBody>
    <PrimaryGrid
      data={rows}
      onRowSelect={setSelectedRow}
      onRowCommit={handleCommit}
    />

    {selectedRow && (
      <InspectorPanel record={selectedRow} onClose={() => setSelectedRow(null)}>
        <InspectorSection title="Details">
          {/* Complex fields */}
        </InspectorSection>
        <InspectorSection title="History">
          <AuditLog recordId={selectedRow.id} />
        </InspectorSection>
      </InspectorPanel>
    )}
  </WorkSurfaceBody>

  <StatusBar>
    <StatusBarMetrics>
      <Metric label="Rows" value={rows.length} />
      <Metric label="Total" value={formatCurrency(total)} />
    </StatusBarMetrics>
    <SaveStateIndicator state={saveState} />
  </StatusBar>
</WorkSurfaceShell>
```

### 9.2 Inline Edit Cell Pattern

```tsx
// Inline edit for primitive values only
<InlineEditCell
  value={row.quantity}
  type="number"
  min={0}
  onChange={newValue => updateRow(row.id, { quantity: newValue })}
  onBlur={handleValidation} // Errors show on blur
  onCommit={handleRowCommit} // Save on Enter
/>
```

### 9.3 Validation Timing Pattern

```tsx
// Reward early, punish late
const useValidation = (value: string, rules: ValidationRule[]) => {
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only validate after blur (touched = true)
  useEffect(() => {
    if (!touched) return;
    const validationError = validate(value, rules);
    setError(validationError);
  }, [value, touched, rules]);

  const handleBlur = () => setTouched(true);

  return { error, handleBlur, touched };
};
```

---

## 10. Module-Specific Application Examples

### 10.1 Intake Module (DF-010, DF-053)

**Surface Type**: Work Surface (Execution)

**Context Header Fields**:

- Supplier (required, typeahead)
- Location (required, select)
- Payment Terms (auto-filled from supplier)
- Receipt Date (default: today)

**Grid Columns** (Priority Order):

1. Product/Strain (typeahead with quick-create)
2. Quantity (inline number)
3. Unit (select)
4. Unit Cost (inline currency)
5. Total (calculated, read-only)
6. Notes (inline text, optional)

**Inspector Panel**:

- Batch attributes (THC%, terpenes, test results)
- Cost breakdown
- Audit history
- Verification link (DF-053)

**Special Rules**:

- Public verification link generated automatically
- Discrepancy resolution workflow in inspector
- Receipt cannot be finalized without supplier acknowledgment

### 10.2 Orders Module (DF-022)

**Surface Type**: Work Surface (Execution)

**Context Header Fields**:

- Customer (required, typeahead)
- Payment Terms (auto-filled from customer)
- Order Date (default: today)
- Salesperson (default: current user)

**Grid Columns** (Priority Order):

1. Product (typeahead)
2. Batch (select, filtered by product)
3. Quantity (inline number)
4. Unit Price (inline currency, with COGS warning)
5. Discount (inline percentage)
6. Total (calculated)

**Inspector Panel**:

- Line item notes
- COGS override with audit trail
- Margin calculation display
- Batch details (age, location)

**Special Rules**:

- COGS margin warning if selling below cost
- Draft auto-save every 30 seconds
- Finalize creates invoice (DF-003)

### 10.3 Pick & Pack Module (DF-023)

**Surface Type**: Work Surface (Execution, Bulk-heavy)

**Context Header Fields**:

- Location filter
- Status filter (Pending, In Progress, Ready)
- Date range

**Grid Columns**:

1. Order # (link to order)
2. Customer
3. Items (count)
4. Status (select, inline change)
5. Assigned To (select)
6. Due Date

**Bulk Action Bar**:

- Assign to me
- Mark as picked
- Mark as packed
- Print pick list (batch)

**Inspector Panel**:

- Order line items (read-only)
- Pick locations for each item
- Packing notes
- Shipping label generation

---

## 11. Error State Patterns

### 11.1 Field-Level Errors

```
┌─────────────────────────────────┐
│ Quantity: [      abc      ]    │  ← Red border
│ ⚠️ Must be a number            │  ← Error text below
└─────────────────────────────────┘
```

### 11.2 Row-Level Errors

```
┌───┬────────────┬─────────┬─────────┬────┐
│ ⚠️│ Product A  │   10    │  $5.00  │ ✗  │  ← Row highlighted
├───┴────────────┴─────────┴─────────┴────┤
│ ⚠️ Product A is out of stock            │  ← Expandable error
└─────────────────────────────────────────┘
```

### 11.3 Status Bar Error Summary

```
┌─────────────────────────────────────────────────────────────────┐
│ 15 items │ $1,234.56 total │ ⚠️ 2 issues │ 🔴 Needs attention   │
└─────────────────────────────────────────────────────────────────┘
                                    ↓ Clickable
                        ┌───────────────────────┐
                        │ • Row 3: Invalid qty  │
                        │ • Row 7: Out of stock │
                        └───────────────────────┘
```

---

## 12. Transition & Animation Specifications

### 12.1 Animation Tokens

| Animation         | Duration      | Easing            | Trigger        |
| ----------------- | ------------- | ----------------- | -------------- |
| Inspector open    | 200ms         | ease-out          | Row selection  |
| Inspector close   | 150ms         | ease-in           | Esc or ×       |
| Row creation      | 150ms         | ease-out          | Enter commit   |
| Row deletion      | 150ms + 100ms | ease-in, collapse | Delete action  |
| Save state change | 300ms         | ease-in-out       | State update   |
| Toast appear      | 200ms         | ease-out          | Notification   |
| Toast dismiss     | 150ms         | ease-in           | Auto or manual |

### 12.2 Reduced Motion

When `prefers-reduced-motion: reduce`:

- All transitions become instant (0ms)
- No transforms or opacity animations
- Focus indicators remain visible
- Loading spinners remain (necessary feedback)

---

## 13. Extended Anti-Drift Checklist

Before merging any UX change, confirm all items:

### Layout & Structure

- [ ] Work Surface shell used for high-frequency workflows
- [ ] Context header contains only batch-level fields
- [ ] Inspector opens on row selection (not modal)
- [ ] Status bar is sticky at bottom

### Interactions

- [ ] Keyboard contract: Tab, Shift+Tab, Enter, Esc work as specified
- [ ] Inline edits restricted to primitives (qty, cost, status)
- [ ] Complex fields open in inspector
- [ ] Bulk actions require selection >1

### Visual Feedback

- [ ] Save-state indicator visible at all times
- [ ] Loading states use skeletons matching layout
- [ ] Errors appear on blur/commit, not during typing
- [ ] Empty states have clear message + CTA

### Data Integrity

- [ ] Validation occurs both client and server side
- [ ] Concurrent edit protection via version field
- [ ] Unsaved changes warning on navigation
- [ ] Undo available for destructive actions (10s window)

### Accessibility

- [ ] Focus indicators visible (2px, ≥3:1 contrast)
- [ ] All interactive elements have accessible names
- [ ] Changes announced via aria-live
- [ ] Animations respect prefers-reduced-motion

### Documentation

- [ ] Feature Preservation Matrix updated or referenced
- [ ] New patterns documented in this playbook
- [ ] Exceptions logged in ASSUMPTION_LOG.md
- [ ] Risks added to RISK_REGISTER.md if applicable
