# Requirements Document

## Introduction

This specification defines a comprehensive dual leaderboard system for TERP:

1. **Internal Leaderboard** - A powerful analytics tool for TERP users (staff) to track and rank all clients (customers and vendors/suppliers) across multiple performance metrics with customizable weighting for a "Master Score"

2. **VIP Portal Leaderboard** - A privacy-first, client-facing leaderboard where VIP clients can see their own ranking without any identifying information about other clients

The system emphasizes data integrity (only showing rankings when statistically significant), transparency (showing users how scores are calculated), and flexibility (allowing weight customization while providing smart defaults).

## Glossary

- **Client**: Any business entity in the `clients` table (can be buyer, seller, or both)
- **Customer**: A client with `isBuyer=true` who purchases from TERP
- **Supplier/Vendor**: A client with `isSeller=true` who sells to TERP
- **Internal User**: TERP staff member with access to the internal application
- **VIP Client**: A client with `vipPortalEnabled=true` who has access to the VIP Portal
- **Metric**: A single measurable data point (e.g., YTD Spend, Payment Speed)
- **Master Score**: A weighted composite score combining multiple metrics
- **Weight**: A percentage value (0-100) determining a metric's contribution to the Master Score
- **Statistical Significance Threshold**: Minimum data points required for a metric to be considered valid
- **Percentile Rank**: A client's position expressed as a percentage (e.g., "Top 15%")

---

## Requirements

### Requirement 1: Internal Leaderboard - Core Functionality

**User Story:** As a TERP internal user, I want to view a leaderboard of all clients ranked by various metrics, so that I can identify top performers, at-risk accounts, and business opportunities.

#### Acceptance Criteria

1. WHEN an internal user navigates to the Leaderboard page THEN the System SHALL display a ranked list of clients with their Master Score and individual metric values
2. WHEN the leaderboard loads THEN the System SHALL calculate rankings using only metrics that meet the statistical significance threshold for each client
3. WHEN a client lacks sufficient data for a metric THEN the System SHALL display "Insufficient Data" for that metric and exclude it from their Master Score calculation
4. WHEN displaying rankings THEN the System SHALL show both absolute rank (1st, 2nd, 3rd) and percentile rank (Top 5%, Top 10%)
5. WHEN a user clicks on a client row THEN the System SHALL navigate to that client's profile page

### Requirement 2: Internal Leaderboard - Metric Categories

**User Story:** As a TERP internal user, I want to switch between different metric views, so that I can analyze clients from different business perspectives.

#### Acceptance Criteria

1. WHEN viewing the leaderboard THEN the System SHALL provide metric category tabs: "Master Score", "Financial", "Engagement", "Reliability", "Growth"
2. WHEN the user selects "Master Score" tab THEN the System SHALL display the weighted composite ranking
3. WHEN the user selects "Financial" tab THEN the System SHALL display rankings by: YTD Revenue, Lifetime Value, Average Order Value, Profit Margin
4. WHEN the user selects "Engagement" tab THEN the System SHALL display rankings by: Order Frequency, Recency (days since last order), Communication Frequency
5. WHEN the user selects "Reliability" tab THEN the System SHALL display rankings by: On-Time Payment Rate, Average Days to Pay, Credit Utilization
6. WHEN the user selects "Growth" tab THEN the System SHALL display rankings by: YoY Revenue Growth, Order Frequency Trend, Average Order Value Trend

### Requirement 3: Internal Leaderboard - Client Type Filtering

**User Story:** As a TERP internal user, I want to filter the leaderboard by client type, so that I can compare customers separately from suppliers.

#### Acceptance Criteria

1. WHEN viewing the leaderboard THEN the System SHALL provide filter options: "All Clients", "Customers Only", "Suppliers Only", "Dual-Role" (both buyer and seller)
2. WHEN "Customers Only" is selected THEN the System SHALL display only clients where `isBuyer=true`
3. WHEN "Suppliers Only" is selected THEN the System SHALL display only clients where `isSeller=true`
4. WHEN "Dual-Role" is selected THEN the System SHALL display only clients where both `isBuyer=true` AND `isSeller=true`
5. WHEN switching filters THEN the System SHALL recalculate percentile rankings within the filtered set

