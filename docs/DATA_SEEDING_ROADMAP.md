# Data Seeding Roadmap

**Last Updated:** 2025-11-18  
**Status:** In Progress  
**Completion:** 2/9 tasks complete (22%)

---

## Overview

This roadmap outlines a systematic approach to populating the TERP database with realistic, operationally coherent data. Tasks are organized into three parallel paths that can be executed independently or sequentially based on priorities.

**Completed:**

- ✅ **DATA-002**: Comments & Dashboard (170 comments, 40 mentions, 32 dashboard configs)
- ✅ **DATA-003**: Pricing Tables (8 defaults, 5 profiles, 8 rules)

**In Progress:**

- 🔄 **DATA-004**: Orders & Line Items (20-30 orders)

**Planned:**

- ⏳ **DATA-005**: Order Fulfillment (shipments, tracking)
- ⏳ **DATA-006**: Batches (20-30 batches for inventory)
- ⏳ **DATA-007**: Inventory Movements (intake, transfers, sales)
- ⏳ **DATA-008**: Client Contacts & Interactions
- ⏳ **DATA-009**: Client Price Alerts (requires DATA-006)

---

## Seeding Paths

### Path A: Order-Focused (Sales Workflows)

**Priority:** HIGH  
**Business Value:** Enables end-to-end sales workflow testing  
**Dependencies:** Products, Clients (already exist)

1. ✅ **DATA-002**: Comments & Dashboard
2. ✅ **DATA-003**: Pricing Tables
3. 🔄 **DATA-004**: Orders & Line Items
4. ⏳ **DATA-005**: Order Fulfillment

**Enables:**

- Order creation and management
- Invoice generation
- Payment processing
- Sales reporting
- Revenue analytics

---

### Path B: Inventory-Focused (Inventory Management)

**Priority:** MEDIUM  
**Business Value:** Enables inventory tracking and management  
**Dependencies:** Products, Lots (need to verify lots exist)

1. ⏳ **DATA-006**: Batches
2. ⏳ **DATA-007**: Inventory Movements

**Enables:**

- Batch tracking
- Inventory levels
- Stock movements
- COGS calculations
- Inventory reports

---

### Path C: Client-Focused (CRM Enhancement)

**Priority:** MEDIUM  
**Business Value:** Enhances CRM and client relationship features  
**Dependencies:** Clients (already exist), Batches (for price alerts)

1. ✅ **DATA-002**: Comments (includes client comments)
2. ⏳ **DATA-008**: Client Contacts & Interactions
3. ⏳ **DATA-009**: Client Price Alerts (requires DATA-006)

**Enables:**

- Client contact management
- Interaction history
- Price monitoring
- Client communications
- Relationship tracking

---

## Task Details

### ✅ DATA-002: Seed Comments & Dashboard Tables

**Status:** Complete (2025-11-18)  
**Time Spent:** 1.5 hours  
**Prompt:** `docs/prompts/DATA-002.md`

**Deliverables:**

- 170 comments (90 CalendarEvent, 80 Client)
- 40 comment mentions
- 4 dashboard preferences
- 20 widget layouts
- 8 KPI configs

**Impact:** Enables commenting and dashboard features for testing

---

### ✅ DATA-003: Seed Pricing Tables

**Status:** Complete (2025-11-18)  
**Time Spent:** 1 hour  
**Prompt:** `docs/prompts/DATA-003.md`

**Deliverables:**

- 8 pricing defaults (category margins)
- 5 pricing profiles (Retail, Wholesale, VIP, Medical)
- 8 pricing rules (bulk discounts, markups)

**Impact:** Enables pricing calculations and customer tier management

---

### 🔄 DATA-004: Seed Orders & Line Items

**Status:** In Progress  
**Estimate:** 1.5-2 hours  
**Priority:** P1 (High)  
**Prompt:** `docs/prompts/DATA-004.md`

**Objective:**
Seed 20-30 realistic orders with line items to enable sales workflow testing.

**Deliverables:**

- 20-30 orders across different statuses
- 50-100 order line items
- Realistic order totals and dates
- Mix of order types (retail, wholesale)
- Orders assigned to existing clients

**Tables:**

- `orders` - Main order records
- `orderLineItems` - Products on each order
- `orderStatusHistory` - Status change tracking

**Dependencies:**

- ✅ Products exist (100+)
- ✅ Clients exist (68)
- ✅ Pricing profiles exist (5)

**Impact:**

- Enables order management testing
- Enables invoice generation
- Enables sales reporting
- Provides data for revenue analytics

---

### ⏳ DATA-005: Seed Order Fulfillment

**Status:** Planned  
**Estimate:** 1-1.5 hours  
**Priority:** P2 (Medium)  
**Depends On:** DATA-004

**Objective:**
Seed fulfillment data for orders created in DATA-004.

**Deliverables:**

- 15-20 shipments
- Tracking numbers
- Delivery dates
- Fulfillment status updates

**Tables:**

- `shipments`
- `shipmentLineItems`
- `orderStatusHistory` (updates)

**Impact:**

- Enables fulfillment workflow testing
- Enables shipping tracking
- Completes order lifecycle

---

