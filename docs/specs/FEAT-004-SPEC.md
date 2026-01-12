# Specification: FEAT-004 - Pricing & Credit Logic Backend

**Status:** Draft
**Priority:** HIGH
**Estimate:** 28h
**Module:** Pricing / Clients
**Dependencies:** FEAT-001 (Enhanced Inventory API)
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

The current system lacks the ability to adjust pricing on-the-fly during sales order creation. Sales reps need to see the client's default pricing profile, understand what margin rules are applied, and be able to adjust pricing per-item or per-category during the order. Additionally, credit limit checking is not integrated into the sales workflow, leading to orders being placed that exceed the client's credit capacity.

**User Quote:**
> "The clients margin, like default pricing role is set. And tells me what it is right there, and I can adjust it on the fly, percentage, or per category, markup... you'll be, you'll need to look at their, like, credit"

## 2. User Stories

1. **As a sales representative**, I want to see the client's default pricing profile when creating an order, so that I understand the starting point for pricing.

2. **As a sales representative**, I want to adjust pricing on-the-fly (percentage or per category), so that I can negotiate with customers during the order.

3. **As a sales representative**, I want to see the client's credit limit and current balance, so that I don't create orders that exceed their credit.

4. **As an administrator**, I want price adjustments to be logged for audit purposes, so that I can track discounting patterns.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | API must return client's pricing profile with applied rules | Must Have |
| FR-02 | API must calculate order total with applied pricing rules | Must Have |
| FR-03 | API must support per-item price overrides during order creation | Must Have |
| FR-04 | API must support category-wide markup/discount adjustments | Must Have |
| FR-05 | API must return client's credit limit and available credit | Must Have |
| FR-06 | API must block orders that exceed available credit | Must Have |
| FR-07 | API must log all price adjustments for audit trail | Should Have |
| FR-08 | API must support temporary session-level pricing adjustments | Should Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Available credit = creditLimit - totalOwed | $50K limit - $20K owed = $30K available |
| BR-02 | Order cannot exceed available credit unless override | $35K order blocked if only $30K available |
| BR-03 | Credit override requires admin permission | Only admins can approve over-credit orders |
| BR-04 | Price adjustment logged with: user, timestamp, reason, old/new price | Audit trail |
| BR-05 | Category adjustments applied before item-level adjustments | Base → Category → Item |
| BR-06 | Maximum discount capped per user role | Rep: 15%, Manager: 25%, Admin: 100% |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- New table for session-level price adjustments
CREATE TABLE order_price_adjustments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  orderId INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  adjustmentType ENUM('ITEM', 'CATEGORY', 'ORDER') NOT NULL,
  targetId INT, -- productId for ITEM, null for CATEGORY/ORDER
  targetCategory VARCHAR(100), -- category name for CATEGORY type
  adjustmentMode ENUM('PERCENT', 'FIXED') NOT NULL,
  adjustmentValue DECIMAL(10,2) NOT NULL, -- negative for discount, positive for markup
  originalPrice DECIMAL(10,2),
  adjustedPrice DECIMAL(10,2),
  reason TEXT,
  adjustedBy INT NOT NULL REFERENCES users(id),
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_order_adjustments_order (orderId),
  INDEX idx_order_adjustments_type (adjustmentType)
);

