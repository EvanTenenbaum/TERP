/**
 * Client Data Realism Tests
 *
 * Ensures that client data is realistic and varied:
 * - Cannabis-themed business names
 * - California-based addresses
 * - Varied contact information formats
 * - Realistic client notes
 */

import { describe, it, expect } from "vitest";
import {
  generateWhaleClients,
  generateRegularClients,
  generateVendorClients,
} from "../../scripts/generators/clients.js";

describe("Client Data Realism", () => {
  describe("Business Naming", () => {
    it("should generate cannabis-themed business names", () => {
      const whales = generateWhaleClients();
      const regular = generateRegularClients();
      const vendors = generateVendorClients();

      const allClients = [...whales, ...regular, ...vendors];
      const names = allClients.map(c => c.name);

      // Check for cannabis-related keywords
      const cannabisKeywords = [
        "green",
        "emerald",
        "golden",
        "pacific",
        "coastal",
        "collective",
        "dispensary",
        "wellness",
        "gardens",
        "farms",
        "cannabis",
        "herb",
        "leaf",
        "cultivation",
        "growers",
      ];

      const hasCannabisTerm = names.some(name =>
        cannabisKeywords.some(keyword => name.toLowerCase().includes(keyword))
      );

      expect(hasCannabisTerm).toBe(true);
    });

    it("should have varied business name structures", () => {
      const whales = generateWhaleClients();
      const names = whales.map(c => c.name);

      // Should have different name patterns
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length); // All unique

      // Should have some with LLC, Inc, Co suffixes
      const hasLegalSuffix = names.some(name =>
        /\b(LLC|Inc|Co|Corp)\b/i.test(name)
      );
      expect(hasLegalSuffix).toBe(true);
    });
  });

  describe("Contact Information", () => {
    it("should have valid email addresses", () => {
      const whales = generateWhaleClients();

      whales.forEach(client => {
        expect(client.email).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
      });
    });

    it("should have valid phone numbers", () => {
      const whales = generateWhaleClients();

      whales.forEach(client => {
        expect(client.phone).toBeTruthy();
        expect(client.phone.length).toBeGreaterThan(0);
      });
    });
  });

  describe("Geographic Distribution", () => {
    it("should have California-based addresses", () => {
      const whales = generateWhaleClients();
      const regular = generateRegularClients();

      const allClients = [...whales, ...regular];
      const addresses = allClients.map(c => c.address);

      // California cities that should appear
      const caCities = [
        "Los Angeles",
        "San Francisco",
        "San Diego",
        "Oakland",
        "Sacramento",
        "San Jose",
      ];

      // At least some addresses should contain CA cities
      const hasCaCity = addresses.some(addr =>
        caCities.some(city => addr.includes(city))
      );

      expect(hasCaCity).toBe(true);
    });

    it("should have realistic street addresses", () => {
      const whales = generateWhaleClients();

      whales.forEach(client => {
        expect(client.address).toBeTruthy();
        expect(client.address.length).toBeGreaterThan(10);
      });
    });
  });

  describe("Vendor Naming", () => {
    it("should have realistic vendor names", () => {
      const vendors = generateVendorClients();

      // Vendors should have cultivation-related names
      const cultivationKeywords = [
        "farm",
        "growers",
        "cultivation",
        "harvest",
        "gardens",
        "valley",
        "triangle",
        "coast",
        "supply",
      ];

      // At least 80% of vendors should have cultivation-related names
      const realisticVendors = vendors.filter(vendor =>
        cultivationKeywords.some(keyword =>
          vendor.name.toLowerCase().includes(keyword)
        )
      );

      const realisticPercent = (realisticVendors.length / vendors.length) * 100;
      expect(realisticPercent).toBeGreaterThanOrEqual(80);
    });
  });
});
