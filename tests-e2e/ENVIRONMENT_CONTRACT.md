# TERP E2E Test Environment Contract

## Purpose

This document defines the contract between E2E tests and the environments they run against. Tests MUST check environment conditions rather than assume them.

## Environment Detection

Tests detect the current environment via environment variables:

| Variable                      | Values                           | Purpose                           |
| ----------------------------- | -------------------------------- | --------------------------------- |
| `PLAYWRIGHT_BASE_URL`         | URL                              | Target app URL                    |
| `MEGA_QA_BASE_URL`            | URL                              | Alias for base URL                |
| `E2E_ENVIRONMENT`             | `local`, `staging`, `production` | Explicit override                 |
| `DEMO_MODE` / `E2E_DEMO_MODE` | `true`/`false`                   | Whether server auto-authenticates |
| `MEGA_QA_CLOUD`               | `1`/`true`                       | Cloud mode (skip local DB setup)  |
| `E2E_CLOUD`                   | `1`/`true`                       | Alias for cloud mode              |
| `SKIP_E2E_SETUP`              | `1`/`true`                       | Skip global setup                 |

### Derived Environments

| Environment    | Detection                                                   | Characteristics                            |
| -------------- | ----------------------------------------------------------- | ------------------------------------------ |
| **local**      | `localhost` or `127.0.0.1` in base URL                      | Fresh DB, seeded data, full control        |
| **staging**    | `staging` or `preview` in URL, or `E2E_ENVIRONMENT=staging` | Persistent data, may have DEMO_MODE        |
| **production** | Everything else                                             | Persistent data, real users, DO NOT mutate |

## Authentication Modes

### Standard Auth (Production)

- QA accounts authenticate via `/api/auth/login` with bcrypt-hashed passwords
- Session maintained via `terp_session` HTTP-only cookie
- Tests use `loginViaApi()` (preferred) or `loginViaForm()`

### DEMO_MODE Auth

- When `DEMO_MODE=true`, all visitors are auto-authenticated as Super Admin
- Role switcher is available in UI
- **RBAC tests are meaningless** in DEMO_MODE - they must skip

### QA Accounts

| Role              | Email                       | Available In     |
| ----------------- | --------------------------- | ---------------- |
| Super Admin       | `qa.superadmin@terp.test`   | All environments |
| Sales Manager     | `qa.salesmanager@terp.test` | All environments |
| Customer Service  | `qa.salesrep@terp.test`     | All environments |
| Inventory Manager | `qa.inventory@terp.test`    | All environments |
| Warehouse Staff   | `qa.fulfillment@terp.test`  | All environments |
| Accountant        | `qa.accounting@terp.test`   | All environments |
| Read-Only Auditor | `qa.auditor@terp.test`      | All environments |

Password for all: `TerpQA2026!` (overridable via `E2E_*_PASSWORD` env vars)

## Feature Flags

Tests that depend on optional features MUST use `requireFeature()` guard:

```typescript
import { requireFeature } from "../utils/preconditions";

test("live catalog admin", async ({ page }) => {
  await requireFeature(
    page,
    '[data-testid="live-catalog-tab"]',
    "Live Catalog"
  );
  // ... test proceeds only if feature is available
});
```

## Conditional Element Assertions

When a test needs to verify that **at least one** of multiple possible elements is present, use the appropriate helper:

### Skip if none found (precondition not met)

```typescript
import { requireOneOf } from "../utils/preconditions";

test("dashboard has activity", async ({ page }) => {
  // Skip test if neither element exists
  await requireOneOf(
    page,
    ["[data-testid='recent-orders']", "[data-testid='dashboard-activity']"],
    "Dashboard has no activity to test"
  );
});
```

### Assert one must exist (hard requirement)

```typescript
import { assertOneVisible } from "../utils/preconditions";

test("critical banner displays", async ({ page }) => {
  // Fail test if neither element exists
  await assertOneVisible(
    page,
    ["[data-testid='warning-banner']", "[role='alert']"],
    "Expected warning banner to be visible"
  );
});
```

**Anti-pattern to avoid:**

```typescript
// ❌ WRONG - always passes even if both are false
expect(condA || condB).toBeTruthy();

// ✅ CORRECT - use requireOneOf or assertOneVisible
await requireOneOf(page, [selectorA, selectorB]);
```

