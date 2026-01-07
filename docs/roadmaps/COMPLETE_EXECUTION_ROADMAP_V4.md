# TERP Complete Execution Roadmap v4

**Created**: January 7, 2026  
**Version**: 4.0 (Optimized for Maximum Safe Parallelism)  
**Scope**: All remaining tasks excluding Email, SMS, QuickBooks integrations

---

## Executive Summary

This roadmap covers **75+ tasks** organized into **6 waves** with maximum safe parallel execution. By removing external integrations and optimizing task groupings, we achieve:

- **Total Time**: ~3 weeks (down from 4-5 weeks)
- **Max Parallel Agents**: 4 simultaneous
- **Zero Conflict Risk**: All parallel work touches different files/domains

---

## Dependency Analysis for Safe Parallelism

### File Domain Isolation

| Domain | Files | Can Run Parallel With |
|--------|-------|----------------------|
| **Backend/SQL** | `server/*.ts`, `server/routers/*.ts` | Frontend/UI |
| **Frontend/UI** | `client/src/components/*.tsx` | Backend/SQL |
| **Sales Workflow** | `orders/`, `quotes/`, `invoices/` | Inventory Workflow |
| **Inventory Workflow** | `inventory/`, `batches/`, `products/` | Sales Workflow |
| **Accounting** | `accounting/`, `credits/`, `returns/` | VIP Portal |
| **VIP Portal** | `vip/`, `portal/` | Accounting |
| **Calendar/Notifications** | `calendar/`, `notifications/` | Technical Debt |

### Safe Parallel Rules

1. **Different file domains** = Safe to parallelize
2. **Same database tables** = Must sequence (or use feature flags)
3. **Shared components** = Coordinate via PR review
4. **Schema changes** = One agent at a time

---

## Optimized Wave Structure

```
PHASE 1: THURSDAY DEADLINE (2.5 days)
├── Wave 1A/1B/1C: [ALREADY LAUNCHED] ✓
├── Wave 2A/2B: [ALREADY LAUNCHED] ✓
└── Wave 3: Integration & Deploy

PHASE 2: STABILITY (3 days) - 4 AGENTS PARALLEL
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Wave 4A │ │ Wave 4B │ │ Wave 4C │ │ Wave 4D │
│ SQL     │ │ Empty   │ │ Silent  │ │ Loading │
│ Safety  │ │ States  │ │ Errors  │ │ States  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘

PHASE 3: WORKFLOWS (4 days) - 3 AGENTS PARALLEL
┌───────────┐ ┌───────────┐ ┌───────────┐
│ Wave 5A   │ │ Wave 5B   │ │ Wave 5C   │
│ Sales     │ │ Inventory │ │ Accounting│
│ Workflow  │ │ Workflow  │ │ Workflow  │
└───────────┘ └───────────┘ └───────────┘

PHASE 4: FEATURES (3 days) - 2 AGENTS PARALLEL
┌─────────────────┐ ┌─────────────────┐
│ Wave 6A         │ │ Wave 6B         │
│ VIP Portal      │ │ Calendar &      │
│                 │ │ Notifications   │
└─────────────────┘ └─────────────────┘

PHASE 5: POLISH (2 days) - 2 AGENTS PARALLEL
┌─────────────────┐ ┌─────────────────┐
│ Wave 7A         │ │ Wave 7B         │
│ Tech Debt       │ │ Performance     │
│ Backend         │ │ Frontend        │
└─────────────────┘ └─────────────────┘
```

---

## Wave 3: Integration & Deploy (Thursday)

**Duration**: 3-4 hours  
**Agent**: Lead Developer  
**Dependencies**: Waves 1 & 2 complete

### Tasks

| ID | Task | Time |
|----|------|------|
| INT-1 | Merge Wave 1A PR (if not merged) | 30m |
| INT-2 | Merge Wave 1B PR | 30m |
| INT-3 | Merge Wave 2A PR | 30m |
| INT-4 | Merge Wave 2B PR | 30m |
| INT-5 | Run full test suite | 30m |
| INT-6 | Deploy to staging | 30m |
| INT-7 | Smoke test all fixed flows | 30m |
| INT-8 | Deploy to production | 30m |

