# Quote/Sales Module - Refined Parallel Development Specification

**Created:** October 25, 2025  
**Based On:** Expert QA Review - Simplified and Strengthened Approach  
**Philosophy:** 95% functionality, 65% complexity, brilliant UX

---

## 🎯 Project Overview

**Goal:** Implement unified Orders system (quotes + sales) with Hybrid Smart COGS and Brilliant Progressive Disclosure UX

**Architecture:** 3 independent modules developed in parallel

**Timeline:** 14-18 hours wall time (22-30 hours total work)

**Key Simplifications:**
- ✅ Unified `orders` table (not separate quotes/sales)
- ✅ Client-level COGS adjustments (not complex rules engine)
- ✅ Single settings page (not three separate pages)
- ✅ Estimated COGS for consignment (not pending workflow)

---

## 📋 Shared Foundation (FROZEN)

### Database Schema

```sql
-- ============================================================================
-- ORDERS TABLE (Unified Quotes + Sales)
-- ============================================================================

CREATE TABLE orders (
  id INT PRIMARY KEY AUTO_INCREMENT,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  order_type ENUM('QUOTE', 'SALE') NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  
  -- Items (same structure for both quotes and sales)
  items JSON NOT NULL,
  
  -- Financials
  subtotal DECIMAL(15,2) NOT NULL,
  tax DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  total_cogs DECIMAL(15,2),
  total_margin DECIMAL(15,2),
  avg_margin_percent DECIMAL(5,2),
  
  -- Quote-specific fields (NULL for sales)
  valid_until DATE,
  quote_status ENUM('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED'),
  
  -- Sale-specific fields (NULL for quotes)
  payment_terms ENUM('NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT'),
  cash_payment DECIMAL(15,2) DEFAULT 0,
  due_date DATE,
  sale_status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED'),
  invoice_id INT REFERENCES invoices(id),
  
  -- Conversion tracking
  converted_from_order_id INT REFERENCES orders(id),
  converted_at TIMESTAMP,
  
  -- Metadata
  notes TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX idx_client_id (client_id),
  INDEX idx_order_type (order_type),
  INDEX idx_quote_status (quote_status),
  INDEX idx_sale_status (sale_status)
);

-- ============================================================================
-- SAMPLE INVENTORY LOG
-- ============================================================================

CREATE TABLE sample_inventory_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL REFERENCES batches(id),
  order_id INT REFERENCES orders(id),
  
  quantity DECIMAL(15,4) NOT NULL,
  action ENUM('ALLOCATED', 'RELEASED', 'CONSUMED') NOT NULL,
  
  notes TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  
  INDEX idx_batch_id (batch_id),
  INDEX idx_order_id (order_id)
);

-- ============================================================================
-- COGS RULES (Optional - Simple Version)
-- ============================================================================

CREATE TABLE cogs_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Simple condition (not complex engine)
  condition_field ENUM('QUANTITY', 'TOTAL_VALUE', 'CLIENT_TIER', 'PAYMENT_TERMS'),
  condition_operator ENUM('GT', 'GTE', 'LT', 'LTE', 'EQ'),
  condition_value DECIMAL(15,4),
  
  -- Adjustment
  adjustment_type ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'USE_MIN', 'USE_MAX'),
  adjustment_value DECIMAL(10,4),
  
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  
  INDEX idx_priority (priority),
  INDEX idx_is_active (is_active)
);

-- ============================================================================
-- SCHEMA MODIFICATIONS
-- ============================================================================

-- Add to batches table
ALTER TABLE batches ADD COLUMN sample_qty DECIMAL(15,4) DEFAULT 0 AFTER onHandQty;

-- Add to clients table
ALTER TABLE clients ADD COLUMN cogs_adjustment_type ENUM('NONE', 'PERCENTAGE', 'FIXED_AMOUNT') DEFAULT 'NONE';
ALTER TABLE clients ADD COLUMN cogs_adjustment_value DECIMAL(10,4) DEFAULT 0;
ALTER TABLE clients ADD COLUMN auto_defer_consignment BOOLEAN DEFAULT FALSE;
```

### Shared TypeScript Types (FROZEN)

