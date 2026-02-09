# Comprehensive Analysis of TERP Customer Interview

**Document ID:** TERP-Analysis-20260130-01  
**Date:** January 30, 2026  
**Author:** Manus AI  
**Status:** Final  
**Classification:** Internal — This document is the sole reference for agents analyzing the TERP customer interview.

---

## 1.0 Purpose and Scope

This document provides an exhaustive analysis of the 18-minute customer interview conducted on January 29, 2026 between the TERP product owner (the developer) and the primary customer (the business operator of a cannabis distribution company). The purpose of this report is to serve as a **single source of truth** for any agent or stakeholder tasked with understanding the customer's needs, mental models, and feedback regarding the TERP cannabis ERP system. It includes verbatim quotes with timestamps, detailed analysis of user behavior and screen context, and deep dives into design and presentation considerations. Any agent receiving this document should be able to form a complete understanding of the customer's perspective without access to the original video.

### 1.1 Methodology

The analysis was conducted by reviewing three primary artifacts. First, the **full video transcript** — an 18-minute recording of the customer interview, transcribed with timestamps. Second, **visual context notes** — a frame-by-frame analysis of the customer's screen during the interview, capturing the exact state of the TERP application at key moments. Third, a **codebase and specification review** — a cross-referencing of every mentioned feature against the existing TERP codebase, component library, and specification documents to determine what already exists versus what is genuinely new.

### 1.2 Participants

There are two participants in this interview. The **product owner** (referred to as "Developer" or "Dev" throughout) is the person building TERP. They are guiding the customer through the application, asking targeted questions about what is useful versus what should be removed, and probing for workflow details. The **customer** (referred to as "Client" throughout) is the primary end-user and business operator. They run a cannabis distribution business and are the person who will use TERP daily. They are candid, engaged, and clearly have deep domain expertise in their business operations.

### 1.3 Interview Context

The interview begins with the Developer acknowledging the Customer's patience and expressing a need for feedback. The Customer responds enthusiastically:

> "I love giving feedback, so I'm ready." [00:24.3]

The Developer frames the session as a walkthrough of the application's sidebar navigation, asking the Customer to identify what feels helpful versus what should be removed:

> "really what I want to do is just go through these, go through all the sidebar things. You tell me actually what feels helpful versus what is just like, get rid of it completely or like stash it for far later." [00:42.6]

This framing is important because it establishes the interview as a **prioritization exercise**, not a feature brainstorming session. The Customer is being asked to subtract, not add.

---

## 2.0 Executive Summary

The central finding of this analysis is that the customer's primary need is not for a comprehensive, feature-rich dashboard, but for a **simplified, data-driven command center** that helps them solve their daily "Tetris" game of balancing inventory, cash flow, and client relationships. The customer explicitly values simplicity and clarity over a multitude of options, and they do not want the system to make decisions for them — they want it to present the facts so they can make decisions themselves.

### 2.1 The Five Most Important Quotes

These five quotes, taken verbatim from the interview, capture the essence of the customer's needs and should be treated as the primary design requirements:

| # | Quote | Timestamp | Significance |
|---|-------|-----------|--------------|
| 1 | "this job is like Tetris and it's like, what are you out of? What do you have too much of? What's about to go bad? What am I going to lose money on?" | 02:10.9 | **Core mental model.** This is the single most important statement in the entire interview. It defines the four questions the homepage must answer. |
| 2 | "my question about the dashboards and what we just talked about was probably the most important one." | 16:22.8 | **Priority declaration.** The customer explicitly ranks the dashboard above all other features. |
| 3 | "it'd be cool to see like depths, indoor, out, smalls, candy ends in various price brackets" | 04:28.4 | **Specific feature request.** The customer wants inventory broken down by category AND price tier. |
| 4 | "you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing." | 11:21.4 | **Critical new feature.** The only genuinely new, high-value feature request. |
| 5 | "there could be even far less options on that sheet" | 11:35.6 | **Simplicity mandate.** The customer wants less, not more. |

### 2.2 Key Findings Summary

The analysis produced four major findings. First, the **dashboard is the highest-priority deliverable** — the customer said so explicitly and repeatedly. Second, **simplicity is paramount** — the customer wants fewer options, fewer metrics, and fewer fields, not more. Third, **most requested features already exist in the codebase** — the gap is in presentation and configuration, not in missing functionality. Fourth, the **debt warning system is the only genuinely new, high-value feature** — everything else is either already built, already spec'd, or a minor enhancement.

---

## 3.0 The Customer's Mental Model: "Tetris"

Understanding the customer's core mental model is the most critical element for designing a successful user experience. This section deconstructs the "Tetris" analogy and its implications for every aspect of the product.

### 3.1 The Full Context of the "Tetris" Moment

The "Tetris" quote does not appear in isolation. It emerges from a specific conversational flow that provides essential context. The Developer asks what the Customer wants to see when they first log in:

> **Dev:** "when you log in to this application, what's the first thing that you want to see?" [01:37.2]

> **Client:** "Inventory, dashboard, cash." [01:44.8]

The Customer then elaborates on why inventory is their default mental starting point:

> **Client:** "probably inventory would be where I'd like it to pop up, you know, just because that's the thing we scroll through the most, like just understanding who we need to pay. And, and, um, yeah. Um, and what's aging and like, what do I need to focus on with my day?" [01:52.4]

And then, unprompted, the Customer delivers the defining analogy:

> **Client:** "Because it's basically this job is like Tetris and it's like, what are you out of? What do you have too much of? What's about to go bad? What am I going to lose money on?" [02:10.9]

The Developer immediately recognizes the significance:

> **Dev:** "So that can we actually unpack that for a second that this actually feels really helpful." [02:20.2]

### 3.2 Deconstructing the Four Questions

Each of the four "Tetris" questions maps to a distinct data domain and a distinct user action.

**Question 1: "What are you out of?"** This maps to low stock levels. The Customer elaborated on this later in the interview when discussing specific categories:

> "I'm low on candy ends from five to seven." [02:50.0]

The action this drives is **purchasing** — the Customer needs to know what to buy more of. The homepage should present inventory levels by category so the Customer can immediately see gaps.

**Question 2: "What do you have too much of?"** This maps to overstocked or slow-moving inventory. While the Customer did not elaborate extensively on this specific question, it is the natural complement to Question 1. The action this drives is **sales focus** — the Customer needs to know what to push harder on.

**Question 3: "What's about to go bad?"** This maps directly to aging inventory. The Customer was very specific about wanting this surfaced:

> "highlight of like a window of like the five, 10 oldest things, you know, kind of like focus on me." [05:07.5]

The action this drives is **urgent sales** — these are items that will lose value if not sold soon. The Customer wants the oldest items presented prominently so they can prioritize them in their daily sales activity.

**Question 4: "What am I going to lose money on?"** This maps to client debt and accounts receivable risk. The Customer was particularly excited about a debt warning system:

> "I was also really excited about, you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing." [11:21.4]

The action this drives is **credit management** — the Customer needs to know which clients are becoming risky so they can stop extending credit before losses mount.

### 3.3 Why "Tetris" is the Perfect Analogy

