---
inclusion: always
---

# 📋 TERP Development Standards

**Version**: 2.0  
**Last Updated**: 2025-12-02  
**Status**: MANDATORY

These standards are non-negotiable. All code must comply before merge.

---

## TypeScript Standards

### No `any` Types

**NEVER use `any`**. Period.

```typescript
// ❌ WRONG
function processData(data: any) {
  return data.value;
}

// ✅ CORRECT
interface DataInput {
  value: string;
  timestamp: Date;
}

function processData(data: DataInput): string {
  return data.value;
}
```

**Exceptions**: Only when interfacing with truly untyped external libraries. Document why.

### Explicit Return Types

All functions must declare return types.

```typescript
// ❌ WRONG
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// ✅ CORRECT
function calculateTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}
```

### No Type Assertions Without Justification

Avoid `as` assertions. Use type guards instead.

```typescript
// ❌ WRONG
const user = data as User;

// ✅ CORRECT
function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'email' in data
  );
}

if (isUser(data)) {
  // TypeScript knows data is User here
  console.log(data.email);
}
```

### Strict Null Checks

Handle null/undefined explicitly.

```typescript
// ❌ WRONG
function getUserName(user: User) {
  return user.profile.name; // Might crash if profile is null
}

// ✅ CORRECT
function getUserName(user: User): string {
  return user.profile?.name ?? 'Unknown';
}
```

---

## React Standards

### Component Memoization

All reusable components must use `React.memo`.

```typescript
// ❌ WRONG
export function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
}

// ✅ CORRECT
export const UserCard = React.memo(function UserCard({ user }: UserCardProps) {
  return <div>{user.name}</div>;
});
```

**Why**: Prevents unnecessary re-renders, improves performance.

### Event Handler Optimization

Use `useCallback` for event handlers passed to children.

```typescript
// ❌ WRONG
function ParentComponent() {
  const handleClick = () => {
    console.log('clicked');
  };
  
  return <ChildComponent onClick={handleClick} />;
}

// ✅ CORRECT
function ParentComponent() {
  const handleClick = useCallback(() => {
    console.log('clicked');
  }, []);
  
  return <ChildComponent onClick={handleClick} />;
}
```

### Derived State Optimization

Use `useMemo` for expensive computations.

```typescript
// ❌ WRONG
function ProductList({ products }: Props) {
  const sortedProducts = products.sort((a, b) => a.price - b.price);
  return <div>{sortedProducts.map(...)}</div>;
}

// ✅ CORRECT
function ProductList({ products }: Props) {
  const sortedProducts = useMemo(
    () => products.sort((a, b) => a.price - b.price),
    [products]
  );
  return <div>{sortedProducts.map(...)}</div>;
}
```

### Props Interface Naming

Props interfaces must be named `ComponentNameProps`.

```typescript
// ❌ WRONG
interface Props {
  user: User;
}

// ✅ CORRECT
interface UserCardProps {
  user: User;
  onEdit?: (user: User) => void;
}

export const UserCard = React.memo(function UserCard({ user, onEdit }: UserCardProps) {
  // ...
});
```

---

## Testing Standards

### Coverage Requirements

| Tier | Module Type | Coverage | Priority |
|------|-------------|----------|----------|
| 1 | Financial (orders, payments, accounting) | 90%+ | P0 |
| 2 | Business Logic (inventory, clients, batches) | 80%+ | P1 |
| 3 | UI Components | 70%+ | P2 |
| 4 | Utilities | 85%+ | P1 |

### Test-Driven Development (TDD)

**Write tests BEFORE implementation.**

```typescript
// 1. Write the test first
describe('calculateDiscount', () => {
  it('should apply 10% discount for orders over $100', () => {
    const result = calculateDiscount(150, 'SAVE10');
    expect(result).toBe(135);
  });
});

// 2. Watch it fail
// 3. Implement the function
// 4. Watch it pass
```

### No Placeholder Tests

```typescript
// ❌ WRONG
it('should handle edge cases', () => {
  // TODO: implement this
});

// ✅ CORRECT
it('should return 0 when input is negative', () => {
  expect(calculateDiscount(-10, 'SAVE10')).toBe(0);
});
```

### Test Real Behavior, Not Implementation

```typescript
// ❌ WRONG (testing implementation details)
it('should call useState with initial value', () => {
  const spy = jest.spyOn(React, 'useState');
  render(<Counter />);
  expect(spy).toHaveBeenCalledWith(0);
});

// ✅ CORRECT (testing behavior)
it('should display initial count of 0', () => {
  render(<Counter />);
  expect(screen.getByText('Count: 0')).toBeInTheDocument();
});
```

### Integration Over Unit

Follow the **Testing Trophy** model:
- 50% Integration tests
- 20% Unit tests
- 20% E2E tests
- 10% Static analysis

**Why**: Integration tests provide more confidence per line of test code.

---

## Database Standards

### Naming Conventions

