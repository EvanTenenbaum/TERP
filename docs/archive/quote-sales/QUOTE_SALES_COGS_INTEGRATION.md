# COGS Integration for Quote/Sales Module - Analysis & Proposals

**Created:** October 25, 2025  
**Purpose:** Comprehensive analysis of COGS integration options for Quote/Sales workflow

---

## 📊 Current COGS System Overview

### Existing Implementation

**Two COGS Modes:**
1. **FIXED** - Single cost per unit (e.g., $25.00)
2. **RANGE** - Min/Max cost range (e.g., $18.00 - $28.00)

**Database Schema:**
```typescript
batches: {
  cogsMode: "FIXED" | "RANGE",
  unitCogs: string,        // Used for FIXED mode
  unitCogsMin: string,     // Used for RANGE mode
  unitCogsMax: string,     // Used for RANGE mode
}
```

**Business Rules:**
- FIXED: Simple - one cost applies to all sales
- RANGE: Flexible - allows different COGS based on sale price/quantity/client
- COGS can be updated retroactively (affects past sales accounting)

### Current Use Cases

**FIXED Mode:**
- Vendor sells at consistent price
- Simple cost tracking
- No negotiation flexibility

**RANGE Mode:**
- Consignment deals (pay different % based on sale price)
- Volume discounts from vendor
- Quality-based pricing (Grade A vs B from same lot)
- Negotiated vendor terms

---

## 🤔 Key Questions to Answer

### 1. COGS Determination Logic

**When creating a sale, how do we determine the actual COGS?**

**Options:**
- A. Use fixed COGS (simple, but ignores RANGE)
- B. Calculate based on sale price (% of revenue)
- C. Let user select COGS within range
- D. Auto-calculate based on business rules
- E. Defer COGS selection until fulfillment

### 2. Profit Visibility

**Should users see profit margins during quote/sale creation?**

**Options:**
- A. Show real-time profit margin as they build quote
- B. Hide profit until sale is finalized
- C. Show estimated range (if RANGE mode)
- D. Show only for certain user roles

### 3. RANGE Mode Resolution

**For RANGE mode batches, when/how is the final COGS locked in?**

**Options:**
- A. At quote creation
- B. At sale creation
- C. At fulfillment/shipment
- D. At vendor payment
- E. Never (keep as range, calculate profit range)

### 4. Pricing Guardrails

**Should the system prevent selling below COGS?**

**Options:**
- A. Hard block (cannot create sale if price < COGS)
- B. Soft warning (show alert but allow)
- C. Permission-based (managers can override)
- D. No restriction (trust user judgment)

---

## 💡 Proposed Integration Approaches

### **Approach 1: Simple Fixed COGS (Recommended for MVP)**

**Philosophy:** Keep it simple, use FIXED mode primarily, handle RANGE as edge case

#### Business Logic

**FIXED Mode:**
- Use `unitCogs` directly
- COGS locked at sale creation
- Profit = Sale Price - COGS

**RANGE Mode:**
- Use **midpoint** of range as default COGS
- Allow manual override within range
- Lock COGS at sale creation

#### User Flow

```
1. User adds item to quote/sale
2. System displays:
   - Sale Price: $150
   - COGS: $25 (FIXED) or $23 (RANGE midpoint)
   - Margin: $125 (83.3%)
3. For RANGE items, show [Adjust COGS] button
4. User can override COGS within min/max range
5. COGS locked when sale created
```

#### UI Design

```
┌─────────────────────────────────────────┐
│ Blue Dream                              │
│ Qty: 10 | Price: $150/unit              │
│                                         │
│ COGS: $25.00 (FIXED) ✓                 │
│ Margin: $125.00 (83.3%) 📈             │
│                                         │
│ [Override Price] [Remove]               │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ OG Kush                                 │
│ Qty: 10 | Price: $135/unit              │
│                                         │
│ COGS: $23.00 (Range: $18-$28) ⚙️       │
│ Margin: $112.00 (82.9%) 📈             │
│                                         │
│ [Adjust COGS] [Override Price] [Remove] │
└─────────────────────────────────────────┘
```

#### COGS Adjustment Modal (RANGE mode only)

```
┌─────────────────────────────────────────┐
│ Adjust COGS - OG Kush                   │
├─────────────────────────────────────────┤
│                                         │
│ Sale Price: $135.00                     │
│                                         │
│ COGS Range: $18.00 - $28.00             │
│                                         │
│ Select COGS:                            │
│ [$23.00]                                │
│ [────────●──────] (slider)              │
│ Min $18      Mid $23      Max $28       │
│                                         │
│ Resulting Margin:                       │
│ $112.00 (82.9%)                         │
│                                         │
│ [Cancel] [Apply]                        │
└─────────────────────────────────────────┘
```

