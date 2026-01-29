# Intended State Model

**Purpose:** Define all entity states, transitions, and invariants from intent sources
**Created:** 2026-01-29
**Sources:** Golden Flow specs, CANONICAL_DICTIONARY.md, GOLDEN_FLOWS_BETA_ROADMAP.md

---

## Entity: Order

**Intent Source:** `docs/golden-flows/specs/GF-003-ORDER-TO-CASH.md:State Transitions`

### States

| State | Description | Mutable | Invariants | Intent Source |
|-------|-------------|---------|------------|---------------|
| `draft` | Order being created/edited | Yes | INV-002 | GF-003:2.1 |
| `confirmed` | Inventory reserved, order locked | No | INV-002, INV-008 | GF-003:2.1 |
| `invoiced` | Invoice generated | No | INV-002, INV-003 | GF-003:2.1 |
| `shipped` | Physically shipped | No | INV-002, INV-006 | GF-003:2.1 |
| `delivered` | Received by customer | Terminal | INV-002 | GF-003:2.1 |
| `cancelled` | Order cancelled | Terminal | - | GF-003:2.2 |

### Transitions

| From | To | Trigger | Guard | Side Effects | Intent Source |
|------|----|---------| ------|--------------|---------------|
| `draft` | `confirmed` | confirm action | All items valid, inventory available | Reserve `reservedQty` | GF-003:3.1 |
| `draft` | `cancelled` | cancel action | - | None | GF-003:2.2 |
| `confirmed` | `invoiced` | generate invoice | - | Create invoice | GF-003:2.1 |
| `confirmed` | `cancelled` | cancel action | Before ship | Release `reservedQty` | GF-005:Alternative |
| `invoiced` | `shipped` | ship action | All items packed | Decrement `onHandQty`, create movement | GF-005:Primary |
| `shipped` | `delivered` | deliver action | - | - | GF-005:Primary |

### Additional Flags

| Flag | Values | Purpose |
|------|--------|---------|
| `isDraft` | boolean | Whether order is in draft state |
| `isSample` | boolean | Whether order is sample (affects inventory pool) |
| `orderType` | QUOTE, SALE | Quote vs actual sale |
| `fulfillmentStatus` | PENDING, PICKING, PACKED, READY, SHIPPED, DELIVERED | Parallel fulfillment tracking |
| `pickPackStatus` | PENDING, PICKING, PACKED, READY | Pick & pack module status |

---

## Entity: Invoice

**Intent Source:** `docs/golden-flows/specs/GF-004-INVOICE-PAYMENT.md:UI States`

### States

| State | Description | Invariants | Intent Source |
|-------|-------------|------------|---------------|
| `DRAFT` | Not yet sent to customer | INV-003 | GF-004:Primary |
| `SENT` | Sent to customer | INV-003 | GF-004:Primary |
| `VIEWED` | Customer has viewed | INV-003 | GF-004:Primary |
| `PARTIAL` | Partially paid | INV-003 | GF-004:Primary |
| `PAID` | Fully paid (terminal) | INV-003, INV-005 | GF-004:Primary |
| `OVERDUE` | Past due date | INV-003 | GF-004:Primary |
| `VOID` | Voided (terminal) | - | GF-004:Primary |

### Transitions

| From | To | Trigger | Guard | Side Effects | Intent Source |
|------|----|---------| ------|--------------|---------------|
| `DRAFT` | `SENT` | markSent | - | - | GF-004 |
| `SENT` | `VIEWED` | view event | - | - | GF-004 |
| `SENT/VIEWED` | `PARTIAL` | payment recorded | `amount < amountDue` | GL entries, update balance | GF-004:Primary |
| `SENT/VIEWED/PARTIAL` | `PAID` | payment recorded | `amount >= amountDue` | GL entries, update balance | GF-004:Primary |
| `*` → `OVERDUE` | checkOverdue job | `dueDate < NOW() AND status NOT IN (PAID, VOID)` | - | GF-004 |
| `*` → `VOID` | void action | Not PAID | Reverse GL entries if any | GF-004 |

### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `total` | decimal | Invoice total |
| `amountPaid` | decimal | Total paid so far |
| `amountDue` | decimal | Calculated: `total - amountPaid` |
| `dueDate` | date | Payment due date |

---

## Entity: Batch (Inventory)

**Intent Source:** `docs/golden-flows/specs/GF-007-INVENTORY-MGMT.md`, `GF-001-DIRECT-INTAKE.md`

### States

| State | Description | Sellable | Invariants | Intent Source |
|-------|-------------|----------|------------|---------------|
| `AWAITING_INTAKE` | Pending verification (FEAT-008) | No | INV-001 | GF-001:Key Distinction |
| `LIVE` | Available for sale | Yes | INV-001, INV-006 | GF-007:Overview |
| `PHOTOGRAPHY_COMPLETE` | Photos taken | Yes | INV-001 | GF-007 |
| `ON_HOLD` | Temporarily unavailable | No | INV-001 | GF-007:5 |
| `QUARANTINED` | Quality issue | No | INV-001 | GF-007:5 |
| `SOLD_OUT` | No remaining quantity | No | INV-001 | GF-007 |
| `CLOSED` | Archived (terminal) | No | - | GF-007 |

