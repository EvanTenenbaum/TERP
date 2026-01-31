# TERP Customer Feedback Report - Consolidated

**Meeting Date:** January 29, 2026  
**Duration:** 18 minutes  
**Purpose:** Comprehensive analysis of customer feedback for MVP planning  
**Analysis Date:** January 30, 2026

---

## Executive Summary

This consolidated report combines UX/UI design insights with feature analysis from the customer meeting. The customer's workflow is described as **"Tetris"** - constantly balancing inventory, cash, and client priorities. The key insight: **most of what the customer needs already exists** in the codebase.

### At a Glance

| Category | Count | Effort |
|----------|-------|--------|
| **Quick Wins** (config/styling only) | 6 | ~4 hours |
| **Minor Enhancements** (small code changes) | 5 | ~12 hours |
| **New Features** (significant work) | 4 | ~40+ hours |
| **Deprioritized** (customer said "later") | 3 | N/A |

### Customer's Top Priority

> "My question about the dashboards and what we just talked about was probably the most important one."

---

## Part 1: Quick Wins (Configuration Only)

These items require **no new code** - just configuration changes or enabling existing features.

### QW-1: Create "Owner Dashboard" Preset

**Effort:** 30 minutes  
**Impact:** HIGH - directly addresses customer's #1 priority

The customer wants a dashboard that answers: *"What do I need to focus on today?"*

**Implementation:** Add new preset to `dashboardPresets.ts`:

```typescript
mvp_owner: {
  id: "mvp_owner",
  name: "Owner Dashboard",
  description: "Daily decision support for business owner",
  widgets: [
    { id: "aging-inventory", isVisible: true, size: "md" },
    { id: "available-cash", isVisible: true, size: "md" },
    { id: "inventory-snapshot", isVisible: true, size: "lg" },
    { id: "total-debt", isVisible: true, size: "sm" },
    { id: "client-debt-leaderboard", isVisible: true, size: "sm" },
    { id: "matchmaking-opportunities", isVisible: true, size: "lg" },
  ],
}
```

**Customer Evidence:**
> "Inventory, dashboard, cash... just understanding who we need to pay and what's aging"

---

### QW-2: Enable Aging Inventory Widget by Default

**Effort:** 5 minutes  
**Impact:** HIGH - customer explicitly requested this

**Current State:** `AgingInventoryWidget` exists but is hidden by default.

**Change:** Set `isVisible: true` in the MVP preset.

**Customer Evidence:**
> "highlight of like a window of like the five, 10 oldest things, kind of like focus on me"

---

### QW-3: Enable Client Debt Leaderboard by Default

**Effort:** 5 minutes  
**Impact:** MEDIUM - supports debt visibility

**Current State:** `ClientDebtLeaderboard` exists but is hidden.

**Change:** Set `isVisible: true` in the MVP preset.

**Customer Evidence:**
> "I'm assuming we can see like the quality of their debt somehow"

---

### QW-4: Enable Matchmaking Opportunities Widget

**Effort:** 5 minutes  
**Impact:** MEDIUM - shows overdue clients

**Current State:** `MatchmakingOpportunitiesWidget` shows "overdue reorders" but may be hidden.

**Change:** Set `isVisible: true` in the MVP preset.

**Customer Evidence:**
> "who we haven't seen in a while, who do I need to reach out to"

---

### QW-5: Hide Unnecessary Client Fields via Feature Flags

**Effort:** 15 minutes  
**Impact:** LOW - client creation is infrequent (~4/year)

**Current State:** Feature flags exist for hiding fields.

**Change:** Ensure these flags hide:
- Email field (optional)
- Address fields
- Fax (if present)

**Customer Evidence:**
> "I don't know any of my clients emails"
> "we don't need address information"

---

### QW-6: Deprioritize Calendar Integration

**Effort:** 0 minutes  
**Impact:** Saves development time

**Action:** Remove from near-term roadmap.

**Customer Evidence:**
> "I think that's a later version thing. It's just so easy to open my phone and confirm everyone"

---

## Part 2: Minor Enhancements (Small Code Changes)

These items require **modest code changes** to existing components.

### ME-1: Inventory Category Price Bracket Grouping

**Effort:** ~4 hours  
**Impact:** HIGH - directly requested feature

**Current State:** `InventorySnapshotWidget` shows categories with units and value.

**Enhancement:** Add expandable price bracket sub-grouping within each category.

**Brackets:** $100-200, $200-300, $300-400, $400-500, $500+

**Implementation:**
1. Modify backend query to include price bracket aggregation
2. Add expandable rows in frontend (pattern already exists)

**Customer Evidence:**
> "depths from one to 200, from two to 300, from three to four, just like some basic flower categories"

---

### ME-2: Leaderboard Metric Tooltips

**Effort:** ~3 hours  
**Impact:** MEDIUM - improves understanding

