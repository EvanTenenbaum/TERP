# DATA-001: Comprehensive Production Data Seeding

**Priority:** P0 | **Status:** Not Started | **Effort:** 80-120h (2-3 weeks)

---

## Problem Statement

The live production TERP site contains seed data for only 9 out of 107 database tables, representing just eight percent coverage. This creates a severely degraded user experience where recently-implemented features appear broken or unused. The calendar module shows no events despite having just implemented event attendees and invitations. The comments system displays empty states despite having just fixed comment submission bugs. Client profiles appear barren with no activity history, lists and tasks are completely empty, and dashboard widgets show placeholder states instead of real metrics.

This lack of comprehensive test data makes it impossible to realistically evaluate the system, demonstrate features to stakeholders, or conduct meaningful quality assurance testing. The existing seeding infrastructure is well-architected and produces high-quality data, but it only covers core transactional tables like clients, orders, and invoices while ignoring the majority of the application's feature set.

---

## Solution Overview

Extend the existing production-quality data generator system to achieve complete coverage across all 107 database tables. The current generators demonstrate excellent patterns including realistic Pareto distributions for client revenue, proper consignment tracking, accurate accounts receivable aging, and sophisticated business logic. Rather than rebuilding this infrastructure, the solution involves creating approximately 40 additional generators following these established patterns to populate the remaining 98 tables with interconnected, realistic data representing 22 months of business operations.

The approach prioritizes high-impact tables first, focusing on recently-built features that currently appear broken due to missing data. Events and calendar entries will make the scheduling system feel alive. Comments and notes will demonstrate collaboration features across orders, events, and client interactions. Lists and tasks will populate the todo and inbox modules. Client activity history will transform empty profiles into rich relationship management tools. Dashboard preferences will enable widget customization testing.

This is designed as a one-time production seeding operation that permanently establishes a realistic data foundation, not a recurring maintenance task. The data will persist indefinitely, allowing continuous testing and demonstration of all system features without repeated seeding operations.

---

## Technical Approach

### Architecture

Extend the existing modular generator system located in `scripts/generators/` which currently includes sophisticated generators for clients, strains, products, inventory, orders, invoices, and returns. Each new generator will follow the established pattern of exporting pure functions that accept configuration parameters and return arrays of typed objects ready for database insertion.

The main orchestrator `seed-realistic-main.ts` will be enhanced to call all generators in dependency order, ensuring foreign key relationships are satisfied. For example, events must be generated after clients exist, comments must reference existing events or orders, and workflow queue items must link to existing batches.

### Data Generation Strategy

**Realistic Patterns:**

- Use Faker.js for names, addresses, and descriptive text
- Apply Pareto distributions where appropriate (80/20 rules)
- Generate timestamps spanning January 2024 through October 2025
- Respect business logic (consignment percentages, return rates, payment terms)
- Create interconnected data (comments reference real orders, events link to actual clients)

**Quality Standards:**

- All foreign keys must reference existing records
- Dates must be chronologically sensible
- Quantities and amounts must be realistic
- Status transitions must follow valid state machines
- No orphaned records or broken relationships

### Execution Plan

**Phase 1: High-Impact Tables (P0 Priority)**

Generate data for features recently implemented or fixed that currently appear broken:

**Events & Calendar** - Create 200-300 events distributed across 22 months with realistic patterns including recurring meetings, one-time appointments, and seasonal events. Generate event attendees linking users to events, event invitations with accepted/declined/pending states, and event reminders scheduled appropriately before event times.

**Comments & Notes** - Populate 500-1000 comments across orders, events, and client records demonstrating collaboration. Include freeform notes for general documentation, scratch pad notes for quick captures, client notes for relationship management, and vendor notes for supplier interactions. Generate note comments for threaded discussions and note activity for audit trails.

**Lists & Tasks** - Create 50-100 lists representing todo items, project tracking, and shared task management. Generate 200-500 list items with realistic completion states, priorities, and due dates. Populate list shares showing collaboration between users with appropriate permission levels.

