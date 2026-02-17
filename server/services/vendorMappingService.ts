/**
 * Vendor Mapping Service
 *
 * Part of Canonical Model Unification (Phase 3, Task 14.1)
 * Provides mapping between legacy vendor IDs and the unified clients table.
 *
 * This service translates vendor operations to client operations during
 * the migration period, supporting backward compatibility.
 *
 * **Validates: Requirements 7.1, 7.2, 8.2**
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { logger } from "../_core/logger";
import {
  clients,
  vendors,
  supplierProfiles,
  type Client,
  type SupplierProfile,
} from "../../drizzle/schema";

// ============================================================================
// Types
// ============================================================================

export interface VendorMappingService {
  /**
   * Get the client ID for a legacy vendor ID
   * Returns null if vendor hasn't been migrated
   */
  getClientIdForVendor(vendorId: number): Promise<number | null>;

  /**
   * Get supplier profile by legacy vendor ID
   * Returns null if vendor hasn't been migrated
   */
  getSupplierByLegacyVendorId(
    vendorId: number
  ): Promise<SupplierProfile | null>;

  /**
   * Migrate a vendor to the clients table
   * Creates a new client with isSeller=true and a supplier profile
   */
  migrateVendorToClient(vendorId: number): Promise<Client>;

  /**
   * Check if a vendor has been migrated
   */
  isVendorMigrated(vendorId: number): Promise<boolean>;

  /**
   * Get all unmigrated vendors
   */
  getUnmigratedVendors(): Promise<Array<{ id: number; name: string }>>;

  /**
   * Check for vendor-client name collisions
   */
  checkForCollisions(vendorId: number): Promise<{
    hasCollision: boolean;
    existingClient?: Client;
  }>;
}

export interface MigrationResult {
  success: boolean;
  clientId?: number;
  supplierProfileId?: number;
  error?: string;
}

export interface MigrationOptions {
  /** If true, don't actually perform the migration */
  dryRun?: boolean;
  /** Strategy for handling name collisions */
  collisionStrategy?: "merge" | "rename" | "skip";
  /** Suffix to add when renaming on collision */
  renameSuffix?: string;
}

// ============================================================================
// Implementation
// ============================================================================

/**
 * Generate a unique teriCode for a migrated vendor
 * Format: VEND-{vendorId padded to 6 digits}
 */
function generateTeriCodeForVendor(vendorId: number): string {
  return `VEND-${vendorId.toString().padStart(6, "0")}`;
}

/**
 * Get the client ID for a legacy vendor ID
 */
export async function getClientIdForVendor(
  vendorId: number
): Promise<number | null> {
  const db = await getDb();
  if (!db) return null;

  const profile = await db.query.supplierProfiles.findFirst({
    where: eq(supplierProfiles.legacyVendorId, vendorId),
    columns: { clientId: true },
  });

  return profile?.clientId ?? null;
}

/**
 * Get supplier profile by legacy vendor ID
 */
export async function getSupplierByLegacyVendorId(
  vendorId: number
): Promise<SupplierProfile | null> {
  const db = await getDb();
  if (!db) return null;

  const profile = await db.query.supplierProfiles.findFirst({
    where: eq(supplierProfiles.legacyVendorId, vendorId),
  });

  return profile ?? null;
}

/**
 * Check if a vendor has been migrated
 */
export async function isVendorMigrated(vendorId: number): Promise<boolean> {
  const clientId = await getClientIdForVendor(vendorId);
  return clientId !== null;
}

/**
 * Get all unmigrated vendors
 */
export async function getUnmigratedVendors(): Promise<
  Array<{ id: number; name: string }>
> {
  const db = await getDb();
  if (!db) return [];

  // Get all vendor IDs that have been migrated
  const migratedVendorIds = await db
    .select({ legacyVendorId: supplierProfiles.legacyVendorId })
    .from(supplierProfiles)
    .where(sql`${supplierProfiles.legacyVendorId} IS NOT NULL`);

  const migratedIds = new Set(
    migratedVendorIds
      .map((r: { legacyVendorId: number | null }) => r.legacyVendorId)
      .filter((id): id is number => id !== null)
  );

  // Get all vendors not in the migrated set
  const allVendors = await db
    .select({ id: vendors.id, name: vendors.name })
    .from(vendors);

  return allVendors.filter(
    (v: { id: number; name: string }) => !migratedIds.has(v.id)
  );
}

