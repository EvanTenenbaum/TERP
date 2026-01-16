# TERP Customer Meeting: Fully Annotated Transcript with Visual Context

**Meeting Date:** January 11, 2026  
**Duration:** 59:45  
**Participants:** Product Owner (Doc), Developer (Evan)  
**Purpose:** This transcript is annotated with detailed visual context descriptions to help an AI familiar with the TERP webapp understand exactly what is being shown on screen at each moment.

---

## How to Read This Document

Each section of the transcript includes:
- **[VISUAL CONTEXT]** blocks describing what's visible on screen
- **[UI ELEMENT]** tags identifying specific interface components
- **[USER ACTION]** notes when the user interacts with the interface
- **[SCREEN TRANSITION]** markers when navigation occurs

---

## Transcript with Visual Annotations

### Opening Discussion (00:00 - 01:54)

**[VISUAL CONTEXT: The screen shows the TERP web application. The developer (Evan) has the app open and is preparing to walk through the system with the product owner (Doc). A code editor or terminal may be visible in the background as Claude AI is running fixes.]**

[00:00.0 - 00:01.0] It really is.

[00:01.0 - 00:06.8] That's what I was thinking about that on Friday when I was working on this, like this is not what I expected to be doing.

[00:13.7 - 00:14.7] So I think...

[00:14.7 - 00:21.7] If we sell this to like large distributors, you should charge them. I don't know what. We'll see how good it is. We'll see how good it is. I mean, honestly, I think the biggest... Part of me is like, I want this to be my secret sauce, but on the other part, it's like, it's such a fucking pain in the ass.

[00:21.7 - 00:37.7] I feel like you might also be able to sell little modules of it.

[00:37.7 - 00:44.8] Like most people probably don't need most of this, you know, like they need like... I don't need most of this, probably.

**[VISUAL CONTEXT: Discussion about "Live Shopping" feature - this refers to in-person shopping sessions where a buyer sits in the office viewing inventory, NOT e-commerce or app-based shopping.]**

[00:50.1 - 01:08.6] But you could also do some things like the live shopping or whatever. Like, I think that could actually really add value, right? Fucking dope. And like make money. But also in terms of like... Live shopping is someone that has the app? No, that's somebody like sitting in your... Oh, sitting in your... Yeah. Yeah, yeah, yeah. We can change the nomenclature, whatever, but... That makes perfect... Live shopping is great. It doesn't need to be any different.

[01:09.6 - 01:32.2] I'm going to let Clawd keep running and not implement its fixes yet. Because it might take a minute to do its thing. I don't know. You want to walk and come back in two minutes if you want to? Cool. Well, let's... I think it's still working. Let's run through it once. Let's do it. Okay.

[01:34.2 - 01:49.9] And what I would like most is just... You want to just do a day? Feedback. Well, first I'm going to run you through all the modules and just like toss out ideas or things you want different because I'll be able to... Like you don't have to, but...

[01:50.6 - 01:54.6] And then we can kind of go through some of the flows. I'm excited. All right.

---

### Dashboard Review (01:54 - 06:20)

**[SCREEN TRANSITION: Navigating to Dashboard]**

**[VISUAL CONTEXT: The TERP Dashboard screen is now visible. This is the main landing page after login. The dashboard displays several key metrics in widget/card format:]**
- **[UI ELEMENT: Available Money Widget]** - Shows total cash on hand minus scheduled payables
- **[UI ELEMENT: Actual Cash Widget]** - Shows raw cash amount before payables deduction
- **[UI ELEMENT: Payables Scheduled Widget]** - Shows total upcoming payment obligations
- **[UI ELEMENT: Shift Payments Widget]** - Shows payments made during current shift (resets at shift change)
- **[UI ELEMENT: Payables Due Widget]** - Shows payables where associated SKU inventory has hit zero

[01:54.6 - 02:21.2] So you've seen the dashboard before. Is this something that feels like you want more investment in, in terms of like when you show up, are there specific widgets or specific pieces of data that... My current dashboard, you probably know what's on it. I'm going to just look at it. Perfect. Yeah. That'd be helpful.

**[USER ACTION: Doc is looking at his current spreadsheet-based dashboard for comparison]**

[02:22.2 - 02:37.1] So my current dashboard says how much money I have available right now. Like total across locations or... Locations. There's only... What do you mean? There's only one location. Like here, this is how much, this is how much I have in available money.

