# Specification: WS-007 - Complex Flower Intake Flow

**Status:** Approved  
**Priority:** HIGH  
**Estimate:** 24h  
**Module:** Inventory/Accounting  
**Dependencies:** None  
**Spec Author:** Manus AI  
**Spec Date:** 2025-12-30  

---

## 1. Problem Statement

When a client drops off flower (product) as payment or consignment, the business has two distinct workflows depending on whether the value is known at intake:

1. **Apply Value to Tab Now:** Price is agreed upon, value immediately reduces client's tab
2. **Add to Inventory Only:** Price TBD, flower goes to inventory for later valuation

The current system doesn't support this branching logic, forcing manual workarounds and creating accounting discrepancies.

## 2. User Stories

1. **As a staff member**, I want to choose whether to apply flower value to a client's tab immediately or defer valuation, so that I can handle both scenarios correctly.

2. **As a staff member**, I want the system to automatically create the correct journal entries based on my choice, so that accounting stays accurate.

3. **As a manager**, I want to see pending valuations (inventory without assigned value), so that I can ensure all flower gets properly priced.

## 3. Functional Requirements

### 3.1 Core Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | Guided intake form with flow selection | Must Have |
| FR-02 | Option A: "Apply Value to Tab Now" with price input | Must Have |
| FR-03 | Option B: "Add to Inventory Only" (pending valuation) | Must Have |
| FR-04 | Automatic journal entry creation for Option A | Must Have |
| FR-05 | Tab balance preview before confirming (Option A) | Must Have |
| FR-06 | "Pending Valuation" flag on inventory items | Must Have |
| FR-07 | Dashboard widget showing pending valuations | Should Have |
| FR-08 | Bulk valuation tool for pending items | Should Have |
| FR-09 | Notification when pending valuation ages > X days | Nice to Have |

### 3.2 Business Rules

| ID | Rule | Example |
|----|------|---------|
| BR-01 | Option A creates immediate tab credit | $5K flower = $5K tab reduction |
| BR-02 | Option A creates journal entry: Debit Inventory, Credit AR | Standard accounting |
| BR-03 | Option B adds to inventory with $0 value | Value assigned later |
| BR-04 | Option B does NOT affect client tab | No accounting impact until valued |
| BR-05 | Pending valuation items flagged in inventory | Visual indicator |
| BR-06 | When pending item valued, journal entry created | Debit Inventory, Credit AR |
| BR-07 | Client must be selected for flower intake | Required field |

## 4. Technical Specification

### 4.1 Data Model Changes

```sql
-- Add fields to inventory/batches table
ALTER TABLE batches ADD COLUMN intake_type ENUM('PURCHASE', 'CLIENT_DROPOFF', 'CONSIGNMENT', 'OTHER') DEFAULT 'PURCHASE';
ALTER TABLE batches ADD COLUMN dropoff_client_id INT REFERENCES clients(id);
ALTER TABLE batches ADD COLUMN is_pending_valuation BOOLEAN DEFAULT FALSE;
ALTER TABLE batches ADD COLUMN valued_at TIMESTAMP;
ALTER TABLE batches ADD COLUMN valued_by INT REFERENCES users(id);
ALTER TABLE batches ADD COLUMN original_intake_value DECIMAL(12,2); -- Value at intake (Option A)
ALTER TABLE batches ADD COLUMN valuation_notes TEXT;

-- Index for pending valuation queries
CREATE INDEX idx_pending_valuation ON batches(is_pending_valuation, dropoff_client_id);
```

### 4.2 API Contracts

