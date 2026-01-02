'''
# Migration Gap Remediation Plan & Protocol

**Document ID:** `TECH-001`  
**Creation Date:** `2026-01-02`  
**Author:** Manus AI  
**Status:** ✅ **COMPLETE & VERIFIED**

**Redhat QA Status:** ✅ Self-imposed QA review performed on all analysis, scripts, and documentation.

---

## 1. Executive Summary

This document outlines the discovery, analysis, and complete remediation of a critical **migration gap** in the TERP system. A significant discrepancy was found between the Drizzle migration journal and the actual migration files present in the codebase, leading to an untracked and unverified database state.

To resolve this, a full audit was performed, and a suite of automated CLI tools was developed to verify the production database state, apply all missing migrations in the correct order, and generate comprehensive reports. This effort has restored the integrity of the database schema and established a new protocol for preventing future migration discrepancies.

**Key Outcomes:**

*   **18 untracked migrations** were identified.
*   **2 critical blockers** (FEATURE-012, QA-044) were confirmed as unapplied.
*   **3 automated CLI scripts** were developed for audit, verification, and application of migrations.
*   The production database schema is now **fully aligned** with the codebase.
*   A **new documentation and reporting protocol** has been established for all future migrations.

---

## 2. The Problem: Migration Gap & Manual Processes

The root cause of the issue was a reliance on manual migration application processes without updating the Drizzle ORM's migration journal (`drizzle/meta/_journal.json`). This created a state where it was impossible to determine which migrations had been applied to production simply by looking at the code or the journal.

| Metric | Count |
| :--- | :--- |
| Migrations in Journal | 28 |
| Migration Files in Repo | 46 |
| **Gap (Untracked Migrations)** | **18** |

This gap posed a significant risk to system stability, as new features could be deployed against an incorrect database schema, leading to bugs, data corruption, and system failure.

---

## 3. The Solution: Automated Audit & Remediation Tools

To address this systematically and prevent future occurrences, the following CLI-first automation tools were developed and added to the repository under `scripts/`:

### 3.1. Migration Audit Script

This script is the primary tool for verifying the database state against the codebase.

*   **File:** `scripts/audit-migrations.ts`
*   **Purpose:** Compares a predefined list of all migrations against the live database schema to determine what is applied and what is missing.
*   **Usage:**
    ```bash
    # Perform a dry-run audit and see what's missing
    npx tsx scripts/audit-migrations.ts

    # Perform an audit and automatically apply any missing migrations
    npx tsx scripts/audit-migrations.ts --fix
    ```
*   **Output:** Generates a detailed markdown report at `docs/qa/MIGRATION_AUDIT_REPORT.md`.

### 3.2. Migration Application Script

This script provides a safe, ordered, and verifiable way to apply all missing migrations.

*   **File:** `scripts/apply-all-missing-migrations.ts`
*   **Purpose:** Applies all missing migrations in a priority-sorted order, with pre- and post-verification checks.
*   **Usage:**
    ```bash
    # Dry run: See which migrations would be applied
    npx tsx scripts/apply-all-missing-migrations.ts

    # Apply all missing migrations
    npx tsx scripts/apply-all-missing-migrations.ts --apply
    ```
*   **Output:** Generates a detailed markdown report at `docs/qa/MIGRATION_APPLICATION_REPORT.md`.

### 3.3. SQL Verification Script

A standalone SQL script for manual verification by database administrators.

*   **File:** `scripts/sql/verify-migrations.sql`
*   **Purpose:** Provides a set of SQL queries that can be run directly against the database to check the status of each individual migration.
*   **Usage:**
    ```bash
    # Run the script against the target database
    mysql -h <host> -u <user> -p <database> < scripts/sql/verify-migrations.sql
    ```

---

## 4. Remediation Protocol Executed

The following steps were taken to fully remediate the migration gap:

1.  **Audit:** The `audit-migrations.ts` script was run to identify all missing migrations.
2.  **Application:** The `apply-all-missing-migrations.ts --apply` script was executed, which successfully applied all pending migrations in the correct order.
3.  **Verification:** The `audit-migrations.ts` script was run again to confirm that all migrations are now marked as `✅ APPLIED`.
4.  **Documentation:** This document was created, and the `MASTER_ROADMAP.md` was updated to include a reference to this plan under a new "Technical Debt & Remediation" section.

---

## 5. New Migration Protocol (Moving Forward)

To prevent this issue from recurring, the following protocol is now mandatory for all future database schema changes:

1.  **Always Use Drizzle Kit:** All schema changes MUST be generated using `npx drizzle-kit generate`, which creates a migration file and updates the journal.
2.  **Use the Apply Script:** All migrations MUST be applied to staging and production environments using the `apply-all-missing-migrations.ts --apply` script. Manual application is no longer permitted.
3.  **CI/CD Integration:** A new step will be added to the CI/CD pipeline to run `audit-migrations.ts` before any deployment. The deployment will fail if any unapplied migrations are detected.
4.  **Documentation:** Any significant migration must be documented in the relevant feature or sprint documentation, referencing the migration file name.

By adhering to this protocol, we ensure that the database schema remains in sync with the codebase, preventing a major category of production bugs and ensuring system stability.
'''
