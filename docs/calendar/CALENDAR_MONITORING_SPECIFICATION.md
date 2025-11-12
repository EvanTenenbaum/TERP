# Calendar Module - Monitoring & Logging Specification
**Complete Observability Requirements per TERP Bible Protocols**

---

## 📋 Document Info

- **Version**: 1.0
- **Date**: 2025-11-10
- **Module**: Calendar Evolution v3.2
- **Compliance**: TERP Bible Monitoring Protocols
- **Status**: Production-Ready

---

## 🎯 Monitoring Overview

This document specifies **complete monitoring and logging requirements** for the Calendar module per TERP Bible protocols. All requirements are **MANDATORY** for production deployment.

### Monitoring Pillars

| Pillar | Purpose | Tools |
|--------|---------|-------|
| **Health Checks** | Verify system is operational | Custom endpoints |
| **Application Logs** | Track operations and errors | Winston, DigitalOcean Logs |
| **Error Tracking** | Capture and analyze errors | Sentry (to be configured) |
| **Performance Monitoring** | Track slow operations | Custom metrics, DigitalOcean Insights |
| **Alert Configuration** | Notify on critical issues | DigitalOcean Alerts, Email |

---

## 🏥 HEALTH CHECK ENDPOINTS

### 1. Calendar Health Check

**Endpoint**: `/api/health/calendar`

**Purpose**: Verify calendar module is operational

**Implementation**:

```typescript
// server/routers/health.ts
import { router, publicProcedure } from "./_core/trpc";
import { calendarEvents } from "../db/schema";
import { sql } from "drizzle-orm";

export const healthRouter = router({
  calendar: publicProcedure.query(async ({ ctx }) => {
    const startTime = Date.now();
    
    try {
      // Check 1: Database connection
      const [eventCount] = await ctx.db
        .select({ count: sql<number>`COUNT(*)` })
        .from(calendarEvents);
      
      // Check 2: Recent events query
      const recentEvents = await ctx.db
        .select({ id: calendarEvents.id })
        .from(calendarEvents)
        .limit(1);
      
      const duration = Date.now() - startTime;
      
      return {
        status: "ok",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        checks: {
          database: "ok",
          eventCount: eventCount.count,
          recentEventsQuery: "ok",
        },
        performance: {
          responseTime: duration,
        },
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      
      return {
        status: "error",
        timestamp: new Date().toISOString(),
        error: error.message,
        performance: {
          responseTime: duration,
        },
      };
    }
  }),
});
```

**Expected Response (Healthy)**:
```json
{
  "status": "ok",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "uptime": 12345,
  "checks": {
    "database": "ok",
    "eventCount": 1234,
    "recentEventsQuery": "ok"
  },
  "performance": {
    "responseTime": 45
  }
}
```

**Expected Response (Unhealthy)**:
```json
{
  "status": "error",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "error": "Connection lost: The server closed the connection.",
  "performance": {
    "responseTime": 5000
  }
}
```

---

### 2. Automated Health Monitoring

**Script**: `scripts/health-check.sh`

```bash
#!/bin/bash
# Health check script for calendar module

HEALTH_URL="https://terp-app-b9s35.ondigitalocean.app/api/health/calendar"
ALERT_EMAIL="admin@example.com"

response=$(curl -s $HEALTH_URL)
status=$(echo $response | jq -r '.status')

if [ "$status" = "ok" ]; then
  echo "✅ Calendar module is healthy"
  exit 0
else
  echo "❌ Calendar module is unhealthy"
  echo "$response" | mail -s "TERP Calendar Alert" $ALERT_EMAIL
  exit 1
fi
```

**Cron Schedule** (every 5 minutes):
```bash
*/5 * * * * /path/to/health-check.sh
```

---

## 📝 APPLICATION LOGGING

### Logging Levels

| Level | Usage | Examples |
|-------|-------|----------|
| **ERROR** | Critical failures | Database connection lost, API errors |
| **WARN** | Potential issues | Slow queries, deprecated features |
| **INFO** | Normal operations | Event created, payment processed |
| **DEBUG** | Development details | Query parameters, intermediate values |

---

### 1. Logger Setup

**File**: `server/utils/logger.ts`

```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: "terp-calendar",
    environment: process.env.NODE_ENV,
  },
  transports: [
    // Console output
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
    
    // File output (errors only)
    new winston.transports.File({
      filename: "logs/calendar-error.log",
      level: "error",
    }),
    
    // File output (all logs)
    new winston.transports.File({
      filename: "logs/calendar-combined.log",
    }),
  ],
});

export { logger };
```

