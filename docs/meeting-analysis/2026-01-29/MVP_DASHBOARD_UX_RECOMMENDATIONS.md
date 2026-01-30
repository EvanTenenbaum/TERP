# MVP Dashboard UX/UI Design Recommendations

**Source:** Customer Meeting 2026-01-29  
**Purpose:** Extract UX/UI design insights to inform MVP dashboard using existing components  
**Analysis Date:** January 29, 2026

---

## Executive Summary

The customer's workflow is described as **"Tetris"** - constantly balancing multiple competing priorities. The dashboard should serve as a **decision support cockpit** that answers the daily question: *"What do I need to focus on today?"*

The good news: **Most required widgets already exist**. The MVP dashboard can be achieved primarily through **configuration and minor enhancements** rather than new development.

---

## Customer's Mental Model

### The "Tetris" Workflow

The customer explicitly described their daily workflow:

> "This job is like Tetris and it's like:
> - What are you out of?
> - What do you have too much of?
> - What's about to go bad?
> - What am I going to lose money on?"

This reveals the dashboard should be **action-oriented**, highlighting items requiring attention rather than just displaying metrics.

### Information Priority (From Transcript)

When asked "What's the first thing you want to see?", the customer listed:

1. **Inventory** - "that's the thing we scroll through the most"
2. **Who we need to pay** - payables visibility
3. **What's aging** - old inventory needing attention
4. **Cash on hand** - financial position

---

## Existing Widgets Mapped to Customer Needs

| Customer Need | Existing Widget | Status | Notes |
|---------------|-----------------|--------|-------|
| Inventory snapshot | `InventorySnapshotWidget` | ✅ Exists | Needs category/price bracket enhancement |
| Aging inventory | `AgingInventoryWidget` | ✅ Exists | Shows 5-10 oldest items, exactly what customer asked for |
| Cash on hand | `AvailableCashWidget` | ✅ Exists | Shows Cash on Hand, Scheduled Payables, Available Cash |
| Payables due | `AvailableCashWidget` | ✅ Exists | "Scheduled Payables" section already present |
| Total debt | `TotalDebtWidget` | ✅ Exists | Shows total outstanding debt |
| Client debt quality | `ClientDebtLeaderboard` | ✅ Exists | Hidden by default, should enable |
| Overdue clients | `MatchmakingOpportunitiesWidget` | ✅ Exists | Shows "overdue reorders" |

### Widgets NOT Needed for MVP

Based on customer feedback, these can remain hidden or deprioritized:

- Calendar integration - *"that's a later version thing"*
- Workflow Queue - not mentioned
- Sales Comparison - not mentioned as priority
- Profitability charts - not mentioned as priority

---

## Recommended MVP Dashboard Layout

### Proposed Widget Configuration

Based on the customer's stated priorities, here's the recommended default widget order:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        MVP DASHBOARD LAYOUT                              │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐               │
│  │   AGING INVENTORY       │  │   AVAILABLE CASH        │               │
│  │   (AgingInventoryWidget)│  │   (AvailableCashWidget) │               │
│  │                         │  │                         │               │
│  │   "Focus on me" items   │  │   - Cash on Hand        │               │
│  │   5-10 oldest batches   │  │   - Scheduled Payables  │               │
│  │   Click to view in inv  │  │   - Available Cash      │               │
│  └─────────────────────────┘  └─────────────────────────┘               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                    INVENTORY SNAPSHOT                                ││
│  │                    (InventorySnapshotWidget)                         ││
│  │                                                                      ││
│  │   Category breakdown with units and value                            ││
│  │   [Enhancement: Add price bracket grouping]                          ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
│  ┌─────────────────────────┐  ┌─────────────────────────┐               │
│  │   TOTAL DEBT            │  │   CLIENT DEBT LEADERS   │               │
│  │   (TotalDebtWidget)     │  │   (ClientDebtLeaderboard)│              │
│  │                         │  │                         │               │
│  │   Total owed to you     │  │   Who owes the most     │               │
│  └─────────────────────────┘  └─────────────────────────┘               │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐│
│  │                 MATCHMAKING OPPORTUNITIES                            ││
│  │                 (MatchmakingOpportunitiesWidget)                     ││
│  │                                                                      ││
│  │   "Overdue reorders" - clients who haven't ordered recently          ││
│  │   Addresses: "who we haven't seen in a while"                        ││
│  └─────────────────────────────────────────────────────────────────────┘│
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Implementation: New Dashboard Preset