#### Database Schema Changes

```sql
-- Add to sales table
ALTER TABLE sales ADD COLUMN items_with_cogs JSON;

-- Structure:
items_with_cogs: [
  {
    itemId: 1,
    displayName: "Blue Dream",
    quantity: 10,
    salePrice: 150,
    cogsMode: "FIXED",
    actualCogs: 25,      // Locked COGS at sale time
    margin: 125,
    marginPercent: 83.3
  },
  {
    itemId: 2,
    displayName: "OG Kush",
    quantity: 10,
    salePrice: 135,
    cogsMode: "RANGE",
    cogsRange: { min: 18, max: 28 },
    actualCogs: 23,      // User-selected or midpoint
    margin: 112,
    marginPercent: 82.9
  }
]
```

#### Pros
✅ Simple to understand and implement  
✅ COGS locked at sale creation (clear accounting)  
✅ Real-time profit visibility  
✅ Handles both FIXED and RANGE modes  
✅ User has control over RANGE COGS  

#### Cons
❌ Requires manual COGS selection for RANGE items  
❌ No automatic COGS optimization  
❌ Doesn't leverage pricing rules for COGS  

---

### **Approach 2: Dynamic COGS Calculation**

**Philosophy:** Auto-calculate COGS based on business rules and context

#### Business Logic

**COGS Calculation Rules:**

1. **Sale Price Percentage** (for consignment)
   - If sale price > $150: COGS = 60% of sale price
   - If sale price $100-$150: COGS = 65% of sale price
   - If sale price < $100: COGS = 70% of sale price

2. **Quantity Tiers** (for volume discounts)
   - If qty >= 100: COGS = min of range
   - If qty 50-99: COGS = midpoint
   - If qty < 50: COGS = max of range

3. **Client-Based** (for negotiated terms)
   - Premium clients: Lower COGS (better vendor terms)
   - Standard clients: Midpoint COGS
   - New clients: Higher COGS (less favorable terms)

4. **Hybrid** (combine multiple rules)
   - Apply pricing profile rules to determine COGS
   - Use same condition engine as pricing rules

#### User Flow

```
1. User selects client
2. System loads client's COGS profile (if exists)
3. User adds item to quote/sale
4. System auto-calculates COGS based on:
   - Sale price
   - Quantity
   - Client tier
   - COGS rules
5. Display calculated COGS with explanation
6. User can override if needed
7. COGS locked at sale creation
```

#### UI Design

```
┌─────────────────────────────────────────┐
│ OG Kush                                 │
│ Qty: 75 | Price: $135/unit              │
│                                         │
│ COGS: $20.00 (Auto-calculated) ℹ️       │
│ ├─ Base Range: $18-$28                  │
│ ├─ Rule: Volume Tier (50-99 units)     │
│ └─ Applied: Midpoint - 15%              │
│                                         │
│ Margin: $115.00 (85.2%) 📈             │
│                                         │
│ [Adjust COGS] [Override Price] [Remove] │
└─────────────────────────────────────────┘
```

#### COGS Rules Configuration

**New Page:** `/settings/cogs-rules`

```
┌─────────────────────────────────────────┐
│ COGS Calculation Rules                  │
├─────────────────────────────────────────┤
│                                         │
│ Rule 1: Volume Discount                 │
│ ├─ Condition: Quantity >= 100           │
│ ├─ Action: Use Min COGS                 │
│ └─ Priority: 1                          │
│                                         │
│ Rule 2: Premium Client                  │
│ ├─ Condition: Client Tier = "Premium"   │
│ ├─ Action: Min COGS - 10%               │
│ └─ Priority: 2                          │
│                                         │
│ Rule 3: Consignment Percentage          │
│ ├─ Condition: Payment Terms = "CONSIGN" │
│ ├─ Action: 60% of Sale Price            │
│ └─ Priority: 3                          │
│                                         │
│ [Add Rule]                              │
└─────────────────────────────────────────┘
```

#### Database Schema Changes

