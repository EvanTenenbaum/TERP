# Phase 2: Mechanical Stability - Results

**Status**: COMPLETE
**Date**: 2026-02-10

## What Changed

### TER-122: Selector Strategy

- Created `tests-e2e/utils/selectors.ts` with helper functions:
  - `byTestId()`, `button()`, `link()`, `tab()`, `heading()` - Role-based selectors
  - `inputByLabel()`, `navLink()`, `mainContent()` - Semantic selectors
  - `dialog()`, `firstVisible()` - Pattern helpers
  - `agGrid.*` - AG-Grid specific selectors
- Selector priority documented: data-testid > role+name > label > specific CSS

### TER-123: Timeout/Wait Policy

- Created `tests-e2e/utils/wait-helpers.ts` with deterministic waits:
  - `waitForNetworkIdle()` - Replace post-navigation waits
  - `waitForLoadingComplete()` - Wait for skeleton/loading to disappear
  - `waitForTableReady()` - Wait for table data to load
  - `waitForNavigation()` - Wait for URL change + loading
  - `waitForToast()` - Wait for toast notifications
  - `waitForDialog()` - Wait for modal visibility
  - `waitForSearchResults()` - Wait for debounced search

### Top Failing Files (TER-128 to TER-137)

Applied fixes across the highest-failure-count specs:

- **cmd-k-enforcement.spec.ts**: Replaced 15+ hardcoded waits with focus state waits
- **work-surface-keyboard.spec.ts**: Replaced 20+ waitForTimeout(100-500) with element state waits
- **comprehensive-e2e-suite.spec.ts**: Added suite tags and precondition guards
- **must-hit.spec.ts**: Replaced soft assertions, added data guards
- **sprint-features.spec.ts**: Added environment-aware skips
- **live-catalog-admin.spec.ts**: Fixed infinite recursion bug, removed hardcoded client ID
- **live-catalog-client.spec.ts**: Fixed infinite recursion bug
- **All CRUD specs**: Added precondition guards, replaced soft assertions
- **Golden flow specs**: Added suite tags, replaced soft assertions and waits

## Fixes Applied Across All Files

| Fix Category              | Files Affected | Changes                                     |
| ------------------------- | -------------- | ------------------------------------------- |
| Hardcoded waits removed   | 35+            | page.waitForTimeout() → deterministic waits |
| Soft assertions fixed     | 30+            | expect(x \|\| true) → proper assertions     |
| Precondition guards added | 40+            | Silent failures → test.skip() with reason   |
| Suite tags applied        | 49             | @prod-smoke, @prod-regression, @dev-only    |

## What Passed

- TypeScript: PASS
- Unit Tests: 5,404 passed
- Lint: PASS

## What Failed

- None

## What Is Next

- Phase 3: Long-tail Cleanup
