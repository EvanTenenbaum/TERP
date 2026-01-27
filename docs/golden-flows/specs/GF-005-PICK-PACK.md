# GF-005: Pick & Pack - Specification

**Version:** 1.0
**Created:** 2026-01-27
**Author:** Claude Code Agent
**Status:** ACTIVE
**Owner Role:** Fulfillment

---

## Overview

The Pick & Pack flow handles warehouse fulfillment operations for confirmed sales orders. It manages the complete process of picking inventory items from storage locations, packing them for shipment, and shipping orders to customers. This flow is the critical link between order confirmation and physical delivery, ensuring inventory is properly decremented and orders transition through fulfillment states correctly.

---

## User Journey

### Primary Flow: Order Queue to Shipped

1. **User navigates to /pick-pack** (as Fulfillment role)
2. **Views order queue** with stats (Pending, Picking, Packed, Shipped counts)
3. **Filters or searches orders** using status filter or Cmd+K search
4. **Selects order** from the queue (keyboard navigation: ArrowDown, Enter)
5. **Views order details** in inspector panel (items, quantities, customer info)
6. **Picks items:**
   - Reviews pick list with item locations
   - Checks off items as they are physically picked
   - Confirms picked quantities
7. **Packs order:**
   - Verifies all items are picked
   - Clicks "Pack" or uses keyboard shortcut
   - Order transitions to PACKED status
8. **Marks ready for shipping:**
   - Clicks "Mark Ready" when fully packed
   - Order enters shipping queue
9. **Ships order:**
   - Enters tracking number (optional)
   - Selects carrier (optional)
   - Confirms shipment
   - Order transitions to SHIPPED
   - Inventory reserved qty released
   - Inventory movement records created
10. **Order marked delivered** (optional, may be automatic or via delivery confirmation)

### Alternative Flows

- **Partial Pick:** Some items unavailable - flag order for review
- **Short Ship:** Ship available items, backorder remainder
- **Pick Exception:** Damaged item found during pick - adjust inventory
- **Order Cancellation:** Cancel before ship - release reservations

---

## UI States

| State | Trigger | Display |
|-------|---------|---------|
| Queue Empty | No orders pending fulfillment | "No orders pending" message |
| Queue Loaded | Orders pending | List of orders with status badges |
| Order Selected | Click/keyboard select order | Order details in right panel |
| Picking In Progress | Start picking | Items with checkboxes, picking indicator |
| Partially Picked | Some items checked | Partial progress indicator |
| Fully Picked | All items checked | "Pack" button enabled |
| Packing | Pack button clicked | Loading indicator during mutation |
| Packed | Pack complete | Status updated, "Ship" button enabled |
| Shipping | Ship button clicked | Tracking/carrier dialog |
| Shipped | Ship confirmed | Order removed from queue or moved to shipped section |
| Error | Any operation fails | Error toast with retry option |

### Stats Display
- **Pending:** Orders awaiting pick
- **Picking:** Orders currently being picked (if tracked)
- **Packed:** Orders ready to ship
- **Shipped:** Recently shipped (optional view)

---

## API Endpoints

| Endpoint | Method | Request Shape | Response Shape | Description |
|----------|--------|---------------|----------------|-------------|
| `orders.getAll` | Query | `{ fulfillmentStatus: "PENDING" \| "PACKED", limit?, offset? }` | `{ items: Order[], pagination }` | Get orders in fulfillment queue |
| `orders.getById` | Query | `{ id: number }` | `Order` with line items | Get single order details |
| `orders.fulfillOrder` | Mutation | `{ id: number, items: PickedItem[] }` | `{ success, status, pickedItems }` | Record picked items |
| `orders.shipOrder` | Mutation | `{ id: number, trackingNumber?, carrier?, notes? }` | `{ success, orderId, status, inventoryReleased }` | Ship order, release inventory |
| `orders.deliverOrder` | Mutation | `{ id: number, signature?, notes?, deliveredAt? }` | `{ success, orderId, deliveredAt }` | Mark order as delivered |
| `orders.getNextStatuses` | Query | `{ orderId: number }` | `{ status, label }[]` | Get valid next statuses |
| `orders.getLineItemAllocations` | Query | `{ lineItemId: number }` | `Allocation[]` | Get batch allocations for line item |
| `inventory.getAvailableForProduct` | Query | `{ productId, minQuantity? }` | `Batch[]` | Get available batches for picking |

### PickedItem Shape
```typescript
interface PickedItem {
  batchId: number;
  pickedQuantity: number;
  locationId?: number;
  notes?: string;
}
```

