# Wave 4C: Silent Error Fixes + Database Error Investigation

**Agent Role**: Full Stack Developer  
**Duration**: 6-8 hours  
**Priority**: P1 (upgraded from P2 due to Wave 3 findings)  
**Dependencies**: Wave 3 complete  
**Can Run Parallel With**: Wave 4A, 4B, 4D (different file domains)

---

## ⚠️ WAVE 3 FINDINGS - PRIORITY UPDATES

**Wave 3 testing discovered critical database errors on the live site:**

1. **P0: Samples API Database Error** - `samples.getAll` returns query failure
2. **P0: Calendar API Database Error** - `calendar.getEvents` returns query failure  
3. **P1: SSL Connection Instability** - Intermittent TLS handshake failures

**These are NOT silent errors - they are actual failures that need ROOT CAUSE investigation and fixing.**

---

## Overview

1. **PRIORITY**: Investigate and fix the Samples and Calendar database errors
2. Fix all locations where errors are silently caught and return null/empty
3. Add proper logging to make debugging easier

---

## File Domain

**Your files**: 
- `server/routers/samples.ts` (PRIORITY)
- `server/routers/calendar.ts` (PRIORITY)
- `server/db/schema.ts` (if schema changes needed)
- `client/src/components/` (specific components listed below)
- `server/` utility files (authHelpers, inventoryUtils)
- `server/routers/audit.ts`

**Do NOT modify**: 
- `client/src/pages/*.tsx` (Wave 4B domain)
- SQL safety utilities (Wave 4A domain)

---

## Task 1: INVESTIGATE SAMPLES DATABASE ERROR (1.5 hours) - PRIORITY

### Step 1: Check the Schema

```bash
# Check if sampleRequests table exists and has correct schema
grep -n "sampleRequests\|sample_requests" server/db/schema.ts
```

```typescript
// server/db/schema.ts - Verify this table exists
export const sampleRequests = pgTable('sample_requests', {
  id: serial('id').primaryKey(),
  clientId: integer('client_id').references(() => clients.id),
  status: varchar('status', { length: 50 }).default('pending'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Step 2: Check the Router

```typescript
// server/routers/samples.ts

import { logger } from '../lib/logger';

export const samplesRouter = router({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    
    // Add detailed logging
    logger.info('[Samples] Fetching all samples', { userId: ctx.user?.id });
    
    try {
      // Check if table exists first
      const tableCheck = await db.execute(sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'sample_requests'
        );
      `);
      
      logger.debug('[Samples] Table check result', { exists: tableCheck });
      
      const samples = await db.query.sampleRequests.findMany({
        with: {
          client: true,
        },
        orderBy: desc(sampleRequests.createdAt),
      });
      
      logger.info('[Samples] Successfully fetched samples', { count: samples.length });
      return samples;
    } catch (error) {
      logger.error('[Samples] Database error', { 
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // Re-throw with more context
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to fetch samples. Database error.',
        cause: error,
      });
    }
  }),
});
```

### Step 3: Check for Missing Migration

```bash
# Check if migration exists for sample_requests table
ls -la server/db/migrations/ | grep -i sample

# If missing, create migration
npx drizzle-kit generate:pg --schema=server/db/schema.ts
```

### Step 4: Potential Fixes

**If table doesn't exist:**
```typescript
// Create migration
// server/db/migrations/XXXX_add_sample_requests.sql

CREATE TABLE IF NOT EXISTS sample_requests (
  id SERIAL PRIMARY KEY,
  client_id INTEGER REFERENCES clients(id),
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sample_requests_client ON sample_requests(client_id);
CREATE INDEX idx_sample_requests_status ON sample_requests(status);
```

**If schema mismatch:**
```typescript
// Check for column name mismatches (snake_case vs camelCase)
// Ensure Drizzle schema matches actual database columns
```

---

## Task 2: INVESTIGATE CALENDAR DATABASE ERROR (1.5 hours) - PRIORITY

### Step 1: Check the Schema

```bash
# Check if calendar_events table exists
grep -n "calendarEvents\|calendar_events" server/db/schema.ts
```

```typescript
// server/db/schema.ts - Verify this table exists
export const calendarEvents = pgTable('calendar_events', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  userId: integer('user_id').references(() => users.id),
  clientId: integer('client_id').references(() => clients.id),
  type: varchar('type', { length: 50 }).default('appointment'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

### Step 2: Check the Router

```typescript
// server/routers/calendar.ts

import { logger } from '../lib/logger';

export const calendarRouter = router({
  getEvents: protectedProcedure
    .input(z.object({
      start: z.date(),
      end: z.date(),
    }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      
      logger.info('[Calendar] Fetching events', { 
        userId: ctx.user?.id,
        start: input.start,
        end: input.end,
      });
      
      try {
        // Check if table exists
        const tableCheck = await db.execute(sql`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'calendar_events'
          );
        `);
        
        if (!tableCheck.rows[0]?.exists) {
          logger.error('[Calendar] calendar_events table does not exist');
          throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Calendar system not configured. Please contact support.',
          });
        }
        
        const events = await db.query.calendarEvents.findMany({
          where: and(
            gte(calendarEvents.startTime, input.start),
            lte(calendarEvents.endTime, input.end),
            or(
              eq(calendarEvents.userId, ctx.user!.id),
              isNull(calendarEvents.userId) // Public events
            )
          ),
          with: {
            client: true,
          },
          orderBy: asc(calendarEvents.startTime),
        });
        
        logger.info('[Calendar] Successfully fetched events', { count: events.length });
        return events;
      } catch (error) {
        logger.error('[Calendar] Database error', {
          error: error instanceof Error ? error.message : error,
          stack: error instanceof Error ? error.stack : undefined,
        });
        
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch calendar events. Database error.',
          cause: error,
        });
      }
    }),
});
```

### Step 3: Check for Missing Migration

```bash
# Check if migration exists
ls -la server/db/migrations/ | grep -i calendar

