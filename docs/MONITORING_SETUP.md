# Monitoring & Observability Setup

This document describes the monitoring and observability infrastructure for the TERP application.

## Overview

The TERP monitoring system consists of two main components:

1. **Error Tracking (Sentry)** - Captures and reports client and server errors
2. **Performance Monitoring** - Tracks API performance and identifies slow operations

## Error Tracking with Sentry

### Configuration

Sentry is configured in two separate files:

- `sentry.client.config.ts` - Client-side error tracking for React application
- `sentry.server.config.ts` - Server-side error tracking for Node.js/Express

### Environment Variables

To enable Sentry, set the following environment variables:

```bash
# Client-side (Vite)
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id

# Server-side
SENTRY_DSN=https://your-dsn@sentry.io/project-id
```

**Note:** Sentry is automatically disabled in development unless a DSN is explicitly set.

### Features

#### Client-Side
- Automatic error boundary integration
- Session replay for debugging (10% of sessions, 100% with errors)
- Performance monitoring with React Router tracing
- Sensitive data filtering
- User-friendly error messages with error IDs

#### Server-Side
- Express middleware integration
- HTTP request tracing
- Console log capture (errors and warnings)
- Automatic credential sanitization
- Performance transaction tracking

### Error Boundary

The `ErrorBoundary` component (`client/src/components/ErrorBoundary.tsx`) automatically:
- Catches React component errors
- Reports errors to Sentry with full context
- Shows user-friendly error messages
- Provides error IDs for support tracking
- Offers "Try Again" and "Reload Page" options

### Manual Error Reporting

```typescript
import * as Sentry from "@sentry/react";

// Capture an exception
try {
  // risky operation
} catch (error) {
  Sentry.captureException(error, {
    tags: { feature: "orders" },
    extra: { orderId: 123 },
  });
}

// Capture a message
Sentry.captureMessage("Important event occurred", "info");
```

## Performance Monitoring

### Architecture

Performance monitoring is implemented using:
- Custom tRPC middleware (`server/_core/performanceMiddleware.ts`)
- Sentry transaction tracking
- In-memory metrics storage
- Admin-only monitoring dashboard

### Features

1. **Automatic Procedure Tracking**
   - All tRPC procedures are automatically instrumented
   - Execution time is recorded for every API call
   - Slow operations are logged and reported to Sentry

2. **Slow Query Detection**
   - Slow threshold: 1 second (warning)
   - Very slow threshold: 3 seconds (error)
   - Automatic Sentry alerts for slow operations

3. **Performance Metrics**
   - Last 100 procedure executions stored in memory
   - Success/failure tracking
   - Duration statistics
   - Error rate calculation

4. **Database Query Tracking**
   - Helper function: `trackDatabaseQuery()`
   - Automatic slow query detection
   - Error reporting with context

### Monitoring Dashboard

Access the monitoring dashboard via tRPC endpoints (admin only):

```typescript
// Get recent metrics
const { metrics } = await trpc.monitoring.getRecentMetrics.query();

// Get slow query statistics
const stats = await trpc.monitoring.getSlowQueryStats.query();

// Get performance summary
const summary = await trpc.monitoring.getPerformanceSummary.query();

// Get metrics for specific procedure
const procedureMetrics = await trpc.monitoring.getProcedureMetrics.query({
  procedure: "query.orders.getAll",
});
```

### Dashboard Endpoints

#### `getRecentMetrics`
Returns the last 100 tRPC procedure executions with:
- Procedure name
- Duration (ms)
- Success/failure status
- Error message (if failed)
- Timestamp

#### `getSlowQueryStats`
Returns aggregated statistics:
- Total procedure count
- Slow query count (>1s)
- Very slow query count (>3s)
- Slow query percentage
- Average duration

#### `getPerformanceSummary`
Returns comprehensive overview:
- Overall statistics
- Top 10 slowest procedures
- Recent errors (last 10)
- Per-procedure metrics (count, average duration, error rate)

#### `getProcedureMetrics`
Returns detailed metrics for a specific procedure:
- All executions
- Average, min, max duration
- Error rate
- Slow query rate

### Using Performance Tracking

#### Automatic (tRPC Procedures)
All `protectedProcedure` and `adminProcedure` calls are automatically tracked. No additional code needed.

