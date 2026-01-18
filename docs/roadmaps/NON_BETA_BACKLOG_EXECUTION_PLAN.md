# Non-Beta Backlog Execution Plan

**Created:** 2026-01-17
**Status:** Ready for QA Review
**Scope:** All backlog items EXCEPT Beta Reliability Program (REL-001 to REL-017)

---

## Executive Summary

**Total Backlog Items Identified:** 54 items across 3 backlogs
**Items Already Complete:** 7 items
**Items Requiring Work:** 47 items
**Focus for This Execution:** 12 high-priority items (realistic scope)

---

## Backlog Inventory

### Source 1: TypeScript Fix QA Report (My Recent Findings)

| ID         | Issue                                    | Priority | Status | Actionable?           |
| ---------- | ---------------------------------------- | -------- | ------ | --------------------- |
| HIGH-001   | No cron job for debt aging notifications | HIGH     | Open   | YES - Create cron     |
| MEDIUM-002 | PARTIAL invoice full amount assumption   | MEDIUM   | Open   | YES - Documentation   |
| MEDIUM-003 | Payment terms zero handling              | MEDIUM   | Open   | YES - Code fix        |
| MEDIUM-005 | UI AdvancedFilters.tsx stale UNPAID      | MEDIUM   | Open   | YES - Code fix        |
| MEDIUM-006 | Duplicate VIP tier routers               | MEDIUM   | Open   | NO - Refactor (defer) |

### Source 2: NEW_TASKS_BACKLOG.md

**Bugs (QA-028 to QA-040):** 13 items
| ID | Issue | Priority | Status |
|----|-------|----------|--------|
| QA-028 | Old sidebar navigation on mobile | P1 | Not Started |
| QA-029 | Inbox dropdown navigation | P2 | Not Started |
| QA-030 | In-app back buttons missing | P2 | Not Started |
| QA-031 | Settings icon unresponsive | P0 | Not Started |
| QA-032 | User profile icon unresponsive | P0 | Not Started |
| QA-033 | Custom layout blank dashboard | P1 | Not Started |
| QA-034 | Widget visibility disappearing | P1 | Not Started |
| QA-035 | Dashboard widgets no data | P0 | Not Started |
| QA-036 | Time period filters broken | P2 | Not Started |
| QA-037 | Comments submission broken | P1 | Not Started |
| QA-038 | @ tagging in comments | P2 | Not Started |
| QA-039 | User selection for shared lists | P1 | Not Started |
| QA-040 | List name field required indicator | P3 | Not Started |

**Features (QA-041 to QA-050):** 10 items (all P1-P3, defer to later sprint)

**Schema (ST-020 to ST-022):** 3 items - ALL COMPLETE ✓

**FEATURE-021:** Unified Spreadsheet View - P1, 40-56h (defer - large feature)

### Source 3: QA_TASKS_BACKLOG.md

| ID         | Issue                       | Priority | Status      |
| ---------- | --------------------------- | -------- | ----------- |
| QA-001-004 | 404 errors                  | P0       | ✅ Complete |
| QA-005     | Systemic data access issues | P0       | Not Started |
| QA-006     | Vendors button 404          | P1       | Not Started |
| QA-007     | Purchase Orders button 404  | P1       | Not Started |
| QA-008     | Returns button 404          | P1       | Not Started |
| QA-009     | Locations button 404        | P1       | Not Started |
| QA-010     | Inventory Export CSV        | P1       | Not Started |
| QA-011     | Orders Export CSV           | P1       | Not Started |
| QA-012     | Global Search               | P1       | Not Started |
| QA-013-022 | Various P2 bugs             | P2       | Not Started |
| QA-023-027 | Testing tasks               | P3       | Not Started |

---

## Prioritized Execution Plan

### Wave 1: Critical Issues (Execute Immediately)

These items have direct impact on production correctness or user experience.

| #   | Task                                               | Source    | Est. Time | Complexity |
| --- | -------------------------------------------------- | --------- | --------- | ---------- |
| 1   | HIGH-001: Create debt aging cron job               | QA Report | 30 min    | Low        |
| 2   | MEDIUM-005: Fix UNPAID enum in AdvancedFilters.tsx | QA Report | 15 min    | Low        |
| 3   | MEDIUM-003: Fix payment terms zero handling        | QA Report | 15 min    | Low        |
| 4   | MEDIUM-002: Document PARTIAL invoice behavior      | QA Report | 10 min    | Low        |

**Wave 1 Total: ~1.5 hours**

### Wave 2: P0 Navigation/UI Fixes

These P0 items directly block user workflows.

| #   | Task                                            | Source    | Est. Time | Complexity  |
| --- | ----------------------------------------------- | --------- | --------- | ----------- |
| 5   | QA-031: Fix Settings icon responsiveness        | NEW_TASKS | 30 min    | Low         |
| 6   | QA-032: Fix User profile icon responsiveness    | NEW_TASKS | 30 min    | Low         |
| 7   | QA-035: Dashboard widgets no data (investigate) | NEW_TASKS | 2-4 hours | Medium-High |

**Wave 2 Total: ~3-5 hours**

### Wave 3: P1 Quick Fixes (404 Buttons)

These items are button 404 errors that can likely be fixed by adding routes or disabling buttons.

| #   | Task                               | Source   | Est. Time | Complexity |
| --- | ---------------------------------- | -------- | --------- | ---------- |
| 8   | QA-006: Vendors button 404         | QA_TASKS | 30 min    | Low        |
| 9   | QA-007: Purchase Orders button 404 | QA_TASKS | 30 min    | Low        |
| 10  | QA-008: Returns button 404         | QA_TASKS | 30 min    | Low        |
| 11  | QA-009: Locations button 404       | QA_TASKS | 30 min    | Low        |