```typescript
// ============================================================================
// ORDER TYPES (Unified)
// ============================================================================

interface Order {
  id: number;
  orderNumber: string;
  orderType: 'QUOTE' | 'SALE';
  clientId: number;
  items: OrderItem[];
  
  // Financials
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalCogs?: number;
  totalMargin?: number;
  avgMarginPercent?: number;
  
  // Quote-specific
  validUntil?: string;
  quoteStatus?: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  
  // Sale-specific
  paymentTerms?: 'NET_7' | 'NET_15' | 'NET_30' | 'COD' | 'PARTIAL' | 'CONSIGNMENT';
  cashPayment?: number;
  dueDate?: string;
  saleStatus?: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  invoiceId?: number;
  
  // Conversion
  convertedFromOrderId?: number;
  convertedAt?: string;
  
  // Metadata
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

interface OrderItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  
  // COGS (always present, never pending)
  unitCogs: number;
  cogsMode: 'FIXED' | 'RANGE';
  cogsSource: 'FIXED' | 'MIDPOINT' | 'CLIENT_ADJUSTMENT' | 'RULE' | 'MANUAL';
  appliedRule?: string;
  
  // Profit
  unitMargin: number;
  marginPercent: number;
  
  // Totals
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
  
  // Overrides
  overridePrice?: number;
  overrideCogs?: number;
}

// ============================================================================
// COGS TYPES
// ============================================================================

interface CogsCalculationInput {
  batch: {
    id: number;
    cogsMode: 'FIXED' | 'RANGE';
    unitCogs?: string;
    unitCogsMin?: string;
    unitCogsMax?: string;
  };
  client: {
    id: number;
    cogsAdjustmentType: 'NONE' | 'PERCENTAGE' | 'FIXED_AMOUNT';
    cogsAdjustmentValue: number;
  };
  context: {
    quantity: number;
    salePrice: number;
    paymentTerms?: string;
  };
}

interface CogsCalculationResult {
  unitCogs: number;
  cogsSource: 'FIXED' | 'MIDPOINT' | 'CLIENT_ADJUSTMENT' | 'RULE' | 'MANUAL';
  appliedRule?: string;
  unitMargin: number;
  marginPercent: number;
}

interface CogsRule {
  id: number;
  name: string;
  description?: string;
  conditionField: 'QUANTITY' | 'TOTAL_VALUE' | 'CLIENT_TIER' | 'PAYMENT_TERMS';
  conditionOperator: 'GT' | 'GTE' | 'LT' | 'LTE' | 'EQ';
  conditionValue: number;
  adjustmentType: 'PERCENTAGE' | 'FIXED_AMOUNT' | 'USE_MIN' | 'USE_MAX';
  adjustmentValue: number;
  priority: number;
  isActive: boolean;
}

// ============================================================================
// INPUT TYPES
// ============================================================================

interface CreateOrderInput {
  orderType: 'QUOTE' | 'SALE';
  clientId: number;
  items: {
    batchId: number;
    displayName?: string;
    quantity: number;
    unitPrice: number;
    isSample: boolean;
    overridePrice?: number;
    overrideCogs?: number;
  }[];
  
  // Quote-specific
  validUntil?: string;
  
  // Sale-specific
  paymentTerms?: 'NET_7' | 'NET_15' | 'NET_30' | 'COD' | 'PARTIAL' | 'CONSIGNMENT';
  cashPayment?: number;
  
  notes?: string;
}

interface ConvertQuoteToSaleInput {
  quoteId: number;
  paymentTerms: 'NET_7' | 'NET_15' | 'NET_30' | 'COD' | 'PARTIAL' | 'CONSIGNMENT';
  cashPayment?: number;
  notes?: string;
}
```

### tRPC Endpoints (FROZEN - Contract)

```typescript
orders: {
  // Create
  create: (input: CreateOrderInput) => Order,
  
  // Read
  getById: (id: number) => Order,
  getByClient: (clientId: number, type?: 'QUOTE' | 'SALE') => Order[],
  getAll: (filters?: { type?: 'QUOTE' | 'SALE', status?: string }) => Order[],
  
  // Update
  update: (id: number, input: Partial<CreateOrderInput>) => Order,
  
  // Delete
  delete: (id: number) => void,
  
  // Convert
  convertToSale: (input: ConvertQuoteToSaleInput) => Order,
  
  // Export
  export: (id: number, format: 'pdf' | 'clipboard' | 'image') => string,
}

cogs: {
  // Calculate
  calculate: (input: CogsCalculationInput) => CogsCalculationResult,
  
  // Rules (optional)
  getRules: () => CogsRule[],
  createRule: (input: Omit<CogsRule, 'id'>) => CogsRule,
  updateRule: (id: number, input: Partial<CogsRule>) => CogsRule,
  deleteRule: (id: number) => void,
  testRule: (ruleId: number, testInput: CogsCalculationInput) => CogsCalculationResult,
}
```