## RBAC Contract

| Role              | Can Access                                   | Cannot Access                           |
| ----------------- | -------------------------------------------- | --------------------------------------- |
| Super Admin       | Everything                                   | -                                       |
| Sales Manager     | Clients, Orders, Quotes, Sales Sheets        | Accounting internals, Admin panel       |
| Customer Service  | Clients, Orders, Returns, Refunds            | Accounting, Admin, Inventory management |
| Inventory Manager | Inventory, Locations, Transfers, Intake      | Accounting, Orders                      |
| Warehouse Staff   | Receive POs, Adjustments, Transfers, Returns | Accounting, Clients, Orders             |
| Accountant        | Accounting, Credits, COGS, Bad Debt          | Inventory management, Admin panel       |
| Read-Only Auditor | Read all modules, Audit logs                 | Write/create/update operations          |

## Suite Separation

### `prod-smoke` (Safe for production)

- Read-only tests
- Navigation and page load verification
- Authentication smoke tests
- Dashboard visibility checks
- Run command: `npx playwright test --grep @prod-smoke`

### `prod-regression` (Extended production tests)

- Tests that read existing data
- Search and filter functionality
- RBAC positive access verification
- Run command: `npx playwright test --grep @prod-regression`

### `dev-only` (Local/staging only)

- Tests that create, update, or delete data
- CRUD operations
- Golden flow tests (create orders, batches, etc.)
- Run command: `npx playwright test --grep @dev-only`

## Data Expectations

### Production

- **DO NOT** assume specific IDs exist (no `goto('/clients/1')`)
- **DO NOT** create/delete data unless test cleans up after itself
- **DO** use `requireDataRows()` to skip when no data available
- **DO** query existing data dynamically

### Local/Staging

- Seed data is available from `pnpm seed:all-defaults`
- Known entities can be referenced
- Tests should still use guards for resilience

## Timeouts

| Context            | Default                        | Max |
| ------------------ | ------------------------------ | --- |
| Element visibility | 10s                            | 15s |
| Page navigation    | 30s                            | 45s |
| Network idle       | 15s                            | 30s |
| API response       | 10s                            | 20s |
| Animation settle   | Use `waitForLoadingComplete()` | -   |

**NEVER use `page.waitForTimeout()`**. Use deterministic waits from `utils/wait-helpers.ts`.

## Available Utility Modules

### `utils/wait-helpers.ts`

Deterministic wait helpers with real composite logic:

- `waitForLoadingComplete(page, options?)` - Wait for skeleton/spinner to disappear
- `waitForTableReady(page, options?)` - Combined skeleton + row appearance wait

**Removed thin wrappers:** `waitForNetworkIdle`, `waitForToast`, `waitForNavigation`, `waitForDialog`, `waitForSearchResults` - use Playwright APIs directly instead.

### `utils/preconditions.ts`

Test precondition guards:

- `skipUnless(condition, reason)` - Skip if condition false
- `skipInProduction(reason?)` - Skip for data mutation tests
- `skipInLocal(reason?)` - Skip when running local-only
- `skipUnlessProduction(reason?)` - Skip unless strict production
- `skipIfNotProduction(reason?)` - Backward-compatible alias for `skipUnlessProduction`
- `skipInDemoMode(reason?)` - Skip when DEMO_MODE active
- `requireDataRows(page, options?)` - Verify data exists, skip if empty
- `requireElement(page, selector, reason?, timeout?)` - Verify element exists
- `requireAuthenticated(page)` - Verify not on login page
- `requireFeature(page, selector, name, timeout?)` - Verify feature flag enabled
- `requireOneOf(page, selectors[], reason?, timeout?)` - Skip if none of selectors visible
- `assertOneVisible(page, selectors[], message?, timeout?)` - Fail if none of selectors visible

### `utils/environment.ts`

Environment detection constants:

- `IS_PRODUCTION`, `IS_LOCAL`, `IS_REMOTE` - Environment flags
- `BASE_URL` - Target application URL
- `DEMO_MODE_EXPECTED` - Whether DEMO_MODE is active

### Removed Modules

- **`utils/selectors.ts`** - Pure abstraction layer over Playwright APIs (use Playwright directly)
- **`utils/test-tags.ts`** - `tagSuite()` was broken (tags should be in `test.describe()` titles for `--grep` filtering)
