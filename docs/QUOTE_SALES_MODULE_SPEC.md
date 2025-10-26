# Quote/Sales Module - Comprehensive Specification

**Created:** October 25, 2025  
**Status:** 📋 Specification & Design Phase  
**Module Type:** Quote-to-Sale Workflow with Inventory Integration

---

## 🎯 Executive Summary

The Quote/Sales Module transforms the Sales Sheet foundation into a complete quote-to-sale workflow system. It enables users to create customizable quotes with client-specific pricing, mark items as samples, track credit limits in real-time, and seamlessly convert quotes to sales with automatic invoice generation and accounting integration.

**Key Innovation:** Unified interface for both quoting and selling, with smart credit monitoring and flexible payment terms including partial payments and cash tracking.

---

## 📊 Module Overview

### Core Capabilities

1. **Quote Creation & Management**
   - Reuse Sales Sheet structure (inventory browser + preview)
   - Customize product/strain names for customer display (without changing system data)
   - Mark items as samples with automatic tracking
   - Save quotes to client profile
   - Share quotes (clipboard, PDF, image)

2. **Credit Limit Integration**
   - Real-time credit limit display when client selected
   - Show: Credit Limit, Current Exposure, Available Credit, Utilization %
   - Visual warnings when over limit (amber warning, red critical)
   - Block sale creation if credit exceeded (with override permission)

3. **Quote-to-Sale Conversion**
   - One-click conversion from quote to sale
   - Automatic invoice generation
   - Payment terms selection (NET_7, NET_15, NET_30, COD, PARTIAL, CONSIGNMENT)
   - Partial payment support with cash recording
   - Sample items excluded from invoice totals

4. **Accounting Integration**
   - Create invoice in accounting system
   - Record payment if cash/partial
   - Update AR (Accounts Receivable)
   - Reduce inventory quantities
   - Track sample inventory separately
   - Update client credit exposure

---

## 🏗️ System Architecture

### Database Schema

#### New Tables

