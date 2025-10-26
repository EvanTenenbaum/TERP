# Quote/Sales Module - Brilliant UX Specification (Hybrid Smart COGS)

**Created:** October 25, 2025  
**Philosophy:** Maximum power, minimum complexity through progressive disclosure

---

## 🎯 Design Philosophy

### Core Principles

1. **Intelligent Defaults** - System makes smart decisions, user rarely needs to intervene
2. **Progressive Disclosure** - Complexity revealed only when needed
3. **Contextual Guidance** - Show help exactly when user needs it
4. **Visual Clarity** - Use color, icons, and spacing to communicate state
5. **Flexible Power** - Advanced features available but never in the way

### User Experience Goals

**For Novice Users:**
- See profit margins automatically
- Never think about COGS calculation
- Clear visual feedback on profitability
- One-click quote/sale creation

**For Power Users:**
- Quick access to COGS adjustment
- Ability to create custom rules
- Override any auto-calculation
- Defer COGS when needed

**For All Users:**
- Consistent, predictable behavior
- No surprises in accounting
- Confidence in profit numbers
- Fast, efficient workflow

---

## 🎨 Brilliant UX Design

### 1. Smart COGS Display (Progressive Disclosure)

**Level 1: Simple View (Default)**
```
┌─────────────────────────────────────────┐
│ Blue Dream                              │
│ Qty: 10 @ $150/unit                     │
│                                         │
│ Margin: $125/unit (83%) 💚             │
│                                         │
│ [Edit Name] [Sample] [Remove]           │
└─────────────────────────────────────────┘
```
**What user sees:** Just the margin (green = healthy, amber = okay, red = low)
**What system does:** Auto-calculates COGS, shows result as margin
**Why brilliant:** User doesn't need to think about COGS, just sees profitability

---

**Level 2: Hover State (Contextual Info)**
```
┌─────────────────────────────────────────┐
│ Blue Dream                              │
│ Qty: 10 @ $150/unit                     │
│                                         │
│ Margin: $125/unit (83%) 💚             │
│ ├─ COGS: $25 (Fixed) ✓                 │
│ └─ Auto-calculated                      │
│                                         │
│ [Edit Name] [Sample] [Remove]           │
└─────────────────────────────────────────┘
```
**What user sees:** Hover reveals COGS details
**Why brilliant:** Info available but not cluttering the UI

---

**Level 3: Click to Expand (Power User)**
```
┌─────────────────────────────────────────┐
│ OG Kush                                 │
│ Qty: 75 @ $135/unit                     │
│                                         │
│ Margin: $115/unit (85%) 💚 [⚙️]        │
│ ├─ COGS: $20 (Auto-calc) ✓             │
│ │  └─ Rule: Volume Tier (50-99)        │
│ │  └─ Base: $18-$28 → Applied: -15%    │
│ └─ [Adjust COGS] [Mark Pending]         │
│                                         │
│ [Edit Name] [Sample] [Remove]           │
└─────────────────────────────────────────┘
```
**What user sees:** Click gear icon to see calculation details + actions
**Why brilliant:** Power features hidden until explicitly requested

---

### 2. COGS Adjustment Modal (Smart & Simple)

**Design:** Single modal that adapts based on context

```
┌─────────────────────────────────────────┐
│ Adjust COGS - OG Kush              [×]  │
├─────────────────────────────────────────┤
│                                         │
│ Sale Price: $135/unit                   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 💡 Smart Suggestion                 │ │
│ │ Based on volume (75 units), we      │ │
│ │ recommend: $20/unit                 │ │
│ │                                     │ │
│ │ [Use Suggestion] [Custom Amount]    │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ COGS Range: $18 - $28                   │
│                                         │
│ [$20.00] ←────────●────────→            │
│  $18          $23          $28          │
│                                         │
│ Resulting Margin:                       │
│ $115/unit (85.2%) 💚                   │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ Advanced Options [▼]                │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Cancel] [Apply COGS]                   │
└─────────────────────────────────────────┘
```

