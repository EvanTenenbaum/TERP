# Copy-Paste Prompts for All 10 Agents

**Instructions:** Copy each prompt below and paste into a new Manus session. Deploy all 10 simultaneously.

---

## Agent 1: Critical 404 Fixes

```
You are Agent-01 working on the TERP project.

TASKS:
- QA-001: Fix 404 Error - Todo Lists Module (P0, 2-4h)
- QA-002: Fix 404 Error - Accounting Module (P0, 2-4h)
- QA-003: Fix 404 Error - COGS Settings Module (P0, 2-4h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-critical-404s-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
For each task, check if router exists (server/routers/todoLists.ts, accounting.ts, cogsSettings.ts):
- If missing: Create router with basic CRUD operations
- If exists: Fix route registration in server/routers/_app.ts
- Test routes work (no 404)
- Verify UI can access routes

COMPLETE:
1. Test all routes return 200 (not 404)
2. Push to main branch
3. Verify deployment successful
4. Mark tasks [x] complete in roadmap
5. Archive session to docs/sessions/completed/
6. Remove from ACTIVE_SESSIONS.md

FILES: server/routers/todoLists.ts, accounting.ts, cogsSettings.ts, _app.ts
CONFLICT RISK: None (isolated routers)
```

---

## Agent 2: Dashboard 404 Fixes

```
You are Agent-02 working on the TERP project.

TASKS:
- QA-006: Fix Dashboard - Vendors Button 404 (P1, 2-4h)
- QA-007: Fix Dashboard - Purchase Orders Button 404 (P1, 2-4h)
- QA-008: Fix Dashboard - Returns Button 404 (P1, 2-4h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-dashboard-404s-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
For each dashboard button (Vendors, Purchase Orders, Returns):
- Locate button in src/components/Dashboard/*.tsx
- Fix routing (check onClick handlers and route paths)
- Verify routes exist in App.tsx or create them
- Test navigation works (no 404)

COMPLETE:
1. Test all dashboard buttons navigate correctly
2. Push to main branch
3. Verify deployment successful
4. Mark tasks [x] complete in roadmap
5. Archive session to docs/sessions/completed/
6. Remove from ACTIVE_SESSIONS.md

FILES: src/components/Dashboard/*.tsx, src/App.tsx
CONFLICT RISK: Low (same module, different buttons)
```

---

## Agent 3: Export Functionality

```
You are Agent-03 working on the TERP project.

TASKS:
- QA-010: Fix Inventory - Export CSV Button (P1, 2-4h)
- QA-011: Fix Orders - Export CSV Button (P1, 2-4h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-export-fixes-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
For Inventory and Orders export:
- Create CSV export endpoint in server/routers/inventory.ts and orders.ts
- Add export button handler in UI (src/pages/Inventory/*.tsx, Orders/*.tsx)
- Implement CSV generation (use existing patterns from codebase)
- Test export downloads CSV file correctly

COMPLETE:
1. Test both export buttons download valid CSV files
2. Push to main branch
3. Verify deployment successful
4. Mark tasks [x] complete in roadmap
5. Archive session to docs/sessions/completed/
6. Remove from ACTIVE_SESSIONS.md

FILES: server/routers/inventory.ts, orders.ts; src/pages/Inventory/*.tsx, Orders/*.tsx
CONFLICT RISK: None (different modules)
```

---

## Agent 4: Settings & Forms

```
You are Agent-04 working on the TERP project.

TASKS:
- QA-017: Fix Clients - Save Button (Customize Metrics) (P1, 2-4h)
- QA-018: Fix Credit Settings - Save Changes Button (P1, 2-4h)
- QA-019: Fix Credit Settings - Reset to Defaults Button (P2, 1-2h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-settings-forms-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
- QA-017: Fix save functionality in src/pages/Clients/*.tsx for metrics customization
- QA-018: Implement save changes in src/pages/Settings/Credit*.tsx
- QA-019: Implement reset to defaults in same Credit Settings file
- Ensure proper form validation and error handling
- Test all buttons work correctly

COMPLETE:
1. Test all save/reset buttons function correctly
2. Push to main branch
3. Verify deployment successful
4. Mark tasks [x] complete in roadmap
5. Archive session to docs/sessions/completed/
6. Remove from ACTIVE_SESSIONS.md

FILES: src/pages/Clients/*.tsx, src/pages/Settings/Credit*.tsx
CONFLICT RISK: Low (QA-018 and QA-019 same file but different functions)
```

---

## Agent 5: Calendar & Events

```
You are Agent-05 working on the TERP project.

TASKS:
- QA-020: Test and Fix Calendar - Create Event Form (P2, 2-4h)
- QA-046: Add Click-to-Create Event on Calendar (P2, 4-8h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-calendar-events-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
- QA-020: Test event creation form in src/pages/Calendar/*.tsx, fix any bugs
- QA-046: Add click-to-create functionality (click on calendar date to create event)
- Ensure form validation works
- Test event creation and display

COMPLETE:
1. Test event creation form works correctly
2. Test click-to-create functionality
3. Push to main branch
4. Verify deployment successful
5. Mark tasks [x] complete in roadmap
6. Archive session to docs/sessions/completed/
7. Remove from ACTIVE_SESSIONS.md

FILES: src/pages/Calendar/*.tsx
CONFLICT RISK: Medium (same module, coordinate changes carefully)
```

---

## Agent 6: Database & Performance

