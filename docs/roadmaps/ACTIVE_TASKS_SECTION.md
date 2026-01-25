---

## 🚀 Active Tasks (Structured Format for Agent Deployment)

> **Note:** Tasks in this section use the new structured format for automated agent deployment.
> See [`docs/ROADMAP_SYSTEM_GUIDE.md`](../ROADMAP_SYSTEM_GUIDE.md) for usage instructions.
> 
> **To deploy agents:** Run `pnpm roadmap:next-batch` to get deployment URLs.

---

### ST-005: Add Missing Database Indexes

**Status:** 📋 Ready  
**Priority:** 🔴 HIGH  
**Estimate:** 4-6h  
**Module:** `server/db/schema/`  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-005.md`](../prompts/ST-005.md)

**Objectives:**

- Audit all foreign key relationships for missing indexes
- Add missing indexes to improve query performance
- Measure and document performance improvements
- Ensure all tests pass with new indexes

**Deliverables:**

- [ ] Index audit report documenting all foreign keys
- [ ] Migration file with new index definitions
- [ ] Performance benchmark results (before/after)
- [ ] Updated schema documentation
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

---

### ST-007: Implement System-Wide Pagination

**Status:** 📋 Ready  
**Priority:** 🟡 MEDIUM  
**Estimate:** 3-4d  
**Module:** `server/routers/*` (all list endpoints)  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-007.md`](../prompts/ST-007.md)

**Objectives:**

- Add pagination to ALL `getAll` and list endpoints
- Prevent browser crashes with large datasets (1000+ records)
- Implement consistent pagination pattern across all routers
- Add tests for pagination edge cases

**Deliverables:**

- [ ] Pagination added to priority endpoints (accounting, inventory, orders, clients, vendors)
- [ ] Pagination added to all remaining list endpoints
- [ ] Tests for pagination with large datasets
- [ ] Documentation of pagination parameters (limit/offset)
- [ ] Performance testing with 1000+ records
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

---

### ST-008: Implement Error Tracking (Sentry)

**Status:** ✅ Complete
**Completed:** 2026-01-06
**Key Commits:** `8c4d6f3`
**Priority:** 🟡 MEDIUM
**Estimate:** 1-2d
**Actual Time:** 1d
**Module:** Root config, `src/_app.tsx`, `server/`
**Dependencies:** None
**Prompt:** [`docs/prompts/ST-008.md`](../prompts/ST-008.md)

**Objectives:**

- Set up Sentry integration for production error tracking
- Add error boundaries to React components
- Configure source maps for meaningful stack traces
- Test error reporting in staging environment

**Deliverables:**

- [x] Sentry SDK installed (`@sentry/vite-plugin`)
- [x] Server-side Sentry monitoring with defensive, non-blocking code
- [x] Error boundaries added to key React components (ErrorBoundary, ComponentErrorBoundary)
- [x] Source maps configured for production builds (conditional on SENTRY_AUTH_TOKEN)
- [x] WidgetContainer wrapped with error boundary protection
- [x] Documentation in .env.example
- [x] All tests passing (no regressions)
- [x] Zero TypeScript errors

---

### ST-009: Implement API Monitoring (Datadog)

**Status:** 📋 Ready  
**Priority:** 🟡 MEDIUM  
**Estimate:** 2-3d  
**Module:** `server/_core/`, tRPC middleware  
**Dependencies:** None  
**Prompt:** [`docs/prompts/ST-009.md`](../prompts/ST-009.md)

**Objectives:**

- Set up Datadog for API performance monitoring
- Add performance metrics to all tRPC procedures
- Create alerts for slow queries (>1s response time)
- Build monitoring dashboard for key metrics

**Deliverables:**

- [ ] Datadog SDK installed and configured
- [ ] Performance middleware added to tRPC
- [ ] Custom metrics for database queries
- [ ] Alerts configured for slow queries
- [ ] Monitoring dashboard created
- [ ] Documentation of monitoring setup
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

---

### ST-010: Implement Caching Layer (Redis)

**Status:** 🚫 Blocked  
**Priority:** 🟡 MEDIUM  
**Estimate:** 2-3d  
**Module:** `server/_core/cache/`, `server/routers/*`  
**Dependencies:** Abstraction Layer (authProvider, dataProvider)  
**Prompt:** [`docs/prompts/ST-010.md`](../prompts/ST-010.md)

**Objectives:**

- Set up Redis for application-level caching
- Implement caching for expensive queries (catalog, reports)
- Add cache invalidation logic
- Measure and document performance improvements

**Deliverables:**

- [ ] Redis client configured and tested
- [ ] Cache abstraction layer implemented
- [ ] Caching added to catalog queries
- [ ] Caching added to accounting reports
- [ ] Cache invalidation on data mutations
- [ ] Performance benchmarks (before/after)
- [ ] Documentation of caching strategy
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Session file archived
- [ ] MASTER_ROADMAP updated to ✅ Complete

**Note:** Currently blocked - requires authProvider and dataProvider abstraction layer to be complete first.

---


### FEATURE-021: Unified Spreadsheet View

**Status:** 📋 Ready  
**Priority:** 🔴 HIGH  
**Estimate:** 40-56h  
**Module:** `client/src/pages/`, `server/routers/`  
**Dependencies:** None  
**Spec:** [`docs/specs/FEATURE-SPREADSHEET-VIEW-SPEC.md`](../specs/FEATURE-SPREADSHEET-VIEW-SPEC.md)
**Prompt:** [`docs/prompts/FEATURE-021.md`](../prompts/FEATURE-021.md)

**Objectives:**

- Implement spreadsheet-like grid interface using AG-Grid
- Provide familiar workflow for users accustomed to spreadsheets
- Cover Inventory, Intake, Pick & Pack, and Client views
- Ensure all operations flow through existing tRPC procedures (no bypasses)
- Maintain bidirectional data sync with standard ERP views

**Critical Constraints:**

- **NO new business logic** - pure presentation layer only
- **ALL mutations** must use existing tRPC procedures
- **ALL validation/permissions** must be enforced via existing controls
- **ALL actions** must be logged via existing audit system

**Deliverables:**

- [ ] Phase 1: Inventory Grid + Client View (16-20h)
  - [ ] `SpreadsheetViewPage.tsx` container with tabs
  - [ ] `InventoryGrid.tsx` with AG-Grid
  - [ ] `ClientGrid.tsx` with master-detail layout
  - [ ] `spreadsheetRouter.ts` for data transformation only
- [ ] Phase 2: Intake Grid (12-16h)
  - [ ] `IntakeGrid.tsx` for new batch entry
  - [ ] Integration with existing `inventoryIntakeService`
- [ ] Phase 3: Pick & Pack Grid (12-20h)
  - [ ] `PickPackGrid.tsx` for order fulfillment
  - [ ] Integration with existing `pickPack` router
- [ ] Unit tests for cell renderers and data transformers
- [ ] Integration tests for `spreadsheetRouter` procedures
- [ ] E2E tests for core workflows
- [ ] Security tests verifying permission enforcement
- [ ] All tests passing (no regressions)
- [ ] Zero TypeScript errors
- [ ] Feature flag: `spreadsheet-view`
- [ ] MASTER_ROADMAP updated to ✅ Complete

---