```sql
-- Tables: snake_case, plural
CREATE TABLE batch_items (...)
CREATE TABLE purchase_orders (...)

-- Columns: snake_case
id, created_at, updated_at, user_id

-- Foreign keys: {table}_id
user_id, batch_id, order_id

-- Indexes: idx_{table}_{columns}
idx_batch_items_batch_id
idx_users_email
```

### Data Types

```typescript
// Monetary values: decimal(15, 2)
price: decimal(15, 2)
total: decimal(15, 2)

// Quantities: decimal(15, 4)
quantity: decimal(15, 4)
weight: decimal(15, 4)

// Booleans: boolean() NOT int(0/1)
is_active: boolean()
is_deleted: boolean()

// Timestamps: timestamp()
created_at: timestamp().defaultNow()
updated_at: timestamp().defaultNow().$onUpdate(() => new Date())

// IDs: serial() or integer()
id: serial("id").primaryKey()
user_id: integer("user_id").references(() => users.id)
```

### Foreign Key Indexes

**ALL foreign keys must have indexes.**

```typescript
// ❌ WRONG
export const batchItems = pgTable("batch_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").references(() => batches.id),
  // Missing index!
});

// ✅ CORRECT
export const batchItems = pgTable("batch_items", {
  id: serial("id").primaryKey(),
  batchId: integer("batch_id").references(() => batches.id),
}, (table) => ({
  batchIdIdx: index("idx_batch_items_batch_id").on(table.batchId),
}));
```

### Soft Deletes

Use `is_deleted` boolean, not hard deletes.

```typescript
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  isDeleted: boolean("is_deleted").default(false).notNull(),
  deletedAt: timestamp("deleted_at"),
});

// Query active records
const activeUsers = await db
  .select()
  .from(users)
  .where(eq(users.isDeleted, false));
```

---

## Error Handling Standards

### Always Handle Errors

```typescript
// ❌ WRONG
async function fetchUser(id: number) {
  const user = await db.query.users.findFirst({
    where: eq(users.id, id),
  });
  return user;
}

// ✅ CORRECT
async function fetchUser(id: number): Promise<User> {
  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });
    
    if (!user) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `User with id ${id} not found`,
      });
    }
    
    return user;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    
    throw new TRPCError({
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Failed to fetch user',
      cause: error,
    });
  }
}
```

### User-Friendly Error Messages

```typescript
// ❌ WRONG
throw new Error('DB query failed');

// ✅ CORRECT
throw new TRPCError({
  code: 'BAD_REQUEST',
  message: 'Unable to create order. Please check that all required fields are filled.',
});
```

### Log Errors Properly

```typescript
try {
  await processOrder(orderId);
} catch (error) {
  console.error('Order processing failed:', {
    orderId,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
  throw error;
}
```

---

## Accessibility Standards (WCAG 2.1 AA)

### Keyboard Navigation

All interactive elements must be keyboard accessible.

```tsx
// ❌ WRONG
<div onClick={handleClick}>Click me</div>

// ✅ CORRECT
<button onClick={handleClick}>Click me</button>
// or
<div
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Click me
</div>
```

### Form Labels

All inputs must have labels.

```tsx
// ❌ WRONG
<input type="text" placeholder="Email" />

// ✅ CORRECT
<label htmlFor="email">Email</label>
<input id="email" type="text" />
```

### Icon Buttons

Icon-only buttons must have `aria-label`.

```tsx
// ❌ WRONG
<button><TrashIcon /></button>

// ✅ CORRECT
<button aria-label="Delete item">
  <TrashIcon />
</button>
```

### Color Contrast

- Normal text: 4.5:1 minimum
- Large text (18pt+): 3:1 minimum
- UI components: 3:1 minimum