The Tetris analogy reveals several important things about how this customer thinks about their business. In Tetris, you are constantly reacting to what's coming at you. You don't plan five moves ahead; you deal with the current piece and the next piece. This maps perfectly to the cannabis distribution business, where the Customer is dealing with perishable inventory, cash-based transactions, and a rotating cast of clients. The homepage needs to be a **real-time state display**, not a historical analytics tool.

In Tetris, there is no "recommendation engine." The game presents the pieces, and the player decides where to put them. This is exactly what the Customer wants from TERP — present the data, and let them decide what to do with it. This is why the feedback on Mockup 1 was to remove the recommendation engine and focus on presenting the important details.

In Tetris, the game speeds up over time. The longer you play, the faster the pieces come, and the more critical it becomes to have a clear, uncluttered view of the board. This maps to the Customer's desire for simplicity — as the business grows and gets busier, the homepage needs to be even more streamlined, not more complex.

---

## 4.0 Detailed Topic Analysis with Verbatim Quotes

This section walks through every major topic discussed in the interview, in chronological order, with verbatim quotes and analysis.

### 4.1 The Default Landing Page (01:37 - 02:10)

The Developer asks what the Customer wants to see first upon login. The Customer's answer reveals their current workaround:

> **Client:** "probably inventory would be where I'd like it to pop up, you know, just because that's the thing we scroll through the most" [01:52.4]

**Analysis:** The Customer currently uses the Inventory page as a de facto homepage because it's the closest thing to a business overview. They scroll through the inventory list to mentally assess what's aging, what's low, and what needs attention. This is an inefficient, manual process that the new homepage should replace entirely.

**Visual Context:** Frame 1 of the video shows the Inventory page at the start of the interview. The sidebar is visible with all navigation sections (SALES, INVENTORY, FINANCE, ADMIN). The inventory page shows "Batches: 0, Live: 0, Value: $0.00" with a loading spinner — the inventory is not loading, which is a known bug being worked on.

### 4.2 The Dashboard Requirements (04:00 - 05:15)

After unpacking the Tetris analogy, the Developer asks the Customer to be specific about what they want on the dashboard. The Customer provides a remarkably detailed and specific answer:

> **Client:** "On dashboard, on dashboard, I go to dashboard and I can see payables, due payables, scheduled office owned total units on hand." [04:16.2]

> **Client:** "And it'd be cool to see like depths, indoor, out, smalls, um, candy ends in various price brackets, you know, kind of like, that'd be cool. You know, depths from one to 200, from two to 300, from three to four, you know, just like some basic flower categories that we could create. That would be, that'd be cool." [04:28.4]

> **Client:** "And then, you know, like how much money's on hand, you know, that kind of stuff." [04:51.1]

> **Client:** "And aging, uh, inventory." [04:56.7]

When the Developer asks about the aging inventory presentation, the Customer is specific:

> **Client:** "highlight of like a window of like the five, 10 oldest things, you know, kind of like focus on me." [05:07.5]

**Analysis:** This is the most actionable segment of the entire interview. The Customer has essentially written the requirements document for the homepage. They want five things: (1) payables due, (2) total units on hand broken down by category and price bracket, (3) cash on hand, (4) aging inventory (top 5-10 oldest items), and (5) scheduled payables. The category breakdown is very specific — they name the exact categories (deps, indoor, outdoor, smalls, candy ends) and the exact price brackets ($100-200, $200-300, $300-400).

**Visual Context:** Frame 4 shows the current Dashboard page. It displays "Cash Collected: $5,828,886.76" and "Cash Spent: $0.00" along with a sales ranking of clients by total sales. Notably, the current dashboard does NOT show any of the things the Customer just requested — no inventory breakdown, no aging items, no payables. This confirms that the current dashboard is not meeting the Customer's needs.

### 4.3 Calendar Integration — Deprioritized (05:16 - 05:48)

The Developer probes whether calendar integration would be valuable:

> **Dev:** "In terms of your schedule, I imagine that like before you cop in the car, whatever you just like, look at the, um, the calendar, your calendar, um, does that feel like an important thing to have quick access to" [05:16.7]

> **Client:** "I don't think so. I mean, I think it's just mostly, I think that's a later version thing. I think that's, it's just so easy to open my phone and confirm everyone and drag an appointment around or make it bigger or smaller. All with the touch of a finger." [05:34.8]

**Analysis:** This is a clear deprioritization. The Customer is satisfied with their existing phone calendar and sees no value in replicating that functionality in TERP for the MVP. The phrase "later version thing" is a polite way of saying "don't build this now." This should be moved to the long-term backlog.

### 4.4 Client List and Sorting (05:51 - 07:01)

The Developer introduces the Clients page and asks about useful sorting and filtering:

> **Dev:** "you might want to be able to quickly just click into your clients and, you know, sort by certain things, like see who has the highest debt or who has the most orders or things like that." [05:51.5]

> **Client:** "I think it would be useful to know how often, um, you could kinda, you know, like who we haven't seen in a while, who do I need to reach out to?" [06:31.3]

> **Client:** "maybe who's, um, they're kind of overdue for an order or overdue for a drop, you know, I should reach out to them kind of thing. That would be really good." [06:45.8]

When asked about starring/favoriting clients:

> **Client:** "I'm going to be able to click in, I'm assuming I can click on this and see their last order and what it was, or I can organize by when they were last there so I can see their recent order or something." [07:11.2]

**Analysis:** The Customer's primary interest in the client list is **recency** — who have they not seen in a while, and who is overdue for an order. This is a sales-driven perspective, not an accounting one. The existing codebase already has `PurchasePatternsWidget.tsx` with `daysSinceLastPurchase` and `MatchmakingOpportunitiesWidget` showing overdue reorders, so this is largely a matter of surfacing existing data more prominently.

**Visual Context:** Frame 7 shows the Clients page with 101 total clients. Columns visible are Name, Type, Contact, LTV, Debt, and Orders. The Customer's feedback suggests that "Contact" (email) is not useful, while "Days Since Last Order" would be very useful but is not currently shown.

### 4.5 Client Creation and Simplicity (07:01 - 09:40)

This section reveals important business context about how the Customer operates:

> **Client:** "we don't need address information." [07:46.6]

> **Client:** "I just like, I don't know any of my clients emails." [08:02.7]

> **Dev:** "Nor should you need to." [08:05.8]

On the topic of client login names:

> **Client:** "in terms of maybe I need their login names, is this where their login names would be so they can log into the backend?" [08:09.9]

On the frequency of adding new clients:

> **Client:** "we rarely add plants. So it's going to happen like four times a year" [09:14.4]

And on handling one-time visitors:

> **Client:** "if I see Bob every week and Bob brings his buddy Tony one time, then yeah, yeah. Right. Right. You can just go on Bob's tab." [09:31.3]

**Analysis:** This section is rich with business context that has direct design implications. The Customer operates in a world where client relationships are personal and informal. They don't know or need email addresses. They rarely add new clients (approximately 4 times per year). One-time visitors are handled by putting transactions on an existing client's tab. This means the client creation flow should be as minimal as possible — the existing `QuickCreateClient.tsx` component, which allows name-only creation, is already well-suited. The key takeaway is that **client management is a low-frequency activity** and should not consume significant design or development resources.

