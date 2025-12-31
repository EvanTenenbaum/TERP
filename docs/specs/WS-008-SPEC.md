# Specification: WS-008 - Low Stock & Needs-Based Alerts (VIP Portal Integration)

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 20h  
**Module:** Inventory/VIP Portal  
**Dependencies:** VIP Portal (existing)  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

The business needs to proactively source inventory before running out. Currently, there's no automated way to track low stock levels or communicate needs to VIP vendors. The solution must serve two purposes:

1. **Internal:** Alert staff when inventory drops below target levels
2. **External:** Automatically populate "Needs" on the VIP Portal for vendors to see

This dual-purpose feature drives both operational efficiency and vendor engagement.

## 2. User Stories

1. **As a manager**, I want to set target stock levels for products, so that I'm alerted when inventory runs low.

2. **As a staff member**, I want to see a dashboard of low-stock items, so that I can prioritize sourcing.

3. **As a VIP vendor**, I want to see what products the business needs, so that I can offer relevant inventory.

4. **As a manager**, I want low-stock items to automatically appear on the VIP Portal, so that vendors can proactively reach out.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Configure target stock levels per product/category | Must Have |
| FR-02 | Automatic low-stock detection when quantity < target | Must Have |
| FR-03 | Low-stock dashboard/widget for internal users | Must Have |
| FR-04 | Automatic "Needs" creation on VIP Portal | Must Have |
| FR-05 | Manual "Need" creation for items not in inventory | Must Have |
| FR-06 | Email/notification alerts for critical low stock | Should Have |
| FR-07 | Configurable alert thresholds (warning vs. critical) | Should Have |
| FR-08 | Bulk target level configuration | Should Have |
| FR-09 | Historical low-stock reporting | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Low stock = quantity < target level | 5 units < 10 target = low stock |
| BR-02 | Critical low stock = quantity < 25% of target | 2 units < 2.5 (25% of 10) = critical |
| BR-03 | VIP Portal "Need" created when low stock detected | Automatic sync |
| BR-04 | "Need" removed when stock replenished above target | Auto-cleanup |
| BR-05 | Manual "Needs" not auto-removed | User controls lifecycle |
| BR-06 | Target levels can be set globally, per category, or per product | Hierarchy: product > category > global |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- Stock level configuration table
CREATE TABLE stock_level_targets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT REFERENCES products(id),
  category_id INT REFERENCES categories(id),
  target_quantity INT NOT NULL,
  warning_threshold_percent INT DEFAULT 50, -- Alert at 50% of target
  critical_threshold_percent INT DEFAULT 25, -- Critical at 25% of target
  auto_create_vip_need BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP,
  -- Either product_id OR category_id, not both (or both NULL for global)
  CONSTRAINT chk_target_scope CHECK (
    (product_id IS NOT NULL AND category_id IS NULL) OR
    (product_id IS NULL AND category_id IS NOT NULL) OR
    (product_id IS NULL AND category_id IS NULL)
  )
);

-- VIP Portal needs table (may already exist, ensure these fields)
CREATE TABLE IF NOT EXISTS vip_portal_needs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT REFERENCES products(id),
  product_name VARCHAR(255), -- For custom needs not in product catalog
  category_id INT REFERENCES categories(id),
  quantity_needed INT,
  priority ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL') DEFAULT 'MEDIUM',
  source ENUM('MANUAL', 'AUTO_LOW_STOCK') DEFAULT 'MANUAL',
  source_batch_id INT REFERENCES batches(id),
  notes TEXT,
  is_fulfilled BOOLEAN DEFAULT FALSE,
  fulfilled_at TIMESTAMP,
  fulfilled_by INT REFERENCES users(id),
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  INDEX idx_active_needs (is_fulfilled, priority)
);

-- Low stock alerts log
CREATE TABLE low_stock_alerts (
  id INT PRIMARY KEY AUTO_INCREMENT,
  product_id INT NOT NULL REFERENCES products(id),
  batch_id INT REFERENCES batches(id),
  current_quantity INT NOT NULL,
  target_quantity INT NOT NULL,
  alert_level ENUM('WARNING', 'CRITICAL') NOT NULL,
  vip_need_created BOOLEAN DEFAULT FALSE,
  vip_need_id INT REFERENCES vip_portal_needs(id),
  notified_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_unresolved (resolved_at, alert_level)
);
```

### 4.2 API Contracts

```typescript
// Configure stock level targets
stockLevels.setTarget = adminProcedure
  .input(z.object({
    productId: z.number().optional(),
    categoryId: z.number().optional(),
    targetQuantity: z.number().positive(),
    warningThresholdPercent: z.number().min(1).max(99).default(50),
    criticalThresholdPercent: z.number().min(1).max(99).default(25),
    autoCreateVipNeed: z.boolean().default(true)
  }))
  .output(z.object({
    targetId: z.number(),
    success: z.boolean()
  }))
  .mutation(async ({ input }) => {
    // Create or update stock level target
  });

