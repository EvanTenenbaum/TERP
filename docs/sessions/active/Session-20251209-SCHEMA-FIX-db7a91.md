# Session: SCHEMA-FIX - Critical Database Schema Repairs

**Status**: In Progress
**Started**: 2025-12-09
**Agent Type**: External (Claude Code)
**Platform**: Claude Code CLI
**Branch**: claude/review-database-structure-0111Kxvjumaw5uHbkWwAAZ4j
**Files**: drizzle/schema.ts, tsconfig.json

## Task Description

Fix critical database schema issues discovered during QA-validated database structure review:

1. **P0**: Add `drizzle/**/*` to tsconfig.json to enable schema type-checking
2. **P0**: Fix 45+ malformed `deletedAt` column definitions (botched soft delete merge)
3. **P0**: Remove 3 broken index definitions referencing non-existent columns

## Progress

- [x] Read all protocol files
- [x] Register session
- [ ] Create roadmap entry for schema fixes
- [ ] Fix #1: Add drizzle to tsconfig.json
- [ ] Fix #2: Repair malformed deletedAt columns
- [ ] Fix #3: Remove broken index definitions
- [ ] Run TypeScript validation on schema
- [ ] Commit and push changes
- [ ] Verify deployment is working
- [ ] Archive session

## Root Cause Analysis

The schema errors persisted because `drizzle/` folder was excluded from TypeScript type-checking in tsconfig.json. This allowed:
- Malformed soft delete columns (ST-013 merge error)
- Copy-paste index definition errors
- To go undetected during development and CI

## Files Being Modified

| File | Change | Risk |
|------|--------|------|
| `tsconfig.json` | Add drizzle to includes | Low |
| `drizzle/schema.ts` | Fix deletedAt columns, remove broken indexes | Medium |

## Validation Steps

1. `npx tsc drizzle/schema.ts --noEmit` should pass
2. Application should start without errors
3. Railway deployment should succeed

## Notes

Working from external platform (Claude Code) - following handoff protocol.
This is a READ-THEN-WRITE session - schema was reviewed first, now implementing fixes.
