# Property-Based Testing

This directory contains property-based tests using [fast-check](https://github.com/dubzzz/fast-check) to verify business logic invariants.

## Philosophy

Property-based testing differs from example-based testing:

- **Example-based**: "When I add 2 + 2, I expect 4"
- **Property-based**: "For ALL numbers a and b, a + b = b + a" (commutativity)

We test **invariants** that must hold for all possible inputs, not specific examples.

## Directory Structure

```
tests/property/
├── arbitraries.ts          # Shared test data generators
├── inventory/              # Inventory calculation properties (inventoryUtils.ts)
├── matching/               # Strain matching/alias properties (strainMatcher.ts, strainAliases.ts)
└── fuzz/                   # Adversarial input fuzzing
```

## Production Code Coverage

All tests in this suite test **REAL production code**:

| Test File                                  | Production Module               | Functions Tested |
| ------------------------------------------ | ------------------------------- | ---------------- |
| `inventory/utils.property.test.ts`         | `server/inventoryUtils.ts`      | 11 functions     |
| `matching/strain-matcher.property.test.ts` | `server/strainMatcher.ts`       | 2 functions      |
| `matching/strain-aliases.property.test.ts` | `server/utils/strainAliases.ts` | 8 functions      |
| `fuzz/adversarial.property.test.ts`        | All above                       | Attack vectors   |

## Running Tests

```bash
# Standard run (100 iterations per property)
pnpm test:property

# Full run (10,000 iterations - for local development)
pnpm test:property:full

# Run specific suite
pnpm test:property -- tests/property/inventory/

# Replay a failing seed
FC_SEED=12345 pnpm test:property
```

## Writing Property Tests

### Basic Structure

```typescript
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { batchArb } from "../arbitraries";
import { calculateAvailableQty } from "../../../server/inventoryUtils";

describe("Inventory Properties", () => {
  it("P1: Available quantity is never negative", () => {
    fc.assert(
      fc.property(batchArb, batch => {
        const result = calculateAvailableQty(batch);
        return result >= 0;
      }),
      { numRuns: getNumRuns() } // Respects NUM_RUNS env var
    );
  });
});
```

### Using Shared Arbitraries

Always use arbitraries from `arbitraries.ts` for consistency:

```typescript
import {
  adversarialStringArb, // Strings that break parseFloat
  batchArb, // Valid batch objects
  moneyArb, // Currency values
  quantityArb, // Quantity values
} from "../arbitraries";
```

### Adversarial Testing

For functions that parse strings, always test with adversarial inputs:

```typescript
it("should handle adversarial inputs without NaN", () => {
  fc.assert(
    fc.property(adversarialStringArb, input => {
      const result = parseQty(input);
      return !isNaN(result); // Must never be NaN
    })
  );
});
```

## Common Properties to Test

| Property Type      | Example                | When to Use                  |
| ------------------ | ---------------------- | ---------------------------- |
| **Non-negativity** | `result >= 0`          | Money, quantities, distances |
| **Bounds**         | `result ∈ [0, 100]`    | Percentages, scores          |
| **Idempotency**    | `f(f(x)) === f(x)`     | Normalization functions      |
| **Symmetry**       | `f(a, b) === f(b, a)`  | Comparison, distance         |
| **Identity**       | `f(x, x) === expected` | Reflexive operations         |
| **Conservation**   | `sum(parts) === whole` | Inventory allocation         |
| **No NaN**         | `!isNaN(result)`       | Any numeric calculation      |

## Configuration

Tests respect the `NUM_RUNS` environment variable:

- CI: `NUM_RUNS=100` (fast)
- Local: `NUM_RUNS=10000` (thorough)

Seeds are logged on failure for reproducibility.

## Debugging Failures

When a property test fails, fast-check provides a **shrunk counterexample** - the smallest input that causes failure:

```
Property failed after 42 tests
Shrunk 5 time(s)
Counterexample: { onHandQty: "-1", reservedQty: "0", ... }
Seed: 1234567890
```

To replay:

```bash
FC_SEED=1234567890 pnpm test:property -- tests/property/inventory/
```

## Integration with Mega QA

Property tests are included in the Mega QA suite. Run:

```bash
pnpm mega:qa
```

Results appear in the `MACHINE_SUMMARY.txt` under "Property Tests".
