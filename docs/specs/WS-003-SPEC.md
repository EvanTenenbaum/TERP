# Specification: WS-003 - Pick & Pack Module: Group Bagging/Packing Action

**Status:** Approved  
**Priority:** CRITICAL  
**Estimate:** 20h  
**Module:** Pick & Pack (New Module)  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The warehouse team needs a dedicated module to manage physical product handling. Currently, there's no centralized place to view orders that need picking, and the process of grouping items into bags/containers is manual and error-prone. The key insight from user feedback is that **scanning is not time-advantageous** for this workflow - users need a fast, click-based interface for selecting and grouping items.

## 2. User Stories

1. **As a warehouse worker**, I want to see a real-time queue of orders that need to be picked, so that I know what to work on next.

2. **As a warehouse worker**, I want to multi-select items and assign them to a bag/container with one click, so that I can efficiently pack orders.

3. **As a warehouse worker**, I want to see orders appear in real-time as salespeople create them, so that I can start picking immediately.

4. **As a manager**, I want to see the status of all orders in the pick/pack pipeline, so that I can monitor warehouse throughput.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Dedicated Pick & Pack module accessible from main navigation | Must Have |
| FR-02 | Real-time pick list showing orders ready for picking | Must Have |
| FR-03 | Multi-select checkboxes for selecting multiple items | Must Have |
| FR-04 | "Pack Selected" button to assign items to a Bag/Container ID | Must Have |
| FR-05 | Visual status indicators (Pending, Picking, Packed, Ready) | Must Have |
| FR-06 | Filter by order priority, date, customer | Should Have |
| FR-07 | Bulk "Mark All Packed" for entire order | Should Have |
| FR-08 | Print packing slip from order view | Should Have |
| FR-09 | Mobile/tablet optimized interface | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Orders appear in queue when status = CONFIRMED | Sales confirms → appears in Pick & Pack |
| BR-02 | Items can only be packed if inventory is available | Prevent packing out-of-stock items |
| BR-03 | Bag ID must be unique within an order | Bag-001, Bag-002, etc. |
| BR-04 | All items must be packed before order can be marked "Ready" | Validation on status change |
| BR-05 | Packed items cannot be unpacked without manager override | Prevent accidental unpacking |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- New table for bag/container tracking
CREATE TABLE order_bags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_id INT NOT NULL REFERENCES orders(id),
  bag_identifier VARCHAR(50) NOT NULL, -- e.g., "BAG-001"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by INT REFERENCES users(id),
  notes TEXT,
  UNIQUE KEY unique_bag_per_order (order_id, bag_identifier)
);

-- New table for item-to-bag assignment
CREATE TABLE order_item_bags (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_item_id INT NOT NULL REFERENCES order_items(id),
  bag_id INT NOT NULL REFERENCES order_bags(id),
  packed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  packed_by INT REFERENCES users(id),
  UNIQUE KEY one_bag_per_item (order_item_id)
);

-- Add pick_pack_status to orders table
ALTER TABLE orders ADD COLUMN pick_pack_status 
  ENUM('PENDING', 'PICKING', 'PACKED', 'READY') DEFAULT 'PENDING';
```

### 4.2 API Contracts

```typescript
// Get pick list (real-time queue)
pickPack.getPickList = adminProcedure
  .input(z.object({
    filters: z.object({
      priority: z.enum(['HIGH', 'MEDIUM', 'LOW']).optional(),
      dateFrom: z.date().optional(),
      dateTo: z.date().optional(),
      customerId: z.number().optional()
    }).optional()
  }))
  .output(z.array(z.object({
    orderId: z.number(),
    orderNumber: z.string(),
    customerName: z.string(),
    itemCount: z.number(),
    packedCount: z.number(),
    priority: z.string(),
    createdAt: z.date(),
    status: z.enum(['PENDING', 'PICKING', 'PACKED', 'READY'])
  })))
  .query(async ({ input }) => {
    // Return orders with status CONFIRMED, ordered by priority/date
  });

// Get order details for picking
pickPack.getOrderItems = adminProcedure
  .input(z.object({ orderId: z.number() }))
  .output(z.object({
    order: z.object({...}),
    items: z.array(z.object({
      id: z.number(),
      productName: z.string(),
      quantity: z.number(),
      location: z.string().optional(),
      bagId: z.number().nullable(),
      bagIdentifier: z.string().nullable(),
      isPacked: z.boolean()
    })),
    bags: z.array(z.object({
      id: z.number(),
      identifier: z.string(),
      itemCount: z.number()
    }))
  }))
  .query(async ({ input }) => {
    // Return order with items and their pack status
  });

// Pack selected items into a bag
pickPack.packItems = adminProcedure
  .input(z.object({
    orderId: z.number(),
    itemIds: z.array(z.number()),
    bagIdentifier: z.string().optional(), // Auto-generate if not provided
    notes: z.string().optional()
  }))
  .output(z.object({
    bagId: z.number(),
    bagIdentifier: z.string(),
    packedItemCount: z.number()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Create or get bag
    // 2. Assign items to bag
    // 3. Update order pick_pack_status if needed
    // 4. Return bag info
  });

// Mark order as ready for shipping
pickPack.markOrderReady = adminProcedure
  .input(z.object({ orderId: z.number() }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input }) => {
    // Validate all items packed, update status
  });
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Orders | Read/Subscribe | Real-time order status changes |
| Inventory | Read | Check item availability/location |
| Sales Queue | Event | Orders appear when CONFIRMED |
| Shipping | Write | Trigger shipping workflow when READY |
| Audit Log | Write | Log all pack/unpack actions |

