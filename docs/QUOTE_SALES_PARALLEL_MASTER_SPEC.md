# Quote/Sales Module - Parallel Development Master Specification

**Created:** October 25, 2025  
**Purpose:** Master specification for parallel implementation of Quote/Sales Module with Brilliant UX

---

## 🎯 Project Overview

**Goal:** Implement Quote/Sales Module with Hybrid Smart COGS system and brilliant progressive disclosure UX

**Architecture:** 3 independent modules developed in parallel

**Timeline:** 20-24 hours wall time (34-40 hours total work)

---

## 📋 Shared Foundation

### Database Schema (FROZEN - Do Not Modify)

**New Tables:**

```sql
-- Quotes table
CREATE TABLE quotes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  quote_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  
  -- Quote details
  items JSON NOT NULL, -- Array of items with COGS
  subtotal DECIMAL(15,2) NOT NULL,
  tax DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  
  -- Profit tracking
  total_cogs DECIMAL(15,2),
  total_margin DECIMAL(15,2),
  avg_margin_percent DECIMAL(5,2),
  
  -- Status
  status ENUM('DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CONVERTED') DEFAULT 'DRAFT',
  valid_until DATE,
  
  -- Metadata
  notes TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  
  -- Conversion tracking
  converted_to_sale_id INT REFERENCES sales(id),
  converted_at TIMESTAMP
);

-- Sales table
CREATE TABLE sales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_number VARCHAR(50) UNIQUE NOT NULL,
  client_id INT NOT NULL REFERENCES clients(id),
  quote_id INT REFERENCES quotes(id),
  
  -- Sale details
  items JSON NOT NULL, -- Array of items with locked COGS
  subtotal DECIMAL(15,2) NOT NULL,
  tax DECIMAL(15,2) DEFAULT 0,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  
  -- Profit tracking
  total_cogs DECIMAL(15,2),
  total_margin DECIMAL(15,2),
  avg_margin_percent DECIMAL(5,2),
  
  -- Payment
  payment_terms ENUM('NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT') NOT NULL,
  cash_payment DECIMAL(15,2) DEFAULT 0,
  due_date DATE,
  
  -- COGS status
  cogs_status ENUM('LOCKED', 'PENDING') DEFAULT 'LOCKED',
  cogs_locked_at TIMESTAMP,
  
  -- Status
  status ENUM('PENDING', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED') DEFAULT 'PENDING',
  
  -- Metadata
  notes TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW(),
  
  -- Links
  invoice_id INT REFERENCES invoices(id)
);

-- COGS Rules table
CREATE TABLE cogs_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Conditions (same structure as pricing rules)
  conditions JSON,
  logic_type ENUM('AND', 'OR') DEFAULT 'AND',
  
  -- Calculation
  calculation_type ENUM('MIN', 'MAX', 'MIDPOINT', 'MIN_MINUS_PERCENT', 'MAX_PLUS_PERCENT', 'SALE_PRICE_PERCENT', 'FIXED') NOT NULL,
  calculation_value DECIMAL(10,4),
  
  -- Priority
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- COGS Profiles table
CREATE TABLE cogs_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSON, -- [{ ruleId: 1, priority: 1 }, ...]
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Sample Inventory Log table
CREATE TABLE sample_inventory_log (
  id INT PRIMARY KEY AUTO_INCREMENT,
  batch_id INT NOT NULL REFERENCES batches(id),
  sale_id INT REFERENCES sales(id),
  quote_id INT REFERENCES quotes(id),
  
  quantity DECIMAL(15,4) NOT NULL,
  action ENUM('ALLOCATED', 'RELEASED', 'CONSUMED') NOT NULL,
  
  notes TEXT,
  created_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Add to batches table
ALTER TABLE batches ADD COLUMN sample_qty DECIMAL(15,4) DEFAULT 0;

-- Add to clients table
ALTER TABLE clients ADD COLUMN cogs_profile_id INT REFERENCES cogs_profiles(id);
```

### Shared TypeScript Types (FROZEN)

