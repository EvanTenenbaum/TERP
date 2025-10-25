# Credit Intelligence System Documentation

## Overview

The **Adaptive Credit Intelligence System** is a production-ready feature that calculates client credit limits based on real-time financial and behavioral data. It provides transparent, explainable credit decisions with interactive controls for risk management.

---

## Key Features

### 1. **Six Financial Signals**
Each signal is scored 0-100 based on client transaction history:

| Signal | Weight (Default) | Description | Impact |
|--------|------------------|-------------|--------|
| **Revenue Momentum** | 20% | Growth rate of recent (3M) vs historical (12M) revenue | Rewards clients with increasing order volumes |
| **Cash Collection Strength** | 25% | Speed and reliability of payment collection | Rewards fast, consistent payers |
| **Profitability Quality** | 20% | Profit margin quality and stability | Rewards high-margin clients |
| **Debt Aging Risk** | 15% | Age and management of outstanding debt | Penalizes overdue balances |
| **Repayment Velocity** | 10% | Rate of debt repayment vs new charges | Rewards clients paying down balances |
| **Tenure & Relationship Depth** | 10% | Length and depth of business relationship | Rewards long-term clients |

### 2. **Adaptive Learning Mode**
- **Learning Mode**: For clients with <90 days of history or <10 transactions
  - Conservative credit limits
  - Lower confidence scores
  - Gradual increase as data accumulates
- **Active Mode**: For established clients with sufficient data
  - Full credit limit calculation
  - High confidence scores
  - Real-time adjustments based on behavior

### 3. **Credit Limit Formula**
```
Credit Limit = Base Payment Capacity (BPC) × Risk Modifier × Directional Factor

Where:
- BPC = Average 30-day revenue × 2
- Risk Modifier = 0.5 to 1.5 (based on credit health score)
- Directional Factor = 0.8 to 1.2 (based on trend: improving, stable, worsening)
```

### 4. **Transparent Explanations**
Every credit limit includes a plain-English explanation:
> "Your credit limit is $50,000 because you have strong payment history (85/100), growing revenue (90/100), and excellent profit margins (88/100). Your limit increased 15% this month due to improving trends."

### 5. **Interactive Weight Adjustment**
- Admins can customize signal weights via `/credit-settings`
- Real-time preview of weight changes
- Validation ensures weights sum to 100%
- Changes apply to all future calculations

---

## Database Schema

### `client_credit_limits`
Stores calculated credit limits for each client.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `clientId` | INT | Foreign key to clients table |
| `creditLimit` | DECIMAL(15,2) | Calculated credit limit |
| `currentExposure` | DECIMAL(15,2) | Current outstanding balance |
| `utilizationPercent` | DECIMAL(5,2) | Utilization percentage |
| `creditHealthScore` | DECIMAL(5,2) | Overall health score (0-100) |
| `baseCapacity` | DECIMAL(15,2) | Base payment capacity |
| `riskModifier` | DECIMAL(5,4) | Risk adjustment factor |
| `directionalFactor` | DECIMAL(5,4) | Trend adjustment factor |
| `mode` | ENUM | 'LEARNING' or 'ACTIVE' |
| `trend` | ENUM | 'IMPROVING', 'STABLE', 'WORSENING' |
| `confidenceScore` | DECIMAL(5,2) | Confidence in calculation (0-100) |
| `dataReadiness` | DECIMAL(5,2) | Data sufficiency score (0-100) |
| `calculatedAt` | TIMESTAMP | Last calculation time |

### `credit_signal_history`
Historical signal values for trend analysis.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `clientId` | INT | Foreign key to clients table |
| `revenueMomentum` | DECIMAL(5,2) | Revenue growth signal (0-100) |
| `cashCollectionStrength` | DECIMAL(5,2) | Payment speed signal (0-100) |
| `profitabilityQuality` | DECIMAL(5,2) | Profit margin signal (0-100) |
| `debtAgingRisk` | DECIMAL(5,2) | Debt age signal (0-100) |
| `repaymentVelocity` | DECIMAL(5,2) | Debt reduction signal (0-100) |
| `tenureDepth` | DECIMAL(5,2) | Relationship length signal (0-100) |
| `calculatedAt` | TIMESTAMP | Snapshot time |