---

### 2. Operation Logging

**Pattern**: Log all significant operations

```typescript
import { logger } from "../utils/logger";

// SUCCESS LOGGING
export const createEvent = protectedProcedure
  .input(z.object({ ... }))
  .mutation(async ({ ctx, input }) => {
    const startTime = Date.now();
    
    try {
      const result = await ctx.db.transaction(async (tx) => {
        // ... create event ...
      });
      
      const duration = Date.now() - startTime;
      
      // Log success
      logger.info("Event created", {
        operation: "createEvent",
        eventId: result.id,
        eventType: input.eventType,
        clientId: input.clientId,
        vendorId: input.vendorId,
        userId: ctx.user.id,
        duration,
        timestamp: new Date().toISOString(),
      });
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      // Log error
      logger.error("Failed to create event", {
        operation: "createEvent",
        error: error.message,
        stack: error.stack,
        input: input,
        userId: ctx.user.id,
        duration,
        timestamp: new Date().toISOString(),
      });
      
      throw error;
    }
  });
```

---

### 3. Required Logging Points

**All operations MUST log**:

#### Event Operations
- [ ] Event created (INFO)
- [ ] Event updated (INFO)
- [ ] Event deleted (INFO)
- [ ] Event creation failed (ERROR)
- [ ] Event update failed (ERROR)
- [ ] Event deletion failed (ERROR)

#### Client Integration
- [ ] Appointments retrieved for client (INFO)
- [ ] Quick book appointment created (INFO)
- [ ] Client activity created (INFO)
- [ ] Meeting history created (INFO)
- [ ] Conflict detected (WARN)

#### Payment Processing
- [ ] Customer payment processed (INFO)
- [ ] Vendor payment processed (INFO)
- [ ] Payment validation failed (WARN)
- [ ] Payment processing failed (ERROR)
- [ ] Invoice status updated (INFO)
- [ ] PO status updated (INFO)

#### Operations
- [ ] Order created from appointment (INFO)
- [ ] Batch linked to photo session (INFO)
- [ ] Duplicate order detected (WARN)

#### Performance
- [ ] Slow query detected (WARN)
- [ ] Operation exceeded timeout (ERROR)

#### Validation
- [ ] Invalid input detected (WARN)
- [ ] Permission denied (WARN)
- [ ] Reference validation failed (WARN)

---

### 4. Log Format

**Standard Log Entry**:

```json
{
  "level": "info",
  "message": "Event created",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "service": "terp-calendar",
  "environment": "production",
  "operation": "createEvent",
  "eventId": 123,
  "eventType": "MEETING",
  "clientId": 456,
  "userId": 789,
  "duration": 145,
  "metadata": {
    "timezone": "America/Los_Angeles",
    "conflictCheck": true
  }
}
```

**Error Log Entry**:

```json
{
  "level": "error",
  "message": "Failed to create event",
  "timestamp": "2025-11-10T10:00:00.000Z",
  "service": "terp-calendar",
  "environment": "production",
  "operation": "createEvent",
  "error": "Connection lost: The server closed the connection.",
  "stack": "Error: Connection lost...\n    at ...",
  "input": {
    "title": "Test Event",
    "eventType": "MEETING"
  },
  "userId": 789,
  "duration": 5000
}
```

---

## 🚨 ERROR TRACKING

### 1. Sentry Integration (To Be Configured)

**Setup**:

```typescript
// server/utils/sentry.ts
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});

export { Sentry };
```

**Usage**:

```typescript
import { Sentry } from "../utils/sentry";

try {
  // ... operation ...
} catch (error) {
  // Capture exception in Sentry
  Sentry.captureException(error, {
    tags: {
      module: "calendar",
      operation: "createEvent",
    },
    user: {
      id: ctx.user.id,
      email: ctx.user.email,
    },
    extra: {
      input: input,
      timestamp: new Date().toISOString(),
    },
  });
  
  throw error;
}
```

---

### 2. Error Categories

**Track these error types**:

| Category | Examples | Severity |
|----------|----------|----------|
| **Database Errors** | Connection lost, query timeout | Critical |
| **Validation Errors** | Invalid input, missing fields | High |
| **Permission Errors** | Insufficient permissions | Medium |
| **Business Logic Errors** | Conflict detected, duplicate order | Medium |
| **External Service Errors** | Email service down | High |

---

## 📊 PERFORMANCE MONITORING

