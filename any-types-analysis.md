# RF-003: Any Types Analysis

## Summary

**Total `any` types found:** 260 occurrences across the server codebase

## Top 10 Files by Any Type Count

| Count | File |
|-------|------|
| 31 | server/routers/dashboard.ts |
| 17 | server/routers/adminQuickFix.ts |
| 16 | server/routers/adminSchemaPush.ts |
| 12 | server/routers/adminMigrations.ts |
| 12 | server/recurringOrdersDb.ts |
| 12 | server/autoMigrate.ts |
| 10 | server/samplesDb.ts |
| 10 | server/salesSheetEnhancements.ts |
| 9 | server/productIntakeDb.ts |
| 9 | server/clientsDb.ts |

## Strategy

Given the large number of `any` types (260), we'll focus on the top 10 files as specified in the roadmap. This will address approximately 138 out of 260 occurrences (53%).

### Approach

1. Start with the highest-impact files (dashboard.ts, adminQuickFix.ts, etc.)
2. For each file, identify the context of each `any` type
3. Replace with proper TypeScript types based on usage
4. Run type checker after each file to ensure no regressions
5. Commit changes incrementally to track progress

### Common Patterns to Fix

- Database query results: Replace with proper Drizzle schema types
- Function parameters: Infer from usage or define explicit interfaces
- Event handlers: Use proper React event types
- API responses: Define response interfaces
- Generic utilities: Add proper type parameters
