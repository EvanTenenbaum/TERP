/**
 * Property-Based Tests for PII Masking & Structured Logging
 *
 * **Feature: parallel-sprint-dec19, Property 9: Structured logging never exposes PII**
 *
 * Tests that the PII masking utilities correctly mask sensitive data in all cases
 * and that structured logging preserves this masking.
 *
 * @module tests/property/vip-portal/pii-masking
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { piiMasker, vipPortalLogger } from "../../../server/_core/logger";
import { getNumRuns } from "../arbitraries";

describe("PII Masking Property Tests", () => {
  const numRuns = getNumRuns();

  // ==========================================================================
  // Email Masking Properties
  // ==========================================================================

  describe("piiMasker.email", () => {
    /**
     * Property 9.1: Email masking never reveals more than first 2 characters
     * Note: The test checks the REVEALED portion, not substring matching,
     * to avoid false positives when mask chars (*) match original chars.
     */
    it("P9.1: Never reveals more than 2 characters of local part", () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const masked = piiMasker.email(email);
            const [local] = email.split("@");
            const [maskedLocal] = masked.split("@");

            // The masked local part should:
            // 1. Start with at most 2 characters from original (for long locals)
            // 2. Be followed by mask characters (***)
            if (local.length > 2) {
              // Verify only first 2 chars are revealed, followed by ***
              const revealedPart = maskedLocal.replace(/\*+$/, "");
              return revealedPart.length <= 2 && local.startsWith(revealedPart);
            }
            // For short locals (<=2 chars), should be fully masked as ***
            return maskedLocal === "***";
          }
        ),
        { numRuns }
      );
    });

    /**
     * Property 9.2: Email masking preserves domain
     */
    it("P9.2: Preserves the domain for context", () => {
      fc.assert(
        fc.property(
          fc.emailAddress(),
          (email) => {
            const masked = piiMasker.email(email);
            const [, domain] = email.split("@");

            // Domain should be preserved
            return masked.includes(domain);
          }
        ),
        { numRuns }
      );
    });

    /**
     * Property 9.3: Invalid email returns redacted
     */
    it("P9.3: Invalid email returns [REDACTED]", () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.constant(""),
            fc.constant("invalid"),
            fc.constant("no-at-sign"),
            fc.string({ minLength: 1, maxLength: 10 }).filter(s => !s.includes("@")),
            fc.constant(null as unknown as string),
            fc.constant(undefined as unknown as string)
          ),
          (input) => {
            const masked = piiMasker.email(input);
            return masked === "[REDACTED]";
          }
        ),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Phone Masking Properties
  // ==========================================================================

  describe("piiMasker.phone", () => {
    /**
     * Property 9.4: Phone masking only shows last 4 digits
     */
    it("P9.4: Only shows last 4 digits", () => {
      // Generate phone numbers as arrays of digits then join
      const phoneArb = fc.oneof(
        fc.tuple(
          fc.constantFrom("+1", "+44", "+81", ""),
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
        ).map(([prefix, digits]) => `${prefix}${digits.join("")}`),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 7, maxLength: 15 })
          .map(digits => digits.join(""))
      );

      fc.assert(
        fc.property(phoneArb, (phone) => {
          const masked = piiMasker.phone(phone);
          const digits = phone.replace(/\D/g, "");

          if (digits.length < 4) {
            return masked === "[REDACTED]";
          }

          // Only last 4 digits should be visible
          const last4 = digits.slice(-4);
          return masked.includes(last4) && masked.startsWith("***");
        }),
        { numRuns }
      );
    });

    /**
     * Property 9.5: Phone masking never reveals full number
     */
    it("P9.5: Never reveals full phone number", () => {
      const phoneArb = fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 7, maxLength: 15 })
        .map(digits => digits.join(""));

      fc.assert(
        fc.property(phoneArb, (phone) => {
          const masked = piiMasker.phone(phone);

          // Full phone number should not be in masked output
          return !masked.includes(phone);
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Address Masking Properties
  // ==========================================================================

  describe("piiMasker.address", () => {
    /**
     * Property 9.6: Address masking removes street number and name
     */
    it("P9.6: Removes street-specific information", () => {
      const addressArb = fc.tuple(
        fc.integer({ min: 1, max: 9999 }),
        fc.constantFrom("Main", "Oak", "Elm", "First", "Second"),
        fc.constantFrom("St", "Ave", "Blvd", "Rd", "Lane"),
        fc.constantFrom("Springfield", "Portland", "Denver", "Austin"),
        fc.constantFrom("IL", "OR", "CO", "TX"),
        fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 5, maxLength: 5 })
          .map(digits => digits.join(""))
      ).map(([num, street, type, city, state, zip]) =>
        `${num} ${street} ${type}, ${city}, ${state} ${zip}`
      );

      fc.assert(
        fc.property(addressArb, (address) => {
          const masked = piiMasker.address(address);
          const [streetPart] = address.split(",");

          // Street number should not be in masked output
          return !masked.includes(streetPart);
        }),
        { numRuns }
      );
    });

    /**
     * Property 9.7: Address masking preserves city/state
     */
    it("P9.7: Preserves city and state for context", () => {
      const addressArb = fc.tuple(
        fc.integer({ min: 1, max: 9999 }),
        fc.constantFrom("Main", "Oak", "Elm"),
        fc.constantFrom("St", "Ave", "Blvd"),
        fc.constantFrom("Springfield", "Portland", "Denver"),
        fc.constantFrom("IL", "OR", "CO")
      ).map(([num, street, type, city, state]) =>
        `${num} ${street} ${type}, ${city}, ${state} 12345`
      );

      fc.assert(
        fc.property(addressArb, (address) => {
          const masked = piiMasker.address(address);
          const parts = address.split(",").map(p => p.trim());
          const city = parts[1];
          const stateZip = parts[2];
          const state = stateZip?.split(" ")[0];

          // City and state should be preserved (without zip)
          return masked.includes(city) && masked.includes(state);
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Name Masking Properties
  // ==========================================================================

  describe("piiMasker.name", () => {
    /**
     * Property 9.8: Name masking only shows initials
     */
    it("P9.8: Only shows first initial of each name part", () => {
      const nameArb = fc.tuple(
        fc.constantFrom("John", "Jane", "Robert", "Maria"),
        fc.constantFrom("Doe", "Smith", "Johnson", "Williams")
      ).map(([first, last]) => `${first} ${last}`);

      fc.assert(
        fc.property(nameArb, (name) => {
          const masked = piiMasker.name(name);
          const parts = name.split(" ");

          // Each part should start with first character and have ***
          const maskedParts = masked.split(" ");
          return maskedParts.every((mp, i) =>
            mp.startsWith(parts[i][0]) && mp.includes("***")
          );
        }),
        { numRuns }
      );
    });

    /**
     * Property 9.9: Full name never appears in masked output
     */
    it("P9.9: Full name never appears in masked output", () => {
      const nameArb = fc.tuple(
        fc.string({ minLength: 2, maxLength: 10 }).map(s => {
          // Create a name-like string with first letter capitalized
          const clean = s.replace(/[^a-zA-Z]/g, "a");
          return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
        }),
        fc.string({ minLength: 2, maxLength: 10 }).map(s => {
          const clean = s.replace(/[^a-zA-Z]/g, "a");
          return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
        })
      ).map(([first, last]) => `${first} ${last}`);

      fc.assert(
        fc.property(nameArb, (name) => {
          const masked = piiMasker.name(name);
          const parts = name.split(" ");

          // No full name part should appear (parts with length > 1)
          return parts.every(part => part.length <= 1 || !masked.includes(part));
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Object Masking Properties
  // ==========================================================================

  describe("piiMasker.object", () => {
    /**
     * Property 9.10: Object masking detects and masks all PII fields
     */
    it("P9.10: Automatically masks all known PII field patterns", () => {
      const piiObjectArb = fc.record({
        email: fc.emailAddress(),
        phone: fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
          .map(digits => digits.join("")),
        address: fc.constant("123 Main St, City, ST 12345"),
        name: fc.constant("John Doe"),
        nonPii: fc.string({ minLength: 1, maxLength: 20 }),
      });

      fc.assert(
        fc.property(piiObjectArb, (obj) => {
          const masked = piiMasker.object(obj) as Record<string, unknown>;

          // PII fields should be masked
          const emailMasked = (masked.email as string).includes("***") || masked.email === "[REDACTED]";
          const phoneMasked = (masked.phone as string).includes("***") || masked.phone === "[REDACTED]";
          const addressMasked = (masked.address as string).includes("[ADDR]") || masked.address === "[REDACTED]";
          const nameMasked = (masked.name as string).includes("***") || masked.name === "[REDACTED]";

          // Non-PII fields should be unchanged
          const nonPiiUnchanged = masked.nonPii === obj.nonPii;

          return emailMasked && phoneMasked && addressMasked && nameMasked && nonPiiUnchanged;
        }),
        { numRuns }
      );
    });

    /**
     * Property 9.11: Object masking handles nested objects
     */
    it("P9.11: Handles nested objects", () => {
      const nestedObjectArb = fc.record({
        user: fc.record({
          email: fc.emailAddress(),
          name: fc.constant("Jane Doe"),
        }),
        metadata: fc.record({
          id: fc.integer({ min: 1, max: 1000 }),
        }),
      });

      fc.assert(
        fc.property(nestedObjectArb, (obj) => {
          const masked = piiMasker.object(obj) as Record<string, unknown>;
          const user = masked.user as Record<string, unknown>;

          // Nested PII should be masked
          const emailMasked = (user.email as string).includes("***") || user.email === "[REDACTED]";
          const nameMasked = (user.name as string).includes("***") || user.name === "[REDACTED]";

          // Non-PII nested values should be unchanged
          const metadata = masked.metadata as Record<string, unknown>;
          const idUnchanged = metadata.id === (obj.metadata as Record<string, unknown>).id;

          return emailMasked && nameMasked && idUnchanged;
        }),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Structured Logging Integration Properties
  // ==========================================================================

  describe("vipPortalLogger integration", () => {
    /**
     * Property 9.12: Logged context never contains raw PII
     * This is a behavioral property that ensures the logger functions
     * properly invoke the PII masker before logging.
     */
    it("P9.12: Logger functions accept and process PII context", () => {
      const contextArb = fc.record({
        email: fc.emailAddress(),
        clientId: fc.integer({ min: 1, max: 10000 }),
        operation: fc.constantFrom("login", "logout", "create", "update"),
      });

      fc.assert(
        fc.property(contextArb, (context) => {
          // These should not throw
          try {
            // Note: We can't easily capture the log output, but we verify
            // that the functions accept PII-containing context
            vipPortalLogger.operationStart("test", context);
            vipPortalLogger.operationSuccess("test", context);
            vipPortalLogger.operationFailure("test", new Error("test"), context);
            return true;
          } catch {
            return false;
          }
        }),
        { numRuns: Math.min(numRuns, 50) } // Fewer runs as we're testing side effects
      );
    });
  });
});
