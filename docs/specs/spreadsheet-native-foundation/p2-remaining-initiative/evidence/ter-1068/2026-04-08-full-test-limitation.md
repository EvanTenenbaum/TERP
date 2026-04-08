# TER-1068 Full Test Limitation

## Command

```bash
pnpm test
```

## Result

- Status: failed
- Failure lane: repo test harness reset and seed flow, not the TER-1068 change set

## Observed Failure

- The reset path reported `Table 'client_needs' already exists` during migration push.
- The subsequent seed attempt failed with `Table 'terp-test.users' doesn't exist` while `scripts/legacy/seed-realistic-main.ts` tried to insert the default seed user.
- The failing stack traces were inside:
  - `testing/db-util.ts`
  - `scripts/legacy/seed-realistic-main.ts`
  - Drizzle push / seed commands

## Why This Is Treated As A Limitation Packet

- The TER-1068 diff only touches sales UI filtering, saved-view serialization, and order-surface rendering:
  - `client/src/components/sales/*`
  - `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
  - `client/src/components/spreadsheet-native/SalesOrderSurface.tsx`
  - `server/routers/salesSheets.ts`
  - `server/salesSheetsDb.ts`
- No tranche edits touched the failing migration or seed harness files.
- Tranche-specific verification still passed:
  - `pnpm check`
  - `pnpm build`
  - `pnpm lint`
  - touched-surface Vitest (`40` tests)
  - browser proof bundle under `output/playwright/ter-1068-tranche1-2026-04-08/`

## Impact

- The full suite cannot currently be used as a green tranche-closeout signal in this worktree.
- TER-1068 still has strong targeted proof, but the repo-level `pnpm test` lane remains a known blocker until the reset/seed harness is repaired.

## Next Follow-Up

- Keep this limitation attached to the TER-1068 closeout packet and Linear writeback.
- Do not claim `pnpm test` passed for this tranche.
