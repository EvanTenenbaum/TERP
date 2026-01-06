# Agent 6A: QA Backlog Cleanup & Verification

**Estimated Time**: 8-12 hours  
**Priority**: HIGH - Fixes documentation drift  
**Dependencies**: None (can start immediately)

---

## Mission

Verify and close out incorrectly documented QA tasks, fix any navigation issues.

---

## Context

Recent audit discovered that QA-001 through QA-004 (marked as "404 errors") are **actually implemented**. The routes and pages exist in the codebase. This agent will verify this, update documentation, and fix any real navigation issues.

**IMPORTANT**: Routes already verified to exist:
- `/vendors` → VendorsPage.tsx ✅
- `/purchase-orders` → PurchaseOrdersPage.tsx ✅
- `/todo` and `/todos` → TodoListsPage.tsx ✅
- `/accounting` → AccountingDashboard.tsx ✅
- `/analytics` → AnalyticsPage.tsx ✅
- `/settings/cogs` → CogsSettingsPage.tsx ✅

---

## Prompt

```
You are working on the TERP cannabis ERP project. 

## Setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

## Your Mission: QA Backlog Cleanup

### Task 1: Verify "404" Modules Actually Exist (30 min)

Check these files exist in the codebase:

1. Todo Lists:
   - client/src/pages/TodoListsPage.tsx
   - client/src/pages/TodoListDetailPage.tsx  
   - server/routers/todoLists.ts
   - server/routers/todoTasks.ts

2. Accounting:
   - client/src/pages/accounting/ (directory with multiple files)
   - server/routers/accounting.ts

3. COGS Settings:
   - client/src/pages/CogsSettingsPage.tsx
   - server/routers/cogs.ts

4. Analytics:
   - client/src/pages/AnalyticsPage.tsx
   - server/routers/analytics.ts

For each, run: ls -la <path> and document what you find.

### Task 2: Update QA_TASKS_BACKLOG.md (30 min)

Edit docs/roadmaps/QA_TASKS_BACKLOG.md:

For QA-001, QA-002, QA-003, QA-004:
- Change **Status:** from "Not Started" to "Complete"
- Add note: "Verified: Routes and pages exist in codebase. If 404 in production, see QA-005 for data access investigation."

Keep QA-005 as "Not Started" - it's a real investigation task.

### Task 3: Verify Navigation Links (1-2h)

Check the sidebar navigation in:
- client/src/components/DashboardLayout.tsx (main sidebar)

Verify these routes work in client/src/App.tsx:
- /vendors → VendorsPage (line ~156)
- /purchase-orders → PurchaseOrdersPage (line ~158)
- /todo and /todos → TodoListsPage (lines ~175-177)

If any navigation links are broken or missing, fix them.

NOTE: The main dashboard is DashboardV3.tsx, NOT DashboardPage.tsx

### Task 4: Verify and Test (30 min)

1. Run: pnpm check (must pass with 0 errors)
2. Run: pnpm build (must complete successfully)
3. Review your changes: git diff

### Task 5: Create PR

git checkout -b fix/qa-backlog-cleanup
git add -A
git commit -m "fix(qa): update QA backlog status - modules verified to exist

- Mark QA-001 through QA-004 as complete (routes verified to exist)
- Keep QA-005 open for data access investigation
- All routes verified: /vendors, /purchase-orders, /todo, /accounting, /analytics"

git push origin fix/qa-backlog-cleanup
gh pr create --title "fix(qa): update QA backlog - modules verified to exist" --body "## Summary
- Verified QA-001-004 modules exist in codebase
- Updated QA_TASKS_BACKLOG.md to reflect reality

## Verification Results
- TodoListsPage.tsx: EXISTS
- AccountingDashboard.tsx: EXISTS  
- CogsSettingsPage.tsx: EXISTS
- AnalyticsPage.tsx: EXISTS
- All routes configured in App.tsx

## Changes
- docs/roadmaps/QA_TASKS_BACKLOG.md: Status updates

## Testing
- pnpm check: ✅ Pass
- pnpm build: ✅ Pass"

## Important Notes

- Do NOT modify any business logic
- Do NOT change how the modules work, only verify they exist
- Be conservative - if unsure, document and ask
- The goal is documentation accuracy, not feature changes
```

---

## Success Criteria

- [ ] QA-001 through QA-004 marked as Complete in QA_TASKS_BACKLOG.md
- [ ] All navigation links verified to work
- [ ] pnpm check passes
- [ ] pnpm build passes
- [ ] PR created with clear description

---

## Files Modified

| File | Change |
|------|--------|
| docs/roadmaps/QA_TASKS_BACKLOG.md | Update status of QA-001 through QA-004 |
| client/src/components/DashboardLayout.tsx | Fix navigation (only if needed) |
| client/src/App.tsx | Add missing routes (only if needed) |

---

## Merge Priority

**Merge FIRST** - This is documentation cleanup with minimal code changes, unlikely to conflict with other agents.
