# Database Migration & Rollback Procedures

**Version:** 1.0  
**Date:** November 7, 2025  
**Author:** Manus AI  

## 1. Introduction

This document establishes the formal procedures for managing database schema changes in the TERP system. It covers the complete lifecycle of migrations from development through production deployment, including emergency rollback procedures.

## 2. Migration Tools

The TERP system uses **Drizzle ORM** with **Drizzle Kit** for schema management and migrations.

### 2.1. Configuration

The migration configuration is defined in `drizzle.config.ts`:

```typescript
{
  schema: ["./drizzle/schema.ts", "./drizzle/schema-vip-portal.ts"],
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: { url: process.env.DATABASE_URL }
}
```

### 2.2. Key Commands

| Command                    | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `pnpm drizzle-kit generate`| Generate a new migration from schema changes |
| `pnpm drizzle-kit migrate` | Apply pending migrations to the database     |
| `pnpm drizzle-kit push`    | Push schema directly (dev only, no history)  |
| `pnpm drizzle-kit studio`  | Open Drizzle Studio for database inspection  |

## 3. Migration Workflow

### 3.1. Development Phase

1.  **Modify Schema Files**
    - Update `drizzle/schema.ts` or `drizzle/schema-vip-portal.ts`
    - Follow existing patterns and naming conventions
    - Add appropriate indexes and constraints

2.  **Generate Migration**
    ```bash
    pnpm drizzle-kit generate
    ```
    - Drizzle Kit will create a new `.sql` file in the `drizzle/` directory
    - Review the generated SQL carefully for correctness

3.  **Test Locally**
    ```bash
    pnpm drizzle-kit migrate
    ```
    - Apply the migration to your local development database
    - Verify the schema changes are correct
    - Test affected application features

4.  **Write Tests**
    - Update or create tests that validate the schema changes
    - Ensure all existing tests still pass
    - Add integration tests for new database operations

### 3.2. Code Review Phase

1.  **Create Pull Request**
    - Include the migration file in your PR
    - Document the purpose and impact of the schema change
    - Highlight any breaking changes or required data migrations

2.  **Review Checklist**
    - [ ] Migration SQL is correct and efficient
    - [ ] Indexes are added for new foreign keys and query patterns
    - [ ] Default values are provided for new NOT NULL columns
    - [ ] No destructive operations (DROP COLUMN, DROP TABLE) without approval
    - [ ] Backward compatibility is maintained where possible
    - [ ] Tests cover the new schema changes

### 3.3. Staging Deployment

1.  **Automatic Migration**
    - When the PR is merged to `main`, DigitalOcean App Platform automatically deploys to staging
    - Migrations are applied automatically via the build process

2.  **Staging Verification**
    ```bash
    # Check deployment status
    doctl apps get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4
    
    # Check build logs for migration success
    doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type build
    ```

3.  **Smoke Test**
    - Verify the application starts successfully
    - Test critical user flows affected by the schema change
    - Check for any error logs related to database operations

### 3.4. Production Deployment

1.  **Pre-Deployment Checklist**
    - [ ] Migration tested successfully in staging
    - [ ] All tests passing in CI/CD
    - [ ] Database backup verified (DigitalOcean automatic snapshots)
    - [ ] Rollback plan documented
    - [ ] Stakeholders notified of deployment window

2.  **Deployment Execution**
    - Production deployments are triggered automatically when staging is stable
    - Migrations run as part of the deployment process
    - Monitor deployment logs in real-time

3.  **Post-Deployment Verification**
    ```bash
    # Check application health
    curl https://terp-app-b9s35.ondigitalocean.app/api/health
    
    # Check runtime logs
    doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --type run --follow
    ```

4.  **Monitoring**
    - Watch for error spikes in application logs
    - Monitor database performance metrics
    - Verify user-reported issues are minimal

## 4. Rollback Procedures

### 4.1. Application Rollback (Preferred)

If the migration causes issues but the database is intact:

1.  **Revert Application Code**
    ```bash
    # Via DigitalOcean Console
    # Navigate to: Apps → TERP → Deployments → [Previous Version] → Rollback
    ```