```typescript
// Quote types
interface Quote {
  id: number;
  quoteNumber: string;
  clientId: number;
  items: QuoteItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalCogs?: number;
  totalMargin?: number;
  avgMarginPercent?: number;
  status: 'DRAFT' | 'SENT' | 'VIEWED' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'CONVERTED';
  validUntil?: string;
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  convertedToSaleId?: number;
  convertedAt?: string;
}

interface QuoteItem {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  salePrice: number;
  isSample: boolean;
  
  // COGS details
  cogsMode: 'FIXED' | 'RANGE';
  cogs: number;
  cogsRange?: { min: number; max: number };
  calculationMethod: 'FIXED' | 'MIDPOINT' | 'RULE' | 'MANUAL' | 'PENDING';
  appliedRule?: string;
  
  // Profit
  margin: number;
  marginPercent: number;
  
  // Overrides
  overridePrice?: number;
  overrideCogs?: number;
}

// Sale types
interface Sale {
  id: number;
  saleNumber: string;
  clientId: number;
  quoteId?: number;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  totalCogs?: number;
  totalMargin?: number;
  avgMarginPercent?: number;
  paymentTerms: 'NET_7' | 'NET_15' | 'NET_30' | 'COD' | 'PARTIAL' | 'CONSIGNMENT';
  cashPayment: number;
  dueDate?: string;
  cogsStatus: 'LOCKED' | 'PENDING';
  cogsLockedAt?: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED';
  notes?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  invoiceId?: number;
}

interface SaleItem extends QuoteItem {
  // Sale items have same structure as quote items
  // COGS must be locked (no PENDING calculation method)
}

// COGS Rule types
interface CogsRule {
  id: number;
  name: string;
  description?: string;
  conditions: Condition[];
  logicType: 'AND' | 'OR';
  calculationType: 'MIN' | 'MAX' | 'MIDPOINT' | 'MIN_MINUS_PERCENT' | 'MAX_PLUS_PERCENT' | 'SALE_PRICE_PERCENT' | 'FIXED';
  calculationValue?: number;
  priority: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CogsProfile {
  id: number;
  name: string;
  description?: string;
  rules: { ruleId: number; priority: number }[];
  createdAt: string;
  updatedAt: string;
}

// Condition type (reuse from pricing rules)
interface Condition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'nin';
  value: any;
}

// COGS calculation result
interface CogsCalculationResult {
  cogs: number;
  cogsMode: 'FIXED' | 'RANGE';
  cogsRange?: { min: number; max: number };
  calculationMethod: 'FIXED' | 'MIDPOINT' | 'RULE' | 'MANUAL' | 'PENDING';
  appliedRule?: string;
  margin: number;
  marginPercent: number;
}
```

### tRPC Endpoints (FROZEN - Contract)

```typescript
// Module A will implement these endpoints
quotes: {
  create: (input: CreateQuoteInput) => Quote,
  update: (input: UpdateQuoteInput) => Quote,
  delete: (id: number) => void,
  getById: (id: number) => Quote,
  getByClient: (clientId: number) => Quote[],
  convertToSale: (quoteId: number, paymentTerms: string, cashPayment: number) => Sale,
  export: (quoteId: number, format: 'pdf' | 'clipboard' | 'image') => string,
}

sales: {
  create: (input: CreateSaleInput) => Sale,
  update: (input: UpdateSaleInput) => Sale,
  delete: (id: number) => void,
  getById: (id: number) => Sale,
  getByClient: (clientId: number) => Sale[],
  finalizeCogs: (saleId: number, items: { batchId: number, cogs: number }[]) => Sale,
}

cogs: {
  calculate: (input: CalculateCogsInput) => CogsCalculationResult,
  getRules: () => CogsRule[],
  createRule: (input: CreateCogsRuleInput) => CogsRule,
  updateRule: (input: UpdateCogsRuleInput) => CogsRule,
  deleteRule: (id: number) => void,
  getProfiles: () => CogsProfile[],
  createProfile: (input: CreateCogsProfileInput) => CogsProfile,
  updateProfile: (input: UpdateCogsProfileInput) => CogsProfile,
  deleteProfile: (id: number) => void,
}
```

---

## 🔧 Module A: COGS Engine (Backend)

### Responsibility
Build the COGS calculation engine, rules system, and backend database functions

### Deliverables

