# Specification: FEAT-005 - Scheduling & Referral APIs

**Status:** Draft
**Priority:** MEDIUM
**Estimate:** 24h
**Module:** Scheduling / Clients
**Dependencies:** None
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

The current system lacks integrated scheduling for order pickups and delivery, as well as a referral tracking system ("couch tax"). Sales orders need the ability to set pickup dates that integrate with the warehouse pick/pack queue, and referral commissions need to be tracked and credited to referrers' accounts for later payment.

**User Quotes:**
> "pick up date should be able to be set, and if it's like ASAP or like now, then. That should affect the pick and pack queue"

> "A sale does need to have an area where you have the referred by or the person, the couch tax"

## 2. User Stories

1. **As a sales representative**, I want to set a pickup date/time on orders, so that the warehouse can plan their work.

2. **As a warehouse worker**, I want orders marked "ASAP" to appear at the top of my pick queue, so that I prioritize urgent orders.

3. **As a sales representative**, I want to record who referred a customer, so that the referrer gets their commission.

4. **As an administrator**, I want to see referral commissions owed by referrer, so that I can process payments.

5. **As a referrer**, I want to track my accumulated commissions, so that I know what I'm owed.

## 3. Functional Requirements

### 3.1 Scheduling Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | API must accept pickup date/time on order creation/update | Must Have |
| FR-02 | API must support "ASAP" flag that prioritizes order in pick queue | Must Have |
| FR-03 | API must integrate with calendar system for scheduling | Should Have |
| FR-04 | API must return orders sorted by pickup date in pick queue | Must Have |
| FR-05 | API must support rescheduling with audit trail | Should Have |

### 3.2 Referral (Couch Tax) Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-06 | API must accept referrer client ID on order creation | Must Have |
| FR-07 | API must calculate commission based on configurable rules | Must Have |
| FR-08 | API must credit commission to referrer's account | Must Have |
| FR-09 | API must track commission payments to referrers | Must Have |
| FR-10 | API must support per-category commission rates | Should Have |
| FR-11 | API must support per-unit or percentage commission | Should Have |

### 3.3 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | ASAP orders sorted above scheduled orders | ASAP → Today 2pm → Tomorrow 10am |
| BR-02 | Default commission: $X per unit by category | Flower: $5/oz, Concentrate: $2/g |
| BR-03 | Commission only credited on completed sales | Cancelled orders = no commission |
| BR-04 | Referrer must be client with `isReferee=true` | Validates referrer eligibility |
| BR-05 | Commission credited when order marked as DELIVERED | Not on order creation |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- Add scheduling fields to orders table
ALTER TABLE orders ADD COLUMN pickupDate DATE;
ALTER TABLE orders ADD COLUMN pickupTime TIME;
ALTER TABLE orders ADD COLUMN isAsap BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN pickupNotes TEXT;

-- Add referral fields to orders table
ALTER TABLE orders ADD COLUMN referrerClientId INT REFERENCES clients(id);
ALTER TABLE orders ADD COLUMN referralCommissionTotal DECIMAL(10,2) DEFAULT 0;

-- New table for referral commission rules
CREATE TABLE referral_commission_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100), -- NULL = applies to all categories
  commissionType ENUM('PER_UNIT', 'PERCENTAGE') NOT NULL,
  commissionValue DECIMAL(10,4) NOT NULL, -- $ per unit or percentage
  minOrderValue DECIMAL(10,2) DEFAULT 0, -- Minimum order for commission
  isActive BOOLEAN DEFAULT TRUE,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_commission_rules_category (category),
  INDEX idx_commission_rules_active (isActive)
);

-- New table for referral commission ledger
CREATE TABLE referral_commissions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  referrerClientId INT NOT NULL REFERENCES clients(id),
  orderId INT NOT NULL REFERENCES orders(id),
  orderLineItemId INT REFERENCES order_line_items(id),
  productCategory VARCHAR(100),
  quantity DECIMAL(10,2),
  commissionRuleId INT REFERENCES referral_commission_rules(id),
  commissionAmount DECIMAL(10,2) NOT NULL,
  status ENUM('PENDING', 'CREDITED', 'PAID', 'VOIDED') DEFAULT 'PENDING',
  creditedAt TIMESTAMP,
  paidAt TIMESTAMP,
  paymentId INT, -- Reference to payment when paid out
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_referral_commissions_referrer (referrerClientId),
  INDEX idx_referral_commissions_order (orderId),
  INDEX idx_referral_commissions_status (status)
);

