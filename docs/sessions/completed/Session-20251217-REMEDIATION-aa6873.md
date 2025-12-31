# Session: Complete Soft-Delete Remediation

**Session ID**: Session-20251217-REMEDIATION-aa6873
**Task**: Complete soft-delete implementation across all arApDb functions
**Branch**: main
**Module**: server/arApDb.ts, drizzle/migrations
**Status**: 🟢 Active
**Started**: 2025-12-17
**ETA**: 2-3 hours

## Objective

Execute atomic remediation plan to address all gaps from post-implementation audit:

- Add soft-delete filters to 17 missed functions
- Create database indexes for performance
- Expand test coverage
- Full Red Hat QA validation

## Implementation Plan

1. ✅ Session registration
2. ⏳ Phase 1: Add soft-delete filters (17 functions) + QA gate
3. ⏳ Phase 2: Database index migration + QA gate
4. ⏳ Phase 3: Expand test coverage + QA gate
5. ⏳ Phase 4: Final Red Hat QA validation
6. ⏳ Deploy and monitor

## Files to Modify

- `server/arApDb.ts` - Add filters to 17 functions
- `drizzle/migrations/*.sql` - Add deletedAt indexes
- `server/arApDb.test.ts` - Expand test coverage

## QA Gates

Each phase includes:

- Automated validation
- Self-healing if issues found
- No advancement until gate passes

## Notes

- Following atomic remediation plan
- Red Hat QA gates after each step
- Self-healing before advancing