1. **File:** `/server/cogsEngine.ts`
   - `calculateCogs(batch, context)` - Main calculation function
   - `applyCogsRules(batch, context, rules)` - Apply rules to determine COGS
   - `evaluateConditions(conditions, context)` - Evaluate rule conditions
   - `getCogsForBatch(batchId, clientId?, quantity?)` - Get COGS for specific context

2. **File:** `/server/cogsDb.ts`
   - `createCogsRule(input)` - Create new COGS rule
   - `updateCogsRule(id, input)` - Update existing rule
   - `deleteCogsRule(id)` - Delete rule
   - `getCogsRules()` - Get all active rules
   - `createCogsProfile(input)` - Create profile
   - `updateCogsProfile(id, input)` - Update profile
   - `deleteCogsProfile(id)` - Delete profile
   - `getCogsProfiles()` - Get all profiles

3. **File:** `/server/quotesDb.ts`
   - `createQuote(input)` - Create quote with COGS calculation
   - `updateQuote(id, input)` - Update quote
   - `deleteQuote(id)` - Delete quote
   - `getQuoteById(id)` - Get quote by ID
   - `getQuotesByClient(clientId)` - Get client quotes
   - `convertQuoteToSale(quoteId, paymentTerms, cashPayment)` - Convert to sale

4. **File:** `/server/salesDb.ts`
   - `createSale(input)` - Create sale with inventory reduction
   - `updateSale(id, input)` - Update sale
   - `deleteSale(id)` - Delete/cancel sale
   - `getSaleById(id)` - Get sale by ID
   - `getSalesByClient(clientId)` - Get client sales
   - `finalizeCogs(saleId, items)` - Finalize pending COGS

5. **Update:** `/server/routers.ts`
   - Add `quotes` router with all endpoints
   - Add `sales` router with all endpoints
   - Update `cogs` router with rules/profiles endpoints

### Key Logic

**COGS Calculation Algorithm:**
```typescript
function calculateCogs(batch, context) {
  // 1. FIXED mode - simple
  if (batch.cogsMode === 'FIXED') {
    return {
      cogs: parseFloat(batch.unitCogs),
      calculationMethod: 'FIXED',
    };
  }
  
  // 2. RANGE mode - apply rules
  const rules = await getActiveCogsRules();
  const clientProfile = await getClientCogsProfile(context.clientId);
  
  // Merge rules from profile and global rules
  const applicableRules = [...clientProfile.rules, ...rules]
    .sort((a, b) => a.priority - b.priority);
  
  // Find first matching rule
  for (const rule of applicableRules) {
    if (evaluateConditions(rule.conditions, context)) {
      return applyRule(rule, batch, context);
    }
  }
  
  // 3. No rules matched - use midpoint
  const min = parseFloat(batch.unitCogsMin);
  const max = parseFloat(batch.unitCogsMax);
  return {
    cogs: (min + max) / 2,
    calculationMethod: 'MIDPOINT',
  };
}
```

**Sale Creation with Inventory Reduction:**
```typescript
async function createSale(input) {
  // Start transaction
  await db.transaction(async (tx) => {
    // 1. Create sale record
    const sale = await tx.insert(sales).values({...});
    
    // 2. Reduce inventory for each item
    for (const item of input.items) {
      if (item.isSample) {
        // Reduce sample_qty
        await tx.update(batches)
          .set({ sample_qty: sql`sample_qty - ${item.quantity}` })
          .where(eq(batches.id, item.batchId));
        
        // Log sample consumption
        await tx.insert(sample_inventory_log).values({
          batchId: item.batchId,
          saleId: sale.id,
          quantity: item.quantity,
          action: 'CONSUMED',
        });
      } else {
        // Reduce onHandQty
        await tx.update(batches)
          .set({ onHandQty: sql`onHandQty - ${item.quantity}` })
          .where(eq(batches.id, item.batchId));
      }
    }
    
    // 3. Create invoice (accounting integration)
    const invoice = await createInvoice(sale);
    
    // 4. Record cash payment if provided
    if (input.cashPayment > 0) {
      await recordCashPayment(sale.id, input.cashPayment);
    }
    
    // 5. Update credit exposure
    await updateCreditExposure(input.clientId, sale.total);
    
    // 6. Update quote status if converted
    if (input.quoteId) {
      await tx.update(quotes)
        .set({ status: 'CONVERTED', convertedToSaleId: sale.id })
        .where(eq(quotes.id, input.quoteId));
    }
    
    return sale;
  });
}
```

