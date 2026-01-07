# Wave 7: Technical Debt & Polish

**Agent Role**: Full Stack Developer  
**Duration**: 12-15 hours  
**Priority**: P3  
**Dependencies**: Waves 4-6 complete  
**Can Run Parallel With**: None (cleanup wave)

---

## Overview

Address remaining technical debt, TODO/FIXME items, performance optimizations, and final polish. This wave ensures long-term stability and maintainability.

---

## Task 1: TODO/FIXME Cleanup (4 hours)

### Audit All TODO Items

```bash
# Find all TODO/FIXME items
grep -rn "TODO\|FIXME\|HACK\|XXX" --include="*.ts" --include="*.tsx" server/ client/src/
```

### Priority TODO Items to Address

**High Priority (Must Fix)**:
1. Any TODO related to security
2. Any TODO related to data integrity
3. Any FIXME that indicates broken functionality

**Medium Priority (Should Fix)**:
1. TODO items for missing validation
2. TODO items for error handling
3. HACK comments indicating workarounds

**Low Priority (Nice to Have)**:
1. TODO items for optimization
2. TODO items for better UX
3. Comments about future features

### Template for Fixing TODOs

```typescript
// Before:
// TODO: Add validation for negative quantities

// After:
if (quantity < 0) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: 'Quantity cannot be negative',
  });
}
```

---

## Task 2: Error Handling Standardization (3 hours)

### Create Standard Error Types

```typescript
// server/lib/errors.ts

import { TRPCError } from '@trpc/server';

export class ValidationError extends TRPCError {
  constructor(message: string, field?: string) {
    super({
      code: 'BAD_REQUEST',
      message: field ? `${field}: ${message}` : message,
    });
  }
}

export class NotFoundError extends TRPCError {
  constructor(entity: string, id?: number | string) {
    super({
      code: 'NOT_FOUND',
      message: id ? `${entity} with ID ${id} not found` : `${entity} not found`,
    });
  }
}

export class PermissionError extends TRPCError {
  constructor(action: string, resource: string) {
    super({
      code: 'FORBIDDEN',
      message: `You do not have permission to ${action} this ${resource}`,
    });
  }
}

export class ConflictError extends TRPCError {
  constructor(message: string) {
    super({
      code: 'CONFLICT',
      message,
    });
  }
}

export class BusinessRuleError extends TRPCError {
  constructor(message: string) {
    super({
      code: 'BAD_REQUEST',
      message,
    });
  }
}
```

### Standardize Error Handling Pattern

```typescript
// Before:
if (!client) {
  throw new TRPCError({ code: 'NOT_FOUND', message: 'Client not found' });
}

// After:
import { NotFoundError } from '../lib/errors';

if (!client) {
  throw new NotFoundError('Client', input.clientId);
}
```

### Add Global Error Logging

```typescript
// server/_core/trpc.ts - Add to error formatter

errorFormatter({ shape, error }) {
  // Log all errors
  logger.error('[TRPC Error]', {
    code: error.code,
    message: error.message,
    path: shape.data?.path,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
  });

  return {
    ...shape,
    data: {
      ...shape.data,
      // Add request ID for support
      requestId: generateRequestId(),
    },
  };
}
```

---

## Task 3: Database Query Optimization (2.5 hours)

### Add Missing Indexes

```sql
-- migrations/add_performance_indexes.sql

-- Frequently filtered columns
CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_invoices_client_id ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_product_id ON batches(product_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read ON notifications(user_id, is_read);

-- Full-text search indexes
CREATE INDEX IF NOT EXISTS idx_batches_search ON batches USING gin(
  to_tsvector('english', coalesce(code, '') || ' ' || coalesce(sku, ''))
);

CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(strain, '') || ' ' || coalesce(category, ''))
);

CREATE INDEX IF NOT EXISTS idx_clients_search ON clients USING gin(
  to_tsvector('english', coalesce(name, '') || ' ' || coalesce(contact_name, ''))
);
```

### Optimize N+1 Queries

```typescript
// Before (N+1 problem):
const orders = await db.query.orders.findMany();
for (const order of orders) {
  order.client = await db.query.clients.findFirst({
    where: eq(clients.id, order.clientId),
  });
}

// After (single query with join):
const orders = await db.query.orders.findMany({
  with: {
    client: true,
    items: {
      with: {
        batch: {
          with: {
            product: true,
          },
        },
      },
    },
  },
});
```

### Add Query Result Caching

```typescript
// server/lib/cache.ts

import { LRUCache } from 'lru-cache';

const cache = new LRUCache<string, any>({
  max: 500,
  ttl: 1000 * 60 * 5, // 5 minutes
});

export async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  const cached = cache.get(key);
  if (cached !== undefined) {
    return cached as T;
  }

  const result = await queryFn();
  cache.set(key, result, { ttl });
  return result;
}

export function invalidateCache(pattern: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(pattern)) {
      cache.delete(key);
    }
  }
}

// Usage:
const categories = await cachedQuery(
  'catalog:categories',
  () => db.selectDistinct({ category: catalogItems.category }).from(catalogItems),
  1000 * 60 * 15 // 15 minutes
);
```

---

## Task 4: Frontend Performance (2 hours)

### Add React Query Optimizations

```typescript
// client/src/lib/queryClient.ts

import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof TRPCClientError) {
          const code = error.data?.code;
          if (['NOT_FOUND', 'FORBIDDEN', 'UNAUTHORIZED', 'BAD_REQUEST'].includes(code)) {
            return false;
          }
        }
        return failureCount < 3;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
```

### Add Optimistic Updates

