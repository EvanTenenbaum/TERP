/**
 * Shared Test Arbitraries for Property-Based Testing
 *
 * This module provides reusable fast-check arbitraries for all TERP domain types.
 * Using shared arbitraries ensures consistent edge case coverage across all tests.
 *
 * @module arbitraries
 */

import * as fc from "fast-check";

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Get the number of test runs based on environment.
 * CI uses fewer runs for speed, local uses more for thoroughness.
 */
export function getNumRuns(): number {
  const envRuns = process.env.NUM_RUNS;
  if (envRuns) {
    const parsed = parseInt(envRuns, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  // Default: 100 in CI, 1000 locally
  return process.env.CI ? 100 : 1000;
}

// ============================================================================
// ADVERSARIAL STRING ARBITRARIES
// ============================================================================

/**
 * Strings that commonly break parseFloat/Number parsing.
 * Use this to fuzz any function that parses numeric strings.
 *
 * @example
 * fc.assert(fc.property(adversarialStringArb, (s) => {
 *   const result = parseQty(s);
 *   return !isNaN(result);  // Should never be NaN
 * }));
 */
export const adversarialStringArb = fc.oneof(
  // Null-like
  fc.constant(null as unknown as string),
  fc.constant(undefined as unknown as string),

  // Empty/whitespace
  fc.constant(""),
  fc.constant(" "),
  fc.constant("\t"),
  fc.constant("\n"),
  fc.constant("   "),

  // Non-numeric strings
  fc.constant("abc"),
  fc.constant("NaN"),
  fc.constant("null"),
  fc.constant("undefined"),
  fc.constant("true"),
  fc.constant("false"),

  // Special numeric values
  fc.constant("Infinity"),
  fc.constant("-Infinity"),
  fc.constant("+Infinity"),
  fc.constant("-0"),
  fc.constant("+0"),

  // Edge case numbers
  fc.constant("1e308"), // Near MAX_VALUE
  fc.constant("1e-308"), // Near MIN_VALUE
  fc.constant("9999999999999999999999"), // Beyond safe integer
  fc.constant("0.0000000000000001"),

  // Negative numbers
  fc.constant("-1"),
  fc.constant("-100"),
  fc.constant("-0.01"),

  // With units/symbols
  fc.constant("$100"),
  fc.constant("100%"),
  fc.constant("100kg"),
  fc.constant("1,000"),
  fc.constant("1.000,00"), // European format

  // Unicode tricks
  fc.constant("１２３"), // Full-width digits
  fc.constant("⁰¹²³"), // Superscript
  fc.constant("₀₁₂₃"), // Subscript

  // Random valid numbers
  fc.float({ min: -10000, max: 10000, noNaN: true }).map(String),

  // Random strings
  fc.string({ minLength: 0, maxLength: 20 })
);

/**
 * Valid numeric strings (for positive test cases)
 */
export const validNumericStringArb = fc.oneof(
  fc.constant("0"),
  fc.constant("1"),
  fc.constant("100"),
  fc.constant("0.5"),
  fc.constant("99.99"),
  fc.float({ min: 0, max: 10000, noNaN: true }).map(n => n.toFixed(2))
);

// ============================================================================
// QUANTITY ARBITRARIES
// ============================================================================

/**
 * Arbitrary for quantity strings (used in batch onHandQty, reservedQty, etc.)
 * Generates valid decimal strings from 0 to 10000.
 */
export const quantityArb = fc
  .float({ min: 0, max: 10000, noNaN: true })
  .map(n => n.toFixed(2));

/**
 * Arbitrary for quantity strings that can include invalid values.
 * Use for testing validation and error handling.
 */
export const maybeInvalidQuantityArb = fc.oneof(
  quantityArb,
  adversarialStringArb
);

// ============================================================================
// MONEY ARBITRARIES
// ============================================================================

/**
 * Arbitrary for money/currency strings.
 * Generates valid decimal strings from 0 to 10000.
 * Note: Using 32-bit float compatible range for fast-check v4.
 */
export const moneyArb = fc
  .float({ min: 0, max: 10000, noNaN: true })
  .map(n => n.toFixed(2));

/**
 * Arbitrary for prices that can be negative (for adjustments)
 */
export const priceAdjustmentArb = fc
  .float({ min: -10000, max: 10000, noNaN: true })
  .map(n => n.toFixed(2));

// ============================================================================
// BATCH ARBITRARIES
// ============================================================================

/**
 * Arbitrary for BatchStatus enum values
 */
export const batchStatusArb = fc.constantFrom(
  "AWAITING_INTAKE",
  "LIVE",
  "PHOTOGRAPHY_COMPLETE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED"
);

/**
 * Arbitrary for COGS mode
 */
export const cogsModeArb = fc.constantFrom("FIXED", "RANGE");

/**
 * Arbitrary for valid Batch objects.
 * Generates batches with valid quantity distributions.
 */
export const batchArb = fc
  .record({
    id: fc.integer({ min: 1, max: 100000 }),
    onHandQty: quantityArb,
    reservedQty: quantityArb,
    quarantineQty: quantityArb,
    holdQty: quantityArb,
    defectiveQty: quantityArb,
    batchStatus: batchStatusArb,
    cogsMode: cogsModeArb,
    unitCogs: fc.option(moneyArb, { nil: null }),
    unitCogsMin: fc.option(moneyArb, { nil: null }),
    unitCogsMax: fc.option(moneyArb, { nil: null }),
  })
  .map(batch => {
    // Ensure allocated quantities never exceed on-hand after rounding.
    const onHandCents = Math.max(0, Math.round(parseFloat(batch.onHandQty) * 100));
    const maxAllocatableCents = Math.floor(onHandCents * 0.9); // Leave some available

    const rawReservedCents = Math.max(
      0,
      Math.round(parseFloat(batch.reservedQty) * 100)
    );
    const rawQuarantineCents = Math.max(
      0,
      Math.round(parseFloat(batch.quarantineQty) * 100)
    );
    const rawHoldCents = Math.max(0, Math.round(parseFloat(batch.holdQty) * 100));

    const reservedCapCents = Math.floor(maxAllocatableCents * 0.4);
    const quarantineCapCents = Math.floor(maxAllocatableCents * 0.3);
    const holdCapCents = Math.floor(maxAllocatableCents * 0.3);

    const reservedCents = Math.min(rawReservedCents, reservedCapCents);
    const quarantineCents = Math.min(rawQuarantineCents, quarantineCapCents);
    const holdCents = Math.min(rawHoldCents, holdCapCents);

    return {
      ...batch,
      reservedQty: (reservedCents / 100).toFixed(2),
      quarantineQty: (quarantineCents / 100).toFixed(2),
      holdQty: (holdCents / 100).toFixed(2),
    };
  });

/**
 * Arbitrary for batches with potentially invalid quantity distributions.
 * Use for testing validation logic.
 */
export const invalidBatchArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  onHandQty: maybeInvalidQuantityArb,
  reservedQty: maybeInvalidQuantityArb,
  quarantineQty: maybeInvalidQuantityArb,
  holdQty: maybeInvalidQuantityArb,
  defectiveQty: maybeInvalidQuantityArb,
  batchStatus: batchStatusArb,
  cogsMode: cogsModeArb,
  unitCogs: fc.option(adversarialStringArb, { nil: null }),
  unitCogsMin: fc.option(adversarialStringArb, { nil: null }),
  unitCogsMax: fc.option(adversarialStringArb, { nil: null }),
});

