# Team E: Infrastructure & Schema

**Session ID:** Session-20260126-TEAM-E-INFRA-RNtE3
**Agent:** Team E (Claude Opus 4.5)
**Started:** 2026-01-26
**Status:** In Progress
**Mode:** STRICT
**Branch:** claude/setup-team-e-infrastructure-RNtE3

## Tasks

- [ ] TERP-0004: Add notifications table to autoMigrate
- [ ] TERP-0006: Add cleanup migrations (0053/0054)
- [ ] TERP-0019: Verify MySQL identifier length limits
- [ ] PARTY-002: Add FK Constraints to Bills Table
- [ ] PARTY-003: Migrate Lots to Use supplierClientId
- [ ] BUILD-001: Add VITE_APP_TITLE env variable
- [ ] BUILD-002: Fix chunk size warnings
- [ ] BUILD-003: Add pnpm lint script
- [ ] OBS-001: Add GL Balance Verification Cron
- [ ] OBS-002: Add AR Reconciliation Check

## Progress Notes

### 2026-01-26 - Session Started

Initial assessment:
- autoMigrate.ts already has notifications table creation (lines 1127-1201)
- vite.config.ts already has manualChunks configured (lines 100-147)
- .env.example already has VITE_APP_TITLE (line 34)
- drizzle/ has migrations up to 0052
- lots table already has supplierClientId column with FK reference
- bills table uses deprecated vendorId, needs FK constraints

Working on infrastructure tasks...

## Rollback Plan

- All schema changes are additive (no data loss)
- Each migration has IF NOT EXISTS / idempotent operations
- Git revert available for any code changes

## Verification Checklist

- [ ] pnpm check passes
- [ ] pnpm lint passes (after BUILD-003)
- [ ] pnpm test passes
- [ ] pnpm build passes (no chunk warnings)
- [ ] All migrations tested