---

## Data Model

### Primary Tables

#### orders
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderNumber | varchar | Display order number (e.g., "ORD-001234") |
| clientId | int | FK to clients |
| fulfillmentStatus | enum | PENDING, PROCESSING, CONFIRMED, PICKED, PACKED, SHIPPED, DELIVERED, RETURNED, CANCELLED |
| packedAt | datetime | When order was packed |
| packedBy | int | FK to users - who packed |
| shippedAt | datetime | When order was shipped |
| shippedBy | int | FK to users - who shipped |
| items | json | Line items snapshot (legacy) |

#### order_line_items
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderId | int | FK to orders |
| batchId | int | FK to batches (primary batch) |
| productDisplayName | varchar | Product name for display |
| quantity | decimal | Ordered quantity |
| isSample | boolean | Is this a sample item |

#### order_line_item_allocations
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderLineItemId | int | FK to order_line_items |
| batchId | int | FK to batches |
| quantityAllocated | decimal | Quantity from this batch |
| unitCost | decimal | COGS at allocation time |
| allocatedBy | int | FK to users |
| allocatedAt | datetime | When allocated |

#### batches
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| sku | varchar | Stock keeping unit |
| code | varchar | Batch code |
| onHandQty | decimal | Total physical quantity |
| reservedQty | decimal | Quantity reserved for orders |
| quarantineQty | decimal | Quantity quarantined |
| holdQty | decimal | Quantity on hold |
| sampleQty | decimal | Quantity for samples |

#### inventory_movements
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| batchId | int | FK to batches |
| inventoryMovementType | enum | INTAKE, SALE, ADJUSTMENT, etc. |
| quantityChange | decimal | Positive or negative change |
| quantityBefore | decimal | Qty before movement |
| quantityAfter | decimal | Qty after movement |
| referenceType | varchar | ORDER_SHIPMENT, MANUAL_ADJUSTMENT, etc. |
| referenceId | int | FK to source record |
| notes | text | Movement notes |
| performedBy | int | FK to users |
| createdAt | datetime | When recorded |

#### order_status_history
| Column | Type | Description |
|--------|------|-------------|
| id | int | Primary key |
| orderId | int | FK to orders |
| fulfillmentStatus | varchar | Status at this point |
| changedBy | int | FK to users |
| notes | text | Transition notes |
| createdAt | datetime | When changed |

---

## State Transitions

### Fulfillment Status State Machine

```
                                    ┌────────────┐
                                    │  CANCELLED │
                                    └────────────┘
                                          ▲
                                          │ (cancel before ship)
                                          │
┌─────────┐     ┌────────────┐     ┌──────┴─────┐     ┌─────────┐     ┌───────────┐
│ PENDING │────►│ PROCESSING │────►│  CONFIRMED │────►│ PACKED  │────►│  SHIPPED  │
└─────────┘     └────────────┘     └────────────┘     └─────────┘     └─────┬─────┘
                                                                            │
                                                            ┌───────────────┼───────────────┐
                                                            ▼               ▼               ▼
                                                     ┌───────────┐   ┌───────────┐   ┌──────────┐
                                                     │ DELIVERED │   │  RETURNED │   │ RETURNED │
                                                     └───────────┘   └───────────┘   └──────────┘
```

### Valid Transitions

| From | To | Trigger | Actor |
|------|-----|---------|-------|
| PENDING | PROCESSING | Order picked up for fulfillment | System/Fulfillment |
| PENDING | CONFIRMED | Order confirmed with inventory | System |
| PROCESSING | CONFIRMED | Processing complete | System |
| CONFIRMED | PACKED | All items picked and packed | Fulfillment |
| PACKED | SHIPPED | Order shipped | Fulfillment |
| SHIPPED | DELIVERED | Delivery confirmed | System/Fulfillment |
| SHIPPED | RETURNED | Order returned | Fulfillment |
| DELIVERED | RETURNED | Post-delivery return | Fulfillment |
| PENDING/CONFIRMED | CANCELLED | Order cancelled | Sales/Admin |

### Invalid Transitions (Blocked by State Machine)
- PACKED → PENDING (cannot un-pack)
- SHIPPED → PACKED (cannot un-ship)
- DELIVERED → SHIPPED (cannot un-deliver)
- CANCELLED → any (terminal state)

---

## Business Rules

### Inventory Management

1. **Pick Validation:**
   - Cannot pick more than ordered quantity
   - Cannot pick more than available (onHand - reserved - quarantine - hold)
   - Must specify which batch to pick from if multiple allocations