// ============================================================================
// STRAIN NAME ARBITRARIES
// ============================================================================

/**
 * Arbitrary for valid strain names.
 * Generates realistic strain name patterns.
 */
export const strainNameArb = fc.oneof(
  // Simple names
  fc.constantFrom(
    "Blue Dream",
    "OG Kush",
    "Sour Diesel",
    "Girl Scout Cookies",
    "Northern Lights",
    "White Widow",
    "Granddaddy Purple",
    "Jack Herer",
    "Green Crack",
    "Pineapple Express"
  ),

  // With numbers
  fc.constantFrom(
    "AK-47",
    "Gorilla Glue #4",
    "G13",
    "818 Headband",
    "3 Kings",
    "707 Headband"
  ),

  // Abbreviations
  fc.constantFrom("GSC", "GDP", "GG4", "OG", "NL", "WW", "SFV", "SSH"),

  // Generated patterns
  fc
    .tuple(
      fc.constantFrom("Blue", "Green", "Purple", "White", "Golden", "Silver"),
      fc.constantFrom("Dream", "Haze", "Kush", "Diesel", "Cookies", "Widow")
    )
    .map(([a, b]) => `${a} ${b}`),

  // With variant numbers
  fc
    .tuple(
      fc.constantFrom("Blue Dream", "OG Kush", "Sour Diesel"),
      fc.integer({ min: 1, max: 10 })
    )
    .map(([name, num]) => `${name} #${num}`)
);