-- Add to existing orders table
ALTER TABLE orders ADD COLUMN creditOverrideApproved BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN creditOverrideBy INT REFERENCES users(id);
ALTER TABLE orders ADD COLUMN creditOverrideReason TEXT;
```

### 4.2 API Contracts

**File:** `/home/user/TERP/server/routers/pricing.ts`

```typescript
// Get client pricing context for order creation
pricing.getClientContext = protectedProcedure
  .use(requirePermission("pricing:read"))
  .input(z.object({
    clientId: z.number(),
  }))
  .output(z.object({
    client: z.object({
      clientId: z.number(),
      name: z.string(),

      // Pricing profile
      pricingProfileId: z.number().nullable(),
      pricingProfileName: z.string().nullable(),
      pricingRules: z.array(z.object({
        ruleId: z.number(),
        ruleName: z.string(),
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]),
        adjustmentValue: z.number(),
        conditions: z.record(z.any()),
      })),

      // COGS adjustment (client-level)
      cogsAdjustmentType: z.enum(["NONE", "PERCENTAGE", "FIXED_AMOUNT"]),
      cogsAdjustmentValue: z.number().nullable(),

      // Credit info
      creditLimit: z.number(),
      totalOwed: z.number(),
      availableCredit: z.number(),
      oldestDebtDays: z.number(),
      creditLimitSource: z.enum(["CALCULATED", "MANUAL"]),
    }),

    // User's max discount authority
    userMaxDiscount: z.number(), // Percentage
    canOverrideCredit: z.boolean(),
  }))
  .query(async ({ input, ctx }) => {
    // Implementation
  });

// Calculate order pricing with adjustments
pricing.calculateOrderPricing = protectedProcedure
  .use(requirePermission("orders:create"))
  .input(z.object({
    clientId: z.number(),
    lineItems: z.array(z.object({
      batchId: z.number(),
      quantity: z.number(),
      priceOverride: z.number().optional(), // Per-item override
    })),
    categoryAdjustments: z.array(z.object({
      category: z.string(),
      adjustmentMode: z.enum(["PERCENT", "FIXED"]),
      adjustmentValue: z.number(), // Negative for discount
    })).optional(),
    orderAdjustment: z.object({
      adjustmentMode: z.enum(["PERCENT", "FIXED"]),
      adjustmentValue: z.number(),
    }).optional(),
  }))
  .output(z.object({
    lineItems: z.array(z.object({
      batchId: z.number(),
      productName: z.string(),
      category: z.string(),
      quantity: z.number(),
      basePrice: z.number(), // Before adjustments
      profilePrice: z.number(), // After pricing profile
      categoryAdjustment: z.number(), // Category-level adjustment
      itemAdjustment: z.number(), // Item-level adjustment
      finalPrice: z.number(), // Final unit price
      lineTotal: z.number(), // quantity * finalPrice
      appliedRules: z.array(z.string()), // Names of applied rules
    })),
    subtotal: z.number(),
    categoryAdjustmentsTotal: z.number(),
    orderAdjustmentTotal: z.number(),
    orderTotal: z.number(),

    // Credit check
    creditCheck: z.object({
      availableCredit: z.number(),
      orderTotal: z.number(),
      exceedsCredit: z.boolean(),
      requiresOverride: z.boolean(),
    }),
  }))
  .query(async ({ input, ctx }) => {
    // Implementation in pricingService.calculateOrderPricing()
  });

// Apply price adjustment during order creation
pricing.applyAdjustment = protectedProcedure
  .use(requirePermission("pricing:adjust"))
  .input(z.object({
    orderId: z.number(),
    adjustmentType: z.enum(["ITEM", "CATEGORY", "ORDER"]),
    targetId: z.number().optional(), // productId for ITEM
    targetCategory: z.string().optional(), // for CATEGORY
    adjustmentMode: z.enum(["PERCENT", "FIXED"]),
    adjustmentValue: z.number(),
    reason: z.string().optional(),
  }))
  .output(z.object({
    adjustmentId: z.number(),
    newTotal: z.number(),
    creditCheck: z.object({
      exceedsCredit: z.boolean(),
      availableCredit: z.number(),
    }),
  }))
  .mutation(async ({ input, ctx }) => {
    // Validate user's discount authority
    // Log adjustment for audit
    // Recalculate order total
  });

// Credit limit check and override
pricing.checkCredit = protectedProcedure
  .use(requirePermission("orders:create"))
  .input(z.object({
    clientId: z.number(),
    orderTotal: z.number(),
  }))
  .output(z.object({
    allowed: z.boolean(),
    availableCredit: z.number(),
    shortfall: z.number(), // How much over limit
    requiresOverride: z.boolean(),
  }))
  .query(async ({ input }) => {
    // Implementation
  });

