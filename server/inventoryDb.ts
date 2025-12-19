/**
 * Inventory Database Query Helpers
 * Provides reusable database queries for inventory operations
 */

import { eq, and, or, like, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import cache, { CacheKeys, CacheTTL } from "./_core/cache";
import { generateStrainULID } from "./ulid";
import { optimisticUpdate } from "./utils/optimisticLock";
import {
  vendors,
  brands,
  products,
  productSynonyms,
  lots,
  batches,
  batchLocations,
  auditLogs,
  locations,
  categories,
  subcategories,
  grades,
  strains,
  orders,
  type InsertVendor,
  type InsertBrand,
  type InsertProduct,
  type InsertProductSynonym,
  type InsertLot,
  type InsertBatch,
  type InsertBatchLocation,
  type InsertAuditLog,
} from "../drizzle/schema";

// ============================================================================
// VENDOR QUERIES (DEPRECATED - Use Supplier functions below)
// ============================================================================

/**
 * Create vendor and invalidate cache
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cache invalidation
 * @deprecated Use createSupplier() instead - vendors table is deprecated
 */
export async function createVendor(vendor: InsertVendor) {
  console.warn('[DEPRECATED] createVendor() - use createSupplier() instead. Vendors table is deprecated.');
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(vendors).values(vendor);

  // Invalidate vendor cache
  cache.delete(CacheKeys.vendors());

  return result;
}

/**
 * @deprecated Use getSupplierByClientId() or getSupplierByLegacyVendorId() instead
 */
export async function getVendorById(id: number) {
  console.warn('[DEPRECATED] getVendorById() - use getSupplierByLegacyVendorId() instead. Vendors table is deprecated.');
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(vendors)
    .where(eq(vendors.id, id))
    .limit(1);
  return result[0] || null;
}

/**
 * Get all vendors with caching
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Caching for frequently accessed data
 * @deprecated Use getAllSuppliers() instead - vendors table is deprecated
 */
export async function getAllVendors() {
  console.warn('[DEPRECATED] getAllVendors() - use getAllSuppliers() instead. Vendors table is deprecated.');
  return await cache.getOrSet(
    CacheKeys.vendors(),
    async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(vendors).orderBy(vendors.name);
    },
    CacheTTL.LONG // 15 minutes
  );
}

/**
 * @deprecated Use searchSuppliers() instead - vendors table is deprecated
 */
export async function searchVendors(query: string) {
  console.warn('[DEPRECATED] searchVendors() - use searchSuppliers() instead. Vendors table is deprecated.');
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(vendors)
    .where(like(vendors.name, `%${query}%`))
    .limit(20);
}

// ============================================================================
// SUPPLIER QUERIES (Canonical - uses clients table with isSeller=true)
// Part of Canonical Model Unification - replaces deprecated vendor queries
// ============================================================================

import { clients, supplierProfiles, type Client, type SupplierProfile } from "../drizzle/schema";
import { asc } from "drizzle-orm";

/**
 * Supplier with profile - the canonical type for supplier data
 */
export interface SupplierWithProfile extends Client {
  supplierProfile: SupplierProfile | null;
}

/**
 * Get all suppliers (clients with isSeller=true)
 * Replaces deprecated getAllVendors()
 */
export async function getAllSuppliers(): Promise<SupplierWithProfile[]> {
  return await cache.getOrSet(
    CacheKeys.suppliers(),
    async () => {
      const db = await getDb();
      if (!db) return [];
      
      // Get all clients with isSeller=true
      const supplierClients = await db
        .select()
        .from(clients)
        .where(eq(clients.isSeller, true))
        .orderBy(asc(clients.name));
      
      // Get all supplier profiles
      const profiles = await db
        .select()
        .from(supplierProfiles);
      
      // Map profiles to clients
      const profileMap = new Map<number, SupplierProfile>();
      for (const profile of profiles) {
        profileMap.set(profile.clientId, profile);
      }
      
      // Combine clients with their profiles
      return supplierClients.map(client => ({
        ...client,
        supplierProfile: profileMap.get(client.id) || null,
      }));
    },
    CacheTTL.LONG // 15 minutes
  );
}

/**
 * Get supplier by client ID
 */
export async function getSupplierByClientId(clientId: number): Promise<SupplierWithProfile | null> {
  const db = await getDb();
  if (!db) return null;
  
  const [client] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, clientId), eq(clients.isSeller, true)))
    .limit(1);
  
  if (!client) return null;
  
  const [profile] = await db
    .select()
    .from(supplierProfiles)
    .where(eq(supplierProfiles.clientId, clientId))
    .limit(1);
  
  return {
    ...client,
    supplierProfile: profile || null,
  };
}

/**
 * Get supplier by legacy vendor ID (for backward compatibility during migration)
 */
