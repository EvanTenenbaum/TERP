# Research: Best Practices for Partial Payments on Installment Plans

## Key Findings from Industry Research

### 1. Payment Plans vs. Installment Plans (QuickBooks)
- **Payment Plans**: Flexible - customers choose how much and when to pay (minimum payment required)
- **Installment Plans**: Fixed - predetermined amounts and due dates (more favorable to business owners)

### 2. Best Practices for Installment Plan Management

#### A. Clear Payment Terms
- Establish clear and transparent payment terms upfront to avoid misunderstandings
- Define what constitutes a partial payment and when it's allowed
- Set predetermined payoff dates and fixed rates for each installment

#### B. Automated Systems
- Utilize automated payment processing systems to streamline tracking and reconciliation
- Set up recurring payments specific to each customer
- Use automated reminders for upcoming or late payments

#### C. Communication Strategies
- Maintain open communication with customers regarding payment schedules
- Set expectations and consequences of late payments upfront
- Send automated reminders before payment due dates

#### D. Flexible Policies
- Develop flexible policies that accommodate partial payments
- Ensure policies don't disrupt cash flow or create financial strain
- Allow for adjustments when needed (date changes, pausing plans)

### 3. Tracking Methods for Partial Payments

#### Per-Transaction Tracking
- Track each partial payment against the original invoice/order
- Maintain running balance showing: original amount, payments made, remaining balance
- Record payment date, amount, and method for each transaction

#### Allocation Methods (FIFO recommended)
- **FIFO (First-In-First-Out)**: Apply payments to oldest invoices first
- Helps prevent aging debt and simplifies reconciliation
- Most common and recommended approach for B2B

### 4. Key Data Points to Track
1. Original invoice/order amount
2. Payment schedule (dates and amounts due)
3. Actual payments received (date, amount, method)
4. Running balance
5. Days overdue (if applicable)
6. Payment history/notes

## Recommendation for TERP System

Based on the research and TERP's context (cannabis B2B with consignment, COD, and installment options), the recommended approach is:

### Suggested Implementation

1. **Installment Plan Creation**
   - When creating an intake with installment terms, system generates a payment schedule
   - Admin sets: total amount, number of installments, payment frequency (weekly/bi-weekly/monthly)
   - System auto-calculates individual payment amounts and due dates

2. **Partial Payment Recording**
   - Each payment recorded against the installment plan
   - Fields: payment date, amount received, payment method, notes
   - System auto-updates remaining balance and next due date

3. **Allocation Logic (FIFO)**
   - Payments applied to oldest due installment first
   - Overpayments roll forward to next installment
   - Underpayments flagged with remaining amount due

4. **Status Tracking**
   - Visual indicators: On Track (green), Overdue (red), Paid in Full (blue)
   - Dashboard widget showing upcoming payments due
   - Aging report for overdue installments

5. **Flexibility Features**
   - Allow manual adjustment of payment amounts
   - Option to skip/reschedule individual installments
   - Early payoff option with recalculation

6. **Integration with Client Ledger**
   - Installment payments flow into the unified client ledger
   - Clear distinction between installment payments and other transactions
   - Running balance reflects all payment types
