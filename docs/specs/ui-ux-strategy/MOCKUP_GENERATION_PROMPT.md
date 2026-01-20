# Work Surface Mockup Generation Prompt

> Copy everything below the line and provide to your design AI (Claude, GPT-4, Midjourney, v0.dev, etc.)

---

## TERP Work Surface — High-Fidelity UI Mockup Request

### Your Task

Create 6 high-fidelity UI mockups for TERP, an enterprise ERP system for cannabis/wholesale distribution. The core pattern is called **"Work Surface"** — a keyboard-first, spreadsheet-like interface for high-velocity data entry that replaces slow modal workflows.

**Important**: These mockups must be production-accurate. They will be used as the exact visual specification for development.

---

## Design System Foundation

### Tech Stack Context
- **Framework**: React + shadcn/ui (Radix primitives)
- **Styling**: Tailwind CSS
- **Grid**: AG Grid (data table component)
- **Aesthetic**: Clean enterprise SaaS — think Linear meets Retool

### Color Palette (Dark Mode — Primary)

| Token | HSL | Hex | Usage |
|-------|-----|-----|-------|
| `--background` | 222 47% 6% | `#09090b` | Page background |
| `--card` | 222 47% 8% | `#0a0a0b` | Surface background |
| `--card-elevated` | 222 47% 11% | `#18181b` | Elevated surfaces |
| `--border` | 222 47% 16% | `#27272a` | Borders |
| `--border-hover` | 222 47% 22% | `#3f3f46` | Hover borders |
| `--foreground` | 0 0% 98% | `#fafafa` | Primary text |
| `--muted-foreground` | 222 47% 63% | `#a1a1aa` | Secondary text |
| `--primary` | 217 91% 60% | `#3b82f6` | Accent blue |
| `--success` | 142 76% 36% | `#22c55e` | Success green |
| `--warning` | 38 92% 50% | `#f59e0b` | Warning amber |
| `--destructive` | 0 84% 60% | `#ef4444` | Error red |

### Color Palette (Light Mode — Secondary)

| Token | Hex | Usage |
|-------|-----|-------|
| `--background` | `#ffffff` | Page background |
| `--card` | `#fafafa` | Surface background |
| `--border` | `#e5e5e5` | Borders |
| `--foreground` | `#18181b` | Primary text |
| `--muted-foreground` | `#71717a` | Secondary text |

### Typography

```
Font: Inter (or system-ui fallback)

Context Header Label:  12px, medium (500), uppercase, tracking-wide, muted
Context Header Value:  14px, medium (500), primary
Grid Header:           13px, semibold (600), muted
Grid Cell:             14px, regular (400), primary
Grid Cell (number):    14px, tabular-nums, right-aligned
Status Bar:            13px, medium (500)
Inspector Title:       18px, semibold (600)
Inspector Section:     12px, semibold (600), uppercase, tracking-wide
Inspector Label:       13px, regular (400), muted
Inspector Value:       14px, regular (400), primary
Button:                14px, medium (500)
```

### Spacing & Dimensions

```
Page padding:          24px
Context header height: 72px
Context header padding: 24px horizontal, 16px vertical
Grid row height:       44px
Grid cell padding:     12px horizontal
Grid header height:    48px
Inspector width:       400px (fixed)
Inspector padding:     24px
Status bar height:     52px
Status bar padding:    16px horizontal
Border radius:         6px (buttons, inputs, cards)
Border radius (small): 4px (badges, tags)
Focus ring:            2px solid primary, 2px offset
```

---

## Work Surface Anatomy