```sql
-- New table: COGS calculation rules
CREATE TABLE cogs_rules (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Conditions (JSON)
  conditions JSON, -- Same structure as pricing rules
  logic_type ENUM('AND', 'OR') DEFAULT 'AND',
  
  -- COGS calculation method
  calculation_type ENUM('PERCENTAGE', 'FIXED_AMOUNT', 'RANGE_POSITION', 'SALE_PRICE_PERCENT'),
  calculation_value DECIMAL(10, 4),
  
  -- Priority
  priority INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);

-- Add to clients table
ALTER TABLE clients ADD COLUMN cogs_profile_id INT REFERENCES cogs_profiles(id);

-- New table: COGS profiles (collections of rules)
CREATE TABLE cogs_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rules JSON, -- [{ ruleId: 1, priority: 1 }, ...]
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW() ON UPDATE NOW()
);
```

#### Pros
✅ Automated COGS calculation  
✅ Handles complex vendor agreements  
✅ Consistent with pricing rules system  
✅ Reduces manual work  
✅ Supports sophisticated business logic  

#### Cons
❌ More complex to implement  
❌ Requires COGS rules configuration  
❌ May be overkill for simple businesses  
❌ Harder to debug/understand  

---

### **Approach 3: Deferred COGS (Fulfillment-Time)**

**Philosophy:** Don't lock COGS at sale creation, determine at fulfillment

#### Business Logic

**Quote Stage:**
- Show estimated COGS range
- Display estimated margin range
- No COGS commitment

**Sale Creation:**
- Still show estimated COGS
- Create sale without final COGS
- Mark COGS as "PENDING"

**Fulfillment Stage:**
- User selects actual COGS based on:
  - Actual vendor invoice
  - Actual payment to vendor
  - Quality delivered
  - Negotiated final price
- Lock COGS at fulfillment
- Update accounting entries

#### User Flow

```
1. Create Quote
   → Show COGS range: $18-$28
   → Show margin range: $107-$117 (79-87%)
   
2. Convert to Sale
   → COGS still pending
   → Create sale with estimated COGS (midpoint)
   → Invoice shows sale price only
   
3. Fulfill Order
   → User enters actual COGS from vendor invoice
   → System validates within range
   → Lock COGS and update accounting
   → Calculate final profit
```

#### UI Design

**Quote Stage:**
```
┌─────────────────────────────────────────┐
│ OG Kush                                 │
│ Qty: 10 | Price: $135/unit              │
│                                         │
│ Est. COGS: $18-$28 (Range)              │
│ Est. Margin: $107-$117 (79-87%)         │
│                                         │
│ [Override Price] [Remove]               │
└─────────────────────────────────────────┘
```

**Sale Stage:**
```
┌─────────────────────────────────────────┐
│ OG Kush                                 │
│ Qty: 10 | Price: $135/unit              │
│                                         │
│ COGS: PENDING ⏳                        │
│ Est. COGS: $23 (midpoint)               │
│ Est. Margin: $112 (82.9%)               │
│                                         │
│ Status: Awaiting Fulfillment            │
└─────────────────────────────────────────┘
```

**Fulfillment Stage:**
```
┌─────────────────────────────────────────┐
│ Finalize COGS - OG Kush                 │
├─────────────────────────────────────────┤
│                                         │
│ Sale Price: $135.00                     │
│ Allowed Range: $18.00 - $28.00          │
│                                         │
│ Enter Actual COGS:                      │
│ [$24.50]                                │
│                                         │
│ Source:                                 │
│ ○ Vendor Invoice                        │
│ ○ Consignment Settlement                │
│ ○ Manual Entry                          │
│                                         │
│ Vendor Invoice #: [INV-12345]           │
│                                         │
│ Final Margin: $110.50 (81.9%)           │
│                                         │
│ [Cancel] [Lock COGS]                    │
└─────────────────────────────────────────┘
```

#### Database Schema Changes

```sql
-- Add to sales table
ALTER TABLE sales ADD COLUMN cogs_status ENUM('PENDING', 'LOCKED') DEFAULT 'PENDING';
ALTER TABLE sales ADD COLUMN cogs_locked_at TIMESTAMP;
ALTER TABLE sales ADD COLUMN cogs_locked_by INT REFERENCES users(id);

-- COGS history tracking
CREATE TABLE cogs_history (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sale_id INT NOT NULL REFERENCES sales(id),
  item_id INT NOT NULL,
  
  estimated_cogs DECIMAL(15,2),
  actual_cogs DECIMAL(15,2),
  cogs_source ENUM('VENDOR_INVOICE', 'CONSIGNMENT', 'MANUAL'),
  vendor_invoice_number VARCHAR(100),
  
  locked_by INT REFERENCES users(id),
  locked_at TIMESTAMP DEFAULT NOW(),
  notes TEXT
);
```

