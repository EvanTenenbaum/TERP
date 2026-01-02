# Atomic Resolution Roadmap: Schema Sync and Critical Bug Fixes

**Version:** 1.2 (High-Robustness QA)
**Date:** January 1, 2026
**Author:** Manus AI

## Executive Summary

This is the high-robustness version of the roadmap, incorporating deep-dive Redhat QA findings to mitigate high-risk deployment and migration issues. The plan is now structured to be **CLI-first** and ensures database integrity throughout the process.

**Goal:** Achieve 100% schema synchronization and unblock all critical workflows (Live Shopping, Quotes, Returns, Photography) with maximum safety.

**Total Estimated Time:** 20 hours (Excluding deployment time)

## Deep-Dive Redhat QA Findings & Improvements

| Finding | Risk | Improvement in v1.2 |
| :--- | :--- | :--- |
| **Manual SQL Execution Order** | High | Explicitly added `SET FOREIGN_KEY_CHECKS = 0` for safe application. |
| **Drizzle Journal Hash Mismatch** | High | Replaced manual journal sync with a `drizzle-kit generate` step to maintain integrity. |
| **Lack of CLI Tooling** | Medium | Added Phase 0 to create a dedicated automation script (`sync-schema.ts`). |
| **Incomplete Error Handling** | Low | Added a task to improve backend error reporting for better observability. |

## Phase 0: Automation & Process Fix (4 Hours)

This phase establishes the necessary tooling and fixes the process that led to the desync.

| Step | Task | Estimated Time | Dependencies | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **0.1** | **Create Schema Sync Script** | 2h | None | Develop `scripts/sync-schema.ts` to automate validation and application of the missing schema. |
| **0.2** | **Unify Migration Folders** | 1h | None | Move all semantic migrations from `drizzle/migrations/` to the main `drizzle/` folder to prevent future fragmentation. |
| **0.3** | **Improve Error Observability** | 1h | None | Integrate a basic Sentry/Logger mechanism for 500 errors to capture stack traces and prevent future blind spots. |

## Phase 1: Schema Synchronization (10 Hours)

The primary goal is to fix the fragmented migration history and ensure all required tables and columns exist in the production database.

| Step | Task | Estimated Time | Dependencies | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **1.0** | **Pre-Migration Backup** | 1h | None | **CRITICAL:** Perform a full database snapshot on DigitalOcean before any manual schema changes. |
| **1.1** | **Consolidate & Re-Generate** | 2h | 0.2 | Consolidate all SQL into a single file and run `drizzle-kit generate` to create a fresh, single migration that Drizzle recognizes. |
| **1.2** | **Fix Schema Exports** | 1h | None | Correct `drizzle/schema.ts` to properly export `productImages` and `vendorHarvestReminders` tables. |
| **1.3** | **Manual CLI Application** | 4h | 0.1, 1.1, 1.2 | **CRITICAL:** Execute `scripts/sync-schema.ts` which applies the consolidated SQL with `SET FOREIGN_KEY_CHECKS = 0` to the DigitalOcean database. |
| **1.4** | **Schema Health Check** | 1h | 1.3 | Run a comprehensive schema validation script against the live database to confirm all tables are present. |
| **1.5** | **Journal Synchronization** | 1h | 1.4 | The `scripts/sync-schema.ts` will automatically update the `__drizzle_migrations` table to reflect the new consolidated state. |

## Phase 2: Critical Bug Resolution (4 Hours)

This phase addresses the bugs that remain after the schema is fixed.

| Step | Task | Estimated Time | Dependencies | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **2.1** | **Fix Live Shopping Router** | 1h | 1.4 | Audit and fix the `liveShopping.ts` router logic. Focus on `sessionCartItems` foreign key constraints. |
| **2.2** | **Fix Quotes Finalize** | 1h | 1.4 | Audit and fix the `quotes.ts` router logic for the `Finalize Quote` action. Ensure `referred_by_client_id` is handled correctly. |
| **2.3** | **Fix Returns Processing** | 2h | 1.4 | Audit and fix the `returns.ts` router logic. Verify the `returnItems` table and its relationship to `batches`. |

## Phase 3: Frontend Integration & UX Gaps (2 Hours)

This phase integrates the components that were previously identified as missing or stubbed.

| Step | Task | Estimated Time | Dependencies | Notes |
| :--- | :--- | :--- | :--- | :--- |
| **3.1** | **Integrate Referral Credits** | 1h | 1.4 | Integrate and render the `<ReferralCreditsPanel>` component in the Order Creator page. Verify TRPC procedure registration. |
| **3.2** | **Fix Matchmaking UX** | 1h | None | Change the "Add Need" button on the Matchmaking page to correctly open the client need creation modal/form instead of redirecting to the Clients page. |

## Phase 4: Functional Stub Resolution (0 Hours)

*Note: Step 3.2 (Receipt Preview) and 4.1 (New Bill) are deferred to the next sprint to maintain focus on the critical schema and bug fixes.*

## Next Steps

Upon approval, the first action will be to execute **Step 0.1: Create Schema Sync Script** in the local repository.
