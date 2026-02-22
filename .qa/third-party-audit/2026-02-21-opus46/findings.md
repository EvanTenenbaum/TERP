# Third-Party QA Audit Findings

**Auditor:** Claude Code Opus 4.6
**Date:** 2026-02-21
**Branch:** `codex/uiux-master-plan-v4-20260221`

---

## Findings by Severity

### P2 Findings (Significant Quality/Reliability Risk)

#### F-001: Database-dependent gates not independently verified

- **Severity:** P2
- **File path:** N/A (environment limitation)
- **Reproduction:** Run `pnpm gate:invariants`, `pnpm validate:schema`, `pnpm audit:schema-drift:strict`, `pnpm audit:schema-fingerprint:strict`, `pnpm test:schema` -- all fail with `ECONNREFUSED 127.0.0.1:3307`
- **Observed:** All 5 database-dependent commands fail due to no MySQL instance available in audit environment
- **Expected:** These gates should pass green
- **Evidence:** `commands.log` sections for each command
- **Fix recommendation:** Re-run in an environment with MySQL (CI pipeline, staging, or local Docker). The branch's own QA evidence claims these passed in `.qa/runs/2026-02-21/phase-6/P6-schema-strict-rerun-23/verification.md` -- verify by reproduction.

#### F-002: E2E tests and runtime evidence not independently reproduced

- **Severity:** P2
- **File path:** `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`, `tests-e2e/golden-flows/gf-002-procure-to-pay.spec.ts`
- **Reproduction:** `pnpm exec playwright test tests-e2e/golden-flows/...` -- requires running app server + database
- **Observed:** Cannot run E2E specs, domain oracles, or North Star evidence capture without live app
- **Expected:** Golden flow tests pass, Direct Intake stress path clean
- **Evidence:** Screenshots and verification.md files exist in `.qa/runs/` but could not be independently regenerated
- **Fix recommendation:** Execute E2E suite in staging/CI environment before merge. Direct Intake rapid-add/submit stress test is particularly important given DEF-P6-002.

#### F-003: Single monolithic commit with 551 files

- **Severity:** P2
- **File path:** Commit `0b65701`
- **Reproduction:** `git show --stat 0b65701`
- **Observed:** 551 files changed, 30,835 insertions, 2,869 deletions in a single commit. Includes code, docs, binary screenshots, zip archives, and QA artifacts.
- **Expected:** Smaller, atomic commits per CLAUDE.md git conventions
- **Evidence:** `git log origin/main...HEAD --stat`
- **Fix recommendation:** This cannot be retroactively fixed without force-push. For future waves, enforce smaller commits per phase. For this merge, the monolithic commit is acceptable given it passes all static verification gates. Consider squash-merge to clean the history.

---

### P3 Findings (Minor Issue/Process Debt)

#### F-004: Local machine paths in documentation

- **Severity:** P3
- **File path:** `docs/uiux-redesign/execution/FINAL_COMPLETION_DOSSIER.md:5`, `docs/uiux-redesign/execution/CONTROL_PLANE.md:4`
- **Reproduction:** `grep '/Users/evan' docs/uiux-redesign/execution/FINAL_COMPLETION_DOSSIER.md`
- **Observed:** References to `/Users/evan/spec-erp-docker/TERP/TERP-codex-calm-power/` in documentation
- **Expected:** Repo-relative paths only
- **Evidence:** Lines 5-6, 37-38, 74 of FINAL_COMPLETION_DOSSIER.md; line 4 of CONTROL_PLANE.md
- **Fix recommendation:** Replace absolute local paths with repo-relative paths. Non-blocking -- cosmetic only.

#### F-005: Dead hook code (pre-commit-qa-check.sh)

- **Severity:** P3
- **File path:** `.husky/pre-commit-qa-check.sh`
- **Reproduction:** `grep 'pre-commit-qa-check' .husky/pre-commit` -- not found
- **Observed:** Script exists but is never invoked by any hook. Contains branch-name validation and forbidden-pattern detection that are effectively dead code.
- **Expected:** Either wire into pre-commit hook or remove
- **Evidence:** Hook bypass audit analysis
- **Fix recommendation:** Either integrate into `.husky/pre-commit` or delete the file. The patterns it checks are enforced by CI, so this is defense-in-depth only.

#### F-006: VITE_APP_TITLE env variable not defined

- **Severity:** P3
- **File path:** `index.html`
- **Reproduction:** `pnpm build` -- warning: `%VITE_APP_TITLE% is not defined in env variables found in /index.html`
- **Observed:** Build warning about missing env variable
- **Expected:** Either define the variable or remove the reference
- **Evidence:** Build output in commands.log
- **Fix recommendation:** Add `VITE_APP_TITLE` to `.env` or `.env.example`, or remove the reference from `index.html`. Non-blocking warning.

#### F-007: Large vendor chunk size (2.3MB)

- **Severity:** P3
- **File path:** `dist/public/assets/vendor-DwZRymeq.js`
- **Reproduction:** `pnpm build` -- warning about chunks > 800KB
- **Observed:** vendor chunk 2,355KB, index chunk 1,510KB, react-vendor 956KB
- **Expected:** Chunks < 800KB per Vite recommendation
- **Evidence:** Build output
- **Fix recommendation:** Implement code splitting with `build.rollupOptions.output.manualChunks`. Not introduced by this branch -- pre-existing.

#### F-008: Pragmatic ESLint variance on E2E spec files

- **Severity:** P3
- **File path:** `tests-e2e/golden-flows/gf-001-direct-intake.spec.ts`
- **Reproduction:** Strict ESLint flat config does not include tests-e2e in TS project scope
- **Observed:** E2E spec files are linted with standard project ESLint, not strict config
- **Expected:** All touched files under strict lint
- **Evidence:** `.qa/runs/2026-02-21/phase-6/P6-direct-intake-remediation-37/notes.md`
- **Fix recommendation:** Extend strict ESLint config to include `tests-e2e/**/*.ts`. Documented variance with mitigation (strict lint on app source + full lane rerun).

---

### Pre-Existing Issues (NOT regressions -- flagged for awareness)

#### PRE-001: `input.userId` forbidden pattern in inventoryIntakeService.ts

- **Severity:** P3 (pre-existing)
- **File path:** `server/inventoryIntakeService.ts:342,361,408`
- **Observed:** 3 instances of `input.userId` (forbidden: actor from input). These existed on `origin/main` at lines 283, 302, 336 and were shifted by the transaction-retry refactor -- NOT newly introduced.
- **Fix recommendation:** Refactor to use `getAuthenticatedUserId(ctx)` in a dedicated remediation task.

#### PRE-002: Duplicated `isDuplicateEntryError()` utility function

- **Severity:** P3 (pre-existing pattern)
- **File path:** `server/_core/dbUtils.ts` and `server/inventoryIntakeService.ts`
- **Observed:** Identical helper function duplicated across two files.
- **Fix recommendation:** Consolidate into single shared utility in `server/_core/dbUtils.ts` and import from `inventoryIntakeService.ts`.
