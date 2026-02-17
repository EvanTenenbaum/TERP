# TER-242: Fix GF-007 Duplicate h1 / Locator Ambiguity

**Classification**: Simple | **Mode**: STRICT | **Estimate**: 2h
**Linear**: TER-242 | **Wave**: 1 (zero-dependency, parallelizable)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails: STOP. Report the exact error.
4. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
5. **ACTUALLY READ FILES BEFORE EDITING.**
6. **INVESTIGATION FIRST.** This task requires investigation before coding. Do the investigation.

---

## Mission Brief

The GF-007 Inventory Management test uses `page.locator('h1:has-text("Inventory")')` which Linear reports as matching a "duplicate h1." The test also has comma-separated locators that need the `.or()` fix.

**Critical**: Static analysis of `Inventory.tsx` shows only ONE `<h1>` at line 636. The duplicate may come from:
- A layout shell or breadcrumb component rendering a second h1 at runtime
- A sidebar/navigation element
- A dynamically loaded component
- OR the issue may already be fixed

**You MUST investigate before coding.**

---

## Pre-Work: Investigation Phase

### Step 1: Read all relevant files

1. `tests-e2e/golden-flows/gf-007-inventory-management.spec.ts`
2. `client/src/pages/Inventory.tsx` (search for ALL heading elements: h1, h2, h3)
3. Layout components that wrap Inventory:
   ```bash
   grep -rn "Inventory\|inventory" client/src/components/ --include="*.tsx" -l
   grep -rn "<h1" client/src/components/layout/ client/src/components/ui/ --include="*.tsx" 2>/dev/null
   grep -rn "PageHeader\|page-header\|PageTitle" client/src/ --include="*.tsx" -l
   ```

### Step 2: Check for runtime h1 duplication

Search for any component that could add a heading to the page:
```bash
# Check if there's a layout wrapper that adds page titles
grep -rn "h1\|<h1" client/src/App.tsx client/src/layouts/ client/src/components/layout/ --include="*.tsx" 2>/dev/null

# Check for PageHeader/PageTitle components
grep -rn "PageHeader\|PageTitle\|pageTitle" client/src/ --include="*.tsx" | head -20

# Check the router setup for any title injection
grep -rn "inventory" client/src/App.tsx --include="*.tsx" -i
```

### Step 3: Check sidebar for heading text
```bash
grep -rn "Inventory" client/src/components/ --include="*.tsx" | grep -i "h1\|heading\|title"
```

🔒 **GATE 0**: Before editing, report your findings:
- How many `<h1>` elements contain "Inventory" in the full rendered page?
- If only 1: document where it is and that no duplicate exists
- If 2+: document where each one comes from

---

## Task 1: Fix Comma-Separated Locators in GF-007 Test

**What**: Replace comma-separated locators with `.or()` chains.
**File**: `tests-e2e/golden-flows/gf-007-inventory-management.spec.ts`

### Line 21 — Header locator
The current locator `h1:has-text("Inventory")` uses a single selector (no comma issue here).

If investigation found a DUPLICATE h1, make the locator more specific:
```typescript
// If duplicate exists, use a more specific selector:
const header = page.locator('[data-testid="inventory-header"]')
  .or(page.locator('main h1:has-text("Inventory")'));
```

If NO duplicate found, leave this locator as-is.

### Lines 28-29 — Adjust button (comma-separated)
```typescript
// BEFORE
const adjustButton = page.locator(
  'button:has-text("Adjust"), button:has-text("Edit"), button:has-text("Update Qty")'
);

// AFTER
const adjustButton = page.locator('button:has-text("Adjust")')
  .or(page.locator('button:has-text("Edit")'))
  .or(page.locator('button:has-text("Update Qty")'));
```

### Line 24 — Row locator (comma-separated)
```typescript
// BEFORE
const batchRow = page.locator('[role="row"], tr').first();

// AFTER
const batchRow = page.locator('[role="row"]').or(page.locator('tr')).first();
```

**Acceptance Criteria**:
- [ ] Zero comma-separated locators remain
- [ ] If duplicate h1 found: h1 locator made specific OR duplicate removed from Inventory.tsx
- [ ] If no duplicate h1: documented in completion notes, h1 locator left as-is or made more specific

**Verification Command**:
```bash
grep -n 'locator(' tests-e2e/golden-flows/gf-007-inventory-management.spec.ts | grep ","
```

🔒 **GATE 1**: Paste the grep output.

---

## Task 2: (Conditional) Fix Duplicate h1 in Inventory.tsx

**Only if investigation found a duplicate h1:**

- Identify which h1 is the "real" page title
- Remove the duplicate
- Add `data-testid="inventory-header"` to the remaining h1

**If no duplicate was found:** Skip this task and document the finding.

---

## Task 3: Full Verification

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
grep -n 'locator(' tests-e2e/golden-flows/gf-007-inventory-management.spec.ts

# Verify .or() usage
grep -n '\.or(' tests-e2e/golden-flows/gf-007-inventory-management.spec.ts

# Count h1 elements in Inventory.tsx
grep -cn "<h1" client/src/pages/Inventory.tsx
```

---

## Rollback

```bash
git checkout -- tests-e2e/golden-flows/gf-007-inventory-management.spec.ts
git checkout -- client/src/pages/Inventory.tsx  # only if modified
```

---

## ✅ Completion Checklist

- [ ] Investigation completed: duplicate h1 status documented
- [ ] Comma-separated locators fixed in GF-007 test
- [ ] If duplicate h1 found: removed from Inventory.tsx
- [ ] If no duplicate: documented as "not reproducible statically"
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)

---

## RULES REPEATED

1. **INVESTIGATE BEFORE CODING.** Do not assume the duplicate h1 exists or doesn't.
2. **NO PHANTOM VERIFICATION.** Show actual command output.
3. **SCOPE GUARD.** Only modify the two files mentioned.
