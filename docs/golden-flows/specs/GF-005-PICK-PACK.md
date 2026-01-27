# GF-005: Pick & Pack - Specification

**Version:** 2.0
**Created:** 2026-01-27
**Updated:** 2026-01-27
**Author:** Claude Code Agent
**Status:** ACTIVE
**Owner Role:** Fulfillment

---

## Overview

The Pick & Pack flow handles warehouse fulfillment operations for confirmed sales orders. TERP implements **two parallel systems** that work together:

1. **Pick & Pack Module (WS-003)** - Warehouse bag-based packing workflow
   - Route: `/pick-pack`
   - Router: `pickPackRouter`
   - Manages: Bag creation, item-to-bag assignments, packing status

2. **Order Fulfillment** - Shipping and inventory workflow
   - Router: `ordersRouter`
   - Manages: Status transitions, inventory reservation release, shipping

This flow is the critical link between order confirmation and physical delivery, ensuring inventory is properly decremented and orders transition through fulfillment states correctly.

---

## User Journey

### Primary Flow: Order Queue to Shipped

1. **User navigates to `/pick-pack`** (requires Admin role via `adminProcedure`)
2. **Views pick list queue** with stats dashboard:
   - Pending: Orders awaiting pick
   - Picking: Orders currently being picked
   - Packed: All items in bags
   - Ready: Ready for shipping
3. **Filters/searches orders** using:
   - Status dropdown filter (All, PENDING, PICKING, PACKED, READY)
   - Search by order number or client name
4. **Selects order** from left panel list
5. **Views order details** in right panel:
   - Order header (number, client, total, status)
   - Items list with location and pack status
   - Bags section showing container assignments
6. **Picks and packs items:**
   - Clicks items to select (checkbox toggle)
   - "Select All Unpacked" to select all remaining items
   - "Pack Selected" creates a bag and assigns items
   - "Pack All to One Bag" packs everything at once
7. **Marks ready for shipping:**
   - "Mark Ready for Shipping" button (enabled when all items packed)
   - Updates `pickPackStatus` to READY
   - Records `packedAt` and `packedBy`
8. **Ships order** (via orders router):
   - Calls `orders.shipOrder`
   - Updates `fulfillmentStatus` to SHIPPED
   - Releases reserved inventory (`reservedQty` decremented)
   - Creates `inventory_movements` record with type SALE
9. **Marks delivered** (optional):
   - Calls `orders.deliverOrder`
   - Updates `fulfillmentStatus` to DELIVERED

### Alternative Flows

- **Unpack Items:** Requires reason, logged to `audit_logs` table
- **Partial Pick:** Not currently supported - must pack entire order
- **Order Cancellation:** Before ship via `orders.updateOrderStatus` with CANCELLED
- **Returns:** After ship via `orders.markAsReturned` → RESTOCKED or RETURNED_TO_VENDOR

---

## UI States

### PickPackPage Component (`client/src/pages/PickPackPage.tsx`)

| State | Trigger | Display |
|-------|---------|---------|
| Queue Empty | No orders in `pickList` | "No orders to pick" with Package icon |
| Queue Loading | Initial load | Spinner animation |
| Queue Loaded | Data returned | Order list with progress bars |
| Order Selected | Click order row | Blue highlight, left border, right panel loads |
| Order Details Loading | `selectedOrderId` set | Spinner in right panel |
| Order Not Found | Invalid orderId | "Order not found" with AlertCircle |
| Items Selectable | Order loaded, items unpacked | Checkbox interaction enabled |
| Items Selected | Click unpacked item | Blue highlight, count badge updates |
| Packing In Progress | `packItemsMutation.isPending` | Button disabled, loading state |
| Marking Ready | `markReadyMutation.isPending` | Button disabled, loading state |
| All Items Packed | `packedItems === totalItems` | "Mark Ready" button enabled |

### Stats Dashboard
```
┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐
│ Pending │ │ Picking │ │ Packed  │ │  Ready  │
│   {n}   │ │   {n}   │ │   {n}   │ │   {n}   │
│ yellow  │ │  blue   │ │  green  │ │ purple  │
└─────────┘ └─────────┘ └─────────┘ └─────────┘
```

---

## API Endpoints

### Pick & Pack Router (`server/routers/pickPack.ts`)

