# QA Review: Non-Beta Backlog Execution Plan

**Review Date:** 2026-01-17
**Plan Reviewed:** `NON_BETA_BACKLOG_EXECUTION_PLAN.md`

---

## QA Summary

**Overall Assessment:** APPROVED WITH IMPROVEMENTS

The execution plan is well-structured and prioritizes correctly. QA identified several improvements to ensure successful execution.

---

## Findings

### Finding 1: Cron Pattern Verification

**Status:** VERIFIED CORRECT

**Evidence:**

- Existing cron files found: `priceAlertsCron.ts`, `sessionTimeoutCron.ts`, `notificationQueueCron.ts`
- Pattern: Export `startXxxCron()` function
- Registration: In `server/_core/index.ts` lines 478-494
- Cron library: `node-cron`

**Improvement:**
The proposed cron implementation matches the existing pattern. Add the import and start call to `server/_core/index.ts`.

---

### Finding 2: AdvancedFilters.tsx Location Verified

**Status:** VERIFIED

**Evidence:**
Only ONE file has the UNPAID issue:

```
client/src/components/inventory/AdvancedFilters.tsx:57:  const paymentStatuses = ["PAID", "PARTIAL", "UNPAID"];
```

**Note:** There's also `client/src/components/sales/AdvancedFilters.tsx` but it doesn't have the same issue.

---

### Finding 3: Settings/Profile Icon Investigation Needed

**Status:** REQUIRES INVESTIGATION

The plan assumes these icons exist but are unresponsive. Need to verify:

1. Where icons are rendered (likely `AppHeader.tsx` or `AppSidebar.tsx`)
2. Whether they have click handlers
3. What routes they should navigate to

**Recommendation:** Before fixing, investigate the actual state of these components.

---

### Finding 4: Dashboard Widget Fix Complexity

**Status:** HIGH RISK

The plan estimates 2-4 hours for QA-035 (Dashboard widgets no data). This may be related to QA-005 (systemic data access).

**Recommendation:**

- Time-box investigation to 1 hour
- If root cause is complex (auth/DB), document and defer
- Focus on what's fixable in this session

---

### Finding 5: Missing Dashboard Button Investigation

**Status:** MISSING DETAIL

The plan mentions fixing 404 buttons but doesn't specify:

1. Where dashboard buttons are defined
2. What routes they link to
3. Whether pages exist or need creation

**Recommendation:** Add investigation step before fixing.

---

## Improved Execution Order

Based on QA findings, the recommended execution order is:

```
Wave 1: Verified Quick Fixes (Execute Immediately)
├── Task 1: Fix UNPAID enum in AdvancedFilters.tsx (VERIFIED)
├── Task 2: Fix payment terms zero handling (VERIFIED)
├── Task 3: Add documentation to vipCreditService (VERIFIED)
└── Task 4: Create debt aging cron job (VERIFIED PATTERN)

Wave 2: Investigation + Fix
├── Task 5: Investigate Settings/Profile icons (INVESTIGATE FIRST)
├── Task 6: Investigate Dashboard buttons (INVESTIGATE FIRST)
└── Task 7: Fix what's feasible from investigation

Wave 3: Deferred
└── Dashboard widgets no data (defer - complex root cause likely)
```

---

## Technical Validations

### Payment Terms Fix Location

**Files to Check:**

- `server/services/vipDebtAgingService.ts` - Lines 215, 333

**Verification:**

```bash
grep -n "paymentTerms ||" server/services/vipDebtAgingService.ts
```

### Cron Registration Location

**File:** `server/_core/index.ts`
**Lines:** 40-42 (imports), 478-494 (start calls)

---

## Risk Assessment Update

| Task              | Original Risk | QA-Adjusted Risk | Notes                 |
| ----------------- | ------------- | ---------------- | --------------------- |
| Cron creation     | LOW           | LOW              | Pattern verified      |
| UNPAID fix        | LOW           | LOW              | Location verified     |
| Payment terms     | LOW           | LOW              | Simple change         |
| Documentation     | NONE          | NONE             | Comment only          |
| Settings icon     | UNKNOWN       | MEDIUM           | Needs investigation   |
| Profile icon      | UNKNOWN       | MEDIUM           | Needs investigation   |
| Dashboard widgets | MEDIUM        | HIGH             | Likely systemic issue |
| 404 buttons       | LOW           | MEDIUM           | Needs investigation   |

---

## Approval Status

**QA Review Status:** ✓ APPROVED WITH MODIFICATIONS

**Required Changes:**

1. Add investigation steps before UI fixes
2. Time-box complex investigations
3. Defer QA-035 (dashboard widgets) if root cause is systemic

**Ready for Execution:** YES (Wave 1 only without investigation)

---

## Execution Checklist

### Wave 1 (Ready Now)

- [ ] Fix UNPAID enum (15 min)
- [ ] Fix payment terms zero (15 min)
- [ ] Add vipCreditService documentation (10 min)
- [ ] Create debt aging cron (30 min)
- [ ] Register cron in index.ts (5 min)
- [ ] Test TypeScript compilation
- [ ] Commit Wave 1 changes

### Wave 2 (After Investigation)

- [ ] Investigate Settings/Profile icons
- [ ] Investigate Dashboard buttons
- [ ] Fix feasible items
- [ ] Commit Wave 2 changes

### Final

- [ ] Push all changes
- [ ] Update roadmap documentation