2. **Reservation Management:**
   - Inventory reserved at order confirmation (reservedQty incremented)
   - Reservation released at shipment (reservedQty decremented)
   - onHandQty NOT decremented at pick (already reserved)

3. **Sample Orders:**
   - Sample items decrement sampleQty, not onHandQty
   - Different inventory pool for samples

### Pack Operations

4. **Pack Requirements:**
   - All line items must be picked before packing
   - Partial packing not allowed (ship complete or partial ship)

5. **Pack Recording:**
   - packedAt timestamp recorded
   - packedBy user recorded for audit

### Ship Operations

6. **Ship Requirements:**
   - Order must be in PACKED status
   - Tracking number optional but recommended

7. **Ship Actions (INV-001):**
   - Release reservedQty for each allocated batch
   - Create inventory_movement record with type SALE
   - Record tracking info in order notes
   - Log to order_status_history

8. **Partial Shipment Rules:**
   - Not currently supported (ship entire order)
   - Future: Create separate shipment records for partial

### Location Tracking

9. **Location Handling:**
   - Pick from specific locations if multi-location warehouse
   - Update location quantities on pick
   - Record location in pick data

---

## Error States

| Error | Cause | HTTP Code | Recovery |
|-------|-------|-----------|----------|
| "Order not found" | Invalid orderId | 404 | Refresh queue, select valid order |
| "Cannot pick items for order in {status}" | Wrong fulfillment status | 400 | Check order status, may already be shipped |
| "Picked quantity exceeds ordered quantity" | Over-pick | 400 | Reduce picked quantity |
| "Insufficient inventory for batch" | Stock out during pick | 400 | Check alternate batches, adjust order |
| "Invalid status transition" | State machine violation | 400 | Check valid next statuses |
| "Batch not found" | Deleted/invalid batch | 404 | Re-allocate order to valid batches |
| "Not authorized" | Missing fulfillment permission | 403 | Login with correct role |
| "Database error" | Transaction failure | 500 | Retry, escalate if persists |

### Error Recovery Flows

1. **Stock-out During Pick:**
   - Alert user to insufficient quantity
   - Option to allocate from different batch
   - Option to partial fill (if supported)
   - Option to cancel line item

2. **Wrong Item Picked:**
   - Uncheck item, re-pick correct item
   - Adjust inventory if physical error

3. **Order Already Shipped:**
   - Cannot modify shipped order
   - Must process as return if needed

---

## Invariants

### INV-001: onHandQty >= 0 After Pick
Inventory onHandQty must never go negative after any pick or ship operation.

**Verification:**
```sql
SELECT id, sku, onHandQty FROM batches WHERE CAST(onHandQty AS DECIMAL) < 0;
-- Must return 0 rows
```

**Enforcement:**
- Check available quantity before pick
- Use transactions to prevent race conditions
- Lock batch rows with FOR UPDATE during operations

### INV-006: Shipped Qty <= Ordered Qty
Shipped quantity per line item must never exceed ordered quantity.

**Verification:**
```sql
SELECT oli.id, oli.quantity as ordered,
       (SELECT SUM(quantityAllocated) FROM order_line_item_allocations WHERE orderLineItemId = oli.id) as allocated
FROM order_line_items oli
WHERE allocated > quantity;
-- Must return 0 rows
```

**Enforcement:**
- Validate picked quantity against line item quantity
- Reject over-picks at API level

### INV-008: Inventory Movements Must Balance
For each order shipment, inventory movement records must correctly reflect:
- Quantity change equals sum of shipped items
- Reference links back to order

**Verification:**
```sql
SELECT o.id, o.orderNumber,
       (SELECT SUM(ABS(CAST(quantityChange AS DECIMAL)))
        FROM inventory_movements
        WHERE referenceType = 'ORDER_SHIPMENT' AND referenceId = o.id) as movement_total
FROM orders o
WHERE o.fulfillmentStatus = 'SHIPPED'
  AND movement_total != (SELECT SUM(quantity) FROM order_line_items WHERE orderId = o.id);
-- Must return 0 rows
```

**Enforcement:**
- Create movement records in same transaction as ship
- Record quantityBefore and quantityAfter for audit

### INV-007: Audit Trail for Mutations
All pick, pack, and ship operations must record:
- performedBy (user ID)
- createdAt (timestamp)
- Status history entry

**Enforcement:**
- Never use fallback user IDs (ctx.user?.id || 1 is FORBIDDEN)
- Use getAuthenticatedUserId(ctx) for all operations
- Insert into order_status_history on status change

---

## Cross-Flow Touchpoints

