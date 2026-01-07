# TERP Strategic Execution Roadmap

**Date**: January 7, 2026  
**Version**: 2.0  
**Philosophy**: Wave-based execution prioritizing end-to-end workflow completeness

---

## Executive Summary

This roadmap organizes all remaining TERP tasks into **8 execution waves**, prioritized by:
1. **Business Impact** - What blocks revenue-generating workflows?
2. **User Experience** - What causes crashes or confusion?
3. **Technical Debt** - What creates maintenance burden?
4. **Feature Completeness** - What's partially done?

### Current State

| Metric | Count |
|--------|-------|
| Total Open Tasks | 85+ |
| P0 Critical Bugs | 4 |
| P1 High Priority | 12 |
| P2 Medium Priority | 25 |
| P3 Low Priority | 44+ |
| Estimated Total Hours | 300-450 |

### Wave Overview

| Wave | Focus | Duration | Tasks | Blockers |
|------|-------|----------|-------|----------|
| **Wave 1** | Critical Bug Fixes | 2-3 days | 4 | None |
| **Wave 2** | Data Display Fixes | 1-2 days | 4 | None |
| **Wave 3** | Core Workflow Completion | 3-5 days | 8 | Wave 1 |
| **Wave 4** | Search & Navigation | 2-3 days | 5 | Wave 2 |
| **Wave 5** | UX Polish | 3-4 days | 12 | Wave 3 |
| **Wave 6** | Integration Completion | 5-7 days | 15 | Wave 4 |
| **Wave 7** | Feature Enhancement | 5-7 days | 20 | Wave 5 |
| **Wave 8** | Technical Debt | Ongoing | 17+ | None |

---

## Wave 1: Critical Bug Fixes (IMMEDIATE)

**Goal**: Fix bugs that crash the app or block core business functions  
**Duration**: 2-3 days  
**Dependencies**: None  
**Success Criteria**: Order creation works, batch details viewable, no app crashes

### Tasks

| ID | Description | File | Est. Hours | Priority |
|----|-------------|------|------------|----------|
| **BUG-040** | Order Creator inventory loading fails | `server/pricingEngine.ts:332-362` | 4-6 | P0 |
| **BUG-041** | Batch Detail View crashes app | `client/src/components/inventory/BatchDetailDrawer.tsx` | 3-4 | P0 |
| **BUG-043** | Permission Service empty array SQL crash | `server/services/permissionService.ts:185-210` | 2-3 | P0 |
| **BUG-045** | Retry button resets form (data loss) | `client/src/pages/OrderCreatorPage.tsx:575` | 1-2 | P1 |

### Technical Details

**BUG-040 Root Cause**: Empty `ruleIds` array creates invalid SQL `WHERE id IN ()`
```typescript
// Fix: Add empty array check
if (ruleIds.length === 0) {
  return []; // or handle appropriately
}
```

**BUG-041 Root Cause**: `.map()` called on potentially undefined arrays
```typescript
// Fix: Add defensive checks
{(batch.locations || []).map(loc => ...)}
```

**BUG-043 Root Cause**: `inArray(permissionIds)` without length check
```typescript
// Fix: Check array before query
if (permissionIds.length === 0) return [];
```

**BUG-045 Root Cause**: Uses `window.location.reload()` instead of `refetch()`
```typescript
// Fix: Replace with tRPC refetch
onClick={() => refetchInventory()}
```

---

## Wave 2: Data Display Fixes (PARALLEL WITH WAVE 1)

**Goal**: Fix pages that show empty despite data existing  
**Duration**: 1-2 days  
**Dependencies**: None (can run parallel with Wave 1)  
**Success Criteria**: Products page shows 121 products, Samples page shows 6 samples

### Tasks

| ID | Description | File | Est. Hours | Priority |
|----|-------------|------|------------|----------|
| **QA-049** | Products page shows "No results found" | `client/src/pages/ProductsPage.tsx` | 2-4 | P1 |
| **QA-050** | Samples page shows "All 0" | `client/src/pages/SamplesPage.tsx` | 2-4 | P1 |
| **BUG-042** | Global Search returns no results | `server/routers/search.ts:94-113` | 3-4 | P1 |
| **BUG-070** | Spreadsheet View returns 404 | Route configuration | 1-2 | P2 |