export async function getSupplierByLegacyVendorId(vendorId: number): Promise<SupplierWithProfile | null> {
  const db = await getDb();
  if (!db) return null;
  
  // Find supplier profile with this legacy vendor ID
  const [profile] = await db
    .select()
    .from(supplierProfiles)
    .where(eq(supplierProfiles.legacyVendorId, vendorId))
    .limit(1);
  
  if (!profile) return null;
  
  // Get the associated client
  const [client] = await db
    .select()
    .from(clients)
    .where(eq(clients.id, profile.clientId))
    .limit(1);
  
  if (!client) return null;
  
  return {
    ...client,
    supplierProfile: profile,
  };
}

/**
 * Search suppliers by name
 */
export async function searchSuppliers(query: string): Promise<SupplierWithProfile[]> {
  const db = await getDb();
  if (!db) return [];
  
  // Search clients with isSeller=true
  const supplierClients = await db
    .select()
    .from(clients)
    .where(and(
      eq(clients.isSeller, true),
      like(clients.name, `%${query}%`)
    ))
    .limit(20);
  
  if (supplierClients.length === 0) return [];
  
  // Get profiles for these clients
  const clientIds = supplierClients.map(c => c.id);
  const profiles = await db
    .select()
    .from(supplierProfiles)
    .where(sql`${supplierProfiles.clientId} IN (${sql.join(clientIds.map(id => sql`${id}`), sql`, `)})`);
  
  // Map profiles to clients
  const profileMap = new Map<number, SupplierProfile>();
  for (const profile of profiles) {
    profileMap.set(profile.clientId, profile);
  }
  
  return supplierClients.map(client => ({
    ...client,
    supplierProfile: profileMap.get(client.id) || null,
  }));
}

/**
 * Create a new supplier (client with isSeller=true + supplier_profile)
 * Uses transaction to ensure atomicity - prevents orphaned clients if profile insert fails
 */
export async function createSupplier(data: {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentTerms?: string;
  notes?: string;
  licenseNumber?: string;
  taxId?: string;
  preferredPaymentMethod?: 'CASH' | 'CHECK' | 'WIRE' | 'ACH' | 'CREDIT_CARD' | 'OTHER';
}): Promise<{ clientId: number; profileId: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Generate TERI code for new supplier
  const teriCode = `SUP-${Date.now().toString(36).toUpperCase()}`;
  
  // Use transaction to ensure both client and profile are created atomically
  const result = await db.transaction(async (tx) => {
    // Create client with isSeller=true
    const [clientResult] = await tx.insert(clients).values({
      teriCode,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      address: data.address || null,
      isSeller: true,
      isBuyer: false,
    }).$returningId();
    
    const clientId = clientResult.id;
    
    // Create supplier profile
    const [profileResult] = await tx.insert(supplierProfiles).values({
      clientId,
      contactName: data.contactName || null,
      contactEmail: data.contactEmail || null,
      contactPhone: data.contactPhone || null,
      paymentTerms: data.paymentTerms || null,
      supplierNotes: data.notes || null,
      licenseNumber: data.licenseNumber || null,
      taxId: data.taxId || null,
      preferredPaymentMethod: data.preferredPaymentMethod || null,
    }).$returningId();
    
    return { clientId, profileId: profileResult.id };
  });
  
  // Invalidate cache after successful transaction
  cache.delete(CacheKeys.suppliers());
  
  return result;
}

/**
 * Update supplier (client + supplier_profile)
 * Uses transaction to ensure atomicity - prevents partial updates
 */
export async function updateSupplier(
  clientId: number,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    address?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    paymentTerms?: string;
    notes?: string;
    licenseNumber?: string;
    taxId?: string;
    preferredPaymentMethod?: 'CASH' | 'CHECK' | 'WIRE' | 'ACH' | 'CREDIT_CARD' | 'OTHER';
  }
): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Build update objects outside transaction for clarity
  const clientUpdates: Partial<Client> = {};
  if (data.name !== undefined) clientUpdates.name = data.name;
  if (data.email !== undefined) clientUpdates.email = data.email;
  if (data.phone !== undefined) clientUpdates.phone = data.phone;
  if (data.address !== undefined) clientUpdates.address = data.address;
  
  const profileUpdates: Partial<SupplierProfile> = {};
  if (data.contactName !== undefined) profileUpdates.contactName = data.contactName;
  if (data.contactEmail !== undefined) profileUpdates.contactEmail = data.contactEmail;
  if (data.contactPhone !== undefined) profileUpdates.contactPhone = data.contactPhone;
  if (data.paymentTerms !== undefined) profileUpdates.paymentTerms = data.paymentTerms;
  if (data.notes !== undefined) profileUpdates.supplierNotes = data.notes;
  if (data.licenseNumber !== undefined) profileUpdates.licenseNumber = data.licenseNumber;
  if (data.taxId !== undefined) profileUpdates.taxId = data.taxId;
  if (data.preferredPaymentMethod !== undefined) profileUpdates.preferredPaymentMethod = data.preferredPaymentMethod;
  
  // Use transaction to ensure both updates succeed or both fail
  await db.transaction(async (tx) => {
    // Update client fields if provided
    if (Object.keys(clientUpdates).length > 0) {
      await tx.update(clients).set(clientUpdates).where(eq(clients.id, clientId));
    }
    
    // Update supplier profile fields if provided
    if (Object.keys(profileUpdates).length > 0) {
      // Check if profile exists
      const [existingProfile] = await tx
        .select()
        .from(supplierProfiles)
        .where(eq(supplierProfiles.clientId, clientId))
        .limit(1);
      
      if (existingProfile) {
        await tx.update(supplierProfiles).set(profileUpdates).where(eq(supplierProfiles.clientId, clientId));
      } else {
        // Create profile if it doesn't exist (upsert pattern)
        await tx.insert(supplierProfiles).values({
          clientId,
          ...profileUpdates,
        });
      }
    }
  });
  
  // Invalidate cache after successful transaction
  cache.delete(CacheKeys.suppliers());
  
  return true;
}

