# TERP: Default Values Implementation Roadmap

**Status:** Ready for Implementation  
**Specifications:** Complete  
**Created:** October 27, 2025

---

## Overview

This roadmap outlines the phased implementation of default values and related enhancements for the TERP ERP system. All user specifications have been collected and documented.

**Total Estimated Effort:** 18-22 days

---

## Phase 1: Master Data & Foundation (High Priority)

**Goal:** Establish foundational master data and seed scripts.

**Estimated Effort:** 3-4 days  
**Dependencies:** None

### Tasks

#### 1.1 Storage Locations Seeding
**Files to Create:**
- `scripts/seed-locations.ts`

**Implementation:**
```typescript
// Create default locations:
// - Main Warehouse > Zone A > Rack 1 > Shelf 1 > Bin 1
// - Main Warehouse > Zone B > Rack 1 > Shelf 1 > Bin 1
// - Main Warehouse > Zone C > Rack 1 > Shelf 1 > Bin 1
```

**Database:** `locations` table  
**UI Update:** Settings page - add "Restore Defaults" button

---

#### 1.2 Product Categories & Subcategories Seeding
**Files to Create:**
- `scripts/seed-categories.ts`

**Implementation:**
```typescript
// Categories:
// 1. Flower: Outdoor, Deps, Indoor, Smalls, Trim
// 2. Concentrates: Shatter, Wax, Live Resin, Rosin, Distillate, Crumble, Budder
// 3. Vapes: Cartridge, All in One
// 4. Bulk Oil (no subs)
// 5. Manufactured Products: Preroll, Edible, Tincture, Topical, Accessory
```

**Database:** `categories`, `subcategories` tables  
**UI Update:** Settings page - add "Restore Defaults" button

---

#### 1.3 Product Grades Seeding
**Files to Create:**
- `scripts/seed-grades.ts`

**Implementation:**
```typescript
// Grades: A (1), B (2), C (3), D (4)
// Descriptions: Top shelf, Mid-tier, Budget, Economy
```

**Database:** `grades` table  
**UI Update:** Settings page - add "Restore Defaults" button

---

#### 1.4 Expense Categories Seeding
**Files to Create:**
- `scripts/seed-expense-categories.ts`

**Implementation:**
```typescript
// Parent categories with children:
// - Rent/Lease
// - Utilities: Electricity, Water, Gas, Internet/Phone
// - Payroll/Wages: Salaries, Benefits, Payroll Taxes
// - Marketing/Advertising: Digital, Print, Events
// - Office Supplies
// - Insurance
// - Professional Services: Legal, Accounting, Consulting
// - Travel
// - Maintenance/Repairs
```

**Database:** `expenseCategories` table

---

#### 1.5 Chart of Accounts Seeding
**Files to Create:**
- `scripts/seed-chart-of-accounts.ts`

**Implementation:**
```typescript
// Simple, non-cannabis-specific structure:
// ASSETS: Cash (1000), AR (1100), Inventory (1200)
// LIABILITIES: AP (2000)
// EQUITY: Owner's Equity (3000), Retained Earnings (3100)
// REVENUE: Sales Revenue (4000)
// EXPENSES: COGS (5000), Operating Expenses (5100)
```

**Database:** `accounts` table

---

#### 1.6 Master Seed Script
**Files to Create:**
- `scripts/seed-all.ts`

