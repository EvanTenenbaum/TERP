# Phase 3: Long-tail Cleanup - Results

**Status**: COMPLETE
**Date**: 2026-02-10

## What Changed

### File Tickets (TER-138 to TER-165)

Applied consistent fixes across all remaining spec files:

**Critical Paths (14 files):**

- accounting-quick-payment.spec.ts - Added @dev-only tag, precondition guards
- calendar-events.spec.ts - Added @prod-regression tag, fixed waits
- client-credit-workflow.spec.ts - Added @dev-only tag, fixed assertions
- feature-flags-workflow.spec.ts - Added @feature-flag tag, env awareness
- inventory-intake.spec.ts - Added @dev-only tag, data guards
- kpi-actionability.spec.ts - Added @prod-regression tag
- leaderboard.spec.ts - Added @prod-regression tag
- locations-management.spec.ts - Added @dev-only tag
- order-fulfillment-workflow.spec.ts - Added @dev-only tag, fixed waits
- pick-pack.spec.ts - Added @dev-only tag, precondition guards
- returns-workflow.spec.ts - Added @dev-only tag, fixed assertions
- sales-client-management.spec.ts - Added @dev-only tag
- sales-sheet-workflow.spec.ts - Added @dev-only tag
- sales-sheets-workflow.spec.ts - Added @dev-only tag
- vip-admin-impersonation.spec.ts - Added @prod-regression tag

**Golden Flows (12 files):**

- All 8 gf-\*.spec.ts files tagged @dev-only @golden-flow
- order-creation, order-to-invoice, invoice-to-payment, pick-pack-fulfillment
- Fixed soft assertions, hardcoded waits, added precondition guards

**RBAC (5 files):**

- All 5 RBAC specs tagged @prod-regression @rbac
- Added DEMO_MODE skip to all RBAC suites
- Fixed admin fallback masking in negative tests

## What Passed

- TypeScript: PASS
- Unit Tests: 5,404 passed

## What Failed

- None

## What Is Next

- Phase 4: Recurrence Prevention
