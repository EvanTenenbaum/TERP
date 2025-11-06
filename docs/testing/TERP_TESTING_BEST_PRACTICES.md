# TERP Testing Best Practices

**A practical guide for writing effective, maintainable tests**

---

## Core Principles

### 1. Write Tests That Give You Confidence, Not Coverage

**Bad**: Testing trivial getters and setters to hit 100% coverage  
**Good**: Testing complex business logic and critical user flows

```typescript
// ❌ Low-value test
test("should get client name", () => {
  const client = { name: "Test Client" };
  expect(client.name).toBe("Test Client");
});

// ✅ High-value test
test("should calculate whale client discount correctly", () => {
  const order = createOrder({ clientType: "WHALE", total: 10000 });
  const discount = calculateDiscount(order);
  expect(discount).toBe(1500); // 15% whale discount
});
```

### 2. Test Behavior, Not Implementation

**Bad**: Testing internal state or private methods  
**Good**: Testing public API and observable outcomes

```typescript
// ❌ Testing implementation
test("should set _internalCache property", () => {
  const service = new OrderService();
  service.createOrder(data);
  expect(service._internalCache).toBeDefined();
});

// ✅ Testing behavior
test("should create order and update inventory", async () => {
  const order = await orderService.create(data);
  const batch = await db.getBatch(data.batchId);
  expect(batch.quantityAvailable).toBe(initialQuantity - data.quantity);
});
```

### 3. Make Tests Independent and Isolated

Each test should run in isolation without depending on the order of execution.

```typescript
// ❌ Tests depend on each other
let createdOrderId;

test("should create order", async () => {
  const order = await createOrder(data);
  createdOrderId = order.id; // Shared state!
});

test("should update order", async () => {
  await updateOrder(createdOrderId, updates); // Depends on previous test
});

// ✅ Tests are independent
test("should create order", async () => {
  const order = await createOrder(data);
  expect(order.id).toBeDefined();
});

test("should update order", async () => {
  const order = await createOrder(data); // Create its own test data
  const updated = await updateOrder(order.id, updates);
  expect(updated.status).toBe("UPDATED");
});
```

---

## Integration Testing Patterns

### Pattern 1: Arrange-Act-Assert (AAA)

Structure every test with clear sections:

```typescript
test("should calculate AR aging correctly", async () => {
  // Arrange: Set up test data
  const invoice = await createInvoice({
    dueDate: thirtyDaysAgo(),
    total: "1000.00",
    status: "OVERDUE",
  });

  // Act: Execute the behavior being tested
  const arBuckets = await calculateARBuckets();

  // Assert: Verify the outcome
  expect(arBuckets.days30).toBeGreaterThan(0);
  expect(arBuckets.days30).toBeLessThanOrEqual(1000);
});
```

### Pattern 2: Test Data Builders

Create reusable test data builders for complex objects:

```typescript
// tests/builders/order-builder.ts
export class OrderBuilder {
  private data = {
    clientId: 1,
    total: "1000.00",
    status: "PENDING" as const,
    items: [],
  };

  withClient(clientId: number) {
    this.data.clientId = clientId;
    return this;
  }

  withTotal(total: string) {
    this.data.total = total;
    return this;
  }

  withItems(items: any[]) {
    this.data.items = items;
    return this;
  }

  build() {
    return this.data;
  }
}

// Usage in tests
test("should create order", async () => {
  const orderData = new OrderBuilder()
    .withClient(5)
    .withTotal("5000.00")
    .withItems([{ productId: 1, quantity: 10 }])
    .build();

  const order = await createOrder(orderData);
  expect(order.total).toBe("5000.00");
});
```

### Pattern 3: Shared Test Fixtures

Use `beforeEach` for common setup, but keep it minimal:

```typescript
describe("Order Service", () => {
  let testClient;
  let testProduct;

  beforeEach(async () => {
    // Only set up truly shared data
    testClient = await createTestClient();
    testProduct = await createTestProduct();
  });

  test("should create order for client", async () => {
    const order = await createOrder({
      clientId: testClient.id,
      items: [{ productId: testProduct.id, quantity: 5 }],
    });
    expect(order.clientId).toBe(testClient.id);
  });
});
```

---

## E2E Testing Patterns

### Pattern 1: Page Object Model (POM)

Encapsulate page interactions in reusable classes:

```typescript
// tests-e2e/pages/OrderPage.ts
export class OrderPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/orders/new");
  }

  async selectClient(clientName: string) {
    await this.page.getByLabel("Client").click();
    await this.page.getByRole("option", { name: clientName }).click();
  }

  async addItem(productName: string, quantity: number) {
    await this.page.getByRole("button", { name: "Add Item" }).click();
    await this.page.getByLabel("Product").last().click();
    await this.page.getByRole("option", { name: productName }).click();
    await this.page.getByLabel("Quantity").last().fill(quantity.toString());
  }

  async submit() {
    await this.page.getByRole("button", { name: "Create Order" }).click();
  }

  async getTotal() {
    return this.page.getByTestId("order-total").textContent();
  }
}

// Usage in tests
test("should create order", async ({ page }) => {
  const orderPage = new OrderPage(page);
  await orderPage.goto();
  await orderPage.selectClient("Green Valley Dispensary");
  await orderPage.addItem("Blue Dream", 10);
  await orderPage.submit();

  await expect(page).toHaveURL(/\/orders\/\d+/);
});
```

