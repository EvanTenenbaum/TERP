# DATA-002-AUGMENT: Augment Seeded Data for Realistic Relationships

<!-- METADATA (for validation) -->
<!-- TASK_ID: DATA-002-AUGMENT -->
<!-- TASK_TITLE: Augment Seeded Data for Realistic Relationships -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-21 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** DATA-002-AUGMENT  
**Priority:** P1 (HIGH - DATA QUALITY)  
**Estimated Time:** 6-8 hours  
**Module:** `scripts/seed-*.ts`, Database

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Development](#phase-3-development)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
All 107 tables have been seeded with data (100% coverage), but the data lacks realistic relationships and operational coherence. Orders may not have proper order_items, inventory movements may not link to actual inventory records, and financial transactions may not have corresponding ledger entries.

**Goal:**
Audit and augment seeded data to ensure all foreign key relationships are complete, business logic relationships are established, and data reflects realistic operational patterns.

**Success Criteria:**

- [ ] All foreign key relationships audited
- [ ] Orders have realistic line items with actual products
- [ ] Inventory movements link to real inventory records
- [ ] Financial transaction chains complete (orders → invoices → payments → ledger)
- [ ] Realistic client-product purchase patterns established
- [ ] Temporal coherence (dates make chronological sense)
- [ ] Referential integrity validated across all tables
- [ ] Data augmentation scripts created
- [ ] Validation test suite created

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-DATA-002-AUGMENT-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1. `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file:
   ```bash
   echo "- DATA-002-AUGMENT: Session-$(date +%Y%m%d)-DATA-002-AUGMENT-$(openssl rand -hex 4) ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
   ```
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for DATA-002-AUGMENT"
   git push origin main
   ```
5. **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate. Do not proceed until your session is successfully pushed to `main`.

### Step 1.3: Verify Environment

Run these commands:

```bash
node --version
pnpm --version
git status
```

### Step 1.4: Verify Database Access

Ensure you can connect to the database:
```bash
# Check if database connection works
pnpm exec tsx -e "import { db } from './server/db/index.js'; console.log('DB connected');"
```

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and understand current data state.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b data-002-augment
```

### Step 2.2: Understand Current Data State

1. **Check Existing Seed Scripts:**
   ```bash
   ls -la scripts/seed-*.ts
   ```

2. **Review Schema:**
   ```bash
   # Check schema files
   find drizzle -name "schema*.ts" | head -5
   ```

3. **Check Current Data:**
   ```bash
   # Run a quick data check script
   pnpm exec tsx scripts/check-data-relationships.ts 2>/dev/null || echo "Script doesn't exist yet"
   ```

### Step 2.3: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Find the DATA-002-AUGMENT task and update status from `📋 PLANNED` to `⏳ IN PROGRESS`.

---

## Phase 3: Development

**Objective:** Audit relationships and create augmentation scripts.

### Step 3.1: Create Referential Integrity Audit Script

**File:** `scripts/audit-data-relationships.ts`

**Purpose:** Identify orphaned records and missing relationships.

**Key Checks:**
1. Orders without order_items
2. Order_items with invalid product_id or order_id
3. Inventory movements without valid batch_id
4. Invoices without line items
5. Payments without invoice_id
6. Ledger entries without proper account_id
7. Any foreign key violations

**Example Structure:**
```typescript
import { db } from '../server/db/index.js';
import { orders, orderItems, products, batches, inventoryMovements } from '../drizzle/schema.js';

async function auditRelationships() {
  // Check orders without items
  const ordersWithoutItems = await db.select()
    .from(orders)
    .leftJoin(orderItems, eq(orders.id, orderItems.orderId))
    .where(isNull(orderItems.id));
  
  // Check orphaned order items
  const orphanedItems = await db.select()
    .from(orderItems)
    .leftJoin(orders, eq(orderItems.orderId, orders.id))
    .where(isNull(orders.id));
  
  // ... more checks
  
  return {
    ordersWithoutItems: ordersWithoutItems.length,
    orphanedItems: orphanedItems.length,
    // ... more metrics
  };
}
```

### Step 3.2: Run Audit and Document Findings

1. **Run Audit:**
   ```bash
   pnpm exec tsx scripts/audit-data-relationships.ts > docs/DATA-002-AUDIT-REPORT.md
   ```

2. **Review Findings:**
   - Identify all orphaned records
   - List missing relationships
   - Document data quality issues

### Step 3.3: Create Data Augmentation Scripts

**Create scripts for each major domain:**

#### 3.3.1: Orders & Line Items
**File:** `scripts/augment-orders.ts`

**Tasks:**
- Link existing orders to products
- Create realistic order_items for each order
- Ensure order totals match line items
- Add proper quantities and pricing

#### 3.3.2: Inventory Movements
**File:** `scripts/augment-inventory-movements.ts`

**Tasks:**
- Link movements to actual batches
- Ensure movements reference valid inventory records
- Create realistic movement chains
- Add proper quantities and reasons

#### 3.3.3: Financial Transactions
**File:** `scripts/augment-financial-chains.ts`

**Tasks:**
- Create invoices for orders
- Link payments to invoices
- Create ledger entries for all transactions
- Ensure double-entry bookkeeping integrity
- Link AR records to invoices

#### 3.3.4: Client Relationships
**File:** `scripts/augment-client-relationships.ts`

**Tasks:**
- Establish realistic client-product purchase patterns
- Link clients to their order history
- Create client contact relationships
- Add client interaction history

#### 3.3.5: Temporal Coherence
**File:** `scripts/fix-temporal-coherence.ts`

**Tasks:**
- Ensure dates make chronological sense
- Order creation dates before invoice dates
- Invoice dates before payment dates
- Batch creation dates before movements
- Fix any anachronistic data

### Step 3.4: Implement Augmentation Logic

**For each script:**
1. Read existing data
2. Identify missing relationships
3. Create missing records
4. Update existing records to establish links
5. Validate relationships after augmentation

**Example Pattern:**
```typescript
// For each order without items
for (const order of ordersWithoutItems) {
  // Get products for this client
  const products = await getClientProducts(order.clientId);
  
  // Create 2-5 line items
  const itemCount = randomInt(2, 6);
  for (let i = 0; i < itemCount; i++) {
    const product = randomChoice(products);
    await createOrderItem({
      orderId: order.id,
      productId: product.id,
      quantity: randomInt(1, 10),
      unitPrice: product.price,
      // ... other fields
    });
  }
  
  // Update order total
  await updateOrderTotal(order.id);
}
```

### Step 3.5: Create Validation Test Suite

**File:** `scripts/validate-data-quality.ts`

**Tests:**
1. All orders have at least one order_item
2. All order_items have valid product_id and order_id
3. All inventory movements link to valid batches
4. All invoices have line items
5. All payments link to valid invoices
6. All ledger entries have valid account_id
7. Order totals match sum of line items
8. Dates are chronologically correct
9. No orphaned records
10. All foreign keys valid

### Step 3.6: Run Augmentation Scripts

**Execution Order:**
1. Fix temporal coherence first (dates)
2. Augment orders & line items
3. Augment inventory movements
4. Augment financial chains
5. Augment client relationships

**Run Scripts:**
```bash
# Fix dates first
pnpm exec tsx scripts/fix-temporal-coherence.ts

# Then augment relationships
pnpm exec tsx scripts/augment-orders.ts
pnpm exec tsx scripts/augment-inventory-movements.ts
pnpm exec tsx scripts/augment-financial-chains.ts
pnpm exec tsx scripts/augment-client-relationships.ts

# Validate
pnpm exec tsx scripts/validate-data-quality.ts
```

### Step 3.7: Verify Results

1. **Run Audit Again:**
   ```bash
   pnpm exec tsx scripts/audit-data-relationships.ts
   ```

2. **Compare Before/After:**
   - Document improvement metrics
   - Verify all issues resolved

3. **Run Validation:**
   ```bash
   pnpm exec tsx scripts/validate-data-quality.ts
   ```

### Step 3.8: Commit Changes

```bash
git add scripts/ docs/
git commit -m "DATA-002-AUGMENT: Add data augmentation scripts and validation"
```

---

## Phase 4: Completion

**Objective:** Finalize work and update documentation.

### Step 4.1: Verify All Deliverables

- [ ] Referential integrity audit report created
- [ ] Data augmentation scripts for each major domain
- [ ] Updated seed data with proper relationships
- [ ] Validation test suite created
- [ ] Documentation of data model relationships
- [ ] All relationships validated

### Step 4.2: Create Completion Report

Use the template at `docs/templates/COMPLETION_REPORT_TEMPLATE.md`.

**Include:**
- Audit findings (before/after)
- Scripts created
- Relationships established
- Validation results
- Data quality metrics

### Step 4.3: Update Roadmap to Complete

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Update DATA-002-AUGMENT task:
- Change `- [ ]` to `- [x]`
- Change status to `✅ COMPLETE`
- Add completion date: `(Completed: YYYY-MM-DD)`
- Add key commits
- Add actual time spent

### Step 4.4: Archive Session

1. Move session file to `docs/sessions/completed/`
2. Remove from `docs/ACTIVE_SESSIONS.md`

### Step 4.5: Push to Main

```bash
git add docs/roadmaps/MASTER_ROADMAP.md docs/sessions/ scripts/
git commit -m "Complete DATA-002-AUGMENT: Augment seeded data relationships"
git push origin data-002-augment:main
```

**DO NOT create a pull request** - push directly to main.

### Step 4.6: Notify User

Inform the user that DATA-002-AUGMENT is complete and data relationships are now realistic.

---

## ⚡ Quick Reference

**Key Files:**
- `scripts/audit-data-relationships.ts`
- `scripts/augment-orders.ts`
- `scripts/augment-inventory-movements.ts`
- `scripts/augment-financial-chains.ts`
- `scripts/augment-client-relationships.ts`
- `scripts/fix-temporal-coherence.ts`
- `scripts/validate-data-quality.ts`

**Schema Files:**
- `drizzle/schema.ts` (main schema)
- Check for related schema files

**Database Tables:**
- orders, orderItems
- batches, inventoryMovements
- invoices, payments, ledgerEntries
- clients, clientContacts

**Commands:**
```bash
# Run audit
pnpm exec tsx scripts/audit-data-relationships.ts

# Run augmentation
pnpm exec tsx scripts/augment-*.ts

# Validate
pnpm exec tsx scripts/validate-data-quality.ts
```

---

## 🆘 Troubleshooting

**Issue: Too many orphaned records**
- Consider if data should be deleted or linked
- Check if seed scripts need updating
- Verify foreign key constraints in schema

**Issue: Circular dependencies in augmentation**
- Order scripts by dependency (dates first, then orders, then financial)
- Run scripts in correct sequence
- Handle missing dependencies gracefully

**Issue: Performance problems**
- Use batch operations for large datasets
- Add progress logging
- Consider chunking large operations

**Issue: Validation failures**
- Review validation logic
- Check if business rules are correct
- Verify schema constraints match validation

---

**Last Updated:** November 21, 2025