Add a new preset to `dashboardPresets.ts`:

```typescript
mvp_owner: {
  id: "mvp_owner",
  name: "Owner Dashboard",
  description: "Daily decision support for business owner",
  widgets: [
    { id: "aging-inventory", isVisible: true, isExpanded: false, size: "md" },
    { id: "available-cash", isVisible: true, isExpanded: false, size: "md" },
    { id: "inventory-snapshot", isVisible: true, isExpanded: false, size: "lg" },
    { id: "total-debt", isVisible: true, isExpanded: false, size: "sm" },
    { id: "client-debt-leaderboard", isVisible: true, isExpanded: false, size: "sm" },
    { id: "matchmaking-opportunities", isVisible: true, isExpanded: false, size: "lg" },
    // Hidden but available
    { id: "sales-by-client", isVisible: false, isExpanded: false },
    { id: "cash-flow", isVisible: false, isExpanded: false },
    { id: "profitability", isVisible: false, isExpanded: false },
    { id: "sales-comparison", isVisible: false, isExpanded: false },
  ],
}
```

---

## UX Design Principles Extracted

### 1. Action-Oriented, Not Report-Oriented

The customer doesn't want to "analyze" data - they want to know **what to do**. Widgets should:
- Highlight items needing attention (red/amber indicators)
- Be clickable to take action
- Show "focus on me" items prominently

**Evidence:**
> "highlight of like a window of like the five, 10 oldest things, you know, kind of like focus on me"

### 2. Simplicity Over Comprehensiveness

The customer explicitly requested fewer options:

> "there could be even far less options on that sheet"
> "maybe we can just combine them into, into less things"

**Implication:** Don't show all widgets by default. Start minimal, let users add.

### 3. Quick Glance, Then Drill Down

The dashboard should answer questions at a glance, with click-through for details:

> "I go to dashboard and I can see payables, due payables, scheduled"

**Implication:** Summary numbers with links to detail pages.

### 4. Mobile-First Mindset

The customer prefers phone for some tasks:

> "it's just so easy to open my phone and confirm everyone"

**Implication:** Dashboard should work well on mobile, prioritize vertical layout.

---

## Specific UI Enhancements (Minimal Work)

### Enhancement 1: Inventory Category Breakdown

**Current:** InventorySnapshotWidget shows categories with units and value.

**Enhancement:** Add price bracket sub-grouping within categories.

**Customer Quote:**
> "depths from one to 200, from two to 300, from three to four, you know, just like some basic flower categories"

**Implementation:**
- Add expandable rows showing price brackets
- Brackets: $100-200, $200-300, $300-400, $400-500, $500+
- Already has expand/collapse UI pattern

**Effort:** ~4 hours (backend query + frontend display)

### Enhancement 2: Enable Hidden Widgets by Default

**Current:** Several useful widgets are hidden by default in the "operations" preset.

**Change:** Enable these in the new MVP preset:
- `aging-inventory` → **Enable** (customer explicitly requested)
- `client-debt-leaderboard` → **Enable** (supports debt quality visibility)
- `matchmaking-opportunities` → **Enable** (shows overdue clients)

**Effort:** ~30 minutes (config change)

### Enhancement 3: Aging Inventory "Focus" Styling

**Current:** AgingInventoryWidget shows oldest items.

**Enhancement:** Add visual emphasis to make it feel like "focus on me":
- Larger card size
- Amber/red border for critical items
- "Needs Attention" header

**Effort:** ~2 hours (CSS/styling)

---

## Clients Page UX Feedback

### Hide Unnecessary Fields

**Customer Quote:**
> "I just like, I don't know any of my clients emails"
> "we don't need address information"

**Current State:** QuickCreateClient already supports minimal fields.