### 4.4 Real-Time Updates

```typescript
// WebSocket or polling for real-time pick list updates
// Option 1: WebSocket subscription
pickPack.subscribeToPickList = adminProcedure
  .subscription(() => {
    return observable((emit) => {
      // Emit when orders are confirmed or status changes
    });
  });

// Option 2: Polling with last-modified check
pickPack.getPickListUpdates = adminProcedure
  .input(z.object({ since: z.date() }))
  .output(z.object({
    hasUpdates: z.boolean(),
    orders: z.array(...)
  }))
  .query(async ({ input }) => {
    // Return only orders modified since timestamp
  });
```

## 5. UI/UX Specification

### 5.1 User Flow

```
[Open Pick & Pack Module] 
    → [View Real-Time Pick List] 
    → [Click Order to Expand] 
    → [Multi-Select Items] 
    → [Click "Pack Selected"] 
    → [Assign Bag ID] 
    → [Repeat for All Items] 
    → [Click "Mark Ready"]
```

### 5.2 Wireframe Description

**Pick List View (Main Screen):**

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Pick & Pack                          [Filter ▼] [🔄]   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 ORD-2024-1234 | Acme Corp | 12 items | 0 packed  │   │
│  │    Priority: HIGH | Created: 10 min ago             │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟡 ORD-2024-1235 | Beta LLC | 5 items | 3 packed    │   │
│  │    Priority: MEDIUM | Created: 25 min ago           │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟢 ORD-2024-1236 | Gamma Inc | 8 items | 8 packed   │   │
│  │    Priority: LOW | Created: 1 hour ago    [Ready ✓] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Order Detail View (Expanded):**

```
┌─────────────────────────────────────────────────────────────┐
│  ← Back | ORD-2024-1234 | Acme Corp                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Items to Pack:                    [Select All] [Pack Selected]│
│  ┌─────────────────────────────────────────────────────┐   │
│  │ ☑ Blue Dream 1oz    | Qty: 2 | Loc: A-12 | ⬜ Bag   │   │
│  │ ☑ OG Kush 1/2oz     | Qty: 4 | Loc: B-03 | ⬜ Bag   │   │
│  │ ☐ Sour Diesel 1oz   | Qty: 1 | Loc: A-15 | 📦 BAG-001│   │
│  │ ☐ Purple Haze 1/4oz | Qty: 3 | Loc: C-07 | 📦 BAG-001│   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Bags: BAG-001 (2 items) | BAG-002 (0 items)               │
│                                                             │
│  [Print Packing Slip]              [Mark Order Ready]       │
└─────────────────────────────────────────────────────────────┘
```

**Design Requirements:**
- Large touch targets for tablet use
- High contrast for warehouse lighting conditions
- Color-coded status indicators (red/yellow/green)
- Checkbox selection with visible hit area
- Sticky header with action buttons
- Real-time update indicator (pulsing dot when new orders)

### 5.3 Acceptance Criteria (UI)

- [ ] Pick list loads within 1 second
- [ ] New orders appear within 5 seconds of confirmation
- [ ] Multi-select works with touch and mouse
- [ ] "Pack Selected" disabled when no items selected
- [ ] Bag assignment modal shows suggested next bag ID
- [ ] Packed items visually distinct (grayed out, checkmark)
- [ ] "Mark Ready" disabled until all items packed
- [ ] Print packing slip opens in new tab/downloads PDF

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Order has 0 items | Show "No items to pack" message |
| Item already packed | Checkbox disabled, show bag assignment |
| Concurrent packing by two users | Real-time sync, show "Item packed by [user]" |
| Network disconnect | Show offline indicator, queue actions |
| Item out of stock after order confirmed | Show warning icon, allow pack with confirmation |
| Unpack request | Require manager override, log reason |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] `getPickList` returns correct orders in priority order
- [ ] `packItems` correctly assigns items to bags
- [ ] Validation prevents packing already-packed items
- [ ] `markOrderReady` validates all items packed

### 7.2 Integration Tests

- [ ] Real-time updates when order confirmed
- [ ] Concurrent user packing same order
- [ ] Bag ID uniqueness within order
- [ ] Status transitions (PENDING → PICKING → PACKED → READY)

### 7.3 E2E Tests

- [ ] Complete pick/pack flow for single order
- [ ] Multi-bag order packing
- [ ] Print packing slip
- [ ] Filter and search functionality

## 8. Migration & Rollout

### 8.1 Data Migration

```sql
-- Set initial pick_pack_status for existing orders
UPDATE orders 
SET pick_pack_status = CASE
  WHEN status = 'FULFILLED' THEN 'READY'
  WHEN status = 'CONFIRMED' THEN 'PENDING'
  ELSE 'PENDING'
END
WHERE pick_pack_status IS NULL;
```

### 8.2 Feature Flag

`FEATURE_PICK_PACK_MODULE` - Enable for warehouse users first.

### 8.3 Rollback Plan

1. Disable feature flag
2. Module hidden from navigation
3. Existing bag data preserved
4. Orders continue to function without pick/pack tracking

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Order packing time | 50% reduction | Time from CONFIRMED to READY |
| Packing errors | < 1% | Returns due to wrong items |
| User adoption | 100% warehouse staff | Module usage tracking |
| Real-time latency | < 5 seconds | Order appear time |

## 10. Open Questions

- [x] Should scanning be supported? **No, click-based is faster per user feedback**
- [x] Should bags have weight/dimension tracking? **Defer to future enhancement**
- [ ] Should we integrate with shipping label generation? **Yes, in WS-009 or separate task**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
