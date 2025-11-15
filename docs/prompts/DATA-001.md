# DATA-001: Comprehensive Production Data Seeding with Operational Coherence

**Repository:** https://github.com/EvanTenenbaum/TERP  
**Task ID:** DATA-001  
**Priority:** P0 (CRITICAL)  
**Estimated Time:** 120-160 hours (3-4 weeks)  
**Module:** `scripts/generators/`, `scripts/seed-*.ts`  
**Dependencies:** None

---

## 📋 Task Description

Transform the TERP production database from sparse test data (9/107 tables, 8% coverage) to a fully operational, coherent dataset representing 22 months of realistic business operations. The critical requirement is **operational coherence** - data must not just look realistic, but must behave as if actual business operations created it, with all appropriate downstream records and state transitions.

**Current State:**

- Only 9 tables seeded: clients, orders, invoices, strains, products, lots, batches, returns, brands
- Recently-built features have no data: events, comments, lists, dashboard widgets
- Existing data lacks operational linkage: orders don't create invoice line items, invoices don't have payments, batches don't have workflow history
- System appears broken when testing features

**Target State:**

- All 107 tables populated with realistic, interconnected data
- Every transaction creates all operationally linked records
- Financial data is mathematically correct (double-entry bookkeeping, balanced accounts)
- State transitions follow valid business logic
- Can operate system as if it's been running a real business for 22 months

---

## 🎯 Critical Concept: Operational Coherence

**What This Means:**

When you generate an order in real business operations, it triggers a cascade of related records:

1. Order record created
2. Invoice auto-generated
3. Invoice line items created (product details)
4. Ledger entries created (DR: AR, CR: Revenue)
5. AR aging entry created
6. Workflow queue entry created (fulfillment task)
7. Inventory reserved (batch quantity reduced)
8. Client activity logged
9. Event scheduled (delivery appointment)

**Your generators must create ALL of these records**, not just the order. This is the difference between data that looks realistic and data that behaves realistically.

---

## 🚀 4-Phase Execution Protocol

Follow this protocol exactly. See `docs/ROADMAP_AGENT_GUIDE.md` for complete details.

### Phase 1: Pre-Flight Check (30 minutes)

**Objective:** Register your session and understand the existing infrastructure.

**Steps:**

1. **Clone the repository:**

   ```bash
   git clone https://github.com/EvanTenenbaum/TERP.git
   cd TERP
   pnpm install
   ```

2. **Read the roadmap:**

   ```bash
   cat docs/roadmaps/MASTER_ROADMAP.md | grep -A 50 "DATA-001"
   ```

3. **Study existing generators:**

   ```bash
   # Read the generator README
   cat scripts/generators/README.md

   # Examine existing generators to understand patterns
   cat scripts/generators/orders.ts
   cat scripts/generators/invoices.ts
   cat scripts/generators/inventory.ts
   ```

4. **Review the detailed task specification:**

   ```bash
   cat DATA-001-ROADMAP-TASK-V2.md
   ```

5. **Check for conflicts:**

   ```bash
   cat docs/ACTIVE_SESSIONS.md
   ```

   If another agent is working on DATA-001, STOP and coordinate.

6. **Create session file:**

   ```bash
   SESSION_ID="Session-$(date +%Y%m%d)-DATA-001-$(openssl rand -hex 4)"
   cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
   # DATA-001: Comprehensive Production Data Seeding

   **Agent:** [Your name/ID]
   **Started:** $(date +%Y-%m-%d)
   **Status:** In Progress

   ## Progress

   - [ ] Week 1: Operational flow mapping and architecture enhancement
   - [ ] Week 2: Core operational data generation
   - [ ] Week 3: Feature-specific data and financial completeness
   - [ ] Week 4: Validation, testing, and production deployment

   ## Notes

   [Add notes here as you work]
   EOF
   ```

7. **Register session atomically:**

   ```bash
   git pull origin main
   echo "- DATA-001: ${SESSION_ID} ($(date +%Y-%m-%d))" >> docs/ACTIVE_SESSIONS.md
   git add docs/ACTIVE_SESSIONS.md docs/sessions/active/${SESSION_ID}.md
   git commit -m "Register session for DATA-001"
   git push origin main
   ```

   **If push fails:** Another agent registered first. Pull, check conflicts, try again.

---

### Phase 2: Implementation (3-4 weeks)

**Objective:** Build the comprehensive seeding system with operational coherence.