| Endpoint | Type | Input | Output | Description |
|----------|------|-------|--------|-------------|
| `pickPack.getPickList` | Query | `{ filters?: { status?, customerId?, dateFrom?, dateTo? }, limit?: 50, offset?: 0 }` | `Array<{ orderId, orderNumber, clientName, itemCount, packedCount, bagCount, pickPackStatus }>` | Get orders for pick list |
| `pickPack.getOrderDetails` | Query | `{ orderId: number }` | `{ order, items[], bags[], summary }` | Get order details with items and bags |
| `pickPack.packItems` | Mutation | `{ orderId, itemIds[], bagIdentifier?, notes? }` | `{ bagId, bagIdentifier, packedItemCount }` | Pack items into a bag |
| `pickPack.unpackItems` | Mutation | `{ orderId, itemIds[], reason }` | `{ success, unpackedCount, reason }` | Unpack items (requires reason, logged to audit) |
| `pickPack.markAllPacked` | Mutation | `{ orderId, bagIdentifier? }` | `{ bagId, bagIdentifier, packedItemCount }` | Pack all items to one bag |
| `pickPack.markOrderReady` | Mutation | `{ orderId }` | `{ success }` | Mark order ready (validates all packed) |
| `pickPack.updateStatus` | Mutation | `{ orderId, status }` | `{ success, status }` | Update pick/pack status |
| `pickPack.getStats` | Query | None | `{ pending, picking, packed, ready, total }` | Get dashboard statistics |

### Orders Router (`server/routers/orders.ts`)

| Endpoint | Type | Input | Output | Description |
|----------|------|-------|--------|-------------|
| `orders.fulfillOrder` | Mutation | `{ id, items: PickedItem[] }` | `{ success, status, allFullyPicked, pickedItems }` | Record picked quantities |
| `orders.shipOrder` | Mutation | `{ id, trackingNumber?, carrier?, notes? }` | `{ success, orderId, status, trackingNumber, carrier, inventoryReleased[] }` | Ship order, release inventory |
| `orders.deliverOrder` | Mutation | `{ id, signature?, notes?, deliveredAt? }` | `{ success, orderId, deliveredAt }` | Mark order delivered |
| `orders.markAsReturned` | Mutation | `{ orderId, returnReason }` | `{ success }` | Mark order returned |
| `orders.getNextStatuses` | Query | `{ orderId }` | `Array<{ status, label }>` | Get valid next statuses |
| `orders.getLineItemAllocations` | Query | `{ lineItemId }` | `Array<{ id, batchId, batchSku, quantity, unitCost, allocatedAt }>` | Get batch allocations |
| `orders.allocateBatchesToLineItem` | Mutation | `{ lineItemId, allocations[] }` | `{ lineItemId, allocations[], totalCogs, weightedAverageCost }` | Allocate batches (WSQA-002) |

### Input/Output Shapes

```typescript
// PickedItem for fulfillOrder
interface PickedItem {
  batchId: number;
  pickedQuantity: number;  // min: 0
  locationId?: number;
  notes?: string;
}

// getOrderDetails response
interface OrderDetails {
  order: {
    id: number;
    orderNumber: string;
    clientId: number;
    clientName: string;
    pickPackStatus: "PENDING" | "PICKING" | "PACKED" | "READY";
    fulfillmentStatus: string;
    total: string;
    notes: string | null;
    createdAt: Date | null;
  };
  items: Array<{
    id: number;
    productId?: number;
    productName: string;
    quantity: number;
    unitPrice?: number;
    location: string;
    isPacked: boolean;
    bagId: number | null;
    bagIdentifier: string | null;
    packedAt: Date | null;
  }>;
  bags: Array<{
    id: number;
    identifier: string;
    notes: string | null;
    itemCount: number;
    createdAt: Date | null;
  }>;
  summary: {
    totalItems: number;
    packedItems: number;
    bagCount: number;
  };
}
```

---

## Data Model

### Primary Tables (Verified from `drizzle/schema.ts`)

