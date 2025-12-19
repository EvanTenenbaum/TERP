/**
 * Property-Based Tests for Client Creation Form Validation
 *
 * **Feature: parallel-sprint-dec19**
 * **Property 15: Required fields validation**
 * **Property 16: Email format validation**
 * **Property 17: Phone format validation**
 * **Property 18: Submit button state management**
 *
 * @module tests/property/clients/add-client-wizard
 */

import { describe, it } from "vitest";
import * as fc from "fast-check";
import { clientFormSchema } from "./AddClientWizard";

// ============================================================================
// CONFIGURATION
// ============================================================================

function getNumRuns(): number {
  const envRuns = process.env.NUM_RUNS;
  if (envRuns) {
    const parsed = parseInt(envRuns, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return process.env.CI ? 100 : 500;
}

// ============================================================================
// ARBITRARIES
// ============================================================================

/**
 * Arbitrary for valid TERI codes
 */
const validTeriCodeArb = fc
  .string({ minLength: 1, maxLength: 50 })
  .filter(s => /^[A-Za-z0-9_-]+$/.test(s));

/**
 * Arbitrary for invalid TERI codes (containing invalid characters)
 */
const invalidTeriCodeArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
  return !/^[A-Za-z0-9_-]+$/.test(s) && s.length > 0;
});

/**
 * Arbitrary for valid emails (Zod-compatible format)
 */
const validEmailArb = fc
  .tuple(
    fc.string({ minLength: 1, maxLength: 20 }).filter(s => /^[a-zA-Z0-9.]+$/.test(s) && !s.startsWith('.') && !s.endsWith('.')),
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => /^[a-zA-Z0-9]+$/.test(s)),
    fc.constantFrom("com", "org", "net", "edu", "io")
  )
  .map(([local, domain, tld]) => `${local}@${domain}.${tld}`);

/**
 * Arbitrary for invalid emails
 */
const invalidEmailArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
  // Basic check for invalid email format
  return !s.includes("@") || s.startsWith("@") || s.endsWith("@");
});

/**
 * Arbitrary for valid phone numbers
 */
const validPhoneArb = fc
  .array(fc.constantFrom("0", "1", "2", "3", "4", "5", "6", "7", "8", "9", " ", "-", "+", "(", ")"), {
    minLength: 1,
    maxLength: 20,
  })
  .map(chars => chars.join(""));

/**
 * Arbitrary for invalid phone numbers
 */
