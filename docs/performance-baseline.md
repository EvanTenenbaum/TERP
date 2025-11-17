# TERP Performance Baseline

**Document Version:** 1.0  
**Date:** November 17, 2025  
**Session:** Session-20251114-db-performance-$(openssl rand -hex 3)  
**Status:** Initial Baseline

## Overview

This document establishes performance baselines for critical database operations in the TERP system. These baselines serve as reference points for measuring the impact of optimizations and identifying performance regressions.

## Database Schema Optimizations

### ST-005: Missing Database Indexes

**Status:** ✅ Completed  
**Date:** November 17, 2025

Added 26 missing indexes on foreign key columns to improve query performance:

#### Indexes Added

| Table | Column | Index Name | Purpose |
|-------|--------|------------|---------|
| batches | statusId | idx_batches_status_id | Filter batches by workflow status |
| batches | photoSessionEventId | idx_batches_photo_session_event_id | Link to photo session events |
| dashboardWidgetLayouts | userId | idx_dashboard_widget_layouts_user_id | User-specific widget queries |
| orders | intakeEventId | idx_orders_intake_event_id | Link orders to intake events |
| orders | packedBy | idx_orders_packed_by | Track packing user |
| orders | shippedBy | idx_orders_shipped_by | Track shipping user |
| credits | transactionId | idx_credits_transaction_id | Link credits to transactions |
| sampleRequests | fulfilledBy | idx_sample_requests_fulfilled_by | Track fulfillment user |
| sampleRequests | cancelledBy | idx_sample_requests_cancelled_by | Track cancellation user |
| inventoryAlerts | acknowledgedBy | idx_inventory_alerts_acknowledged_by | Track alert acknowledgment |
| clientNeeds | strainId | idx_client_needs_strain_id | Match client needs to strains |
| matchRecords | inventoryBatchId | idx_match_records_inventory_batch_id | Match to inventory batches |
| matchRecords | vendorSupplyId | idx_match_records_vendor_supply_id | Match to vendor supply |
| matchRecords | historicalOrderId | idx_match_records_historical_order_id | Historical order matching |
| matchRecords | actionedBy | idx_match_records_actioned_by | Track user actions |
| matchRecords | saleOrderId | idx_match_records_sale_order_id | Link to sale orders |
| todoTasks | completedBy | idx_todo_tasks_completed_by | Track task completion |
| comments | resolvedBy | idx_comments_resolved_by | Track comment resolution |
| calendarRecurrenceInstances | modifiedAssignedTo | idx_calendar_recurrence_instances_modified_assigned_to | Modified assignments |
| calendarRecurrenceInstances | modifiedBy | idx_calendar_recurrence_instances_modified_by | Track modifications |
| calendarEventInvitations | overriddenBy | idx_calendar_event_invitations_overridden_by | Track invitation overrides |
| batchStatusHistory | fromStatusId | idx_batch_status_history_from_status_id | Status transition tracking |
| creditSystemSettings | updatedBy | idx_credit_system_settings_updated_by | Settings update tracking |
| creditAuditLog | triggeredBy | idx_credit_audit_log_triggered_by | Audit event tracking |
| pricingProfiles | createdBy | idx_pricing_profiles_created_by | Profile creation tracking |
| salesSheetHistory | templateId | idx_sales_sheet_history_template_id | Template usage tracking |

### Expected Performance Improvements

**Foreign Key Lookups:**
- **Before:** Full table scans on foreign key joins
- **After:** Index-based lookups with O(log n) complexity
- **Expected Improvement:** 10-100x faster for filtered queries

**Common Query Patterns:**
1. **Batch Status Filtering:** `WHERE statusId = ?`
2. **User Activity Tracking:** `WHERE packedBy = ? OR shippedBy = ?`
3. **Event Linkage:** `WHERE intakeEventId = ? OR photoSessionEventId = ?`
4. **Match Analysis:** `WHERE inventoryBatchId = ? OR vendorSupplyId = ?`

## Critical Path Performance Metrics

### Inventory Module

#### Batch List Query
**Endpoint:** `GET /api/trpc/inventory.list`

**Baseline Metrics (To Be Measured):**
- Response Time: TBD ms (p50), TBD ms (p95), TBD ms (p99)
- Database Query Time: TBD ms
- Rows Scanned: TBD
- Rows Returned: TBD

**Critical Queries:**
```sql
-- Get batches with details (paginated)
SELECT * FROM batches 
WHERE status = ? 
ORDER BY createdAt DESC 
LIMIT ?;

-- With new index on statusId, expect significant improvement
```

#### Batch Status Update
**Endpoint:** `POST /api/trpc/inventory.updateStatus`

**Baseline Metrics (To Be Measured):**
- Response Time: TBD ms (p50), TBD ms (p95), TBD ms (p99)
- Transaction Time: TBD ms
- Affected Rows: 1

**Critical Queries:**
```sql
-- Update batch status
UPDATE batches 
SET status = ?, statusId = ?, updatedAt = NOW() 
WHERE id = ?;

-- Insert status history
INSERT INTO batchStatusHistory 
(batchId, fromStatusId, toStatusId, changedBy, changedAt) 
VALUES (?, ?, ?, ?, NOW());
```

