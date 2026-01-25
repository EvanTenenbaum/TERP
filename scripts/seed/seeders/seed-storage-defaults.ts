/**
 * Storage Sites and Zones Seeder
 *
 * Seeds default sites and storage zones for inventory management.
 * DATA-015: Seed Storage Sites and Zones
 *
 * Dependencies: drizzle/schema-storage.ts
 * Usage: npx tsx scripts/seed/seeders/seed-storage-defaults.ts
 */

import { db } from "../../db-sync";
import { sites, storageZones } from "../../../drizzle/schema-storage";
import { eq } from "drizzle-orm";

// ============================================================================
// Site Definitions
// ============================================================================

interface SiteDefinition {
  code: string;
  name: string;
  description: string;
  siteType:
    | "samples"
    | "storage"
    | "shipping"
    | "warehouse"
    | "office"
    | "custom";
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  contactName?: string;
  contactPhone?: string;
  color: string;
  displayOrder: number;
  isDefault?: boolean;
}

const SITES: SiteDefinition[] = [
  {
    code: "MAIN",
    name: "Main Warehouse",
    description: "Primary storage facility for all inventory",
    siteType: "warehouse",
    address: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    contactName: "Warehouse Manager",
    contactPhone: "555-0100",
    color: "#3B82F6",
    displayOrder: 1,
    isDefault: true,
  },
  {
    code: "SAMPLES",
    name: "Samples Room",
    description: "Dedicated storage for product samples",
    siteType: "samples",
    address: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    color: "#8B5CF6",
    displayOrder: 2,
  },
  {
    code: "SHIP",
    name: "Shipping Dock",
    description: "Outbound shipping and staging area",
    siteType: "shipping",
    address: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    color: "#F59E0B",
    displayOrder: 3,
  },
  {
    code: "COLD",
    name: "Cold Storage",
    description: "Temperature-controlled storage for sensitive products",
    siteType: "storage",
    address: "456 Industrial Avenue",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90002",
    color: "#06B6D4",
    displayOrder: 4,
  },
  {
    code: "RECV",
    name: "Receiving Bay",
    description: "Inbound receiving and inspection area",
    siteType: "warehouse",
    address: "123 Main Street",
    city: "Los Angeles",
    state: "CA",
    zipCode: "90001",
    color: "#10B981",
    displayOrder: 5,
  },
];

// ============================================================================
// Zone Definitions
// ============================================================================

interface ZoneDefinition {
  siteCode: string; // Reference to site
  code: string;
  name: string;
  description: string;
  temperatureControl: "ambient" | "cool" | "cold" | "frozen" | "controlled";
  accessLevel: "public" | "restricted" | "secure" | "high_security";
  maxCapacity?: number;
  capacityUnit?: string;
  minTemp?: number;
  maxTemp?: number;
  color: string;
  displayOrder: number;
}

const ZONES: ZoneDefinition[] = [
  // Main Warehouse Zones
  {
    siteCode: "MAIN",
    code: "A",
    name: "Zone A - General Storage",
    description: "General purpose storage for most products",
    temperatureControl: "ambient",
    accessLevel: "public",
    maxCapacity: 1000,
    capacityUnit: "units",
    minTemp: 60,
    maxTemp: 75,
    color: "#3B82F6",
    displayOrder: 1,
  },
  {
    siteCode: "MAIN",
    code: "B",
    name: "Zone B - Premium Storage",
    description: "Premium products and high-value inventory",
    temperatureControl: "ambient",
    accessLevel: "restricted",
    maxCapacity: 500,
    capacityUnit: "units",
    minTemp: 60,
    maxTemp: 75,
    color: "#10B981",
    displayOrder: 2,
  },
  {
    siteCode: "MAIN",
    code: "C",
    name: "Zone C - Bulk Storage",
    description: "Bulk inventory and large quantities",
    temperatureControl: "ambient",
    accessLevel: "public",
    maxCapacity: 2000,
    capacityUnit: "units",
    minTemp: 60,
    maxTemp: 75,
    color: "#F59E0B",
    displayOrder: 3,
  },
  {
    siteCode: "MAIN",
    code: "D",
    name: "Zone D - Quarantine",
    description: "Quarantine area for inspection and testing",
    temperatureControl: "ambient",
    accessLevel: "secure",
    maxCapacity: 200,
    capacityUnit: "units",
    color: "#EF4444",
    displayOrder: 4,
  },
  // Cold Storage Zones
  {
    siteCode: "COLD",
    code: "COLD-1",
    name: "Cold Zone 1 - Cool Storage",
    description: "Cool temperature storage (40-50°F)",
    temperatureControl: "cool",
    accessLevel: "restricted",
    maxCapacity: 300,
    capacityUnit: "units",
    minTemp: 4,
    maxTemp: 10,
    color: "#06B6D4",
    displayOrder: 1,
  },
  {
    siteCode: "COLD",
    code: "COLD-2",
    name: "Cold Zone 2 - Cold Storage",
    description: "Cold temperature storage (32-40°F)",
    temperatureControl: "cold",
    accessLevel: "restricted",
    maxCapacity: 200,
    capacityUnit: "units",
    minTemp: 0,
    maxTemp: 4,
    color: "#3B82F6",
    displayOrder: 2,
  },
  // Samples Room Zones
  {
    siteCode: "SAMPLES",
    code: "SAMPLE-A",
    name: "Active Samples",
    description: "Currently available samples for client viewing",
    temperatureControl: "ambient",
    accessLevel: "restricted",
    maxCapacity: 100,
    capacityUnit: "units",
    color: "#8B5CF6",
    displayOrder: 1,
  },
  {
    siteCode: "SAMPLES",
    code: "SAMPLE-R",
    name: "Reserved Samples",
    description: "Reserved samples for specific clients",
    temperatureControl: "ambient",
    accessLevel: "secure",
    maxCapacity: 50,
    capacityUnit: "units",
    color: "#EC4899",
    displayOrder: 2,
  },
  // Shipping Zones
  {
    siteCode: "SHIP",
    code: "STAGE",
    name: "Staging Area",
    description: "Orders staged for pickup or delivery",
    temperatureControl: "ambient",
    accessLevel: "public",
    maxCapacity: 100,
    capacityUnit: "orders",
    color: "#F59E0B",
    displayOrder: 1,
  },
  {
    siteCode: "SHIP",
    code: "OUTBOUND",
    name: "Outbound Dock",
    description: "Active outbound shipments",
    temperatureControl: "ambient",
    accessLevel: "public",
    maxCapacity: 20,
    capacityUnit: "shipments",
    color: "#EF4444",
    displayOrder: 2,
  },
];