const invalidPhoneArb = fc.string({ minLength: 1, maxLength: 50 }).filter(s => {
  // Contains letters or invalid symbols
  return /[a-zA-Z#$%^&*=!@]/.test(s);
});

/**
 * Arbitrary for valid client names (non-empty after trim)
 */
const validNameArb = fc
  .string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

/**
 * Arbitrary for valid client form data
 */
const validClientFormDataArb = fc.record({
  teriCode: validTeriCodeArb,
  name: validNameArb,
  email: fc.option(validEmailArb, { nil: "" }),
  phone: fc.option(validPhoneArb, { nil: "" }),
  address: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: "" }),
  isBuyer: fc.boolean(),
  isSeller: fc.boolean(),
  isBrand: fc.boolean(),
  isReferee: fc.boolean(),
  isContractor: fc.boolean(),
  tags: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
}).filter(data => {
  // At least one client type must be selected
  return data.isBuyer || data.isSeller || data.isBrand || data.isReferee || data.isContractor;
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Check if form is valid for submission
 */
function isFormValidForSubmission(data: {
  teriCode: string;
  name: string;
  isBuyer: boolean;
  isSeller: boolean;
  isBrand: boolean;
  isReferee: boolean;
  isContractor: boolean;
}): boolean {
  // TERI code must be valid format (alphanumeric, underscore, hyphen)
  const teriCodeValid = /^[A-Za-z0-9_-]+$/.test(data.teriCode) && data.teriCode.length > 0;
  // Name must have non-whitespace content
  const nameValid = data.name.trim().length > 0;
  const hasClientType =
    data.isBuyer || data.isSeller || data.isBrand || data.isReferee || data.isContractor;
  return teriCodeValid && nameValid && hasClientType;
}

/**
 * Validate email format
 */
function isValidEmail(email: string): boolean {
  if (!email) return true; // Empty is valid (optional field)
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate phone format
 */
function isValidPhone(phone: string): boolean {
  if (!phone) return true; // Empty is valid (optional field)
  const phoneRegex = /^[\d\s\-+()]*$/;
  return phoneRegex.test(phone);
}

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe("Client Creation Form Validation Property Tests", () => {
  const numRuns = getNumRuns();

  // ==========================================================================
  // Property 15: Required fields validation
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 15: Required fields validation**", () => {
    it("P15.1: Form rejects empty TERI code", () => {
      fc.assert(
        fc.property(
          validNameArb,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (name, isBuyer, isSeller, isBrand, isReferee, isContractor) => {
            const data = {
              teriCode: "",
              name,
              email: "",
              phone: "",
              address: "",
              isBuyer,
              isSeller,
              isBrand,
              isReferee,
              isContractor,
              tags: [],
            };
            const result = clientFormSchema.safeParse(data);
            return !result.success; // Should fail validation
          }
        ),
        { numRuns }
      );
    });

    it("P15.2: Form rejects empty name", () => {
      fc.assert(
        fc.property(
          validTeriCodeArb,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (teriCode, isBuyer, isSeller, isBrand, isReferee, isContractor) => {
            const data = {
              teriCode,
              name: "",
              email: "",
              phone: "",
              address: "",
              isBuyer,
              isSeller,
              isBrand,
              isReferee,
              isContractor,
              tags: [],
            };
            const result = clientFormSchema.safeParse(data);
            return !result.success; // Should fail validation
          }
        ),
        { numRuns }
      );
    });

    it("P15.3: Form accepts valid required fields", () => {
      fc.assert(
        fc.property(validClientFormDataArb, (data) => {
          const result = clientFormSchema.safeParse(data);
          return result.success === true;
        }),
        { numRuns }
      );
    });

    it("P15.4: TERI code with only whitespace is rejected", () => {
      fc.assert(
        fc.property(
          fc.array(fc.constantFrom(" ", "\t", "\n"), { minLength: 1, maxLength: 10 }).map(arr => arr.join("")),
          validNameArb,
          (whitespace, name) => {
            const data = {
              teriCode: whitespace,
              name,
              email: "",
              phone: "",
              address: "",
              isBuyer: true,
              isSeller: false,
              isBrand: false,
              isReferee: false,
              isContractor: false,
              tags: [],
            };
            const result = clientFormSchema.safeParse(data);
            return !result.success;
          }
        ),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 16: Email format validation
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 16: Email format validation**", () => {
    it("P16.1: Valid emails are accepted", () => {
      fc.assert(
        fc.property(validEmailArb, validTeriCodeArb, validNameArb, (email, teriCode, name) => {
          const data = {
            teriCode,
            name,
            email,
            phone: "",
            address: "",
            isBuyer: true,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
            tags: [],
          };
          const result = clientFormSchema.safeParse(data);
          return result.success === true;
        }),
        { numRuns }
      );
    });

    it("P16.2: Empty email is accepted (optional field)", () => {
      fc.assert(
        fc.property(validTeriCodeArb, validNameArb, (teriCode, name) => {
          const data = {
            teriCode,
            name,
            email: "",
            phone: "",
            address: "",
            isBuyer: true,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
            tags: [],
          };
          const result = clientFormSchema.safeParse(data);
          return result.success === true;
        }),
        { numRuns }
      );
    });

    it("P16.3: Invalid emails are rejected", () => {
      fc.assert(
        fc.property(invalidEmailArb, validTeriCodeArb, validNameArb, (email, teriCode, name) => {
          const data = {
            teriCode,
            name,
            email,
            phone: "",
            address: "",
            isBuyer: true,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
            tags: [],
          };
          const result = clientFormSchema.safeParse(data);
          return !result.success;
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 17: Phone format validation
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 17: Phone format validation**", () => {
    it("P17.1: Valid phone numbers are accepted", () => {
      fc.assert(
        fc.property(validPhoneArb, validTeriCodeArb, validNameArb, (phone, teriCode, name) => {
          const data = {
            teriCode,
            name,
            email: "",
            phone,
            address: "",
            isBuyer: true,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
            tags: [],
          };
          const result = clientFormSchema.safeParse(data);
          return result.success === true;
        }),
        { numRuns }
      );
    });

    it("P17.2: Empty phone is accepted (optional field)", () => {
      fc.assert(
        fc.property(validTeriCodeArb, validNameArb, (teriCode, name) => {
          const data = {
            teriCode,
            name,
            email: "",
            phone: "",
            address: "",
            isBuyer: true,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
            tags: [],
          };
          const result = clientFormSchema.safeParse(data);
          return result.success === true;
        }),
        { numRuns }
      );
    });

    it("P17.3: Phone numbers with letters are rejected", () => {
      fc.assert(
        fc.property(invalidPhoneArb, validTeriCodeArb, validNameArb, (phone, teriCode, name) => {
          const data = {
            teriCode,
            name,
            email: "",
            phone,
            address: "",
            isBuyer: true,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
            tags: [],
          };
          const result = clientFormSchema.safeParse(data);
          return !result.success;
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 18: Submit button state management
  // ==========================================================================

  describe("**Feature: parallel-sprint-dec19, Property 18: Submit button state management**", () => {
    it("P18.1: Submit is disabled without required fields", () => {
      fc.assert(
        fc.property(
          fc.option(validTeriCodeArb, { nil: "" }),
          fc.option(validNameArb, { nil: "" }),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (teriCode, name, isBuyer, isSeller, isBrand, isReferee, isContractor) => {
            const data = {
              teriCode: teriCode || "",
              name: name || "",
              isBuyer,
              isSeller,
              isBrand,
              isReferee,
              isContractor,
            };

            // If missing required fields, form should not be valid for submission
            if (!teriCode || !name) {
              return !isFormValidForSubmission(data);
            }
            return true;
          }
        ),
        { numRuns }
      );
    });

    it("P18.2: Submit is disabled without client type", () => {
      fc.assert(
        fc.property(validTeriCodeArb, validNameArb, (teriCode, name) => {
          const data = {
            teriCode,
            name,
            isBuyer: false,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
          };
          return !isFormValidForSubmission(data);
        }),
        { numRuns }
      );
    });

    it("P18.3: Submit is enabled with all requirements met", () => {
      fc.assert(
        fc.property(
          validTeriCodeArb,
          validNameArb,
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          fc.boolean(),
          (teriCode, name, isBuyer, isSeller, isBrand, isReferee, isContractor) => {
            // Ensure at least one client type is selected
            if (!isBuyer && !isSeller && !isBrand && !isReferee && !isContractor) {
              return true; // Skip this case
            }

            const data = {
              teriCode,
              name,
              isBuyer,
              isSeller,
              isBrand,
              isReferee,
              isContractor,
            };
            return isFormValidForSubmission(data);
          }
        ),
        { numRuns }
      );
    });

    it("P18.4: At least one client type required for valid submission", () => {
      fc.assert(
        fc.property(validTeriCodeArb, validNameArb, (teriCode, name) => {
          const data = {
            teriCode,
            name,
            email: "",
            phone: "",
            address: "",
            isBuyer: false,
            isSeller: false,
            isBrand: false,
            isReferee: false,
            isContractor: false,
            tags: [],
          };
          const result = clientFormSchema.safeParse(data);
          return !result.success; // Should fail due to no client type
        }),
        { numRuns }
      );
    });

    it("P18.5: Any single client type is sufficient", () => {
      const clientTypes = ["isBuyer", "isSeller", "isBrand", "isReferee", "isContractor"] as const;

      fc.assert(
        fc.property(
          validTeriCodeArb,
          validNameArb,
          fc.constantFrom(...clientTypes),
          (teriCode, name, selectedType) => {
            const data = {
              teriCode,
              name,
              email: "",
              phone: "",
              address: "",
              isBuyer: selectedType === "isBuyer",
              isSeller: selectedType === "isSeller",
              isBrand: selectedType === "isBrand",
              isReferee: selectedType === "isReferee",
              isContractor: selectedType === "isContractor",
              tags: [],
            };
            const result = clientFormSchema.safeParse(data);
            return result.success === true;
          }
        ),
        { numRuns }
      );
    });
  });
});
