# Anonymized Leaderboard Design Document

## Overview

The Anonymized Leaderboard system allows VIP clients to see their ranking among other VIP clients without revealing the identities of other clients. ERP users (admins) can configure which leaderboard type to display and whether to show actual measurements or keep it "black box" (rank only).

## Leaderboard Types

### 1. YTD Spend Leaderboard
**Metric:** Total year-to-date spending  
**Calculation:** Sum of all invoices for current year  
**Higher is better:** Yes  
**Data Source:** `clientTransactions` table (INVOICE type)

### 2. Payment Speed Leaderboard
**Metric:** Average days to pay invoices  
**Calculation:** Average time between invoice date and payment date  
**Higher is better:** No (lower is better)  
**Data Source:** `clientTransactions` table (INVOICE + PAYMENT types)

### 3. Order Frequency Leaderboard
**Metric:** Number of orders placed in last 90 days  
**Calculation:** Count of orders in last 90 days  
**Higher is better:** Yes  
**Data Source:** `orders` table

### 4. Credit Utilization Leaderboard
**Metric:** Credit utilization percentage  
**Calculation:** (Current Balance / Credit Limit) × 100  
**Higher is better:** Depends (60-80% is ideal, too low or too high is bad)  
**Data Source:** `clients` table

### 5. On-Time Payment Rate Leaderboard
**Metric:** Percentage of payments made on time  
**Calculation:** (On-time payments / Total payments) × 100  
**Higher is better:** Yes  
**Data Source:** `clientTransactions` table

## Display Modes

### Black Box Mode (Default)
- Shows only ranks (1st, 2nd, 3rd, etc.)
- Does NOT show actual metric values
- Client sees: "You are ranked 5th out of 24 VIP clients"
- No way to see other clients' performance

### Transparent Mode
- Shows ranks AND actual metric values
- Client sees: "You are ranked 5th with $45,000 YTD spend"
- Still anonymized - no client names shown
- Shows relative performance (e.g., "You're $5,000 behind 4th place")

## Anonymization Rules

### What Clients CAN See
- Their own rank
- Total number of VIP clients in the leaderboard
- Their own metric value (in Transparent mode)
- General improvement suggestions

### What Clients CANNOT See
- Names of other clients
- Specific metric values of other clients (in Black Box mode)
- Any identifying information about other clients
- Historical rankings of other clients

### Display Format
```
Your Ranking: 5th out of 24

[Black Box Mode]
━━━━━━━━━━━━━━━━━━━━━━━━
🥇 1st Place
🥈 2nd Place
🥉 3rd Place
   4th Place
👉 5th Place (You)
   6th Place
   ...
   24th Place

[Transparent Mode]
━━━━━━━━━━━━━━━━━━━━━━━━
🥇 1st Place - $125,000
🥈 2nd Place - $98,000
🥉 3rd Place - $67,000
   4th Place - $50,000
👉 5th Place (You) - $45,000
   6th Place - $42,000
   ...
   24th Place - $5,000
```

## Ranking Improvement Suggestions

The system generates 2-3 actionable suggestions based on:
1. Client's current rank
2. Gap to next rank
3. Leaderboard type
4. Client's historical performance

### Suggestion Phrase Library

#### YTD Spend Leaderboard
**Top 25% (Ranks 1-6 out of 24)**
- "You're in the top quartile! Keep up the excellent performance."
- "You're a top performer. Maintain your current spending pace to stay in the top tier."

**Middle 50% (Ranks 7-18 out of 24)**
- "Increase your order frequency to move up the rankings."
- "You're $X away from moving up to Xth place. Place one more large order this month."
- "Consider consolidating your purchases with us to increase your YTD spend."

**Bottom 25% (Ranks 19-24 out of 24)**
- "Increase your order volume to improve your ranking."
- "You have room to grow! Place more frequent orders to climb the leaderboard."
- "Talk to your account manager about volume discounts that could increase your spend."

#### Payment Speed Leaderboard
**Top 25% (Fast payers)**
- "Excellent payment speed! You're one of our fastest-paying clients."
- "Your quick payments are appreciated and help you maintain top ranking."

**Middle 50%**
- "Pay invoices X days faster to move up the rankings."
- "Set up automatic payments to improve your payment speed."
- "You're X days slower than the top performers. Aim to pay within X days."

**Bottom 25% (Slow payers)**
- "Improve your payment speed by X days to climb the rankings."
- "Set up payment reminders to ensure you pay invoices promptly."
- "Contact us if you need help setting up faster payment methods."

#### Order Frequency Leaderboard
**Top 25%**
- "You're one of our most frequent buyers! Keep it up."
- "Your consistent ordering helps you maintain top ranking."

**Middle 50%**
- "Place X more orders this quarter to move up the rankings."
- "You're X orders away from the next rank. Increase your order frequency."
- "Consider setting up recurring orders for products you buy regularly."

**Bottom 25%**
- "Increase your order frequency to improve your ranking."
- "You've placed X orders in the last 90 days. Top performers place X+ orders."
- "Talk to your account manager about your regular needs to increase order frequency."

#### On-Time Payment Rate Leaderboard
**Top 25% (90%+ on-time)**
- "Excellent on-time payment rate! You're a model client."
- "Your consistent on-time payments are appreciated."

