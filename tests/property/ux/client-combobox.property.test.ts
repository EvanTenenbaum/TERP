/**
 * Property-Based Tests for Client Combobox Component
 *
 * **Feature: parallel-sprint-dec19, Property 1: Search filtering preserves data integrity**
 * **Feature: parallel-sprint-dec19, Property 2: Case-insensitive matching works correctly**
 *
 * Tests that the client search filtering correctly handles all edge cases
 * and always produces valid, predictable results.
 *
 * @module tests/property/ux/client-combobox
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { getNumRuns } from "../arbitraries";

// ============================================================================
// FILTER IMPLEMENTATION (EXTRACT LOGIC FOR TESTING)
// ============================================================================

/**
 * Client filtering logic extracted for testing
 * Mirrors the implementation in client-combobox.tsx
 */
interface TestClient {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

function filterClients(
  clients: TestClient[],
  search: string,
  maxResults: number = 10
): TestClient[] {
  if (!search.trim()) {
    return clients.slice(0, maxResults);
  }

  const searchLower = search.toLowerCase().trim();

  return clients
    .filter((client) => {
      const nameMatch = client.name?.toLowerCase().includes(searchLower);
      const emailMatch = client.email?.toLowerCase().includes(searchLower);
      const phoneMatch = client.phone?.replace(/\D/g, "").includes(searchLower.replace(/\D/g, ""));
      return nameMatch || emailMatch || phoneMatch;
    })
    .slice(0, maxResults);
}

// ============================================================================
// TEST ARBITRARIES
// ============================================================================

const clientArb = fc.record({
  id: fc.integer({ min: 1, max: 100000 }),
  name: fc.string({ minLength: 1, maxLength: 100 }),
  email: fc.option(fc.emailAddress(), { nil: null }),
  phone: fc.option(
    fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 10 })
      .map(digits => digits.join("")),
    { nil: null }
  ),
});

const clientListArb = fc.array(clientArb, { minLength: 0, maxLength: 100 });

const searchTermArb = fc.oneof(
  fc.constant(""),
  fc.constant(" "),
  fc.string({ minLength: 1, maxLength: 50 }),
  fc.constantFrom("john", "JOHN", "JoHn", "john.doe", "@gmail", "555"),
);

// ============================================================================
// PROPERTY TESTS
// ============================================================================

