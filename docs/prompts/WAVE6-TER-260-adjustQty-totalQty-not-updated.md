# TER-260: Fix inventory.adjustQty — totalQty Not Updated After Adjustment

**Classification**: Medium | **Mode**: STRICT | **Estimate**: 4h
**Linear**: TER-260 | **Wave**: 6
**Golden Flow**: GF-007 (Inventory Management)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a checkmark with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass, if anything unexpected happens: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **PROOF OF WORK.** At every verification gate marked with GATE, you must paste the actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first.
7. **ONE THING AT A TIME.** Complete and verify each task before starting the next.
8. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases, edge cases, and adversarial inputs.

---

## Mission Brief

`inventory.adjustQty` with `field=onHandQty` and `adjustment=25` on a batch with qty=100 succeeds, but `totalQty` in the API response remains at 0 instead of the expected value. The batch schema in `drizzle/schema.ts` has NO `totalQty` column — only component fields: `onHandQty`, `sampleQty`, `reservedQty`, `quarantineQty`, `holdQty`, `defectiveQty`.

### The Question to Answer First

Before implementing anything, determine: **Where does the QA test get `totalQty` from?**

Possibilities:

1. **API response includes a computed `totalQty` field** — but it's computed incorrectly (returning 0)
2. **Frontend computes `totalQty`** — and the API just doesn't include it
3. **There's a `totalQty` field somewhere** in the DB that isn't in the Drizzle schema
4. **The QA test is checking the wrong field name** — it should check `onHandQty` instead

**The goal**: Ensure the inventory API consistently returns a `totalQty` computed field (sum of all quantity buckets) and that `adjustQty` returns an updated value reflecting the adjustment.

---

## Pre-Flight: Rollback Plan

```bash
git checkout -- server/routers/inventory.ts
git checkout -- server/inventoryDb.ts
```

**Risk level**: MEDIUM. Changes inventory quantity display; no actual DB data changes.

---

## Pre-Work: Investigate totalQty

### Task 0: Find Where totalQty Comes From

**What**: Search the entire codebase for `totalQty` to understand its origin.
**Files**: All

**Steps**:

1. Search for `totalQty` everywhere:
   ```bash
   grep -rn "totalQty" server/ client/ drizzle/ --include="*.ts" --include="*.tsx" | head -40
   ```
2. Check the batch list query in `inventory.ts` — does it compute totalQty?
3. Check `inventoryDb.ts` — does the batch query add a computed column?
4. Check the frontend Inventory page — does it compute or expect totalQty?
5. Check the batch schema one more time — is there a column I'm missing?

**Acceptance Criteria**:

- [ ] Know exactly where `totalQty` is defined/computed
- [ ] Know whether it's a DB column, computed in SQL, computed in JS, or missing entirely

**GATE**: Paste your findings.

---

## Implementation Tasks

### Task 1: Add Computed totalQty to Batch Responses

**What**: Ensure all batch queries return a computed `totalQty` field.
**Files**: `server/routers/inventory.ts` or `server/inventoryDb.ts`

**Two approaches** (choose based on Task 0 findings):

**Approach A: Server-side computed field**
After fetching a batch, compute totalQty:

```typescript
const totalQty =
  parseFloat(batch.onHandQty || "0") +
  parseFloat(batch.sampleQty || "0") +
  parseFloat(batch.reservedQty || "0") +
  parseFloat(batch.quarantineQty || "0") +
  parseFloat(batch.holdQty || "0") +
  parseFloat(batch.defectiveQty || "0");
```

**Approach B: SQL computed column**
Add to the SELECT query:

```sql
(CAST(onHandQty AS DECIMAL) + CAST(sampleQty AS DECIMAL) + ...) AS totalQty
```

**Preference**: Approach A (simpler, no schema change, consistent).

**Places to add the computation** (all batch query endpoints):

- `inventory.list` / `inventory.getEnhanced` — batch list
- `inventory.getById` — single batch detail
- `adjustQty` return value — the response after adjustment

**Acceptance Criteria**:

- [ ] `inventory.list` returns `totalQty` for each batch
- [ ] `inventory.getById` returns `totalQty`
- [ ] `adjustQty` response includes updated `totalQty`
- [ ] `totalQty` is the sum of all 6 quantity fields
- [ ] TypeScript types updated to include `totalQty: string` in batch response

### Task 2: Verify adjustQty Updates the Correct Field

**What**: Ensure that after calling `adjustQty(field=onHandQty, adjustment=25)`, the onHandQty is actually 125 (was 100 + 25).
**Files**: `server/routers/inventory.ts`, `server/inventoryDb.ts`

**Steps**:

1. Read `adjustQty` mutation (inventory.ts lines 1126-1233)
2. Read `updateBatchQty` function (inventoryDb.ts lines 745-796)
3. Trace: does `adjustment=25` mean "set to 25" or "add 25"?
4. Check if the function receives the NEW value or the DELTA

**Acceptance Criteria**:

- [ ] adjustQty correctly applies the adjustment (additive, not replacement)
- [ ] The returned batch shows the correct updated value

**Verification Command**:

```bash
pnpm check
```

**GATE**: Paste output.

### Task 3: Add Regression Tests

**What**: Test that adjustQty returns correct totalQty.
**Files**: New test or extend existing inventory tests

**Test Scenarios Required**:

| #   | Scenario                                     | Expected                        |
| --- | -------------------------------------------- | ------------------------------- |
| 1   | Adjust onHandQty +25 on batch(100,0,0,0,0,0) | totalQty=125, onHandQty=125     |
| 2   | Adjust quarantineQty +10                     | totalQty includes quarantine    |
| 3   | Adjust onHandQty to 0                        | totalQty = sum of other fields  |
| 4   | Multiple adjustments on same batch           | totalQty reflects all changes   |
| 5   | Batch with all 6 fields populated            | totalQty = correct sum          |
| 6   | Batch list returns totalQty                  | All batches have computed field |

**Acceptance Criteria**:

- [ ] All 6 test scenarios pass

**Verification Command**:

```bash
pnpm test -- --reporter=verbose server/routers/inventory
```

**GATE**: Paste test output.

---

## QA Protocol (5-Lens)

### Lens 1: Static Pattern Scan

```bash
git diff --cached -- server/routers/inventory.ts server/inventoryDb.ts | grep -E "(any|\.id \|\| 1|console\.log)"
```

### Lens 2: Execution Path Tracing

- adjustQty called → validate input → updateBatchQty → fetch updated batch → compute totalQty → return
- list called → fetch batches → compute totalQty per batch → return
- getById called → fetch batch → compute totalQty → return

### Lens 3: Data Flow Analysis

- totalQty = onHandQty + sampleQty + reservedQty + quarantineQty + holdQty + defectiveQty
- All fields are `decimal(15,4)` in DB, returned as strings
- Must parseFloat each before summing to avoid string concatenation

### Lens 4: Adversarial Scenarios

1. Batch with null/undefined quantity fields (new batch, no values set)
2. Batch with negative quantity in one field
3. Batch where all fields are "0.0000"
4. totalQty computation with floating point edge cases (0.1 + 0.2)
5. Very large quantities (999999.9999)

### Lens 5: Blast Radius

- Frontend may already compute totalQty — adding it to API shouldn't break anything
- Check if any frontend code accesses `batch.totalQty` — it may start working now
- Ensure the totalQty type matches what the frontend expects (string vs number)

---

## Completion Checklist

- [ ] `totalQty` origin identified (Task 0)
- [ ] Computed `totalQty` added to all batch response endpoints
- [ ] `adjustQty` returns updated `totalQty`
- [ ] TypeScript types updated
- [ ] 6 regression test scenarios pass
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes (full suite)
- [ ] `pnpm build` passes
- [ ] No `any` types introduced
- [ ] No `console.log` left in production code

---

## MANDATORY RULES REMINDER

1. NO PHANTOM VERIFICATION — show actual output
2. NO PREMATURE COMPLETION — check every box above
3. NO SILENT ERROR HANDLING — report failures immediately
4. PROOF OF WORK at every GATE
