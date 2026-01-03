# TERP Strategic Execution Plan v2.0

**Version:** 2.0  
**Created:** January 3, 2026  
**Status:** READY FOR EXECUTION  
**Total Remaining Tasks:** 71  
**Total Estimated Hours:** ~380h  
**Estimated Duration:** 3-4 weeks with parallel execution

---

## Executive Summary

This plan organizes all 71 remaining TERP tasks into 6 strategic waves optimized for parallel AI agent execution. Each wave groups non-conflicting tasks by domain, allowing multiple agents to work simultaneously without merge conflicts.

---

## Task Inventory Summary

| Category | Count | Hours | Priority |
|----------|-------|-------|----------|
| **BUG** | 8 | 45h | P0-P1 |
| **UX** | 15 | 80h | P1-P2 |
| **DATA** | 5 | 40h | P1-P2 |
| **CODE** | 3 | 48h | P1-P2 |
| **QA** | 12 | 60h | P1-P2 |
| **TEST** | 2 | 28h | P2 |
| **INFRA** | 2 | 20h | P1-P2 |
| **DOCS** | 2 | 14h | P2-P3 |
| **FEATURE** | 22 | 45h | P2-P3 |
| **Total** | **71** | **~380h** | |

---

## Wave Structure Overview

| Wave | Focus | Agents | Hours | Duration | Dependency |
|------|-------|--------|-------|----------|------------|
| **0** | Prerequisites & Setup | 1 | 8h | Day 1 | None |
| **1** | Critical Bugs & Data | 4 | 70h | Days 2-4 | Wave 0 |
| **2** | UX Foundation | 4 | 80h | Days 5-8 | Wave 1 |
| **3** | Features & Code Quality | 4 | 100h | Days 9-13 | Wave 2 |
| **4** | Polish & Testing | 3 | 70h | Days 14-17 | Wave 3 |
| **5** | Integration & Final QA | 1 | 32h | Days 18-20 | Wave 4 |

---

## Wave 0: Prerequisites (Sequential)

**Duration:** 1 day  
**Executor:** Primary Agent (You)

| Task | Description | Hours |
|------|-------------|-------|
| Database Sync | Verify DigitalOcean DB schema is current | 2h |
| Branch Strategy | Create wave branches, set up CI | 2h |
| Baseline Tests | Run Playwright suite, document failures | 2h |
| Agent Prompts | Finalize agent prompts for Wave 1 | 2h |

**Exit Criteria:**
- Database schema verified
- All wave branches created
- Baseline test results documented
- Agent prompts ready

---

## Wave 1: Critical Bugs & Data Foundation (4 Agents)

**Duration:** 3 days  
**Branch Prefix:** `wave-1/`

### Agent 1A: Modal & Form Bugs
**Branch:** `wave-1/modal-form-bugs`  
**Hours:** 18h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| BUG-040 | Task/Client edit modal empty fields | 4h | P0 |
| BUG-041 | Fulfillment batch status update fails | 4h | P0 |
| BUG-043 | Form validation missing - silent failures | 8h | P0 |
| BUG-047 | Make KPI Cards Actionable When Clicked | 6h | P1 |

**File Ownership:**
- `client/src/components/modals/*`
- `client/src/components/forms/*`
- `client/src/components/dashboard/*`

---

### Agent 1B: Navigation & CTA Bugs
**Branch:** `wave-1/nav-cta-bugs`  
**Hours:** 16h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| BUG-042 | Misleading CTA redirects | 6h | P0 |
| BUG-044 | Developer messages in production | 4h | P0 |
| BUG-045 | New Invoice button non-functional | 3h | P0 |
| BUG-046 | Data fetch failures block progress | 6h | P0 |

**File Ownership:**
- `client/src/pages/*`
- `client/src/components/ui/Button.tsx`
- `client/src/hooks/useQuery*`

---

### Agent 1C: Data Seeding & Integrity
**Branch:** `wave-1/data-seeding`  
**Hours:** 20h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| DATA-001 | Production Data Seeding with Coherence | 8h | P1 |
| DATA-005 | Implement Optimistic Locking | 6h | P1 |
| DATA-009 | Seed Inventory Movements | 4h | P2 |
| DATA-004 | Fix N+1 Queries in Order Creation | 4h | P2 |

**File Ownership:**
- `server/db/seed/*`
- `server/routers/orders.ts`
- `server/db/schema.ts`

---

### Agent 1D: TypeScript & Code Quality
**Branch:** `wave-1/typescript-cleanup`  
**Hours:** 16h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| CODE-001 | TypeScript Error Cleanup (240 errors) | 16h | P1 |