**Dashboard Customization** - Seed dashboard widget layouts for each user showing personalized arrangements, KPI configurations with custom metrics and thresholds, and user dashboard preferences storing layout choices and widget visibility settings.

**Client Relationship Data** - Generate client communications showing email threads, phone calls, and meeting notes. Create client transactions linking to orders and invoices. Populate client activity with timeline events. Add client needs for matchmaking functionality.

**Phase 2: Financial Completeness (P1 Priority)**

Enhance the existing invoice and order data with detailed financial tracking:

**Invoice Details** - Generate invoice line items breaking down each invoice into product-level detail with quantities, unit prices, and line totals. This enables detailed invoice viewing and product-level revenue analysis.

**Payment Tracking** - Create payment records showing when and how invoices were paid, including partial payments, payment methods (check, wire, ACH), and payment application to specific invoices. Generate realistic payment patterns with some clients paying promptly and others chronically late.

**Vendor Bills** - Mirror the invoice structure for vendor bills, creating bills from vendors with bill line items, payment tracking, and aging. This completes the accounts payable side of the accounting module.

**Ledger Entries** - Generate double-entry bookkeeping ledger entries for all transactions, ensuring debits equal credits. Create entries for sales revenue, cost of goods sold, accounts receivable, accounts payable, inventory, and cash. This enables full accounting reports and financial statements.

**Bank Integration** - Seed bank accounts representing the company's checking and savings accounts. Generate bank transactions showing deposits, withdrawals, and transfers. This enables bank reconciliation testing.

**Phase 3: Operational Features (P2 Priority)**

Populate tables supporting day-to-day operations:

**Workflow Queue** - Generate workflow queue items representing batches moving through processing stages (receiving, testing, packaging, shipping). Create workflow statuses defining available states, workflow history tracking state transitions, workflow assignments linking tasks to users, and workflow templates for common processes.

**Pricing Management** - Seed pricing rules defining conditional pricing logic, pricing profiles for client segments, pricing tiers for volume discounts, and client pricing overrides for custom arrangements. This enables testing of the sophisticated pricing engine.

**Purchase Orders** - Create purchase orders to vendors with purchase order items detailing products and quantities ordered. Link to lots and batches to show the supply chain from vendor to inventory to sales.

**Matchmaking** - Generate client needs representing buy requests and client supplies representing sell offers. Create matchmaking results showing successful matches between buyers and sellers.

**Phase 4: Enhancement Tables (P3 Priority)**

Complete remaining tables for full system coverage:

**Product Metadata** - Seed product synonyms for search optimization, product media with image URLs and metadata, product tags for categorization, and tags for the tagging system.

**Analytics** - Generate analytics snapshots capturing point-in-time metrics for trending analysis. Create report configs storing saved report configurations.

**Audit & Compliance** - Populate audit logs with historical change tracking. Ensure sequences table has proper values for all auto-incrementing identifiers.

### Dependency Management

Tables must be seeded in dependency order to satisfy foreign key constraints:

**Tier 1 (No Dependencies):**

- users, brands, locations, categories, grades, expenseCategories, accounts

**Tier 2 (Depend on Tier 1):**

- clients, vendors, strains, tags, bankAccounts

**Tier 3 (Depend on Tier 2):**

- products, lots, purchaseOrders, events, lists

**Tier 4 (Depend on Tier 3):**

- batches, orders, eventAttendees, listItems

**Tier 5 (Depend on Tier 4):**

- invoices, sales, comments, workflowQueue

**Tier 6 (Depend on Tier 5):**

- invoiceLineItems, payments, ledgerEntries

The orchestrator will execute generators in this order, ensuring all referenced records exist before attempting to create dependent records.

---

## Implementation Details

### File Structure