#### Pros
✅ Reflects real-world vendor payment timing  
✅ Accurate COGS based on actual invoices  
✅ Flexible for consignment deals  
✅ Better for variable vendor pricing  
✅ Audit trail of COGS changes  

#### Cons
❌ Delayed profit visibility  
❌ More complex workflow  
❌ Requires additional fulfillment step  
❌ Accounting entries need updates  
❌ May confuse users expecting immediate profit  

---

### **Approach 4: Hybrid Smart COGS**

**Philosophy:** Combine best of all approaches with intelligent defaults

#### Business Logic

**Tiered Approach:**

1. **FIXED Mode Items:**
   - Auto-use fixed COGS
   - Lock immediately
   - Simple and fast

2. **RANGE Mode Items:**
   - **Default:** Auto-calculate using rules (Approach 2)
   - **Override:** User can manually adjust (Approach 1)
   - **Defer:** Option to mark as "Pending" (Approach 3)

3. **Smart Defaults:**
   - If COGS rules exist → Use auto-calculation
   - If no rules → Use midpoint
   - If consignment → Mark as pending
   - If user overrides → Lock at sale

#### User Flow

```
1. User adds FIXED item
   → COGS auto-filled, locked
   → Profit shown immediately
   
2. User adds RANGE item
   → System checks for COGS rules
   → If rules exist: Auto-calculate
   → If no rules: Use midpoint
   → Show [Adjust] and [Mark Pending] buttons
   
3. User can choose:
   A. Accept calculated COGS → Lock at sale
   B. Adjust COGS manually → Lock at sale
   C. Mark as pending → Lock at fulfillment
```

#### UI Design

```
┌─────────────────────────────────────────┐
│ Blue Dream (FIXED)                      │
│ Qty: 10 | Price: $150/unit              │
│                                         │
│ COGS: $25.00 ✓ LOCKED                  │
│ Margin: $125.00 (83.3%) 📈             │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ OG Kush (RANGE)                         │
│ Qty: 75 | Price: $135/unit              │
│                                         │
│ COGS: $20.00 (Auto-calc) ⚙️             │
│ ├─ Rule: Volume Tier                    │
│ └─ Range: $18-$28                       │
│                                         │
│ Margin: $115.00 (85.2%) 📈             │
│                                         │
│ [Adjust COGS] [Mark Pending] [Remove]   │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│ Purple Haze (RANGE - Consignment)       │
│ Qty: 50 | Price: $120/unit              │
│                                         │
│ COGS: PENDING ⏳                        │
│ Est. Range: $15-$25                     │
│ Est. Margin: $95-$105 (79-88%)          │
│                                         │
│ [Set COGS Now] [Keep Pending] [Remove]  │
└─────────────────────────────────────────┘
```

#### Configuration Options

**Settings Page:** `/settings/cogs-behavior`

```
┌─────────────────────────────────────────┐
│ COGS Behavior Settings                  │
├─────────────────────────────────────────┤
│                                         │
│ Default COGS Strategy:                  │
│ ○ Always use midpoint (Simple)          │
│ ● Use COGS rules if available (Smart)   │
│ ○ Always defer to fulfillment (Deferred)│
│                                         │
│ Pricing Guardrails:                     │
│ ☑ Warn when selling below COGS          │
│ ☐ Block sales below COGS                │
│ ☑ Require manager approval for <10% margin │
│                                         │
│ RANGE Mode Defaults:                    │
│ ● Auto-calculate with rules             │
│ ☐ Always use midpoint                   │
│ ☐ Always prompt user                    │
│                                         │
│ Consignment Items:                      │
│ ● Auto-mark COGS as pending             │
│ ☐ Calculate based on % of sale price    │
│                                         │
│ [Save Settings]                         │
└─────────────────────────────────────────┘
```

#### Pros
✅ Flexible - supports all use cases  
✅ Intelligent defaults reduce manual work  
✅ User has full control when needed  
✅ Handles simple and complex scenarios  
✅ Configurable behavior  

#### Cons
❌ Most complex to implement  
❌ More UI components needed  
❌ Requires user training  
❌ More settings to configure  

---

## 📊 Comparison Matrix

