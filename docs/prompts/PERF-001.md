# PERF-001: Add Missing Database Indexes

<!-- METADATA (for validation) -->
<!-- TASK_ID: PERF-001 -->
<!-- TASK_TITLE: Add Missing Database Indexes -->
<!-- PROMPT_VERSION: 1.0 -->
<!-- LAST_VALIDATED: 2025-11-30 -->

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** PERF-001  
**Priority:** P1 (HIGH - PERFORMANCE)  
**Estimated Time:** 16 hours  
**Module:** Database Schema, Performance Optimization

---

## 📋 Table of Contents

1. [Context](#context)
2. [Phase 1: Pre-Flight Check](#phase-1-pre-flight-check)
3. [Phase 2: Session Startup](#phase-2-session-startup)
4. [Phase 3: Implementation](#phase-3-implementation)
5. [Phase 4: Completion](#phase-4-completion)
6. [Quick Reference](#quick-reference)
7. [Troubleshooting](#troubleshooting)

---

## 🎯 Context

**Background:**
The TERP database schema has 107 tables with many foreign key relationships. Currently, many foreign keys lack proper indexes, causing slow query performance as the database grows. This task systematically adds missing indexes to improve query performance.

**Goal:**
Audit all foreign keys and common query patterns, then add appropriate indexes to optimize database performance.

**Success Criteria:**

- [ ] All foreign keys have indexes
- [ ] Common query patterns have composite indexes
- [ ] Performance benchmarks show measurable improvement
- [ ] All tests passing
- [ ] Zero TypeScript errors
- [ ] Migration created and tested
- [ ] Documentation updated

---

## 🚨 MANDATORY: Use Gemini API for Code Generation

**ALL code generation and analysis MUST use Google Gemini API:**

```python
from google import genai
import os
client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
```

**Full instructions:** `docs/GEMINI_API_USAGE.md` | **This is non-negotiable.**

---

## Phase 1: Pre-Flight Check

**Objective:** Verify environment and check for conflicts BEFORE starting work.

### Step 1.1: Register Your Session

1. Create session file: `docs/sessions/active/Session-$(date +%Y%m%d)-PERF-001-$(openssl rand -hex 4).md`
2. Use template: `docs/templates/SESSION_TEMPLATE.md`
3. Fill in your session details.

### Step 1.2: Register Session (Atomic) ⚠️ CRITICAL

**This step prevents race conditions. Follow it exactly.**

1. `git pull origin main` (to get the latest `ACTIVE_SESSIONS.md`)
2. Read `docs/ACTIVE_SESSIONS.md` and check for module conflicts.
3. If clear, add your session to the file.
4. Commit and push **immediately**:
   ```bash
   git add docs/ACTIVE_SESSIONS.md
   git commit -m "Register session for PERF-001"
   git push origin main
   ```
5. **If the push fails due to a conflict, another agent registered first.** STOP, pull again, and re-evaluate.

### Step 1.3: Verify Environment

```bash
node --version
pnpm --version
git status
```

### Step 1.4: Verify Permissions

Test your push access: `git push --dry-run origin main`

---

## Phase 2: Session Startup

**Objective:** Set up your workspace and update the roadmap.

### Step 2.1: Create Feature Branch

```bash
git checkout main
git pull origin main
git checkout -b perf-001-database-indexes
```

### Step 2.2: Update Roadmap Status

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Find the PERF-001 task and update status to `⏳ IN PROGRESS`.

### Step 2.3: Update Session File Progress

Update your session file with your progress.

---

## Phase 3: Implementation

**Objective:** Audit schema, identify missing indexes, and add them.

### Step 3.1: Audit Current Schema

**Action:** Review `drizzle/schema.ts` and identify all foreign key relationships.

**Use Gemini API to analyze schema:**

```python
from google import genai
import os

client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))

# Read schema file
with open('drizzle/schema.ts', 'r') as f:
    schema_content = f.read()

# Analyze with Gemini
response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=f"""Analyze this Drizzle ORM schema and identify:
1. All foreign key relationships
2. Foreign keys that lack indexes
3. Common query patterns that would benefit from composite indexes

Schema:
{schema_content}

Output format:
- Missing FK indexes: [list]
- Recommended composite indexes: [list with reasoning]
"""
)

print(response.text)
```

**Expected Output:**
- List of all foreign keys
- Foreign keys without indexes
- Recommended composite indexes

**Document:** Create `docs/PERF-001-SCHEMA-AUDIT.md` with findings.

### Step 3.2: Identify Priority Indexes

**High-Priority Foreign Keys** (from roadmap):
- `orders.clientId` - Orders filtered by client
- `orderLineItems.orderId` - Line items per order
- `inventoryMovements.batchId` - Movements per batch
- `batches.productId` - Batches per product
- `batches.lotId` - Batches per lot
- `invoices.orderId` - Invoices per order
- `payments.invoiceId` - Payments per invoice

**Common Query Patterns** (composite indexes):
- `orders (clientId, status)` - Client orders by status
- `batches (status, createdAt)` - Recent batches by status
- `orderLineItems (orderId, batchId)` - Order items with inventory
- `inventoryMovements (batchId, movementType, createdAt)` - Batch history

### Step 3.3: Create Index Definitions

**Action:** Add index definitions to `drizzle/schema.ts`.

**Example:**

```typescript
import { index } from 'drizzle-orm/pg-core';

// Add to orders table definition
export const orders = pgTable('orders', {
  // ... existing columns
}, (table) => ({
  // Existing indexes
  // Add new indexes
  clientIdIdx: index('orders_client_id_idx').on(table.clientId),
  clientStatusIdx: index('orders_client_status_idx').on(table.clientId, table.status),
}));

// Add to orderLineItems table
export const orderLineItems = pgTable('order_line_items', {
  // ... existing columns
}, (table) => ({
  orderIdIdx: index('order_line_items_order_id_idx').on(table.orderId),
  orderBatchIdx: index('order_line_items_order_batch_idx').on(table.orderId, table.batchId),
}));
```

**Use Gemini API to generate index definitions:**

```python
response = client.models.generate_content(
    model='gemini-2.0-flash-exp',
    contents=f"""Generate Drizzle ORM index definitions for these missing indexes:

Missing indexes:
{missing_indexes_list}

Composite indexes:
{composite_indexes_list}

Follow this pattern:
```typescript
export const tableName = pgTable('table_name', {{
  // columns
}}, (table) => ({{
  indexName: index('index_name').on(table.column1, table.column2),
}}));
```

Generate complete index definitions.
"""
)
```

### Step 3.4: Create Database Migration

**Action:** Generate migration file for new indexes.

```bash
cd /home/ubuntu/TERP
pnpm drizzle-kit generate:pg
```

**Verify migration file created in `drizzle/migrations/`**

**Review migration SQL:**
- Ensure all indexes are created correctly
- Check for naming conflicts
- Verify index types (btree by default)

### Step 3.5: Test Migration Locally

**Action:** Apply migration to local database.

```bash
pnpm drizzle-kit push:pg
```

**Verify:**
- Migration applies without errors
- All indexes created successfully
- No existing data affected

### Step 3.6: Benchmark Performance

**Action:** Measure query performance before and after indexes.

**Create benchmark script** `scripts/benchmark-indexes.ts`:

```typescript
import { db } from '../server/_core/db';
import { orders, orderLineItems, batches } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function benchmarkQueries() {
  console.log('Benchmarking database queries...\n');

  // Benchmark 1: Orders by client
  const start1 = Date.now();
  await db.select().from(orders).where(eq(orders.clientId, 1)).limit(100);
  const time1 = Date.now() - start1;
  console.log(`Orders by client: ${time1}ms`);

  // Benchmark 2: Order line items
  const start2 = Date.now();
  await db.select().from(orderLineItems).where(eq(orderLineItems.orderId, 1));
  const time2 = Date.now() - start2;
  console.log(`Order line items: ${time2}ms`);

  // Benchmark 3: Batches by status
  const start3 = Date.now();
  await db.select().from(batches).where(eq(batches.status, 'IN_STOCK')).limit(100);
  const time3 = Date.now() - start3;
  console.log(`Batches by status: ${time3}ms`);

  console.log('\nBenchmark complete.');
}

benchmarkQueries();
```

**Run benchmark:**
```bash
pnpm tsx scripts/benchmark-indexes.ts
```

**Document results** in `docs/PERF-001-BENCHMARK-RESULTS.md`:
- Before indexes: [times]
- After indexes: [times]
- Performance improvement: [percentage]

### Step 3.7: Run Tests

**Action:** Verify all tests pass with new indexes.

```bash
pnpm test
```

**Expected:** All tests pass, no regressions.

### Step 3.8: Verify TypeScript

```bash
pnpm check
```

**Expected:** Zero TypeScript errors.

---

## Phase 4: Completion

**Objective:** Finalize implementation and create completion report.

### Step 4.1: Create Completion Report

**File:** `docs/PERF-001-COMPLETION-REPORT.md`

**Include:**
- Summary of indexes added
- Performance benchmark results
- Migration file location
- Any issues encountered
- Recommendations for future optimization

### Step 4.2: Update Roadmap

**File:** `docs/roadmaps/MASTER_ROADMAP.md`

Update PERF-001:
- Change status to `✅ COMPLETE`
- Add completion date: `(Completed: YYYY-MM-DD)`
- Add actual time spent
- Link to completion report

### Step 4.3: Update ACTIVE_SESSIONS.md

Mark your session as complete.

### Step 4.4: Commit and Push

```bash
git add .
git commit -m "Complete PERF-001: Add missing database indexes

- Added indexes to all foreign keys
- Added composite indexes for common query patterns
- Performance improvement: [X]%
- All tests passing"
git push origin perf-001-database-indexes:main
```

**Note:** Push directly to main (no PR needed per protocol).

### Step 4.5: Archive Session

Move session file from `docs/sessions/active/` to `docs/sessions/completed/`.

---

## ⚡ Quick Reference

**Key Files:**
- `drizzle/schema.ts` - Schema definitions with indexes
- `drizzle/migrations/` - Migration files
- `scripts/benchmark-indexes.ts` - Performance benchmark script

**Key Commands:**
```bash
# Generate migration
pnpm drizzle-kit generate:pg

# Apply migration
pnpm drizzle-kit push:pg

# Run benchmark
pnpm tsx scripts/benchmark-indexes.ts

# Run tests
pnpm test

# Type check
pnpm check
```

**Index Naming Convention:**
- Single column: `{table}_{column}_idx`
- Composite: `{table}_{col1}_{col2}_idx`

---

## 🆘 Troubleshooting

**Issue:** Migration fails to apply
- **Solution:** Check for existing indexes with same name, review migration SQL

**Issue:** Performance doesn't improve
- **Solution:** Verify indexes are being used (check query execution plans), ensure statistics are updated

**Issue:** Tests fail after adding indexes
- **Solution:** Indexes shouldn't break tests; investigate test failures separately

**Issue:** TypeScript errors in schema
- **Solution:** Ensure index definitions follow Drizzle ORM syntax exactly

---

## 📊 Expected Deliverables

1. ✅ Schema audit document (`docs/PERF-001-SCHEMA-AUDIT.md`)
2. ✅ Updated schema with index definitions (`drizzle/schema.ts`)
3. ✅ Database migration file (`drizzle/migrations/XXXX_add_indexes.sql`)
4. ✅ Benchmark script (`scripts/benchmark-indexes.ts`)
5. ✅ Benchmark results document (`docs/PERF-001-BENCHMARK-RESULTS.md`)
6. ✅ Completion report (`docs/PERF-001-COMPLETION-REPORT.md`)
7. ✅ All tests passing
8. ✅ Zero TypeScript errors
9. ✅ Session archived

---

**Last Updated:** November 30, 2025
