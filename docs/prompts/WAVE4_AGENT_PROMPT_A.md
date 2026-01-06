# Agent Prompt: Wave 4A - Critical Routes (Todo & COGS)

## 1. Onboarding

**Welcome!** You are an AI agent tasked with fixing critical 404 errors that block Tier 1 customer testing.

### Your Mission
Fix the 404 errors for Todo Lists and COGS Settings modules. These are P0 critical bugs that must be resolved before any customer demo.

### Key Documents to Read First
1. **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
2. **Strategic Plan:** `docs/roadmaps/STRATEGIC_PATH_TO_COMPLETION_20260106.md`
3. **QA Backlog:** `docs/roadmaps/QA_TASKS_BACKLOG.md`

### Repository Setup
```bash
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install
git checkout -b wave-4/critical-routes
```

### File Ownership
**You ONLY have permission to modify these files:**
- `client/src/pages/TodoPage.tsx` (new)
- `client/src/pages/CogsSettingsPage.tsx` (new)
- `client/src/App.tsx` (routing additions only)
- `server/routers/todo.ts` (if needed)
- `server/routers/cogsSettings.ts` (if needed)

---

## 2. Your Tasks (8-16h total)

| Task ID | Title | Est. Hours |
|---------|-------|------------|
| QA-001 | Fix 404 Error - Todo Lists Module | 4-8h |
| QA-003 | Fix 404 Error - COGS Settings Module | 4-8h |

### Task 1: QA-001 - Fix Todo Lists 404

**Problem:** The Todo Lists module returns a 404 error when accessed at `/todo`.

**Requirements:**
1. **Create Route:**
   - Add `/todo` route in `client/src/App.tsx`
   - Ensure proper authentication wrapper

2. **Implement TodoPage.tsx:**
   - Create a functional todo list interface
   - Support basic CRUD operations:
     - View existing todos
     - Create new todos
     - Mark todos as complete
     - Delete todos
   - Use existing UI components from `client/src/components/ui/`

3. **Backend Integration:**
   - Check if `server/routers/todo.ts` exists
   - If not, create a basic tRPC router for todo operations
   - Connect frontend to backend via tRPC

**Implementation Guidance:**
- Look at existing pages like `OrdersPage.tsx` for patterns
- Use the existing `useQuery` and `useMutation` hooks from tRPC
- Follow the existing styling conventions (Tailwind CSS)

### Task 2: QA-003 - Fix COGS Settings 404

**Problem:** The COGS Settings module returns a 404 error when accessed at `/cogs-settings`.

**Requirements:**
1. **Create Route:**
   - Add `/cogs-settings` route in `client/src/App.tsx`
   - Ensure proper authentication and admin-only access

2. **Implement CogsSettingsPage.tsx:**
   - Create a settings interface for Cost of Goods Sold configuration
   - Allow viewing and editing COGS parameters
   - Include form validation

3. **Backend Integration:**
   - Check if COGS-related routers exist
   - Connect to existing settings infrastructure
   - Ensure changes persist to database

**Implementation Guidance:**
- COGS settings should include:
  - Default markup percentages
  - Cost calculation methods
  - Category-specific overrides
- Use existing form components from the codebase

---

## 3. Testing Requirements

Before submitting your PR:

1. **Manual Testing:**
   - Navigate to `/todo` - should load without 404
   - Navigate to `/cogs-settings` - should load without 404
   - Test all CRUD operations on todo list
   - Test saving COGS settings

2. **Automated Testing:**
   ```bash
   pnpm check  # Zero TypeScript errors
   pnpm test   # All tests pass
   ```

3. **Visual Verification:**
   - UI matches existing application style
   - Responsive on desktop and tablet
   - Loading states work correctly

---

## 4. Completion Protocol

1. **Implement all tasks** on your `wave-4/critical-routes` branch.

2. **Run verification:**
   ```bash
   pnpm check
   pnpm test
   ```

3. **Create a Pull Request** to `main` with:
   - Clear title: `fix(routes): implement Todo and COGS Settings pages [Wave 4A]`
   - Description listing all changes
   - Screenshots of working pages

4. **Generate a Reviewer Prompt:**

```markdown
# Reviewer Prompt: QA & Merge Wave 4A - Critical Routes

**Branch:** `wave-4/critical-routes`

**Tasks to Verify:**
- [ ] **QA-001:** Navigate to `/todo` - no 404, page loads
- [ ] **QA-001:** Create, view, complete, and delete todos
- [ ] **QA-003:** Navigate to `/cogs-settings` - no 404, page loads
- [ ] **QA-003:** View and save COGS settings

**Instructions:**
1. Checkout the branch
2. Run `pnpm check` and `pnpm test`
3. Manually test both routes
4. If approved, merge to main
```

---

## 5. Coordination Notes

**Parallel Agents:**
- Agent 4B is working on Accounting and Analytics modules
- Agent 4C is fixing data access issues
- No file conflicts expected - you have exclusive ownership of your files

**Communication:**
- If you encounter blocking issues, document them in your PR
- Check for updates in `docs/roadmaps/` before starting

---

Good luck! Your work is critical for enabling customer demos.