**File Ownership:**
- `server/routers/alerts.ts`
- `server/routers/inventoryShrinkage.ts`
- `server/routers/vendorReminders.ts`
- All files with TypeScript errors

---

## Wave 2: UX Foundation (4 Agents)

**Duration:** 4 days  
**Branch Prefix:** `wave-2/`

### Agent 2A: Navigation & Sidebar
**Branch:** `wave-2/navigation-sidebar`  
**Hours:** 24h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| UX-015 | Group Sidebar Menu Items | 8h | P1 |
| UX-050 | Add Sidebar Access to Spreadsheet View | 4h | P1 |
| QA-041 | Merge Inbox and To-Do List Modules | 12h | P2 |

**File Ownership:**
- `client/src/components/layout/Sidebar.tsx`
- `client/src/components/layout/AppShell.tsx`
- `client/src/pages/TodosPage.tsx`
- `client/src/pages/InboxPage.tsx`

---

### Agent 2B: Tables & Filtering
**Branch:** `wave-2/tables-filtering`  
**Hours:** 20h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| UX-049 | Improve Filter and Sorting UI/Functionality | 8h | P1 |
| UX-019 | Implement Filter Persistence | 6h | P2 |
| UX-011 | Add Skeleton Loaders | 6h | P2 |

**File Ownership:**
- `client/src/components/ui/data-table.tsx`
- `client/src/components/ui/skeleton.tsx`
- `client/src/hooks/useFilters.ts`

---

### Agent 2C: Settings & Configuration
**Branch:** `wave-2/settings-config`  
**Hours:** 18h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| UX-016 | Convert Settings to Vertical Navigation | 6h | P2 |
| UX-023 | In-Context Module Settings Access | 6h | P2 |
| UX-021 | Customizable Quick Actions Dropdown | 6h | P2 |

**File Ownership:**
- `client/src/pages/SettingsPage.tsx`
- `client/src/components/settings/*`
- `client/src/components/ui/QuickActions.tsx`

---

### Agent 2D: User Experience Polish
**Branch:** `wave-2/ux-polish`  
**Hours:** 18h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| UX-017 | Implement Password Reset Flow (VIP Portal) | 8h | P2 |
| UX-018 | Add Drag-and-Drop to Todo Lists | 6h | P2 |
| BUG-016 | Theme Toggle Not Implemented | 4h | P2 |

**File Ownership:**
- `client/src/pages/auth/*`
- `client/src/components/todos/*`
- `client/src/components/ui/ThemeToggle.tsx`

---

## Wave 3: Features & Code Quality (4 Agents)

**Duration:** 5 days  
**Branch Prefix:** `wave-3/`

### Agent 3A: Code Quality
**Branch:** `wave-3/code-quality`  
**Hours:** 32h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| CODE-002 | Console.log Statement Removal | 8h | P2 |
| CODE-003 | Any Type Elimination | 24h | P2 |

**File Ownership:**
- Entire codebase (non-conflicting with other agents)

---

### Agent 3B: Testing Infrastructure
**Branch:** `wave-3/testing`  
**Hours:** 28h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| TEST-002 | Unit Test Coverage Expansion | 16h | P2 |
| TEST-003 | API Integration Test Suite | 12h | P2 |

**File Ownership:**
- `tests/*`
- `tests-e2e/*`
- `vitest.config.ts`

---

### Agent 3C: Infrastructure
**Branch:** `wave-3/infrastructure`  
**Hours:** 20h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| INFRA-004 | Automated Backup Scripts | 8h | P1 |
| INFRA-005 | Monitoring & Alerting Setup | 12h | P2 |

**File Ownership:**
- `scripts/backup/*`
- `scripts/monitoring/*`
- Infrastructure configuration files

---

### Agent 3D: Mobile & Accessibility
**Branch:** `wave-3/mobile-a11y`  
**Hours:** 20h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| QA-050 | Implement Mobile Responsiveness Fixes | 12h | P1 |
| DATA-011 | Production-Grade Database Seeding | 8h | P2 |

**File Ownership:**
- `client/src/styles/*`
- `client/src/components/ui/responsive-*`
- `server/db/seed/*`

---

## Wave 4: Polish & Testing (3 Agents)

**Duration:** 4 days  
**Branch Prefix:** `wave-4/`

### Agent 4A: Documentation
**Branch:** `wave-4/documentation`  
**Hours:** 14h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| DOCS-002 | API Documentation (OpenAPI) | 8h | P2 |
| DOCS-003 | Developer Onboarding Guide | 6h | P3 |

**File Ownership:**
- `docs/*`
- `README.md`
- `CONTRIBUTING.md`

---

