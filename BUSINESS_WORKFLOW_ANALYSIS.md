# TERP Business Workflow Analysis

## Core Business Workflows

### Workflow 1: Vendor → Inventory (Purchasing Flow)

**Expected Flow:**
1. Create Purchase Order for vendor
2. Vendor delivers product
3. Create Intake Session
4. Link PO to Intake Session
5. Create Batches during intake
6. Batches link to Intake Session
7. Batches link to Vendor via Lots

**Current Status:**
- ✅ Batches exist (40)
- ✅ Batches → Vendor link works (inventory shows vendor names)
- ❌ Vendor → Batches reverse query missing
- ❌ Purchase Orders not seeded (0 POs)
- ❌ Intake Sessions not seeded (0 sessions)

**Issues to Fix:**
1. Seed purchase orders
2. Seed intake sessions
3. Link batches to intake sessions
4. Add vendor.getBatches() API endpoint
5. Update VendorProfilePage to display batches

---

### Workflow 2: Client → Order → Invoice → Payment (Sales Flow)

**Expected Flow:**
1. Client places order
2. Order is fulfilled
3. Invoice is generated from order
4. Client makes payment
5. Payment is applied to invoice
6. Invoice status updates (PARTIAL/PAID)

**Current Status:**
- ✅ Clients exist (20)
- ✅ Orders exist (50)
- ✅ Orders → Client link works (orders show client names)
- ❌ Invoices: 0 (should be 25 based on earlier seeding)
- ❌ Client → Orders reverse query fails (client profiles show $0 spent)
- ❌ Client transactions tab shows "No transactions found"

**Issues to Fix:**
1. **URGENT**: Verify why invoices disappeared (were they seeded?)
2. Re-seed invoices if missing
3. Verify invoice → order linkage
4. Add client.getOrders() API endpoint
5. Add client.getInvoices() API endpoint
6. Fix client total spent calculation
7. Update ClientProfilePage to display orders/invoices

---

### Workflow 3: Order → Fulfillment → Inventory Allocation

**Expected Flow:**
1. Order created with line items
2. Line items reference products/batches
3. Inventory is reserved
4. Order is packed (batches allocated)
5. Order is shipped (inventory deducted)

**Current Status:**
- ✅ Orders exist (50)
- ❓ Order line items unknown
- ❓ Inventory reservations unknown
- ❓ Fulfillment status tracking unknown

**Need to Test:**
1. Do orders have line items?
2. Do line items link to products/batches?
3. Does inventory show "reserved" quantities?
4. Can we view order details with products?

---

### Workflow 4: Invoice → Payment Application

**Expected Flow:**
1. Invoice created with amount due
2. Payment received
3. Payment applied to invoice(s)
4. Invoice amountPaid updated
5. Invoice amountDue updated
6. Invoice status updated

**Current Status:**
- ❌ Invoices: 0
- ❓ Payments: 15 (seeded but no invoices to apply to?)
- ❌ AR shows $143,934.90 (calculated from WHERE?)

**Issues to Fix:**
1. Verify invoice seeding worked
2. Verify payments link to invoices
3. Test payment application logic
4. Verify AR calculation source

---

### Workflow 5: Batch → Product → Pricing

**Expected Flow:**
1. Batch created with product reference
2. Product has base pricing
3. Client has pricing profile
4. Pricing rules apply
5. Order line items use calculated price

**Current Status:**
- ✅ Batches exist (40)
- ✅ Products exist (30)
- ✅ Batches → Product link works
- ❓ Pricing profiles unknown
- ❓ Pricing rules unknown
- ❓ Order pricing logic unknown

**Need to Test:**
1. Do products have prices?
2. Do clients have pricing profiles?
3. Do orders use correct pricing?

---

## Systematic Testing Plan

### Phase 1: Verify Data Existence
Run direct database queries to confirm what data actually exists:
- [ ] Count invoices in database
- [ ] Count order line items
- [ ] Count payments
- [ ] Count purchase orders
- [ ] Count intake sessions
- [ ] Verify foreign key relationships

### Phase 2: Test Forward Relationships (Working)
- [x] Order → Client (WORKS)
- [x] Batch → Vendor (WORKS)
- [ ] Invoice → Client
- [ ] Payment → Invoice
- [ ] Order Line Item → Product
- [ ] Batch → Product

### Phase 3: Test Reverse Relationships (Broken)
- [ ] Client → Orders
- [ ] Client → Invoices
- [ ] Vendor → Batches
- [ ] Vendor → Purchase Orders
- [ ] Invoice → Payments
- [ ] Product → Batches

### Phase 4: Test Aggregations
- [ ] Client total spent
- [ ] Client total profit
- [ ] Vendor total purchases
- [ ] Product total sold
- [ ] AR total
- [ ] AP total

### Phase 5: Test Business Logic
- [ ] Order fulfillment updates inventory
- [ ] Payment application updates invoice
- [ ] Invoice generation from order
- [ ] Pricing calculation
- [ ] Credit limit checking

---

## Root Cause Hypothesis (Refined)

Based on analysis so far:

**Theory: Data was seeded but then cleared/lost**

Evidence:
- Earlier we saw "195 records created" after seeding
- Now invoices show 0
- AR calculation shows $143,934.90 (from where?)
- Orders still exist (50)

**Possible causes:**
1. Database was reset/migrated after seeding
2. Seeding script has transaction rollback issue
3. Different database being queried vs seeded
4. Soft delete marking all records as deleted

**Next Steps:**
1. Run database count query in production console
2. Check if data exists but is filtered out
3. Re-seed if data is truly missing
4. Fix any transaction/commit issues in seeder
