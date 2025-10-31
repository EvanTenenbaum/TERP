# TERP Matchmaking Service - User Guide

**For:** Sales Team & Operations Staff
**Version:** 1.0.0
**Last Updated:** 2025-10-31

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [Matchmaking Dashboard](#matchmaking-dashboard)
4. [Client Profile - Purchase Patterns](#client-profile-purchase-patterns)
5. [Batch Detail - Potential Buyers](#batch-detail-potential-buyers)
6. [Understanding Match Scores](#understanding-match-scores)
7. [Best Practices](#best-practices)
8. [FAQ](#faq)

---

## Introduction

The TERP Matchmaking Service automatically connects client needs with available products, helping you:

- **Find buyers for inventory** - See which clients need products you have in stock
- **Fulfill client orders faster** - Get instant recommendations for client requests
- **Predict reorders** - Know when clients will likely reorder based on history
- **Maximize sales** - Never miss an opportunity to match supply with demand

### Key Benefits

✅ **Save Time** - No more manual searching through inventory
✅ **Increase Revenue** - Proactive outreach to clients before they run out
✅ **Better Service** - Faster responses to client inquiries
✅ **Data-Driven** - Confidence scores show match quality

---

## Getting Started

### Accessing the Matchmaking Service

1. Log into TERP
2. Click **"Matchmaking"** in the left sidebar (look for the 🎯 target icon)
3. You'll see three main views:
   - **Client Needs** - What clients are looking for
   - **Available Supply** - What's ready to sell
   - **Active Matches** - Best opportunities right now

### Navigation Tips

- **Dashboard Widget** - Quick view of top opportunities on your homepage
- **Client Profiles** - See purchase patterns and predictions
- **Batch Details** - View potential buyers for specific inventory

---

## Matchmaking Dashboard

Navigate to `/matchmaking` to access the main matchmaking interface.

### View 1: Client Needs

**What it shows:** All active client requests and what matches we found

**How to use:**

1. Browse the list of client needs
2. Look for high confidence scores (70%+)
3. Click "View Matches" to see recommendations
4. Contact client with matched products

**Example:**

```
Client: ACME Dispensary (ACME-001)
Need: Blue Dream, 10-20 lbs, Grade A+
Status: ACTIVE
Matches: 3 found (85% confidence)
```

**Action:** Click to see which batches match, then create quote

### View 2: Available Supply

**What it shows:** Inventory and vendor supplies with potential buyers

**How to use:**

1. See what products are looking for buyers
2. Check match confidence scores
3. Proactively reach out to matched clients
4. Convert inventory to sales faster

**Example:**

```
Batch: BD-2024-001
Strain: Blue Dream #5
Quantity: 15 lbs
Grade: A+
Potential Buyers: 5 clients (avg 78% confidence)
```

**Action:** Contact high-confidence matches to move inventory

### View 3: Active Matches

**What it shows:** Best opportunities sorted by confidence

**How to use:**

1. Start with highest confidence matches (top of list)
2. These are your "hot leads" - act fast!
3. Use match reasons to tailor your pitch
4. Create quotes directly from match cards

**Match Card Example:**

```
┌─────────────────────────────────────┐
│ 🎯 92% Confidence Match             │
├─────────────────────────────────────┤
│ Client: Green Valley (GV-042)       │
│ Need: Girl Scout Cookies, 10 lbs    │
│ Match: Batch GSC-2024-015           │
│                                     │
│ Why it's a good match:              │
│ ✓ Strain alias match (GSC)          │
│ ✓ Exact grade match (A+)           │
│ ✓ Quantity in range                 │
│ ✓ Price within budget               │
│                                     │
│ [Create Quote] [View Details]       │
└─────────────────────────────────────┘
```

---

## Client Profile - Purchase Patterns

Access from: **Clients > [Select Client] > Overview Tab**

### What You'll See

A new widget called **"Purchase Patterns & Predictions"** with 3 tabs:

#### Tab 1: Purchase History

**Shows:** What this client has bought before

**Use case:** "What do they usually order?"

**Data displayed:**

- Product name (strain/category)
- How many times purchased
- Total quantity bought
- Average price they paid
- Days since last order

**Example:**

```
Product: Blue Dream
Purchased: 8 times
Total Quantity: 120 lbs
Avg Price: $1,200/lb
Last Order: 15 days ago
```

**Action:** Use this to recommend similar products or upsells

#### Tab 2: Reorder Predictions

**Shows:** When clients are likely to reorder

**Use case:** "Should I reach out proactively?"

**Key indicators:**

🔴 **OVERDUE** (Red badge) - They should have ordered already!

- **Action:** Call them TODAY - they might be about to place an order with a competitor

🟠 **DUE SOON** (Orange badge, 0-7 days) - Order expected within a week

- **Action:** Prepare inventory and send them a quote

🟡 **UPCOMING** (14-30 days) - Order expected soon

- **Action:** Add to follow-up list

🟢 **LONG TERM** (30+ days) - No urgency

- **Action:** Keep in mind for future

**Prediction Card Example:**

```
┌─────────────────────────────────────┐
│ Blue Dream                          │
│ 🔴 OVERDUE by 3 days                │
│ 🎯 89% Confidence                   │
├─────────────────────────────────────┤
│ Last Order: 33 days ago             │
│ Predicted Date: 3 days ago          │
│ Order Frequency: Every 30 days      │
│                                     │
│ Prediction Factors:                 │
│ • Orders 6x every 30 days (avg)     │
│ • OVERDUE by 3 days                 │
│ • Consistent ordering pattern       │
└─────────────────────────────────────┘
```

**Action:** Call the client immediately! They're overdue and likely need to reorder.

#### Tab 3: Summary

**Shows:** Quick stats at a glance

**Data:**

- Total unique products purchased
- Total orders placed
- Overdue predictions (action needed)
- Due soon predictions (prepare inventory)
- Top 5 products by frequency

**Use case:** Quick overview before sales calls

---

## Batch Detail - Potential Buyers

Access from: **Inventory > [Select Batch] > Potential Buyers Widget**

### What You'll See

A 3-tab widget showing who might want to buy this specific batch:

#### Tab 1: Active Needs

**Shows:** Clients actively looking for this product RIGHT NOW

**Use case:** "Who can I sell this to today?"

**What it means:**

- These clients have open requests in the system
- They're actively shopping for this product
- High urgency - they want it soon

**Example:**

```
Client: Mountain Herbs (MH-023)
Need ID: #4521
Confidence: 85%
Quantity Needed: 10-15 lbs
Max Price: $1,300/lb
Needed By: 2024-11-05
```

**Action:** Create a quote immediately - they're ready to buy!

#### Tab 2: Historical Buyers

**Shows:** Clients who've bought this strain/category before

**Use case:** "Who's bought this in the past?"

**What it means:**

- Not actively looking, but proven interest
- Good for proactive outreach
- May be interested in stocking up

**Example:**

```
Client: Wellness Co (WC-019)
Last Purchased: 45 days ago
Purchase Count: 4 times
Avg Quantity: 12 lbs
Avg Price: $1,250/lb
```

**Action:** Send a "Hey, we have more Blue Dream in stock" email

#### Tab 3: Predicted Reorders

**Shows:** Clients predicted to reorder this product soon

**Use case:** "Who will need this next?"

**What it means:**

- Based on historical ordering patterns
- Confidence shows prediction reliability
- Urgency shows timing (overdue, due soon, etc.)

**Example:**

```
Client: Green Leaf (GL-008)
Strain: Blue Dream
🟠 Due in 5 days
🎯 84% Confidence
Last Order: 25 days ago
Frequency: Every 30 days
```

**Action:** Prepare a quote now, send when prediction date is near

---

## Understanding Match Scores

### Confidence Levels

**90-100% - Excellent Match** 🟢

- Almost perfect fit
- High priority opportunity
- Very likely to close

**70-89% - Good Match** 🟡

- Strong alignment
- Worth pursuing
- Solid opportunity

**50-69% - Moderate Match** 🟠

- Some fit, some gaps
- May need negotiation
- Consider if no better options

**Below 50% - Weak Match** 🔴

- Poor alignment
- Not recommended
- Focus on higher scores first

### What Affects the Score?

Matches are scored based on multiple factors:

**Strain Match (+30 points max)**

- Exact match: +30 pts (e.g., "Blue Dream" = "Blue Dream")
- Alias match: +30 pts (e.g., "GSC" = "Girl Scout Cookies")
- Variant match: +30 pts (e.g., "Blue Dream" = "Blue Dream #5")
- Family match: +20 pts (e.g., "OG Kush" family)

**Strain Type Match (+15 points max)**

- Exact type: +15 pts (INDICA = INDICA)
- Hybrid compatibility: +7 pts
- Flexible criteria (ANY): +12 pts

**Grade Match (+15 points max)**

- Exact grade: +15 pts (A+ = A+)
- Close grade: +10 pts (A+ vs A)

**Quantity Match (+5 points max)**

- Within range: +5 pts
- Within 10% tolerance: +2 pts
- Over 20% different: -10 pts

**Price Match (+10 points max)**

- Within budget: +10 pts
- Over budget: 0 pts

**Freshness (+10 points max)**

- Recent harvest/test: +10 pts
- Older inventory: +5 pts

**Total: 120 points possible**

- Score is converted to percentage (e.g., 72/120 = 60%)

---

## Best Practices

### Daily Routine

**Morning (9:00 AM)**

1. Check Dashboard "Matchmaking Opportunities" widget
2. Review any OVERDUE predictions (red badges)
3. Call clients with overdue predictions
4. Prepare quotes for high-confidence matches

**Midday (12:00 PM)**

1. Check for new client needs
2. Review "Available Supply" for slow-moving inventory
3. Proactively reach out to matched clients

**End of Day (4:00 PM)**

1. Review predictions DUE SOON (next 7 days)
2. Prepare inventory for predicted orders
3. Send quotes to clients with upcoming needs

### Pro Tips

**Tip 1: Prioritize by Confidence**

- Start with 90%+ matches - these are slam dunks
- Work your way down the list
- Don't waste time on sub-50% matches

**Tip 2: Use Prediction Reasons**

- Read the "Prediction Factors" to understand WHY it's a match
- Use these reasons in your sales pitch
- "I noticed you order Blue Dream every 30 days..."

**Tip 3: Act on Overdue Predictions**

- Red "OVERDUE" badges are your highest priority
- Client might be about to order from a competitor
- Quick response can capture the sale

**Tip 4: Combine Historical + Predictions**

- Check both tabs on Client Profile
- Cross-reference purchase history with predictions
- Build a complete picture of client behavior

**Tip 5: Batch Detail for Inventory Management**

- Use "Potential Buyers" to move slow inventory
- Proactive outreach prevents waste
- Better than waiting for clients to ask

### Sales Scripts

**Script 1: Overdue Prediction**

```
"Hi [Client Name], I noticed it's been about [X] days since your last
order of [Product]. Based on your usual ordering pattern, I wanted to
check in - do you need to restock? We have [Batch ID] available with
great specs: [Grade], [Quantity] lbs, $[Price]/lb."
```

**Script 2: High-Confidence Match**

```
"Hi [Client Name], I saw you're looking for [Product]. Great news -
we have a [XX]% match in our system! Batch [ID] has exactly what you
need: [Strain], [Grade], [Quantity] lbs. Would you like me to send
over a quote?"
```

**Script 3: Historical Buyer**

```
"Hi [Client Name], we just got in some fresh [Strain] - I remember
you've purchased this [X] times before. Thought you might be interested!
We have [Quantity] lbs at $[Price]/lb. Want me to hold some for you?"
```

---

## FAQ

**Q: Why does "Blue Dream" match "Blue Dream #5"?**

A: The system understands that numbered variants (like #5) are specific phenotypes of the base strain. A generic "Blue Dream" need can be filled with any variant, but "Blue Dream #5" will NOT match "Blue Dream #6" (different variants).

**Q: What does "GSC" mean?**

A: GSC is the alias for "Girl Scout Cookies". The system knows common abbreviations and automatically matches them. Other examples: GDP (Granddaddy Purple), GG4 (Gorilla Glue #4).

**Q: How accurate are the reorder predictions?**

A: Predictions with 80%+ confidence are typically 70-80% accurate. The system analyzes historical order frequency and consistency. Overdue predictions (red) have a 90%+ chance of the client needing to reorder soon.

**Q: Can I trust low confidence matches?**

A: Matches below 50% confidence are not recommended. Focus on 70%+ matches for best results. Lower scores mean significant gaps in the match criteria.

**Q: How often does the system update?**

A: Matches are recalculated in real-time when:

- New client needs are created
- New inventory arrives
- Client places an order (updates predictions)
- Batch status changes

**Q: What if a client's prediction is wrong?**

A: Predictions are statistical estimates based on past behavior. Clients may change their buying patterns, go out of business, or switch suppliers. Use predictions as a guide, not a guarantee.

**Q: Why don't I see any matches?**

A: Common reasons:

- No active client needs in system
- No matching inventory available
- Strain names don't match (check spelling)
- Price/quantity constraints too strict

**Q: Can I adjust the confidence threshold?**

A: Talk to your system administrator. The default is 50% minimum, but this can be adjusted based on your needs.

**Q: What's the difference between "Active Needs" and "Predictions"?**

A:

- **Active Needs**: Client has explicitly requested the product (high urgency)
- **Predictions**: System forecasts they'll need it based on history (proactive)

**Q: Should I contact every match?**

A: No - prioritize:

1. Overdue predictions (URGENT)
2. Active needs with 90%+ confidence
3. Due soon predictions (next 7 days)
4. Active needs with 70-89% confidence
5. Historical buyers (when you have slow inventory)

---

## Getting Help

**Technical Issues:**

- Contact IT Support for system access problems
- Check MATCHMAKING_DEPLOYMENT_GUIDE.md for troubleshooting

**Questions About Matches:**

- Review this guide's "Understanding Match Scores" section
- Ask your sales manager for interpretation help

**Feature Requests:**

- Submit feedback to product team
- Include specific use cases and examples

---

**Happy Matchmaking! 🎯**

_Remember: The system is a tool to help you work smarter, not replace your expertise. Use it to find opportunities, then apply your sales skills to close the deal._