// Get all stock level targets
stockLevels.getTargets = adminProcedure
  .input(z.object({
    productId: z.number().optional(),
    categoryId: z.number().optional()
  }))
  .output(z.array(z.object({
    id: z.number(),
    productId: z.number().nullable(),
    productName: z.string().nullable(),
    categoryId: z.number().nullable(),
    categoryName: z.string().nullable(),
    targetQuantity: z.number(),
    currentQuantity: z.number(),
    status: z.enum(['OK', 'WARNING', 'CRITICAL']),
    warningThreshold: z.number(),
    criticalThreshold: z.number()
  })))
  .query(async ({ input }) => {
    // Return targets with current stock status
  });

// Get low stock items (dashboard)
stockLevels.getLowStockItems = adminProcedure
  .input(z.object({
    alertLevel: z.enum(['WARNING', 'CRITICAL', 'ALL']).default('ALL'),
    limit: z.number().default(50)
  }))
  .output(z.array(z.object({
    productId: z.number(),
    productName: z.string(),
    categoryName: z.string(),
    currentQuantity: z.number(),
    targetQuantity: z.number(),
    percentOfTarget: z.number(),
    alertLevel: z.enum(['WARNING', 'CRITICAL']),
    vipNeedCreated: z.boolean(),
    daysSinceLowStock: z.number()
  })))
  .query(async ({ input }) => {
    // Return items below target level
  });

// Manually create VIP Portal need
vipPortal.createNeed = adminProcedure
  .input(z.object({
    productId: z.number().optional(),
    productName: z.string().optional(), // For custom needs
    categoryId: z.number().optional(),
    quantityNeeded: z.number().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    notes: z.string().optional(),
    expiresAt: z.date().optional()
  }))
  .output(z.object({
    needId: z.number(),
    success: z.boolean()
  }))
  .mutation(async ({ input, ctx }) => {
    // Create manual need
  });

// Get VIP Portal needs (for vendors)
vipPortal.getNeeds = publicProcedure // Or vendor-authenticated
  .input(z.object({
    categoryId: z.number().optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional()
  }))
  .output(z.array(z.object({
    id: z.number(),
    productName: z.string(),
    categoryName: z.string(),
    quantityNeeded: z.number().nullable(),
    priority: z.string(),
    notes: z.string().nullable(),
    createdAt: z.date()
  })))
  .query(async ({ input }) => {
    // Return active needs for VIP Portal display
  });

// Mark need as fulfilled
vipPortal.fulfillNeed = adminProcedure
  .input(z.object({
    needId: z.number(),
    notes: z.string().optional()
  }))
  .output(z.object({ success: z.boolean() }))
  .mutation(async ({ input, ctx }) => {
    // Mark need as fulfilled
  });
```

### 4.3 Background Job: Stock Level Monitor

```typescript
// Scheduled job to check stock levels and create alerts/needs
async function checkStockLevels() {
  // 1. Get all products with stock level targets
  // 2. For each product:
  //    a. Calculate current quantity
  //    b. Compare to target
  //    c. If below target:
  //       - Create/update low_stock_alert
  //       - If auto_create_vip_need and not already created:
  //         - Create vip_portal_need
  //       - If critical and not notified:
  //         - Send notification
  //    d. If above target and has active alert:
  //       - Resolve alert
  //       - Remove auto-created VIP need
}

// Run every hour or on inventory change
```

### 4.4 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Inventory | Read/Subscribe | Monitor quantity changes |
| VIP Portal | Write | Create/remove needs |
| Notifications | Write | Send low-stock alerts |
| Dashboard | Read | Display low-stock widget |
| Products | Read | Get product/category info |

## 5. UI/UX Specification

### 5.1 User Flow: Configure Stock Levels

```
[Navigate to Inventory Settings]
    → [Stock Level Targets Tab]
    → [Add Target: Product or Category]
    → [Set Target Quantity and Thresholds]
    → [Enable/Disable VIP Portal Sync]
    → [Save]
