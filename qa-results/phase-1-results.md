# Phase 1: Signal Integrity - Results

**Status**: COMPLETE
**Date**: 2026-02-10

## What Changed

### TER-120: Suite Separation

- Added `prod-smoke` and `prod-regression` projects to playwright.config.ts
- Created `tests-e2e/utils/test-tags.ts` with tag system (prod-smoke, prod-regression, dev-only, rbac, golden-flow, feature-flag)
- Applied tags to all 49 spec files based on their mutation behavior:
  - Read-only tests: `@prod-smoke` or `@prod-regression`
  - Data-mutating tests: `@dev-only`
  - RBAC tests: `@rbac`
  - Golden flow tests: `@golden-flow`

**Run commands:**

- `npx playwright test --project=prod-smoke` - Safe for production
- `npx playwright test --project=prod-regression` - Extended production tests
- `npx playwright test --grep @dev-only` - Local/staging only

### TER-121: Precondition Guards

- Created `tests-e2e/utils/preconditions.ts` with helpers:
  - `skipUnless()` - Skip with clear reason
  - `skipInProduction()` - Skip data-mutating tests in prod
  - `skipInDemoMode()` - Skip RBAC tests when DEMO_MODE active
  - `requireDataRows()` - Skip when no data available
  - `requireElement()` - Skip when required element absent
  - `requireAuthenticated()` - Skip when auth failed
  - `requireFeature()` - Skip when feature not available

### TER-124: Auth/Session Contract Alignment

- Created `tests-e2e/ENVIRONMENT_CONTRACT.md` documenting:
  - Environment detection (local/staging/production)
  - Authentication modes (standard vs DEMO_MODE)
  - QA accounts and their roles
  - Session management expectations

### TER-125: Feature-Flag Awareness

- Created `tests-e2e/utils/environment.ts` with:
  - `detectEnvironment()` - Determines local/staging/production
  - `DEMO_MODE_EXPECTED` - Whether DEMO_MODE is active
  - `IS_CLOUD`, `IS_PRODUCTION`, `IS_REMOTE` flags
- Tests now use `requireFeature()` for optional features

### TER-126: RBAC Contract Alignment

- All 5 RBAC spec files updated with DEMO_MODE skip
- Added `@rbac` tag to RBAC test suites
- Documented RBAC contract in ENVIRONMENT_CONTRACT.md

## What Passed

- TypeScript: PASS
- Unit Tests: 5,404 passed
- Lint: PASS on all new files

## What Failed

- None

## What Is Next

- Phase 2: Mechanical Stability
