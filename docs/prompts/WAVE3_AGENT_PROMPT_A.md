# Agent Prompt: Wave 3 - Workstream A (Spreadsheet UX)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing UX improvements for the Spreadsheet View feature in TERP.

### Your Mission

Your focus is on UX fidelity and polish for the spreadsheet grids. You will work in parallel with other agents handling bug fixes and new features.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Spreadsheet Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
3. **Gemini QA Review:** `docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md`

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b feature/spreadsheet-ux-polish
```

### File Ownership

**You ONLY have permission to modify these files:**

- `client/src/components/spreadsheet/*`
- `client/src/pages/SpreadsheetViewPage.tsx`

---

## 2. Your Tasks (24h total)

| Task ID     | Title                                | Est. Hours |
| ----------- | ------------------------------------ | ---------- |
| TERP-SS-006 | Implement Visual Cues (Color Coding) | 24h        |

### Task 1: TERP-SS-006 - Implement Visual Cues (Color Coding)

**Problem:** The spreadsheet grids lack the color coding and visual cues that users rely on in their existing spreadsheets.

**Requirements:**

1. **Batch Status Color Coding:**
   - In `InventoryGrid.tsx`, apply background colors to cells in the "Status" column based on the batch status:
     - **"C" (Curing):** Orange/Tan (`bg-orange-100` or similar)
     - **"Ofc" (Office):** Cyan/Teal (`bg-cyan-100` or similar)
2. **Payment Highlighting:**
   - In `ClientGrid.tsx`, apply a green background highlight (`bg-green-100` or similar) to the entire row if a payment has been made for that order.

**Implementation Guidance:**

- Use AG-Grid's `cellClassRules` or `cellStyle` for conditional styling.
- Create a custom cell renderer component if more complex logic is needed.

---

## 3. Completion Protocol

1. **Implement all tasks** on your `feature/spreadsheet-ux-polish` branch.
2. **Run `pnpm check`** to ensure no TypeScript errors.
3. **Create a Pull Request** to `main` with a clear title and summary.
4. **Generate a Reviewer Prompt** for a new Manus agent to QA and merge your work.

**Example Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Spreadsheet UX Polish

**Branch:** `feature/spreadsheet-ux-polish`

**Tasks to Verify:**

- [ ] **TERP-SS-006:** Verify batch status color coding and payment row highlighting in the spreadsheet view.

**Instructions:**

1. Checkout the branch.
2. Run `pnpm check`.
3. Perform a thorough Gemini Pro QA review.
4. If approved, merge to main.
```

---

Good luck! Your work will significantly improve the usability of the spreadsheet view.