### `credit_system_settings`
Global configuration for signal weights.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key (single row) |
| `revenueMomentumWeight` | INT | Weight for revenue signal (0-100) |
| `cashCollectionWeight` | INT | Weight for cash signal (0-100) |
| `profitabilityWeight` | INT | Weight for profit signal (0-100) |
| `debtAgingWeight` | INT | Weight for debt signal (0-100) |
| `repaymentVelocityWeight` | INT | Weight for repayment signal (0-100) |
| `tenureWeight` | INT | Weight for tenure signal (0-100) |
| `updatedBy` | INT | User who last updated settings |
| `updatedAt` | TIMESTAMP | Last update time |

### `credit_audit_log`
Compliance tracking for all credit limit changes.

| Column | Type | Description |
|--------|------|-------------|
| `id` | INT | Primary key |
| `clientId` | INT | Foreign key to clients table |
| `action` | VARCHAR(50) | Action type (e.g., 'CALCULATED', 'MANUAL_OVERRIDE') |
| `oldLimit` | DECIMAL(15,2) | Previous credit limit |
| `newLimit` | DECIMAL(15,2) | New credit limit |
| `reason` | TEXT | Explanation for change |
| `performedBy` | INT | User who triggered change |
| `createdAt` | TIMESTAMP | Action time |

---

## API Endpoints (tRPC)

### `credit.calculate`
Calculate credit limit for a client.

**Input:**
```typescript
{
  clientId: number;
  customWeights?: {
    revenueMomentumWeight?: number;
    cashCollectionWeight?: number;
    profitabilityWeight?: number;
    debtAgingWeight?: number;
    repaymentVelocityWeight?: number;
    tenureWeight?: number;
  };
}
```

**Output:**
```typescript
{
  creditLimit: number;
  currentExposure: number;
  utilizationPercent: number;
  creditHealthScore: number;
  signals: {
    revenueMomentum: number;
    cashCollectionStrength: number;
    profitabilityQuality: number;
    debtAgingRisk: number;
    repaymentVelocity: number;
    tenureDepth: number;
  };
  signalTrends: {
    revenueMomentumTrend: number;
    cashCollectionTrend: number;
    profitabilityTrend: number;
    debtAgingTrend: number;
    repaymentVelocityTrend: number;
  };
  mode: 'LEARNING' | 'ACTIVE';
  trend: 'IMPROVING' | 'STABLE' | 'WORSENING';
  confidenceScore: number;
  dataReadiness: number;
  explanation: string;
}
```

### `credit.getByClientId`
Get current credit limit for a client.

**Input:** `{ clientId: number }`  
**Output:** Credit limit record or null

### `credit.getSignalHistory`
Get historical signal values for trend charts.

**Input:** `{ clientId: number, limit?: number }`  
**Output:** Array of signal history records

### `credit.getSettings`
Get global credit system settings.

**Input:** None  
**Output:** Credit system settings

### `credit.updateSettings`
Update global credit system settings (admin only).

**Input:**
```typescript
{
  revenueMomentumWeight: number;
  cashCollectionWeight: number;
  profitabilityWeight: number;
  debtAgingWeight: number;
  repaymentVelocityWeight: number;
  tenureWeight: number;
}
```

**Output:** `{ success: true }`

### `credit.getAuditLog`
Get audit log for a client's credit changes.

**Input:** `{ clientId: number, limit?: number }`  
**Output:** Array of audit log records

---

## UI Components

### 1. **CreditLimitWidget**
Collapsible widget showing credit limit summary and detailed breakdown.

**Props:**
```typescript
{
  clientId: number;
  showAdjustControls?: boolean; // Show weight adjustment dialog
  defaultExpanded?: boolean; // Start expanded or collapsed
}
```

**Features:**
- Compact collapsed state (80px height)
- Full signal breakdown when expanded
- Interactive weight adjustment dialog
- Real-time "what-if" preview
- Mobile-optimized responsive design
- Color-coded health indicators
- Trend arrows (↑ improving, → stable, ↓ worsening)
- Learning mode vs Active mode badges