### Investigation Needed

**QA-049/QA-050**: Likely causes:
1. Query filter excluding all records (archived status, brand filter)
2. Permission/tenant filtering issue
3. API returning data but UI not rendering

**BUG-042**: Search only queries `batches.code` and `batches.sku`, not product names

---

## Wave 3: Core Workflow Completion

**Goal**: Complete end-to-end business workflows  
**Duration**: 3-5 days  
**Dependencies**: Wave 1 complete  
**Success Criteria**: User can complete full sales cycle from client to payment

### Tasks

| ID | Description | Est. Hours | Lifecycle |
|----|-------------|------------|-----------|
| **WF-001** | Verify Quote → Order flow | 2-3 | Sales |
| **WF-002** | Verify Order → Invoice flow | 2-3 | Sales |
| **WF-003** | Verify Invoice → Payment flow | 2-3 | Financial |
| **WF-004** | Verify PO → Receive → Batch flow | 3-4 | Inventory |
| **WF-005** | Verify Batch → Photography → Publish flow | 2-3 | Inventory |
| **WF-006** | VIP Portal order placement | 3-4 | VIP |
| **WF-007** | VIP Portal order tracking | 2-3 | VIP |
| **WF-008** | Calendar → Notification flow | 2-3 | Operations |

### Lifecycle Coverage

```
LIFECYCLE 1: INVENTORY INTAKE ✅
Vendor → PO → Receive → Batch → Location → Photography → Publish

LIFECYCLE 2: SALES CYCLE (Wave 1 unblocks)
Client → Catalog → Quote → Order → Pick/Pack → Ship → Invoice → Payment

LIFECYCLE 3: VIP PORTAL
Login → Catalog → Balance → Order → Track → History → Documents

LIFECYCLE 4: FINANCIAL CLOSE
Orders → Invoices → Payments → Reconciliation → Period Close → Reports

LIFECYCLE 5: OPERATIONS
Calendar → Appointments → Tasks → Notifications → Analytics
```

---

## Wave 4: Search & Navigation

**Goal**: Users can find anything in the system quickly  
**Duration**: 2-3 days  
**Dependencies**: Wave 2 complete  
**Success Criteria**: Global search finds products, clients, orders by any field

### Tasks

| ID | Description | Est. Hours | Priority |
|----|-------------|------------|----------|
| **SEARCH-001** | Add product name/strain to global search | 3-4 | P1 |
| **SEARCH-002** | Add client name to global search | 2-3 | P1 |
| **SEARCH-003** | Add order number to global search | 2-3 | P1 |
| **NAV-001** | Fix breadcrumb navigation consistency | 2-3 | P2 |
| **NAV-002** | Add keyboard shortcuts (Cmd+K) | 3-4 | P2 |

### Search Fields to Add

```typescript
// Current search (search.ts:94-113)
batches.code, batches.sku

// Should also search:
products.name, products.strain, products.category
clients.name, clients.company
orders.orderNumber
invoices.invoiceNumber
```

---

## Wave 5: UX Polish

**Goal**: Eliminate confusing UI states and improve feedback  
**Duration**: 3-4 days  
**Dependencies**: Wave 3 complete  
**Success Criteria**: No silent failures, clear error messages, proper loading states

### Tasks

| ID | Description | Est. Hours | Priority |
|----|-------------|------------|----------|
| **BUG-046** | Settings Users tab misleading auth error | 2-3 | P1 |
| **BUG-048** | ClientsListPage Retry resets form | 1-2 | P2 |
| **UX-001** | Add empty states to Analytics page | 2-3 | P2 |
| **UX-002** | Add empty states to Calendar page | 2-3 | P2 |
| **UX-003** | Add empty states to Photography page | 2-3 | P2 |
| **UX-004** | Improve error messages (distinguish auth vs permission) | 3-4 | P2 |
| **UX-005** | Add loading skeletons to all data tables | 4-6 | P2 |
| **UX-006** | Fix double status badges on orders | 2-3 | P2 |
| **UX-007** | Add confirmation dialogs for destructive actions | 3-4 | P2 |
| **UX-008** | Improve form validation feedback | 3-4 | P2 |
| **UX-009** | Add toast notifications for async operations | 2-3 | P2 |
| **UX-010** | Fix notification panel (rename from "Inbox") | 1-2 | P3 |

