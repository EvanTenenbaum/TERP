/**
 * Storage Module Seed Data
 * DATA-015: Seeds the database with default storage configuration
 *
 * Includes:
 * - Site definitions (Samples, Main Storage, Shipping Dock)
 * - Storage zones per site (A, B, C, D zones with temperature control)
 */

import { getDb } from "../db";
import { sites, storageZones } from "../../drizzle/schema-storage";
import { logger } from "../_core/logger";
import { eq } from "drizzle-orm";

/**
 * Default site definitions
 */
const DEFAULT_SITES = [
  {
    code: "SAMPLES",
    name: "Samples Vault",
    description:
      "Secure storage for product samples and quality control specimens",
    siteType: "samples" as const,
    address: "123 Sample St",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    color: "#8B5CF6",
    displayOrder: 1,
    isDefault: false,
    operatingHours: {
      monday: { open: "09:00", close: "17:00" },
      tuesday: { open: "09:00", close: "17:00" },
      wednesday: { open: "09:00", close: "17:00" },
      thursday: { open: "09:00", close: "17:00" },
      friday: { open: "09:00", close: "17:00" },
    },
  },
  {
    code: "MAIN",
    name: "Main Storage",
    description:
      "Primary warehouse for inventory storage and order fulfillment",
    siteType: "storage" as const,
    address: "456 Warehouse Blvd",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90002",
    color: "#10B981",
    displayOrder: 2,
    isDefault: true,
    operatingHours: {
      monday: { open: "06:00", close: "22:00" },
      tuesday: { open: "06:00", close: "22:00" },
      wednesday: { open: "06:00", close: "22:00" },
      thursday: { open: "06:00", close: "22:00" },
      friday: { open: "06:00", close: "22:00" },
      saturday: { open: "08:00", close: "16:00" },
    },
  },
  {
    code: "SHIP",
    name: "Shipping Dock",
    description: "Outbound shipping and logistics hub",
    siteType: "shipping" as const,
    address: "789 Logistics Way",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90003",
    color: "#F59E0B",
    displayOrder: 3,
    isDefault: false,
    operatingHours: {
      monday: { open: "05:00", close: "21:00" },
      tuesday: { open: "05:00", close: "21:00" },
      wednesday: { open: "05:00", close: "21:00" },
      thursday: { open: "05:00", close: "21:00" },
      friday: { open: "05:00", close: "21:00" },
      saturday: { open: "06:00", close: "14:00" },
    },
  },
];

/**
 * Storage zone templates per site type
 */
const ZONE_TEMPLATES = {
  samples: [
    {
      code: "VAULT-A",
      name: "Sample Vault A",
      description: "Primary sample storage - controlled temperature",
      temperatureControl: "controlled" as const,
      accessLevel: "secure" as const,
      maxCapacity: "1000",
      color: "#8B5CF6",
      displayOrder: 1,
      minTemp: "18.00",
      maxTemp: "22.00",
    },
    {
      code: "VAULT-B",
      name: "Sample Vault B",
      description: "Secondary sample storage - cold",
      temperatureControl: "cold" as const,
      accessLevel: "secure" as const,
      maxCapacity: "500",
      color: "#3B82F6",
      displayOrder: 2,
      minTemp: "2.00",
      maxTemp: "8.00",
    },
    {
      code: "QC-LAB",
      name: "QC Lab Staging",
      description: "Samples awaiting quality control testing",
      temperatureControl: "ambient" as const,
      accessLevel: "restricted" as const,
      maxCapacity: "200",
      color: "#F59E0B",
      displayOrder: 3,
    },
  ],
  storage: [
    {
      code: "A",
      name: "Zone A - Ambient",
      description: "General storage at room temperature",
      temperatureControl: "ambient" as const,
      accessLevel: "public" as const,
      maxCapacity: "10000",
      color: "#10B981",
      displayOrder: 1,
    },
    {
      code: "B",
      name: "Zone B - Cool",
      description: "Temperature-controlled cool storage",
      temperatureControl: "cool" as const,
      accessLevel: "public" as const,
      maxCapacity: "5000",
      color: "#3B82F6",
      displayOrder: 2,
      minTemp: "10.00",
      maxTemp: "15.00",
    },
    {
      code: "C",
      name: "Zone C - Cold",
      description: "Refrigerated storage",
      temperatureControl: "cold" as const,
      accessLevel: "restricted" as const,
      maxCapacity: "2500",
      color: "#06B6D4",
      displayOrder: 3,
      minTemp: "2.00",
      maxTemp: "8.00",
    },
    {
      code: "D",
      name: "Zone D - Secure",
      description: "High-security storage for premium products",
      temperatureControl: "controlled" as const,
      accessLevel: "high_security" as const,
      maxCapacity: "1000",
      color: "#EF4444",
      displayOrder: 4,
      minTemp: "18.00",
      maxTemp: "22.00",
    },
    {
      code: "QUARANTINE",
      name: "Quarantine Zone",
      description: "Isolated storage for products under review",
      temperatureControl: "ambient" as const,
      accessLevel: "secure" as const,
      maxCapacity: "500",
      color: "#F97316",
      displayOrder: 10,
    },
  ],
  shipping: [
    {
      code: "STAGING",
      name: "Staging Area",
      description: "Orders staged for pickup or delivery",
      temperatureControl: "ambient" as const,
      accessLevel: "public" as const,
      maxCapacity: "2000",
      color: "#F59E0B",
      displayOrder: 1,
    },
    {
      code: "DOCK-1",
      name: "Dock 1 - Outbound",
      description: "Primary outbound shipping dock",
      temperatureControl: "ambient" as const,
      accessLevel: "public" as const,
      maxCapacity: "500",
      color: "#EF4444",
      displayOrder: 2,
    },
    {
      code: "DOCK-2",
      name: "Dock 2 - Receiving",
      description: "Returns and receiving dock",
      temperatureControl: "ambient" as const,
      accessLevel: "public" as const,
      maxCapacity: "500",
      color: "#10B981",
      displayOrder: 3,
    },
    {
      code: "PICKUP",
      name: "Client Pickup",
      description: "Designated area for client order pickups",
      temperatureControl: "ambient" as const,
      accessLevel: "public" as const,
      maxCapacity: "200",
      color: "#8B5CF6",
      displayOrder: 4,
    },
  ],
};