**Wave 3 Total: ~2 hours**

### Wave 4: Deferred (Document for Future Sprints)

| Task                                   | Reason for Deferral                                       |
| -------------------------------------- | --------------------------------------------------------- |
| MEDIUM-006: Duplicate VIP tier routers | Refactoring - no bug, just tech debt                      |
| QA-041 to QA-050: Feature requests     | New features - separate sprint                            |
| FEATURE-021: Spreadsheet View          | Large feature (40-56h) - separate sprint                  |
| QA-005: Systemic data access           | Requires deep investigation - may be environment-specific |
| QA-023 to QA-027: Testing tasks        | Lower priority - P3                                       |
| QA-013 to QA-022: P2 bugs              | Lower priority than P0/P1                                 |

---

## Detailed Task Specifications

### Task 1: HIGH-001 - Create Debt Aging Cron Job

**File to Create:** `server/cron/debtAgingCron.ts`

**Implementation:**

```typescript
import cron from "node-cron";
import { sendDebtAgingNotifications } from "../services/vipDebtAgingService";
import { logger } from "../_core/logger";

// Run daily at 9 AM (business hours)
cron.schedule("0 9 * * *", async () => {
  logger.info("Starting debt aging notification job");
  try {
    const result = await sendDebtAgingNotifications();
    logger.info({ result }, "Debt aging notifications completed");
  } catch (error) {
    logger.error({ error }, "Debt aging notification job failed");
  }
});

export {};
```

**Files to Modify:** `server/index.ts` - import the cron file

---

### Task 2: MEDIUM-005 - Fix UNPAID Enum in AdvancedFilters

**File:** `client/src/components/inventory/AdvancedFilters.tsx`
**Line:** ~57

**Current (BROKEN):**

```typescript
const paymentStatuses = ["PAID", "PARTIAL", "UNPAID"];
```

**Fixed:**

```typescript
const paymentStatuses = ["PAID", "PENDING", "OVERDUE", "PARTIAL"];
```

---

### Task 3: MEDIUM-003 - Payment Terms Zero Handling

**File:** `server/services/vipDebtAgingService.ts`
**Lines:** 215, 333

**Current:**

```typescript
const paymentTermsDays = row.paymentTerms || 30;
```

**Fixed (explicit null check):**

```typescript
// 0 means due immediately; null/undefined defaults to NET_30
const paymentTermsDays = row.paymentTerms ?? 30;
```

---

### Task 4: MEDIUM-002 - Document PARTIAL Invoice Behavior

**File:** `server/services/vipCreditService.ts`
**Line:** ~87

**Add Comment:**

```typescript
// BUSINESS DECISION: Credit usage includes FULL invoice amount for PARTIAL payments.
// This conservative approach protects against credit overextension while partial payments
// are pending reconciliation. The remaining balance after partial payment is NOT tracked
// separately - the full original invoice amount counts toward credit usage.
```

---

### Tasks 5-6: Settings/Profile Icon Fix

**Investigation Required:**

1. Check if icons have click handlers
2. Check if navigation routes exist
3. Add handlers or routes as needed

**Likely Files:**

- `client/src/components/layout/Header.tsx`
- `client/src/components/layout/TopNavigation.tsx`

---

### Task 7: Dashboard Widgets No Data

**Investigation Required:**

1. Check widget data fetching hooks
2. Verify tRPC queries return data
3. Check if this is seed data or API issue

**Likely Root Cause:** May be related to QA-005 systemic data access

---

### Tasks 8-11: 404 Button Fixes

**Strategy Options:**

1. Add missing route/page if feature exists
2. Disable/hide button if feature not implemented
3. Add "Coming Soon" placeholder page

---

## Success Criteria

### Wave 1 Success

- [ ] Debt aging cron job runs daily
- [ ] AdvancedFilters.tsx shows correct payment statuses
- [ ] Payment terms of 0 handled correctly (due immediately)
- [ ] vipCreditService has business logic documentation

### Wave 2 Success

- [ ] Settings icon navigates to settings
- [ ] User profile icon shows user menu/profile
- [ ] Dashboard widgets investigation complete

### Wave 3 Success

- [ ] No 404 errors from dashboard quick action buttons
- [ ] Buttons either work or are appropriately disabled

---

## Risks and Mitigations

| Risk                                 | Likelihood | Impact | Mitigation             |
| ------------------------------------ | ---------- | ------ | ---------------------- |
| Cron job fires unexpectedly          | LOW        | HIGH   | Use test mode first    |
| Widget no-data is complex root cause | MEDIUM     | MEDIUM | Time-box investigation |
| 404 fixes need new pages             | MEDIUM     | LOW    | Use placeholder pages  |

---

## Estimated Total Time

| Wave      | Time Estimate     | Items        |
| --------- | ----------------- | ------------ |
| Wave 1    | 1.5 hours         | 4 items      |
| Wave 2    | 3-5 hours         | 3 items      |
| Wave 3    | 2 hours           | 4 items      |
| **TOTAL** | **6.5-8.5 hours** | **11 items** |

---

## Execution Order

```
1. Wave 1 (Critical - Code Quality)
   ├── Task 1: Create debt aging cron
   ├── Task 2: Fix UNPAID enum
   ├── Task 3: Fix payment terms zero
   └── Task 4: Add documentation

2. Wave 2 (P0 - User Experience)
   ├── Task 5: Settings icon
   ├── Task 6: Profile icon
   └── Task 7: Dashboard widgets (investigate)

3. Wave 3 (P1 - Navigation)
   ├── Task 8: Vendors button
   ├── Task 9: PO button
   ├── Task 10: Returns button
   └── Task 11: Locations button

4. Commit & Push all changes
```

---

**Status:** Ready for QA Review
