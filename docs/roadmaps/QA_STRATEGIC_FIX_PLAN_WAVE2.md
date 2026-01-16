# TERP QA Strategic Fix Plan - Wave 2

**Version:** 1.1
**Created:** 2026-01-11
**Source:** QA Sales Manager Role Testing - Baseline Execution (January 10-11, 2026)
**Status:** COMPLETE (P0-P1 fixed, P3 deferred)

---

## Executive Summary

| Metric | Count |
|--------|-------|
| Total Flows Tested | 17 |
| PASS | 6 |
| FAIL | 8 |
| BLOCKED | 3 |
| New Bugs Identified | 5 |
| Critical (P0) | 1 |
| High (P1) | 3 |
| Minor (P3) | 1 |

---

## Root Cause Analysis - Wave 2

### Systemic Root Causes Identified

| Root Cause ID | Description | Bugs Affected | Impact |
|---------------|-------------|---------------|--------|
| **RC-006** | Order Finalization Never Executes | BUG-093 | P0 - Revenue loss |
| **RC-007** | Missing FK Validation in Mutations | BUG-094 | P1 - Feature broken |
| **RC-008** | Dialog onOpenChange Handler Mismatch | BUG-095 | P1 - UI unresponsive |
| **RC-009** | Widget Error State Incomplete | BUG-096 | P1 - Dashboard unusable |

---

## Bug Registry (Wave 2)

### P0 - Critical (Revenue Blocking)

#### BUG-093: Sales Order finalization unreliable (auto-save failed / unclear persistence)
- **Area:** Sales → Orders → Create → Preview & Finalize
- **Root Cause:** RC-006
- **Systemic Issues:**
  1. `finalizeMutation` is defined but NEVER called in `confirmFinalize()`
  2. `createDraftMutation.onSuccess` resets form before finalization
  3. Auto-save creates duplicate drafts instead of updating
  4. No error recovery for auto-save failures
  5. Version locking missing from createDraftEnhanced
- **Location:** `/home/user/TERP/client/src/pages/OrderCreatorPage.tsx`
- **Impact:** Orders never transition from DRAFT to FINALIZED

### P1 - High (Major Functionality)

#### BUG-094: Live Shopping session creation fails with server/query error
- **Area:** Sales → Live Shopping → New Session
- **Root Cause:** RC-007
- **Systemic Issue:** No validation that clientId exists before DB insert
- **Location:** `/home/user/TERP/server/routers/liveShopping.ts` lines 28-57
- **Impact:** FK constraint violation crashes session creation

#### BUG-095: Batches "New Purchase" button inert
- **Area:** Inventory → Batches → New Purchase
- **Root Cause:** RC-008
- **Systemic Issue:** `onOpenChange` prop expects boolean, but `onClose` accepts none
- **Location:** `/home/user/TERP/client/src/components/inventory/PurchaseModal.tsx` line 260
- **Impact:** Dialog doesn't open/close reliably

#### BUG-096: AR/AP aging widgets still fail to load reliably
- **Area:** Finance → AR/AP Dashboard
- **Root Cause:** RC-009 (related to previous BUG-092)
- **Systemic Issue:** Previous fix added error states but underlying API may still fail
- **Impact:** Finance dashboard incomplete

### P3 - Minor

#### BUG-097: Error handling consistency
- **Area:** Multiple
- **Issue:** Server errors show as generic modals/loader stalls
- **Impact:** Poor user experience, hard to troubleshoot

---

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    FIX DEPENDENCY GRAPH - WAVE 2                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  LAYER 1: Critical Revenue Path (Must fix first)                       │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BUG-093 (Order finalization)  ─────►  P0 - Revenue blocking      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  LAYER 2: Feature Blockers (Independent, can parallel)                 │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BUG-094 (Live Shopping)      - Validate client before insert     │  │
│  │ BUG-095 (New Purchase)       - Fix Dialog handler                │  │
│  │ BUG-096 (AR/AP widgets)      - Investigate underlying cause      │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                              │                                          │
│                              ▼                                          │
│  LAYER 3: Polish (Can defer)                                           │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │ BUG-097 (Error handling)     - Normalize error messages          │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Strategic Fix Order

### Phase 1: Unblock Revenue (P0) - Immediate
**Goal:** Fix order finalization to ensure orders are properly persisted

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 1.1 | BUG-093 | Call finalizeMutation after createDraftMutation succeeds | 2h | None |
| 1.2 | BUG-093 | Fix onSuccess handler to not reset form prematurely | 1h | 1.1 |
| 1.3 | BUG-093 | Add proper error recovery for auto-save failures | 1h | None |

**Validation:** Create and finalize order, verify it persists and appears in order list

### Phase 2: Fix Feature Blockers (P1) - High Priority
**Goal:** Restore Live Shopping, Batches, and AR/AP functionality

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 2.1 | BUG-094 | Add client existence validation to createSession | 1h | None |
| 2.2 | BUG-095 | Fix PurchaseModal onOpenChange handler | 30m | None |
| 2.3 | BUG-096 | Investigate and fix AR/AP widget underlying issue | 2h | None |

**Validation:** Create live shopping session, open purchase modal, load AR/AP widgets

### Phase 3: Polish (P3) - Normal Priority
**Goal:** Improve error handling consistency

| Order | Bug ID | Task | Est. Effort | Dependencies |
|-------|--------|------|-------------|--------------|
| 3.1 | BUG-097 | Normalize error messages across modules | 2h | None |

---

## Files to Modify

### Phase 1 (Order Finalization)
- `client/src/pages/OrderCreatorPage.tsx` - Fix finalization flow and auto-save

### Phase 2 (Feature Blockers)
- `server/routers/liveShopping.ts` - Add client validation
- `client/src/components/inventory/PurchaseModal.tsx` - Fix onOpenChange handler
- `server/routers/accounting.ts` or `server/arApDb.ts` - Fix AR/AP queries

### Phase 3 (Polish)
- Various error handling across components

---

## Consolidated Effort Estimate

| Phase | Description | Est. Effort | Priority |
|-------|-------------|-------------|----------|
| Phase 1 | Unblock Revenue | 4h | P0 - Immediate |
| Phase 2 | Feature Blockers | 3.5h | P1 - High |
| Phase 3 | Polish | 2h | P3 - Normal |
| **Total** | | **9.5h** | |

---

## Persisting Permission Issues

The following were supposed to be fixed in Wave 1 but may need investigation:

| Issue | Expected Fix | Status |
|-------|-------------|--------|
| BLOCKED-001 (Samples) | Added samples:read to Sales Manager | Needs verification |
| BLOCKED-002 (Reports) | Added accounting:reports:view to Sales Manager | Needs verification |
| BLOCKED-003 (Pick & Pack) | By-design (warehouse-only) | Expected |

These may require RBAC permission sync (`pnpm seed:rbac`) or re-investigation.