This is a complex, multi-week project. Follow the detailed implementation plan in `DATA-001-ROADMAP-TASK-V2.md`.

#### Week 1: Foundation (Days 1-5)

**Days 1-2: Operational Flow Mapping**

Map complete operational flows for all major business processes. Create visual diagrams showing every table that gets touched during each operation.

**Key Flows to Map:**

- Order-to-Cash: Order → Invoice → Line Items → Ledger → AR → Payment → Bank
- Procure-to-Pay: PO → Receipt → Lot → Batch → Inventory → Vendor Bill → Payment
- Workflow: Receipt → Testing → Packaging → Available → Sold
- Events: Schedule → Attendees → Invitations → Reminders → Completion → Notes
- Client Relationship: Communication → Activity Log → Notes → Follow-ups

**Deliverable:** `docs/DATA-001-OPERATIONAL-FLOWS.md` with complete flow diagrams

**Days 3-5: Generator Architecture Enhancement**

Enhance the generator system to support operational coherence:

1. **Create Transaction Context System**

   ```typescript
   // scripts/generators/transaction-context.ts
   interface TransactionContext {
     order: OrderData;
     invoice: InvoiceData;
     invoiceLineItems: InvoiceLineItemData[];
     ledgerEntries: LedgerEntryData[];
     arEntry: ARAgingData;
     workflowEntry?: WorkflowQueueData;
     event?: EventData;
     clientActivity: ClientActivityData;
   }
   ```

2. **Build Cascading Generator Pattern**

   ```typescript
   // scripts/generators/order-cascade.ts
   export function generateOrderWithCascade(
     client: ClientData,
     batches: BatchData[],
     inventoryTracker: InventoryTracker
   ): TransactionContext {
     // Generate order
     const order = createOrder(client, batches);

     // Cascade: Generate all linked records
     const invoice = generateInvoiceFromOrder(order);
     const lineItems = generateInvoiceLineItems(order, invoice);
     const ledgerEntries = generateLedgerEntriesForSale(order, invoice);
     const arEntry = generateAREntry(invoice);
     const workflowEntry = generateWorkflowForOrder(order);
     const clientActivity = logClientActivity("ORDER_CREATED", client, order);

     // Update inventory
     order.items.forEach(item => {
       inventoryTracker.reserveInventory(item.batchId, item.quantity);
     });

     return {
       order,
       invoice,
       invoiceLineItems,
       ledgerEntries,
       arEntry,
       workflowEntry,
       clientActivity,
     };
   }
   ```

3. **Create State Machine Validators**

   ```typescript
   // scripts/generators/validators.ts
   export function validateWorkflowTransition(
     fromStatus: WorkflowStatus,
     toStatus: WorkflowStatus
   ): boolean {
     const validTransitions = {
       RECEIVED: ["TESTING", "REJECTED"],
       TESTING: ["PACKAGING", "FAILED"],
       PACKAGING: ["AVAILABLE", "DAMAGED"],
       AVAILABLE: ["SOLD", "EXPIRED"],
     };

     return validTransitions[fromStatus]?.includes(toStatus) ?? false;
   }
   ```

4. **Build Inventory Tracker**

   ```typescript
   // scripts/generators/inventory-tracker.ts
   export class InventoryTracker {
     private batchQuantities: Map<number, number>;

     constructor(batches: BatchData[]) {
       this.batchQuantities = new Map(
         batches.map(b => [b.id!, parseFloat(b.quantity)])
       );
     }

     reserveInventory(batchId: number, quantity: number): boolean {
       const available = this.batchQuantities.get(batchId) ?? 0;
       if (available < quantity) return false;

       this.batchQuantities.set(batchId, available - quantity);
       return true;
     }

     getAvailableQuantity(batchId: number): number {
       return this.batchQuantities.get(batchId) ?? 0;
     }
   }
   ```

**Deliverable:** Enhanced generator architecture in `scripts/generators/`

#### Week 2: Core Operational Data (Days 1-5)

**Days 1-2: Order-to-Cash Linkage**

Enhance existing order/invoice generators to create all linked records:

1. **Generate Invoice Line Items**

   ```typescript
   // scripts/generators/invoice-line-items.ts
   export function generateInvoiceLineItems(
     order: OrderData,
     invoice: InvoiceData
   ): InvoiceLineItemData[] {
     return order.items.map((item, index) => ({
       invoiceId: invoice.id!,
       lineNumber: index + 1,
       productId: item.productId,
       batchId: item.batchId,
       description: item.displayName,
       quantity: item.quantity.toString(),
       unitPrice: item.unitPrice.toString(),
       lineTotal: item.lineTotal.toString(),
       taxAmount: "0.00", // Calculate based on tax rules
       createdAt: invoice.createdAt,
     }));
   }
   ```