/**
 * Check for vendor-client name collisions
 */
export async function checkForCollisions(vendorId: number): Promise<{
  hasCollision: boolean;
  existingClient?: Client;
}> {
  const db = await getDb();
  if (!db) return { hasCollision: false };

  // Get the vendor
  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.id, vendorId),
  });

  if (!vendor) {
    return { hasCollision: false };
  }

  // Check for existing client with same name (case-insensitive)
  const existingClient = await db.query.clients.findFirst({
    where: sql`LOWER(${clients.name}) = LOWER(${vendor.name})`,
  });

  return {
    hasCollision: existingClient !== undefined,
    existingClient: existingClient ?? undefined,
  };
}

/**
 * Migrate a vendor to the clients table
 */
export async function migrateVendorToClient(
  vendorId: number,
  options: MigrationOptions = {}
): Promise<MigrationResult> {
  const db = await getDb();
  if (!db) {
    return { success: false, error: "Database not available" };
  }

  const {
    dryRun = false,
    collisionStrategy = "skip",
    renameSuffix = " (Vendor)",
  } = options;

  // Check if already migrated
  if (await isVendorMigrated(vendorId)) {
    const clientId = await getClientIdForVendor(vendorId);
    return {
      success: true,
      clientId: clientId ?? undefined,
      error: "Vendor already migrated",
    };
  }

  // Get the vendor
  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.id, vendorId),
  });

  if (!vendor) {
    return {
      success: false,
      error: `Vendor with ID ${vendorId} not found`,
    };
  }

  // Check for collisions
  const collision = await checkForCollisions(vendorId);

  if (collision.hasCollision) {
    if (collisionStrategy === "skip") {
      return {
        success: false,
        error: `Name collision with existing client: ${collision.existingClient?.name}`,
      };
    }

    if (collisionStrategy === "merge" && collision.existingClient) {
      // Merge: Use existing client, just create supplier profile
      if (dryRun) {
        return {
          success: true,
          clientId: collision.existingClient.id,
          error: "[DRY RUN] Would merge with existing client",
        };
      }

      // Create supplier profile for existing client
      const [supplierProfile] = await db
        .insert(supplierProfiles)
        .values({
          clientId: collision.existingClient.id,
          contactName: vendor.contactName,
          contactEmail: vendor.contactEmail,
          contactPhone: vendor.contactPhone,
          paymentTerms: vendor.paymentTerms,
          supplierNotes: vendor.notes,
          legacyVendorId: vendor.id,
        })
        .$returningId();

      // Update client to be a seller
      await db
        .update(clients)
        .set({ isSeller: true })
        .where(eq(clients.id, collision.existingClient.id));

      return {
        success: true,
        clientId: collision.existingClient.id,
        supplierProfileId: supplierProfile.id,
      };
    }

    // Rename strategy: append suffix to vendor name
    // Fall through to create new client with modified name
  }

  // Determine the client name
  let clientName = vendor.name;
  if (collision.hasCollision && collisionStrategy === "rename") {
    clientName = `${vendor.name}${renameSuffix}`;
  }

  if (dryRun) {
    return {
      success: true,
      error: `[DRY RUN] Would create client "${clientName}" with teriCode ${generateTeriCodeForVendor(vendorId)}`,
    };
  }

  // Create the client
  const [newClient] = await db
    .insert(clients)
    .values({
      teriCode: generateTeriCodeForVendor(vendorId),
      name: clientName,
      email: vendor.contactEmail,
      phone: vendor.contactPhone,
      isBuyer: false,
      isSeller: true,
      isBrand: false,
      isReferee: false,
      isContractor: false,
    })
    .$returningId();

  // Create the supplier profile
  const [supplierProfile] = await db
    .insert(supplierProfiles)
    .values({
      clientId: newClient.id,
      contactName: vendor.contactName,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
      paymentTerms: vendor.paymentTerms,
      supplierNotes: vendor.notes,
      legacyVendorId: vendor.id,
    })
    .$returningId();

  return {
    success: true,
    clientId: newClient.id,
    supplierProfileId: supplierProfile.id,
  };
}

/**
 * Batch migrate all unmigrated vendors
 */