/**
 * Soft-delete supplier (sets deletedAt on client)
 * Note: clients table doesn't have deletedAt yet, so we'll just mark isSeller=false for now
 */
export async function deleteSupplier(clientId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // For now, just mark as not a seller (soft disable)
  // TODO: Add deletedAt column to clients table for proper soft delete
  await db.update(clients).set({ isSeller: false }).where(eq(clients.id, clientId));
  
  // Invalidate cache
  cache.delete(CacheKeys.suppliers());
  
  return true;
}

// ============================================================================
// BRAND QUERIES
// ============================================================================

/**
 * Create brand and invalidate cache
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cache invalidation
 */
export async function createBrand(brand: InsertBrand) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(brands).values(brand);

  // Invalidate brand cache
  cache.delete(CacheKeys.brands());
  if (brand.vendorId) {
    cache.delete(CacheKeys.brands(brand.vendorId));
  }

  return result;
}

export async function getBrandById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(brands)
    .where(eq(brands.id, id))
    .limit(1);
  return result[0] || null;
}

/**
 * Get all brands with caching
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Caching for frequently accessed data
 */
export async function getAllBrands() {
  return await cache.getOrSet(
    CacheKeys.brands(),
    async () => {
      const db = await getDb();
      if (!db) return [];
      return await db.select().from(brands).orderBy(brands.name);
    },
    CacheTTL.LONG // 15 minutes
  );
}

export async function searchBrands(query: string) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(brands)
    .where(like(brands.name, `%${query}%`))
    .limit(20);
}

// ============================================================================
// PRODUCT QUERIES
// ============================================================================

export async function createProduct(product: InsertProduct) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(products).values(product);
  return result;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(products)
    .where(eq(products.id, id))
    .limit(1);
  return result[0] || null;
}

export async function findProductByNameAndBrand(
  nameCanonical: string,
  brandId: number
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(products)
    .where(
      and(
        eq(products.nameCanonical, nameCanonical),
        eq(products.brandId, brandId)
      )
    )
    .limit(1);

  return result[0] || null;
}

export async function addProductSynonym(synonym: InsertProductSynonym) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(productSynonyms).values(synonym);
}

// ============================================================================
// LOT QUERIES
// ============================================================================

export async function createLot(lot: InsertLot) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(lots).values(lot);
  return result;
}

export async function getLotById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(lots).where(eq(lots.id, id)).limit(1);
  return result[0] || null;
}

export async function getLotByCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(lots)
    .where(eq(lots.code, code))
    .limit(1);
  return result[0] || null;
}

// ============================================================================
// BATCH QUERIES
// ============================================================================

export async function createBatch(batch: InsertBatch) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(batches).values(batch);
  return result;
}

export async function getBatchById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(batches)
    .where(eq(batches.id, id))
    .limit(1);
  return result[0] || null;
}

export async function getBatchByCode(code: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(batches)
    .where(eq(batches.code, code))
    .limit(1);
  return result[0] || null;
}

export async function updateBatchStatus(
  id: number, 
  status: "AWAITING_INTAKE" | "LIVE" | "PHOTOGRAPHY_COMPLETE" | "ON_HOLD" | "QUARANTINED" | "SOLD_OUT" | "CLOSED",
  version?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (version !== undefined) {
    await optimisticUpdate(batches, id, { batchStatus: status }, version, db);
  } else {
    await db
      .update(batches)
      .set({ batchStatus: status })
      .where(eq(batches.id, id));
  }
}

export async function updateBatchQty(
  id: number,
  field:
    | "onHandQty"
    | "reservedQty"
    | "quarantineQty"
    | "holdQty"
    | "defectiveQty",
  value: string,
  version?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  if (version !== undefined) {
    await optimisticUpdate(batches, id, { [field]: value }, version, db);
  } else {
    await db
      .update(batches)
      .set({ [field]: value })
      .where(eq(batches.id, id));
  }
}