### Requirement 4: Internal Leaderboard - Master Score Weight Customization

**User Story:** As a TERP internal user, I want to customize the weights of different metrics in the Master Score calculation, so that I can prioritize what matters most to my business analysis.

#### Acceptance Criteria

1. WHEN viewing the Master Score tab THEN the System SHALL display a "Customize Weights" panel showing all contributing metrics with slider controls
2. WHEN a user adjusts a metric weight slider THEN the System SHALL update the weight value in real-time (0-100 scale)
3. WHEN weights are adjusted THEN the System SHALL automatically normalize all weights to sum to 100%
4. WHEN the user clicks "Apply Weights" THEN the System SHALL recalculate and re-rank all clients using the new weights
5. WHEN the user clicks "Reset to Default" THEN the System SHALL restore the pre-configured default weights
6. WHEN weights are customized THEN the System SHALL persist the user's weight preferences for future sessions

### Requirement 5: Internal Leaderboard - Weight Visualization

**User Story:** As a TERP internal user, I want to see how the Master Score is calculated, so that I can understand and trust the rankings.

#### Acceptance Criteria

1. WHEN viewing the Master Score THEN the System SHALL display a visual breakdown showing each metric's contribution
2. WHEN hovering over a client's Master Score THEN the System SHALL show a tooltip with the calculation formula and individual metric contributions
3. WHEN weights are customized THEN the System SHALL display a pie chart or bar chart showing the weight distribution
4. WHEN a metric is excluded due to insufficient data THEN the System SHALL visually indicate this and show how remaining weights are redistributed

### Requirement 6: Internal Leaderboard - Statistical Significance

**User Story:** As a TERP internal user, I want the system to only show rankings when there's enough data to be meaningful, so that I can trust the insights.

#### Acceptance Criteria

1. WHEN calculating a metric THEN the System SHALL require minimum data thresholds: at least 3 invoices for payment metrics, at least 2 orders for order metrics, at least 30 days of history for trend metrics
2. WHEN fewer than 10 clients meet the threshold for a metric THEN the System SHALL display a warning that rankings may not be statistically significant
3. WHEN a client has no data for any metrics THEN the System SHALL exclude them from the leaderboard with a "New Client - Insufficient Data" indicator
4. WHEN displaying metrics THEN the System SHALL show the data freshness timestamp and sample size

### Requirement 7: Internal Leaderboard - Default Weight Configuration

**User Story:** As a TERP administrator, I want to configure the default Master Score weights, so that all users start with business-appropriate defaults.

#### Acceptance Criteria

1. WHEN the system initializes THEN the System SHALL use these default weights: YTD Revenue (25%), On-Time Payment Rate (20%), Order Frequency (15%), Profit Margin (15%), Credit Utilization (10%), Growth Rate (10%), Recency (5%)
2. WHEN an administrator accesses settings THEN the System SHALL allow modification of default weights
3. WHEN default weights are changed THEN the System SHALL apply them to all users who haven't customized their own weights
4. WHEN a user resets to default THEN the System SHALL apply the current administrator-configured defaults

### Requirement 8: VIP Portal Leaderboard - Privacy-First Design

**User Story:** As a VIP client, I want to see my ranking among other clients without seeing any identifying information about competitors, so that I can understand my standing while respecting privacy.

#### Acceptance Criteria

1. WHEN a VIP client views the leaderboard THEN the System SHALL display only their own rank position and total participant count
2. WHEN displaying other positions THEN the System SHALL show only rank numbers (1st, 2nd, 3rd) without any client names, codes, or identifying information
3. WHEN in "transparent" mode THEN the System SHALL show metric values for other positions but NEVER client identifiers
4. WHEN a VIP client is in 1st place THEN the System SHALL display a congratulatory message without revealing 2nd place identity
5. WHEN displaying the leaderboard THEN the System SHALL never expose client IDs, names, TERI codes, or any other identifying information in API responses

### Requirement 9: VIP Portal Leaderboard - Metric Selection by Admin

