# Specification: WS-004 - Sales: Simultaneous Multi-Order & Referral Credit System

**Status:** Approved  
**Priority:** CRITICAL  
**Estimate:** 40h  
**Module:** Sales/Credit  
**Dependencies:** FEATURE-015 (Credit System) - Completed  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The business has a complex sales scenario where a VIP customer (e.g., "Tigger") brings a new customer to shop. Both customers shop simultaneously with different, on-the-fly price adjustments. The VIP earns a referral kickback (e.g., 10% of the new customer's purchase) that should be applied as a credit to their bill. The system must handle:

1. **Two simultaneous live shopping sessions** with different pricing
2. **Referral linkage** between the VIP and new customer
3. **Real-time credit calculation** based on the new customer's purchases
4. **Two separate bills** with the VIP's bill showing the applied referral credit

This is currently impossible without manual spreadsheet tracking.

## 2. User Stories

1. **As a salesperson**, I want to link a new customer's shopping session to a VIP referrer, so that the VIP earns credit for bringing in new business.

2. **As a salesperson**, I want to manage two simultaneous shopping sessions with different price adjustments, so that I can serve both customers efficiently.

3. **As a salesperson**, I want the VIP's referral credit to be automatically calculated and applied to their bill, so that I don't have to manually track and calculate kickbacks.

4. **As a VIP customer**, I want to see my referral credit applied to my bill before I pay, so that I know exactly what I owe.

5. **As a manager**, I want to configure referral credit percentages and rules, so that I can adjust the program as needed.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Support multiple concurrent shopping sessions per salesperson | Must Have |
| FR-02 | "Referred By" field on new customer's order linking to VIP | Must Have |
| FR-03 | Automatic referral credit calculation (configurable %) | Must Have |
| FR-04 | Pending credit tracking until new customer's order is finalized | Must Have |
| FR-05 | "Apply Pending Referral Credits" action on VIP's order | Must Have |
| FR-06 | Generate two separate bills with correct amounts | Must Have |
| FR-07 | Referral credit shown as line item discount on VIP's bill | Must Have |
| FR-08 | Configurable referral percentage per VIP tier or globally | Should Have |
| FR-09 | Referral credit history and reporting | Should Have |
| FR-10 | Notification to VIP when they earn referral credit | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Referral credit = X% of referred customer's order total | 10% of $25K = $2,500 credit |
| BR-02 | Credit is pending until referred order is finalized | Not applied if order cancelled |
| BR-03 | VIP must have active order to apply credit | Can't apply to closed orders |
| BR-04 | Credit can only be applied once per referral | Prevent double-application |
| BR-05 | Referral credit cannot exceed VIP's order total | $2,500 credit on $2,000 order → $2,000 applied, $500 remains |
| BR-06 | Unused credit rolls to VIP's account balance | Available for future orders |
| BR-07 | Referral percentage configurable (default 10%) | Admin setting |
| BR-08 | Self-referral not allowed | VIP cannot refer themselves |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- New table for referral tracking
CREATE TABLE referral_credits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referrer_client_id INT NOT NULL REFERENCES clients(id),
  referred_client_id INT NOT NULL REFERENCES clients(id),
  referred_order_id INT NOT NULL REFERENCES orders(id),
  credit_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  order_total DECIMAL(12,2) NOT NULL,
  credit_amount DECIMAL(12,2) NOT NULL,
  status ENUM('PENDING', 'AVAILABLE', 'APPLIED', 'EXPIRED', 'CANCELLED') DEFAULT 'PENDING',
  applied_to_order_id INT REFERENCES orders(id),
  applied_amount DECIMAL(12,2),
  applied_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP, -- Optional expiration
  notes TEXT,
  INDEX idx_referrer (referrer_client_id),
  INDEX idx_referred_order (referred_order_id),
  INDEX idx_status (status)
);

-- Add referral fields to orders
ALTER TABLE orders ADD COLUMN referred_by_client_id INT REFERENCES clients(id);
ALTER TABLE orders ADD COLUMN is_referral_order BOOLEAN DEFAULT FALSE;

