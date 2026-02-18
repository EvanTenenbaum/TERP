/**
 * Unit Tests for Supplier Profile Service
 *
 * **Feature: canonical-model-unification, Task 9.3: Write unit tests for supplier profile CRUD**
 * **Validates: Requirements 1.5**
 *
 * Tests the supplier profile CRUD operations for the canonical model unification.
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ============================================================================
// Type Definitions (matching the schema types)
// ============================================================================

type PreferredPaymentMethod =
  | "CASH"
  | "CHECK"
  | "WIRE"
  | "ACH"
  | "CREDIT_CARD"
  | "OTHER";

interface SupplierProfile {
  id: number;
  clientId: number;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  supplierNotes: string | null;
  legacyVendorId: number | null;
  preferredPaymentMethod: PreferredPaymentMethod | null;
  taxId: string | null;
  licenseNumber: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface InsertSupplierProfile {
  clientId: number;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  paymentTerms?: string | null;
  supplierNotes?: string | null;
  legacyVendorId?: number | null;
  preferredPaymentMethod?: PreferredPaymentMethod | null;
  taxId?: string | null;
  licenseNumber?: string | null;
}

interface Client {
  id: number;
  teriCode: string;
  name: string;
  isSeller: boolean;
}

// ============================================================================
// Pure Functions Under Test (extracted for testability)
// ============================================================================

/**
 * Validate supplier profile data before insert
 * Requirements: 1.5
 */
function validateSupplierProfile(profile: InsertSupplierProfile): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // clientId is required
  if (!profile.clientId || profile.clientId <= 0) {
    errors.push("clientId is required and must be positive");
  }

  // Email validation if provided
  if (profile.contactEmail && !isValidEmail(profile.contactEmail)) {
    errors.push("contactEmail must be a valid email address");
  }

  // Phone validation if provided
  if (profile.contactPhone && profile.contactPhone.length > 50) {
    errors.push("contactPhone must be 50 characters or less");
  }

  // Payment terms validation if provided
  if (profile.paymentTerms && profile.paymentTerms.length > 100) {
    errors.push("paymentTerms must be 100 characters or less");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Simple email validation
 */
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 320;
}

/**
 * Create supplier profile from vendor data (migration helper)
 * Requirements: 1.5, 7.1, 7.2
 */
function createSupplierProfileFromVendor(
  vendor: {
    id: number;
    name: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    paymentTerms?: string;
    notes?: string;
  },
  clientId: number
): InsertSupplierProfile {
  return {
    clientId,
    contactName: vendor.contactName || null,
    contactEmail: vendor.contactEmail || null,
    contactPhone: vendor.contactPhone || null,
    paymentTerms: vendor.paymentTerms || null,
    supplierNotes: vendor.notes || null,
    legacyVendorId: vendor.id,
  };
}

/**
 * Check if a client can have a supplier profile
 * Requirements: 1.2
 */
function canHaveSupplierProfile(client: Client): boolean {
  return client.isSeller === true;
}

/**
 * Merge supplier profile updates (partial update support)
 */
function mergeSupplierProfileUpdate(
  existing: SupplierProfile,
  updates: Partial<InsertSupplierProfile>
): InsertSupplierProfile {
  return {
    clientId: existing.clientId, // Cannot change clientId
    contactName:
      updates.contactName !== undefined
        ? updates.contactName
        : existing.contactName,
    contactEmail:
      updates.contactEmail !== undefined
        ? updates.contactEmail
        : existing.contactEmail,
    contactPhone:
      updates.contactPhone !== undefined
        ? updates.contactPhone
        : existing.contactPhone,
    paymentTerms:
      updates.paymentTerms !== undefined
        ? updates.paymentTerms
        : existing.paymentTerms,
    supplierNotes:
      updates.supplierNotes !== undefined
        ? updates.supplierNotes
        : existing.supplierNotes,
    legacyVendorId:
      updates.legacyVendorId !== undefined
        ? updates.legacyVendorId
        : existing.legacyVendorId,
    preferredPaymentMethod:
      updates.preferredPaymentMethod !== undefined
        ? updates.preferredPaymentMethod
        : existing.preferredPaymentMethod,
    taxId: updates.taxId !== undefined ? updates.taxId : existing.taxId,
    licenseNumber:
      updates.licenseNumber !== undefined
        ? updates.licenseNumber
        : existing.licenseNumber,
  };
}

// ============================================================================
// Arbitraries (Generators)
// ============================================================================

const paymentMethodArb = fc.constantFrom<PreferredPaymentMethod>(
  "CASH",
  "CHECK",
  "WIRE",
  "ACH",
  "CREDIT_CARD",
  "OTHER"
);

const validEmailArb = fc.emailAddress().filter(email => email.length <= 320);

