# AUTONOMOUS AGENT PROMPT: Workstream A - Spreadsheet View (Wave 1)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with implementing the Spreadsheet View feature for TERP, a cannabis ERP system.

### Your Mission

Your sole focus is to build the spreadsheet view components and services. You will work in parallel with other agents who are handling bug fixes and UX polish. At the end of your work, you will create a Pull Request and then generate a new prompt for a **Reviewer Agent** to QA, improve, and merge your work.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Spreadsheet Spec:** `docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`
3. **Spreadsheet Analysis:** `docs/specs/spreadsheet-view-analysis.md`

**You MUST read these documents before starting any implementation.**

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
- `client/src/components/spreadsheet/*` (create this directory if needed)
- `server/services/spreadsheetViewService.ts`
- `server/routers/spreadsheet.ts`

**DO NOT modify any other files.**

---

## 2. Your Tasks (Wave 1: P0 Critical)

### Task 1: Implement Intake Grid (TERP-SS-001, 32h)

**Goal:** Create the `IntakeGrid.tsx` component and integrate it into the Spreadsheet View page.

**Requirements:**

1. Create `client/src/components/spreadsheet/IntakeGrid.tsx`
2. Use AG-Grid to display intake data.
3. Add form elements for creating new intake rows.
4. Integrate with `flowerIntake.processIntake` tRPC mutation.
5. Add a new "Intake" tab to `SpreadsheetViewPage.tsx`.

**Verification:**

- [ ] New intake records can be created from the grid.
- [ ] Validation errors are displayed correctly.
- [ ] Successful intake appears in the grid.

### Task 2: Implement Pick & Pack Grid (TERP-SS-002, 40h)

**Goal:** Create the `PickPackGrid.tsx` component for managing orders.

**Requirements:**

1. Create `client/src/components/spreadsheet/PickPackGrid.tsx`.
2. Use AG-Grid to display orders in the pick/pack queue.
3. Implement status update functionality.
4. Integrate with `pickPack` tRPC mutations.
5. Add a new "Pick & Pack" tab to `SpreadsheetViewPage.tsx`.

**Verification:**

- [ ] Order statuses can be updated from the grid.
- [ ] Changes are reflected in the database.
- [ ] Grid updates in real-time (or with polling).

---

## 3. Completion Protocol

### Step 1: Run Checks

Before creating a PR, run these commands and ensure they pass:

```bash
pnpm check
pnpm test
```

### Step 2: Create Pull Request

Create a PR with a detailed summary of your work.

```bash
git add .
git commit -m "feat(spreadsheet): implement intake and pick/pack grids

Implements: TERP-SS-001, TERP-SS-002"
git push -u origin feature/spreadsheet-grids
gh pr create --title "feat(spreadsheet): implement intake and pick/pack grids" --body "## Summary
Implements the Intake Grid and Pick & Pack Grid for the Spreadsheet View feature.

## Tasks Completed
- [x] TERP-SS-001: Implement Intake Grid Tab (32h)
- [x] TERP-SS-002: Implement Pick & Pack Grid Tab (40h)

## Testing
- [x] TypeScript check passes
- [x] Existing tests pass
- [x] Manual testing completed

Ready for review and merge."
```

### Step 3: Generate the Reviewer Agent Prompt

**This is your final task.** After the PR is created, your final output MUST be a new prompt for the Reviewer Agent. Copy the template below and fill in the bracketed information.

````markdown
# AUTONOMOUS AGENT PROMPT: Reviewer for Workstream A

## 1. Onboarding

**Welcome!** You are an AI agent tasked with reviewing, improving, and merging a Pull Request for the TERP project.

### Your Mission

Your goal is to perform a comprehensive QA review of the PR, fix any issues you find, and merge the improved code into the `main` branch.

### Repository Setup

```bash
# Clone the repo
gh repo clone EvanTenenbaum/TERP
cd TERP

# Install dependencies
pnpm install
```
````

## 2. Your Task: Review and Merge PR #[PR NUMBER]

### Step 1: Fetch and Checkout the PR

```bash
# Fetch the PR branch
gh pr checkout [PR NUMBER]
```

### Step 2: Red Hat QA with Gemini Pro

Use the Gemini API to perform a thorough code review. The prompt should be:

```
As a senior software engineer, perform a Red Hat QA review of the following PR diff. The PR implements the Intake and Pick & Pack grids for a new Spreadsheet View feature.

Check for:
1.  **Code Quality:** Bugs, edge cases, maintainability, and adherence to best practices.
2.  **Security:** Input validation, authorization, and potential vulnerabilities.
3.  **Completion:** Does the code fully implement tasks TERP-SS-001 and TERP-SS-002?

Provide a verdict (APPROVE, APPROVE WITH SUGGESTIONS, REQUEST CHANGES) and a list of required fixes.

[PASTE FULL `git diff origin/main...HEAD` HERE]
```

### Step 3: Implement Fixes and Improvements

Based on the Gemini review, apply any necessary fixes or improvements directly to the code.

### Step 4: Merge to Main

Once all improvements are made and tested, merge the code into the `main` branch.

```bash
# Run final checks
pnpm check
pnpm test

# Merge to main
git checkout main
git pull origin main
git merge [BRANCH_NAME] -m "feat(spreadsheet): merge intake and pick/pack grids (reviewed)"
git push origin main
```

### Step 5: Final Report

Your final output should be a message confirming the merge and summarizing the review findings and any improvements you made.

```
**Workstream A PR #[PR NUMBER] Merged**

**Gemini Pro Review Verdict:** [VERDICT]

**Improvements Made:**
- [List of improvements]

**Merge Commit:** [Git commit hash]

Workstream A is complete.
```

## 3. Important Rules

- You have full permission to modify the code in this PR.
- If the PR is fundamentally flawed, close it and report the issues.
- Ensure all checks pass before merging.

Good luck!

```

---

Good luck! Your success depends on your ability to work independently and generate the correct follow-up prompt.
```
