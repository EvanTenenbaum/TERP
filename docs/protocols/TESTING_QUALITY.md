# Testing Quality Protocol

**Version:** 1.0
**Last Updated:** 2025-12-01
**Status:** Active & Enforced

This protocol defines testing quality standards beyond the basic TDD workflow. It focuses on *what* to test and *how well* to test it.

---

## 1. Coverage Requirements by Tier

Not all code is equally critical. Testing effort should be proportional to risk.

| Tier | Module Type | Coverage Target | Examples |
|------|-------------|-----------------|----------|
| **Tier 1** | Financial/Payment | 90%+ | `creditEngine.ts`, `cogsCalculation.ts`, payment processing |
| **Tier 2** | Business Core | 80%+ | Orders, inventory, client management |
| **Tier 3** | Support Features | 60%+ | Calendar, todos, notifications |
| **Tier 4** | UI Components | 40%+ | Presentational components, forms |

### Tier 1: Financial Operations (90%+ Coverage)

**MANDATORY** comprehensive testing for:
- Credit limit enforcement
- COGS calculations
- Invoice generation
- Payment processing
- Tax calculations
- Refund processing

```typescript
// Example: creditEngine.ts needs tests for:
// - Credit limit checks (allow/deny)
// - Credit usage calculations
// - Credit release on order cancellation
// - Edge cases: zero credit, negative values, concurrent modifications
```

### Tier 2: Business Core (80%+ Coverage)

**Required** testing for:
- Order creation, modification, cancellation
- Inventory adjustments
- Client/vendor CRUD operations
- Pricing rule application
- Permission enforcement

### Tier 3: Support Features (60%+ Coverage)

**Standard** testing for:
- Calendar events
- Todo management
- Dashboard widgets
- Search functionality

### Tier 4: UI Components (40%+ Coverage)

**Basic** testing for:
- Component renders without error
- Props are passed correctly
- User interactions work
- Loading/error states display

---

## 2. Test Quality Standards

### What to Test (Behavior, Not Implementation)

```typescript
// ❌ BAD: Testing implementation details
it('calls parseFloat on quantity', () => {
  const spy = vi.spyOn(global, 'parseFloat');
  calculateTotal(order);
  expect(spy).toHaveBeenCalled(); // WHO CARES?
});

// ✅ GOOD: Testing behavior
it('calculates correct total for order with multiple items', () => {
  const order = createOrder({
    items: [
      { quantity: 2, price: 10.00 },
      { quantity: 1, price: 25.00 },
    ],
  });

  const result = calculateTotal(order);

  expect(result).toBe(45.00);
});
```

### Test Structure (Arrange-Act-Assert)

Every test MUST follow AAA pattern:

```typescript
it('should apply discount for orders over $1000', () => {
  // Arrange - Set up test data
  const order = createOrder({ subtotal: 1500 });
  const discountRule = createDiscountRule({ threshold: 1000, percent: 10 });

  // Act - Execute the behavior
  const result = applyDiscount(order, discountRule);

  // Assert - Verify the outcome
  expect(result.discount).toBe(150);
  expect(result.total).toBe(1350);
});
```

### Test Isolation

```typescript
// ❌ BAD: Tests depend on each other
let sharedOrder: Order;

it('creates an order', () => {
  sharedOrder = createOrder({ ... });
  expect(sharedOrder.id).toBeDefined();
});

it('updates the order', () => {
  // FAILS if previous test fails
  updateOrder(sharedOrder.id, { ... });
});

// ✅ GOOD: Tests are independent
it('creates an order', () => {
  const order = createOrder({ ... });
  expect(order.id).toBeDefined();
});

it('updates an order', () => {
  const order = createOrder({ ... }); // Own setup
  const updated = updateOrder(order.id, { ... });
  expect(updated.status).toBe('updated');
});
```

---

## 3. Forbidden Test Patterns

### Pattern 1: Placeholder Tests

```typescript
// ❌ FORBIDDEN: Always passes, tests nothing
it('should work', () => {
  expect(true).toBe(true);
});

it('placeholder for future test', () => {
  // TODO: implement
});
```

