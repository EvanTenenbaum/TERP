# Intended Invariants

**Purpose:** Business rules that must ALWAYS hold true across the system
**Created:** 2026-01-29
**Primary Source:** `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md:Critical Business Invariants`

---

## Core Invariants

| ID | Rule | Entities | Severity | Intent Source |
|----|------|----------|----------|---------------|
| INV-001 | `inventory.onHandQty >= 0` | batches | CRITICAL | GOLDEN_FLOWS_BETA_ROADMAP.md |
| INV-002 | `order.total = sum(line_items.subtotal)` | orders, order_items | CRITICAL | GOLDEN_FLOWS_BETA_ROADMAP.md |
| INV-003 | `invoice.balance = total - amountPaid` | invoices | CRITICAL | GOLDEN_FLOWS_BETA_ROADMAP.md |
| INV-004 | `GL debits = GL credits` per transaction | gl_entries | CRITICAL | GOLDEN_FLOWS_BETA_ROADMAP.md |
| INV-005 | `client.totalOwed = sum(unpaid_invoices)` | clients, invoices | CRITICAL | GOLDEN_FLOWS_BETA_ROADMAP.md |
| INV-006 | `batch.onHandQty = initialQty - sum(allocations)` | batches, inventory_movements | CRITICAL | GOLDEN_FLOWS_BETA_ROADMAP.md |
| INV-007 | Audit trail exists for all mutations | all tables | HIGH | GOLDEN_FLOWS_BETA_ROADMAP.md |
| INV-008 | Order state transitions follow valid paths only | orders | HIGH | GOLDEN_FLOWS_BETA_ROADMAP.md |

---

## Invariant Details

### INV-001: Non-Negative Inventory

**Rule:** `inventory.onHandQty >= 0`

**Description:** Inventory quantity can never go negative. This prevents overselling and ensures inventory accuracy.

**Entities Affected:**
- `batches.onHandQty`
- `batches.reservedQty`
- `batches.sampleQty`
- `batches.quarantineQty`
- `batches.holdQty`

**Enforcement Points:**
- Order confirmation (reserve inventory)
- Order fulfillment (decrement inventory)
- Sample fulfillment (decrement sample qty)
- Inventory adjustments

**Verification SQL:**
```sql
SELECT id, onHandQty, reservedQty, sampleQty, quarantineQty, holdQty
FROM batches
WHERE onHandQty < 0
   OR reservedQty < 0
   OR sampleQty < 0
   OR quarantineQty < 0
   OR holdQty < 0;
-- Expected: 0 rows
```

**Golden Flows Affected:** GF-001, GF-002, GF-003, GF-005, GF-007, GF-008

---

### INV-002: Order Total Consistency

**Rule:** `order.total = sum(line_items.subtotal)`

**Description:** Order total must equal the sum of all line item subtotals.

**Entities Affected:**
- `orders.total`
- `order_items.subtotal`

**Enforcement Points:**
- Order creation
- Line item add/update/remove
- Order recalculation

**Verification SQL:**
```sql
SELECT o.id, o.total, SUM(oi.subtotal) as calculated_total
FROM orders o
LEFT JOIN order_items oi ON oi.orderId = o.id
GROUP BY o.id
HAVING o.total != COALESCE(SUM(oi.subtotal), 0);
-- Expected: 0 rows
```

**Golden Flows Affected:** GF-003

---

### INV-003: Invoice Balance Accuracy

**Rule:** `invoice.balance = total - amountPaid`

**Description:** Invoice balance must accurately reflect remaining amount due.

**Entities Affected:**
- `invoices.total`
- `invoices.amountPaid`
- `invoices.amountDue` (derived)

**Enforcement Points:**
- Payment recording
- Payment voiding
- Invoice void

**Verification SQL:**
```sql
SELECT id, total, amountPaid, (total - amountPaid) as calculated_balance
FROM invoices
WHERE status NOT IN ('VOID')
  AND (total - amountPaid) < 0;
-- Expected: 0 rows (no negative balances)
```

**Golden Flows Affected:** GF-003, GF-004

---

### INV-004: GL Balance

**Rule:** `GL debits = GL credits` per transaction

**Description:** General Ledger entries must always balance. Every transaction must have equal debits and credits.

**Entities Affected:**
- `gl_entries.debit`
- `gl_entries.credit`

**Enforcement Points:**
- Payment recording (Debit Cash, Credit AR)
- Bill payment (Debit AP, Credit Cash)
- Any GL posting

**Verification SQL:**
```sql
SELECT sourceType, sourceId, SUM(debit) as total_debit, SUM(credit) as total_credit
FROM gl_entries
GROUP BY sourceType, sourceId
HAVING ABS(SUM(debit) - SUM(credit)) > 0.01;
-- Expected: 0 rows
```