```typescript
// Flower intake with flow selection
inventory.flowerIntake = adminProcedure
  .input(z.object({
    // Standard intake fields
    productId: z.number(),
    strain: z.string(),
    quantity: z.number(),
    unit: z.string(),
    locationId: z.number().optional(),
    
    // Flow selection
    intakeType: z.enum(['PURCHASE', 'CLIENT_DROPOFF', 'CONSIGNMENT']),
    dropoffClientId: z.number().optional(), // Required if CLIENT_DROPOFF
    
    // Option A: Apply value now
    applyValueNow: z.boolean().default(false),
    valuePerUnit: z.number().optional(), // Required if applyValueNow
    totalValue: z.number().optional(), // Alternative to valuePerUnit
    
    // Common
    notes: z.string().optional()
  }))
  .output(z.object({
    batchId: z.number(),
    batchNumber: z.string(),
    isPendingValuation: z.boolean(),
    tabCreditApplied: z.number().optional(),
    newClientBalance: z.number().optional(),
    journalEntryId: z.number().optional()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Create batch record
    // 2. If applyValueNow:
    //    a. Set value on batch
    //    b. Create journal entry (Debit Inventory, Credit AR)
    //    c. Update client tab balance
    // 3. If NOT applyValueNow:
    //    a. Set is_pending_valuation = true
    //    b. No journal entry yet
    // 4. Return result
  });

// Get pending valuations
inventory.getPendingValuations = adminProcedure
  .input(z.object({
    clientId: z.number().optional(),
    olderThanDays: z.number().optional()
  }))
  .output(z.array(z.object({
    batchId: z.number(),
    batchNumber: z.string(),
    productName: z.string(),
    strain: z.string(),
    quantity: z.number(),
    unit: z.string(),
    clientName: z.string(),
    clientId: z.number(),
    intakeDate: z.date(),
    daysPending: z.number()
  })))
  .query(async ({ input }) => {
    // Return batches where is_pending_valuation = true
  });

// Apply valuation to pending batch
inventory.applyValuation = adminProcedure
  .input(z.object({
    batchId: z.number(),
    valuePerUnit: z.number().optional(),
    totalValue: z.number().optional(),
    applyToClientTab: z.boolean().default(true),
    notes: z.string().optional()
  }))
  .output(z.object({
    success: z.boolean(),
    tabCreditApplied: z.number(),
    newClientBalance: z.number(),
    journalEntryId: z.number()
  }))
  .mutation(async ({ input, ctx }) => {
    // 1. Update batch with value
    // 2. Set is_pending_valuation = false
    // 3. Create journal entry
    // 4. Update client tab if applyToClientTab
    // 5. Return result
  });

// Preview tab balance change
inventory.previewFlowerIntakeBalance = publicProcedure
  .input(z.object({
    clientId: z.number(),
    value: z.number()
  }))
  .output(z.object({
    currentBalance: z.number(),
    creditAmount: z.number(),
    projectedBalance: z.number()
  }))
  .query(async ({ input }) => {
    // Return balance preview
  });
```

### 4.3 Integration Points

| System | Integration Type | Description |
|--------|-----------------|-------------|
| Inventory | Write | Create batch with intake type |
| Client Profile | Read/Write | Get/update tab balance |
| Journal Entry | Write | Create accounting entries |
| Dashboard | Read | Pending valuation widget |
| Notifications | Write | Alert for aged pending items |

## 5. UI/UX Specification

### 5.1 User Flow

```
[Start Flower Intake]
    → [Enter Product/Strain/Quantity]
    → [Select Intake Type: Client Drop-off]
    → [Select Client]
    → [Choose Flow:]
        → [Option A: Apply Value Now]
            → [Enter Price]
            → [See Tab Balance Preview]
            → [Confirm]
        → [Option B: Add to Inventory Only]
            → [Confirm (Pending Valuation)]
    → [Success Screen]
```

### 5.2 Wireframe: Intake Form with Flow Selection

```
┌─────────────────────────────────────────────────────────────┐
│  🌿 Flower Intake                                           │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Product: [Select Product          ▼]                       │
│  Strain:  [Blue Dream______________]                        │
│  Quantity: [50___] [oz ▼]                                   │
│                                                             │
│  Intake Type: ○ Purchase  ● Client Drop-off  ○ Consignment │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 Client: [Search clients...          ▼]           │   │
│  │                                                     │   │
│  │ Current Tab Balance: $50,000.00                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ How should we handle the value?                     │   │
│  │                                                     │   │
│  │ ○ Apply Value to Tab Now                            │   │
│  │   Price agreed - credit client's tab immediately    │   │
│  │                                                     │   │
│  │ ● Add to Inventory Only                             │   │
│  │   Price TBD - add to inventory, value later         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  [Cancel]                              [Continue →]         │
└─────────────────────────────────────────────────────────────┘
```

### 5.3 Wireframe: Option A - Apply Value Now

