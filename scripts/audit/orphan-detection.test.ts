/**
 * Property-Based Tests for Orphan Record Detection
 *
 * **Feature: canonical-model-unification, Property 9: Orphan Record Detection**
 * **Validates: Requirements 9.1, 9.2**
 *
 * Tests that orphan detection correctly identifies records with FK-like
 * columns that reference non-existent records.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================================
// Type Definitions
// ============================================================================

interface DataRecord {
  id: number;
  [key: string]: unknown;
}

interface FKColumn {
  table: string;
  column: string;
  referencedTable: string;
  referencedColumn: string;
}

interface OrphanResult {
  table: string;
  column: string;
  orphanValue: number;
  count: number;
  referencedTable: string;
}

// ============================================================================
// Pure Functions Under Test
// ============================================================================

/**
 * Detect orphaned records in a dataset
 * An orphan is a record where the FK column value doesn't exist in the referenced table
 */
function detectOrphans(
  records: DataRecord[],
  fkColumn: string,
  referencedRecords: DataRecord[]
): OrphanResult[] {
  const validIds = new Set(referencedRecords.map((r) => r.id));
  const orphanCounts = new Map<number, number>();

  for (const record of records) {
    const fkValue = record[fkColumn];
    if (fkValue !== null && fkValue !== undefined && typeof fkValue === "number") {
      if (!validIds.has(fkValue)) {
        orphanCounts.set(fkValue, (orphanCounts.get(fkValue) || 0) + 1);
      }
    }
  }

  return Array.from(orphanCounts.entries()).map(([value, count]) => ({
    table: "test_table",
    column: fkColumn,
    orphanValue: value,
    count,
    referencedTable: "referenced_table",
  }));
}

/**
 * Check if a column name suggests it should have a FK reference
 */
function isFKLikeColumn(columnName: string): boolean {
  const fkPatterns = [
    /Id$/,           // Ends with Id (customerId, vendorId, etc.)
    /_id$/,          // Ends with _id (client_id, etc.)
    /^created[Bb]y$/, // createdBy
    /^updated[Bb]y$/, // updatedBy
    /^recorded[Bb]y$/, // recordedBy
    /^changed[Bb]y$/, // changedBy
    /^actor[Ii]d$/,  // actorId
  ];

  return fkPatterns.some((pattern) => pattern.test(columnName));
}

/**
 * Validate that all FK values exist in referenced table
 */
function validateFKIntegrity(
  records: DataRecord[],
  fkColumn: string,
  referencedRecords: DataRecord[]
): { valid: boolean; orphanCount: number } {
  const orphans = detectOrphans(records, fkColumn, referencedRecords);
  const orphanCount = orphans.reduce((sum, o) => sum + o.count, 0);

  return {
    valid: orphanCount === 0,
    orphanCount,
  };
}

/**
 * Get the expected referenced table for a column name
 */
