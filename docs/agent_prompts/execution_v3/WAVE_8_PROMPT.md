# Wave 8: Technical Debt & Polish

**Agent Role**: Senior Developer  
**Duration**: 15-20 hours  
**Priority**: P3  
**Timeline**: Week 5+  
**Dependencies**: All previous waves complete  
**Can Run Parallel With**: Ongoing maintenance

---

## Overview

Address accumulated technical debt, improve code quality, add comprehensive error handling, and polish the user experience across the application.

---

## Task 1: TODO/FIXME Cleanup (4 hours)

### Audit All TODOs

```bash
# Find all TODO/FIXME items
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" server/ client/src/
```

### Priority Categories

**P0 - Security/Data Issues:**
- SQL injection vulnerabilities
- Missing input validation
- Unhandled authentication edge cases

**P1 - Functionality Issues:**
- Incomplete implementations
- Missing error handling
- Race conditions

**P2 - Code Quality:**
- Type safety improvements
- Code duplication
- Performance optimizations

**P3 - Nice to Have:**
- Better logging
- Code comments
- Refactoring opportunities

### Common Patterns to Fix

```typescript
// BEFORE: TODO with missing implementation
async function processOrder(orderId: number) {
  // TODO: Add inventory validation
  const order = await getOrder(orderId);
  // ... rest of implementation
}

// AFTER: Complete implementation
async function processOrder(orderId: number) {
  const order = await getOrder(orderId);
  
  // Validate inventory availability
  for (const item of order.items) {
    const batch = await getBatch(item.batchId);
    const available = batch.quantity - batch.reservedQuantity;
    
    if (item.quantity > available) {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: `Insufficient inventory for ${batch.code}. Available: ${available}, Requested: ${item.quantity}`,
      });
    }
  }
  
  // ... rest of implementation
}
```

---

## Task 2: Error Handling Standardization (3 hours)

### Create Error Types

```typescript
// server/errors/index.ts

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public data?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message, 400, { field });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(entity: string, id?: string | number) {
    super('NOT_FOUND', `${entity} not found${id ? `: ${id}` : ''}`, 404, { entity, id });
    this.name = 'NotFoundError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'You do not have permission to perform this action') {
    super('FORBIDDEN', message, 403);
    this.name = 'AuthorizationError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super('CONFLICT', message, 409);
    this.name = 'ConflictError';
  }
}

export class BusinessRuleError extends AppError {
  constructor(message: string, rule?: string) {
    super('BUSINESS_RULE_VIOLATION', message, 422, { rule });
    this.name = 'BusinessRuleError';
  }
}

// Error handler middleware
export function handleError(error: unknown): TRPCError {
  console.error('[Error]', error);

  if (error instanceof TRPCError) {
    return error;
  }

  if (error instanceof AppError) {
    return new TRPCError({
      code: mapStatusToTRPCCode(error.statusCode),
      message: error.message,
      cause: error,
    });
  }

  if (error instanceof Error) {
    // Log unexpected errors
    console.error('[Unexpected Error]', error.stack);
    
    return new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred. Please try again.',
    });
  }

  return new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: 'An unknown error occurred',
  });
}

function mapStatusToTRPCCode(status: number): TRPC_ERROR_CODE_KEY {
  switch (status) {
    case 400: return 'BAD_REQUEST';
    case 401: return 'UNAUTHORIZED';
    case 403: return 'FORBIDDEN';
    case 404: return 'NOT_FOUND';
    case 409: return 'CONFLICT';
    case 422: return 'UNPROCESSABLE_CONTENT';
    default: return 'INTERNAL_SERVER_ERROR';
  }
}
```

### Update Routers to Use Standard Errors

