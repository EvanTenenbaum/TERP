# FORGED PROMPT: BUG-001 — Direct Intake API Fix

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" without showing ACTUAL COMMAND and ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" until EVERY checklist item has evidence.
3. **NO SILENT ERROR HANDLING.** If anything fails: STOP. Report the exact error.
4. **NO QA SKIPPING.** The QA protocol below is NOT optional. Run every lens.
5. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
6. **ACTUALLY READ FILES BEFORE EDITING.** Read every file before modifying it.
7. **ONE THING AT A TIME.** Complete and verify each task before the next.

---

## MISSION BRIEF

**Bug:** All `inventory.intake` API calls fail with "An unexpected error occurred. Please try again."
**Impact:** 9 test failures, blocks ALL inventory creation and downstream operations
**Risk Level:** CRITICAL (RED mode — database transactions, financial data)

### Error Chain (verified from code)

```
1. Router: server/routers/inventory.ts:972-1005
   → Calls processIntake() at line 983
   → On failure: handleError(error, "inventory.intake") at line 1002

2. Service: server/inventoryIntakeService.ts:90-380
   → Transaction at lines 107-371
   → Catch at line 374 throws: new Error("Failed to process intake: ...")
   → This is a RAW Error, NOT a TRPCError

3. Error Handler: server/_core/errors.ts:323-328
   → Catches `instanceof Error` at line 323
   → Converts to generic: "An unexpected error occurred. Please try again."
   → REAL error message is HIDDEN from client
```

### Why the Real Error is Hidden

`inventoryIntakeService.ts:376` throws `new Error(...)` which is a plain JS Error.
`errors.ts:323` matches `instanceof Error` and replaces the message with a generic one.
If it threw `TRPCError` instead, `errors.ts:315` would preserve the original message.

---

## TASK LIST

### Task 1: Identify the Root Cause

**What**: Determine which operation inside the transaction actually fails.
**Files**: `server/inventoryIntakeService.ts`

The transaction (`lines 107-371`) has these sequential operations:
1. `findOrCreate` vendor (line 110-115)
2. `findOrCreate` brand (line 119-124)
3. `findOrCreate` product (line 133-147)
4. Generate lot code + create lot (line 151-178)
5. Generate batch code + SKU collision check (line 181-217)
6. INSERT batch (line 225-261)
7. INSERT productImages (lines 273-287) — conditional
8. INSERT batchLocations (lines 290-298)
9. INSERT auditLogs (lines 301-308)
10. Create payable for CONSIGNED (lines 311-361) — conditional, wrapped in try/catch

**Action**: Add temporary diagnostic logging BEFORE each operation to identify which one fails. Or better: read the `findOrCreate` utility to check if it has column issues.

**Verification**: Read `findOrCreate` utility, check if any of the INSERT operations reference columns that don't exist in the production database (e.g., `strainId` was already removed at line 131-146, but there may be other mismatches from the recent `db297f4` schema alignment commit).

🔒 **GATE 1**: Show the actual root cause you identified with evidence (schema mismatch, missing column, etc.)

---

### Task 2: Fix the Root Cause

**What**: Fix whatever INSERT/query is failing inside the transaction.
**Files**: Depends on Task 1 findings
**Acceptance Criteria**:
- [ ] The specific failing operation is fixed
- [ ] No new columns are added to schema (fix the INSERT, not the schema)
- [ ] Fix matches the pattern used in working operations elsewhere

**Verification Command**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 2**: Paste `pnpm check` output showing 0 errors.

---

### Task 3: Fix Error Propagation

**What**: Change `inventoryIntakeService.ts:374-378` to throw TRPCError instead of raw Error so meaningful messages reach the client.
**Files**: `server/inventoryIntakeService.ts`

**Current (broken)**:
```typescript
// line 374-378
} catch (error) {
    logger.error({ error }, "Error processing intake");
    throw new Error(
      `Failed to process intake: ${error instanceof Error ? error.message : "Unknown error"}`
    );
}
```

**Fix**: Re-throw TRPCErrors as-is, wrap other errors in TRPCError:
```typescript
} catch (error) {
    logger.error({ error }, "Error processing intake");
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to process intake: ${error instanceof Error ? error.message : "Unknown error"}`,
      cause: error,
    });
}
```

**Acceptance Criteria**:
- [ ] TRPCErrors from nested operations (e.g., account lookup failures) propagate with original message
- [ ] Non-TRPCErrors are wrapped with descriptive message including root cause
- [ ] Import `TRPCError` from `@trpc/server` is added if not present

**Verification Command**:
```bash
pnpm check 2>&1 | tail -5
```

🔒 **GATE 3**: Paste `pnpm check` output.

---

### Task 4: Full Verification Suite

**What**: Run complete verification to ensure nothing is broken.
**Acceptance Criteria**:
- [ ] `pnpm check` — 0 TypeScript errors
- [ ] `pnpm lint` — 0 ESLint errors
- [ ] `pnpm test` — all tests pass (or same count as before)
- [ ] `pnpm build` — build succeeds

**Verification Commands**:
```bash
pnpm check 2>&1 | tail -5
pnpm lint 2>&1 | tail -5
pnpm test 2>&1 | tail -20
pnpm build 2>&1 | tail -10
```

🔒 **GATE 4**: Paste ALL FOUR command outputs.

---

## QA PROTOCOL (5-LENS)

### Lens 1: Static Pattern Scan
Run against your changes:
- [ ] No `any` types introduced
- [ ] No fallback user IDs (`ctx.user?.id || 1`)
- [ ] No hard deletes
- [ ] TRPCError import is present
- [ ] No console.log statements

### Lens 2: Execution Path Tracing
Trace the full intake flow:
- `inventory.ts:972` → `processIntake()` → transaction → each INSERT → catch → `handleError`
- Verify every path through the catch block now surfaces useful error info

### Lens 3: Data Flow Analysis
- What happens when `findOrCreate` finds an existing record? (should return it)
- What happens when `findOrCreate` creates a new record? (should INSERT and return)
- What happens when batch INSERT fails? (should now throw TRPCError with message)
- What happens when batchLocations INSERT fails? (should roll back transaction)

### Lens 4: Adversarial Scenarios
Your fix should handle all of these:
1. Missing vendor name (empty string)
2. Duplicate SKU collision
3. Invalid product category
4. Database connection timeout mid-transaction
5. Missing column in batch INSERT (the likely root cause)

### Lens 5: Blast Radius
- Does this change affect any other code that calls `processIntake()`?
- Does changing the error type (Error → TRPCError) break any catch blocks upstream?
- Check `server/routers/inventory.ts:1000-1003` — the catch block there calls `handleError()` which already handles TRPCError (line 315 of errors.ts)

---

## FIX CYCLE

For each issue found by QA:
1. Fix the issue
2. Re-run verification
3. Paste output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## ✅ COMPLETION CHECKLIST

- [ ] Root cause identified with evidence
- [ ] Root cause fixed
- [ ] Error propagation fixed (TRPCError instead of raw Error)
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] QA 5-lens protocol completed
- [ ] No `any` types, no console.logs, no TODO/FIXME introduced

---

## MANDATORY RULES REPEATED

1. NO PHANTOM VERIFICATION — show actual output
2. NO PREMATURE COMPLETION — every checkbox needs evidence
3. NO SILENT ERROR HANDLING — stop and report failures
4. PROOF OF WORK at every 🔒 gate
5. READ files before editing
