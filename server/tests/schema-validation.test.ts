/**
 * Schema Validation Tests
 *
 * Ensures that generator interfaces match the actual database schema.
 * This prevents runtime errors during seeding operations.
 */

import { describe, it, expect } from "vitest";
import {
  generateWhaleClients,
  generateRegularClients,
  generateVendorClients,
} from "../../scripts/generators/clients.js";
import { clients } from "../../drizzle/schema.js";

describe("Schema Validation", () => {
  describe("ClientData interface - Type Validation", () => {
    it("should generate clients with boolean fields (not numbers)", () => {
      const whales = generateWhaleClients();
      const firstWhale = whales[0];

      // These should be booleans, not numbers
      expect(typeof firstWhale.isBuyer).toBe("boolean");
      expect(typeof firstWhale.isSeller).toBe("boolean");
      expect(typeof firstWhale.isBrand).toBe("boolean");
    });

    it("should generate clients with tags as array (not JSON string)", () => {
      const whales = generateWhaleClients();
      const firstWhale = whales[0];

      // Tags should be an array, not a JSON string
      expect(Array.isArray(firstWhale.tags)).toBe(true);
      expect(typeof firstWhale.tags).not.toBe("string");
    });

    it("should not generate clients with non-existent schema fields", () => {
      const whales = generateWhaleClients();
      const firstWhale = whales[0];

      // These fields don't exist in the database schema
      expect(
        (firstWhale as Record<string, unknown>).paymentTerms
      ).toBeUndefined();
      // Note: creditLimit now exists in schema but generators may not include it
      // as it's calculated/managed separately
      expect((firstWhale as Record<string, unknown>).notes).toBeUndefined();
    });
  });

  describe("Database Schema - Field Verification", () => {
    it("should have boolean fields in the clients schema", () => {
      // Verify that the schema has the expected boolean fields
      expect(clients.isBuyer).toBeDefined();
      expect(clients.isSeller).toBeDefined();
      expect(clients.isBrand).toBeDefined();
      expect(clients.isReferee).toBeDefined();
      expect(clients.isContractor).toBeDefined();
    });

    it("should have tags field as JSON type in the schema", () => {
      expect(clients.tags).toBeDefined();
    });

    it("should not have paymentTerms or notes fields (creditLimit now exists)", () => {
      const schemaColumns = clients;

      // These fields do not exist in the clients table
      expect(
        (schemaColumns as Record<string, unknown>).paymentTerms
      ).toBeUndefined();
      // creditLimit was added in FEATURE-012 / credit visibility feature
      expect(
        (schemaColumns as Record<string, unknown>).creditLimit
      ).toBeDefined();
      expect((schemaColumns as Record<string, unknown>).notes).toBeUndefined();
    });
  });

  describe("Vendor Clients - Type Validation", () => {
    it("should generate vendor clients with correct boolean types", () => {
      const vendors = generateVendorClients();
      const firstVendor = vendors[0];

      expect(typeof firstVendor.isBuyer).toBe("boolean");
      expect(typeof firstVendor.isSeller).toBe("boolean");
      expect(typeof firstVendor.isBrand).toBe("boolean");
    });

    it("should generate vendor clients with tags as array", () => {
      const vendors = generateVendorClients();
      const firstVendor = vendors[0];

      expect(Array.isArray(firstVendor.tags)).toBe(true);
    });
  });

  describe("Regular Clients - Type Validation", () => {
    it("should generate regular clients with correct boolean types", () => {
      const regular = generateRegularClients();
      const firstRegular = regular[0];

      expect(typeof firstRegular.isBuyer).toBe("boolean");
      expect(typeof firstRegular.isSeller).toBe("boolean");
      expect(typeof firstRegular.isBrand).toBe("boolean");
    });

    it("should generate regular clients with tags as array", () => {
      const regular = generateRegularClients();
      const firstRegular = regular[0];

      expect(Array.isArray(firstRegular.tags)).toBe(true);
    });
  });
});
