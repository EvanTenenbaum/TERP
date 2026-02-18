# Wave 9: E2E Test Stabilization — Agent Launch Prompt

## Wave Summary

**Wave**: 9 — E2E Test Stabilization
**Priority**: P2 — HIGH
**Estimate**: 8h total
**Mode**: STRICT
**Tasks**: TER-238, TER-240, TER-241, TER-242, TER-243

## Pre-Flight

1. Read `CLAUDE.md` in the repo root — this is MANDATORY before any work
2. Read this wave's task prompts in `docs/prompts/`:
   - `WAVE9-TER-238-fix-gf001-brittle-count.md`
   - `WAVE9-TER-240-fix-gf005-invalid-locators.md`
   - `WAVE9-TER-241-fix-gf006-client-ledger.md`
   - `WAVE9-TER-242-fix-gf007-duplicate-h1.md`
   - `WAVE9-TER-243-fix-cmdk-pick-pack-focus.md`
3. Pull latest: `git pull origin main`

## Execution Order

These tasks can be executed in any order. Recommended grouping:

**Batch A** (test-only, no production code):
- TER-238: Fix brittle row-count in GF-001
- TER-240: Fix invalid locators in GF-005

**Batch B** (component + test):
- TER-242: Fix duplicate h1 in WorkSurfaces (touches ~10 component files)
- TER-241: Fix GF-006 client ledger (adds data-testid + rewrites test)
- TER-243: Fix Cmd+K focus in PickPack (touches component + CommandPalette)

## Verification Protocol

After EACH task, run:
```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

All 4 must pass before moving to the next task.

After ALL tasks complete, run the full suite one final time and report:

```
VERIFICATION RESULTS
====================
TypeScript: ✅ PASS | ❌ FAIL
Lint:       ✅ PASS | ❌ FAIL
Tests:      ✅ PASS | ❌ FAIL
Build:      ✅ PASS | ❌ FAIL
```

## Commit Strategy

One commit per task using conventional commit format:
```
fix(e2e): <description> (TER-XXX)
```

Or batch commits by logical grouping if tasks are trivially small.

## Definition of Done

- [ ] All 5 tasks implemented per their prompt specifications
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes (0 new errors in changed files)
- [ ] `pnpm test` passes (all tests green)
- [ ] `pnpm build` succeeds
- [ ] All changes committed and pushed
