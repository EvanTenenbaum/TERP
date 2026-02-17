# TER-238: Fix GF-001 Brittle `toHaveCount(2)` Assertion

**Classification**: Simple | **Mode**: SAFE | **Estimate**: 2h
**Linear**: TER-238 | **Wave**: 1 (zero-dependency, parallelizable)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails: STOP. Report the exact error.
4. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
5. **ACTUALLY READ FILES BEFORE EDITING.** Read the file first. Do not assume.
6. **SCOPE GUARD.** Only modify `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`. No other files.

---

## Mission Brief

The GF-001 Direct Intake E2E test has a brittle assertion at line 75:

```typescript
await expect(rows).toHaveCount(2);
```

This hard-codes the expected row count to exactly 2, assuming the page starts with 1 row before "Add Row" is clicked. This assumption breaks across environments where the initial state varies.

**Fix**: Capture the row count BEFORE the "Add Row" click, then assert the count increased by exactly 1.

---

## Pre-Work: Read the File

Read the full test file:
```
tests-e2e/golden-flows/gf-001-direct-intake.spec.ts
```

🔒 **GATE 0**: Before editing, confirm:
- What is at line 72? (the `addRowButton.click()` call)
- What is at line 74-75? (the rows locator and count assertion)
- What `rowIndex` is used below? (should be 1, meaning the newly added row)

---

## Task 1: Restructure the Row Count Assertion

**What**: Replace the hard-coded `toHaveCount(2)` with a relative assertion.
**File**: `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`

**Current code** (lines ~72-77):
```typescript
await addRowButton.click();

const rows = page.locator(".ag-center-cols-container .ag-row");
await expect(rows).toHaveCount(2);

const rowIndex = 1;
```

**Target code**:
```typescript
const rows = page.locator(".ag-center-cols-container .ag-row");
const initialRowCount = await rows.count();

await addRowButton.click();

await expect(rows).toHaveCount(initialRowCount + 1);

const rowIndex = initialRowCount; // index of the newly added row
```

**Key changes**:
1. Move `rows` locator declaration ABOVE the click
2. Capture `initialRowCount` before clicking
3. Assert `initialRowCount + 1` instead of hard-coded `2`
4. Set `rowIndex` to `initialRowCount` (the new row's 0-based index)

**Acceptance Criteria**:
- [ ] No hard-coded row count in any assertion
- [ ] Row count captured before the click
- [ ] Assertion verifies exactly +1 row after click
- [ ] `rowIndex` correctly points to the newly added row
- [ ] Rest of the test (form filling, submit) still uses correct rowIndex

**Verification Command**:
```bash
grep -n "toHaveCount" tests-e2e/golden-flows/gf-001-direct-intake.spec.ts
```
Expected: Only the relative assertion `toHaveCount(initialRowCount + 1)` remains.

🔒 **GATE 1**: Paste the grep output above.

---

## Task 2: Verify No Downstream Breakage

**What**: Ensure `rowIndex` change doesn't break the form-filling lines below.

The lines after the assertion fill in cells at `rowIndex`:
```typescript
await selectAgGridFirstOption(page, rowIndex, "vendorName");
await fillAgGridTextCell(page, rowIndex, "brandName", brandName);
// etc.
```

**Acceptance Criteria**:
- [ ] If initial state has 0 rows: `rowIndex = 0`, fills the first (new) row ✓
- [ ] If initial state has 1 row: `rowIndex = 1`, fills the second (new) row ✓
- [ ] The submit and status-check at the end reference the correct row

---

## Task 3: Full Verification

🔒 **GATE 2**: Run ALL of these and paste output:

```bash
pnpm check 2>&1 | tail -20
```

```bash
pnpm test 2>&1 | tail -20
```

```bash
pnpm build 2>&1 | tail -20
```

---

## QA Protocol (1-Lens for Simple)

### Lens 1: Execution Path Tracing

Trace the test flow for these initial states:
- **0 initial rows**: `initialRowCount = 0` → click → expect 1 → `rowIndex = 0` → fill row 0 → submit
- **1 initial row**: `initialRowCount = 1` → click → expect 2 → `rowIndex = 1` → fill row 1 → submit
- **2+ initial rows**: `initialRowCount = N` → click → expect N+1 → `rowIndex = N` → fill row N → submit

Verify each path is logically correct.

---

## Rollback

```bash
git checkout -- tests-e2e/golden-flows/gf-001-direct-intake.spec.ts
```

---

## ✅ Completion Checklist

- [ ] Hard-coded `toHaveCount(2)` removed
- [ ] Row count captured before click
- [ ] Assertion uses `initialRowCount + 1`
- [ ] `rowIndex` set to `initialRowCount` (new row index)
- [ ] Downstream form-filling logic still correct
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No TODO/FIXME/HACK comments introduced

---

## RULES REPEATED

1. **NO PHANTOM VERIFICATION.** Show actual command output.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **SCOPE GUARD.** Only modify `gf-001-direct-intake.spec.ts`.