**Golden Flows Affected:** GF-002, GF-004

---

### INV-005: Client Balance Accuracy

**Rule:** `client.totalOwed = sum(unpaid_invoices)`

**Description:** Client's total owed must equal the sum of their unpaid invoice balances.

**Entities Affected:**
- `clients.totalOwed`
- `invoices` (per client)

**Enforcement Points:**
- Invoice creation
- Payment recording
- Invoice void
- `syncClientBalance()` utility (ARCH-002)

**Verification SQL:**
```sql
SELECT c.id, c.name, c.totalOwed,
       COALESCE(SUM(i.total - i.amountPaid), 0) as calculated_owed
FROM clients c
LEFT JOIN invoices i ON i.customerId = c.id AND i.status NOT IN ('VOID', 'PAID')
GROUP BY c.id
HAVING ABS(c.totalOwed - COALESCE(SUM(i.total - i.amountPaid), 0)) > 0.01;
-- Expected: 0 rows
```

**Golden Flows Affected:** GF-003, GF-004, GF-006

---

### INV-006: Batch Quantity Tracking

**Rule:** `batch.onHandQty = initialQty - sum(allocations)`

**Description:** Batch on-hand quantity must accurately reflect initial quantity minus all allocations (sales, samples, adjustments).

**Entities Affected:**
- `batches.onHandQty`
- `inventory_movements`

**Enforcement Points:**
- Order fulfillment
- Sample fulfillment
- Inventory adjustments
- Returns

**Verification SQL:**
```sql
SELECT b.id, b.onHandQty,
       b.initialQty - COALESCE(SUM(
         CASE WHEN im.type IN ('SALE', 'SAMPLE', 'ADJUSTMENT_OUT') THEN im.quantity
              WHEN im.type IN ('RETURN', 'ADJUSTMENT_IN') THEN -im.quantity
              ELSE 0 END
       ), 0) as calculated_qty
FROM batches b
LEFT JOIN inventory_movements im ON im.batchId = b.id
GROUP BY b.id
HAVING ABS(b.onHandQty - calculated_qty) > 0.01;
-- Note: Simplified - actual calculation may vary
```

**Golden Flows Affected:** GF-001, GF-003, GF-005, GF-007

---

### INV-007: Audit Trail Completeness

**Rule:** Audit trail exists for all mutations

**Description:** Every data modification must have actor attribution (who did it, when).

**Entities Affected:**
- All tables with `createdBy`, `updatedBy` columns

**Enforcement Points:**
- All mutations (create, update, delete)
- `strictlyProtectedProcedure` enforcement
- No fallback user IDs (`ctx.user?.id || 1` forbidden)

**Verification SQL:**
```sql
SELECT 'orders' as table_name, COUNT(*) as missing_audit
FROM orders WHERE createdBy IS NULL
UNION ALL
SELECT 'invoices', COUNT(*) FROM invoices WHERE createdBy IS NULL
UNION ALL
SELECT 'payments', COUNT(*) FROM payments WHERE createdBy IS NULL
UNION ALL
SELECT 'batches', COUNT(*) FROM batches WHERE createdBy IS NULL;
-- Expected: All counts = 0
```

**Golden Flows Affected:** All flows

---

### INV-008: Valid State Transitions

**Rule:** Order state transitions follow valid paths only

**Description:** Entities can only transition between states according to defined state machines.

**Entities Affected:**
- `orders.status`
- `orders.fulfillmentStatus`
- `invoices.status`
- `batches.status`
- `purchase_orders.status`
- `sample_requests.status`

**Enforcement Points:**
- Status update mutations
- State machine validation in services

**Verification:**
- See `01_STATE_MODEL_INTENDED.md` for valid transitions
- Invalid transitions should throw errors

**Golden Flows Affected:** All flows

---

## Invariant Violation Handling

### Detection
- Automated checks in CI/CD
- Scheduled validation jobs
- Real-time validation in mutations

### Response
1. **P0 (CRITICAL):** Stop deployment, rollback if needed
2. **Log incident** in `docs/incidents/`
3. **Notify Evan** immediately
4. **Root cause analysis** required
5. **Fix and verify** before proceeding

### Escalation Path

| Invariant | Violation Impact | Escalation |
|-----------|------------------|------------|
| INV-001 | Overselling, inventory loss | Immediate - block orders |
| INV-002 | Financial inaccuracy | High - review recent orders |
| INV-003 | AR inaccuracy | High - reconcile invoices |
| INV-004 | GL out of balance | Critical - accounting freeze |
| INV-005 | Client balance wrong | Medium - resync balances |
| INV-006 | Inventory tracking broken | High - full audit |
| INV-007 | Audit trail missing | Medium - compliance risk |
| INV-008 | Invalid data state | High - manual correction |