### ⏳ DATA-006: Seed Batches

**Status:** Planned  
**Estimate:** 2-2.5 hours  
**Priority:** P2 (Medium)  
**Depends On:** Products, Lots (need verification)

**Objective:**
Seed 20-30 batches for existing products to enable inventory management.

**Deliverables:**

- 20-30 batches
- Batch codes and SKUs
- Inventory quantities
- Batch statuses (LIVE, ON_HOLD, etc.)
- COGS data

**Tables:**

- `batches`
- `batchStatusHistory` (optional)

**Complexity:**

- HIGH - Batches require productId, lotId, and complex inventory fields
- Need to verify lots exist or create them
- Need to handle batch codes/SKUs uniqueness

**Impact:**

- Enables inventory management
- Enables batch tracking
- Enables price alerts (DATA-009)
- Enables inventory movements (DATA-007)

---

### ⏳ DATA-007: Seed Inventory Movements

**Status:** Planned  
**Estimate:** 1.5-2 hours  
**Priority:** P2 (Medium)  
**Depends On:** DATA-006

**Objective:**
Seed inventory movement records to track product flow.

**Deliverables:**

- 30-50 inventory movements
- Movement types (INTAKE, TRANSFER, SALE, ADJUSTMENT)
- Quantity changes
- Reasons and notes

**Tables:**

- `inventoryMovements`

**Impact:**

- Enables inventory tracking
- Enables audit trail
- Enables inventory reports

---

### ⏳ DATA-008: Seed Client Contacts & Interactions

**Status:** Planned  
**Estimate:** 1-1.5 hours  
**Priority:** P3 (Low)  
**Depends On:** Clients (already exist)

**Objective:**
Seed client contact information and interaction history.

**Deliverables:**

- 50-100 client contacts
- 100-200 client interactions
- Contact roles and details
- Interaction types and notes

**Tables:**

- `clientContacts` (if exists)
- `clientInteractions` (if exists)
- Need to verify table names

**Impact:**

- Enhances CRM functionality
- Enables contact management
- Enables interaction tracking

---

### ⏳ DATA-009: Seed Client Price Alerts

**Status:** Planned  
**Estimate:** 0.5-1 hour  
**Priority:** P3 (Low)  
**Depends On:** DATA-006 (batches)

**Objective:**
Seed price alert configurations for clients monitoring specific batches.

**Deliverables:**

- 10-20 price alerts
- Alert thresholds
- Client-batch associations

**Tables:**

- `client_price_alerts`

**Impact:**

- Completes pricing feature set
- Enables price monitoring
- Enhances client service

---

## Execution Strategy

### Recommended Order

**Phase 1: Core Sales (Week 1)**

1. 🔄 DATA-004: Orders & Line Items
2. ⏳ DATA-005: Order Fulfillment

**Phase 2: Inventory (Week 2)** 3. ⏳ DATA-006: Batches 4. ⏳ DATA-007: Inventory Movements

**Phase 3: CRM Enhancement (Week 3)** 5. ⏳ DATA-008: Client Contacts & Interactions 6. ⏳ DATA-009: Client Price Alerts

### Parallel Execution

Tasks can be executed in parallel if multiple agents are available:

**Group A (Independent):**

- DATA-004 + DATA-005 (Orders path)

**Group B (Independent):**

- DATA-008 (Client contacts - no dependencies)

**Group C (Depends on DATA-006):**

- DATA-006 → DATA-007 (Inventory path)
- DATA-006 → DATA-009 (Price alerts)

---

## Success Metrics

### Data Coverage

- ✅ Comments: 170 records
- ✅ Pricing: 21 records (8 defaults + 5 profiles + 8 rules)
- 🔄 Orders: Target 20-30 orders
- ⏳ Batches: Target 20-30 batches
- ⏳ Inventory Movements: Target 30-50 movements
- ⏳ Client Contacts: Target 50-100 contacts

### Feature Enablement

- ✅ Commenting system
- ✅ Dashboard widgets
- ✅ Pricing calculations
- 🔄 Order management
- ⏳ Inventory tracking
- ⏳ CRM features

### Testing Readiness

- ✅ Can test comments and mentions
- ✅ Can test dashboard customization
- ✅ Can test pricing tiers and rules
- 🔄 Can test order creation and management
- ⏳ Can test inventory operations
- ⏳ Can test full sales workflow

---

## Notes

### Schema Discoveries

- Comments use `commentable_type`/`commentable_id` (not `entity_type`/`entity_id`)
- Pricing uses `pricing_profiles`/`pricing_rules` (not `priceTiers`/`productPricing`)
- All prompts updated to reflect actual schema (2025-11-18)

### Skipped Items

- Client price alerts in DATA-003 (no batches available)
- Will be completed in DATA-009 after DATA-006

### Future Enhancements

- Product seeding (if needed - 100+ already exist)
- User seeding (if needed - 4 already exist)
- Lot seeding (required for DATA-006)
- Additional entity types for comments (Orders, Batches, etc.)

---

**Last Updated:** 2025-11-18  
**Next Task:** DATA-004 (Orders & Line Items)  
**Estimated Completion:** 2025-11-25 (all 9 tasks)