---

## Wave 6: Integration Completion

**Goal**: Complete partially implemented integrations  
**Duration**: 5-7 days  
**Dependencies**: Wave 4 complete  
**Success Criteria**: All integrations functional end-to-end

### Tasks

| ID | Description | Est. Hours | Priority |
|----|-------------|------------|----------|
| **INT-001** | Complete email service integration (SendGrid) | 6-8 | P2 |
| **INT-002** | Complete SMS service integration (Twilio) | 6-8 | P2 |
| **INT-003** | Invoice → Accounting auto-sync | 4-6 | P2 |
| **INT-004** | Payment → Credit exposure update | 3-4 | P2 |
| **INT-005** | Order → Cash payment recording | 3-4 | P2 |
| **INT-006** | Calendar → Email notifications | 4-6 | P2 |
| **INT-007** | Low stock alerts → Notifications | 3-4 | P2 |
| **INT-008** | VIP Portal → Order notifications | 3-4 | P2 |
| **INT-009** | Slack bot health monitoring | 2-3 | P3 |
| **INT-010** | Bank reconciliation automation | 6-8 | P3 |

### TODO Items to Address

From codebase scan:
- `server/routers/receipts.ts:470` - Email service integration
- `server/routers/receipts.ts:497` - SMS service integration
- `server/ordersDb.ts:321-323` - Invoice/payment/credit integration

---

## Wave 7: Feature Enhancement

**Goal**: Complete partially implemented features  
**Duration**: 5-7 days  
**Dependencies**: Wave 5 complete  
**Success Criteria**: All features work as designed

### Tasks

| ID | Description | Est. Hours | Priority |
|----|-------------|------------|----------|
| **FEATURE-008** | Extend Advanced Filtering to all pages | 6-8 | P2 |
| **FEATURE-010** | Extend Batch Operations to all tables | 6-8 | P2 |
| **FEATURE-012** | Dashboard customization | 8-12 | P3 |
| **FEATURE-013** | Report builder/export | 8-12 | P3 |
| **FEATURE-014** | Recurring calendar events | 4-6 | P3 |
| **FEATURE-015** | Price negotiation workflow | 6-8 | P3 |
| **FEATURE-016** | Multi-location inventory transfers | 6-8 | P3 |
| **FEATURE-017** | Batch split/merge operations | 4-6 | P3 |
| **FEATURE-018** | Client credit limit automation | 4-6 | P3 |
| **FEATURE-019** | Automated reorder points | 4-6 | P3 |

### Partially Implemented (Need Completion)

| Feature | Current State | Remaining Work |
|---------|---------------|----------------|
| Advanced Filtering | AdvancedFilters.tsx exists, used in Inventory | Extend to Clients, Orders, Invoices |
| Batch Operations | BulkActionsBar.tsx exists | Extend to all data tables |
| RBAC | usePermissions hook complete | UI for role management |
| Export | CSV export works | Add PDF, Excel formats |

---

## Wave 8: Technical Debt (Ongoing)

**Goal**: Reduce maintenance burden and improve code quality  
**Duration**: Ongoing (allocate 20% of each sprint)  
**Dependencies**: None (can be done in parallel)  
**Success Criteria**: Reduced TODO count, improved test coverage

### Tasks

| ID | Description | Est. Hours | Priority |
|----|-------------|------------|----------|
| **TECH-001** | Fix schema drift and re-enable seeding | 4-6 | P2 |
| **TECH-002** | Remove DigitalOcean seed-fill-gaps job | 0.5 | P2 |
| **TECH-003** | Fix test mock chains (rbac-permissions.test.ts) | 4-6 | P3 |
| **TECH-004** | Fix test mock chains (rbac-roles.test.ts) | 4-6 | P3 |
| **TECH-005** | Add missing TypeScript types | 6-8 | P3 |
| **TECH-006** | Improve error handling consistency | 4-6 | P3 |
| **TECH-007** | Add integration tests for core workflows | 8-12 | P3 |
| **TECH-008** | Database query optimization | 6-8 | P3 |
| **TECH-009** | API response caching | 4-6 | P3 |
| **TECH-010** | Reduce bundle size | 4-6 | P3 |