export async function migrateAllVendors(
  options: MigrationOptions = {}
): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: Array<{ vendorId: number; error: string }>;
}> {
  const unmigrated = await getUnmigratedVendors();
  const results = {
    total: unmigrated.length,
    migrated: 0,
    skipped: 0,
    errors: [] as Array<{ vendorId: number; error: string }>,
  };

  for (const vendor of unmigrated) {
    const result = await migrateVendorToClient(vendor.id, options);

    if (result.success && !result.error?.includes("DRY RUN")) {
      results.migrated++;
    } else if (
      result.error?.includes("collision") ||
      result.error?.includes("already migrated")
    ) {
      results.skipped++;
    } else {
      results.errors.push({
        vendorId: vendor.id,
        error: result.error ?? "Unknown error",
      });
    }
  }

  return results;
}

// ============================================================================
// PO Legacy Bridge (TER-247: moved from purchaseOrders.ts)
// ============================================================================

/**
 * Resolve or create a legacy vendor ID for a given supplierClientId.
 *
 * This bridge function maintains the legacy bills.vendorId FK during the
 * transition period while the canonical model moves to supplierClientId.
 * The vendors table is allowed in this service (per CLAUDE.md approved list).
 *
 * @param supplierClientId - The canonical client ID with isSeller=true
 * @returns The legacy vendor ID
 */
export async function resolveOrCreateLegacyVendorId(
  supplierClientId: number
): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [supplierClient] = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.id, supplierClientId))
    .limit(1);

  if (!supplierClient) {
    throw new Error(`Client with ID ${supplierClientId} not found`);
  }

  const [existingProfile] = await db
    .select({
      id: supplierProfiles.id,
      legacyVendorId: supplierProfiles.legacyVendorId,
    })
    .from(supplierProfiles)
    .where(eq(supplierProfiles.clientId, supplierClientId))
    .limit(1);

  if (existingProfile?.legacyVendorId) {
    return existingProfile.legacyVendorId;
  }

  let resolvedVendorId: number | null = null;
  const [existingVendor] = await db
    .select({ id: vendors.id })
    .from(vendors)
    .where(eq(vendors.name, supplierClient.name))
    .limit(1);

  if (existingVendor) {
    resolvedVendorId = existingVendor.id;
  } else {
    try {
      const [createdVendor] = await db
        .insert(vendors)
        .values({ name: supplierClient.name })
        .$returningId();
      resolvedVendorId = createdVendor.id;

      logger.warn(
        {
          supplierClientId,
          vendorId: resolvedVendorId,
          supplierName: supplierClient.name,
        },
        "[PO] Auto-provisioned legacy vendor mapping for supplier"
      );
    } catch (error) {
      const [vendorAfterRace] = await db
        .select({ id: vendors.id })
        .from(vendors)
        .where(eq(vendors.name, supplierClient.name))
        .limit(1);
      if (!vendorAfterRace) {
        throw error;
      }
      resolvedVendorId = vendorAfterRace.id;
    }
  }

  if (!resolvedVendorId) {
    throw new Error("Unable to create or resolve legacy vendor mapping");
  }

  if (existingProfile) {
    await db
      .update(supplierProfiles)
      .set({ legacyVendorId: resolvedVendorId })
      .where(eq(supplierProfiles.id, existingProfile.id));
  } else {
    await db.insert(supplierProfiles).values({
      clientId: supplierClientId,
      legacyVendorId: resolvedVendorId,
    });
  }

  logger.info(
    { supplierClientId, vendorId: resolvedVendorId },
    "[PO] Linked supplier profile to legacy vendor"
  );

  return resolvedVendorId;
}

// ============================================================================
// Export service object
// ============================================================================

export const vendorMappingService: VendorMappingService = {
  getClientIdForVendor,
  getSupplierByLegacyVendorId,
  migrateVendorToClient: async (vendorId: number) => {
    const result = await migrateVendorToClient(vendorId);
    if (!result.success || !result.clientId) {
      throw new Error(result.error ?? "Migration failed");
    }
    const db = await getDb();
    if (!db) {
      throw new Error("Database not available");
    }
    const client = await db.query.clients.findFirst({
      where: eq(clients.id, result.clientId),
    });
    if (!client) {
      throw new Error("Client not found after migration");
    }
    return client;
  },
  isVendorMigrated,
  getUnmigratedVendors,
  checkForCollisions,
};

export default vendorMappingService;