#### Manual (Database Queries)
```typescript
import { trackDatabaseQuery } from "../_core/performanceMiddleware";

// Wrap database queries for performance tracking
const users = await trackDatabaseQuery(
  "getUsersByRole",
  async () => {
    return await db.select().from(usersTable).where(eq(usersTable.role, "admin"));
  }
);
```

## Thresholds and Alerts

### Performance Thresholds

| Threshold | Duration | Action |
|-----------|----------|--------|
| Normal | < 1s | Debug log only |
| Slow | 1-3s | Warning log + Sentry warning |
| Very Slow | > 3s | Error log + Sentry error |

### Sentry Integration

Slow and very slow operations are automatically reported to Sentry with:
- Procedure name
- Duration
- User ID (if authenticated)
- Full stack trace
- Request context

## Best Practices

### 1. Set DSN in Production Only
```bash
# Production
SENTRY_DSN=https://...
VITE_SENTRY_DSN=https://...

# Development (leave unset for local testing)
# SENTRY_DSN=
# VITE_SENTRY_DSN=
```

### 2. Monitor Slow Query Alerts
- Check Sentry dashboard regularly for slow query alerts
- Investigate procedures with >1s average duration
- Optimize database queries and add indexes as needed

### 3. Use Performance Dashboard
- Review `/api/trpc/monitoring.getPerformanceSummary` weekly
- Identify performance regressions early
- Track improvements after optimization

### 4. Track Custom Operations
```typescript
// For non-tRPC operations, use Sentry transactions
const transaction = Sentry.startTransaction({
  op: "batch.processing",
  name: "Process Orders Batch",
});

try {
  // ... processing logic
  transaction.setStatus("ok");
} catch (error) {
  transaction.setStatus("internal_error");
  Sentry.captureException(error);
} finally {
  transaction.finish();
}
```

### 5. Filter Sensitive Data
Both client and server configs automatically filter:
- Authorization headers
- Cookies
- Query parameters (token, key)
- User input in error messages

## Troubleshooting

### Sentry Not Reporting Errors

1. Check DSN is set:
   ```bash
   echo $SENTRY_DSN
   echo $VITE_SENTRY_DSN
   ```

2. Check Sentry initialization logs:
   ```
   ✓ Sentry monitoring initialized
   ```

3. Verify environment:
   - Sentry is disabled in development by default
   - Set DSN explicitly to enable in development

### Performance Metrics Not Showing

1. Verify middleware is applied:
   - Check `server/_core/trpc.ts`
   - `performanceMiddleware` should be in procedure chain

2. Check admin access:
   - Monitoring endpoints require admin role
   - Verify user has `role: 'admin'`

3. Verify recent activity:
   - Metrics store only last 100 operations
   - Make some API calls to populate metrics

### High Memory Usage

The in-memory metrics store is limited to 100 entries. If memory usage is a concern:

1. Reduce `MAX_METRICS` in `performanceMiddleware.ts`
2. Implement external metrics storage (e.g., Redis, TimescaleDB)
3. Use Sentry's built-in performance monitoring exclusively

## Future Enhancements

Potential improvements for the monitoring system:

1. **Persistent Metrics Storage**
   - Store metrics in database for historical analysis
   - Implement retention policies

2. **Real-time Alerts**
   - Email/Slack notifications for critical errors
   - Threshold-based alerting

3. **Custom Dashboards**
   - React component for visualizing metrics
   - Charts and graphs for performance trends

4. **Distributed Tracing**
   - Full request tracing across services
   - Database query attribution

5. **Resource Monitoring**
   - CPU and memory usage tracking
   - Database connection pool monitoring

## Related Files

- `sentry.client.config.ts` - Client Sentry configuration
- `sentry.server.config.ts` - Server Sentry configuration
- `server/_core/monitoring.ts` - Monitoring initialization
- `server/_core/performanceMiddleware.ts` - Performance tracking middleware
- `server/_core/trpc.ts` - tRPC middleware configuration
- `server/routers/monitoring.ts` - Monitoring dashboard API
- `client/src/components/ErrorBoundary.tsx` - React error boundary

## Support

For questions or issues with monitoring:
1. Check Sentry dashboard for error details
2. Review performance metrics via monitoring API
3. Consult this documentation
4. Contact DevOps team for infrastructure issues

---

**Last Updated:** 2025-11-17  
**Maintained By:** Agent-02  
**Status:** Production Ready
