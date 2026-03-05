# 📋 TERP Technical Debt Registry

**Last Reviewed**: 2025-12-19  
**Next Review**: 2025-12-27 (Weekly Friday)

---

## How to Use This File

1. **When taking a shortcut**: Add entry to "Active Technical Debt"
2. **When fixing debt**: Move to "Resolved Technical Debt" with resolution notes
3. **Weekly review (Friday)**: Check if any "Harden by" conditions are met
4. **Before releases**: Address all 🔴 HIGH risk items

**Related Protocol**: `.kiro/steering/11-mvp-iteration-protocol.md`

---

## Risk Levels

| Level     | Definition                                  | Action Required          |
| --------- | ------------------------------------------- | ------------------------ |
| 🔴 HIGH   | Data loss, security issue, major UX problem | Fix within 1 week        |
| 🟡 MEDIUM | Problems at scale, degraded experience      | Fix before threshold hit |
| 🟢 LOW    | Minor inconvenience, cosmetic, unlikely     | Fix when convenient      |

---

## Active Technical Debt

### Template (copy for new entries)

```markdown
### [DEBT-XXX] Brief description

- **Feature**: Module/feature name
- **Maturity**: 🧪 EXPERIMENTAL / 🔨 FUNCTIONAL / 🏛️ HARDENED
- **Shortcut**: What was skipped or done quickly
- **Risk**: 🔴 HIGH / 🟡 MEDIUM / 🟢 LOW - Explanation
- **Harden by**: Specific trigger (e.g., "Before 500 clients", "Before launch")
- **Effort**: Estimated hours to fix
- **Created**: YYYY-MM-DD
- **Owner**: (optional) Who should fix this
```

---

### Active Items

### [DEBT-001] Redundant clients.list queries across pages

- **Feature**: Multiple pages (Orders, Quotes, PurchaseOrders, SalesSheetCreator, OrderCreator)
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Each page fetches `trpc.clients.list.useQuery({ limit: 1000 })` independently
- **Risk**: 🟡 MEDIUM - Redundant API calls, increased server load, slower page loads
- **Harden by**: Before 100+ concurrent users
- **Effort**: 2h - Migrate pages to use `useClientsData` hook (hook already created)
- **Created**: 2025-12-22
- **Notes**:
  - Found in Orders.tsx, Quotes.tsx, PurchaseOrdersPage.tsx, SalesSheetCreatorPage.tsx, OrderCreatorPage.tsx
  - **SOLUTION CREATED**: `client/src/hooks/useClientsData.ts` provides shared hook with caching
  - Migration: Replace `trpc.clients.list.useQuery({ limit: 1000 })` with `useClientsData()`
  - React Query already deduplicates concurrent requests, but hook provides consistent interface

### [DEBT-002] z.any() usage in configuration.ts router

- **Feature**: Configuration router
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for config values and validation input
- **Risk**: 🟢 LOW - Internal admin endpoint, not user-facing
- **Harden by**: Before exposing configuration API externally
- **Effort**: 2h - Replace with configValueSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-003] z.any() usage in orderEnhancements.ts router

- **Feature**: Order enhancements (recurring orders)
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for orderTemplate field
- **Risk**: 🟢 LOW - Template structure is flexible by design
- **Harden by**: Before recurring orders feature goes to production
- **Effort**: 2h - Replace with orderTemplateSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-004] z.any() usage in clientNeedsEnhanced.ts router

- **Feature**: Client needs matching
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for matches array
- **Risk**: 🟢 LOW - Internal matching logic
- **Harden by**: Before marketplace feature launch
- **Effort**: 2h - Replace with matchRecordsArraySchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-005] z.any() usage in dashboard.ts router

- **Feature**: Dashboard widgets
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for widget config
- **Risk**: 🟢 LOW - Internal dashboard configuration
- **Harden by**: Before dashboard customization feature launch
- **Effort**: 1h - Replace with dashboardWidgetConfigSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-006] z.any() usage in freeformNotes.ts router

- **Feature**: Freeform notes (rich text)
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for rich text content
- **Risk**: 🟢 LOW - Content is sanitized on display
- **Harden by**: Before notes feature goes to production
- **Effort**: 2h - Replace with noteContentSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-007] z.any() usage in inventory.ts router (saved filters)

- **Feature**: Inventory saved filters
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for filter JSON object
- **Risk**: 🟢 LOW - Internal filter storage
- **Harden by**: Before saved filters feature launch
- **Effort**: 1h - Replace with savedFilterSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

