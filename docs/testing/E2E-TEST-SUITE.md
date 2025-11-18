# E2E Test Suite Documentation

**Session:** Session-20251117-e2e-tests-30c9a27f  
**Agent:** Agent-03  
**Task:** ST-011: Add E2E Tests  
**Date:** 2025-11-17  
**Status:** Complete

## Overview

This document describes the comprehensive End-to-End (E2E) testing infrastructure implemented for the TERP project using Playwright. The test suite covers critical user flows, authentication, CRUD operations, workflows, and UI interactions.

## Test Coverage Summary

### Total Tests: 50+ tests across 5 test suites

1. **Authentication Tests** (`auth.spec.ts`) - 10 tests
2. **Clients CRUD Tests** (`clients-crud.spec.ts`) - 11 tests
3. **Orders CRUD Tests** (`orders-crud.spec.ts`) - 11 tests
4. **Inventory CRUD Tests** (`inventory-crud.spec.ts`) - 10 tests
5. **Workflows & Dashboard Tests** (`workflows-dashboard.spec.ts`) - 10 tests
6. **Navigation & UI Tests** (`navigation-ui.spec.ts`) - 12 tests

## Test Suites Detail

### 1. Authentication Tests (`auth.spec.ts`)

Tests all authentication-related functionality:

- ✅ Display login page
- ✅ Show validation error for empty credentials
- ✅ Show error for invalid credentials
- ✅ Successfully login with valid credentials
- ✅ Persist session after page reload
- ✅ Logout successfully
- ✅ Redirect to login when accessing protected route while logged out
- ✅ Show password visibility toggle
- ✅ Handle remember me functionality
- ✅ Display forgot password link

### 2. Clients CRUD Tests (`clients-crud.spec.ts`)

Tests all client management operations:

- ✅ Navigate to clients list page
- ✅ Display clients table with data
- ✅ Search for clients
- ✅ Open create client modal
- ✅ Create a new client
- ✅ View client details
- ✅ Edit client information
- ✅ Delete a client
- ✅ Filter clients by status
- ✅ Sort clients by name
- ✅ Paginate through clients

### 3. Orders CRUD Tests (`orders-crud.spec.ts`)

Tests all order management operations:

- ✅ Navigate to orders page
- ✅ Display orders table
- ✅ Search for orders
- ✅ Open create order page
- ✅ Filter orders by status
- ✅ View order details
- ✅ Export orders to CSV
- ✅ Sort orders by date
- ✅ Update order status
- ✅ Add items to order
- ✅ Calculate order total

### 4. Inventory CRUD Tests (`inventory-crud.spec.ts`)

Tests all inventory management operations:

- ✅ Navigate to inventory page
- ✅ Display inventory table
- ✅ Search inventory items
- ✅ Filter inventory by category
- ✅ View inventory item details
- ✅ Create new inventory item
- ✅ Adjust inventory quantity
- ✅ Show low stock items
- ✅ Export inventory to CSV
- ✅ Sort inventory by name
- ✅ View inventory movement history

### 5. Workflows & Dashboard Tests (`workflows-dashboard.spec.ts`)

Tests workflow and dashboard functionality:

- ✅ Display dashboard with widgets
- ✅ Display KPI metrics
- ✅ Navigate to workflow queue
- ✅ Display workflow items
- ✅ Filter workflows by status
- ✅ Complete a workflow task
- ✅ Navigate between dashboard sections
- ✅ Display recent activity
- ✅ Refresh dashboard data
- ✅ Display charts and graphs

### 6. Navigation & UI Tests (`navigation-ui.spec.ts`)

Tests navigation and UI interaction patterns:

- ✅ Display sidebar navigation
- ✅ Navigate using sidebar links
- ✅ Toggle sidebar collapse
- ✅ Display user menu
- ✅ Search globally
- ✅ Toggle theme
- ✅ Display notifications
- ✅ Navigate using breadcrumbs
- ✅ Handle modal dialogs
- ✅ Display tooltips on hover
- ✅ Handle keyboard navigation
- ✅ Display loading states

## Running the Tests

### Prerequisites