**Usage:**
```tsx
import { CreditLimitWidget } from "@/components/credit/CreditLimitWidget";

<CreditLimitWidget 
  clientId={123} 
  showAdjustControls={false} 
  defaultExpanded={false}
/>
```

### 2. **CreditSettingsPage**
Admin page for configuring global signal weights.

**Route:** `/credit-settings`

**Features:**
- Interactive sliders for all 6 signals
- Real-time weight validation (must sum to 100%)
- Impact preview showing different risk profiles
- Save/Reset/Reset to Defaults controls
- Mobile-responsive design
- Detailed signal descriptions and impact explanations

---

## Integration Points

### Client Profile Page
The Credit Limit Widget is automatically shown in the **Overview tab** for clients marked as "Buyer":

```tsx
{client.isBuyer && (
  <CreditLimitWidget clientId={clientId} showAdjustControls={false} />
)}
```

### Sales Module (Future)
The widget can be embedded in sales workflows:
- Quote creation: Check available credit before approval
- Order processing: Validate against credit limit
- Invoice generation: Update current exposure

### Accounting Module
Admin settings accessible via:
- Direct route: `/credit-settings`
- Navigation: Settings → Credit Intelligence

---

## Calculation Logic

### Signal Calculations

#### 1. Revenue Momentum
```typescript
const recent3M = sum(last 90 days revenue);
const historical12M = sum(91-365 days revenue) / 3; // Normalized to 3M
const growth = (recent3M - historical12M) / historical12M;
const score = clamp((growth + 0.2) * 250, 0, 100);
```

#### 2. Cash Collection Strength
```typescript
const avgPaymentLag = average(days between invoice date and payment date);
const targetLag = 30; // days
const score = clamp(100 - (avgPaymentLag - targetLag) * 2, 0, 100);
```

#### 3. Profitability Quality
```typescript
const avgMargin = average(profit margin % across all transactions);
const marginStability = 100 - (stdDev(margins) * 2);
const score = (avgMargin * 0.7) + (marginStability * 0.3);
```

#### 4. Debt Aging Risk
```typescript
const weightedDaysOverdue = sum(amount × days overdue) / totalOwed;
const score = clamp(100 - weightedDaysOverdue, 0, 100);
```

#### 5. Repayment Velocity
```typescript
const collections = sum(payments in last 90 days);
const newAR = sum(new invoices in last 90 days);
const velocity = collections / (collections + newAR);
const score = velocity * 100;
```

#### 6. Tenure & Relationship Depth
```typescript
const monthsActive = daysSinceFirstTransaction / 30;
const invoiceCount = totalInvoices;
const tenureScore = clamp(monthsActive * 2, 0, 70);
const depthScore = clamp(invoiceCount, 0, 30);
const score = tenureScore + depthScore;
```

### Composite Credit Health Score
```typescript
const healthScore = sum(signal.score × signal.weight / 100);
```

### Credit Limit Calculation
```typescript
const BPC = (sum(last 30 days revenue) / 30) * 30 * 2;
const riskModifier = 0.5 + (healthScore / 100);
const directionalFactor = trend === 'IMPROVING' ? 1.2 : 
                          trend === 'WORSENING' ? 0.8 : 1.0;
const creditLimit = BPC × riskModifier × directionalFactor;
```

---

## Testing Scenarios

### Scenario 1: New Client (Learning Mode)
- **Input:** Client with 2 months history, 5 transactions
- **Expected:** Learning mode, conservative limit, low confidence
- **Validation:** Mode = 'LEARNING', dataReadiness < 50%

### Scenario 2: Established Client (Active Mode)
- **Input:** Client with 2 years history, 100+ transactions
- **Expected:** Active mode, full limit, high confidence
- **Validation:** Mode = 'ACTIVE', dataReadiness > 90%

### Scenario 3: Improving Trend
- **Input:** Client with increasing revenue and faster payments
- **Expected:** Trend = 'IMPROVING', directionalFactor = 1.2
- **Validation:** Credit limit increases 20% over baseline

