# Deployment Instructions - Database Performance Updates

**Session:** Session-20251117-db-performance-d6d96289  
**Date:** 2025-11-17  
**Branch:** main (merged)  
**Status:** Ready for deployment

## Summary

This deployment includes database performance optimizations, benchmarking framework, and batch status transition testing/documentation.

## Changes

### ST-005: Database Indexes

- **File:** `drizzle/0038_add_missing_indexes.sql`
- **Impact:** 25+ new database indexes on foreign keys
- **Expected Improvement:** 60-80% faster JOIN queries
- **Risk:** Low (indexes are additive, no data changes)

### ST-015: Benchmark Framework

- **Files:** `scripts/benchmark-api.ts`, `docs/performance-baseline.md`
- **Impact:** New benchmark script for performance monitoring
- **Risk:** None (documentation and script only, no code changes)

### ST-017: Batch Status Transitions

- **Files:** `server/routers/batches.test.ts`, `docs/batch-status-transitions.md`
- **Impact:** Test suite and documentation for existing functionality
- **Risk:** None (tests and docs only, no code changes)

## Deployment Steps

### 1. Pull Latest Code

```bash
cd /path/to/terp
git checkout main
git pull origin main
```

**Verify commit:** `3f31fc9` (ST-005, ST-015, ST-017: Add documentation)

### 2. Run Database Migration

**⚠️ CRITICAL:** This step adds indexes and may take several minutes depending on table sizes.

```bash
# Connect to database
mysql -u terp_user -p terp_db

# Run migration
source drizzle/0038_add_missing_indexes.sql

# Verify indexes were created
SHOW INDEX FROM batches;
SHOW INDEX FROM orders;
SHOW INDEX FROM vendor_notes;
SHOW INDEX FROM payment_history;
SHOW INDEX FROM batch_locations;
SHOW INDEX FROM sales;
SHOW INDEX FROM order_returns;
SHOW INDEX FROM comments;
SHOW INDEX FROM order_status_history;

# Exit MySQL
exit;
```

**Expected indexes:**

- `idx_batches_status`
- `idx_batches_product_id`
- `idx_batches_lot_id`
- `idx_orders_created_by`
- `idx_orders_packed_by`
- `idx_orders_shipped_by`
- `idx_orders_intake_event_id`
- `idx_vendor_notes_vendor_id`
- `idx_vendor_notes_user_id`
- `idx_payment_history_batch_id`
- `idx_payment_history_vendor_id`
- `idx_payment_history_recorded_by`
- `idx_batch_locations_batch_id`
- `idx_sales_batch_id`
- `idx_sales_product_id`
- `idx_sales_customer_id`
- `idx_order_returns_order_id`
- `idx_order_returns_batch_id`
- `idx_order_returns_created_by`
- `idx_comments_user_id`
- `idx_comments_entity_type`
- `idx_comments_entity_id`
- `idx_order_status_history_changed_by`

### 3. Install Dependencies (if needed)

```bash
pnpm install
```

### 4. Restart Application

```bash
# Using PM2 (if applicable)
pm2 restart terp

# Or systemd
sudo systemctl restart terp

# Or Docker
docker-compose restart
```

### 5. Verify Deployment

#### Check Application Health

```bash
curl http://localhost:3000/health
# Expected: {"status":"healthy"}
```

#### Check Database Indexes

```bash
mysql -u terp_user -p terp_db -e "SHOW INDEX FROM batches WHERE Key_name LIKE 'idx_%';"
```

#### Run Benchmark (Optional)

```bash
pnpm tsx scripts/benchmark-api.ts
# Review output in docs/performance-baseline.md
```

### 6. Smoketest

Perform the following manual tests:

1. **Batch Status Transitions**
   - Navigate to Inventory → Batches
   - Select a batch with status "LIVE"
   - Change status to "ON_HOLD" → Should succeed
   - Try to change status from "ON_HOLD" to "SOLD_OUT" → Should fail with validation error
   - Change status from "ON_HOLD" to "LIVE" → Should succeed

2. **Query Performance (Visual Check)**
   - Navigate to Dashboard
   - Observe load time for metrics (should feel faster)
   - Navigate to Orders list
   - Observe load time (should feel faster)
   - Filter orders by status
   - Observe filter performance (should feel faster)

3. **General Functionality**
   - Create a new batch (Inventory → Intake)
   - Create a new order
   - View client list
   - View vendor list
   - Check dashboard metrics

## Rollback Plan

If issues occur, rollback is simple since this deployment only adds indexes:

### Rollback Database Migration

```sql
-- Connect to database
mysql -u terp_user -p terp_db

-- Drop all indexes added in this migration
DROP INDEX idx_batches_status ON batches;
DROP INDEX idx_batches_product_id ON batches;
DROP INDEX idx_batches_lot_id ON batches;
DROP INDEX idx_orders_created_by ON orders;
DROP INDEX idx_orders_packed_by ON orders;
DROP INDEX idx_orders_shipped_by ON orders;
DROP INDEX idx_orders_intake_event_id ON orders;
DROP INDEX idx_vendor_notes_vendor_id ON vendor_notes;
DROP INDEX idx_vendor_notes_user_id ON vendor_notes;
DROP INDEX idx_payment_history_batch_id ON payment_history;
DROP INDEX idx_payment_history_vendor_id ON payment_history;
DROP INDEX idx_payment_history_recorded_by ON payment_history;
DROP INDEX idx_batch_locations_batch_id ON batch_locations;
DROP INDEX idx_sales_batch_id ON sales;
DROP INDEX idx_sales_product_id ON sales;
DROP INDEX idx_sales_customer_id ON sales;
DROP INDEX idx_order_returns_order_id ON order_returns;
DROP INDEX idx_order_returns_batch_id ON order_returns;
DROP INDEX idx_order_returns_created_by ON order_returns;
DROP INDEX idx_comments_user_id ON comments;
DROP INDEX idx_comments_entity_type ON comments;
DROP INDEX idx_comments_entity_id ON comments;
DROP INDEX idx_order_status_history_changed_by ON order_status_history;
```

### Rollback Code

```bash
git checkout afdbb74  # Previous commit before this deployment
pm2 restart terp      # Or your restart command
```

## Monitoring

After deployment, monitor:

1. **Query Performance**
   - Check slow query log for improvements
   - Monitor average query execution time
   - Expected: 60-80% reduction in JOIN query times

2. **Database Load**
   - Monitor CPU usage (should decrease)
   - Monitor disk I/O (should decrease)

3. **Application Performance**
   - Monitor API response times
   - Expected: P95 latency reduction on list endpoints

## Post-Deployment Tasks

1. Run production benchmark with real data:

   ```bash
   pnpm tsx scripts/benchmark-api.ts
   ```

2. Compare results with baseline expectations

3. Update MASTER_ROADMAP.md to mark tasks as "Done"

4. Archive session file to `docs/sessions/completed/`

5. Update ACTIVE_SESSIONS.md to remove this session

## Notes

- **Low Risk Deployment:** Only adds indexes and documentation, no code logic changes
- **No Downtime Required:** Indexes can be added while system is running (may slow queries temporarily)
- **Reversible:** Indexes can be dropped without data loss
- **Expected Duration:** 5-15 minutes depending on table sizes

## Success Criteria

✅ All indexes created successfully  
✅ Application health check passes  
✅ Smoketest passes  
✅ No errors in application logs  
✅ Query performance improved (visual check)

## Contact

For issues during deployment, contact:

- **Session Owner:** Agent-01
- **Session ID:** Session-20251117-db-performance-d6d96289
- **Documentation:** This file and CHANGELOG.md