**Recommendation:** Ensure the full client form also hides non-essential fields by default. Use feature flags to hide:
- Email (optional)
- Address fields
- Fax (if present)

### Sortable Columns Requested

**Customer Quote:**
> "who we haven't seen in a while, who do I need to reach out to"
> "overdue for an order or overdue for a drop"

**Current State:** `daysSinceLastPurchase` exists in PurchasePatternsWidget.

**Recommendation:** Add "Days Since Last Order" as a sortable column on Clients list page.

---

## Leaderboard UX Feedback

### Add Metric Explanations

**Customer Quote:**
> "We'll need a little explanation on these"
> "what's reliability, like how often they show up or this is their payment behavior actually"

**Current State:** METRIC_CATEGORIES has brief descriptions but no tooltips.

**Recommendation:** Add info icons with tooltips explaining each metric:

| Metric | Current Description | Enhanced Tooltip |
|--------|--------------------|--------------------|
| Financial | "Revenue, LTV, margins" | "Combines total revenue, lifetime value, and your profit margin on this client" |
| Engagement | "Order frequency, recency" | "How often they order and how recently - high engagement = frequent, recent orders" |
| Reliability | "Payment behavior" | "How quickly they pay their debts - high reliability = fast payment" |
| Growth | "YoY trends" | "Whether their spending with you is increasing or decreasing year-over-year" |

**Effort:** ~3 hours (add Tooltip components)

### Consider Metric Consolidation

**Customer Quote:**
> "maybe we can just combine them into, into less things"

**Recommendation:** For MVP, keep current metrics but:
- Default to showing only Master Score + Reliability
- Let users expand to see all metrics
- Consider "Simple View" toggle

---

## AR/AP Page UX Feedback

### Role-Based Quick Actions

**Customer Quote:**
> "she only needs like low risk farmers. I feel like receiving payments is a little bit higher risk"

**Context:** Accounting staff (Z) handles vendor payments, owner handles receiving client payments.

**Recommendation:** 
- "Receive Payment" button should require elevated permissions
- "Pay Vendor" can be available to accounting role
- Add role check to ReceivePaymentModal

**Effort:** ~2 hours (add permission check)

---

## Summary: MVP Dashboard Implementation Plan

### Zero-Code Changes (Configuration Only)

1. Create new "mvp_owner" dashboard preset
2. Enable `aging-inventory`, `client-debt-leaderboard`, `matchmaking-opportunities` by default
3. Set `aging-inventory` and `available-cash` as top widgets

### Minimal Code Changes (~10 hours total)

| Enhancement | Effort | Impact |
|-------------|--------|--------|
| Inventory price bracket grouping | 4h | High - directly requested |
| Leaderboard metric tooltips | 3h | Medium - improves understanding |
| Aging inventory "focus" styling | 2h | Medium - visual emphasis |
| Payment permission check | 2h | Medium - security/workflow |

### Deferred (Not MVP)

- Calendar integration (customer deprioritized)
- Default landing page preference (nice-to-have)
- Metric consolidation (needs more design work)
- Client login name field (infrequent use case)

---

## Appendix: Key Customer Quotes

| Topic | Quote | Timestamp |
|-------|-------|-----------|
| Dashboard priority | "my question about the dashboards and what we just talked about was probably the most important one" | 16:22 |
| Workflow metaphor | "this job is like Tetris" | 02:10 |
| Inventory focus | "inventory would be where I'd like it to pop up" | 01:52 |
| Aging highlight | "highlight of like a window of like the five, 10 oldest things, kind of like focus on me" | 05:07 |
| Category breakdown | "depths, indoor, out, smalls, candy ends in various price brackets" | 04:28 |
| Simplicity | "there could be even far less options on that sheet" | 11:35 |
| Metric explanations | "We'll need a little explanation on these" | 12:34 |
| Calendar deprioritized | "I think that's a later version thing" | 05:34 |
| Email not needed | "I don't know any of my clients emails" | 08:04 |
| Payment permissions | "receiving payments is a little bit higher risk" | 15:57 |

---

*UX/UI Analysis completed: January 29, 2026*
