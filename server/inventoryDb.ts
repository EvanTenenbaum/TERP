/**
 * Inventory Database Query Helpers
 * Provides reusable database queries for inventory operations
 */

import { eq, and, like, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import {
  vendors,
  brands,
  products,
  productSynonyms,
  lots,
  batches,
  batchLocations,
  auditLogs,
  type InsertVendor,
  type InsertBrand,
  type InsertProduct,
  type InsertProductSynonym,
  type InsertLot,
  type InsertBatch,
  type InsertBatchLocation,
  type InsertAuditLog,
  type Batch,
} from "../drizzle/schema";

// ============================================================================
// VENDOR QUERIES
// ============================================================================

export async function createVendor(vendor: InsertVendor) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(vendors).values(vendor);
  return result;
}

export async function getVendorById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllVendors() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(vendors).orderBy(vendors.name);
}

export async function searchVendors(query: string) {
  const db = await getDb();
  if (!db) return [];
  
  return await db
    .select()
    .from(vendors)
    .where(like(vendors.name, `%${query}%`))
    .limit(20);
}

// ============================================================================
// BRAND QUERIES
// ============================================================================

export async function createBrand(brand: InsertBrand) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(brands).values(brand);
  return result;
}

export async function getBrandById(id: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(brands).where(eq(brands.id, id)).limit(1);
  return result[0] || null;
}

export async function getAllBrands() {
  const db = await getDb();
  if (!db) return [];
  
  return await db.select().from(brands).orderBy(brands.name);
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
  
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result[0] || null;
}

export async function findProductByNameAndBrand(nameCanonical: string, brandId: number) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db
    .select()
    .from(products)
    .where(and(eq(products.nameCanonical, nameCanonical), eq(products.brandId, brandId)))
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
  
  const result = await db.select().from(lots).where(eq(lots.code, code)).limit(1);
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
  
  const result = await db.select().from(batches).where(eq(batches.id, id)).limit(1);
  return result[0] || null;
}

export async function getBatchByCode(code: string) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select().from(batches).where(eq(batches.code, code)).limit(1);
  return result[0] || null;
}

export async function updateBatchStatus(id: number, status: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(batches).set({ status: status as any }).where(eq(batches.id, id));
}

export async function updateBatchQty(
  id: number,
  field: "onHandQty" | "reservedQty" | "quarantineQty" | "holdQty" | "defectiveQty",
  value: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(batches).set({ [field]: value }).where(eq(batches.id, id));
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

export async function getBatchesWithDetails(limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  // Join batches with products, brands, lots, and vendors
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
    .orderBy(desc(batches.createdAt))
    .limit(limit);
  
  return result;
}

export async function searchBatches(query: string, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  
  // Search by SKU, batch code, or product name
  return await db
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
    .where(
      sql`${batches.sku} LIKE ${`%${query}%`} OR ${batches.code} LIKE ${`%${query}%`} OR ${products.nameCanonical} LIKE ${`%${query}%`}`
    )
    .orderBy(desc(batches.createdAt))
    .limit(limit);
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

export async function getAuditLogsForEntity(entity: string, entityId: number, limit: number = 50) {
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
    siteCode: "WH1",
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
      status: "LIVE",
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