**Current State:** `METRIC_CATEGORIES` has brief descriptions but no tooltips.

**Enhancement:** Add info icons with detailed explanations:

| Metric | Enhanced Tooltip |
|--------|------------------|
| Financial | "Combines total revenue, lifetime value, and your profit margin on this client" |
| Engagement | "How often they order and how recently - high engagement = frequent, recent orders" |
| Reliability | "How quickly they pay their debts - high reliability = fast payment" |
| Growth | "Whether their spending with you is increasing or decreasing year-over-year" |

**Customer Evidence:**
> "We'll need a little explanation on these"
> "what's reliability, like how often they show up or this is their payment behavior actually"

---

### ME-3: Aging Inventory "Focus" Styling

**Effort:** ~2 hours  
**Impact:** MEDIUM - visual emphasis

**Current State:** `AgingInventoryWidget` shows oldest items in standard styling.

**Enhancement:**
- Add amber/red border for critical items (>60 days)
- "Needs Attention" header styling
- Larger card size option

**Customer Evidence:**
> "kind of like focus on me"

---

### ME-4: Payment Permission Check for "Receive Payment"

**Effort:** ~2 hours  
**Impact:** MEDIUM - security/workflow

**Current State:** `WS-001-SPEC` mentions RBAC but may not be fully implemented.

**Enhancement:** Add role check to `ReceivePaymentModal`:
- "Receive Payment" requires owner/admin role
- "Pay Vendor" available to accounting role

**Customer Evidence:**
> "she only needs like low risk farmers. I feel like receiving payments is a little bit higher risk"

---

### ME-5: Simplify Price Category Filtering

**Effort:** ~3 hours  
**Impact:** MEDIUM - usability improvement

**Current State:** Many granular price categories in filtering.

**Enhancement:**
- Add simplified bracket presets ($500-700 ranges)
- Quick filter buttons
- Configurable bracket ranges

**Customer Evidence:**
> "it's a little complicated because there's so many price categories"

---

## Part 3: New Features (Significant Work)

These items require **new development** - they don't exist in the codebase.

### NF-1: Debt Warning System for At-Risk Clients

**Effort:** ~16 hours  
**Impact:** HIGH - customer specifically asked about this  
**Priority:** NOW

**Current State:** No existing implementation found.

**Requirements:**
1. System monitors client debt aging
2. Triggers alert when debt exceeds threshold (configurable)
3. Alert displays on client profile and/or dashboard
4. Optional notification to user
5. Recommendation to pause credit extension

**Suggested Approach:**
- Add debt aging calculation to Client360 or Leaderboard
- Create `DebtWarningWidget` for dashboard
- Add visual indicator on client list

**Open Questions:**
- What threshold triggers warning? (Days overdue? Percentage of credit limit?)
- Should it block orders or just warn?

**Customer Evidence:**
> "you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing"

---

### NF-2: Default Landing Page Preference

**Effort:** ~4 hours  
**Impact:** MEDIUM - convenience feature  
**Priority:** NEXT

**Current State:** `DashboardPreferencesContext` exists but doesn't include landing page.

**Requirements:**
1. User preference for default page on login
2. Options: Dashboard, Inventory, Clients, etc.
3. Setting persists across sessions

**Customer Evidence:**
> "It doesn't really matter what I probably inventory would be where I'd like it to pop up"

---

### NF-3: Store Client Login Names (Metrc)

**Effort:** ~4 hours  
**Impact:** LOW - infrequent use  
**Priority:** NEXT

**Current State:** No field in client schema for login names.

**Requirements:**
1. Add `metrcLoginName` field to client schema
2. Display in client detail view
3. Searchable/filterable

**Customer Evidence:**
> "maybe I need their login names, is this where their login names would be so they can log into the backend?"

---

### NF-4: Metric Consolidation / Simple View

**Effort:** ~8 hours  
**Impact:** MEDIUM - reduces complexity  
**Priority:** LATER

**Current State:** Multiple separate metrics may be overwhelming.

**Requirements:**
1. Review metric overlap
2. Create "Simple View" showing only Master Score + Reliability
3. Toggle to expand for power users

**Customer Evidence:**
> "maybe we can just combine them into, into less things"

---

## Part 4: Business Rules Captured

These are operational insights that inform design decisions.

### BR-1: Client Creation is Infrequent

**Context:** Customer creates ~4 new clients per year.

**Implication:** Client creation UX is low priority vs. daily workflows. Don't over-invest here.

---

### BR-2: One-Time Visitors Use Existing Client Tab

**Rule:** For one-time visitors, use an existing "walk-in" or generic client record.

**Implication:** No need for anonymous order capability.

**Customer Evidence:**
> "if I see Bob every week and Bob brings his buddy Tony one time, then yeah, Tony can just go on Bob's tab"

---

### BR-3: Accounting Staff Has Limited Permissions