Every Work Surface has exactly 4 components in this layout:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  CONTEXT HEADER (sticky top)                                    72px tall   │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                │
│  │ Label          │  │ Label          │  │ Label          │    ┌─────────┐ │
│  │ Value       ▼  │  │ Value       ▼  │  │ Value          │    │ Search 🔍│ │
│  └────────────────┘  └────────────────┘  └────────────────┘    └─────────┘ │
│                                                                             │
├───────────────────────────────────────────────────────┬─────────────────────┤
│                                                       │                     │
│  PRIMARY GRID                                         │  INSPECTOR PANEL    │
│                                                       │     400px wide      │
│  ┌────┬─────────────────┬────────┬────────┬────────┐ │                     │
│  │ ☐  │ Column A      ↕ │ Col B  │ Col C  │ Col D  │ │  ┌───────────────┐  │
│  ├────┼─────────────────┼────────┼────────┼────────┤ │  │ Title      ✕  │  │
│  │ ☐  │ Row data        │ 123    │ $1,234 │ Active │ │  │ Subtitle      │  │
│  │ ☑  │ Selected row    │ 456    │ $2,345 │ Active │ │  ├───────────────┤  │
│  │ ☐  │ Row data        │ 789    │ $3,456 │ Draft  │ │  │ SECTION       │  │
│  │    │ + Add new...    │        │        │        │ │  │ Label: Value  │  │
│  └────┴─────────────────┴────────┴────────┴────────┘ │  │ Label: Value  │  │
│                                                       │  │               │  │
│  • Inline editing in cells                           │  │ [Actions]     │  │
│  • Keyboard navigation (Tab, Enter, Esc)             │  └───────────────┘  │
│  • 44px row height                                   │                     │
│                                                       │                     │
├───────────────────────────────────────────────────────┴─────────────────────┤
│                                                                             │
│  STATUS BAR (sticky bottom)                                     52px tall   │
│  ┌─────────────────┐   ┌─────────────────┐        ┌──────────┐ ┌─────────┐ │
│  │ 3 items selected│   │ $12,450 total   │        │ ✅ Saved │ │Export ▼ │ │
│  └─────────────────┘   └─────────────────┘        └──────────┘ └─────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Component Specifications

**1. Context Header**
- Sticky at top, never scrolls
- Contains batch-level controls: dropdowns for vendor/client/location, date picker
- Search input on right side
- Light border bottom (1px `--border`)
- Background: `--card`

**2. Primary Grid**
- AG Grid style data table
- First column: checkbox for multi-select (48px wide)
- Column headers: sortable (show ↕ icon), filterable
- Row states: default, hover (`--card-elevated`), selected (left border 2px `--primary`), editing (focus ring)
- Last row: "+ Add new..." placeholder in muted text
- Horizontal scroll if needed, vertical virtualized

**3. Inspector Panel**
- Fixed 400px width on right side
- Opens when row selected, slides in from right (200ms ease-out)
- Close button (✕) top right
- Sections with uppercase labels
- Label: Value pairs
- Action buttons at bottom
- Can be closed (Esc key)
- Background: `--card-elevated`

**4. Status Bar**
- Sticky at bottom
- Shows: selection count, calculated totals, save state, action buttons
- Save state indicator: ✅ Saved (green) | 🟡 Saving... (amber spinner) | 🔴 2 errors (red)
- Background: `--card`
- Top border (1px `--border`)

---

## Save State Indicator (Critical Component)

This MUST be visible in every mockup. Only 3 states allowed:

```
┌──────────────────┐
│ ● Saved          │  ← Green dot (#22c55e), appears after successful save
└──────────────────┘

┌──────────────────┐
│ ◐ Saving...      │  ← Amber (#f59e0b), animated spinner, during API call
└──────────────────┘

┌──────────────────┐
│ ▲ 2 errors       │  ← Red (#ef4444), warning triangle, clickable to show errors
└──────────────────┘
```

---

## Required Mockups (Create All 6)

### Mockup 1: Direct Intake — Empty State
**Scenario**: User just started a new intake session, no items added yet

**Context Header**:
- Vendor: "Select vendor..." (placeholder, dropdown closed)
- Location: "Warehouse A" (pre-selected)
- Date: "Jan 20, 2026"
- Search: empty

**Grid**:
- Show empty state illustration (simple line art of boxes/inventory)
- Headline: "No items yet"
- Subtext: "Add products to this intake session"
- Primary button: "Add First Item" (blue, primary style)

**Inspector**: Hidden (no row selected)

**Status Bar**:
- "0 items"
- "$0.00 total"
- "✅ Saved"

---