**User Story:** As a TERP administrator, I want to control which leaderboard metrics are visible to each VIP client, so that I can customize the competitive experience per client.

#### Acceptance Criteria

1. WHEN configuring a VIP portal THEN the System SHALL allow enabling/disabling each leaderboard metric independently
2. WHEN multiple metrics are enabled THEN the System SHALL allow the admin to select which metric is the "primary" displayed metric
3. WHEN a metric is disabled for a client THEN the System SHALL not show that metric's ranking to that client
4. WHEN all metrics are disabled THEN the System SHALL hide the leaderboard tab entirely for that client
5. WHEN configuring metrics THEN the System SHALL provide these options: YTD Spend, Payment Speed, Order Frequency, Credit Utilization, On-Time Payment Rate

### Requirement 10: VIP Portal Leaderboard - Improvement Suggestions

**User Story:** As a VIP client, I want to receive actionable suggestions for improving my ranking, so that I can take concrete steps to become a better customer.

#### Acceptance Criteria

1. WHEN displaying a client's ranking THEN the System SHALL show 1-3 personalized improvement suggestions based on their tier (top/middle/bottom quartile)
2. WHEN in transparent mode THEN the System SHALL show gap-based suggestions (e.g., "You're $5,000 away from 3rd place")
3. WHEN a client is in the top quartile THEN the System SHALL show maintenance/congratulatory suggestions
4. WHEN a client is in the bottom quartile THEN the System SHALL show encouraging, actionable improvement steps
5. WHEN suggestions are generated THEN the System SHALL never reference specific competitor performance or identity

### Requirement 11: VIP Portal Leaderboard - Display Modes

**User Story:** As a TERP administrator, I want to choose between "black box" and "transparent" display modes for each client's leaderboard, so that I can control how much competitive information is revealed.

#### Acceptance Criteria

1. WHEN "black box" mode is selected THEN the System SHALL show only rank positions without any metric values
2. WHEN "transparent" mode is selected THEN the System SHALL show rank positions AND the metric values (but never client identities)
3. WHEN switching modes THEN the System SHALL update the display immediately without page reload
4. WHEN in transparent mode THEN the System SHALL format metric values appropriately (currency for spend, days for payment speed, percentages for rates)

### Requirement 12: VIP Portal Leaderboard - Minimum Participants

**User Story:** As a TERP administrator, I want to set a minimum number of participants required before showing the leaderboard, so that rankings are meaningful and don't inadvertently reveal competitor information.

#### Acceptance Criteria

1. WHEN configuring the leaderboard THEN the System SHALL allow setting a minimum participant threshold (default: 5)
2. WHEN fewer than the minimum participants exist THEN the System SHALL display "Leaderboard not yet available - more participants needed"
3. WHEN exactly at the minimum threshold THEN the System SHALL display the leaderboard with a note about limited sample size
4. WHEN the threshold is set to 10+ THEN the System SHALL provide stronger privacy guarantees

### Requirement 13: Internal Leaderboard - Search and Sort

**User Story:** As a TERP internal user, I want to search for specific clients and sort by any metric, so that I can quickly find and analyze specific accounts.

#### Acceptance Criteria

1. WHEN viewing the leaderboard THEN the System SHALL provide a search box that filters by client name or TERI code
2. WHEN clicking a column header THEN the System SHALL sort the leaderboard by that metric (ascending/descending toggle)
3. WHEN sorting by a metric THEN the System SHALL maintain the current filter selections
4. WHEN searching THEN the System SHALL highlight matching text in results
5. WHEN no results match the search THEN the System SHALL display "No clients found matching your search"

### Requirement 14: Internal Leaderboard - Export and Reporting

**User Story:** As a TERP internal user, I want to export leaderboard data, so that I can use it in reports and presentations.

#### Acceptance Criteria

1. WHEN viewing the leaderboard THEN the System SHALL provide an "Export" button
2. WHEN exporting THEN the System SHALL offer CSV and PDF format options
3. WHEN exporting THEN the System SHALL include all visible columns and respect current filters
4. WHEN exporting THEN the System SHALL include a timestamp and the current weight configuration
5. WHEN exporting PDF THEN the System SHALL include the weight visualization chart

