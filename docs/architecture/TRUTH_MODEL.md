# TERP Truth Model and Invariants

**Version**: 1.0
**Status**: Active
**Last Updated**: 2026-01-25
**Task**: REL-001

## Overview

This document defines the **sources of truth** for critical data domains in TERP and the **invariants** that must always hold. These invariants are enforced by the reliability infrastructure (REL-004, REL-006) and validated by gate scripts.

## Core Principles

1. **Single Source of Truth**: Each data domain has exactly one authoritative source
2. **Derived Data Must Match**: Any derived or cached values must match the source of truth
3. **Invariants Are Non-Negotiable**: These rules must hold after every transaction
4. **Audit Trail Required**: All changes to truth sources must be logged

---

## Data Domains

### 1. Inventory Truth

**Source of Truth**: `batches.onHandQty` + `inventoryMovements`

The inventory system tracks physical goods. The `batches` table holds current quantities, while `inventoryMovements` provides the audit trail.

#### Truth Tables

| Table                | Purpose                 | Key Columns                                                         |
| -------------------- | ----------------------- | ------------------------------------------------------------------- |
| `batches`            | Current inventory state | `id`, `onHandQty`, `allocatedQty`, `status`                         |
| `lots`               | Receiving groupings     | `id`, `status`, `totalQty`, `remainingQty`                          |
| `inventoryMovements` | Audit trail             | `batchId`, `inventoryMovementType`, `quantityChange`, `performedBy` |

#### Invariants

```sql
-- INV-001: Batch quantity must never be negative
batches.onHandQty >= 0

-- INV-002: Allocated qty cannot exceed on-hand
batches.allocatedQty <= batches.onHandQty

-- INV-003: Lot remaining equals sum of batch on-hand
lots.remainingQty = SUM(batches.onHandQty WHERE batches.lotId = lots.id)

-- INV-004: Movement history reconciles to current qty
batches.onHandQty = initial_qty + SUM(inventoryMovements.quantityChange)

-- INV-005: Only LIVE/PHOTOGRAPHY_COMPLETE batches can be allocated
IF batch is allocated THEN batch.status IN ('LIVE', 'PHOTOGRAPHY_COMPLETE')
```

#### Critical Operations

- **Allocation**: Decreases `onHandQty`, creates negative movement
- **Receiving**: Increases `onHandQty`, creates positive movement
- **Return/Restock**: Increases `onHandQty`, creates positive movement
- **Adjustment**: Creates corrective movement with reason

---

### 2. Financial Truth (Accounts Receivable)

**Source of Truth**: `invoices.amountDue` = `invoices.totalAmount` - `SUM(payments.amount)`

The AR system tracks money owed by customers. Invoice totals are set at creation, payments reduce the balance.

#### Truth Tables

| Table      | Purpose         | Key Columns                                                 |
| ---------- | --------------- | ----------------------------------------------------------- |
| `invoices` | Customer bills  | `id`, `totalAmount`, `amountPaid`, `amountDue`, `status`    |
| `payments` | Payment records | `id`, `invoiceId`, `amount`, `paymentMethod`, `paymentDate` |
| `credits`  | Credit memos    | `id`, `clientId`, `amount`, `appliedAmount`, `balance`      |

#### Invariants

```sql
-- AR-001: Invoice amounts are consistent
invoices.amountDue = invoices.totalAmount - invoices.amountPaid

-- AR-002: Amount paid matches payment records
invoices.amountPaid = COALESCE(SUM(payments.amount WHERE payments.invoiceId = invoices.id), 0)

-- AR-003: Client total owed matches sum of unpaid invoices
clients.totalOwed = SUM(invoices.amountDue WHERE invoices.clientId = clients.id AND invoices.status NOT IN ('PAID', 'VOID'))

-- AR-004: Payment amount cannot exceed invoice balance
Each payment.amount <= invoice.amountDue (at time of payment)

-- AR-005: Credit balance consistency
credits.balance = credits.amount - credits.appliedAmount

-- AR-006: Invoice status reflects payment state
IF invoices.amountDue = 0 THEN invoices.status = 'PAID'
IF invoices.amountDue > 0 AND invoices.amountPaid > 0 THEN invoices.status = 'PARTIAL'
```

