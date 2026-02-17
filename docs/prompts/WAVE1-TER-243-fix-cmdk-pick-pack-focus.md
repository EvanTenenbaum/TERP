# TER-243: Fix Cmd+K Search Focus on Pick-Pack

**Classification**: Medium | **Mode**: STRICT | **Estimate**: 4h
**Linear**: TER-243 | **Wave**: 1 (zero-dependency, parallelizable)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails: STOP. Report the exact error.
4. **NO QA SKIPPING.** Run both QA lenses below.
5. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Read both files first.
7. **SCOPE GUARD.** Only modify `tests-e2e/golden-flows/cmd-k-enforcement.spec.ts`. Do NOT modify `PickPackWorkSurface.tsx` (implementation is already correct).

---

## Mission Brief

The Cmd+K enforcement test suite (`cmd-k-enforcement.spec.ts`) tests focus behavior on `/orders` but does NOT test `/pick-pack` specifically. The pick-pack page already has correct Cmd+K implementation:

- `data-testid="pick-pack-search-input"` on the search field (line 833)
- `cmd+k` and `ctrl+k` handlers that focus the search input (lines 707-712)

The gap is **test coverage**, not implementation. Additionally, the test file has comma-separated locators that need `.or()` fixes, and the cross-page consistency test at line 221 doesn't include `/pick-pack`.

---

## Pre-Work: Read Both Files

1. Read full test: `tests-e2e/golden-flows/cmd-k-enforcement.spec.ts`
2. Read pick-pack implementation (relevant sections): `client/src/components/work-surface/PickPackWorkSurface.tsx` — specifically lines 700-720 (handlers) and 825-840 (input element)
3. Check what auth fixture is needed: `grep -n "loginAs" tests-e2e/fixtures/auth.ts | head -20`

🔒 **GATE 0**: Before editing, confirm:
- What test ID does the pick-pack search input use?
- What keyboard shortcut handlers are registered?
- What auth fixture should the pick-pack test use?

---

## Task 1: Fix Comma-Separated Locators

**What**: Replace all comma-separated locators with `.or()` chains.
**File**: `tests-e2e/golden-flows/cmd-k-enforcement.spec.ts`

### Lines 84-86 — Command palette locator (used in multiple tests)
```typescript
// BEFORE
const commandPalette = page.locator(
  '[data-testid="command-palette"], [cmdk-root], [cmdk-input], input[placeholder*="command or search" i]'
);

// AFTER
const commandPalette = page.locator('[data-testid="command-palette"]')
  .or(page.locator('[cmdk-root]'))
  .or(page.locator('[cmdk-input]'))
  .or(page.locator('input[placeholder*="command or search" i]'));
```

**This pattern appears in multiple test blocks.** Find and fix ALL instances:

```bash
grep -n 'command-palette.*cmdk' tests-e2e/golden-flows/cmd-k-enforcement.spec.ts
```

Also fix any other comma-separated locators:
- Line 113: `[data-testid="command-palette"], [cmdk-root], [role="combobox"]`
- Line 134: `[data-testid="command-palette"], [cmdk-root]`
- Line 161-162: `[data-testid="command-palette"], [cmdk-root], [cmdk-input]`
- Line 232: `[data-testid="command-palette"], [cmdk-root], [cmdk-input]`
- Line 58-59: `input[placeholder*="customer" i], textarea[placeholder*="note" i], textarea`

**Acceptance Criteria**:
- [ ] ALL comma-separated locators replaced with `.or()` chains
- [ ] No functional changes to test logic

**Verification**:
```bash
grep -n "locator(" tests-e2e/golden-flows/cmd-k-enforcement.spec.ts | grep ","
```

🔒 **GATE 1**: Paste output. Expected: zero lines with commas inside locator calls.

---

## Task 2: Add Dedicated Pick-Pack Cmd+K Test

**What**: Add a new test case that specifically verifies Cmd+K focuses the search input on the pick-pack page.
**File**: `tests-e2e/golden-flows/cmd-k-enforcement.spec.ts`

Add this test inside the `"Cmd+K Focus Behavior"` describe block (after line 51):

