# Next Session Handoff - Test Coverage Expansion
**Date:** October 25, 2025  
**Status:** Ready to Start  
**Estimated Time:** 8-10 hours

## 🎯 Objective

Expand test coverage from **5% to 40-50%** by adding comprehensive tests for database layer and critical business logic.

## 📋 What Was Completed (Previous Session)

✅ Sales Sheet Module (complete)  
✅ Quote/Sales Module (complete)  
✅ Router refactoring (complete)  
✅ ESLint configuration (complete)  
✅ Testing infrastructure (Vitest installed and configured)  
✅ Initial tests (30 tests for COGS Calculator and Pricing Engine)

**All code is production-ready, zero TypeScript errors, all changes pushed to GitHub.**

## 🚀 What to Do Next

### Phase 1: Database Layer Tests for ordersDb.ts (3-4 hours)

**File to Create:** `server/tests/ordersDb.test.ts`

**Tests to Write:**

1. **createOrder()**
   - Create quote successfully
   - Create sale successfully
   - Validate required fields
   - Handle invalid client ID
   - Calculate totals correctly

2. **updateOrder()**
   - Update order details
   - Update order items
   - Handle non-existent order

3. **deleteOrder()**
   - Delete order successfully
   - Handle non-existent order

4. **getOrdersByClient()**
   - Get all orders for a client
   - Filter by order type (QUOTE/SALE)
   - Handle client with no orders

5. **convertQuoteToSale()**
   - Convert quote to sale successfully
   - Create invoice
   - Update inventory
   - Handle already-converted quote

6. **Sample Inventory Tracking**
   - Track sample items correctly
   - Update sample_qty in batches
   - Log to sampleInventoryLog table

**Setup Required:**
- Mock database with test data
- Use in-memory SQLite for tests
- Clean up after each test

### Phase 2: Database Layer Tests for salesSheetsDb.ts (2-3 hours)

**File to Create:** `server/tests/salesSheetsDb.test.ts`

**Tests to Write:**

1. **createSalesSheet()**
   - Create sales sheet successfully
   - Validate required fields
   - Handle invalid client ID

2. **saveSalesSheet()**
   - Save to history
   - Track itemCount
   - Handle duplicate saves

3. **loadTemplate()**
   - Load template successfully
   - Handle non-existent template

4. **getSalesSheetHistory()**
   - Get history for client
   - Sort by date (newest first)
   - Handle client with no history

### Phase 3: Integration Tests (3-4 hours)

**File to Create:** `server/tests/integration/orderWorkflow.test.ts`

**Tests to Write:**

1. **Complete Order Creation Workflow**
   - Create client
   - Set COGS adjustment
   - Create quote
   - Calculate COGS correctly
   - Calculate margin correctly
   - Check credit limit
   - Convert to sale
   - Verify invoice created

2. **COGS Calculation with Real Data**
   - FIXED mode batch
   - RANGE mode batch
   - Client percentage adjustment
   - Client fixed adjustment
   - Verify margin categories

3. **Pricing Engine with Multiple Rules**
   - Create multiple pricing rules
   - Apply to inventory items
   - Verify priority handling
   - Verify cumulative effects

4. **Sample Tracking Workflow**
   - Create order with sample items
   - Verify sample_qty updated
   - Verify sampleInventoryLog entry
   - Verify regular inventory unaffected

## 📝 Implementation Guidelines

### 1. Follow Existing Test Patterns

Reference the existing tests:
- `server/tests/cogsCalculator.test.ts`
- `server/tests/pricingEngine.test.ts`

Use the same structure:
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Module Name', () => {
  beforeEach(async () => {
    // Setup test database
  });

  afterEach(async () => {
    // Clean up
  });

  describe('functionName', () => {
    it('should do something', async () => {
      // Arrange
      const input = { ... };
      
      // Act
      const result = await functionName(input);
      
      // Assert
      expect(result).toBe(expected);
    });
  });
});
```

### 2. Use In-Memory Database for Tests

```typescript
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const sqlite = new Database(':memory:');
const db = drizzle(sqlite);

