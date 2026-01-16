# TERP QA Documentation

This directory contains comprehensive documentation for Quality Assurance testing in TERP.

## Quick Start

```bash
# 1. Seed QA accounts (first time only)
pnpm seed:qa-accounts

# 2. Run core (Tier 1) tests
pnpm qa:test:core

# 3. Run all oracle-based tests
pnpm qa:test:all

# 4. Generate coverage report
pnpm qa:coverage
```

## Contents

| Document                                                         | Description                                           |
| ---------------------------------------------------------------- | ----------------------------------------------------- |
| [QA_PLAYBOOK.md](./QA_PLAYBOOK.md)                               | Step-by-step guide for manual QA testing              |
| [FLOW_COVERAGE_PLAN.md](./FLOW_COVERAGE_PLAN.md)                 | Test coverage strategy and flow analysis              |
| [TEST_ORACLE_SCHEMA.md](./TEST_ORACLE_SCHEMA.md)                 | YAML DSL schema for test oracles                      |
| [USER_FLOW_E2E_AGENT_PROMPT.md](./USER_FLOW_E2E_AGENT_PROMPT.md) | AI agent prompt for impact-outcome-driven E2E testing |

## Oracle-Based Test System

TERP uses a declarative, YAML-based "Test Oracle" system for automated E2E testing. This enables:

- **Machine-readable test definitions** that are easy to maintain and extend
- **Role-based testing** with deterministic QA accounts
- **Both UI and DB assertions** in a single test definition
- **Easy coverage tracking** against the USER_FLOW_MATRIX

### Architecture

```
tests-e2e/oracles/
├── index.ts              # Main exports
├── types.ts              # TypeScript type definitions
├── loader.ts             # YAML oracle loader
├── executor.ts           # Playwright oracle executor
├── auth-fixtures.ts      # QA role authentication
├── oracle-runner.spec.ts # Main Playwright test file
├── orders/               # Order domain oracles
├── inventory/            # Inventory domain oracles
├── clients/              # CRM domain oracles
├── accounting/           # Accounting domain oracles
├── auth/                 # Auth domain oracles
├── dashboard/            # Dashboard domain oracles
└── _seed-profiles/       # Seed data profiles
```

### Run Commands

| Command                   | Description                      |
| ------------------------- | -------------------------------- |
| `pnpm qa:test:core`       | Run Tier 1 (critical) flow tests |
| `pnpm qa:test:all`        | Run all Tier 1 + Tier 2 tests    |
| `pnpm qa:test:smoke`      | Run smoke tests only             |
| `pnpm qa:test:orders`     | Run orders domain tests          |
| `pnpm qa:test:clients`    | Run clients domain tests         |
| `pnpm qa:test:inventory`  | Run inventory domain tests       |
| `pnpm qa:test:accounting` | Run accounting domain tests      |
| `pnpm qa:test:headed`     | Run tests with visible browser   |
| `pnpm qa:coverage`        | Generate coverage report         |

### Run a Specific Flow

```bash
# Run single oracle by flow ID
ORACLE_RUN_MODE=single ORACLE_FLOW_ID="Orders.Orders.ListOrders" pnpm qa:test:flow
```

---

## QA Authentication

TERP provides deterministic QA authentication for reproducible testing.

### Enable QA Auth

Set in your `.env`:

```
QA_AUTH_ENABLED=true
```

### Seed QA Accounts

```bash
pnpm seed:qa-accounts
```

### Available QA Accounts

| Email                       | Role               | Domain Access                        |
| --------------------------- | ------------------ | ------------------------------------ |
| `qa.superadmin@terp.test`   | Super Admin        | All                                  |
| `qa.salesmanager@terp.test` | Sales Manager      | CRM, Orders, Pricing                 |
| `qa.salesrep@terp.test`     | Sales Rep          | CRM (read), Orders, Inventory (read) |
| `qa.inventory@terp.test`    | Inventory Manager  | Inventory, COGS                      |
| `qa.fulfillment@terp.test`  | Fulfillment        | Orders, Pick-Pack                    |
| `qa.accounting@terp.test`   | Accounting Manager | Accounting, Reports                  |
| `qa.auditor@terp.test`      | Read-Only Auditor  | All (read-only)                      |

**Password for all QA accounts:** `TerpQA2026!`

### Manual Login via API

