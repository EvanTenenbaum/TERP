# TER-249: Strengthen Oracle DB Assertions

**Classification**: Medium | **Mode**: STRICT | **Estimate**: 8h
**Linear**: TER-249 | **Wave**: 4

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any oracle file, read it first. Do not assume you know what's in a file from context or memory.
7. **YAML STRUCTURE IS SACRED.** Indentation errors in YAML silently break the oracle loader. After every file edit, verify the file loads: `node -e "const yaml = require('js-yaml'); yaml.load(require('fs').readFileSync('PATH', 'utf-8'))"`.
8. **ONE FILE AT A TIME.** Complete and verify each oracle before moving to the next.
9. **DO NOT INVENT SCHEMA.** All table names and column names used in `expected_db` blocks and `invariants` queries must exist in `drizzle/schema.ts`. Grep before asserting.
10. **SCOPE GUARD.** Only oracle YAML files and `tests/contracts/oracle-metadata-contract.test.ts` are in scope. Do not modify routers, services, or other application code.

---

## Mission Brief

The oracle system has 38 YAML files covering critical business flows. The `expected_db` blocks are TERP's primary regression safety net for database state — they catch silent backend failures that UI assertions miss entirely.

**The problem**: Many existing `expected_db` blocks are too shallow to catch real regressions:

- Some check only 1 field when 4+ fields change in the mutation
- Some have hardcoded values that are impossible to match at runtime (wrong `sku_like` patterns)
- Some are missing `invariants` for cross-table consistency checks
- Some mutation oracles (e.g. `void-invoice`) are missing `store_as` so the record can't be referenced in follow-on assertions
- The `Accounting.COGS.UpdateBatchCogs` and `CRM.Clients.CreateClient` tier1 oracles have no `expected_db` at all

**The goal**: Every tier1 mutation oracle must have a rigorous `expected_db` block. No oracle should have fewer than 2 `expect` fields per table assertion. At least 5 oracles must have `invariants` blocks. Soft-delete oracles must verify `deleted_at IS NOT NULL`.

---

## Pre-Flight: Rollback Plan

This task only modifies oracle YAML files and one contract test. No application code is touched.

**Rollback**:

```bash
# Revert all oracle changes
git checkout -- tests-e2e/oracles/

# Revert contract test changes
git checkout -- tests/contracts/oracle-metadata-contract.test.ts
```

**Risk level**: LOW. Oracle YAML changes cannot break production. The only risk is a malformed YAML that fails the oracle runner, which is caught by `pnpm test`.

---

## Pre-Work: Audit the Current State

Before writing any YAML, run this full audit and paste the output:

```bash
# Count oracles with expected_db that also have mutation tag
grep -rl "mutation" tests-e2e/oracles/ | grep "\.oracle\.yaml$" | sort
```

```bash
# Find mutation oracles that are MISSING expected_db
for f in $(find tests-e2e/oracles -name "*.oracle.yaml"); do
  if grep -q "mutation" "$f" && ! grep -q "expected_db" "$f"; then
    echo "MISSING expected_db: $f"
  fi
done
```

```bash
# Find expected_db blocks with only 1 expect field (shallow)
# Count "expect:" occurrences per file that appear inside expected_db
grep -c "        expect:" tests-e2e/oracles/**/*.oracle.yaml 2>/dev/null | grep ":1$"
```

```bash
# Find expected_db blocks WITHOUT invariants
for f in $(find tests-e2e/oracles -name "*.oracle.yaml"); do
  if grep -q "expected_db" "$f" && ! grep -q "invariants" "$f"; then
    echo "NO INVARIANTS: $f"
  fi
done
```

GATE 0: Before editing any file, document your findings:

- How many mutation oracles are missing `expected_db`?
- How many `expected_db` blocks have only 1 table assertion?
- How many mutation oracles with `expected_db` have no `invariants`?
- What is the current `MIN_MUTATION_WITH_DB_COUNT` value in the contract test?

---

## What You're Working With: The Oracle `expected_db` Schema

The oracle runner interprets `expected_db` blocks as follows:

```yaml
expected_db:
  table_name: # must match actual DB table name (snake_case)
    - where: # column filter conditions (all must match)
        column: "value" # exact match
        column_like: "%pattern%" # LIKE match
        column_not_null: true # IS NOT NULL check
        column_null: true # IS NULL check
      expect: # assertions on matched row(s)
        column: "value" # exact value assertion
        column_not_null: true
        column_gte: 100 # greater than or equal
        column_lte: 95 # less than or equal
        column_in: ["A", "B"] # IN list
        column_contains: "substr"
      store_as: "alias" # stores matched row for use in invariants as $alias.column
      count: 1 # exact row count
      count_gte: 1 # minimum row count

  invariants: # cross-table consistency checks
    - name: "Human readable name"
      query: |
        SELECT ... FROM ... WHERE id = $alias.id
      assert: "sql_condition"
```

**Reference variable syntax:**

- `$seed:batch.og_kush.id` — seed data reference
- `$stored.variable_name` — value stored from a UI `store` step
- `$alias.column` — column from a row captured by `store_as`
- `{{temp:entity.field}}` — temp entity created in preconditions

---

## Tasks (Execute in Order)

### Task 1: Fix Broken `where` Patterns in Existing Oracles

Two inventory oracles have `sku_like` patterns that can never match the SKU generated by their `preconditions.create` blocks. This means these assertions silently pass without actually validating the mutation.

#### 1a: Fix `inventory/update-status.oracle.yaml`

Read the file first. The `preconditions.create` block generates a batch with `sku: "STATUS-TEST-{{timestamp}}"`. The `expected_db` block queries `sku_like: "ORAC-STAT%"` which will never match.

**Current (broken):**

```yaml
expected_db:
  batches:
    - where:
        sku_like: "ORAC-STAT%"
      expect:
        batchStatus: "LIVE"
      store_as: "updated_batch"
```

**Fix**: Change the `where` to reference the temp entity created in preconditions:

```yaml
expected_db:
  batches:
    - where:
        sku: "{{temp:test_batch_status.sku}}"
      expect:
        batchStatus: "LIVE"
      store_as: "updated_batch"
```

Also fix the `audit_logs` assertion — `reason_contains: "Quality check"` is an arbitrary string that may not exist. Change to validate the structural requirement:

```yaml
audit_logs:
  - where:
      entity: "Batch"
      action: "STATUS_CHANGE"
      entity_id: "$updated_batch.id"
    expect:
      actor_id_not_null: true
    count_gte: 1
```

And the invariant's reference to `before_snapshot` — verify this column name exists in `audit_logs` in `drizzle/schema.ts` before using it. If it doesn't exist, replace the invariant with:

```yaml
invariants:
  - name: "Valid status transition recorded"
    query: |
      SELECT COUNT(*) as count FROM audit_logs
      WHERE entity = 'Batch'
        AND action = 'STATUS_CHANGE'
        AND entity_id = $updated_batch.id
    assert: "count >= 1"
```

#### 1b: Fix `inventory/delete-batch.oracle.yaml`

Same problem: `sku_like: "ORAC-DELE%"` never matches `"DELETE-TEST-{{timestamp}}"`.

**Fix**:

```yaml
expected_db:
  batches:
    - where:
        sku: "{{temp:test_batch_to_delete.sku}}"
      expect:
        batchStatus: "CLOSED"
        on_hand_qty_gte: 0
      store_as: "deleted_batch"

  audit_logs:
    - where:
        entity: "Batch"
        action_in: ["DELETE", "STATUS_CHANGE"]
        entity_id: "$deleted_batch.id"
      expect:
        actor_id_not_null: true
      count_gte: 1

  invariants:
    - name: "Soft delete preserves batch record"
      query: |
        SELECT COUNT(*) as count FROM batches
        WHERE id = $deleted_batch.id
      assert: "count = 1"

    - name: "Closed batch excluded from live inventory"
      query: |
        SELECT COUNT(*) as count FROM batches
        WHERE id = $deleted_batch.id
          AND batch_status = 'LIVE'
      assert: "count = 0"
```

GATE 1: After fixing these two files, run:

```bash
pnpm test 2>&1 | tail -40
```

Tests must still pass before continuing.

---

### Task 2: Deepen Shallow Accounting Oracle Assertions

#### 2a: `accounting/update-invoice-status.oracle.yaml` (currently 1 field)

