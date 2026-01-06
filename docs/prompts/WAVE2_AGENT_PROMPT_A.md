# AUTONOMOUS AGENT PROMPT: Workstream A - Wave 2 (Spreadsheet Data Fixes)

## 1. Onboarding

**Welcome!** You are an AI agent continuing the work on the Spreadsheet View feature for TERP.

### Your Mission

Your focus is to fix data mapping and display issues in the Spreadsheet View. You will work in parallel with other agents.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Spreadsheet Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
3. **Gemini QA Review:** `docs/reviews/QA-SPREADSHEET-VIEW-ANALYSIS.md`

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b feature/spreadsheet-data-fixes
```

### File Ownership

- `client/src/components/spreadsheet/*`
- `server/services/spreadsheetViewService.ts`
- `server/routers/spreadsheet.ts`

---

## 2. Your Tasks (Wave 2)

### Task 1: Fix Client Grid Vendor/Batch Code Mapping (TERP-SS-003, 24h)

**Goal:** Display the correct `lot.code` or `batch.code` in the Client Grid.

**Requirements:**

1. Modify `spreadsheetViewService.ts` to enrich `ClientGridRow` with the correct batch code.
2. Ensure the `vendorCode` column in `ClientGrid.tsx` displays this data.

### Task 2: Implement Accurate Intake Quantity (TERP-SS-004, 20h)

**Goal:** Display the true original intake quantity in the Inventory Grid.

**Requirements:**

1. Modify the backend to provide the original intake quantity for batches.
2. Display this as a read-only field in `InventoryGrid.tsx`.

### Task 3: Display Payment Amounts in Client Grid (TERP-SS-005, 16h)

**Goal:** Show the actual payment amount in the Client Grid.

**Requirements:**

1. Enhance `ClientGridRow` to include the payment amount from `ClientOrderRecord`.
2. Render this amount in the "In" column of `ClientGrid.tsx`.

---

## 3. Completion Protocol

### Step 1: Run Checks

```bash
pnpm check
pnpm test
```

### Step 2: Create Pull Request

```bash
git add .
git commit -m "feat(spreadsheet): fix data mapping and display issues (Wave 2)"
git push -u origin feature/spreadsheet-data-fixes
gh pr create --title "feat(spreadsheet): fix data mapping and display issues (Wave 2)" --body "Implements TERP-SS-003, TERP-SS-004, TERP-SS-005"
```

### Step 3: Generate Reviewer Agent Prompt

Your final output MUST be a new prompt for the Reviewer Agent, following the established template.

```markdown
# AUTONOMOUS AGENT PROMPT: Reviewer for Workstream A - Wave 2

## Your Task: Review and Merge PR #[PR NUMBER]

### Step 1: Fetch and Checkout the PR

`gh pr checkout [PR NUMBER]`

### Step 2: Red Hat QA with Gemini Pro

Review the PR diff for code quality, security, and completion of tasks TERP-SS-003, 004, and 005.

### Step 3: Implement Fixes and Improvements

Apply any necessary fixes based on the Gemini review.

### Step 4: Merge to Main

Merge the improved code into the `main` branch.

### Step 5: Final Report

Confirm the merge and summarize your findings.
```

Good luck!
