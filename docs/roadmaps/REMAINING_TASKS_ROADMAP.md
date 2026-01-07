# TERP Remaining Tasks Roadmap

**Generated:** January 7, 2026  
**Source:** MASTER_ROADMAP.md, QA_TASKS_BACKLOG.md, LIFECYCLE_ROADMAP_Q1_2026.md  
**Total Remaining Tasks:** 120+

---

## Executive Summary

This document consolidates all remaining tasks in the TERP project, organized by priority and category for efficient execution.

### Task Distribution

| Category | Count | Description |
|----------|-------|-------------|
| **BUG** | 69 | Bug fixes (BUG-001 to BUG-069) |
| **QA** | 75 | QA-identified issues |
| **FEATURE** | 20 | New features |
| **CLEANUP** | 3 | Code cleanup tasks |
| **FIX** | 3 | Targeted fixes |
| **Other** | 30+ | ST, WF, RF, CI, SEC, UX tasks |

### Priority Breakdown

| Priority | Count | Timeline |
|----------|-------|----------|
| **P0 - Critical** | 15 | Immediate (blocks core functionality) |
| **P1 - High** | 25 | This week (degrades UX significantly) |
| **P2 - Medium** | 40 | This month (minor issues) |
| **P3 - Low** | 40+ | Backlog (polish/enhancements) |

---

## 🔴 P0 - CRITICAL (Fix Immediately)

These bugs block core business functionality and must be fixed before anything else.

### Critical Bugs (From Live Testing - Jan 7, 2026)

| Task ID | Description | File | Root Cause |
|---------|-------------|------|------------|
| BUG-040 | Order Creator: Inventory loading fails | `server/pricingEngine.ts` | Empty array generates invalid SQL |
| BUG-041 | Batch Detail View crashes app | `BatchDetailDrawer.tsx` | Unsafe .map() on undefined |
| BUG-042 | Global Search returns no results | `server/routers/search.ts` | Only searches code/sku, not product names |
| BUG-043 | Permission Service empty array SQL crash | `permissionService.ts` | inArray with empty array |
| BUG-044 | VIP Portal empty batch IDs crash | `server/routers/vipPortal.ts` | inArray with empty array |

### Critical QA Issues

| Task ID | Description | Module |
|---------|-------------|--------|
| QA-005 | Systemic data access issues | All modules |
| QA-051 | Implement Analytics & Reporting Backend | Analytics |
| QA-052 | Implement System Settings Backend | Settings |
| QA-053 | Retrofit Architectural Fixes to Core Workflows | Core |
| BUG-027 | Order Status Update Permission Denied | Orders |

### Critical Lifecycle Blockers

| Task | Description | Lifecycle Impact |
|------|-------------|------------------|
| Fix Inventory.tsx @ts-nocheck | Remove type suppression | Blocks inventory viewing |
| Fix OrderCreatorPage.tsx @ts-nocheck | Remove type suppression | Blocks order creation |
| Fix VIPDashboard.tsx @ts-nocheck | Remove type suppression | Blocks VIP portal |
| Fix Invoices.tsx @ts-nocheck | Remove type suppression | Blocks invoicing |

---

## 🟡 P1 - HIGH PRIORITY (This Week)

### High Priority Bugs

| Task ID | Description | File |
|---------|-------------|------|
| BUG-045 | Order Creator: Retry resets entire form | `OrderCreatorPage.tsx` |
| BUG-046 | Settings Users tab misleading auth error | `server/_core/trpc.ts` |
| BUG-047 | Spreadsheet View shows empty grid | `spreadsheetViewService.ts` |
| BUG-048 | ClientsListPage Retry resets filters | `ClientsListPage.tsx` |
| BUG-049 | Live Catalog SQL injection risk | `liveCatalogService.ts` |
| BUG-050 | AuditModal unsafe .map() calls | `AuditModal.tsx` |
| BUG-051 | Permission middleware generic errors | `permissionMiddleware.ts` |
| BUG-052 | Tag Management empty array SQL | `tagManagementService.ts` |
| BUG-053 | Credit Engine empty session IDs | `creditEngine-patch.ts` |
| BUG-028 | Batch Form Input Fields Non-Functional | Inventory |
| BUG-029 | New Invoice Button Non-Functional | Invoices |
| BUG-030 | Payment Record Navigation Broken | Payments |
| BUG-038 | Generate Credit Limit Button Non-Functional | Clients |
| BUG-039 | Client Profile COGS Configuration Duplication | Clients |