Read the file. The `expected_db` block checks only `status: "PAID"` with no `store_as`, no `paid_at` check, no `paid_by` check, and no invariant.

**Replace the entire `expected_db` block with:**

```yaml
expected_db:
  invoices:
    - where:
        id: "$seed:invoice.status_target.id"
      expect:
        status: "PAID"
        deleted_at_null: true
        total_amount_not_null: true
      store_as: "paid_invoice"

  invoice_payments:
    - where:
        invoice_id: "$paid_invoice.id"
      expect:
        amount_not_null: true
        created_by_not_null: true
      count_gte: 1

  invariants:
    - name: "Invoice status is terminal PAID"
      query: |
        SELECT status FROM invoices
        WHERE id = $paid_invoice.id
      assert: "status = 'PAID'"

    - name: "Invoice not deleted after payment"
      query: |
        SELECT COUNT(*) as count FROM invoices
        WHERE id = $paid_invoice.id
          AND deleted_at IS NULL
      assert: "count = 1"
```

**IMPORTANT**: Before adding the `invoice_payments` block, grep `drizzle/schema.ts` to confirm the table exists and verify the exact column names:

```bash
grep -n "invoice_payments\|invoicePayments" /home/user/TERP/drizzle/schema.ts | head -20
```

If `invoice_payments` does not exist, use only the `invoices` table assertions and omit that block. Document which table name you found.

#### 2b: `accounting/void-invoice.oracle.yaml` (currently 2 fields, no `store_as`)

Read the file. The `expected_db` block has no `store_as`, so the matched record cannot be used in invariants. The check is also missing `voided_at` (or equivalent timestamp).

**Replace the entire `expected_db` block with:**

```yaml
expected_db:
  invoices:
    - where:
        id: "$seed:invoice.to_void.id"
      expect:
        status: "VOID"
        notes_contains: "VOID"
        deleted_at_null: true
      store_as: "voided_invoice"

  invariants:
    - name: "Voided invoice is in terminal state"
      query: |
        SELECT status FROM invoices
        WHERE id = $voided_invoice.id
      assert: "status = 'VOID'"

    - name: "Voided invoice not hard deleted"
      query: |
        SELECT COUNT(*) as count FROM invoices
        WHERE id = $voided_invoice.id
      assert: "count = 1"

    - name: "Void is irreversible: no non-void transitions possible"
      query: |
        SELECT COUNT(*) as count FROM invoices
        WHERE id = $voided_invoice.id
          AND status != 'VOID'
      assert: "count = 0"
```

#### 2c: `accounting/mark-invoice-sent.oracle.yaml` (critically shallow)

Read the file. The `expected_db` block only checks `deletedAt_null: true` — it makes NO assertion about the invoice being marked sent. This oracle could pass even if the mutation silently failed.

**Replace the entire `expected_db` block with:**

```yaml
expected_db:
  invoices:
    - where:
        id: "$seed:invoice.reminder_target.id"
      expect:
        status_in: ["SENT", "VIEWED", "PARTIAL", "OVERDUE"]
        deleted_at_null: true
      store_as: "reminded_invoice"

  invariants:
    - name: "Invoice still accessible after reminder"
      query: |
        SELECT COUNT(*) as count FROM invoices
        WHERE id = $reminded_invoice.id
          AND deleted_at IS NULL
      assert: "count = 1"

    - name: "Invoice in valid post-reminder status"
      query: |
        SELECT status FROM invoices
        WHERE id = $reminded_invoice.id
      assert: "status IN ('SENT', 'VIEWED', 'PARTIAL', 'OVERDUE')"
```

GATE 2: After completing Task 2, run:

```bash
pnpm test 2>&1 | tail -40
```

Must still pass.

---

### Task 3: Add `expected_db` to Missing Mutation Oracles

#### 3a: `clients/create-client.oracle.yaml`

Read the file. This oracle has `flow_id: "CRM.Clients.CreateClient"` and is in `CRITICAL_TIER1_FLOWS`. It currently has NO `expected_db` block. The contract test `requires_expected_db_on_critical_mutation_flows` does NOT fail because this oracle lacks the `mutation` tag. However, this is an omission — the oracle creates a client and should verify it persisted correctly.

**Before adding the block**, add the `mutation` tag to the `tags` list:

```yaml
tags:
  - tier1
  - clients
  - crud
  - mutation
```

Then add after `expected_ui`:

```yaml
expected_db:
  clients:
    - where:
        teri_code: "$stored.created_teri_code"
      expect:
        deleted_at_null: true
        is_buyer: true
      store_as: "created_client"

  invariants:
    - name: "Created client has unique TERI code"
      query: |
        SELECT COUNT(*) as cnt FROM clients
        WHERE teri_code = '$stored.created_teri_code'
          AND deleted_at IS NULL
      assert: "cnt = 1"
```

**NOTE**: The `store` step in this file may not store `created_teri_code`. Check the `steps` block. If no `store` step for the TERI code exists, use a different `where` clause — for example, match by `company_name` if a `store` step for the name exists. Do NOT assume what is stored; read the actual steps first.

#### 3b: `accounting/update-batch-cogs.oracle.yaml`

Read the file. `flow_id: "Accounting.COGS.UpdateBatchCogs"` is tier1. Currently the file has NO `expected_db`. The flow navigates to a batch detail to VIEW cost information — it is NOT a mutation. Therefore:

- Do NOT add a `mutation` tag.
- DO add a read-side `expected_db` block that verifies the seed batch has cost data visible in the DB (not just in the UI):

```yaml
expected_db:
  batches:
    - where:
        id: "$seed:batch.cost_visible.id"
      expect:
        deleted_at_null: true
        unit_cogs_not_null: true
      store_as: "cost_batch"
```

**Before adding this block**, verify the column name in `drizzle/schema.ts`:

```bash
grep -n "unitCogs\|unit_cogs\|cogs" /home/user/TERP/drizzle/schema.ts | grep -i "batch" | head -10
```

Use the snake_case DB column name from the schema, not the camelCase TypeScript name.

GATE 3: After completing Task 3, run:

```bash
pnpm test 2>&1 | tail -40
```

Must still pass. The `requires_expected_db_on_critical_mutation_flows` test MUST pass. If adding the `mutation` tag to `CRM.Clients.CreateClient` caused it to fail, fix the `expected_db` block until it passes.

---

### Task 4: Deepen Shallow CRM Oracle Assertions

#### 4a: `crm/clients-update.oracle.yaml` (currently 1 field)

Read the file. The `expected_db` block checks only `phone: "555-000-1234"`. An update touches multiple fields and should log activity. Strengthen to:

```yaml
expected_db:
  clients:
    - where:
        id: "$seed:client.test_buyer.id"
      expect:
        phone: "555-000-1234"
        deleted_at_null: true
        updated_at_not_null: true
      store_as: "updated_client"

  client_activity:
    - where:
        client_id: "$updated_client.id"
        activity_type: "UPDATED"
      expect:
        user_id_not_null: true
      count_gte: 1

  invariants:
    - name: "Update did not delete client"
      query: |
        SELECT COUNT(*) as count FROM clients
        WHERE id = $updated_client.id
          AND deleted_at IS NULL
      assert: "count = 1"
```

**Before adding `updated_at_not_null`**, verify the column exists in the `clients` table:

```bash
grep -n "updatedAt\|updated_at" /home/user/TERP/drizzle/schema.ts | grep -i "clients" | head -5
```

**Before adding `client_activity`**, verify this table and the `activity_type: "UPDATED"` enum value exist:

```bash
grep -n "client_activity\|clientActivity\|UPDATED" /home/user/TERP/drizzle/schema.ts | head -10
```

If the `client_activity` table does not exist, omit that block and document it.

#### 4b: `crm/communications-add.oracle.yaml` (1 field, `id_not_null` is not meaningful)

Read the file. The `expected_db` block checks only `id_not_null: true` — which is trivially true for any non-empty row. Strengthen to verify actual communication content:

```yaml
expected_db:
  client_communications:
    - where:
        client_id: "$seed:client.test_buyer.id"
        notes_contains: "Discussed delivery"
      expect:
        user_id_not_null: true
        communication_type_not_null: true
      store_as: "added_communication"
      count_gte: 1

  invariants:
    - name: "Communication linked to correct client"
      query: |
        SELECT client_id FROM client_communications
        WHERE id = $added_communication.id
      assert: "client_id = '$seed:client.test_buyer.id'"
```

**Verify the table and column names before editing:**