# Generate if missing
npx drizzle-kit generate:pg --schema=server/db/schema.ts
```

---

## Task 3: Fix Frontend Silent Null Checks (1.5 hours)

### BUG-054: AppointmentRequestsList

```typescript
// client/src/components/calendar/AppointmentRequestsList.tsx

import { LoadingState } from '@/components/ui/loading-state';
import { ErrorState, EmptyState } from '@/components/ui/empty-state';

export function AppointmentRequestsList() {
  const { data, isLoading, error, refetch } = trpc.calendar.getAppointmentRequests.useQuery();

  if (isLoading) {
    return <LoadingState message="Loading appointment requests..." />;
  }

  if (error) {
    console.error('[AppointmentRequestsList] Error:', error);
    return (
      <ErrorState
        title="Failed to load appointment requests"
        description={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  const requests = data?.requests ?? [];

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<Calendar className="h-12 w-12" />}
        title="No appointment requests"
        description="Appointment requests from clients will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <AppointmentRequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
```

### BUG-055: TimeOffRequestsList

```typescript
// client/src/components/hr/TimeOffRequestsList.tsx

export function TimeOffRequestsList() {
  const { data, isLoading, error, refetch } = trpc.hr.getTimeOffRequests.useQuery();

  if (isLoading) {
    return <LoadingState message="Loading time off requests..." />;
  }

  if (error) {
    console.error('[TimeOffRequestsList] Error:', error);
    return (
      <ErrorState
        title="Failed to load time off requests"
        description={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  const requests = data?.requests ?? [];

  if (requests.length === 0) {
    return (
      <EmptyState
        icon={<CalendarOff className="h-12 w-12" />}
        title="No time off requests"
        description="Time off requests from employees will appear here."
      />
    );
  }

  return (
    <div className="space-y-4">
      {requests.map(request => (
        <TimeOffRequestCard key={request.id} request={request} />
      ))}
    </div>
  );
}
```

### BUG-056: ActivityLogPanel

```typescript
// client/src/components/dashboard/ActivityLogPanel.tsx

export function ActivityLogPanel() {
  const { data, isLoading, error, refetch } = trpc.dashboard.getActivityLog.useQuery();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    console.error('[ActivityLogPanel] Error:', error);
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 mx-auto text-destructive mb-2" />
            <p className="text-sm text-muted-foreground">Failed to load activity</p>
            <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const activities = data?.activities ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No recent activity
          </p>
        ) : (
          <div className="space-y-3">
            {activities.map(activity => (
              <ActivityItem key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Task 4: Fix Backend Silent Returns (1.5 hours)

### BUG-058: Auth Helpers

```typescript
// server/_core/authHelpers.ts

import { logger } from '../lib/logger';

export async function getUserFromToken(token: string): Promise<User | null> {
  if (!token) {
    logger.debug('[Auth] No token provided');
    return null;
  }

  try {
    const decoded = jwt.verify(token, SECRET) as { userId: number };
    
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });

    if (!user) {
      logger.warn('[Auth] Token valid but user not found', { userId: decoded.userId });
      return null;
    }

    return user;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      logger.debug('[Auth] Token expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      logger.warn('[Auth] Invalid token', { error: error.message });
    } else {
      logger.error('[Auth] Unexpected error verifying token', { error });
    }
    return null;
  }
}

export async function validateSession(sessionId: string): Promise<Session | null> {
  if (!sessionId) {
    logger.debug('[Auth] No session ID provided');
    return null;
  }

  try {
    const session = await db.query.sessions.findFirst({
      where: and(
        eq(sessions.id, sessionId),
        gt(sessions.expiresAt, new Date())
      ),
    });

    if (!session) {
      logger.debug('[Auth] Session not found or expired', { sessionId });
      return null;
    }

    return session;
  } catch (error) {
    logger.error('[Auth] Error validating session', { sessionId, error });
    return null;
  }
}
```

### BUG-059: Inventory Utils

```typescript
// server/utils/inventoryUtils.ts

import { logger } from '../lib/logger';

export async function getAvailableQuantity(batchId: number): Promise<number> {
  if (!batchId || batchId <= 0) {
    logger.warn('[Inventory] Invalid batch ID', { batchId });
    throw new Error('Invalid batch ID');
  }

  try {
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, batchId),
    });

    if (!batch) {
      logger.warn('[Inventory] Batch not found', { batchId });
      throw new Error(`Batch ${batchId} not found`);
    }

    const available = batch.quantity - batch.reservedQuantity;
    
    if (available < 0) {
      logger.error('[Inventory] Negative available quantity detected', { 
        batchId, 
        quantity: batch.quantity, 
        reserved: batch.reservedQuantity 
      });
    }

    return Math.max(0, available);
  } catch (error) {
    logger.error('[Inventory] Error getting available quantity', { batchId, error });
    throw error;
  }
}

export async function reserveInventory(batchId: number, quantity: number): Promise<boolean> {
  logger.info('[Inventory] Reserving inventory', { batchId, quantity });

  try {
    const available = await getAvailableQuantity(batchId);
    
    if (quantity > available) {
      logger.warn('[Inventory] Insufficient inventory for reservation', {
        batchId,
        requested: quantity,
        available,
      });
      return false;
    }

    await db.update(batches)
      .set({ reservedQuantity: sql`reserved_quantity + ${quantity}` })
      .where(eq(batches.id, batchId));

    logger.info('[Inventory] Inventory reserved successfully', { batchId, quantity });
    return true;
  } catch (error) {
    logger.error('[Inventory] Failed to reserve inventory', { batchId, quantity, error });
    throw error;
  }
}
```

### BUG-060: Audit Router

```typescript
// server/routers/audit.ts

import { logger } from '../lib/logger';

export const auditRouter = router({
  getHistory: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      logger.info('[Audit] Fetching history', { 
        entityType: input.entityType, 
        entityId: input.entityId,
        userId: ctx.user?.id,
      });
      
      try {
        const logs = await db.query.auditLogs.findMany({
          where: and(
            eq(auditLogs.entityType, input.entityType),
            eq(auditLogs.entityId, input.entityId)
          ),
          orderBy: desc(auditLogs.createdAt),
          limit: 100,
        });

        logger.debug('[Audit] Found logs', { count: logs.length });
        return logs;
      } catch (error) {
        logger.error('[Audit] Error fetching history', { 
          entityType: input.entityType, 
          entityId: input.entityId,
          error,
        });
        
        // Don't silently return empty - throw error
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to fetch audit history',
          cause: error,
        });
      }
    }),
});
```

---

## Task 5: Create/Verify Logger Utility (30 min)

```typescript
// server/lib/logger.ts

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: Record<string, unknown>;
}

const LOG_LEVEL = process.env.LOG_LEVEL || 'info';
const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[LOG_LEVEL as LogLevel];
}

function formatLog(entry: LogEntry): string {
  const contextStr = entry.context 
    ? ` ${JSON.stringify(entry.context)}` 
    : '';
  return `[${entry.timestamp}] ${entry.level.toUpperCase()}: ${entry.message}${contextStr}`;
}

export const logger = {
  debug(message: string, context?: Record<string, unknown>) {
    if (shouldLog('debug')) {
      console.debug(formatLog({ 
        level: 'debug', 
        message, 
        timestamp: new Date().toISOString(), 
        context 
      }));
    }
  },
  
  info(message: string, context?: Record<string, unknown>) {
    if (shouldLog('info')) {
      console.info(formatLog({ 
        level: 'info', 
        message, 
        timestamp: new Date().toISOString(), 
        context 
      }));
    }
  },
  
  warn(message: string, context?: Record<string, unknown>) {
    if (shouldLog('warn')) {
      console.warn(formatLog({ 
        level: 'warn', 
        message, 
        timestamp: new Date().toISOString(), 
        context 
      }));
    }
  },
  
  error(message: string, context?: Record<string, unknown>) {
    if (shouldLog('error')) {
      console.error(formatLog({ 
        level: 'error', 
        message, 
        timestamp: new Date().toISOString(), 
        context 
      }));
    }
  },
};
```

---

## Git Workflow

```bash
git checkout -b fix/wave-4c-db-errors-and-silent-fixes

# PRIORITY: Investigate and fix Samples DB error
git add server/routers/samples.ts server/db/schema.ts
git commit -m "fix(P0): Investigate and fix Samples database error

Wave 3 found samples.getAll returns DB query failure.
- Add detailed logging to samples router
- Add table existence check
- Improve error messages for debugging"

# PRIORITY: Investigate and fix Calendar DB error
git add server/routers/calendar.ts
git commit -m "fix(P0): Investigate and fix Calendar database error

Wave 3 found calendar.getEvents returns DB query failure.
- Add detailed logging to calendar router
- Add table existence check
- Improve error messages for debugging"

# Add logger utility
git add server/lib/logger.ts
git commit -m "feat: Add structured logging utility"

# Fix frontend silent errors
git add client/src/components/calendar/AppointmentRequestsList.tsx
git add client/src/components/hr/TimeOffRequestsList.tsx
git add client/src/components/dashboard/ActivityLogPanel.tsx
git commit -m "fix(BUG-054,055,056): Add proper error handling to list components"

# Fix backend silent returns
git add server/_core/authHelpers.ts
git add server/utils/inventoryUtils.ts
git add server/routers/audit.ts
git commit -m "fix(BUG-058,059,060): Replace silent returns with proper logging"

git push origin fix/wave-4c-db-errors-and-silent-fixes
gh pr create --title "Wave 4C: Database Error Investigation + Silent Error Fixes" --body "
## Summary
Investigate and fix Wave 3 database errors, plus fix all silent error returns.

## P0 Wave 3 Findings Addressed
- **Samples API**: Investigated root cause, added logging, improved error handling
- **Calendar API**: Investigated root cause, added logging, improved error handling

## Bug Fixes
- BUG-054: AppointmentRequestsList proper error handling
- BUG-055: TimeOffRequestsList proper error handling
- BUG-056: ActivityLogPanel proper error handling
- BUG-058: Auth helpers with logging
- BUG-059: Inventory utils with proper errors
- BUG-060: Audit router with proper errors

## New Features
- Structured logging utility for debugging

## Root Cause Analysis
[Document findings here after investigation]

## Testing
- [ ] Samples API returns meaningful error or data
- [ ] Calendar API returns meaningful error or data
- [ ] All list components show error states properly
- [ ] Logs appear in server console for debugging
"
```

---

## Success Criteria

- [ ] **Samples DB error root cause identified** (Wave 3 priority)
- [ ] **Calendar DB error root cause identified** (Wave 3 priority)
- [ ] Logger utility created
- [ ] AppointmentRequestsList has error handling
- [ ] TimeOffRequestsList has error handling
- [ ] ActivityLogPanel has error handling
- [ ] Auth helpers have logging
- [ ] Inventory utils throw proper errors
- [ ] Audit router throws proper errors
- [ ] No more silent null/empty returns

---

## Handoff

After Wave 4C completion:

1. **Document root cause findings** for Samples and Calendar DB errors
2. If schema changes needed, coordinate with team for migration
3. PR ready for review
4. Note any findings that affect Wave 4B (they should handle errors gracefully)
5. Merge after Wave 4A, 4B, 4D to avoid conflicts
