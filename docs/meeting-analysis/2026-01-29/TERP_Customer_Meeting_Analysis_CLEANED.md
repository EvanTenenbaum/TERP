# TERP Customer Meeting Analysis Report (Cleaned)

**Meeting Date:** January 29, 2026  
**Duration:** 18 minutes 7 seconds  
**Participants:** Developer (Evan), Customer (Business Operator)  
**Analysis Date:** January 29, 2026

---

## Executive Summary

This customer feedback session covered a walkthrough of the TERP cannabis ERP system. After cross-referencing against the existing codebase and specifications, **17 of 32 items were identified as already implemented, spec'd, or known bugs being tracked**. This cleaned report contains only the **15 genuinely actionable items** requiring new work.

### Key Statistics (After Filtering)

| Metric | Original | After Filtering |
|--------|----------|-----------------|
| Total Items | 32 | 15 |
| Feature Requests | 12 | 7 |
| Business Rules | 8 | 3 |
| UI/UX Feedback | 5 | 3 |
| Bugs/Broken Flows | 3 | 0 (all known) |
| Decisions Made | 4 | 2 |

### Items Removed (Already Exist)

The following items were removed because they already exist in the codebase or have specifications:

- **Inventory bugs** (MEET-001, 003, 028, 032) - Tracked as BUG-040
- **Leaderboard features** (MEET-017, 022, 023) - WeightCustomizer.tsx implemented
- **Aging inventory widget** (MEET-005) - AgingInventoryWidget.tsx implemented
- **Client creation** (MEET-011, 014) - QuickCreateClient.tsx (WS-011) implemented
- **Terminology** (MEET-018, 019) - Already in LeaderboardPage.tsx
- **AR/AP actions** (MEET-024) - WS-001/WS-002 specs exist
- **Client ledger** (MEET-010) - FEAT-009-CLIENT-LEDGER-SPEC.md exists

---

## Genuinely New Items

### MEET-002: Dashboard Inventory Snapshot by Category (Enhancement)

| Field | Value |
|-------|-------|
| **Category** | Feature Request |
| **Domain** | Dashboard |
| **Priority** | Now |
| **Title** | Display inventory counts by flower category on dashboard |
| **Current State** | InventorySnapshotWidget.tsx exists but lacks category/price bracket breakdown |
| **Enhancement Needed** | Add grouping by: Deps, Indoor, Outdoor, Smalls, Candy Ends with price brackets ($100-200, $200-300, $300-400) |
| **Acceptance Criteria** | 1. Dashboard displays inventory counts grouped by category. 2. Each category shows price bracket breakdown. 3. Counts update in real-time. |
| **Evidence** | "And it'd be cool to see like depths, indoor, out, smalls, um, candy ends in various price brackets" |

---

### MEET-004: Dashboard Payables Summary (Verify/Enhancement)

| Field | Value |
|-------|-------|
| **Category** | Feature Request |
| **Domain** | Dashboard |
| **Priority** | Now |
| **Title** | Display payables due and scheduled on dashboard |
| **Current State** | TotalDebtWidget exists - verify if it covers payables |
| **Enhancement Needed** | May need separate "Payables Due" section showing who needs to be paid |
| **Acceptance Criteria** | 1. Dashboard shows "Payables Due" section. 2. Displays total amount owed to vendors. 3. Shows scheduled payment dates. |
| **Evidence** | "On dashboard, on dashboard, I go to dashboard and I can see payables, due payables, scheduled" |

---

### MEET-006: Cash on Hand Display

| Field | Value |
|-------|-------|
| **Category** | Feature Request |
| **Domain** | Dashboard |
| **Priority** | Next |
| **Title** | Display cash on hand on dashboard |
| **Current State** | AvailableCashWidget.tsx exists - verify functionality |
| **Enhancement Needed** | Ensure widget is visible and shows current cash balance |
| **Acceptance Criteria** | 1. Dashboard displays current cash balance. 2. Value updates with payment transactions. |
| **Evidence** | "And then, you know, like how much money's on hand, you know, that kind of stuff." |

---

### MEET-008: Debt Warning System for At-Risk Clients (NEW)

| Field | Value |
|-------|-------|
| **Category** | Feature Request |
| **Domain** | Clients |
| **Priority** | Now |
| **Severity** | HIGH |
| **Title** | Alert system when client debt becomes risky |
| **Current State** | **No existing implementation found** |
| **New Work Required** | Full implementation needed |
| **Acceptance Criteria** | 1. System monitors client debt aging. 2. Triggers alert when debt exceeds threshold (configurable). 3. Alert displays on client profile. 4. Optional notification to user. 5. Recommendation to pause credit extension. |
| **Evidence** | "you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing." |
| **Suggested Approach** | Add to Client360 or Leaderboard with debt aging calculation |

---

### MEET-013: Store Client Login Names (NEW)

| Field | Value |
|-------|-------|
| **Category** | Feature Request |
| **Domain** | Clients |
| **Priority** | Next |
| **Title** | Store client's Metrc/system login names |
| **Current State** | **No existing field found** |
| **New Work Required** | Add field to client schema |
| **Acceptance Criteria** | 1. Client profile has field for login name. 2. Searchable/filterable. 3. Displayed in client detail view. |
| **Evidence** | Context from meeting about tracking client system identifiers |