**Implementation:**
- Call all individual seed scripts
- Add to database initialization process
- Support idempotent execution (don't duplicate data)

---

### Phase 1 Deliverables
- ✅ All master data tables populated with defaults
- ✅ Seed scripts integrated into database initialization
- ✅ "Restore Defaults" functionality in Settings page
- ✅ Documentation updated

---

## Phase 2: Database Schema Changes (High Priority)

**Goal:** Update database schema for simplified payment/banking and enhanced features.

**Estimated Effort:** 2-3 days  
**Dependencies:** None

### Tasks

#### 2.1 Payment Methods Enum Update
**Files to Modify:**
- `drizzle/schema.ts`

**Changes:**
```typescript
// OLD: ["CASH", "CHECK", "WIRE", "ACH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]
// NEW: ["CASH", "CRYPTO", "CUSTOM"]
```

**New Table:**
```typescript
export const customPaymentMethods = mysqlTable("customPaymentMethods", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

#### 2.2 Bank Account Type Enum Update
**Files to Modify:**
- `drizzle/schema.ts`

**Changes:**
```typescript
// OLD: ["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"]
// NEW: ["BANK", "CUSTOM"]
```

**New Table:**
```typescript
export const customBankAccountTypes = mysqlTable("customBankAccountTypes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

#### 2.3 Bank Transaction Type Enum Update
**Files to Modify:**
- `drizzle/schema.ts`

**Changes:**
```typescript
// OLD: ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"]
// NEW: ["DEPOSIT", "WITHDRAWAL"]
```

---

#### 2.4 COGS Adjustments Per Subcategory
**Files to Modify:**
- `drizzle/schema.ts`

**New Table:**
```typescript
export const clientCogsAdjustments = mysqlTable("clientCogsAdjustments", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  categoryId: int("categoryId").references(() => categories.id),
  subcategoryId: int("subcategoryId").references(() => subcategories.id),
  adjustmentType: cogsAdjustmentTypeEnum.notNull().default("FIXED_AMOUNT"),
  adjustmentValue: decimal("adjustmentValue", { precision: 10, scale: 4 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
```

---

#### 2.5 Enhanced Pricing Rules
**Files to Modify:**
- `drizzle/schema.ts`

**Changes:**
```typescript
// Add to pricingRules table:
conditions: json("conditions").$type<{
  products?: number[];
  categories?: number[];
  subcategories?: number[];
  tags?: string[];
  priceRangeMin?: number;
  priceRangeMax?: number;
  strains?: number[];
  brands?: number[];
  grades?: number[];
  vendors?: number[];
}>().notNull(),
```

---

#### 2.6 Enhanced Alert Configurations
**Files to Modify:**
- `drizzle/schema.ts`

**Changes:**
```typescript
// Add to alertConfigurations table:
thresholdType: mysqlEnum("threshold_type", ["UNITS", "VALUE"]).notNull(),
conditions: json("conditions").$type<{
  categories?: number[];
  subcategories?: number[];
  products?: number[];
  tags?: string[];
  priceRangeMin?: number;
  priceRangeMax?: number;
  strains?: number[];
  brands?: number[];
  grades?: number[];
  vendors?: number[];
}>(),
```

---

#### 2.7 Run Migrations
**Commands:**
```bash
pnpm db:push
```

---

### Phase 2 Deliverables
- ✅ Schema updated with simplified payment/banking enums
- ✅ Custom payment methods and bank account types supported
- ✅ COGS adjustments per subcategory supported
- ✅ Enhanced pricing rules with complex conditions
- ✅ Enhanced alert configurations with complex conditions
- ✅ All migrations applied successfully

---

## Phase 3: Inventory & Batch Management UX (High Priority)

**Goal:** Improve batch creation UX and auto-status updates.

**Estimated Effort:** 2 days  
**Dependencies:** Phase 2

### Tasks

#### 3.1 Batch Status - Remove Dropdown on Creation
**Files to Modify:**
- `client/src/components/inventory/PurchaseModal.tsx`

**Changes:**
- Remove status dropdown from batch creation form
- Auto-set status to "AWAITING_INTAKE" on creation
- Status only editable in EditBatchModal (not during creation)

---

#### 3.2 Batch Status - Auto-Update to SOLD_OUT
**Files to Modify:**
- `server/services/inventoryService.ts` (or wherever inventory updates occur)

**Implementation:**
```typescript
// After any inventory transaction:
if (batch.onHandQty === "0") {
  await updateBatchStatus(batch.id, "SOLD_OUT");
}
```

---

#### 3.3 COGS Mode Default
**Files to Modify:**
- `client/src/components/inventory/PurchaseModal.tsx`

**Changes:**
- Set default COGS mode to "FIXED"
- Pre-select in UI

---

#### 3.4 Payment Terms Default
**Files to Modify:**
- `client/src/components/inventory/PurchaseModal.tsx`

**Changes:**
- Set default payment terms to "CONSIGNMENT"
- Pre-select in UI

---

#### 3.5 Stock Level Filter Default
**Files to Modify:**
- `client/src/components/inventory/AdvancedFilters.tsx`

**Changes:**
- Set default filter to "In Stock"
- Update initial state

---

### Phase 3 Deliverables
- ✅ Batch status auto-set to AWAITING_INTAKE on creation
- ✅ Batch status auto-updates to SOLD_OUT when inventory = 0
- ✅ COGS mode defaults to FIXED
- ✅ Payment terms default to CONSIGNMENT
- ✅ Stock filter defaults to "In Stock"
- ✅ Improved UX for batch creation

---

## Phase 4: Client Management & Pricing (High Priority)

**Goal:** Implement per-client pricing profiles and COGS adjustments.

**Estimated Effort:** 3-4 days  
**Dependencies:** Phase 2

### Tasks

#### 4.1 System Default Pricing Profile
**Files to Create:**
- `scripts/seed-default-pricing-profile.ts`

**Implementation:**
- Create "Default Pricing Profile" in system settings
- Link to default COGS adjustment settings
- All new clients inherit this profile

---

#### 4.2 Per-Client Pricing Profiles
**Files to Modify:**
- `client/src/pages/ClientProfilePage.tsx`
- `server/routers/clientRouter.ts`

**Implementation:**
- Add pricing profile selector to client profile
- Default to system default pricing profile
- Allow customization per client

---

#### 4.3 COGS Adjustments by Subcategory
**Files to Create:**
- `client/src/components/cogs/CogsSubcategoryAdjustments.tsx`

**Files to Modify:**
- `client/src/pages/ClientProfilePage.tsx`
- `server/routers/clientRouter.ts`

**Implementation:**
- UI to configure COGS adjustments per Flower subcategory
- Example: Outdoor: -$200, Indoor: -$150, Smalls: -$300, etc.
- Store in `clientCogsAdjustments` table
- Apply during pricing calculations

---

#### 4.4 Pricing Profile Security Check
**Files to Audit:**
- All client-facing components
- Quote generation
- Order creation
- Invoice generation

**Action:**
- ⚠️ **CRITICAL:** Triple check that pricing profiles, markup percentages, and COGS adjustments are NEVER visible to clients
- Audit all API responses to client-facing endpoints
- Remove any cost/markup data from client views

---

#### 4.5 Client Needs Priority Default
**Files to Modify:**
- `client/src/components/needs/NeedForm.tsx`

**Changes:**
- Ensure default priority is "MEDIUM"
- Pre-select in UI

---

### Phase 4 Deliverables
- ✅ System default pricing profile created
- ✅ Per-client pricing profiles implemented
- ✅ COGS adjustments by subcategory implemented
- ✅ Pricing information completely hidden from clients
- ✅ Client needs default to MEDIUM priority
- ✅ Documentation updated

---

## Phase 5: Orders, Quotes & Payment Terms (Medium Priority)

**Goal:** Implement flexible payment terms and per-line-item configuration.

**Estimated Effort:** 2-3 days  
**Dependencies:** Phase 2

### Tasks

#### 5.1 Order Payment Terms Default
**Files to Modify:**
- `client/src/components/orders/OrderPreview.tsx`
- `client/src/pages/OrderCreatorPage.tsx`

**Changes:**
- Set default payment terms to "COD"
- Pre-select in UI

---

#### 5.2 Per-Client Default Payment Terms
**Files to Modify:**
- `drizzle/schema.ts` - add `defaultPaymentTerms` to `clients` table
- `client/src/pages/ClientProfilePage.tsx`
- `server/routers/clientRouter.ts`

**Implementation:**
- Add payment terms field to client profile
- When creating order for client, use their default payment terms
- Fall back to system default (COD) if not set

---

#### 5.3 Custom NET Terms & Due Dates
**Files to Modify:**
- `client/src/components/orders/OrderPreview.tsx`
- `drizzle/schema.ts` - add `customNetDays` and `customDueDate` fields

**Implementation:**
- Add "Custom" option to payment terms dropdown
- When selected, show input for custom NET days or date picker for due date
- Store custom values in database

---

#### 5.4 Per-Line-Item Payment Terms
**Files to Modify:**
- `client/src/components/orders/OrderLineItem.tsx` (new component)
- `client/src/pages/OrderCreatorPage.tsx`

**Implementation:**
- Add "Advanced" expandable section on each line item
- Include payment terms dropdown (hidden by default)
- Allow different payment terms per SKU
- Store in `orderItems` table with `paymentTerms` field

---

#### 5.5 Quote & Sale Status Defaults
**Files to Modify:**
- Verify schema defaults are correct (already set to DRAFT and PENDING)

---

### Phase 5 Deliverables
- ✅ Order payment terms default to COD
- ✅ Per-client default payment terms implemented
- ✅ Custom NET terms and due dates supported
- ✅ Per-line-item payment terms implemented (in Advanced section)
- ✅ Quote status defaults to DRAFT
- ✅ Sale status defaults to PENDING
- ✅ Documentation updated

---

## Phase 6: Accounting Simplification (Medium Priority)

**Goal:** Simplify accounting module with cash-based approach.

**Estimated Effort:** 2-3 days  
**Dependencies:** Phase 2

### Tasks

#### 6.1 Normal Balance Auto-population
**Files to Modify:**
- `client/src/pages/accounting/ChartOfAccounts.tsx`

**Implementation:**
```typescript
// When account type is selected:
if (accountType === "ASSET" || accountType === "EXPENSE") {
  setNormalBalance("DEBIT");
} else if (accountType === "LIABILITY" || accountType === "EQUITY" || accountType === "REVENUE") {
  setNormalBalance("CREDIT");
}
// Allow manual override
```

---

#### 6.2 Payment Methods Update
**Files to Modify:**
- `client/src/pages/accounting/Payments.tsx`
- `client/src/pages/accounting/Expenses.tsx`

**Changes:**
- Update dropdown to show: CASH, CRYPTO, CUSTOM
- Default to CASH
- If CUSTOM selected, show dropdown of user-defined custom payment methods

---

#### 6.3 Custom Payment Methods Management
**Files to Create:**
- `client/src/pages/Settings.tsx` - add "Payment Methods" tab

**Implementation:**
- UI similar to storage locations management
- Add/edit/delete custom payment methods
- Examples: "Venmo", "Zelle", "Bitcoin Wallet", etc.

---

#### 6.4 Bank Account Type Update
**Files to Modify:**
- `client/src/pages/accounting/BankAccounts.tsx`

**Changes:**
- Update dropdown to show: BANK, CUSTOM
- Default to BANK
- If CUSTOM selected, show dropdown of user-defined custom account types

---

#### 6.5 Custom Bank Account Types Management
**Files to Create:**
- `client/src/pages/Settings.tsx` - add "Bank Account Types" tab

**Implementation:**
- UI similar to storage locations management
- Add/edit/delete custom bank account types
- Examples: "Crypto Wallet", "Cash Safe", "PayPal", etc.

---

#### 6.6 Bank Transaction Type Auto-default
**Files to Modify:**
- `client/src/pages/accounting/BankTransactions.tsx`

**Implementation:**
```typescript
// When amount is entered:
if (amount > 0) {
  setTransactionType("DEPOSIT");
} else if (amount < 0) {
  setTransactionType("WITHDRAWAL");
}
// Allow manual override
```

---

### Phase 6 Deliverables
- ✅ Normal balance auto-populates based on account type
- ✅ Payment methods simplified to CASH, CRYPTO, CUSTOM
- ✅ Custom payment methods management UI
- ✅ Bank account types simplified to BANK, CUSTOM
- ✅ Custom bank account types management UI
- ✅ Bank transaction type auto-defaults based on amount
- ✅ Simple cash ledger approach implemented
- ✅ Documentation updated

---

## Phase 7: Dashboard & KPIs (Medium Priority)

**Goal:** Configure default dashboard layout and KPIs.

**Estimated Effort:** 2-3 days  
**Dependencies:** Phase 1

### Tasks

#### 7.1 Dashboard Layout Seeding
**Files to Create:**
- `scripts/seed-dashboard-layouts.ts`

**Implementation:**
- Create default layout with all widgets visible
- Freeform widget at top (small size)
- Other widgets in gallery swipe/carousel view
- Group widgets into sections/areas
- Apply to all new users

---

#### 7.2 Dashboard KPIs Seeding
**Files to Create:**
- `scripts/seed-dashboard-kpis.ts`

**Implementation:**
```typescript
// KPIs in order:
// 1. Sales by Product
// 2. Sales by Subcategory
// 3. Sales by Category
// 4. Sales by Subcategory with Price Range Breakdowns ($300 increments)
// 5. Clients with Oldest Open Debt
// 6. Client Leaderboard
```

---

#### 7.3 KPI: Sales by Subcategory with Price Range
**Files to Create:**
- `client/src/components/dashboard/widgets-v2/SalesBySubcategoryPriceRange.tsx`

**Implementation:**
- Display sales broken down by subcategory
- Within each subcategory, show price ranges: $0-300, $301-600, $601-900, etc.
- Configurable increment amount (default $300)

---

#### 7.4 KPI: Clients with Oldest Open Debt
**Files to Create:**
- `client/src/components/dashboard/widgets-v2/ClientsOldestDebt.tsx`

**Implementation:**
- Display clients sorted by oldest unpaid invoice
- Show: Client name, amount owed, days overdue

---

#### 7.5 KPI: Client Leaderboard
**Files to Create:**
- `client/src/components/dashboard/widgets-v2/ClientLeaderboard.tsx`

**Implementation:**
- Display top clients by total sales/revenue
- Configurable time period (month, quarter, year, lifetime)

---

### Phase 7 Deliverables
- ✅ Default dashboard layout with all widgets
- ✅ Freeform widget at top (small)
- ✅ Gallery swipe/carousel view implemented
- ✅ All 6 KPIs implemented and visible by default
- ✅ Sales by Subcategory with Price Range widget created
- ✅ Clients with Oldest Open Debt widget created
- ✅ Client Leaderboard widget created
- ✅ Documentation updated

---

## Phase 8: Advanced Pricing Rules Engine (Low Priority)

**Goal:** Implement complex conditional pricing rules.

**Estimated Effort:** 3-4 days  
**Dependencies:** Phase 2

### Tasks

#### 8.1 Pricing Rule Condition Builder UI
**Files to Create:**
- `client/src/components/pricing/PricingRuleConditionBuilder.tsx`

**Implementation:**
- UI to build complex conditions with AND/OR logic
- Condition types: Product, Category, Subcategory, Tags, Price Range, Strain, Brand, Grade, Vendor
- Visual rule builder (similar to query builders)
- Support multiple conditions with logical operators

---

#### 8.2 Pricing Rule Engine
**Files to Create:**
- `server/services/pricingRuleEngine.ts`

**Implementation:**
- Evaluate pricing rules against product/batch
- Apply rules in priority order
- Handle rule conflicts
- Calculate final price with all applicable rules

---

#### 8.3 Pricing Rule Defaults
**Files to Modify:**
- `client/src/pages/PricingRulesPage.tsx`

**Changes:**
- Default adjustment type: DOLLAR_MARKUP
- Default logic type: AND (already in schema)

---

#### 8.4 Dynamic Pricing Defaults
**Files to Modify:**
- `client/src/pages/PricingProfilesPage.tsx`

**Changes:**
- Default adjustment type: FIXED_AMOUNT

---

### Phase 8 Deliverables
- ✅ Complex pricing rule conditions supported
- ✅ Visual condition builder UI implemented
- ✅ Pricing rule engine evaluates complex rules
- ✅ Rule priority and conflict resolution implemented
- ✅ Default adjustment types set correctly
- ✅ Documentation updated

---

## Phase 9: Advanced Low Inventory Alerts (Low Priority)

**Goal:** Implement flexible low inventory alerts with complex conditions.

**Estimated Effort:** 2-3 days  
**Dependencies:** Phase 2

### Tasks

#### 9.1 Default Low Inventory Alerts Seeding
**Files to Create:**
- `scripts/seed-low-inventory-alerts.ts`

**Implementation:**
```typescript
// Create 5 default alerts (one per Flower subcategory):
// - Outdoor: Alert when gross revenue value < $100,000
// - Deps: Alert when gross revenue value < $100,000
// - Indoor: Alert when gross revenue value < $100,000
// - Smalls: Alert when gross revenue value < $100,000
// - Trim: Alert when gross revenue value < $100,000
```

---

#### 9.2 Alert Condition Builder UI
**Files to Create:**
- `client/src/components/alerts/AlertConditionBuilder.tsx`

**Implementation:**
- Similar to pricing rule condition builder
- Support: Category, Subcategory, Product, Tags, Price Range, Strain, Brand, Grade, Vendor
- AND/OR logic

---

#### 9.3 Alert Threshold Configuration
**Files to Modify:**
- `client/src/pages/AlertConfigurationsPage.tsx` (create if doesn't exist)

**Implementation:**
- Support unit-based thresholds (e.g., < 100 units)
- Support value-based thresholds (e.g., < $10,000)
- Configurable threshold operator (LESS_THAN, GREATER_THAN, EQUALS)

---

#### 9.4 Alert Evaluation Engine
**Files to Create:**
- `server/services/alertEvaluationEngine.ts`

**Implementation:**
- Evaluate alert conditions against current inventory
- Calculate total units or total value based on conditions
- Trigger alerts when thresholds are met
- Support complex condition logic

---

### Phase 9 Deliverables
- ✅ 5 default Flower subcategory alerts created
- ✅ Alert condition builder UI implemented
- ✅ Unit-based and value-based thresholds supported
- ✅ Alert evaluation engine implemented
- ✅ Complex condition logic supported
- ✅ Documentation updated

---

## Phase 10: Recurring Orders & Miscellaneous (Low Priority)

**Goal:** Set remaining defaults and finalize system.

**Estimated Effort:** 1-2 days  
**Dependencies:** All previous phases

### Tasks

#### 10.1 Recurring Order Frequency Default
**Files to Modify:**
- `client/src/pages/RecurringOrdersPage.tsx` (if exists)

**Changes:**
- Default frequency: MONTHLY

---

#### 10.2 Credit System Settings Seeding
**Files to Create:**
- `scripts/seed-credit-system-settings.ts`

**Implementation:**
```typescript
// Seed credit system weights:
// Revenue Momentum: 20%
// Cash Collection: 25%
// Profitability: 20%
// Debt Aging: 15%
// Repayment Velocity: 10%
// Tenure: 10%
```

---

#### 10.3 Final Status Defaults Verification
**Files to Audit:**
- Verify all status enums have correct defaults in schema
- Quote status: DRAFT ✓
- Sale status: PENDING ✓
- Sample request status: PENDING ✓
- Credit status: ACTIVE ✓
- Alert status: ACTIVE ✓

---

#### 10.4 Documentation Finalization
**Files to Create/Update:**
- `docs/DEFAULT_VALUES.md` - Complete documentation of all defaults
- `docs/CUSTOMIZATION_GUIDE.md` - How to customize defaults
- `README.md` - Update with new features

---

### Phase 10 Deliverables
- ✅ Recurring order frequency defaults to MONTHLY
- ✅ Credit system settings seeded
- ✅ All status defaults verified
- ✅ Complete documentation created
- ✅ User guide updated

---

## Testing & QA

### Comprehensive Testing Checklist

**Master Data:**
- [ ] Fresh database initialization populates all defaults
- [ ] Storage locations created correctly
- [ ] Categories and subcategories created correctly
- [ ] Grades created correctly
- [ ] Expense categories created with parent-child relationships
- [ ] Chart of Accounts created correctly
- [ ] "Restore Defaults" functionality works

**Inventory & Batches:**
- [ ] Batch creation auto-sets AWAITING_INTAKE status
- [ ] Batch status auto-updates to SOLD_OUT when inventory = 0
- [ ] COGS mode defaults to FIXED
- [ ] Payment terms default to CONSIGNMENT for purchases
- [ ] Stock filter defaults to "In Stock"

**Client Management:**
- [ ] New clients inherit default pricing profile
- [ ] COGS adjustments can be set per Flower subcategory
- [ ] Client needs default to MEDIUM priority
- [ ] Pricing profiles completely hidden from client-facing views ⚠️ CRITICAL

**Orders & Quotes:**
- [ ] Payment terms default to COD for orders
- [ ] Per-client payment terms override system defaults
- [ ] Custom NET terms can be entered
- [ ] Custom due dates can be set
- [ ] Per-line-item payment terms work (in Advanced section)
- [ ] Quote status defaults to DRAFT
- [ ] Sale status defaults to PENDING

**Accounting:**
- [ ] Normal balance auto-populates based on account type
- [ ] Payment methods show CASH, CRYPTO, CUSTOM
- [ ] Custom payment methods can be added/edited/deleted
- [ ] Bank account types show BANK, CUSTOM
- [ ] Custom bank account types can be added/edited/deleted
- [ ] Bank transactions auto-default based on amount sign

**Dashboard:**
- [ ] All widgets visible by default
- [ ] Freeform widget at top (small size)
- [ ] Gallery swipe/carousel view works
- [ ] All 6 KPIs display in correct order
- [ ] Sales by Subcategory with Price Range works
- [ ] Clients with Oldest Open Debt works
- [ ] Client Leaderboard works

**Pricing Rules:**
- [ ] Pricing rule adjustment type defaults to DOLLAR_MARKUP
- [ ] Dynamic pricing defaults to FIXED_AMOUNT
- [ ] Complex conditions can be built (product, category, tags, etc.)
- [ ] AND/OR logic works correctly
- [ ] Pricing rules apply correctly in calculations

**Alerts:**
- [ ] 5 default Flower subcategory alerts created
- [ ] Alerts trigger at $100k threshold
- [ ] Unit-based and value-based thresholds work
- [ ] Complex alert conditions work
- [ ] Alert status defaults to ACTIVE

**Miscellaneous:**
- [ ] Recurring order frequency defaults to MONTHLY
- [ ] Credit system settings seeded correctly
- [ ] All status defaults correct

**Performance:**
- [ ] Seed scripts run efficiently
- [ ] No performance degradation from defaults
- [ ] Database queries optimized

**Security:**
- [ ] Pricing profiles hidden from clients ⚠️ CRITICAL
- [ ] COGS adjustments hidden from clients ⚠️ CRITICAL
- [ ] Markup percentages hidden from clients ⚠️ CRITICAL
- [ ] All cost data hidden from client-facing views ⚠️ CRITICAL

---

## Deployment Strategy

### Pre-Deployment
1. Run all tests locally
2. Verify zero TypeScript errors
3. Test seed scripts on fresh database
4. Test migrations on copy of production database
5. Review all code changes
6. Update documentation

### Deployment Steps
1. Create database backup
2. Run migrations
3. Run seed scripts (only for new installations)
4. Deploy application
5. Verify all defaults in production
6. Monitor for errors

### Post-Deployment
1. Verify all defaults working correctly
2. Test critical user flows
3. Monitor performance
4. Gather user feedback
5. Address any issues immediately

---

## Success Criteria

### User Experience
- ✅ First-time users see fully populated system
- ✅ No empty dropdowns or tables
- ✅ Sensible defaults reduce manual input by 50%+
- ✅ All defaults can be customized
- ✅ "Restore Defaults" functionality works

### Technical
- ✅ Zero TypeScript errors
- ✅ All tests passing
- ✅ Seed scripts are idempotent
- ✅ No performance degradation
- ✅ Database migrations successful

### Security
- ✅ Pricing information completely hidden from clients
- ✅ No cost data exposed in client-facing views
- ✅ All sensitive data properly secured

### Documentation
- ✅ Complete user documentation
- ✅ Admin customization guide
- ✅ Developer documentation
- ✅ All defaults documented with rationale

---

## Timeline Summary

| Phase | Description | Effort | Dependencies |
|-------|-------------|--------|--------------|
| 1 | Master Data & Foundation | 3-4 days | None |
| 2 | Database Schema Changes | 2-3 days | None |
| 3 | Inventory & Batch Management UX | 2 days | Phase 2 |
| 4 | Client Management & Pricing | 3-4 days | Phase 2 |
| 5 | Orders, Quotes & Payment Terms | 2-3 days | Phase 2 |
| 6 | Accounting Simplification | 2-3 days | Phase 2 |
| 7 | Dashboard & KPIs | 2-3 days | Phase 1 |
| 8 | Advanced Pricing Rules Engine | 3-4 days | Phase 2 |
| 9 | Advanced Low Inventory Alerts | 2-3 days | Phase 2 |
| 10 | Recurring Orders & Miscellaneous | 1-2 days | All |
| **Total** | | **22-29 days** | |

---

## Risk Management

### High Risk Items
1. **Pricing Profile Security** - CRITICAL to hide from clients
   - Mitigation: Thorough audit of all client-facing code
   - Testing: Manual testing of all client views
   - Review: Security code review before deployment

2. **Database Schema Changes** - Breaking changes to enums
   - Mitigation: Careful migration planning
   - Testing: Test on copy of production database
   - Rollback: Have rollback plan ready

3. **Complex Pricing Rules** - Performance impact
   - Mitigation: Optimize rule evaluation engine
   - Testing: Load testing with many rules
   - Monitoring: Monitor query performance

### Medium Risk Items
1. **Seed Script Idempotency** - Duplicate data on re-run
   - Mitigation: Check for existing data before inserting
   - Testing: Run seed scripts multiple times

2. **Custom Payment Methods** - User-defined data validation
   - Mitigation: Proper validation and sanitization
   - Testing: Test with various inputs

### Low Risk Items
1. **Dashboard Layout** - User preference conflicts
   - Mitigation: User customization overrides defaults
   - Testing: Test with different user roles

---

## Next Steps

1. ✅ **Review Roadmap** - Confirm phases and priorities
2. ⏭️ **Begin Phase 1** - Start with master data seeding
3. ⏭️ **Daily Standups** - Track progress and blockers
4. ⏭️ **Continuous Testing** - Test each phase before moving to next
5. ⏭️ **Documentation** - Update docs as features are completed

---

**Status:** ✅ Ready to Begin Implementation  
**Start Date:** TBD  
**Target Completion:** TBD (22-29 days from start)