```
You are Agent-06 working on the TERP project.

TASKS:
- ST-005: Add Missing Database Indexes (P1, 4-6h)
- ST-015: Benchmark Critical Paths (P1, 2-3h)
- ST-017: Implement Batch Status Transition Logic (P0, 4-6h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-db-performance-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
- ST-005: Audit drizzle/schema.ts for missing indexes on foreign keys, add indexes
- ST-015: Create docs/performance-baseline.md with performance measurements
- ST-017: Add status transition validation in server/routers/batches.ts
- Test all changes thoroughly

COMPLETE:
1. Test database queries are faster with indexes
2. Test batch status transitions validate correctly
3. Push to main branch
4. Verify deployment successful
5. Mark tasks [x] complete in roadmap
6. Archive session to docs/sessions/completed/
7. Remove from ACTIVE_SESSIONS.md

FILES: drizzle/schema.ts, server/routers/batches.ts, docs/performance-baseline.md
CONFLICT RISK: None (different files/modules)
```

---

## Agent 7: Testing Infrastructure

```
You are Agent-07 working on the TERP project.

TASKS:
- ST-016: Add Smoke Test Script (P0, 2-4h)
- ST-010: Add Integration Tests (P1, partial - focus on critical paths)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-testing-infra-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
- ST-016: Create scripts/smoke-test.sh with automated security and quality checks
- ST-010: Create tests/integration/ directory and write 10-20 critical integration tests
- Focus on most important user flows (authentication, CRUD operations)
- Ensure all tests pass

COMPLETE:
1. Test smoke test script runs successfully
2. Test all integration tests pass
3. Push to main branch
4. Verify deployment successful
5. Mark tasks [x] complete in roadmap
6. Archive session to docs/sessions/completed/
7. Remove from ACTIVE_SESSIONS.md

FILES: scripts/smoke-test.sh, tests/integration/*.test.ts (new files)
CONFLICT RISK: None (new files only)
```

---

## Agent 8: Monitoring & Observability

```
You are Agent-08 working on the TERP project.

TASKS:
- ST-008: Implement Error Tracking (Sentry) (P1, 1-2 days)
- ST-009: Implement API Monitoring (P1, 2-3 days)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-monitoring-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
- ST-008: Set up Sentry integration (create sentry.*.config.ts, add to components)
- ST-009: Set up API monitoring (Datadog or New Relic, add to tRPC procedures)
- Configure error tracking and alerting
- Test monitoring captures errors correctly

COMPLETE:
1. Test Sentry captures errors
2. Test API monitoring tracks requests
3. Push to main branch
4. Verify deployment successful
5. Mark tasks [x] complete in roadmap
6. Archive session to docs/sessions/completed/
7. Remove from ACTIVE_SESSIONS.md

FILES: sentry.*.config.ts, server/routers/*.ts (add monitoring), src/components/*.tsx
CONFLICT RISK: None (new integrations)
```

---

## Agent 9: Code Quality

```
You are Agent-09 working on the TERP project.

TASKS:
- RF-003: Systematically Fix `any` Types (P1, 8-12h)
- RF-006: Remove Unused Dependencies (P2, 2-4h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-code-quality-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
- RF-003: Find all `any` types in TypeScript files, replace with proper types
- RF-006: Audit package.json, remove unused dependencies
- Run type checker to verify no errors
- Test application still works correctly

COMPLETE:
1. Test TypeScript compiles without errors
2. Test application runs correctly after dependency removal
3. Push to main branch
4. Verify deployment successful
5. Mark tasks [x] complete in roadmap
6. Archive session to docs/sessions/completed/
7. Remove from ACTIVE_SESSIONS.md

FILES: Multiple .ts/.tsx files, package.json
CONFLICT RISK: Medium (touches many files - coordinate carefully, commit frequently)
```

---

## Agent 10: Performance Optimization

```
You are Agent-10 working on the TERP project.

TASKS:
- RF-002: Implement Dashboard Pagination (P1, 4-6h)
- RF-004: Add React.memo to Components (P2, 4-6h)

SETUP:
1. Clone: gh repo clone EvanTenenbaum/TERP && cd TERP
2. Read: docs/DEVELOPMENT_PROTOCOLS.md and docs/CLAUDE_WORKFLOW.md
3. Generate session ID: Session-20251114-performance-$(openssl rand -hex 3)
4. Register session in docs/ACTIVE_SESSIONS.md
5. Create session file in docs/sessions/active/
6. Mark tasks [~] in docs/roadmaps/MASTER_ROADMAP.md
7. Push registration to GitHub immediately

WORK:
- RF-002: Add pagination to dashboard lists (src/pages/Dashboard/*.tsx, update routers)
- RF-004: Identify frequently re-rendering components, wrap with React.memo
- Test pagination works correctly
- Verify React.memo improves performance (use React DevTools)

COMPLETE:
1. Test dashboard pagination works
2. Test components don't re-render unnecessarily
3. Push to main branch
4. Verify deployment successful
5. Mark tasks [x] complete in roadmap
6. Archive session to docs/sessions/completed/
7. Remove from ACTIVE_SESSIONS.md

FILES: src/pages/Dashboard/*.tsx, src/components/*.tsx, server/routers/dashboard.ts
CONFLICT RISK: Low (different optimization areas)
```

---

## 🚀 Deployment Instructions

1. **Open 10 new Manus sessions** (one for each agent)
2. **Copy the prompt for each agent** from above
3. **Paste into the corresponding Manus session**
4. **Start all agents simultaneously**

## 📊 Monitor Progress

- **Active Sessions:** https://github.com/EvanTenenbaum/TERP/blob/main/docs/ACTIVE_SESSIONS.md
- **Roadmap:** https://github.com/EvanTenenbaum/TERP/blob/main/docs/roadmaps/MASTER_ROADMAP.md

---

**Total Agents:** 10  
**Total Tasks:** 25  
**Estimated Completion:** 1-2 days  
**Created:** 2025-11-14