### Mockup 2: Direct Intake — Active Data Entry
**Scenario**: User actively entering products mid-session, one cell being edited

**Context Header**:
- Vendor: "Green Valley Farms" (selected)
- Location: "Warehouse A"
- Date: "Jan 20, 2026"
- Search: empty

**Grid** (show 6 rows):
| ☐ | Product | Strain | Qty | Unit | Cost/Unit | Total |
|---|---------|--------|-----|------|-----------|-------|
| ☐ | Flower | OG Kush | 10 | lb | $2,400 | $24,000 |
| ☐ | Flower | Blue Dream | 5 | lb | $2,200 | $11,000 |
| ☐ | Flower | Gelato | 8 | lb | $2,600 | $20,800 |
| ☑ | Flower | Sour Diesel | [12] | lb | $2,100 | $25,200 | ← SELECTED, Qty cell has focus ring (being edited, cursor visible)
| ☐ | Concentrate | Live Rosin | 2 | lb | $8,000 | $16,000 |
|   | + Add item... | | | | | | ← Muted placeholder row

**Inspector** (open, showing selected row):
```
Batch #INV-2026-0142                    ✕

Sour Diesel • Flower
────────────────────────────────────────

PRODUCT DETAILS
Strain          Sour Diesel
Category        Flower
Grade           AAA
THC             24.2%
CBD             0.1%

INTAKE DETAILS
Quantity        12 lb
Cost/Unit       $2,100.00
Total           $25,200.00
Location        Warehouse A, Bin C-14

COMPLIANCE
License #       LIC-2024-00892
Test Date       Jan 18, 2026
[View Lab Results]

────────────────────────────────────────
[Delete]                    [Save Changes]
```

**Status Bar**:
- "1 selected"
- "6 items"
- "$97,000.00 total"
- "🟡 Saving..." (show spinner)

---

### Mockup 3: Sales Order — Validation Errors
**Scenario**: Creating order, some fields have validation errors

**Context Header**:
- Client: "Green Leaf Dispensary"
- Ship To: "— Select location —" ← Show with red border/error state
- Order Date: "Jan 20, 2026"
- Search: empty

**Grid** (show 4 rows):
| ☐ | Product | Qty | Available | Unit Price | Total | Status |
|---|---------|-----|-----------|------------|-------|--------|
| ☐ | OG Kush | 5 | 12 | $280 | $1,400 | ✓ |
| 🔴 | Blue Dream | 15 | 8 | $260 | $3,900 | ⚠️ Insufficient | ← Error row: red left border, red background tint
| ☐ | Gelato | 3 | 20 | $300 | $900 | ✓ |
|   | + Add item... | | | | | |

**Inspector** (showing error details):
```
Order Line Error                        ✕

Blue Dream — Quantity Error
────────────────────────────────────────

⚠️ INSUFFICIENT INVENTORY

Requested        15 units
Available        8 units
Shortage         7 units

RESOLUTION OPTIONS
○ Reduce to available (8 units)
○ Backorder remaining (7 units)
○ Remove from order

────────────────────────────────────────
[Cancel]                    [Apply Fix]
```

**Status Bar**:
- "3 items"
- "$6,200.00 total"
- "🔴 2 errors" ← Red, clickable

---

### Mockup 4: Pick & Pack — Bulk Selection with Action Bar
**Scenario**: Fulfillment view, multiple orders selected for batch processing

**Context Header**:
- Status Filter: "Ready to Pick" (dropdown)
- Date Range: "Today" (dropdown)
- Priority: "All" (dropdown)
- Search: empty

**Grid** (show 8 rows, 4 selected):
| ☐ | Order # | Client | Items | Total | Ship Date | Priority |
|---|---------|--------|-------|-------|-----------|----------|
| ☑ | ORD-4521 | Green Leaf | 3 | $1,240 | Today | 🔴 High |
| ☑ | ORD-4522 | Wellness Co | 5 | $2,890 | Today | 🔴 High |
| ☐ | ORD-4519 | Nature's Best | 2 | $680 | Tomorrow | 🟡 Med |
| ☑ | ORD-4523 | City Dispensary | 8 | $4,200 | Today | 🔴 High |
| ☐ | ORD-4520 | Herbal Hub | 4 | $1,560 | Tomorrow | 🟡 Med |
| ☑ | ORD-4524 | MedLeaf | 6 | $3,100 | Today | 🟡 Med |
| ☐ | ORD-4518 | Downtown Disp | 3 | $920 | Jan 22 | 🟢 Low |
| ☐ | ORD-4517 | Valley Green | 2 | $540 | Jan 22 | 🟢 Low |