### 4.6 The Leaderboard: Excitement and Confusion (09:48 - 13:10)

The Customer's reaction to the Leaderboard is a mix of genuine excitement and confusion about the metrics:

> **Client:** "master score is like a combination of how quickly they're turning over their debt and how, how, I don't know, I'm assuming it's some combination of things." [10:12.8]

> **Dev:** "Exactly. Which, which is also like kind of like a recipe or formula thing that we can control." [10:23.5]

> **Client:** "I love it. I figured." [10:28.0]

The Customer correctly identifies the "Dual" client type:

> **Client:** "dual is basically a supplier and a buyer" [10:32.4]

On the quality of debt:

> **Client:** "I'm assuming we can see like the quality of their debt somehow." [10:49.3]

Then the critical debt warning request:

> **Client:** "I was also really excited about, you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing." [11:21.4]

On the number of metrics:

> **Client:** "there could be even far less options on that sheet, you know" [11:35.6]

> **Client:** "I love, I love it, but we'll almost need like a, like what's reliability, like how often they show up or this is their payment behavior actually." [11:46.0]

> **Dev:** "So this is the, how quickly they repaid debts." [11:53.4]

> **Client:** "But combining that with financial sounds like that is the most important, like that actually is more important." [11:56.8]

On needing explanations:

> **Client:** "We'll need a little explanation on these." [12:30.4]

On potentially consolidating metrics:

> **Client:** "maybe we can just combine them into, into less things, um, but not, not very important as long as I, I don't grasp it now, but I, I'm sure I will grasp it eventually." [12:38.6]

On engagement:

> **Client:** "engagement and what's engagement again?" [12:53.0]

> **Dev:** "this one is frequency and recency. Oh, it says it right there. Order frequency and recency." [12:57.0]

> **Client:** "So like how, how engaged are they? How often are they coming? Exactly. Okay, cool." [13:05.9]

On the Master Score formula:

> **Dev:** "So how much revenue they've done on time payments, how quickly, how much they're ordering, what your margin is, how much of their credit they're using, um, year over year growth. So we could change that to a different sort of growth and then days since last order." [13:26.9]

> **Client:** "nice. That's cool. I love that. And so a master score is just a combination of all of them." [13:46.2]

**Analysis:** This is the longest single topic in the interview and reveals a nuanced picture. The Customer is genuinely excited about the Leaderboard concept ("I love it" appears multiple times), but they are confused by the individual metrics. They don't understand what "Reliability" means without being told. They don't understand what "Engagement" means until they see the description. They want fewer metrics, not more. And critically, they identify that **Financial + Reliability is the most important combination** — this is the "quality of debt" signal they care about most.

The design implication is that the Leaderboard is valuable but needs two things: (1) clear, plain-language explanations for every metric, and (2) a possible consolidation of metrics into fewer, more intuitive categories. The Customer explicitly said "maybe we can just combine them into less things."

**Visual Context:** Frame 11 shows the Leaderboard page with tabs for Master Score, Financial, Engagement, Reliability, and Growth. The "Customize Weights" button is visible. Frame 14 shows the Customize Weights modal with sliders for YTD Revenue (25%), On-Time Payment (20%), Order Frequency (15%), Profit Margin (15%), Credit Utilization (10%), YoY Growth (10%), and Recency (5%).

### 4.7 AR/AP and Payment Permissions (14:18 - 16:03)

The Developer walks the Customer through the AR/AP section:

> **Dev:** "invoices in ARAP... this has gotten a lot more accurate since we last spoke." [14:27.5]

> **Client:** "What is ARAP again?" [14:36.1]

> **Dev:** "accounts receivable and accounts payable... this is like your payment office. Like this is going to be their command center basically." [14:39.8]

The Developer then probes about the accounting workflow:

> **Dev:** "thinking about what somebody who's working in your accounting divisions, um, dashboard or just like command center would look like, I imagine, you know, this sort of stuff is interesting for you, but really what they're going to want is just like this, which is basically just like, here are all the actions I can receive a payment. I can pay somebody journal entries, um, expenses." [14:52.3]

The Customer reveals a critical business rule about cash handling:

> **Client:** "for Z, I just, I just occasionally give her a big chunk and then she just writes down how much is coming out of that chunk." [15:28.1]

And then the most important security-related insight:

> **Client:** "she only needs like low risk farmers. I feel like receiving payments is a little bit higher risk." [15:55.4]

> **Dev:** "That makes sense. Okay. That's good to know." [16:00.6]

**Analysis:** This section reveals two important things. First, the Customer doesn't know what "AR/AP" stands for, which reinforces the need for plain language throughout the application. Second, there is a clear permission hierarchy in the business: the accounting person ("Z") handles low-risk vendor payments, but the Customer (the owner) handles receiving payments from clients because it involves cash and is higher risk. This maps directly to a role-based access control requirement where "Receive Payment" should be restricted to owner-level permissions.

**Visual Context:** Frame 15 shows the AR/AP Accounting Dashboard with Cash Balance ($0.00), Accounts Receivable ($2,492,412.54), Accounts Payable ($1,753,971.17), and Net Position ($738,441.37). Frame 16 shows the Quick Actions section with buttons for Receive Payment, Pay Vendor, Post Journal Entry, Create Invoice, Create Bill, and Record Expense. There are 96 overdue invoices and 44 overdue bills.

### 4.8 The Priority Declaration and Closing (16:18 - 18:07)

The Customer makes their final, definitive priority statement:

> **Client:** "there's a bunch of other stuff that's much smaller, but I think that honestly, like my question about the dashboards and what we just talked about was probably the most important one." [16:18.6]

On the current state of the product:

> **Client:** "I'm pretty disappointed that this isn't working yet, but, um, I feel pretty close on it. Honestly, like once, once all the inventory that I know is in the system is listed here, it kind of unblocks everything else." [16:28.6]

On the Spreadsheet View:

> **Client:** "spreadsheet view. I assume isn't working yet." [16:47.2]

> **Dev:** "Not yet. It's coming. It really is. Um, though I haven't worked on that since our last time, because I've been focused on getting inventory to work, which is a whole bunch of backend shit." [16:50.8]

The Customer closes with warmth and engagement:

> **Client:** "sounds good, buddy. Well, I really appreciate your, your efforts. And I love being engaged with this project. So whenever there's anything or any reason you want, just let me know." [17:05.8]

**Analysis:** The closing confirms three things. First, the dashboard is the top priority — the Customer said it explicitly. Second, the Customer is disappointed but patient — they understand the technical challenges and are willing to wait. Third, the Customer is deeply engaged and wants to be involved — this is not a passive user; they are a partner in the product development process. The phrase "I love being engaged with this project" suggests that regular feedback sessions like this one are valuable and should continue.

---

## 5.0 Design and Presentation Analysis

This section synthesizes all customer feedback into a cohesive design strategy, focusing on how to execute the homepage from a UI/UX and presentation perspective.

### 5.1 Core Design Principles

Based on the complete analysis, the following five principles should govern the design of the homepage.

