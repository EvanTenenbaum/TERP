# Test Fixtures

This directory contains hand-crafted JSON fixtures for unit tests that need specific, isolated data.

## Purpose

Test fixtures provide **deterministic, minimal data** for unit tests that don't need a full database seed. They're faster and more focused than scenario-based seeds.

## Available Fixtures

### Clients

- **`whale-client.json`**: A whale client (70% of revenue) with high total spent
- **`regular-client.json`**: A regular client (30% of revenue) with lower total spent

### Products

- **`product.json`**: A standard flower product (Blue Dream - Indoor)

### Orders

- **`order.json`**: A multi-item order for a whale client

### Invoices

- **`overdue-invoice.json`**: An invoice overdue by 120+ days

## Usage in Tests

```typescript
import { readFileSync } from 'fs';
import { join } from 'path';

// Load a fixture
const whaleClient = JSON.parse(
  readFileSync(join(__dirname, '../fixtures/whale-client.json'), 'utf-8')
);

// Use in test
test('should calculate whale client revenue correctly', () => {
  expect(whaleClient.totalSpent).toBeGreaterThan(1_000_000);
});
```

## When to Use Fixtures vs. Scenarios

| Use Case | Tool | Why |
|:---------|:-----|:----|
| Unit test for a single function | **Fixture** | Fast, isolated, no database needed |
| Integration test for a tRPC router | **Scenario (light)** | Needs database, but fast (~30s) |
| E2E test for a user flow | **Scenario (full)** | Needs realistic data at scale |
| Stress test for edge cases | **Scenario (edgeCases)** | Needs extreme data patterns |

## Adding New Fixtures

1. Create a new JSON file in this directory
2. Follow the schema from `drizzle/schema.ts`
3. Use realistic, deterministic data (no random values)
4. Document the fixture in this README
5. Keep fixtures minimal (only the fields needed for the test)
