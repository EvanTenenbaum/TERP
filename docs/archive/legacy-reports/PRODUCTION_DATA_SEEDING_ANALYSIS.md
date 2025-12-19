# Production Data Seeding - Gap Analysis & Strategy

**Date:** November 14, 2025  
**Objective:** Permanently seed the LIVE production site with realistic, comprehensive test data that enables real-world testing

---

## 🎯 What You Actually Need

**Goal:** The live production site should feel like a business that's been operating for 22 months with:

- Real transaction history you can browse
- Clients with purchase patterns you can analyze
- Inventory you can manage and track
- Financial data that makes sense (AR aging, invoices, payments)
- Enough data to test every feature realistically
- **One-time setup** - not something that needs constant re-seeding

**Use Case:** You should be able to:

- Open the dashboard and see realistic KPIs
- Browse clients and see their order history
- Look at inventory and see consignment vs owned
- Check AR aging and see realistic overdue accounts
- Test search, filters, reports with meaningful data
- Demo the system to stakeholders with confidence

---

## 📊 What Currently Exists

### ✅ Strong Foundation (Well-Built)

**1. Core Business Data Generator** (`scripts/generators/`)

- **Status:** Production-ready, sophisticated
- **Coverage:** 9 core tables
- **Quality:** Excellent - realistic distributions, business logic
- **What it generates:**
  - 68 clients (10 whales, 50 regular, 8 vendors)
  - 50 strains with normalization
  - 500+ products (90% flower, 10% other)
  - 176 lots (vendor receiving)
  - 158 batches (90% consignment tracking)
  - 4,400 orders ($44M revenue over 22 months)
  - 4,400 invoices (15% overdue, realistic AR aging)
  - 22 returns (0.5% rate)
  - 220 refunds (5% of orders)

**2. System Defaults Seeder** (`server/services/seedDefaults.ts`)

- **Status:** Production-ready, idempotent
- **Coverage:** 6 system tables
- **What it seeds:**
  - RBAC (roles, permissions, mappings)
  - Locations (warehouse zones)
  - Categories & Subcategories
  - Grades (A, B, C, D)
  - Expense Categories (hierarchical)
  - Chart of Accounts (basic accounting)

**3. Multiple Seeding Scripts**

- `seed-realistic-main.ts` - Local dev seeding
- `seed-live-database.ts` - One-time live DB seed
- `reseed-production-safe.ts` - Preserves strains
- `reseed-production-full.ts` - Preserves strains + products
- `seed-rbac.ts` - RBAC-specific seeding

---

## ❌ Critical Gaps (What's Missing)

### Database Coverage: 9/107 tables (8%)

**The existing generators cover only:**

- clients, strains, products, lots, batches, orders, invoices, returns, brands, users

**Missing 98 tables including:**

#### **High-Impact Missing Data (Breaks UX)**

1. **Calendar & Events** (4 tables)
   - `events`, `eventAttendees`, `eventInvitations`, `eventReminders`
   - **Impact:** Calendar appears empty, can't test event features
   - **Priority:** P0 - Just implemented event features (QA-042, QA-043)

2. **Comments & Notes** (6 tables)
   - `freeformNotes`, `noteComments`, `noteActivity`
   - `scratchPadNotes`, `clientNotes`, `vendorNotes`
   - **Impact:** Collaboration features appear unused
   - **Priority:** P1 - Just fixed comments (QA-037, QA-038)

3. **Client Relationship Data** (4 tables)
   - `clientCommunications`, `clientTransactions`, `clientActivity`, `clientNeeds`
   - **Impact:** Client profiles look empty, CRM features untestable
   - **Priority:** P1 - Core business functionality

4. **Lists & Tasks** (3 tables)
   - `lists`, `listItems`, `listShares`
   - **Impact:** Todo/Inbox features empty
   - **Priority:** P1 - Just fixed shared lists (QA-039, QA-040)

5. **Matchmaking** (3 tables)
   - `clientNeeds`, `clientSupplies`, `matchmakingResults`
   - **Impact:** Matchmaking module untestable
   - **Priority:** P2 - Has 404 bugs (QA-015, QA-016)

6. **Workflow Queue** (5 tables)
   - `workflowQueue`, `workflowStatuses`, `workflowHistory`, `workflowAssignments`, `workflowTemplates`
   - **Impact:** Workflow features appear unused
   - **Priority:** P1 - Core operational feature

7. **Pricing & Rules** (4 tables)
   - `pricingRules`, `pricingProfiles`, `pricingTiers`, `clientPricingOverrides`
   - **Impact:** Pricing features untestable
   - **Priority:** P2 - Just tested forms (QA-021, QA-022)

8. **Financial Details** (8 tables)
   - `invoiceLineItems`, `payments`, `bills`, `billLineItems`
   - `bankAccounts`, `bankTransactions`, `ledgerEntries`, `fiscalPeriods`
   - **Impact:** Accounting module incomplete, can't test reconciliation
   - **Priority:** P1 - Financial accuracy critical

