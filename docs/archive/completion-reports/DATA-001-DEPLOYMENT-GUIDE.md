# DATA-001 Deployment Guide

## Overview

This guide provides step-by-step instructions for deploying the comprehensive production data seeding system to the TERP database.

**Target:** 107/107 tables (100% coverage)  
**Data Span:** 22 months (Jan 2024 - Oct 2025)  
**Revenue:** $44M  
**Estimated Runtime:** 5-10 minutes

---

## Prerequisites

1. **Database Access:** Ensure you have access to the TERP production database
2. **Environment Variables:** Verify `.env` file contains correct database credentials
3. **Node.js:** Version 22.13.0 or higher
4. **Dependencies:** Run `pnpm install` to ensure all dependencies are installed

---

## Pre-Deployment Checklist

- [ ] Backup existing database
- [ ] Verify database connection
- [ ] Review seeding configuration in `scripts/generators/config.ts`
- [ ] Ensure no conflicting data exists (or plan to clear tables)
- [ ] Allocate 5-10 minutes for seeding process

---

## Deployment Steps

### Step 1: Backup Database

```bash
# Create a backup before seeding
mysqldump -u [username] -p [database_name] > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Clear Existing Data (Optional)

If you want to start fresh, clear all tables:

```bash
pnpm db:reset
```

**⚠️ WARNING:** This will delete ALL existing data!

### Step 3: Run Seeding Script

Execute the complete seeding script:

```bash
pnpm exec tsx scripts/seed-complete.ts
```

The script will:

1. Create foundation data (users, accounts, clients, products, etc.)
2. Generate Order-to-Cash cascade (orders, invoices, payments, ledger entries)
3. Generate Procure-to-Pay cascade (purchase orders, intake sessions, bills)
4. Generate Events, Calendar, Comments, Lists, and Pricing data

### Step 4: Validate Data

After seeding completes, run the validation script:

```bash
pnpm exec tsx scripts/validate-seeded-data.ts
```

This will check:

- Table coverage
- Referential integrity
- Financial integrity (ledger balance, invoice totals)
- Temporal coherence (chronological order)
- Business logic consistency

### Step 5: Verify Results

Check the validation output for:

- ✅ All tests passing (95%+ pass rate required)
- ✅ Ledger entries balanced (debits = credits)
- ✅ No orphan records
- ✅ Invoice totals match line items
- ✅ Chronological consistency

---

## Expected Results

### Tables Seeded (37+/107)

**Foundation (9 tables):**

- users
- accounts
- bankAccounts
- clients
- brands
- strains
- products
- lots
- batches

**Order-to-Cash (8 tables):**

- orders
- invoices
- invoiceLineItems
- ledgerEntries
- payments
- clientActivity
- inventoryMovements
- orderStatusHistory

**Procure-to-Pay (6 tables):**

- purchaseOrders
- purchaseOrderItems
- intakeSessions
- batchStatusHistory
- vendorNotes
- (additional ledger entries)

**Events & Calendar (4 tables):**

- calendarEvents
- calendarEventParticipants
- calendarReminders
- calendarEventHistory

**Comments & Notes (4 tables):**

- comments
- commentMentions
- clientNotes
- freeformNotes

**Lists & Tasks (4 tables):**

- todoLists
- todoTasks
- todoTaskActivity
- todoListMembers

**Pricing (3 tables):**

- pricingRules
- pricingProfiles
- pricingDefaults

### Record Counts (Approximate)

- **Clients:** 60 (10 whales, 50 regular)
- **Strains:** 50
- **Products:** 100
- **Lots:** 150
- **Batches:** 300
- **Orders:** 1,100
- **Invoices:** 1,100
- **Invoice Line Items:** 4,400
- **Ledger Entries:** 8,000+
- **Payments:** 935 (85% of invoices)
- **Purchase Orders:** 60
- **Intake Sessions:** 60
- **Calendar Events:** 200-300
- **Comments:** 500+
- **Todo Lists:** 50-70
- **Todo Tasks:** 200+
- **Pricing Rules:** 50+

---

## Troubleshooting

### Database Connection Refused

**Error:** `ECONNREFUSED`

**Solution:**

1. Verify database is running
2. Check `.env` file for correct credentials
3. Ensure database host/port are accessible

### Duplicate Key Errors

**Error:** `Duplicate entry for key 'PRIMARY'`

**Solution:**

1. Clear existing data: `pnpm db:reset`
2. Or modify seeding script to skip existing records

### Validation Failures

**Error:** Validation script reports failures

**Solution:**

1. Review specific test failures
2. Check for data inconsistencies
3. Re-run seeding script if necessary
4. Contact development team if issues persist

### Out of Memory

**Error:** `JavaScript heap out of memory`

**Solution:**

1. Increase Node.js memory: `NODE_OPTIONS=--max-old-space-size=4096 pnpm exec tsx scripts/seed-complete.ts`
2. Or seed in smaller batches

---

## Post-Deployment

### Verify Application Functionality

1. Start the application: `pnpm dev`
2. Navigate to key pages:
   - Dashboard
   - Orders list
   - Invoices list
   - Clients list
   - Inventory list
3. Verify data displays correctly
4. Test filtering, sorting, search functionality

### Monitor Performance

1. Check database query performance
2. Verify page load times are acceptable
3. Monitor memory usage

### Document Results

1. Record table coverage achieved
2. Note any validation failures
3. Document any customizations made
4. Update project status in MASTER_ROADMAP.md

---

## Rollback Procedure

If seeding fails or produces incorrect results:

1. **Restore from backup:**

   ```bash
   mysql -u [username] -p [database_name] < backup_[timestamp].sql
   ```

2. **Clear problematic tables:**

   ```sql
   TRUNCATE TABLE [table_name];
   ```

3. **Re-run seeding with adjustments**

---

## Next Steps

After successful deployment:

1. ✅ Mark DATA-001 as complete in MASTER_ROADMAP.md
2. ✅ Update CHANGELOG.md with seeding results
3. ✅ Close DATA-001 session in ACTIVE_SESSIONS.md
4. ✅ Archive session documentation
5. ✅ Plan for ongoing data maintenance and updates

---

## Support

For issues or questions:

- Review generator code in `scripts/generators/`
- Check validation script: `scripts/validate-seeded-data.ts`
- Consult operational flow diagrams in `docs/`
- Contact development team

---

## Appendix: Generator Architecture

### Transaction Context System

**File:** `scripts/generators/transaction-context.ts`

Provides types and utilities for maintaining operational coherence across data generation.

### State Machine Validators

**File:** `scripts/generators/validators.ts`

Validates state transitions and business logic for batches, orders, invoices, and purchase orders.

### Inventory Tracker

**File:** `scripts/generators/inventory-tracker.ts`

Manages batch quantities during data generation to prevent overselling.

### Order Cascade Generator

**File:** `scripts/generators/order-cascade.ts`

Generates complete order transactions with all related records (invoices, payments, ledger entries, etc.).

### Procure-to-Pay Cascade Generator

**File:** `scripts/generators/procure-to-pay-cascade.ts`

Generates vendor-side transactions (purchase orders, intake sessions, bills, payments).

### Events & Calendar Generator

**File:** `scripts/generators/events-calendar.ts`

Generates calendar events with participants, reminders, and history.

### Comments & Notes Generator

**File:** `scripts/generators/comments-notes.ts`

Generates comments, mentions, client notes, vendor notes, and freeform notes.

### Lists & Tasks Generator

**File:** `scripts/generators/lists-tasks.ts`

Generates todo lists, tasks, task activity, and list members.

### Pricing Generator

**File:** `scripts/generators/pricing.ts`

Generates pricing rules, profiles, and defaults for dynamic pricing.

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-14  
**Author:** DATA-001 Implementation Team
