# TER-241: Fix GF-006 Test Skip No-Op (False Pass)

**Classification**: Medium | **Mode**: STRICT | **Estimate**: 4h
**Linear**: TER-241 | **Wave**: 1 (zero-dependency, parallelizable)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails: STOP. Report the exact error.
4. **NO QA SKIPPING.** Run both QA lenses below.
5. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Read the full file first.
7. **SCOPE GUARD.** Only modify `tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts`.

---

## Mission Brief

The GF-006 Client Ledger Review test has two compounding problems:

1. **False pass via `test.skip()`**: At line 61, `test.skip(true, "Ledger surface not reachable...")` is called deep inside the test's conditional navigation logic. This means whenever the ledger isn't immediately visible (which may be ALWAYS in some deployments), the test skips and reports as "passed" — validating nothing.

2. **Comma-separated locators**: Lines 26-27, 37-38, 42-43, 53-54, 65-66, 77-78 all use comma-separated selectors inside `page.locator()` which are unreliable in Playwright.

**The test currently provides zero assurance that the client ledger works.** It must be rewritten to either validate the ledger flow OR fail clearly with an actionable message.

---

## Pre-Work: Understand the Client Ledger Flow

Before editing:

1. Read the full test: `tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts`
2. Read the Clients page to understand navigation: `client/src/pages/Clients.tsx` or `client/src/components/work-surface/ClientsWorkSurface.tsx`
3. Search for ledger-related components: `grep -rn "ledger\|Ledger" client/src/ --include="*.tsx" -l`
4. Check what `data-testid` attributes exist for ledger: `grep -rn "data-testid.*ledger" client/src/ --include="*.tsx"`

🔒 **GATE 0**: Before editing, answer:
- What is the actual navigation path to a client ledger?
- Are there `data-testid` attributes for the ledger tab/section?
- What does the ledger surface actually render?

---

## Task 1: Fix All Comma-Separated Locators

**What**: Replace every comma-separated locator with `.or()` chains.
**File**: `tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts`

**Lines to fix** (all comma-separated locators):

### Line 26-27 — Ledger tab
```typescript
// BEFORE
const ledgerTab = page.locator(
  'a:has-text("Ledger"), button:has-text("Ledger"), [data-testid="ledger-tab"]'
);

// AFTER
const ledgerTab = page.locator('[data-testid="ledger-tab"]')
  .or(page.locator('a:has-text("Ledger")'))
  .or(page.locator('button:has-text("Ledger")'));
```

### Line 37-38 — Open client button
```typescript
// BEFORE
const openClientButton = page
  .locator('button[aria-label*="Open"], td button, [aria-label*="View"]')
  .first();

// AFTER
const openClientButton = page.locator('[aria-label*="View"]')
  .or(page.locator('button[aria-label*="Open"]'))
  .or(page.locator('td button'))
  .first();
```

### Line 42-43 — Profile ledger button
```typescript
// BEFORE
const profileLedgerButton = page
  .locator('button:has-text("View Ledger"), a:has-text("View Ledger")')
  .first();

// AFTER
const profileLedgerButton = page.locator('button:has-text("View Ledger")')
  .or(page.locator('a:has-text("View Ledger")'))
  .first();
```

### Lines 53-55 — Ledger header
```typescript
// BEFORE
const ledgerHeader = page.locator(
  'h1:has-text("Ledger"), h2:has-text("Ledger"), :text("Client Ledger"), [data-testid="client-ledger"]'
);

// AFTER
const ledgerHeader = page.locator('[data-testid="client-ledger"]')
  .or(page.locator('h1:has-text("Ledger")'))
  .or(page.locator('h2:has-text("Ledger")'))
  .or(page.locator(':text("Client Ledger")'));
```

### Lines 65-66 — Filter control
```typescript
// BEFORE
const filterControl = page.locator(
  '[data-testid="ledger-filter"], select:has-text("All"), button:has-text("Filter")'
);

// AFTER
const filterControl = page.locator('[data-testid="ledger-filter"]')
  .or(page.locator('select:has-text("All")'))
  .or(page.locator('button:has-text("Filter")'));
```

### Lines 77-78 — Export button
```typescript
// BEFORE
const exportButton = page.locator(
  'button:has-text("Export"), button:has-text("Download"), [data-testid="ledger-export"]'
);

// AFTER
const exportButton = page.locator('[data-testid="ledger-export"]')
  .or(page.locator('button:has-text("Export")'))
  .or(page.locator('button:has-text("Download")'));
```

**Acceptance Criteria**:
- [ ] Zero comma-separated locators remain
- [ ] All multi-selector locators use `.or()`
- [ ] `data-testid` selectors are prioritized (listed first in `.or()` chains)

🔒 **GATE 1**: Paste output of:
```bash
grep -n 'locator(' tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts | grep ","
```
Expected: Zero lines with commas inside locator calls.

---

## Task 2: Fix the `test.skip()` False Pass

**What**: Restructure the test so it either validates the ledger or fails with an actionable message — never silently skips.
**File**: `tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts`