#### orders
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key, autoincrement |
| version | int | Optimistic locking (default: 1) |
| orderNumber | varchar(50) | Unique display order number |
| orderType | enum | "QUOTE" \| "SALE" |
| isDraft | boolean | Whether order is draft |
| clientId | int | FK to clients |
| items | json | Line items snapshot (legacy) |
| fulfillmentStatus | enum | DRAFT, CONFIRMED, PENDING, PACKED, SHIPPED, DELIVERED, RETURNED, RESTOCKED, RETURNED_TO_VENDOR, CANCELLED |
| pickPackStatus | enum | PENDING, PICKING, PACKED, READY |
| packedAt | timestamp | When order was packed |
| packedBy | int | FK to users - who packed |
| shippedAt | timestamp | When order was shipped |
| shippedBy | int | FK to users - who shipped |
| deletedAt | timestamp | Soft delete (USP) |
| createdBy | int | FK to users |
| createdAt | timestamp | Creation time |
| updatedAt | timestamp | Last update time |

#### order_line_items
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderId | int (FK) | FK to orders |
| batchId | int (FK) | FK to batches |
| productDisplayName | varchar(255) | Product name for display |
| quantity | decimal(10,2) | Ordered quantity |
| cogsPerUnit | decimal(10,2) | Cost of goods per unit |
| originalCogsPerUnit | decimal(10,2) | Original COGS before override |
| isCogsOverridden | boolean | Was COGS manually overridden |
| marginPercent | decimal(5,2) | Margin percentage |
| marginDollar | decimal(10,2) | Margin in dollars |
| isMarginOverridden | boolean | Was margin manually overridden |
| marginSource | enum | CUSTOMER_PROFILE, DEFAULT, MANUAL |
| unitPrice | decimal(10,2) | Price per unit |
| lineTotal | decimal(10,2) | Line total (qty * price) |
| isSample | boolean | Is this a sample item |

#### order_line_item_allocations (WSQA-002)
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderLineItemId | int (FK) | FK to order_line_items |
| batchId | int (FK) | FK to batches |
| quantityAllocated | decimal(10,2) | Quantity from this batch |
| unitCost | decimal(12,4) | COGS at allocation time |
| allocatedAt | timestamp | When allocated |
| allocatedBy | int (FK) | FK to users |

#### order_bags (WS-003)
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderId | int (FK) | FK to orders |
| bagIdentifier | varchar | Bag label (e.g., "BAG-001") |
| notes | text | Bag notes |
| createdAt | timestamp | Creation time |
| createdBy | int (FK) | FK to users |

#### order_item_bags (WS-003)
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderItemId | int | Item ID (from order.items JSON) |
| bagId | int (FK) | FK to order_bags |
| packedAt | timestamp | When packed |
| packedBy | int (FK) | FK to users |

#### batches
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| code | varchar(50) | Unique batch code |
| sku | varchar(100) | Unique SKU |
| productId | int (FK) | FK to products |
| onHandQty | decimal(15,4) | Total physical quantity |
| reservedQty | decimal(15,4) | Quantity reserved for orders |
| quarantineQty | decimal(15,4) | Quantity quarantined |
| holdQty | decimal(15,4) | Quantity on hold |
| sampleQty | decimal(15,4) | Quantity for samples |
| defectiveQty | decimal(15,4) | Defective quantity |
| unitCogs | decimal(12,4) | Unit cost of goods |
| version | int | Optimistic locking |
| deletedAt | timestamp | Soft delete |

#### inventory_movements
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| batchId | int (FK) | FK to batches |
| inventoryMovementType | enum | INTAKE, SALE, RETURN, REFUND_RETURN, ADJUSTMENT, QUARANTINE, RELEASE_FROM_QUARANTINE, DISPOSAL, TRANSFER, SAMPLE |
| quantityChange | decimal(15,4) | Positive or negative change |
| quantityBefore | decimal(15,4) | Qty before movement |
| quantityAfter | decimal(15,4) | Qty after movement |
| referenceType | varchar(50) | ORDER_SHIPMENT, etc. |
| referenceId | int | FK to source record |
| notes | text | Movement notes |
| performedBy | int (FK) | FK to users |
| createdAt | timestamp | When recorded |
| deletedAt | timestamp | Soft delete |

#### order_status_history
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderId | int (FK) | FK to orders |
| fulfillmentStatus | enum | Status at this point |
| changedBy | int (FK) | FK to users |
| changedAt | timestamp | When changed |
| notes | text | Transition notes |
| deletedAt | timestamp | Soft delete |

---

## State Transitions