### Transitions

| From | To | Trigger | Guard | Side Effects | Intent Source |
|------|----|---------| ------|--------------|---------------|
| `AWAITING_INTAKE` | `LIVE` | verify action | Verification complete (FEAT-008) | - | GF-001:4 |
| `LIVE` | `ON_HOLD` | hold action | Reason required | Log audit | GF-007:5 |
| `LIVE` | `QUARANTINED` | quarantine action | Reason required | Move qty to `quarantineQty` | GF-007:5 |
| `ON_HOLD` | `LIVE` | release action | - | Log audit | GF-007 |
| `QUARANTINED` | `LIVE` | release action | - | Move qty back | GF-007 |
| `LIVE` | `SOLD_OUT` | sell/allocate | `availableQty = 0` | Automatic | GF-007 |
| `*` | `CLOSED` | close action | Admin only | Terminal | GF-007 |

### Quantity Fields

| Field | Calculation | Description |
|-------|-------------|-------------|
| `onHandQty` | - | Total physical quantity |
| `reservedQty` | - | Reserved for confirmed orders |
| `sampleQty` | - | Designated for samples |
| `quarantineQty` | - | Quality hold quantity |
| `holdQty` | - | Administrative hold |
| `availableQty` | `onHandQty - reservedQty - quarantineQty - holdQty` | Available for sale |

---

## Entity: Purchase Order

**Intent Source:** `docs/golden-flows/specs/GF-002-PROCURE-TO-PAY.md`

### States

| State | Description | Invariants | Intent Source |
|-------|-------------|------------|---------------|
| `DRAFT` | Being created | - | GF-002:4 |
| `SENT` | Sent to vendor | - | GF-002:4 |
| `CONFIRMED` | Vendor confirmed | - | GF-002:4 |
| `RECEIVING` | Partially received | INV-001 | GF-002:5 |
| `RECEIVED` | Fully received | INV-001 | GF-002:5 |
| `CANCELLED` | Cancelled (terminal) | - | GF-002 |

### Transitions

| From | To | Trigger | Guard | Side Effects | Intent Source |
|------|----|---------| ------|--------------|---------------|
| `DRAFT` | `SENT` | submit | Valid line items | - | GF-002:4 |
| `SENT` | `CONFIRMED` | confirm | Vendor action | - | GF-002:4 |
| `CONFIRMED` | `RECEIVING` | partial receipt | `receivedQty < orderedQty` | Create batches | GF-002:5 |
| `CONFIRMED/RECEIVING` | `RECEIVED` | full receipt | `receivedQty >= orderedQty` | Create batches | GF-002:5 |
| `DRAFT/SENT` | `CANCELLED` | cancel | Before receipt | - | GF-002 |

---

## Entity: Sample Request

**Intent Source:** `docs/golden-flows/specs/GF-008-SAMPLE-REQUEST.md`

### States

| State | UI Label | Description | Intent Source |
|-------|----------|-------------|---------------|
| `PENDING` | Pending | Awaiting fulfillment | GF-008:Primary |
| `FULFILLED` | Approved | Sample distributed | GF-008:Primary |
| `RETURN_REQUESTED` | Return Requested | Return initiated | GF-008:Alternative |
| `RETURNED` | Returned | Sample returned | GF-008:Alternative |
| `VENDOR_RETURN_REQUESTED` | Vendor Return | Going back to vendor | GF-008:Alternative |
| `CANCELLED` | Cancelled | Request cancelled (terminal) | GF-008:Alternative |

### Transitions

| From | To | Trigger | Guard | Side Effects | Intent Source |
|------|----|---------| ------|--------------|---------------|
| `PENDING` | `FULFILLED` | fulfill | Sample qty available, allocation ok | Decrement `sampleQty`, log movement | GF-008:5 |
| `PENDING` | `CANCELLED` | cancel | - | - | GF-008:Alternative |
| `FULFILLED` | `RETURN_REQUESTED` | request return | Reason required | - | GF-008:SAMPLE-006 |
| `RETURN_REQUESTED` | `RETURNED` | complete return | - | Increment `sampleQty` | GF-008 |
| `FULFILLED` | `VENDOR_RETURN_REQUESTED` | vendor return | - | - | GF-008 |

---

## Entity: Fiscal Period

**Intent Source:** `docs/reference/FLOW_GUIDE.md:Domain 1.6`

### States

| State | Description | Intent Source |
|-------|-------------|---------------|
| `OPEN` | Accepting transactions | FLOW_GUIDE:1.6 |
| `CLOSED` | Period closed, can reopen | FLOW_GUIDE:1.6 |
| `LOCKED` | Permanently locked (terminal) | FLOW_GUIDE:1.6 |

### Transitions

| From | To | Trigger | Intent Source |
|------|----|---------| --------------|
| `OPEN` | `CLOSED` | close | FLOW_GUIDE:1.6 |
| `CLOSED` | `OPEN` | reopen | FLOW_GUIDE:1.6 |
| `CLOSED` | `LOCKED` | lock | FLOW_GUIDE:1.6 |

---

## State Diagram References

See `01_STATE_MODEL_INTENDED.mmd` for Mermaid diagrams of each entity's state machine.