-- Add referral balance to clients table
ALTER TABLE clients ADD COLUMN referralBalance DECIMAL(10,2) DEFAULT 0;
```

### 4.2 API Contracts

**File:** `/home/user/TERP/server/routers/scheduling.ts` (new file)

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { requirePermission } from "../_core/permissionMiddleware";

export const schedulingRouter = router({
  // Set pickup schedule for order
  setPickupSchedule: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({
      orderId: z.number(),
      pickupDate: z.string().optional(), // ISO date
      pickupTime: z.string().optional(), // HH:MM format
      isAsap: z.boolean().default(false),
      pickupNotes: z.string().optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      queuePosition: z.number(), // Position in pick queue
    }))
    .mutation(async ({ input, ctx }) => {
      // Validate date is not in past
      // Update order with scheduling info
      // Recalculate queue positions
    }),

  // Get pick/pack queue
  getPickQueue: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({
      date: z.string().optional(), // Filter by date, default today
      status: z.array(z.enum(["PENDING", "IN_PROGRESS", "READY"])).optional(),
    }))
    .output(z.object({
      queue: z.array(z.object({
        orderId: z.number(),
        orderNumber: z.string(),
        clientName: z.string(),
        pickupDate: z.string().nullable(),
        pickupTime: z.string().nullable(),
        isAsap: z.boolean(),
        queuePosition: z.number(),
        itemCount: z.number(),
        status: z.string(),
        assignedTo: z.string().nullable(),
        estimatedPickTime: z.number(), // Minutes
      })),
      stats: z.object({
        totalOrders: z.number(),
        asapCount: z.number(),
        scheduledCount: z.number(),
        inProgressCount: z.number(),
      }),
    }))
    .query(async ({ input }) => {
      // Query orders with scheduling info
      // Sort: ASAP first, then by pickupDate/Time
    }),

  // Reschedule pickup
  reschedulePickup: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({
      orderId: z.number(),
      newPickupDate: z.string(),
      newPickupTime: z.string().optional(),
      reason: z.string(),
    }))
    .output(z.object({
      success: z.boolean(),
      oldSchedule: z.object({
        pickupDate: z.string().nullable(),
        pickupTime: z.string().nullable(),
      }),
      newSchedule: z.object({
        pickupDate: z.string(),
        pickupTime: z.string().nullable(),
      }),
    }))
    .mutation(async ({ input, ctx }) => {
      // Log reschedule to audit
      // Update order
      // Notify relevant parties
    }),
});
```

**File:** `/home/user/TERP/server/routers/referrals.ts` (new file)

```typescript
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { requirePermission } from "../_core/permissionMiddleware";

export const referralsRouter = router({
  // Add referrer to order
  setOrderReferrer: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({
      orderId: z.number(),
      referrerClientId: z.number(),
    }))
    .output(z.object({
      success: z.boolean(),
      estimatedCommission: z.number(), // Calculated based on current order items
    }))
    .mutation(async ({ input }) => {
      // Validate referrer is client with isReferee=true
      // Update order with referrer
      // Calculate estimated commission
    }),

  // Calculate commission for order
  calculateCommission: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({
      orderId: z.number(),
    }))
    .output(z.object({
      lineItems: z.array(z.object({
        lineItemId: z.number(),
        productName: z.string(),
        category: z.string(),
        quantity: z.number(),
        commissionRule: z.string(),
        commissionAmount: z.number(),
      })),
      totalCommission: z.number(),
    }))
    .query(async ({ input }) => {
      // Get order line items
      // Apply commission rules by category
      // Calculate total
    }),

  // Credit commission (called when order delivered)
  creditCommission: protectedProcedure
    .use(requirePermission("admin:referrals"))
    .input(z.object({
      orderId: z.number(),
    }))
    .output(z.object({
      success: z.boolean(),
      commissionsCredited: z.number(),
      referrerNewBalance: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create commission ledger entries
      // Update referrer's referralBalance
      // Mark commissions as CREDITED
    }),

  // Get referrer's commission summary
  getReferrerSummary: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({
      referrerClientId: z.number(),
      dateRange: z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    }))
    .output(z.object({
      referrer: z.object({
        clientId: z.number(),
        name: z.string(),
        currentBalance: z.number(),
        totalEarned: z.number(),
        totalPaid: z.number(),
      }),
      commissions: z.array(z.object({
        orderId: z.number(),
        orderNumber: z.string(),
        orderDate: z.string(),
        customerName: z.string(),
        commissionAmount: z.number(),
        status: z.string(),
      })),
      byCategory: z.array(z.object({
        category: z.string(),
        totalQuantity: z.number(),
        totalCommission: z.number(),
      })),
    }))
    .query(async ({ input }) => {
      // Aggregate commissions for referrer
    }),

  // Process commission payout
  processCommissionPayout: protectedProcedure
    .use(requirePermission("admin:referrals"))
    .input(z.object({
      referrerClientId: z.number(),
      amount: z.number().positive(),
      paymentMethod: z.enum(["CASH", "CHECK", "WIRE", "ACH"]),
      referenceNumber: z.string().optional(),
      note: z.string().optional(),
    }))
    .output(z.object({
      success: z.boolean(),
      paymentId: z.number(),
      commissionsUpdated: z.number(),
      newBalance: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Create payment record
      // Update commission entries to PAID
      // Update referrer's referralBalance
    }),

  // Get commission rules
  getCommissionRules: protectedProcedure
    .use(requirePermission("admin:referrals"))
    .output(z.array(z.object({
      id: z.number(),
      name: z.string(),
      category: z.string().nullable(),
      commissionType: z.enum(["PER_UNIT", "PERCENTAGE"]),
      commissionValue: z.number(),
      minOrderValue: z.number(),
      isActive: z.boolean(),
    })))
    .query(async () => {
      // Return all commission rules
    }),

  // Create/update commission rule
  upsertCommissionRule: protectedProcedure
    .use(requirePermission("admin:referrals"))
    .input(z.object({
      id: z.number().optional(), // Omit for create
      name: z.string(),
      category: z.string().nullable(),
      commissionType: z.enum(["PER_UNIT", "PERCENTAGE"]),
      commissionValue: z.number().positive(),
      minOrderValue: z.number().min(0).default(0),
      isActive: z.boolean().default(true),
    }))
    .output(z.object({
      id: z.number(),
      success: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      // Create or update commission rule
    }),
});
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Orders | Read/Write | Scheduling and referral fields |
| Clients | Read/Write | Referrer info and balance |
| Calendar | Write | Create pickup events |
| Pick & Pack | Read | Queue integration |
| Payments | Write | Commission payouts |
| Audit Log | Write | Schedule changes, commission credits |

## 5. UI/UX Specification

### 5.1 User Flow - Scheduling

```
[Sales rep creates order]
    → [Set pickup: Date picker or "ASAP" toggle]
    → [Order saved with schedule]
    → [Warehouse sees order in pick queue]
    → [ASAP orders appear at top]