| Feature | Approach 1: Simple | Approach 2: Dynamic | Approach 3: Deferred | Approach 4: Hybrid |
|---------|-------------------|---------------------|----------------------|-------------------|
| **Complexity** | Low | Medium | Medium | High |
| **Implementation Time** | 4-6 hours | 10-12 hours | 8-10 hours | 14-16 hours |
| **User Learning Curve** | Easy | Medium | Medium | Medium |
| **FIXED Mode Support** | ✅ Excellent | ✅ Excellent | ✅ Excellent | ✅ Excellent |
| **RANGE Mode Support** | ⚠️ Manual | ✅ Automated | ✅ Flexible | ✅ Best |
| **Consignment Support** | ❌ Poor | ⚠️ Estimated | ✅ Excellent | ✅ Excellent |
| **Real-time Profit** | ✅ Yes | ✅ Yes | ⚠️ Estimated | ✅ Yes |
| **Accuracy** | ⚠️ Medium | ✅ High | ✅ Highest | ✅ High |
| **Automation** | ❌ Low | ✅ High | ⚠️ Medium | ✅ High |
| **Flexibility** | ⚠️ Medium | ⚠️ Medium | ✅ High | ✅ Highest |

---

## 🎯 Recommendations

### **For MVP: Approach 1 (Simple Fixed COGS)**

**Rationale:**
- Fastest to implement (4-6 hours)
- Covers 80% of use cases
- Easy for users to understand
- Can be enhanced later

**Implementation:**
1. Display COGS for all items in quote/sale preview
2. For FIXED: Use `unitCogs` directly
3. For RANGE: Use midpoint, allow manual adjustment
4. Show profit margin in real-time
5. Lock COGS at sale creation
6. Store `actualCogs` in sale items JSON

### **For Future Enhancement: Approach 4 (Hybrid Smart COGS)**

**Rationale:**
- Provides maximum flexibility
- Supports complex business scenarios
- Maintains simplicity for simple cases
- Configurable to match business needs

**Phased Rollout:**
1. **Phase 1 (MVP):** Implement Approach 1
2. **Phase 2:** Add COGS rules engine (Approach 2 features)
3. **Phase 3:** Add deferred COGS option (Approach 3 features)
4. **Phase 4:** Unify into Hybrid approach with settings

---

## 🔧 Technical Implementation (Approach 1 - MVP)

### Backend Changes

**Add to `salesSheetsDb.ts`:**
```typescript
export async function getInventoryWithCogs(clientId?: number) {
  const batches = await db.select().from(batches).where(/* ... */);
  
  return batches.map(batch => {
    let cogs: number;
    let cogsDisplay: string;
    
    if (batch.cogsMode === 'FIXED') {
      cogs = parseFloat(batch.unitCogs || '0');
      cogsDisplay = `$${cogs.toFixed(2)} (FIXED)`;
    } else {
      // RANGE mode - use midpoint
      const min = parseFloat(batch.unitCogsMin || '0');
      const max = parseFloat(batch.unitCogsMax || '0');
      cogs = (min + max) / 2;
      cogsDisplay = `$${cogs.toFixed(2)} (Range: $${min}-$${max})`;
    }
    
    return {
      id: batch.id,
      name: batch.sku,
      quantity: parseFloat(batch.onHandQty || '0'),
      basePrice: cogs,
      retailPrice: /* from pricing engine */,
      cogsMode: batch.cogsMode,
      cogs: cogs,
      cogsDisplay: cogsDisplay,
      cogsRange: batch.cogsMode === 'RANGE' ? {
        min: parseFloat(batch.unitCogsMin || '0'),
        max: parseFloat(batch.unitCogsMax || '0'),
      } : null,
    };
  });
}
```

**Add to sales creation:**
```typescript
export async function createSale(input: CreateSaleInput) {
  // ... existing code ...
  
  // Calculate COGS and margins for each item
  const itemsWithCogs = input.items.map(item => {
    const batch = /* fetch batch */;
    
    let actualCogs: number;
    if (item.overrideCogs !== undefined) {
      // User manually set COGS
      actualCogs = item.overrideCogs;
    } else if (batch.cogsMode === 'FIXED') {
      actualCogs = parseFloat(batch.unitCogs || '0');
    } else {
      // RANGE mode - use midpoint
      const min = parseFloat(batch.unitCogsMin || '0');
      const max = parseFloat(batch.unitCogsMax || '0');
      actualCogs = (min + max) / 2;
    }
    
    const salePrice = item.overridePrice || item.retailPrice;
    const margin = salePrice - actualCogs;
    const marginPercent = (margin / salePrice) * 100;
    
    return {
      ...item,
      actualCogs,
      margin,
      marginPercent,
    };
  });
  
  // Store in sale record
  await db.insert(sales).values({
    // ... existing fields ...
    items: JSON.stringify(itemsWithCogs),
  });
}
```

