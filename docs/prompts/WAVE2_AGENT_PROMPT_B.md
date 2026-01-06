# AUTONOMOUS AGENT PROMPT: Workstream B - Wave 2 (Order Draft & Tests)

## 1. Onboarding

**Welcome!** You are an AI agent continuing bug fixes and feature implementation for TERP.

### Your Mission

Your focus is on implementing order draft auto-save and fixing test infrastructure issues.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Chaos Testing Report:** `docs/testing/CHAOS_TESTING_REPORT.md`

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b fix/order-draft-tests
```

### File Ownership

- `client/src/pages/OrderCreatorPage.tsx`
- `server/routers/*.test.ts`

---

## 2. Your Tasks (Wave 2)

### Task 1: Order Draft Auto-Save (CHAOS-025, 6h)

**Goal:** Automatically save order drafts as the user is creating them.

**Requirements:**

1. In `OrderCreatorPage.tsx`, use a `useEffect` hook with a debounce function.
2. After a period of inactivity (e.g., 2 seconds), save the current order state as a draft.
3. Add a visual indicator to show the draft has been saved.

### Task 2: Fix VIP Appointment Hardcoded Dates (QA-TEST-002, 1h)

**Goal:** Remove hardcoded dates from VIP appointment tests.

**Requirements:**

1. Locate the VIP appointment tests in `server/routers/vip.test.ts`.
2. Replace hardcoded dates with dynamically generated dates (e.g., using `new Date()`).

### Task 3: Review 93 Skipped Tests (QA-TEST-003, 4h)

**Goal:** Review all skipped tests and either enable them or document why they are skipped.

**Requirements:**

1. Search the codebase for `test.skip` or `it.skip`.
2. For each skipped test, determine if it is still relevant.
3. If relevant, remove the `.skip` and fix the test.
4. If not relevant, add a comment explaining why it is skipped.

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
git commit -m "fix(core): implement order draft auto-save and fix tests (Wave 2)"
git push -u origin fix/order-draft-tests
gh pr create --title "fix(core): implement order draft auto-save and fix tests (Wave 2)" --body "Implements CHAOS-025, QA-TEST-002, QA-TEST-003"
```

### Step 3: Generate Reviewer Agent Prompt

Your final output MUST be a new prompt for the Reviewer Agent, following the established template.

```markdown
# AUTONOMOUS AGENT PROMPT: Reviewer for Workstream B - Wave 2

## Your Task: Review and Merge PR #[PR NUMBER]

### Step 1: Fetch and Checkout the PR

`gh pr checkout [PR NUMBER]`

### Step 2: Red Hat QA with Gemini Pro

Review the PR diff for code quality, security, and completion of tasks CHAOS-025, QA-TEST-002, and QA-TEST-003.

### Step 3: Implement Fixes and Improvements

Apply any necessary fixes based on the Gemini review.

### Step 4: Merge to Main

Merge the improved code into the `main` branch.

### Step 5: Final Report

Confirm the merge and summarize your findings.
```

Good luck!
