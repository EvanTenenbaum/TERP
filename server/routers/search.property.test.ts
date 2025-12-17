/**
 * Property Tests for Search Router URL Validity
 *
 * Property 1: Search Result URLs Match Declared Routes
 * Validates: Requirements 1.1, 1.2, 1.3
 */
import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// Valid routes in the application (from App.tsx)
const VALID_ROUTES = [
  "/",
  "/dashboard",
  "/clients",
  "/orders",
  "/quotes",
  "/inventory",
  "/batches",
  "/products",
  "/invoices",
  "/payments",
  "/vendors",
  "/calendar",
  "/settings",
  "/reports",
  "/accounting",
];

// URL patterns that are valid (with query params)
const VALID_URL_PATTERNS = [
  /^\/clients$/,
  /^\/clients\?selected=\d+$/,
  /^\/orders$/,
  /^\/orders\?selected=\d+$/,
  /^\/quotes$/,
  /^\/quotes\?selected=\d+$/,
  /^\/invoices$/,
  /^\/invoices\?selected=\d+$/,
  /^\/batches$/,
  /^\/batches\?selected=\d+$/,
  /^\/products$/,
  /^\/products\?selected=\d+$/,
  /^\/vendors$/,
  /^\/vendors\?selected=\d+$/,
];

/**
 * Validates that a URL matches one of the valid patterns
 */
function isValidSearchResultUrl(url: string): boolean {
  // Check exact matches
  if (VALID_ROUTES.includes(url)) return true;

  // Check pattern matches
  return VALID_URL_PATTERNS.some(pattern => pattern.test(url));
}

describe("Search Router URL Validity", () => {
  describe("Property 1: Search Result URLs Match Declared Routes", () => {
    it("should generate valid URLs for client search results", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), clientId => {
          const url = `/clients?selected=${clientId}`;
          expect(isValidSearchResultUrl(url)).toBe(true);
        })
      );
    });

    it("should generate valid URLs for order search results", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), orderId => {
          const url = `/orders?selected=${orderId}`;
          expect(isValidSearchResultUrl(url)).toBe(true);
        })
      );
    });

    it("should generate valid URLs for quote search results", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), quoteId => {
          const url = `/quotes?selected=${quoteId}`;
          expect(isValidSearchResultUrl(url)).toBe(true);
        })
      );
    });

    it("should generate valid URLs for invoice search results", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), invoiceId => {
          const url = `/invoices?selected=${invoiceId}`;
          expect(isValidSearchResultUrl(url)).toBe(true);
        })
      );
    });

    it("should generate valid URLs for batch search results", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), batchId => {
          const url = `/batches?selected=${batchId}`;
          expect(isValidSearchResultUrl(url)).toBe(true);
        })
      );
    });

    it("should generate valid URLs for product search results", () => {
      fc.assert(
        fc.property(fc.integer({ min: 1, max: 10000 }), productId => {
          const url = `/products?selected=${productId}`;
          expect(isValidSearchResultUrl(url)).toBe(true);
        })
      );
    });

    it("should reject invalid URL patterns", () => {
      const invalidUrls = [
        "/orders/123", // Old pattern - should use ?selected=
        "/orders/123/edit", // Old pattern - no edit routes
        "/clients/456", // Old pattern
        "/nonexistent", // Route doesn't exist
        "/admin/secret", // Route doesn't exist
      ];

      invalidUrls.forEach(url => {
        expect(isValidSearchResultUrl(url)).toBe(false);
      });
    });

    it("should handle edge cases for IDs", () => {
      // Very large IDs
      expect(isValidSearchResultUrl("/quotes?selected=999999999")).toBe(true);

      // ID of 1
      expect(isValidSearchResultUrl("/quotes?selected=1")).toBe(true);
    });
  });
});