2. **Generate Payment Records**

   For 85% of invoices (15% overdue), create payments:

   ```typescript
   // scripts/generators/payments.ts
   export function generatePayments(invoices: InvoiceData[]): PaymentData[] {
     const payments: PaymentData[] = [];

     invoices.forEach(invoice => {
       // Skip overdue invoices (15%)
       if (invoice.status === "OVERDUE") return;

       // Determine payment date (after invoice date)
       const daysToPayment = Math.floor(Math.random() * 30) + 1;
       const paymentDate = new Date(invoice.createdAt);
       paymentDate.setDate(paymentDate.getDate() + daysToPayment);

       payments.push({
         paymentNumber: `PAY-${String(payments.length + 1).padStart(6, "0")}`,
         customerId: invoice.customerId,
         amount: invoice.total,
         paymentDate,
         paymentMethod: weightedRandom(
           ["ACH", "CHECK", "WIRE"],
           [0.6, 0.3, 0.1]
         ),
         referenceNumber: `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
         notes: `Payment for Invoice ${invoice.invoiceNumber}`,
         createdAt: paymentDate,
         createdBy: 1,
       });
     });

     return payments;
   }
   ```

3. **Generate Ledger Entries**

   Create double-entry bookkeeping for all transactions:

   ```typescript
   // scripts/generators/ledger.ts
   export function generateLedgerEntriesForSale(
     order: OrderData,
     invoice: InvoiceData
   ): LedgerEntryData[] {
     const entries: LedgerEntryData[] = [];
     const entryDate = invoice.createdAt;

     // Revenue recognition: DR: AR, CR: Revenue
     entries.push({
       entryDate,
       accountNumber: "1100", // AR
       debit: invoice.total,
       credit: "0.00",
       description: `AR for Invoice ${invoice.invoiceNumber}`,
       referenceType: "INVOICE",
       referenceId: invoice.id!,
       createdAt: entryDate,
     });

     entries.push({
       entryDate,
       accountNumber: "4000", // Revenue
       debit: "0.00",
       credit: invoice.total,
       description: `Revenue from Invoice ${invoice.invoiceNumber}`,
       referenceType: "INVOICE",
       referenceId: invoice.id!,
       createdAt: entryDate,
     });

     // COGS recognition: DR: COGS, CR: Inventory
     entries.push({
       entryDate,
       accountNumber: "5000", // COGS
       debit: order.totalCogs,
       credit: "0.00",
       description: `COGS for Order ${order.orderNumber}`,
       referenceType: "ORDER",
       referenceId: order.id!,
       createdAt: entryDate,
     });

     entries.push({
       entryDate,
       accountNumber: "1200", // Inventory
       debit: "0.00",
       credit: order.totalCogs,
       description: `Inventory reduction for Order ${order.orderNumber}`,
       referenceType: "ORDER",
       referenceId: order.id!,
       createdAt: entryDate,
     });

     return entries;
   }
   ```

4. **Generate Bank Transactions**

   ```typescript
   // scripts/generators/bank-transactions.ts
   export function generateBankTransactions(
     payments: PaymentData[],
     bankAccount: BankAccountData
   ): BankTransactionData[] {
     return payments.map(payment => ({
       bankAccountId: bankAccount.id!,
       transactionDate: payment.paymentDate,
       transactionType: "DEPOSIT",
       amount: payment.amount,
       description: `Payment ${payment.paymentNumber}`,
       referenceNumber: payment.referenceNumber,
       balance: "0.00", // Calculate running balance
       reconciled: true,
       reconciledDate: payment.paymentDate,
       createdAt: payment.paymentDate,
     }));
   }
   ```

**Days 3-4: Inventory & Workflow**

For each existing batch, generate workflow history:

```typescript
// scripts/generators/workflow.ts
export function generateWorkflowForBatches(batches: BatchData[]): {
  queue: WorkflowQueueData[];
  history: WorkflowHistoryData[];
} {
  const queue: WorkflowQueueData[] = [];
  const history: WorkflowHistoryData[] = [];

  batches.forEach(batch => {
    const lotDate = batch.createdAt;

    // Initial workflow entry
    const queueEntry = {
      batchId: batch.id!,
      status: "AVAILABLE", // Current status
      priority: "NORMAL",
      assignedTo: 1,
      createdAt: lotDate,
      updatedAt: new Date(),
    };
    queue.push(queueEntry);

    // Generate state transition history
    const transitions = [
      { status: "RECEIVED", daysAfter: 0 },
      { status: "TESTING", daysAfter: 1 },
      { status: "PACKAGING", daysAfter: 3 },
      { status: "AVAILABLE", daysAfter: 5 },
    ];

    transitions.forEach(transition => {
      const transitionDate = new Date(lotDate);
      transitionDate.setDate(transitionDate.getDate() + transition.daysAfter);

      history.push({
        batchId: batch.id!,
        fromStatus:
          transitions[transitions.indexOf(transition) - 1]?.status || null,
        toStatus: transition.status,
        changedBy: 1,
        changedAt: transitionDate,
        notes: `Batch transitioned to ${transition.status}`,
        createdAt: transitionDate,
      });
    });
  });

  return { queue, history };
}
```

**Day 5: Client Relationship Data**

Generate client activity, communications, and notes:

```typescript
// scripts/generators/client-activity.ts
export function generateClientActivity(
  clients: ClientData[],
  orders: OrderData[],
  payments: PaymentData[],
  events: EventData[]
): ClientActivityData[] {
  const activities: ClientActivityData[] = [];

  // Activity from orders
  orders.forEach(order => {
    activities.push({
      clientId: order.clientId,
      activityType: "ORDER_CREATED",
      activityDate: order.createdAt,
      description: `Order ${order.orderNumber} created - $${order.total}`,
      referenceType: "ORDER",
      referenceId: order.id!,
      createdBy: order.createdBy,
      createdAt: order.createdAt,
    });
  });

  // Activity from payments
  payments.forEach(payment => {
    activities.push({
      clientId: payment.customerId,
      activityType: "PAYMENT_RECEIVED",
      activityDate: payment.paymentDate,
      description: `Payment ${payment.paymentNumber} received - $${payment.amount}`,
      referenceType: "PAYMENT",
      referenceId: payment.id!,
      createdBy: 1,
      createdAt: payment.paymentDate,
    });
  });

  // Activity from events
  events.forEach(event => {
    if (event.clientId) {
      activities.push({
        clientId: event.clientId,
        activityType: "MEETING_SCHEDULED",
        activityDate: event.startTime,
        description: `Meeting: ${event.title}`,
        referenceType: "EVENT",
        referenceId: event.id!,
        createdBy: event.createdBy,
        createdAt: event.createdAt,
      });
    }
  });

  return activities.sort(
    (a, b) => a.activityDate.getTime() - b.activityDate.getTime()
  );
}
```

#### Week 3: Feature-Specific Data (Days 1-5)

**Days 1-2: Events, Calendar, Comments**

See detailed implementation in `DATA-001-ROADMAP-TASK-V2.md` Phase 4.1 and 4.2.

Key generators to build:

- `scripts/generators/events.ts` - 200-300 events with attendees, invitations, reminders
- `scripts/generators/comments.ts` - 500-1000 comments across orders, events, clients, batches

**Days 3-4: Lists, Pricing, Purchase Orders**

See detailed implementation in `DATA-001-ROADMAP-TASK-V2.md` Phase 4.3, 4.4, 4.5.

Key generators to build:

- `scripts/generators/lists.ts` - 50-100 lists with 200-500 items
- `scripts/generators/pricing.ts` - 20 rules, 10 profiles
- `scripts/generators/purchase-orders.ts` - 150 POs matching lots

**Day 5: Financial Completeness**

Ensure all financial data balances:

- Validate: Total Debits = Total Credits
- Validate: AR Balance = Sum of unpaid invoices
- Validate: Inventory Balance = Sum of batch values
- Generate financial statements to verify data quality

#### Week 4: Validation & Deployment (Days 1-5)

**Days 1-3: Comprehensive Testing**

Build and run validation tests:

```typescript
// scripts/validate-seed-data.ts
async function validateSeedData() {
  console.log("🔍 Validating Seed Data...\n");

  // 1. Referential Integrity
  console.log("1. Checking referential integrity...");
  await validateForeignKeys();

  // 2. State Consistency
  console.log("2. Checking state consistency...");
  await validateInvoicePayments();
  await validateWorkflowHistory();
  await validateInventoryQuantities();

  // 3. Temporal Coherence
  console.log("3. Checking temporal coherence...");
  await validateChronologicalOrder();

  // 4. Business Logic
  console.log("4. Checking business logic...");
  await validateConsignmentHandling();
  await validatePaymentTerms();
  await validatePricingRules();

  // 5. Financial Integrity
  console.log("5. Checking financial integrity...");
  await validateDoubleEntry();
  await validateAccountBalances();

  console.log("\n✅ All validations passed!");
}
```

**Day 4: Production Deployment**

1. **Create database backup:**

   ```bash
   # Backup production database before seeding
   tsx scripts/backup-production-db.ts
   ```

2. **Run seeding script:**

   ```bash
   # Seed production with confirmation flag
   tsx scripts/seed-live-database.ts --confirm-production-seed
   ```

3. **Monitor execution:**

   Watch for errors, validate progress, ensure all tables populated.

**Day 5: Post-Deployment Validation**

1. **Run validation suite on production:**

   ```bash
   tsx scripts/validate-seed-data.ts --production
   ```

2. **Manual testing:**
   - Browse calendar → see events
   - View client profiles → see activity history
   - Check AR aging → see realistic overdue accounts
   - Review workflow queue → see batches in various stages
   - Generate financial reports → verify P&L and balance sheet

3. **Create completion report:**

   Document all statistics, validations passed, and any issues found.

---

### Phase 3: Testing & Validation (Ongoing)

**Objective:** Ensure data quality and operational coherence throughout development.

**Continuous Validation:**

Run these checks after each generator is built:

```bash
# Test locally
pnpm seed:realistic