### Pick & Pack Status (WS-003)
```
┌─────────┐      ┌─────────┐      ┌────────┐      ┌───────┐
│ PENDING │─────►│ PICKING │─────►│ PACKED │─────►│ READY │
└─────────┘      └─────────┘      └────────┘      └───────┘
     │                                                 │
     └─────────────────────────────────────────────────┘
                    (direct transitions allowed)
```

### Fulfillment Status State Machine (WSQA-003)

**Source:** `server/services/orderStateMachine.ts`

```typescript
const ORDER_STATUS_TRANSITIONS = {
  DRAFT: ["CONFIRMED", "PENDING", "CANCELLED"],
  CONFIRMED: ["PENDING", "PACKED", "SHIPPED", "CANCELLED"],  // Can skip steps
  PENDING: ["PACKED", "SHIPPED", "CANCELLED"],                // Can skip PACKED
  PACKED: ["SHIPPED", "PENDING", "CANCELLED"],                // Can go back
  SHIPPED: ["DELIVERED", "RETURNED"],
  DELIVERED: ["RETURNED"],
  RETURNED: ["RESTOCKED", "RETURNED_TO_VENDOR"],
  RESTOCKED: [],           // Terminal
  RETURNED_TO_VENDOR: [],  // Terminal
  CANCELLED: [],           // Terminal
};
```

### State Diagram

```
                                    ┌────────────┐
                                    │  CANCELLED │ (terminal)
                                    └────────────┘
                                          ▲
            ┌─────────────────────────────┼───────────────────────┐
            │                             │                       │
┌───────┐   │   ┌───────────┐      ┌──────┴─────┐      ┌─────────┐
│ DRAFT │───┼──►│ CONFIRMED │─────►│  PENDING   │─────►│ PACKED  │
└───────┘   │   └─────┬─────┘      └──────┬─────┘      └────┬────┘
            │         │                   │                 │
            │         │         ┌─────────┘                 │
            │         │         │   (can skip PACKED)       │
            │         └─────────┼───────────────────────────┤
            │                   ▼                           ▼
            │            ┌───────────┐              ┌───────────┐
            │            │  SHIPPED  │◄─────────────┤  SHIPPED  │
            │            └─────┬─────┘              └───────────┘
            │                  │
            │    ┌─────────────┼─────────────┐
            │    ▼             ▼             ▼
     ┌───────────┐      ┌───────────┐
     │ DELIVERED │      │  RETURNED │
     └─────┬─────┘      └─────┬─────┘
           │                  │
           │    ┌─────────────┼─────────────┐
           │    ▼             ▼             ▼
           │          ┌───────────┐  ┌─────────────────┐
           └─────────►│ RESTOCKED │  │RETURNED_TO_VENDOR│
                      └───────────┘  └─────────────────┘
                        (terminal)       (terminal)
```

### Status Labels and Colors

| Status | Label | Color |
|--------|-------|-------|
| DRAFT | Draft | gray-100/gray-800 |
| CONFIRMED | Confirmed | blue-100/blue-800 |
| PENDING | Pending | yellow-100/yellow-800 |
| PACKED | Packed | purple-100/purple-800 |
| SHIPPED | Shipped | indigo-100/indigo-800 |
| DELIVERED | Delivered | green-100/green-800 |
| RETURNED | Returned | orange-100/orange-800 |
| RESTOCKED | Restocked | emerald-100/emerald-800 |
| RETURNED_TO_VENDOR | Returned to Vendor | amber-100/amber-800 |
| CANCELLED | Cancelled | red-100/red-800 |

---

## Business Rules

### Inventory Reservation (orders.confirm)

1. **Confirmation validates and reserves:**
   - Wraps in `withTransaction` for atomicity (BUG-301)
   - Uses `SELECT FOR UPDATE` to lock batches (BUG-301)
   - Validates available: `onHandQty - reservedQty - quarantineQty - holdQty`
   - For regular orders: increments `reservedQty`
   - For sample orders: decrements `sampleQty` directly

2. **Available quantity calculation:**
   ```typescript
   const availableQty = Math.max(0, onHand - reserved - quarantine - hold);
   ```

### Pack Operations (pickPack router)

3. **Pack items to bag:**
   - Creates bag if not exists (auto-generates identifier: "BAG-001", "BAG-002", etc.)
   - Creates `order_item_bags` records for each item
   - Updates `pickPackStatus` from PENDING to PICKING

