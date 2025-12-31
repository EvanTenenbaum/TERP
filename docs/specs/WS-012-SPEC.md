# Specification: WS-012 - Customer Preferences & Purchase History

**Status:** Approved  
**Priority:** MEDIUM  
**Estimate:** 16h  
**Module:** Sales/Customers  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

Salespeople need quick access to customer preferences and purchase history to provide personalized service. Currently, this information is scattered or not tracked at all. The system needs to surface **"what they usually buy"** and **"what they've asked for"** in a glanceable format during the sales process.

## 2. User Stories

1. **As a salesperson**, I want to see a customer's purchase history at a glance, so that I can recommend similar products.

2. **As a salesperson**, I want to record customer preferences and requests, so that I can follow up when relevant inventory arrives.

3. **As a manager**, I want to see which customers prefer which products, so that I can target outreach.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Display top purchased products on customer profile | Must Have |
| FR-02 | Display recent orders summary | Must Have |
| FR-03 | Add/edit customer preferences (free text notes) | Must Have |
| FR-04 | Quick view of preferences in order screen | Must Have |
| FR-05 | "Looking for" requests with notification when available | Should Have |
| FR-06 | Purchase frequency and average order value | Should Have |
| FR-07 | Preferred strains/categories auto-detected | Nice to Have |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- Customer preferences table
CREATE TABLE customer_preferences (
  id INT PRIMARY KEY AUTO_INCREMENT,
  customer_id INT NOT NULL REFERENCES customers(id),
  preference_type ENUM('NOTE', 'LOOKING_FOR', 'FAVORITE', 'AVOID') NOT NULL,
  content TEXT NOT NULL,
  product_id INT REFERENCES products(id),
  category_id INT REFERENCES categories(id),
  is_active BOOLEAN DEFAULT TRUE,
  notify_when_available BOOLEAN DEFAULT FALSE,
  notified_at TIMESTAMP,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_prefs (customer_id, is_active)
);

-- Materialized view for purchase stats (or calculate on demand)
CREATE VIEW customer_purchase_stats AS
SELECT 
  c.id as customer_id,
  COUNT(DISTINCT o.id) as total_orders,
  SUM(o.total) as total_spent,
  AVG(o.total) as avg_order_value,
  MAX(o.created_at) as last_order_date,
  DATEDIFF(NOW(), MAX(o.created_at)) as days_since_last_order
FROM customers c
LEFT JOIN orders o ON o.customer_id = c.id
GROUP BY c.id;
```

### 4.2 API Contracts

```typescript
// Get customer purchase summary
customers.getPurchaseSummary = adminProcedure
  .input(z.object({ customerId: z.number() }))
  .output(z.object({
    totalOrders: z.number(),
    totalSpent: z.number(),
    avgOrderValue: z.number(),
    lastOrderDate: z.date().nullable(),
    topProducts: z.array(z.object({
      productId: z.number(),
      productName: z.string(),
      totalQuantity: z.number(),
      totalSpent: z.number(),
      lastPurchased: z.date()
    })),
    recentOrders: z.array(z.object({
      orderId: z.number(),
      date: z.date(),
      total: z.number(),
      itemCount: z.number()
    }))
  }))
  .query(async ({ input }) => {
    // Aggregate purchase data
  });

// Get/set customer preferences
customers.getPreferences = adminProcedure
  .input(z.object({ customerId: z.number() }))
  .output(z.array(z.object({
    id: z.number(),
    type: z.string(),
    content: z.string(),
    productName: z.string().nullable(),
    categoryName: z.string().nullable(),
    notifyWhenAvailable: z.boolean(),
    createdAt: z.date()
  })))
  .query(async ({ input }) => {});

customers.addPreference = adminProcedure
  .input(z.object({
    customerId: z.number(),
    type: z.enum(['NOTE', 'LOOKING_FOR', 'FAVORITE', 'AVOID']),
    content: z.string(),
    productId: z.number().optional(),
    categoryId: z.number().optional(),
    notifyWhenAvailable: z.boolean().default(false)
  }))
  .output(z.object({ preferenceId: z.number() }))
  .mutation(async ({ input, ctx }) => {});
```

## 5. UI/UX Specification

### 5.1 Wireframe: Customer Profile - Preferences Section

```
┌─────────────────────────────────────────────────────────────┐
│  👤 Customer: Acme Corp                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📊 Purchase Summary                                        │
│  ─────────────────────────────────────────                  │
│  Orders: 47 | Total Spent: $125,000 | Avg: $2,659           │
│  Last Order: 3 days ago                                     │
│                                                             │
│  🏆 Top Products                                            │
│  ─────────────────────────────────────────                  │
│  1. Blue Dream - 150 oz ($15,000)                          │
│  2. OG Kush - 100 oz ($12,000)                             │
│  3. Sour Diesel - 75 oz ($9,000)                           │
│                                                             │
│  📝 Preferences & Notes                      [+ Add Note]   │
│  ─────────────────────────────────────────                  │
│  • Looking for: More GMOs from L4 🔔                       │
│  • Prefers: Indoor grown only                              │
│  • Note: Contact via text, not email                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Wireframe: Quick View in Order Screen

```
┌─────────────────────────────────────────────────────────────┐
│  Customer: [Acme Corp                        ▼] [ℹ️]        │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💡 Quick Info                                       │   │
│  │ Top: Blue Dream, OG Kush | Looking for: GMOs (L4)  │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Acceptance Criteria

- [ ] Purchase summary displays on customer profile
- [ ] Top products calculated from order history
- [ ] Preferences can be added/edited/deleted
- [ ] Quick info tooltip in order screen
- [ ] "Looking for" items can trigger notifications

## 6. Testing Requirements

- [ ] Purchase stats calculated correctly
- [ ] Top products sorted by quantity/value
- [ ] Preferences CRUD operations
- [ ] Quick info displays in order flow

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