```
scripts/
├── seed-realistic-main.ts           # Enhanced orchestrator
├── seed-live-database.ts            # Production deployment script
└── generators/
    ├── config.ts                    # Business parameters
    ├── utils.ts                     # Shared utilities
    ├── clients.ts                   # ✅ Existing
    ├── strains.ts                   # ✅ Existing
    ├── products.ts                  # ✅ Existing
    ├── inventory.ts                 # ✅ Existing
    ├── orders.ts                    # ✅ Existing
    ├── invoices.ts                  # ✅ Existing
    ├── returns-refunds.ts           # ✅ Existing
    ├── events.ts                    # 🆕 Phase 1
    ├── comments.ts                  # 🆕 Phase 1
    ├── lists.ts                     # 🆕 Phase 1
    ├── dashboard.ts                 # 🆕 Phase 1
    ├── client-activity.ts           # 🆕 Phase 1
    ├── financial-details.ts         # 🆕 Phase 2
    ├── payments.ts                  # 🆕 Phase 2
    ├── bills.ts                     # 🆕 Phase 2
    ├── ledger.ts                    # 🆕 Phase 2
    ├── bank.ts                      # 🆕 Phase 2
    ├── workflow.ts                  # 🆕 Phase 3
    ├── pricing.ts                   # 🆕 Phase 3
    ├── purchase-orders.ts           # 🆕 Phase 3
    ├── matchmaking.ts               # 🆕 Phase 3
    ├── product-metadata.ts          # 🆕 Phase 4
    ├── analytics.ts                 # 🆕 Phase 4
    └── audit.ts                     # 🆕 Phase 4
```

### Generator Template

Each new generator follows this pattern:

```typescript
import { faker } from "@faker-js/faker";
import { db } from "../db-sync.js";
import { tableName } from "../../drizzle/schema.js";

export function generateTableData(
  dependencies: { clients: Client[]; orders: Order[] },
  config: { count: number; dateRange: DateRange }
): TableRecord[] {
  const records: TableRecord[] = [];

  for (let i = 0; i < config.count; i++) {
    records.push({
      // Generate realistic data
      // Reference dependencies via foreign keys
      // Apply business logic
    });
  }

  return records;
}
```

### Production Deployment

The `seed-live-database.ts` script will be enhanced to:

1. Connect to production DigitalOcean database
2. Display warning and 10-second countdown
3. Execute all generators in dependency order
4. Insert data in batches for performance
5. Validate foreign key relationships
6. Report progress and final statistics
7. Create backup before execution

**Safety Measures:**

- Require explicit confirmation flag: `--confirm-production-seed`
- Create database backup before execution
- Use transactions for atomicity
- Validate all foreign keys before commit
- Log all operations for audit trail
- Provide rollback script in case of issues

---

## Success Criteria

### Quantitative Metrics

- **Table Coverage:** 107/107 tables populated (100%)
- **Data Volume:** Minimum thresholds per table
  - Events: 200+ spanning 22 months
  - Comments: 500+ across multiple entity types
  - Lists: 50+ with 200+ items
  - Invoices: 4,400 with line items
  - Payments: 3,000+ payment records
  - Workflow: 100+ queue items with history
  - Pricing: 20+ rules, 10+ profiles
  - Purchase Orders: 150+ orders
- **Relationship Integrity:** Zero foreign key violations
- **Date Distribution:** Data evenly spread across 22-month period
- **Business Logic:** All percentages match specifications (consignment rates, return rates, etc.)

### Qualitative Validation

- **Calendar Module:** Shows busy schedule with past and future events
- **Comments System:** Demonstrates collaboration across orders, events, clients
- **Client Profiles:** Rich activity history makes CRM feel real
- **Lists/Tasks:** Todo and inbox modules have realistic content
- **Dashboard:** All widgets display meaningful metrics
- **Financial Reports:** AR aging, revenue reports show realistic patterns
- **Workflow Queue:** Shows active batches in various processing stages
- **Pricing Engine:** Rules and profiles enable testing of pricing logic
- **Search Functionality:** Returns relevant results across all modules
- **Demo Readiness:** Can confidently demonstrate system to stakeholders

### Technical Validation

