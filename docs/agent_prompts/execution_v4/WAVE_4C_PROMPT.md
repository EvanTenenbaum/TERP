# Wave 4C: Silent Error Fixes

**Agent Role**: Full Stack Developer  
**Duration**: 5-6 hours  
**Priority**: P2  
**Dependencies**: Wave 3 complete  
**Can Run Parallel With**: Wave 4A, 4B, 4D (different file domains)

---

## Overview

Fix all locations where errors are silently caught and return null/empty, making debugging difficult and hiding real issues from users.

---

## File Domain

**Your files**: 
- `client/src/components/` (specific components listed below)
- `server/` utility files (authHelpers, inventoryUtils)
- `server/routers/audit.ts`

**Do NOT modify**: 
- `client/src/pages/*.tsx` (Wave 4B domain)
- `server/routers/*.ts` except audit.ts (Wave 4A domain)

---

## Task 1: Fix Frontend Null Checks (2 hours)

### BUG-054: AppointmentRequestsList

```typescript
// client/src/components/calendar/AppointmentRequestsList.tsx

// BEFORE - crashes if data is undefined
{data.requests.map(request => (
  <AppointmentRequestCard key={request.id} request={request} />
))}

// AFTER - safe with proper loading/error states
export function AppointmentRequestsList() {
  const { data, isLoading, error, refetch } = trpc.calendar.getAppointmentRequests.useQuery();

  if (isLoading) {
    return <LoadingState message="Loading appointment requests..." />;
  }

  if (error) {
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

## Task 2: Fix Backend Silent Returns (2 hours)

### BUG-058: Auth Helpers

```typescript
// server/_core/authHelpers.ts

// BEFORE - silent null return hides errors
export async function getUserFromToken(token: string) {
  try {
    const decoded = jwt.verify(token, SECRET);
    const user = await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });
    return user;
  } catch {
    return null;  // Silent failure!
  }
}

// AFTER - proper error handling with logging
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

// BEFORE - silent empty return
export async function getAvailableQuantity(batchId: number) {
  try {
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, batchId),
    });
    return batch ? batch.quantity - batch.reservedQuantity : 0;
  } catch {
    return 0;  // Silent failure - could mask real issues!
  }
}

// AFTER - proper error handling
import { logger } from '../lib/logger';
import { NotFoundError } from '../errors';

export async function getAvailableQuantity(batchId: number): Promise<number> {
  if (!batchId || batchId <= 0) {
    logger.warn('[Inventory] Invalid batch ID', { batchId });
    throw new ValidationError('Invalid batch ID');
  }

  try {
    const batch = await db.query.batches.findFirst({
      where: eq(batches.id, batchId),
    });

    if (!batch) {
      logger.warn('[Inventory] Batch not found', { batchId });
      throw new NotFoundError('Batch', batchId);
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
    if (error instanceof AppError) {
      throw error;
    }
    logger.error('[Inventory] Error getting available quantity', { batchId, error });
    throw new Error('Failed to get available quantity');
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

// BEFORE - silent empty array
export const auditRouter = router({
  getHistory: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      try {
        const logs = await db.query.auditLogs.findMany({
          where: and(
            eq(auditLogs.entityType, input.entityType),
            eq(auditLogs.entityId, input.entityId)
          ),
          orderBy: desc(auditLogs.createdAt),
        });
        return logs;
      } catch {
        return [];  // Silent failure!
      }
    }),
});

// AFTER - proper error handling
import { logger } from '../lib/logger';

export const auditRouter = router({
  getHistory: protectedProcedure
    .input(z.object({
      entityType: z.string(),
      entityId: z.number(),
    }))
    .query(async ({ input }) => {
      logger.debug('[Audit] Fetching history', input);

      try {
        const logs = await db.query.auditLogs.findMany({
          where: and(
            eq(auditLogs.entityType, input.entityType),
            eq(auditLogs.entityId, input.entityId)
          ),
          orderBy: desc(auditLogs.createdAt),
          limit: 100,
        });

        logger.debug('[Audit] Found logs', { count: logs.length, ...input });
        return logs;
      } catch (error) {
        logger.error('[Audit] Failed to fetch history', { ...input, error });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load audit history',
        });
      }
    }),

  getRecentActivity: protectedProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(20),
    }))
    .query(async ({ ctx, input }) => {
      logger.debug('[Audit] Fetching recent activity', { userId: ctx.user.id, limit: input.limit });

      try {
        const logs = await db.query.auditLogs.findMany({
          where: eq(auditLogs.userId, ctx.user.id),
          orderBy: desc(auditLogs.createdAt),
          limit: input.limit,
        });

        return logs;
      } catch (error) {
        logger.error('[Audit] Failed to fetch recent activity', { userId: ctx.user.id, error });
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to load recent activity',
        });
      }
    }),
});
```

---

## Task 3: Create Logger Utility (1 hour)

```typescript
// server/lib/logger.ts