**1. quotes**
```sql
CREATE TABLE quotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  
  -- Quote items with customization
  items JSON NOT NULL, -- [{ itemId, displayName, quantity, basePrice, retailPrice, overridePrice, isSample }]
  
  -- Totals (excluding samples)
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  
  -- Sample tracking
  sample_items JSON, -- [{ itemId, displayName, quantity }]
  sample_count INT DEFAULT 0,
  
  -- Status workflow
  status ENUM('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'CONVERTED', 'EXPIRED') DEFAULT 'DRAFT',
  
  -- Metadata
  notes TEXT,
  valid_until DATE,
  
  -- Conversion tracking
  converted_to_sale_id INT REFERENCES sales(id),
  converted_at TIMESTAMP,
  
  -- Audit
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX idx_client_id (client_id),
  INDEX idx_quote_number (quote_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

**2. sales**
```sql
CREATE TABLE sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  quote_id INT REFERENCES quotes(id),
  
  -- Sale items (from quote or direct)
  items JSON NOT NULL, -- [{ itemId, displayName, quantity, price, isSample }]
  
  -- Totals (excluding samples)
  subtotal DECIMAL(15,2) NOT NULL,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL,
  
  -- Payment tracking
  payment_terms ENUM('NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT') NOT NULL,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  amount_due DECIMAL(15,2) NOT NULL,
  cash_payment DECIMAL(15,2) DEFAULT 0, -- Cash paid at time of sale
  
  -- Sample tracking
  sample_items JSON,
  sample_count INT DEFAULT 0,
  
  -- Status
  status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED') DEFAULT 'PENDING',
  
  -- Invoice reference
  invoice_id INT REFERENCES invoices(id),
  
  -- Fulfillment
  is_fulfilled BOOLEAN DEFAULT FALSE,
  fulfilled_at TIMESTAMP,
  
  -- Audit
  notes TEXT,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX idx_client_id (client_id),
  INDEX idx_sale_number (sale_number),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
);
```

**3. sample_inventory_log**
```sql
CREATE TABLE sample_inventory_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL REFERENCES batches(id),
  client_id INT NOT NULL REFERENCES clients(id),
  
  -- Transaction details
  transaction_type ENUM('QUOTE', 'SALE') NOT NULL,
  transaction_id INT NOT NULL, -- quote_id or sale_id
  
  quantity DECIMAL(15,4) NOT NULL,
  display_name VARCHAR(255), -- Custom name shown to customer
  
  -- Audit
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_batch_id (batch_id),
  INDEX idx_client_id (client_id),
  INDEX idx_transaction (transaction_type, transaction_id)
);
```

#### Schema Updates

**Update batches table:**
```sql
ALTER TABLE batches 
ADD COLUMN sample_qty DECIMAL(15,4) DEFAULT 0 AFTER quarantineQty;
```

**Update clients table (already has credit fields):**
- No changes needed - credit limit system already exists

---

## 🎨 UX/UI Design

### Design Principles

1. **Familiar Foundation** - Reuse Sales Sheet layout (60/40 split, inventory browser + preview)
2. **Progressive Disclosure** - Show credit info prominently but don't overwhelm
3. **Clear Visual Hierarchy** - Distinguish quotes from sales with color coding
4. **Smart Defaults** - Auto-populate based on context (payment terms from client profile)
5. **Inline Editing** - Edit display names directly in preview panel
6. **Visual Feedback** - Immediate credit limit warnings, sample badges, payment indicators

### Page Structure

**Route:** `/quotes-sales`

**Layout:**
```
┌─────────────────────────────────────────────────────────────────┐
│ Header: Quote & Sales Creator                                   │
│ [Client Selector ▼] [Mode: Quote/Sale Toggle]                  │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 💳 Credit Alert (if applicable)                             │ │
│ │ Credit Limit: $50,000 | Used: $38,500 | Available: $11,500 │ │
│ │ Utilization: 77% [████████░░] ⚠️ Approaching Limit         │ │
│ └─────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ ┌──────────────────────┬────────────────────────────────────┐  │
│ │ Inventory Browser    │ Quote/Sale Preview                 │  │
│ │ (60%)                │ (40%)                              │  │
│ │                      │                                    │  │
│ │ [Search...]          │ Quote #Q-2025-001 [Edit]          │  │
│ │                      │ Client: Acme Corp                  │  │
│ │ ☐ Item 1             │                                    │  │
│ │ ☐ Item 2             │ ┌────────────────────────────────┐ │  │
│ │ ☐ Item 3             │ │ 1. Blue Dream (Premium Flower) │ │  │
│ │                      │ │    [Edit Name] [Sample Toggle] │ │  │
│ │ [Select All]         │ │    Qty: 10 | Price: $150       │ │  │
│ │ [Add Selected]       │ │    [Override] [Remove]         │ │  │
│ │                      │ ├────────────────────────────────┤ │  │
│ │                      │ │ 2. OG Kush Sample 🎁          │ │  │
│ │                      │ │    Qty: 2 | FREE               │ │  │
│ │                      │ └────────────────────────────────┘ │  │
│ │                      │                                    │  │
│ │                      │ Subtotal: $1,500                   │  │
│ │                      │ Samples: 2 items (not charged)     │  │
│ │                      │ Total: $1,500                      │  │
│ │                      │                                    │  │
│ │                      │ [Save as Quote] [Create Sale]      │  │
│ └──────────────────────┴────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. QuoteSalesCreatorPage
**Location:** `client/src/pages/QuoteSalesCreatorPage.tsx`

**State Management:**
- Selected client
- Mode (quote vs sale)
- Selected items with customizations
- Credit limit data
- Current quote/sale being edited

**Features:**
- Client selector with credit limit fetch
- Mode toggle (Quote/Sale)
- Credit alert banner (conditional)
- Two-panel layout (reuse Sales Sheet structure)

#### 2. CreditAlertBanner
**Location:** `client/src/components/quotes/CreditAlertBanner.tsx`

**Props:**
- clientId
- currentQuoteTotal (to calculate new exposure)

**Display Logic:**
```typescript
const newExposure = currentExposure + quoteTotal;
const newUtilization = (newExposure / creditLimit) * 100;

if (newUtilization >= 100) {
  // Red alert - Over limit
  variant = "destructive";
  message = "⛔ Credit limit exceeded! Cannot create sale.";
} else if (newUtilization >= 80) {
  // Amber warning - Approaching limit
  variant = "warning";
  message = "⚠️ Approaching credit limit";
} else if (newUtilization >= 60) {
  // Info - Moderate usage
  variant = "default";
  message = "ℹ️ Credit usage moderate";
}
```

**Visual Design:**
- Progress bar showing utilization
- Color-coded: Green (<60%), Amber (60-80%), Red (>80%)
- Expandable details (click to show breakdown)

#### 3. QuoteSalePreview
**Location:** `client/src/components/quotes/QuoteSalePreview.tsx`

**Extends:** SalesSheetPreview component