// ============================================================================
// Seeder Functions
// ============================================================================

/**
 * Seed sites
 */
async function seedSites(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
  siteMap: Map<string, number>;
}> {
  console.info("\n🏢 Seeding storage sites...");

  const siteMap = new Map<string, number>();
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const site of SITES) {
    const existing = await db.query.sites.findFirst({
      where: eq(sites.code, site.code),
    });

    if (existing) {
      siteMap.set(site.code, existing.id);
      if (
        existing.description !== site.description ||
        existing.name !== site.name
      ) {
        await db
          .update(sites)
          .set({
            name: site.name,
            description: site.description,
            siteType: site.siteType,
            address: site.address,
            city: site.city,
            state: site.state,
            zipCode: site.zipCode,
            contactName: site.contactName,
            contactPhone: site.contactPhone,
            color: site.color,
            displayOrder: site.displayOrder,
          })
          .where(eq(sites.code, site.code));
        updated++;
        console.info(`  ↻ Updated: ${site.code} - ${site.name}`);
      } else {
        skipped++;
      }
    } else {
      const [result] = await db.insert(sites).values({
        code: site.code,
        name: site.name,
        description: site.description,
        siteType: site.siteType,
        address: site.address,
        city: site.city,
        state: site.state,
        zipCode: site.zipCode,
        contactName: site.contactName,
        contactPhone: site.contactPhone,
        color: site.color,
        displayOrder: site.displayOrder,
        isDefault: site.isDefault ?? false,
        isActive: true,
      });
      siteMap.set(site.code, Number(result.insertId));
      inserted++;
      console.info(`  ✓ Created: ${site.code} - ${site.name}`);
    }
  }

  return { inserted, updated, skipped, siteMap };
}

/**
 * Seed storage zones
 */
async function seedZones(
  siteMap: Map<string, number>
): Promise<{ inserted: number; updated: number; skipped: number }> {
  console.info("\n📦 Seeding storage zones...");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const zone of ZONES) {
    const siteId = siteMap.get(zone.siteCode);
    if (!siteId) {
      console.info(
        `  ⚠ Skipping zone ${zone.code}: Site ${zone.siteCode} not found`
      );
      skipped++;
      continue;
    }

    const existing = await db.query.storageZones.findFirst({
      where: eq(storageZones.code, zone.code),
    });

    if (existing) {
      if (
        existing.description !== zone.description ||
        existing.name !== zone.name
      ) {
        await db
          .update(storageZones)
          .set({
            name: zone.name,
            description: zone.description,
            siteId,
            temperatureControl: zone.temperatureControl,
            accessLevel: zone.accessLevel,
            maxCapacity: zone.maxCapacity?.toString(),
            capacityUnit: zone.capacityUnit,
            minTemp: zone.minTemp?.toString(),
            maxTemp: zone.maxTemp?.toString(),
            color: zone.color,
            displayOrder: zone.displayOrder,
          })
          .where(eq(storageZones.code, zone.code));
        updated++;
        console.info(`  ↻ Updated: ${zone.code} - ${zone.name}`);
      } else {
        skipped++;
      }
    } else {
      await db.insert(storageZones).values({
        code: zone.code,
        name: zone.name,
        description: zone.description,
        siteId,
        temperatureControl: zone.temperatureControl,
        accessLevel: zone.accessLevel,
        maxCapacity: zone.maxCapacity?.toString(),
        capacityUnit: zone.capacityUnit,
        minTemp: zone.minTemp?.toString(),
        maxTemp: zone.maxTemp?.toString(),
        color: zone.color,
        displayOrder: zone.displayOrder,
        isActive: true,
      });
      inserted++;
      console.info(`  ✓ Created: ${zone.code} - ${zone.name}`);
    }
  }

  return { inserted, updated, skipped };
}

// ============================================================================
// Main Seeder
// ============================================================================

export async function seedStorageDefaults(): Promise<void> {
  console.info("🏭 Seeding storage sites and zones...");

  const siteResults = await seedSites();
  const zoneResults = await seedZones(siteResults.siteMap);

  console.info(`\n✅ Storage seeding complete:`);
  console.info(
    `   Sites: ${siteResults.inserted} created, ${siteResults.updated} updated, ${siteResults.skipped} skipped`
  );
  console.info(
    `   Zones: ${zoneResults.inserted} created, ${zoneResults.updated} updated, ${zoneResults.skipped} skipped`
  );
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  seedStorageDefaults()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Failed to seed storage defaults:", err);
      process.exit(1);
    });
}
