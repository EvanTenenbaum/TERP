# Credit Center Design Document

## Overview

The Credit Center module provides VIP clients with transparent visibility into their credit status and actionable recommendations to improve their credit limit and utilization.

## Data Sources

### From Database
- **Credit Limit** - `clients.creditLimit` (decimal)
- **Current Balance** - `clients.totalOwed` (decimal)
- **Payment History** - `clientTransactions` table (payment records)
- **YTD Spend** - Calculated from `clientTransactions` (current year invoices)
- **Account Age** - `clients.createdAt` (date)

### Calculated Metrics
- **Credit Usage** = Current Balance (totalOwed)
- **Available Credit** = Credit Limit - Credit Usage
- **Utilization Percentage** = (Credit Usage / Credit Limit) × 100
- **Average Payment Time** = Average days between invoice date and payment date
- **Payment Consistency Score** = Percentage of on-time payments (within terms)

## Credit Limit Increase Logic

### Eligibility Criteria

A client is eligible for credit limit increase if they meet **ALL** of these conditions:

1. **Account Age**: Account is at least 90 days old
2. **Payment History**: At least 80% of payments made on time
3. **Utilization**: Credit utilization is above 60% (showing they need more credit)
4. **No Overdue**: No currently overdue invoices

### Recommendation Tiers

**Tier 1: Strong Candidate (All criteria met + bonus)**
- All eligibility criteria met
- Plus: 90%+ on-time payment rate OR 6+ months account age
- **Recommendation**: "You're a strong candidate for a credit limit increase. Contact us to discuss increasing your limit."

**Tier 2: Good Candidate (All criteria met)**
- All eligibility criteria met
- **Recommendation**: "Based on your payment history and credit usage, you may qualify for a credit limit increase. Contact us to learn more."

**Tier 3: Needs Improvement (Some criteria not met)**
- One or more criteria not met
- **Recommendation**: Specific guidance on what to improve (see Phrase Library below)

## Utilization Improvement Logic

### Utilization Status

**Healthy (0-30%)**
- Status: "Excellent"
- Color: Green
- Message: "Your credit utilization is healthy. You have plenty of available credit."

**Moderate (31-60%)**
- Status: "Good"
- Color: Blue
- Message: "Your credit utilization is moderate. Consider paying down your balance to improve your credit status."

**High (61-80%)**
- Status: "High"
- Color: Orange
- Message: "Your credit utilization is high. Reducing your balance will improve your credit standing."

**Critical (81-100%)**
- Status: "Critical"
- Color: Red
- Message: "Your credit utilization is at a critical level. Please make a payment soon to avoid service interruption."

## Recommendations Engine

### Input Data
```typescript
interface CreditAnalysis {
  accountAgeDays: number;
  onTimePaymentRate: number; // 0-100
  utilizationPercentage: number; // 0-100
  hasOverdueInvoices: boolean;
  averagePaymentDays: number;
  ytdSpend: number;
  creditLimit: number;
}
```

### Output
```typescript
interface CreditRecommendations {
  canIncreaseLimit: boolean;
  limitIncreaseTier: 'strong' | 'good' | 'needs_improvement' | null;
  utilizationStatus: 'excellent' | 'good' | 'high' | 'critical';
  recommendations: string[]; // Array of actionable recommendations
}
```

### Recommendation Generation Logic

The engine generates 2-4 specific recommendations based on the client's situation:

1. **If eligible for credit increase**: Include credit increase recommendation
2. **If high utilization**: Include payment recommendation
3. **If poor payment history**: Include payment consistency recommendation
4. **If account is new**: Include account building recommendation

## Phrase Library

### Credit Limit Increase Phrases

**Strong Candidate**
- "You're a strong candidate for a credit limit increase based on your excellent payment history."
- "Your consistent on-time payments and account history qualify you for a higher credit limit."
- "Contact us to discuss increasing your credit limit to support your growing business needs."

**Good Candidate**
- "Based on your payment history and credit usage, you may qualify for a credit limit increase."
- "Your account is in good standing. Reach out to discuss expanding your credit line."
- "You're using your credit effectively. Let's talk about increasing your limit."