### High Priority QA Issues

| Task ID | Description | Module |
|---------|-------------|--------|
| QA-006 | Dashboard - Vendors Button 404 | Dashboard |
| QA-007 | Dashboard - Purchase Orders Button 404 | Dashboard |
| QA-008 | Dashboard - Returns Button 404 | Dashboard |
| QA-009 | Dashboard - Locations Button 404 | Dashboard |
| QA-010 | Inventory - Export CSV Button | Inventory |
| QA-011 | Orders - Export CSV Button | Orders |
| QA-012 | Global Search Functionality | Navigation |
| QA-054 | Implement Vendor Supply Management Backend | Vendors |
| QA-057 | Implement CRM Sub-Features | CRM |
| QA-058 | Fix Quote Creation and Sales Features | Sales |
| QA-059 | Implement Missing Accounting Pages | Accounting |
| QA-061 | Fix Returns Processing Modal | Returns |

### High Priority Features

| Task ID | Description | Est. Hours |
|---------|-------------|------------|
| FEATURE-008 | System-Wide Advanced Filtering & Sorting | 16-24 |
| FEATURE-009 | Enhanced Role-Based Access Control (RBAC) | 24-40 |

---

## 🟢 P2 - MEDIUM PRIORITY (This Month)

### Medium Priority Bugs

| Task ID | Description | File |
|---------|-------------|------|
| BUG-054 | AppointmentRequestsList unsafe .map() | `AppointmentRequestsList.tsx` |
| BUG-055 | TimeOffRequestsList unsafe .map() | `TimeOffRequestsList.tsx` |
| BUG-056 | Dashboard widgets unsafe .map() calls | `widgets-v2/` |
| BUG-057 | Search inconsistency (inventory vs global) | `search.ts` |
| BUG-058 | Auth helpers silent null return | `authHelpers.ts` |
| BUG-059 | Inventory utils silent empty return | `inventoryUtils.ts` |
| BUG-060 | Audit router silent empty array | `audit.ts` |
| BUG-011 | Debug Dashboard Visible in Production | Orders.tsx |
| BUG-012 | Add Item Button Not Responding on Create Order | OrderCreator |
| BUG-017 | Inconsistent Layout Between Dashboard and Module Pages | Layout |

### Medium Priority QA Issues

| Task ID | Description | Module |
|---------|-------------|--------|
| QA-013 | Workflow Queue - Analytics Button 404 | Workflow |
| QA-014 | Workflow Queue - History Button 404 | Workflow |
| QA-055 | Fix Help & Documentation Search | Help |
| QA-056 | Implement Advanced Todo List Features | Todo |
| QA-060 | Implement VIP Portal Configuration | VIP Portal |
| QA-064 | Fix Credit Management Dashboard Widgets | Credits |
| QA-067 | Implement CRM Communication Features | CRM |
| QA-068 | Implement Client Purchase History View | Clients |
| QA-070 | Implement Missing Accounting Reports | Accounting |
| QA-071 | Add Batch Location Management | Inventory |
| QA-075 | SKU Photo Management with Media Classification | Photography |

### Medium Priority Features

