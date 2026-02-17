# TER-240: Fix GF-005 Invalid Locator Syntax

**Classification**: Simple | **Mode**: SAFE | **Estimate**: 2h
**Linear**: TER-240 | **Wave**: 1 (zero-dependency, parallelizable)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails: STOP. Report the exact error.
4. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
5. **ACTUALLY READ FILES BEFORE EDITING.** Read the file first.
6. **SCOPE GUARD.** Only modify `tests-e2e/golden-flows/gf-005-pick-pack.spec.ts`. No other files.

---

## Mission Brief

The GF-005 Pick & Pack E2E test uses comma-separated CSS selectors inside single `page.locator()` calls. While CSS supports comma-separated selectors, Playwright's `:has-text()` pseudo-class is non-standard and comma separation creates unreliable matching behavior. Replace all instances with Playwright's `.or()` API for explicit, reliable multi-selector matching.

---

## Pre-Work: Read the File

```
tests-e2e/golden-flows/gf-005-pick-pack.spec.ts
```

🔒 **GATE 0**: Before editing, list ALL comma-separated locators in the file with line numbers.

---

## Task 1: Fix All Comma-Separated Locators

**What**: Replace every comma-separated locator with `.or()` chains.
**File**: `tests-e2e/golden-flows/gf-005-pick-pack.spec.ts`

**Fix each instance**:

### Line 21 — Header locator
```typescript
// BEFORE
const header = page.locator('h1:has-text("Pick"), h1:has-text("Pack")');

// AFTER
const header = page.locator('h1:has-text("Pick")').or(page.locator('h1:has-text("Pack")'));
```

### Line 24-26 — Queue locator
```typescript
// BEFORE
const queue = page.locator(
  '[role="listbox"], :text("No orders to pick"), [data-testid="order-queue"]'
);

// AFTER
const queue = page.locator('[data-testid="order-queue"]')
  .or(page.locator('[role="listbox"]'))
  .or(page.locator(':text("No orders to pick")'));
```

### Line 40-41 — Pack button
```typescript
// BEFORE
const packButton = page.locator(
  'button:has-text("Pack"), button:has-text("Ready")'
);

// AFTER
const packButton = page.locator('button:has-text("Pack")')
  .or(page.locator('button:has-text("Ready")'));
```

### Lines 52-53 — Ship button
```typescript
// BEFORE
const shipButton = page.locator(
  'button:has-text("Ship"), button:has-text("Mark Shipped")'
);

// AFTER
const shipButton = page.locator('button:has-text("Ship")')
  .or(page.locator('button:has-text("Mark Shipped")'));
```

**Acceptance Criteria**:
- [ ] Zero comma-separated locators remain in the file
- [ ] All multi-selector locators use `.or()` API
- [ ] Locator order preserved (first option is the primary/preferred selector)
- [ ] No functional change to test logic — only locator syntax

**Verification Command**:
```bash
grep -n "locator(" tests-e2e/golden-flows/gf-005-pick-pack.spec.ts | grep ","
```
Expected: Zero lines with commas inside locator calls (ignore lines where comma is after the closing paren).

🔒 **GATE 1**: Paste the grep output.

---

## Task 2: Full Verification

🔒 **GATE 2**: Run ALL and paste output:

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

### Lens 1: Static Pattern Scan

```bash
# Verify no comma-separated locators remain
grep -n 'locator(' tests-e2e/golden-flows/gf-005-pick-pack.spec.ts

# Verify .or() is used correctly (should see multiple .or() calls)
grep -n '\.or(' tests-e2e/golden-flows/gf-005-pick-pack.spec.ts

# Verify no broken string concatenation
grep -n "page.locator(" tests-e2e/golden-flows/gf-005-pick-pack.spec.ts
```

---

## Rollback

```bash
git checkout -- tests-e2e/golden-flows/gf-005-pick-pack.spec.ts
```

---

## ✅ Completion Checklist

- [ ] Line 21: header locator uses `.or()`
- [ ] Lines 24-26: queue locator uses `.or()`
- [ ] Lines 40-41: packButton locator uses `.or()`
- [ ] Lines 52-53: shipButton locator uses `.or()`
- [ ] Zero comma-separated locators remain
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No functional changes to test assertions or logic

---

## RULES REPEATED

1. **NO PHANTOM VERIFICATION.** Show actual command output.
2. **SCOPE GUARD.** Only modify `gf-005-pick-pack.spec.ts`.
3. **ONE THING AT A TIME.** Fix each locator, verify, then proceed.