9. **Inventory Details** (4 tables)
   - `batchLocations`, `paymentHistory`, `cogsHistory`, `sales`
   - **Impact:** Inventory tracking incomplete
   - **Priority:** P2 - Operational features

10. **Purchase Orders** (3 tables)
    - `purchaseOrders`, `purchaseOrderItems`, `vendors`
    - **Impact:** Vendor management untestable
    - **Priority:** P2 - Supply chain features

11. **Product Metadata** (3 tables)
    - `productSynonyms`, `productMedia`, `productTags`, `tags`
    - **Impact:** Product search/filtering limited
    - **Priority:** P3 - Enhancement features

12. **Dashboard Customization** (3 tables)
    - `dashboardWidgetLayouts`, `dashboardKpiConfigs`, `userDashboardPreferences`
    - **Impact:** Dashboard customization untestable
    - **Priority:** P1 - Just fixed widgets (QA-033, QA-034, QA-035, QA-036)

13. **Analytics & Reporting** (2 tables)
    - `analyticsSnapshots`, `reportConfigs`
    - **Impact:** Analytics features empty
    - **Priority:** P2 - Business intelligence features

14. **Audit & Compliance** (2 tables)
    - `auditLogs`, `sequences`
    - **Impact:** Compliance tracking incomplete
    - **Priority:** P3 - Background features

---

## 🔍 Root Cause Analysis

### Why Data Isn't Flowing Through

**Problem 1: Incomplete Generator Coverage**

- Generators only cover 8% of tables
- Many recently-built features have no seed data
- New features (events, comments, lists) never got generators

**Problem 2: No Orchestration for Full System**

- `seed-realistic-main.ts` only calls 9 generators
- No master plan for seeding all 107 tables
- Each feature team built in isolation

**Problem 3: No Production Seeding Strategy**

- `seed-live-database.ts` exists but only seeds the 9 core tables
- No documented process for one-time production seed
- Unclear which script to use for live site

**Problem 4: Relational Dependencies Not Mapped**

- Can't seed events without clients
- Can't seed comments without events/orders/clients
- Can't seed workflow without batches
- No dependency graph documented

---

## 💡 Recommended Strategy

### Phase 1: Immediate Impact (P0 - 2-4 days)

**Objective:** Seed the high-impact tables that make the UI feel alive

**Priority Order:**

1. **Events & Calendar** - Just built these features
2. **Comments & Notes** - Just fixed these features
3. **Lists & Tasks** - Just fixed shared lists
4. **Dashboard Preferences** - Just fixed widgets
5. **Client Activity** - Makes CRM feel real

**Approach:**

- Create 5 new generators following existing pattern
- Add to `seed-realistic-main.ts` orchestrator
- Run once on production via `seed-live-database.ts`

**Estimated Data:**

- 200-300 events over 22 months
- 500-1000 comments across orders/events/clients
- 50-100 lists with 200-500 items
- Dashboard preferences for all users
- Client communications history

---

### Phase 2: Financial Completeness (P1 - 3-5 days)

**Objective:** Make accounting module fully functional

**Tables:**

- `invoiceLineItems` (link to products)
- `payments` (payment history)
- `bills` (vendor bills)
- `billLineItems` (bill details)
- `ledgerEntries` (double-entry bookkeeping)
- `bankAccounts` (bank integration)
- `bankTransactions` (bank feeds)

**Approach:**

- Extend existing invoice generator
- Create payment generator (realistic payment patterns)
- Create bills generator (mirror of invoices for vendors)
- Create ledger generator (auto-generate from transactions)

---

### Phase 3: Operational Features (P2 - 2-3 days)

**Objective:** Make workflow, pricing, and vendor features work

**Tables:**

- `workflowQueue` + related
- `pricingRules` + `pricingProfiles`
- `purchaseOrders` + `purchaseOrderItems`
- `vendors` (separate from clients)
- `matchmakingResults`

---

### Phase 4: Polish & Enhancement (P3 - 1-2 days)

**Objective:** Complete remaining tables

**Tables:**

- `productMedia`, `productTags`, `tags`
- `analyticsSnapshots`
- `auditLogs`
- `reportConfigs`

---

## 🚀 Recommended Implementation Plan

### Option A: Extend Existing System (Recommended)

**Pros:**

- Leverage existing high-quality generators
- Maintain consistency with current patterns
- Reuse business logic (Pareto distribution, etc.)
- Proven architecture

**Cons:**

- Need to build 40+ new generators
- Takes 2-3 weeks total

**Execution:**

1. Create new generators in `scripts/generators/`
2. Follow existing patterns (clients.ts, orders.ts, etc.)
3. Add to `seed-realistic-main.ts` orchestrator
4. Test locally with `pnpm seed:realistic`
5. Run once on production with `seed-live-database.ts`

---

### Option B: AI-Assisted Bulk Generation (Faster)

**Pros:**

- Can generate all 98 missing tables in 3-5 days
- Use AI to understand relationships and generate realistic data
- One-time effort, permanent result

**Cons:**

- May not match quality of hand-crafted generators
- Need careful validation
- Relationships might be wrong