Use tools like [WebAIM Contrast Checker](https://webaim.org/resources/contrastchecker/).

### No Color-Only Indicators

```tsx
// ❌ WRONG
<span style={{ color: 'red' }}>Error</span>

// ✅ CORRECT
<span className="text-red-600">
  <AlertIcon aria-hidden="true" />
  <span>Error: Invalid input</span>
</span>
```

---

## Performance Standards

### React Component Performance

- Components should render in < 16ms (60fps)
- Use React DevTools Profiler to measure
- Optimize expensive renders with `useMemo` and `React.memo`

### API Response Times

| Endpoint Type | Target | Maximum |
|---------------|--------|---------|
| Simple queries | < 100ms | 200ms |
| Complex queries | < 500ms | 1s |
| Mutations | < 200ms | 500ms |
| File uploads | < 2s | 5s |

### Database Query Optimization

```typescript
// ❌ WRONG (N+1 query)
const batches = await db.query.batches.findMany();
for (const batch of batches) {
  batch.items = await db.query.batchItems.findMany({
    where: eq(batchItems.batchId, batch.id),
  });
}

// ✅ CORRECT (single query with join)
const batches = await db.query.batches.findMany({
  with: {
    items: true,
  },
});
```

### Bundle Size

- Keep page bundles < 200KB (gzipped)
- Use code splitting for large features
- Lazy load routes and heavy components

```typescript
// ✅ CORRECT
const CalendarPage = lazy(() => import('./pages/CalendarPage'));

<Suspense fallback={<LoadingSpinner />}>
  <CalendarPage />
</Suspense>
```

---

## Security Standards

### Input Validation

Validate ALL user input on the server.

```typescript
// ✅ CORRECT
const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255),
});

export const userRouter = router({
  create: publicProcedure
    .input(createUserSchema)
    .mutation(async ({ input }) => {
      // Input is validated
      return createUser(input);
    }),
});
```

### SQL Injection Prevention

Use parameterized queries (Drizzle handles this).

```typescript
// ✅ CORRECT (Drizzle automatically parameterizes)
const user = await db.query.users.findFirst({
  where: eq(users.email, userEmail),
});

// ❌ NEVER DO THIS
const user = await db.execute(
  sql`SELECT * FROM users WHERE email = '${userEmail}'`
);
```

### Authentication

All protected routes must check authentication.

```typescript
// ✅ CORRECT
export const protectedProcedure = publicProcedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      session: { ...ctx.session, user: ctx.session.user },
    },
  });
});
```

### Sensitive Data

Never log sensitive data.

```typescript
// ❌ WRONG
console.log('User login:', { email, password });

// ✅ CORRECT
console.log('User login attempt:', { email });
```

---

## Code Organization Standards

### File Structure

```
server/
├── routers/           # tRPC routers
│   ├── users.ts
│   └── batches.ts
├── services/          # Business logic
│   ├── userService.ts
│   └── batchService.ts
├── db/                # Database
│   ├── schema.ts
│   └── index.ts
└── utils/             # Utilities
    └── validation.ts

client/
├── src/
│   ├── components/    # Reusable components
│   ├── pages/         # Page components
│   ├── hooks/         # Custom hooks
│   ├── utils/         # Client utilities
│   └── types/         # TypeScript types
```

### Import Order

```typescript
// 1. External dependencies
import React from 'react';
import { useQuery } from '@tanstack/react-query';

// 2. Internal absolute imports
import { Button } from '@/components/ui/button';
import { trpc } from '@/utils/trpc';

// 3. Relative imports
import { UserCard } from './UserCard';
import type { User } from './types';

// 4. Styles
import './styles.css';
```

### Function Length

- Functions should be < 50 lines
- If longer, break into smaller functions
- Each function should do ONE thing

### Comments

```typescript
// ❌ WRONG (obvious comment)
// Increment counter
counter++;

// ✅ CORRECT (explains WHY)
// We need to increment before the API call because the backend
// expects a 1-indexed value, but our UI is 0-indexed
counter++;
await api.updatePosition(counter);

// ✅ CORRECT (documents complex logic)
/**
 * Calculates the effective discount rate considering:
 * 1. Base discount from promotion
 * 2. Volume discount for bulk orders
 * 3. Loyalty program multiplier
 * 
 * @param basePrice - Original price before discounts
 * @param quantity - Number of items
 * @param promoCode - Optional promotion code
 * @returns Final discounted price
 */
function calculateEffectivePrice(
  basePrice: number,
  quantity: number,
  promoCode?: string
): number {
  // Implementation
}
```

---

## Documentation Standards

### JSDoc for Public APIs

```typescript
/**
 * Creates a new batch with the specified items.
 * 
 * @param input - Batch creation data
 * @param input.name - Batch name (required)
 * @param input.items - Array of items to include
 * @returns The created batch with generated ID
 * @throws {TRPCError} If validation fails or database error occurs
 * 
 * @example
 * ```typescript
 * const batch = await createBatch({
 *   name: 'Batch #123',
 *   items: [{ productId: 1, quantity: 100 }]
 * });
 * ```
 */
export async function createBatch(input: CreateBatchInput): Promise<Batch> {
  // Implementation
}
```

### README for Complex Features

Every major feature should have a README:

```markdown
# Calendar Feature

## Overview
Event scheduling and management system.

## Key Components
- `CalendarView`: Main calendar display
- `EventForm`: Create/edit events
- `RecurrenceEngine`: Handle recurring events

## API Endpoints
- `calendar.list`: Get events for date range
- `calendar.create`: Create new event
- `calendar.update`: Update existing event

## Database Schema
See `server/db/schema.ts` - `calendar_events` table

## Testing
Run: `pnpm test:calendar`
Coverage: 85%

## Known Issues
- Timezone handling needs improvement (#123)
```

---

## Enforcement

These standards are enforced by:

1. **ESLint** - Catches TypeScript and React issues
2. **TypeScript Compiler** - Strict mode enabled
3. **Pre-commit Hooks** - Runs linting and formatting
4. **CI Pipeline** - Blocks merge if standards violated
5. **Code Review** - Manual verification

---

## Questions?

If a standard is unclear:
1. Check `docs/protocols/` for detailed guides
2. Look at existing code for patterns
3. Ask in the team chat
4. Propose an ADR if you think the standard should change

---

**These standards exist to maintain code quality, prevent bugs, and ensure the codebase remains maintainable as it grows. Follow them religiously.**