export async function getAllBatches(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(batches)
    .orderBy(desc(batches.createdAt))
    .limit(limit);
}

/**
 * Get batches with details using cursor-based pagination
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cursor-based pagination
 * @param limit - Maximum number of results to return
 * @param cursor - Optional cursor (batch ID) for pagination
 * @param filters - Optional filters (status, category)
 */
export async function getBatchesWithDetails(
  limit: number = 100,
  cursor?: number,
  filters?: { status?: string; category?: string }
) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null };

  // Build where conditions
  const conditions = [];
  if (cursor) {
    conditions.push(sql`${batches.id} < ${cursor}`);
  }
  if (filters?.status) {
    conditions.push(sql`${batches.batchStatus} = ${filters.status}`);
  }
  if (filters?.category) {
    conditions.push(eq(products.category, filters.category));
  }

  // Join batches with products, brands, lots, and vendors
  const query = db
    .select({
      batch: batches,
      product: products,
      brand: brands,
      lot: lots,
      vendor: vendors,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(lots, eq(batches.lotId, lots.id))
    .leftJoin(vendors, eq(lots.vendorId, vendors.id))
    .orderBy(desc(batches.id))
    .limit(limit + 1); // Fetch one extra to determine if there are more results

  // Apply conditions if any
  const result =
    conditions.length > 0 ? await query.where(and(...conditions)) : await query;

  // Determine next cursor
  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1].batch.id : null;

  return { items, nextCursor, hasMore };
}

/**
 * Search batches with cursor-based pagination
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cursor-based pagination
 */
export async function searchBatches(
  query: string,
  limit: number = 100,
  cursor?: number
) {
  const db = await getDb();
  if (!db) return { items: [], nextCursor: null, hasMore: false };

  // Build where conditions
  const searchCondition = sql`${batches.sku} LIKE ${`%${query}%`} 
      OR ${batches.code} LIKE ${`%${query}%`} 
      OR ${products.nameCanonical} LIKE ${`%${query}%`}
      OR ${vendors.name} LIKE ${`%${query}%`}
      OR ${brands.name} LIKE ${`%${query}%`}
      OR ${products.category} LIKE ${`%${query}%`}
      OR ${products.subcategory} LIKE ${`%${query}%`}
      OR ${batches.grade} LIKE ${`%${query}%`}`;

  const conditions = [searchCondition];
  if (cursor) {
    conditions.push(sql`${batches.id} < ${cursor}`);
  }

  // Multi-field search with cursor-based pagination
  const result = await db
    .select({
      batch: batches,
      product: products,
      brand: brands,
      lot: lots,
      vendor: vendors,
    })
    .from(batches)
    .leftJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .leftJoin(lots, eq(batches.lotId, lots.id))
    .leftJoin(vendors, eq(lots.vendorId, vendors.id))
    .where(and(...conditions))
    .orderBy(desc(batches.id))
    .limit(limit + 1);

  // Determine next cursor
  const hasMore = result.length > limit;
  const items = hasMore ? result.slice(0, limit) : result;
  const nextCursor =
    hasMore && items.length > 0 ? items[items.length - 1].batch.id : null;

  return { items, nextCursor, hasMore };
}

// ============================================================================
// BATCH LOCATION QUERIES
// ============================================================================

export async function createBatchLocation(location: InsertBatchLocation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(batchLocations).values(location);
}

export async function getBatchLocations(batchId: number) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(batchLocations)
    .where(eq(batchLocations.batchId, batchId));
}

// ============================================================================
// AUDIT LOG QUERIES
// ============================================================================

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(auditLogs).values(log);
}

