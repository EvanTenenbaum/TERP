# Realistic Mock Data Generation Roadmap

**Status:** 🔵 Planned  
**Priority:** High  
**Estimated Time:** 2-3 days  
**Created:** October 27, 2025

---

## Overview

Build a comprehensive mock data generation system that creates hyper-realistic business data for TERP, enabling realistic testing and iteration without production data.

### Business Parameters

**Revenue & Scale:**
- 1 year of historical data
- $2M average monthly revenue ($24M annual)
- 90% flower sales, 10% other products
- Peak pricing: Indoor flower at $1,800/lb

**Client Distribution:**
- 60 total clients
- Long-tail distribution: 10 whales = 70% of purchases
- Remaining 50 clients = 30% of purchases
- No addresses or emails (B2B focus)

**Consignment Model:**
- 50% of sales on consignment
- 90% of intake on consignment
- Track consignment inventory separately

**Returns & Refunds:**
- 0.5% return rate
- 5% of orders get 5% refund (quality adjustments)

**Accounts Receivable:**
- 15% of debt overdue
- 50% of overdue debt is 120+ days old
- Realistic aging buckets (0-30, 31-60, 61-90, 91-120, 120+)

---

## Why This Matters

**Current Problem:**
- Limited seed data (only accounting module)
- Can't test realistic scenarios
- Hard to iterate on UI/UX with fake data
- No way to test edge cases (overdue payments, returns, consignment)

**Solution:**
- Hyper-realistic data that looks like real business
- Easy to spin up instances with/without data
- Reproducible for testing
- Covers all 74 database tables

---

## Phases

### Phase 1: Foundation & Architecture (4 hours)

**Tasks:**
1. Install dependencies
   - `@faker-js/faker` - Realistic fake data
   - `date-fns` - Date manipulation
   - `seedrandom` - Reproducible randomness

2. Create directory structure
   ```
   scripts/seed/
   ├── index.ts              # Main orchestrator
   ├── config.ts             # Business parameters
   ├── generators/           # Data generators
   ├── utils/                # Shared utilities
   └── profiles/             # Data profiles
   ```

3. Define business parameter config
   ```typescript
   export const businessParams = {
     timeframe: {
       startDate: '2024-01-01',
       endDate: '2024-12-31',
       totalMonths: 12,
     },
     revenue: {
       monthlyAverage: 2_000_000,
       annualTotal: 24_000_000,
       flowerPercentage: 0.90,
     },
     clients: {
       total: 60,
       whales: 10,
       whaleRevenueShare: 0.70,
     },
     consignment: {
       salesPercentage: 0.50,
       intakePercentage: 0.90,
     },
     pricing: {
       indoorFlowerMaxPrice: 1800, // per pound
       pricePerGram: 1800 / 453.592, // ~$3.97/g
     },
     quality: {
       returnRate: 0.005,
       refundRate: 0.05,
       refundPercentage: 0.05,
     },
     ar: {
       overduePercentage: 0.15,
       overdue120DaysPercentage: 0.50,
     },
   };
   ```

4. Create base generator interface
   ```typescript
   interface DataGenerator<T> {
     generate(count: number, context: GenerationContext): Promise<T[]>;
     validate(data: T[]): boolean;
     getDependencies(): string[];
   }
   ```

**Deliverables:**
- ✅ Dependencies installed
- ✅ Directory structure created
- ✅ Business parameters configured
- ✅ Base interfaces defined

**Testing:**
- [ ] Run `pnpm install` successfully
- [ ] Verify directory structure exists
- [ ] TypeScript compiles without errors

---

### Phase 2: Client Distribution Generator (4 hours)

**Tasks:**
1. Create realistic client distribution
   - 10 whale clients (70% of revenue)
   - 50 long-tail clients (30% of revenue)
   - Assign monthly purchase patterns

2. Generate client data
   ```typescript
   {
     name: "Green Valley Distribution",  // Faker.company.name()
     contactName: "Sarah Martinez",      // Faker.person.fullName()
     phone: "(555) 123-4567",           // Faker.phone.number()
     // NO email, NO address (per requirements)
     creditLimit: 100000,                // Tiered for whales
     paymentTerms: "Net 30",
     status: "active",
     clientType: "whale" | "regular",
     monthlyPurchaseTarget: 140000,      // For whales
   }
   ```

