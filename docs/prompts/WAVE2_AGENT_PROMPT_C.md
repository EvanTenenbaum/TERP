# AUTONOMOUS AGENT PROMPT: Workstream C - Wave 2 (UX Polish)

## 1. Onboarding

**Welcome!** You are an AI agent continuing the work on mobile and UX polish for TERP.

### Your Mission

Your focus is on a second wave of UI/UX improvements.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Chaos Testing Report:** `docs/testing/CHAOS_TESTING_REPORT.md`

### Repository Setup

```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b fix/ux-polish-wave2
```

### File Ownership

- `client/src/components/ui/*`
- `client/src/components/layout/*`
- Any page file for CSS/className changes only

---

## 2. Your Tasks (Wave 2)

### Task 1: Add Breadcrumb Navigation (CHAOS-021, 4h)

**Goal:** Add breadcrumb navigation to all pages.

**Requirements:**

1. Create a reusable `Breadcrumbs` component.
2. Use the `useLocation` hook from Wouter to generate breadcrumbs dynamically.
3. Add the component to the main layout.

### Task 2: Fix Sidebar Menu Length (CHAOS-022, 2h)

**Goal:** Ensure the sidebar menu is scrollable if it exceeds viewport height.

**Requirements:**

1. Add `overflow-y-auto` to the sidebar container.

### Task 3: Add Filter Persistence (CHAOS-023, 4h)

**Goal:** Persist user filter selections in `localStorage`.

**Requirements:**

1. For pages with filters (Inventory, Orders), save filter state to `localStorage`.
2. On page load, check for saved filters and apply them.

### Task 4: Fix Duplicate Menu Icons (CHAOS-026, 1h)

**Goal:** Remove duplicate icons from the sidebar menu.

**Requirements:**

1. Review the sidebar component and remove any redundant icon components.

### Task 5: Add Version Number to Header (CHAOS-027, 1h)

**Goal:** Display the app version number in the header.

**Requirements:**

1. Read the version from `package.json`.
2. Display it in the header or footer.

### Task 6: Explain TERI Code Terminology (CHAOS-028, 1h)

**Goal:** Add a tooltip explaining what "TERI Code" means.

**Requirements:**

1. Add a `Tooltip` component next to "TERI Code" labels.
2. The tooltip should explain the term.

### Task 7: Fix Tooltips on Mobile (CHAOS-029, 2h)

**Goal:** Ensure tooltips are usable on mobile devices.

**Requirements:**

1. Use a `TooltipProvider` with `delayDuration={0}`.
2. Ensure tooltips can be triggered by touch.

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
git commit -m "fix(ux): implement UX polish (Wave 2)"
git push -u origin fix/ux-polish-wave2
gh pr create --title "fix(ux): implement UX polish (Wave 2)" --body "Implements CHAOS-021, 022, 023, 026, 027, 028, 029"
```

### Step 3: Generate Reviewer Agent Prompt

Your final output MUST be a new prompt for the Reviewer Agent, following the established template.

```markdown
# AUTONOMOUS AGENT PROMPT: Reviewer for Workstream C - Wave 2

## Your Task: Review and Merge PR #[PR NUMBER]

### Step 1: Fetch and Checkout the PR

`gh pr checkout [PR NUMBER]`

### Step 2: Red Hat QA with Gemini Pro

Review the PR diff for code quality, security, and completion of the assigned CHAOS tasks.

### Step 3: Implement Fixes and Improvements

Apply any necessary fixes based on the Gemini review.

### Step 4: Merge to Main

Merge the improved code into the `main` branch.

### Step 5: Final Report

Confirm the merge and summarize your findings.
```

Good luck!
