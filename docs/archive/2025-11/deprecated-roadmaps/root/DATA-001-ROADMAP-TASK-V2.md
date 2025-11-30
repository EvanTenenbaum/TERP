# DATA-001: Comprehensive Production Data Seeding with Operational Coherence

**Priority:** P0 | **Status:** Not Started | **Effort:** 120-160h (3-4 weeks)

---

## Problem Statement

The live production TERP site contains seed data for only 9 out of 107 database tables, representing just eight percent coverage. More critically, the system lacks **operational coherence** - the data is not interconnected in ways that reflect real business operations. When users interact with the system, they encounter broken workflows because:

**Missing Operational Linkages:**

- Orders exist but have no associated events (no delivery appointments, no client meetings)
- Invoices exist but have no payment records (can't test payment application)
- Batches exist but have no workflow queue entries (can't track processing stages)
- Clients exist but have no activity history (can't see relationship timeline)
- Products exist but have no pricing rules applied (can't test pricing engine)
- Inventory exists but has no location tracking (can't test warehouse management)

**Real-World Impact Example:**
If you create an order in the system, in real operations this would trigger:

1. An invoice generation
2. A payment due date calculation
3. A workflow queue entry for fulfillment
4. A batch reservation reducing available inventory
5. An event scheduled for delivery
6. A client communication logged
7. A ledger entry for revenue recognition
8. An AR aging entry if payment terms apply

Currently, creating an order only creates the order record. None of the downstream operational effects occur because the seeded data doesn't model these relationships, and the system may not even have the hooks to trigger them properly.

---

## Solution Overview

Create a comprehensive, operationally coherent data seeding system that models 22 months of realistic business operations where every transaction triggers appropriate downstream effects, just as would occur in real-world usage. This goes beyond simply populating tables with realistic-looking data - it requires generating data that reflects the actual business processes and state transitions that would occur during normal operations.

### Operational Coherence Principles

**1. Transactional Integrity**
Every business transaction must create all related records that would exist in real operations:

- Order → Invoice → Invoice Line Items → Ledger Entries → AR Aging
- Payment → Payment Application → Ledger Entries → Bank Transaction → AR Update
- Batch Creation → Lot Reference → Inventory Adjustment → COGS Calculation
- Event Creation → Attendees → Invitations → Reminders → Calendar Entries

**2. State Consistency**
Data must reflect valid state transitions and business rules:

- Invoices marked "PAID" must have corresponding payment records
- Overdue invoices must have passed their due date
- Completed workflow items must have history showing state transitions
- Inventory quantities must reconcile with order quantities
- AR aging buckets must match invoice dates and payment status

**3. Temporal Coherence**
Events must occur in chronologically sensible order:

- Payments cannot precede invoices
- Fulfillment cannot precede orders
- Comments reference events that already occurred
- Workflow state changes follow valid sequences
- Events scheduled in the future don't have completion records

**4. Referential Integrity**
All foreign keys must reference existing records and make business sense:

- Event attendees are actual users in the system
- Order items reference batches with sufficient inventory
- Pricing rules reference valid products and client segments
- Workflow assignments reference users with appropriate roles
- Comments are authored by users who would realistically interact with that entity

**5. Business Logic Compliance**
Generated data must follow actual business rules:

- Consignment sales don't generate immediate AR (payment on sale, not delivery)
- COD orders have payment records matching order date
- NET_30 invoices have due dates 30 days after invoice date
- Batch quantities decrease as orders consume inventory
- COGS calculations reflect actual batch costs
- Margins match pricing rules when rules exist

---

## Technical Approach

### Phase 1: Operational Linkage Audit (Week 1, Days 1-2)

Before generating any new data, map the complete operational flow for each major business process:

**Order-to-Cash Flow:**

```
Purchase Order → Lot Receipt → Batch Creation → Inventory Available
↓
Client Need → Order Creation → Batch Reservation → Inventory Reduction
↓
Invoice Generation → Invoice Line Items → AR Entry → Ledger Entry (DR: AR, CR: Revenue)
↓
Payment Receipt → Payment Application → AR Reduction → Ledger Entry (DR: Cash, CR: AR)
↓
Bank Deposit → Bank Transaction → Reconciliation
```

**Workflow Process Flow:**

```
Batch Receipt → Workflow Queue Entry (Status: RECEIVED)
↓
Quality Testing → Workflow State Change (Status: TESTING) → Test Results
↓
Packaging → Workflow State Change (Status: PACKAGING) → Package Records
↓
Ready for Sale → Workflow State Change (Status: AVAILABLE) → Inventory Update
```

**Event Management Flow:**

```
Client Meeting Scheduled → Event Creation → Calendar Entry
↓
Attendees Added → Event Attendees Records → User Notifications
↓
Invitations Sent → Event Invitations → Invitation Status Tracking
↓
Reminders Scheduled → Event Reminders → Reminder Delivery
↓
Meeting Occurs → Event Completion → Follow-up Tasks → Notes/Comments
```

**Deliverable:** Complete operational flow diagrams for all major processes showing every table that should be touched and in what order.

### Phase 2: Generator Architecture Enhancement (Week 1, Days 3-5)

Enhance the generator system to support operational coherence:

**2.1 Transaction Context**
Create a transaction context object that tracks all related records generated during a business operation:

```typescript
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

**2.2 Cascading Generators**
Modify generators to accept context and generate related records:

```typescript
function generateOrder(client, batches, context): TransactionContext {
  const order = createOrderRecord(client, batches);

  // Generate all operationally linked records
  const invoice = generateInvoiceFromOrder(order);
  const lineItems = generateInvoiceLineItems(order, invoice);
  const ledgerEntries = generateLedgerEntriesForSale(order, invoice);
  const arEntry = generateAREntry(invoice);
  const workflowEntry = generateWorkflowForOrder(order);
  const clientActivity = logClientActivity("ORDER_CREATED", client, order);

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

**2.3 State Machine Validators**
Create validators that ensure state transitions are valid:

```typescript
function validateWorkflowTransition(
  fromStatus: WorkflowStatus,
  toStatus: WorkflowStatus,
  timestamp: Date
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

**2.4 Inventory Tracking**
Implement real-time inventory tracking during generation:

```typescript
class InventoryTracker {
  private batchQuantities: Map<number, number>;

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

### Phase 3: Core Operational Data (Week 2)

Generate data for core business operations with full operational linkage:

**3.1 Order-to-Cash Cycle**

For each of the 4,400 existing orders, generate:

- **Invoice Line Items** (1-10 per invoice)
  - Link to specific order items
  - Reference actual products and batches
  - Calculate line totals matching order items
  - Apply tax rules consistently

- **Payment Records** (3,000+ payments)
  - 85% of invoices paid (15% overdue matches existing AR aging)
  - Payment dates after invoice dates
  - Payment amounts match invoice totals (or partial payments)
  - Payment methods distributed realistically (60% ACH, 30% Check, 10% Wire)
  - Link payments to specific invoices via payment application records

- **Ledger Entries** (8,000+ entries)
  - Double-entry bookkeeping for every transaction
  - Revenue recognition: DR: AR, CR: Revenue
  - Payment receipt: DR: Cash, CR: AR
  - COGS recognition: DR: COGS, CR: Inventory
  - Entries balance (total debits = total credits)

- **Bank Transactions** (3,000+ transactions)
  - Match payment records
  - Include deposits, withdrawals, fees
  - Link to bank accounts
  - Running balance calculations

**3.2 Inventory & Workflow**

For each of the 158 existing batches, generate:

- **Workflow Queue Entries** (158 entries)
  - Initial status: RECEIVED (at lot receipt date)
  - State transitions: TESTING → PACKAGING → AVAILABLE
  - Timestamps follow chronological order
  - Assign to users with appropriate roles

- **Workflow History** (474+ records, 3 per batch)
  - Record each state transition
  - Include user who performed transition
  - Add notes explaining transition
  - Timestamp progression makes sense

- **Batch Location Tracking** (158+ records)
  - Initial location at receipt
  - Location changes as batch moves through workflow
  - Current location reflects current status
  - Quantity tracking at each location

- **COGS History** (158 records)
  - Initial COGS at batch creation
  - Adjustments based on quality testing
  - Final COGS used in order calculations
  - Audit trail of all changes

**3.3 Client Relationship Management**

For each of the 68 clients, generate:

- **Client Activity Timeline** (500+ activities)
  - Order created events
  - Payment received events
  - Meeting scheduled events
  - Communication logged events
  - Chronologically ordered
  - Links to actual orders, payments, events

- **Client Communications** (300+ communications)
  - Emails, phone calls, meetings
  - Link to events when applicable
  - Reference specific orders or invoices in content
  - Realistic communication patterns (more frequent with whales)

- **Client Notes** (200+ notes)
  - Meeting notes referencing actual meetings
  - Follow-up tasks from communications
  - Account status notes
  - Credit limit discussions for clients with overdue AR

### Phase 4: Feature-Specific Data (Week 3)

Generate data for specific features with operational coherence:

**4.1 Calendar & Events** (200-300 events)

Event types with appropriate linkages:

- **Client Meetings** (100 events)
  - Link to specific clients
  - Create client activity record
  - Generate meeting notes as comments
  - Schedule follow-up events if needed
- **Delivery Appointments** (80 events)
  - Link to specific orders
  - Schedule after order date, before invoice due date
  - Create workflow entry for delivery
  - Mark as completed for past deliveries

- **Vendor Appointments** (40 events)
  - Link to purchase orders
  - Schedule lot receipt inspections
  - Create workflow entries for receiving

- **Internal Meetings** (60 events)
  - Team meetings, planning sessions
  - No client linkage
  - Generate internal notes

For each event:

- **Event Attendees** - Link to actual users
- **Event Invitations** - Sent to attendees, realistic accept/decline
- **Event Reminders** - Scheduled appropriately before event
- **Event Comments** - Meeting notes, action items

**4.2 Comments & Collaboration** (500-1000 comments)

Comments distributed across entities:

- **Order Comments** (300 comments)
  - Questions about specifications
  - Delivery instructions
  - Quality feedback
  - Authored by client-facing users

- **Event Comments** (150 comments)
  - Meeting notes
  - Action items
  - Follow-up tasks

- **Client Comments** (100 comments)
  - Account notes
  - Relationship updates
  - Credit discussions

- **Batch Comments** (100 comments)
  - Quality test results
  - Packaging notes
  - Issue reports

For each comment:

- **Note Activity** - View/edit history
- **Comment Threads** - Replies to comments
- **@Mentions** - Tag relevant users

**4.3 Lists & Tasks** (50-100 lists, 200-500 items)

List types with operational linkage:

- **Order Fulfillment Lists** (20 lists)
  - Items reference actual orders
  - Completion status reflects order status
  - Assigned to fulfillment team

- **Client Follow-up Lists** (15 lists)
  - Items reference clients with overdue AR
  - Items reference recent large orders
  - Assigned to account managers

- **Inventory Tasks** (10 lists)
  - Items reference batches needing testing
  - Items reference low-stock products
  - Assigned to inventory team

- **Shared Project Lists** (15 lists)
  - Collaborative lists with multiple users
  - Mix of completed and pending items
  - Realistic due dates

**4.4 Pricing & Rules** (20 rules, 10 profiles)

Pricing rules that actually apply to orders:

- **Volume Discounts** (5 rules)
  - Apply to whale clients
  - Retroactively apply to existing orders
  - Calculate discounts in order totals

- **Product-Specific Pricing** (8 rules)
  - Premium pricing for AAA grade
  - Discount pricing for A grade
  - Apply to relevant orders

- **Client-Specific Pricing** (7 rules)
  - Custom pricing for top 3 whales
  - Apply to their orders
  - Override standard pricing

Pricing profiles:

- **Whale Profile** - Applied to top 10 clients
- **Regular Profile** - Applied to other clients
- **Vendor Profile** - Applied to vendors

Link profiles to clients and verify orders use correct pricing.

**4.5 Purchase Orders & Vendor Management** (150 POs)

For each of the 176 lots, generate corresponding purchase order:

- **Purchase Order** - Placed with vendor before lot receipt
- **PO Line Items** - Match lot products and quantities
- **Vendor Bills** - Invoice from vendor
- **Vendor Payments** - Payment to vendor
- **Ledger Entries** - DR: Inventory, CR: AP; DR: AP, CR: Cash

### Phase 5: Financial Completeness (Week 3-4)

Ensure all financial data is complete and balanced:

**5.1 Double-Entry Bookkeeping**

Generate ledger entries for all transactions:

- Sales: DR: AR, CR: Revenue
- COGS: DR: COGS, CR: Inventory
- Payments: DR: Cash, CR: AR
- Purchases: DR: Inventory, CR: AP
- Vendor Payments: DR: AP, CR: Cash
- Expenses: DR: Expense, CR: Cash

Validate: Total Debits = Total Credits

**5.2 Account Reconciliation**

Ensure account balances reconcile:

- **AR Balance** = Sum of unpaid invoices
- **AP Balance** = Sum of unpaid vendor bills
- **Inventory Balance** = Sum of batch values at cost
- **Cash Balance** = Beginning balance + deposits - withdrawals
- **Revenue** = Sum of invoice totals
- **COGS** = Sum of order COGS

**5.3 Financial Statements**

Generate data that produces realistic financial statements:

- **Income Statement** - Revenue, COGS, Gross Profit, Expenses, Net Income
- **Balance Sheet** - Assets, Liabilities, Equity
- **Cash Flow Statement** - Operating, Investing, Financing activities

### Phase 6: Validation & Quality Assurance (Week 4)

**6.1 Referential Integrity Tests**

- All foreign keys reference existing records
- No orphaned records
- All relationships make business sense

**6.2 State Consistency Tests**

- Paid invoices have payment records
- Completed workflows have history
- Inventory quantities reconcile
- AR aging matches invoice status

**6.3 Temporal Coherence Tests**

- Events occur in chronological order
- No future-dated completed items
- State transitions follow valid sequences

**6.4 Business Logic Tests**

- Consignment sales handled correctly
- Payment terms applied properly
- Pricing rules reflected in orders
- Inventory reservations don't exceed available

**6.5 Operational Flow Tests**

- Create test order → verify all linked records created
- Apply test payment → verify AR updated, ledger balanced
- Complete test workflow → verify history and state correct

---

## Implementation Phases

### Week 1: Foundation

- Days 1-2: Operational flow mapping
- Days 3-5: Generator architecture enhancement

### Week 2: Core Operations

- Days 1-2: Order-to-cash linkage
- Days 3-4: Inventory & workflow
- Day 5: Client relationship data

### Week 3: Features

- Days 1-2: Calendar, events, comments
- Days 3-4: Lists, pricing, purchase orders
- Day 5: Financial completeness

### Week 4: Validation & Deployment

- Days 1-3: Comprehensive testing
- Day 4: Production deployment
- Day 5: Post-deployment validation

---

## Success Criteria

### Operational Coherence Validation

**Test 1: Order Creation Flow**

- Create new order in system
- Verify invoice auto-generated
- Verify invoice line items created
- Verify ledger entries created
- Verify AR entry created
- Verify workflow entry created
- Verify client activity logged
- Verify inventory reserved

**Test 2: Payment Application**

- Apply payment to invoice
- Verify AR balance reduced
- Verify ledger entries created (DR: Cash, CR: AR)
- Verify bank transaction created
- Verify invoice status updated to PAID
- Verify client activity logged

**Test 3: Workflow Progression**

- Advance batch through workflow
- Verify state transitions valid
- Verify history records created
- Verify location tracking updated
- Verify user assignments correct

**Test 4: Data Integrity**

- All foreign keys valid
- All account balances reconcile
- All state transitions valid
- All timestamps chronological
- All business rules satisfied

**Test 5: Realistic Operations**

- Browse calendar → see realistic schedule
- View client profile → see rich activity history
- Check AR aging → see realistic overdue accounts
- Review workflow queue → see batches in various stages
- Generate financial reports → see realistic P&L and balance sheet

---

## Deliverables

1. **Operational Flow Diagrams** - Visual maps of all business processes
2. **Enhanced Generator System** - Transaction context, cascading generators, validators
3. **40+ Generators** - All tables with operational linkage
4. **Comprehensive Test Suite** - Validates operational coherence
5. **Production Seeding Script** - One-time execution
6. **Validation Report** - Confirms all success criteria met
7. **Operational Documentation** - How data flows through system
8. **Rollback Procedure** - Emergency recovery
9. **Seeded Production Database** - Fully operational, coherent data
10. **User Guide** - How to interact with seeded data realistically

---

## Key Improvements Over V1

1. **Operational Coherence** - Data reflects real business processes, not just realistic-looking records
2. **Transaction Context** - Generators create all related records atomically
3. **State Validation** - Ensures valid state transitions and business rules
4. **Inventory Tracking** - Real-time quantity management during generation
5. **Financial Integrity** - Double-entry bookkeeping, balanced accounts
6. **Temporal Coherence** - Events occur in sensible chronological order
7. **Comprehensive Testing** - Validates operational flows, not just data presence

---

**This approach ensures the seeded data behaves like real operational data, allowing you to interact with the system as if it's been running a real business for 22 months.**
