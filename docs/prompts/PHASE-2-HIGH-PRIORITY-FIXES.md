# TERP Phase 2: High Priority Fixes (P1)

## Agent Onboarding

### Project Overview

You are working on **TERP**, a cannabis ERP (Enterprise Resource Planning) system. This is a continuation of Phase 1. You should already be familiar with the project structure and technology stack.

### Key Documentation

1. **Strategic Plan**: `docs/roadmaps/STRATEGIC_COMPLETION_PLAN.md`
2. **Master Roadmap**: `docs/roadmaps/MASTER_ROADMAP.md`
3. **Chaos Testing Report**: `docs/testing/CHAOS_TESTING_EXHAUSTIVE_REPORT.md`

---

## Phase 2 Objective

**Goal**: Fix all 6 P1 high priority bugs and 3 critical test infrastructure issues

**Timeline**: 2 weeks (39 hours estimated)

**Success Criteria**:
- [ ] All P1 issues resolved and verified
- [ ] No data loss scenarios
- [ ] Concurrent edit protection working
- [ ] Unit test pass rate > 95%
- [ ] TypeScript check passes (`pnpm check`)

---

## Task 1: CHAOS-006 - Implement Concurrent Edit Protection

### Problem Description

Two users can edit the same record simultaneously; the last save wins silently, causing data loss.

### Files to Investigate

- All edit forms (e.g., `ClientProfilePage.tsx`, `OrderEditor.tsx`)
- All backend update routers (e.g., `server/routers/clients.ts`)
- Database schema (`drizzle/schema.ts`)

### Recommended Approach: Optimistic Locking

1. **Database Schema**:
   - Add a `version` column (integer, default 1) to all critical tables (clients, orders, inventory, etc.).

2. **Backend (tRPC Routers)**:
   - When fetching a record for editing, include the `version` number.
   - In the `update` mutation:
     - Require the `version` number in the input.
     - In the `where` clause of the `UPDATE` statement, add `and: { eq(table.version, input.version) }`.
     - After the `UPDATE`, check the number of affected rows. If 0, it means the version was stale, so throw a `CONFLICT` error.
     - If successful, increment the `version` number in the `set` clause.

3. **Frontend (React)**:
   - Store the `version` number in the form state.
   - When the update mutation returns a `CONFLICT` error, show a dialog to the user:
     - "This record has been updated by another user. Please refresh to see the latest changes."
     - Provide a "Refresh" button that refetches the data.

### Expected Fix

```typescript
// Drizzle Schema
export const clients = mysqlTable("clients", {
  // ... other fields
  version: int("version").notNull().default(1),
});

// tRPC Router (update mutation)
const result = await db.update(clients).set({
  // ... updated fields
  version: input.version + 1,
}).where(and(
  eq(clients.id, input.id),
  eq(clients.version, input.version)
));

if (result.rowsAffected === 0) {
  throw new TRPCError({
    code: "CONFLICT",
    message: "The record has been updated by another user.",
  });
}

// React Frontend
try {
  await updateClient.mutateAsync(formData);
} catch (error) {
  if (error.data?.code === "CONFLICT") {
    showConflictDialog();
  }
}
```

---

## Task 2: CHAOS-005 & CHAOS-009 - Implement Missing Pages

### Problem Description

- Global Search (`/search?q=...`) returns 404
- Todo Lists (`/todo-lists`) returns 404

### Files to Create

- `client/src/pages/SearchResultsPage.tsx`
- `client/src/pages/TodoListsPage.tsx`
- `server/routers/search.ts`
- `server/routers/todoLists.ts`

### Expected Fix

1. **Create Backend Routers**:
   - `search.ts`: A router that takes a query and searches across multiple tables (clients, orders, inventory).
   - `todoLists.ts`: A basic CRUD router for todo lists and items.

2. **Create Frontend Pages**:
   - `SearchResultsPage.tsx`: A page that displays search results from the backend.
   - `TodoListsPage.tsx`: A basic UI for managing todo lists.

3. **Update Routing**:
   - Add the new pages to the main router (`client/src/App.tsx`).

---

## Task 3: CHAOS-007 & CHAOS-008 - UI/UX Fixes

### Problem Description

- No "unsaved changes" warning when navigating away from forms.
- Debug dashboard is visible in production on the Orders page.

### Expected Fix

1. **Unsaved Changes Warning**:
   - Use a library like `react-router-prompt` or implement a custom hook that uses `window.beforeunload`.
   - Track form dirty state and show a confirmation dialog on navigation.

2. **Remove Debug Dashboard**:
   - Wrap the debug component in a check for `process.env.NODE_ENV === 'development'`.

---

## Task 4: CHAOS-010 - Add Calendar Double-Booking Prevention

### Problem Description

Users can create overlapping events for the same attendee with no warning.

### Files to Investigate

- `server/routers/calendar.ts`
- `server/services/calendarService.ts`

### Expected Fix

- Before saving a new event, query for existing events that overlap with the new event for the same attendees.
- If an overlap is found, return a `CONFLICT` error to the frontend.
- The frontend should display a warning to the user.

---

## Task 5: QA-TEST-001 & QA-TEST-002 - Fix Test Infrastructure

### Problem Description

- RBAC test mocks return incorrect IDs.
- VIP appointment tests use hardcoded dates.

### Expected Fix

- **QA-TEST-001**: Review the RBAC test mocks and fix the ID generation.
- **QA-TEST-002**: Use a date mocking library (e.g., `date-fns-mock`) to make the tests deterministic.

---

## Completion Checklist

- [ ] Create feature branch: `git checkout -b fix/phase-2-high-priority-fixes`
- [ ] Implement concurrent edit protection (optimistic locking)
- [ ] Create Search Results and Todo Lists pages
- [ ] Add unsaved changes warning
- [ ] Remove debug dashboard from production
- [ ] Add calendar double-booking prevention
- [ ] Fix RBAC and VIP appointment tests
- [ ] Run `pnpm check` and `pnpm test`
- [ ] Create Pull Request and request review

---

**Good luck! Focus on data integrity and fixing these high-priority issues.**