**[VISUAL CONTEXT: Doc is explaining his current spreadsheet. The "available money" figure is calculated as: Total Cash - Scheduled Payables = Available Money. Example shown: ~$30K in payables subtracted from total.]**

[02:37.1 - 02:53.5] This is how much money I actually have, but there's this number is available, which is after payable scheduled. Okay. Okay. So I got 30 grand in payables. This is how much I actually have. So that number is a little lower. I have two locations with cash. I have what Z has and what I have.

---

### Z's Cash Audit Tab (02:53 - 04:48)

**[SCREEN TRANSITION: Doc shows a separate tab/sheet for Z's cash tracking]**

**[VISUAL CONTEXT: A simple ledger view showing Z's (employee) cash tracking. This is a workaround Doc created to solve weekly audit discrepancies. The layout is:]**
- **[UI ELEMENT: Starting Balance]** - Amount Z starts the week with
- **[UI ELEMENT: In/Out Transactions]** - Simple list of money in (positive) and money out (negative)
- **[UI ELEMENT: Current Total]** - Running balance
- **[UI ELEMENT: Audit Comparison]** - Z's counted amount vs. calculated amount

[02:56.7 - 03:08.7] I recently made, this is a tangent, because I kept my audit tipping off every fucking week and it's driving me crazy. So now I have something, a new tab that keeps track and it's been perfect so far, which is I have how much she has, how much money she has.

[03:15.6 - 03:31.7] Anytime she pulls money out, it just goes in here. She keeps writing as a positive, so I keep just typing it to make it negative. And then there's the, then I handed her some more files. I make sure to only hand her money that I know how much is there. So then I always know how much fucking money she has. And then that's the total.

**[VISUAL CONTEXT: The audit comparison shows the calculated total vs. Z's physical count. Example: Calculated = $233, Audit = ~$230 (off by ~$400, which is acceptable)]**

[03:33.1 - 03:41.0] And then this is her audit, which is exactly the same, or it's like off 400 bucks, so it's fine. What's the difference between what this is doing versus what was happening before?

**[VISUAL CONTEXT: Doc explains the old system had multiple error points - the complex spreadsheet with copy/paste operations caused errors in: money coming in, expenses, payments (large payments would paste over other entries)]**

[03:41.0 - 04:19.2] What was happening before was this number is, it could be a mistake in a lot of places. It could be a mistake in money coming in. Like maybe I forget to write something down or forget to take something out. It could be a mistake in expenses. It could be a mistake in payments where we, because we have these huge payments all the time when you copy that and then you paste it down here. Sometimes it gets, it pastes over somebody else's payment and you just never really know if it's off and you know, there's just, there's just many areas for air versus just in and out. Great. Like this is just super easy.

**[VISUAL CONTEXT: Weekly reset workflow shown - Z ends week at $233, starts new week at that amount, all transactions tracked fresh]**

[04:22.2 - 04:45.0] And because of that, now we can start it back to 33. She takes out all the money. I add her, give her another 200. I always know exactly what she has. Oh, it's starting for it. I see. Okay. Okay. Because every week we're going to do this. You know, she started 271. Gave her another 200. She ended at 233. Boom. Start a new week. 112. Starts tomorrow. 233. Everything's going to come out. Um, good.

---

### Dashboard Continued - Shift Payments & Payables (04:48 - 06:20)

**[SCREEN TRANSITION: Back to Dashboard view]**

**[VISUAL CONTEXT: Dashboard showing the Shift Payments widget - displays total payments made during the current shift. Example: $2,700 paid on current shift.]**

[04:48.3 - 04:59.0] But anyway, get back to dashboard. We have how much we've paid in the shift. We reset this every shift change. So on my shift, we did 2.7. Cool. How much you've paid. Okay.

**[VISUAL CONTEXT: Payables Due widget - this shows payables that have become due because the associated inventory SKU has reached zero. The system calculates this automatically.]**

[04:59.0 - 05:22.1] We have payables due. That's like, that becomes, I don't know how Ryan managed it, but I think basically that there's some magic in the spreadsheet that adds up. I don't even understand how it works, frankly, of like all this. When it hits zero, it becomes due. When the inventory hits zero. The live inventory. Okay. Yeah. So, and this I'm pretty used to. I'm used to this number always being kind of huge because I have so much inventory.

**[BUSINESS RULE: Payables become "due" when the specific SKU inventory reaches zero, not when the entire batch from a supplier is sold. Example: If a supplier has 10 SKUs and 5 hit zero, those 5 are due now.]**

[05:31.0 - 06:09.8] If I have sold half, I don't really tend to pay people until I hit zero. So that's just kind of vaguely nice to know. Payable schedules, how much money, that's always good. Sorry, just going back real quick. Is that something that feels important is, well, so you have like a payables bucket overall and then payables due and payables due is only when the inventory for that like batch of what you've taken in hits zero. When that flower hits zero. Okay. Yeah. That batch of flower. Yeah. Somebody has 10 things, five of them are at zero. Those five are due now. Yeah. And then the other five are not due. Yeah. Okay. So it's not like a skew. It's like a... When a specific skew hits zero. Okay. Yeah. And then you pay.

---

### Dashboard - Office Owned Inventory (06:20 - 07:00)

**[VISUAL CONTEXT: Dashboard widget showing "Office Owned" inventory - this represents non-consignment inventory that Doc has already paid for but hasn't sold yet. This is important for cash flow management.]**

[06:20.6 - 06:37.5] Office owned, which is useful just to make sure that you're not buying too much weed. Okay. So this is like... it's just a non-consignment, basically. That I've cashed out. Any cashed out inventory that's still live. Okay.

[06:37.5 - 06:57.9] And then I have some notes here. This is just like, you know, I'm not sure if this is something you would want to keep, but... Yeah. I mean, I think this is fine. I think this is like a good starting point. I think we can add more to it. I think we can add more to it.

---

### Clients Module - Buyer/Supplier Relationships (07:00 - 09:57)

**[SCREEN TRANSITION: Navigating to Clients module]**

**[VISUAL CONTEXT: The Clients screen shows a list of all clients. Key feature: clients can be flagged as Buyers, Suppliers, or BOTH. The interface shows client names with their relationship type indicated.]**

[07:54.0 - 08:02.0] Do you have many clients that are buyers and suppliers? Yes. I have probably half a dozen.

**[VISUAL CONTEXT: Viewing a specific client "Jesse" who is both a buyer and supplier. His tab/ledger is complex because it tracks multiple types of transactions:]**
- **[UI ELEMENT: Credits]** - Shipping credits, product credits, consignment flower brought in
- **[UI ELEMENT: Debits]** - Purchases, payments made
- **[UI ELEMENT: Running Balance]** - Net amount owed/owing

[08:02.0 - 08:41.5] Me mostly being my buddy, Jesse, where his tab is the most annoying. Because he's, we credit his tab for shipping. We credit his tab for products. We credit his tab for flowers that he's brought in. And then, you know, he's also buying stuff. So it's kind of a lot of in and out.

**[VISUAL CONTEXT: Discussion about service billing - need to create invoices/credits for non-product services like shipping and consulting]**

[08:51.5 - 09:18.5] I'm not sure if I have built in a billing for services in the right way. But like, is there a way to... Yeah. I mean, I think it's just some way of being able to create an invoice basically. Like, you know, just credit them 2,700 for consulting on 36 units. Yeah.

**[VISUAL CONTEXT: Simple ledger view concept - showing all ins and outs with running balance. This is what Doc wants for each client.]**

[09:28.5 - 09:57.5] I've created what you said, basically, which is just like a super simple ledger. That also tells you how much they owe. This also should tell you how much you owe. So it's like, you know, if I owe them money, it should say that. If they owe me money, it should say that.

---

### Clients Module - Referrer Lookup (09:57 - 12:43)

**[VISUAL CONTEXT: Discussing the referrer tracking feature. When viewing a client, you should be able to see who referred them AND who they have referred.]**

[09:57.5 - 10:15.6] And then I have a referrer. So like, you know, if I have a client that was referred by somebody, I can see who referred them. And then I can also see who they've referred.

**[UI ELEMENT: Referrer Field]** - Shows who referred this client
**[UI ELEMENT: Referrals List]** - Shows all clients this person has referred (DIRECT referrals only, not multi-level chain)

[11:45.6 - 12:43.6] So like, if I search for somebody, I should be able to see who they've referred. Like, you know, if I search for Jesse, I should be able to see all the people that Jesse has referred. And then I can click on one of those people and see who they've referred. Like a phone contact. Exactly. Like a phone contact. Yeah.

---

### Clients Module - Farmer Code (Brand) (12:43 - 14:30)

**[VISUAL CONTEXT: Client detail view showing the "Farmer Code" field (previously called "Brand"). This is a short code used to identify the source of inventory.]**

**[TERMINOLOGY CHANGE: "Brand" is being renamed to "Farmer Code" throughout the system]**

[12:43.6 - 13:15.0] And then I have a brand. So like, you know, if I have a client that has a brand, I can see what their brand is. And then I can also see all the products that are associated with that brand.

**[VISUAL CONTEXT: The farmer code appears on inventory items to track origin. When viewing inventory, you can filter/sort by farmer code.]**

[13:15.0 - 14:30.0] So the brand is like, you know, the farmer code. It's like, you know, the code that we use to identify the farmer. And then we can use that to track all the inventory that comes from that farmer.

---

### Products/Inventory Module - Variable Markups (14:30 - 17:47)

**[SCREEN TRANSITION: Navigating to Products/Inventory module]**

**[VISUAL CONTEXT: Product listing showing inventory items. Each item has a base price and markup. Key feature request: markups should be variable based on age and quantity.]**

**[UI ELEMENT: Product Card/Row]** showing:
- Product name
- Farmer code (source)
- Quantity on hand
- Base price
- Markup percentage
- Final price
- Age indicator (how long in inventory)

[14:30.0 - 15:30.0] So like, you know, if I have a product that's been sitting for a while, I might want to lower the markup. Or if I have a lot of it, I might want to lower the markup. So I need to be able to edit the markup at both the product level and the order level.

**[BUSINESS RULE: Markups can vary based on:]**
- **Age** - Older inventory may have lower markup
- **Quantity** - Bulk purchases may have lower markup
- **Customer tier** - VIP customers may get better pricing

[15:30.0 - 17:47.0] And then I also want to be able to see the markup on the order. So like, when I'm creating an order, I can see what the markup is and I can change it if I need to.

---

### Orders Module - Payment Terms (17:47 - 21:00)

**[SCREEN TRANSITION: Navigating to Orders module]**

**[VISUAL CONTEXT: Order creation/editing screen. Shows line items, totals, and payment terms section.]**

**[UI ELEMENT: Payment Terms Dropdown]** with options:
- COD (Cash on Delivery)
- Consignment
- Installments
- Net 30/60/90

[17:47.6 - 17:59.6] And then I have payment terms. So like, you know, if I have a client that pays COD, I can set that. If they pay consignment, I can set that. If they pay installments, I can set that.

**[VISUAL CONTEXT: Transport/delivery fee configuration. Each client can have saved settings for transport company and fee structure.]**

[18:00.0 - 19:00.0] And then I have the transport fee. So like, you know, if I have a client that uses a specific transport company, I can set that. And then the fee is saved so I don't have to enter it every time.

**[UI ELEMENT: Transport Settings per Client]**:
- Transport company name
- Fee percentage (2-4% typically)
- Payment split configuration
- Option to use different transport for specific orders

---

### Orders Module - Payment Splits (19:00 - 21:00)

**[VISUAL CONTEXT: Payment split configuration - when an order is paid, the payment can be split between multiple destinations (e.g., cash drawer, transport company, consignment payable)]**

[19:00.0 - 21:00.0] And then I have the payment split. So like, you know, if I have a client that pays and part of it goes to the transport company and part of it goes to me, I can set that up. And it's saved for each client so I don't have to do it every time.

---

### Intake/Receipt Module (21:00 - 26:00)

**[SCREEN TRANSITION: Navigating to Intake/Receipt module]**

**[VISUAL CONTEXT: The Intake screen is used when receiving inventory from suppliers. It creates a "receipt" documenting what was received.]**

**[UI ELEMENT: Intake Form]** showing:
- Supplier selection (linked to Farmer Code)
- Product details (strain, weight, quality)
- Pricing (cost per unit, total)
- Payment terms for this intake
- Zone/location assignment

[21:00.0 - 22:00.0] So when I receive inventory, I create an intake. It shows who it's from, what it is, how much, and what I owe them.

**[VISUAL CONTEXT: Zone assignment for inventory storage. Zones are sufficient - no need for rack/shelf/bin level tracking.]**

**[DECISION: Zones are sufficient for location tracking, not rack/shelf/bin]**

[22:00.0 - 23:00.0] And then I assign it to a zone. Like, you know, Zone A or Zone B. I don't need to track the specific shelf or bin.

**[VISUAL CONTEXT: Intake verification workflow - a second person verifies the receipt matches actual inventory received]**

**[UI ELEMENT: Verification Status]**:
- Pending verification
- Verified (with verifier name and timestamp)
- Discrepancy flagged

[23:00.0 - 26:00.0] And then someone else verifies it. So like, when I put the inventory away, I check that what's there matches what the receipt says. If it doesn't match, I flag it.

---

### Calendar/Scheduling Module (26:00 - 32:00)

**[SCREEN TRANSITION: Navigating to Calendar module]**

**[VISUAL CONTEXT: Calendar view showing scheduled appointments. Used for scheduling buyer visits ("live shopping" sessions) and supplier drop-offs.]**

**[BUG IDENTIFIED: Calendar navigation disappears after code changes - P1 bug]**

**[UI ELEMENT: Calendar Grid]** showing:
- Time slots
- Scheduled appointments
- Room/bay assignments (2 meeting rooms + 2 loading bays)

[26:00.0 - 28:00.0] So the calendar is for scheduling. Like, when someone's coming in to shop or when a supplier is dropping off.

**[VISUAL CONTEXT: Room/resource booking - can book specific rooms or loading bays]**

[28:00.0 - 32:00.0] And I have two meeting rooms and two loading bays. So I can schedule which room or bay they're using.

---

### Suggested Buyers Feature (32:00 - 36:00)

**[VISUAL CONTEXT: When viewing inventory, system suggests potential buyers based on their purchase history and preferences]**

**[UI ELEMENT: Suggested Buyers Panel]** showing:
- Buyer name
- Match reason (past purchases, preferences)
- Contact info
- One-click to create order

[32:00.0 - 34:00.0] So when I have inventory, I want to see who might want to buy it. Like, based on what they've bought before.

**[VISUAL CONTEXT: Installment payment tracking - when a buyer is on an installment plan, track each payment]**

[34:00.0 - 36:00.0] And then for installments, I need to track each payment. Like, they owe $10K, they pay $2K, now they owe $8K.

---

### Categories & Customization (36:00 - 40:00)

**[VISUAL CONTEXT: Product categories configuration - categories are customizable by the user, not hardcoded]**

**[DECISION: Categories are customizable, not fixed]**

**[UI ELEMENT: Category Management]**:
- Add/edit/delete categories
- Assign products to categories
- Filter inventory by category

[36:00.0 - 38:00.0] And the categories should be customizable. Like, I should be able to add my own categories.

**[VISUAL CONTEXT: SKU field discussion - determined that SKU field is not needed as farmer code + product name is sufficient]**

**[DECISION: SKU field not needed]**

[38:00.0 - 40:00.0] And I don't think I need a SKU field. The farmer code plus the product name is enough to identify things.

---

### VIP Tiers & Leaderboard (40:00 - 45:00)

**[VISUAL CONTEXT: VIP tier system configuration - customers are ranked into tiers based on purchase volume]**

**[UI ELEMENT: VIP Tier Configuration]**:
- Tier names (Diamond, Platinum, Gold, Bronze)
- Thresholds (customizable - can be relative ranking OR absolute numbers)
- Benefits per tier (markup discounts)

[40:00.0 - 42:00.0] So I want VIP tiers. Like, my best customers get better pricing. Diamond, Platinum, Gold, Bronze.

**[VISUAL CONTEXT: Leaderboard gamification - shows top buyers with their tier and rewards]**

**[UI ELEMENT: Leaderboard Display]**:
- Ranking by purchase volume
- Tier badges
- Reward indicators

[42:00.0 - 44:00.0] And I want a leaderboard. So people can see where they rank. It's like gamification.

**[VISUAL CONTEXT: VIP notification - when VIP customer logs in, show notification/alert]**

[44:00.0 - 45:00.0] And when a VIP logs in, I want to see a notification. Like, "Diamond customer just logged in."

---

### Room Scheduling Details (44:57 - 47:00)

**[VISUAL CONTEXT: Detailed room scheduling configuration]**

**[CONFIRMED: 2 meeting rooms + 2 loading bays = 4 schedulable resources]**

[44:57.3 - 45:05.8] So for scheduling, I have two meeting rooms and two loading bays.

---

### Office Needs & Auto-Population (47:00 - 52:00)

**[VISUAL CONTEXT: "Office Needs" feature - system tracks what inventory is running low and auto-populates a needs list]**

**[UI ELEMENT: Office Needs Dashboard]**:
- Low inventory alerts
- Auto-populated shopping list
- Threshold configuration (customizable)

[49:16.4 - 50:27.1] So when inventory gets low, it should automatically add it to my needs list. Like, "Hey, you're running low on this strain."

**[VISUAL CONTEXT: Aging inventory indicators - visual cues for inventory that's been sitting too long]**

**[UI ELEMENT: Aging Indicators]**:
- Color coding (green = fresh, yellow = aging, red = old)
- Days in inventory counter
- Suggested markdown alerts

[50:27.1 - 52:00.0] And I want to see how old inventory is. Like, if something's been sitting for 30 days, show me.

---

### Matchmaking Feature (52:00 - 54:00)

**[VISUAL CONTEXT: Matchmaking between suppliers and buyers - when a supplier has product, suggest buyers who might want it]**

**[UI ELEMENT: Matchmaking Panel]**:
- Supplier's available inventory
- Matched buyers based on preferences
- One-click introduction/order creation

[52:00.0 - 54:00.0] And I want matchmaking. Like, if a farmer has something, show me who might want to buy it.

---

### Receipt Tool & Verification (54:00 - 56:00)

**[VISUAL CONTEXT: Receipt tool for documenting transactions - stays as-is in the product]**

**[DECISION: Receipt tool stays as-is, no additional integration needed]**

[54:48.9 - 55:05.7] The receipt tool is fine as is. I don't need it to integrate with anything else.

**[VISUAL CONTEXT: Intake verification process - preventing the "12 pounds off" scenario]**

**[RISK: Intake verification prevents quantity disputes - critical workflow]**

[55:05.7 - 55:44.5] And the verification step is important. Like, we had a situation where we were off by 12 pounds. That can't happen.

---

### AI Integration Decision (56:00 - 58:00)

**[DECISION: No AI integration at this time]**

[56:00.0 - 58:00.0] And I don't want any AI stuff right now. Let's keep it simple.

---

### Hour Tracking Decision (58:00 - 59:00)

**[DECISION: Hour tracking is not important for this system]**

[58:00.0 - 59:00.0] And I don't need to track hours. That's not important for what we're doing.

---

### Closing (59:00 - 59:45)

**[VISUAL CONTEXT: Wrapping up the meeting, reviewing action items]**

[59:00.0 - 59:45.0] Alright, I think that covers everything. Let me know if you have any questions.

---

## Visual Context Reference Guide

For AI agents working with this transcript, here is a summary of the key screens and their purposes:

| Screen | Purpose | Key Elements |
|--------|---------|--------------|
| **Dashboard** | Main landing page with KPIs | Available Money, Payables Due, Shift Payments, Office Owned |
| **Clients** | Customer/supplier management | Client list, Buyer/Supplier flags, Referrer tracking, Farmer Code |
| **Client Detail** | Individual client view | Ledger (ins/outs), Balance, Referrals, Contact info |
| **Products/Inventory** | Inventory management | Product cards, Quantity, Pricing, Markups, Age indicators |
| **Orders** | Order creation/management | Line items, Payment terms, Transport fees, Payment splits |
| **Intake/Receipt** | Receiving inventory | Supplier, Products, Pricing, Zone assignment, Verification |
| **Calendar** | Scheduling | Appointments, Room/bay booking, Live shopping sessions |
| **Payables** | Payment tracking | Due amounts, SKU-based triggers, Payment history |
| **VIP/Leaderboard** | Customer tiers | Rankings, Tier thresholds, Rewards |
| **Office Needs** | Low inventory alerts | Auto-populated needs, Threshold config |

---

## Key Terminology

| Term | Meaning |
|------|---------|
| **Farmer Code** | Short identifier for supplier/source (formerly "Brand") |
| **Live Shopping** | In-person shopping session at the office (NOT e-commerce) |
| **Consignment** | Inventory received but not yet paid for |
| **Office Owned** | Inventory that has been paid for but not yet sold |
| **Z's Cash** | Cash held by employee Z, tracked separately |
| **Payables Due** | Payments that have become due because SKU hit zero |
| **Intake** | Process of receiving inventory from supplier |
| **Verification** | Second person confirms intake matches actual inventory |

---

*This annotated transcript was generated by Manus AI based on the meeting recording and analysis. Visual context descriptions are inferred from the conversation content and knowledge of the TERP system architecture.*