```bash
grep -n "client_communications\|clientCommunications" /home/user/TERP/drizzle/schema.ts | head -10
```

#### 4c: `crm/transactions-create.oracle.yaml` (1 field, `id_not_null` is trivial)

Read the file. The `expected_db` block checks only `id_not_null: true`. The oracle creates a transaction with `amount: "1500.00"` and type `Invoice`. Strengthen to:

```yaml
expected_db:
  client_transactions:
    - where:
        client_id: "$seed:client.test_buyer.id"
        amount: "1500.00"
      expect:
        transaction_type: "INVOICE"
        payment_status: "PENDING"
        deleted_at_null: true
      store_as: "created_transaction"
      count_gte: 1

  invariants:
    - name: "Transaction amount matches input"
      query: |
        SELECT CAST(amount AS DECIMAL(10,2)) as amt
        FROM client_transactions
        WHERE id = $created_transaction.id
      assert: "amt = 1500.00"

    - name: "Transaction not hard deleted"
      query: |
        SELECT COUNT(*) as count FROM client_transactions
        WHERE id = $created_transaction.id
      assert: "count = 1"
```

**Verify column names:**

```bash
grep -n "client_transactions\|clientTransactions" /home/user/TERP/drizzle/schema.ts | head -10
```

GATE 4: After completing Task 4, run:

```bash
pnpm test 2>&1 | tail -40
```

---

### Task 5: Deepen Shallow Inventory Oracle Assertions

#### 5a: `inventory/update-batch.oracle.yaml`

Read the file. The `expected_db` block checks only `batchStatus: "LIVE"`. The audit_logs entry uses `reason_contains: "Q1"` — an arbitrary string with no connection to the test data (the step sets rack to `"R2"`).

**Replace the entire `expected_db` block with:**

```yaml
expected_db:
  batches:
    - where:
        id: "$seed:batch.og_kush.id"
      expect:
        batch_status: "LIVE"
        updated_at_not_null: true
      store_as: "updated_batch"

  audit_logs:
    - where:
        entity: "Batch"
        entity_id: "$updated_batch.id"
        action_in: ["BATCH_UPDATE", "UPDATE"]
      expect:
        actor_id_not_null: true
      count_gte: 1

  invariants:
    - name: "Batch update preserved on-hand quantity"
      query: |
        SELECT on_hand_qty FROM batches
        WHERE id = $updated_batch.id
      assert: "on_hand_qty >= 0"

    - name: "Batch still active after update"
      query: |
        SELECT COUNT(*) as count FROM batches
        WHERE id = $updated_batch.id
          AND deleted_at IS NULL
      assert: "count = 1"
```

**Verify column names before editing** — the file may use camelCase in `expected_db` keys. Grep for the actual DB column name:

```bash
grep -n "batchStatus\|batch_status\|onHandQty\|on_hand_qty" /home/user/TERP/drizzle/schema.ts | grep -v "^Binary" | head -10
```

Match the snake_case DB names.

#### 5b: `inventory/create-batch.oracle.yaml`

Read the file. The `expected_db` block has 3 table assertions but NO `invariants`. Add an invariant block:

```yaml
invariants:
  - name: "Intake movement quantity matches batch on-hand"
    query: |
      SELECT
        b.on_hand_qty,
        (SELECT SUM(quantity_change) FROM inventory_movements
         WHERE batch_id = b.id AND inventory_movement_type = 'INTAKE') as intake_sum
      FROM batches b
      WHERE b.batch_status = 'AWAITING_INTAKE'
      ORDER BY b.created_at DESC
      LIMIT 1
    assert: "on_hand_qty = intake_sum OR intake_sum IS NULL"
```

**Verify column names:**

```bash
grep -n "inventoryMovementType\|inventory_movement_type\|quantityChange\|quantity_change" /home/user/TERP/drizzle/schema.ts | head -10
```

GATE 5: After completing Task 5, run:

```bash
pnpm test 2>&1 | tail -40
```

---

### Task 6: Verify and Bump the Contract Minimum

After all the above tasks are complete, count the actual number of mutation oracles with `expected_db`:

```bash
python3 -c "
import os, yaml
oracles_dir = 'tests-e2e/oracles'
count = 0
files = []
for root, dirs, fnames in os.walk(oracles_dir):
    for f in fnames:
        if f.endswith('.oracle.yaml'):
            path = os.path.join(root, f)
            with open(path) as fh:
                data = yaml.safe_load(fh)
            tags = data.get('tags', [])
            if 'mutation' in tags and data.get('expected_db'):
                count += 1
                files.append(path)
print(f'Total mutation oracles with expected_db: {count}')
for f in sorted(files):
    print(f'  {f}')
"
```

Read `tests/contracts/oracle-metadata-contract.test.ts`. The current `MIN_MUTATION_WITH_DB_COUNT` is 20.

If the actual count after your changes is greater than 20, update the constant in the contract test to match the new actual count. This prevents future regressions from removing `expected_db` blocks:

```typescript
// If actual count is, say, 24:
const MIN_MUTATION_WITH_DB_COUNT = 24;
```

**Rules for updating the constant:**

- Set it to the EXACT new count, not a round number
- Add a comment above the constant documenting when it was last updated
- Do NOT set it higher than the actual count (that would fail CI immediately)
- Do NOT leave it at 20 if the actual count is higher (that defeats the regression guard)

GATE 6: After updating the constant (if needed):

```bash
pnpm test 2>&1 | tail -40
```

The `prevents silent mutation DB contract erosion` test must pass.

---

### Task 7: Full Verification Suite

GATE 7: Run ALL of these and paste complete output:

```bash
pnpm check 2>&1 | tail -30
```

```bash
pnpm lint 2>&1 | tail -20
```

```bash
pnpm test 2>&1 | tail -50
```

```bash
pnpm build 2>&1 | tail -20
```

All four must pass before proceeding to the QA protocol.

---

## QA Protocol (3-Lens for STRICT Mode)

### Lens 1: Structural Integrity of All Modified Oracle Files

For every YAML file you modified, verify it parses cleanly:

```bash
node -e "
const yaml = require('js-yaml');
const fs = require('fs');
const files = [
  'tests-e2e/oracles/accounting/update-invoice-status.oracle.yaml',
  'tests-e2e/oracles/accounting/void-invoice.oracle.yaml',
  'tests-e2e/oracles/accounting/mark-invoice-sent.oracle.yaml',
  'tests-e2e/oracles/accounting/update-batch-cogs.oracle.yaml',
  'tests-e2e/oracles/clients/create-client.oracle.yaml',
  'tests-e2e/oracles/crm/clients-update.oracle.yaml',
  'tests-e2e/oracles/crm/communications-add.oracle.yaml',
  'tests-e2e/oracles/crm/transactions-create.oracle.yaml',
  'tests-e2e/oracles/inventory/update-batch.oracle.yaml',
  'tests-e2e/oracles/inventory/update-status.oracle.yaml',
  'tests-e2e/oracles/inventory/delete-batch.oracle.yaml',
  'tests-e2e/oracles/inventory/create-batch.oracle.yaml',
];
let ok = 0;
let fail = 0;
for (const f of files) {
  try {
    yaml.load(fs.readFileSync(f, 'utf-8'));
    console.log('OK:', f);
    ok++;
  } catch (e) {
    console.error('FAIL:', f, e.message);
    fail++;
  }
}
console.log(ok + ' OK, ' + fail + ' FAILED');
"
```

Expected: All files report `OK`. Zero `FAILED`.

### Lens 2: Assertion Quality Audit

For each modified oracle, verify these quality standards are met. Fill in this table manually by reading the final versions of the files:

| Oracle                             | Tables asserted | Invariants      | Soft-delete verified    | `store_as` present |
| ---------------------------------- | --------------- | --------------- | ----------------------- | ------------------ |
| `accounting/update-invoice-status` | >= 2            | >= 2            | yes (`deleted_at_null`) | yes                |
| `accounting/void-invoice`          | >= 1            | >= 3            | yes (`deleted_at_null`) | yes                |
| `accounting/mark-invoice-sent`     | >= 1            | >= 2            | yes (`deleted_at_null`) | yes                |
| `accounting/update-batch-cogs`     | >= 1            | n/a (read-only) | yes                     | yes                |
| `clients/create-client`            | >= 1            | >= 1            | yes                     | yes                |
| `crm/clients-update`               | >= 1            | >= 1            | yes                     | yes                |
| `crm/communications-add`           | >= 1            | >= 1            | n/a                     | yes                |
| `crm/transactions-create`          | >= 1            | >= 2            | yes                     | yes                |
| `inventory/update-batch`           | >= 2            | >= 2            | yes                     | yes                |
| `inventory/update-status`          | >= 1            | >= 1            | n/a                     | yes                |
| `inventory/delete-batch`           | >= 2            | >= 2            | n/a (CLOSED status)     | yes                |
| `inventory/create-batch`           | >= 3            | >= 1            | n/a                     | n/a                |