| Task ID | Description | Est. Hours |
|---------|-------------|------------|
| FEATURE-005 | Unit Tracking with QR Codes & NFC Tags | 40-60 |
| FEATURE-006 | VIP Portal Client Booking System | 24-40 |
| FEATURE-007 | Calendar Buffer Times & Appointment Spacing | 16-24 |
| FEATURE-010 | Accounting-Calendar Integration & Cash Flow | 24-40 |
| FEATURE-020 | Tags System Revamp & Auto-Tagging Rules | 16-24 |

### Infrastructure & Cleanup

| Task ID | Description | Priority |
|---------|-------------|----------|
| FIX-012-003 | Add audit log retention policy | P2 |
| ST-007 | Implement System-Wide Pagination | P2 |
| ST-018 | Add API Rate Limiting | P2 |
| ST-024 | Harden SKIP_SEEDING Bypass | P2 |
| ST-025 | Add Integration Tests | P2 |
| RF-002 | Implement Dashboard Pagination | P2 |
| RF-004 | Add React.memo to Components | P2 |
| RF-005 | Refactor Oversized Files | P2 |

---

## 🔵 P3 - LOW PRIORITY (Backlog)

### Low Priority Bugs (Missing Empty States)

| Task ID | Description | File |
|---------|-------------|------|
| BUG-061 | AnalyticsPage missing empty state | `AnalyticsPage.tsx` |
| BUG-062 | CalendarPage missing empty state | `CalendarPage.tsx` |
| BUG-063 | NotificationsPage missing empty state | `NotificationsPage.tsx` |
| BUG-064 | PhotographyPage missing empty state | `PhotographyPage.tsx` |
| BUG-065 | PickPackPage missing empty state | `PickPackPage.tsx` |
| BUG-066 | ProductsPage missing empty state | `ProductsPage.tsx` |
| BUG-067 | SampleManagement missing empty state | `SampleManagement.tsx` |
| BUG-068 | Generic "Unauthorized" errors in accounting | `accounting.ts` |
| BUG-069 | Calendar "Permission denied" without details | `calendar.ts` |

### Low Priority QA Issues

| Task ID | Description | Module |
|---------|-------------|--------|
| QA-065 | Implement Missing Dashboard Features | Dashboard |
| QA-072 | Implement VIP Portal Branding Settings | VIP Portal |
| QA-073 | Implement Help Video Tutorials | Help |
| QA-074 | Implement Todo Task Activity History | Todo |

### Low Priority Features

| Task ID | Description | Est. Hours |
|---------|-------------|------------|
| FEATURE-019 | Signal Messaging System | 40-60 |
| FEATURE-022 | Multi-Role Responsibility-Based Notifications | 24-40 |
| UX-016 | Redesign Right Side Drawer (Sheet) Component | 8-16 |

### Cleanup & Long-Term

| Task ID | Description | Priority |
|---------|-------------|----------|
| CLEANUP-012-001 | Remove old impersonation code entirely | P3 |
| CLEANUP-012-002 | Add database migration to CI/CD pipeline | P3 |
| CLEANUP-012-003 | Add monitoring for impersonation sessions | P3 |
| CI-001 | Convert TODOs to Backlog Tickets | P3 |
| CI-002 | Complete Incomplete Features | P3 |
| CI-003 | Improve Test Coverage | P3 |

---

## Lifecycle Completion Tasks

### Wave 0: Foundation (BLOCKING)
**Goal:** Remove all @ts-nocheck from core workflow pages

| File | Lifecycle | Est. Hours |
|------|-----------|------------|
| `Inventory.tsx` | Inventory Intake | 2-4 |
| `OrderCreatorPage.tsx` | Sales Cycle | 2-4 |
| `VIPDashboard.tsx` | VIP Portal | 2-4 |
| `Invoices.tsx` | Financial Close | 2-4 |

### Wave 1: Complete Sales Lifecycle
| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix UnifiedSalesPortalPage | Remove @ts-nocheck | 3-4 |
| Verify Quote → Order flow | E2E test | 2-3 |
| Verify Order → Invoice flow | E2E test | 2-3 |
| Verify Invoice → Payment flow | E2E test | 2-3 |