4. **Mark all packed:**
   - Creates single bag with all items
   - Updates `pickPackStatus` to PACKED

5. **Mark order ready:**
   - Validates all items are packed
   - Updates `pickPackStatus` to READY
   - Records `packedAt`, `packedBy` on order

6. **Unpack items (WS-005):**
   - Requires reason (validation: `z.string().min(1)`)
   - Logs to `audit_logs` table with before/after state
   - Deletes `order_item_bags` records

### Ship Operations (orders.shipOrder)

7. **Ship requirements:**
   - Uses state machine validation: `validateTransition(from, "SHIPPED")`
   - Order must be in valid transition state (CONFIRMED, PENDING, or PACKED)

8. **Ship actions (INV-001):**
   ```typescript
   // Within transaction:
   // 1. Lock order row with FOR UPDATE
   // 2. Get all allocations for order line items
   // 3. For each allocation:
   //    - Lock batch row
   //    - Decrement reservedQty
   //    - Create inventory_movement with type "SALE"
   // 4. Update order: fulfillmentStatus = "SHIPPED", shippedAt, shippedBy
   // 5. Log to order_status_history
   ```

### Sample Order Handling (BUG-501)

9. **Sample orders use different pool:**
   - Check `lineItem.isSample` flag
   - Validates against `batch.sampleQty` instead of available qty
   - Decrements `sampleQty` at confirmation (not `reservedQty`)

---

## Error States

### pickPack Router Errors

| Error | Code | Cause | Recovery |
|-------|------|-------|----------|
| "Database not available" | INTERNAL_SERVER_ERROR | DB connection failed | Retry, escalate |
| "Order not found" | NOT_FOUND | Invalid orderId | Refresh queue |
| "No bags found for this order" | NOT_FOUND | Unpack on order without bags | N/A |
| "Cannot mark as ready: X items still need to be packed" | PRECONDITION_FAILED | Not all items packed | Pack remaining items |

### orders Router Errors

| Error | Code | Cause | Recovery |
|-------|------|-------|----------|
| "Order with ID X not found" | NOT_FOUND | Invalid orderId | Refresh, use valid ID |
| "Cannot pick items for order in X status (terminal state)" | 400 | Order already terminal | Cannot modify |
| "Cannot pick items for order that is already SHIPPED/DELIVERED" | 400 | Order shipped | Process as return |
| "Picked quantity (X) exceeds ordered quantity (Y)" | 400 | Over-pick | Reduce quantity |
| "Invalid status transition: X → Y. Valid: Z" | 400 | State machine violation | Check valid transitions |
| "Batch X not found" | NOT_FOUND | Deleted/invalid batch | Re-allocate |
| "Insufficient inventory for batch X. Available: Y, Requested: Z" | BAD_REQUEST | Stock out | Allocate different batch |
| "Insufficient sample inventory for batch X" | BAD_REQUEST | Sample stock out | Check sample pool |
| "Rate limit exceeded: maximum 10 order confirmations per minute" | TOO_MANY_REQUESTS | BUG-502 rate limit | Wait 1 minute |

---

## Invariants

### INV-001: onHandQty >= 0 After Any Operation
Inventory onHandQty must never go negative.

**Enforcement (from orders.ts):**
```typescript
// BUG-315: Handle NaN from parseFloat with explicit checks
const onHand = parseFloat(String(batch.onHandQty || "0"));
if (Number.isNaN(onHand)) {
  throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Invalid inventory data" });
}

// Use database arithmetic for precision (BUG-316)
await tx.execute(sql`
  UPDATE batches
  SET reservedQty = CAST(reservedQty AS DECIMAL(15,4)) + ${parsedQty}
  WHERE id = ${item.batchId}
`);
```

**Verification:**
```sql
SELECT id, sku, onHandQty FROM batches WHERE CAST(onHandQty AS DECIMAL(15,4)) < 0;
-- Must return 0 rows
```

### INV-006: Shipped Qty <= Ordered Qty
Shipped quantity per line item must never exceed ordered quantity.

**Enforcement (from orders.ts:fulfillOrder):**
```typescript
if (pickItem.pickedQuantity > orderItem.quantity) {
  throw new Error(
    `Picked quantity (${pickItem.pickedQuantity}) exceeds ordered quantity (${orderItem.quantity})`
  );
}
```

### INV-008: Inventory Movements Must Balance
For each shipment, inventory movement records must correctly reflect quantity changes.