**Principle 1: Data First, Not AI.** Present raw, relevant data without interpretation. The system should never use language like "We recommend" or "You should focus on." The Customer is the expert; the system is the display. This principle is derived directly from the user's feedback on the initial mockup, where they rejected the recommendation engine approach.

**Principle 2: Clarity Through Structure.** Use clear section headings and strong visual separation to create distinct informational zones. Each zone should correspond to one of the "Tetris" questions. The Customer's own enumeration of dashboard requirements (payables, inventory by category, cash, aging) provides the exact structure.

**Principle 3: Hierarchy Matches Workflow.** Information must be organized by importance as defined by the Customer's daily workflow, not by system capabilities or data availability. The Customer's workflow starts with "What do I need to deal with today?" and moves to "What's the state of the business?" The homepage should mirror this progression.

**Principle 4: Scannability Over Density.** Use tables with large typography for key numbers, consistent formatting, and generous whitespace. The Customer needs to absorb the state of the business in seconds, not minutes. Every element must earn its place on the page.

**Principle 5: Mobile-Native Responsiveness.** The Customer mentioned using their phone for calendar management and implied a mobile-first workflow. The design must be flawless on mobile, with bottom navigation, touch-friendly targets, and responsive table layouts that hide secondary columns on small screens.

### 5.2 Recommended Homepage Structure

The homepage should consist of five sections, presented as clean, unadorned data modules. Each section is a `Card` component containing either KPI numbers or a `DataTable`.

**Section 1: Money.** This section presents four key financial metrics in a 4-column grid (2x2 on mobile): Cash on Hand, Payables Due (7 days), Receivables Outstanding, and Net Available. The numbers should be large and bold, with small gray labels above them. This provides an instant financial snapshot that answers "How much money do I have and how much do I owe?"

**Section 2: Inventory by Category.** This section presents a table with rows for each product category (Deps, Indoor, Outdoor, Smalls, Candy Ends) and columns for Units, Value, and price brackets ($100-200, $200-300, $300-400, $400+). On mobile, the price bracket columns should be hidden behind a horizontal scroll or collapsed by default. This directly implements the Customer's specific request at [04:28.4]. A summary row at the top should show total units and total value.

**Section 3: Aging Inventory.** This section presents a table of inventory items sorted by age in descending order (oldest first). Columns should include Item Name, Category, Age (in days), and Value. The Customer specifically requested "the five, 10 oldest things" at [05:07.5], so this table should show 5-10 items by default with a "View All" link. No color coding, no urgency badges — just the data, sorted by age.

**Section 4: Client Debt.** This section presents a table of clients with outstanding balances, sorted by the age of their oldest invoice. Columns should include Client Name, Balance, Oldest Invoice Age, and Last Payment Date. This answers "What am I going to lose money on?" and provides the foundation for the debt warning system. The data is presented neutrally — the Customer will recognize which balances are problematic based on their knowledge of each client.

**Section 5: Recent Orders.** This section presents a simple table of the most recent orders, showing Client, Date, Amount, and Days Since Previous Order. This provides context for recent activity and helps answer the Customer's question about "who we haven't seen in a while" at [06:31.3].

### 5.3 What NOT to Include on the Homepage

Based on the interview, the following elements should be explicitly excluded from the homepage:

The **calendar** should not appear. The Customer said "I think that's a later version thing" at [05:34.8].

**Client email addresses** should not appear anywhere prominent. The Customer said "I don't know any of my clients emails" at [08:02.7].

**Complex metric visualizations** (charts, graphs, trend lines) should not appear on the homepage. The Customer's preference for simplicity and their confusion with the Leaderboard metrics suggests that visual complexity will be counterproductive.

**Recommendation or suggestion language** should not appear. No "Focus Items," no "Needs Attention," no "We Suggest." The system presents data; the user provides intelligence.

**The Leaderboard** should not be replicated on the homepage. It is a valuable tool on its own page, but bringing its complexity to the homepage would violate the simplicity principle.

### 5.4 The Debt Warning System: Design Considerations

The debt warning system is the only genuinely new, high-value feature requested. Based on the Customer's description at [11:21.4], the system should monitor client debt against configurable thresholds and provide a signal when a client's debt is "going bad."

The design challenge is implementing this without violating Principle 1 (Data First, Not AI). The recommended approach is to let the data speak for itself. On the Client Debt table, clients whose oldest invoice exceeds a configurable threshold (e.g., 30 days) could have their row displayed with a subtle visual differentiation — perhaps a slightly different background color or a small icon. This is not a "recommendation" — it is a factual indicator that a threshold has been crossed. The Customer can then decide whether to take action.

The threshold itself should be configurable in the system settings, not hardcoded. Different businesses will have different tolerance levels for overdue debt.

### 5.5 The AR/AP Permission Model

The Customer's comment about payment risk at [15:55.4] reveals a clear permission hierarchy that should be reflected in the UI:

The accounting role ("Z") should have access to: Pay Vendor, Post Journal Entry, Create Invoice, Create Bill, and Record Expense. These are "low risk" actions.

The owner role should have exclusive access to: Receive Payment. This is a "higher risk" action because it involves handling cash from clients.

The UI should enforce this by hiding or disabling the "Receive Payment" button for users without the appropriate role. The existing WS-001-SPEC.md mentions RBAC/permissions, so this is a matter of implementation, not design.

### 5.6 Existing Components That Can Be Leveraged

A codebase review revealed that many of the requested features already exist as components that simply need to be surfaced or configured differently.

| Existing Component | Current State | Required Change |
|---|---|---|
| `AgingInventoryWidget.tsx` | Fully implemented, hidden by default | Enable in default dashboard preset |
| `AvailableCashWidget.tsx` | Implemented, shows cash and scheduled payables | Surface on homepage |
| `TotalDebtWidget.tsx` | Implemented | Surface on homepage |
| `ClientDebtLeaderboard` | Implemented, hidden by default | Enable in default dashboard preset |
| `MatchmakingOpportunitiesWidget` | Shows overdue reorders | Surface on homepage or clients page |
| `InventorySnapshotWidget.tsx` | Exists but lacks category/price bracket breakdown | Enhance with category x price bracket table |
| `WeightCustomizer.tsx` | Fully implemented for Leaderboard | No change needed |
| `QuickCreateClient.tsx` | Allows name-only creation | No change needed |
| `DashboardPreferencesContext` | Manages widget visibility and layout | Add new "mvp_owner" preset |

This means that a significant portion of the homepage can be built by **reconfiguring existing components** rather than building new ones. The primary new development work is the inventory category/price bracket table and the debt warning threshold system.

---

## 6.0 Open Questions and Ambiguities

Several topics from the interview remain ambiguous or require follow-up:

**Price bracket boundaries.** The Customer mentioned "one to 200, from two to 300, from three to four" at [04:40.0]. Are these $100-200, $200-300, $300-400? And what about items above $400? The brackets need to be confirmed and made configurable.

**"Candy ends" definition.** The Customer uses the term "candy ends" as a product category. This appears to be industry-specific terminology that should be confirmed and documented.

**Debt warning thresholds.** The Customer wants to be warned when "clients debts are going bad" at [11:21.4], but what constitutes "going bad"? Is it a dollar amount, a number of days overdue, or a combination? This needs to be defined.