### Wave 2: Complete VIP Portal Lifecycle
| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix VIPDashboard components | All child components | 4-6 |
| Test catalog browsing | Mobile-responsive | 2-3 |
| Test order placement | From VIP portal | 3-4 |
| Mobile responsiveness audit | All VIP pages | 3-4 |

### Wave 3: Complete Inventory Lifecycle
| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix PhotographyPage | Remove @ts-nocheck | 3-4 |
| Verify intake flow | Vendor → Batch | 2-3 |
| Verify photography flow | Batch → Photos | 2-3 |
| Verify publish flow | Batch → Live catalog | 2-3 |

### Wave 4: Complete Operations Lifecycle
| Task | Description | Est. Hours |
|------|-------------|------------|
| Fix NotificationsPage | Remove @ts-nocheck | 2-3 |
| Fix NotificationPreferences | Remove @ts-nocheck | 2-3 |
| Verify calendar → notification flow | Reminders work | 2-3 |

---

## Recommended Execution Order

### Sprint 1 (Week 1): Critical Bug Fixes
1. **BUG-040**: Order Creator inventory loading (blocks sales)
2. **BUG-041**: Batch Detail View crash (blocks inventory)
3. **BUG-042**: Global Search (core functionality)
4. **BUG-043/044**: Empty array SQL crashes (stability)
5. **QA-005**: Systemic data access issues

### Sprint 2 (Week 2): Lifecycle Foundation
1. Remove @ts-nocheck from Inventory.tsx
2. Remove @ts-nocheck from OrderCreatorPage.tsx
3. Remove @ts-nocheck from VIPDashboard.tsx
4. Remove @ts-nocheck from Invoices.tsx

### Sprint 3 (Week 3): High Priority UX
1. **BUG-045-053**: All P1 bugs
2. **QA-006-012**: Dashboard 404s and exports
3. E2E workflow verification

### Sprint 4 (Week 4): Feature Completion
1. **FEATURE-008**: Advanced Filtering & Sorting
2. **FEATURE-009**: Enhanced RBAC
3. Missing backend implementations (QA-051-061)

### Ongoing: Backlog
- P2/P3 bugs as time permits
- Feature enhancements
- Code cleanup

---

## Effort Estimates

| Category | Tasks | Est. Hours |
|----------|-------|------------|
| P0 Critical Bugs | 15 | 40-60 |
| P1 High Priority | 25 | 80-120 |
| P2 Medium Priority | 40 | 120-180 |
| P3 Low Priority | 40+ | 100-150 |
| Lifecycle Waves | 4 | 78-123 |
| **Total** | **120+** | **418-633** |

**Calendar Time:** 8-12 weeks with 2-3 developers

---

## Success Metrics

### Week 1 Success
- [ ] All P0 bugs fixed
- [ ] Order creation works end-to-end
- [ ] Batch detail view doesn't crash
- [ ] Search returns results

### Week 2 Success
- [ ] No @ts-nocheck in core pages
- [ ] `pnpm check` passes with 0 errors
- [ ] Sales lifecycle complete

### Week 4 Success
- [ ] All P1 bugs fixed
- [ ] VIP Portal lifecycle complete
- [ ] Inventory lifecycle complete

### Month 1 Success
- [ ] All P2 bugs fixed
- [ ] 80%+ test coverage on business logic
- [ ] All core features working

---

## References

- **Root Cause Analysis:** `test-flows/ROOT_CAUSE_ANALYSIS.md`
- **Additional Bugs:** `test-flows/ADDITIONAL_BUGS_FOUND.md`
- **Test Results:** `test-flows/TEST_RESULTS.md`
- **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`
- **QA Backlog:** `docs/roadmaps/QA_TASKS_BACKLOG.md`
- **Lifecycle Roadmap:** `docs/roadmaps/LIFECYCLE_ROADMAP_Q1_2026.md`

---

*Generated by Manus AI Agent - January 7, 2026*