import pino from 'pino';

const isDev = process.env.NODE_ENV === 'development';

export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
  transport: isDev ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
    },
  } : undefined,
  base: {
    env: process.env.NODE_ENV,
  },
});

// Convenience methods with context
export function createLogger(context: string) {
  return logger.child({ context });
}

// Example usage:
// const log = createLogger('OrderService');
// log.info('Order created', { orderId: 123 });
```

### Install pino

```bash
pnpm add pino pino-pretty
```

---

## Task 4: Add Error Boundaries (1 hour)

```typescript
// client/src/components/ErrorBoundary.tsx

import { Component, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
    
    // Log to server
    fetch('/api/log-error', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      }),
    }).catch(() => {});
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <Card className="m-4">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Something went wrong
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              An error occurred while rendering this component.
            </p>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <pre className="text-xs bg-muted p-2 rounded mb-4 overflow-auto">
                {this.state.error.message}
              </pre>
            )}
            <Button onClick={this.handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Try again
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}
```

---

## Git Workflow

```bash
git checkout -b fix/wave-4c-silent-errors

# Add logger
pnpm add pino pino-pretty
git add package.json pnpm-lock.yaml server/lib/logger.ts
git commit -m "feat(LOG-1): Add structured logging with pino"

# Fix frontend components
git add client/src/components/calendar/AppointmentRequestsList.tsx
git commit -m "fix(BUG-054): Add proper error handling to AppointmentRequestsList"

git add client/src/components/hr/TimeOffRequestsList.tsx
git commit -m "fix(BUG-055): Add proper error handling to TimeOffRequestsList"

git add client/src/components/dashboard/ActivityLogPanel.tsx
git commit -m "fix(BUG-056): Add proper error handling to ActivityLogPanel"

# Fix backend utilities
git add server/_core/authHelpers.ts
git commit -m "fix(BUG-058): Add logging to auth helpers instead of silent null"

git add server/utils/inventoryUtils.ts
git commit -m "fix(BUG-059): Add logging to inventory utils instead of silent returns"

git add server/routers/audit.ts
git commit -m "fix(BUG-060): Add error handling to audit router"

# Add error boundary
git add client/src/components/ErrorBoundary.tsx
git commit -m "feat(ERR-1): Add ErrorBoundary component for graceful error handling"

# Push and create PR
git push origin fix/wave-4c-silent-errors
gh pr create --title "Wave 4C: Silent Error Fixes" --body "
## Summary
Fix all locations where errors are silently swallowed.

## Changes
- Added structured logging with pino
- Fixed BUG-054, BUG-055, BUG-056 (frontend null checks)
- Fixed BUG-058, BUG-059, BUG-060 (backend silent returns)
- Added ErrorBoundary component

## Testing
- [ ] Errors are now logged to console
- [ ] Components show error states instead of crashing
- [ ] Backend functions throw instead of returning null silently

## Parallel Safety
Only touches specific component files and utility files
"
```

---

## Success Criteria

- [ ] Logger utility created and working
- [ ] BUG-054 fixed (AppointmentRequestsList)
- [ ] BUG-055 fixed (TimeOffRequestsList)
- [ ] BUG-056 fixed (ActivityLogPanel)
- [ ] BUG-058 fixed (authHelpers)
- [ ] BUG-059 fixed (inventoryUtils)
- [ ] BUG-060 fixed (audit router)
- [ ] ErrorBoundary component created
- [ ] No more silent failures

---

## Handoff

After Wave 4C completion:

1. PR ready for review
2. Document logging levels used
3. Coordinate merge timing with Wave 4A/4B/4D

**Merge Order**: 4C can merge after 4A and 4B (no conflicts)
