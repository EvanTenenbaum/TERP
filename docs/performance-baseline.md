# Performance Baseline Report

**Generated:** 2025-11-17
**Status:** Benchmark framework created
**Session:** Session-20251117-db-performance-d6d96289

## Overview

This document establishes the performance baseline for critical API endpoints in the TERP system. The benchmark script (`scripts/benchmark-api.ts`) measures response times across 15 key endpoints.

## Critical Endpoints Identified

### Client Management
- `clients.list` - List all clients
- `clients.getById` - Get client by ID

### Order Management
- `orders.list` - List all orders
- `orders.getById` - Get order by ID

### Inventory & Batches
- `batches.list` - List all batches
- `batches.getById` - Get batch by ID
- `inventory.list` - List inventory items

### Vendor Management
- `vendors.list` - List all vendors

### Dashboard & Reporting
- `dashboard.getMetrics` - Get dashboard metrics
- `dashboard.getKPIs` - Get dashboard KPIs
- `reports.arAging` - Generate AR aging report
- `reports.inventory` - Generate inventory report

### Product & Purchase Orders
- `products.list` - List all products
- `purchaseOrders.list` - List purchase orders

### Comments
- `comments.list` - List comments

## Performance Targets

- **P50 < 100ms:** Fast response for typical requests
- **P95 < 500ms:** Acceptable for most users
- **P99 < 1000ms:** Rare slow requests

## Benchmark Methodology

The benchmark script:
1. Measures each endpoint 10 times
2. Calculates average, min, max, P50, P95, and P99
3. Identifies slow endpoints (P95 > 500ms)
4. Generates recommendations

## Expected Improvements from ST-005

With the database indexes added in ST-005, we expect:
- **60-80% improvement** on queries with JOINs
- **Significant improvement** on filtered queries (status, foreign keys)
- **Reduced load** on database during peak usage

## Key Indexes Added

### Batches Table
- `idx_batches_status` - Improves filtered queries by status
- `idx_batches_product_id` - Speeds up product-batch JOINs
- `idx_batches_lot_id` - Speeds up lot-batch JOINs

### Orders Table
- `idx_orders_created_by` - User activity queries
- `idx_orders_packed_by` - Fulfillment tracking
- `idx_orders_shipped_by` - Shipping queries
- `idx_orders_intake_event_id` - Calendar integration

### Supporting Tables
- Payment history indexes (batch, vendor, user)
- Batch locations index
- Sales table indexes (batch, product, customer)
- Order returns indexes
- Comments indexes

## Next Steps

1. ✅ Database indexes implemented (ST-005)
2. ⏳ Run actual benchmark with real data
3. ⏳ Implement batch status transition logic (ST-017)
4. ⏳ Add query result caching where appropriate
5. ⏳ Optimize N+1 queries identified in benchmarks
6. ⏳ Re-run benchmark after all optimizations

## Notes

- Benchmark script is ready at `scripts/benchmark-api.ts`
- To run: `pnpm tsx scripts/benchmark-api.ts`
- Script currently uses simulated data; integrate with actual tRPC client for production benchmarks
- Consider running benchmarks before and after index migration to measure actual improvement

## Related Tasks

- **ST-005:** Add Missing Database Indexes ✅
- **ST-015:** Benchmark Critical Paths (this document)
- **ST-017:** Implement Batch Status Transition Logic