```bash
curl -X POST http://localhost:3000/api/qa-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "qa.salesmanager@terp.test", "password": "TerpQA2026!"}'
```

### Security Note

QA authentication is **automatically disabled in production** environments (`NODE_ENV=production`).

---

## Writing Test Oracles

Oracles are YAML files that define E2E test scenarios.

### Basic Structure

```yaml
# File: tests-e2e/oracles/orders/create-order.oracle.yaml

flow_id: "Orders.Orders.CreateOrder"
description: "Create a new order via the UI"
role: "SalesRep"
tags:
  - tier1
  - orders
timeout: 45000

preconditions:
  ensure:
    - entity: "client"
      ref: "seed:client.redwood"

steps:
  - action: navigate
    path: "/orders/new"
    wait_for: "[data-testid='order-form']"

  - action: select
    target: "[data-testid='client-select']"
    value: "Redwood Dispensary"

  - action: click
    target: "button[type='submit']"
    wait_for_navigation: true

expected_ui:
  url_contains: "/orders/"
  visible:
    - "[data-testid='order-detail']"
  text_present:
    - "Order Created"

expected_db:
  orders:
    - where:
        client_id: "$seed:client.redwood.id"
      expect:
        status: "draft"
```

### Flow ID Convention

```
FlowID = "<Domain>.<Entity>.<FlowName>"
```

Examples:

- `Orders.Orders.CreateDraftEnhanced`
- `CRM.Clients.Create`
- `Inventory.Batches.UpdateStatus`

### Available Actions

| Action       | Description               |
| ------------ | ------------------------- |
| `navigate`   | Go to a URL path          |
| `click`      | Click an element          |
| `type`       | Type into an input        |
| `select`     | Select from dropdown      |
| `wait`       | Wait for element/network  |
| `assert`     | Inline assertion          |
| `screenshot` | Capture screenshot        |
| `store`      | Store value for later use |

See [TEST_ORACLE_SCHEMA.md](./TEST_ORACLE_SCHEMA.md) for full DSL documentation.

---

## Flow Coverage

TERP has **274 documented user flows** across 10 domains:

| Domain      | Total | Client-Wired | Tier 1 | Tier 2 |
| ----------- | ----- | ------------ | ------ | ------ |
| Accounting  | 53    | 8            | 12     | 15     |
| CRM/Clients | 29    | 29           | 10     | 12     |
| Inventory   | 37    | 37           | 10     | 10     |
| Orders      | 37    | 37           | 15     | 10     |
| Pricing     | 17    | 17           | 5      | 5      |
| Calendar    | 35    | 12           | 4      | 6      |
| Workflow    | 13    | 13           | 4      | 4      |
| Dashboard   | 12    | 12           | 5      | 3      |
| Analytics   | 8     | 7            | 3      | 3      |
| Admin       | 29    | 23           | 6      | 6      |

See [FLOW_COVERAGE_PLAN.md](./FLOW_COVERAGE_PLAN.md) for detailed coverage strategy.

---

## Existing Test Infrastructure

TERP also has traditional Playwright tests:

```bash
# All E2E tests
pnpm test:e2e

# Smoke tests
pnpm test:smoke

# AI-generated tests
pnpm test:e2e:ai:run

# Critical path tests
pnpm test:e2e --grep "critical-paths"

# Full Mega QA suite
pnpm mega:qa
```

---

## CI/CD Integration

Oracle tests integrate with existing CI pipelines:

```yaml
# .github/workflows/qa.yml (example)
- name: Run Core QA Tests
  run: |
    pnpm seed:qa-accounts
    pnpm qa:test:core
```

Test results are written to:

- `test-results/oracle-results.json` - Per-test results
- `test-results/oracle-coverage.json` - Coverage report

---

## Debugging

### Run with Visible Browser

```bash
pnpm qa:test:headed
```

### Debug Mode

```bash
DEBUG=pw:api pnpm qa:test:core
```

### Check Oracle Loading

```bash
# Verify oracles can be loaded
tsx -e "const {generateOracleSummary} = require('./tests-e2e/oracles'); console.log(generateOracleSummary());"
```

---

## Related Resources

- [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv) - Complete flow definitions
- [FLOW_GUIDE.md](../reference/FLOW_GUIDE.md) - Flow documentation
- [QA Auth Documentation](../auth/QA_AUTH.md) - Authentication details
- [Playwright Config](../../playwright.config.ts) - Test runner configuration