**Execution:**

1. Map all 107 tables and relationships
2. Create dependency graph
3. Use AI to generate seed data respecting foreign keys
4. Validate data quality
5. Load into production

---

### Option C: Hybrid Approach (Best Balance)

**Pros:**

- Hand-craft generators for high-impact tables (Phase 1)
- AI-generate data for low-impact tables (Phase 3-4)
- Balance quality and speed

**Cons:**

- Requires coordination between approaches

**Execution:**

1. **Week 1:** Build 5 high-impact generators (events, comments, lists, dashboard, client activity)
2. **Week 2:** Build financial generators (invoices, payments, bills, ledger)
3. **Week 3:** AI-generate remaining 30 tables
4. **Week 4:** Validate, test, deploy to production

---

## 📋 Proposed Roadmap Task

### DATA-001: Comprehensive Production Data Seeding

**Priority:** P0 (Critical)  
**Effort:** 2-3 weeks  
**Impact:** Enables realistic testing of all features

**Problem:**
The live production site has limited seed data covering only 9/107 database tables (8%). Recently-built features (events, comments, lists, dashboard widgets) have no test data, making them appear broken or unused. Users cannot realistically test the system because:

- Calendar is empty (just built event features)
- Comments/notes are missing (just fixed comment submission)
- Client profiles look barren (no activity history)
- Lists/tasks are empty (just fixed shared lists)
- Dashboard widgets show no data (just fixed widget issues)
- Financial data is incomplete (no payment history, ledger entries)

**Solution:**
Create a comprehensive, one-time production data seeding system that populates all 107 database tables with realistic, interconnected data representing 22 months of business operations ($44M revenue).

**Scope:**

**Phase 1: High-Impact Tables (P0 - 2-4 days)**

- Events & Calendar (200-300 events)
- Comments & Notes (500-1000 comments)
- Lists & Tasks (50-100 lists, 200-500 items)
- Dashboard Preferences (all users)
- Client Activity History (communications, transactions)

**Phase 2: Financial Completeness (P1 - 3-5 days)**

- Invoice line items
- Payment history
- Vendor bills
- Ledger entries (double-entry bookkeeping)
- Bank accounts & transactions

**Phase 3: Operational Features (P2 - 2-3 days)**

- Workflow queue & history
- Pricing rules & profiles
- Purchase orders
- Matchmaking results

**Phase 4: Enhancement Tables (P3 - 1-2 days)**

- Product media & tags
- Analytics snapshots
- Audit logs
- Report configs

**Deliverables:**

1. 40+ new data generators in `scripts/generators/`
2. Updated orchestrator in `seed-realistic-main.ts`
3. One-time production seeding script
4. Documentation of all table relationships
5. Validation tests for data quality
6. Permanently seeded production database

**Success Criteria:**

- All 107 tables have realistic data
- Calendar shows 22 months of events
- Comments appear on orders, events, clients
- Client profiles show rich activity history
- Lists/tasks have realistic content
- Dashboard widgets display real metrics
- Financial data is complete and balanced
- Can demo system confidently to stakeholders
- No features appear "empty" or broken

**Technical Approach:**

- Extend existing generator system (proven architecture)
- Follow established patterns (Pareto distribution, realistic dates)
- Respect foreign key relationships
- Generate data in dependency order
- Idempotent (safe to re-run)
- One-time execution on production

**Dependencies:**

- Existing generators (clients, orders, invoices)
- Database schema (all 107 tables)
- Production database access

**Risks:**

- Large data volume (may take time to generate)
- Foreign key constraints (must respect relationships)
- Production database impact (run during low-traffic window)

**Mitigation:**

- Test thoroughly on local/staging first
- Generate data in batches
- Use transactions for atomicity
- Create backup before production run
- Monitor database performance

---

## 🎯 Immediate Next Steps

1. **Decision:** Choose Option A (extend existing) or Option C (hybrid)
2. **Prioritize:** Confirm Phase 1 tables are correct priority
3. **Assign:** Create roadmap task DATA-001
4. **Execute:** Build first 5 generators (events, comments, lists, dashboard, client activity)
5. **Validate:** Test locally, then seed production once
6. **Iterate:** Continue with Phase 2-4 based on results

---

## 💭 Key Insights

**What's Working:**

- Existing generators are high-quality
- Architecture is solid and extensible
- Business logic is well-modeled
- Scripts are production-ready

**What's Missing:**

- Coverage (only 8% of tables)
- Orchestration (no master plan)
- Production strategy (unclear process)
- Documentation (relationships not mapped)

**What to Keep:**

- Generator architecture (proven)
- Business parameters (realistic)
- Faker.js integration (good fake data)
- Idempotent design (safe re-runs)

**What to Change:**

- Expand coverage to 100% of tables
- Create dependency graph
- Document production seeding process
- Build remaining 40+ generators

---

**Bottom Line:** You have excellent infrastructure for 8% of the problem. The solution is to extend that infrastructure to cover the remaining 92%, not rebuild from scratch. Estimated 2-3 weeks to complete, one-time execution, permanent result.