### Lens 3: Contract Test Coverage Verification

```bash
pnpm test tests/contracts/oracle-metadata-contract.test.ts --reporter=verbose 2>&1
```

All 5 tests must pass:

1. `keeps critical flows in tier1`
2. `requires expected_db on critical mutation flows`
3. `prevents silent tier1 demotion (minimum count guard)`
4. `prevents silent mutation DB contract erosion`
5. `detects tier1 flows not in CRITICAL_TIER1_FLOWS allowlist`

If test 5 fails because you added the `mutation` tag to `CRM.Clients.CreateClient` but didn't update `CRITICAL_TIER1_FLOWS`, that is a false alarm — `CRM.Clients.CreateClient` is already in the allowlist. If test 5 reveals an oracle that is NOT in the allowlist, add it to `CRITICAL_TIER1_FLOWS` in the contract test.

---

## Fix Cycle

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification command that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## Files In Scope

**Oracle YAML files (modify assertions only — do not change flow steps or preconditions):**

- `tests-e2e/oracles/accounting/update-invoice-status.oracle.yaml`
- `tests-e2e/oracles/accounting/void-invoice.oracle.yaml`
- `tests-e2e/oracles/accounting/mark-invoice-sent.oracle.yaml`
- `tests-e2e/oracles/accounting/update-batch-cogs.oracle.yaml`
- `tests-e2e/oracles/clients/create-client.oracle.yaml`
- `tests-e2e/oracles/crm/clients-update.oracle.yaml`
- `tests-e2e/oracles/crm/communications-add.oracle.yaml`
- `tests-e2e/oracles/crm/transactions-create.oracle.yaml`
- `tests-e2e/oracles/inventory/update-batch.oracle.yaml`
- `tests-e2e/oracles/inventory/update-status.oracle.yaml`
- `tests-e2e/oracles/inventory/delete-batch.oracle.yaml`
- `tests-e2e/oracles/inventory/create-batch.oracle.yaml`

**Contract test (update minimum only):**

- `tests/contracts/oracle-metadata-contract.test.ts`

**Read-only references (do not modify):**

- `drizzle/schema.ts` — verify table/column names before asserting
- `tests-e2e/oracles/loader.ts` — understand what the loader validates
- `tests-e2e/oracles/types.ts` — understand the TestOracle type if needed

---

## Scope Guard: What NOT to Touch

- Do NOT modify oracle `steps` blocks (those define the UI actions, not DB assertions)
- Do NOT modify oracle `preconditions` blocks
- Do NOT modify `expected_ui` blocks
- Do NOT modify any routers, services, or application code
- Do NOT add new oracle files — only strengthen existing ones
- Do NOT change `MIN_TIER1_COUNT` (34) — you are not adding new tier1 oracles
- Do NOT change `CRITICAL_TIER1_FLOWS` unless a new oracle you tagged as `mutation` would trigger test 5 — in that case, document the change

---

## Known Edge Cases and Pitfalls

1. **Column name mismatch**: Oracle YAML uses snake_case DB column names. TypeScript code uses camelCase. These are different. `batchStatus` in TypeScript is `batch_status` in the DB. Always verify in `drizzle/schema.ts` before asserting a column name.

2. **The `clients-archive.oracle.yaml` cancel flow**: This oracle tests that clicking Archive and then Cancel does NOT modify the client (`deleted_at_null: true`). This is intentional — it is testing the cancel path, not the archive mutation. Do NOT change this oracle.

3. **`seed_profile` dependency**: Some oracles reference `$seed:invoice.to_void.id` which requires the `basic_sales` seed profile to include invoices with those aliases. Do not change the `where` clause to reference seed data that doesn't exist in the seed profile.