### Pattern 2: Test Data Setup

Use API calls to set up test data instead of clicking through the UI:

```typescript
test("should display order details", async ({ page, request }) => {
  // Arrange: Create test data via API
  const order = await request.post("/api/orders", {
    data: {
      clientId: 1,
      items: [{ productId: 1, quantity: 10 }],
    },
  });
  const orderId = (await order.json()).id;

  // Act: Navigate to order detail page
  await page.goto(`/orders/${orderId}`);

  // Assert: Order details are displayed
  await expect(page.getByText("Blue Dream")).toBeVisible();
});
```

### Pattern 3: Explicit Waits

Use Playwright's auto-waiting, but add explicit waits for dynamic content:

```typescript
test("should update order total dynamically", async ({ page }) => {
  await page.goto("/orders/new");
  await page.getByLabel("Quantity").fill("10");

  // Wait for total to recalculate
  await page.waitForFunction(() => {
    const total = document.querySelector('[data-testid="order-total"]');
    return total && total.textContent !== "$0.00";
  });

  const total = await page.getByTestId("order-total").textContent();
  expect(total).not.toBe("$0.00");
});
```

---

## Common Pitfalls & Solutions

### Pitfall 1: Flaky Tests

**Problem**: Tests pass sometimes, fail other times

**Solutions**:

- Use Playwright's auto-waiting instead of fixed timeouts
- Avoid `waitForTimeout()` - use `waitForSelector()` or `waitForFunction()`
- Ensure test data is properly isolated
- Use `test.retry(2)` for inherently flaky operations (e.g., network)

```typescript
// ❌ Flaky
test("should load data", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForTimeout(2000); // Arbitrary wait
  expect(page.getByText("Revenue")).toBeVisible();
});

// ✅ Reliable
test("should load data", async ({ page }) => {
  await page.goto("/dashboard");
  await page.waitForSelector('[data-testid="revenue-metric"]');
  expect(page.getByText("Revenue")).toBeVisible();
});
```

### Pitfall 2: Testing Too Many Things in One Test

**Problem**: When a test fails, it's hard to know what broke

**Solution**: One assertion per test (or closely related assertions)

```typescript
// ❌ Too much in one test
test("order creation flow", async () => {
  // Tests client selection
  // Tests product selection
  // Tests quantity validation
  // Tests total calculation
  // Tests submission
  // Tests redirect
  // Tests notification
  // 50 lines of code...
});

// ✅ Focused tests
test("should select client from dropdown", async ({ page }) => {
  await orderPage.selectClient("Test Client");
  expect(await orderPage.getSelectedClient()).toBe("Test Client");
});

test("should calculate total correctly", async ({ page }) => {
  await orderPage.addItem("Product", 10);
  expect(await orderPage.getTotal()).toBe("$1,000.00");
});
```

### Pitfall 3: Not Cleaning Up Test Data

**Problem**: Tests leave data in the database, causing future test failures

**Solution**: Use database transactions or reset database between tests

```typescript
// ✅ Clean slate for every test
beforeEach(async () => {
  await resetTestDatabase("light"); // Reset to known state
});

// Or use transactions (if supported)
beforeEach(async () => {
  await db.beginTransaction();
});

afterEach(async () => {
  await db.rollback();
});
```

---

## Performance Optimization

### 1. Run Tests in Parallel

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: "threads",
    poolOptions: {
      threads: {
        maxThreads: 4, // Adjust based on CPU cores
      },
    },
  },
});
```

### 2. Use Test Filtering During Development

```bash
# Run only tests matching a pattern
pnpm test -- orders

# Run only changed tests
pnpm test -- --changed

# Run tests in watch mode
pnpm test:watch
```

### 3. Optimize Database Seeding

```typescript
// Use the 'light' scenario for integration tests
beforeAll(async () => {
  await resetTestDatabase("light"); // 30s instead of 2min
});

// Only seed once per test suite, not per test
beforeAll(async () => {
  await seedDatabase();
});

// Not this:
beforeEach(async () => {
  await seedDatabase(); // Slow!
});
```

---

## Debugging Tests

### 1. Use Playwright's Debug Mode

```bash
# Run tests in debug mode
pnpm playwright test --debug

# Run specific test in debug mode
pnpm playwright test create-order.spec.ts --debug
```

### 2. Take Screenshots on Failure

```typescript
// playwright.config.ts
export default defineConfig({
  use: {
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
});
```

### 3. Use `test.only()` During Development

```typescript
// Run only this test
test.only("should create order", async ({ page }) => {
  // ... test code
});

// Remember to remove .only before committing!
```

---

## Code Review Checklist

When reviewing test code, check for:

- [ ] Tests are independent (no shared state)
- [ ] Tests have clear AAA structure
- [ ] Test names describe the behavior being tested
- [ ] No hardcoded waits (`waitForTimeout`)
- [ ] Accessibility checks on E2E tests
- [ ] No `.only()` or `.skip()` in committed code
- [ ] Test data is properly cleaned up
- [ ] Tests run quickly (<3 min for integration, <5 min for E2E)

---

## Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Vitest API Reference](https://vitest.dev/api/)
- [Testing Trophy Philosophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [TERP Testing Master Plan](./TERP_TESTING_MASTER_PLAN.md)

---

**End of Best Practices Guide**