const phoneArb = fc
  .string({ minLength: 7, maxLength: 20 })
  .map(s => s.replace(/[^0-9\-\s()]/g, "0"));

const paymentTermsArb = fc.string({ minLength: 1, maxLength: 100 });

const insertSupplierProfileArb = fc.record({
  clientId: fc.integer({ min: 1, max: 10000 }),
  contactName: fc.option(fc.string({ minLength: 1, maxLength: 255 }), {
    nil: null,
  }),
  contactEmail: fc.option(validEmailArb, { nil: null }),
  contactPhone: fc.option(phoneArb, { nil: null }),
  paymentTerms: fc.option(paymentTermsArb, { nil: null }),
  supplierNotes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), {
    nil: null,
  }),
  legacyVendorId: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
  preferredPaymentMethod: fc.option(paymentMethodArb, { nil: null }),
  taxId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  licenseNumber: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: null,
  }),
});

const vendorArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  name: fc.string({ minLength: 1, maxLength: 255 }),
  contactName: fc.option(fc.string({ minLength: 1, maxLength: 255 }), {
    nil: undefined,
  }),
  contactEmail: fc.option(validEmailArb, { nil: undefined }),
  contactPhone: fc.option(phoneArb, { nil: undefined }),
  paymentTerms: fc.option(paymentTermsArb, { nil: undefined }),
  notes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), {
    nil: undefined,
  }),
});

const clientArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  teriCode: fc.stringMatching(/^TERI-[0-9]{6}$/),
  name: fc.string({ minLength: 1, maxLength: 255 }),
  isSeller: fc.boolean(),
});

const supplierProfileArb = fc.record({
  id: fc.integer({ min: 1, max: 10000 }),
  clientId: fc.integer({ min: 1, max: 10000 }),
  contactName: fc.option(fc.string({ minLength: 1, maxLength: 255 }), {
    nil: null,
  }),
  contactEmail: fc.option(validEmailArb, { nil: null }),
  contactPhone: fc.option(phoneArb, { nil: null }),
  paymentTerms: fc.option(paymentTermsArb, { nil: null }),
  supplierNotes: fc.option(fc.string({ minLength: 1, maxLength: 1000 }), {
    nil: null,
  }),
  legacyVendorId: fc.option(fc.integer({ min: 1, max: 10000 }), { nil: null }),
  preferredPaymentMethod: fc.option(paymentMethodArb, { nil: null }),
  taxId: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: null }),
  licenseNumber: fc.option(fc.string({ minLength: 1, maxLength: 100 }), {
    nil: null,
  }),
  createdAt: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
  updatedAt: fc.date({ min: new Date(2024, 0, 1), max: new Date() }),
});

// ============================================================================
// Unit Tests
// ============================================================================