### TODO Items to Address (35 total)

High priority:
- `server/_core/index.ts:161` - Schema drift
- `server/ordersDb.ts:321-323` - Accounting integration
- `client/src/components/inventory/BatchDetailDrawer.tsx:325,335,617` - Product relation

---

## Execution Timeline

### Week 1: Foundation
- **Days 1-2**: Wave 1 (Critical Bugs)
- **Days 2-3**: Wave 2 (Data Display) - parallel
- **Days 3-5**: Wave 3 (Core Workflows)

### Week 2: User Experience
- **Days 1-2**: Wave 4 (Search & Navigation)
- **Days 3-5**: Wave 5 (UX Polish)

### Week 3-4: Completion
- **Days 1-5**: Wave 6 (Integrations)
- **Days 6-10**: Wave 7 (Features)

### Ongoing
- Wave 8 (Technical Debt) - 20% of each sprint

---

## Resource Allocation

### Recommended Team Structure

| Role | Focus | Waves |
|------|-------|-------|
| **Senior Dev 1** | Backend bugs, integrations | 1, 6 |
| **Senior Dev 2** | Frontend bugs, UX | 2, 5 |
| **Mid Dev 1** | Workflow completion | 3, 4 |
| **Mid Dev 2** | Feature enhancement | 7 |
| **QA Engineer** | Testing, validation | All |

### Parallel Execution Opportunities

```
Week 1:
├── Wave 1 (Backend Dev)
├── Wave 2 (Frontend Dev) ← Parallel
└── Wave 8 items (Any Dev) ← Parallel

Week 2:
├── Wave 3 (Full Team)
├── Wave 4 (Frontend Dev)
└── Wave 8 items (Any Dev) ← Parallel
```

---

## Success Metrics

### Wave Completion Criteria

| Wave | Success Metric |
|------|----------------|
| Wave 1 | Order creation works, no app crashes |
| Wave 2 | All pages show correct data counts |
| Wave 3 | Full sales cycle completable |
| Wave 4 | Search finds all entity types |
| Wave 5 | No silent failures, clear feedback |
| Wave 6 | Email/SMS notifications working |
| Wave 7 | All features work as designed |
| Wave 8 | TODO count < 10, test coverage > 70% |

### Overall KPIs

| Metric | Current | Target |
|--------|---------|--------|
| P0 Bugs | 4 | 0 |
| P1 Bugs | 12 | 0 |
| App Crashes/Week | Unknown | 0 |
| User Workflow Completion Rate | ~70% | 95% |
| Search Success Rate | ~30% | 90% |

---

## Risk Mitigation

### High Risk Items

| Risk | Mitigation |
|------|------------|
| BUG-040 fix breaks other pricing | Add comprehensive pricing tests first |
| Search changes affect performance | Add query performance tests |
| Integration changes affect live data | Use feature flags, staged rollout |

### Rollback Plan

Each wave should be deployable independently with feature flags:
- `FEATURE_FLAG_NEW_PRICING_ENGINE`
- `FEATURE_FLAG_ENHANCED_SEARCH`
- `FEATURE_FLAG_EMAIL_NOTIFICATIONS`

---

## Appendix: Task ID Reference

### Bug IDs (BUG-XXX)
- BUG-040 to BUG-069: From initial testing
- BUG-070+: From validation

### QA IDs (QA-XXX)
- QA-001 to QA-048: From QA backlog
- QA-049 to QA-050: From Wave 7 findings

### Feature IDs (FEATURE-XXX)
- FEATURE-008 to FEATURE-019: Enhancement features

### Workflow IDs (WF-XXX)
- WF-001 to WF-008: End-to-end workflow tasks

### Integration IDs (INT-XXX)
- INT-001 to INT-010: Integration completion tasks

### UX IDs (UX-XXX)
- UX-001 to UX-010: User experience improvements

### Technical Debt IDs (TECH-XXX)
- TECH-001 to TECH-010: Code quality improvements