### Scenario 4: Worsening Trend
- **Input:** Client with slowing payments and increasing debt age
- **Expected:** Trend = 'WORSENING', directionalFactor = 0.8
- **Validation:** Credit limit decreases 20% from baseline

### Scenario 5: Weight Adjustment
- **Input:** Admin increases "Cash Collection" weight from 25% to 40%
- **Expected:** Fast-paying clients get higher limits
- **Validation:** Recalculation reflects new weight distribution

---

## Performance Considerations

### Optimization Strategies
1. **Caching:** Credit limits cached for 24 hours unless manually recalculated
2. **Batch Calculation:** Process multiple clients in parallel
3. **Incremental Updates:** Only recalculate when new transactions added
4. **Signal History:** Store snapshots for trend analysis (avoid recalculating historical data)

### Database Indexes
```sql
CREATE INDEX idx_client_credit_limits_client_id ON client_credit_limits(clientId);
CREATE INDEX idx_credit_signal_history_client_id ON credit_signal_history(clientId, calculatedAt);
CREATE INDEX idx_credit_audit_log_client_id ON credit_audit_log(clientId, createdAt);
```

---

## Security & Compliance

### Access Control
- **View Credit Limits:** All authenticated users (for their assigned clients)
- **Adjust Weights:** Admin users only
- **Audit Log:** Admin users only
- **Manual Overrides:** Manager+ users only

### Audit Trail
Every credit limit change is logged with:
- Who triggered the change
- What changed (old vs new limit)
- Why it changed (automatic calculation, manual override, weight adjustment)
- When it changed (timestamp)

### Data Privacy
- Credit limits are **not** displayed in client lists (only in profile)
- TERI codes used instead of PII in logs
- Sensitive financial data encrypted at rest

---

## Troubleshooting

### Issue: Credit limit shows $0
**Cause:** Client has no transaction history  
**Solution:** Add at least one transaction, then recalculate

### Issue: Widget shows "Learning Mode" for old client
**Cause:** Insufficient transaction count (<10)  
**Solution:** Normal behavior; mode will switch to Active after 10 transactions

### Issue: Weight adjustment doesn't change limit
**Cause:** Weights only apply to future calculations  
**Solution:** Click "Recalculate" button in client profile after changing weights

### Issue: Signals show 0/100 scores
**Cause:** Missing transaction data (no payments, no invoices)  
**Solution:** Ensure client has complete transaction records with dates and amounts

---

## Future Enhancements

### Phase 2 (Planned)
- [ ] Automated email alerts when credit limit changes
- [ ] Credit limit approval workflow for high-risk clients
- [ ] Integration with external credit bureaus (Experian, Equifax)
- [ ] Machine learning model for predictive credit scoring
- [ ] Multi-currency support for international clients
- [ ] Credit limit recommendations based on industry benchmarks

### Phase 3 (Planned)
- [ ] Real-time credit monitoring dashboard
- [ ] Automated credit limit adjustments based on market conditions
- [ ] Risk-based pricing (adjust margins based on credit health)
- [ ] Credit portfolio analytics (aggregate risk exposure)
- [ ] Integration with sales forecasting (predict credit needs)

---

## Changelog

### v1.0.0 (Current)
- ✅ Database schema (4 tables)
- ✅ Credit engine backend (6 signals)
- ✅ tRPC API (6 endpoints)
- ✅ Collapsible Credit Limit Widget
- ✅ Admin Credit Settings Page
- ✅ Integration with Client Profile
- ✅ Mobile-responsive design
- ✅ Learning mode vs Active mode
- ✅ Trend analysis (improving/stable/worsening)
- ✅ Plain English explanations
- ✅ Interactive weight adjustment
- ✅ Audit logging for compliance

---

## Support

For questions or issues, contact the development team or refer to:
- **Project Documentation:** `/docs/`
- **API Reference:** tRPC router at `/server/routers.ts`
- **Component Library:** shadcn/ui components
- **Database Schema:** `/drizzle/schema.ts`

---

**Status:** ✅ PRODUCTION READY  
**Last Updated:** 2025-01-24  
**Version:** 1.0.0