### Requirement 15: Dashboard Widget - Leaderboard Summary

**User Story:** As a TERP internal user, I want to see a leaderboard summary widget on my dashboard, so that I can quickly view top performers without navigating to the full leaderboard page.

#### Acceptance Criteria

1. WHEN viewing the dashboard THEN the System SHALL display a "Top Clients" leaderboard widget showing the top 5 clients by Master Score
2. WHEN the widget loads THEN the System SHALL display rank, client name, and Master Score for each entry
3. WHEN a user clicks on a client in the widget THEN the System SHALL navigate to that client's profile page
4. WHEN a user clicks "View Full Leaderboard" THEN the System SHALL navigate to the full leaderboard page
5. WHEN the widget is configured THEN the System SHALL allow users to choose which metric to display (Master Score, YTD Revenue, etc.)
6. WHEN the widget is displayed THEN the System SHALL show a mini sparkline or trend indicator for each client

### Requirement 16: Dashboard Widget - Configuration

**User Story:** As a TERP internal user, I want to configure my leaderboard dashboard widget, so that I can see the metrics most relevant to my role.

#### Acceptance Criteria

1. WHEN configuring the widget THEN the System SHALL allow selection of: metric type, number of entries (5, 10, or 15), and client type filter
2. WHEN configuring the widget THEN the System SHALL allow toggling between "Top Performers" and "Needs Attention" (bottom performers)
3. WHEN "Needs Attention" is selected THEN the System SHALL show clients with declining metrics or poor performance
4. WHEN the widget is resized THEN the System SHALL adapt the display (compact vs expanded view)
5. WHEN widget preferences are saved THEN the System SHALL persist them across sessions

### Requirement 17: Client Profile - Leaderboard Context Card

**User Story:** As a TERP internal user viewing a client profile, I want to see that client's leaderboard standing in context, so that I can understand their relative performance without leaving the profile.

#### Acceptance Criteria

1. WHEN viewing a client profile THEN the System SHALL display a "Leaderboard Standing" card showing the client's current rank and percentile
2. WHEN displaying the standing THEN the System SHALL show the client's position for each major metric category (Financial, Engagement, Reliability, Growth)
3. WHEN displaying the standing THEN the System SHALL show a visual indicator of the client's tier (top quartile = green, middle = yellow, bottom = red)
4. WHEN the client is in the top 10 THEN the System SHALL display a badge or highlight indicating "Top Performer"
5. WHEN the client is in the bottom 10 THEN the System SHALL display a "Needs Attention" indicator with suggested actions

### Requirement 18: Client Profile - Competitive Context

**User Story:** As a TERP internal user viewing a client profile, I want to see how this client compares to similar clients, so that I can provide relevant recommendations.

#### Acceptance Criteria

1. WHEN viewing a client profile THEN the System SHALL show the client's rank among clients of the same type (customers vs suppliers)
2. WHEN displaying competitive context THEN the System SHALL show "Gap to Next Rank" for key metrics
3. WHEN displaying competitive context THEN the System SHALL show trend arrows indicating if the client is moving up or down in rankings
4. WHEN the client has improved rank in the last 30 days THEN the System SHALL highlight this with a positive indicator
5. WHEN the client has declined in rank THEN the System SHALL show the decline amount and suggest investigation

### Requirement 19: Client Profile - Historical Ranking

**User Story:** As a TERP internal user, I want to see a client's ranking history over time, so that I can identify trends and patterns.

#### Acceptance Criteria

1. WHEN viewing the leaderboard card on a client profile THEN the System SHALL show a mini chart of rank history (last 6 months)
2. WHEN hovering over the chart THEN the System SHALL show the exact rank and date for each data point
3. WHEN the client's rank has changed significantly THEN the System SHALL annotate the chart with the change event
4. WHEN clicking "View History" THEN the System SHALL expand to show detailed ranking history with all metrics
5. WHEN viewing history THEN the System SHALL allow filtering by time period (30 days, 90 days, 6 months, 1 year)

### Requirement 20: Client Profile - Quick Actions

**User Story:** As a TERP internal user viewing a client's leaderboard standing, I want quick actions to improve their ranking, so that I can take immediate steps.