3. Calculate client revenue targets
   - Whales: $24M × 0.70 ÷ 10 = $1.68M/year each ($140k/month)
   - Regular: $24M × 0.30 ÷ 50 = $144k/year each ($12k/month)
   - Add ±20% variance for realism

4. Assign client purchase patterns
   - Whales: 2-4 orders/week
   - Regular: 1-2 orders/month
   - Seasonal variation (Q4 spike)

**Deliverables:**
- ✅ ClientGenerator with whale/regular distribution
- ✅ Realistic purchase patterns
- ✅ Credit limits and payment terms
- ✅ 60 clients seeded

**Testing:**
- [ ] Sum of client revenue targets = $24M ±5%
- [ ] 10 whale clients exist
- [ ] 50 regular clients exist
- [ ] No emails or addresses in data

---

### Phase 3: Inventory & Pricing Generator (6 hours)

**Tasks:**
1. Generate strain catalog
   - 50 unique strains (Blue Dream, OG Kush, etc.)
   - Mix of indoor/outdoor/greenhouse
   - Realistic THC/CBD percentages

2. Generate products with realistic pricing
   ```typescript
   {
     sku: "BLUEDREAM-INDOOR-1LB",
     strainId: 1,
     grade: "AAA",
     type: "flower",
     growType: "indoor",
     unitSize: "1lb",
     unitSizeGrams: 453.592,
     pricePerUnit: 1800,  // $1800/lb for indoor
     pricePerGram: 3.97,
     costPerUnit: 1200,   // 33% margin
   }
   ```

3. Create pricing tiers
   - Indoor: $1,800/lb (premium)
   - Greenhouse: $1,200/lb (mid-tier)
   - Outdoor: $800/lb (budget)
   - 90% of products are flower

4. Generate batches with consignment tracking
   ```typescript
   {
     batchNumber: "20240115-BLUEDREAM-001",
     productId: 1,
     quantity: 100,  // pounds
     costPerUnit: 1200,
     isConsignment: true,  // 90% of intake
     vendorId: 5,
     receivedDate: "2024-01-15",
     status: "available",
   }
   ```

**Deliverables:**
- ✅ 50 strains
- ✅ 200+ products (90% flower)
- ✅ Realistic pricing ($800-$1800/lb)
- ✅ Batches with consignment tracking

**Testing:**
- [ ] 90% of products are flower type
- [ ] Indoor products priced at $1800/lb
- [ ] 90% of batches marked as consignment
- [ ] All products have valid pricing

---

### Phase 4: Order Generation with Revenue Distribution (8 hours)

**Tasks:**
1. Generate 1 year of orders (Jan 2024 - Dec 2024)
   - Calculate total orders needed: ~3,000-5,000 orders
   - Distribute across clients based on purchase patterns
   - Ensure revenue targets are met

2. Create order distribution algorithm
   ```typescript
   function generateOrders(clients: Client[], products: Product[]) {
     const orders = [];
     
     for (const client of clients) {
       const monthlyTarget = client.monthlyPurchaseTarget;
       const ordersPerMonth = client.clientType === 'whale' ? 12 : 2;
       
       for (let month = 0; month < 12; month++) {
         for (let i = 0; i < ordersPerMonth; i++) {
           const order = {
             clientId: client.id,
             orderDate: generateRandomDateInMonth(month),
             items: generateOrderItems(products, monthlyTarget / ordersPerMonth),
             isConsignment: Math.random() < 0.50,  // 50% consignment
             status: 'completed',
           };
           orders.push(order);
         }
       }
     }
     
     return orders;
   }
   ```

3. Generate order items with realistic quantities
   - Whales: 20-100 lbs per order
   - Regular: 5-20 lbs per order
   - Mix of products (prefer indoor for whales)

4. Calculate COGS for each order
   - Use FIFO method
   - Track consignment vs. owned inventory
   - Calculate margins