**Expanded Advanced Options:**
```
│ ┌─────────────────────────────────────┐ │
│ │ Advanced Options [▲]                │ │
│ ├─────────────────────────────────────┤ │
│ │ ○ Lock COGS now                     │ │
│ │ ○ Mark as pending (finalize later)  │ │
│ │                                     │ │
│ │ Apply to:                           │ │
│ │ ● This item only                    │ │
│ │ ○ All items from this batch         │ │
│ │ ○ Save as rule for future           │ │
│ └─────────────────────────────────────┘ │
```

**Why brilliant:**
- Default view is simple (slider + suggestion)
- Advanced options collapsed by default
- Smart suggestion based on rules
- Visual feedback (margin color)
- One-click to accept suggestion

---

### 3. Totals Panel (Smart Summary)

**Simple View (Default):**
```
┌─────────────────────────────────────────┐
│ Quote Summary                           │
├─────────────────────────────────────────┤
│                                         │
│ 3 items                                 │
│ Total: $4,050                           │
│                                         │
│ Est. Profit: $3,200 (79%) 💚           │
│                                         │
│ [Save as Quote] [Create Sale]           │
└─────────────────────────────────────────┘
```

**Expanded View (Click "Est. Profit"):**
```
┌─────────────────────────────────────────┐
│ Quote Summary                           │
├─────────────────────────────────────────┤
│                                         │
│ 3 items                                 │
│ Total Revenue: $4,050                   │
│                                         │
│ Profit Breakdown:                       │
│ ├─ Total COGS: $850                     │
│ ├─ Total Margin: $3,200                 │
│ └─ Avg Margin: 79% 💚                  │
│                                         │
│ COGS Status:                            │
│ ├─ 2 items locked ✓                     │
│ └─ 1 item pending ⏳                    │
│                                         │
│ [View Details] [Export]                 │
│                                         │
│ [Save as Quote] [Create Sale]           │
└─────────────────────────────────────────┘
```

**Why brilliant:**
- Default shows what matters (profit)
- Click to expand for details
- Visual status indicators
- No clutter

---

### 4. Credit Alert Integration (Contextual)

**Scenario 1: Healthy Credit (No Alert)**
```
[No banner shown - clean interface]
```

**Scenario 2: Approaching Limit (Inline Warning)**
```
┌─────────────────────────────────────────┐
│ Quote Summary                           │
├─────────────────────────────────────────┤
│                                         │
│ Total: $4,050                           │
│ Est. Profit: $3,200 (79%) 💚           │
│                                         │
│ ⚠️ Credit: $11.5K available (77% used) │
│ This sale will use $4K more             │
│                                         │
│ [Save as Quote] [Create Sale]           │
└─────────────────────────────────────────┘
```

**Scenario 3: Over Limit (Blocking)**
```
┌─────────────────────────────────────────┐
│ Quote Summary                           │
├─────────────────────────────────────────┤
│                                         │
│ Total: $4,050                           │
│ Est. Profit: $3,200 (79%) 💚           │
│                                         │
│ ⛔ Credit limit exceeded by $2K         │
│ Cannot create sale                      │
│                                         │
│ [Adjust Quote] [Request Override]       │
└─────────────────────────────────────────┘
```

**Why brilliant:**
- Only shows when relevant
- Integrated into workflow (not separate banner)
- Clear actionable options
- Doesn't interrupt until necessary

---

### 5. Smart Defaults System (Behind the Scenes)

**Decision Tree (Invisible to User):**

```
Item Added to Quote/Sale
    ↓
Is COGS Mode FIXED?
    ├─ YES → Use unitCogs → Lock immediately → Show margin
    └─ NO (RANGE) → Continue
        ↓
    Do COGS Rules Exist?
        ├─ YES → Apply rules → Calculate COGS → Show margin
        └─ NO → Use midpoint → Show margin
            ↓
        Is Payment Terms = CONSIGNMENT?
            ├─ YES → Mark as PENDING → Show estimated range
            └─ NO → Lock COGS → Show margin
```

**User Experience:**
- User adds item
- Sees margin immediately
- System made smart decision
- User can override if needed

---

### 6. Settings (Smart Defaults Configuration)

**Location:** `/settings/cogs-behavior`

**Design:** Card-based, visual, simple

