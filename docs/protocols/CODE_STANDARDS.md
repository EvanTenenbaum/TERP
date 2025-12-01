# Code Standards Protocol

**Version:** 1.0
**Last Updated:** 2025-12-01
**Status:** Active & Enforced

This protocol defines the code quality standards all agents MUST follow. Violations will result in rejected work.

---

## 1. TypeScript Strictness

### Absolute Rules

| Rule | Status | Enforcement |
|------|--------|-------------|
| NO `any` types | MANDATORY | ESLint + Code Review |
| NO `as` type assertions without justification | MANDATORY | Code Review |
| NO `@ts-ignore` or `@ts-expect-error` | MANDATORY | ESLint |
| ALL function parameters typed | MANDATORY | TypeScript strict |
| ALL function return types explicit | MANDATORY | TypeScript strict |

### Examples

```typescript
// ❌ FORBIDDEN
function processData(data: any) {
  return data.value;
}

const result = someValue as MyType;

// @ts-ignore
const broken = thing.method();

// ✅ CORRECT
function processData(data: ProcessedData): number {
  return data.value;
}

// If assertion truly needed, document why
const result = someValue as MyType; // Safe: validated by zod schema above

// Use type guards instead of assertions
function isMyType(value: unknown): value is MyType {
  return typeof value === 'object' && value !== null && 'id' in value;
}
```

### When `unknown` is Required

Use `unknown` instead of `any` for truly unknown data:

```typescript
// ❌ FORBIDDEN
function handleError(error: any) {
  console.log(error.message);
}

// ✅ CORRECT
function handleError(error: unknown) {
  if (error instanceof Error) {
    console.log(error.message);
  } else {
    console.log(String(error));
  }
}
```

---

## 2. React Component Standards

### Memoization Requirements

| Scenario | Requirement | Tool |
|----------|-------------|------|
| Reusable component | MUST use React.memo | `React.memo()` |
| Component renders in list | MUST use React.memo | `React.memo()` |
| Event handler passed to child | MUST use useCallback | `useCallback()` |
| Derived data from props/state | MUST use useMemo | `useMemo()` |
| Expensive computation | MUST use useMemo | `useMemo()` |

### Examples

```typescript
// ❌ FORBIDDEN - Unmemoized list item
export function ListItem({ item, onSelect }: ListItemProps) {
  return <div onClick={() => onSelect(item.id)}>{item.name}</div>;
}

// ✅ CORRECT - Memoized with stable callback
export const ListItem = memo(function ListItem({
  item,
  onSelect
}: ListItemProps) {
  const handleClick = useCallback(() => {
    onSelect(item.id);
  }, [item.id, onSelect]);

  return <div onClick={handleClick}>{item.name}</div>;
});
```

### Component Structure

All components MUST follow this structure:

```typescript
// 1. Imports (grouped: react, external, internal, types)
import { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import type { ComponentProps } from './types';

// 2. Type definitions
interface MyComponentProps {
  id: number;
  onAction: (id: number) => void;
}

// 3. Component (always named export with memo for reusable components)
export const MyComponent = memo(function MyComponent({
  id,
  onAction,
}: MyComponentProps) {
  // 4. Hooks first
  const { data, isLoading, error } = trpc.module.getData.useQuery({ id });

  // 5. Callbacks
  const handleAction = useCallback(() => {
    onAction(id);
  }, [id, onAction]);

  // 6. Derived data
  const processedData = useMemo(() => {
    return data?.items.filter(item => item.active);
  }, [data?.items]);

  // 7. Early returns for loading/error
  if (isLoading) return <Skeleton />;
  if (error) return <ErrorDisplay error={error} />;

  // 8. Main render
  return (
    <div>
      {processedData?.map(item => (
        <Item key={item.id} item={item} />
      ))}
    </div>
  );
});
```

---

## 3. Error Handling Standards

### Backend Error Types