5. Apply returns and refunds
   - 0.5% of orders get full return
   - 5% of orders get 5% refund
   - Create return/refund records

**Deliverables:**
- ✅ 3,000-5,000 orders over 12 months
- ✅ Revenue targets met ($2M/month avg)
- ✅ 50% of sales on consignment
- ✅ Returns and refunds applied
- ✅ COGS calculated

**Testing:**
- [ ] Total revenue = $24M ±5%
- [ ] Monthly average = $2M ±10%
- [ ] Whale clients = 70% of revenue
- [ ] 50% of orders marked as consignment
- [ ] 0.5% return rate achieved
- [ ] 5% refund rate achieved

---

### Phase 5: Invoicing & AR Generation (6 hours)

**Tasks:**
1. Generate invoices for all completed orders
   ```typescript
   {
     invoiceNumber: "INV-2024-00001",
     orderId: 1,
     clientId: 1,
     invoiceDate: "2024-01-15",
     dueDate: "2024-02-14",  // Net 30
     subtotal: 50000,
     tax: 0,  // Cannabis tax handled separately
     total: 50000,
     status: "unpaid" | "paid" | "overdue",
   }
   ```

2. Generate payment records
   - 85% of invoices paid on time or early
   - 15% overdue
   - Of overdue: 50% are 120+ days old

3. Create aging buckets
   ```typescript
   function calculateAgingBuckets(invoices: Invoice[]) {
     const aging = {
       current: 0,      // 0-30 days
       days31_60: 0,
       days61_90: 0,
       days91_120: 0,
       days120plus: 0,
     };
     
     for (const invoice of invoices) {
       const daysOverdue = daysSince(invoice.dueDate);
       if (daysOverdue <= 30) aging.current += invoice.total;
       else if (daysOverdue <= 60) aging.days31_60 += invoice.total;
       else if (daysOverdue <= 90) aging.days61_90 += invoice.total;
       else if (daysOverdue <= 120) aging.days91_120 += invoice.total;
       else aging.days120plus += invoice.total;
     }
     
     return aging;
   }
   ```

4. Generate payment history
   - Realistic payment patterns
   - Some clients always pay on time
   - Some clients always pay late
   - Track payment methods (check, wire, ACH)

**Deliverables:**
- ✅ Invoices for all orders
- ✅ 15% of debt overdue
- ✅ 50% of overdue debt 120+ days old
- ✅ Realistic payment patterns
- ✅ AR aging report data

**Testing:**
- [ ] All orders have invoices
- [ ] 15% of total AR is overdue
- [ ] 50% of overdue AR is 120+ days old
- [ ] Aging buckets sum to total AR
- [ ] Payment history is realistic

---

### Phase 6: Accounting & Ledger Generation (6 hours)

**Tasks:**
1. Generate chart of accounts
   ```typescript
   const chartOfAccounts = [
     { code: "1000", name: "Cash", type: "asset" },
     { code: "1200", name: "Accounts Receivable", type: "asset" },
     { code: "1300", name: "Inventory", type: "asset" },
     { code: "2000", name: "Accounts Payable", type: "liability" },
     { code: "3000", name: "Owner's Equity", type: "equity" },
     { code: "4000", name: "Product Sales", type: "revenue" },
     { code: "5000", name: "Cost of Goods Sold", type: "expense" },
     { code: "6000", name: "Operating Expenses", type: "expense" },
   ];
   ```

2. Generate ledger entries for all transactions
   - Sales: DR AR, CR Revenue
   - Payments: DR Cash, CR AR
   - COGS: DR COGS, CR Inventory
   - Expenses: DR Expense, CR Cash

3. Create fiscal periods (monthly)
   - Jan 2024 - Dec 2024
   - Calculate monthly P&L
   - Track inventory valuation

4. Generate realistic expenses
   - Rent: $10k/month
   - Utilities: $2k/month
   - Payroll: $50k/month
   - Insurance: $5k/month
   - Marketing: $3k/month