#### Critical Operations

- **Record Payment**: Increases `amountPaid`, decreases `amountDue`, creates payment record
- **Apply Credit**: Reduces `amountDue`, creates credit application record
- **Void Invoice**: Sets status to VOID, does not affect already-recorded payments

---

### 3. Financial Truth (Accounts Payable)

**Source of Truth**: `vendorReturns`, `bills`, `lots` (for consignment)

AP tracks money owed to suppliers/vendors.

#### Truth Tables

| Table           | Purpose                        | Key Columns                                                           |
| --------------- | ------------------------------ | --------------------------------------------------------------------- |
| `lots`          | Purchase records (consignment) | `id`, `vendorId`, `paymentTerms`, `totalCost`                         |
| `vendorReturns` | Return requests                | `id`, `orderId`, `vendorId`, `status`, `totalValue`, `creditReceived` |
| `bills`         | Vendor invoices                | `id`, `vendorId`, `totalAmount`, `amountPaid`, `status`               |

#### Invariants

```sql
-- AP-001: Vendor return value matches item costs
vendorReturns.totalValue = SUM(vendorReturnItems.quantity * vendorReturnItems.unitCost)

-- AP-002: Consignment payable tracks with lot sales
payable_to_vendor = SUM(lots.totalCost WHERE lots.vendorId = vendor.id AND status = 'SOLD')

-- AP-003: Credit received cannot exceed return value
vendorReturns.creditReceived <= vendorReturns.totalValue
```

---

### 4. Order Truth

**Source of Truth**: `orders.fulfillmentStatus` + `orderStatusHistory`

The order system tracks the lifecycle of customer orders from creation to fulfillment.

#### Truth Tables

| Table                      | Purpose           | Key Columns                                                    |
| -------------------------- | ----------------- | -------------------------------------------------------------- |
| `orders`                   | Order headers     | `id`, `orderNumber`, `clientId`, `fulfillmentStatus`, `total`  |
| `orderLineItems`           | Order details     | `id`, `orderId`, `productId`, `quantity`, `unitPrice`          |
| `orderLineItemAllocations` | Batch allocations | `id`, `orderLineItemId`, `batchId`, `quantityAllocated`        |
| `orderStatusHistory`       | Audit trail       | `id`, `orderId`, `fulfillmentStatus`, `changedBy`, `createdAt` |

#### Invariants

```sql
-- ORD-001: Order total matches line items
orders.total = SUM(orderLineItems.quantity * orderLineItems.unitPrice WHERE orderLineItems.orderId = orders.id)

-- ORD-002: Allocation quantity matches line item
SUM(orderLineItemAllocations.quantityAllocated WHERE lineItemId = X) = orderLineItems.quantity

-- ORD-003: Valid status transitions only
-- See server/services/orderStateMachine.ts for valid transitions

-- ORD-004: Status history is append-only
-- Status history records should never be deleted or modified

-- ORD-005: Draft orders have no allocations
IF orders.isDraft = true THEN orderLineItemAllocations = EMPTY for that order
```

#### Status Transition Rules

```
DRAFT → CONFIRMED, CANCELLED
CONFIRMED → PENDING, CANCELLED
PENDING → PACKED, CANCELLED
PACKED → SHIPPED, PENDING
SHIPPED → DELIVERED, RETURNED
DELIVERED → RETURNED
RETURNED → RESTOCKED, RETURNED_TO_VENDOR
RESTOCKED → (terminal)
RETURNED_TO_VENDOR → (terminal)
CANCELLED → (terminal)
```

---

### 5. Client Truth (Party Model)