/**
 * Arbitrary for adversarial strain names (for fuzzing)
 */
export const adversarialStrainNameArb = fc.oneof(
  strainNameArb,
  fc.constant(""),
  fc.constant(" "),
  fc.constant("   multiple   spaces   "),
  fc.constant("ALLCAPS"),
  fc.constant("lowercase"),
  fc.constant("Mixed CASE strain"),
  fc.constant("Special!@#$%Characters"),
  fc.constant("Unicode: 日本語"),
  fc.constant("Emoji: 🌿"),
  fc.string({ minLength: 0, maxLength: 100 }),
  fc.string({ minLength: 200, maxLength: 300 }) // Very long
);

// ============================================================================
// PRICING ARBITRARIES
// ============================================================================

/**
 * Arbitrary for pricing adjustment types
 */
export const adjustmentTypeArb = fc.constantFrom(
  "PERCENT_MARKUP",
  "PERCENT_MARKDOWN",
  "DOLLAR_MARKUP",
  "DOLLAR_MARKDOWN"
);

/**
 * Arbitrary for percentage values (0-100)
 */
export const percentageArb = fc.float({ min: 0, max: 100, noNaN: true });

/**
 * Arbitrary for COGS adjustment types
 */
export const cogsAdjustmentTypeArb = fc.constantFrom(
  "NONE",
  "PERCENTAGE",
  "FIXED_AMOUNT"
);

// ============================================================================
// CLIENT ARBITRARIES
// ============================================================================

/**
 * Arbitrary for client COGS adjustment configuration
 */
export const clientCOGSConfigArb = fc.record({
  cogsAdjustmentType: cogsAdjustmentTypeArb,
  cogsAdjustmentValue: fc.option(
    fc.float({ min: -50, max: 50, noNaN: true }).map(n => n.toFixed(2)),
    { nil: null }
  ),
});

// ============================================================================
// CREDIT ENGINE ARBITRARIES
// ============================================================================

/**
 * Arbitrary for credit signal scores (0-100)
 */
export const creditSignalArb = fc.integer({ min: 0, max: 100 });

/**
 * Arbitrary for credit signal trends
 */
export const trendArb = fc.constantFrom(-1, 0, 1);

/**
 * Arbitrary for complete credit signals object
 */
export const creditSignalsArb = fc.record({
  revenueMomentum: creditSignalArb,
  cashCollectionStrength: creditSignalArb,
  profitabilityQuality: creditSignalArb,
  debtAgingRisk: creditSignalArb,
  repaymentVelocity: creditSignalArb,
  tenureDepth: creditSignalArb,
});

// ============================================================================
// METADATA ARBITRARIES
// ============================================================================

/**
 * Arbitrary for valid batch metadata
 */
export const batchMetadataArb = fc.record({
  testResults: fc.option(
    fc.record({
      thc: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), {
        nil: undefined,
      }),
      cbd: fc.option(fc.float({ min: 0, max: 100, noNaN: true }), {
        nil: undefined,
      }),
      terpenes: fc.option(fc.array(fc.string(), { maxLength: 10 }), {
        nil: undefined,
      }),
    }),
    { nil: undefined }
  ),
  packaging: fc.option(
    fc.record({
      type: fc.option(fc.constantFrom("jar", "bag", "box"), { nil: undefined }),
      size: fc.option(fc.constantFrom("1g", "3.5g", "7g", "1oz"), {
        nil: undefined,
      }),
    }),
    { nil: undefined }
  ),
  sourcing: fc.option(
    fc.record({
      growMethod: fc.option(
        fc.constantFrom("indoor", "outdoor", "greenhouse"),
        { nil: undefined }
      ),
      organic: fc.option(fc.boolean(), { nil: undefined }),
    }),
    { nil: undefined }
  ),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: undefined }),
  tags: fc.option(fc.array(fc.string({ maxLength: 50 }), { maxLength: 10 }), {
    nil: undefined,
  }),
});

/**
 * Arbitrary for invalid metadata (for testing validation)
 */
export const invalidMetadataArb = fc.oneof(
  fc.constant(null),
  fc.constant(undefined),
  fc.constant("not an object"),
  fc.constant(123),
  fc.constant([1, 2, 3]),
  fc.record({
    testResults: fc.constant("should be object"),
  }),
  fc.record({
    testResults: fc.record({
      thc: fc.constant("should be number"),
    }),
  })
);
