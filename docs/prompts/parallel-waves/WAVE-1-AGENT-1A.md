# Wave 1 - Agent 1A: Modal & Form Bugs

**Wave:** 1 (Critical Bug Fixes)  
**Branch:** `wave-1/agent-1a-modal-form-bugs`  
**Duration:** 14 hours  
**Priority:** P0 Critical

---

## Agent Context

You are an AI engineering agent working on the TERP ERP system. You are part of Wave 1 of a parallel execution plan. Your work must be completed on your designated branch and will be integrated after QA review.

### Before ANY Work

1. Clone the repository: `gh repo clone EvanTenenbaum/TERP`
2. Create your branch: `git checkout -b wave-1/agent-1a-modal-form-bugs`
3. Install dependencies: `pnpm install`
4. Verify build: `pnpm check`
5. Register your session in `docs/sessions/active.md`

### Critical Rules (NEVER BREAK)

1. **ONLY modify files in your ownership list** - No exceptions
2. **No `any` types** - Use proper TypeScript types
3. **No `console.log`** - Use structured logging if needed
4. **All tests must pass** before committing
5. **Conventional commits** - Use proper commit format
6. **Redhat QA** - Review your own work before marking complete

---

## Your Tasks

### BUG-040: Task/Client Edit Modal Shows Empty Fields (4h)

**Problem:** When editing a task or client, the modal opens with empty fields instead of pre-populated data.

**Root Cause Investigation:**
1. Check if data is being passed to modal component
2. Check if useEffect is properly setting form state
3. Check if the query is fetching the correct record

**Files to Modify:**
- `client/src/components/modals/TaskEditModal.tsx`
- `client/src/components/modals/ClientEditModal.tsx`

**Acceptance Criteria:**
- [ ] Task edit modal shows existing task data
- [ ] Client edit modal shows existing client data
- [ ] Form fields are editable after population
- [ ] Save works correctly with pre-populated data

---

### BUG-041: Fulfillment Batch Status Update Fails (4h)

**Problem:** Updating the status of a fulfillment batch fails silently or shows an error.

**Root Cause Investigation:**
1. Check the mutation in `useFulfillment` hook
2. Check the server router for status update endpoint
3. Check for validation or permission issues

**Files to Modify:**
- `client/src/pages/FulfillmentPage.tsx`
- `client/src/hooks/useFulfillment.ts`
- `server/routers/fulfillment.ts`

**Acceptance Criteria:**
- [ ] Batch status can be updated successfully
- [ ] UI reflects the new status immediately
- [ ] Error messages are shown if update fails
- [ ] Optimistic update with rollback on failure

---

### BUG-042: Misleading CTA Redirects (6h)

**Problem:** "Add Need" and "New Quote" buttons redirect to wrong pages or don't work.

**Root Cause Investigation:**
1. Check button onClick handlers
2. Check router navigation paths
3. Verify the target pages exist and are accessible

**Files to Modify:**
- `client/src/pages/NeedsManagementPage.tsx`
- `client/src/pages/QuotesPage.tsx`
- `client/src/components/ui/QuickActions.tsx`

**Acceptance Criteria:**
- [ ] "Add Need" navigates to need creation form
- [ ] "New Quote" navigates to quote creation form
- [ ] All CTAs have correct navigation paths
- [ ] No dead-end or broken links

---

## File Ownership (Exclusive Write Access)

You CAN modify:
- `client/src/components/modals/TaskEditModal.tsx`
- `client/src/components/modals/ClientEditModal.tsx`
- `client/src/pages/FulfillmentPage.tsx`
- `client/src/hooks/useFulfillment.ts`
- `server/routers/fulfillment.ts`
- `client/src/pages/NeedsManagementPage.tsx`
- `client/src/pages/QuotesPage.tsx`
- `client/src/components/ui/QuickActions.tsx`

You CANNOT modify:
- Any files owned by other Wave 1 agents
- Schema files (`drizzle/`)
- Core layout files (`AppShell.tsx`, `Sidebar.tsx`)

---

## Redhat QA Gates

### Gate 1: After BUG-040
- [ ] Task edit modal populated correctly
- [ ] Client edit modal populated correctly
- [ ] No TypeScript errors introduced
- [ ] Manual test passes

### Gate 2: After BUG-041
- [ ] Fulfillment status update works
- [ ] UI updates correctly
- [ ] Error handling works
- [ ] No regressions in fulfillment page

### Gate 3: After BUG-042
- [ ] All CTAs navigate correctly
- [ ] No broken links
- [ ] All tests pass

### Final Gate: Before Merge
- [ ] `pnpm check` passes
- [ ] `pnpm test` passes
- [ ] All acceptance criteria met
- [ ] No files outside ownership modified
- [ ] Conventional commits used

---

## Commit Format

```
fix(modals): populate task edit modal with existing data

- Add useEffect to set form state from task data
- Fix data fetching in TaskEditModal
- Resolves BUG-040
```

---

## When Complete

1. Push your branch: `git push origin wave-1/agent-1a-modal-form-bugs`
2. Update session status in `docs/sessions/active.md`
3. Create summary of changes in `docs/sessions/wave-1-agent-1a-summary.md`
4. Notify integration agent that your work is ready for review