#### Acceptance Criteria

1. WHEN viewing a client's leaderboard card THEN the System SHALL show contextual action buttons based on their weakest metrics
2. WHEN a client has poor payment speed THEN the System SHALL show "Send Payment Reminder" action
3. WHEN a client has low order frequency THEN the System SHALL show "Schedule Follow-up Call" action
4. WHEN a client has high credit utilization THEN the System SHALL show "Review Credit Limit" action
5. WHEN an action is clicked THEN the System SHALL open the appropriate workflow (email composer, calendar, credit review)

### Requirement 15: Data Calculation Engine

**User Story:** As a system, I need to calculate accurate metrics from real transaction data, so that leaderboard rankings reflect actual business performance.

#### Acceptance Criteria

1. WHEN calculating YTD Revenue THEN the System SHALL sum `invoices.totalAmount` where `invoiceDate` is in current year and `status` is not VOID
2. WHEN calculating Average Days to Pay THEN the System SHALL compute the mean of (payment_date - invoice_date) for paid invoices
3. WHEN calculating On-Time Payment Rate THEN the System SHALL compute (invoices paid by due_date / total paid invoices) × 100
4. WHEN calculating Order Frequency THEN the System SHALL count orders in the last 90 days
5. WHEN calculating Credit Utilization THEN the System SHALL compute (totalOwed / creditLimit) × 100, handling zero credit limit gracefully
6. WHEN calculating YoY Growth THEN the System SHALL compare current year revenue to previous year revenue as a percentage change
7. WHEN calculating metrics THEN the System SHALL use only non-deleted records (respect soft deletes)

### Requirement 16: Performance and Caching

**User Story:** As a system, I need to calculate leaderboard rankings efficiently, so that users don't experience slow load times.

#### Acceptance Criteria

1. WHEN loading the leaderboard THEN the System SHALL return results within 2 seconds for up to 1000 clients
2. WHEN metrics are calculated THEN the System SHALL cache results with a 15-minute TTL
3. WHEN a user requests fresh data THEN the System SHALL provide a "Refresh" button that bypasses cache
4. WHEN underlying data changes significantly THEN the System SHALL invalidate relevant cache entries
5. WHEN calculating Master Scores THEN the System SHALL perform weight calculations client-side for instant feedback during customization

---

## Appendix A: Metric Definitions

### Customer Metrics (isBuyer=true)

| Metric               | Calculation                                  | Data Source        | Min Data Required | Direction        |
| -------------------- | -------------------------------------------- | ------------------ | ----------------- | ---------------- |
| YTD Revenue          | SUM(invoices.totalAmount) WHERE year=current | invoices           | 1 invoice         | Higher is better |
| Lifetime Value       | SUM(all invoices.totalAmount)                | invoices           | 3 invoices        | Higher is better |
| Average Order Value  | AVG(orders.totalAmount)                      | orders             | 3 orders          | Higher is better |
| Profit Margin        | AVG(order profit / order revenue)            | orders, batches    | 3 orders          | Higher is better |
| Order Frequency      | COUNT(orders) in last 90 days                | orders             | 30 days history   | Higher is better |
| Recency              | Days since last order                        | orders             | 1 order           | Lower is better  |
| On-Time Payment Rate | % invoices paid by due date                  | invoices           | 5 invoices        | Higher is better |
| Average Days to Pay  | AVG(payment_date - invoice_date)             | invoices, payments | 5 paid invoices   | Lower is better  |
| Credit Utilization   | totalOwed / creditLimit                      | clients            | Credit limit set  | 60-80% optimal   |
| YoY Revenue Growth   | (current_year - prev_year) / prev_year       | invoices           | 2 years data      | Higher is better |

### Supplier Metrics (isSeller=true)