**"Z" role definition.** The Customer refers to their accounting person as "Z" and describes a specific workflow where they give her "a big chunk" of cash and she tracks expenses. The exact permissions and workflow for this role need to be formalized.

**Client login names.** The Customer asked about storing client login names at [08:09.9]. The Developer confirmed this is where they would go, but the scope and implementation of client-facing login functionality was not discussed further.

**Tigger.** The Customer mentions "Tigger" at [01:08.2] as someone who could join the call but shouldn't see a "half done thing." This appears to be another stakeholder (possibly a business partner) who will eventually need to be onboarded. Their needs and perspective are unknown.

---

## 7.0 Actionable Recommendations

### 7.1 Immediate Priority: Build the Simplified Homepage

The single most impactful action is to build the simplified, data-driven homepage as described in Section 5.2. This directly addresses the Customer's top priority ("my question about the dashboards... was probably the most important one") and can be largely accomplished by reconfiguring existing components. Estimated effort: 12-16 hours.

### 7.2 High Priority: Implement the Debt Warning System

The debt warning system is the only genuinely new, high-value feature requested. It should be designed as a configurable threshold system that provides subtle visual indicators on the Client Debt table, not as an intrusive alert system. Estimated effort: 16-20 hours.

### 7.3 Medium Priority: Add Metric Explanations to Leaderboard

The Customer's confusion about metric definitions ("what's reliability," "what's engagement") indicates a need for tooltips or info icons on the Leaderboard page. This is a small but high-impact UX improvement. Estimated effort: 3-4 hours.

### 7.4 Medium Priority: Implement Payment Permission Controls

The Customer's comment about receiving payments being "higher risk" should be translated into role-based access controls that restrict the "Receive Payment" action to owner-level users. Estimated effort: 4-6 hours.

### 7.5 Low Priority: Default Landing Page Preference

Allow users to choose their default page upon login. The Customer indicated they would prefer Inventory, but with the new homepage in place, this may become less important. Estimated effort: 2-3 hours.

### 7.6 Deprioritized: Calendar Integration

Formally move to the long-term backlog. The Customer explicitly said "that's a later version thing."

### 7.7 Deprioritized: Metric Consolidation

The Customer suggested combining metrics "into less things" but also said "not very important." This should be revisited after the homepage is live and the Customer has had time to use the system regularly.

---

## Appendix A: Full Interview Transcript

The complete transcript is reproduced below with timestamps. Speaker identification is approximate based on conversational context. "Dev" refers to the product owner/developer. "Client" refers to the customer/business operator.

