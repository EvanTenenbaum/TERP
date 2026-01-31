# TERP Homepage Mockups - Design Rationale

**Created:** January 30, 2026  
**Based On:** Customer Meeting Feedback (January 29, 2026)  
**Purpose:** 3 homepage design concepts for MVP dashboard replacement

---

## Design Principles (From Customer Feedback)

All three mockups are built on these core principles extracted from the customer interview:

### 1. The "Tetris" Mental Model

> "This job is like Tetris and it's like: What are you out of? What do you have too much of? What's about to go bad? What am I going to lose money on?"

**Design Implication:** The homepage should answer these 4 questions at a glance, not require analysis.

### 2. Action-Oriented, Not Report-Oriented

> "highlight of like a window of like the five, 10 oldest things, kind of like focus on me"

**Design Implication:** Highlight items needing attention with visual urgency indicators (red/amber). Make everything clickable to take action.

### 3. Simplicity Over Comprehensiveness

> "there could be even far less options on that sheet"
> "maybe we can just combine them into less things"

**Design Implication:** Start minimal. Show only what matters today. Hide complexity behind expandable sections.

### 4. Mobile-First Mindset

> "it's just so easy to open my phone"

**Design Implication:** All designs must work well on mobile with touch-friendly targets and swipeable content.

### 5. Inventory Category + Price Bracket Visibility

> "depths, indoor, out, smalls, candy ends in various price brackets"
> "depths from one to 200, from two to 300, from three to four"

**Design Implication:** Show inventory grouped by category with price bracket breakdown.

---

## Mockup 1: Command Center

**File:** `mockup-1-command-center.html`

### Concept

A traditional dashboard layout optimized for the owner's daily workflow. Sections are organized by priority with the most urgent items at the top.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (sticky)                                             │
├─────────────────────────────────────────────────────────────┤
│  Greeting + "What needs attention today"                     │
├─────────────────────────────────────────────────────────────┤
│  FOCUS ITEMS (3 cards with red/amber/blue urgency)          │
│  - Critical aging inventory                                  │
│  - Client debt warning                                       │
│  - Low stock alert                                           │
├─────────────────────────────────────────────────────────────┤
│  FINANCIAL SNAPSHOT (4 stat cards)                          │
│  Cash on Hand | Due This Week | Available | Owed to You     │
├─────────────────────────────────────────────────────────────┤
│  INVENTORY SNAPSHOT (table with price brackets)             │
│  Category | Units | Value | $100-200 | $200-300 | etc.      │
├─────────────────────────────────────────────────────────────┤
│  CLIENTS TO REACH OUT TO (3 cards)                          │
│  Overdue for orders based on their usual frequency          │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Focus Items Section:** Uses visual urgency (red border, pulse animation) to draw attention to critical items
- **Financial Stats:** 4 key numbers visible at a glance
- **Inventory Table:** Full table with price bracket columns (hidden on mobile for space)
- **Client Engagement:** Shows clients who are overdue for orders

### Mobile Behavior

- Focus items stack vertically
- Financial stats remain in 2x2 grid
- Inventory table scrolls horizontally, hides price bracket columns
- Bottom navigation bar for quick access

### Pros

- Comprehensive view of all business areas
- Familiar dashboard pattern
- Good for users who want to see everything

### Cons

- More scrolling required
- May feel overwhelming on first load
- Less focused than Mockup 2

### Existing Components Used

| Section | TERP Component |
|---------|----------------|
| Focus Items | `AgingInventoryWidget` (enhanced) |
| Financial Stats | `AvailableCashWidget`, `TotalDebtWidget` |
| Inventory Table | `InventorySnapshotWidget` (enhanced with price brackets) |
| Client Engagement | `MatchmakingOpportunitiesWidget` |

---

## Mockup 2: Tetris Minimal

**File:** `mockup-2-tetris-minimal.html`

### Concept