**Additional Features:**
- Display name editing (inline)
- Sample toggle per item
- Payment terms selector (for sales)
- Cash payment input (for COD/PARTIAL)
- Two action buttons: "Save as Quote" | "Create Sale"

**Item Display:**
```tsx
<div className="item-card">
  <div className="flex items-center gap-2">
    <input 
      value={item.displayName} 
      onChange={handleNameChange}
      className="font-medium"
    />
    {item.isSample && <Badge variant="secondary">🎁 Sample</Badge>}
  </div>
  
  <div className="flex items-center gap-2">
    <span>Qty: {item.quantity}</span>
    {!item.isSample && (
      <span className="font-bold">${item.price}</span>
    )}
    {item.isSample && (
      <span className="text-muted-foreground">FREE</span>
    )}
  </div>
  
  <div className="flex gap-2">
    <Button size="sm" variant="ghost" onClick={toggleSample}>
      {item.isSample ? "Remove Sample" : "Mark as Sample"}
    </Button>
    <Button size="sm" variant="ghost" onClick={editName}>
      Edit Name
    </Button>
    <Button size="sm" variant="ghost" onClick={remove}>
      Remove
    </Button>
  </div>
</div>
```

#### 4. PaymentTermsSelector
**Location:** `client/src/components/quotes/PaymentTermsSelector.tsx`

**Options:**
- NET_7 (7 days)
- NET_15 (15 days)
- NET_30 (30 days)
- COD (Cash on Delivery) → Shows cash input
- PARTIAL (Partial Payment) → Shows cash input + remaining due
- CONSIGNMENT (Pay after sold)

**Conditional Fields:**
```tsx
{paymentTerms === 'COD' && (
  <Input 
    type="number" 
    label="Cash Payment" 
    value={cashPayment}
    onChange={setCashPayment}
  />
)}

{paymentTerms === 'PARTIAL' && (
  <>
    <Input 
      type="number" 
      label="Cash Payment Now" 
      value={cashPayment}
      onChange={setCashPayment}
    />
    <div className="text-sm text-muted-foreground">
      Remaining Due: ${(total - cashPayment).toFixed(2)}
    </div>
  </>
)}
```

---

## 🔄 User Workflows

### Workflow 1: Create Quote

```
1. User navigates to /quotes-sales
2. Select client from dropdown
   → System loads client credit limit
   → Display credit alert banner if needed
3. Browse inventory (left panel)
4. Select items to add
5. Customize in preview panel (right):
   - Edit display names (e.g., "Blue Dream" → "Premium Flower")
   - Mark items as samples
   - Override prices
   - Drag to reorder
6. Review totals (samples excluded)
7. Click "Save as Quote"
   → System generates quote number (Q-2025-XXX)
   → Saves to database
   → Adds to client profile
8. Share quote:
   - Copy to clipboard
   - Export as PDF
   - Export as image
```

### Workflow 2: Create Sale from Quote

```
1. User opens existing quote from client profile
2. Click "Convert to Sale"
3. System pre-fills sale form with quote data
4. User selects payment terms:
   - NET_7/15/30: No cash input
   - COD: Enter full cash amount
   - PARTIAL: Enter partial cash amount
   - CONSIGNMENT: No cash input
5. System validates credit limit:
   - If over limit → Show error, block sale
   - If under limit → Allow proceed
6. Click "Create Sale"
7. System executes transaction:
   a. Create sale record
   b. Generate invoice
   c. Record cash payment (if applicable)
   d. Reduce inventory quantities:
      - Regular items: Reduce onHandQty
      - Sample items: Reduce sample_qty
   e. Update client credit exposure
   f. Create accounting entries:
      - DR: Accounts Receivable (amount_due)
      - DR: Cash (cash_payment)
      - CR: Revenue (total_amount)
   g. Update quote status to CONVERTED
8. Display success message with invoice number
9. Option to print invoice or email to client
```

### Workflow 3: Create Direct Sale (No Quote)

```
1. User navigates to /quotes-sales
2. Toggle mode to "Sale"
3. Select client
4. Add items (same as quote workflow)
5. Select payment terms
6. Enter cash payment (if applicable)
7. System validates credit limit
8. Click "Create Sale"
9. System executes transaction (same as Workflow 2, step 7)
```

---

## 🔧 Technical Implementation

### Backend (tRPC Endpoints)

