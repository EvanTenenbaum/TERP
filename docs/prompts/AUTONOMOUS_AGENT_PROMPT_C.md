# AUTONOMOUS AGENT PROMPT: Workstream C - Mobile & UX Polish (Wave 1)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with improving the mobile responsiveness and user experience of TERP, a cannabis ERP system.

### Your Mission

Your focus is on UI/UX polish and mobile-specific fixes. You will work in parallel with other agents. At the end of your work, you will create a Pull Request and then generate a new prompt for a **Reviewer Agent** to QA, improve, and merge your work.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Mobile Responsive Patterns:** `docs/MOBILE_RESPONSIVE_PATTERNS.md`
3. **Chaos Testing Report:** `docs/testing/CHAOS_TESTING_REPORT.md`

**You MUST read these documents before starting any implementation.**

### Repository Setup

```bash
# Clone the repo
gh repo clone EvanTenenbaum/TERP
cd TERP

# Install dependencies
pnpm install

# Create your feature branch
git checkout -b fix/mobile-ux-polish
```

### File Ownership

**You have permission to modify these files:**

- `client/src/components/ui/*`
- `client/src/components/layout/*`
- `client/src/styles/*`
- Any page file for CSS/className changes only (not logic)

**DO NOT modify any backend files (`server/*`).**

---

## 2. Your Tasks (Wave 1)

### Task 1: Fix Mobile Touch Targets (CHAOS-011, 4h)

**Goal:** Ensure all interactive elements are at least 44x44px on mobile.

**Requirements:**

1. Audit all `Button` components with `size="sm"` or `size="icon"`.
2. On mobile viewports (`<md`), ensure minimum 44x44px touch area.

**Verification:**

- [ ] Small buttons are larger on mobile screens.
- [ ] Buttons remain their original size on desktop.

### Task 2: Fix Keyboard Covering Form Buttons (CHAOS-012, 3h)

**Goal:** Ensure form submit buttons remain visible when the on-screen keyboard is open.

**Requirements:**

1. For all major forms, ensure the submit button is not obscured by the keyboard.

**Verification:**

- [ ] On a mobile device, when a form input is focused, the submit button is still visible.

### Task 3: Fix Table Horizontal Overflow (CHAOS-013, 2h)

**Goal:** Add horizontal scrolling to all tables on mobile.

**Requirements:**

1. Wrap all `<Table>` components in a scrollable container.

**Verification:**

- [ ] Tables on pages like Inventory, Orders, and Clients are horizontally scrollable on mobile.

### Task 4: Replace Browser Confirm Dialogs (CHAOS-016, 4h)

**Goal:** Replace all native `window.confirm()` dialogs with custom AlertDialog components.

**Requirements:**

1. Search the codebase for `window.confirm`.
2. Replace each instance with the `AlertDialog` from `@/components/ui/alert-dialog`.

**Verification:**

- [ ] Deleting an item shows a custom modal, not a browser dialog.

### Task 5: Add Missing Empty States (CHAOS-017, 4h)

**Goal:** Add user-friendly empty states to pages with no data.

**Requirements:**

1. For pages like Inventory, Orders, and Clients, when there is no data, display a helpful message and a call-to-action button.

**Verification:**

- [ ] When the database is empty, pages show an empty state message instead of a blank table.

### Task 6: Add Dashboard Loading Skeletons (CHAOS-018, 3h)

**Goal:** Add skeleton loaders to dashboard widgets while data is loading.

**Requirements:**

1. Add skeleton loaders to each dashboard widget.
2. Use the existing `Skeleton` component from `@/components/ui/skeleton`.

**Verification:**

- [ ] When the dashboard is loading, skeleton placeholders are shown.

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
git commit -m "fix(ux): implement mobile and UX polish (Wave 1)

Fixes: CHAOS-011, CHAOS-012, CHAOS-013, CHAOS-016, CHAOS-017, CHAOS-018"
git push -u origin fix/mobile-ux-polish
gh pr create --title "fix(ux): implement mobile and UX polish (Wave 1)" --body "## Summary
Improves mobile responsiveness and overall UX across the application.

## Tasks Completed
- [x] CHAOS-011: Fix Mobile Touch Targets (4h)
- [x] CHAOS-012: Fix Keyboard Covering Form Buttons (3h)
- [x] CHAOS-013: Fix Table Horizontal Overflow (2h)
- [x] CHAOS-016: Replace Browser Confirm Dialogs (4h)
- [x] CHAOS-017: Add Missing Empty States (4h)
- [x] CHAOS-018: Add Dashboard Loading Skeletons (3h)

## Testing
- [x] TypeScript check passes
- [x] Existing tests pass
- [x] Manual testing on mobile viewport completed

Ready for review and merge."
```

### Step 3: Generate the Reviewer Agent Prompt

**This is your final task.** After the PR is created, your final output MUST be a new prompt for the Reviewer Agent. Copy the template below and fill in the bracketed information.

````markdown
# AUTONOMOUS AGENT PROMPT: Reviewer for Workstream C

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
As a senior software engineer, perform a Red Hat QA review of the following PR diff. The PR implements a series of mobile and UX polish improvements.

Check for:
1.  **Code Quality:** Bugs, edge cases, maintainability, and adherence to best practices.
2.  **Security:** Any new client-side vulnerabilities introduced.
3.  **Completion:** Does the code fully implement tasks CHAOS-011, 012, 013, 016, 017, and 018?

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
git merge [BRANCH_NAME] -m "fix(ux): merge mobile and UX polish (Wave 1) (reviewed)"
git push origin main
```

### Step 5: Final Report

Your final output should be a message confirming the merge and summarizing the review findings and any improvements you made.

```
**Workstream C PR #[PR NUMBER] Merged**

**Gemini Pro Review Verdict:** [VERDICT]

**Improvements Made:**
- [List of improvements]

**Merge Commit:** [Git commit hash]

Workstream C is complete.
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