4. **`$stored.variable_name` references**: These are populated by `store` action steps in the oracle's `steps` block. If you add a `where: $stored.foo`, verify there is a `store: as: foo` step in the file. If no such step exists, use a different identifier (temp entity ref or seed ref).

5. **The `Accounting.COGS.UpdateBatchCogs` oracle is a view, not a mutation**: It navigates to see batch cost data. The `seed_profile: "inventory_costing"` must include a batch with cost data (`seed:batch.cost_visible`). When adding `expected_db`, only assert that the seed data exists correctly — do not assert mutation outcomes.

6. **YAML indentation**: The `expected_db` block must be at the top level (0 indentation), same level as `expected_ui`. The table name is at 2 spaces indent. The list item `-` is at 4 spaces. The `where`/`expect`/`store_as` keys are at 6 spaces. The key-value pairs are at 8 spaces.

---

## Completion Checklist

Do NOT declare this work complete until every box is checked with evidence (paste command + output):

- [ ] GATE 0: Audit output showing current state documented
- [ ] Task 1: `inventory/update-status.oracle.yaml` — `sku_like` fixed to reference temp entity, invariants updated
- [ ] Task 1: `inventory/delete-batch.oracle.yaml` — `sku_like` fixed to reference temp entity, `store_as` added, invariants added
- [ ] GATE 1: `pnpm test` passes after Task 1
- [ ] Task 2a: `accounting/update-invoice-status.oracle.yaml` — 3 `expect` fields, 2 invariants, `store_as` added
- [ ] Task 2b: `accounting/void-invoice.oracle.yaml` — `store_as` added, 3 invariants added
- [ ] Task 2c: `accounting/mark-invoice-sent.oracle.yaml` — meaningful status assertion, 2 invariants
- [ ] GATE 2: `pnpm test` passes after Task 2
- [ ] Task 3a: `clients/create-client.oracle.yaml` — `mutation` tag added, `expected_db` added, invariant added
- [ ] Task 3b: `accounting/update-batch-cogs.oracle.yaml` — `expected_db` added with verified column name
- [ ] GATE 3: `pnpm test` passes after Task 3, including `requires_expected_db_on_critical_mutation_flows`
- [ ] Task 4a: `crm/clients-update.oracle.yaml` — 3 `expect` fields, `client_activity` check, 1 invariant
- [ ] Task 4b: `crm/communications-add.oracle.yaml` — meaningful content assertion, 1 invariant
- [ ] Task 4c: `crm/transactions-create.oracle.yaml` — type and status fields, 2 invariants
- [ ] GATE 4: `pnpm test` passes after Task 4
- [ ] Task 5a: `inventory/update-batch.oracle.yaml` — `store_as` added, broken audit_logs assertion fixed, 2 invariants
- [ ] Task 5b: `inventory/create-batch.oracle.yaml` — invariant block added
- [ ] GATE 5: `pnpm test` passes after Task 5
- [ ] Task 6: Mutation-with-DB count verified, `MIN_MUTATION_WITH_DB_COUNT` updated if count exceeds 20
- [ ] GATE 6: `pnpm test` passes with updated minimum
- [ ] GATE 7: `pnpm check` passes (paste output)
- [ ] GATE 7: `pnpm lint` passes (paste output)
- [ ] GATE 7: `pnpm test` passes (paste output)
- [ ] GATE 7: `pnpm build` passes (paste output)
- [ ] QA Lens 1: All modified YAML files parse cleanly (paste node output)
- [ ] QA Lens 2: Assertion quality table filled in
- [ ] QA Lens 3: All 5 contract tests pass (paste verbose output)
- [ ] No `any` types introduced
- [ ] No TODO/FIXME/HACK comments introduced
- [ ] All `expected_db` column names verified against `drizzle/schema.ts`

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual command output, not claims.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **READ FILES BEFORE EDITING.** Never modify a YAML file you haven't read in this session.
4. **VERIFY COLUMN NAMES.** Grep `drizzle/schema.ts` before using any table or column name in an assertion.
5. **SCOPE GUARD.** Only oracle YAML files and the contract test minimum constant. Nothing else.
6. **YAML INDENTATION.** One wrong indent silently breaks the loader. Parse every file after editing.