### Success Criteria
- [ ] All PRs merged without conflicts
- [ ] All tests passing
- [ ] Order creation works
- [ ] Batch detail view works
- [ ] Products/Samples pages show data
- [ ] Search finds products by name

---

## Wave 4: Stability (4 Parallel Agents)

### Wave 4A: SQL Safety Audit

**Duration**: 5-6 hours  
**Agent**: Backend Developer  
**Files**: `server/**/*.ts`

| ID | Bug | File | Fix |
|----|-----|------|-----|
| BUG-043 | Permission Service empty array | `permissionService.ts` | Add length check |
| SQL-1 | Tag management empty array | `tagManagement.ts` | Add length check |
| SQL-2 | Credit engine empty sessions | `creditEngine.ts` | Add length check |
| SQL-3 | Audit all `inArray()` calls | Multiple | Add guards |
| SQL-4 | Audit all `sql.raw()` calls | Multiple | Add guards |

**Parallel Safety**: Only touches server-side database code

---

### Wave 4B: Empty States

**Duration**: 5-6 hours  
**Agent**: Frontend Developer  
**Files**: `client/src/pages/*.tsx`

| ID | Bug | Page | Fix |
|----|-----|------|-----|
| BUG-061 | AnalyticsPage | `AnalyticsPage.tsx` | Add EmptyState |
| BUG-062 | CalendarPage | `CalendarPage.tsx` | Add EmptyState |
| BUG-063 | NotificationsPage | `NotificationsPage.tsx` | Add EmptyState |
| BUG-064 | PhotographyPage | `PhotographyPage.tsx` | Add EmptyState |
| BUG-065 | ReportsPage | `ReportsPage.tsx` | Add EmptyState |
| BUG-066 | SpreadsheetView | `SpreadsheetViewPage.tsx` | Add EmptyState |
| BUG-067 | TodoPage | `TodoPage.tsx` | Add EmptyState |

**Parallel Safety**: Only touches page-level components, no shared state

---

### Wave 4C: Silent Error Fixes

**Duration**: 5-6 hours  
**Agent**: Full Stack Developer  
**Files**: Mixed server/client utilities

| ID | Bug | File | Fix |
|----|-----|------|-----|
| BUG-054 | AppointmentRequestsList | `AppointmentRequestsList.tsx` | Add null check |
| BUG-055 | TimeOffRequestsList | `TimeOffRequestsList.tsx` | Add null check |
| BUG-056 | Dashboard widgets | `ActivityLogPanel.tsx` | Add null check |
| BUG-058 | Auth helpers silent null | `authHelpers.ts` | Add logging |
| BUG-059 | Inventory utils silent | `inventoryUtils.ts` | Add logging |
| BUG-060 | Audit router silent | `audit.ts` | Add logging |

**Parallel Safety**: Touches utility files not modified by other waves

---

### Wave 4D: Loading States & Skeletons (NEW)

**Duration**: 4-5 hours  
**Agent**: Frontend Developer  
**Files**: `client/src/components/ui/*.tsx`

| ID | Task | Component |
|----|------|-----------|
| LOAD-1 | Create TableSkeleton | `skeleton.tsx` |
| LOAD-2 | Create CardSkeleton | `skeleton.tsx` |
| LOAD-3 | Create FormSkeleton | `skeleton.tsx` |
| LOAD-4 | Add to OrdersPage | `OrdersPage.tsx` |
| LOAD-5 | Add to ClientsPage | `ClientsPage.tsx` |
| LOAD-6 | Add to InventoryPage | `InventoryPage.tsx` |
| LOAD-7 | Add to InvoicesPage | `InvoicesPage.tsx` |

**Parallel Safety**: Creates new UI components, doesn't modify existing logic

---

## Wave 5: Workflow Completion (3 Parallel Agents)