export async function getAuditLogsForEntity(
  entity: string,
  entityId: number,
  limit: number = 50
) {
  const db = await getDb();
  if (!db) return [];

  return await db
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.entity, entity), eq(auditLogs.entityId, entityId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

// ============================================================================
// SEED DATA HELPERS
// ============================================================================

export async function seedInventoryData() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if data already exists
  const existingVendors = await getAllVendors();
  if (existingVendors.length > 0) {
    console.log("Inventory data already seeded");
    return;
  }

  // Create sample vendor
  await db.insert(vendors).values({
    name: "Green Valley Farms",
    contactName: "John Smith",
    contactEmail: "john@greenvalley.com",
    contactPhone: "555-0100",
    notes: "Primary cannabis supplier",
  });

  const vendorResult = await db.select().from(vendors).limit(1);
  const vendorId = vendorResult[0].id;

  // Create sample brand
  await db.insert(brands).values({
    name: "Premium Organics",
    vendorId: vendorId,
    description: "High-quality organic cannabis products",
  });

  const brandResult = await db.select().from(brands).limit(1);
  const brandId = brandResult[0].id;

  // Create sample products
  await db.insert(products).values([
    {
      brandId: brandId,
      nameCanonical: "Gelato #41",
      category: "Flower",
      subcategory: "Indica",
      uomSellable: "g",
      description: "Premium indica strain",
    },
    {
      brandId: brandId,
      nameCanonical: "Blue Dream",
      category: "Flower",
      subcategory: "Hybrid",
      uomSellable: "g",
      description: "Popular hybrid strain",
    },
    {
      brandId: brandId,
      nameCanonical: "Sour Diesel",
      category: "Flower",
      subcategory: "Sativa",
      uomSellable: "g",
      description: "Energizing sativa strain",
    },
  ]);

  const productResults = await db.select().from(products);

  // Create sample lot
  const lotCode = `LOT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-WH1`;
  await db.insert(lots).values({
    code: lotCode,
    vendorId: vendorId,
    date: new Date(),
    notes: "Initial inventory intake",
  });

  const lotResult = await db.select().from(lots).limit(1);
  const lotId = lotResult[0].id;

  // Create sample batches
  for (let i = 0; i < productResults.length; i++) {
    const product = productResults[i];
    const batchCode = `BCH-${lotCode}-${(i + 1).toString().padStart(2, "0")}`;
    const sku = `PREM-${product.nameCanonical.slice(0, 4).toUpperCase()}-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${(i + 1).toString().padStart(4, "0")}`;

    await db.insert(batches).values({
      code: batchCode,
      sku: sku,
      productId: product.id,
      lotId: lotId,
      batchStatus: "LIVE",
      grade: "A",
      isSample: 0,
      cogsMode: "FIXED",
      unitCogs: "25.00",
      paymentTerms: "NET_30",
      metadata: JSON.stringify({
        harvestCode: `HV-2024-${i + 1}`,
        potency: "22.5%",
        terpenes: "2.1%",
      }),
      onHandQty: "1000.00",
      reservedQty: "0.00",
      quarantineQty: "0.00",
      holdQty: "0.00",
      defectiveQty: "0.00",
      publishEcom: 1,
      publishB2b: 1,
    });
  }

  console.log("Inventory seed data created successfully");
}

// ============================================================================
// SETTINGS MANAGEMENT FUNCTIONS
// ============================================================================

// Locations
export async function getAllLocations() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(locations).orderBy(locations.site);
}

export async function createLocation(data: {
  site: string;
  zone?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(locations).values(data);
  return { success: true };
}

export async function updateLocation(data: {
  id: number;
  site: string;
  zone?: string;
  rack?: string;
  shelf?: string;
  bin?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const { id, ...updateData } = data;
  await db.update(locations).set(updateData).where(eq(locations.id, id));
  return { success: true };
}

export async function deleteLocation(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(locations).where(eq(locations.id, id));
  return { success: true };
}

// Categories
export async function getAllCategoriesWithSubcategories() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const categoriesData = await db
    .select()
    .from(categories)
    .orderBy(categories.name);
  const subcategoriesData = await db.select().from(subcategories);

  return categoriesData.map(category => ({
    ...category,
    subcategories: subcategoriesData.filter(
      sub => sub.categoryId === category.id
    ),
  }));
}

export async function createCategory(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(categories).values({ name });
  return { success: true };
}

export async function updateCategory(
  id: number,
  name: string,
  updateProducts: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(categories).set({ name }).where(eq(categories.id, id));

  if (updateProducts) {
    // Update all products using this category
    await db
      .update(products)
      .set({ category: name })
      .where(eq(products.category, name));
  }

  return { success: true };
}

export async function deleteCategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete associated subcategories first
  await db.delete(subcategories).where(eq(subcategories.categoryId, id));
  await db.delete(categories).where(eq(categories.id, id));
  return { success: true };
}

// Subcategories
export async function createSubcategory(categoryId: number, name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(subcategories).values({ categoryId, name });
  return { success: true };
}

export async function updateSubcategory(
  id: number,
  name: string,
  updateProducts: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const oldSubcategory = await db
    .select()
    .from(subcategories)
    .where(eq(subcategories.id, id))
    .limit(1);

  await db.update(subcategories).set({ name }).where(eq(subcategories.id, id));

  if (updateProducts && oldSubcategory.length > 0) {
    // Update all products using this subcategory
    await db
      .update(products)
      .set({ subcategory: name })
      .where(eq(products.subcategory, oldSubcategory[0].name));
  }

  return { success: true };
}

export async function deleteSubcategory(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(subcategories).where(eq(subcategories.id, id));
  return { success: true };
}

// Grades
export async function getAllGrades() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db.select().from(grades).orderBy(grades.name);
}

export async function createGrade(name: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(grades).values({ name });
  return { success: true };
}

