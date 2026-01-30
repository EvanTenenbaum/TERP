# TERP Customer Meeting Analysis Report

**Meeting Date:** January 29, 2026  
**Duration:** 18 minutes 7 seconds  
**Participants:** Developer (Evan), Customer (Business Operator)  
**Analysis Date:** January 29, 2026

---

## Executive Summary

This customer feedback session covered a walkthrough of the TERP cannabis ERP system, focusing on dashboard requirements, client management, leaderboard functionality, and accounting features. The meeting yielded **32 actionable items** across feature requests, workflow changes, business rules, bugs, and UI/UX feedback.

### Key Statistics

| Metric | Count |
|--------|-------|
| Total Items Extracted | 32 |
| Feature Requests | 12 |
| Business Rules | 8 |
| UI/UX Feedback | 5 |
| Bugs/Broken Flows | 2 |
| Decisions Made | 4 |
| Terminology Changes | 1 |

### Top 5 Critical Items

1. **MEET-001** - Inventory page not loading (Bug - P1 Critical)
2. **MEET-002** - Dashboard should show inventory snapshot by category (Feature - Now)
3. **MEET-003** - Spreadsheet View not yet functional (Bug - P2 High)
4. **MEET-008** - Debt warning system for at-risk clients (Feature - Now)
5. **MEET-005** - Aging inventory highlight on dashboard (Feature - Now)

### Overall Findings

The customer expressed satisfaction with the direction of the product, particularly the leaderboard scoring system and AR/AP functionality. The primary blockers are inventory-related issues that prevent full system utilization. The customer's workflow centers heavily on inventory management, aging analysis, and payment tracking. Calendar integration was explicitly deprioritized in favor of core inventory and financial features.

---

## Timestamped Topic Index

| Timestamp Range | Topic | Domain |
|-----------------|-------|--------|
| 00:00 - 01:35 | Meeting Introduction & Objectives | General |
| 01:35 - 05:15 | Dashboard & Homepage Requirements | Dashboard |
| 05:16 - 05:50 | Calendar Integration Discussion | Admin |
| 05:50 - 09:40 | Clients Page Review | Clients |
| 09:42 - 14:15 | Leaderboard & Client Scoring | Clients |
| 14:18 - 16:10 | Photography Module & AR/AP | Payments |
| 16:07 - 17:05 | Inventory & Spreadsheet View | Inventory |
| 17:05 - 18:07 | Meeting Closing | General |

---

## Full Extraction Ledger

### MEET-001: Inventory Page Fails to Load

| Field | Value |
|-------|-------|
| **ID** | MEET-001 |
| **Timestamp** | 00:00 - 01:35 |
| **Category** | Bug/Broken Flow |
| **Domain** | Inventory |
| **Priority** | Now |
| **Severity** | P1-Critical |
| **Title** | Inventory page shows loading spinner indefinitely |
| **Meaning** | When navigating to the Inventory page, the system displays a loading spinner but never loads the inventory data. This blocks the customer's primary workflow of reviewing and managing inventory. |
| **Acceptance Criteria** | 1. Inventory page loads within 3 seconds. 2. All batches display with correct counts. 3. Filters (Status, Category) function correctly. 4. Batch count and value totals display accurately. |
| **Evidence** | Visual context from video frame shows Inventory page with spinner, "Batches: 0, Live: 0, Value: $0.00" |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/Inventory.tsx` |

---

### MEET-002: Dashboard Inventory Snapshot by Category

| Field | Value |
|-------|-------|
| **ID** | MEET-002 |
| **Timestamp** | 04:28 - 04:50 |
| **Category** | Feature Request |
| **Domain** | Dashboard |
| **Priority** | Now |
| **Title** | Display inventory counts by flower category on dashboard |
| **Meaning** | Customer wants to see inventory broken down by product categories (deps, indoor, outdoor, smalls, candy ends) with price bracket groupings directly on the dashboard for quick daily assessment. |
| **Acceptance Criteria** | 1. Dashboard displays inventory counts grouped by category. 2. Categories include: Deps, Indoor, Outdoor, Smalls, Candy Ends. 3. Each category shows price bracket breakdown (e.g., $100-200, $200-300, $300-400). 4. Counts update in real-time with inventory changes. |
| **Evidence** | "And it'd be cool to see like depths, indoor, out, smalls, um, candy ends in various price brackets, you know, kind of like, that'd be cool. You know, depths from one to 200, from two to 300, from three to four, you know, just like some basic flower categories that we could create." |
| **Dependencies** | MEET-001 (Inventory must load) |
| **UI Reference** | `/client/src/pages/Dashboard.tsx`, `/client/src/pages/DashboardV3.tsx` |

---

### MEET-003: Spreadsheet View Not Functional

| Field | Value |
|-------|-------|
| **ID** | MEET-003 |
| **Timestamp** | 16:43 - 16:55 |
| **Category** | Bug/Broken Flow |
| **Domain** | Inventory |
| **Priority** | Now |
| **Severity** | P2-High |
| **Title** | Spreadsheet View page not working |
| **Meaning** | The Spreadsheet View feature, which would allow Excel-like interaction with inventory data, is not yet functional. Developer acknowledged this is pending while focusing on core inventory functionality. |
| **Acceptance Criteria** | 1. Spreadsheet View page loads successfully. 2. Inventory data displays in tabular format. 3. Inline editing capabilities function. 4. Sort and filter operations work correctly. |
| **Evidence** | "spread your spreadsheet view. I assume isn't working yet. Not yet. It's coming. It really is." |
| **Dependencies** | MEET-001 (Inventory must load) |
| **UI Reference** | `/client/src/pages/SpreadsheetViewPage.tsx` |

---

### MEET-004: Dashboard Payables Summary

| Field | Value |
|-------|-------|
| **ID** | MEET-004 |
| **Timestamp** | 04:16 - 04:27 |
| **Category** | Feature Request |
| **Domain** | Dashboard |
| **Priority** | Now |
| **Title** | Display payables due and scheduled on dashboard |
| **Meaning** | Customer wants quick visibility into who needs to be paid, with due payables and scheduled payments shown on the main dashboard. |
| **Acceptance Criteria** | 1. Dashboard shows "Payables Due" section. 2. Displays total amount owed. 3. Shows scheduled payment dates. 4. Links to full AR/AP for details. |
| **Evidence** | "On dashboard, on dashboard, I go to dashboard and I can see payables, due payables, scheduled office owned total units on hand." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/Dashboard.tsx` |