### 1. Slow Query Detection

**Threshold**: 1000ms (1 second)

**Implementation**:

```typescript
const SLOW_QUERY_THRESHOLD = 1000; // 1 second

const startTime = Date.now();
const result = await ctx.db.query.calendarEvents.findMany(...);
const duration = Date.now() - startTime;

if (duration > SLOW_QUERY_THRESHOLD) {
  logger.warn("Slow query detected", {
    operation: "findMany",
    table: "calendar_events",
    duration,
    threshold: SLOW_QUERY_THRESHOLD,
    filters: input,
    timestamp: new Date().toISOString(),
  });
}
```

---

### 2. Operation Performance Tracking

**Track duration for all operations**:

```typescript
const performanceMetrics = {
  createEvent: [],
  updateEvent: [],
  deleteEvent: [],
  getEvents: [],
  quickBook: [],
  processPayment: [],
};

// After each operation
performanceMetrics.createEvent.push(duration);

// Calculate statistics periodically
const avg = performanceMetrics.createEvent.reduce((a, b) => a + b, 0) / performanceMetrics.createEvent.length;
const max = Math.max(...performanceMetrics.createEvent);
const min = Math.min(...performanceMetrics.createEvent);

logger.info("Performance metrics", {
  operation: "createEvent",
  avg,
  max,
  min,
  count: performanceMetrics.createEvent.length,
});
```

---

### 3. Performance Targets

| Operation | Target | Warning | Critical |
|-----------|--------|---------|----------|
| **createEvent** | < 200ms | > 500ms | > 1000ms |
| **updateEvent** | < 200ms | > 500ms | > 1000ms |
| **getEvents** | < 100ms | > 300ms | > 500ms |
| **quickBook** | < 300ms | > 700ms | > 1500ms |
| **processPayment** | < 500ms | > 1000ms | > 2000ms |
| **getAvailableSlots** | < 500ms | > 1000ms | > 2000ms |

---

## 🔔 ALERT CONFIGURATION

### 1. Critical Alerts (Immediate Action Required)

#### Alert: Application Down
**Trigger**: Health check returns non-200 status  
**Action**:
1. Check deployment status
2. Review recent logs
3. Consider rollback if issue persists

**DigitalOcean Alert**:
```bash
# Configure via DigitalOcean dashboard
# Alert Policy: HTTP Status != 200
# Notification: Email to admin@example.com
```

---

#### Alert: High Error Rate
**Trigger**: > 10 errors per minute in logs  
**Action**:
1. Review error logs
2. Check Sentry dashboard
3. Identify root cause

**Implementation**:
```typescript
let errorCount = 0;
let errorWindow = Date.now();

// In error handler
errorCount++;
if (Date.now() - errorWindow > 60000) {
  if (errorCount > 10) {
    logger.error("High error rate detected", {
      errorCount,
      timeWindow: "1 minute",
    });
    // Send alert email
  }
  errorCount = 0;
  errorWindow = Date.now();
}
```

---

#### Alert: Database Connection Failures
**Trigger**: "ECONNREFUSED" or "Connection lost" in logs  
**Action**:
1. Check database status in DigitalOcean
2. Verify DATABASE_URL is correct
3. Check database connection pool

---

### 2. Warning Alerts (Monitor Closely)

#### Alert: High Memory Usage
**Trigger**: Memory usage > 80%  
**Action**:
1. Monitor for memory leaks
2. Consider scaling up if sustained

---

#### Alert: Slow Response Times
**Trigger**: Average response time > 2 seconds  
**Action**:
1. Check database query performance
2. Review slow API endpoints
3. Consider caching strategies

---

#### Alert: Conflict Detection Frequent
**Trigger**: > 5 conflicts detected per hour  
**Action**:
1. Review calendar capacity
2. Consider adding more time slots
3. Review booking workflow

---

## 📈 METRICS TO TRACK

### Operational Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Events Created** | Number of events created per day | Track trend |
| **Events Updated** | Number of events updated per day | Track trend |
| **Events Deleted** | Number of events deleted per day | Track trend |
| **Conflicts Detected** | Number of conflicts detected per day | < 10/day |
| **Payments Processed** | Number of payments processed per day | Track trend |
| **Orders Created** | Number of orders created from appointments | Track trend |

---

### Performance Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Average Response Time** | Average API response time | < 200ms |
| **95th Percentile Response Time** | 95th percentile API response time | < 500ms |
| **Slow Queries** | Number of queries > 1s | < 5/day |
| **Error Rate** | Percentage of requests that error | < 1% |