- **Generator Tests:** All generators have unit tests
- **Integration Tests:** End-to-end tests verify data relationships
- **Performance:** Seeding completes in under 10 minutes
- **Idempotency:** Can safely re-run without duplicates
- **Documentation:** All generators documented with examples
- **Rollback:** Backup and rollback procedures tested

---

## Timeline & Milestones

### Week 1: High-Impact Tables (Phase 1)

- **Days 1-2:** Events & calendar generators
- **Days 3-4:** Comments & notes generators
- **Day 5:** Lists, dashboard, client activity generators
- **Milestone:** Calendar, comments, lists feel alive

### Week 2: Financial Completeness (Phase 2)

- **Days 1-2:** Invoice line items, payment generators
- **Days 3-4:** Bills, ledger entry generators
- **Day 5:** Bank accounts, transactions generators
- **Milestone:** Accounting module fully functional

### Week 3: Operational & Enhancement (Phases 3-4)

- **Days 1-2:** Workflow, pricing generators
- **Days 3:** Purchase orders, matchmaking generators
- **Days 4:** Product metadata, analytics generators
- **Day 5:** Production deployment and validation
- **Milestone:** 100% table coverage, production seeded

---

## Dependencies

### Required Access

- Production DigitalOcean database credentials
- Database backup capability
- Low-traffic deployment window

### Technical Dependencies

- Existing generator infrastructure
- Database schema (all 107 tables)
- Faker.js library
- TypeScript compilation

### Knowledge Dependencies

- Understanding of business logic for each feature
- Foreign key relationships between tables
- Valid state transitions for status fields
- Realistic data ranges and distributions

---

## Risks & Mitigation

### Risk: Data Volume Overwhelms Database

**Impact:** High - Could slow production site  
**Probability:** Low  
**Mitigation:**

- Test on staging with same data volume
- Generate in batches with progress monitoring
- Schedule during low-traffic window
- Monitor database performance metrics

### Risk: Foreign Key Violations

**Impact:** High - Seeding fails, partial data  
**Probability:** Medium  
**Mitigation:**

- Strict dependency ordering
- Validation before insert
- Use transactions for atomicity
- Comprehensive testing on local/staging

### Risk: Unrealistic Data Patterns

**Impact:** Medium - Data doesn't feel real  
**Probability:** Medium  
**Mitigation:**

- Review business logic with stakeholders
- Use established patterns from existing generators
- Validate statistical distributions
- User acceptance testing before production

### Risk: Generator Bugs

**Impact:** Medium - Wrong data in production  
**Probability:** Medium  
**Mitigation:**

- Unit tests for all generators
- Integration tests for relationships
- Code review before deployment
- Staged rollout (local → staging → production)

### Risk: Production Impact

**Impact:** High - Downtime or data corruption  
**Probability:** Low  
**Mitigation:**

- Full database backup before execution
- Tested rollback procedure
- Dry-run mode for validation
- Monitoring during execution

---

## Deliverables

1. **40+ New Generator Functions** - TypeScript modules in `scripts/generators/`
2. **Enhanced Orchestrator** - Updated `seed-realistic-main.ts` with full coverage
3. **Production Seeding Script** - Battle-tested `seed-live-database.ts`
4. **Dependency Graph** - Visual diagram of table relationships
5. **Validation Test Suite** - Automated tests for data quality
6. **Documentation** - README for each generator with examples
7. **Deployment Guide** - Step-by-step production seeding procedure
8. **Rollback Script** - Emergency recovery procedure
9. **Seeded Production Database** - Live site with comprehensive test data
10. **Completion Report** - Statistics and validation results

---

## Future Enhancements

- **Scenario Profiles:** Light/Medium/Heavy data volumes
- **Custom Parameters:** CLI flags to override business parameters
- **Incremental Seeding:** Add new data without full re-seed
- **Data Anonymization:** Sanitize for public demos
- **Export Capability:** Dump seed data to SQL/CSV
- **Synthetic Data:** ML-based generation for edge cases

---

**This task will transform the production site from a sparse demo into a realistic, fully-functional business system that can be confidently tested and demonstrated.**
