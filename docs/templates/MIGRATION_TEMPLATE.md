# Migration Template

## Overview

This template provides the standard structure for database migrations in TERP. All migrations should follow this pattern to ensure safety and consistency.

## Migration File Template

```sql
-- Migration: [MIGRATION_NAME]
-- Created: [DATE]
-- Author: [AUTHOR]
-- Description: [BRIEF DESCRIPTION]
--
-- Type: ADD / WIDEN / MODIFY (never DROP/RENAME without approval)
-- Risk Level: LOW / MEDIUM / HIGH
--
-- Pre-requisites:
-- - MySQL version >= 8.0
-- - Sufficient disk space for index operations
-- - Off-peak hours for large table modifications

-- =============================================================================
-- MYSQL VERSION GUARD
-- =============================================================================
-- Ensures minimum MySQL version compatibility

SELECT IF(
  CAST(SUBSTRING_INDEX(VERSION(), '.', 1) AS UNSIGNED) >= 8,
  'MySQL 8.0+ verified',
  (SELECT ERROR FROM nonexistent_table)
) AS version_check;

-- =============================================================================
-- PRE-MIGRATION VERIFICATION
-- =============================================================================
-- Verify current state before applying changes

-- Check table exists
SELECT COUNT(*) AS table_exists
FROM information_schema.tables
WHERE table_schema = DATABASE()
AND table_name = '[TABLE_NAME]';

-- Describe current structure (for logging)
DESCRIBE [TABLE_NAME];

-- =============================================================================
-- MIGRATION
-- =============================================================================

-- ADD COLUMN (Safe - ADD only, no DROP)
ALTER TABLE [TABLE_NAME]
ADD COLUMN [column_name] [DATA_TYPE] [CONSTRAINTS] [DEFAULT];

-- Example: Add nullable varchar column with default
-- ALTER TABLE users
-- ADD COLUMN middle_name VARCHAR(100) DEFAULT NULL;

-- Example: Add column with default value
-- ALTER TABLE orders
-- ADD COLUMN notes TEXT DEFAULT NULL;

-- =============================================================================
-- WIDEN COLUMN (Safe - only increasing size)
-- =============================================================================

-- Example: Widen VARCHAR column (255 -> 500)
-- ALTER TABLE clients
-- MODIFY COLUMN description VARCHAR(500);

-- Example: Change INT to BIGINT
-- ALTER TABLE large_table
-- MODIFY COLUMN id BIGINT NOT NULL AUTO_INCREMENT;

-- =============================================================================
-- ADD INDEX (Safe - performance improvement)
-- =============================================================================

-- Example: Add simple index
-- CREATE INDEX idx_[table]_[column] ON [TABLE_NAME]([column_name]);

-- Example: Add composite index
-- CREATE INDEX idx_orders_client_date ON orders(client_id, created_at);

-- =============================================================================
-- POST-MIGRATION VERIFICATION
-- =============================================================================

-- Verify column was added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = DATABASE()
AND table_name = '[TABLE_NAME]'
AND column_name = '[NEW_COLUMN]';

-- Describe updated structure
DESCRIBE [TABLE_NAME];

-- Verify data integrity (sample check)
SELECT COUNT(*) AS total_rows FROM [TABLE_NAME];

-- =============================================================================
-- ROLLBACK STUB
-- =============================================================================
--
-- NOTE: Rollbacks should be rare and require explicit approval.
-- This stub is for emergency use only.
--
-- ROLLBACK SQL (DO NOT EXECUTE WITHOUT APPROVAL):
--
-- -- Remove added column
-- ALTER TABLE [TABLE_NAME] DROP COLUMN [column_name];
--
-- -- Remove added index
-- DROP INDEX idx_[table]_[column] ON [TABLE_NAME];
```

## Migration Types

### ADD Migrations (Low Risk)

```sql
-- Adding new column with nullable/default
ALTER TABLE users ADD COLUMN preferences JSON DEFAULT NULL;

-- Adding new index
CREATE INDEX idx_orders_status ON orders(status);

-- Adding new table
CREATE TABLE new_feature (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### WIDEN Migrations (Low-Medium Risk)

```sql
-- Widening VARCHAR (always safe to increase)
ALTER TABLE clients MODIFY COLUMN name VARCHAR(500);

-- Widening INT to BIGINT
ALTER TABLE analytics MODIFY COLUMN count BIGINT;

-- Widening ENUM (adding values only)
ALTER TABLE orders MODIFY COLUMN status
  ENUM('DRAFT', 'PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');
```

### MODIFY Migrations (Medium-High Risk)

```sql
-- Changing column constraints (requires data verification)
ALTER TABLE users MODIFY COLUMN email VARCHAR(255) NOT NULL;

-- Adding NOT NULL with default (safe if default is appropriate)
ALTER TABLE orders MODIFY COLUMN priority INT NOT NULL DEFAULT 0;
```

## Blocked Operations

The following operations are blocked by CI and require explicit approval:

### DROP Operations
```sql
-- ❌ BLOCKED: DROP TABLE
DROP TABLE old_table;

-- ❌ BLOCKED: DROP COLUMN
ALTER TABLE users DROP COLUMN deprecated_field;

-- ❌ BLOCKED: DROP INDEX (without adding replacement)
DROP INDEX idx_users_email ON users;
```

### RENAME Operations
```sql
-- ❌ BLOCKED: RENAME TABLE
RENAME TABLE old_name TO new_name;

-- ❌ BLOCKED: RENAME COLUMN
ALTER TABLE users CHANGE old_name new_name VARCHAR(255);
```

### NARROWING Operations
```sql
-- ⚠️ WARNING: Narrowing column size
ALTER TABLE users MODIFY COLUMN name VARCHAR(50); -- Was 255

-- ⚠️ WARNING: Removing ENUM values
ALTER TABLE orders MODIFY COLUMN status ENUM('DRAFT', 'PENDING'); -- Removed values
```

## Checklist Before Creating Migration

- [ ] Migration is ADD/WIDEN only (no DROP/RENAME)
- [ ] Column names follow naming conventions
- [ ] New columns have appropriate defaults
- [ ] Indexes are named correctly
- [ ] MySQL version guard is included
- [ ] Verification queries are included
- [ ] Rollback stub is documented
- [ ] Risk level is assessed

## Testing Migrations

1. **Local Testing**
   ```bash
   # Apply migration to local database
   pnpm db:push

   # Validate schema
   pnpm validate:schema
   ```

2. **Staging Verification**
   - Apply to staging environment
   - Run smoke tests
   - Verify data integrity

3. **Production Deployment**
   - Follow PRODUCTION_ROLLOUT.md procedure
   - Monitor during and after deployment