| Context | Error Type | When to Use |
|---------|------------|-------------|
| Client-facing API errors | `TRPCError` | All router procedures |
| Internal service errors | `AppError` (from ErrorCatalog) | Services, DB layer |
| Validation failures | `TRPCError` with code `BAD_REQUEST` | Input validation |
| Auth failures | `TRPCError` with code `UNAUTHORIZED` | Permission checks |
| Not found | `TRPCError` with code `NOT_FOUND` | Missing resources |

### Examples

```typescript
// ❌ FORBIDDEN - Generic Error in router
export const myRouter = router({
  getData: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) {
      throw new Error('Unauthorized'); // WRONG
    }
  }),
});

// ✅ CORRECT - TRPCError with proper code
export const myRouter = router({
  getData: protectedProcedure.query(async ({ ctx }) => {
    // Note: ctx.user is guaranteed by protectedProcedure
    // No manual check needed

    const data = await getData(ctx.user.id);
    if (!data) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Data not found',
      });
    }
    return data;
  }),
});

// ✅ CORRECT - Using ErrorCatalog for services
import { ErrorCatalog } from '../_core/errors';

export async function getBatch(batchId: number) {
  const batch = await db.query.batches.findFirst({
    where: eq(batches.id, batchId),
  });

  if (!batch) {
    throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(batchId);
  }

  return batch;
}
```

### Frontend Error Handling

```typescript
// ❌ FORBIDDEN - Ignoring error state
const { data } = trpc.module.getData.useQuery({ id });

// ✅ CORRECT - Handle all states
const { data, isLoading, error } = trpc.module.getData.useQuery({ id });

if (isLoading) return <LoadingSkeleton />;
if (error) return <ErrorMessage error={error} />;
if (!data) return <EmptyState />;

return <DataDisplay data={data} />;
```

---

## 4. Naming Conventions

### Files

| Type | Convention | Example |
|------|------------|---------|
| React components | PascalCase.tsx | `UserProfile.tsx` |
| Hooks | camelCase.ts (use prefix) | `usePermissions.ts` |
| Utilities | camelCase.ts | `formatCurrency.ts` |
| Types | camelCase.ts or types.ts | `orderTypes.ts` |
| Tests | [name].test.ts(x) | `UserProfile.test.tsx` |
| Routers | camelCase.ts | `orders.ts` |
| Database files | camelCaseDb.ts | `ordersDb.ts` |

### Variables and Functions

| Type | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `userName`, `orderTotal` |
| Functions | camelCase, verb prefix | `getUserById`, `calculateTotal` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT` |
| Types/Interfaces | PascalCase | `UserProfile`, `OrderInput` |
| Enums | PascalCase, UPPER values | `OrderStatus.PENDING` |
| Boolean variables | is/has/can prefix | `isActive`, `hasPermission` |

### Database

| Type | Convention | Example |
|------|------------|---------|
| Tables | plural snake_case | `client_invoices` |
| Columns | snake_case | `created_at`, `client_id` |
| Foreign keys | singular_table_id | `client_id`, `order_id` |
| Indexes | idx_table_column(s) | `idx_orders_client_id` |

---

## 5. Input Validation Standards

### Absolute Rules

| Rule | Status |
|------|--------|
| NO `z.any()` in schemas | FORBIDDEN |
| NO `z.unknown()` without refinement | FORBIDDEN |
| ALL router inputs validated | MANDATORY |
| Explicit types for all schema fields | MANDATORY |

### Examples

```typescript
// ❌ FORBIDDEN
const inputSchema = z.object({
  data: z.any(), // NO!
  metadata: z.record(z.string(), z.any()), // NO!
  config: z.unknown(), // NO!
});

// ✅ CORRECT
const inputSchema = z.object({
  data: z.object({
    name: z.string().min(1).max(255),
    value: z.number().positive(),
  }),
  metadata: z.record(z.string(), z.string()),
  config: z.object({
    enabled: z.boolean(),
    threshold: z.number().optional(),
  }),
});
```

---

## 6. Import Organization

All imports MUST be organized in this order with blank lines between groups:

```typescript
// 1. React and React-related
import { useState, useCallback, memo } from 'react';
import { useLocation } from 'wouter';