```
┌─────────────────────────────────────────────────────────────┐
│  🌿 Flower Intake - Apply Value                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Blue Dream | 50 oz | Client: Acme Corp                     │
│                                                             │
│  Value Calculation:                                         │
│  ○ Per Unit: [$100____] × 50 oz = $5,000.00                │
│  ● Total Value: [$5,000.00_______]                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 📊 Tab Balance Preview                              │   │
│  │                                                     │   │
│  │ Current Balance:     $50,000.00                     │   │
│  │ Flower Credit:       -$5,000.00                     │   │
│  │ ─────────────────────────────────                   │   │
│  │ New Balance:         $45,000.00                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Notes: [________________________________]                  │
│                                                             │
│  [← Back]                    [Confirm Intake & Apply Credit]│
└─────────────────────────────────────────────────────────────┘
```

### 5.4 Wireframe: Option B - Pending Valuation

```
┌─────────────────────────────────────────────────────────────┐
│  🌿 Flower Intake - Add to Inventory                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Blue Dream | 50 oz | Client: Acme Corp                     │
│                                                             │
│  ⚠️ This flower will be added to inventory with             │
│     PENDING VALUATION status.                               │
│                                                             │
│  • No credit will be applied to client's tab yet           │
│  • You can assign value later from the inventory screen    │
│  • A reminder will appear in your dashboard                │
│                                                             │
│  Notes: [________________________________]                  │
│                                                             │
│  [← Back]                         [Confirm Intake (No Value)]│
└─────────────────────────────────────────────────────────────┘
```

### 5.5 Wireframe: Pending Valuation Dashboard Widget

```
┌─────────────────────────────────────────────────────────────┐
│  ⏳ Pending Valuations (3)                          [View All]│
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  • Blue Dream (50 oz) - Acme Corp - 5 days ago    [Value]  │
│  • OG Kush (25 oz) - Beta LLC - 3 days ago        [Value]  │
│  • Sour Diesel (100 oz) - Gamma Inc - 1 day ago   [Value]  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### 5.6 Acceptance Criteria (UI)

- [ ] Flow selection clearly explains both options
- [ ] Client search shows current tab balance
- [ ] Tab balance preview updates in real-time
- [ ] Pending valuation warning is prominent
- [ ] Dashboard widget shows pending items with age
- [ ] "Value" action opens valuation modal

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Client not selected for drop-off | Show error, require client selection |
| Zero or negative value entered | Validation error |
| Client has credit balance (negative tab) | Allow, show as "Credit Balance" |
| Pending valuation > 30 days | Highlight in red, send notification |
| Batch already valued | Prevent re-valuation, show current value |
| Value changes after initial valuation | Require adjustment entry, not edit |

## 7. Testing Requirements

### 7.1 Unit Tests

- [ ] Option A creates correct journal entry
- [ ] Option A updates client tab correctly
- [ ] Option B sets pending valuation flag
- [ ] Option B does NOT create journal entry
- [ ] Valuation of pending item creates journal entry

### 7.2 Integration Tests

- [ ] Full Option A flow: intake → journal entry → tab update
- [ ] Full Option B flow: intake → pending → valuation → journal entry
- [ ] Dashboard widget shows correct pending items
- [ ] Notifications sent for aged pending items

### 7.3 E2E Tests

- [ ] Complete Option A intake with tab balance verification
- [ ] Complete Option B intake, then apply valuation
- [ ] Verify pending valuation appears in dashboard

## 8. Migration & Rollout

### 8.1 Data Migration

```sql
-- Set default values for existing batches
UPDATE batches 
SET intake_type = 'PURCHASE', 
    is_pending_valuation = FALSE 
WHERE intake_type IS NULL;
```

### 8.2 Feature Flag

`FEATURE_FLOWER_INTAKE_FLOW` - Enable for testing with select users.

### 8.3 Rollback Plan

1. Disable feature flag
2. Revert to simple intake form
3. Pending valuation data preserved
4. Manual journal entries required for pending items

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Pending valuations resolved < 7 days | 90% | Age tracking |
| Accounting discrepancies | 50% reduction | Reconciliation errors |
| User adoption of guided flow | 100% | Intake source tracking |

## 10. Open Questions

- [x] Should we support partial valuation? **No, full batch only**
- [x] Can value be changed after initial valuation? **No, requires adjustment entry**
- [ ] Should we support consignment with different accounting? **Future enhancement**

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead
