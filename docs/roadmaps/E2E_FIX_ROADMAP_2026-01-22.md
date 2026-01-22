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

### Wave 1: Route Redirects (7 issues) - PRIORITY: HIGH
Add legacy route redirects for backward compatibility.

| Issue | Legacy Path | Correct Path | Status |
|-------|-------------|--------------|--------|
| C-03 | `/invoices` | `/accounting/invoices` | Pending |
| C-04 | `/client-needs` | `/needs` | Pending |
| C-07 | `/ar-ap` | `/accounting` | Pending |
| C-08 | `/reports` | `/analytics` | Pending |
| C-09 | `/pricing-rules` | `/pricing/rules` | Pending |
| C-10 | `/system-settings` | `/settings` | Pending |
| C-11 | `/feature-flags` | `/settings/feature-flags` | Pending |

### Wave 2: Data Display Issues (4 issues) - PRIORITY: HIGH
Fix data loading and display issues.

| Issue | Page | Problem | Root Cause | Status |
|-------|------|---------|------------|--------|
| C-02 | Orders | No orders displayed | isDraft boolean handling | Pending |
| C-05 | Inventory | No inventory displayed | Query/filter mismatch | Pending |
| C-06 | Vendors | No data | Derived from empty inventory | Pending |
| M-03 | Dashboard | Broken client links | Hardcoded `/clients/1` | Pending |

### Wave 3: Functionality Issues (3 issues) - PRIORITY: MEDIUM
Fix component-level bugs.

| Issue | Component | Problem | Status |
|-------|-----------|---------|--------|
| C-01 | ClientsWorkSurface | View Profile triggers Archive | Pending |
| M-01 | CalendarPage | Database error | Pending |
| m-01 | GlobalSearch | Double search required | Pending |

### Wave 4: Authentication/Minor Issues (2 issues) - PRIORITY: LOW
Fix authentication and minor UX issues.

| Issue | Page | Problem | Status |
|-------|------|---------|--------|
| M-02 | TimeClock | Auth error despite logged in | Pending |
| m-02 | Navigation | /todo-lists vs /todos inconsistency | Already fixed |

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
