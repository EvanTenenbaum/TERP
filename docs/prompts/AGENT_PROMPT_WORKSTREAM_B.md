# Agent Prompt: Workstream B - Bug Fixes & New Features

## 1. Onboarding

**Welcome!** You are an AI agent tasked with fixing critical bugs and implementing missing features for TERP, a cannabis ERP system.

### Your Mission

Your focus is on backend services and new page creation. You will work in parallel with other agents who are handling the spreadsheet view and UX polish.

### Key Documents

1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Chaos Testing Report:** `docs/testing/CHAOS_TESTING_REPORT.md`

**You MUST read these documents before starting.**

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
- `client/src/pages/OrderCreatorPage.tsx`
- `server/routers/search.ts` (new)
- `server/routers/todos.ts`
- `server/routers/rbac-*.test.ts`

**DO NOT modify any other files.**

---

## 2. Your Tasks (Wave 1)

### Task 1: Implement Global Search (CHAOS-005, 8h)

**Goal:** Create the global search functionality.

**Requirements:**

1. Create `client/src/pages/SearchResultsPage.tsx`
2. Create `server/routers/search.ts` with a `globalSearch` procedure
3. The search should query clients, orders, inventory, and products
4. Display results grouped by category

**Verification:**

- [ ] Searching for a client name returns the client
- [ ] Searching for an order ID returns the order
- [ ] Search results are displayed on the new page

### Task 2: Implement Todo Lists Page (CHAOS-009, 8h)

**Goal:** Create the missing Todo Lists page.

**Requirements:**

1. Create `client/src/pages/TodoListsPage.tsx`
2. The page should display a list of todo items from `server/routers/todos.ts`
3. Implement functionality to create, update, and delete todos

**Verification:**

- [ ] Todos can be created, updated, and deleted
- [ ] The page is accessible from the sidebar

### Task 3: Remove Debug Dashboard (CHAOS-008, 1h)

**Goal:** Remove the debug dashboard from the production build.

**Requirements:**

1. Locate the debug dashboard component (likely in `client/src/pages/Orders.tsx`)
2. Wrap it in a conditional that only renders it in development mode (`process.env.NODE_ENV === 'development'`)

**Verification:**

- [ ] The debug dashboard is not visible on the live site
- [ ] The debug dashboard is visible in local development

---

## 3. Completion Protocol

1. **Run Checks:** Before creating a PR, run these commands:
   ```bash
   pnpm check
   pnpm test
   ```
2. **Create Pull Request:**
   - Title: `feat(core): implement search, todos, and remove debug dashboard`
   - Body: Link to this prompt and list completed tasks
3. **Notify Orchestrator:** Inform the orchestrator that your PR is ready for review.

---

## 4. Important Rules

- **Stick to your scope.** Do not work on tasks outside this prompt.
- **Use Gemini API for all code generation.**
- **Communicate early if you are blocked.**
- **Follow the provided file ownership rules strictly.**

Good luck! Your success depends on your ability to work independently within these constraints. Good luck!
