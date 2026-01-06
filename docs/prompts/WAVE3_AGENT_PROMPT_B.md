# Agent Prompt: Wave 3 - Workstream B (Spreadsheet Editing & Grouping)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing advanced interactivity for the Spreadsheet View feature in TERP.

### Your Mission

Your focus is on adding editing and grouping capabilities to the spreadsheet grids. You will work in parallel with other agents.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Spreadsheet Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
3. **Gemini QA Review:** `docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md`

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b feature/spreadsheet-editing-grouping
```

### File Ownership

**You ONLY have permission to modify these files:**

- `client/src/components/spreadsheet/InventoryGrid.tsx`
- `client/src/components/spreadsheet/ClientGrid.tsx`
- `server/routers/inventory.ts` (for update mutations)

---

## 2. Your Tasks (44h total)

| Task ID     | Title                                         | Est. Hours |
| ----------- | --------------------------------------------- | ---------- |
| TERP-SS-008 | Configure Inventory Grid Date/Vendor Grouping | 16h        |
| TERP-SS-009 | Add Editing Capabilities to Inventory Grid    | 28h        |

### Task 1: TERP-SS-008 - Configure Inventory Grid Date/Vendor Grouping

**Problem:** The inventory grid is a flat list, but users need to see it grouped by date and vendor.

**Requirements:**

- In `InventoryGrid.tsx`, implement AG-Grid's row grouping feature.
- Group by `lotDate` first, then by `vendorCode`.
- The grid should render with these groups expanded by default.

**Implementation Guidance:**

- Use the `rowGroup` and `showRowGroup` properties in your column definitions.
- Configure `autoGroupColumnDef` for custom group display.

### Task 2: TERP-SS-009 - Add Editing Capabilities to Inventory Grid

**Problem:** Users need to make quick edits to inventory data directly in the grid.

**Requirements:**

- In `InventoryGrid.tsx`, make the following columns editable:
  - `Available`
  - `Ticket`
  - `Notes`
- When a cell is edited, trigger a tRPC mutation to update the backend:
  - Use `inventory.updateBatch` for general fields.
  - Use `inventory.updateBatchStatus` if the status is changed.
- Provide visual feedback on save (e.g., a toast notification).

**Implementation Guidance:**

- Set `editable: true` on the relevant column definitions.
- Use the `onCellValueChanged` grid event to trigger your mutations.

---

## 3. Completion Protocol

1. **Implement all tasks** on your `feature/spreadsheet-editing-grouping` branch.
2. **Run `pnpm check`** to ensure no TypeScript errors.
3. **Create a Pull Request** to `main` with a clear title and summary.
4. **Generate a Reviewer Prompt** for a new Manus agent to QA and merge your work.

**Example Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Spreadsheet Editing & Grouping

**Branch:** `feature/spreadsheet-editing-grouping`

**Tasks to Verify:**

- [ ] **TERP-SS-008:** Verify inventory grid grouping by date and vendor.
- [ ] **TERP-SS-009:** Verify editing capabilities for Available, Ticket, and Notes columns.

**Instructions:**

1. Checkout the branch.
2. Run `pnpm check`.
3. Perform a thorough Gemini Pro QA review.
4. If approved, merge to main.
```

---

Good luck! Your work will make the spreadsheet view a powerful interactive tool.
