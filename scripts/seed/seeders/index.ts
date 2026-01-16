/**
 * Seeder Interface and Types
 *
 * Defines the contract for individual table seeders.
 * Each seeder must implement the Seeder interface.
 */

import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";

// ============================================================================
// Type Definitions
// ============================================================================

/**
 * Result of a seeding operation
 */
export interface SeederResult {
  table: string;
  inserted: number;
  skipped: number;
  errors: string[];
  duration: number;
}

/**
 * Seeder interface - all seeders must implement this
 */
export interface Seeder {
  /**
   * Seed the table with the specified number of records
   *
   * @param count - Number of records to seed
   * @param validator - Schema validator instance
   * @param masker - PII masker instance
   * @returns SeederResult with statistics
   */
  seed(
    count: number,
    validator: SchemaValidator,
    masker: PIIMasker
  ): Promise<SeederResult>;
}

/**
 * Seeder function type for simpler seeders
 */
export type SeederFunction = (
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
) => Promise<SeederResult>;

/**
 * Seeding order - tables must be seeded in this order to respect FK constraints
 * Requirements: 10.2
 * BUG-084: pricing_defaults must be seeded early (before orders)
 */
export const SEEDING_ORDER = [
  "pricing_defaults",     // No dependencies - BUG-084: Required for order pricing
  "vendors",              // No dependencies
  "clients",              // No dependencies
  "products",             // Depends on vendors (via brands)
  "purchaseOrders",       // Depends on vendors, products (Requirements: 7.1)
  "batches",              // Depends on products, vendors
  "orders",               // Depends on clients, batches, pricing_defaults
  "client_transactions",  // Depends on clients, orders (Requirements: 6.1, 9.1)
  "invoices",             // Depends on clients, orders
  "payments",             // Depends on invoices, clients
  "bills",                // Depends on vendors, lots (Requirements: 6.1)
] as const;

export type SeedableTable = (typeof SEEDING_ORDER)[number];

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a SeederResult with default values
 */
export function createSeederResult(
  table: string,
  overrides: Partial<SeederResult> = {}
): SeederResult {
  return {
    table,
    inserted: 0,
    skipped: 0,
    errors: [],
    duration: 0,
    ...overrides,
  };
}

/**
 * Merge multiple SeederResults
 */
export function mergeSeederResults(results: SeederResult[]): SeederResult {
  return results.reduce(
    (acc, result) => ({
      table: "all",
      inserted: acc.inserted + result.inserted,
      skipped: acc.skipped + result.skipped,
      errors: [...acc.errors, ...result.errors],
      duration: acc.duration + result.duration,
    }),
    createSeederResult("all")
  );
}

// ============================================================================
// Exports - Import seeders directly (no auto-registration to avoid circular deps)
// ============================================================================

export { seedPricingDefaults } from "./seed-pricing-defaults";
export { seedClients } from "./seed-clients";
export { seedVendors } from "./seed-vendors";
export { seedProducts } from "./seed-products";
export { seedBatches } from "./seed-batches";
export { seedOrders } from "./seed-orders";
export { seedClientTransactions } from "./seed-client-transactions";
export { seedInvoices } from "./seed-invoices";
export { seedPayments } from "./seed-payments";
export { seedVendorBills } from "./seed-vendor-bills";
export { seedPurchaseOrders } from "./seed-purchase-orders";