```
[00:00.0 - 00:04.8] Client: days or a week, like, I don't mind, um, uh, waiting buddy.
[00:04.8 - 00:09.5] Client: Like, like there's no point in spinning your wheels if you need a couple more hours or whatever.
[00:10.0 - 00:15.8] Dev: Well, I mean, I think the fact is like, it could just a couple more hours would always be useful.
[00:15.9 - 00:22.8] Dev: And, um, that I still need kind of, I need this feedback.
[00:23.0 - 00:24.2] Dev: Um, okay, great.
[00:24.3 - 00:26.0] Client: I love giving feedback, so I'm ready.
[00:26.5 - 00:26.8] Dev: Cool.
[00:26.9 - 00:28.9] Dev: I, yeah, I appreciate that.
[00:29.9 - 00:32.4] Dev: I feel your patience and, uh, I'm feeling it.
[00:32.5 - 00:35.7] Dev: I feel actually like pretty good about it now.
[00:35.8 - 00:42.4] Dev: Um, that I've kind of validated that I'm not just being a total dummy about some of this stuff.
[00:42.6 - 00:59.6] Dev: Um, but really what I want to do is just go through these, go through all the sidebar things. You tell me actually what feels helpful versus what is just like, get rid of it completely or like stash it for far later.
[01:00.0 - 01:06.7] Dev: Uh, and also some of the like nomenclature stuff, like I'm still kind of trying to figure out.
[01:08.2 - 01:14.8] Dev: The, I can also add, add, uh, I can have Tigger over or we can do a, I don't know, can you do a three way signal call?
[01:16.6 - 01:17.2] Client: I don't know.
[01:17.4 - 01:18.4] Dev: No, I don't think so.
[01:19.1 - 01:25.1] Client: I mean, maybe, I think you can. I mean, I've done, I've done four way signal video calls before.
[01:26.2 - 01:27.3] Dev: Oh, I guess you have a group.
[01:27.8 - 01:28.7] Client: Yeah. That makes sense.
[01:30.1 - 01:33.5] Dev: Well, I don't want to freak Tigger out with a half done thing. Like I already did once.
[01:35.2 - 01:43.3] Dev: So we already talked about the dashboard. Um, when you log in to this application, what's the first thing that you want to see?
[01:44.8 - 01:48.2] Client: Inventory, dashboard, cash.
[01:49.1 - 02:05.6] Client: Uh, I was just going to open up my current laptop. It doesn't really matter what I probably inventory would be where I'd like it to pop up, you know, just because that's the thing we scroll through the most, like just understanding who we need to pay. And, and, um, yeah.
[02:06.3 - 02:10.8] Client: Um, and what's aging and like, what do I need to focus on with my day?
[02:10.9 - 02:18.9] Client: Because it's basically this job is like Tetris and it's like, what are you out of? What do you have too much of what's about to go bad? What am I going to lose money on?
[02:19.6 - 02:20.0] Dev: Yeah.
[02:20.2 - 02:25.6] Dev: So that can we actually unpack that for a second that this actually feels really helpful.
[02:25.7 - 02:26.0] Client: Okay.
[02:26.1 - 02:33.6] Dev: So inventory right now is kind of your like homepage because of all the things that you just mentioned. Right.
[02:34.5 - 02:42.0] Dev: Um, but conceptually here, like you aren't going to have to scroll through inventory to figure out who you're going to have to pay. Right.
[02:42.5 - 03:00.2] Client: Or yeah, I can conceptually like organize it by what is old or what I own or what, um, uh, I'm low on, like I'm low on candy ends from five to seven.
[03:00.5 - 03:11.6] Dev: Okay. So, um, what I hear low on patch feature is not actually in inventory that might be in needs or something, but yeah. Right.
[03:12.0 - 03:27.1] Dev: So that's what, I guess I'm trying to figure out like whether a dashboard would be helpful if it gave you a better, just quick snapshot of the things that right now, you know, you're still very good at fat and fast at, because you've been doing a long time, but like you scroll through inventory to look for, it sounds like aging inventory.
[03:27.6 - 03:28.4] Client: Yeah.
[03:28.4 - 03:39.4] Client: Like, like I can't like, like the only way I can find out how many candies I have right now is by using your list generator, selecting for candies and then selecting the column.
[03:40.7 - 03:49.2] Client: And then I can't even tell like how many I have in each price category, unless I use that feature you gave me, but then it's a little complicated because there's so many price categories. So it's not just like five to 700 or something.
[03:52.2 - 03:53.9] Dev: Okay, cool. That's helpful.
[03:54.2 - 04:00.0] Dev: Um, some of this will probably be in the MVP. Some of it might not be, but, um, yeah, this is great. Okay.
[04:00.0 - 04:09.5] Dev: So, um, you want inventory snapshot, like you just discussed, you want who you owe money to or like, yeah. Who needs to get paid or do you need to know that?
[04:12.4 - 04:15.6] Dev: Or is that something that you would be comfy with?
[04:16.2 - 04:27.8] Client: On dashboard, on dashboard, I go to dashboard and I can see payables, due payables, scheduled office owned total units on hand.
[04:28.4 - 04:50.4] Client: And it'd be cool to see like depths, indoor, out, smalls, um, candy ends in various price brackets, you know, kind of like, that'd be cool. You know, depths from one to 200, from two to 300, from three to four, you know, just like some basic flower categories that we could create. That would be, that'd be cool.
[04:50.7 - 04:55.8] Dev: Okay. And then, you know, like how much money's on hand, you know, that kind of stuff.
[04:56.7 - 05:02.1] Client: And aging, uh, inventory. Does that feel like, okay, got it.
[05:02.4 - 05:14.7] Client: Um, how do you deal with... highlight of like a window of like the five, 10 oldest things, you know, kind of like focus on me.
[05:15.1 - 05:15.5] Dev: Great.
[05:16.7 - 05:34.8] Dev: In terms of your schedule, I imagine that like before you cop in the car, whatever you just like, look at the, um, the calendar, your calendar, um, does that feel like an important thing to have quick access to, Client: I don't think so.
[05:34.8 - 05:46.9] Client: I mean, I think it's just mostly, I think that's a later version thing. I think that's, it's just so easy to open my phone and confirm everyone and drag an appointment around or make it bigger or smaller. All with the touch of a finger. Yeah.
[05:47.2 - 05:49.1] Dev: Okay. Great. Yeah.
[05:50.4 - 06:10.6] Dev: Um, all right. So this is a new concept that you probably, I mean, yeah, I'm not sure how much you'll need it, but you might want to be able to quickly just click into your clients and, you know, sort by certain things, like see who has the highest debt or who has the most orders or things like that. And this is separate from like the leaderboard stuff.
[06:10.6 - 06:28.9] Dev: But I'm curious when you look at, um, just an overview page like that, like are there specific columns that would just be like contact doesn't seem like an important column to have it at all. Are there certain things that you would just love to be able to just like quickly just like sort by.
[06:29.0 - 06:42.8] Client: Yeah. That's a great, that's a great question. Um, I think it would be useful to know how often, um, you could kinda, you know, like who we haven't seen in a while, who do I need to reach out to? Nice.
[06:42.8 - 07:01.3] Client: You know, so that, that'd be valuable. Um, um, maybe who's, um, they're kind of overdue for an order or overdue for a drop, you know, I should reach out to them kind of thing. That would be really good.
[07:01.9 - 07:09.8] Dev: And does it feel important to be able to star certain clients? So they're like always at the top or something like, um,
[07:10.5 - 07:26.6] Client: you know, it seems like, yeah, I mean, I'm going to be able to click in, I'm assuming I can click on this and see their last order and what it was, or I can organize by when they were last there so I can see their recent order or something. Great.
[07:27.4 - 07:31.3] Client: Um, I'm just guessing, I'm just guessing what is the purpose of this sheet?
[07:31.8 - 07:36.2] Dev: Well, I mean, the real purpose of the sheet is also just to be able to like, this is where you come to add clients.
[07:36.9 - 07:37.3] Client: Okay.
[07:37.4 - 07:48.4] Dev: Um, it's a pretty simple process. Um, and we just, we need one place basically where it's just like, we don't need address information.
[07:48.4 - 07:58.7] Dev: Oh yeah, I know. Um, all that stuff also, like most of that stuff is on a feature flag. So, um, we just click it and it does like we turn off the flag and it disappears.
[07:59.4 - 08:00.6] Client: Okay, cool. Yeah. Love it.
[08:02.7 - 08:04.7] Client: I just like, I don't know any of my clients emails.
[08:05.6 - 08:07.4] Dev: Yeah. Nor should you need to. Um,
[08:09.9 - 08:16.6] Client: in terms of maybe I need their login names, is this where their login names would be so they can log into the backend? Dev: Yeah, exactly. Mm hmm.
[08:17.2 - 08:36.6] Dev: Um, do you, in terms of adding clients, there's not, you know, you're not going to need to put any of this contact information, um, other than certain things like, yeah, payment terms.
[08:36.6 - 08:43.0] Dev: This will also be the area that, um, initial like credit settings go or things like that.
[08:43.8 - 09:04.0] Dev: Are you able to, or do you create client? I guess you don't really have this concept. I'm trying to figure out when you're going to create a client because you need to be able, like a client, either like a buyer or a vendor, there's a concept that like, you're going to need to add them as an entity before you transfer...act with them.
[09:04.0 - 09:21.6] Client: Okay. Um, does that, I don't want it to be overburdened some, but it's just kind of a reality of like a, of a system like... we rarely add plants. So it's going to happen like four times a year, you know? Yeah. Okay. Yeah.
[09:26.3 - 09:40.6] Client: Yeah. And if someone's coming in once, we can just put it on somebody else's tab, you know, like if I see Bob every week and Bob brings his buddy Tony one time, then yeah, yeah. Right. Right. You can just go on Bob's tab. Okay.
[09:42.0 - 09:55.0] Dev: Um, this is something that's gotten, uh, improved a fair amount. Um,
[09:57.0 - 10:04.6] Dev: because you, I think gave some specific feedback last time that it was pretty, easy to take action on. Um,
[10:06.7 - 10:10.8] Dev: do these tabs look interesting to you?
[10:12.8 - 10:23.4] Client: Um, master score is like a combination of how quickly they're turning over their debt and how, how, I don't know, I'm assuming it's some combination of things.
[10:23.5 - 10:32.4] Dev: Exactly. Which, which is also like kind of like a recipe or formula thing that we can control. Client: I love it. I figured. Yeah. Okay. Um,
[10:32.4 - 10:41.4] Client: so a dual, I love it. I love it. It's dual is basically a supplier and a, and a yep. A buyer, um,
[10:41.5 - 10:53.5] Client: percentile, uh, trend is up or down, up or down. And then, uh, uh, I'm assuming we can see like the quality of their debt somehow.
[10:53.5 - 10:54.3] Dev: Okay.
[10:57.0 - 11:08.7] Dev: Yeah. So, um, I'll make this so it's more visible in terms of like how it works, but right now, yeah. So this, the financial ranking rankings, um,
[11:09.2 - 11:17.8] Dev: weight revenue, lifetime value margins. Uh, and I believe it does have a debt turnover, but
[11:18.6 - 11:27.5] Client: yeah, I was mostly, I was also really excited about, you said you were gonna have some kind of tool that would like warn us when clients debts are going bad and to stop loaning the money kind of thing.
[11:27.5 - 11:29.5] Dev: Oh yeah. Yeah. Um,
[11:33.3 - 11:44.5] Client: because you know, like that could be, um, there could be even far less options on that sheet, you know, on the, um, on the, it has, it has a lot of information. Like,
[11:46.0 - 11:53.3] Client: I love, I love it, but we'll almost need like a, like what's reliability, like how often they show up or this is their payment behavior actually.
[11:53.4 - 11:56.3] Dev: So this is the, how quickly they repaid debts.
[11:56.8 - 12:07.4] Client: But combining that with financial sounds like that is the most important, like that actually is more important. Um,
[12:09.0 - 12:12.6] Client: trend is kind of growth, right? Dev: Yeah, exactly. Um,
[12:12.8 - 12:24.7] Dev: well trend is their ranking. Like if they're doing better or worse, basically. Um, growth is like actually how much they're spending with you is growing. So it's kind of like, um, velocity.
[12:30.4 - 12:34.7] Client: Got it. Yeah. We'll need a little explanation on these.
[12:34.8 - 12:49.8] Client: And then, um, uh, yeah, I mean maybe we can just combine them into, into less things, um, but not, not very important as long as I, I don't grasp it now, but I, I'm sure I will grasp it eventually.
[12:50.6 - 12:54.8] Dev: Yeah. Um, engagement and what's engagement again?
[12:57.0 - 13:10.6] Dev: Um, this one is frequency and recency. Oh, it says it right there. Order frequency and recency. Client: Okay. So like how, how engaged are they? How often are they coming? Dev: Exactly. Client: Okay, cool. Um,
[13:12.4 - 13:18.6] Dev: and you can see up here this one and then his master score, a combination of financial engagement, reliability and growth. Yeah.
[13:18.6 - 13:26.8] Dev: So the thing that you see up here at the top, which is these customized weights, yeah. Um, this contributes to the master score basically.
[13:26.9 - 13:45.5] Dev: So how much revenue they've done on time payments, how quickly, how much they're ordering, what your margin is, how much of their credit they're using, um, year over year growth. So we could change that to a different sort of growth and then days since last order. Like,
[13:46.2 - 13:52.5] Client: nice. That's cool. I love that. And so a master score is just a combination of all of them. Yeah.
[13:52.5 - 14:06.3] Dev: I mean you can rank them or weight them differently. Um, these are, yeah. Also things that I think we'll customize further, but I want to make sure that we're at least sparking up the right tree. Um,
[14:07.6 - 14:15.3] Client: okay. There's like two other things that I want. I can work for me.
[14:18.6 - 14:24.2] Dev: Well, here's Momo's photography module. Yep. Um,
[14:27.5 - 14:35.4] Dev: invoices in ARAP. Um, this has gotten a lot more accurate since we last spoke.
[14:36.1 - 14:48.1] Client: What is ARAP again? Dev: Um, accounts receivable and accounts payable. Client: Okay. Um, so this is like your payment office. Dev: Like this is going to be their command center basically.
[14:49.5 - 15:15.8] Dev: So with that in mind, I guess thinking about what somebody who's working in your accounting divisions, um, dashboard or just like command center would look like, I imagine, you know, this sort of stuff is interesting for you, but really what they're going to want is just like this, which is basically just like, here are all the actions I can receive a payment. I can pay somebody journal entries, um, expenses.
[15:21.2 - 15:26.8] Client: She never, Oh, I guess if I give her a bag of money, that's receiving the payment. Okay.
[15:28.1 - 15:35.3] Client: Like for Z, I just, I just occasionally give her a big chunk and then she just writes down how much is coming out of that chunk.
[15:36.2 - 15:46.3] Dev: Does she not ever, she doesn't receive payments from, okay. You do. And then she comes and picks them up. Cool.
[15:46.4 - 15:54.6] Dev: So this is going to be important for you actually, cause this is just, just a really quick way of you being able to,
[15:55.4 - 16:00.1] Client: she only needs like low risk farmers. I feel like receiving payments is a little bit higher risk.
[16:00.6 - 16:03.4] Dev: Yep. That makes sense. Okay. That's good to know.
[16:07.4 - 16:09.7] Dev: Um, okay.
[16:18.6 - 16:28.3] Client: yeah, there's a bunch of other stuff that's much smaller, but I think that honestly, like my question about the dashboards and what we just talked about was probably the most important one. Okay.
[16:28.6 - 16:47.0] Client: I'm pretty disappointed that this isn't working yet, but, um, I feel pretty close on it. Honestly, like once, once all the inventory that I know is in the system is listed here, it kind of unblocks everything else. This is like kind of, I would say the final thing to get us to, um,
[16:47.2 - 16:49.6] Client: spreadsheet view. I assume isn't working yet.
[16:50.8 - 17:05.4] Dev: Not yet. It's coming. It really is. Um, though I haven't worked on that since our last time, because I've been focused on getting inventory to work, which is a whole bunch of backend shit. Um, yeah.
[17:05.8 - 17:17.6] Client: So sounds good, buddy. Well, I really appreciate your, your efforts. And I love being engaged with this project. So whenever there's anything or any reason you want, just let me know. Okay,
[17:17.8 - 17:22.8] Dev: cool. Um, you, uh, going to a comic to stand up tonight?
[17:24.8 - 17:45.2] Client: I was going to, but event bright blocked my account because I apparently tried to log in or buy too many tickets or something. I don't know. I don't have tickets. Dev: Well, uh, I can't, I contacted their customer support, so I got, I got nothing weird. Well, I hope that one way or another you get some laughs.
[17:45.7 - 17:57.9] Dev: And then when do you leave tomorrow? Client: Uh, Saturday morning. Dev: Cool. Client: But I love to talk while on vacation. Dev: So great. I can't wait to hear about all the worms, all the worms.
[17:59.0 - 18:06.9] Client: All right. Love you, bud. Thank you. Talk to you soon. Bye. Dev: Okay.
```

