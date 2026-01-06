# AUTONOMOUS AGENT PROMPT: Workstream B - Bug Fixes & New Features (Wave 1)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with fixing critical bugs and implementing missing features for TERP, a cannabis ERP system.

### Your Mission

Your focus is on backend services and new page creation. You will work in parallel with other agents. At the end of your work, you will create a Pull Request and then generate a new prompt for a **Reviewer Agent** to QA, improve, and merge your work.

### Key Documents to Read First

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Chaos Testing Report:** `docs/testing/CHAOS_TESTING_REPORT.md`

**You MUST read these documents before starting any implementation.**

### Repository Setup

```bash
# Clone the repo
gh repo clone EvanTenenbaum/TERP
cd TERP

# Install dependencies
pnpm install

# Create your feature branch
git checkout -b feature/missing-pages
```

### File Ownership

**You have permission to modify these files:**

- `client/src/pages/SearchResultsPage.tsx` (new)
- `client/src/pages/TodoListsPage.tsx` (new)
- `client/src/pages/Orders.tsx` (debug dashboard removal only)
- `server/routers/search.ts` (new)
- `server/routers/todos.ts` (modify existing)
- `client/src/App.tsx` (add routes only)

**DO NOT modify any other files.**

---

## 2. Your Tasks (Wave 1)

### Task 1: Implement Global Search (CHAOS-005, 8h)

**Goal:** Create a global search feature.

**Requirements:**

1. Create `server/routers/search.ts` with a `globalSearch` procedure.
2. The search should query clients, orders, inventory, and products.
3. Create `client/src/pages/SearchResultsPage.tsx` to display results.
4. Add the route to `App.tsx`: `/search?q={query}`.

**Verification:**

- [ ] Searching for a client name returns the client.
- [ ] Searching for an order ID returns the order.
- [ ] Search results are displayed grouped by category.

### Task 2: Implement Todo Lists Page (CHAOS-009, 8h)

**Goal:** Create the missing Todo Lists page.

**Requirements:**

1. Create `client/src/pages/TodoListsPage.tsx`.
2. Display todos from `server/routers/todos.ts`.
3. Implement CRUD functionality for todos.

**Verification:**

- [ ] Todo Lists page is accessible from sidebar.
- [ ] Todos can be created, updated, and deleted.

### Task 3: Remove Debug Dashboard (CHAOS-008, 1h)

**Goal:** Remove the debug dashboard from the production build.

**Requirements:**

1. Locate the debug dashboard in `client/src/pages/Orders.tsx`.
2. Wrap it in a conditional: `{process.env.NODE_ENV === 'development' && <DebugDashboard />}`.

**Verification:**

- [ ] Debug dashboard is NOT visible on the live site.
- [ ] Debug dashboard IS visible in local development.

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
git commit -m "feat(core): implement search, todos, and remove debug dashboard

Fixes: CHAOS-005, CHAOS-008, CHAOS-009"
git push -u origin feature/missing-pages
gh pr create --title "feat(core): implement search, todos, and remove debug dashboard" --body "## Summary
Implements missing pages and removes debug elements from production.

## Tasks Completed
- [x] CHAOS-005: Implement Global Search (8h)
- [x] CHAOS-008: Remove Debug Dashboard (1h)
- [x] CHAOS-009: Implement Todo Lists Page (8h)

## Testing
- [x] TypeScript check passes
- [x] Existing tests pass
- [x] Manual testing completed

Ready for review and merge."
```

### Step 3: Generate the Reviewer Agent Prompt

**This is your final task.** After the PR is created, your final output MUST be a new prompt for the Reviewer Agent. Copy the template below and fill in the bracketed information.

````markdown
# AUTONOMOUS AGENT PROMPT: Reviewer for Workstream B

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
As a senior software engineer, perform a Red Hat QA review of the following PR diff. The PR implements a new global search feature, a todo lists page, and removes a debug dashboard.

Check for:
1.  **Code Quality:** Bugs, edge cases, maintainability, and adherence to best practices.
2.  **Security:** Input validation, authorization, and potential vulnerabilities.
3.  **Completion:** Does the code fully implement tasks CHAOS-005, CHAOS-008, and CHAOS-009?

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
git merge [BRANCH_NAME] -m "feat(core): merge search, todos, and debug fixes (reviewed)"
git push origin main
```

### Step 5: Final Report

Your final output should be a message confirming the merge and summarizing the review findings and any improvements you made.

```
**Workstream B PR #[PR NUMBER] Merged**

**Gemini Pro Review Verdict:** [VERDICT]

**Improvements Made:**
- [List of improvements]

**Merge Commit:** [Git commit hash]

Workstream B is complete.
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