**Enforcement (from orders.ts:shipOrder):**
```typescript
await tx.insert(inventoryMovements).values({
  batchId: allocation.batchId,
  inventoryMovementType: "SALE",
  quantityChange: `-${allocatedQty}`,
  quantityBefore: currentOnHand.toString(),
  quantityAfter: currentOnHand.toString(),
  referenceType: "ORDER_SHIPMENT",
  referenceId: input.id,
  notes: `Order shipped - reservation released. Reserved: ${currentReserved} → ${newReserved}`,
  performedBy: userId,
});
```

### INV-007: Audit Trail for Mutations
All mutations must record actor and timestamp.

**Enforcement:**
- All procedures use `getAuthenticatedUserId(ctx)` (not fallback IDs)
- Status changes logged to `order_status_history`
- Unpack operations logged to `audit_logs`

---

## Cross-Flow Touchpoints

### Upstream (Inputs to GF-005)

| Flow | Interaction | Data |
|------|-------------|------|
| **GF-003: Order-to-Cash** | Creates confirmed orders for fulfillment | Orders with `isDraft=false`, inventory reserved |
| **GF-007: Inventory Management** | Provides available inventory | Batch quantities via `getAvailableForProduct` |

### Downstream (Outputs from GF-005)

| Flow | Interaction | Data |
|------|-------------|------|
| **GF-003: Order-to-Cash** | Updates order status | `fulfillmentStatus` changes |
| **GF-004: Invoice & Payment** | Shipped orders ready for billing | Order completion data |
| **GF-006: Client Ledger** | Delivered orders affect AR | Transaction history |
| **GF-007: Inventory Management** | Releases reservations, creates movements | `reservedQty` decremented, `inventory_movements` records |

### Integration Diagram

```
                     ┌──────────────────────────────────────┐
                     │         GF-003: Order-to-Cash        │
                     │  (creates orders, allocates batches) │
                     └─────────────────┬────────────────────┘
                                       │ orders.confirm
                                       ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                         GF-005: Pick & Pack                              │
│                                                                          │
│  ┌─────────────────────┐              ┌─────────────────────┐            │
│  │  pickPack Router    │              │   orders Router     │            │
│  │  (WS-003 Workflow)  │              │  (Fulfillment)      │            │
│  │                     │              │                     │            │
│  │  getPickList        │              │  fulfillOrder       │            │
│  │  getOrderDetails    │  ─────────►  │  shipOrder          │            │
│  │  packItems          │   triggers   │  deliverOrder       │            │
│  │  markOrderReady     │              │  markAsReturned     │            │
│  └─────────────────────┘              └──────────┬──────────┘            │
│                                                  │                       │
└──────────────────────────────────────────────────┼───────────────────────┘
                                                   │
                    ┌──────────────────────────────┼───────────────────────┐
                    │                              │                       │
                    ▼                              ▼                       ▼
     ┌──────────────────────┐      ┌───────────────────────┐   ┌─────────────────┐
     │ GF-007: Inventory    │      │ GF-004: Invoice       │   │ GF-006: Ledger  │
     │ (releases reserved,  │      │ (shipped → billable)  │   │ (AR impact)     │
     │  creates movements)  │      │                       │   │                 │
     └──────────────────────┘      └───────────────────────┘   └─────────────────┘
```

---

## UI Components

### PickPackPage (`client/src/pages/PickPackPage.tsx`)

**Layout:** Two-panel design (1/3 left, 2/3 right)

#### Left Panel: Order Queue
- **Header:** Title with Package icon, Refresh button
- **Stats Grid:** 4-column grid (Pending/Picking/Packed/Ready counts)
- **Search/Filter Bar:**
  - Search input with Search icon (filters by orderNumber or clientName)
  - Status dropdown (All/PENDING/PICKING/PACKED/READY)
- **Order List:** Scrollable list of orders
  - Order number + StatusBadge
  - Client name
  - Progress text: "{packed}/{total} items packed"
  - Bag count
  - Progress bar (green, percentage based)

#### Right Panel: Order Details
- **Empty State:** Box icon + "Select an order to start packing"
- **Loading State:** Spinner
- **Order Header:**
  - Order number + client name
  - StatusBadge
  - Total, items packed count, bag count