---

## 🔧 Module A: Orders Backend (Core System)

### Responsibility
Build unified orders system with COGS calculation and inventory management

### Deliverables

**1. `/server/ordersDb.ts`**
- `createOrder(input)` - Create quote or sale
- `updateOrder(id, input)` - Update order
- `deleteOrder(id)` - Delete/cancel order
- `getOrderById(id)` - Get single order
- `getOrdersByClient(clientId, type?)` - Get client orders
- `getAllOrders(filters?)` - Get all orders with filters
- `convertQuoteToSale(input)` - Convert quote to sale
- `exportOrder(id, format)` - Export order

**2. `/server/cogsCalculator.ts`**
- `calculateCogs(input)` - Main COGS calculation
- `applyClientAdjustment(baseCogs, client)` - Apply client adjustment
- `applyCogsRule(baseCogs, rule, context)` - Apply optional rule
- `getBaseCogs(batch)` - Get base COGS from batch

**3. `/server/cogsRulesDb.ts`** (Optional)
- `createCogsRule(input)` - Create rule
- `updateCogsRule(id, input)` - Update rule
- `deleteCogsRule(id)` - Delete rule
- `getCogsRules()` - Get all active rules
- `testCogsRule(ruleId, testInput)` - Test rule

**4. Update `/server/routers.ts`**
- Add `orders` router with all endpoints
- Update `cogs` router with rules endpoints

**5. Update `/drizzle/schema.ts`**
- Add `orders` table
- Add `sample_inventory_log` table
- Add `cogs_rules` table (optional)
- Modify `batches` table (add sample_qty)
- Modify `clients` table (add COGS fields)

### Key Implementation Logic

**COGS Calculation (Simplified):**
```typescript
export function calculateCogs(input: CogsCalculationInput): CogsCalculationResult {
  const { batch, client, context } = input;
  
  // 1. Get base COGS
  let baseCogs: number;
  if (batch.cogsMode === 'FIXED') {
    baseCogs = parseFloat(batch.unitCogs || '0');
  } else {
    // RANGE mode - use midpoint
    const min = parseFloat(batch.unitCogsMin || '0');
    const max = parseFloat(batch.unitCogsMax || '0');
    baseCogs = (min + max) / 2;
  }
  
  let finalCogs = baseCogs;
  let cogsSource: CogsCalculationResult['cogsSource'] = 
    batch.cogsMode === 'FIXED' ? 'FIXED' : 'MIDPOINT';
  
  // 2. Apply client adjustment
  if (client.cogsAdjustmentType === 'PERCENTAGE') {
    finalCogs = baseCogs * (1 - client.cogsAdjustmentValue / 100);
    cogsSource = 'CLIENT_ADJUSTMENT';
  } else if (client.cogsAdjustmentType === 'FIXED_AMOUNT') {
    finalCogs = baseCogs - client.cogsAdjustmentValue;
    cogsSource = 'CLIENT_ADJUSTMENT';
  }
  
  // 3. Ensure within range (if RANGE mode)
  if (batch.cogsMode === 'RANGE') {
    const min = parseFloat(batch.unitCogsMin || '0');
    const max = parseFloat(batch.unitCogsMax || '0');
    finalCogs = Math.max(min, Math.min(max, finalCogs));
  }
  
  // 4. Calculate margin
  const unitMargin = context.salePrice - finalCogs;
  const marginPercent = (unitMargin / context.salePrice) * 100;
  
  return {
    unitCogs: finalCogs,
    cogsSource,
    unitMargin,
    marginPercent,
  };
}
```