// Request credit override (admin approval)
pricing.requestCreditOverride = protectedProcedure
  .use(requirePermission("orders:create"))
  .input(z.object({
    orderId: z.number(),
    reason: z.string().min(10),
  }))
  .output(z.object({
    requested: z.boolean(),
    overrideId: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Create override request
    // Notify admin
  });

// Approve credit override (admin only)
pricing.approveCreditOverride = protectedProcedure
  .use(requirePermission("admin:credit-override"))
  .input(z.object({
    orderId: z.number(),
    approved: z.boolean(),
    note: z.string().optional(),
  }))
  .output(z.object({
    success: z.boolean(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Approve or reject override
    // Update order creditOverrideApproved
  });
```

**File:** `/home/user/TERP/server/services/pricingService.ts` (additions)

```typescript
export interface OrderPricingResult {
  lineItems: LineItemPricing[];
  subtotal: number;
  categoryAdjustmentsTotal: number;
  orderAdjustmentTotal: number;
  orderTotal: number;
  creditCheck: CreditCheckResult;
}

export async function calculateOrderPricing(params: {
  clientId: number;
  lineItems: Array<{
    batchId: number;
    quantity: number;
    priceOverride?: number;
  }>;
  categoryAdjustments?: Array<{
    category: string;
    adjustmentMode: "PERCENT" | "FIXED";
    adjustmentValue: number;
  }>;
  orderAdjustment?: {
    adjustmentMode: "PERCENT" | "FIXED";
    adjustmentValue: number;
  };
}): Promise<OrderPricingResult> {
  const db = await getDb();

  // 1. Get client pricing profile
  const client = await getClientById(params.clientId);
  const pricingProfile = client.pricingProfileId
    ? await getPricingProfileById(client.pricingProfileId)
    : null;

  // 2. Calculate each line item
  const lineItemResults: LineItemPricing[] = [];

  for (const item of params.lineItems) {
    // Get batch and product info
    const batch = await getBatchById(item.batchId);
    const product = await getProductById(batch.productId);

    // Calculate base price (COGS or base retail)
    const basePrice = calculateBasePrice(batch, client);

    // Apply pricing profile rules
    const profilePrice = pricingProfile
      ? applyPricingRules(basePrice, product, pricingProfile.rules)
      : basePrice;

    // Apply category adjustment if applicable
    const categoryAdj = params.categoryAdjustments?.find(
      ca => ca.category === product.category
    );
    const categoryAdjustedPrice = categoryAdj
      ? applyAdjustment(profilePrice, categoryAdj.adjustmentMode, categoryAdj.adjustmentValue)
      : profilePrice;

    // Apply item-level override if provided
    const finalPrice = item.priceOverride ?? categoryAdjustedPrice;

    lineItemResults.push({
      batchId: item.batchId,
      productName: product.nameCanonical,
      category: product.category,
      quantity: item.quantity,
      basePrice,
      profilePrice,
      categoryAdjustment: categoryAdjustedPrice - profilePrice,
      itemAdjustment: finalPrice - categoryAdjustedPrice,
      finalPrice,
      lineTotal: finalPrice * item.quantity,
      appliedRules: pricingProfile?.rules.map(r => r.name) || [],
    });
  }

  // 3. Calculate totals
  const subtotal = lineItemResults.reduce((sum, li) => sum + li.lineTotal, 0);
  const categoryAdjustmentsTotal = lineItemResults.reduce(
    (sum, li) => sum + (li.categoryAdjustment * li.quantity), 0
  );

  // 4. Apply order-level adjustment
  let orderTotal = subtotal;
  let orderAdjustmentTotal = 0;

  if (params.orderAdjustment) {
    orderAdjustmentTotal = params.orderAdjustment.adjustmentMode === "PERCENT"
      ? subtotal * (params.orderAdjustment.adjustmentValue / 100)
      : params.orderAdjustment.adjustmentValue;
    orderTotal = subtotal + orderAdjustmentTotal;
  }

  // 5. Check credit
  const creditCheck = await checkClientCredit(params.clientId, orderTotal);

  return {
    lineItems: lineItemResults,
    subtotal,
    categoryAdjustmentsTotal,
    orderAdjustmentTotal,
    orderTotal,
    creditCheck,
  };
}

export async function checkClientCredit(
  clientId: number,
  orderTotal: number
): Promise<CreditCheckResult> {
  const client = await getClientById(clientId);
  const availableCredit = (client.creditLimit || 0) - (client.totalOwed || 0);

  return {
    availableCredit,
    orderTotal,
    exceedsCredit: orderTotal > availableCredit,
    requiresOverride: orderTotal > availableCredit,
  };
}
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Clients | Read | Client pricing profile, credit limits |
| Pricing Rules | Read | Apply pricing rules to calculate prices |
| Pricing Profiles | Read | Get profile-level rule assignments |
| Orders | Write | Store credit override status |
| Order Price Adjustments | Write | Log all price adjustments |
| Users | Read | Check user's discount authority level |

## 5. UI/UX Specification

### 5.1 User Flow

```
[Sales rep creates order for client]
    → [API returns client pricing context with credit info]
    → [Inventory displayed with client-specific prices]
    → [Rep adds items to cart]
    → [Running total shows vs. available credit]
    → [Rep applies category discount]
    → [System recalculates with discount]
    → [If over credit: warning displayed]
    → [Rep requests credit override if needed]
    → [Admin approves/rejects override]
```

### 5.2 Wireframe Description

Not applicable - this is a backend API spec. See ENH-004 for frontend implementation.

### 5.3 Acceptance Criteria (API)

- [ ] `pricing.getClientContext` returns complete pricing and credit info
- [ ] `pricing.calculateOrderPricing` correctly applies all adjustment levels
- [ ] Category adjustments applied before item-level adjustments
- [ ] Credit check accurately reflects available credit
- [ ] Orders over credit limit blocked unless override approved
- [ ] All price adjustments logged to audit table
- [ ] User's discount authority enforced

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Client with no pricing profile | Use default markup (30%) |
| Client with no credit limit | Treat as unlimited (allow all orders) |
| Discount exceeds user authority | Return 403 error: "Discount exceeds your authority" |
| Negative price after discount | Floor at $0.01 per unit |
| Multiple category adjustments same category | Last adjustment wins |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Pricing calculation with all adjustment types
- [ ] Credit check calculation
- [ ] Discount authority enforcement
- [ ] Adjustment logging

### 7.2 Integration Tests

- [ ] Full order pricing flow
- [ ] Credit override workflow
- [ ] Audit trail completeness

### 7.3 E2E Tests

- [ ] Create order with pricing adjustments
- [ ] Credit override approval flow

## 8. Migration & Rollout

### 8.1 Data Migration

```sql
-- Create new price adjustments table
CREATE TABLE order_price_adjustments (...);

-- Add credit override columns to orders
ALTER TABLE orders ADD COLUMN creditOverrideApproved BOOLEAN DEFAULT FALSE;
ALTER TABLE orders ADD COLUMN creditOverrideBy INT;
ALTER TABLE orders ADD COLUMN creditOverrideReason TEXT;
```

### 8.2 Feature Flag

`FEATURE_PRICING_CREDIT_CHECK` - Enable for testing.

### 8.3 Rollback Plan

1. Disable feature flag
2. Revert to existing pricing calculation
3. Credit checks bypassed

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Orders blocked by credit | Track count | Logging |
| Override approval rate | Track | Admin analytics |
| Avg discount applied | < 10% | Order analytics |

## 10. Open Questions

- [ ] Should we integrate real-time credit updates from accounting system?
- [ ] Should discount authority be role-based or user-specific?

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