```
┌─────────────────────────────────────────┐
│ COGS Behavior                           │
├─────────────────────────────────────────┤
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🤖 Automation Level                 │ │
│ │                                     │ │
│ │ ○ Manual (Always ask me)            │ │
│ │ ● Smart (Auto-calculate with rules) │ │
│ │ ○ Deferred (Finalize at fulfillment)│ │
│ │                                     │ │
│ │ Current: System auto-calculates     │ │
│ │ COGS using rules. You can override. │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🛡️ Profit Protection                │ │
│ │                                     │ │
│ │ ☑ Warn when margin < 15%            │ │
│ │ ☐ Block sales with margin < 5%     │ │
│ │ ☑ Require approval for low margins  │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 👁️ Visibility                       │ │
│ │                                     │ │
│ │ Show COGS details:                  │ │
│ │ ● On hover (recommended)            │ │
│ │ ○ Always visible                    │ │
│ │ ○ Hidden (show margin only)         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ [Save Settings]                         │
└─────────────────────────────────────────┘
```

**Why brilliant:**
- Visual cards, not dense forms
- Plain language descriptions
- Shows current behavior
- Sensible defaults pre-selected

---

### 7. COGS Rules Builder (Power Feature)

**Location:** `/settings/cogs-rules`

**Design:** Visual rule builder (like pricing rules)

```
┌─────────────────────────────────────────┐
│ COGS Calculation Rules                  │
├─────────────────────────────────────────┤
│                                         │
│ [+ New Rule]                            │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 📦 Volume Discount                  │ │
│ │ Priority: 1 | Active ✓              │ │
│ │                                     │ │
│ │ When: Quantity ≥ 100 units          │ │
│ │ Then: Use minimum COGS              │ │
│ │                                     │ │
│ │ [Edit] [Duplicate] [Delete]         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ⭐ Premium Client Discount          │ │
│ │ Priority: 2 | Active ✓              │ │
│ │                                     │ │
│ │ When: Client tier = "Premium"       │ │
│ │ Then: Min COGS - 10%                │ │
│ │                                     │ │
│ │ [Edit] [Duplicate] [Delete]         │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ 🤝 Consignment Percentage           │ │
│ │ Priority: 3 | Active ✓              │ │
│ │                                     │ │
│ │ When: Payment terms = "Consignment" │ │
│ │ Then: 60% of sale price             │ │
│ │                                     │ │
│ │ [Edit] [Duplicate] [Delete]         │ │
│ └─────────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

**Rule Builder Modal:**
```
┌─────────────────────────────────────────┐
│ Create COGS Rule                   [×]  │
├─────────────────────────────────────────┤
│                                         │
│ Rule Name: [Volume Discount]            │
│                                         │
│ When these conditions are met:          │
│ ┌─────────────────────────────────────┐ │
│ │ Quantity [≥] [100] units            │ │
│ │ [+ Add Condition]                   │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Then calculate COGS as:                 │
│ ┌─────────────────────────────────────┐ │
│ │ [Use minimum COGS ▼]                │ │
│ │                                     │ │
│ │ Options:                            │ │
│ │ • Use minimum COGS                  │ │
│ │ • Use maximum COGS                  │ │
│ │ • Use midpoint                      │ │
│ │ • Min COGS - X%                     │ │
│ │ • Max COGS + X%                     │ │
│ │ • X% of sale price                  │ │
│ │ • Fixed amount                      │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Priority: [1]                           │
│ (Lower numbers apply first)             │
│                                         │
│ [Cancel] [Save Rule]                    │
└─────────────────────────────────────────┘
```

**Why brilliant:**
- Visual cards, not table
- Plain language (not technical)
- Easy to understand logic
- Drag to reorder priority

---

## 🔄 User Workflows (Brilliant UX)

### Workflow 1: Simple Quote (Novice User)

```
1. User selects client
   → Credit info appears (if relevant)
   
2. User adds items from inventory
   → Items appear with green margin indicators
   → User thinks: "Great profit!"
   
3. User reviews totals
   → Sees: "Est. Profit: $3,200 (79%) 💚"
   → User thinks: "Looks good!"
   