### Testing Checklist
- ✅ FIXED mode COGS calculation
- ✅ RANGE mode with rules
- ✅ RANGE mode without rules (midpoint)
- ✅ Rule priority ordering
- ✅ Condition evaluation (all operators)
- ✅ Quote creation with COGS
- ✅ Sale creation with inventory reduction
- ✅ Sample inventory tracking
- ✅ Consignment COGS pending
- ✅ Credit limit validation

### Files to Create/Modify
- `/server/cogsEngine.ts` (NEW)
- `/server/cogsDb.ts` (NEW)
- `/server/quotesDb.ts` (NEW)
- `/server/salesDb.ts` (NEW)
- `/server/routers.ts` (MODIFY - add routers)
- `/drizzle/schema.ts` (MODIFY - add tables)

---

## 🎨 Module B: Quote/Sales UI (Frontend)

### Responsibility
Build the Quote/Sales Creator page with brilliant progressive disclosure UX

### Deliverables

1. **File:** `/client/src/pages/QuoteSalesCreatorPage.tsx`
   - Main page with 60/40 split layout
   - Client selector with credit display
   - Mode toggle (Quote vs Sale)
   - Integration of InventoryBrowser and QuoteSalePreview

2. **File:** `/client/src/components/sales/QuoteSalePreview.tsx`
   - Item cards with progressive disclosure
   - COGS display (hover, click to expand)
   - Margin indicators (color-coded)
   - Totals panel with expandable details
   - Payment terms selector (for Sale mode)
   - Export buttons

3. **File:** `/client/src/components/sales/QuoteSaleItemCard.tsx`
   - Item display with display name editing
   - Sample toggle
   - Price override
   - COGS display with progressive disclosure
   - Margin indicator
   - Gear icon for advanced options

4. **File:** `/client/src/components/sales/CogsAdjustModal.tsx`
   - Smart suggestion display
   - Slider for COGS range
   - Real-time margin calculation
   - Advanced options (collapsed)
   - "Mark as Pending" option

5. **File:** `/client/src/components/sales/CreditAlertBanner.tsx`
   - Contextual credit display
   - Color-coded (green/amber/red)
   - Progress bar
   - Expandable details

6. **File:** `/client/src/components/sales/PaymentTermsSelector.tsx`
   - Radio group for payment terms
   - Conditional cash input (COD/PARTIAL)
   - Due date calculation
   - Visual feedback

7. **File:** `/client/src/components/sales/QuoteSaleTotalsPanel.tsx`
   - Simple view (default)
   - Expandable details
   - COGS status indicators
   - Action buttons

### Key UI Patterns

**Progressive Disclosure Pattern:**
```tsx
// Level 1: Default view
<div className="item-card">
  <div className="item-header">{item.displayName}</div>
  <div className="margin-indicator">
    <span className={marginColor}>
      Margin: ${item.margin} ({item.marginPercent}%)
    </span>
  </div>
</div>

// Level 2: Hover state
<Tooltip>
  <TooltipTrigger>
    <span className={marginColor}>Margin: ${item.margin}</span>
  </TooltipTrigger>
  <TooltipContent>
    COGS: ${item.cogs} ({item.calculationMethod})
    {item.appliedRule && `Rule: ${item.appliedRule}`}
  </TooltipContent>
</Tooltip>

// Level 3: Expanded state
{isExpanded && (
  <div className="cogs-details">
    <div>COGS: ${item.cogs} ({item.calculationMethod})</div>
    {item.appliedRule && <div>Rule: {item.appliedRule}</div>}
    {item.cogsRange && <div>Range: ${item.cogsRange.min}-${item.cogsRange.max}</div>}
    <Button onClick={openCogsModal}>Adjust COGS</Button>
    <Button onClick={markPending}>Mark Pending</Button>
  </div>
)}
```

**Color-Coded Margin Indicators:**
```tsx
function getMarginColor(marginPercent: number) {
  if (marginPercent >= 70) return 'text-green-600'; // 💚
  if (marginPercent >= 50) return 'text-green-500';
  if (marginPercent >= 30) return 'text-amber-500'; // 🟡
  if (marginPercent >= 15) return 'text-amber-600';
  return 'text-red-600'; // 🔴
}
```

