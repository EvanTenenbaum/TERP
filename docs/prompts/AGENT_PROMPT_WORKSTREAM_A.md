# Agent Prompt: Workstream A - Spreadsheet View Implementation

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing the Spreadsheet View feature for TERP, a cannabis ERP system.

### Your Mission

Your sole focus is to build the spreadsheet view components and services. You will work in parallel with other agents who are handling bug fixes and UX polish.

### Key Documents

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Spreadsheet Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
3. **Spreadsheet Analysis:** `docs/specs/spreadsheet-view-analysis.md`
4. **Gemini QA Review:** `docs/reviews/QA-REVIEW-SPREADSHEET-VIEW-SPEC-V2.md`

**You MUST read these documents before starting.**

### Repository Setup

```bash
# Clone the repo
gh repo clone EvanTenenbaum/TERP
cd TERP

# Install dependencies
pnpm install

# Create your feature branch
git checkout -b feature/spreadsheet-grids
```

### File Ownership

**You ONLY have permission to modify these files:**

- `client/src/pages/SpreadsheetViewPage.tsx`
- `client/src/components/spreadsheet/*` (create this directory)
- `server/services/spreadsheetViewService.ts`
- `server/routers/spreadsheet.ts`

**DO NOT modify any other files.**

---

## 2. Your Tasks (Wave 1: P0 Critical)

### Task 1: Implement Intake Grid (TERP-SS-001, 32h)

**Goal:** Create the `IntakeGrid.tsx` component and integrate it into the Spreadsheet View page.

**Requirements:**

1. Create `client/src/components/spreadsheet/IntakeGrid.tsx`
2. Use AG-Grid to display intake data
3. Add form elements for creating new intake rows
4. Integrate with `flowerIntake.processIntake` tRPC mutation
5. Add a new "Intake" tab to `SpreadsheetViewPage.tsx`

**Verification:**

- [ ] New intake records can be created from the grid
- [ ] Validation errors are displayed correctly
- [ ] Successful intake appears in the grid

### Task 2: Implement Pick & Pack Grid (TERP-SS-002, 40h)

**Goal:** Create the `PickPackGrid.tsx` component for managing orders.

**Requirements:**

1. Create `client/src/components/spreadsheet/PickPackGrid.tsx`
2. Use AG-Grid to display orders in the pick/pack queue
3. Implement status update functionality (e.g., "Packed", "Shipped")
4. Integrate with `pickPack` tRPC mutations
5. Add a new "Pick & Pack" tab to `SpreadsheetViewPage.tsx`

**Verification:**

- [ ] Order statuses can be updated from the grid
- [ ] Changes are reflected in the database
- [ ] Grid updates in real-time (or with polling)

---

## 3. Completion Protocol

1. **Run Checks:** Before creating a PR, run these commands:
   ```bash
   pnpm check
   pnpm test
   ```
2. **Create Pull Request:**
   - Title: `feat(spreadsheet): implement intake and pick/pack grids`
   - Body: Link to this prompt and list completed tasks
3. **Notify Orchestrator:** Inform the orchestrator that your PR is ready for review.

---

## 4. Important Rules

- **Stick to your scope.** Do not work on tasks outside this prompt.
- **Use Gemini API for all code generation.**
- **Communicate early if you are blocked.**
- **Follow the provided file ownership rules strictly.**

Good luck! Your success depends on your ability to work independently within these constraints. Good luck!