**Order Creation with Inventory Reduction:**
```typescript
export async function createOrder(input: CreateOrderInput) {
  const db = await getDb();
  
  return await db.transaction(async (tx) => {
    // 1. Calculate COGS for all items
    const client = await tx.select().from(clients).where(eq(clients.id, input.clientId)).get();
    const processedItems: OrderItem[] = [];
    
    for (const item of input.items) {
      const batch = await tx.select().from(batches).where(eq(batches.id, item.batchId)).get();
      
      // Calculate COGS
      const cogsResult = calculateCogs({
        batch,
        client,
        context: {
          quantity: item.quantity,
          salePrice: item.unitPrice,
          paymentTerms: input.paymentTerms,
        },
      });
      
      processedItems.push({
        batchId: item.batchId,
        displayName: item.displayName || batch.sku,
        originalName: batch.sku,
        quantity: item.quantity,
        unitPrice: item.overridePrice || item.unitPrice,
        isSample: item.isSample,
        unitCogs: item.overrideCogs || cogsResult.unitCogs,
        cogsMode: batch.cogsMode,
        cogsSource: item.overrideCogs ? 'MANUAL' : cogsResult.cogsSource,
        unitMargin: cogsResult.unitMargin,
        marginPercent: cogsResult.marginPercent,
        lineTotal: item.quantity * (item.overridePrice || item.unitPrice),
        lineCogs: item.quantity * (item.overrideCogs || cogsResult.unitCogs),
        lineMargin: item.quantity * cogsResult.unitMargin,
        overridePrice: item.overridePrice,
        overrideCogs: item.overrideCogs,
      });
    }
    
    // 2. Calculate totals
    const subtotal = processedItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCogs = processedItems.reduce((sum, item) => sum + item.lineCogs, 0);
    const totalMargin = subtotal - totalCogs;
    const avgMarginPercent = (totalMargin / subtotal) * 100;
    
    // 3. Generate order number
    const orderNumber = input.orderType === 'QUOTE' 
      ? `Q-${Date.now()}`
      : `S-${Date.now()}`;
    
    // 4. Create order
    const [order] = await tx.insert(orders).values({
      orderNumber,
      orderType: input.orderType,
      clientId: input.clientId,
      items: JSON.stringify(processedItems),
      subtotal,
      tax: 0,
      discount: 0,
      total: subtotal,
      totalCogs,
      totalMargin,
      avgMarginPercent,
      validUntil: input.validUntil,
      quoteStatus: input.orderType === 'QUOTE' ? 'DRAFT' : null,
      paymentTerms: input.paymentTerms,
      cashPayment: input.cashPayment || 0,
      dueDate: input.paymentTerms ? calculateDueDate(input.paymentTerms) : null,
      saleStatus: input.orderType === 'SALE' ? 'PENDING' : null,
      notes: input.notes,
      createdBy: 1, // TODO: Get from context
    });
    
    // 5. If SALE, reduce inventory
    if (input.orderType === 'SALE') {
      for (const item of processedItems) {
        if (item.isSample) {
          // Reduce sample_qty
          await tx.update(batches)
            .set({ sampleQty: sql`sample_qty - ${item.quantity}` })
            .where(eq(batches.id, item.batchId));
          
          // Log sample consumption
          await tx.insert(sampleInventoryLog).values({
            batchId: item.batchId,
            orderId: order.id,
            quantity: item.quantity,
            action: 'CONSUMED',
            createdBy: 1,
          });
        } else {
          // Reduce onHandQty
          await tx.update(batches)
            .set({ onHandQty: sql`onHandQty - ${item.quantity}` })
            .where(eq(batches.id, item.batchId));
        }
      }
      
      // Create invoice
      // TODO: Integrate with accounting
      
      // Record cash payment
      if (input.cashPayment && input.cashPayment > 0) {
        // TODO: Record in accounting
      }
      
      // Update credit exposure
      // TODO: Update credit intelligence
    }
    
    return order;
  });
}
```

### Testing Checklist
- ✅ Create quote
- ✅ Create sale
- ✅ Convert quote to sale
- ✅ COGS calculation (FIXED mode)
- ✅ COGS calculation (RANGE mode)
- ✅ Client COGS adjustment
- ✅ Inventory reduction (regular items)
- ✅ Inventory reduction (samples)
- ✅ Credit limit validation
- ✅ Export functionality

---

## 🎨 Module B: Order Creator UI (Frontend)

### Responsibility
Build unified order creator with brilliant progressive disclosure UX

### Deliverables

**1. `/client/src/pages/OrderCreatorPage.tsx`**
- Main page with 60/40 split layout
- Client selector with credit display
- Order type toggle (Quote/Sale)
- Integration of InventoryBrowser and OrderPreview

**2. `/client/src/components/orders/OrderPreview.tsx`**
- Item list with progressive disclosure
- Totals panel (expandable)
- Payment terms selector (Sale mode)
- Action buttons (Save Quote / Create Sale)

