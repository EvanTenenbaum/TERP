# CRITICAL ROOT CAUSE IDENTIFIED

## The Problem

**ALL database queries are failing with "Unknown column 'deleted_at' in 'field list'"**

## Evidence from Production Logs

```
Error: Unknown column 'deleted_at' in 'field list'
Code: ER_BAD_FIELD_ERROR
errno: 1054
```

### Example Failed Queries:

1. **Users table:**
```sql
select `id`, `openId`, `deleted_at`, `name`, `email`, `loginMethod`, `role`, `createdAt`, `updatedAt`, `lastSignedIn` 
from `users` 
where `users`.`email` = 'demo+public@terp-app.local' limit 1
```
Error: Unknown column 'deleted_at' in 'field list'

2. **Batches/Inventory query:**
```sql
select `batches`.`id`, `batches`.`code`, `batches`.`deleted_at`, ...
from `batches` 
left join `products` on `batches`.`productId` = `products`.`id` 
left join `brands` on `products`.`brandId` = `brands`.`id` 
left join `lots` on `batches`.`lotId` = `lots`.`id` 
left join `vendors` on `lots`.`vendorId` = `vendors`.`id` 
order by `batches`.`id` desc limit 1001
```
Error: Failed query (same deleted_at column issue)

3. **Vendors query:**
```sql
select `id`, `name`, `deleted_at`, `contactName`, `contactEmail`, `contactPhone`, `paymentTerms`, `notes`, `createdAt`, `updatedAt` 
from `vendors` 
order by `vendors`.`name`
```
Error: Failed query

## Root Cause Analysis

### The Schema Mismatch

**Schema Definition (drizzle/schema.ts):**
- All tables have `deletedAt: timestamp("deleted_at")` defined
- Drizzle generates queries with `deleted_at` column name

**Production Database:**
- The actual MySQL database does NOT have `deleted_at` columns
- The database was likely created from an older schema or migration

### Why This Happened

1. **Schema drift**: The TypeScript schema (drizzle/schema.ts) was updated to add soft delete support
2. **Missing migration**: The database schema was never migrated to add the `deleted_at` columns
3. **Drizzle ORM**: Generates SQL based on TypeScript schema, not actual database structure
4. **Result**: Every query that touches a table with `deletedAt` in the schema fails

## Impact

**Broken Features:**
- ❌ Vendors list (queries vendors.deleted_at)
- ❌ Inventory list (queries batches.deleted_at, products.deleted_at, brands.deleted_at, lots.deleted_at, vendors.deleted_at)
- ❌ Orders list (likely queries orders.deleted_at)
- ❌ User authentication (queries users.deleted_at)

**Working Features:**
- ✅ Dashboard metrics (uses aggregate queries, not full selects)
- ✅ Clients (partial - 10 of 20 showing, might have different query path)
- ✅ Accounting AR (uses invoice aggregates)

## The Fix

### Option 1: Add deleted_at columns to production database (RECOMMENDED)
Run migration to add `deleted_at` column to all tables that have it in schema.

### Option 2: Remove deletedAt from schema
Remove all `deletedAt` fields from drizzle/schema.ts (breaks soft delete feature).

### Option 3: Make deletedAt optional in queries
Modify Drizzle queries to not select deleted_at column (complex, error-prone).

## Next Steps

1. Generate migration to add deleted_at columns
2. Run migration on production database
3. Verify all queries work
4. Test all broken features

## Safety Note

**This fix does NOT affect the seeding work we just completed.**
- The seeding script successfully created 195 records
- The data exists in the database
- We just need to add the missing `deleted_at` columns so queries can run