**Deliverables:**
- ✅ Complete chart of accounts
- ✅ Ledger entries for all transactions
- ✅ 12 fiscal periods
- ✅ Monthly P&L data
- ✅ Realistic expense patterns

**Testing:**
- [ ] Debits = Credits for all entries
- [ ] Revenue matches order totals
- [ ] COGS matches order costs
- [ ] Cash flow is realistic
- [ ] Profit margins are 20-40%

---

### Phase 7: Supporting Data & Activity (4 hours)

**Tasks:**
1. Generate client activity logs
   - Order placements
   - Payment submissions
   - Phone calls
   - Notes

2. Generate inventory movements
   - Receiving (intake)
   - Sales (outbound)
   - Adjustments
   - Returns

3. Generate audit logs
   - User actions
   - System events
   - Data changes

4. Generate notes and comments
   - Client notes
   - Order notes
   - Product notes

**Deliverables:**
- ✅ Client activity history
- ✅ Inventory movement records
- ✅ Audit logs
- ✅ Notes and comments

**Testing:**
- [ ] Activity logs match order dates
- [ ] Inventory movements balance
- [ ] Audit logs are comprehensive
- [ ] Notes are realistic

---

### Phase 8: CLI & Instance Management (4 hours)

**Tasks:**
1. Create seed CLI commands
   ```bash
   # Seed with realistic data
   pnpm seed:realistic
   
   # Fresh instance (no data)
   pnpm db:reset
   
   # Clear data but keep schema
   pnpm db:clear
   ```

2. Create package.json scripts
   ```json
   {
     "scripts": {
       "seed:realistic": "tsx scripts/seed/index.ts --profile realistic",
       "db:reset": "tsx scripts/db-reset.ts",
       "db:clear": "tsx scripts/db-clear.ts"
     }
   }
   ```

3. Add progress reporting
   - Show what's being generated
   - Estimate time remaining
   - Report success/failure

4. Add validation
   - Check referential integrity
   - Verify business rules
   - Report any issues

**Deliverables:**
- ✅ CLI commands working
- ✅ Progress reporting
- ✅ Validation checks
- ✅ Error handling

**Testing:**
- [ ] `pnpm seed:realistic` completes successfully
- [ ] `pnpm db:reset` clears and recreates schema
- [ ] `pnpm db:clear` removes data only
- [ ] Progress is reported clearly
- [ ] Errors are handled gracefully

---

### Phase 9: Documentation & Testing (4 hours)

**Tasks:**
1. Create usage documentation
   - How to seed database
   - How to reset database
   - How to customize parameters
   - Troubleshooting guide

2. Update project documentation
   - CHANGELOG.md
   - PROJECT_CONTEXT.md
   - README.md

3. Create testing guide
   - How to verify data quality
   - How to check business rules
   - How to validate scenarios

4. Write unit tests
   - Test generators
   - Test business logic
   - Test validation

**Deliverables:**
- ✅ Complete usage documentation
- ✅ Updated project docs
- ✅ Testing guide
- ✅ Unit tests

**Testing:**
- [ ] Documentation is clear and complete
- [ ] All tests pass
- [ ] Examples work as documented
- [ ] Troubleshooting guide is helpful

---

## Dependencies

**Must be completed first:**
- None (this is a standalone system)

**Blocks:**
- UI/UX iteration (needs realistic data)
- Performance testing (needs large datasets)
- Business logic testing (needs edge cases)

---

## Key Deliverables

1. **Realistic Mock Data System**
   - 1 year of transaction history
   - $24M annual revenue
   - 60 clients with realistic distribution
   - Consignment tracking
   - Returns and refunds
   - AR aging with overdue accounts

2. **CLI Commands**
   - `pnpm seed:realistic` - Seed with realistic data
   - `pnpm db:reset` - Fresh instance
   - `pnpm db:clear` - Clear data only

3. **Documentation**
   - Usage guide
   - Business parameter reference
   - Testing guide
   - Troubleshooting guide

4. **Validation**
   - Referential integrity checks
   - Business rule validation
   - Data quality reports

---

## Testing Checklist

### Data Quality
- [ ] All 74 tables have data
- [ ] No foreign key violations
- [ ] No null values in required fields
- [ ] Dates are within 2024 range