4. User clicks "Save as Quote"
   → Success! Quote saved.
   
Total interactions: 4 clicks
COGS complexity: Zero (invisible)
```

### Workflow 2: Adjust COGS (Power User)

```
1. User adds RANGE item
   → Sees margin, notices it's auto-calculated
   
2. User hovers over margin
   → Sees: "COGS: $20 (Auto-calc)"
   → User thinks: "I can get better terms"
   
3. User clicks gear icon
   → Expanded view shows calculation details
   
4. User clicks "Adjust COGS"
   → Modal opens with smart suggestion
   → Slider shows range
   
5. User drags slider to $18
   → Margin updates in real-time
   → Shows: "$117/unit (87%) 💚"
   
6. User clicks "Apply COGS"
   → COGS locked, margin updated
   
Total interactions: 6 clicks
COGS complexity: Revealed progressively
```

### Workflow 3: Consignment Deal (Advanced)

```
1. User adds consignment item
   → System detects payment terms
   → Auto-marks COGS as pending
   → Shows: "Est. Profit: $95-$105 (79-88%)"
   
2. User creates sale
   → COGS marked as pending
   → Invoice created without COGS impact
   
3. Later: User receives vendor invoice
   → Opens sale in fulfillment view
   → Clicks "Finalize COGS"
   → Enters actual COGS from invoice
   → System updates accounting
   
Total interactions: 3 clicks (spread over time)
COGS complexity: Handled automatically
```

---

## 🎯 Implementation Strategy for Parallel Development

### Module Breakdown

**Module A: COGS Calculation Engine (Backend)**
- COGS rules engine
- COGS profiles
- Auto-calculation logic
- Deferred COGS handling
- Database schema

**Module B: Quote/Sales UI (Frontend)**
- QuoteSalesCreatorPage
- Item cards with progressive disclosure
- Smart totals panel
- Credit integration
- Export functionality

**Module C: COGS Management UI (Settings)**
- COGS rules builder
- COGS profiles manager
- Settings page
- Rule testing/preview

### Parallel Development Spec

**Pre-Parallelization:**
- ✅ Backend schema frozen (quotes, sales, cogs_rules, cogs_profiles)
- ✅ tRPC endpoints documented
- ✅ Design system patterns established
- ✅ Clear module boundaries

**Shared Interfaces:**
```typescript
// Shared types (created before parallelization)
interface CogsCalculationResult {
  cogs: number;
  cogsMode: 'FIXED' | 'RANGE';
  cogsRange?: { min: number; max: number };
  calculationMethod: 'FIXED' | 'MIDPOINT' | 'RULE' | 'MANUAL' | 'PENDING';
  appliedRule?: string;
  margin: number;
  marginPercent: number;
}

interface CogsRule {
  id: number;
  name: string;
  conditions: Condition[];
  logicType: 'AND' | 'OR';
  calculationType: 'MIN' | 'MAX' | 'MIDPOINT' | 'MIN_MINUS_PERCENT' | 'SALE_PRICE_PERCENT' | 'FIXED';
  calculationValue?: number;
  priority: number;
  isActive: boolean;
}
```

---

## ✅ Success Criteria (Brilliant UX)

**For Novice Users:**
- ✅ Can create quote in < 5 clicks
- ✅ Never sees "COGS" unless they want to
- ✅ Always sees profit margin
- ✅ Clear visual feedback (colors)

**For Power Users:**
- ✅ Can adjust COGS in 2 clicks
- ✅ Can create custom rules
- ✅ Can defer COGS when needed
- ✅ Full visibility into calculations

**For All Users:**
- ✅ No confusion about profitability
- ✅ No unexpected accounting surprises
- ✅ Fast, efficient workflow
- ✅ Confidence in numbers

---

## 🚀 Implementation Timeline

**Module A (Backend):** 12-14 hours
**Module B (Frontend):** 14-16 hours
**Module C (Settings):** 8-10 hours

**Total:** 34-40 hours (with parallel development: ~20-24 hours wall time)

---

**Status:** 📋 Ready for Parallel Implementation

**Next Step:** Spawn 3 parallel agents with this brilliant UX spec as foundation.

