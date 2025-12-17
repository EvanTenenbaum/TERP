# Session: Dashboard Soft-Delete Filter Fix

**Session ID**: Session-20251217-DASHBOARD-FIX-90d4e2
**Task**: Fix dashboard data queries to filter soft-deleted records
**Branch**: main
**Module**: server/arApDb.ts, server/clientsDb.ts
**Status**: ✅ Complete
**Started**: 2025-12-17
**ETA**: 2 hours

## Objective

Implement soft-delete filtering in dashboard data queries to restore missing data after canonical model unification.

## Root Cause

Dashboard widgets showing no data due to missing `deletedAt IS NULL` filters in:

- `server/arApDb.ts`: `getInvoices()`, `getPayments()`
- Related queries that pull dashboard data

## Implementation Plan

1. ✅ Session registration
2. ✅ Write tests for soft-delete filtering (TDD)
3. ✅ Implement filters in arApDb.ts
4. ✅ Run tests and validate
5. ✅ Red Hat QA validation
6. ✅ Commit and push with verification

## Files Modified

- `server/arApDb.ts` - Add soft-delete filters
- `server/arApDb.test.ts` - Add test coverage

## Testing Strategy

- Unit tests for getInvoices/getPayments with soft-deleted records
- Integration test for dashboard data flow
- Manual verification on production

## Notes

- Following TDD approach
- Red Hat QA validation before commit
- No breaking changes expected