### Business Rules
- [ ] Total revenue = $24M ±5%
- [ ] Monthly average = $2M ±10%
- [ ] 10 whale clients = 70% of revenue
- [ ] 90% of products are flower
- [ ] Indoor flower priced at $1800/lb
- [ ] 50% of sales on consignment
- [ ] 90% of intake on consignment
- [ ] 0.5% return rate
- [ ] 5% refund rate (5% refund amount)
- [ ] 15% of debt overdue
- [ ] 50% of overdue debt 120+ days old

### Client Data
- [ ] 60 clients total
- [ ] 10 whales, 50 regular
- [ ] No email addresses
- [ ] No physical addresses
- [ ] Realistic company names
- [ ] Valid phone numbers

### Financial Data
- [ ] Debits = Credits
- [ ] Cash flow is positive
- [ ] Profit margins 20-40%
- [ ] AR aging buckets sum correctly
- [ ] Inventory valuation is accurate

### UI Verification
- [ ] Dashboard shows realistic metrics
- [ ] Client list looks professional
- [ ] Order history is believable
- [ ] AR aging report is accurate
- [ ] Inventory levels are realistic

---

## Success Criteria

✅ **Data Quality**
- All 74 tables populated
- Zero referential integrity errors
- Data looks realistic in UI

✅ **Business Accuracy**
- Revenue targets met ($24M annual)
- Client distribution correct (70/30 split)
- Consignment percentages accurate
- AR aging matches requirements

✅ **Usability**
- One command to seed: `pnpm seed:realistic`
- One command to reset: `pnpm db:reset`
- Completes in < 2 minutes
- Clear progress reporting

✅ **Maintainability**
- Well-documented code
- Easy to modify parameters
- Easy to add new generators
- Comprehensive testing

---

## Business Parameter Reference

```typescript
export const realisticBusinessParams = {
  // Timeframe
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  totalMonths: 12,
  
  // Revenue
  monthlyAverage: 2_000_000,
  annualTotal: 24_000_000,
  flowerPercentage: 0.90,
  
  // Clients
  totalClients: 60,
  whaleClients: 10,
  whaleRevenueShare: 0.70,
  regularRevenueShare: 0.30,
  
  // Pricing
  indoorFlowerPrice: 1800,  // per pound
  greenhouseFlowerPrice: 1200,
  outdoorFlowerPrice: 800,
  
  // Consignment
  salesConsignmentRate: 0.50,
  intakeConsignmentRate: 0.90,
  
  // Quality
  returnRate: 0.005,        // 0.5%
  refundRate: 0.05,         // 5% of orders
  refundAmount: 0.05,       // 5% refund
  
  // Accounts Receivable
  overduePercentage: 0.15,  // 15% overdue
  overdue120DaysRate: 0.50, // 50% of overdue is 120+ days
  
  // Client Behavior
  whalePurchaseFrequency: 'weekly',      // 2-4 orders/week
  regularPurchaseFrequency: 'monthly',   // 1-2 orders/month
  seasonalVariation: true,               // Q4 spike
  
  // Data Validation
  allowedVariance: 0.05,    // ±5% for revenue targets
};
```

---

## Notes

- **No email addresses or physical addresses** for clients (B2B focus)
- **Consignment tracking** is critical - separate inventory pools
- **Whale clients** should have realistic names (not "Client 1")
- **Returns vs Refunds:** Returns are full, refunds are partial (5%)
- **AR aging** must match real-world patterns (some clients always late)
- **Seasonal variation:** Q4 should be 20-30% higher than Q1-Q3
- **Product mix:** 90% flower, but include some pre-rolls, edibles, etc.
- **Pricing tiers:** Indoor > Greenhouse > Outdoor (realistic market)

---

## Future Enhancements

- Multiple data profiles (small/medium/large)
- Custom parameter overrides via CLI
- Export data to CSV for analysis
- Data anonymization for demos
- Synthetic data generation (ML-based)

---

**This roadmap will create production-quality mock data for realistic TERP testing!** 🎯

