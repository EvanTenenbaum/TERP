# Dashboard V3 Migration Instructions

## Quick Start

To apply the Dashboard V3 database migration, run:

```bash
./apply_dashboard_migration.sh
```

The script will:
1. Prompt for confirmation
2. Ask for database credentials
3. Apply the migration
4. Verify the table structure

## Manual Application

If you prefer to apply the migration manually:

```bash
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED \
      defaultdb < drizzle/0026_recreate_dashboard_preferences.sql
```

## What This Migration Does

**Before (Old Schema)**:
- Multiple rows per user (one per widget)
- Columns: `widgetId`, `isVisible`, `sortOrder`, `config`

**After (New Schema)**:
- Single row per user
- Columns: `activeLayout`, `widgetConfig` (JSON array)
- UNIQUE constraint on `userId`

## Impact

- ⚠️ **Deletes existing dashboard preferences** (users will need to recustomize)
- ✅ Enables full Dashboard V3 functionality
- ✅ Enables cross-device preference sync
- ✅ Fixes backend API errors

## Verification

After applying the migration, verify the table structure:

```sql
DESCRIBE userDashboardPreferences;
```

Expected output:
```
+---------------+--------------+------+-----+-------------------+
| Field         | Type         | Null | Key | Default           |
+---------------+--------------+------+-----+-------------------+
| id            | int          | NO   | PRI | NULL              |
| userId        | int          | NO   | UNI | NULL              |
| activeLayout  | varchar(50)  | NO   |     | operations        |
| widgetConfig  | json         | NO   |     | NULL              |
| createdAt     | timestamp    | NO   |     | CURRENT_TIMESTAMP |
| updatedAt     | timestamp    | NO   |     | CURRENT_TIMESTAMP |
+---------------+--------------+------+-----+-------------------+
```

## Testing

Test the backend API after migration:

```bash
# Test getPreferences endpoint
curl -X POST https://terp-app-b9s35.ondigitalocean.app/api/trpc/dashboardPreferences.getPreferences \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Rollback

If you need to rollback to the old schema:

```sql
DROP TABLE IF EXISTS `userDashboardPreferences`;

CREATE TABLE `userDashboardPreferences` (
  `id` int AUTO_INCREMENT NOT NULL,
  `userId` int NOT NULL,
  `widgetId` varchar(100) NOT NULL,
  `isVisible` int NOT NULL DEFAULT 1,
  `sortOrder` int NOT NULL DEFAULT 0,
  `config` json,
  `createdAt` timestamp NOT NULL DEFAULT (now()),
  `updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `userDashboardPreferences_id` PRIMARY KEY(`id`)
);
```

## Files

- **Migration SQL**: `drizzle/0026_recreate_dashboard_preferences.sql`
- **Helper Script**: `apply_dashboard_migration.sh`
- **This Document**: `MIGRATION_INSTRUCTIONS.md`