**Bulk Action Bar** (floating above status bar when items selected):
```
┌─────────────────────────────────────────────────────────────────────────────┐
│  ☑ 4 orders selected    │ [Mark as Picking] [Print Pick Lists] [Assign] │ ✕│
└─────────────────────────────────────────────────────────────────────────────┘
```
- Background: `--card-elevated`
- Primary action: "Mark as Picking" (blue button)
- Secondary actions: outlined buttons
- Close (✕) to deselect all

**Inspector**: Hidden (bulk mode, no single selection)

**Status Bar**:
- "4 of 8 selected"
- "22 items to pick"
- "$11,430.00 total"
- "✅ Saved"

---

### Mockup 5: Client Ledger — Review Surface (Read-Only)
**Scenario**: Viewing client financial history — this is a REVIEW surface, not Work surface

**Visual Difference from Work Surface**:
- Background: Slightly lighter/different tint (`--muted/5` overlay)
- No inline editing indicators
- Grid rows click to view, not edit
- Left accent border on page (4px `--primary/20`)

**Context Header** (simplified, filter-focused):
- Client: "Green Leaf Dispensary" (read-only display, not dropdown)
- Balance Cards row:
  ```
  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
  │ Total Due   │ │ Current     │ │ 30 Days     │ │ 60+ Days    │
  │ $12,450.00  │ │ $4,200.00   │ │ $5,250.00   │ │ $3,000.00   │
  │             │ │ ████████░░  │ │ █████░░░░░  │ │ ███░░░░░░░  │ ← Mini bar charts
  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘
  ```
- Date Filter: "Last 90 days" (dropdown)

**Grid**:
| Date | Type | Reference | Description | Debit | Credit | Balance |
|------|------|-----------|-------------|-------|--------|---------|
| Jan 20 | Invoice | INV-2026-0089 | Order #4521 | $1,240.00 | | $12,450.00 |
| Jan 18 | Payment | PAY-2026-0034 | Check #1892 | | $2,500.00 | $11,210.00 |
| Jan 15 | Invoice | INV-2026-0082 | Order #4498 | $3,890.00 | | $13,710.00 |
| Jan 12 | Credit | CRD-2026-0012 | Return adjustment | | $450.00 | $9,820.00 |
| Jan 10 | Invoice | INV-2026-0076 | Order #4472 | $2,100.00 | | $10,270.00 |

**Inspector** (transaction detail, read-only):
```
Invoice INV-2026-0089                   ✕

$1,240.00 • Due Feb 19, 2026
────────────────────────────────────────

INVOICE DETAILS
Order           #4521
Date            Jan 20, 2026
Terms           Net 30
Status          Outstanding

LINE ITEMS
OG Kush (5 lb)           $1,400.00
Discount (-10%)           -$140.00
Tax                        -$20.00
                        ──────────
Total                   $1,240.00

────────────────────────────────────────
[View Invoice]        [Record Payment]
```

**Status Bar**:
- "47 transactions"
- "Showing Jan - Jan 2026"
- [Export ▼] [Print]

---

### Mockup 6: Mobile View — Inventory Lookup (< 768px)
**Scenario**: Warehouse worker checking inventory on phone

**Dimensions**: 390 x 844px (iPhone 14 Pro)

**Layout**:
- NO grid — use card layout instead
- Single column, stacked cards
- Bottom navigation bar

**Header** (simplified):
```
┌─────────────────────────────────────┐
│ ← Inventory          🔍  ≡         │
│                                     │
│ Warehouse A                      ▼  │
└─────────────────────────────────────┘
```

