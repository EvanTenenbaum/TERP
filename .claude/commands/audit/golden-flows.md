# Golden Flows Audit

Verify critical business flows work end-to-end.

## TERP Golden Flows

These are the mission-critical paths that MUST work:

### Flow 1: Order Creation
Client → Product Selection → Order Create → Order Confirm

### Flow 2: Payment Application  
Invoice → Payment Received → Apply to Invoice

### Flow 3: Inventory Receive
PO → Receive Inventory → Batch Created

## Pre-Flight

```bash
git pull origin main
pnpm check
pnpm build
```

## Execution

### Flow 1: Order Creation Verification

```bash
echo "=== ORDER CREATION FLOW ==="

echo "--- Order Router Endpoints ---"
grep -n "procedure\|mutation\|query" server/routers/orders.ts | head -30

echo "--- Order Confirmation Logic ---"
grep -B5 -A20 "confirmOrder\|status.*confirmed" server/routers/orders.ts server/services/orders*.ts 2>/dev/null | head -50

echo "--- Inventory Reservation on Confirm ---"
grep -rn "reserveInventory\|inventory.*reserve\|batch.*order" server/ --include="*.ts" | head -20

echo "--- GL Entry on Order Confirm ---"
grep -rn "createGLEntry\|glEntry\|journalEntry" server/routers/orders.ts server/services/orders*.ts 2>/dev/null | head -20
```

### Flow 2: Payment Application Verification

```bash
echo "=== PAYMENT APPLICATION FLOW ==="

echo "--- Payment Router ---"
grep -n "procedure\|mutation" server/routers/payment*.ts 2>/dev/null | head -20

echo "--- Invoice Balance Update ---"
grep -rn "invoice.*balance\|balance.*paid\|amountDue" server/ --include="*.ts" | head -20

echo "--- GL Entry on Payment ---"
grep -rn "payment.*GL\|GL.*payment\|createEntry.*payment" server/ --include="*.ts" | head -20
```

### Flow 3: Inventory Receive Verification

```bash
echo "=== INVENTORY RECEIVE FLOW ==="

echo "--- Receive Inventory Logic ---"
grep -B5 -A20 "receiveInventory\|createBatch\|addInventory" server/routers/inventory*.ts server/services/inventory*.ts 2>/dev/null | head -50

echo "--- Batch Creation Fields ---"
grep -A30 "insert.*inventoryBatches\|inventoryBatches.*insert" server/ -r --include="*.ts" | head -40

echo "--- Cost Recording ---"
grep -rn "unitCost\|costPerUnit\|batchCost" server/ --include="*.ts" | head -20
```

## Cross-Module Impact Verification

```bash
echo "=== CROSS-MODULE IMPACTS ==="

echo "--- Order → Inventory Links ---"
grep -rn "order.*inventory\|inventory.*order\|orderItem.*batch" server/ --include="*.ts" | head -20

echo "--- Order → AR Links ---"
grep -rn "order.*invoice\|invoice.*order\|accountsReceivable" server/ --include="*.ts" | head -20

echo "--- Inventory → GL Links ---"
grep -rn "inventory.*GL\|GL.*inventory\|valuation.*entry" server/ --include="*.ts" | head -20
```

## Output Format

```
GOLDEN FLOWS AUDIT REPORT
=========================
Date: [ISO 8601]

FLOW 1: ORDER CREATION
----------------------
- Order create endpoint: EXISTS/MISSING
- Confirm order logic: EXISTS/MISSING
- Inventory reservation: IMPLEMENTED/NOT FOUND
- GL entry creation: IMPLEMENTED/NOT FOUND
Status: ✅ PASS / ❌ FAIL

FLOW 2: PAYMENT APPLICATION
---------------------------
- Payment receive endpoint: EXISTS/MISSING
- Invoice balance update: IMPLEMENTED/NOT FOUND
- GL entry creation: IMPLEMENTED/NOT FOUND
Status: ✅ PASS / ❌ FAIL

FLOW 3: INVENTORY RECEIVE
-------------------------
- Receive inventory endpoint: EXISTS/MISSING
- Batch creation logic: IMPLEMENTED/NOT FOUND
- Cost recording: IMPLEMENTED/NOT FOUND
Status: ✅ PASS / ❌ FAIL

CROSS-MODULE INTEGRITY
---------------------
- Order ↔ Inventory: LINKED/BROKEN
- Order ↔ AR: LINKED/BROKEN
- Inventory ↔ GL: LINKED/BROKEN

OVERALL STATUS
--------------
Golden Flows: X/3 verified
Recommendation: [action needed]
```

## Post-Audit

```bash
echo "[$(date -Iseconds)] Golden flows audit: X/3 flows verified" >> .claude/audit-history.log
```
