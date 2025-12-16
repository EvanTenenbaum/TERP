/**
 * Client Seeder
 *
 * Seeds the clients table with realistic client data.
 * Reuses patterns from scripts/generators/clients.ts.
 * No foreign key dependencies - can be seeded early.
 */

import { db } from "../../db-sync";
import { clients } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Client Generation Utilities
// ============================================================================

const COMPANY_SUFFIXES = [
  "Dispensary",
  "Cannabis Co",
  "Wellness",
  "Collective",
  "Gardens",
  "Farms",
  "Supply",
  "Distribution",
  "Retail",
  "Therapeutics",
];

const CALIFORNIA_CITIES = [
  "Los Angeles",
  "San Francisco",
  "San Diego",
  "Sacramento",
  "Oakland",
  "San Jose",
  "Fresno",
  "Long Beach",
  "Bakersfield",
  "Anaheim",
  "Santa Ana",
  "Riverside",
  "Stockton",
  "Irvine",
  "Chula Vista",
];

/**
 * Generate a realistic company name
 */
function generateCompanyName(index: number): string {
  const prefix = faker.helpers.arrayElement([
    faker.location.city(),
    faker.word.adjective({ strategy: "any-length" }),
    faker.person.lastName(),
  ]);
  const suffix = COMPANY_SUFFIXES[index % COMPANY_SUFFIXES.length];
  return `${prefix} ${suffix}`;
}

/**
 * Generate a California address
 */
function generateCaliforniaAddress(): string {
  const city = faker.helpers.arrayElement(CALIFORNIA_CITIES);
  const street = faker.location.streetAddress();
  const zip = faker.location.zipCode("9####");
  return `${street}, ${city}, CA ${zip}`;
}

// ============================================================================
// Client Data Interface
// ============================================================================

interface ClientData {
  teriCode: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  isBuyer: boolean;
  isSeller: boolean;
  isBrand: boolean;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a whale client (high-volume buyer)
 */
function generateWhaleClient(index: number): ClientData {
  const companyName = generateCompanyName(index);
  return {
    teriCode: `WHL${String(index + 1).padStart(4, "0")}`,
    name: companyName,
    email: faker.internet.email({
      firstName: "contact",
      lastName: companyName.split(" ")[0].toLowerCase(),
      provider: "example.com",
    }),
    phone: faker.phone.number(),
    address: generateCaliforniaAddress(),
    isBuyer: true,
    isSeller: false,
    isBrand: Math.random() < 0.1, // 10% are also brands
    tags: ["wholesale", "high-volume", "cannabis"],
    createdAt: faker.date.between({
      from: new Date(2023, 0, 1),
      to: new Date(2024, 0, 1),
    }),
    updatedAt: new Date(),
  };
}

/**
 * Generate a regular client
 */
function generateRegularClient(index: number): ClientData {
  const companyName = generateCompanyName(index + 100);
  return {
    teriCode: `REG${String(index + 1).padStart(4, "0")}`,
    name: companyName,
    email: faker.internet.email({
      firstName: "contact",
      lastName: companyName.split(" ")[0].toLowerCase(),
      provider: "example.com",
    }),
    phone: faker.phone.number(),
    address: generateCaliforniaAddress(),
    isBuyer: true,
    isSeller: false,
    isBrand: false,
    tags: ["retail", "cannabis"],
    createdAt: faker.date.between({
      from: new Date(2023, 0, 1),
      to: new Date(2024, 6, 1),
    }),
    updatedAt: new Date(),
  };
}

/**
 * Generate a vendor client (seller)
 */
function generateVendorClient(index: number): ClientData {
  const vendorNames = [
    "NorCal Farms",
    "Emerald Triangle Growers",
    "Humboldt Harvest Co",
    "Mendocino Gardens",
    "Trinity Alps Cultivation",
    "Sacramento Valley Farms",
    "Central Coast Growers",
    "SoCal Premium Supply",
  ];
  const companyName = vendorNames[index % vendorNames.length] + (index >= vendorNames.length ? ` #${Math.floor(index / vendorNames.length) + 1}` : "");
  
  return {
    teriCode: `VND${String(index + 1).padStart(4, "0")}`,
    name: companyName,
    email: faker.internet.email({
      firstName: "sales",
      lastName: companyName.split(" ")[0].toLowerCase(),
      provider: "example.com",
    }),
    phone: faker.phone.number(),
    address: generateCaliforniaAddress(),
    isBuyer: false,
    isSeller: true,
    isBrand: false,
    tags: ["vendor", "supplier", "cultivator"],
    createdAt: faker.date.between({
      from: new Date(2023, 0, 1),
      to: new Date(2023, 6, 1),
    }),
    updatedAt: new Date(),
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed clients table
 */
export async function seedClients(
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("clients");
  const startTime = Date.now();

  return withPerformanceLogging("seed:clients", async () => {
    try {
      seedLogger.tableSeeding("clients", count);

      // Distribute clients: 15% whales, 70% regular, 15% vendors
      const whaleCount = Math.max(1, Math.floor(count * 0.15));
      const vendorCount = Math.max(1, Math.floor(count * 0.15));
      const regularCount = count - whaleCount - vendorCount;

      const records: ClientData[] = [];
      const batchSize = 50;

      // Generate whale clients
      for (let i = 0; i < whaleCount; i++) {
        const client = generateWhaleClient(i);
        const validation = await validator.validateColumns("clients", client);
        if (!validation.valid) {
          result.errors.push(
            `Whale ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }
        const masked = masker.maskRecord("clients", client) as ClientData;
        records.push(masked);
      }

      // Generate regular clients
      for (let i = 0; i < regularCount; i++) {
        const client = generateRegularClient(i);
        const validation = await validator.validateColumns("clients", client);
        if (!validation.valid) {
          result.errors.push(
            `Regular ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }
        const masked = masker.maskRecord("clients", client) as ClientData;
        records.push(masked);
      }

      // Generate vendor clients
      for (let i = 0; i < vendorCount; i++) {
        const client = generateVendorClient(i);
        const validation = await validator.validateColumns("clients", client);
        if (!validation.valid) {
          result.errors.push(
            `Vendor ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }
        const masked = masker.maskRecord("clients", client) as ClientData;
        records.push(masked);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(clients).values(batch);
        result.inserted += batch.length;

        if (count > 100 && (i + batchSize) % 100 === 0) {
          seedLogger.operationProgress(
            "seed:clients",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("clients", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:clients",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}