# Run validation
tsx scripts/validate-seed-data.ts

# Check specific aspects
tsx scripts/validate-foreign-keys.ts
tsx scripts/validate-financial-integrity.ts
tsx scripts/validate-state-transitions.ts
```

**Quality Checklist:**

- [ ] All foreign keys reference existing records
- [ ] All paid invoices have payment records
- [ ] All completed workflows have history
- [ ] All inventory quantities reconcile with orders
- [ ] All ledger entries balance (debits = credits)
- [ ] All account balances reconcile
- [ ] All timestamps are chronologically sensible
- [ ] All state transitions are valid
- [ ] All business rules are satisfied

---

### Phase 4: Completion (Final Day)

**Objective:** Document results and update roadmap.

**Steps:**

1. **Create comprehensive completion report:**

   ```bash
   cat > "docs/DATA-001-COMPLETION-REPORT.md" << 'EOF'
   # DATA-001 Completion Report

   **Task:** Comprehensive Production Data Seeding with Operational Coherence
   **Completed:** $(date +%Y-%m-%d)
   **Agent:** [Your name/ID]

   ## Summary

   Successfully seeded production database with 100% table coverage (107/107 tables)
   representing 22 months of operationally coherent business operations.

   ## Statistics

   ### Table Coverage
   - Before: 9/107 tables (8%)
   - After: 107/107 tables (100%)

   ### Data Volume
   - Events: [count]
   - Comments: [count]
   - Lists: [count]
   - Invoice Line Items: [count]
   - Payments: [count]
   - Ledger Entries: [count]
   - Workflow Queue: [count]
   - Workflow History: [count]
   - Client Activity: [count]
   - [etc...]

   ### Validation Results
   - ✅ Referential Integrity: All foreign keys valid
   - ✅ State Consistency: All states valid
   - ✅ Temporal Coherence: All timestamps chronological
   - ✅ Business Logic: All rules satisfied
   - ✅ Financial Integrity: All accounts balanced

   ## Operational Coherence Verification

   ### Test 1: Order Creation Flow
   Created test order → verified all linked records created ✅

   ### Test 2: Payment Application
   Applied test payment → verified AR updated, ledger balanced ✅

   ### Test 3: Workflow Progression
   Advanced test batch → verified state transitions valid ✅

   ## Deliverables

   - [x] Operational flow diagrams
   - [x] Enhanced generator architecture
   - [x] 40+ new generators
   - [x] Comprehensive validation suite
   - [x] Production seeding script
   - [x] Seeded production database
   - [x] Validation report
   - [x] Documentation

   ## Notes

   [Any important notes or caveats]
   EOF
   ```

2. **Update roadmap status:**

   Edit `docs/roadmaps/MASTER_ROADMAP.md` and find DATA-001:

   **Change from:**

   ```markdown
   **Priority:** P0 | **Status:** Not Started | **Effort:** 120-160h
   ```

   **Change to:**

   ```markdown
   **Priority:** P0 | **Status:** ✅ Complete (2025-11-XX) | **Effort:** 120-160h

   **Resolution:** Successfully seeded production database with 100% table coverage.
   All 107 tables now contain operationally coherent data representing 22 months of
   business operations. Created 40+ generators with transaction context and cascading
   generation. All validation tests passed. See docs/DATA-001-COMPLETION-REPORT.md.
   ```

3. **Archive session file:**

   ```bash
   mv docs/sessions/active/${SESSION_ID}.md docs/sessions/completed/
   ```

4. **Update ACTIVE_SESSIONS.md:**

   Remove your session entry from `docs/ACTIVE_SESSIONS.md`.

5. **Commit all changes:**

   ```bash
   git add -A
   git commit -m "Complete DATA-001: Comprehensive Production Data Seeding

   - Seeded all 107 database tables with operationally coherent data
   - Created 40+ generators with transaction context
   - Implemented double-entry bookkeeping and account reconciliation
   - Validated referential integrity, state consistency, temporal coherence
   - Production database ready for realistic testing and demonstration
   - All validation tests passed
   - Roadmap updated
   - Session archived"
   ```

6. **Push directly to main:**

   ```bash
   git push origin main
   ```

   **If push fails (another agent pushed first):**

   ```bash
   git pull --rebase origin main
   # Resolve any conflicts
   git push origin main
   ```

7. **Verify deployment:**

   Wait for GitHub Actions deployment to succeed, then verify production site has all data.

---

## ✅ Success Criteria

### Quantitative Metrics

- [ ] **Table Coverage:** 107/107 tables populated (100%)
- [ ] **Events:** 200+ spanning 22 months
- [ ] **Comments:** 500+ across multiple entity types
- [ ] **Lists:** 50+ with 200+ items
- [ ] **Invoice Line Items:** 4,400+ (one per invoice)
- [ ] **Payments:** 3,000+ payment records
- [ ] **Ledger Entries:** 8,000+ balanced entries
- [ ] **Workflow Queue:** 158+ entries
- [ ] **Workflow History:** 474+ state transitions
- [ ] **Client Activity:** 500+ activity records
- [ ] **Zero Foreign Key Violations**
- [ ] **All Accounts Balanced** (Total Debits = Total Credits)

### Qualitative Validation

- [ ] Calendar shows busy schedule with realistic events
- [ ] Comments demonstrate collaboration across entities
- [ ] Client profiles show rich activity history
- [ ] Lists/tasks have realistic content and completion states
- [ ] Dashboard widgets display meaningful metrics
- [ ] Financial reports show realistic P&L and balance sheet
- [ ] Workflow queue shows batches in various processing stages
- [ ] Can demo system confidently to stakeholders
- [ ] All features testable with realistic data

### Operational Coherence Tests

- [ ] **Test 1:** Create new order → all linked records created
- [ ] **Test 2:** Apply payment → AR updated, ledger balanced
- [ ] **Test 3:** Progress workflow → state transitions valid
- [ ] **Test 4:** All foreign keys valid
- [ ] **Test 5:** All account balances reconcile

---

## 📚 Additional Resources

- **Detailed Task Specification:** `DATA-001-ROADMAP-TASK-V2.md`
- **Analysis Document:** `PRODUCTION_DATA_SEEDING_ANALYSIS.md`
- **Existing Generators:** `scripts/generators/README.md`
- **Roadmap Agent Guide:** `docs/ROADMAP_AGENT_GUIDE.md`
- **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`

---

## ⚠️ Important Notes

**This is a 3-4 week project.** Do not rush. Quality and operational coherence are critical.

**Key Principles:**

1. **Operational Coherence** - Every transaction creates all related records
2. **Financial Integrity** - Double-entry bookkeeping, balanced accounts
3. **State Consistency** - Valid state transitions with history
4. **Temporal Coherence** - Chronologically sensible timestamps
5. **Referential Integrity** - All foreign keys reference existing records

**Test Continuously:**

- Run validation after each generator
- Test locally before production deployment
- Create backup before production seeding
- Validate production data after deployment

**Ask for Help:**

- If operational flows are unclear
- If state transitions are complex
- If financial calculations don't balance
- If validation tests fail

---

**Generated:** 2025-11-14  
**Version:** 2.0 (Operational Coherence Focus)