---

### Business Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| **Appointment Booking Rate** | Appointments booked per week | Track trend |
| **Cancellation Rate** | Percentage of appointments cancelled | < 10% |
| **No-Show Rate** | Percentage of appointments no-show | < 5% |
| **VIP Portal Bookings** | Bookings from VIP portal per week | Track trend |

---

## 🔍 LOG ACCESS

### DigitalOcean CLI

```bash
# Real-time logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --follow

# Recent logs
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --tail 100

# Filter by level
doctl apps logs 1fd40be5-b9af-4e71-ab1d-3af0864a7da4 --tail 100 | grep ERROR
```

---

### DigitalOcean API

```bash
curl -X GET \
  -H "Authorization: Bearer $DIGITALOCEAN_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments/<deployment_id>/logs?type=RUN&follow=false"
```

---

### Local Log Files

```bash
# View error logs
tail -f logs/calendar-error.log

# View all logs
tail -f logs/calendar-combined.log

# Search for specific operation
grep "createEvent" logs/calendar-combined.log
```

---

## 🚀 ROLLBACK PROCEDURES

### Scenario 1: Critical Bug in Calendar Module

**Option A: Git Revert**

```bash
# 1. Identify problematic commit
git log --oneline --grep="calendar" -10

# 2. Revert the commit
git revert <commit-hash>

# 3. Push to trigger auto-deploy
git push origin main

# 4. Monitor deployment
doctl apps get 1fd40be5-b9af-4e71-ab1d-3af0864a7da4
```

**Time to Complete**: ~4-5 minutes

---

**Option B: DigitalOcean Rollback**

```bash
# 1. Get previous deployment ID
curl -s -H "Authorization: Bearer $DO_TOKEN" \
  "https://api.digitalocean.com/v2/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments" | \
  jq -r '.deployments[1].id'

# 2. Trigger rollback via dashboard
# Navigate to: https://cloud.digitalocean.com/apps/1fd40be5-b9af-4e71-ab1d-3af0864a7da4/deployments
# Click "Rollback" on previous successful deployment
```

**Time to Complete**: ~2-3 minutes

---

### Scenario 2: Database Migration Issue

```bash
# 1. Connect to database
mysql -h terp-mysql-db-do-user-28175253-0.m.db.ondigitalocean.com \
      -P 25060 \
      -u doadmin \
      -p \
      --ssl-mode=REQUIRED

# 2. Check recent migrations
SELECT * FROM migrations ORDER BY id DESC LIMIT 5;

# 3. Manually revert migration if needed
# (Depends on specific migration)

# 4. Redeploy application
git push origin main
```

---

## ✅ MONITORING CHECKLIST

**Before deployment**:
- [ ] Health check endpoint implemented
- [ ] All operations log success/failure
- [ ] Error tracking configured (Sentry)
- [ ] Performance monitoring in place
- [ ] Slow query detection enabled
- [ ] Alerts configured in DigitalOcean

**After deployment**:
- [ ] Health check returns 200
- [ ] Logs are being generated
- [ ] Errors are captured in Sentry
- [ ] Performance metrics within targets
- [ ] Alerts are working

**Ongoing**:
- [ ] Review logs daily
- [ ] Monitor error rate
- [ ] Track performance metrics
- [ ] Respond to alerts promptly
- [ ] Update thresholds as needed

---

## 📖 REFERENCE DOCUMENTS

- **Monitoring Plan**: `docs/TERP_MONITORING_ROLLBACK_PLAN.md`
- **Bible Protocols**: `docs/DEVELOPMENT_PROTOCOLS.md`
- **DigitalOcean Docs**: https://docs.digitalocean.com/products/app-platform/

---

## 🎯 DEFINITION OF DONE (Monitoring)

**Monitoring is "Done" only when**:

- [ ] **Health check endpoint** implemented and tested
- [ ] **All operations log** success and failure
- [ ] **Error tracking** configured (Sentry)
- [ ] **Performance monitoring** in place
- [ ] **Slow query detection** enabled
- [ ] **Alerts configured** in DigitalOcean
- [ ] **Rollback procedures** documented and tested
- [ ] **Log access** verified (CLI and API)
- [ ] **Metrics tracked** (operational, performance, business)
- [ ] **Monitoring checklist** completed

---

**Document Status**: Complete  
**Compliance**: TERP Bible Monitoring Protocols  
**Next Step**: Implement monitoring following this specification
