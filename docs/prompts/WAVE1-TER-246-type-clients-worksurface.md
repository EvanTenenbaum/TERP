# TER-246: Type ClientsWorkSurface — Remove `any` Types

**Classification**: Medium | **Mode**: SAFE | **Estimate**: 4h
**Linear**: TER-246 | **Wave**: 1 (zero-dependency, parallelizable)

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something works, prove it with terminal output.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a ✅ with evidence. Check the list. Actually check it.
3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass, if anything unexpected happens: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every lens applicable to this task.
5. **NO HAPPY-PATH-ONLY TESTING.** You must verify the types work for ALL client type filter values, not just one.
6. **PROOF OF WORK.** At every verification gate marked with 🔒, you must paste the actual terminal output.
7. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it first. Do not assume you know what's in a file from context or memory.
8. **ONE THING AT A TIME.** Complete and verify each task before starting the next. Do not batch-implement and then batch-verify.

---

## Mission Brief

Remove the blanket `eslint-disable @typescript-eslint/no-explicit-any` from `ClientsWorkSurface.tsx` and replace all `any` type usage with proper TypeScript types derived from tRPC router return types.

**Scope**: ONE file only — `client/src/components/work-surface/ClientsWorkSurface.tsx`
**No other files should be modified** unless they export a type this file needs (and that type doesn't already exist).

---

## Pre-Work: Gather Context

Before writing any code:

1. Read the full file: `client/src/components/work-surface/ClientsWorkSurface.tsx`
2. Read the clients router to understand return types: `server/routers/clients.ts`
3. Search for existing client type definitions: `grep -r "ClientType\|clientType\|isSeller\|isBuyer" --include="*.ts" --include="*.tsx" server/ client/src/lib/ client/src/types/`
4. Identify the tRPC query being called (likely `trpc.clients.list` or similar)

🔒 **GATE 0**: Before editing anything, document:
- What tRPC procedure is called for the client list?
- What type does it return?
- What are the valid values for `typeFilter`?

---

## Task 1: Identify All `any` Usages

**What**: Catalog every `any` type in the file with line numbers.
**Acceptance Criteria**:
- [ ] Line 14: `/* eslint-disable @typescript-eslint/no-explicit-any */` identified
- [ ] All `typeFilter as any` casts identified (expected: lines ~457, 464, 506, 543)
- [ ] All `any` in mutation data handlers identified (expected: lines ~511, 518, 520, 521, 545, 559)
- [ ] Total count documented

**Verification Command**:
```bash
grep -n "any\|eslint-disable" client/src/components/work-surface/ClientsWorkSurface.tsx
```

---

## Task 2: Create Proper Type for `typeFilter`

**What**: Replace `typeFilter as any` with a properly typed union.
**Files**: `client/src/components/work-surface/ClientsWorkSurface.tsx`

**Approach**:
1. Check what the tRPC router accepts for `clientTypes` parameter
2. Create a type alias (e.g., `type ClientTypeFilter = 'buyer' | 'seller' | 'brand' | ...`)
3. Type the `typeFilter` state with this union plus `'all'`
4. Remove `as any` casts — the type should flow naturally

**Acceptance Criteria**:
- [ ] `typeFilter` state variable has explicit type annotation
- [ ] Zero `as any` casts remain for typeFilter
- [ ] The type matches what the tRPC router actually accepts

**Verification Command**:
```bash
grep -n "as any" client/src/components/work-surface/ClientsWorkSurface.tsx
```
Expected: zero matches for `typeFilter as any`

---

## Task 3: Type Mutation Data Handlers

**What**: Replace `any` in mutation/form data handlers with proper types.
**Files**: `client/src/components/work-surface/ClientsWorkSurface.tsx`

**Approach**:
1. For each mutation handler, trace the data flow to the tRPC mutation call
2. Use `Parameters<typeof trpc.clients.XXX.mutate>[0]` or the input schema type
3. If the tRPC router uses Zod schemas, use `z.infer<typeof schema>` patterns
4. For event handlers, use React's built-in types (`React.ChangeEvent<HTMLInputElement>`, etc.)

**Acceptance Criteria**:
- [ ] Zero `any` types remain in mutation data handlers
- [ ] All handler parameters have explicit types
- [ ] Types are derived from actual tRPC router schemas (not hand-crafted duplicates)

---

## Task 4: Remove the eslint-disable and Verify

**What**: Remove line 14's blanket eslint-disable and fix any remaining issues.
**Files**: `client/src/components/work-surface/ClientsWorkSurface.tsx`

**Acceptance Criteria**:
- [ ] Line `/* eslint-disable @typescript-eslint/no-explicit-any */` is DELETED
- [ ] No new eslint-disable comments added as replacement
- [ ] File compiles cleanly

**Verification Command**:
```bash
grep -n "eslint-disable" client/src/components/work-surface/ClientsWorkSurface.tsx
```
Expected: zero matches

🔒 **GATE 1**: Paste output of:
```bash
pnpm check 2>&1 | tail -20
```

---

## Task 5: Full Verification Suite

🔒 **GATE 2**: Run ALL of these and paste output:

```bash
pnpm check 2>&1 | tail -20
```

```bash
pnpm test -- --reporter=verbose 2>&1 | tail -30
```

```bash
pnpm build 2>&1 | tail -20
```

---

## QA Protocol (2-Lens for Medium)

### Lens 1: Static Pattern Scan
```bash
# Check for any remaining `any` types
grep -n "any" client/src/components/work-surface/ClientsWorkSurface.tsx | grep -v "// " | grep -v "Company\|company\|many\|Any"

# Check no eslint-disable remains
grep -n "eslint-disable" client/src/components/work-surface/ClientsWorkSurface.tsx

# Check no `as unknown as` escape hatches
grep -n "as unknown" client/src/components/work-surface/ClientsWorkSurface.tsx
```

### Lens 2: Data Flow Analysis
- Verify typeFilter flows correctly: state → query parameter → tRPC call
- Verify mutation data flows: form state → handler → tRPC mutation input
- Check that `'all'` case doesn't send invalid data to the API

---

## Fix Cycle

For each issue found by QA:
1. Fix the issue
2. Re-run the specific verification that failed
3. Paste the new output showing it passes

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report.

---

## Rollback

If things go wrong:
```bash
git checkout -- client/src/components/work-surface/ClientsWorkSurface.tsx
```

---

## ✅ Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] `/* eslint-disable @typescript-eslint/no-explicit-any */` removed from line 14
- [ ] Zero `as any` casts remain in file
- [ ] Zero `any` type annotations remain in file
- [ ] `typeFilter` has proper union type
- [ ] All mutation handlers have proper parameter types
- [ ] `pnpm check` passes (paste output)
- [ ] `pnpm test` passes (paste output)
- [ ] `pnpm build` passes (paste output)
- [ ] No new eslint-disable comments introduced
- [ ] No `as unknown as` escape hatches introduced
- [ ] No TODO/FIXME/HACK comments introduced

---

## RULES REPEATED — READ AGAIN

1. **NO PHANTOM VERIFICATION.** Show actual command output, not claims.
2. **NO PREMATURE COMPLETION.** Every checklist item needs evidence.
3. **ACTUALLY READ THE FILE BEFORE EDITING.**
4. **ONE THING AT A TIME.** Verify each task before proceeding.