**3. `/client/src/components/orders/OrderItemCard.tsx`**
- Item display with display name editing
- Sample toggle
- Price override
- COGS display with 3-level progressive disclosure
- Margin indicator (color-coded)
- Gear icon for advanced options

**4. `/client/src/components/orders/CogsAdjustModal.tsx`**
- Simple COGS adjustment
- Slider for RANGE mode
- Real-time margin calculation
- "Use Suggestion" button

**5. `/client/src/components/orders/CreditAlertBanner.tsx`**
- Contextual credit display
- Color-coded (green/amber/red)
- Progress bar
- Expandable details

**6. `/client/src/components/orders/PaymentTermsSelector.tsx`**
- Radio group for payment terms
- Conditional cash input (COD/PARTIAL)
- Due date display

**7. `/client/src/pages/OrdersListPage.tsx`**
- Unified list of quotes and sales
- Filter by type/status
- Quick actions
- Status indicators

### Key UI Patterns

**Progressive Disclosure (3 Levels):**

```tsx
// Level 1: Default view (simple)
<div className="item-card">
  <div className="item-name">{item.displayName}</div>
  <div className="item-details">
    Qty: {item.quantity} @ ${item.unitPrice}
  </div>
  <div className={`margin ${getMarginColor(item.marginPercent)}`}>
    Margin: ${item.unitMargin} ({item.marginPercent}%) 💚
  </div>
</div>

// Level 2: Hover state (contextual info)
<Tooltip>
  <TooltipTrigger>
    <span className={marginColor}>
      Margin: ${item.unitMargin} ({item.marginPercent}%)
    </span>
  </TooltipTrigger>
  <TooltipContent>
    <div>COGS: ${item.unitCogs} ({item.cogsSource})</div>
    {item.appliedRule && <div>Rule: {item.appliedRule}</div>}
  </TooltipContent>
</Tooltip>

// Level 3: Expanded state (power user)
{isExpanded && (
  <div className="cogs-details">
    <div>COGS: ${item.unitCogs}</div>
    <div>Source: {item.cogsSource}</div>
    {item.cogsMode === 'RANGE' && (
      <Button onClick={openCogsModal}>Adjust COGS</Button>
    )}
  </div>
)}
```

**Margin Color Coding:**
```tsx
function getMarginColor(marginPercent: number): string {
  if (marginPercent >= 70) return 'text-green-600';
  if (marginPercent >= 50) return 'text-green-500';
  if (marginPercent >= 30) return 'text-amber-500';
  if (marginPercent >= 15) return 'text-amber-600';
  return 'text-red-600';
}
```

### Testing Checklist
- ✅ Client selection with credit display
- ✅ Order type toggle (Quote/Sale)
- ✅ Add items from inventory
- ✅ Display name editing
- ✅ Sample toggle
- ✅ Price override
- ✅ COGS progressive disclosure
- ✅ COGS adjustment modal
- ✅ Margin color indicators
- ✅ Payment terms selection
- ✅ Create quote
- ✅ Create sale
- ✅ Convert quote to sale
- ✅ Export functionality

---

## ⚙️ Module C: COGS Settings UI

### Responsibility
Build unified COGS settings page with client adjustments and optional rules

### Deliverables

**1. `/client/src/pages/CogsSettingsPage.tsx`**
- Single page with tabs
- General tab (behavior settings)
- Client Adjustments tab (bulk view)
- Rules tab (optional, simple)

**2. `/client/src/components/cogs/CogsGeneralSettings.tsx`**
- Default behavior selector
- Profit protection settings
- Visibility settings
- Card-based layout

**3. `/client/src/components/cogs/CogsRuleBuilder.tsx`** (Optional)
- Simple rule builder
- Single condition (not complex)
- Adjustment type selector
- Test rule functionality

**4. Update `/client/src/components/pricing/PricingConfigTab.tsx`**
- Add COGS adjustment section
- Percentage/Fixed amount selector
- Live preview

### Key UI Patterns

**Single Settings Page with Tabs:**
```tsx
<Tabs defaultValue="general">
  <TabsList>
    <TabsTrigger value="general">General</TabsTrigger>
    <TabsTrigger value="clients">Client Adjustments</TabsTrigger>
    <TabsTrigger value="rules">Rules (Optional)</TabsTrigger>
  </TabsList>
  
  <TabsContent value="general">
    <CogsGeneralSettings />
  </TabsContent>
  
  <TabsContent value="clients">
    <CogsClientAdjustments />
  </TabsContent>
  
  <TabsContent value="rules">
    <CogsRulesManager />
  </TabsContent>
</Tabs>
```