-- Add referral settings to system config or client tiers
CREATE TABLE referral_settings (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_tier VARCHAR(50), -- NULL for global default
  credit_percentage DECIMAL(5,2) NOT NULL DEFAULT 10.00,
  min_order_amount DECIMAL(12,2) DEFAULT 0,
  max_credit_amount DECIMAL(12,2), -- NULL for no limit
  credit_expiry_days INT, -- NULL for no expiry
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP
);
```

### 4.2 API Contracts

```typescript
// Link referral when creating order
orders.createOrder = adminProcedure
  .input(z.object({
    clientId: z.number(),
    items: z.array(...),
    referredByClientId: z.number().optional(), // NEW: Link to VIP
    // ... existing fields
  }))
  .mutation(async ({ input, ctx }) => {
    // Create order with referral linkage
    // If referredByClientId provided, create pending referral_credit
  });

// Get pending referral credits for a client
referrals.getPendingCredits = adminProcedure
  .input(z.object({ clientId: z.number() }))
  .output(z.object({
    totalPending: z.number(),
    totalAvailable: z.number(),
    credits: z.array(z.object({
      id: z.number(),
      referredClientName: z.string(),
      referredOrderNumber: z.string(),
      creditAmount: z.number(),
      status: z.string(),
      createdAt: z.date()
    }))
  }))
  .query(async ({ input }) => {
    // Return all pending and available credits for client
  });