```typescript
test("Cmd+K should focus search input on pick-pack page", async ({ page }) => {
  await page.goto("/pick-pack");
  await page.waitForLoadState("networkidle");

  const isMac = process.platform === "darwin";
  await page.keyboard.press(isMac ? "Meta+k" : "Control+k");
  await page.waitForTimeout(200);

  const pickPackSearch = page.getByTestId("pick-pack-search-input");
  const hasPickPackSearch = await pickPackSearch.isVisible().catch(() => false);

  if (hasPickPackSearch) {
    // Pick-pack page has its own search — Cmd+K should focus it
    const isFocused = await pickPackSearch.evaluate(
      (el) => document.activeElement === el
    );
    expect(isFocused).toBe(true);
  } else {
    // Fallback: command palette should open
    const paletteInput = page.locator('[cmdk-input]')
      .or(page.locator('input[placeholder*="command or search" i]'));
    const paletteVisible = await paletteInput.first().isVisible().catch(() => false);
    expect(paletteVisible).toBeTruthy();
  }
});
```

**Design decisions**:
- Uses `getByTestId("pick-pack-search-input")` — the exact test ID from the implementation
- Falls back to command palette check if search input isn't rendered (e.g., no orders state)
- Uses `evaluate` for focus check — matches existing test pattern from line 43
- Auth uses `loginAsAdmin` from `beforeEach` — pick-pack should be accessible to admin

**Acceptance Criteria**:
- [ ] New test case added in `"Cmd+K Focus Behavior"` describe block
- [ ] Test checks `pick-pack-search-input` focus specifically
- [ ] Fallback to command palette if search not visible
- [ ] No `test.skip()` — the test should always validate something

🔒 **GATE 2**: Paste the full added test code.

---

## Task 3: Include `/pick-pack` in Cross-Page Consistency Test

**What**: Add `/pick-pack` to the pages array in the cross-page consistency test.
**File**: `tests-e2e/golden-flows/cmd-k-enforcement.spec.ts`

**Current** (line 221):
```typescript
const pages = ["/orders", "/inventory", "/clients", "/accounting/invoices"];
```

**Target**:
```typescript
const pages = ["/orders", "/inventory", "/clients", "/accounting/invoices", "/pick-pack"];
```

**Acceptance Criteria**:
- [ ] `/pick-pack` added to the pages array
- [ ] No other changes to the cross-page test

---

## Task 4: Full Verification

🔒 **GATE 3**: Run ALL and paste output:

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

## QA Protocol (2-Lens for Medium)

### Lens 1: Execution Path Tracing

Trace the new pick-pack test:

| Path | Condition | Outcome |
|------|-----------|---------|
| A | Pick-pack search input visible, focused after Cmd+K | PASS — asserts `isFocused === true` |
| B | Pick-pack search input visible, NOT focused after Cmd+K | FAIL — `expect(isFocused).toBe(true)` fails |
| C | Pick-pack search input not visible, palette opens | PASS — asserts palette visible |
| D | Pick-pack search input not visible, palette doesn't open | FAIL — `expect(paletteVisible).toBeTruthy()` fails |

Verify: No path silently passes without validating anything.

### Lens 2: Data Flow Analysis

- Does `process.platform` work correctly in Playwright's Node context? (Yes — it runs in Node, not browser)
- Does `document.activeElement` comparison work inside `evaluate`? (Yes — matches existing pattern on line 43)
- Is `/pick-pack` accessible with admin auth? (Check route definitions if uncertain)

---

## Rollback

```bash
git checkout -- tests-e2e/golden-flows/cmd-k-enforcement.spec.ts
```

---

## ✅ Completion Checklist

- [ ] ALL comma-separated locators replaced with `.or()` in entire file
- [ ] New "Cmd+K should focus search input on pick-pack page" test added
- [ ] Test checks `pick-pack-search-input` focus specifically
- [ ] `/pick-pack` added to cross-page consistency test
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No TODO/FIXME/HACK comments introduced
- [ ] No changes to `PickPackWorkSurface.tsx`

---

## RULES REPEATED

1. **NO PHANTOM VERIFICATION.** Show actual command output.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **SCOPE GUARD.** Only modify `cmd-k-enforcement.spec.ts`. Do NOT touch the implementation.
4. **EVERY locator with a comma MUST be converted to .or() — search the ENTIRE file.**