### Agent 4B: QA Verification
**Branch:** `wave-4/qa-verification`  
**Hours:** 24h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| QA-076 | Live Site Feature Verification | 8h | P1 |
| QA-077 | Navigation Sidebar Simplification Verification | 4h | P1 |
| QA-078-083 | Module-specific QA (6 tasks) | 12h | P2 |

**File Ownership:**
- `tests-e2e/mega/*`
- QA documentation

---

### Agent 4C: Remaining Features
**Branch:** `wave-4/remaining-features`  
**Hours:** 32h

| Task ID | Title | Hours | Priority |
|---------|-------|-------|----------|
| Remaining FEATURE tasks | Various feature completions | 32h | P2-P3 |

**File Ownership:**
- Feature-specific files (non-conflicting)

---

## Wave 5: Integration & Final QA (Sequential)

**Duration:** 3 days  
**Executor:** Primary Agent (You)

| Task | Description | Hours |
|------|-------------|-------|
| Branch Merging | Merge all wave branches to main | 4h |
| Conflict Resolution | Resolve any merge conflicts | 4h |
| Full Regression Test | Run complete Playwright suite | 8h |
| Production Deployment | Deploy to DigitalOcean | 4h |
| Smoke Testing | Verify all features on production | 8h |
| Documentation Update | Update roadmap to reflect completion | 4h |

**Exit Criteria:**
- All branches merged successfully
- All tests passing
- Production deployment verified
- Roadmap updated to 100% complete

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Merge Conflicts | Strict file ownership, daily integration |
| Agent Divergence | Detailed prompts, QA gates |
| Test Failures | Baseline tests, incremental verification |
| Scope Creep | Fixed task list, defer new requests |

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Tasks Completed | 71/71 (100%) |
| TypeScript Errors | 0 |
| Console.log Statements | <10 |
| Test Coverage | >60% on critical modules |
| Playwright Tests | 100% passing |
| Production Uptime | 99.9% |

---

## Appendix: Complete Task List by Wave

### Wave 1 Tasks (70h)
1. BUG-040: Task/Client edit modal empty fields (4h, P0)
2. BUG-041: Fulfillment batch status update fails (4h, P0)
3. BUG-042: Misleading CTA redirects (6h, P0)
4. BUG-043: Form validation missing (8h, P0)
5. BUG-044: Developer messages in production (4h, P0)
6. BUG-045: New Invoice button non-functional (3h, P0)
7. BUG-046: Data fetch failures block progress (6h, P0)
8. BUG-047: Make KPI Cards Actionable (6h, P1)
9. DATA-001: Production Data Seeding (8h, P1)
10. DATA-004: Fix N+1 Queries (4h, P2)
11. DATA-005: Optimistic Locking (6h, P1)
12. DATA-009: Seed Inventory Movements (4h, P2)
13. CODE-001: TypeScript Error Cleanup (16h, P1)

### Wave 2 Tasks (80h)
14. UX-011: Add Skeleton Loaders (6h, P2)
15. UX-015: Group Sidebar Menu Items (8h, P1)
16. UX-016: Convert Settings to Vertical Nav (6h, P2)
17. UX-017: Password Reset Flow (8h, P2)
18. UX-018: Drag-and-Drop Todo Lists (6h, P2)
19. UX-019: Filter Persistence (6h, P2)
20. UX-021: Customizable Quick Actions (6h, P2)
21. UX-023: In-Context Module Settings (6h, P2)
22. UX-049: Improve Filter/Sorting UI (8h, P1)
23. UX-050: Sidebar Spreadsheet Access (4h, P1)
24. QA-041: Merge Inbox and To-Do (12h, P2)
25. BUG-016: Theme Toggle (4h, P2)

### Wave 3 Tasks (100h)
26. CODE-002: Console.log Removal (8h, P2)
27. CODE-003: Any Type Elimination (24h, P2)
28. TEST-002: Unit Test Coverage (16h, P2)
29. TEST-003: API Integration Tests (12h, P2)
30. INFRA-004: Automated Backups (8h, P1)
31. INFRA-005: Monitoring & Alerting (12h, P2)
32. QA-050: Mobile Responsiveness Fixes (12h, P1)
33. DATA-011: Production-Grade Seeding (8h, P2)

### Wave 4 Tasks (70h)
34. DOCS-002: API Documentation (8h, P2)
35. DOCS-003: Developer Onboarding (6h, P3)
36. QA-076-083: QA Verification Tasks (24h, P1-P2)
37. Remaining FEATURE tasks (32h, P2-P3)

### Wave 5 Tasks (32h)
38. Integration & Final QA (32h, P0)

---

**Total: 71 tasks, ~380 hours, 20 working days**