export async function updateGrade(
  id: number,
  name: string,
  updateProducts: boolean
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const oldGrade = await db
    .select()
    .from(grades)
    .where(eq(grades.id, id))
    .limit(1);

  await db.update(grades).set({ name }).where(eq(grades.id, id));

  if (updateProducts && oldGrade.length > 0) {
    // Update all batches using this grade
    await db
      .update(batches)
      .set({ grade: name })
      .where(eq(batches.grade, oldGrade[0].name));
  }

  return { success: true };
}

export async function deleteGrade(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(grades).where(eq(grades.id, id));
  return { success: true };
}

// ============================================================================
// STRAINS
// ============================================================================

export async function getAllStrains(
  query?: string,
  category?: "indica" | "sativa" | "hybrid",
  limit: number = 100
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = [];

  if (query) {
    conditions.push(like(strains.name, `%${query}%`));
  }

  if (category) {
    conditions.push(eq(strains.category, category));
  }

  if (conditions.length > 0) {
    return await db
      .select()
      .from(strains)
      .where(and(...conditions))
      .limit(limit)
      .orderBy(strains.name);
  }

  return await db.select().from(strains).limit(limit).orderBy(strains.name);
}

export async function getStrainById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db
    .select()
    .from(strains)
    .where(eq(strains.id, id))
    .limit(1);
  return result[0] || null;
}

export async function searchStrains(query: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return await db
    .select()
    .from(strains)
    .where(like(strains.name, `%${query}%`))
    .limit(20)
    .orderBy(strains.name);
}

