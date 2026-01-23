# Migration 0007: Calendar Recurrence Index - Deployment Instructions

**Migration File**: `0007_add_calendar_recurrence_index.sql`  
**Created**: November 9, 2025  
**Purpose**: Add missing composite index on `calendar_recurrence_instances` table  
**Priority**: HIGH (Performance Critical)  
**Estimated Duration**: < 1 minute (depends on table size)

---

## Overview

This migration adds a composite index on `(parent_event_id, instance_date)` to the `calendar_recurrence_instances` table. This index is critical for performance when querying recurring event instances within a date range.

**Performance Impact**:
- **Before**: Slow queries when fetching recurring events (full table scan)
- **After**: Fast indexed queries (O(log n) lookup)
- **Expected Improvement**: 10-100x faster for recurring event queries

---

## Pre-Deployment Checklist

- [ ] Backup database (recommended but not required for index creation)
- [ ] Verify table exists: `SHOW TABLES LIKE 'calendar_recurrence_instances';`
- [ ] Check current indexes: `SHOW INDEX FROM calendar_recurrence_instances;`
- [ ] Verify index doesn't already exist: Look for `idx_recurrence_parent_date`

---

## Deployment Steps

### Option 1: Using MySQL CLI (Recommended)

1. **Connect to Production Database**
   ```bash
   mysql --host=$DB_HOST \
         --port=$DB_PORT \
         --user=$DB_USER \
         --password=$DB_PASSWORD \
         --database=$DB_NAME \
         --ssl-mode=REQUIRED
   ```

   > **Note:** Use environment variables or retrieve credentials from your secrets manager.
   > Never commit credentials to version control.

2. **Verify Connection**
   ```sql
   SELECT DATABASE();
   SHOW TABLES LIKE 'calendar_recurrence_instances';
   ```

3. **Run Migration**
   ```sql
   -- Add composite index on (parent_event_id, instance_date)
   CREATE INDEX `idx_recurrence_parent_date` 
   ON `calendar_recurrence_instances`(`parent_event_id`, `instance_date`);
   ```

4. **Verify Index Creation**
   ```sql
   SHOW INDEX FROM calendar_recurrence_instances WHERE Key_name = 'idx_recurrence_parent_date';
   ```
   
   Expected output:
   ```
   +-------------------------------+------------+---------------------------+--------------+------------------+-----------+-------------+----------+--------+------+------------+---------+---------------+
   | Table                         | Non_unique | Key_name                  | Seq_in_index | Column_name      | Collation | Cardinality | Sub_part | Packed | Null | Index_type | Comment | Index_comment |
   +-------------------------------+------------+---------------------------+--------------+------------------+-----------+-------------+----------+--------+------+------------+---------+---------------+
   | calendar_recurrence_instances |          1 | idx_recurrence_parent_date|            1 | parent_event_id  | A         |        NULL |     NULL | NULL   |      | BTREE      |         |               |
   | calendar_recurrence_instances |          1 | idx_recurrence_parent_date|            2 | instance_date    | A         |        NULL |     NULL | NULL   |      | BTREE      |         |               |
   +-------------------------------+------------+---------------------------+--------------+------------------+-----------+-------------+----------+--------+------+------------+---------+---------------+
   ```

5. **Test Query Performance**
   ```sql
   -- Test query that will use the new index
   EXPLAIN SELECT * FROM calendar_recurrence_instances 
   WHERE parent_event_id = 1 
   AND instance_date BETWEEN '2025-11-01' AND '2025-11-30';
   ```
   
   Expected: `type` should be `ref` or `range`, and `key` should be `idx_recurrence_parent_date`

### Option 2: Using Migration Script File

1. **Upload Migration File to Server**
   ```bash
   # Copy the migration file to your server
   scp drizzle/migrations/0007_add_calendar_recurrence_index.sql user@server:/path/to/migrations/
   ```

2. **Run Migration from File**
   ```bash
   mysql --host=$DB_HOST \
         --port=$DB_PORT \
         --user=$DB_USER \
         --password=$DB_PASSWORD \
         --database=$DB_NAME \
         --ssl-mode=REQUIRED \
         < /path/to/migrations/0007_add_calendar_recurrence_index.sql
   ```

3. **Verify Index Creation** (same as Option 1, step 4)

---

## Post-Deployment Verification

### 1. Verify Index Exists
```sql
SHOW INDEX FROM calendar_recurrence_instances WHERE Key_name = 'idx_recurrence_parent_date';
```

### 2. Test Query Performance
```sql
-- Before index (for comparison, if you have metrics)
-- After index, this should be fast
SELECT COUNT(*) FROM calendar_recurrence_instances 
WHERE parent_event_id IN (1, 2, 3, 4, 5) 
AND instance_date BETWEEN '2025-01-01' AND '2025-12-31';
```

### 3. Check Application Performance
- Navigate to Calendar page in production: https://terp-app-b9s35.ondigitalocean.app/calendar
- Load calendar with recurring events
- Verify page loads quickly (< 2 seconds)
- Check browser console for any errors

### 4. Monitor Database Performance
```sql
-- Check slow query log (if enabled)
SHOW VARIABLES LIKE 'slow_query_log';

-- Check index usage statistics (after some production traffic)
SELECT * FROM information_schema.STATISTICS 
WHERE TABLE_NAME = 'calendar_recurrence_instances' 
AND INDEX_NAME = 'idx_recurrence_parent_date';
```

---

## Rollback Plan

If the migration causes issues (unlikely for index creation):

```sql
-- Remove the index
DROP INDEX `idx_recurrence_parent_date` ON `calendar_recurrence_instances`;
```

**Note**: Dropping an index is safe and does not affect data. It only impacts query performance.

---

## Troubleshooting

### Issue: Index Already Exists
**Error**: `Duplicate key name 'idx_recurrence_parent_date'`  
**Solution**: Index is already created. Verify with `SHOW INDEX` command.

### Issue: Table Doesn't Exist
**Error**: `Table 'defaultdb.calendar_recurrence_instances' doesn't exist`  
**Solution**: Verify you're connected to the correct database and the calendar module is deployed.

### Issue: Permission Denied
**Error**: `Access denied for user 'doadmin'@'...'`  
**Solution**: Verify credentials and SSL mode are correct.

### Issue: Slow Index Creation
**Symptom**: Migration takes longer than expected  
**Solution**: This is normal for large tables. Wait for completion. Index creation is non-blocking in MySQL 5.7+.

---

## Success Criteria

- ✅ Index `idx_recurrence_parent_date` exists on `calendar_recurrence_instances` table
- ✅ Index includes columns `parent_event_id` and `instance_date` in that order
- ✅ Queries using `WHERE parent_event_id = X AND instance_date BETWEEN Y AND Z` use the index
- ✅ Calendar page loads quickly with recurring events
- ✅ No errors in application logs

---

## Notes

- **Downtime**: None. Index creation is online in MySQL 5.7+.
- **Data Impact**: None. This is a schema-only change.
- **Compatibility**: Compatible with all MySQL 5.7+ and MariaDB 10.2+.
- **Reversibility**: Fully reversible by dropping the index.

---

## Contact

If you encounter any issues during deployment, contact the development team with:
1. Error message (full text)
2. MySQL version (`SELECT VERSION();`)
3. Table structure (`SHOW CREATE TABLE calendar_recurrence_instances;`)
4. Current indexes (`SHOW INDEX FROM calendar_recurrence_instances;`)