// Apply referral credits to an order
referrals.applyCreditsToOrder = adminProcedure
  .input(z.object({
    orderId: z.number(),
    creditIds: z.array(z.number()).optional(), // Specific credits, or all available
    maxAmount: z.number().optional() // Limit application amount
  }))
  .output(z.object({
    appliedAmount: z.number(),
    remainingCredits: z.number(),
    orderNewTotal: z.number(),
    appliedCredits: z.array(z.object({
      creditId: z.number(),
      appliedAmount: z.number()
    }))
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Get available credits for order's client
    // 2. Calculate applicable amount (min of credits, order total)
    // 3. Apply as discount line item
    // 4. Update credit status to APPLIED
    // 5. Return new order total
  });

// Finalize referred order (triggers credit availability)
orders.finalizeOrder = adminProcedure
  .input(z.object({ orderId: z.number() }))
  .mutation(async ({ input }) => {
    // Existing finalization logic
    // NEW: Update referral_credit status from PENDING to AVAILABLE
  });

// Get referral settings
referrals.getSettings = adminProcedure
  .output(z.object({
    globalPercentage: z.number(),
    tierSettings: z.array(...)
  }))
  .query(async () => {
    // Return referral configuration
  });

// Update referral settings (admin only)
referrals.updateSettings = adminProcedure
  .input(z.object({
    globalPercentage: z.number().optional(),
    tierSettings: z.array(...).optional()
  }))
  .mutation(async ({ input }) => {
    // Update referral configuration
  });
```

### 4.3 State Machine: Referral Credit Lifecycle

```
                    ┌──────────────┐
                    │   PENDING    │ ← Created when referred order created
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            │              │              │
            ▼              ▼              ▼
    ┌───────────┐  ┌───────────┐  ┌───────────┐
    │ AVAILABLE │  │ CANCELLED │  │  EXPIRED  │
    │           │  │           │  │           │
    └─────┬─────┘  └───────────┘  └───────────┘
          │         (order cancelled)  (time limit)
          │
          ▼
    ┌───────────┐
    │  APPLIED  │ ← Credit used on VIP's order
    └───────────┘
```

### 4.4 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Orders | Read/Write | Create orders with referral linkage |
| Clients | Read | Lookup VIP and referred customer |
| Credit System | Write | Apply credit as order discount |
| Billing | Write | Generate separate bills |
| Notifications | Write | Alert VIP of earned credit |
| Reporting | Read | Referral program analytics |

## 5. UI/UX Specification

### 5.1 User Flow: Salesperson Creating Referred Order

```
[Start New Order for New Customer]
    → [Select/Create Customer]
    → [Show "Referred By" Dropdown] 
    → [Select VIP (Tigger)]
    → [Add Items, Adjust Prices]
    → [Finalize Order]
    → [System Creates Pending Credit for VIP]
```

### 5.2 User Flow: Applying Credit to VIP's Order

```
[Open VIP's Order (Tigger)]
    → [See "Pending Referral Credits: $2,500" Banner]
    → [Click "Apply Referral Credits"]
    → [Confirm Application]
    → [Order Total Updated]
    → [Generate Bill with Credit Line Item]
```

### 5.3 Wireframe: Order Creation with Referral

```
┌─────────────────────────────────────────────────────────────┐
│  New Order                                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Customer: [New Customer Name        ▼]                     │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎁 Referred By (Optional)                           │   │
│  │ [Search VIP customers...          ▼]                │   │
│  │                                                     │   │
│  │ ℹ️ The referring customer will earn 10% credit     │   │
│  │    on this order's total.                          │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Items:                                                     │
│  [+ Add Item]                                               │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Wireframe: VIP Order with Pending Credits

```
┌─────────────────────────────────────────────────────────────┐
│  Order: ORD-2024-5678 | Tigger (VIP)                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 💰 You have $2,500.00 in Referral Credits!          │   │
│  │                                                     │   │
│  │ From: New Customer (ORD-2024-5677) - $2,500.00     │   │
│  │                                                     │   │
│  │ [Apply Credits to This Order]                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Order Items:                                               │
│  ├─ Blue Dream 1oz x 5      $2,500.00                      │
│  ├─ OG Kush 1/2oz x 10      $3,000.00                      │
│  └─ Sour Diesel 1oz x 3     $1,500.00                      │
│                                                             │
│  ─────────────────────────────────────────────────────────  │
│  Subtotal:                              $7,000.00          │
│  Referral Credit:                      -$2,500.00          │
│  ─────────────────────────────────────────────────────────  │
│  Total Due:                             $4,500.00          │
│                                                             │
│  [Generate Bill]                                            │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Acceptance Criteria (UI)

- [ ] "Referred By" field appears on order creation
- [ ] VIP search shows only eligible referrers
- [ ] Pending credits banner visible on VIP's order
- [ ] Credit application shows breakdown before confirming
- [ ] Bill clearly shows "Referral Credit" as line item
- [ ] Two separate bills can be generated and sent
- [ ] Credit history viewable in VIP's profile

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Referred order cancelled | Credit status → CANCELLED, not available |
| VIP has no active order | Show "No active order to apply credits" |
| Credit exceeds order total | Apply up to order total, remainder stays available |
| Multiple referrals same session | Each creates separate credit entry |
| VIP refers existing customer | Allow (re-engagement incentive) |
| Referral percentage changed mid-order | Use percentage at time of referral creation |
| Credit expired | Status → EXPIRED, not available for application |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Credit calculation with various percentages
- [ ] Credit status transitions (PENDING → AVAILABLE → APPLIED)
- [ ] Partial credit application (credit > order total)
- [ ] Credit expiration logic
- [ ] Self-referral prevention

### 7.2 Integration Tests

- [ ] Full referral flow: create referred order → finalize → apply credit
- [ ] Concurrent orders with referral linkage
- [ ] Credit rollover to account balance
- [ ] Bill generation with credit line item

### 7.3 E2E Tests

- [ ] Complete two-customer shopping scenario
- [ ] VIP receives and applies credit
- [ ] Two separate bills generated correctly
- [ ] Credit history displays accurately

## 8. Migration & Rollout

### 8.1 Data Migration

```sql
-- No migration of existing data required
-- New tables created empty
-- Existing orders unaffected (no referral linkage)

-- Insert default referral settings
INSERT INTO referral_settings (client_tier, credit_percentage, is_active)
VALUES (NULL, 10.00, TRUE); -- Global 10% default
```

### 8.2 Feature Flag

`FEATURE_REFERRAL_CREDITS` - Enable for testing with select salespeople first.

### 8.3 Rollback Plan

1. Disable feature flag
2. "Referred By" field hidden
3. Existing credits preserved but not usable
4. Orders function normally without referral features

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Referral orders created | Track adoption | Count orders with referred_by_client_id |
| Credits applied | Track usage | Sum of applied_amount |
| New customer acquisition via referral | Increase | Count unique referred_client_id |
| VIP satisfaction | Qualitative | Feedback from VIP customers |

## 10. Open Questions

- [x] Should credit percentage be per-VIP or global? **Both: global default, per-tier override**
- [x] Should credits expire? **Configurable, default no expiry**
- [x] Can VIP refer existing customers? **Yes, for re-engagement**
- [ ] Should there be a minimum order amount for referral credit? **Configurable, default $0**
- [ ] Should VIP be notified in real-time when credit is earned? **Nice to have, defer**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