**Context:** Accounting staff (Z) handles vendor payments; owner handles receiving client payments.

**Implication:** Role-based access for payment functions is important.

---

### BR-4: The "Tetris" Workflow

**Mental Model:** The customer's daily work is balancing:
- What are you out of?
- What do you have too much of?
- What's about to go bad?
- What am I going to lose money on?

**Implication:** Dashboard should be action-oriented, not report-oriented.

---

## Part 5: Items Confirmed as Already Existing

These items were mentioned in the meeting but **already exist** in the codebase:

| Item | Existing Implementation |
|------|------------------------|
| Aging inventory widget | `AgingInventoryWidget.tsx` |
| Cash on hand display | `AvailableCashWidget.tsx` |
| Scheduled payables | `AvailableCashWidget.tsx` (shows "Scheduled Payables") |
| Total debt | `TotalDebtWidget.tsx` |
| Leaderboard customizable weights | `WeightCustomizer.tsx` |
| Master Score formula | Implemented in LeaderboardPage |
| Quick client creation | `QuickCreateClient.tsx` (WS-011) |
| Client ledger | `FEAT-009-CLIENT-LEDGER-SPEC.md` |
| AR/AP command center | `WS-001/WS-002` specs exist |

---

## Part 6: Deprioritized Items

These items were explicitly deprioritized by the customer:

| Item | Customer Statement |
|------|-------------------|
| Calendar integration | "I think that's a later version thing" |
| Complex metric views | "maybe we can just combine them into less things" |
| Elaborate client creation | "we rarely add plants... like four times a year" |

---

## Implementation Roadmap

### Phase 1: Quick Wins (Day 1)

| Task | Effort | Owner |
|------|--------|-------|
| Create "mvp_owner" dashboard preset | 30 min | Frontend |
| Enable aging-inventory widget | 5 min | Config |
| Enable client-debt-leaderboard | 5 min | Config |
| Enable matchmaking-opportunities | 5 min | Config |
| Verify feature flags hide unused fields | 15 min | Config |

**Total:** ~1 hour

---

### Phase 2: Minor Enhancements (Week 1)

| Task | Effort | Owner |
|------|--------|-------|
| Inventory price bracket grouping | 4 hr | Full-stack |
| Leaderboard metric tooltips | 3 hr | Frontend |
| Aging inventory "focus" styling | 2 hr | Frontend |
| Payment permission check | 2 hr | Full-stack |
| Simplified price filtering | 3 hr | Frontend |

**Total:** ~14 hours

---

### Phase 3: New Features (Week 2-3)

| Task | Effort | Owner |
|------|--------|-------|
| Debt warning system | 16 hr | Full-stack |
| Default landing page preference | 4 hr | Full-stack |
| Client login name field | 4 hr | Full-stack |

**Total:** ~24 hours

---

### Phase 4: Polish (Later)

| Task | Effort | Owner |
|------|--------|-------|
| Metric consolidation / simple view | 8 hr | Frontend |

---

## Open Questions for Customer

| ID | Question | Priority |
|----|----------|----------|
| Q-001 | What threshold should trigger the debt warning system? (Days overdue? Percentage of credit limit?) | High |
| Q-002 | What is the desired aging threshold for inventory alerts? (30 days? 60 days? Configurable?) | High |
| Q-003 | Should "Receive Payment" be completely restricted or just require approval? | Medium |

---

## Key Customer Quotes

| Topic | Quote |
|-------|-------|
| Dashboard priority | "my question about the dashboards was probably the most important one" |
| Workflow metaphor | "this job is like Tetris" |
| Inventory focus | "inventory would be where I'd like it to pop up" |
| Aging highlight | "highlight of like the five, 10 oldest things, kind of like focus on me" |
| Category breakdown | "depths, indoor, out, smalls, candy ends in various price brackets" |
| Simplicity | "there could be even far less options on that sheet" |
| Metric explanations | "We'll need a little explanation on these" |
| Calendar deprioritized | "I think that's a later version thing" |
| Email not needed | "I don't know any of my clients emails" |
| Payment permissions | "receiving payments is a little bit higher risk" |
| Debt warning | "warn us when clients debts are going bad and to stop loaning the money" |

---

## Summary

The customer meeting revealed that **TERP is closer to MVP than expected**. Most requested features already exist - they just need to be enabled, configured, or lightly enhanced.

**Recommended Next Step:** Execute Phase 1 (Quick Wins) immediately. This takes ~1 hour and delivers the highest-impact changes with zero risk.

**Total Effort to MVP Dashboard:**
- Quick Wins: 1 hour
- Minor Enhancements: 14 hours
- New Features: 24 hours
- **Total: ~39 hours**

The only truly new feature with significant scope is the **Debt Warning System** (NF-1), which the customer specifically asked about and should be prioritized after the dashboard configuration is complete.

---

*Consolidated report generated: January 30, 2026*