**Current problem**: The `test.skip()` at line 61 is buried inside nested conditionals. The test's execution path is:
1. Go to /clients → check for row → click row → look for ledger tab → if not found, try other buttons → if still not found, go to /client-ledger → check for ledger header → **if not visible, SKIP**.

This means the test passes (as skipped) whenever the navigation is slightly different from expectations.

**Fix approach**:

Restructure the test with clear phases:

```typescript
test("should navigate to client ledger and show ledger tools", async ({
  page,
}): Promise<void> => {
  // Phase 1: Navigate to clients list
  await page.goto("/clients");
  await page.waitForLoadState("networkidle");

  // Phase 2: Check if we have client data to test with
  const clientRow = page.locator('[role="row"]').or(page.locator('tr')).first();
  const hasClients = await clientRow.isVisible().catch(() => false);
  if (!hasClients) {
    test.skip(true, "No client data available — seed clients first");
    return;
  }

  // Phase 3: Navigate to a client's ledger
  await clientRow.click();
  await page.waitForLoadState("networkidle");

  // Try direct ledger tab first
  const ledgerTab = page.locator('[data-testid="ledger-tab"]')
    .or(page.locator('a:has-text("Ledger")'))
    .or(page.locator('button:has-text("Ledger")'));

  if (await ledgerTab.first().isVisible().catch(() => false)) {
    await ledgerTab.first().click();
    await page.waitForLoadState("networkidle");
  } else {
    // Try navigating to client-ledger directly
    await page.goto("/client-ledger");
    await page.waitForLoadState("networkidle");
  }

  // Phase 4: ASSERT the ledger is visible (this is the actual validation)
  const ledgerHeader = page.locator('[data-testid="client-ledger"]')
    .or(page.locator('h1:has-text("Ledger")'))
    .or(page.locator('h2:has-text("Ledger")'))
    .or(page.locator(':text("Client Ledger")'));

  // THIS IS THE KEY CHANGE: expect instead of conditional skip
  await expect(ledgerHeader.first()).toBeVisible({ timeout: 10000 });

  // Phase 5: Verify ledger tools exist (filter + export)
  const filterControl = page.locator('[data-testid="ledger-filter"]')
    .or(page.locator('select:has-text("All")'))
    .or(page.locator('button:has-text("Filter")'));

  const exportButton = page.locator('[data-testid="ledger-export"]')
    .or(page.locator('button:has-text("Export")'))
    .or(page.locator('button:has-text("Download")'));

  // At least one of filter or export should be present
  const hasFilter = await filterControl.first().isVisible().catch(() => false);
  const hasExport = await exportButton.first().isVisible().catch(() => false);
  expect(hasFilter || hasExport).toBeTruthy();
});
```

**Key principles of the rewrite**:
1. `test.skip()` only for "no test data" — a legitimate skip reason
2. The ledger header check is an `expect()` assertion, not a conditional skip
3. The test WILL FAIL if the ledger is unreachable — that's correct behavior
4. Ledger tools check uses `expect().toBeTruthy()` not conditional-then-skip

**Acceptance Criteria**:
- [ ] `test.skip()` only called for legitimate "no data" conditions
- [ ] No `test.skip()` for "ledger not reachable" — that should be a test failure
- [ ] Ledger header visibility is asserted with `expect()`, not conditionally checked
- [ ] At least one ledger tool (filter or export) is asserted present

🔒 **GATE 2**: Paste the full rewritten test code.

---

## Task 3: Full Verification

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

Trace ALL paths through the rewritten test:

| Path | Condition | Outcome |
|------|-----------|---------|
| A | No client rows visible | `test.skip("No client data")` — LEGITIMATE |
| B | Client row found, ledger tab visible | Click tab → assert header → assert tools |
| C | Client row found, no ledger tab, /client-ledger works | Navigate → assert header → assert tools |
| D | Client row found, no ledger tab, /client-ledger fails | `expect(header).toBeVisible()` FAILS — **correct behavior** |

Verify: Path D now FAILS the test instead of silently skipping.

### Lens 2: Data Flow Analysis

- Does `clientRow.first()` correctly match the first data row (not a header row)?
- Does the `.or()` chain for `ledgerTab` try all selectors?
- Is the 10000ms timeout sufficient for ledger page load?

---

## Rollback

```bash
git checkout -- tests-e2e/golden-flows/gf-006-client-ledger-review.spec.ts
```

---

## ✅ Completion Checklist

- [ ] Zero comma-separated locators remain
- [ ] All multi-selector locators use `.or()`
- [ ] `test.skip()` only used for "no client data" condition
- [ ] Ledger header visibility is `expect()`-asserted, not conditionally skipped
- [ ] At least one ledger tool asserted present
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No TODO/FIXME/HACK comments introduced

---

## RULES REPEATED

1. **NO PHANTOM VERIFICATION.** Show actual command output.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **SCOPE GUARD.** Only modify `gf-006-client-ledger-review.spec.ts`.
4. **The test must FAIL when ledger is unreachable, not silently skip.**