export async function createStrain(data: {
  name: string;
  category: "indica" | "sativa" | "hybrid";
  description?: string;
  aliases?: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Standardize the name (lowercase, trim, remove special chars)
  const standardizedName = data.name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  // Generate ULID for new strain (compatible with OpenTHC format)
  const newULID = generateStrainULID();

  const result = await db.insert(strains).values({
    name: data.name,
    standardizedName: standardizedName,
    category: data.category,
    description: data.description || null,
    aliases: data.aliases || null,
    openthcId: newULID,
    openthcStub: standardizedName,
  });

  return {
    success: true,
    strainId: Number((result as { insertId?: number }[])[0]?.insertId || 0),
    openthcId: newULID,
  };
}

// ============================================================================
// DASHBOARD STATISTICS
// ============================================================================

/**
 * Get comprehensive dashboard statistics for inventory
 * Includes inventory value, stock levels by category/subcategory, and status counts
 */
/**
 * Get dashboard statistics with caching
 * ✅ ENHANCED: TERP-INIT-005 Phase 4 - Caching for dashboard stats
 */
export async function getDashboardStats() {
  return await cache.getOrSet(
    CacheKeys.dashboardStats(),
    async () => {
      const db = await getDb();
      if (!db) return null;

      // Get all batches with product details for calculations
      const allBatches = await db
        .select({
          batchId: batches.id,
          batchStatus: batches.batchStatus,
          onHandQty: batches.onHandQty,
          unitCogs: batches.unitCogs,
          category: products.category,
          subcategory: products.subcategory,
        })
        .from(batches)
        .leftJoin(products, eq(batches.productId, products.id));

      // Calculate total inventory value
      let totalInventoryValue = 0;
      let totalUnits = 0;
      const categoryBreakdown: Record<
        string,
        { units: number; value: number }
      > = {};
      const subcategoryBreakdown: Record<
        string,
        { units: number; value: number }
      > = {};
      const statusCounts: Record<string, number> = {
        AWAITING_INTAKE: 0,
        LIVE: 0,
        ON_HOLD: 0,
        QUARANTINED: 0,
        SOLD_OUT: 0,
        CLOSED: 0,
      };

      for (const batch of allBatches) {
        const qty = parseFloat(batch.onHandQty);
        const cogs = parseFloat(batch.unitCogs || "0");
        const value = qty * cogs;

        // Total inventory value
        totalInventoryValue += value;
        totalUnits += qty;

        // Status counts
        if (
          batch.batchStatus &&
          Object.prototype.hasOwnProperty.call(statusCounts, batch.batchStatus)
        ) {
          statusCounts[batch.batchStatus]++;
        }

        // Category breakdown
        const category = batch.category || "Uncategorized";
        if (!categoryBreakdown[category]) {
          categoryBreakdown[category] = { units: 0, value: 0 };
        }
        categoryBreakdown[category].units += qty;
        categoryBreakdown[category].value += value;

        // Subcategory breakdown
        const subcategory = batch.subcategory || "None";
        if (!subcategoryBreakdown[subcategory]) {
          subcategoryBreakdown[subcategory] = { units: 0, value: 0 };
        }
        subcategoryBreakdown[subcategory].units += qty;
        subcategoryBreakdown[subcategory].value += value;
      }

      // Calculate average value per unit
      const avgValuePerUnit =
        totalUnits > 0 ? totalInventoryValue / totalUnits : 0;

      // Convert breakdowns to arrays and sort by value (descending)
      const categoryStats = Object.entries(categoryBreakdown)
        .map(([name, data]) => ({
          name,
          units: data.units,
          value: data.value,
        }))
        .sort((a, b) => b.value - a.value);

      const subcategoryStats = Object.entries(subcategoryBreakdown)
        .map(([name, data]) => ({
          name,
          units: data.units,
          value: data.value,
        }))
        .sort((a, b) => b.value - a.value);

      return {
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        avgValuePerUnit: Math.round(avgValuePerUnit * 100) / 100,
        totalUnits: Math.round(totalUnits * 100) / 100,
        statusCounts,
        categoryStats,
        subcategoryStats,
      };
    },
    CacheTTL.SHORT // 1 minute (dashboard data changes frequently)
  );
}

// ============================================================================
// SAVED VIEWS MANAGEMENT
// ============================================================================

/**
 * Get all inventory views for a user (their own + shared views)
 */
export async function getUserInventoryViews(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { inventoryViews, users } = await import("../drizzle/schema");

  const views = await db
    .select({
      id: inventoryViews.id,
      name: inventoryViews.name,
      filters: inventoryViews.filters,
      createdBy: inventoryViews.createdBy,
      createdByName: users.name,
      isShared: inventoryViews.isShared,
      createdAt: inventoryViews.createdAt,
    })
    .from(inventoryViews)
    .leftJoin(users, eq(inventoryViews.createdBy, users.id))
    .where(
      or(eq(inventoryViews.createdBy, userId), eq(inventoryViews.isShared, 1))
    )
    .orderBy(desc(inventoryViews.createdAt));

  return views;
}

/**
 * Save a new inventory view
 */
export async function saveInventoryView(input: {
  name: string;
  filters: Record<string, unknown>;
  createdBy: number;
  isShared?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { inventoryViews } = await import("../drizzle/schema");

  const [result] = await db
    .insert(inventoryViews)
    .values({
      name: input.name,
      filters: input.filters,
      createdBy: input.createdBy,
      isShared: input.isShared ? 1 : 0,
    })
    .$returningId();

  return { success: true, id: result.id };
}

/**
 * Delete an inventory view (only if user owns it)
 */
export async function deleteInventoryView(viewId: number, _userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { inventoryViews } = await import("../drizzle/schema");

  // Only allow deletion if user created the view
  await db
    .delete(inventoryViews)
    .where(
      and(eq(inventoryViews.id, viewId), eq(inventoryViews.createdBy, _userId))
    );

  return { success: true };
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Bulk update batch status
 * Updates multiple batches at once with validation
 */
export async function bulkUpdateBatchStatus(
  batchIds: number[],
  newStatus: "AWAITING_INTAKE" | "LIVE" | "PHOTOGRAPHY_COMPLETE" | "ON_HOLD" | "QUARANTINED" | "SOLD_OUT" | "CLOSED",
  _userId: number
): Promise<{ success: boolean; updated: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async tx => {
    let updated = 0;

    for (const batchId of batchIds) {
      // Get current batch
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batchId));
      if (!batch) continue;

      // Skip if already SOLD_OUT or CLOSED
      if (batch.batchStatus === "SOLD_OUT" || batch.batchStatus === "CLOSED") {
        continue;
      }

      // Update status
      await tx
        .update(batches)
        .set({
          batchStatus: newStatus,
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      updated++;
    }

    return { success: true, updated };
  });
}

/**
 * Bulk delete batches
 * Soft delete by setting status to CLOSED
 */
export async function bulkDeleteBatches(
  batchIds: number[],
  _userId: number
): Promise<{ success: boolean; deleted: number }> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return await db.transaction(async tx => {
    let deleted = 0;

    for (const batchId of batchIds) {
      // Get current batch
      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batchId));
      if (!batch) continue;

      // Skip if has remaining inventory
      const onHand = parseFloat(batch.onHandQty);
      if (onHand > 0) {
        throw new Error(
          `Cannot delete batch ${batchId}: Still has ${onHand} units in stock. ` +
            `Please move or sell inventory before deleting.`
        );
      }

      // Soft delete by setting status to CLOSED
      await tx
        .update(batches)
        .set({
          batchStatus: "CLOSED",
          updatedAt: new Date(),
        })
        .where(eq(batches.id, batchId));

      deleted++;
    }

    return { success: true, deleted };
  });
}

// ============================================================================
// PROFITABILITY ANALYSIS
// ============================================================================

/**
 * Calculate profitability metrics for a batch
 */