---

### MEET-020: Add Metric Explanations to Leaderboard (NEW)

| Field | Value |
|-------|-------|
| **Category** | UI/UX Feedback |
| **Domain** | Clients |
| **Priority** | Next |
| **Title** | Add tooltips/explanations for leaderboard metrics |
| **Current State** | METRIC_CATEGORIES has descriptions but may need more detail |
| **Enhancement Needed** | Add help icons/tooltips explaining each metric calculation |
| **Acceptance Criteria** | 1. Each metric column has info icon. 2. Tooltip explains what metric measures. 3. Shows formula or factors considered. |
| **Evidence** | "We'll need a little explanation on these." |

---

### MEET-021: Consider Consolidating Metrics (NEW)

| Field | Value |
|-------|-------|
| **Category** | UI/UX Feedback |
| **Domain** | Clients |
| **Priority** | Later |
| **Title** | Simplify leaderboard by combining metrics |
| **Current State** | Multiple separate metrics may be overwhelming |
| **Enhancement Needed** | UX review to potentially combine related metrics |
| **Acceptance Criteria** | 1. Review metric overlap. 2. Propose consolidated view. 3. Maintain detail access for power users. |
| **Evidence** | "maybe we can just combine them into, into less things" |

---

### MEET-026: Payment Permission Levels (Enhancement)

| Field | Value |
|-------|-------|
| **Category** | Business Rule |
| **Domain** | Payments |
| **Priority** | Now |
| **Title** | Receiving payments requires elevated permissions |
| **Current State** | WS-001-SPEC mentions RBAC but may not be fully implemented |
| **Enhancement Needed** | Verify/implement role-based access for "Receive Payment" action |
| **Acceptance Criteria** | 1. "Receive Payment" action requires elevated permissions. 2. Role-based access control for payment functions. 3. Accounting role can "Pay Vendor" but not "Receive Payment". |
| **Evidence** | "she only needs like low risk farmers. I feel like receiving payments is a little bit higher risk." |

---

### MEET-029: Set Inventory as Default Landing Page (NEW)

| Field | Value |
|-------|-------|
| **Category** | Feature Request |
| **Domain** | General |
| **Priority** | Next |
| **Title** | User preference for default landing page |
| **Current State** | DashboardPreferencesContext exists but may not include landing page |
| **Enhancement Needed** | Add user preference for default page on login |
| **Acceptance Criteria** | 1. User preference for default landing page. 2. Inventory option available. 3. Setting persists across sessions. |
| **Evidence** | "It doesn't really matter what I probably inventory would be where I'd like it to pop up" |

---

### MEET-031: Simplify Price Category Filtering (NEW)

| Field | Value |
|-------|-------|
| **Category** | UI/UX Feedback |
| **Domain** | Inventory |
| **Priority** | Next |
| **Title** | Too many price categories makes filtering complicated |
| **Current State** | Current price category system has many options |
| **Enhancement Needed** | Simplified bracket presets (e.g., $500-700 ranges) |
| **Acceptance Criteria** | 1. Simplified price bracket options. 2. Configurable bracket ranges. 3. Quick filter presets. |
| **Evidence** | "it's a little complicated because there's so many price categories" |

---

## Decisions & Deprioritizations

### MEET-007: Calendar Integration Deprioritized

| Field | Value |
|-------|-------|
| **Category** | Decision Made |
| **Priority** | Later |
| **Decision** | Customer explicitly deprioritized calendar integration |
| **Rationale** | "it's just so easy to open my phone and confirm everyone and drag an appointment around" |
| **Action** | Remove from near-term roadmap |

---

### MEET-015: Client Creation is Infrequent

| Field | Value |
|-------|-------|
| **Category** | Business Rule |
| **Priority** | Later |
| **Context** | Customer creates ~4 new clients per year |
| **Implication** | Client creation UX is low priority vs. daily workflows |

---

### MEET-016: One-Time Visitors Use Existing Client Tab

| Field | Value |
|-------|-------|
| **Category** | Business Rule |
| **Priority** | Now |
| **Rule** | For one-time visitors, use an existing "walk-in" or generic client record |
| **Implication** | No need for anonymous order capability |

---

### MEET-027: Dashboard Requirements Most Important

| Field | Value |
|-------|-------|
| **Category** | Decision Made |
| **Priority** | Now |
| **Decision** | Customer confirmed dashboard configuration is top priority |
| **Evidence** | "my question about the dashboards and what we just talked about was probably the most important one" |

---

## Priority Summary (Cleaned)

| Priority | Count | Items |
|----------|-------|-------|
| Now | 6 | MEET-002, 004, 008, 016, 026, 027 |
| Next | 6 | MEET-006, 013, 020, 029, 031 |
| Later | 3 | MEET-007, 015, 021 |

---

## Follow-up Questions (Reduced)

| ID | Question | Priority |
|----|----------|----------|
| Q-001 | What threshold should trigger the debt warning system? (Days overdue? Percentage of credit limit?) | High |
| Q-002 | What is the desired aging threshold for inventory alerts? (30 days? 60 days? Configurable?) | High |
| Q-003 | Should "Receive Payment" be completely restricted or just require approval? | Medium |

---

*Cleaned report generated: January 29, 2026*  
*17 items removed as already implemented or tracked*