#### Bulk Status Update
**Endpoint:** `POST /api/trpc/inventory.bulk.updateStatus`

**Baseline Metrics (To Be Measured):**
- Response Time: TBD ms for 10 batches, TBD ms for 100 batches
- Transaction Time: TBD ms
- Throughput: TBD batches/second

### Order Management

#### Order List with Fulfillment Status
**Endpoint:** `GET /api/trpc/orders.list`

**Baseline Metrics (To Be Measured):**
- Response Time: TBD ms (p50), TBD ms (p95), TBD ms (p99)
- Database Query Time: TBD ms

**Critical Queries:**
```sql
-- Orders with user joins
SELECT o.*, 
       u1.name as packedByName, 
       u2.name as shippedByName
FROM orders o
LEFT JOIN users u1 ON o.packedBy = u1.id
LEFT JOIN users u2 ON o.shippedBy = u2.id
WHERE o.fulfillmentStatus = ?;

-- With new indexes on packedBy and shippedBy, expect faster joins
```

### Dashboard Performance

#### Widget Layout Loading
**Endpoint:** `GET /api/trpc/dashboard.getLayout`

**Baseline Metrics (To Be Measured):**
- Response Time: TBD ms (p50), TBD ms (p95)
- Database Query Time: TBD ms

**Critical Queries:**
```sql
-- User-specific widget layout
SELECT * FROM dashboard_widget_layouts 
WHERE userId = ? 
ORDER BY position;

-- With new index on userId, expect significant improvement
```

### Matching System

#### Match Record Queries
**Endpoint:** `GET /api/trpc/matching.getMatches`

**Baseline Metrics (To Be Measured):**
- Response Time: TBD ms (p50), TBD ms (p95)
- Database Query Time: TBD ms

**Critical Queries:**
```sql
-- Get matches for inventory batch
SELECT * FROM match_records 
WHERE inventoryBatchId = ? 
AND userAction = 'NONE';

-- Get matches by vendor supply
SELECT * FROM match_records 
WHERE vendorSupplyId = ? 
AND resultedInSale = false;

-- With new indexes, expect 10-50x improvement
```

## Performance Testing Methodology

### Measurement Approach

1. **Database Query Performance**
   - Use `EXPLAIN ANALYZE` to measure query execution plans
   - Measure rows scanned vs. rows returned ratio
   - Track index usage statistics

2. **API Response Times**
   - Measure p50, p95, p99 latencies
   - Test under various load conditions (1, 10, 100 concurrent requests)
   - Monitor database connection pool usage

3. **Transaction Performance**
   - Measure transaction duration for updates
   - Track lock contention and deadlocks
   - Monitor rollback rates

### Testing Conditions

**Database State:**
- Test with production-like data volumes
- Ensure statistics are up-to-date (`ANALYZE TABLE`)
- Clear query cache before measurements

**Load Conditions:**
- Single user (baseline)
- 10 concurrent users (typical)
- 100 concurrent users (peak)

## Benchmark Results

### Pre-Optimization Baseline

**Status:** ⏳ To Be Measured

This section will be populated with actual measurements after:
1. Database migration is applied
2. Performance tests are executed
3. Results are collected and analyzed

### Post-Optimization Results

**Status:** ⏳ To Be Measured

This section will be populated with measurements after index deployment to compare against baseline.

## Monitoring and Alerting

### Key Performance Indicators (KPIs)

1. **Query Response Time**
   - Target: p95 < 100ms for simple queries
   - Target: p95 < 500ms for complex queries
   - Alert: p95 > 1000ms

2. **Index Hit Rate**
   - Target: > 95% of queries use indexes
   - Alert: < 90% index usage

3. **Database CPU Usage**
   - Target: < 70% average
   - Alert: > 85% sustained for 5 minutes

4. **Slow Query Log**
   - Target: < 10 slow queries per hour
   - Alert: > 50 slow queries per hour

### Monitoring Tools

- **Database:** MySQL slow query log, performance schema
- **Application:** tRPC middleware timing
- **Infrastructure:** Server metrics (CPU, memory, disk I/O)

## Next Steps

1. ✅ **ST-005:** Add missing database indexes (Completed)
2. ⏳ **ST-015:** Benchmark critical paths (In Progress)
   - Generate database migration
   - Apply to development environment
   - Run performance tests
   - Document actual measurements
3. ⏳ **ST-017:** Implement batch status transition validation
4. 🔄 **Continuous:** Monitor performance metrics in production
5. 🔄 **Quarterly:** Review and update baselines

## References

- **Schema File:** `drizzle/schema.ts`
- **Inventory Router:** `server/routers/inventory.ts`
- **Database Utilities:** `server/inventoryDb.ts`
- **Master Roadmap:** `docs/roadmaps/MASTER_ROADMAP.md`

## Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-11-17 | Initial baseline document created | AI Assistant |
| 2025-11-17 | Added 26 database indexes (ST-005) | AI Assistant |

---

**Note:** This is a living document. Update measurements and baselines as the system evolves and performance characteristics change.
