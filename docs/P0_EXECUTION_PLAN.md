# P0 Critical Gap Remediation - Execution Plan

**Priority:** P0 (Critical)
**Estimated Total Effort:** 90-130 hours
**Created:** December 18, 2025
**Completed:** December 18, 2025
**Status:** ✅ ALL TASKS COMPLETE

---

## Executive Summary

This document outlines the complete execution plan for the P0 critical gap remediation sprint. The three P0 tasks have been analyzed for dependencies, conflicts, and optimal execution order. Each task has been broken down into atomic, verifiable steps.

---

## Table of Contents

1. [Dependency Analysis](#1-dependency-analysis)
2. [Optimal Execution Order](#2-optimal-execution-order)
3. [QA-053: Retrofit Architectural Fixes](#3-qa-053-retrofit-architectural-fixes-to-core-workflows)
4. [QA-052: System Settings Backend](#4-qa-052-implement-system-settings-backend)
5. [QA-051: Analytics & Reporting Backend](#5-qa-051-implement-analytics--reporting-backend)
6. [Risk Assessment](#6-risk-assessment)
7. [Progress Tracking](#7-progress-tracking)

---

## 1. Dependency Analysis

### 1.1 Current State Assessment

#### Foundational Components (Already Exist)

| Component | Location | Status |
|-----------|----------|--------|
| `useAppMutation` | `client/src/hooks/useAppMutation.ts` | ✅ Fully implemented |
| `FormSubmitButton` | `client/src/components/ui/FormSubmitButton.tsx` | ✅ Fully implemented |
| Analytics Router | `server/routers/analytics.ts` | ⚠️ Partial (summary only) |
| Settings Router | `server/routers/settings.ts` | ⚠️ Partial (no system settings) |

#### Components Needing Retrofit (QA-053)

| Component | File | Current State | Issue |
|-----------|------|---------------|-------|
| AddClientWizard | `client/src/components/clients/AddClientWizard.tsx` | Direct mutation | No useAppMutation, silent failures |
| PurchaseModal | `client/src/components/inventory/PurchaseModal.tsx` | Direct mutation | Manual error handling, no FormSubmitButton |
| Quotes | `client/src/pages/Quotes.tsx` | Direct mutation | No useAppMutation for convertToSale |
| PurchaseOrdersPage | `client/src/pages/PurchaseOrdersPage.tsx` | Direct mutations | No useAppMutation, no FormSubmitButton |

#### Missing Components (QA-052)

| Component | Status | Notes |
|-----------|--------|-------|
| `system_settings` table | ❌ Missing | Needs to be created in schema.ts |
| `getSystemSettings` procedure | ❌ Missing | Needs router implementation |
| `updateSystemSettings` procedure | ❌ Missing | Needs router implementation |
| System Settings UI | ❌ Missing | Needs new tab in Settings.tsx |

#### Missing Components (QA-051)

| Component | Status | Notes |
|-----------|--------|-------|
| `getSalesAnalytics` | ❌ Missing | Date range, aggregations |
| `getInventoryAnalytics` | ❌ Missing | Stock levels, turnover |
| `getClientAnalytics` | ❌ Missing | Purchase patterns |
| CSV Export | ❌ Missing | Download functionality |
| Charts/Visualizations | ❌ Missing | Recharts integration |

### 1.2 Dependency Graph

```
┌─────────────────────────────────────────────────────────────────────────┐
│                     DEPENDENCY GRAPH                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │  QA-053: Retrofit Architectural Fixes (30-40h)                  │    │
│  │  ────────────────────────────────────────────────               │    │
│  │  • Blocks: QA-052, QA-051                                       │    │
│  │  • Depends on: None (FOUNDATIONAL)                              │    │
│  │  • Files: AddClientWizard, PurchaseModal, Quotes, PO Page       │    │
│  │  • Status: NOT STARTED                                          │    │
│  └─────────────────────────┬───────────────────────────────────────┘    │
│                            │                                             │
│              ┌─────────────┴─────────────┐                              │
│              ▼                           ▼                              │
│  ┌───────────────────────┐   ┌───────────────────────────┐             │
│  │ QA-052: System        │   │ QA-051: Analytics &       │             │
│  │ Settings (20-30h)     │   │ Reporting (40-60h)        │             │
│  │ ──────────────────    │   │ ────────────────────      │             │
│  │ • Blocks: None        │   │ • Blocks: None            │             │
│  │ • Depends on: QA-053  │   │ • Depends on: QA-053      │             │
│  │ • New DB table        │   │ • New analytics procs     │             │
│  │ • New router procs    │   │ • Charts integration      │             │
│  │ • Settings form       │   │ • CSV export              │             │
│  │ • Status: NOT STARTED │   │ • Status: NOT STARTED     │             │
│  └───────────────────────┘   └───────────────────────────┘             │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.3 Shared Files Analysis

| File | QA-053 | QA-052 | QA-051 | Conflict Risk |
|------|--------|--------|--------|---------------|
| `drizzle/schema.ts` | ❌ | ✅ (new table) | ❌ | Low |
| `server/routers/settings.ts` | ❌ | ✅ (new procs) | ❌ | Low |
| `server/routers/analytics.ts` | ❌ | ❌ | ✅ (new procs) | Low |
| `client/src/pages/Settings.tsx` | ❌ | ✅ (new tab) | ❌ | Low |
| `client/src/pages/AnalyticsPage.tsx` | ❌ | ❌ | ✅ (replace placeholders) | Low |
| `AddClientWizard.tsx` | ✅ | ❌ | ❌ | None |
| `PurchaseModal.tsx` | ✅ | ❌ | ❌ | None |

**Conclusion:** No file conflicts detected. Tasks can proceed sequentially without merge conflicts.

---

## 2. Optimal Execution Order

### Execution Sequence

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    OPTIMAL EXECUTION ORDER                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  PHASE 1: Foundation (Week 1)                                           │
│  ════════════════════════════                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🔴 QA-053: Retrofit Architectural Fixes                         │   │
│  │ Estimated: 30-40 hours                                          │   │
│  │ Rationale: Establishes consistent patterns for all forms        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  PHASE 2: Build-Out (Week 2)                                           │
│  ═══════════════════════════                                           │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🟠 QA-052: System Settings Backend                              │   │
│  │ Estimated: 20-30 hours                                          │   │
│  │ Rationale: Smaller scope, establishes settings infrastructure   │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                              │                                          │
│                              ▼                                          │
│  PHASE 3: Completion (Week 3-4)                                        │
│  ══════════════════════════════                                        │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │ 🟢 QA-051: Analytics & Reporting Backend                        │   │
│  │ Estimated: 40-60 hours                                          │   │
│  │ Rationale: Most complex, can leverage all prior patterns        │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Rationale for Execution Order

1. **QA-053 First:** The architectural retrofit establishes the error handling and loading state patterns that QA-052 will use. Starting here ensures consistency across all new forms.

2. **QA-052 Second:** System Settings is a simpler module that will serve as a "practice run" for the architectural patterns before tackling the more complex Analytics module.

3. **QA-051 Last:** Analytics & Reporting is the most complex task. By completing it last, we can leverage all established patterns and avoid any potential blockers from incomplete infrastructure.

---

## 3. QA-053: Retrofit Architectural Fixes to Core Workflows

**Priority:** P0 (Critical)
**Estimated Effort:** 30-40 hours
**Status:** 🔴 Not Started

### 3.1 Objective

Apply `useAppMutation` and `FormSubmitButton` to all broken core workflows to fix silent failures and provide consistent user experience.

### 3.2 Atomic Roadmap

#### Step 1: Retrofit AddClientWizard (6-8h)

**Action:** Update `AddClientWizard.tsx` to use `useAppMutation` and `FormSubmitButton`

**File:** `client/src/components/clients/AddClientWizard.tsx`

**Changes Required:**
1. Import `useAppMutation` from `@/hooks/useAppMutation`
2. Import `FormSubmitButton` from `@/components/ui/FormSubmitButton`
3. Wrap `createClientMutation` with `useAppMutation`:
   ```typescript
   const createClientMutation = trpc.clients.create.useMutation();
   const { mutate, isPending, fieldErrors } = useAppMutation(createClientMutation, {
     successMessage: "Client created successfully",
     onSuccess: (data) => {
       onOpenChange(false);
       resetForm();
       if (onSuccess && data) onSuccess(data as number);
     },
   });
   ```
4. Replace submit button with `FormSubmitButton`
5. Display field-level errors for teriCode and name fields

**Verification:**
- [ ] Create client with invalid data → field-level errors displayed
- [ ] Create client with duplicate TERI code → error toast shown
- [ ] Create client successfully → success toast shown
- [ ] Loading spinner appears during submission
- [ ] Double-click prevention works

---

#### Step 2: Retrofit PurchaseModal (6-8h)

**Action:** Update `PurchaseModal.tsx` to use `useAppMutation` and `FormSubmitButton`

**File:** `client/src/components/inventory/PurchaseModal.tsx`

**Changes Required:**
1. Import `useAppMutation` and `FormSubmitButton`
2. Wrap `createPurchaseMutation` with `useAppMutation`
3. Remove manual toast calls from onSuccess/onError
4. Replace submit button with `FormSubmitButton`
5. Handle `uploadMediaMutation` with separate `useAppMutation` wrapper

**Verification:**
- [ ] Submit with missing required fields → field errors shown
- [ ] Submit successfully → success toast shown
- [ ] Media upload error → error toast shown
- [ ] Loading spinner appears during submission
- [ ] Button disabled during submission

---

#### Step 3: Retrofit Quotes Page (4-6h)

**Action:** Update quote conversion in `Quotes.tsx` to use `useAppMutation`

**File:** `client/src/pages/Quotes.tsx`

**Changes Required:**
1. Import `useAppMutation` and `FormSubmitButton`
2. Wrap `convertToSale` mutation with `useAppMutation`:
   ```typescript
   const convertToSaleMutation = trpc.orders.convertQuoteToSale.useMutation();
   const { mutate: convertToSale, isPending: isConverting } = useAppMutation(
     convertToSaleMutation, {
       successMessage: "Quote converted to sale successfully",
       onSuccess: () => {
         refetch();
         setSelectedQuote(null);
       },
     }
   );
   ```
3. Replace "Convert to Sale" button with `FormSubmitButton`
4. Remove manual try/catch and toast calls

**Verification:**
- [ ] Convert quote → success toast shown
- [ ] Conversion error → error toast shown
- [ ] Loading state on button during conversion
- [ ] Button disabled during conversion

---

#### Step 4: Retrofit PurchaseOrdersPage (8-10h)

**Action:** Update PO creation and deletion in `PurchaseOrdersPage.tsx` to use `useAppMutation` and `FormSubmitButton`

**File:** `client/src/pages/PurchaseOrdersPage.tsx`

**Changes Required:**
1. Import `useAppMutation` and `FormSubmitButton`
2. Wrap `createPO` mutation:
   ```typescript
   const createPOMutation = trpc.purchaseOrders.create.useMutation();
   const { mutate: handleCreatePO, isPending: isCreating, fieldErrors } = useAppMutation(
     createPOMutation, {
       successMessage: "Purchase order created successfully",
       onSuccess: () => {
         refetch();
         setIsCreateDialogOpen(false);
         resetForm();
       },
     }
   );
   ```
3. Wrap `deletePO` mutation similarly
4. Replace both submit buttons with `FormSubmitButton`
5. Remove manual toast calls

**Verification:**
- [ ] Create PO with missing fields → validation errors shown
- [ ] Create PO successfully → success toast
- [ ] Delete PO → confirmation works, success toast
- [ ] Loading states on all buttons
- [ ] Field-level errors displayed

---

#### Step 5: Integration Testing & Documentation (4-6h)

**Action:** Run comprehensive tests and document the retrofit

**Tasks:**
1. Run `pnpm check` - ensure no TypeScript errors
2. Run `pnpm test` - ensure all tests pass
3. Manual testing of all retrofitted forms
4. Update component documentation with usage examples
5. Create migration guide for future forms

**Verification:**
- [ ] TypeScript compilation: zero errors
- [ ] All existing tests pass
- [ ] Manual testing checklist complete
- [ ] Documentation updated

---

## 4. QA-052: Implement System Settings Backend

**Priority:** P0 (Critical)
**Estimated Effort:** 20-30 hours
**Status:** 🔴 Not Started
**Depends On:** QA-053

### 4.1 Objective

Implement backend and frontend for System Settings module, allowing administrators to configure company information, system defaults, and integrations.

### 4.2 Atomic Roadmap

#### Step 1: Create Database Schema (2-3h)

**Action:** Add `system_settings` table to schema

**File:** `drizzle/schema.ts`

**Schema Definition:**
```typescript
export const systemSettings = mysqlTable("system_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value"),
  dataType: varchar("data_type", { length: 50 }).notNull().default("string"),
  category: varchar("category", { length: 50 }).notNull().default("general"),
  description: varchar("description", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

**Default Settings to Seed:**
- `company_name` (string, general)
- `company_address` (string, general)
- `company_phone` (string, general)
- `company_email` (string, general)
- `default_currency` (string, defaults) - default: "USD"
- `default_timezone` (string, defaults) - default: "America/New_York"
- `tax_rate` (number, financial) - default: 0
- `invoice_prefix` (string, financial) - default: "INV-"
- `quote_validity_days` (number, quotes) - default: 30

**Verification:**
- [ ] Migration runs successfully
- [ ] Table exists in database
- [ ] Default settings are seeded

---

#### Step 2: Create Backend Router Procedures (4-6h)

**Action:** Add system settings procedures to settings router

**File:** `server/routers/settings.ts`

**New Procedures:**
```typescript
// Get all system settings
getSystemSettings: protectedProcedure
  .use(requirePermission("settings:read"))
  .query(async () => { ... });

// Get settings by category
getSystemSettingsByCategory: protectedProcedure
  .use(requirePermission("settings:read"))
  .input(z.object({ category: z.string() }))
  .query(async ({ input }) => { ... });

// Update a single setting
updateSystemSetting: protectedProcedure
  .use(requirePermission("settings:update"))
  .input(z.object({
    key: z.string(),
    value: z.string(),
  }))
  .mutation(async ({ input }) => { ... });

// Bulk update settings
updateSystemSettings: protectedProcedure
  .use(requirePermission("settings:update"))
  .input(z.array(z.object({
    key: z.string(),
    value: z.string(),
  })))
  .mutation(async ({ input }) => { ... });
```

**Verification:**
- [ ] API returns all settings
- [ ] API filters by category
- [ ] Update single setting works
- [ ] Bulk update works
- [ ] Permission checks enforced

---

#### Step 3: Create Unit Tests for Router (3-4h)

**Action:** Write comprehensive tests for settings procedures

**File:** `server/routers/settings.test.ts` (extend existing)

**Test Cases:**
- [ ] `getSystemSettings` returns all settings
- [ ] `getSystemSettingsByCategory` filters correctly
- [ ] `updateSystemSetting` updates value
- [ ] `updateSystemSettings` bulk updates
- [ ] Unauthorized access denied
- [ ] Invalid input validation

---

#### Step 4: Build Frontend System Settings Tab (6-8h)

**Action:** Add System Settings tab to Settings page

**File:** `client/src/pages/Settings.tsx`

**Components to Create:**
1. `SystemSettingsTab` component
2. Settings form with sections:
   - Company Information (name, address, phone, email)
   - System Defaults (currency, timezone)
   - Financial Settings (tax rate, invoice prefix)
   - Quote Settings (validity days)

**Implementation Requirements:**
- Use `useAppMutation` for form submission
- Use `FormSubmitButton` for save button
- Show loading state during save
- Display success/error toasts
- Form validation with field errors

**Verification:**
- [ ] Tab appears in Settings page
- [ ] Settings load on page open
- [ ] Save button shows loading state
- [ ] Changes persist after save
- [ ] Error handling works correctly

---

#### Step 5: Integration Testing (2-3h)

**Action:** End-to-end testing of System Settings

**Tasks:**
1. Navigate to Settings → System Settings tab
2. Update company name → Save → Refresh → Verify persists
3. Update currency → Save → Verify format changes
4. Test validation (empty required fields)
5. Test error handling (network failure)

**Verification:**
- [ ] All CRUD operations work
- [ ] Validation prevents invalid data
- [ ] Error messages are clear
- [ ] Data persists correctly

---

## 5. QA-051: Implement Analytics & Reporting Backend

**Priority:** P0 (Critical)
**Estimated Effort:** 40-60 hours
**Status:** 🔴 Not Started
**Depends On:** QA-053

### 5.1 Objective

Implement comprehensive analytics backend with sales, inventory, and client analytics, including date range filtering and CSV export functionality.

### 5.2 Atomic Roadmap

#### Step 1: Design Analytics Data Models (2-3h)

**Action:** Define TypeScript interfaces for analytics responses

**File:** `server/types/analytics.ts` (new file)

**Interfaces:**
```typescript
interface DateRange {
  startDate: Date;
  endDate: Date;
}

interface SalesAnalytics {
  revenue: number;
  orderCount: number;
  averageOrderValue: number;
  topProducts: ProductStat[];
  revenueByDay: DailyRevenue[];
  revenueByCategory: CategoryRevenue[];
}

interface InventoryAnalytics {
  totalItems: number;
  totalValue: number;
  lowStockItems: LowStockItem[];
  stockByCategory: CategoryStock[];
  turnoverRate: number;
}

interface ClientAnalytics {
  totalClients: number;
  newClientsThisPeriod: number;
  topClients: TopClient[];
  clientsByType: ClientTypeBreakdown[];
  retentionRate: number;
}
```

**Verification:**
- [ ] All types are properly defined
- [ ] Types match database structure
- [ ] Export types for frontend use

---

#### Step 2: Implement Sales Analytics Backend (8-10h)

**Action:** Create `getSalesAnalytics` procedure

**File:** `server/routers/analytics.ts`

**Procedure:**
```typescript
getSalesAnalytics: protectedProcedure
  .use(requirePermission("analytics:read"))
  .input(z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .query(async ({ input }) => {
    // Query orders within date range
    // Aggregate revenue, order count
    // Calculate average order value
    // Get top products by revenue
    // Get daily revenue breakdown
    // Get revenue by category
  });
```

**Database Queries:**
- Total revenue from orders
- Order count
- Revenue grouped by day
- Revenue grouped by category
- Top 10 products by revenue

**Verification:**
- [ ] Returns correct totals
- [ ] Date filtering works
- [ ] Top products sorted correctly
- [ ] Daily breakdown accurate

---

#### Step 3: Implement Inventory Analytics Backend (6-8h)

**Action:** Create `getInventoryAnalytics` procedure

**File:** `server/routers/analytics.ts`

**Procedure:**
```typescript
getInventoryAnalytics: protectedProcedure
  .use(requirePermission("analytics:read"))
  .input(z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .query(async ({ input }) => {
    // Total inventory items
    // Total inventory value
    // Low stock items (below threshold)
    // Stock grouped by category
    // Turnover rate calculation
  });
```

**Database Queries:**
- Count of active batches
- Sum of inventory value (quantity * cost)
- Batches with quantity below threshold
- Grouping by category
- Turnover calculation (sold / average inventory)

**Verification:**
- [ ] Item counts accurate
- [ ] Value calculations correct
- [ ] Low stock threshold works
- [ ] Category breakdown accurate

---

#### Step 4: Implement Client Analytics Backend (6-8h)

**Action:** Create `getClientAnalytics` procedure

**File:** `server/routers/analytics.ts`

**Procedure:**
```typescript
getClientAnalytics: protectedProcedure
  .use(requirePermission("analytics:read"))
  .input(z.object({
    startDate: z.date().optional(),
    endDate: z.date().optional(),
  }))
  .query(async ({ input }) => {
    // Total client count
    // New clients in period
    // Top clients by revenue
    // Client type breakdown
    // Retention rate
  });
```

**Database Queries:**
- Count of active clients
- Clients created within date range
- Clients ranked by order total
- Grouping by client type (buyer, seller, etc.)
- Retention calculation

**Verification:**
- [ ] Client counts accurate
- [ ] New client filter works
- [ ] Top clients sorted correctly
- [ ] Type breakdown accurate

---

#### Step 5: Implement CSV Export (4-6h)

**Action:** Add CSV export endpoints for all analytics

**File:** `server/routers/analytics.ts`

**Procedures:**
```typescript
exportSalesCSV: protectedProcedure
  .use(requirePermission("analytics:export"))
  .input(z.object({ startDate: z.date(), endDate: z.date() }))
  .mutation(async ({ input }) => {
    // Generate CSV string
    // Return base64 encoded data
  });

exportInventoryCSV: protectedProcedure...
exportClientCSV: protectedProcedure...
```

**Verification:**
- [ ] CSV downloads successfully
- [ ] Data matches UI
- [ ] Headers are correct
- [ ] Date range respected

---

#### Step 6: Build Sales Analytics UI (6-8h)

**Action:** Replace Sales tab placeholder with functional analytics

**File:** `client/src/pages/AnalyticsPage.tsx`

**Components:**
1. Date range picker
2. Summary cards (revenue, orders, AOV)
3. Revenue chart (line chart by day)
4. Top products table
5. Category breakdown (pie chart)
6. Export CSV button

**Libraries:**
- Recharts for visualizations
- react-day-picker for date range

**Verification:**
- [ ] Charts render correctly
- [ ] Date filter works
- [ ] Data refreshes on filter change
- [ ] Export button works

---

#### Step 7: Build Inventory Analytics UI (4-6h)

**Action:** Replace Inventory tab placeholder

**File:** `client/src/pages/AnalyticsPage.tsx`

**Components:**
1. Date range picker
2. Summary cards (items, value, turnover)
3. Low stock alerts table
4. Category breakdown chart
5. Export CSV button

**Verification:**
- [ ] All metrics display
- [ ] Low stock highlights correctly
- [ ] Charts accurate
- [ ] Export works

---

#### Step 8: Build Client Analytics UI (4-6h)

**Action:** Replace Clients tab placeholder

**File:** `client/src/pages/AnalyticsPage.tsx`

**Components:**
1. Date range picker
2. Summary cards (total, new, retention)
3. Top clients table
4. Client type breakdown chart
5. Export CSV button

**Verification:**
- [ ] All metrics display
- [ ] Top clients ranked correctly
- [ ] Charts accurate
- [ ] Export works

---

#### Step 9: Unit Tests for Analytics (4-6h)

**Action:** Write comprehensive tests

**File:** `server/routers/analytics.test.ts`

**Test Cases:**
- [ ] Sales analytics returns correct structure
- [ ] Date filtering works for all endpoints
- [ ] Empty date range returns all data
- [ ] CSV export generates valid data
- [ ] Permission checks enforced

---

#### Step 10: Integration Testing & Polish (4-6h)

**Action:** End-to-end testing and refinements

**Tasks:**
1. Test all analytics endpoints
2. Verify UI matches backend data
3. Test date range edge cases
4. Performance optimization
5. Error handling verification

**Verification:**
- [ ] All tabs functional
- [ ] Charts render without errors
- [ ] CSV exports correctly
- [ ] Loading states work
- [ ] Error messages clear

---

## 6. Risk Assessment

### High Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Database migration failure | Blocks QA-052 | Test migration locally first |
| Chart library compatibility | Delays QA-051 UI | Use proven Recharts library |
| Performance with large datasets | Slow analytics | Add pagination, caching |

### Medium Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Form validation conflicts | User confusion | Standardize validation patterns |
| Date range edge cases | Incorrect data | Comprehensive edge case testing |
| CSV export memory | Large file issues | Streaming/chunked export |

### Low Risk Items

| Risk | Impact | Mitigation |
|------|--------|------------|
| Minor UI inconsistencies | Visual bugs | Design system adherence |
| Test coverage gaps | Future regressions | Maintain 80%+ coverage |

---

## 7. Progress Tracking

### Overall Progress

| Task | Status | Progress | Completed |
|------|--------|----------|-----------|
| QA-053 | ✅ Complete | 100% | Dec 18, 2025 |
| QA-052 | ✅ Complete | 100% | Dec 18, 2025 |
| QA-051 | ✅ Complete | 100% | Dec 18, 2025 |

### Detailed Progress

#### QA-053 Progress (COMPLETED)
- [x] Step 1: AddClientWizard retrofit
- [x] Step 2: PurchaseModal retrofit
- [x] Step 3: Quotes page retrofit
- [x] Step 4: PurchaseOrdersPage retrofit
- [x] Step 5: Integration testing

#### QA-052 Progress (COMPLETED)
- [x] Step 1: Database schema (system_settings table)
- [x] Step 2: Backend procedures (systemSettingsRouter)
- [x] Step 3: Frontend UI (SystemSettingsManager component)
- [x] Step 4: Integration testing

#### QA-051 Progress (COMPLETED)
- [x] Step 1: Sales analytics backend (getSalesAnalytics)
- [x] Step 2: Inventory analytics backend (getInventoryAnalytics)
- [x] Step 3: Client analytics backend (getClientAnalytics)
- [x] Step 4: CSV export (exportSalesCSV, exportInventoryCSV, exportClientCSV)
- [x] Step 5: Sales analytics UI (SalesAnalyticsTab)
- [x] Step 6: Inventory analytics UI (InventoryAnalyticsTab)
- [x] Step 7: Client analytics UI (ClientAnalyticsTab)
- [x] Step 8: Integration testing

---

## Appendix A: Key File Locations

| Purpose | File Path |
|---------|-----------|
| useAppMutation hook | `client/src/hooks/useAppMutation.ts` |
| FormSubmitButton | `client/src/components/ui/FormSubmitButton.tsx` |
| Database schema | `drizzle/schema.ts` |
| Settings router | `server/routers/settings.ts` |
| Analytics router | `server/routers/analytics.ts` |
| Settings page | `client/src/pages/Settings.tsx` |
| Analytics page | `client/src/pages/AnalyticsPage.tsx` |
| Client wizard | `client/src/components/clients/AddClientWizard.tsx` |
| Purchase modal | `client/src/components/inventory/PurchaseModal.tsx` |
| Quotes page | `client/src/pages/Quotes.tsx` |
| PO page | `client/src/pages/PurchaseOrdersPage.tsx` |

---

## Appendix B: Commands Reference

```bash
# Start development
pnpm dev

# Run TypeScript check
pnpm check

# Run tests
pnpm test

# Run specific test file
pnpm test server/routers/analytics.test.ts

# Generate migration
pnpm drizzle-kit generate

# Run migration
pnpm drizzle-kit push

# Start task (TERP protocol)
pnpm start-task "QA-053"
```

---

**Document Version:** 1.0
**Last Updated:** December 18, 2025
**Author:** Claude Agent (P0 Sprint)