---

## Appendix B: Visual Context Notes from Video Frames

### Frame 1 (0:00) — Inventory Page
The TERP application is showing the Inventory page. The left sidebar navigation is visible with sections: SALES (Dashboard, Inbox, Clients, Orders, Interest List, Sales Sheets, Live Shopping, Leaderboard, Client Needs, Matchmaking, Quotes, Returns), INVENTORY (Pick & Pack, Products, Inventory [selected], Photography, Samples, Purchase Orders, Vendors, Vendor Supply, Spreadsheet View, Direct Intake). The main content area shows "Inventory — Manage batches and stock levels" with a search bar and filters (All Statuses, All Categories). It displays Batches: 0, Live: 0, Value: $0.00 with a loading spinner visible — inventory is not loading. The user is signed in as "TERP Operator."

### Frame 4 (3:00) — Dashboard Page
The Dashboard is selected in the sidebar. It shows "Overview of your business metrics and activity." The Cash Flow section displays Cash Collected: $5,828,886.76 and Cash Spent: $0.00. The Sales section shows client rankings with Total Sales: Bay Distribution ($322,283), Green Cannabis Co ($386,406), Santa Rosa Reserve ($267,967), Los Angeles Therapeutics ($249,913), Golden Health ($215,193), and more. "Customize" and "Comments" buttons are visible.

### Frame 7 (6:00) — Clients Page
The Clients page shows a client list with the header "Manage clients, track transactions, and monitor debt." Stats show Total: 101, With Debt: 0, LTV: $0.00. Columns visible are Name, Type, Contact, LTV, Debt, and Orders. The list shows a mix of "Buyer" and "Supplier" types with contact emails visible for each client. An "Add Client" button is in the top right.