### [DEBT-008] z.any() usage in clients.ts router (metadata)

- **Feature**: Client transactions metadata
- **Maturity**: 🔨 FUNCTIONAL
- **Shortcut**: Uses `z.any()` for transaction metadata
- **Risk**: 🟢 LOW - Flexible metadata storage
- **Harden by**: Before client transactions feature hardening
- **Effort**: 1h - Replace with configObjectSchema from validationSchemas.ts
- **Created**: 2025-12-22
- **Notes**: In FORBIDDEN files list (BUG-034 scope), defer until BUG-034 completes

---

## Resolved Technical Debt

### [DEBT-009] UI Dark Mode and Mobile Responsiveness Issues ✅

- **Resolved**: 2025-12-23
- **Resolution**: Comprehensive UI QA audit and fixes applied
- **Commits**: `9bbdcda5`
- **Original Issues**:
  - CalendarPage used hardcoded Tailwind colors breaking dark mode
  - Login page used raw HTML instead of shadcn/ui components
  - useMobile hook caused layout flash with undefined initial state
  - ClientProfilePage tabs overflowed on mobile screens
- **Fixes Applied**:
  - Replaced all hardcoded colors with design system tokens
  - Migrated Login to shadcn/ui components with dark mode support
  - Fixed useMobile hook initialization to prevent layout flash
  - Added horizontal scroll for ClientProfile tabs with scrollbar-hide utility
  - Added comprehensive responsive design patterns
- **Impact**: Improved mobile UX, dark mode support, and component consistency
- **Documentation**: `docs/UI_QA_AUDIT_REPORT.md`, `docs/TECHNICAL_IMPLEMENTATION_DETAILS.md`

<!-- Move resolved items here with resolution notes -->

### Template for resolved items

```markdown
### [DEBT-XXX] Brief description ✅

- **Resolved**: YYYY-MM-DD
- **Resolution**: How it was fixed
- **Commits**: `abc1234`
- **Original entry**: (copy from above)
```

---

_No resolved debt entries yet._

---

## Debt Metrics

| Metric                  | Current    | Target    |
| ----------------------- | ---------- | --------- |
| Total active debt items | 8          | < 20      |
| HIGH risk items         | 0          | 0         |
| MEDIUM risk items       | 1          | < 10      |
| LOW risk items          | 7          | -         |
| Resolved debt items     | 1          | -         |
| Oldest unresolved item  | 2025-12-22 | < 30 days |
| TODO comments in code   | 50         | < 30      |

---

## TODO Audit (QUAL-007)

**Last Audit**: 2026-01-02  
**Total TODOs Found**: 50

### P0 - Critical (Security/Data Integrity)

None found ✅

### P1 - Functional Bugs

None found ✅

### P2 - Performance Issues

| Location                      | TODO                                  | Priority | Notes                     |
| ----------------------------- | ------------------------------------- | -------- | ------------------------- |
| `server/dataCardMetricsDb.ts` | Add expirationDate to batches schema  | 🟡 P2    | Schema enhancement needed |
| `server/dataCardMetricsDb.ts` | Add expectedShipDate to orders schema | 🟡 P2    | Schema enhancement needed |

### P3 - Code Quality/Refactoring

| Location                                                   | TODO                                    | Priority | Notes                                    |
| ---------------------------------------------------------- | --------------------------------------- | -------- | ---------------------------------------- |
| `server/routers/clients.ts`                                | Implement proper soft delete            | 🟢 P3    | deletedAt column exists, needs migration |
| `server/routers/receipts.ts`                               | Integrate with email service            | 🟢 P3    | Feature enhancement                      |
| `server/routers/receipts.ts`                               | Integrate with SMS service              | 🟢 P3    | Feature enhancement                      |
| `server/_core/calendarJobs.ts`                             | Send alert to admin                     | 🟢 P3    | Notification enhancement                 |
| `server/ordersDb.ts`                                       | Create invoice (accounting integration) | 🟢 P3    | Integration work                         |
| `server/ordersDb.ts`                                       | Record cash payment                     | 🟢 P3    | Integration work                         |
| `server/ordersDb.ts`                                       | Update credit exposure                  | 🟢 P3    | Integration work                         |
| `server/inventoryDb.ts`                                    | Add deletedAt column to clients         | 🟢 P3    | Schema work                              |
| `server/services/vipPortalAdminService.ts`                 | Implement tier configuration            | 🟢 P3    | Feature work (2 occurrences)             |
| `server/services/notificationService.ts`                   | Implement actual notification delivery  | 🟢 P3    | Feature work                             |
| `server/services/liveCatalogService.ts`                    | Extract unique brands                   | 🟢 P3    | Feature enhancement                      |
| `server/services/liveCatalogService.ts`                    | Calculate price range                   | 🟢 P3    | Feature enhancement                      |
| `server/matchingEngineEnhanced.ts`                         | Get strainType from strain library      | 🟢 P3    | Data enhancement                         |
| `server/matchingEngineReverseSimplified.ts`                | Implement supplier supply logic         | 🟢 P3    | Feature work                             |
| `client/src/components/inventory/BatchDetailDrawer.tsx`    | Re-enable product relation (2x)         | 🟢 P3    | API enhancement                          |
| `client/src/components/inventory/BatchDetailDrawer.tsx`    | Calculate from profitability data       | 🟢 P3    | Calculation fix                          |
| `client/src/components/inventory/ClientInterestWidget.tsx` | Navigate to client page                 | 🟢 P3    | UX enhancement                           |