```typescript
// Example: server/routers/orders.ts

import { NotFoundError, ValidationError, BusinessRuleError } from '../errors';

export const ordersRouter = router({
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const order = await db.query.orders.findFirst({
        where: eq(orders.id, input.id),
        with: { items: true, client: true },
      });

      if (!order) {
        throw new NotFoundError('Order', input.id);
      }

      return order;
    }),

  create: protectedProcedure
    .input(createOrderSchema)
    .mutation(async ({ ctx, input }) => {
      // Validate client
      const client = await getClient(input.clientId);
      if (!client) {
        throw new NotFoundError('Client', input.clientId);
      }

      // Check credit
      const creditCheck = await checkClientCredit(client.id, input.total);
      if (!creditCheck.canProceed) {
        throw new BusinessRuleError(
          `Order exceeds available credit by ${formatCurrency(creditCheck.shortfall)}`,
          'credit_limit'
        );
      }

      // Validate items
      for (const item of input.items) {
        const batch = await getBatch(item.batchId);
        if (!batch) {
          throw new NotFoundError('Batch', item.batchId);
        }
        
        const available = batch.quantity - batch.reservedQuantity;
        if (item.quantity > available) {
          throw new ValidationError(
            `Insufficient inventory for ${batch.code}`,
            `items.${item.batchId}`
          );
        }
      }

      // Create order...
    }),
});
```

---

## Task 3: Empty State Components (3 hours)

### Create Reusable Empty State

```typescript
// client/src/components/ui/empty-state.tsx

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(
      "flex flex-col items-center justify-center py-12 px-4 text-center",
      className
    )}>
      {icon && (
        <div className="mb-4 text-muted-foreground">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-medium">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}

// Preset empty states
export function NoResultsState({ 
  entity = 'items',
  searchTerm,
  onClear,
}: { 
  entity?: string;
  searchTerm?: string;
  onClear?: () => void;
}) {
  return (
    <EmptyState
      icon={<Search className="h-12 w-12" />}
      title={`No ${entity} found`}
      description={searchTerm 
        ? `No ${entity} match "${searchTerm}". Try adjusting your search.`
        : `There are no ${entity} to display.`
      }
      action={onClear && (
        <Button variant="outline" onClick={onClear}>
          Clear filters
        </Button>
      )}
    />
  );
}

export function NoDataState({ 
  entity,
  action,
}: { 
  entity: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <EmptyState
      icon={<Inbox className="h-12 w-12" />}
      title={`No ${entity} yet`}
      description={`Get started by creating your first ${entity.toLowerCase()}.`}
      action={action && (
        <Button onClick={action.onClick}>
          <Plus className="h-4 w-4 mr-2" />
          {action.label}
        </Button>
      )}
    />
  );
}

export function ErrorState({ 
  title = 'Something went wrong',
  description,
  onRetry,
}: { 
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <EmptyState
      icon={<AlertCircle className="h-12 w-12 text-destructive" />}
      title={title}
      description={description ?? 'An error occurred while loading this content.'}
      action={onRetry && (
        <Button variant="outline" onClick={onRetry}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Try again
        </Button>
      )}
    />
  );
}

export function LoadingState({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
```

### Update Pages to Use Empty States

```typescript
// Example: client/src/pages/AnalyticsPage.tsx

export function AnalyticsPage() {
  const { data, isLoading, error, refetch } = trpc.analytics.getDashboard.useQuery();

  if (isLoading) {
    return <LoadingState message="Loading analytics..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load analytics"
        description={error.message}
        onRetry={() => refetch()}
      />
    );
  }

  if (!data || data.revenue.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-12 w-12" />}
        title="No analytics data yet"
        description="Analytics will appear once you have orders and transactions."
        action={
          <Button asChild>
            <Link to="/orders/create">Create your first order</Link>
          </Button>
        }
      />
    );
  }

  return (
    // ... render analytics
  );
}
```

---

## Task 4: Loading State Improvements (2 hours)

### Create Skeleton Components

```typescript
// client/src/components/ui/skeleton.tsx

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 p-4 border-b">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 border-b">
          {Array.from({ length: columns }).map((_, j) => (
            <Skeleton key={j} className="h-4 flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-24 w-full" />
      </CardContent>
    </Card>
  );
}

export function GridSkeleton({ items = 6 }: { items?: number }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      {Array.from({ length: items }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-10 w-32" />
    </div>
  );
}
```

---

## Task 5: Performance Optimizations (3 hours)

### Database Query Optimization

```typescript
// server/db/indexes.ts

// Add missing indexes for common queries
export async function addIndexes() {
  // Orders - frequently filtered by status and client
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC)`;

  // Invoices - frequently filtered by status and due date
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id)`;

  // Batches - frequently searched and filtered
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_batches_code ON batches(code)`;
  
  // Full text search index for products
  await sql`CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('english', name || ' ' || COALESCE(strain, '') || ' ' || COALESCE(category, '')))`;

  // Notifications - frequently filtered by user and read status
  await sql`CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, read) WHERE read = false`;
}
```

### React Query Optimization

```typescript
// client/src/lib/queryClient.ts

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      gcTime: 1000 * 60 * 5, // 5 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof TRPCClientError && error.data?.httpStatus < 500) {
          return false;
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
  },
});