```

### 5.2 User Flow - Referrals

```
[Sales rep creates order]
    → [Select referrer from client dropdown (isReferee=true)]
    → [System calculates estimated commission]
    → [Order delivered]
    → [System credits commission to referrer balance]
    → [Admin pays out referrer periodically]
```

### 5.3 Wireframe Description

Not applicable - this is a backend API spec. See ENH-005 for frontend implementation.

### 5.4 Acceptance Criteria (API)

- [ ] Pickup date/time can be set on orders
- [ ] ASAP flag correctly prioritizes orders in queue
- [ ] Pick queue returns orders sorted by priority
- [ ] Referrer can be assigned to orders
- [ ] Commission calculated correctly per category rules
- [ ] Commission credited when order delivered
- [ ] Referrer balance updated correctly
- [ ] Commission payout creates payment record

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Pickup date in past | Return 400 error: "Pickup date must be in future" |
| Invalid referrer (not isReferee) | Return 400 error: "Client is not a referrer" |
| Order cancelled after commission credited | Void commission entries, deduct from balance |
| No commission rule for category | Use default rule if exists, otherwise $0 |
| Payout exceeds referrer balance | Return 400 error: "Payout exceeds available balance" |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Queue sorting with ASAP and scheduled orders
- [ ] Commission calculation for various rules
- [ ] Balance update on credit/payout

### 7.2 Integration Tests

- [ ] Full scheduling flow
- [ ] Full referral commission flow
- [ ] Order cancellation with commission void

### 7.3 E2E Tests

- [ ] Create order with schedule and referrer
- [ ] View pick queue
- [ ] Process commission payout

## 8. Migration & Rollout

### 8.1 Data Migration

```sql
-- Add scheduling columns
ALTER TABLE orders ADD COLUMN pickupDate DATE;
ALTER TABLE orders ADD COLUMN pickupTime TIME;
ALTER TABLE orders ADD COLUMN isAsap BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN pickupNotes TEXT;

-- Add referral columns
ALTER TABLE orders ADD COLUMN referrerClientId INT;
ALTER TABLE orders ADD COLUMN referralCommissionTotal DECIMAL(10,2) DEFAULT 0;

-- Create new tables
CREATE TABLE referral_commission_rules (...);
CREATE TABLE referral_commissions (...);

-- Add referral balance to clients
ALTER TABLE clients ADD COLUMN referralBalance DECIMAL(10,2) DEFAULT 0;

-- Seed default commission rules
INSERT INTO referral_commission_rules (name, category, commissionType, commissionValue)
VALUES
  ('Flower Default', 'Flower', 'PER_UNIT', 5.00),
  ('Concentrate Default', 'Concentrate', 'PER_UNIT', 2.00),
  ('Edible Default', 'Edible', 'PER_UNIT', 1.00);
```

### 8.2 Feature Flag

`FEATURE_SCHEDULING_REFERRALS` - Enable for testing.

### 8.3 Rollback Plan

1. Disable feature flag
2. Scheduling/referral fields hidden in UI
3. Existing data preserved

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Orders with pickup schedule | 80%+ | Order analytics |
| Referral commissions tracked | Accurate within $1 | Reconciliation |
| Pick queue efficiency | 20% improvement | Time tracking |

## 10. Open Questions

- [ ] Should referrers be able to view their own commission portal?
- [ ] Should we support tiered commission rates based on volume?

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