**Content** (scrollable cards):
```
┌─────────────────────────────────────┐
│ OG Kush                      Flower │
│ 12 lb available         Bin A-14   │
│ ████████████████░░░░  80% capacity │
│                               ▸     │ ← Tap to expand
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Blue Dream                   Flower │
│ 8 lb available          Bin A-22   │
│ ████████░░░░░░░░░░░░  40% capacity │
│                               ▸     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Gelato                       Flower │
│ 20 lb available         Bin B-08   │
│ ████████████████████  100% capacity│
│                               ▸     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ ⚠️ Sour Diesel               Flower │ ← Low stock warning
│ 2 lb available          Bin C-14   │
│ ██░░░░░░░░░░░░░░░░░░  10% LOW     │
│                               ▸     │
└─────────────────────────────────────┘
```

**Expanded Card** (when tapped):
```
┌─────────────────────────────────────┐
│ OG Kush                          ✕  │
│ ─────────────────────────────────── │
│                                     │
│ INVENTORY                           │
│ Available     12 lb                 │
│ Reserved      3 lb                  │
│ Location      Warehouse A, Bin A-14 │
│                                     │
│ PRODUCT                             │
│ Category      Flower                │
│ Grade         AAA                   │
│ THC           26.4%                 │
│                                     │
│ BATCH INFO                          │
│ Batch #       INV-2026-0089         │
│ Intake Date   Jan 15, 2026          │
│ Vendor        Green Valley Farms    │
│                                     │
│ ─────────────────────────────────── │
│    [Transfer]        [Adjust Qty]   │
└─────────────────────────────────────┘
```

**Bottom Navigation**:
```
┌─────────────────────────────────────┐
│  🏠      🔍      📷      👤        │
│ Home   Search   Scan   Account     │
└─────────────────────────────────────┘
```

**Status** (floating pill):
```
                    ┌─────────────────┐
                    │ 23 items • ✅   │
                    └─────────────────┘
```

---

## Visual Details Checklist

For EVERY mockup, ensure:

- [ ] **Save state indicator** visible in status bar
- [ ] **Focus states** shown where applicable (2px ring)
- [ ] **Hover states** on at least one interactive element
- [ ] **Proper text hierarchy** (labels muted, values primary)
- [ ] **Consistent spacing** per specifications
- [ ] **Real data** (cannabis products, realistic prices, actual dates)
- [ ] **Dark mode** as primary (can show light mode variant)
- [ ] **No placeholder text** like "Lorem ipsum"
- [ ] **Proper number formatting** (currency with $, commas for thousands)
- [ ] **Status indicators** (✓ checkmarks, ⚠️ warnings, colored dots)

---

## What NOT to Do

- ❌ No hamburger menus on desktop
- ❌ No cards for main data on desktop (use grids)
- ❌ No bright/saturated colors (keep it muted, professional)
- ❌ No border-radius larger than 8px
- ❌ No decorative elements in data areas
- ❌ No floating action buttons (FABs)
- ❌ No tabs inside the work surface
- ❌ No modals blocking the grid (use inspector instead)
- ❌ No pagination dots (use infinite scroll/virtualization)

---

## Output Specifications

**Resolution**:
- Desktop: 1920 × 1080px
- Mobile: 390 × 844px

**Format**: High-fidelity, pixel-perfect, production-ready

**Deliverables**: 6 separate mockups as specified above

**Style Reference**: The aesthetic should feel like:
- Linear (clean, keyboard-first)
- Notion (information density)
- Retool (enterprise data grids)
- Vercel Dashboard (dark mode, minimalist)

---

## Summary

Create these 6 mockups:
1. **Direct Intake — Empty State** (onboarding moment)
2. **Direct Intake — Active Entry** (mid-workflow, cell editing)
3. **Sales Order — Validation Errors** (error states)
4. **Pick & Pack — Bulk Selection** (multi-select with action bar)
5. **Client Ledger — Review Surface** (read-only variant)
6. **Mobile Inventory** (phone card layout)

Each mockup demonstrates a critical state of the Work Surface pattern. Together, they provide complete visual specification for development.