**Client COGS Adjustment (in Client Profile):**
```tsx
<Card>
  <CardHeader>
    <CardTitle>COGS Adjustment</CardTitle>
  </CardHeader>
  <CardContent>
    <RadioGroup value={adjustmentType}>
      <Radio value="NONE">None (use standard COGS)</Radio>
      <Radio value="PERCENTAGE">Percentage discount</Radio>
      <Radio value="FIXED_AMOUNT">Fixed amount discount</Radio>
    </RadioGroup>
    
    {adjustmentType !== 'NONE' && (
      <Input
        type="number"
        label={adjustmentType === 'PERCENTAGE' ? 'Discount %' : 'Discount Amount'}
        value={adjustmentValue}
        onChange={setAdjustmentValue}
      />
    )}
    
    <div className="preview">
      <div>Example: Standard COGS $25.00</div>
      <div>After adjustment: ${calculateAdjustedCogs(25, adjustmentType, adjustmentValue)}</div>
    </div>
  </CardContent>
</Card>
```

### Testing Checklist
- ✅ General settings persistence
- ✅ Client COGS adjustment in profile
- ✅ Bulk client adjustments view
- ✅ Optional rules creation
- ✅ Rule testing
- ✅ Settings applied in order creation

---

## ✅ Integration Checklist

### Phase 1: Merge Backend (Module A)
- [ ] Run database migrations
- [ ] Test all tRPC endpoints
- [ ] Verify COGS calculation
- [ ] Test inventory reduction
- [ ] Test order creation

### Phase 2: Merge Frontend (Module B)
- [ ] Integrate with Module A endpoints
- [ ] Test order creation flow
- [ ] Test progressive disclosure
- [ ] Test COGS adjustment
- [ ] Test export functionality

### Phase 3: Merge Settings (Module C)
- [ ] Integrate COGS settings
- [ ] Test client adjustments
- [ ] Test optional rules
- [ ] Verify settings persistence

### Phase 4: Cross-Module Testing
- [ ] Create order with client adjustment
- [ ] Create order with optional rule
- [ ] Convert quote to sale
- [ ] Test credit limit blocking
- [ ] Test sample inventory tracking
- [ ] Test export all formats

### Phase 5: QA & Polish
- [ ] TypeScript compilation (zero errors)
- [ ] ESLint checks
- [ ] UI/UX review
- [ ] Performance testing
- [ ] Update documentation
- [ ] Git commit and push

---

## 📚 Reference Documents

**Must Read:**
1. `/docs/MASTER_DEVELOPMENT_PROMPT.md`
2. `/docs/QUOTE_SALES_EXPERT_QA_REVIEW.md`
3. `/docs/QUOTE_SALES_BRILLIANT_UX_SPEC.md`
4. `/docs/DEVELOPMENT_PROTOCOLS.md`
5. `/docs/PARALLEL_DEVELOPMENT_PROTOCOL.md`

**Reuse Patterns:**
- `/server/pricingEngine.ts` - Calculation patterns
- `/client/src/pages/SalesSheetCreatorPage.tsx` - Layout
- `/client/src/components/pricing/PricingRulesPage.tsx` - Rules UI

---

## 🚀 Success Criteria

**Module A (Backend):**
- ✅ Unified orders table working
- ✅ COGS calculation accurate
- ✅ Inventory reduction correct
- ✅ Zero TypeScript errors
- ✅ Transaction safety

**Module B (Frontend):**
- ✅ Progressive disclosure working
- ✅ Margin colors correct
- ✅ COGS adjustment smooth
- ✅ Credit alerts contextual
- ✅ Zero TypeScript errors

**Module C (Settings):**
- ✅ Single page with tabs
- ✅ Client adjustments working
- ✅ Settings persistent
- ✅ Zero TypeScript errors

**Integration:**
- ✅ All modules work together
- ✅ No conflicts
- ✅ Consistent UX
- ✅ Performance acceptable
- ✅ Documentation complete

---

**Status:** 📋 Ready for Parallel Implementation

**Timeline:** 14-18 hours wall time (22-30 hours total work)

**Next Step:** Spawn 3 parallel agents with this refined spec.