**Middle 50% (70-89% on-time)**
- "Improve your on-time payment rate by X% to move up the rankings."
- "Pay your next X invoices on time to boost your ranking."
- "Set up payment reminders to ensure you never miss a due date."

**Bottom 25% (<70% on-time)**
- "Focus on paying invoices on time to dramatically improve your ranking."
- "You're currently at X% on-time. Top performers are at 90%+."
- "Contact us if you need help with payment terms or scheduling."

#### Credit Utilization Leaderboard
**Optimal Range (60-80%)**
- "Your credit utilization is in the optimal range. Well done!"
- "You're using your credit effectively."

**Too Low (<60%)**
- "Increase your credit usage to X% to move up the rankings."
- "You have $X in unused credit. Consider larger orders to optimize utilization."

**Too High (>80%)**
- "Pay down your balance by $X to reach optimal utilization (60-80%)."
- "Your utilization is high. Make a payment to improve your ranking."

### Suggestion Generation Logic

```typescript
function generateLeaderboardSuggestions(
  leaderboardType: string,
  clientRank: number,
  totalClients: number,
  clientMetricValue: number,
  nextRankMetricValue: number | null,
  displayMode: 'blackbox' | 'transparent'
): string[] {
  const suggestions: string[] = [];
  const percentile = (clientRank / totalClients) * 100;
  
  // Determine tier
  let tier: 'top' | 'middle' | 'bottom';
  if (percentile <= 25) tier = 'top';
  else if (percentile <= 75) tier = 'middle';
  else tier = 'bottom';
  
  // Get base suggestions for this leaderboard type and tier
  const baseSuggestions = PHRASE_LIBRARY[leaderboardType][tier];
  
  // Add specific suggestions based on gap to next rank (if in transparent mode)
  if (displayMode === 'transparent' && nextRankMetricValue !== null) {
    const gap = Math.abs(nextRankMetricValue - clientMetricValue);
    // Add specific gap-based suggestion
  }
  
  // Return top 2-3 suggestions
  return suggestions.slice(0, 3);
}
```

## Admin Configuration

### Per-Client Settings (in `vipPortalConfigurations` table)

```typescript
interface LeaderboardConfig {
  // Which leaderboard to show
  leaderboardType: 'ytd_spend' | 'payment_speed' | 'order_frequency' | 'credit_utilization' | 'ontime_payment_rate';
  
  // Display mode
  displayMode: 'blackbox' | 'transparent';
  
  // Show/hide suggestions
  showSuggestions: boolean;
  
  // Minimum number of clients required to show leaderboard (default: 5)
  minimumClients: number;
}
```

### Admin UI Controls

In the VIP Portal Configuration page, admins can set:
1. **Leaderboard Type** (dropdown)
   - YTD Spend
   - Payment Speed
   - Order Frequency
   - Credit Utilization
   - On-Time Payment Rate

2. **Display Mode** (radio buttons)
   - ○ Black Box (ranks only)
   - ○ Transparent (ranks + values)

3. **Show Suggestions** (toggle)
   - ☑ Show improvement suggestions
   - ☐ Hide suggestions

4. **Minimum Clients** (number input)
   - Default: 5
   - Note: "Leaderboard will only show if at least X VIP clients exist"

## Data Privacy & Security

### Privacy Rules
1. **No PII Exposure:** Client names, emails, and contact info never shown
2. **Aggregation Minimum:** Leaderboard only shows if ≥5 VIP clients exist
3. **Rank-Only Option:** Black Box mode reveals no actual performance data
4. **Session-Based:** Rankings calculated per session, not stored long-term

### Security Considerations
1. **Client Isolation:** Each client can only see their own ranking
2. **No Enumeration:** Clients cannot iterate through other clients' data
3. **Rate Limiting:** API calls limited to prevent data mining
4. **Audit Logging:** All leaderboard views logged for compliance

## Database Schema Extensions

### Add to `vipPortalConfigurations` table

```sql
ALTER TABLE vip_portal_configurations ADD COLUMN leaderboard_type VARCHAR(50) DEFAULT 'ytd_spend';
ALTER TABLE vip_portal_configurations ADD COLUMN leaderboard_display_mode VARCHAR(20) DEFAULT 'blackbox';
ALTER TABLE vip_portal_configurations ADD COLUMN leaderboard_show_suggestions BOOLEAN DEFAULT TRUE;
ALTER TABLE vip_portal_configurations ADD COLUMN leaderboard_minimum_clients INT DEFAULT 5;
```

## UI Components

### Leaderboard Widget

**Mobile-First Card Design:**
- Header: "Your Ranking" with leaderboard type badge
- Rank display: Large number with medal icon (🥇🥈🥉)
- Position: "Xth out of Y VIP clients"
- Rank list: Top 3 + client's position + bottom 1
- Suggestions panel: 2-3 actionable recommendations
- Refresh button: "Updated X minutes ago"

**Responsive Layout:**
- Mobile: Full-width card, stacked elements
- Tablet: 2-column layout (rank list + suggestions)
- Desktop: 3-column layout (rank list + suggestions + stats)

## Implementation Notes

- Rankings calculated on-demand (not pre-computed)
- Cache rankings for 1 hour to reduce database load
- Use database indexes on ranking columns for performance
- Exclude inactive clients from leaderboard
- Only include clients with `vipPortalEnabled = true`