### Wave 5A: Sales Workflow

**Duration**: 8-10 hours  
**Agent**: Full Stack Developer  
**Files**: `orders/`, `quotes/`, `invoices/`

| ID | Task | Description |
|----|------|-------------|
| SALES-1 | Quote creation | Create quote for client with line items |
| SALES-2 | Quote to Order conversion | One-click convert quote to order |
| SALES-3 | Order confirmation flow | Confirm order, reserve inventory |
| SALES-4 | Order fulfillment | Pick, pack, ship workflow |
| SALES-5 | Invoice generation | Auto-generate invoice from order |
| SALES-6 | Payment recording | Record full/partial payments |
| SALES-7 | Payment application | Apply payment to invoice |

**Parallel Safety**: Sales domain isolated from Inventory domain

---

### Wave 5B: Inventory Workflow

**Duration**: 8-10 hours  
**Agent**: Full Stack Developer  
**Files**: `inventory/`, `batches/`, `products/`, `vendors/`

| ID | Task | Description |
|----|------|-------------|
| INV-1 | Vendor management | Full CRUD for vendors |
| INV-2 | Purchase order creation | Create PO to vendor |
| INV-3 | PO receiving | Receive goods, create batches |
| INV-4 | Batch intake | Quality check, set pricing |
| INV-5 | Photography workflow | Upload/manage batch photos |
| INV-6 | Catalog publishing | Publish batch to live catalog |
| INV-7 | Inventory adjustments | Manual quantity adjustments |

**Parallel Safety**: Inventory domain isolated from Sales domain

---

### Wave 5C: Accounting Workflow

**Duration**: 6-8 hours  
**Agent**: Full Stack Developer  
**Files**: `accounting/`, `credits/`, `returns/`

| ID | Task | Description |
|----|------|-------------|
| ACCT-1 | AR aging report | Accounts receivable by age |
| ACCT-2 | AP tracking | Accounts payable to vendors |
| ACCT-3 | Credit management | Issue/apply credits |
| ACCT-4 | Returns processing | Process returns, issue credits |
| ACCT-5 | Payment reconciliation | Match payments to invoices |
| ACCT-6 | Financial dashboard | Summary metrics |

**Parallel Safety**: Accounting domain isolated from Sales/Inventory

---

## Wave 6: Features (2 Parallel Agents)

### Wave 6A: VIP Portal

**Duration**: 8-10 hours  
**Agent**: Full Stack Developer  
**Files**: `vip/`, `portal/`

| ID | Task | Description |
|----|------|-------------|
| VIP-1 | Client authentication | Secure login for clients |
| VIP-2 | Live catalog browsing | View available inventory |
| VIP-3 | Client-specific pricing | Show negotiated prices |
| VIP-4 | Shopping cart | Add/remove items |
| VIP-5 | Order placement | Submit order from portal |
| VIP-6 | Order history | View past orders |
| VIP-7 | AR/AP dashboard | View balances |
| VIP-8 | Document access | Download invoices |

**Parallel Safety**: VIP Portal is isolated feature set

---

### Wave 6B: Calendar & Notifications

**Duration**: 8-10 hours  
**Agent**: Full Stack Developer  
**Files**: `calendar/`, `notifications/`

| ID | Task | Description |
|----|------|-------------|
| CAL-1 | Calendar view | Month/week/day views |
| CAL-2 | Appointment CRUD | Create/edit/delete appointments |
| CAL-3 | Task integration | Show tasks with due dates |
| CAL-4 | Delivery scheduling | Show scheduled deliveries |
| NOTIF-1 | Notification center | In-app notification list |
| NOTIF-2 | Real-time updates | WebSocket for instant notifications |
| NOTIF-3 | Notification preferences | User settings for notifications |
| NOTIF-4 | Mark as read | Single and bulk mark read |

**Parallel Safety**: Calendar/Notifications isolated from VIP Portal

---

## Wave 7: Polish (2 Parallel Agents)

### Wave 7A: Technical Debt - Backend

