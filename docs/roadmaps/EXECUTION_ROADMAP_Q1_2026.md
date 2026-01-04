# TERP Execution Roadmap - Q1 2026

**Version:** 1.0
**Created:** January 4, 2026
**Owner:** VP of Product & Engineering
**Status:** ACTIVE

---

## Overview

This roadmap replaces the fragmented task tracking in MASTER_ROADMAP.md with a clear, prioritized execution plan. All tasks are organized into waves that can be executed sequentially or in parallel where dependencies allow.

---

## Wave Structure

```
Wave 1: Code Health & Schema Alignment (BLOCKING)
    ↓
Wave 2: Infrastructure & Testing (PARALLEL OK)
    ↓
Wave 3: Feature Completion (PARALLEL OK)
    ↓
Wave 4: Polish & Documentation (SEQUENTIAL)
    ↓
Wave 5: Production Readiness (SEQUENTIAL)
```

---

## Wave 1: Code Health & Schema Alignment

**Timeline:** January 5-7, 2026 (2-3 days)
**Status:** 🔴 NOT STARTED
**Blocking:** All other waves depend on this

### Critical Path Tasks

| ID | Task | Priority | Effort | Owner | Status |
|----|------|----------|--------|-------|--------|
| W1-001 | Fix schema mismatches in server routers (13 files) | P0 | 6h | Agent-1A | ⬜ |
| W1-002 | Fix schema mismatches in client components (12 files) | P0 | 4h | Agent-1A | ⬜ |
| W1-003 | Remove all @ts-nocheck directives | P0 | 1h | Agent-1A | ⬜ |
| W1-004 | Verify `pnpm check` passes with 0 errors | P0 | 0.5h | Agent-1A | ⬜ |
| W1-005 | Verify `pnpm test` passes | P0 | 0.5h | Agent-1A | ⬜ |

### Schema Mapping Reference

```typescript
// Products table - actual columns
products.nameCanonical  // NOT products.name
products.id
products.category
// NO: sku, targetStockLevel, minStockLevel, unit

// Batches table - actual columns
batches.onHandQty       // NOT batches.quantity
batches.sku
batches.grade
batches.batchStatus

// ClientNeeds table - actual columns
clientNeeds.category    // NOT clientNeeds.productType
clientNeeds.quantityMin // NOT clientNeeds.quantity
clientNeeds.quantityMax
clientNeeds.status      // ENUM: ACTIVE, FULFILLED, EXPIRED, CANCELLED

// Clients table - actual columns
// NO: tier
```

### Exit Criteria
- [ ] `grep -r "@ts-nocheck" --include="*.ts" --include="*.tsx" | wc -l` returns 0
- [ ] `pnpm check` returns 0 errors
- [ ] `pnpm test` passes (no regressions)
- [ ] All changes committed to main branch

---

## Wave 2: Infrastructure & Testing

**Timeline:** January 8-10, 2026 (2-3 days)
**Status:** ⬜ BLOCKED (waiting for Wave 1)
**Parallel Execution:** Yes (3 agents)

### Agent 2A: Code Quality

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W2A-001 | Remove console.log statements (420 instances) | P1 | 2h | ⬜ |
| W2A-002 | Audit and resolve TODO/FIXME comments (36) | P2 | 2h | ⬜ |
| W2A-003 | Add ESLint rule to prevent future console.log | P2 | 0.5h | ⬜ |

### Agent 2B: Testing Infrastructure

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W2B-001 | Add integration tests for order creation flow | P1 | 3h | ⬜ |
| W2B-002 | Add integration tests for inventory management | P1 | 3h | ⬜ |
| W2B-003 | Add integration tests for payment processing | P1 | 2h | ⬜ |
| W2B-004 | Increase test coverage to >30% | P2 | 4h | ⬜ |

### Agent 2C: Performance & Security

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W2C-001 | Implement Redis caching layer | P2 | 6h | ⬜ |
| W2C-002 | Add API rate limiting (ST-018) | P2 | 3h | ⬜ |
| W2C-003 | Add pagination to remaining endpoints | P2 | 3h | ⬜ |

### Exit Criteria
- [ ] 0 console.log statements in production code
- [ ] All TODO comments documented or resolved
- [ ] Integration test coverage for critical paths
- [ ] Rate limiting active on all public endpoints

---

## Wave 3: Feature Completion

**Timeline:** January 11-17, 2026 (5-7 days)
**Status:** ⬜ BLOCKED (waiting for Wave 1)
**Parallel Execution:** Yes (4 agents)

### Agent 3A: Procurement & Fulfillment (FEATURE-020)

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W3A-001 | Implement requisition creation and approval | P1 | 4h | ⬜ |
| W3A-002 | Implement vendor selection workflow | P1 | 3h | ⬜ |
| W3A-003 | Implement purchase order generation | P1 | 4h | ⬜ |
| W3A-004 | Implement receiving/inspection flow | P1 | 3h | ⬜ |
| W3A-005 | Implement invoice matching | P1 | 3h | ⬜ |

### Agent 3B: Reporting & Analytics (FEATURE-021)

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W3B-001 | Implement real dashboard metrics | P1 | 4h | ⬜ |
| W3B-002 | Create procurement-specific dashboard | P1 | 4h | ⬜ |
| W3B-003 | Add export functionality to all reports | P2 | 2h | ⬜ |