export async function calculateBatchProfitability(batchId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get batch details
  const [batch] = await db
    .select()
    .from(batches)
    .where(eq(batches.id, batchId));
  if (!batch) throw new Error("Batch not found");

  // Get all orders that include this batch
  const allOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.orderType, "SALE"));

  // Calculate totals
  const unitCogs = parseFloat(batch.unitCogs || "0");
  let totalRevenue = 0;
  let totalCost = 0;
  let unitsSold = 0;

  // Parse order items and find items for this batch
  for (const order of allOrders) {
    if (!order.items) continue;

    try {
      const items = JSON.parse(order.items as string) as Array<{
        batchId: number;
        quantity: number;
        unitPrice?: number;
        isSample?: boolean;
      }>;

      for (const item of items) {
        if (item.batchId === batchId && !item.isSample) {
          const qty = item.quantity;
          const price = item.unitPrice || 0;
          totalRevenue += qty * price;
          totalCost += qty * unitCogs;
          unitsSold += qty;
        }
      }
    } catch {
      // Skip orders with invalid JSON
      continue;
    }
  }

  const grossProfit = totalRevenue - totalCost;
  const marginPercent =
    totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  // Calculate potential profit (remaining inventory)
  const onHand = parseFloat(batch.onHandQty);
  const avgSellingPrice = unitsSold > 0 ? totalRevenue / unitsSold : 0;
  const potentialRevenue = onHand * avgSellingPrice;
  const potentialCost = onHand * unitCogs;
  const potentialProfit = potentialRevenue - potentialCost;

  return {
    batchId,
    unitCogs,
    unitsSold,
    totalRevenue,
    totalCost,
    grossProfit,
    marginPercent,
    avgSellingPrice,
    remainingUnits: onHand,
    potentialRevenue,
    potentialProfit,
  };
}

/**
 * Get top profitable batches
 */
export async function getTopProfitableBatches(limit: number = 10) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all batches
  const allBatches = await db.select().from(batches);

  // Calculate profitability for each and collect results
  const results = [];
  for (const batch of allBatches) {
    const profitability = await calculateBatchProfitability(batch.id);

    // Only include batches with sales
    if (profitability.unitsSold > 0) {
      results.push({
        ...profitability,
        sku: batch.sku,
        status: batch.batchStatus,
      });
    }
  }

  // Sort by gross profit and limit
  return results.sort((a, b) => b.grossProfit - a.grossProfit).slice(0, limit);
}

/**
 * Get overall profitability summary
 */
export async function getProfitabilitySummary() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all sale orders
  const allOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.orderType, "SALE"));

  let totalRevenue = 0;
  let totalCost = 0;
  let totalUnits = 0;
  const batchIds = new Set<number>();

  // Cache batches to avoid repeated queries - use Pick to only cache needed fields
  type BatchCacheEntry = Pick<typeof batches.$inferSelect, 'unitCogs' | 'onHandQty'>;
  const batchCache = new Map<number, BatchCacheEntry>();

  for (const order of allOrders) {
    if (!order.items) continue;

    try {
      const items = JSON.parse(order.items as string) as Array<{
        batchId: number;
        quantity: number;
        unitPrice?: number;
        isSample?: boolean;
      }>;

      for (const item of items) {
        if (item.isSample) continue;

        batchIds.add(item.batchId);
        const qty = item.quantity;
        const price = item.unitPrice || 0;
        totalRevenue += qty * price;
        totalUnits += qty;

        // Get batch cost (with caching)
        if (!batchCache.has(item.batchId)) {
          const [batch] = await db
            .select({ unitCogs: batches.unitCogs, onHandQty: batches.onHandQty })
            .from(batches)
            .where(eq(batches.id, item.batchId));
          if (batch) {
            batchCache.set(item.batchId, batch);
          }
        }

        const batch = batchCache.get(item.batchId);
        if (batch) {
          totalCost += qty * parseFloat(batch.unitCogs || "0");
        }
      }
    } catch {
      // Skip orders with invalid JSON
      continue;
    }
  }

  const grossProfit = totalRevenue - totalCost;
  const avgMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

  return {
    totalRevenue,
    totalCost,
    grossProfit,
    avgMargin,
    totalUnits,
    batchesWithSales: batchIds.size,
  };
}


// ============================================================================
// VENDOR BATCH QUERIES
// ============================================================================

/**
 * Get all batches supplied by a specific vendor
 * Joins batches → lots → filter by vendorId
 * @param vendorId - The vendor ID to filter by
 * @returns Array of batches with their associated lot and product data
 * _Requirements: 7.1, 7.2_
 */
export async function getBatchesByVendor(vendorId: number) {
  const db = await getDb();
  if (!db) return [];

  // Join batches → lots → filter by vendorId
  const result = await db
    .select({
      batch: batches,
      lot: lots,
      product: products,
      brand: brands,
    })
    .from(batches)
    .innerJoin(lots, eq(batches.lotId, lots.id))
    .leftJoin(products, eq(batches.productId, products.id))
    .leftJoin(brands, eq(products.brandId, brands.id))
    .where(eq(lots.vendorId, vendorId))
    .orderBy(desc(batches.createdAt));

  return result;
}