// Run migrations
// Insert test data
```

### 3. Test Data Fixtures

Create reusable test data in `tests/fixtures/`:
- `tests/fixtures/clients.ts` - Sample clients
- `tests/fixtures/batches.ts` - Sample inventory batches
- `tests/fixtures/orders.ts` - Sample orders

### 4. Assertions to Use

```typescript
// Equality
expect(result).toBe(expected);
expect(result).toEqual(expected); // Deep equality

// Truthiness
expect(result).toBeTruthy();
expect(result).toBeFalsy();

// Numbers
expect(result).toBeGreaterThan(0);
expect(result).toBeCloseTo(10.5, 2); // Within 2 decimal places

// Arrays
expect(result).toHaveLength(5);
expect(result).toContain(item);

// Objects
expect(result).toHaveProperty('id');
expect(result).toMatchObject({ name: 'Test' });

// Async
await expect(promise).resolves.toBe(value);
await expect(promise).rejects.toThrow(Error);
```

## 🎯 Success Criteria

✅ All tests pass (100% pass rate)  
✅ Zero TypeScript errors  
✅ Test coverage increases from 5% to 40-50%  
✅ Tests run in <5 seconds  
✅ No flaky tests (consistent results)  
✅ Clear test descriptions  
✅ Good test organization (describe blocks)

## 📊 How to Run Tests

```bash
# Run all tests
pnpm test

# Run specific test file
pnpm test ordersDb.test.ts

# Run in watch mode
pnpm test:watch

# Run with UI
pnpm test:ui

# Run with coverage report
pnpm test:coverage
```

## 🔍 Debugging Failed Tests

1. Check error message carefully
2. Use `console.log()` to inspect values
3. Run single test with `.only`:
   ```typescript
   it.only('should do something', async () => { ... });
   ```
4. Check database state after test
5. Verify test data is correct

## 📚 Resources

**Existing Files to Reference:**
- `server/ordersDb.ts` - Functions to test
- `server/salesSheetsDb.ts` - Functions to test
- `server/cogsCalculator.ts` - Already tested (reference)
- `server/pricingEngine.ts` - Already tested (reference)
- `drizzle/schema.ts` - Database schema
- `vitest.config.ts` - Test configuration

**Documentation:**
- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Drizzle ORM](https://orm.drizzle.team/)

## ⚠️ Important Notes

1. **DO NOT modify production code** unless fixing bugs found during testing
2. **DO commit after each phase** (ordersDb tests, salesSheetsDb tests, integration tests)
3. **DO update CODE_QUALITY_IMPROVEMENT_PLAN.md** with progress
4. **DO push to GitHub** after all tests are complete
5. **DO follow MASTER_DEVELOPMENT_PROMPT.md** protocols

## 🎓 Expected Learnings

By the end of this session, you will have:
- Comprehensive test coverage for critical database operations
- Confidence in order creation and management
- Validation of COGS calculations
- Integration tests for complete workflows
- Foundation for future test expansion

## 📝 Commit Message Template

```
test: Expand test coverage for database layer and workflows

- Add 40+ tests for ordersDb.ts (create, update, delete, convert)
- Add 15+ tests for salesSheetsDb.ts (CRUD operations)
- Add 10+ integration tests for complete workflows
- Achieve 40-50% test coverage (up from 5%)
- All tests passing, zero TypeScript errors

Test Coverage:
- Order creation and management
- COGS calculation with real data
- Pricing engine with multiple rules
- Sample inventory tracking
- Quote-to-sale conversion workflow
```

---

## 🚀 Ready to Start!

**Next Command:**
```bash
cd /home/ubuntu/TERP
git pull origin main
pnpm test  # Verify existing tests still pass
# Then start implementing Phase 1
```

**Estimated Completion:** 8-10 hours  
**Priority:** P2 (Medium)  
**Impact:** High (confidence in critical business logic)

---

**Last Updated:** October 25, 2025  
**Status:** Ready for implementation  
**All dependencies installed:** ✅  
**All documentation complete:** ✅

