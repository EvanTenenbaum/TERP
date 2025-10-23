import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /**
   * Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user.
   * This mirrors the Manus account and should be used for authentication lookups.
   */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// INVENTORY MODULE SCHEMA
// ============================================================================

/**
 * Batch Status Enum
 * Represents the lifecycle state of an inventory batch
 */
export const batchStatusEnum = mysqlEnum("batchStatus", [
  "AWAITING_INTAKE",
  "QC_PENDING",
  "LIVE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED"
]);

/**
 * COGS Mode Enum
 * Defines how cost of goods sold is calculated
 */
export const cogsModeEnum = mysqlEnum("cogsMode", [
  "FIXED",
  "FLOOR",
  "RANGE"
]);

/**
 * Payment Terms Enum
 * Defines payment terms for vendor transactions
 */
export const paymentTermsEnum = mysqlEnum("paymentTerms", [
  "COD",
  "NET_7",
  "NET_15",
  "NET_30",
  "CONSIGNMENT",
  "PARTIAL"
]);

/**
 * Vendors table
 * Represents suppliers/vendors who provide products
 */
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

/**
 * Brands table
 * Represents product brands (may be same as vendor or different)
 */
export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  vendorId: int("vendorId"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

/**
 * Products table
 * Represents sellable product definitions
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  nameCanonical: varchar("nameCanonical", { length: 500 }).notNull(),
  category: varchar("category", { length: 100 }).notNull(),
  subcategory: varchar("subcategory", { length: 100 }),
  uomSellable: varchar("uomSellable", { length: 20 }).notNull().default("EA"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Product Synonyms table
 * Stores alternative names for products to improve search
 */
export const productSynonyms = mysqlTable("productSynonyms", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  synonym: varchar("synonym", { length: 500 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductSynonym = typeof productSynonyms.$inferSelect;
export type InsertProductSynonym = typeof productSynonyms.$inferInsert;

/**
 * Lots table
 * Represents a single vendor intake event (system-only, not client-facing)
 */
export const lots = mysqlTable("lots", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  vendorId: int("vendorId").notNull(),
  date: timestamp("date").notNull(),
  siteCode: varchar("siteCode", { length: 20 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lot = typeof lots.$inferSelect;
export type InsertLot = typeof lots.$inferInsert;

/**
 * Batches table
 * Represents sellable units of a specific product within a lot
 */
export const batches = mysqlTable("batches", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  sku: varchar("sku", { length: 100 }).notNull().unique(),
  productId: int("productId").notNull(),
  lotId: int("lotId").notNull(),
  status: batchStatusEnum.notNull().default("AWAITING_INTAKE"),
  grade: varchar("grade", { length: 10 }),
  isSample: int("isSample").notNull().default(0), // 0 = false, 1 = true
  cogsMode: cogsModeEnum.notNull(),
  unitCogs: varchar("unitCogs", { length: 20 }), // FIXED
  unitCogsFloor: varchar("unitCogsFloor", { length: 20 }), // FLOOR
  unitCogsMin: varchar("unitCogsMin", { length: 20 }), // RANGE
  unitCogsMax: varchar("unitCogsMax", { length: 20 }), // RANGE
  paymentTerms: paymentTermsEnum.notNull(),
  metadata: text("metadata"), // JSON string: test results, harvest code, COA, etc.
  onHandQty: varchar("onHandQty", { length: 20 }).notNull().default("0"),
  reservedQty: varchar("reservedQty", { length: 20 }).notNull().default("0"),
  quarantineQty: varchar("quarantineQty", { length: 20 }).notNull().default("0"),
  holdQty: varchar("holdQty", { length: 20 }).notNull().default("0"),
  defectiveQty: varchar("defectiveQty", { length: 20 }).notNull().default("0"),
  publishEcom: int("publishEcom").notNull().default(0), // 0 = false, 1 = true
  publishB2b: int("publishB2b").notNull().default(0), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Batch = typeof batches.$inferSelect;
export type InsertBatch = typeof batches.$inferInsert;

/**
 * Batch Locations table
 * Tracks physical location of batch quantities
 */
export const batchLocations = mysqlTable("batchLocations", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  site: varchar("site", { length: 100 }).notNull(),
  zone: varchar("zone", { length: 100 }),
  rack: varchar("rack", { length: 100 }),
  shelf: varchar("shelf", { length: 100 }),
  bin: varchar("bin", { length: 100 }),
  qty: varchar("qty", { length: 20 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BatchLocation = typeof batchLocations.$inferSelect;
export type InsertBatchLocation = typeof batchLocations.$inferInsert;

/**
 * Audit Log table
 * Immutable append-only log of all inventory actions
 */
export const auditLogs = mysqlTable("auditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorId: int("actorId").notNull(),
  entity: varchar("entity", { length: 50 }).notNull(),
  entityId: int("entityId").notNull(),
  action: varchar("action", { length: 100 }).notNull(),
  before: text("before"), // JSON string
  after: text("after"), // JSON string
  reason: text("reason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;