### Frame 10 (9:00) — Create Sales Order Page (ERROR STATE)
The Orders > Create page is visible, showing "Create Sales Order — Build order with COGS visibility and margin management." Customer selected is Riverside Naturals. A large error is displayed: "Failed to load inventory" with a SQL error. A "No Credit Limit Set" warning is shown. Order Totals show $0.00 and "Order has validation errors" message appears. This is a known bug — inventory failing to load.

### Frame 11 (10:00) — Leaderboard Page
The Leaderboard page shows client performance metrics with the header "Track and compare client performance across key metrics." Tabs are visible: Master Score, Financial, Engagement, Reliability, Growth. A "Customize Weights" button is visible. The Master Score Rankings table shows: 1st Green Cannabis Co (DUAL) — 69.5 — Top 99%, 2nd Glendale Cannabis Co (CUSTOMER) — 66.3 — Top 98%, 3rd Emerald Naturals (CUSTOMER) — 64.2 — Top 97%. The FINANCE section is visible in the sidebar (Invoices, AR/AP, Credit Settings, Credits, Reports, Pricing Rules) along with the ADMIN section (Users, System Settings, Calendar, Todo Lists, Scheduling, Time Clock, Feature Flags, Workflow Queue, Locations).

### Frame 14 (13:00) — Leaderboard Customize Weights Modal
A modal shows "Customize Weights" for Master Score calculation with sliders: YTD Revenue 25% ("Year-to-date revenue contribution"), On-Time Payment 20% ("Payment reliability"), Order Frequency 15% ("Orders per period"), Profit Margin 15% ("Profitability percentage"), Credit Utilization 10% ("Credit line usage"), YoY Growth 10% ("Year-over-year growth rate"), Recency 5% ("Days since last order"). Total: 100%. "Reset to Defaults" and "Save Weights" buttons are visible. The background shows the Engagement Rankings tab.

### Frame 15 (14:00) — AR/AP Accounting Dashboard
The AR/AP page is selected in the FINANCE section showing "Accounting Dashboard — Overview of your financial health and key metrics." Key metrics: Cash Balance $0.00, Accounts Receivable $2,492,412.54, Accounts Payable $1,753,971.17, Net Position $738,441.37 (AR minus AP). AR Aging breakdown: Current $1,005,720, 30 Days $559,758, 60 Days $476,819, 90 Days, 90+ Days. AP Aging breakdown: Current $957,646, 30 Days $933,612, 60 Days $758,620, 90 Days $291,125, 90+ Days. Top Debtors section shows "No outstanding balances." Top Vendors Owed shows "Unknown Vendor" entries with amounts ($258,649.91, $186,313.16, etc.). Bottom tabs: Overdue Invoices (96), Overdue Bills (44). "Configure Display" button visible.

### Frame 16 (15:00) — AR/AP Quick Actions and Invoices
The AR/AP page scrolled down shows Overdue Invoices (96) and Overdue Bills (44) tabs. The overdue invoices table displays: INV-20251123-00098 (West Coast Wellness Center, 12/07/2025, 52 days, $21,480.75), INV-20251124-00204 (Valley Cannabis Co, 12/08/2025, 51 days, $19,524.54), INV-20251125-00275 (Redwood Collective, 12/09/2025, 50 days, $14,700.10), INV-20251125-00374 (Los Angeles Therapeutics, 12/09/2025, 50 days, $180,052.48), INV-20251126-00190 (West Coast Apothecary, 12/10/2025, 49 days, $18,152.81). A "View All 96 Overdue Invoices" link is shown. The Quick Actions section has buttons: Receive Payment (green), Pay Vendor (green), Post Journal Entry, Create Invoice, Create Bill, Record Expense. Recent Invoices, Recent Bills, and Recent Payments sections are visible with various statuses (Paid, Viewed, Void, Pending, Received).

---

## Appendix C: Implementation Status Cross-Reference

### Items Already Implemented in Codebase (11 items)

| ID | Title | Evidence |
|---|---|---|
| MEET-001 | Inventory page fails to load | Known bug, tracked as BUG-040 in roadmap |
| MEET-003 | Spreadsheet View not functional | SpreadsheetViewPage.tsx exists, behind feature flag, FEATURE-SPREADSHEET-VIEW-SPEC.md exists |
| MEET-005 | Aging inventory highlight | AgingInventoryWidget.tsx exists with full implementation |
| MEET-009 | Client last seen / overdue tracking | PurchasePatternsWidget.tsx has daysSinceLastPurchase, MatchmakingOpportunitiesWidget shows overdue reorders |
| MEET-011 | Hide unnecessary contact fields | QuickCreateClient shows only name, email/phone as minimal required |
| MEET-014 | Minimal client creation fields | QuickCreateClient.tsx (WS-011) allows name-only creation |
| MEET-017 | Master Score is customizable | WeightCustomizer.tsx component exists in leaderboard |
| MEET-022 | Engagement = Frequency + Recency | LeaderboardPage.tsx shows ENGAGEMENT category with description |
| MEET-023 | Master Score weight components | WeightCustomizer allows customizing all mentioned weights |
| MEET-028 | Inventory functionality unblocks all | Already documented in UNIFIED_STRATEGIC_ROADMAP |
| MEET-032 | Create Sales Order fails to load inventory | Downstream of BUG-040 inventory loading |

### Items Already Spec'd (8 items)

| ID | Title | Existing Spec |
|---|---|---|
| MEET-010 | View client's last order from list | FEAT-009-CLIENT-LEDGER-SPEC.md |
| MEET-018 | Dual = Supplier + Buyer | CLIENT_TYPE_OPTIONS in LeaderboardPage.tsx |
| MEET-019 | Financial + Reliability most important | Metric categories in LeaderboardPage |
| MEET-024 | AR/AP is accounting command center | WS-001-SPEC.md, WS-002-SPEC.md |
| MEET-025 | Cash handling — bulk distribution | FEAT-007-CASH-AUDIT-SPEC.md |
| MEET-002 | Dashboard inventory by category | InventorySnapshotWidget.tsx (needs enhancement) |
| MEET-004 | Dashboard payables summary | Dashboard widgets exist (needs verification) |
| MEET-029 | Inventory as default landing page | DashboardPreferencesContext exists |

### Genuinely New Items (10 items)

| ID | Title | Priority | Effort |
|---|---|---|---|
| MEET-008 | Debt warning system for at-risk clients | Now | ~16-20h |
| MEET-002 | Dashboard inventory by category + price brackets | Now | ~4h (enhancement) |
| MEET-004 | Dashboard payables summary | Now | ~2h (configuration) |
| MEET-006 | Cash on hand display | Now | ~1h (configuration) |
| MEET-026 | Payment permission controls (Receive Payment = owner only) | Now | ~4-6h |
| MEET-013 | Store client login names | Next | ~4h |
| MEET-020 | Add metric explanations to leaderboard | Next | ~3-4h |
| MEET-021 | Consider consolidating metrics | Later | ~8h |
| MEET-029 | Set default landing page preference | Next | ~2-3h |
| MEET-031 | Simplify price category filtering | Next | ~4h |

---

*End of document.*
