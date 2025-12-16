/**
 * Vendor Seeder
 *
 * Seeds the vendors table with realistic vendor data.
 * No foreign key dependencies - can be seeded first.
 */

import { db } from "../../db-sync";
import { vendors } from "../../../drizzle/schema";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Vendor Data Templates
// ============================================================================

const VENDOR_TEMPLATES = [
  { name: "NorCal Farms", region: "Northern California", specialty: "Premium flower" },
  { name: "Emerald Triangle Growers", region: "Humboldt", specialty: "Outdoor specialist" },
  { name: "Humboldt Harvest Co", region: "Humboldt", specialty: "Legacy cultivator" },
  { name: "Mendocino Gardens", region: "Mendocino", specialty: "Organic certified" },
  { name: "Trinity Alps Cultivation", region: "Trinity", specialty: "Mountain grown" },
  { name: "Sacramento Valley Farms", region: "Sacramento", specialty: "Large scale greenhouse" },
  { name: "Central Coast Growers", region: "San Luis Obispo", specialty: "SLO county specialist" },
  { name: "SoCal Premium Supply", region: "San Diego", specialty: "San Diego distributor" },
  { name: "Bay Area Botanicals", region: "Bay Area", specialty: "Urban cultivation" },
  { name: "Sierra Nevada Farms", region: "Sierra Nevada", specialty: "High altitude grows" },
  { name: "Redwood Valley Collective", region: "Mendocino", specialty: "Sun-grown cannabis" },
  { name: "Golden State Cultivators", region: "Central Valley", specialty: "Bulk wholesale" },
  { name: "Pacific Coast Cannabis", region: "Coastal", specialty: "Ocean-influenced terroir" },
  { name: "Desert Bloom Farms", region: "Southern California", specialty: "Desert cultivation" },
  { name: "Mountain View Gardens", region: "Santa Cruz", specialty: "Craft cannabis" },
];

// ============================================================================
// Vendor Generation
// ============================================================================

interface VendorData {
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Generate a single vendor record
 */
function generateVendor(index: number): VendorData {
  const template = VENDOR_TEMPLATES[index % VENDOR_TEMPLATES.length];
  const uniqueSuffix = index >= VENDOR_TEMPLATES.length ? ` #${Math.floor(index / VENDOR_TEMPLATES.length) + 1}` : "";
  
  const contactFirstName = faker.person.firstName();
  const contactLastName = faker.person.lastName();
  const now = new Date();
  
  return {
    name: `${template.name}${uniqueSuffix}`,
    contactName: `${contactFirstName} ${contactLastName}`,
    contactEmail: faker.internet.email({
      firstName: contactFirstName.toLowerCase(),
      lastName: contactLastName.toLowerCase(),
      provider: "example.com",
    }),
    contactPhone: faker.phone.number(),
    paymentTerms: faker.helpers.arrayElement(["Net 30", "Net 15", "Net 60", "Due on Receipt", "COD"]),
    notes: `${template.specialty}. Located in ${template.region}.`,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed vendors table
 */
export async function seedVendors(
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("vendors");
  const startTime = Date.now();

  return withPerformanceLogging("seed:vendors", async () => {
    try {
      seedLogger.tableSeeding("vendors", count);

      const records: VendorData[] = [];
      const batchSize = 50;

      // Generate vendor records
      for (let i = 0; i < count; i++) {
        const vendor = generateVendor(i);

        // Validate schema
        const validation = await validator.validateColumns("vendors", vendor);
        if (!validation.valid) {
          result.errors.push(
            `Record ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        // Mask PII
        const masked = masker.maskRecord("vendors", vendor) as VendorData;
        records.push(masked);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(vendors).values(batch);
        result.inserted += batch.length;

        // Log progress for large batches
        if (count > 100 && (i + batchSize) % 100 === 0) {
          seedLogger.operationProgress(
            "seed:vendors",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("vendors", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:vendors",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}


