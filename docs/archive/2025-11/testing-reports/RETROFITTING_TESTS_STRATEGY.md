# Retrofitting Tests to Existing TERP Codebase

**Date**: November 6, 2025  
**Purpose**: Strategy for adding tests to existing code (not just new code)  
**Status**: 📋 Planning Phase

---

## 📊 Current State Analysis

### Code Coverage Statistics

| Category              | Files | With Tests | Coverage |
| --------------------- | ----- | ---------- | -------- |
| **tRPC Routers**      | 57    | 3 (5%)     | ~5%      |
| **Utility Functions** | 2     | 0 (0%)     | 0%       |
| **Client Components** | ~100  | 5 (5%)     | ~5%      |
| **Overall Backend**   | 175   | 12 (7%)    | **~7%**  |

### Routers With Tests (3/57)

- ✅ `clients.test.ts` (has import issues)
- ✅ `invoices.test.ts` (has import issues)
- ✅ `orders.test.ts` (has import issues)

### Routers Without Tests (54/57)

All other routers in `server/routers/` need tests.

### Current Issues

- ⚠️ 3 existing test files have import path issues
- ⚠️ No test coverage for 95% of backend code
- ⚠️ No integration tests for critical business logic

---

## 🎯 Strategy: Prioritized Retrofitting

We'll add tests to existing code using a **risk-based prioritization** approach.

### Phase 1: Critical Business Logic (Week 1-2)

**Priority: HIGHEST**

Test the most critical parts of the system first:

1. **Orders Module** (`server/routers/orders.ts`)
   - Order creation, updates, status changes
   - Pricing calculations
   - Inventory allocation
   - **Why**: Core business functionality, financial impact

2. **Invoices Module** (`server/routers/invoices.ts`)
   - Invoice generation
   - Payment processing
   - AR calculations
   - **Why**: Financial accuracy critical

3. **Clients Module** (`server/routers/clients.ts`)
   - Client CRUD operations
   - Credit limit management
   - **Why**: Foundation for all transactions

4. **Pricing Engine** (`server/routers/pricing.ts`)
   - Price calculations
   - Markup application
   - COGS integration
   - **Why**: Financial accuracy, profit margins

5. **Inventory Module** (`server/routers/inventory.ts`)
   - Stock tracking
   - Inventory movements
   - Allocation logic
   - **Why**: Operational accuracy

**Target**: 80%+ coverage for these 5 modules

---

### Phase 2: Financial & Accounting (Week 3-4)

**Priority: HIGH**

6. **Accounting** (`server/routers/accounting.ts`)
7. **Credits** (`server/routers/credits.ts`)
8. **Bad Debt** (`server/routers/badDebt.ts`)
9. **Calendar Financials** (`server/routers/calendarFinancials.ts`)

**Target**: 70%+ coverage

---

### Phase 3: User-Facing Features (Week 5-6)

**Priority: MEDIUM**

10. **Dashboard** (`server/routers/dashboard.ts`)
11. **Analytics** (`server/routers/analytics.ts`)
12. **Sales Sheets** (`server/routers/salesSheets.ts`)
13. **VIP Portal** (`server/routers/vipPortal.ts`)

**Target**: 60%+ coverage

---

### Phase 4: Supporting Features (Week 7-8)

**Priority: LOW**

14. **Calendar** (`server/routers/calendar.ts`)
15. **Comments** (`server/routers/comments.ts`)
16. **Todo Lists** (`server/routers/todoLists.ts`)
17. **Inbox** (`server/routers/inbox.ts`)
18. **Settings** (`server/routers/settings.ts`)

**Target**: 50%+ coverage

---

## 🛠️ Implementation Approach

### 1. **Characterization Tests First**

For existing code without tests, start with **characterization tests**:

> Characterization tests describe what the code _currently does_, not what it _should do_.

**Example:**

```typescript
// Characterization test for existing pricing logic
it("calculates price for standard order (current behavior)", async () => {
  const result = await caller.pricing.calculatePrice({
    productId: 1,
    quantity: 100,
    clientId: 1,
  });

  // Document current behavior, even if it seems wrong
  expect(result.unitPrice).toBe(10.5);
  expect(result.totalPrice).toBe(1050.0);
});
```

**Why?**

- Captures current behavior before refactoring
- Prevents regressions during improvements
- Builds confidence in the codebase

### 2. **Fix Import Issues in Existing Tests**

Before adding new tests, fix the 3 failing tests:

```typescript
// Current (broken):
import { appRouter } from "../_core/router";

// Should be:
import { appRouter } from "../routers.ts";
```

**Action**: Investigate correct import paths and fix all 3 tests.

### 3. **Test Template for Routers**

Use this template for all router tests:

```typescript
import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "../routers.ts"; // Fix import path
import { createContext } from "../_core/context";
import { db } from "../../scripts/db-sync";

describe("RouterName Router", () => {
  let caller: ReturnType<typeof appRouter.createCaller>;

  beforeAll(async () => {
    // Set up test context
    const ctx = await createContext({} as any);
    caller = appRouter.createCaller(ctx);
  });

  describe("procedureName", () => {
    it("should handle valid input", async () => {
      const result = await caller.routerName.procedureName({
        /* input */
      });
      expect(result).toBeDefined();
      // Add more assertions
    });

    it("should reject invalid input", async () => {
      await expect(
        caller.routerName.procedureName({
          /* invalid input */
        })
      ).rejects.toThrow();
    });
  });
});
```

### 4. **Incremental Coverage Targets**

Set realistic targets for each phase:

| Week | Target Coverage | Modules Covered         |
| ---- | --------------- | ----------------------- |
| 1-2  | 20%             | 5 critical modules      |
| 3-4  | 35%             | + 4 financial modules   |
| 5-6  | 50%             | + 4 user-facing modules |
| 7-8  | 65%             | + 5 supporting modules  |
| 9-10 | 80%             | All remaining modules   |

### 5. **Parallel Work Strategy**

- **AI Agent 1**: Fix existing test import issues
- **AI Agent 2**: Add tests to orders module
- **AI Agent 3**: Add tests to invoices module
- **AI Agent 4**: Add tests to clients module

**Coordination**: Use separate branches, merge frequently.

---

## 📋 Execution Checklist

### Week 1: Foundation

- [ ] Fix import issues in existing 3 tests
- [ ] Verify all existing tests pass
- [ ] Set up test coverage reporting in CI/CD
- [ ] Create test templates and examples
- [ ] Add characterization tests for `orders.ts`
- [ ] Add characterization tests for `invoices.ts`

### Week 2: Critical Modules

- [ ] Complete `orders.ts` tests (80%+ coverage)
- [ ] Complete `invoices.ts` tests (80%+ coverage)
- [ ] Complete `clients.ts` tests (80%+ coverage)
- [ ] Complete `pricing.ts` tests (80%+ coverage)
- [ ] Complete `inventory.ts` tests (80%+ coverage)

### Week 3-4: Financial Modules

- [ ] Add tests for `accounting.ts`
- [ ] Add tests for `credits.ts`
- [ ] Add tests for `badDebt.ts`
- [ ] Add tests for `calendarFinancials.ts`

### Week 5-6: User-Facing Features

- [ ] Add tests for `dashboard.ts`
- [ ] Add tests for `analytics.ts`
- [ ] Add tests for `salesSheets.ts`
- [ ] Add tests for `vipPortal.ts`

### Week 7-8: Supporting Features

- [ ] Add tests for remaining routers
- [ ] Achieve 65%+ overall coverage
- [ ] Document all test patterns

### Week 9-10: Final Push

- [ ] Fill coverage gaps
- [ ] Add E2E tests for critical flows
- [ ] Achieve 80%+ backend coverage
- [ ] Update documentation

---

## 🚀 Quick Start: Add Tests to One Router

### Step 1: Pick a Router

Start with `orders.ts` (critical business logic).

### Step 2: Analyze the Router

```bash
# See what procedures exist
grep "export const" server/routers/orders.ts
```

### Step 3: Create Test File

```bash
# Create the test file
touch server/routers/orders.test.ts
```

### Step 4: Write Characterization Tests

Document current behavior for each procedure.

### Step 5: Run Tests

```bash
pnpm test server/routers/orders.test.ts
```

### Step 6: Iterate

Add more tests until coverage is 80%+.

---

## 📊 Measuring Progress

### Coverage Reports

```bash
# Generate coverage report
pnpm test:coverage

# View HTML report
open coverage/index.html
```

### CI/CD Integration

Coverage reports are automatically generated on every push and displayed in GitHub Actions.

### Weekly Goals

- **Week 1**: 10% → 20%
- **Week 2**: 20% → 35%
- **Week 3**: 35% → 50%
- **Week 4**: 50% → 65%
- **Week 5**: 65% → 80%

---

## 🎯 Success Criteria

By the end of this retrofitting effort:

- ✅ 80%+ backend code coverage
- ✅ All critical business logic tested
- ✅ All financial calculations tested
- ✅ Zero failing tests in CI/CD
- ✅ Test documentation complete
- ✅ All agents trained on testing practices

---

## 🆘 Common Challenges & Solutions

### Challenge 1: "The code is too complex to test"

**Solution**: Start with characterization tests. Don't refactor yet.

### Challenge 2: "Tests are slow"

**Solution**: Use in-memory database for unit tests, Docker for integration tests.

### Challenge 3: "Don't know what to test"

**Solution**: Test the happy path first, then edge cases, then error cases.

### Challenge 4: "Code has too many dependencies"

**Solution**: Use mocking for external dependencies, real DB for integration tests.

---

## 📚 Resources

- [Testing Best Practices](TERP_TESTING_BEST_PRACTICES.md)
- [AI Agent Integration Guide](TERP_AI_AGENT_INTEGRATION_GUIDE.md)
- [Testing Usage Guide](TERP_TESTING_USAGE_GUIDE.md)

---

**Let's get started! Pick a router and add your first test today.** 🚀\*\*
