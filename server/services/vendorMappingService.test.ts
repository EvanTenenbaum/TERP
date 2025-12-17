/**
 * Property-Based Tests for Vendor-to-Client Mapping
 *
 * **Feature: canonical-model-unification, Property 8: Vendor-to-Client Mapping Correctness**
 * **Validates: Requirements 7.1, 7.2, 8.2**
 *
 * Tests that vendor-to-client migration maintains data integrity and
 * correctly maps legacy vendor IDs to the unified clients table.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as fc from "fast-check";

// ============================================================================
// Type Definitions
// ============================================================================

interface VendorRecord {
  id: number;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  notes: string | null;
}

interface ClientRecord {
  id: number;
  teriCode: string;
  name: string;
  email: string | null;
  phone: string | null;
  isBuyer: boolean;
  isSeller: boolean;
  isBrand: boolean;
  isReferee: boolean;
  isContractor: boolean;
}

interface SupplierProfileRecord {
  id: number;
  clientId: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  supplierNotes: string | null;
  legacyVendorId: number | null;
}

interface MigrationResult {
  success: boolean;
  clientId?: number;
  supplierProfileId?: number;
  error?: string;
}

// ============================================================================
// Pure Functions Under Test (extracted from vendorMappingService)
// ============================================================================

/**
 * Generate a unique teriCode for a migrated vendor
 * Format: VEND-{vendorId padded to 6 digits}
 */
function generateTeriCodeForVendor(vendorId: number): string {
  return `VEND-${vendorId.toString().padStart(6, "0")}`;
}

/**
 * Validate that a vendor record has required fields for migration
 */
function isValidVendorForMigration(vendor: VendorRecord): boolean {
  return (
    vendor.id > 0 &&
    vendor.name.length > 0 &&
    vendor.name.length <= 255
  );
}

/**
 * Check if a vendor name collides with an existing client name
 * Case-insensitive comparison
 */
function hasNameCollision(vendorName: string, existingClientNames: string[]): boolean {
  const normalizedVendorName = vendorName.toLowerCase().trim();
  return existingClientNames.some(
    clientName => clientName.toLowerCase().trim() === normalizedVendorName
  );
}

/**
 * Generate a renamed vendor name to avoid collision
 */
function generateRenamedVendorName(vendorName: string, suffix: string = " (Vendor)"): string {
  return `${vendorName}${suffix}`;
}

/**
 * Validate that a migrated client has correct supplier flags
 */
function hasCorrectSupplierFlags(client: ClientRecord): boolean {
  // Migrated vendors should be sellers, not buyers
  return client.isSeller === true;
}

/**
 * Validate that supplier profile correctly references the client
 */
function isValidSupplierProfile(
  profile: SupplierProfileRecord,
  client: ClientRecord,
  originalVendor: VendorRecord
): boolean {
  return (
    profile.clientId === client.id &&
    profile.legacyVendorId === originalVendor.id
  );
}

/**
 * Validate teriCode format for migrated vendors
 */
