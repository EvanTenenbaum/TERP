# E2E Test Fix Roadmap - January 22, 2026

## Executive Summary

This roadmap addresses 15 issues discovered during comprehensive E2E frontend testing. Analysis reveals:
- **7 route/404 issues** are caused by legacy URL paths (navigation already uses correct paths)
- **4 data display issues** require backend/frontend fixes
- **3 functionality issues** require component-level fixes
- **1 authentication issue** requires router investigation

## Root Cause Analysis

### Systemic Issue 1: Legacy Route Paths
The E2E tester used legacy paths (`/invoices`, `/ar-ap`, `/reports`, etc.) that don't exist in the current routing. The navigation config uses correct paths (`/accounting/invoices`, `/accounting`, `/analytics`, etc.). **Solution**: Add redirect routes for backward compatibility.

### Systemic Issue 2: Data Display Gaps
Orders, Inventory, and Vendors pages show "no data" despite seeded records. This is likely due to:
- MySQL boolean handling (isDraft stored as TINYINT)
- Vendor data not being populated in inventory items
- Query filter mismatches

### Systemic Issue 3: Event Handler Bug (C-01)
The "View Full Profile" button in ClientsWorkSurface may have event propagation issues causing the Archive dialog to trigger incorrectly.

---

## Strategic Execution Plan

### Wave 1: Route Redirects (7 issues) - PRIORITY: HIGH - COMPLETE
Add legacy route redirects for backward compatibility.

| Issue | Legacy Path | Correct Path | Status |
|-------|-------------|--------------|--------|
| C-03 | `/invoices` | `/accounting/invoices` | ✅ Complete |
| C-04 | `/client-needs` | `/needs` | ✅ Complete |
| C-07 | `/ar-ap` | `/accounting` | ✅ Complete |
| C-08 | `/reports` | `/analytics` | ✅ Complete |
| C-09 | `/pricing-rules` | `/pricing/rules` | ✅ Complete |
| C-10 | `/system-settings` | `/settings` | ✅ Complete |
| C-11 | `/feature-flags` | `/settings/feature-flags` | ✅ Complete |

### Wave 2: Data Display Issues (4 issues) - PRIORITY: HIGH - NEEDS INVESTIGATION
Fix data loading and display issues.

| Issue | Page | Problem | Root Cause | Status |
|-------|------|---------|------------|--------|
| C-02 | Orders | No orders displayed | isDraft boolean handling | ⏳ Needs DB investigation |
| C-05 | Inventory | No inventory displayed | Query/filter mismatch | ⏳ Needs DB investigation |
| C-06 | Vendors | No data | Derived from empty inventory | ⏳ Needs DB investigation |
| M-03 | Dashboard | Broken client links | Hardcoded `/clients/1` | ⏳ Needs DB investigation |

### Wave 3: Functionality Issues (3 issues) - PRIORITY: MEDIUM - PARTIAL
Fix component-level bugs.

| Issue | Component | Problem | Status |
|-------|-----------|---------|--------|
| C-01 | ClientsWorkSurface | View Profile triggers Archive | ✅ Complete |
| M-01 | CalendarPage | Database error | ⏳ Needs backend debugging |
| m-01 | GlobalSearch | Double search required | ⏳ Low priority |

### Wave 4: Authentication/Minor Issues (2 issues) - PRIORITY: LOW - COMPLETE
Fix authentication and minor UX issues.

| Issue | Page | Problem | Status |
|-------|------|---------|--------|
| M-02 | TimeClock | Auth error despite logged in | ✅ Complete (FIX-002) |
| m-02 | Navigation | /todo-lists vs /todos inconsistency | ✅ Complete |

---

## Dependencies

```
Wave 1 (Routes) ─────────────────────────────┐
                                              │
Wave 2 (Data Display) ───────────────────────┼──► Validation
                                              │
Wave 3 (Functionality) ──────────────────────┤
                                              │
Wave 4 (Auth/Minor) ─────────────────────────┘
```

Waves can be executed in parallel as there are no inter-wave dependencies.

---

## Validation Gates

After each wave:
1. `pnpm typecheck` - Must pass
2. `pnpm lint` - Must pass
3. `pnpm test` - Must pass

After all waves:
4. Manual verification of fixed issues
5. Deploy and verify on production

---

## Session Information

- **Session ID**: Session-20260122-BRANCH-CREATE-94898b
- **Branch**: claude/create-github-branch-eCxpV
- **Agent**: Claude Opus 4.5
- **Started**: 2026-01-22