Directly maps to the customer's "Tetris" mental model with 4 quadrants answering the 4 key questions. Minimal, focused, action-oriented.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (minimal)                                            │
├─────────────────────────────────────────────────────────────┤
│  "What needs attention today?" (centered headline)          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ What are you        │  │ Too much of?        │          │
│  │ OUT OF?             │  │ (Overstocked)       │          │
│  │ [Low stock items]   │  │ [High stock items]  │          │
│  └─────────────────────┘  └─────────────────────┘          │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │ About to go BAD?    │  │ LOSING MONEY on?    │          │
│  │ (Aging inventory)   │  │ (Debt & payments)   │          │
│  │ [Oldest items]      │  │ [Overdue clients]   │          │
│  └─────────────────────┘  └─────────────────────┘          │
├─────────────────────────────────────────────────────────────┤
│  QUICK STATS BAR (4 numbers inline)                         │
├─────────────────────────────────────────────────────────────┤
│  QUICK ACTIONS (4 buttons)                                   │
│  New Order | Receive Payment | Pay Vendor | Reports         │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **4 Quadrants:** Each answers one of the customer's daily questions
- **Color-Coded Borders:** Blue (low stock), Amber (overstock), Red (aging), Purple (money loss)
- **Action Buttons in Each Card:** "View →", "Push These First →", "Discount & Move →", "Collect Payments →"
- **Quick Actions:** Most common tasks accessible with one tap

### Mobile Behavior

- Quadrants stack vertically (1 column)
- Stats bar scrolls horizontally
- Quick actions in 2x2 grid
- Bottom navigation with "Today" as home

### Pros

- Directly maps to customer's mental model
- Extremely focused and scannable
- Clear call-to-action for each problem area
- Minimal cognitive load

### Cons

- Less detail visible without clicking through
- May feel too sparse for power users
- Inventory category breakdown not visible on main page

### Existing Components Used

| Section | TERP Component |
|---------|----------------|
| Out of (Low Stock) | Custom (new logic needed) |
| Too Much Of | Custom (new logic needed) |
| About to Go Bad | `AgingInventoryWidget` |
| Losing Money On | `ClientDebtLeaderboard` |
| Quick Stats | `AvailableCashWidget`, `TotalDebtWidget` |

---

## Mockup 3: Card Stack (Mobile-First)

**File:** `mockup-3-card-stack.html`

### Concept