- **Action Bar:**
  - "Select All Unpacked" button
  - "Pack Selected (n)" button (blue, primary)
  - "Pack All to One Bag" button
  - "Mark Ready for Shipping" button (green, disabled until all packed)
- **Items List:** Cards with checkboxes
  - Product name, quantity, location
  - Packed indicator (green check + bag identifier)
- **Bags Section:** Grid of bag cards
  - Bag identifier, item count

### StatusBadge Component
```typescript
const config = {
  PENDING: { color: "bg-yellow-100 text-yellow-800", icon: Clock },
  PICKING: { color: "bg-blue-100 text-blue-800", icon: Package },
  PACKED: { color: "bg-green-100 text-green-800", icon: CheckCircle },
  READY: { color: "bg-purple-100 text-purple-800", icon: Truck },
};
```

---

## Keyboard Shortcuts

**Verified from E2E tests (`tests-e2e/golden-flows/pick-pack-fulfillment.spec.ts`):**

| Shortcut | Action |
|----------|--------|
| Cmd+K / Ctrl+K | Focus search input |
| Tab | Move focus through elements |
| ArrowDown | Navigate to next order |
| ArrowUp | Navigate to previous order |
| Enter | Select focused order |
| i | Open inspector panel (E2E test verified) |

---

## Security Considerations

1. **Access Control:**
   - All pickPack endpoints use `adminProcedure` (requires admin role)
   - orders endpoints use `protectedProcedure` with permission middleware
   - Required permissions: `orders:read`, `orders:update`, `orders:create`

2. **Actor Attribution:**
   - Uses `getAuthenticatedUserId(ctx)` - NEVER fallback IDs
   - All mutations record `performedBy` / `createdBy` / `packedBy` / `shippedBy`

3. **Audit Trail:**
   - Status changes → `order_status_history`
   - Inventory changes → `inventory_movements`
   - Unpack operations → `audit_logs` with reason

4. **Transaction Safety:**
   - Ship operations wrapped in `withTransaction`
   - Uses `SELECT FOR UPDATE` to prevent race conditions
   - Database arithmetic for decimal precision (BUG-316)

---

## Testing Checklist

### E2E Tests (Verified Files)

**`tests-e2e/golden-flows/pick-pack-fulfillment.spec.ts`:**
- [x] Navigate to /pick-pack
- [x] Display pick list with Work Surface pattern
- [x] Navigate orders with keyboard
- [x] Filter by status
- [x] Search orders with Cmd+K
- [x] Multi-select items
- [x] Select all unpacked
- [x] Pack selected items
- [x] Mark order ready when fully packed
- [x] Inspector panel shows details
- [x] Keyboard shortcut 'i' for inspect

**`tests-e2e/critical-paths/pick-pack.spec.ts`:**
- [x] Navigate to pick and pack page
- [x] Display order queue
- [x] Filter orders by status
- [x] Open order details for packing
- [x] Display order items for picking
- [x] Pack items into bags
- [x] Bag management interface
- [x] Mark order as ready when fully packed
- [x] Print packing slip option
- [x] Mobile responsive viewport

**`tests-e2e/critical-paths/order-fulfillment-workflow.spec.ts`:**
- [x] Order creation flow
- [x] Order fulfillment flow (pick-pack integration)
- [x] Payment flow
- [x] Order completion flow
- [x] Track inventory deduction after fulfillment
- [x] Update client balance after payment

---

## Known Issues & Technical Debt

1. **Two Status Systems:** Orders have both `fulfillmentStatus` and `pickPackStatus` which can be confusing. Consider consolidating.

2. **Item IDs from JSON:** Pack operations use item IDs from `order.items` JSON array (index-based fallback), not from `order_line_items` table. This could cause issues if items array is modified.

3. **No Partial Shipment:** Current implementation requires shipping entire order. Partial shipments not supported.

4. **Rate Limiting:** Confirm endpoint has in-memory rate limiting (10/minute). Not distributed - won't work across multiple instances.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-27 | Claude Code Agent | Initial specification |
| 2.0 | 2026-01-27 | Claude Code Agent | Major revision with verified codebase research: added pickPack router endpoints, corrected data model from drizzle/schema.ts, added actual state machine from orderStateMachine.ts, documented both parallel systems (WS-003 + fulfillment), added UI component details from PickPackPage.tsx, verified E2E test coverage, documented known issues |