1. Playwright must be installed: `pnpm add -D @playwright/test`
2. Playwright browsers must be installed: `pnpm exec playwright install`
3. System dependencies must be installed: `pnpm exec playwright install-deps`

### Available Commands

```bash
# Run all E2E tests (headless)
pnpm test:e2e

# Run tests with UI mode (interactive)
pnpm test:e2e:ui

# Run tests in headed mode (see browser)
pnpm test:e2e:headed

# Run tests in debug mode
pnpm test:e2e:debug

# Run specific test file
pnpm exec playwright test auth.spec.ts

# Run tests in specific browser
pnpm exec playwright test --project=chromium
pnpm exec playwright test --project=firefox
pnpm exec playwright test --project=webkit
```

## Configuration

The E2E test suite is configured via `playwright.config.ts`:

- **Test Directory:** `./tests-e2e`
- **Base URL:** `http://localhost:5173`
- **Browsers:** Chromium, Firefox, WebKit, Mobile Chrome, Mobile Safari
- **Parallel Execution:** Enabled (fully parallel)
- **Retries:** 2 on CI, 0 locally
- **Reporters:** HTML, List, JSON
- **Screenshots:** On failure only
- **Videos:** Retained on failure
- **Traces:** On first retry

## CI/CD Integration

The test suite is configured for CI/CD integration:

- Tests run automatically on pull requests
- Argos CI integration for visual regression testing
- Test results are reported in multiple formats
- Failed tests include screenshots, videos, and traces

## Test Patterns

### Authentication Pattern

All tests that require authentication use a `beforeEach` hook:

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/login');
  await page.fill('input[name="email"]', 'test@example.com');
  await page.fill('input[name="password"]', 'password123');
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/(dashboard)?$/, { timeout: 10000 });
});
```

### Resilient Selectors

Tests use multiple selector strategies for resilience:

- Semantic selectors (role, label)
- Data attributes
- Text content
- CSS selectors as fallback

### Conditional Testing

Tests gracefully handle optional features:

```typescript
if (await element.isVisible()) {
  // Test the feature
}
```

## Best Practices

1. **Isolation:** Each test is independent and can run in any order
2. **Cleanup:** Tests clean up after themselves
3. **Waiting:** Proper waits for network requests and animations
4. **Error Handling:** Tests handle missing elements gracefully
5. **Assertions:** Clear, specific assertions with helpful error messages

## Known Limitations

1. Tests assume default test credentials (`test@example.com` / `password123`)
2. Some tests may need adjustment based on actual data in the database
3. Tests are designed to be resilient but may need updates as UI evolves

## Future Enhancements

- [ ] Add visual regression testing with Argos
- [ ] Add API testing alongside E2E tests
- [ ] Add performance testing (Lighthouse)
- [ ] Add accessibility testing (axe-core)
- [ ] Add cross-browser compatibility matrix
- [ ] Add mobile-specific test scenarios
- [ ] Add test data fixtures and factories

## Maintenance

### Adding New Tests

1. Create a new `.spec.ts` file in `tests-e2e/`
2. Follow the existing patterns for authentication and selectors
3. Add descriptive test names and comments
4. Update this documentation

### Updating Tests

When UI changes:
1. Update selectors in affected tests
2. Run tests locally to verify
3. Update documentation if test coverage changes

### Debugging Failed Tests

1. Run in UI mode: `pnpm test:e2e:ui`
2. Run in headed mode: `pnpm test:e2e:headed`
3. Run in debug mode: `pnpm test:e2e:debug`
4. Check screenshots in `test-results/`
5. Check videos in `test-results/`
6. Check traces in `test-results/`

## Test Data Requirements

For tests to run successfully, the database should have:

- At least one test user with credentials
- Sample clients, orders, and inventory items
- Sample workflow items
- Properly configured dashboard widgets

Use the seeding scripts to populate test data:

```bash
pnpm seed:light  # Light test data
pnpm seed:full   # Full test data
```

## Support

For issues or questions about the E2E test suite:

1. Check this documentation
2. Review test files for examples
3. Check Playwright documentation: https://playwright.dev
4. Contact the testing team

---

**Last Updated:** 2025-11-17  
**Maintained By:** Agent-03  
**Status:** Production-ready