**quotes router:**
```typescript
quotes: {
  // CRUD
  create: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      items: z.array(z.object({
        itemId: z.number(),
        displayName: z.string(),
        quantity: z.number(),
        basePrice: z.number(),
        retailPrice: z.number(),
        overridePrice: z.number().optional(),
        isSample: z.boolean(),
      })),
      notes: z.string().optional(),
      validUntil: z.date().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Generate quote number
      // Calculate totals (exclude samples)
      // Save to database
      // Return quote with ID
    }),
  
  getById: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .query(async ({ input }) => {
      // Fetch quote with items
    }),
  
  getByClient: protectedProcedure
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      // Fetch all quotes for client
    }),
  
  update: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      items: z.array(/* ... */),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Update quote
    }),
  
  delete: protectedProcedure
    .input(z.object({ quoteId: z.number() }))
    .mutation(async ({ input }) => {
      // Soft delete or hard delete
    }),
  
  // Status management
  updateStatus: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED']),
    }))
    .mutation(async ({ input }) => {
      // Update status
    }),
  
  // Export
  export: protectedProcedure
    .input(z.object({
      quoteId: z.number(),
      format: z.enum(['pdf', 'clipboard', 'image']),
    }))
    .mutation(async ({ input }) => {
      // Generate export
    }),
}
```

**sales router:**
```typescript
sales: {
  // Create sale (from quote or direct)
  create: protectedProcedure
    .input(z.object({
      clientId: z.number(),
      quoteId: z.number().optional(),
      items: z.array(/* ... */),
      paymentTerms: z.enum(['NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT']),
      cashPayment: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // TRANSACTION START
      
      // 1. Validate credit limit
      const creditData = await getCreditLimit(input.clientId);
      const newExposure = creditData.currentExposure + calculateTotal(input.items);
      if (newExposure > creditData.creditLimit) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Credit limit exceeded',
        });
      }
      
      // 2. Create sale record
      const sale = await db.insert(sales).values({
        saleNumber: generateSaleNumber(),
        clientId: input.clientId,
        quoteId: input.quoteId,
        items: input.items,
        subtotal: calculateSubtotal(input.items),
        totalAmount: calculateTotal(input.items),
        paymentTerms: input.paymentTerms,
        cashPayment: input.cashPayment || 0,
        amountPaid: input.cashPayment || 0,
        amountDue: calculateTotal(input.items) - (input.cashPayment || 0),
        createdBy: ctx.user.id,
      });
      
      // 3. Generate invoice
      const invoice = await db.insert(invoices).values({
        invoiceNumber: generateInvoiceNumber(),
        customerId: input.clientId,
        invoiceDate: new Date(),
        dueDate: calculateDueDate(input.paymentTerms),
        totalAmount: calculateTotal(input.items),
        amountPaid: input.cashPayment || 0,
        amountDue: calculateTotal(input.items) - (input.cashPayment || 0),
        status: input.cashPayment >= calculateTotal(input.items) ? 'PAID' : 'SENT',
        paymentTerms: input.paymentTerms,
        referenceType: 'SALE',
        referenceId: sale.id,
        createdBy: ctx.user.id,
      });
      
      // 4. Update sale with invoice ID
      await db.update(sales)
        .set({ invoiceId: invoice.id })
        .where(eq(sales.id, sale.id));
      
      // 5. Reduce inventory
      for (const item of input.items) {
        if (item.isSample) {
          // Reduce sample quantity
          await db.update(batches)
            .set({ sample_qty: sql`sample_qty - ${item.quantity}` })
            .where(eq(batches.id, item.itemId));
          
          // Log sample transaction
          await db.insert(sampleInventoryLog).values({
            batchId: item.itemId,
            clientId: input.clientId,
            transactionType: 'SALE',
            transactionId: sale.id,
            quantity: item.quantity,
            displayName: item.displayName,
            createdBy: ctx.user.id,
          });
        } else {
          // Reduce regular inventory
          await db.update(batches)
            .set({ onHandQty: sql`onHandQty - ${item.quantity}` })
            .where(eq(batches.id, item.itemId));
        }
      }
      
      // 6. Record payment if cash
      if (input.cashPayment && input.cashPayment > 0) {
        await db.insert(payments).values({
          paymentNumber: generatePaymentNumber(),
          paymentDate: new Date(),
          amount: input.cashPayment,
          paymentType: 'RECEIVED',
          paymentMethod: 'CASH',
          customerId: input.clientId,
          invoiceId: invoice.id,
          createdBy: ctx.user.id,
        });
      }
      
      // 7. Create accounting entries
      // DR: Accounts Receivable
      await createLedgerEntry({
        accountId: AR_ACCOUNT_ID,
        debit: calculateTotal(input.items) - (input.cashPayment || 0),
        description: `Sale ${sale.saleNumber} - ${clientName}`,
        referenceType: 'SALE',
        referenceId: sale.id,
      });
      
      // DR: Cash (if cash payment)
      if (input.cashPayment && input.cashPayment > 0) {
        await createLedgerEntry({
          accountId: CASH_ACCOUNT_ID,
          debit: input.cashPayment,
          description: `Cash payment for Sale ${sale.saleNumber}`,
          referenceType: 'PAYMENT',
          referenceId: payment.id,
        });
      }
      
      // CR: Revenue
      await createLedgerEntry({
        accountId: REVENUE_ACCOUNT_ID,
        credit: calculateTotal(input.items),
        description: `Sale ${sale.saleNumber} - ${clientName}`,
        referenceType: 'SALE',
        referenceId: sale.id,
      });
      
      // 8. Update client credit exposure
      await db.update(clientCreditLimits)
        .set({ 
          currentExposure: sql`current_exposure + ${calculateTotal(input.items) - (input.cashPayment || 0)}`,
          utilizationPercent: sql`(current_exposure / credit_limit) * 100`,
        })
        .where(eq(clientCreditLimits.clientId, input.clientId));
      
      // 9. Update quote status if from quote
      if (input.quoteId) {
        await db.update(quotes)
          .set({ 
            status: 'CONVERTED',
            convertedToSaleId: sale.id,
            convertedAt: new Date(),
          })
          .where(eq(quotes.id, input.quoteId));
      }
      
      // TRANSACTION COMMIT
      
      return { 
        success: true, 
        saleId: sale.id,
        invoiceId: invoice.id,
        saleNumber: sale.saleNumber,
        invoiceNumber: invoice.invoiceNumber,
      };
    }),
  
  // Other endpoints
  getById: protectedProcedure.input(/* ... */).query(/* ... */),
  getByClient: protectedProcedure.input(/* ... */).query(/* ... */),
  updateStatus: protectedProcedure.input(/* ... */).mutation(/* ... */),
}
```