---

### MEET-005: Aging Inventory Highlight

| Field | Value |
|-------|-------|
| **ID** | MEET-005 |
| **Timestamp** | 05:02 - 05:14 |
| **Category** | Feature Request |
| **Domain** | Dashboard |
| **Priority** | Now |
| **Title** | Highlight 5-10 oldest inventory items on dashboard |
| **Meaning** | Customer needs quick visibility into aging inventory that requires attention. A "focus on me" section showing the oldest items would help prioritize daily activities. |
| **Acceptance Criteria** | 1. Dashboard displays "Aging Inventory" section. 2. Shows 5-10 oldest items by date received. 3. Displays age in days. 4. Includes product name and quantity. 5. Links to inventory detail. |
| **Evidence** | "highlight of like a window of like the five, 10 oldest things, you know, kind of like focus on me. Great." |
| **Dependencies** | MEET-001 (Inventory must load) |
| **UI Reference** | `/client/src/pages/Dashboard.tsx` |

---

### MEET-006: Cash on Hand Display

| Field | Value |
|-------|-------|
| **ID** | MEET-006 |
| **Timestamp** | 04:51 - 04:55 |
| **Category** | Feature Request |
| **Domain** | Dashboard |
| **Priority** | Next |
| **Title** | Display cash on hand on dashboard |
| **Meaning** | Customer wants to see current cash balance/cash on hand directly on the dashboard for quick financial overview. |
| **Acceptance Criteria** | 1. Dashboard displays current cash balance. 2. Value updates with payment transactions. 3. Clearly labeled as "Cash on Hand". |
| **Evidence** | "And then, you know, like how much money's on hand, you know, that kind of stuff." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/Dashboard.tsx` |

---

### MEET-007: Calendar Integration Deprioritized

| Field | Value |
|-------|-------|
| **ID** | MEET-007 |
| **Timestamp** | 05:16 - 05:46 |
| **Category** | Decision Made |
| **Domain** | Admin |
| **Priority** | Later |
| **Title** | Calendar integration is a later version feature |
| **Meaning** | Customer explicitly stated that calendar integration is not needed for MVP. They prefer using their phone calendar for scheduling as it's more convenient for mobile use. |
| **Acceptance Criteria** | N/A - Feature deprioritized |
| **Evidence** | "I mean, I think it's just mostly, I think that's a later version thing. I think that's, it's just so easy to open my phone and confirm everyone and drag an appointment around or make it bigger or smaller. All with the touch of a finger." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/SchedulingPage.tsx` |

---

### MEET-008: Debt Warning System for At-Risk Clients

| Field | Value |
|-------|-------|
| **ID** | MEET-008 |
| **Timestamp** | 11:21 - 11:27 |
| **Category** | Feature Request |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Alert system when client debt becomes risky |
| **Meaning** | Customer wants an automated warning system that alerts when a client's debt is going bad, recommending to stop extending credit. This is a risk management feature to prevent bad debt accumulation. |
| **Acceptance Criteria** | 1. System monitors client debt aging. 2. Triggers alert when debt exceeds threshold (configurable). 3. Alert displays on client profile. 4. Optional notification to user. 5. Recommendation to pause credit extension. |
| **Evidence** | "you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/components/clients/`, `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-009: Client Last Seen / Overdue for Order Tracking