```

### 5.2 Wireframe: Stock Level Configuration

```
┌─────────────────────────────────────────────────────────────┐
│  📊 Stock Level Targets                        [+ Add Target]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Scope    │ Target │ Warning │ Critical │ VIP Sync │   │
│  ├──────────┼────────┼─────────┼──────────┼──────────┤   │
│  │ Blue Dream│ 100 oz │ 50 oz   │ 25 oz    │ ✅       │   │
│  │ OG Kush   │ 75 oz  │ 37 oz   │ 19 oz    │ ✅       │   │
│  │ [Indica]  │ 50 oz  │ 25 oz   │ 12 oz    │ ✅       │   │
│  │ [Global]  │ 25 oz  │ 12 oz   │ 6 oz     │ ❌       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Wireframe: Low Stock Dashboard Widget

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️ Low Stock Alerts (5)                           [View All]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  🔴 Blue Dream - 8 oz (Target: 100) - CRITICAL    [Restock] │
│  🔴 OG Kush - 12 oz (Target: 75) - CRITICAL       [Restock] │
│  🟡 Sour Diesel - 30 oz (Target: 50) - WARNING    [Restock] │
│  🟡 Purple Haze - 15 oz (Target: 25) - WARNING    [Restock] │
│  🟡 Girl Scout - 20 oz (Target: 30) - WARNING     [Restock] │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Wireframe: VIP Portal Needs View (Vendor Side)

```
┌─────────────────────────────────────────────────────────────┐
│  🛒 What We're Looking For                                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔴 HIGH PRIORITY                                    │   │
│  │                                                     │   │
│  │ • Blue Dream (Indica) - Any quantity               │   │
│  │ • OG Kush (Hybrid) - Any quantity                  │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🟡 MEDIUM PRIORITY                                  │   │
│  │                                                     │   │
│  │ • Sour Diesel (Sativa) - Looking for 20+ oz        │   │
│  │ • Any premium Indica strains                       │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Have something we need? [Contact Us]                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Acceptance Criteria (UI)

- [ ] Stock level targets configurable per product/category/global
- [ ] Low stock widget shows items sorted by severity
- [ ] Color coding: red for critical, yellow for warning
- [ ] VIP Portal needs update within 1 hour of stock change
- [ ] Manual needs can be created without product reference
- [ ] Fulfilled needs removed from VIP Portal view

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Product with no target set | Use category target, then global, else no alert |
| Multiple targets (product + category) | Product-level takes precedence |
| Stock goes to 0 | Critical alert, high-priority VIP need |
| Stock replenished above target | Auto-resolve alert, remove auto-created need |
| Manual need for same product as auto-need | Both can exist, manual not auto-removed |
| VIP Portal sync disabled | No need created, only internal alert |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Target threshold calculations correct
- [ ] Alert level determination (warning vs. critical)
- [ ] Target hierarchy resolution (product > category > global)
- [ ] Auto-need creation logic

### 7.2 Integration Tests

- [ ] Stock change triggers alert check
- [ ] VIP Portal need created when stock drops
- [ ] VIP Portal need removed when stock replenished
- [ ] Notifications sent for critical alerts

### 7.3 E2E Tests

- [ ] Configure target → stock drops → alert appears → VIP need created
- [ ] Restock → alert resolved → auto-need removed
- [ ] Manual need creation and fulfillment

## 8. Migration & Rollout

### 8.1 Data Migration

No migration required. New tables created empty. Users configure targets post-deployment.

### 8.2 Feature Flag

`FEATURE_STOCK_LEVEL_ALERTS` - Enable for testing before VIP Portal sync.

### 8.3 Rollback Plan

1. Disable feature flag
2. Alerts stop generating
3. Existing VIP needs preserved
4. Manual needs continue to work

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Stockouts prevented | 50% reduction | Zero-stock incidents |
| VIP vendor engagement | 20% increase | Need responses |
| Time to restock | 30% reduction | Alert → restock time |

## 10. Open Questions

- [x] Should targets be quantity or days-of-supply? **Quantity for MVP**
- [x] Should VIP needs show exact quantities? **Optional, can be "Any quantity"**
- [ ] Should we support seasonal target adjustments? **Future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
