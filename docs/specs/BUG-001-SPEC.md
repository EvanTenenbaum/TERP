# Specification: BUG-001 - Price Override Audit Trail

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 8h  
**Module:** Sales/Orders  
**Dependencies:** WS-005 (Audit Trail)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

When salespeople override prices during order creation, there's no audit trail showing:
- What the original price was
- What it was changed to
- Who made the change
- Why the change was made

This creates accountability issues and makes it difficult to analyze pricing decisions.

## 2. User Stories

1. **As a manager**, I want to see all price overrides, so that I can monitor pricing decisions.

2. **As an auditor**, I want to know who changed prices and why, so that I can ensure compliance.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Log original price on order items | Must Have |
| FR-02 | Log override price and user | Must Have |
| FR-03 | Require reason for override | Should Have |
| FR-04 | Price override report | Must Have |
| FR-05 | Alert on significant overrides | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
ALTER TABLE order_items ADD COLUMN original_price DECIMAL(10,2);
ALTER TABLE order_items ADD COLUMN is_price_override BOOLEAN DEFAULT FALSE;
ALTER TABLE order_items ADD COLUMN override_reason TEXT;
ALTER TABLE order_items ADD COLUMN override_by INT REFERENCES users(id);
ALTER TABLE order_items ADD COLUMN override_at TIMESTAMP;
```

### 4.2 API Changes

```typescript
// Update order item creation to track overrides
orders.addItem = adminProcedure
  .input(z.object({
    orderId: z.number(),
    batchId: z.number(),
    quantity: z.number(),
    unitPrice: z.number(),
    overrideReason: z.string().optional() // Required if price differs from batch price
  }))
  .mutation(async ({ input, ctx }) => {
    const batch = await getBatch(input.batchId);
    const isOverride = input.unitPrice !== batch.sellPricePerUnit;
    
    if (isOverride && !input.overrideReason) {
      throw new Error('Override reason required');
    }
    
    // Create order item with override tracking
  });

// Price override report
reports.priceOverrides = adminProcedure
  .input(z.object({
    startDate: z.date(),
    endDate: z.date(),
    userId: z.number().optional()
  }))
  .output(z.array(z.object({
    orderId: z.number(),
    orderDate: z.date(),
    productName: z.string(),
    originalPrice: z.number(),
    overridePrice: z.number(),
    variance: z.number(),
    variancePercent: z.number(),
    reason: z.string(),
    overrideBy: z.string()
  })))
  .query(async ({ input }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: Price Override Dialog

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Price Override                                     [X]  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Product: Blue Dream (BD-2024-001)                         │
│  Standard Price: $100/oz                                   │
│  Your Price: $90/oz (-10%)                                 │
│                                                             │
│  Reason for override: (required)                           │
│  [Bulk discount - 50+ oz order________________]            │
│                                                             │
│  [Cancel]                              [Confirm Override]   │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria

- [ ] Original price stored on all order items
- [ ] Override flag set when price differs
- [ ] Reason required for overrides
- [ ] Override report shows all overrides
- [ ] User who made override is tracked

## 6. Testing Requirements

- [ ] Override detection accuracy
- [ ] Reason requirement enforcement
- [ ] Report data accuracy
- [ ] Historical data handling

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