Optimized for mobile use with swipeable cards and collapsible sections. Prioritizes vertical scrolling and touch interactions.

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Header (compact, 56px)                                      │
├─────────────────────────────────────────────────────────────┤
│  HERO STATS (swipeable on mobile, grid on desktop)          │
│  [Available] [Due Soon] [Owed] [Inventory]                  │
├─────────────────────────────────────────────────────────────┤
│  ALERTS CARD (expandable list)                              │
│  ┌─ 3 items need attention ─────────────────────────┐       │
│  │ • 5 items aging over 30 days                     │       │
│  │ • 2 clients with overdue payments                │       │
│  │ • Candy Ends running low                         │       │
│  └──────────────────────────────────────────────────┘       │
├─────────────────────────────────────────────────────────────┤
│  INVENTORY BY CATEGORY (collapsible accordions)             │
│  ▼ Deps (142 units)                                         │
│    [$100-200: 45] [$200-300: 52] [$300-400: 32] [$400+: 13] │
│  ▶ Indoor (89 units)                                        │
│  ▶ Outdoor (67 units)                                       │
│  ▶ Smalls (54 units)                                        │
│  ▼ Candy Ends (12 units) [Low Stock]                        │
├─────────────────────────────────────────────────────────────┤
│  REACH OUT (swipeable cards)                                │
│  [Client 1] [Client 2] [Client 3] →                         │
├─────────────────────────────────────────────────────────────┤
│  FAB (floating action button for quick actions)             │
└─────────────────────────────────────────────────────────────┘
```

### Key Features

- **Swipeable Stat Cards:** Horizontal scroll on mobile, grid on desktop
- **Unified Alerts Card:** All urgent items in one expandable list
- **Collapsible Inventory Accordions:** Tap to expand and see price brackets
- **Swipeable Client Cards:** Horizontal scroll through clients to contact
- **Floating Action Button:** Quick access to create new order

### Mobile Behavior

- Native mobile patterns (swipe, tap to expand)
- Compact header (56px vs 64px)
- FAB for primary action
- Safe area insets for notched phones

### Pros

- Best mobile experience
- Native-feeling interactions
- Progressive disclosure (expand what you need)
- Fast to scan on small screens

### Cons

- Requires more taps to see full detail
- Desktop version may feel too mobile-centric
- Accordions can be tedious if you need to see all categories

### Existing Components Used

| Section | TERP Component |
|---------|----------------|
| Hero Stats | `AvailableCashWidget`, `TotalDebtWidget` |
| Alerts | `AgingInventoryWidget`, `ClientDebtLeaderboard` |
| Inventory Accordions | `InventorySnapshotWidget` (restructured) |
| Reach Out | `MatchmakingOpportunitiesWidget` |

---

## Comparison Matrix

| Feature | Mockup 1 | Mockup 2 | Mockup 3 |
|---------|----------|----------|----------|
| **Primary Metaphor** | Dashboard | Tetris Questions | Card Stack |
| **Information Density** | High | Low | Medium |
| **Mobile Experience** | Good | Good | Excellent |
| **Desktop Experience** | Excellent | Good | Good |
| **Scrolling Required** | More | Less | Medium |
| **Clicks to Detail** | 1 | 1-2 | 1-2 |
| **New Components Needed** | 1 | 2 | 0 |
| **Implementation Effort** | Medium | Medium | Low |
| **Best For** | Power users | Quick decisions | Mobile-first users |

---

## Recommendation

**For MVP:** Start with **Mockup 3 (Card Stack)** because:

1. **Lowest implementation effort** - Uses existing component patterns
2. **Best mobile experience** - Matches customer's phone-first workflow
3. **Progressive disclosure** - Shows summary, expands for detail
4. **Familiar patterns** - Accordions and swipeable cards are well-understood

**For Future:** Consider **Mockup 2 (Tetris Minimal)** as an alternative view mode that users can toggle to. It directly maps to the customer's mental model and could be a powerful "quick glance" mode.

---

## Implementation Notes

### Shared Across All Mockups

- **Color System:** Uses existing TERP color tokens (primary, destructive, warning, success)
- **Typography:** Inter font family, consistent with TERP design system
- **Card Component:** Uses existing `Card`, `CardHeader`, `CardContent` patterns
- **Icons:** Lucide icons (already in TERP)
- **Responsive Breakpoints:** `md:` (768px) for tablet, `lg:` (1024px) for desktop

### New Components Needed

| Component | Mockups | Effort |
|-----------|---------|--------|
| Focus Items Card | 1 | 4h |
| Tetris Quadrant Card | 2 | 6h |
| Collapsible Category Accordion | 3 | 3h |
| Swipeable Card Container | 3 | 2h |
| Alert List Card | 3 | 2h |

### Backend Enhancements Needed

| Feature | Mockups | Effort |
|---------|---------|--------|
| Inventory by price bracket | All | 4h |
| Low stock detection | 1, 2 | 2h |
| Overstock detection | 2 | 2h |
| Client order frequency analysis | All | 4h |

---

## How to View Mockups

1. Open each HTML file in a browser
2. Resize browser window to see responsive behavior
3. Use Chrome DevTools device mode for mobile preview

**Files:**
- `mockup-1-command-center.html` - Traditional dashboard
- `mockup-2-tetris-minimal.html` - 4-quadrant Tetris view
- `mockup-3-card-stack.html` - Mobile-first card stack

---

*Design rationale document created: January 30, 2026*