// Prefetch common data
export function usePrefetchCommonData() {
  const utils = trpc.useUtils();

  useEffect(() => {
    // Prefetch data that's commonly needed
    utils.clients.list.prefetch({ limit: 100 });
    utils.products.list.prefetch({ limit: 100 });
    utils.users.list.prefetch();
  }, []);
}
```

### Lazy Loading

```typescript
// client/src/App.tsx

const AnalyticsPage = lazy(() => import('./pages/AnalyticsPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));

function App() {
  return (
    <Routes>
      {/* Eagerly loaded - core functionality */}
      <Route path="/" element={<DashboardPage />} />
      <Route path="/orders/*" element={<OrdersPage />} />
      <Route path="/clients/*" element={<ClientsPage />} />
      <Route path="/inventory/*" element={<InventoryPage />} />
      
      {/* Lazy loaded - less frequently accessed */}
      <Route path="/analytics" element={
        <Suspense fallback={<LoadingState />}>
          <AnalyticsPage />
        </Suspense>
      } />
      <Route path="/reports" element={
        <Suspense fallback={<LoadingState />}>
          <ReportsPage />
        </Suspense>
      } />
      <Route path="/settings/*" element={
        <Suspense fallback={<LoadingState />}>
          <SettingsPage />
        </Suspense>
      } />
    </Routes>
  );
}
```

---

## Task 6: Logging & Monitoring (2 hours)

### Structured Logging

```typescript
// server/lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: { colorize: true },
  } : undefined,
});

// Request logging middleware
export function requestLogger() {
  return async (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    const requestId = crypto.randomUUID();

    // Attach request ID
    req.requestId = requestId;

    res.on('finish', () => {
      const duration = Date.now() - start;
      
      logger.info({
        requestId,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        duration,
        userId: req.user?.id,
      }, `${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    });

    next();
  };
}

// Error logging
export function logError(error: Error, context?: Record<string, any>) {
  logger.error({
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    ...context,
  }, error.message);
}

// Audit logging for sensitive operations
export async function auditLog(action: string, data: {
  userId: number;
  entityType: string;
  entityId: number | string;
  changes?: Record<string, { old: any; new: any }>;
  metadata?: Record<string, any>;
}) {
  await db.insert(auditLogs).values({
    action,
    ...data,
    timestamp: new Date(),
  });

  logger.info({
    audit: true,
    action,
    ...data,
  }, `Audit: ${action} on ${data.entityType}:${data.entityId} by user:${data.userId}`);
}
```

---

## Git Workflow

```bash
git checkout -b chore/wave-8-technical-debt

git add server/errors/
git commit -m "chore(DEBT-1): Add standardized error types"

git add client/src/components/ui/empty-state.tsx client/src/components/ui/skeleton.tsx
git commit -m "chore(DEBT-2): Add empty state and skeleton components"

git add server/db/indexes.ts
git commit -m "chore(DEBT-3): Add database indexes for performance"

git add server/lib/logger.ts
git commit -m "chore(DEBT-4): Add structured logging"

# Fix individual TODOs in separate commits
git commit -m "fix(DEBT-5): Resolve TODO in ordersRouter - add inventory validation"

git push origin chore/wave-8-technical-debt
```

---

## Success Criteria

- [ ] All P0/P1 TODOs resolved
- [ ] Standard error types used across all routers
- [ ] Empty states on all list pages
- [ ] Loading skeletons on all data-heavy pages
- [ ] Database indexes added for common queries
- [ ] React Query optimized with proper stale times
- [ ] Lazy loading for non-critical pages
- [ ] Structured logging in place
- [ ] Audit logging for sensitive operations

---

## Ongoing Maintenance

After Wave 8, establish these practices:

1. **Weekly TODO Review**: Check for new TODOs, prioritize and schedule
2. **Performance Monitoring**: Review slow queries monthly
3. **Error Rate Monitoring**: Alert on error rate spikes
4. **Code Review Standards**: Enforce error handling and empty states in PRs
5. **Technical Debt Budget**: Allocate 20% of each sprint to debt reduction