| Field | Value |
|-------|-------|
| **ID** | MEET-009 |
| **Timestamp** | 06:31 - 07:00 |
| **Category** | Feature Request |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Track clients who haven't ordered recently |
| **Meaning** | Customer wants to easily identify clients who haven't been seen in a while or are overdue for an order, enabling proactive outreach. |
| **Acceptance Criteria** | 1. Clients page shows "Days Since Last Order" column. 2. Sortable by recency. 3. Visual indicator for clients overdue (configurable threshold). 4. Filter option for "Needs Outreach". |
| **Evidence** | "I think it would be useful to know how often, um, you could kinda, you know, like who we haven't seen in a while, who do I need to reach out to? Nice. You know, so that, that'd be valuable. Um, um, maybe who's, um, they're kind of overdue for an order or overdue for a drop, you know, I should reach out to them kind of thing." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/ClientsPage.tsx` |

---

### MEET-010: View Client's Last Order from Client List

| Field | Value |
|-------|-------|
| **ID** | MEET-010 |
| **Timestamp** | 07:11 - 07:26 |
| **Category** | Feature Request |
| **Domain** | Clients |
| **Priority** | Next |
| **Title** | Click into client to see last order details |
| **Meaning** | Customer expects to click on a client row and see their last order details, or sort the client list by last order date. |
| **Acceptance Criteria** | 1. Client row is clickable. 2. Client detail view shows last order summary. 3. Client list sortable by "Last Order Date". 4. Last order shows date, items, and total. |
| **Evidence** | "yeah, I mean, I'm going to be able to click in, I'm assuming I can click on this and see their last order and what it was, or I can organize by when they were last there so I can see their recent order or something." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/ClientsPage.tsx` |

---

### MEET-011: Hide Unnecessary Contact Fields via Feature Flags

| Field | Value |
|-------|-------|
| **ID** | MEET-011 |
| **Timestamp** | 07:46 - 07:58 |
| **Category** | UI/UX Feedback |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Use feature flags to hide address/contact fields |
| **Meaning** | Developer confirmed that unnecessary fields (address, email, etc.) can be hidden using feature flags. Customer doesn't need contact information displayed. |
| **Acceptance Criteria** | 1. Feature flag exists for contact info visibility. 2. When disabled, address/email fields hidden from client forms. 3. Existing data preserved but not displayed. |
| **Evidence** | "Um, all that stuff also, like most of that stuff is on a feature flag. So, um, we just click it and it does like we turn off the flag and it disappears." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/components/feature-flags/` |

---

### MEET-012: Client Email Field Not Needed

| Field | Value |
|-------|-------|
| **ID** | MEET-012 |
| **Timestamp** | 08:02 - 08:06 |
| **Category** | Constraint |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Email field not required for clients |
| **Meaning** | Customer explicitly stated they don't know client emails and shouldn't need to. Email should not be a required field. |
| **Acceptance Criteria** | 1. Email field is optional on client creation. 2. No validation requiring email. 3. Client can be created with name only. |
| **Evidence** | "I just like, I don't know any of my clients emails. Yeah. Nor should you need to." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/ClientsPage.tsx` |

---

### MEET-013: Client Login Names for Backend Access