**Source of Truth**: `clients` table (unified party model)

All business entities (customers, suppliers, both) are stored in the unified `clients` table.

#### Truth Tables

| Table              | Purpose                | Key Columns                                      |
| ------------------ | ---------------------- | ------------------------------------------------ |
| `clients`          | All parties            | `id`, `name`, `isBuyer`, `isSeller`, `totalOwed` |
| `supplierProfiles` | Extended supplier data | `clientId`, `licenseNumber`, `legacyVendorId`    |

#### Invariants

```sql
-- CLI-001: Supplier profile requires isSeller flag
IF supplierProfiles.clientId = X THEN clients.isSeller = true WHERE clients.id = X

-- CLI-002: Customer operations require isBuyer flag
Orders, Invoices only for clients WHERE isBuyer = true

-- CLI-003: Supplier operations require isSeller flag
Lots, PurchaseOrders only for clients WHERE isSeller = true

-- CLI-004: No orphan profiles
Every supplierProfiles.clientId must exist in clients.id

-- CLI-005: Legacy vendor ID mapping is unique
supplierProfiles.legacyVendorId is unique when not null
```

---

## Enforcement

### Transaction-Level Enforcement

All critical mutations use the `criticalMutation` wrapper (REL-004) which:

1. Wraps operations in database transactions
2. Retries on transient failures (deadlocks, timeouts)
3. Provides idempotency for duplicate request protection (single-instance only)
4. Logs all operations for debugging

> **Known Limitation**: Idempotency cache is in-memory and does not work across
> multiple server instances. For multi-instance deployments, migrate to Redis
> or database-backed idempotency keys before scaling horizontally.

### Row-Level Locking

Inventory operations use `inventoryLocking` (REL-006) which:

1. Acquires row-level locks using `SELECT ... FOR UPDATE`
2. Prevents concurrent modifications to same batch
3. Orders locks to prevent deadlocks
4. Times out gracefully with retry guidance

### Gate Scripts

Validation scripts verify invariants hold before deployments:

```bash
# Check all invariants before deployment
pnpm gate:invariants
```

The gate script (`scripts/qa/invariant-checks.ts`) validates:

- **INV-001**: Batch quantities non-negative
- **INV-002**: Allocated qty <= on-hand qty
- **AR-001**: Invoice amounts consistent (amountDue = totalAmount - amountPaid)
- **AR-002**: Amount paid matches payment records
- **ORD-001**: Order totals match line items
- **ORD-REF**: No orphaned order items
- **CLI-001**: Supplier profiles have isSeller flag
- **PAY-001**: Payment amounts are positive

See also: `pnpm mega:qa:invariants` for the Mega QA invariant suite.

### Monitoring

> **TODO**: Production monitoring alerts are not yet implemented.
> Future work should add alerts for invariant violations:
>
> - Batch has negative quantity
> - Invoice amounts don't reconcile
> - Invalid order status transitions

---

## Recovery Procedures

### Inventory Discrepancy

If `batches.onHandQty` doesn't match movement history:

1. Freeze affected batches (`status = 'QUARANTINED'`)
2. Run reconciliation report
3. Create adjustment movement with reason
4. Document in incident report

### AR Discrepancy

If invoice amounts don't reconcile with payments:

1. Run AR reconciliation report
2. Identify missing/duplicate payments
3. Create corrective journal entries
4. Update invoice status appropriately

### Order Status Corruption

If order has invalid status:

1. Check `orderStatusHistory` for valid path
2. Insert corrective history record
3. Update current status to valid state
4. Notify operations team

---

## Related Documents

- [CLAUDE.md](/CLAUDE.md) - Development protocols
- [orderStateMachine.ts](/server/services/orderStateMachine.ts) - Status transitions
- [criticalMutation.ts](/server/_core/criticalMutation.ts) - Transaction safety
- [inventoryLocking.ts](/server/_core/inventoryLocking.ts) - Concurrency control