2.  **Verify Rollback**
    - Check that the previous version is running
    - Verify application functionality
    - Monitor for stability

### 4.2. Database Rollback (Emergency Only)

If the database is corrupted or the migration cannot be undone:

1.  **Immediate Actions**
    - Put application in maintenance mode
    - Stop all write operations to the database

2.  **Restore from Snapshot**
    ```bash
    # List available snapshots
    doctl databases backups list <database-id>
    
    # Restore from snapshot (via DigitalOcean Console)
    # Navigate to: Databases → TERP MySQL → Backups → [Select Snapshot] → Restore
    ```

3.  **Create Corrective Migration**
    - Write a new migration that reverts the problematic changes
    - Test thoroughly in a staging environment
    - Deploy the corrective migration

4.  **Post-Mortem**
    - Document what went wrong
    - Identify process improvements
    - Update this document with lessons learned

## 5. Best Practices

### 5.1. Schema Design

-   **Additive Changes:** Favor adding new columns/tables over modifying existing ones
-   **Default Values:** Always provide defaults for new NOT NULL columns
-   **Indexes:** Add indexes for all foreign keys and frequently queried columns
-   **Constraints:** Use database constraints to enforce data integrity
-   **Naming:** Follow consistent naming conventions (snake_case for MySQL)

### 5.2. Migration Safety

-   **Small Changes:** Keep migrations small and atomic
-   **Backward Compatibility:** Ensure the application works with both old and new schemas during deployment
-   **Data Migrations:** Separate schema changes from data migrations when possible
-   **Testing:** Test migrations with production-like data volumes
-   **Reversibility:** Document how to reverse the migration if needed

### 5.3. Prohibited Actions

-   ❌ **Never** use `drizzle-kit push` in production (it bypasses migration history)
-   ❌ **Never** manually edit the database schema in production
-   ❌ **Never** delete migration files from the repository
-   ❌ **Never** modify existing migration files after they've been deployed
-   ❌ **Never** skip the code review process for migrations

## 6. Emergency Contacts

| Role                  | Responsibility                    |
| --------------------- | --------------------------------- |
| **Database Admin**    | Database restoration and recovery |
| **DevOps Lead**       | Deployment and infrastructure     |
| **Backend Lead**      | Schema design and migration code  |
| **Product Owner**     | Business impact assessment        |

## 7. Database Credentials (Production)

**Critical:** These credentials are for emergency access only.

-   **Host:** `terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com`
-   **Port:** `25060`
-   **User:** `doadmin`
-   **Password:** `AVNS_Q_RGkS7-uB3Bk7xC2am`
-   **Database:** `defaultdb`
-   **SSL Mode:** `REQUIRED`

**Connection String:**
```bash
mysql --host=terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      --port=25060 \
      --user=doadmin \
      --password=AVNS_Q_RGkS7-uB3Bk7xC2am \
      --database=defaultdb \
      --ssl-mode=REQUIRED
```

## 8. Appendix: Common Migration Patterns

### 8.1. Adding a New Column

```sql
-- Add column with default value
ALTER TABLE `orders` ADD COLUMN `priority` varchar(20) DEFAULT 'normal' NOT NULL;

-- Add index if needed
CREATE INDEX `idx_orders_priority` ON `orders` (`priority`);
```

### 8.2. Adding a New Table

```sql
CREATE TABLE `notifications` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `message` text NOT NULL,
  `read` boolean DEFAULT false,
  `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
);

CREATE INDEX `idx_notifications_user_id` ON `notifications` (`user_id`);
CREATE INDEX `idx_notifications_read` ON `notifications` (`read`);
```

### 8.3. Renaming a Column (Two-Step Process)

**Step 1:** Add new column, copy data
```sql
ALTER TABLE `clients` ADD COLUMN `company_name` varchar(255);
UPDATE `clients` SET `company_name` = `name`;
ALTER TABLE `clients` MODIFY COLUMN `company_name` varchar(255) NOT NULL;
```

**Step 2:** (In a later migration) Drop old column
```sql
ALTER TABLE `clients` DROP COLUMN `name`;
```