| Metric               | Calculation                               | Data Source       | Min Data Required | Direction        |
| -------------------- | ----------------------------------------- | ----------------- | ----------------- | ---------------- |
| YTD Purchase Volume  | SUM(bills.totalAmount) WHERE year=current | bills             | 1 bill            | Higher is better |
| Delivery Reliability | % POs delivered on time                   | purchase_orders   | 5 POs             | Higher is better |
| Quality Score        | AVG(batch quality ratings)                | batches           | 10 batches        | Higher is better |
| Product Variety      | COUNT(DISTINCT products supplied)         | batches, products | 1 batch           | Higher is better |
| Response Time        | AVG time to fulfill POs                   | purchase_orders   | 5 POs             | Lower is better  |
| Return Rate          | % of batches with returns/issues          | batches           | 10 batches        | Lower is better  |

---

## Appendix B: Default Weight Configuration

### Master Score Default Weights (Customers)

```
YTD Revenue:           25%
On-Time Payment Rate:  20%
Order Frequency:       15%
Profit Margin:         15%
Credit Utilization:    10%
YoY Growth:            10%
Recency:                5%
─────────────────────────
Total:                100%
```

### Master Score Default Weights (Suppliers)

```
YTD Purchase Volume:   25%
Delivery Reliability:  25%
Quality Score:         20%
Product Variety:       15%
Response Time:         10%
Return Rate:            5%
─────────────────────────
Total:                100%
```

---

## Appendix C: Privacy Safeguards (VIP Portal)

### Data Never Exposed to VIP Clients

- Client IDs
- Client names
- TERI codes
- Email addresses
- Phone numbers
- Any identifying metadata
- Exact metric values of other clients (in black box mode)

### Data Exposed to VIP Clients

- Their own rank position (e.g., "5th out of 47")
- Their own metric values
- Total participant count
- Rank positions of others (1st, 2nd, 3rd) without identity
- Metric values of other positions (transparent mode only)
- Personalized improvement suggestions

### API Response Sanitization

All VIP Portal leaderboard API responses MUST:

1. Strip `clientId` from all entries except the requesting client
2. Replace client names with generic labels ("1st Place", "2nd Place")
3. Never include any fields that could identify other clients
4. Be validated server-side before transmission

---

## Appendix D: UI/UX Specifications