describe("Client Combobox Property Tests", () => {
  const numRuns = getNumRuns();

  // ==========================================================================
  // Property 1: Search filtering preserves data integrity
  // ==========================================================================

  describe("Property 1: Search filtering preserves data integrity", () => {
    /**
     * P1.1: Filtered results are always a subset of original clients
     */
    it("P1.1: Filtered results are always a subset of original clients", () => {
      fc.assert(
        fc.property(
          clientListArb,
          searchTermArb,
          (clients, search) => {
            const filtered = filterClients(clients, search);

            // Every filtered client must exist in original list
            return filtered.every(filteredClient =>
              clients.some(c => c.id === filteredClient.id)
            );
          }
        ),
        { numRuns }
      );
    });

    /**
     * P1.2: Filtering never modifies client data
     */
    it("P1.2: Filtering never modifies client data", () => {
      fc.assert(
        fc.property(
          // Use unique IDs to avoid ambiguity in finding the original
          fc.array(clientArb, { minLength: 0, maxLength: 100 })
            .map(clients => {
              // Ensure unique IDs
              const seen = new Set<number>();
              return clients.filter(c => {
                if (seen.has(c.id)) return false;
                seen.add(c.id);
                return true;
              });
            }),
          searchTermArb,
          (clients, search) => {
            const filtered = filterClients(clients, search);

            // Each filtered client should have identical data to original
            return filtered.every(filteredClient => {
              const original = clients.find(c => c.id === filteredClient.id);
              return (
                original !== undefined &&
                original.name === filteredClient.name &&
                original.email === filteredClient.email &&
                original.phone === filteredClient.phone
              );
            });
          }
        ),
        { numRuns }
      );
    });

    /**
     * P1.3: Result count never exceeds maxResults
     */
    it("P1.3: Result count never exceeds maxResults", () => {
      fc.assert(
        fc.property(
          clientListArb,
          searchTermArb,
          fc.integer({ min: 1, max: 50 }),
          (clients, search, maxResults) => {
            const filtered = filterClients(clients, search, maxResults);
            return filtered.length <= maxResults;
          }
        ),
        { numRuns }
      );
    });

    /**
     * P1.4: Empty search returns clients up to maxResults
     */
    it("P1.4: Empty search returns clients up to maxResults", () => {
      fc.assert(
        fc.property(
          clientListArb,
          fc.integer({ min: 1, max: 50 }),
          (clients, maxResults) => {
            const filtered = filterClients(clients, "", maxResults);
            return filtered.length === Math.min(clients.length, maxResults);
          }
        ),
        { numRuns }
      );
    });

    /**
     * P1.5: Empty client list always returns empty results
     */
    it("P1.5: Empty client list always returns empty results", () => {
      fc.assert(
        fc.property(
          searchTermArb,
          (search) => {
            const filtered = filterClients([], search);
            return filtered.length === 0;
          }
        ),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Property 2: Case-insensitive matching works correctly
  // ==========================================================================

  describe("Property 2: Case-insensitive matching works correctly", () => {
    /**
     * P2.1: Search is case-insensitive for names
     */
    it("P2.1: Search is case-insensitive for names", () => {
      const testCases = [
        { name: "John Doe", searches: ["john", "JOHN", "JoHn", "john doe", "JOHN DOE"] },
        { name: "alice smith", searches: ["ALICE", "Alice", "aLiCe", "SMITH", "smith"] },
        { name: "BOB JONES", searches: ["bob", "Bob", "BOB", "jones", "JONES"] },
      ];

      for (const { name, searches } of testCases) {
        const clients = [{ id: 1, name, email: null, phone: null }];

        for (const search of searches) {
          const filtered = filterClients(clients, search);
          expect(filtered.length).toBe(1);
          expect(filtered[0].name).toBe(name);
        }
      }
    });

    /**
     * P2.2: Any case variation of existing name matches
     */
    it("P2.2: Any case variation of existing name matches", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 2, maxLength: 30 }).filter(s => /[a-zA-Z]/.test(s)),
          (name) => {
            const clients = [{ id: 1, name, email: null, phone: null }];

            // Test with original case
            const filteredOriginal = filterClients(clients, name);

            // Test with lowercase
            const filteredLower = filterClients(clients, name.toLowerCase());

            // Test with uppercase
            const filteredUpper = filterClients(clients, name.toUpperCase());

            // All should find the same client (if found at all)
            const originalFound = filteredOriginal.length > 0;
            const lowerFound = filteredLower.length > 0;
            const upperFound = filteredUpper.length > 0;

            // If any finds it, all should find it
            return originalFound === lowerFound && lowerFound === upperFound;
          }
        ),
        { numRuns }
      );
    });

    /**
     * P2.3: Search is case-insensitive for emails
     */
    it("P2.3: Search is case-insensitive for emails", () => {
      const clients = [
        { id: 1, name: "Test User", email: "Test.User@Example.com", phone: null },
      ];

      const searches = ["test", "TEST", "user", "USER", "example", "EXAMPLE", "@example"];

      for (const search of searches) {
        const filtered = filterClients(clients, search);
        expect(filtered.length).toBe(1);
      }
    });

    /**
     * P2.4: Phone search ignores non-digit characters
     */
    it("P2.4: Phone search ignores non-digit characters", () => {
      const clients = [
        { id: 1, name: "Test User", email: null, phone: "555-123-4567" },
      ];

      const searches = [
        "5551234567",
        "555",
        "1234567",
        "123",
        "4567",
      ];

      for (const search of searches) {
        const filtered = filterClients(clients, search);
        expect(filtered.length).toBe(1);
      }
    });

    /**
     * P2.5: Partial matches work for all fields
     */
    it("P2.5: Partial matches work for all fields", () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 10, maxLength: 30 }),
          fc.integer({ min: 1, max: 5 }),
          (fullName, substringStart) => {
            if (fullName.length <= substringStart + 3) return true; // Skip if too short

            const substring = fullName.slice(substringStart, substringStart + 3);
            const clients = [{ id: 1, name: fullName, email: null, phone: null }];

            const filtered = filterClients(clients, substring);

            // Substring should match
            return filtered.length === 1 || !fullName.toLowerCase().includes(substring.toLowerCase());
          }
        ),
        { numRuns }
      );
    });
  });

  // ==========================================================================
  // Additional Edge Cases
  // ==========================================================================

  describe("Edge cases", () => {
    /**
     * P2.6: Whitespace-only search returns all clients (up to limit)
     */
    it("P2.6: Whitespace-only search returns all clients (up to limit)", () => {
      fc.assert(
        fc.property(
          clientListArb,
          fc.constantFrom("", " ", "  ", "\t", "   "),
          (clients, whitespace) => {
            const filtered = filterClients(clients, whitespace, 10);
            return filtered.length === Math.min(clients.length, 10);
          }
        ),
        { numRuns }
      );
    });

    /**
     * P2.7: Search with special characters doesn't crash
     */
    it("P2.7: Search with special characters doesn't crash", () => {
      const specialSearches = [
        "\\",
        "[",
        "]",
        "(",
        ")",
        "{",
        "}",
        ".",
        "*",
        "+",
        "?",
        "^",
        "$",
        "|",
        "!@#$%",
      ];

      const clients = [
        { id: 1, name: "Test User", email: "test@example.com", phone: "5551234567" },
      ];

      for (const search of specialSearches) {
        expect(() => filterClients(clients, search)).not.toThrow();
      }
    });

    /**
     * P2.8: Null/undefined email and phone are handled gracefully
     */
    it("P2.8: Null/undefined email and phone are handled gracefully", () => {
      const clients = [
        { id: 1, name: "Test User", email: null, phone: null },
        { id: 2, name: "Another User", email: undefined as unknown as null, phone: undefined as unknown as null },
      ];

      expect(() => filterClients(clients, "test")).not.toThrow();
      expect(() => filterClients(clients, "@")).not.toThrow();
      expect(() => filterClients(clients, "555")).not.toThrow();
    });
  });
});