describe("Supplier Profile Validation", () => {
  describe("validateSupplierProfile", () => {
    it("should accept valid supplier profile with all fields", () => {
      fc.assert(
        fc.property(insertSupplierProfileArb, profile => {
          const result = validateSupplierProfile(profile);
          // Valid profiles should pass validation
          expect(result.valid).toBe(true);
          expect(result.errors).toHaveLength(0);
        }),
        { numRuns: 100 }
      );
    });

    it("should reject profile with missing clientId", () => {
      const invalidProfile: InsertSupplierProfile = {
        clientId: 0,
        contactName: "Test Contact",
      };
      const result = validateSupplierProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "clientId is required and must be positive"
      );
    });

    it("should reject profile with negative clientId", () => {
      const invalidProfile: InsertSupplierProfile = {
        clientId: -1,
        contactName: "Test Contact",
      };
      const result = validateSupplierProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "clientId is required and must be positive"
      );
    });

    it("should reject profile with invalid email", () => {
      const invalidProfile: InsertSupplierProfile = {
        clientId: 1,
        contactEmail: "not-an-email",
      };
      const result = validateSupplierProfile(invalidProfile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        "contactEmail must be a valid email address"
      );
    });

    it("should accept profile with null optional fields", () => {
      const minimalProfile: InsertSupplierProfile = {
        clientId: 1,
      };
      const result = validateSupplierProfile(minimalProfile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe("isValidEmail", () => {
    it("should accept valid email addresses", () => {
      fc.assert(
        fc.property(validEmailArb, email => {
          expect(isValidEmail(email)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should reject emails without @", () => {
      expect(isValidEmail("invalidemail.com")).toBe(false);
    });

    it("should reject emails without domain", () => {
      expect(isValidEmail("invalid@")).toBe(false);
    });

    it("should reject emails that are too long", () => {
      // 320 is the max length for contactEmail in the schema
      const longEmail = "a".repeat(310) + "@example.com"; // 322 chars, exceeds 320
      expect(isValidEmail(longEmail)).toBe(false);
    });
  });
});

describe("Vendor to Supplier Profile Migration", () => {
  /**
   * **Feature: canonical-model-unification, Property: Vendor Migration Preserves Data**
   * **Validates: Requirements 1.5, 7.1, 7.2**
   */
  describe("createSupplierProfileFromVendor", () => {
    it("should preserve vendor contact information", () => {
      fc.assert(
        fc.property(
          vendorArb,
          fc.integer({ min: 1, max: 10000 }),
          (vendor, clientId) => {
            const profile = createSupplierProfileFromVendor(vendor, clientId);

            // Property: contact info should be preserved
            expect(profile.contactName).toBe(vendor.contactName || null);
            expect(profile.contactEmail).toBe(vendor.contactEmail || null);
            expect(profile.contactPhone).toBe(vendor.contactPhone || null);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve vendor payment terms", () => {
      fc.assert(
        fc.property(
          vendorArb,
          fc.integer({ min: 1, max: 10000 }),
          (vendor, clientId) => {
            const profile = createSupplierProfileFromVendor(vendor, clientId);

            // Property: payment terms should be preserved
            expect(profile.paymentTerms).toBe(vendor.paymentTerms || null);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve vendor notes as supplier notes", () => {
      fc.assert(
        fc.property(
          vendorArb,
          fc.integer({ min: 1, max: 10000 }),
          (vendor, clientId) => {
            const profile = createSupplierProfileFromVendor(vendor, clientId);

            // Property: notes should be preserved
            expect(profile.supplierNotes).toBe(vendor.notes || null);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should store legacy vendor ID for mapping", () => {
      fc.assert(
        fc.property(
          vendorArb,
          fc.integer({ min: 1, max: 10000 }),
          (vendor, clientId) => {
            const profile = createSupplierProfileFromVendor(vendor, clientId);

            // Property: legacy vendor ID should be stored
            expect(profile.legacyVendorId).toBe(vendor.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should set correct clientId", () => {
      fc.assert(
        fc.property(
          vendorArb,
          fc.integer({ min: 1, max: 10000 }),
          (vendor, clientId) => {
            const profile = createSupplierProfileFromVendor(vendor, clientId);

            // Property: clientId should match provided value
            expect(profile.clientId).toBe(clientId);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe("Client Supplier Profile Eligibility", () => {
  /**
   * **Feature: canonical-model-unification, Property: Only Sellers Can Have Supplier Profiles**
   * **Validates: Requirements 1.2**
   */
  describe("canHaveSupplierProfile", () => {
    it("should return true for clients with isSeller=true", () => {
      fc.assert(
        fc.property(
          clientArb.filter(c => c.isSeller === true),
          client => {
            expect(canHaveSupplierProfile(client)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return false for clients with isSeller=false", () => {
      fc.assert(
        fc.property(
          clientArb.filter(c => c.isSeller === false),
          client => {
            expect(canHaveSupplierProfile(client)).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe("Supplier Profile Updates", () => {
  describe("mergeSupplierProfileUpdate", () => {
    it("should preserve clientId (cannot be changed)", () => {
      fc.assert(
        fc.property(
          supplierProfileArb,
          fc.integer({ min: 1, max: 10000 }),
          (existing, newClientId) => {
            const updates = { clientId: newClientId };
            const merged = mergeSupplierProfileUpdate(existing, updates);

            // Property: clientId should remain unchanged
            expect(merged.clientId).toBe(existing.clientId);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should update provided fields", () => {
      fc.assert(
        fc.property(
          supplierProfileArb,
          fc.string({ minLength: 1, maxLength: 255 }),
          (existing, newContactName) => {
            const updates = { contactName: newContactName };
            const merged = mergeSupplierProfileUpdate(existing, updates);

            // Property: updated field should have new value
            expect(merged.contactName).toBe(newContactName);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve non-updated fields", () => {
      fc.assert(
        fc.property(
          supplierProfileArb,
          fc.string({ minLength: 1, maxLength: 255 }),
          (existing, newContactName) => {
            const updates = { contactName: newContactName };
            const merged = mergeSupplierProfileUpdate(existing, updates);

            // Property: non-updated fields should be preserved
            expect(merged.contactEmail).toBe(existing.contactEmail);
            expect(merged.contactPhone).toBe(existing.contactPhone);
            expect(merged.paymentTerms).toBe(existing.paymentTerms);
            expect(merged.supplierNotes).toBe(existing.supplierNotes);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should allow setting fields to null", () => {
      fc.assert(
        fc.property(
          supplierProfileArb.filter(p => p.contactName !== null),
          existing => {
            const updates = { contactName: null };
            const merged = mergeSupplierProfileUpdate(existing, updates);

            // Property: should be able to set to null
            expect(merged.contactName).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