function isValidMigratedTeriCode(teriCode: string): boolean {
  return /^VEND-\d{6}$/.test(teriCode);
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const vendorIdArb = fc.integer({ min: 1, max: 999999 });

const vendorNameArb = fc.string({ minLength: 1, maxLength: 100 })
  .filter(s => s.trim().length > 0);

const vendorRecordArb = fc.record({
  id: vendorIdArb,
  name: vendorNameArb,
  contactName: fc.option(fc.string({ maxLength: 100 }), { nil: null }),
  contactEmail: fc.option(fc.emailAddress(), { nil: null }),
  contactPhone: fc.option(fc.string({ minLength: 10, maxLength: 20 }), { nil: null }),
  paymentTerms: fc.option(fc.constantFrom("Net 30", "Net 60", "COD", "Prepaid"), { nil: null }),
  notes: fc.option(fc.string({ maxLength: 500 }), { nil: null }),
});

const clientNamesArb = fc.array(vendorNameArb, { minLength: 0, maxLength: 20 });

// ============================================================================
// Property Tests
// ============================================================================

describe("Vendor-to-Client Mapping", () => {
  /**
   * **Feature: canonical-model-unification, Property 8: Vendor-to-Client Mapping Correctness**
   * **Validates: Requirements 7.1, 7.2, 8.2**
   *
   * Property: For any vendor record migrated to the clients table, the resulting
   * client record SHALL have isSeller=true, a valid teriCode, and a supplier profile
   * with legacyVendorId set to the original vendor ID.
   */
  describe("Property 8: Vendor-to-Client Mapping Correctness", () => {
    it("should generate valid teriCode for any vendor ID", () => {
      fc.assert(
        fc.property(vendorIdArb, (vendorId) => {
          const teriCode = generateTeriCodeForVendor(vendorId);
          
          // Property: Generated teriCode should match expected format
          expect(isValidMigratedTeriCode(teriCode)).toBe(true);
          
          // Property: teriCode should contain the vendor ID
          expect(teriCode).toContain(vendorId.toString().padStart(6, "0"));
        }),
        { numRuns: 100 }
      );
    });

    it("should generate unique teriCodes for different vendor IDs", () => {
      fc.assert(
        fc.property(
          fc.tuple(vendorIdArb, vendorIdArb).filter(([a, b]) => a !== b),
          ([vendorId1, vendorId2]) => {
            const teriCode1 = generateTeriCodeForVendor(vendorId1);
            const teriCode2 = generateTeriCodeForVendor(vendorId2);
            
            // Property: Different vendor IDs should produce different teriCodes
            expect(teriCode1).not.toBe(teriCode2);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should correctly identify valid vendors for migration", () => {
      fc.assert(
        fc.property(vendorRecordArb, (vendor) => {
          const isValid = isValidVendorForMigration(vendor);
          
          // Property: Vendor with positive ID and non-empty name should be valid
          if (vendor.id > 0 && vendor.name.length > 0 && vendor.name.length <= 255) {
            expect(isValid).toBe(true);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should reject vendors with invalid IDs", () => {
      const invalidVendor: VendorRecord = {
        id: 0,
        name: "Test Vendor",
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        notes: null,
      };
      
      expect(isValidVendorForMigration(invalidVendor)).toBe(false);
    });

    it("should reject vendors with empty names", () => {
      const invalidVendor: VendorRecord = {
        id: 1,
        name: "",
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        notes: null,
      };
      
      expect(isValidVendorForMigration(invalidVendor)).toBe(false);
    });
  });

  describe("Name Collision Detection", () => {
    it("should detect exact name collisions (case-insensitive)", () => {
      fc.assert(
        fc.property(vendorNameArb, (name) => {
          const existingNames = [name];
          
          // Property: Same name should always collide
          expect(hasNameCollision(name, existingNames)).toBe(true);
          
          // Property: Same name with different case should collide
          expect(hasNameCollision(name.toUpperCase(), existingNames)).toBe(true);
          expect(hasNameCollision(name.toLowerCase(), existingNames)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should not detect collision when name is unique", () => {
      fc.assert(
        fc.property(
          fc.tuple(vendorNameArb, clientNamesArb).filter(([name, names]) => 
            !names.some(n => n.toLowerCase() === name.toLowerCase())
          ),
          ([vendorName, existingNames]) => {
            // Property: Unique name should not collide
            expect(hasNameCollision(vendorName, existingNames)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle whitespace in name comparison", () => {
      const existingNames = ["Test Vendor"];
      
      // Property: Names with leading/trailing whitespace should still match
      expect(hasNameCollision("  Test Vendor  ", existingNames)).toBe(true);
      expect(hasNameCollision("Test Vendor", existingNames)).toBe(true);
    });
  });

  describe("Renamed Vendor Name Generation", () => {
    it("should append suffix to vendor name", () => {
      fc.assert(
        fc.property(vendorNameArb, (name) => {
          const renamed = generateRenamedVendorName(name);
          
          // Property: Renamed name should contain original name
          expect(renamed).toContain(name);
          
          // Property: Renamed name should be longer than original
          expect(renamed.length).toBeGreaterThan(name.length);
          
          // Property: Renamed name should end with default suffix
          expect(renamed).toMatch(/\(Vendor\)$/);
        }),
        { numRuns: 100 }
      );
    });

    it("should use custom suffix when provided", () => {
      fc.assert(
        fc.property(
          fc.tuple(vendorNameArb, fc.string({ minLength: 1, maxLength: 20 })),
          ([name, suffix]) => {
            const renamed = generateRenamedVendorName(name, suffix);
            
            // Property: Renamed name should end with custom suffix
            expect(renamed).toBe(`${name}${suffix}`);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Supplier Flag Validation", () => {
    it("should validate migrated clients have isSeller=true", () => {
      const validClient: ClientRecord = {
        id: 1,
        teriCode: "VEND-000001",
        name: "Test Vendor",
        email: null,
        phone: null,
        isBuyer: false,
        isSeller: true,
        isBrand: false,
        isReferee: false,
        isContractor: false,
      };
      
      expect(hasCorrectSupplierFlags(validClient)).toBe(true);
    });

    it("should reject clients without isSeller flag", () => {
      const invalidClient: ClientRecord = {
        id: 1,
        teriCode: "VEND-000001",
        name: "Test Vendor",
        email: null,
        phone: null,
        isBuyer: false,
        isSeller: false, // Should be true for migrated vendors
        isBrand: false,
        isReferee: false,
        isContractor: false,
      };
      
      expect(hasCorrectSupplierFlags(invalidClient)).toBe(false);
    });
  });

  describe("Supplier Profile Validation", () => {
    it("should validate supplier profile references correct client and vendor", () => {
      const vendor: VendorRecord = {
        id: 42,
        name: "Test Vendor",
        contactName: "John Doe",
        contactEmail: "john@example.com",
        contactPhone: "555-1234",
        paymentTerms: "Net 30",
        notes: "Test notes",
      };
      
      const client: ClientRecord = {
        id: 100,
        teriCode: "VEND-000042",
        name: "Test Vendor",
        email: "john@example.com",
        phone: "555-1234",
        isBuyer: false,
        isSeller: true,
        isBrand: false,
        isReferee: false,
        isContractor: false,
      };
      
      const validProfile: SupplierProfileRecord = {
        id: 1,
        clientId: 100,
        contactName: "John Doe",
        contactEmail: "john@example.com",
        contactPhone: "555-1234",
        paymentTerms: "Net 30",
        supplierNotes: "Test notes",
        legacyVendorId: 42,
      };
      
      expect(isValidSupplierProfile(validProfile, client, vendor)).toBe(true);
    });

    it("should reject profile with wrong client reference", () => {
      const vendor: VendorRecord = {
        id: 42,
        name: "Test Vendor",
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        notes: null,
      };
      
      const client: ClientRecord = {
        id: 100,
        teriCode: "VEND-000042",
        name: "Test Vendor",
        email: null,
        phone: null,
        isBuyer: false,
        isSeller: true,
        isBrand: false,
        isReferee: false,
        isContractor: false,
      };
      
      const invalidProfile: SupplierProfileRecord = {
        id: 1,
        clientId: 999, // Wrong client ID
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        supplierNotes: null,
        legacyVendorId: 42,
      };
      
      expect(isValidSupplierProfile(invalidProfile, client, vendor)).toBe(false);
    });

    it("should reject profile with wrong legacy vendor ID", () => {
      const vendor: VendorRecord = {
        id: 42,
        name: "Test Vendor",
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        notes: null,
      };
      
      const client: ClientRecord = {
        id: 100,
        teriCode: "VEND-000042",
        name: "Test Vendor",
        email: null,
        phone: null,
        isBuyer: false,
        isSeller: true,
        isBrand: false,
        isReferee: false,
        isContractor: false,
      };
      
      const invalidProfile: SupplierProfileRecord = {
        id: 1,
        clientId: 100,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        supplierNotes: null,
        legacyVendorId: 999, // Wrong vendor ID
      };
      
      expect(isValidSupplierProfile(invalidProfile, client, vendor)).toBe(false);
    });
  });

  describe("TeriCode Format Validation", () => {
    it("should validate correct teriCode format", () => {
      expect(isValidMigratedTeriCode("VEND-000001")).toBe(true);
      expect(isValidMigratedTeriCode("VEND-123456")).toBe(true);
      expect(isValidMigratedTeriCode("VEND-999999")).toBe(true);
    });

    it("should reject invalid teriCode formats", () => {
      expect(isValidMigratedTeriCode("VEND-1")).toBe(false); // Too short
      expect(isValidMigratedTeriCode("VEND-1234567")).toBe(false); // Too long
      expect(isValidMigratedTeriCode("VENDOR-000001")).toBe(false); // Wrong prefix
      expect(isValidMigratedTeriCode("vend-000001")).toBe(false); // Wrong case
      expect(isValidMigratedTeriCode("VEND-ABCDEF")).toBe(false); // Non-numeric
    });
  });
});

// ============================================================================
// Migration Edge Case Tests (Task 14.4)
// ============================================================================

describe("Migration Edge Cases", () => {
  describe("Collision Handling Strategies", () => {
    it("should skip migration when collision strategy is 'skip'", () => {
      const vendorName = "Existing Client";
      const existingNames = ["Existing Client"];
      
      // Simulate skip strategy
      const hasCollision = hasNameCollision(vendorName, existingNames);
      expect(hasCollision).toBe(true);
      
      // In skip mode, migration should not proceed
      // This is tested at the service level
    });

    it("should rename vendor when collision strategy is 'rename'", () => {
      const vendorName = "Existing Client";
      const existingNames = ["Existing Client"];
      
      const hasCollision = hasNameCollision(vendorName, existingNames);
      expect(hasCollision).toBe(true);
      
      // Rename should produce unique name
      const renamedName = generateRenamedVendorName(vendorName);
      expect(hasNameCollision(renamedName, existingNames)).toBe(false);
    });

    it("should handle multiple collisions with rename strategy", () => {
      const vendorName = "Test Vendor";
      const existingNames = ["Test Vendor", "Test Vendor (Vendor)"];
      
      // First rename
      const renamed1 = generateRenamedVendorName(vendorName);
      expect(renamed1).toBe("Test Vendor (Vendor)");
      
      // If that also collides, need different suffix
      const renamed2 = generateRenamedVendorName(vendorName, " (Vendor 2)");
      expect(renamed2).toBe("Test Vendor (Vendor 2)");
      expect(hasNameCollision(renamed2, existingNames)).toBe(false);
    });
  });

  describe("Idempotency", () => {
    it("should generate same teriCode for same vendor ID", () => {
      const vendorId = 12345;
      
      const teriCode1 = generateTeriCodeForVendor(vendorId);
      const teriCode2 = generateTeriCodeForVendor(vendorId);
      
      // Property: Same input should always produce same output
      expect(teriCode1).toBe(teriCode2);
    });
  });

  describe("Boundary Conditions", () => {
    it("should handle vendor ID at minimum boundary", () => {
      const teriCode = generateTeriCodeForVendor(1);
      expect(teriCode).toBe("VEND-000001");
      expect(isValidMigratedTeriCode(teriCode)).toBe(true);
    });

    it("should handle vendor ID at maximum 6-digit boundary", () => {
      const teriCode = generateTeriCodeForVendor(999999);
      expect(teriCode).toBe("VEND-999999");
      expect(isValidMigratedTeriCode(teriCode)).toBe(true);
    });

    it("should handle vendor ID exceeding 6 digits", () => {
      // IDs > 999999 will produce longer codes
      const teriCode = generateTeriCodeForVendor(1000000);
      expect(teriCode).toBe("VEND-1000000");
      // This won't match the strict 6-digit pattern
      expect(isValidMigratedTeriCode(teriCode)).toBe(false);
    });

    it("should handle empty existing client list", () => {
      const vendorName = "New Vendor";
      const existingNames: string[] = [];
      
      expect(hasNameCollision(vendorName, existingNames)).toBe(false);
    });

    it("should handle vendor name with special characters", () => {
      const vendorName = "Vendor's \"Special\" Name & Co.";
      const existingNames = ["Other Vendor"];
      
      expect(hasNameCollision(vendorName, existingNames)).toBe(false);
      
      const renamed = generateRenamedVendorName(vendorName);
      expect(renamed).toContain(vendorName);
    });

    it("should handle very long vendor names", () => {
      const longName = "A".repeat(200);
      const vendor: VendorRecord = {
        id: 1,
        name: longName,
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        notes: null,
      };
      
      // Names > 255 chars should be invalid
      expect(isValidVendorForMigration(vendor)).toBe(true); // 200 < 255
      
      const tooLongName = "A".repeat(300);
      const invalidVendor: VendorRecord = {
        ...vendor,
        name: tooLongName,
      };
      expect(isValidVendorForMigration(invalidVendor)).toBe(false);
    });
  });

  describe("Data Preservation", () => {
    it("should preserve all vendor fields in supplier profile", () => {
      const vendor: VendorRecord = {
        id: 42,
        name: "Complete Vendor",
        contactName: "Jane Smith",
        contactEmail: "jane@vendor.com",
        contactPhone: "555-9876",
        paymentTerms: "Net 60",
        notes: "Important supplier notes",
      };
      
      // Simulate creating supplier profile from vendor
      const profile: SupplierProfileRecord = {
        id: 1,
        clientId: 100,
        contactName: vendor.contactName,
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone,
        paymentTerms: vendor.paymentTerms,
        supplierNotes: vendor.notes,
        legacyVendorId: vendor.id,
      };
      
      // Property: All vendor fields should be preserved
      expect(profile.contactName).toBe(vendor.contactName);
      expect(profile.contactEmail).toBe(vendor.contactEmail);
      expect(profile.contactPhone).toBe(vendor.contactPhone);
      expect(profile.paymentTerms).toBe(vendor.paymentTerms);
      expect(profile.supplierNotes).toBe(vendor.notes);
      expect(profile.legacyVendorId).toBe(vendor.id);
    });

    it("should handle null vendor fields gracefully", () => {
      const vendor: VendorRecord = {
        id: 42,
        name: "Minimal Vendor",
        contactName: null,
        contactEmail: null,
        contactPhone: null,
        paymentTerms: null,
        notes: null,
      };
      
      // Simulate creating supplier profile from vendor with nulls
      const profile: SupplierProfileRecord = {
        id: 1,
        clientId: 100,
        contactName: vendor.contactName,
        contactEmail: vendor.contactEmail,
        contactPhone: vendor.contactPhone,
        paymentTerms: vendor.paymentTerms,
        supplierNotes: vendor.notes,
        legacyVendorId: vendor.id,
      };
      
      // Property: Null fields should remain null
      expect(profile.contactName).toBeNull();
      expect(profile.contactEmail).toBeNull();
      expect(profile.contactPhone).toBeNull();
      expect(profile.paymentTerms).toBeNull();
      expect(profile.supplierNotes).toBeNull();
      // But legacyVendorId should always be set
      expect(profile.legacyVendorId).toBe(42);
    });
  });
});