### Frontend Components

**Reusable from Sales Sheet:**
- InventoryBrowser (no changes needed)
- Basic layout structure
- Export functionality (clipboard, PDF, image)

**New Components:**
1. `QuoteSalesCreatorPage.tsx` - Main page
2. `CreditAlertBanner.tsx` - Credit limit display
3. `QuoteSalePreview.tsx` - Extended preview with samples & display names
4. `PaymentTermsSelector.tsx` - Payment terms selection
5. `DisplayNameEditor.tsx` - Inline name editing
6. `SampleToggle.tsx` - Mark item as sample

---

## 📈 Cross-Module Implications

### 1. Inventory Module
**Impact:** Sample tracking

**Changes Needed:**
- Add `sample_qty` column to batches table
- Display sample quantity in inventory view
- Add filter for "Has Samples"
- Show sample allocation in batch detail drawer

**Migration:**
```sql
ALTER TABLE batches 
ADD COLUMN sample_qty DECIMAL(15,4) DEFAULT 0 AFTER quarantineQty;
```

### 2. Accounting Module
**Impact:** Invoice generation, payment recording, ledger entries

**Integration Points:**
- Create invoice when sale created
- Record payment if cash/partial
- Create ledger entries (AR, Cash, Revenue)
- Link sale to invoice via referenceType/referenceId

**No Schema Changes:** Existing invoice and payment tables support this

### 3. Credit Intelligence System
**Impact:** Real-time credit exposure updates

**Integration Points:**
- Fetch credit limit when client selected
- Calculate new exposure including quote total
- Update exposure when sale created
- Trigger recalculation if needed

**No Schema Changes:** Existing credit tables support this

### 4. Client Management
**Impact:** Quote/sale history display

**Integration Points:**
- Add "Quotes" tab to ClientProfilePage
- Add "Sales" tab to ClientProfilePage
- Display quote/sale history with status
- Quick actions (view, convert, duplicate)

**UI Changes:**
- Update ClientProfilePage tabs (add Quotes, Sales)
- Create QuotesTab component
- Create SalesTab component

---

## 🎨 UX Enhancements

### 1. Smart Defaults
- Payment terms default to client's preferred terms (from client profile)
- Display names default to product name but editable
- Tax rate from client's location (if configured)