### Testing Checklist
- ✅ Client selection with credit display
- ✅ Mode toggle (Quote/Sale)
- ✅ Add items from inventory
- ✅ Display name editing
- ✅ Sample toggle
- ✅ Price override
- ✅ COGS progressive disclosure
- ✅ COGS adjustment modal
- ✅ Margin color indicators
- ✅ Totals calculation
- ✅ Payment terms selection
- ✅ Credit limit validation
- ✅ Quote creation
- ✅ Sale creation
- ✅ Export functionality

### Files to Create/Modify
- `/client/src/pages/QuoteSalesCreatorPage.tsx` (NEW)
- `/client/src/components/sales/QuoteSalePreview.tsx` (NEW)
- `/client/src/components/sales/QuoteSaleItemCard.tsx` (NEW)
- `/client/src/components/sales/CogsAdjustModal.tsx` (NEW)
- `/client/src/components/sales/CreditAlertBanner.tsx` (NEW)
- `/client/src/components/sales/PaymentTermsSelector.tsx` (NEW)
- `/client/src/components/sales/QuoteSaleTotalsPanel.tsx` (NEW)
- `/client/src/App.tsx` (MODIFY - add routes)
- `/client/src/components/layout/AppSidebar.tsx` (MODIFY - add nav)

---

## ⚙️ Module C: COGS Management UI (Settings)

### Responsibility
Build the COGS rules builder, profiles manager, and settings pages

### Deliverables

1. **File:** `/client/src/pages/CogsRulesPage.tsx`
   - List of COGS rules (card-based)
   - Create/Edit/Delete rules
   - Priority ordering (drag-and-drop)
   - Active/Inactive toggle
   - Rule testing/preview

2. **File:** `/client/src/components/cogs/CogsRuleBuilder.tsx`
   - Visual rule builder modal
   - Condition builder (reuse from pricing rules)
   - Calculation type selector
   - Priority input
   - Plain language descriptions

3. **File:** `/client/src/pages/CogsProfilesPage.tsx`
   - List of COGS profiles
   - Create/Edit/Delete profiles
   - Assign rules to profiles
   - Assign profiles to clients

4. **File:** `/client/src/pages/CogsBehaviorSettingsPage.tsx`
   - Automation level selector
   - Profit protection settings
   - Visibility settings
   - Card-based layout

5. **File:** `/client/src/components/cogs/CogsRuleCard.tsx`
   - Visual rule display
   - Plain language summary
   - Edit/Delete/Duplicate actions
   - Active toggle

6. **File:** `/client/src/components/pricing/PricingConfigTab.tsx` (MODIFY)
   - Add COGS profile selector
   - Show assigned COGS rules

### Key UI Patterns

**Rule Builder Pattern:**
```tsx
<Dialog>
  <DialogContent>
    <h2>Create COGS Rule</h2>
    
    <Input label="Rule Name" />
    
    <div className="conditions">
      <h3>When these conditions are met:</h3>
      <ConditionBuilder
        conditions={conditions}
        onChange={setConditions}
      />
    </div>
    
    <div className="calculation">
      <h3>Then calculate COGS as:</h3>
      <Select value={calculationType}>
        <option value="MIN">Use minimum COGS</option>
        <option value="MAX">Use maximum COGS</option>
        <option value="MIDPOINT">Use midpoint</option>
        <option value="MIN_MINUS_PERCENT">Min COGS - X%</option>
        <option value="SALE_PRICE_PERCENT">X% of sale price</option>
      </Select>
      {needsValue && <Input label="Value" type="number" />}
    </div>
    
    <Input label="Priority" type="number" />
  </DialogContent>
</Dialog>
```

**Settings Card Pattern:**
```tsx
<Card>
  <CardHeader>
    <CardTitle>🤖 Automation Level</CardTitle>
  </CardHeader>
  <CardContent>
    <RadioGroup value={automationLevel}>
      <Radio value="manual">Manual (Always ask me)</Radio>
      <Radio value="smart">Smart (Auto-calculate with rules)</Radio>
      <Radio value="deferred">Deferred (Finalize at fulfillment)</Radio>
    </RadioGroup>
    <p className="text-sm text-muted-foreground">
      Current: System auto-calculates COGS using rules. You can override.
    </p>
  </CardContent>
</Card>
```

