# Agent Team C: Inventory & Orders

You are Agent Team C working on the TERP project. You MUST follow all protocols exactly as specified.

**Mode:** STRICT
**Branch:** `claude/team-c-inventory-orders-{SESSION_ID}`
**Estimate:** 24-32 hours
**Dependencies:** None - START IMMEDIATELY

---

## YOUR TASKS

| Task      | Description                                    | Estimate | Module                                   |
| --------- | ---------------------------------------------- | -------- | ---------------------------------------- |
| INV-001   | Add Inventory Deduction on Ship/Fulfill        | 4h       | `server/routers/orders.ts`               |
| INV-002   | Fix Race Condition in Draft Order Confirmation | 2h       | `server/ordersDb.ts`                     |
| INV-004   | Add Reservation Release on Order Cancellation  | 2h       | `server/routers/orders.ts`               |
| INV-005   | Create Batches on PO Goods Receipt             | 4h       | `server/routers/purchaseOrders.ts`       |
| TERP-0007 | Surface non-sellable batch status in UI        | 4-8h     | `client/src/components/sales-sheet/*`    |
| TERP-0008 | Standardize batch status constants             | 8-16h    | `server/constants/batchStatuses.ts`      |
| SM-001    | Implement Quote Status Transitions             | 4h       | `server/routers/quotes.ts`               |
| SM-002    | Implement Sale Status Transitions              | 4h       | `server/routers/orders.ts`               |
| SM-003    | Implement VendorReturn Status Transitions      | 4h       | `server/routers/returns.ts`              |
| ORD-002   | Validate Positive Prices in Orders             | 2h       | `server/ordersDb.ts`                     |
| ORD-003   | Fix Invalid Order State Transitions            | 2h       | `server/services/orderStateMachine.ts`   |
| ORD-004   | Add Credit Override Authorization              | 2h       | `server/services/orderPricingService.ts` |
| PARTY-001 | Add Nullable supplierClientId to POs           | 4h       | `drizzle/schema.ts`                      |
| PARTY-004 | Convert Vendor Hard Deletes to Soft            | 2h       | `server/routers/vendors.ts`              |

---

## MANDATORY PROTOCOLS

### PHASE 1: Pre-Flight (15 minutes)

```bash
# Clone, setup, read protocols
gh repo clone EvanTenenbaum/TERP && cd TERP && pnpm install
cat CLAUDE.md
cat docs/TERP_AGENT_INSTRUCTIONS.md
cat .kiro/steering/08-adaptive-qa-protocol.md

# Generate Session ID
SESSION_ID="Session-$(date +%Y%m%d)-TEAM-C-INVENTORY-$(openssl rand -hex 4)"
git pull --rebase origin main
```

### PHASE 2: Session Registration (10 minutes)

```bash
cat > "docs/sessions/active/${SESSION_ID}.md" << 'EOF'
# Team C: Inventory & Orders

**Session ID:** ${SESSION_ID}
**Agent:** Team C
**Started:** $(date +%Y-%m-%d)
**Status:** In Progress
**Mode:** STRICT

## Tasks
- [ ] INV-001: Add Inventory Deduction on Ship/Fulfill
- [ ] INV-002: Fix Race Condition in Draft Order Confirmation
- [ ] INV-004: Add Reservation Release on Order Cancellation
- [ ] INV-005: Create Batches on PO Goods Receipt
- [ ] TERP-0007: Surface non-sellable batch status in UI
- [ ] TERP-0008: Standardize batch status constants
- [ ] SM-001: Implement Quote Status Transitions
- [ ] SM-002: Implement Sale Status Transitions
- [ ] SM-003: Implement VendorReturn Status Transitions
- [ ] ORD-002: Validate Positive Prices in Orders
- [ ] ORD-003: Fix Invalid Order State Transitions
- [ ] ORD-004: Add Credit Override Authorization
- [ ] PARTY-001: Add Nullable supplierClientId to POs
- [ ] PARTY-004: Convert Vendor Hard Deletes to Soft

## Progress Notes
Starting inventory and orders work...
EOF

echo "- Team-C: ${SESSION_ID} - Inventory Orders" >> docs/ACTIVE_SESSIONS.md
git checkout -b "claude/team-c-inventory-orders-${SESSION_ID}"
git add docs/sessions/active/ docs/ACTIVE_SESSIONS.md
git commit -m "chore: register Team C Inventory Orders session"
git push -u origin "claude/team-c-inventory-orders-${SESSION_ID}"
```

