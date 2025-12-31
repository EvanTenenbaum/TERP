# Specification: FEATURE-003 - Live Shopping Session

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 40h  
**Module:** Sales  
**Dependencies:** WS-003 (Pick & Pack), WS-004 (Multi-Order)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The business conducts "live shopping" sessions where customers browse inventory in real-time, often with a salesperson. Products are marked as sold as the customer selects them, and the pick list needs to update in real-time for the warehouse. The current system doesn't support this real-time, interactive sales flow.

## 2. User Stories

1. **As a salesperson**, I want to start a "live shopping" session with a customer, so that I can add items to their cart in real-time.

2. **As a warehouse worker**, I want to see items being added to orders in real-time, so that I can start picking immediately.

3. **As a salesperson**, I want to adjust prices on-the-fly during a live session, so that I can negotiate with the customer.

4. **As a salesperson**, I want to handle multiple simultaneous live sessions, so that I can serve multiple customers at once.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Start/end live shopping session | Must Have |
| FR-02 | Add items to session cart in real-time | Must Have |
| FR-03 | Real-time pick list updates to warehouse | Must Have |
| FR-04 | On-the-fly price adjustments | Must Have |
| FR-05 | Session status visible to all users | Must Have |
| FR-06 | Reserve inventory during session | Must Have |
| FR-07 | Multiple simultaneous sessions | Should Have |
| FR-08 | Session timeout/auto-release | Should Have |
| FR-09 | Session notes/comments | Nice to Have |
| FR-10 | Session history/replay | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model

```sql
CREATE TABLE live_sessions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL REFERENCES customers(id),
  salesperson_id INT NOT NULL REFERENCES users(id),
  status ENUM('ACTIVE', 'COMPLETED', 'CANCELLED', 'TIMEOUT') DEFAULT 'ACTIVE',
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  ended_at TIMESTAMP,
  notes TEXT,
  order_id INT REFERENCES orders(id), -- Created when session completes
  INDEX idx_active_sessions (status, salesperson_id)
);

CREATE TABLE live_session_items (
  id INT PRIMARY KEY AUTO_INCREMENT,
  session_id INT NOT NULL REFERENCES live_sessions(id),
  batch_id INT NOT NULL REFERENCES batches(id),
  quantity INT NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  original_price DECIMAL(10,2) NOT NULL, -- For tracking adjustments
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  picked_at TIMESTAMP,
  picked_by INT REFERENCES users(id),
  INDEX idx_session_items (session_id)
);
```

### 4.2 Real-Time Architecture

```typescript
// WebSocket events for live session
interface LiveSessionEvents {
  // Client → Server
  'session:start': { customerId: number };
  'session:addItem': { sessionId: number; batchId: number; quantity: number; price: number };
  'session:removeItem': { sessionId: number; itemId: number };
  'session:adjustPrice': { sessionId: number; itemId: number; newPrice: number };
  'session:complete': { sessionId: number };
  'session:cancel': { sessionId: number };
  
  // Server → Client (broadcast)
  'session:itemAdded': { sessionId: number; item: SessionItem };
  'session:itemRemoved': { sessionId: number; itemId: number };
  'session:priceAdjusted': { sessionId: number; itemId: number; newPrice: number };
  'session:completed': { sessionId: number; orderId: number };
  
  // Server → Warehouse
  'picklist:newItem': { sessionId: number; item: PicklistItem };
  'picklist:itemRemoved': { sessionId: number; itemId: number };
}
```

### 4.3 API Contracts

```typescript
liveSessions.start = adminProcedure
  .input(z.object({
    customerId: z.number(),
    notes: z.string().optional()
  }))
  .output(z.object({
    sessionId: z.number(),
    status: z.string()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Create session record
    // 2. Broadcast session start
    // 3. Return session ID
  });

liveSessions.addItem = adminProcedure
  .input(z.object({
    sessionId: z.number(),
    batchId: z.number(),
    quantity: z.number(),
    unitPrice: z.number()
  }))
  .output(z.object({
    itemId: z.number(),
    reserved: z.boolean()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Validate inventory available
    // 2. Reserve inventory
    // 3. Add to session
    // 4. Broadcast to warehouse
  });

liveSessions.complete = adminProcedure
  .input(z.object({ sessionId: z.number() }))
  .output(z.object({
    orderId: z.number(),
    orderTotal: z.number()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Create order from session items
    // 2. Finalize inventory reservations
    // 3. Close session
    // 4. Broadcast completion
  });

liveSessions.getActive = adminProcedure
  .output(z.array(z.object({
    sessionId: z.number(),
    customerName: z.string(),
    salesperson: z.string(),
    itemCount: z.number(),
    totalValue: z.number(),
    duration: z.number() // minutes
  })))
  .query(async () => {});
```

### 4.4 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Inventory | Read/Write | Reserve/release inventory |
| Orders | Write | Create order on completion |
| Pick & Pack | Real-time | Push pick list updates |
| WebSocket | Real-time | Broadcast session events |

## 5. UI/UX Specification

### 5.1 User Flow

```
[Start Live Session]
    → [Select Customer]
    → [Browse Inventory]
    → [Add Items (real-time)]
    → [Adjust Prices (optional)]
    → [Complete Session]
    → [Order Created]
```

### 5.2 Wireframe: Live Session Screen

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 LIVE SESSION - Acme Corp                    [End Session]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Duration: 12:34 | Items: 5 | Total: $12,500               │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Cart                                                │   │
│  │                                                     │   │
│  │ Blue Dream (10 oz) @ $100/oz = $1,000      [✏️] [🗑️]│   │
│  │ OG Kush (5 oz) @ $120/oz = $600            [✏️] [🗑️]│   │
│  │ Sour Diesel (20 oz) @ $90/oz = $1,800      [✏️] [🗑️]│   │
│  │                                                     │   │
│  │ Subtotal: $3,400                                   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Available Inventory              [Search...]        │   │
│  │                                                     │   │
│  │ Purple Haze (25 oz) @ $95/oz              [+ Add]  │   │
│  │ Girl Scout (15 oz) @ $110/oz              [+ Add]  │   │
│  │ ...                                                │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel Session]                    [Complete & Create Order]│
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Wireframe: Warehouse Pick List (Real-Time)

```
┌─────────────────────────────────────────────────────────────┐
│  📦 Live Pick List                              [Refresh 🔄]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 Session #123 - Acme Corp (John)                        │
│  ─────────────────────────────────────────                  │
│  ☐ Blue Dream (10 oz) - Shelf A3              [Mark Picked]│
│  ☐ OG Kush (5 oz) - Shelf B2                  [Mark Picked]│
│  ✅ Sour Diesel (20 oz) - Shelf C1            Picked by Mike│
│                                                             │
│  🟡 Session #124 - Beta LLC (Jane)                         │
│  ─────────────────────────────────────────                  │
│  ☐ Purple Haze (15 oz) - Shelf A1             [Mark Picked]│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Acceptance Criteria

- [ ] Session can be started/ended
- [ ] Items added in real-time
- [ ] Inventory reserved during session
- [ ] Warehouse sees pick list updates immediately
- [ ] Prices can be adjusted per item
- [ ] Order created on completion
- [ ] Cancelled session releases inventory

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Inventory sold out during session | Alert, remove from cart |
| Session timeout (no activity) | Auto-release inventory after X minutes |
| Salesperson disconnects | Session persists, can be resumed |
| Two sessions want same item | First-come-first-served reservation |
| Complete with empty cart | Validation error |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Session CRUD operations
- [ ] Inventory reservation logic
- [ ] Price adjustment calculations
- [ ] Order creation from session

### 7.2 Integration Tests

- [ ] Real-time WebSocket events
- [ ] Inventory reservation/release
- [ ] Concurrent session handling
- [ ] Pick list synchronization

### 7.3 E2E Tests

- [ ] Full live session flow
- [ ] Multi-user concurrent sessions
- [ ] Session timeout behavior

## 8. Migration & Rollout

### 8.1 Feature Flag

`FEATURE_LIVE_SESSIONS` - Enable for select salespeople first.

### 8.2 Rollback Plan

1. Disable feature flag
2. Active sessions can still complete
3. New sessions use standard order flow

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Session completion rate | 90%+ | Completed / Started |
| Pick time reduction | 30% | Time from add to picked |
| Customer satisfaction | Improved | Feedback |

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