### Upstream (Inputs to GF-005)

| Flow | Interaction | Data |
|------|-------------|------|
| **GF-003: Order-to-Cash** | Creates confirmed orders for fulfillment | Orders with CONFIRMED status, allocated inventory |
| **GF-007: Inventory Management** | Provides available inventory for picking | Batch quantities, locations |

### Downstream (Outputs from GF-005)

| Flow | Interaction | Data |
|------|-------------|------|
| **GF-003: Order-to-Cash** | Updates order status to SHIPPED/DELIVERED | Order completion triggers invoice finalization |
| **GF-004: Invoice & Payment** | Shipped orders ready for final billing | Order fulfillment data |
| **GF-006: Client Ledger** | Delivered orders affect AR aging | Transaction history |
| **GF-007: Inventory Management** | Decrements inventory on ship | Reduced onHandQty, inventory movements |

### Bidirectional Relationships

```
┌─────────────────┐
│ GF-003          │ Creates orders with allocated inventory
│ Order-to-Cash   │────────────────────────────────────────────┐
└─────────────────┘                                            │
                                                               ▼
                                                        ┌──────────────┐
                                                        │  GF-005      │
                                                        │  Pick & Pack │
                                                        └──────┬───────┘
                                                               │
        ┌──────────────────────────────────────────────────────┤
        │ Updates order status                                 │
        ▼                                                      │ Decrements inventory
┌─────────────────┐                                            ▼
│ GF-003          │                                     ┌──────────────┐
│ Order-to-Cash   │                                     │  GF-007      │
│ (status update) │                                     │  Inventory   │
└─────────────────┘                                     └──────────────┘
```

---

## UI Components

### OrderQueue (Main List)
- Displays orders pending fulfillment
- Columns: Order #, Client, Items, Status, Created Date
- Status badges with color coding
- Sort by date, status, client
- Keyboard navigation (ArrowUp/Down, Enter to select)

### PickList (Order Detail Panel)
- Shows selected order items
- Item rows with: Product name, SKU, Quantity, Batch/Location
- Checkbox per item for pick tracking
- "Select All" button
- Pack button (enabled when all picked)

### StatusFilter
- Dropdown/tabs: All, Pending, Packed, Shipped
- Quick filter buttons

### SearchBar
- Global search (Cmd+K)
- Search by order number, client name, product

### InspectorPanel
- Right-side detail view
- Order summary, client info, shipping address
- Item list with quantities
- Action buttons: Pack, Ship, View Details

### ShipDialog (Modal)
- Carrier selector
- Tracking number input
- Notes field
- Confirm/Cancel buttons

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| Cmd+K / Ctrl+K | Focus search |
| ArrowDown | Next order in list |
| ArrowUp | Previous order in list |
| Enter | Select focused order |
| i | Open inspector panel |
| p | Pack selected order (if ready) |
| s | Ship selected order (if packed) |
| Escape | Close dialogs/deselect |

---

## Performance Considerations

1. **Queue Loading:**
   - Paginate orders (50 per page default)
   - Cache frequently accessed data
   - Lazy load order details on selection

2. **Inventory Queries:**
   - Batch allocation queries should use indexes on orderLineItemId
   - Consider materialized views for high-volume warehouses

3. **Transaction Performance:**
   - Ship operation locks multiple rows - keep transaction short
   - Use connection pooling for concurrent fulfillment

---

## Security Considerations

1. **Role Requirements:**
   - `orders:read` - View queue and orders
   - `orders:update` - Pick, pack, ship operations
   - `inventory:read` - View available batches

2. **Audit Trail:**
   - All mutations record performedBy user
   - Status changes logged to order_status_history
   - Inventory movements create audit records

3. **Data Validation:**
   - Validate batchId exists and has quantity
   - Validate order belongs to authenticated tenant
   - Prevent SQL injection in notes fields

---

## Testing Checklist

### Unit Tests
- [ ] State machine transition validation
- [ ] Pick quantity validation
- [ ] Ship inventory release logic
- [ ] Movement record creation

### Integration Tests
- [ ] fulfillOrder mutation with valid data
- [ ] fulfillOrder rejection for over-pick
- [ ] shipOrder inventory release
- [ ] Status history creation

### E2E Tests (`tests-e2e/golden-flows/pick-pack-fulfillment.spec.ts`)
- [ ] Navigate to /pick-pack
- [ ] Select order from queue
- [ ] Pick all items
- [ ] Pack order
- [ ] Ship order
- [ ] Verify inventory decremented
- [ ] Verify status history

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-27 | Claude Code Agent | Initial specification |