// 2. External libraries
import { z } from 'zod';
import { format } from 'date-fns';

// 3. Internal absolute imports (@/)
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';

// 4. Relative imports
import { formatOrderNumber } from './utils';
import { OrderCard } from './OrderCard';

// 5. Type imports (can be grouped with their source or separate)
import type { Order, OrderStatus } from '@/types';
```

---

## 7. Comments and Documentation

### When to Comment

| Scenario | Required | Example |
|----------|----------|---------|
| Non-obvious business logic | YES | `// Apply 10% discount for orders > $1000 per client tier agreement` |
| Workarounds for bugs | YES | `// Safari fires compositionEnd before keyDown - see issue #123` |
| Complex algorithms | YES | Document the algorithm approach |
| Obvious code | NO | Don't comment `// increment counter` |
| TODO/FIXME | FORBIDDEN | Create ticket instead |

### JSDoc for Public APIs

```typescript
/**
 * Calculates the total price for an order including tax and discounts.
 *
 * @param order - The order to calculate
 * @param options - Calculation options
 * @returns The calculated total with breakdown
 *
 * @example
 * const total = calculateOrderTotal(order, { includeTax: true });
 */
export function calculateOrderTotal(
  order: Order,
  options: CalculationOptions
): OrderTotal {
  // ...
}
```

---

## 8. Forbidden Patterns

### Code Smells to Avoid

```typescript
// ❌ FORBIDDEN: Hardcoded fallback user ID
createdBy: ctx.user?.id || 1,

// ✅ CORRECT: Trust the context (protectedProcedure guarantees user)
createdBy: ctx.user.id,

// ❌ FORBIDDEN: console.log in production code
console.log('Debug:', data);

// ✅ CORRECT: Use structured logger
logger.debug({ data }, 'Processing data');

// ❌ FORBIDDEN: Nested ternaries
const status = a ? (b ? 'x' : 'y') : (c ? 'z' : 'w');

// ✅ CORRECT: Use explicit conditions
function getStatus(a: boolean, b: boolean, c: boolean): string {
  if (a && b) return 'x';
  if (a) return 'y';
  if (c) return 'z';
  return 'w';
}

// ❌ FORBIDDEN: Magic numbers
if (items.length > 100) { ... }

// ✅ CORRECT: Named constants
const MAX_ITEMS_PER_PAGE = 100;
if (items.length > MAX_ITEMS_PER_PAGE) { ... }
```

---

## 9. Pre-Commit Checklist

Before committing ANY code, verify:

```markdown
## TypeScript
- [ ] `pnpm check` passes with ZERO errors
- [ ] No `any` types added
- [ ] No untyped function parameters
- [ ] No `as` assertions without comment

## React (if applicable)
- [ ] New reusable components use React.memo
- [ ] Event handlers use useCallback when passed to children
- [ ] Loading and error states handled
- [ ] Accessibility attributes added

## Backend (if applicable)
- [ ] Input validation with explicit Zod schemas
- [ ] TRPCError used (not generic Error)
- [ ] Permission middleware applied
- [ ] No hardcoded user ID fallbacks

## General
- [ ] No console.log statements
- [ ] No TODO/FIXME comments
- [ ] Follows naming conventions
- [ ] Tests written for new code
```

---

## 10. Enforcement

### Automated Checks

These rules are enforced by:
- **ESLint**: `@typescript-eslint/no-explicit-any`, `@typescript-eslint/explicit-function-return-type`
- **TypeScript**: Strict mode enabled
- **Pre-commit hooks**: Type check, lint, test
- **CI Pipeline**: All checks must pass

### Code Review Requirements

All code changes require verification of:
1. TypeScript strictness compliance
2. React memoization where required
3. Error handling patterns
4. Input validation completeness
5. Naming convention adherence

---

**Violations of this protocol will result in work rejection. No exceptions.**