### Agent 3C: Static Pages (FEATURE-022)

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W3C-001 | Create About page | P2 | 1h | ⬜ |
| W3C-002 | Create Contact page with form | P2 | 2h | ⬜ |
| W3C-003 | Create Privacy Policy page | P2 | 1h | ⬜ |
| W3C-004 | Create Terms of Service page | P2 | 1h | ⬜ |

### Agent 3D: Bug Fixes

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W3D-001 | Fix inventory fetch errors (BUG-050) | P1 | 3h | ⬜ |
| W3D-002 | Fix remaining UI/UX issues from backlog | P2 | 4h | ⬜ |

### Exit Criteria
- [ ] All FEATURE-020 workflows functional
- [ ] Dashboard shows real metrics
- [ ] All static pages accessible
- [ ] No critical bugs in backlog

---

## Wave 4: Polish & Documentation

**Timeline:** January 18-20, 2026 (2-3 days)
**Status:** ⬜ BLOCKED (waiting for Wave 3)
**Parallel Execution:** Limited (2 agents)

### Agent 4A: Documentation

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W4A-001 | Update MASTER_ROADMAP to reflect completion | P1 | 2h | ⬜ |
| W4A-002 | Create end-user documentation | P2 | 4h | ⬜ |
| W4A-003 | Update API documentation | P2 | 2h | ⬜ |
| W4A-004 | Create deployment runbook | P2 | 2h | ⬜ |

### Agent 4B: Final QA

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W4B-001 | Full E2E testing pass on staging | P0 | 4h | ⬜ |
| W4B-002 | Performance audit and optimization | P2 | 4h | ⬜ |
| W4B-003 | Security audit | P1 | 3h | ⬜ |
| W4B-004 | Accessibility audit | P2 | 2h | ⬜ |

### Exit Criteria
- [ ] All documentation up to date
- [ ] E2E tests pass on staging
- [ ] No critical performance issues
- [ ] Security audit passed

---

## Wave 5: Production Readiness

**Timeline:** January 21-22, 2026 (1-2 days)
**Status:** ⬜ BLOCKED (waiting for Wave 4)
**Parallel Execution:** No (sequential)

| ID | Task | Priority | Effort | Status |
|----|------|----------|--------|--------|
| W5-001 | Deploy to production | P0 | 2h | ⬜ |
| W5-002 | Verify production deployment | P0 | 1h | ⬜ |
| W5-003 | Monitor for 24 hours | P0 | 24h | ⬜ |
| W5-004 | Sign-off and close roadmap | P0 | 1h | ⬜ |

### Exit Criteria
- [ ] Production deployment successful
- [ ] No critical issues in 24-hour monitoring
- [ ] Stakeholder sign-off received
- [ ] Roadmap marked COMPLETE

---

## Dependency Graph

```
Wave 1 (BLOCKING)
├── W1-001: Fix server routers
├── W1-002: Fix client components
├── W1-003: Remove @ts-nocheck
├── W1-004: Verify TypeScript
└── W1-005: Verify tests
    │
    ▼
Wave 2 (PARALLEL)
├── Agent 2A: Code Quality
├── Agent 2B: Testing
└── Agent 2C: Performance
    │
    ▼
Wave 3 (PARALLEL)
├── Agent 3A: Procurement
├── Agent 3B: Reporting
├── Agent 3C: Static Pages
└── Agent 3D: Bug Fixes
    │
    ▼
Wave 4 (LIMITED PARALLEL)
├── Agent 4A: Documentation
└── Agent 4B: Final QA
    │
    ▼
Wave 5 (SEQUENTIAL)
└── Production Deployment
```

---

## Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Schema fixes break existing features | Medium | High | Comprehensive test suite |
| Agent conflicts on shared files | Medium | Medium | Clear file ownership |
| Performance regression | Low | Medium | Performance monitoring |
| Security vulnerability | Low | High | Security audit in Wave 4 |

---

## Success Metrics

| Metric | Target | Current |
|--------|--------|---------|
| TypeScript errors | 0 | 0 (fragile) |
| @ts-nocheck files | 0 | 25 |
| Test coverage | >40% | ~21% |
| Console.log statements | 0 | 420 |
| Critical bugs | 0 | TBD |
| E2E test pass rate | 100% | ~75% |

---

## Appendix: File Ownership Matrix

### Wave 1 - Single Agent Owns All
```
server/routers/alerts.ts
server/routers/analytics.ts
server/routers/audit.ts
server/routers/customerPreferences.ts
server/routers/featureFlags.ts
server/routers/flowerIntake.ts
server/routers/inventoryShrinkage.ts
server/routers/photography.ts
server/routers/quickCustomer.ts
server/routers/referrals.ts
server/routers/unifiedSalesPortal.ts
server/services/featureFlagService.ts
server/db/seed/productionSeed.ts
client/src/pages/Inventory.tsx
client/src/pages/PhotographyPage.tsx
client/src/hooks/useInventorySort.ts
client/src/pages/vip-portal/VIPDashboard.tsx
client/src/pages/settings/FeatureFlagsPage.tsx
client/src/pages/accounting/Invoices.tsx
client/src/pages/UnifiedSalesPortalPage.tsx
client/src/pages/InterestListPage.tsx
client/src/components/settings/VIPImpersonationManager.tsx
client/src/pages/settings/NotificationPreferences.tsx
client/src/pages/OrderCreatorPage.tsx
client/src/pages/NotificationsPage.tsx
```

### Wave 2+ - Distributed Ownership
See individual wave sections for file assignments.