**Needs Improvement - Account Age**
- "Build your account history by maintaining consistent payment patterns for at least 90 days."
- "Continue making on-time payments to establish a strong credit history with us."

**Needs Improvement - Payment History**
- "Improve your on-time payment rate to 80% or higher to qualify for a credit increase."
- "Make your next 5 payments on time to strengthen your credit profile."

**Needs Improvement - Low Utilization**
- "Increase your credit usage above 60% to demonstrate need for a higher credit limit."
- "Your current credit limit appears sufficient for your needs. Use more credit to qualify for an increase."

**Needs Improvement - Overdue Invoices**
- "Clear all overdue invoices to become eligible for a credit limit increase."
- "Bring your account current by paying overdue invoices to improve your credit standing."

### Utilization Improvement Phrases

**High Utilization (61-80%)**
- "Make a payment of $X to bring your utilization below 60%."
- "Reduce your balance by $X to improve your credit utilization to a healthier level."
- "Consider paying down your balance to maintain optimal credit health."

**Critical Utilization (81-100%)**
- "Your credit is nearly maxed out. Make a payment of at least $X to avoid service interruption."
- "Urgent: Pay down your balance by $X to restore available credit."
- "Contact us immediately if you need to discuss payment arrangements."

**Excellent Utilization (0-30%)**
- "Your credit utilization is excellent. Keep up the good work!"
- "You're managing your credit responsibly. Consider using more credit for larger purchases."

### Payment Consistency Phrases

**Poor Payment History (<80%)**
- "Set up automatic payments to ensure you never miss a due date."
- "Pay invoices within terms (Net 30) to improve your payment consistency score."
- "Contact us if you're having trouble making payments on time. We're here to help."

**Good Payment History (80-89%)**
- "You're doing well! Make your next few payments on time to reach excellent status."
- "Keep up the good payment habits to maintain and improve your credit standing."

**Excellent Payment History (90%+)**
- "Excellent payment history! You're a valued client."
- "Your consistent on-time payments are appreciated and noted."

### Account Building Phrases

**New Account (<90 days)**
- "Continue building your account history with consistent on-time payments."
- "Your account is off to a great start. Keep it up for 90 days to unlock more benefits."
- "Make your first 5 payments on time to establish a strong foundation."

## Interactive Calculator

The Credit Center includes an interactive "What-If" calculator that lets clients see how different actions would affect their credit status:

### Calculator Inputs
- **Payment Amount** (slider or input)
- **Payment Date** (date picker)

### Calculator Outputs (Real-time)
- New utilization percentage
- New available credit
- Utilization status change (if any)
- Impact on credit limit eligibility

### Example Calculation
```
Current State:
- Credit Limit: $50,000
- Current Balance: $40,000
- Utilization: 80% (Critical)

If I pay $15,000 today:
- New Balance: $25,000
- New Utilization: 50% (Good)
- New Available Credit: $25,000
- Status: Improved from Critical to Good ✓
```

## UI Components

### Summary Cards
1. **Credit Limit Card** - Shows total credit limit
2. **Available Credit Card** - Shows remaining available credit
3. **Utilization Card** - Shows percentage with color-coded status
4. **Payment Score Card** - Shows on-time payment percentage

### Progress Bar
- Visual representation of credit utilization
- Color-coded segments (green, blue, orange, red)
- Current position indicator

### Recommendations Panel
- List of 2-4 actionable recommendations
- Each recommendation has an icon and clear action text
- Prioritized by impact (most important first)

### Interactive Calculator
- Slider for payment amount
- Real-time calculation display
- "Apply Payment" button (simulation only, doesn't actually process payment)

## Mobile-First Design

All components designed for mobile:
- Cards stack vertically on mobile
- Calculator uses full-width sliders
- Recommendations use expandable cards
- Touch-friendly buttons and inputs

## Implementation Notes

- All calculations done server-side for security
- Client-side calculator is for simulation only
- Recommendations generated dynamically based on real data
- Phrase library stored in code (not database) for easy updates
- Cache recommendations for 24 hours to reduce database load