### Testing Checklist
- ✅ Create COGS rule
- ✅ Edit COGS rule
- ✅ Delete COGS rule
- ✅ Reorder rules (priority)
- ✅ Toggle rule active/inactive
- ✅ Create COGS profile
- ✅ Assign rules to profile
- ✅ Assign profile to client
- ✅ Settings persistence
- ✅ Rule testing/preview

### Files to Create/Modify
- `/client/src/pages/CogsRulesPage.tsx` (NEW)
- `/client/src/components/cogs/CogsRuleBuilder.tsx` (NEW)
- `/client/src/pages/CogsProfilesPage.tsx` (NEW)
- `/client/src/pages/CogsBehaviorSettingsPage.tsx` (NEW)
- `/client/src/components/cogs/CogsRuleCard.tsx` (NEW)
- `/client/src/components/pricing/PricingConfigTab.tsx` (MODIFY)
- `/client/src/App.tsx` (MODIFY - add routes)
- `/client/src/components/layout/AppSidebar.tsx` (MODIFY - add nav)

---

## ✅ Integration Checklist (After Parallel Development)

### Phase 1: Merge Backend (Module A)
- [ ] Run database migrations
- [ ] Test all tRPC endpoints
- [ ] Verify COGS calculation logic
- [ ] Test inventory reduction
- [ ] Test accounting integration

### Phase 2: Merge Frontend (Module B)
- [ ] Integrate with Module A endpoints
- [ ] Test quote creation flow
- [ ] Test sale creation flow
- [ ] Test COGS adjustment
- [ ] Test export functionality

### Phase 3: Merge Settings (Module C)
- [ ] Integrate COGS rules with Module A
- [ ] Test rule creation/editing
- [ ] Test profile assignment
- [ ] Verify settings persistence

### Phase 4: Cross-Module Testing
- [ ] Create COGS rule → Use in quote
- [ ] Assign profile to client → Create quote
- [ ] Mark COGS pending → Finalize later
- [ ] Create quote → Convert to sale
- [ ] Test credit limit blocking
- [ ] Test sample inventory tracking

### Phase 5: QA & Polish
- [ ] TypeScript compilation
- [ ] ESLint checks
- [ ] UI/UX review
- [ ] Performance testing
- [ ] Documentation updates

---

## 📚 Reference Documents

**Must Read Before Starting:**
1. `/docs/MASTER_DEVELOPMENT_PROMPT.md` - Development protocols
2. `/docs/QUOTE_SALES_MODULE_SPEC.md` - Module specification
3. `/docs/QUOTE_SALES_BRILLIANT_UX_SPEC.md` - UX design
4. `/docs/QUOTE_SALES_COGS_INTEGRATION.md` - COGS approaches
5. `/docs/DEVELOPMENT_PROTOCOLS.md` - The Bible
6. `/docs/PARALLEL_DEVELOPMENT_PROTOCOL.md` - Parallel guidelines

**Reuse Patterns From:**
- `/server/pricingEngine.ts` - Condition evaluation logic
- `/client/src/pages/SalesSheetCreatorPage.tsx` - Layout patterns
- `/client/src/components/pricing/PricingRulesPage.tsx` - Rules builder patterns

---

## 🚀 Success Criteria

**Module A (Backend):**
- ✅ All tRPC endpoints working
- ✅ COGS calculation accurate
- ✅ Inventory reduction correct
- ✅ No TypeScript errors
- ✅ Transaction safety

**Module B (Frontend):**
- ✅ Progressive disclosure working
- ✅ Margin colors correct
- ✅ COGS adjustment smooth
- ✅ Credit alerts contextual
- ✅ No TypeScript errors

**Module C (Settings):**
- ✅ Rules builder intuitive
- ✅ Profiles working
- ✅ Settings persistent
- ✅ Plain language clear
- ✅ No TypeScript errors

**Integration:**
- ✅ All modules work together
- ✅ No conflicts or duplicates
- ✅ Consistent UX across modules
- ✅ Performance acceptable
- ✅ Documentation complete

---

**Status:** 📋 Ready for Parallel Agent Spawn

**Next Step:** Spawn 3 agents with this master spec.