**Duration**: 6-8 hours  
**Agent**: Backend Developer  
**Files**: `server/**/*.ts`

| ID | Task | Description |
|----|------|-------------|
| DEBT-1 | Standardize error types | Create AppError, ValidationError, etc. |
| DEBT-2 | Update all routers | Use standard errors |
| DEBT-3 | Add database indexes | Performance optimization |
| DEBT-4 | Structured logging | Add pino logger |
| DEBT-5 | Audit logging | Track sensitive operations |
| DEBT-6 | Resolve backend TODOs | Fix all TODO/FIXME |

**Parallel Safety**: Backend-only changes

---

### Wave 7B: Technical Debt - Frontend

**Duration**: 6-8 hours  
**Agent**: Frontend Developer  
**Files**: `client/src/**/*.tsx`

| ID | Task | Description |
|----|------|-------------|
| DEBT-7 | React Query optimization | Proper stale times |
| DEBT-8 | Lazy loading | Code split non-critical pages |
| DEBT-9 | Bundle optimization | Reduce bundle size |
| DEBT-10 | Accessibility audit | Fix a11y issues |
| DEBT-11 | Resolve frontend TODOs | Fix all TODO/FIXME |
| DEBT-12 | Component documentation | Add JSDoc comments |

**Parallel Safety**: Frontend-only changes

---

## Complete Timeline

```
WEEK 1 (Thursday Deadline)
├── Mon-Tue: Waves 1 & 2 [LAUNCHED]
└── Wed AM: Wave 3 (Deploy)

WEEK 2 (Stability)
├── Thu-Fri: Wave 4A + 4B + 4C + 4D (4 parallel)
└── Merge all Wave 4 PRs

WEEK 3 (Workflows)
├── Mon-Thu: Wave 5A + 5B + 5C (3 parallel)
└── Merge all Wave 5 PRs

WEEK 4 (Features + Polish)
├── Mon-Wed: Wave 6A + 6B (2 parallel)
├── Thu-Fri: Wave 7A + 7B (2 parallel)
└── Final deployment
```

---

## Agent Allocation Summary

| Wave | Agents | Hours Each | Total Hours | Calendar Days |
|------|--------|------------|-------------|---------------|
| 3 | 1 | 3-4 | 3-4 | 0.5 |
| 4A-4D | 4 | 5-6 | 20-24 | 1.5 (parallel) |
| 5A-5C | 3 | 7-9 | 21-27 | 2.5 (parallel) |
| 6A-6B | 2 | 8-10 | 16-20 | 2 (parallel) |
| 7A-7B | 2 | 6-8 | 12-16 | 1.5 (parallel) |
| **Total** | - | - | **72-91** | **~8 days** |

---

## Efficiency Gains

| Metric | v3 (Sequential) | v4 (Parallel) | Improvement |
|--------|-----------------|---------------|-------------|
| Total Hours | 114-147 | 72-91 | -37% |
| Calendar Days | 20-25 | 8-10 | -60% |
| Max Parallel | 2 | 4 | +100% |
| Integration Risk | Medium | Low | Safer |

---

## Removed from Scope

The following were removed per request:
- ~~Email integration (Resend)~~
- ~~SMS integration (Twilio)~~
- ~~QuickBooks integration~~

These can be added in a future phase if needed.

---

## Risk Mitigation

### Merge Conflicts
- Each wave works in isolated file domains
- PRs reviewed before merge
- Wave 3 handles all integration

### Database Migrations
- Only Wave 5 may need migrations
- Coordinate via feature flags
- Test on staging first

### Shared Components
- EmptyState component created in Wave 4B
- Other waves import, don't modify
- Skeleton components created in Wave 4D

---

## Success Metrics

| Metric | Target |
|--------|--------|
| All P0-P2 bugs fixed | 100% |
| Workflow completion | 100% |
| Empty states coverage | 100% |
| Test pass rate | 100% |
| Zero regressions | Yes |
| User training ready | Thursday |
| Full feature complete | Week 4 |