/**
 * Seed storage data into the database
 *
 * This function is idempotent - it will only create entries that don't exist.
 * Existing entries will not be modified.
 *
 * @returns Object with counts of created and skipped items
 */
export async function seedStorage(): Promise<{
  sites: { created: number; skipped: number };
  zones: { created: number; skipped: number };
  errors: string[];
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = {
    sites: { created: 0, skipped: 0 },
    zones: { created: 0, skipped: 0 },
    errors: [] as string[],
  };

  logger.info("[Storage] Starting seed");

  // Seed sites first
  const siteMap: Record<string, number> = {};

  for (const site of DEFAULT_SITES) {
    try {
      const [existing] = await db
        .select()
        .from(sites)
        .where(eq(sites.code, site.code))
        .limit(1);

      if (existing) {
        result.sites.skipped++;
        siteMap[site.code] = existing.id;
        continue;
      }

      const [inserted] = await db.insert(sites).values(site);
      siteMap[site.code] = inserted.insertId;
      result.sites.created++;
      logger.debug({ code: site.code }, "[Storage] Site created");
    } catch (error) {
      const msg = `Failed to seed site ${site.code}: ${error}`;
      logger.error({ error }, msg);
      result.errors.push(msg);
    }
  }

  // Seed zones for each site
  for (const site of DEFAULT_SITES) {
    const siteId = siteMap[site.code];
    if (!siteId) {
      result.errors.push(`Cannot seed zones for ${site.code}: site not found`);
      continue;
    }

    // Get zone template based on site type
    const zones =
      ZONE_TEMPLATES[site.siteType as keyof typeof ZONE_TEMPLATES] ||
      ZONE_TEMPLATES.storage;

    for (const zone of zones) {
      try {
        const [existing] = await db
          .select()
          .from(storageZones)
          .where(eq(storageZones.code, `${site.code}-${zone.code}`))
          .limit(1);

        if (existing) {
          result.zones.skipped++;
          continue;
        }

        await db.insert(storageZones).values({
          ...zone,
          code: `${site.code}-${zone.code}`,
          siteId,
        });
        result.zones.created++;
        logger.debug(
          { code: `${site.code}-${zone.code}` },
          "[Storage] Zone created"
        );
      } catch (error) {
        const msg = `Failed to seed zone ${site.code}-${zone.code}: ${error}`;
        logger.error({ error }, msg);
        result.errors.push(msg);
      }
    }
  }

  logger.info(
    {
      sites: result.sites,
      zones: result.zones,
      errorCount: result.errors.length,
    },
    "[Storage] Seed complete"
  );

  return result;
}

// Allow running directly
if (require.main === module) {
  seedStorage()
    .then(result => {
      console.info("Storage seed complete:", JSON.stringify(result, null, 2));
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error("Storage seed failed:", error);
      process.exit(1);
    });
}