```typescript
// Example: Optimistic notification mark as read
const markAsRead = trpc.notifications.markAsRead.useMutation({
  onMutate: async ({ id }) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: ['notifications'] });

    // Snapshot previous value
    const previousNotifications = queryClient.getQueryData(['notifications']);

    // Optimistically update
    queryClient.setQueryData(['notifications'], (old: Notification[]) =>
      old?.map(n => n.id === id ? { ...n, isRead: true } : n)
    );

    return { previousNotifications };
  },
  onError: (err, variables, context) => {
    // Rollback on error
    queryClient.setQueryData(['notifications'], context?.previousNotifications);
  },
  onSettled: () => {
    // Refetch to ensure consistency
    queryClient.invalidateQueries({ queryKey: ['notifications'] });
  },
});
```

### Add Loading Skeletons

```typescript
// client/src/components/ui/Skeleton.tsx

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="animate-pulse">
      <div className="h-10 bg-gray-200 rounded mb-4" /> {/* Header */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 mb-3">
          {Array.from({ length: columns }).map((_, j) => (
            <div key={j} className="h-8 bg-gray-100 rounded flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse p-4 border rounded-lg">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-4 bg-gray-100 rounded w-1/2 mb-2" />
      <div className="h-4 bg-gray-100 rounded w-2/3" />
    </div>
  );
}
```

---

## Task 5: Logging & Monitoring (1.5 hours)

### Structured Logging

```typescript
// server/lib/logger.ts

import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    env: process.env.NODE_ENV,
    service: 'terp-api',
  },
});

// Request logging middleware
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = generateRequestId();

  // Add request ID to context
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
    }, 'Request completed');
  });

  next();
}
```

### Add Health Check Endpoint

```typescript
// server/routers/health.ts

export const healthRouter = router({
  check: publicProcedure.query(async () => {
    const checks = {
      database: false,
      timestamp: new Date().toISOString(),
    };

    try {
      await db.execute(sql`SELECT 1`);
      checks.database = true;
    } catch (error) {
      logger.error('[Health] Database check failed', { error });
    }

    const healthy = Object.values(checks).every(v => v === true || typeof v === 'string');

    return {
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
    };
  }),
});
```

---

## Task 6: Documentation (2 hours)

### API Documentation

```typescript
// Generate OpenAPI spec from tRPC
// server/lib/openapi.ts

import { generateOpenApiDocument } from 'trpc-openapi';
import { appRouter } from '../routers';

export const openApiDocument = generateOpenApiDocument(appRouter, {
  title: 'TERP API',
  version: '1.0.0',
  baseUrl: process.env.API_URL || 'http://localhost:3000',
  description: 'Cannabis ERP API',
});
```

### Code Documentation

```typescript
/**
 * Calculates client-specific pricing for a batch.
 * 
 * Pricing is determined by the following priority:
 * 1. Client-specific price override
 * 2. Client tier discount applied to base price
 * 3. Base retail price
 * 
 * @param clientId - The client to calculate pricing for
 * @param batchId - The batch to price
 * @returns Object containing price, original price, and discount flag
 * 
 * @example
 * const pricing = await getClientPrice(123, 456);
 * console.log(pricing.price); // 100.00
 * console.log(pricing.hasDiscount); // true
 */
export async function getClientPrice(
  clientId: number,
  batchId: number
): Promise<ClientPricing> {
  // Implementation
}
```

### Update README

```markdown
# TERP - Cannabis ERP

## Quick Start

```bash
# Install dependencies
pnpm install

# Set up environment
cp .env.example .env

# Run database migrations
pnpm db:migrate

# Start development server
pnpm dev
```

## Architecture

- **Frontend**: React + TypeScript + TailwindCSS
- **Backend**: Node.js + tRPC + Drizzle ORM
- **Database**: PostgreSQL (TiDB compatible)

## Key Workflows

1. **Sales**: Quote → Order → Invoice → Payment
2. **Inventory**: PO → Receive → Batch → Photography → Catalog
3. **Accounting**: AR/AP → Credits → Returns

## API Documentation

API docs available at `/api/docs` when running in development mode.
```

---

## Git Workflow

```bash
git checkout -b chore/wave-7-tech-debt

# TODO cleanup
git add -A
git commit -m "chore: Address TODO/FIXME items"

# Error handling
git add server/lib/errors.ts server/_core/trpc.ts
git commit -m "refactor: Standardize error handling"

# Database optimization
git add migrations/ server/lib/cache.ts
git commit -m "perf: Add database indexes and query caching"

# Frontend performance
git add client/src/lib/queryClient.ts client/src/components/ui/Skeleton.tsx
git commit -m "perf: Add React Query optimizations and loading skeletons"

# Logging
git add server/lib/logger.ts server/routers/health.ts
git commit -m "feat: Add structured logging and health check"

# Documentation
git add README.md server/lib/openapi.ts
git commit -m "docs: Update documentation and add OpenAPI spec"

git push origin chore/wave-7-tech-debt
gh pr create --title "Wave 7: Technical Debt & Polish" --body "
## Summary
Address technical debt, optimize performance, and add polish.

## Changes
- Resolved TODO/FIXME items
- Standardized error handling
- Added database indexes
- Implemented query caching
- Added loading skeletons
- Structured logging
- Health check endpoint
- Updated documentation

## Testing
- [ ] All existing tests pass
- [ ] No new console errors
- [ ] Performance improved (measure key queries)
- [ ] Health check returns healthy
"
```

---

## Success Criteria

- [ ] All high-priority TODOs resolved
- [ ] Error handling standardized
- [ ] Database indexes added
- [ ] Query caching implemented
- [ ] Loading skeletons on all pages
- [ ] Structured logging in place
- [ ] Health check working
- [ ] Documentation updated
- [ ] No TypeScript errors
- [ ] All tests passing