### 2. Keyboard Shortcuts
- `Ctrl+S` - Save quote
- `Ctrl+Enter` - Create sale
- `Ctrl+E` - Edit display name
- `Ctrl+M` - Mark as sample

### 3. Visual Feedback
- Sample items: Green badge with 🎁 icon
- Edited display names: Italic text with edit icon
- Credit warnings: Color-coded progress bar
- Payment status: Badge (Paid, Partial, Due)

### 4. Mobile Optimization
- Stack panels vertically on mobile
- Collapsible credit alert banner
- Swipe to mark as sample
- Bottom sheet for payment terms

---

## 🧪 Testing Strategy

### Unit Tests
- Quote calculation (exclude samples)
- Credit limit validation
- Payment term calculations
- Display name sanitization

### Integration Tests
- Quote to sale conversion
- Inventory reduction (regular + samples)
- Invoice generation
- Accounting entry creation
- Credit exposure update

### E2E Tests
1. Create quote → Save → Share
2. Create quote → Convert to sale (COD) → Verify inventory reduced
3. Create quote → Convert to sale (PARTIAL) → Verify payment recorded
4. Create sale (over credit limit) → Verify blocked
5. Create sale with samples → Verify sample inventory reduced

---

## 📋 Implementation Phases

### Phase 1: Database & Backend (8-10 hours)
- Create quotes, sales, sample_inventory_log tables
- Add sample_qty to batches table
- Implement quotes tRPC router (7 endpoints)
- Implement sales tRPC router (4 endpoints)
- Write quote/sale calculation logic
- Write inventory reduction logic
- Write accounting integration logic

### Phase 2: Quote Creation UI (10-12 hours)
- Build QuoteSalesCreatorPage
- Build CreditAlertBanner
- Build QuoteSalePreview (extend SalesSheetPreview)
- Build DisplayNameEditor
- Build SampleToggle
- Integrate with existing InventoryBrowser
- Add export functionality (reuse from Sales Sheet)

### Phase 3: Sale Creation & Payment (8-10 hours)
- Build PaymentTermsSelector
- Build cash payment input
- Implement credit limit validation
- Implement sale creation flow
- Add success/error handling
- Add invoice generation trigger

### Phase 4: Client Profile Integration (6-8 hours)
- Add Quotes tab to ClientProfilePage
- Add Sales tab to ClientProfilePage
- Build QuotesTab component (list, view, convert)
- Build SalesTab component (list, view, invoice)
- Add quick actions (duplicate, email, print)

### Phase 5: Testing & Polish (6-8 hours)
- Write unit tests
- Write integration tests
- E2E testing
- Fix bugs
- Performance optimization
- Documentation updates

**Total Estimated Effort:** 38-48 hours

---

## 🚀 Success Criteria

A phase is complete when:

✅ All features are production-ready (no placeholders)  
✅ TypeScript validation passes (0 errors)  
✅ All navigation and routes work  
✅ Credit limit validation prevents over-limit sales  
✅ Sample items tracked separately from regular inventory  
✅ Invoices generated correctly with proper accounting entries  
✅ Cash payments recorded in accounting system  
✅ Quote-to-sale conversion works seamlessly  
✅ Display name customization doesn't affect system data  
✅ Responsive design works (mobile/tablet/desktop)  
✅ **CHANGELOG.md updated**  
✅ **PROJECT_CONTEXT.md updated**  
✅ **Module docs updated**  
✅ **Changes committed and pushed to GitHub**  

---

## 📚 References

- Sales Sheet Module: `docs/SALES_SHEET_IMPLEMENTATION_STATUS.md`
- Credit Intelligence: `client/src/components/credit/CreditLimitWidget.tsx`
- Accounting Integration: `server/accountingDb.ts`, `server/arApDb.ts`
- Design System: `docs/MASTER_DEVELOPMENT_PROMPT.md`
- Development Protocols: `docs/DEVELOPMENT_PROTOCOLS.md`

---

## ✅ Pre-Implementation Checklist

Before starting implementation:

- [ ] Review this spec with user and get approval
- [ ] Confirm database schema design
- [ ] Confirm UX/UI flows
- [ ] Verify no conflicts with existing modules
- [ ] Ensure all cross-module implications understood
- [ ] Read MASTER_DEVELOPMENT_PROMPT.md
- [ ] Read DEVELOPMENT_PROTOCOLS.md
- [ ] Understand Sales Sheet implementation for reuse patterns

---

**Status:** 📋 Awaiting User Approval

**Next Step:** User reviews spec and provides feedback/approval before implementation begins.

