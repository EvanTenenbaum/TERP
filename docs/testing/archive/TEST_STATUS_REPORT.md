# Test Suite Status Report - January 22, 2026

## Executive Summary

| Metric           | Count      |
| ---------------- | ---------- |
| Total Test Files | 162        |
| Passing Files    | 115        |
| Failing Files    | 44         |
| Skipped Files    | 3          |
| Total Tests      | 2161       |
| Passing Tests    | 1947 (90%) |
| Failing Tests    | 118 (5.5%) |
| Skipped Tests    | 89 (4.1%)  |
| TODO Tests       | 7 (0.3%)   |

## Test Failure Categories

### Category 1: Database-Dependent Tests (Need Test DB)

These tests require a live database connection and fail in CI/local without proper setup.

**Files Affected:**

- `server/arApDb.test.ts` - AR/AP database operations
- `server/inventoryDb.test.ts` - Inventory dashboard stats
- `server/tests/calendarDb.v32.test.ts` - Calendar v3.2 features
- `server/tests/data-anomalies.test.ts` - Data validation
- `server/tests/schema-validation.test.ts` - Schema verification
- `server/__tests__/optimisticLocking.test.ts` - Optimistic locking
- `server/creditsDb.race-condition.test.ts` - Race condition protection
- `scripts/seed/seeders/*.test.ts` - Seeder validation

**Resolution:** Run with `pnpm test:db:reset && pnpm test` or add proper database mocks.

### Category 2: Permission/Auth Mock Issues

These tests have mock chain issues with the permission middleware.

**Files Affected:**

- `server/_core/permissionMiddleware.test.ts`
- `server/services/permissionService.test.ts`
- `tests/security/auth-bypass.test.ts`
- `tests/security/permission-escalation.test.ts`
- `server/auth.integration.test.ts`

**Resolution:** Fix mock proxy chain in `tests/setup.ts` for nested router mocks.

### Category 3: React Hook DOM Issues

These tests fail with "Target container is not a DOM element" due to mock interference.

**Files Affected:**

- `client/src/hooks/work-surface/__tests__/useExport.test.ts`
- `client/src/hooks/work-surface/__tests__/usePrint.test.ts`
- `client/src/hooks/work-surface/__tests__/useWorkSurfaceKeyboard.test.ts`
- `client/src/components/calendar/EventFormDialog.test.tsx`

**Root Cause:** Test mocks for `document.body.appendChild` and `document.body.removeChild` interfere with React Testing Library's container creation. The mocks override the actual DOM methods before renderHook tries to create its container.

**Resolution Options:**

1. Move DOM mocks to afterEach instead of beforeEach
2. Use `vi.spyOn` with passthrough for core DOM methods
3. Create custom renderHook wrapper that manages container separately
4. Restructure tests to use a dedicated render container

### Category 4: Router Mock Chain Issues

These tests fail due to incomplete tRPC router mocks.

**Files Affected:**

- `server/routers/comments.test.ts`
- `server/routers/calendar.pagination.test.ts`

**Resolution:** Update mock setup to handle nested router structures.

### Category 5: SQL Injection/Security Tests

These tests have specific mock requirements.

**Files Affected:**

- `tests/security/sql-injection.test.ts`

**Resolution:** Update Zod validation mocks.

## Tests Marked as Skipped (89 tests)

Tests intentionally skipped with `it.skip()` or `describe.skip()`:

- Accounting endpoints (NOT_IMPLEMENTED)
- Cash expenses endpoints (NOT_IMPLEMENTED)
- Balance sheet generation (NOT_IMPLEMENTED)
- Income statement generation (NOT_IMPLEMENTED)
- Various integration tests pending API completion

## Tests Marked as TODO (7 tests)

Tests marked with `it.todo()` for future implementation.

## Recommended Actions

### Immediate (Production Blocking)

1. **Security Tests** - Must pass before production
   - Fix auth-bypass.test.ts mock issues
   - Fix permission-escalation.test.ts

### Short-term (Post-MVP)

2. **Database Tests** - Run in CI with test database
   - Configure test database in CI pipeline
   - Add `@db-required` tag for selective running

### Long-term (Technical Debt)

3. **Hook Tests** - Fix DOM setup issues
4. **Router Tests** - Improve mock infrastructure

## Running Tests

```bash
# Run all tests
pnpm test

# Run with database (requires test DB running)
pnpm test:env:up && pnpm test

# Run specific category
pnpm test server/         # Server tests only
pnpm test client/         # Client tests only
pnpm test tests/security/ # Security tests only

# Run with coverage
pnpm test:coverage
```

## CI/CD Considerations

Current test suite should not block deployments if:

1. TypeScript compilation passes (`pnpm check`)
2. Production build succeeds (`pnpm build`)
3. Core functionality tests pass (90% pass rate achieved)

Tests requiring database access should be run in separate CI stage with test database.