### Frontend Changes

**Add to QuoteSalePreview component:**
```typescript
interface ItemWithCogs {
  id: number;
  displayName: string;
  quantity: number;
  salePrice: number;
  cogsMode: 'FIXED' | 'RANGE';
  cogs: number;
  cogsDisplay: string;
  cogsRange?: { min: number; max: number };
  margin: number;
  marginPercent: number;
  overrideCogs?: number;
}

function QuoteSalePreview() {
  const [items, setItems] = useState<ItemWithCogs[]>([]);
  
  const handleCogsAdjust = (itemId: number, newCogs: number) => {
    setItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const margin = item.salePrice - newCogs;
        const marginPercent = (margin / item.salePrice) * 100;
        return {
          ...item,
          overrideCogs: newCogs,
          cogs: newCogs,
          margin,
          marginPercent,
        };
      }
      return item;
    }));
  };
  
  return (
    <div>
      {items.map(item => (
        <ItemCard
          key={item.id}
          item={item}
          onCogsAdjust={handleCogsAdjust}
        />
      ))}
      
      <div className="totals">
        <div>Subtotal: ${calculateSubtotal()}</div>
        <div>Total COGS: ${calculateTotalCogs()}</div>
        <div>Total Margin: ${calculateTotalMargin()} ({calculateAvgMarginPercent()}%)</div>
      </div>
    </div>
  );
}
```

**ItemCard with COGS display:**
```typescript
function ItemCard({ item, onCogsAdjust }) {
  const [showCogsModal, setShowCogsModal] = useState(false);
  
  return (
    <div className="item-card">
      <div className="item-header">
        <span className="item-name">{item.displayName}</span>
        {item.isSample && <Badge>🎁 Sample</Badge>}
      </div>
      
      <div className="item-details">
        <div>Qty: {item.quantity} | Price: ${item.salePrice}</div>
        
        <div className="cogs-section">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              COGS: {item.cogsDisplay}
            </span>
            {item.cogsMode === 'RANGE' && (
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setShowCogsModal(true)}
              >
                Adjust
              </Button>
            )}
          </div>
          
          <div className={`margin ${item.marginPercent < 10 ? 'text-red-600' : 'text-green-600'}`}>
            Margin: ${item.margin.toFixed(2)} ({item.marginPercent.toFixed(1)}%)
          </div>
        </div>
      </div>
      
      {showCogsModal && (
        <CogsAdjustModal
          item={item}
          onAdjust={onCogsAdjust}
          onClose={() => setShowCogsModal(false)}
        />
      )}
    </div>
  );
}
```

---

## ✅ Decision Framework

**Choose Approach 1 if:**
- You're building MVP
- Most inventory is FIXED mode
- Users understand their costs well
- Speed to market is priority

**Choose Approach 2 if:**
- You have complex vendor agreements
- COGS varies significantly by context
- You want to automate COGS decisions
- You already have pricing rules

**Choose Approach 3 if:**
- You do heavy consignment business
- Vendor invoices come after sales
- COGS accuracy is more important than speed
- You have dedicated fulfillment team

**Choose Approach 4 if:**
- You need to support all scenarios
- You have development resources
- Users have varying sophistication levels
- Long-term flexibility is important

---

## 🚀 Recommended Implementation Plan

### Phase 1: MVP (Approach 1)
**Timeline:** 4-6 hours

1. Add COGS display to inventory browser
2. Calculate margin in real-time
3. Add COGS adjustment modal for RANGE items
4. Store actualCogs in sale items
5. Display profit summary in preview panel

### Phase 2: Guardrails (Week 2)
**Timeline:** 2-3 hours

1. Add warning when margin < 10%
2. Add setting to block sales below COGS
3. Add manager override permission
4. Add profit visibility role control

### Phase 3: Smart COGS (Month 2)
**Timeline:** 10-12 hours

1. Build COGS rules engine
2. Add COGS profiles
3. Auto-calculate based on rules
4. Add COGS rules management UI

### Phase 4: Deferred COGS (Month 3)
**Timeline:** 8-10 hours

1. Add "Mark as Pending" option
2. Build fulfillment COGS finalization UI
3. Add COGS history tracking
4. Update accounting integration

---

**Status:** 📋 Ready for Decision

**Next Step:** User selects preferred approach, then we proceed with implementation.