### P4 - Nice-to-Have/Test Improvements

| Location                                                          | TODO                                   | Priority | Notes                 |
| ----------------------------------------------------------------- | -------------------------------------- | -------- | --------------------- |
| `server/routers/rbac-permissions.test.ts`                         | Fix mock chain (4 occurrences)         | 🟢 P4    | Test improvement      |
| `server/routers/rbac-roles.test.ts`                               | Fix mock chain (4 occurrences)         | 🟢 P4    | Test improvement      |
| `server/_core/index.ts`                                           | Fix schema drift and re-enable seeding | 🟢 P4    | Seeding improvement   |
| `server/db.ts`                                                    | Add feature queries                    | 🟢 P4    | Documentation         |
| `server/scripts/seed-calendar-test-data.ts`                       | Create recurring events                | 🟢 P4    | Test data             |
| `scripts/seed-complete.ts`                                        | Fix schema definition                  | 🟢 P4    | Seeding               |
| `scripts/benchmark-api.ts`                                        | Replace with actual tRPC client        | 🟢 P4    | Benchmark improvement |
| `scripts/legacy/seed-realistic-main.ts`                           | Refunds transaction mapping (2x)       | 🟢 P4    | Legacy script         |
| `client/src/components/dashboard/widgets-v3/index.ts`             | Widgets migration                      | 🟢 P4    | Migration note        |
| `client/src/components/dashboard/widgets-v2/TemplateSelector.tsx` | Template ID                            | 🟢 P4    | Placeholder           |

### Non-Issue TODOs (Intentional/Naming)

| Location                            | Notes                                          |
| ----------------------------------- | ---------------------------------------------- |
| `server/todoTasksDb.ts`             | File name contains "TODO" - not a TODO comment |
| `server/todoListsDb.ts`             | File name contains "TODO" - not a TODO comment |
| `scripts/generators/lists-tasks.ts` | "TODO" is a valid task status enum value       |
| `scripts/seed-*.ts`                 | References to TODO LISTS/TASKS tables          |

### Summary

- **P0 (Critical)**: 0 items ✅
- **P1 (Functional)**: 0 items ✅
- **P2 (Performance)**: 2 items
- **P3 (Code Quality)**: ~20 items
- **P4 (Nice-to-Have)**: ~15 items
- **Non-Issues**: ~13 items

**Conclusion**: No critical or blocking TODOs. All remaining TODOs are enhancement requests or test improvements that can be addressed incrementally.

---

## Review Log

| Date       | Reviewer                 | Items Reviewed | Actions Taken                                                            |
| ---------- | ------------------------ | -------------- | ------------------------------------------------------------------------ |
| 2026-01-02 | Sprint D Agent           | 50 TODOs       | QUAL-007 TODO audit - categorized all TODOs, no P0/P1 issues found       |
| 2025-12-23 | UI QA Agent              | UI/UX issues   | Resolved DEBT-009: Dark mode, mobile responsiveness, component migration |
| 2025-12-22 | QUAL-002/DATA-004 Sprint | 8 items added  | Audit of z.any() usage and redundant queries                             |
| 2025-12-19 | System                   | Initial setup  | Created registry                                                         |

---

## Quick Commands

```bash
# Count active debt items
grep -c "### \[DEBT-" docs/TECHNICAL_DEBT.md

# Find HIGH risk items
grep -A5 "Risk.*HIGH" docs/TECHNICAL_DEBT.md

# Find items by feature
grep -A10 "Feature.*Orders" docs/TECHNICAL_DEBT.md
```