### Pattern 2: Testing Framework Instead of Code

```typescript
// ❌ FORBIDDEN: Tests the mock, not the code
it('returns mocked value', () => {
  vi.mocked(getData).mockReturnValue({ id: 1 });
  const result = getData();
  expect(result).toEqual({ id: 1 }); // You just tested vi.mock works
});
```

### Pattern 3: Duplicating Source Logic

```typescript
// ❌ FORBIDDEN: Re-implementing the logic in test
it('calculates confidence score', () => {
  let confidence = 0;
  if (need.strain === candidate.strain) confidence += 40;
  if (need.category === candidate.category) confidence += 30;
  // This duplicates matchingEngine.ts logic!

  const result = calculateConfidence(need, candidate);
  expect(result).toBe(confidence);
});

// ✅ GOOD: Test expected outcomes
it('gives higher confidence for exact strain match', () => {
  const need = { strain: 'Blue Dream' };
  const exactMatch = { strain: 'Blue Dream' };
  const noMatch = { strain: 'OG Kush' };

  expect(calculateConfidence(need, exactMatch))
    .toBeGreaterThan(calculateConfidence(need, noMatch));
});
```

### Pattern 4: Over-Mocking

```typescript
// ❌ BAD: Everything is mocked, testing nothing
vi.mock('../db');
vi.mock('../validation');
vi.mock('../permissions');
vi.mock('../logger');
vi.mock('../cache');

it('creates order', async () => {
  vi.mocked(db.insert).mockResolvedValue({ id: 1 });
  vi.mocked(validate).mockReturnValue(true);
  vi.mocked(checkPermission).mockReturnValue(true);

  const result = await createOrder({ ... });

  expect(result.id).toBe(1); // Only tested that mocks return what you told them
});
```

### Pattern 5: Hard-Coded Test Data

```typescript
// ❌ BAD: Credentials in test
it('authenticates user', async () => {
  const result = await login('admin@terp.com', 'password123');
  expect(result.token).toBeDefined();
});

// ✅ GOOD: Use fixtures or environment
it('authenticates user', async () => {
  const { email, password } = testFixtures.validUser;
  const result = await login(email, password);
  expect(result.token).toBeDefined();
});
```

---

## 4. Test Organization

### File Location

Tests live next to source files:

```
server/
  routers/
    orders.ts
    orders.test.ts     # Unit/integration tests
  services/
    orderService.ts
    orderService.test.ts
```

### Describe/It Structure

```typescript
describe('OrdersRouter', () => {
  describe('create', () => {
    it('creates order with valid input', async () => { ... });
    it('rejects order with negative quantity', async () => { ... });
    it('requires orders:create permission', async () => { ... });
  });

  describe('update', () => {
    it('updates order status', async () => { ... });
    it('prevents update of cancelled order', async () => { ... });
  });

  describe('delete', () => {
    it('soft deletes order', async () => { ... });
    it('requires orders:delete permission', async () => { ... });
  });
});
```

### Test Naming

```typescript
// ❌ BAD: Vague names
it('works', () => { ... });
it('test 1', () => { ... });
it('order test', () => { ... });

// ✅ GOOD: Descriptive behavior
it('returns 404 when order does not exist', () => { ... });
it('applies 10% discount for orders over $1000', () => { ... });
it('prevents duplicate order creation within 1 minute', () => { ... });
```

---

## 5. Integration Test Requirements

### Database Integration Tests

For Tier 1 and Tier 2 modules, integration tests with real database are REQUIRED:

```typescript
describe('OrdersDb Integration', () => {
  beforeEach(async () => {
    await resetTestDatabase();
  });

  it('creates order with line items in transaction', async () => {
    const order = await ordersDb.createOrder({
      clientId: testClient.id,
      items: [{ productId: 1, quantity: 5 }],
    });

    // Verify in database
    const saved = await db.query.orders.findFirst({
      where: eq(orders.id, order.id),
      with: { lineItems: true },
    });

    expect(saved?.lineItems).toHaveLength(1);
    expect(saved?.lineItems[0].quantity).toBe(5);
  });

  it('rolls back on partial failure', async () => {
    await expect(ordersDb.createOrder({
      clientId: testClient.id,
      items: [{ productId: 999999, quantity: 5 }], // Invalid product
    })).rejects.toThrow();

    // Verify nothing was created
    const orders = await db.query.orders.findMany();
    expect(orders).toHaveLength(0);
  });
});
```