### Internal Leaderboard Page Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏆 Client Leaderboard                          [Export ▼] [⟳]  │
├─────────────────────────────────────────────────────────────────┤
│ [All Clients ▼] [Master Score | Financial | Engagement | ...]  │
├─────────────────────────────────────────────────────────────────┤
│ 🔍 Search clients...                                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ CUSTOMIZE WEIGHTS                          [Reset] [Apply]│   │
│  │ ─────────────────────────────────────────────────────── │   │
│  │ YTD Revenue      ████████████░░░░░░░░  25%              │   │
│  │ On-Time Payment  ████████░░░░░░░░░░░░  20%              │   │
│  │ Order Frequency  ██████░░░░░░░░░░░░░░  15%              │   │
│  │ Profit Margin    ██████░░░░░░░░░░░░░░  15%              │   │
│  │ Credit Util.     ████░░░░░░░░░░░░░░░░  10%              │   │
│  │ YoY Growth       ████░░░░░░░░░░░░░░░░  10%              │   │
│  │ Recency          ██░░░░░░░░░░░░░░░░░░   5%              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Rank │ Client          │ Master │ YTD Rev │ Payment │...│   │
│  │──────┼─────────────────┼────────┼─────────┼─────────┼───│   │
│  │ 🥇 1 │ Acme Cannabis   │  94.2  │ $245K   │  98.5%  │   │   │
│  │ 🥈 2 │ Green Leaf Co   │  91.8  │ $198K   │  95.2%  │   │   │
│  │ 🥉 3 │ Pacific Farms   │  88.4  │ $312K   │  87.1%  │   │   │
│  │    4 │ Valley Distro   │  85.1  │ $156K   │  92.3%  │   │   │
│  │    5 │ Mountain High   │  82.7  │ $134K   │  89.8%  │   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Showing 1-25 of 147 clients    [< Prev] [1] [2] [3] [Next >]  │
└─────────────────────────────────────────────────────────────────┘
```

### VIP Portal Leaderboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ 🏆 YTD Spend Leaderboard                                   [⟳] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│           ┌─────────────────────────────────────┐              │
│           │                                     │              │
│           │         🥈 5th Place                │              │
│           │         out of 47 VIP clients       │              │
│           │                                     │              │
│           │         Your YTD Spend: $156,420    │              │
│           │                                     │              │
│           └─────────────────────────────────────┘              │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ Rankings                                                │   │
│  │─────────────────────────────────────────────────────────│   │
│  │ 🥇 1st Place                              $312,450      │   │
│  │ 🥈 2nd Place                              $287,200      │   │
│  │ 🥉 3rd Place                              $245,800      │   │
│  │    4th Place                              $198,340      │   │
│  │ ► 5th Place (You)                         $156,420      │   │
│  │    6th Place                              $143,200      │   │
│  │    ...                                                  │   │
│  │    47th Place                              $12,450      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 📈 How to Improve Your Ranking                          │   │
│  │─────────────────────────────────────────────────────────│   │
│  │ 1. You're $41,920 away from 4th place. Consider         │   │
│  │    consolidating your purchases with us.                │   │
│  │                                                         │   │
│  │ 2. Increase your order frequency - top performers       │   │
│  │    place orders 2-3x more often.                        │   │
│  │                                                         │   │
│  │ 3. Talk to your account manager about volume            │   │
│  │    discounts that could increase your spend.            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Last updated: Dec 22, 2025 at 2:45 PM                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## Appendix E: Technical Architecture

### Data Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Raw Data      │     │  Metric Engine  │     │   Leaderboard   │
│   (DB Tables)   │────▶│  (Calculation)  │────▶│   (Rankings)    │
│                 │     │                 │     │                 │
│ - invoices      │     │ - Aggregation   │     │ - Sorting       │
│ - orders        │     │ - Normalization │     │ - Percentiles   │
│ - payments      │     │ - Thresholds    │     │ - Caching       │
│ - clients       │     │ - Validation    │     │ - Filtering     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                                        │
                        ┌───────────────────────────────┴───────┐
                        │                                       │
                        ▼                                       ▼
               ┌─────────────────┐                     ┌─────────────────┐
               │ Internal UI     │                     │ VIP Portal UI   │
               │ (Full Data)     │                     │ (Sanitized)     │
               │                 │                     │                 │
               │ - All clients   │                     │ - Own rank only │
               │ - All metrics   │                     │ - No identities │
               │ - Weight config │                     │ - Suggestions   │
               └─────────────────┘                     └─────────────────┘
```

### Database Schema Additions

```sql
-- User weight preferences (internal leaderboard)
CREATE TABLE leaderboard_weight_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL REFERENCES users(id),
  config_name VARCHAR(100) DEFAULT 'default',
  weights JSON NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY idx_user_config (user_id, config_name)
);

-- System default weights (admin-configurable)
CREATE TABLE leaderboard_default_weights (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_type ENUM('CUSTOMER', 'SUPPLIER', 'ALL') NOT NULL,
  weights JSON NOT NULL,
  updated_by INT REFERENCES users(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Cached metric calculations
CREATE TABLE leaderboard_metric_cache (
  id INT PRIMARY KEY AUTO_INCREMENT,
  client_id INT NOT NULL REFERENCES clients(id),
  metric_type VARCHAR(50) NOT NULL,
  metric_value DECIMAL(15, 4),
  sample_size INT,
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  UNIQUE KEY idx_client_metric (client_id, metric_type),
  INDEX idx_expires (expires_at)
);
```

---

## Summary

This specification defines a comprehensive dual leaderboard system that:

1. **For Internal Users**: Provides a powerful, customizable analytics tool with transparent scoring, flexible weights, and deep insights into client performance across multiple dimensions.

2. **For VIP Clients**: Delivers a privacy-first competitive experience where clients can see their standing without any risk of competitor identification, with actionable suggestions for improvement.

3. **For Data Integrity**: Ensures rankings are only shown when statistically significant, with clear indicators when data is insufficient.

4. **For Flexibility**: Allows both system-wide defaults and per-user customization of scoring weights, with easy reset capabilities.

The system builds on existing TERP data (invoices, orders, payments, clients) and extends the current VIP Portal leaderboard with enhanced privacy controls and the internal leaderboard as a new feature.
