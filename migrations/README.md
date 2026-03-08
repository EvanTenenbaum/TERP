# Orphaned Migration Files

These SQL migration files exist outside the Drizzle-managed `drizzle/migrations/` directory.
They are NOT tracked by drizzle-kit and their application status is UNKNOWN.

## Status Audit (2026-03-08)

All tables, columns, and indexes defined in these SQL files are confirmed present in the
Drizzle schema (`drizzle/schema.ts`). These files are **OBSOLETE** — the schema is managed
by Drizzle Kit and these manual SQL files are no longer needed.

| File                              | Purpose                                                   | Status                                  | Drizzle Schema Location          |
| --------------------------------- | --------------------------------------------------------- | --------------------------------------- | -------------------------------- |
| 001_needs_and_matching_module.sql | Creates client_needs, vendor_supply, match_records tables | OBSOLETE                                | schema.ts lines 4131, 4206, 4275 |
| add_strainId_to_client_needs.sql  | Adds strainId FK column to client_needs table             | OBSOLETE                                | schema.ts line 4141              |
| add_strain_family_support.sql     | Adds parentStrainId and baseStrainName to strains table   | OBSOLETE                                | schema.ts lines 432-433          |
| add_strain_indexes.sql            | Adds performance indexes on strains and products tables   | OBSOLETE                                | schema.ts index definitions      |
| create_strain_views.sql           | Creates 4 SQL views for strain family aggregation         | KEEP (SQL views not managed by Drizzle) |

**Resolution**: Files confirmed obsolete on 2026-03-08 by schema cross-reference. The SQL view
file (`create_strain_views.sql`) should be retained since Drizzle Kit does not manage SQL views.
The remaining 4 files can be safely deleted once verified against the production database.

See `docs/runbooks/PRODUCTION_MIGRATION_RUNBOOK.md` for the correct procedure to run migrations
against the DigitalOcean Managed Database.

---

## Non-SQL Files in drizzle/migrations/

The following files should not live inside `drizzle/migrations/` because drizzle-kit may attempt
to process or validate them. They are documented here for visibility:

| File                                                                 | Type            | Purpose                                                                    | Recommended Location |
| -------------------------------------------------------------------- | --------------- | -------------------------------------------------------------------------- | -------------------- |
| drizzle/migrations/0007_DEPLOYMENT_INSTRUCTIONS.md                   | Markdown        | Deployment guide for migration 0007 (calendar recurrence index)            | docs/migrations/     |
| drizzle/migrations/0007_add_calendar_recurrence_index.test.ts        | TypeScript test | Verifies idx_recurrence_parent_date index on calendar_recurrence_instances | tests/migrations/    |
| drizzle/migrations/0060_add_batch_quantity_check_constraints.test.ts | TypeScript test | Verifies CHECK constraints on batches quantity columns (ST-056)            | tests/migrations/    |

These files have NOT been moved to avoid breaking any existing references or CI pipelines.
A follow-up task should move them to their recommended locations.

---

## Rollback Files in drizzle/migrations/

The following rollback scripts exist in the Drizzle migrations directory:

| File                                                            | Purpose                                                                   | Notes                                       |
| --------------------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------- |
| drizzle/migrations/0021_rollback_feature_flags.sql              | Drops all feature*flag*\* tables                                          | Destructive — removes all feature flag data |
| drizzle/migrations/0022_rollback_admin_impersonation_tables.sql | Drops admin_impersonation_actions and admin_impersonation_sessions tables | For FEATURE-012 rollback                    |

Rollback files are kept alongside their corresponding forward migrations for reference. They should
only be executed manually when an explicit rollback is required, following the production migration
runbook.