| Field | Value |
|-------|-------|
| **ID** | MEET-013 |
| **Timestamp** | 08:09 - 08:16 |
| **Category** | Feature Request |
| **Domain** | Clients |
| **Priority** | Next |
| **Title** | Store client login names for backend access |
| **Meaning** | Customer needs to track login usernames for clients who access the backend system (VIP portal or similar). |
| **Acceptance Criteria** | 1. Client profile includes "Login Username" field. 2. Field is optional. 3. Displays on client detail page. |
| **Evidence** | "in terms of maybe I need their login names, is this where their login names would be so they can log into the backend? Yeah, exactly." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/ClientsPage.tsx` |

---

### MEET-014: Minimal Client Creation - Payment Terms & Credit Settings

| Field | Value |
|-------|-------|
| **ID** | MEET-014 |
| **Timestamp** | 08:17 - 08:43 |
| **Category** | Business Rule |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Client creation requires only payment terms and credit settings |
| **Meaning** | When adding a new client, the only required business information is payment terms and initial credit settings. Contact information is not needed. |
| **Acceptance Criteria** | 1. Client creation form has minimal required fields. 2. Payment terms field present. 3. Credit limit/settings field present. 4. Contact info fields optional or hidden. |
| **Evidence** | "in terms of adding clients, there's not, you know, you're not going to need to put any of this contact information, um, other than certain things like, yeah, payment terms. This will also be the area that, um, initial like credit settings go or things like that." |
| **Dependencies** | MEET-011 |
| **UI Reference** | `/client/src/pages/ClientsPage.tsx` |

---

### MEET-015: Infrequent Client Creation - 4x Per Year

| Field | Value |
|-------|-------|
| **ID** | MEET-015 |
| **Timestamp** | 09:14 - 09:21 |
| **Category** | Business Rule |
| **Domain** | Clients |
| **Priority** | Later |
| **Title** | New clients added approximately 4 times per year |
| **Meaning** | Client creation is an infrequent operation (roughly quarterly), so the workflow doesn't need to be optimized for speed. |
| **Acceptance Criteria** | N/A - Informational business context |
| **Evidence** | "we rarely add plants. So it's going to happen like four times a year, you know?" |
| **Dependencies** | None |
| **UI Reference** | N/A |

---

### MEET-016: One-Time Visitors Use Existing Client Tab

| Field | Value |
|-------|-------|
| **ID** | MEET-016 |
| **Timestamp** | 09:26 - 09:40 |
| **Category** | Business Rule |
| **Domain** | Orders |
| **Priority** | Now |
| **Title** | One-time visitors can be added to regular client's tab |
| **Meaning** | When a one-time visitor comes with a regular client, their order can be placed under the regular client's account rather than creating a new client entity. |
| **Acceptance Criteria** | 1. Orders can be created for existing clients. 2. Notes field available to indicate guest/referral. 3. No requirement to create new client for one-time transactions. |
| **Evidence** | "And if someone's coming in once, we can just put it on somebody else's tab, you know, like if I see Bob every week and Bob brings his buddy Tony one time, then yeah, yeah. Right. Right. You can just go on Bob's tab." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/OrderCreatorPage.tsx` |

---

### MEET-017: Master Score is Customizable Formula

| Field | Value |
|-------|-------|
| **ID** | MEET-017 |
| **Timestamp** | 10:23 - 10:32 |
| **Category** | Business Rule |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Master Score formula is configurable |
| **Meaning** | The Master Score ranking system uses a weighted formula that can be customized by the business to prioritize different metrics. |
| **Acceptance Criteria** | 1. Customize Weights modal accessible. 2. Sliders for each metric weight. 3. Weights sum to 100%. 4. Changes apply to rankings immediately. 5. Reset to defaults option available. |
| **Evidence** | "master score is like a combination of how quickly they're turning over their debt and how, how, I don't know, I'm assuming it's some combination of things. Exactly. Which, which is also like kind of like a recipe or formula thing that we can control. I love it." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-018: Dual Client Type = Supplier + Buyer

| Field | Value |
|-------|-------|
| **ID** | MEET-018 |
| **Timestamp** | 10:32 - 10:41 |
| **Category** | Terminology Change |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | "Dual" client type means both supplier and buyer |
| **Meaning** | The "DUAL" type designation in the client system indicates an entity that acts as both a supplier (vendor) and a buyer (customer). |
| **Acceptance Criteria** | 1. Client type "DUAL" clearly labeled. 2. Tooltip or help text explains meaning. 3. Dual clients appear in both vendor and customer contexts. |
| **Evidence** | "so a dual, I love it. I love it. It's dual is basically a supplier and a, and a yep. A buyer" |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-019: Financial + Reliability Most Important Metrics

| Field | Value |
|-------|-------|
| **ID** | MEET-019 |
| **Timestamp** | 11:56 - 12:07 |
| **Category** | Decision Made |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Financial and Reliability are the most important leaderboard metrics |
| **Meaning** | Customer indicated that combining Financial ranking with Reliability (payment behavior) is the most important metric combination for evaluating clients. |
| **Acceptance Criteria** | 1. Default weight configuration emphasizes Financial and Reliability. 2. These metrics prominently displayed. 3. Consider combining into single "Creditworthiness" view. |
| **Evidence** | "But combining that with financial sounds like that is the most important, like that actually is more important." |
| **Dependencies** | MEET-017 |
| **UI Reference** | `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-020: Leaderboard Metrics Need Explanations

| Field | Value |
|-------|-------|
| **ID** | MEET-020 |
| **Timestamp** | 12:30 - 12:49 |
| **Category** | UI/UX Feedback |
| **Domain** | Clients |
| **Priority** | Next |
| **Title** | Add explanations for leaderboard metrics |
| **Meaning** | Customer found the distinction between metrics (Trend vs Growth, etc.) confusing and requested clearer explanations. |
| **Acceptance Criteria** | 1. Each metric has tooltip with explanation. 2. Help icon next to metric names. 3. Explanations use plain language. 4. Consider info modal with all definitions. |
| **Evidence** | "Got it. Yeah. We'll need a little explanation on these." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-021: Consider Consolidating Leaderboard Metrics

| Field | Value |
|-------|-------|
| **ID** | MEET-021 |
| **Timestamp** | 12:38 - 12:46 |
| **Category** | UI/UX Feedback |
| **Domain** | Clients |
| **Priority** | Later |
| **Title** | Simplify leaderboard by combining metrics |
| **Meaning** | Customer suggested that the leaderboard might have too many separate metrics and could benefit from consolidation into fewer, more meaningful categories. |
| **Acceptance Criteria** | 1. Review metric overlap. 2. Identify candidates for consolidation. 3. Maintain detailed view option. 4. Simplified default view. |
| **Evidence** | "I mean maybe we can just combine them into, into less things, um, but not, not very important as long as I, I don't grasp it now, but I, I'm sure I will grasp it eventually." |
| **Dependencies** | MEET-020 |
| **UI Reference** | `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-022: Engagement = Order Frequency + Recency