### API Integration Tests

```typescript
describe('Orders API Integration', () => {
  it('complete order flow: create -> update -> ship -> deliver', async () => {
    // Create
    const order = await caller.orders.create({ ... });
    expect(order.status).toBe('PENDING');

    // Update
    await caller.orders.update({ id: order.id, status: 'PROCESSING' });

    // Ship
    await caller.orders.ship({ id: order.id, trackingNumber: '123' });

    // Deliver
    await caller.orders.deliver({ id: order.id });

    // Verify final state
    const final = await caller.orders.getById({ id: order.id });
    expect(final.status).toBe('DELIVERED');
  });
});
```

---

## 6. Test Utilities

### Required: Test Factories

Create factory functions for test data:

```typescript
// server/test-utils/factories.ts

export function createTestOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: nextId(),
    clientId: 1,
    status: 'PENDING',
    subtotal: '100.00',
    tax: '8.00',
    total: '108.00',
    createdAt: new Date(),
    ...overrides,
  };
}

export function createTestClient(overrides: Partial<Client> = {}): Client {
  return {
    id: nextId(),
    name: `Test Client ${nextId()}`,
    email: `test${nextId()}@example.com`,
    creditLimit: '10000.00',
    ...overrides,
  };
}

// Usage in tests
it('calculates total correctly', () => {
  const order = createTestOrder({ subtotal: '200.00' });
  // ...
});
```

### Required: Mock Utilities

```typescript
// server/test-utils/mocks.ts

export function createMockContext(overrides: Partial<Context> = {}): Context {
  return {
    user: { id: 1, email: 'test@example.com', isSuperAdmin: false },
    req: {} as Request,
    res: {} as Response,
    ...overrides,
  };
}

export function createMockDb() {
  return {
    query: { ... },
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  };
}
```

---

## 7. E2E Test Standards

### Required Data-TestId Attributes

All interactive elements MUST have data-testid:

```typescript
// ❌ BAD: Brittle selectors
await page.click('button:has-text("Create")');
await page.locator('.btn-primary').click();

// ✅ GOOD: Stable selectors
await page.click('[data-testid="create-order-button"]');
await page.click('[data-testid="submit-form"]');
```

### Component Pattern

```tsx
<Button
  data-testid="create-order-button"
  onClick={handleCreate}
>
  Create Order
</Button>
```

### Critical Path Coverage

E2E tests MUST cover these flows:

- [ ] User authentication (login/logout)
- [ ] Order creation flow
- [ ] Inventory intake
- [ ] Invoice generation
- [ ] Payment recording
- [ ] Dashboard loading
- [ ] Search functionality

---

## 8. Pre-Commit Test Checklist

Before committing:

```markdown
## Test Quality Checklist

- [ ] Tests exist for new code
- [ ] Tests follow AAA pattern
- [ ] No placeholder tests
- [ ] No implementation detail testing
- [ ] No hard-coded credentials
- [ ] Tests are independent (no shared state)
- [ ] Descriptive test names
- [ ] Error paths tested
- [ ] Edge cases covered
- [ ] All tests pass locally
```

---

## 9. Coverage Enforcement

### CI Configuration

```yaml
# In CI pipeline
- name: Run tests with coverage
  run: pnpm test:coverage

- name: Check coverage thresholds
  run: |
    # Tier 1 modules must have 90%+
    # Tier 2 modules must have 80%+
    # Overall must be 70%+
```

### Vitest Coverage Config

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      thresholds: {
        lines: 70,
        functions: 70,
        branches: 60,
        statements: 70,
      },
    },
  },
});
```

---

**Tests that don't follow these standards will be rejected.**