### PHASE 3: Implementation

#### Execution Order

```
Batch 1 (Critical Inventory - 4h):
├── INV-001: Inventory deduction on ship
│   - shipOrder() must call batch.onHandQty -= shipped
│   - Create inventory movement record
│   - Release reservedQty after ship
└── INV-002: Race condition fix
    - Use SELECT ... FOR UPDATE
    - Wrap check + update in transaction

Batch 2 (Batch Status Foundation - 8-16h):
└── TERP-0008: Standardize constants
    - Create server/constants/batchStatuses.ts
    - Export BATCH_STATUSES, SELLABLE_BATCH_STATUSES, ACTIVE_BATCH_STATUSES
    - Refactor all hardcoded status strings

Batch 3 (Reservation & PO - 4h):
├── INV-004: Reservation release on cancel
│   - Order cancel → reservedQty back to available
└── INV-005: Batches on PO receipt
    - goodsReceipt() creates batch records

Batch 4 (UI - 4-8h):
└── TERP-0007: Batch status in UI
    - Display status badges
    - Block non-sellable from orders
    - Use constants from TERP-0008

Batch 5 (State Machines - 4h each):
├── SM-001: Quote transitions
├── SM-002: Sale transitions
└── SM-003: VendorReturn transitions
    All: Define valid transitions, enforce via canTransition()

Batch 6 (Order Validations - 2h each):
├── ORD-002: Positive price validation
├── ORD-003: State transition fixes
└── ORD-004: Credit override auth

Batch 7 (Party Model - 4h):
├── PARTY-001: supplierClientId on POs
└── PARTY-004: Soft deletes for vendors
```

### STRICT Mode: Inventory Verification

**For inventory operations, verify:**

```typescript
describe("INV-001: Inventory deduction", () => {
  it("should deduct onHandQty on ship", async () => {
    const batch = await createBatch({ onHandQty: 100, reservedQty: 10 });
    await shipOrder({ batchId: batch.id, qty: 10 });

    const updated = await getBatch(batch.id);
    expect(updated.onHandQty).toBe(90);
    expect(updated.reservedQty).toBe(0);
  });

  it("should create inventory movement record", async () => {
    // Assert movement with type: 'SALE', qty: -10
  });

  it("should prevent shipping more than onHandQty", async () => {
    // Assert throws InsufficientInventoryError
  });
});
```

### PHASE 4: Testing & Validation

```bash
# Standard verification
pnpm check   # ZERO errors
pnpm lint    # PASS
pnpm test    # ALL pass
pnpm build   # SUCCESS

# Inventory-specific tests
pnpm test server/routers/orders.test.ts
pnpm test server/ordersDb.test.ts
pnpm test server/routers/purchaseOrders.test.ts
pnpm test server/services/orderStateMachine.test.ts
```

### PHASE 5: Completion

```bash
git commit -m "complete: Team C Inventory Orders

Tasks completed:
- INV-001: Inventory deduction on ship
- INV-002: Race condition fix with FOR UPDATE
- INV-004: Reservation release on cancel
- INV-005: Batches on PO receipt
- TERP-0007: Batch status in UI
- TERP-0008: Standardized batch status constants
- SM-001/002/003: State machine implementations
- ORD-002/003/004: Order validations
- PARTY-001/004: Party model fixes

All tests passing."
```

---

## Required Output Format

```markdown
## Team C Verification Results

✅ **Verified:**

- pnpm check: PASS
- pnpm lint: PASS
- pnpm test: PASS
- pnpm build: PASS

🧪 **Tests Added:**

- server/routers/orders.test.ts: ship deduction tests
- server/ordersDb.test.ts: race condition tests
- server/services/orderStateMachine.test.ts: transition tests

⚠️ **Risk Notes:**

- Existing orders may have orphaned reservations
- Migration needed to release old reservations

🔁 **Rollback Plan:**

- Revert commits: [list]
- Inventory movements create audit trail

🟥 **RedHat QA (STRICT):**

- Race conditions: FOR UPDATE locks verified
- State machines: Invalid transitions throw
- Inventory: All movements logged
```

---

## Critical Inventory Rules

1. **NEVER update inventory without movement record**
2. **ALWAYS use transactions for reservation changes**
3. **ALWAYS use FOR UPDATE when checking available qty**
4. **NEVER hard delete batches** - Use status transitions
5. **ALWAYS validate inventory before order operations**
