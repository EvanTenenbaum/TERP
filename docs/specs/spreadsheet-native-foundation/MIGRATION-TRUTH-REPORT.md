# Migration Truth Report

Generated from [`generated/migration-source-inventory.csv`](./generated/migration-source-inventory.csv) on March 14, 2026.

## Findings

- total migration-source records: `146`
- top-level Drizzle SQL files: `51`
- nested `drizzle/migrations/*.sql` files: `67`
- journal entries: `28`
- root files with journaled prefixes: `36`
- root files with unjournaled prefixes: `34`
- nested files classified as `legacy-reference`: `33`
- nested files classified as `outside-fork-scope`: `15`

## Explicit Foundation Decision

For the spreadsheet-native fork, migration truth is defined as:

1. `drizzle/schema*.ts` is the current schema authority.
2. `drizzle/*.sql` is the primary repo-level migration history to reconcile against that schema.
3. `drizzle/meta/_journal.json` is useful metadata, but it is incomplete and must not be treated as sufficient migration truth on its own.
4. `drizzle/migrations/*.sql` is reference-only until a specific file is explicitly promoted or reconciled.

## Why This Decision Is Necessary

The journal only records `28` entries, ending at `0044_add_admin_impersonation_tables`, while repo migration reality continues through prefix `0061`.

That means a journal-only view would understate live schema history and create false confidence.

## Fork Rule

- No pilot implementation may rely on journal completeness.
- No new schema work may proceed without checking all three sources:
  - `drizzle/schema*.ts`
  - `drizzle/*.sql`
  - `drizzle/meta/_journal.json`
- Any schema cleanup wave must reconcile the journal as part of the same change set.

## Cleanup Recommendation

Schema cleanup is **not required** to begin the foundation phase.

Schema cleanup **is required before any approved fork-specific migration wave**.

Until then, the correct posture is:

- classify
- document
- avoid accidental expansion
- do not pretend the migration history is cleaner than it is