function getExpectedReferencedTable(columnName: string): string | null {
  // User reference columns
  if (/^(created|updated|recorded|changed)[Bb]y$/.test(columnName)) {
    return "users";
  }
  if (/^actor[Ii]d$/.test(columnName)) {
    return "users";
  }

  // Client/Customer reference columns
  if (/^customer[Ii]d$/.test(columnName) || /^client[Ii]d$/.test(columnName)) {
    return "clients";
  }

  // Vendor reference columns
  if (/^vendor[Ii]d$/.test(columnName)) {
    return "vendors"; // or clients after migration
  }

  // Specific table references
  const tableMap: Record<string, string> = {
    invoiceId: "invoices",
    billId: "bills",
    productId: "products",
    batchId: "batches",
    bankAccountId: "bank_accounts",
    orderId: "orders",
    lotId: "lots",
  };

  return tableMap[columnName] || null;
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const recordIdArb = fc.integer({ min: 1, max: 10000 });

const recordArb = fc.record({
  id: recordIdArb,
});

const recordWithFKArb = (fkColumn: string, validIds: number[]) =>
  fc.record({
    id: recordIdArb,
    [fkColumn]: fc.oneof(
      fc.constantFrom(...validIds), // Valid FK
      fc.integer({ min: 10001, max: 20000 }) // Potentially orphan FK
    ),
  });

const fkColumnNameArb = fc.constantFrom(
  "customerId",
  "clientId",
  "vendorId",
  "createdBy",
  "updatedBy",
  "invoiceId",
  "productId",
  "batchId"
);

const nonFKColumnNameArb = fc.constantFrom(
  "name",
  "description",
  "amount",
  "quantity",
  "status",
  "notes"
);

// ============================================================================
// Property Tests
// ============================================================================

describe("Orphan Record Detection", () => {
  /**
   * **Feature: canonical-model-unification, Property 9: Orphan Record Detection**
   * **Validates: Requirements 9.1, 9.2**
   *
   * Property: For any FK-like column, the detection system SHALL correctly
   * identify all records where the FK value does not exist in the referenced table.
   */
  describe("Property 9: Orphan Record Detection", () => {
    it("should detect no orphans when all FKs are valid", () => {
      fc.assert(
        fc.property(
          fc.array(recordArb, { minLength: 1, maxLength: 100 }),
          (referencedRecords) => {
            const validIds = referencedRecords.map((r) => r.id);
            
            // Create records that only reference valid IDs
            const records = validIds.slice(0, 10).map((id, idx) => ({
              id: idx + 1,
              customerId: id,
            }));

            const orphans = detectOrphans(records, "customerId", referencedRecords);

            // Property: No orphans when all FKs reference valid records
            expect(orphans).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should detect orphans when FK references non-existent record", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.array(recordArb, { minLength: 1, maxLength: 50 }),
            fc.integer({ min: 100000, max: 200000 }) // ID that won't exist
          ),
          ([referencedRecords, orphanId]) => {
            // Create a record with an orphan FK
            const records = [{ id: 1, customerId: orphanId }];

            const orphans = detectOrphans(records, "customerId", referencedRecords);

            // Property: Should detect the orphan
            expect(orphans.length).toBeGreaterThan(0);
            expect(orphans[0].orphanValue).toBe(orphanId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should count multiple orphans with same FK value", () => {
      const referencedRecords = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const orphanId = 999;
      
      // Multiple records referencing the same non-existent ID
      const records = [
        { id: 1, customerId: orphanId },
        { id: 2, customerId: orphanId },
        { id: 3, customerId: orphanId },
        { id: 4, customerId: 1 }, // Valid
      ];

      const orphans = detectOrphans(records, "customerId", referencedRecords);

      // Property: Should count all orphans with same value
      expect(orphans).toHaveLength(1);
      expect(orphans[0].orphanValue).toBe(orphanId);
      expect(orphans[0].count).toBe(3);
    });

    it("should handle null FK values gracefully", () => {
      const referencedRecords = [{ id: 1 }, { id: 2 }];
      const records = [
        { id: 1, customerId: null },
        { id: 2, customerId: undefined },
        { id: 3, customerId: 1 }, // Valid
      ];

      const orphans = detectOrphans(records, "customerId", referencedRecords);

      // Property: Null/undefined FKs should not be counted as orphans
      expect(orphans).toHaveLength(0);
    });

    it("should validate FK integrity correctly", () => {
      fc.assert(
        fc.property(
          fc.array(recordArb, { minLength: 1, maxLength: 50 }),
          (referencedRecords) => {
            const validIds = referencedRecords.map((r) => r.id);
            
            // Mix of valid and invalid FKs
            const records = [
              { id: 1, customerId: validIds[0] || 1 },
              { id: 2, customerId: 999999 }, // Orphan
            ];

            const result = validateFKIntegrity(records, "customerId", referencedRecords);

            // Property: Should detect integrity violation
            if (validIds.includes(999999)) {
              expect(result.valid).toBe(true);
            } else {
              expect(result.valid).toBe(false);
              expect(result.orphanCount).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("FK Column Detection", () => {
    it("should identify FK-like column names", () => {
      fc.assert(
        fc.property(fkColumnNameArb, (columnName) => {
          // Property: FK-like columns should be identified
          expect(isFKLikeColumn(columnName)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should not identify non-FK column names", () => {
      fc.assert(
        fc.property(nonFKColumnNameArb, (columnName) => {
          // Property: Non-FK columns should not be identified
          expect(isFKLikeColumn(columnName)).toBe(false);
        }),
        { numRuns: 100 }
      );
    });
  });

  describe("Referenced Table Detection", () => {
    it("should map customerId to clients", () => {
      expect(getExpectedReferencedTable("customerId")).toBe("clients");
    });

    it("should map createdBy to users", () => {
      expect(getExpectedReferencedTable("createdBy")).toBe("users");
    });

    it("should map vendorId to vendors", () => {
      expect(getExpectedReferencedTable("vendorId")).toBe("vendors");
    });

    it("should map invoiceId to invoices", () => {
      expect(getExpectedReferencedTable("invoiceId")).toBe("invoices");
    });

    it("should return null for unknown columns", () => {
      expect(getExpectedReferencedTable("randomColumn")).toBeNull();
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty record sets", () => {
      const orphans = detectOrphans([], "customerId", []);
      expect(orphans).toHaveLength(0);
    });

    it("should handle empty referenced table", () => {
      const records = [{ id: 1, customerId: 1 }];
      const orphans = detectOrphans(records, "customerId", []);

      // Property: All records are orphans when referenced table is empty
      expect(orphans).toHaveLength(1);
      expect(orphans[0].count).toBe(1);
    });

    it("should handle records without the FK column", () => {
      const records = [{ id: 1, name: "Test" }];
      const referencedRecords = [{ id: 1 }];

      const orphans = detectOrphans(records, "customerId", referencedRecords);

      // Property: Records without FK column should not be counted
      expect(orphans).toHaveLength(0);
    });

    it("should handle multiple distinct orphan values", () => {
      const referencedRecords = [{ id: 1 }];
      const records = [
        { id: 1, customerId: 100 },
        { id: 2, customerId: 200 },
        { id: 3, customerId: 300 },
      ];

      const orphans = detectOrphans(records, "customerId", referencedRecords);

      // Property: Should detect all distinct orphan values
      expect(orphans).toHaveLength(3);
      expect(orphans.map((o) => o.orphanValue).sort()).toEqual([100, 200, 300]);
    });
  });
});