| Field | Value |
|-------|-------|
| **ID** | MEET-022 |
| **Timestamp** | 12:53 - 13:05 |
| **Category** | Business Rule |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Engagement metric combines frequency and recency |
| **Meaning** | The Engagement ranking metric is calculated from order frequency (how often they order) and recency (how recently they ordered). |
| **Acceptance Criteria** | 1. Engagement score visible on leaderboard. 2. Calculated from frequency + recency. 3. Label clearly states components. |
| **Evidence** | "engagement and what's engagement again? Um, this one is frequency and recency. Oh, it says it right there. Order frequency and recency. Okay. So like how, how engaged are they? How often are they coming? Exactly." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-023: Master Score Weight Components

| Field | Value |
|-------|-------|
| **ID** | MEET-023 |
| **Timestamp** | 13:26 - 13:45 |
| **Category** | Business Rule |
| **Domain** | Clients |
| **Priority** | Now |
| **Title** | Master Score calculated from 7 weighted components |
| **Meaning** | The Master Score is a weighted combination of: YTD Revenue (25%), On-Time Payment (20%), Order Frequency (15%), Profit Margin (15%), Credit Utilization (10%), YoY Growth (10%), and Recency (5%). |
| **Acceptance Criteria** | 1. All 7 components contribute to Master Score. 2. Default weights as specified. 3. Weights adjustable via Customize Weights modal. 4. Total always equals 100%. |
| **Evidence** | "So how much revenue they've done on time payments, how quickly, how much they're ordering, what your margin is, how much of their credit they're using, um, year over year growth. So we could change that to a different sort of growth and then days since last order." |
| **Dependencies** | MEET-017 |
| **UI Reference** | `/client/src/pages/LeaderboardPage.tsx` |

---

### MEET-024: AR/AP is Accounting Command Center

| Field | Value |
|-------|-------|
| **ID** | MEET-024 |
| **Timestamp** | 14:41 - 14:48 |
| **Category** | Business Rule |
| **Domain** | Payments |
| **Priority** | Now |
| **Title** | AR/AP page serves as accounting team's command center |
| **Meaning** | The AR/AP (Accounts Receivable/Accounts Payable) page is designed to be the primary workspace for accounting staff, providing quick access to all payment-related actions. |
| **Acceptance Criteria** | 1. AR/AP page shows key financial metrics. 2. Quick Actions for common tasks. 3. Overdue invoices/bills prominently displayed. 4. Recent activity visible. |
| **Evidence** | "so this is like your payment office. Like this is going to be their command center basically." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/accounting/ARAPPage.tsx` |

---

### MEET-025: Cash Handling Workflow - Bulk Distribution

| Field | Value |
|-------|-------|
| **ID** | MEET-025 |
| **Timestamp** | 15:21 - 15:35 |
| **Category** | Business Rule |
| **Domain** | Payments |
| **Priority** | Next |
| **Title** | Cash distributed in bulk to accounting staff |
| **Meaning** | The business workflow involves giving accounting staff (Z) a bulk cash amount, which they then allocate to individual payments. This is different from receiving individual payments. |
| **Acceptance Criteria** | 1. Support for bulk cash allocation. 2. Track cash pool balance. 3. Record individual disbursements from pool. 4. Reconciliation capability. |
| **Evidence** | "Like for Z, I just, I just occasionally give her a big chunk and then she just writes down how much is coming out of that chunk." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/components/accounting/` |

---

### MEET-026: Receiving Payments is Higher Risk - Owner Only

