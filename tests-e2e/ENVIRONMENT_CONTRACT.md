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