| Field | Value |
|-------|-------|
| **ID** | MEET-026 |
| **Timestamp** | 15:46 - 16:03 |
| **Category** | Business Rule |
| **Domain** | Payments |
| **Priority** | Now |
| **Title** | Payment receiving restricted to owner/higher permission level |
| **Meaning** | Receiving payments from clients is considered a higher-risk activity that should be restricted to the owner, while accounting staff handles lower-risk vendor payments. |
| **Acceptance Criteria** | 1. "Receive Payment" action requires elevated permissions. 2. Role-based access control for payment functions. 3. Accounting role can "Pay Vendor" but not "Receive Payment". |
| **Evidence** | "she only needs like low risk farmers. I feel like receiving payments is a little bit higher risk. Yep. That makes sense. Okay. That's good to know." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/components/accounting/ReceivePaymentModal.tsx` |

---

### MEET-027: Dashboard Requirements Most Important Discussion

| Field | Value |
|-------|-------|
| **ID** | MEET-027 |
| **Timestamp** | 16:22 - 16:28 |
| **Category** | Decision Made |
| **Domain** | Dashboard |
| **Priority** | Now |
| **Title** | Dashboard configuration is the most important topic |
| **Meaning** | Customer confirmed that the dashboard discussion and requirements were the most important part of the meeting. |
| **Acceptance Criteria** | N/A - Prioritization guidance |
| **Evidence** | "like my question about the dashboards and what we just talked about was probably the most important one." |
| **Dependencies** | None |
| **UI Reference** | `/client/src/pages/Dashboard.tsx` |

---

### MEET-028: Inventory Loading Blocks Other Features

| Field | Value |
|-------|-------|
| **ID** | MEET-028 |
| **Timestamp** | 16:36 - 16:43 |
| **Category** | Decision Made |
| **Domain** | Inventory |
| **Priority** | Now |
| **Title** | Inventory functionality unblocks all other features |
| **Meaning** | Developer acknowledged that getting inventory to work properly is the key blocker that, once resolved, will enable all other features to function correctly. |
| **Acceptance Criteria** | 1. Inventory page loads successfully. 2. All inventory data displays. 3. Dependent features (Orders, Dashboard) can access inventory data. |
| **Evidence** | "once all the inventory that I know is in the system is listed here, it kind of unblocks everything else." |
| **Dependencies** | MEET-001 |
| **UI Reference** | `/client/src/pages/Inventory.tsx` |

---

### MEET-029: Inventory Default Landing Page Preference

| Field | Value |
|-------|-------|
| **ID** | MEET-029 |
| **Timestamp** | 01:52 - 02:00 |
| **Category** | Feature Request |
| **Domain** | General |
| **Priority** | Next |
| **Title** | Set Inventory as default landing page |
| **Meaning** | Customer prefers Inventory page as the default landing page when logging in, as it's the most frequently used view for daily operations. |
| **Acceptance Criteria** | 1. User preference for default landing page. 2. Inventory option available. 3. Setting persists across sessions. |
| **Evidence** | "It doesn't really matter what I probably inventory would be where I'd like it to pop up, you know, just because that's the thing we scroll through the most" |
| **Dependencies** | MEET-001 |
| **UI Reference** | `/client/src/App.tsx` |

---

### MEET-030: Daily Workflow is Like Tetris

| Field | Value |
|-------|-------|
| **ID** | MEET-030 |
| **Timestamp** | 02:10 - 02:18 |
| **Category** | Business Rule |
| **Domain** | General |
| **Priority** | Now |
| **Title** | Daily operations require balancing multiple inventory factors |
| **Meaning** | Customer describes their daily workflow as "Tetris" - constantly balancing what's out of stock, what's overstocked, what's aging, and what might lose money. Dashboard should support this mental model. |
| **Acceptance Criteria** | 1. Dashboard provides at-a-glance status. 2. Highlights items needing attention. 3. Supports quick decision-making. 4. Prioritizes actionable information. |
| **Evidence** | "Because it's basically this job is like Tetris and it's like, what are you out of? What do you have too much of what's about to go bad? What am I going to lose money on?" |
| **Dependencies** | MEET-002, MEET-005 |
| **UI Reference** | `/client/src/pages/Dashboard.tsx` |

---

### MEET-031: Price Category Complexity for Inventory Filtering

| Field | Value |
|-------|-------|
| **ID** | MEET-031 |
| **Timestamp** | 03:44 - 03:52 |
| **Category** | UI/UX Feedback |
| **Domain** | Inventory |
| **Priority** | Next |
| **Title** | Too many price categories makes filtering complicated |
| **Meaning** | Customer noted that the current price category system has too many options, making it difficult to quickly see inventory counts by price range. Simpler brackets would be more useful. |
| **Acceptance Criteria** | 1. Simplified price bracket options. 2. Configurable bracket ranges. 3. Quick filter presets. 4. Summary view by bracket. |
| **Evidence** | "And then I can't even tell like how many I have in each price category, unless I use that feature you gave me, but then it's a little complicated because there's so many price categories. So it's not just like five to 700 or something." |
| **Dependencies** | MEET-002 |
| **UI Reference** | `/client/src/pages/Inventory.tsx` |

---

### MEET-032: Create Sales Order - Inventory Load Error

| Field | Value |
|-------|-------|
| **ID** | MEET-032 |
| **Timestamp** | 09:00 (visual) |
| **Category** | Bug/Broken Flow |
| **Domain** | Orders |
| **Priority** | Now |
| **Severity** | P1-Critical |
| **Title** | Create Sales Order fails to load inventory |
| **Meaning** | When creating a new sales order, the system displays "Failed to load inventory" error with a SQL query error, preventing order creation. |
| **Acceptance Criteria** | 1. Order creation page loads inventory successfully. 2. Products available for selection. 3. No SQL errors displayed to user. 4. Order can be created and saved. |
| **Evidence** | Visual context from video frame shows "Failed to load inventory" error with SQL query details on Orders > Create page |
| **Dependencies** | MEET-001 |
| **UI Reference** | `/client/src/pages/OrderCreatorPage.tsx` |

---

## Bugs & Broken Flows

| ID | Title | Severity | Domain | Status |
|----|-------|----------|--------|--------|
| MEET-001 | Inventory page shows loading spinner indefinitely | P1-Critical | Inventory | Open |
| MEET-003 | Spreadsheet View page not working | P2-High | Inventory | Open |
| MEET-032 | Create Sales Order fails to load inventory | P1-Critical | Orders | Open |

---

## Requirements Matrix by Domain

### Dashboard

| ID | Title | Priority | Category |
|----|-------|----------|----------|
| MEET-002 | Display inventory counts by flower category | Now | Feature Request |
| MEET-004 | Display payables due and scheduled | Now | Feature Request |
| MEET-005 | Highlight 5-10 oldest inventory items | Now | Feature Request |
| MEET-006 | Display cash on hand | Next | Feature Request |
| MEET-027 | Dashboard configuration most important | Now | Decision |

### Inventory

| ID | Title | Priority | Category |
|----|-------|----------|----------|
| MEET-001 | Inventory page fails to load | Now | Bug |
| MEET-003 | Spreadsheet View not functional | Now | Bug |
| MEET-028 | Inventory functionality unblocks all features | Now | Decision |
| MEET-029 | Set Inventory as default landing page | Next | Feature Request |
| MEET-031 | Simplify price category filtering | Next | UI/UX Feedback |

### Clients

| ID | Title | Priority | Category |
|----|-------|----------|----------|
| MEET-008 | Debt warning system for at-risk clients | Now | Feature Request |
| MEET-009 | Track clients who haven't ordered recently | Now | Feature Request |
| MEET-010 | View client's last order from list | Next | Feature Request |
| MEET-011 | Hide unnecessary contact fields | Now | UI/UX Feedback |
| MEET-012 | Email field not required | Now | Constraint |
| MEET-013 | Store client login names | Next | Feature Request |
| MEET-014 | Minimal client creation fields | Now | Business Rule |
| MEET-015 | Infrequent client creation | Later | Business Rule |
| MEET-017 | Master Score is customizable | Now | Business Rule |
| MEET-018 | Dual = Supplier + Buyer | Now | Terminology |
| MEET-019 | Financial + Reliability most important | Now | Decision |
| MEET-020 | Add metric explanations | Next | UI/UX Feedback |
| MEET-021 | Consider consolidating metrics | Later | UI/UX Feedback |
| MEET-022 | Engagement = Frequency + Recency | Now | Business Rule |
| MEET-023 | Master Score weight components | Now | Business Rule |

### Orders

| ID | Title | Priority | Category |
|----|-------|----------|----------|
| MEET-016 | One-time visitors use existing client tab | Now | Business Rule |
| MEET-032 | Create Sales Order fails to load inventory | Now | Bug |

### Payments

| ID | Title | Priority | Category |
|----|-------|----------|----------|
| MEET-024 | AR/AP is accounting command center | Now | Business Rule |
| MEET-025 | Cash handling - bulk distribution | Next | Business Rule |
| MEET-026 | Receiving payments is higher risk | Now | Business Rule |

### Admin

| ID | Title | Priority | Category |
|----|-------|----------|----------|
| MEET-007 | Calendar integration deprioritized | Later | Decision |

### General

| ID | Title | Priority | Category |
|----|-------|----------|----------|
| MEET-030 | Daily workflow is like Tetris | Now | Business Rule |

---

## Decisions & Commitments

| ID | Decision | Timestamp | Impact |
|----|----------|-----------|--------|
| MEET-007 | Calendar integration is a later version feature | 05:34 | Deprioritizes calendar work |
| MEET-019 | Financial + Reliability are most important metrics | 12:01 | Guides leaderboard defaults |
| MEET-027 | Dashboard configuration is most important topic | 16:25 | Prioritizes dashboard work |
| MEET-028 | Inventory functionality unblocks all features | 16:40 | Establishes critical path |

---

## Risks & Assumptions Ledger

| Risk ID | Risk Description | Trigger | Likelihood | Impact | Mitigation |
|---------|------------------|---------|------------|--------|------------|
| R-001 | Inventory issues may delay MVP launch | Continued backend issues | High | Critical | Focus development resources on inventory |
| R-002 | Complex price categories may confuse users | Too many filter options | Medium | Medium | Implement simplified bracket presets |
| R-003 | Debt warning thresholds may need tuning | False positives/negatives | Medium | Low | Make thresholds configurable |

### Assumptions

| ID | Assumption | Validation Needed |
|----|------------|-------------------|
| A-001 | Customer will use phone for calendar | Confirmed in meeting |
| A-002 | Client creation is infrequent (~4x/year) | Confirmed in meeting |
| A-003 | One accounting staff member handles payments | Needs clarification on team size |

---

## Follow-up Questions

| ID | Question | Context | Priority |
|----|----------|---------|----------|
| Q-001 | What specific price brackets should be used for dashboard inventory display? | Customer mentioned $100-200, $200-300, etc. but needs confirmation | High |
| Q-002 | What threshold should trigger the debt warning system? | Days overdue? Percentage of credit limit? | High |
| Q-003 | How many accounting staff members need access to AR/AP? | Mentioned "Z" but unclear if others | Medium |
| Q-004 | Should "Receive Payment" be completely restricted or just require approval? | Role-based access discussion | Medium |
| Q-005 | What is the desired aging threshold for inventory alerts? | 30 days? 60 days? Configurable? | High |
| Q-006 | Who is "Tigger" and should they be included in future meetings? | Mentioned but not present | Low |

---

## Light Mapping to Repository & Live Site

### Component Mapping

| Feature Area | Primary Files | Status |
|--------------|---------------|--------|
| Dashboard | `/client/src/pages/Dashboard.tsx`, `/client/src/pages/DashboardV3.tsx` | Needs enhancement |
| Inventory | `/client/src/pages/Inventory.tsx` | Bug - not loading |
| Spreadsheet View | `/client/src/pages/SpreadsheetViewPage.tsx` | Not functional |
| Clients | `/client/src/pages/ClientsPage.tsx` | Working |
| Leaderboard | `/client/src/pages/LeaderboardPage.tsx` | Working |
| AR/AP | `/client/src/pages/accounting/ARAPPage.tsx` | Working |
| Orders | `/client/src/pages/OrderCreatorPage.tsx` | Bug - inventory load |
| Feature Flags | `/client/src/components/feature-flags/` | Available |

### Sidebar Navigation Structure

The application sidebar (visible in video) contains:

**SALES Section:**
- Dashboard, Inbox, Clients, Orders, Interest List, Sales Sheets, Live Shopping, Leaderboard, Client Needs, Matchmaking, Quotes, Returns

**INVENTORY Section:**
- Pick & Pack, Products, Inventory, Photography, Samples, Purchase Orders, Vendors, Vendor Supply, Spreadsheet View, Direct Intake

**FINANCE Section:**
- Invoices, AR/AP, Credit Settings, Credits, Reports, Pricing Rules

**ADMIN Section:**
- Users, System Settings, Calendar, Todo Lists, Scheduling, Time Clock, Feature Flags, Workflow Queue, Locations

---

## Final Review Views

### Summary by Priority

| Priority | Count | Items |
|----------|-------|-------|
| Now | 22 | MEET-001, 002, 003, 004, 005, 008, 009, 011, 012, 014, 016, 017, 018, 019, 022, 023, 024, 026, 027, 028, 030, 032 |
| Next | 7 | MEET-006, 010, 013, 020, 025, 029, 031 |
| Later | 3 | MEET-007, 015, 021 |

### Summary by Domain

| Domain | Count | Items |
|--------|-------|-------|
| Clients | 14 | MEET-008, 009, 010, 011, 012, 013, 014, 015, 017, 018, 019, 020, 021, 022, 023 |
| Dashboard | 5 | MEET-002, 004, 005, 006, 027 |
| Inventory | 5 | MEET-001, 003, 028, 029, 031 |
| Payments | 3 | MEET-024, 025, 026 |
| Orders | 2 | MEET-016, 032 |
| Admin | 1 | MEET-007 |
| General | 2 | MEET-029, 030 |

### Summary by Category

| Category | Count | Items |
|----------|-------|-------|
| Feature Request | 12 | MEET-002, 004, 005, 006, 008, 009, 010, 013, 029 |
| Business Rule | 8 | MEET-014, 015, 016, 017, 022, 023, 024, 025, 026, 030 |
| UI/UX Feedback | 5 | MEET-011, 020, 021, 031 |
| Decision Made | 4 | MEET-007, 019, 027, 028 |
| Bug/Broken Flow | 3 | MEET-001, 003, 032 |
| Terminology Change | 1 | MEET-018 |
| Constraint | 1 | MEET-012 |

---

*Report generated: January 29, 2026*  
*Analysis performed by: Manus AI*
