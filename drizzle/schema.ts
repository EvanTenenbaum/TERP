import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
  date,
  index,
  unique,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

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
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
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
// DASHBOARD PREFERENCES
// ============================================================================

/**
 * Widget Configuration Type
 * Represents the structure of widget preferences stored in JSON
 */
export interface WidgetConfig {
  id: string;
  isVisible: boolean;
  order?: number;
  settings?: Record<string, unknown>;
}

/**
 * User Dashboard Preferences table
 * Stores user-specific dashboard customization preferences for cross-device sync
 */
export const userDashboardPreferences = mysqlTable("userDashboardPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  activeLayout: varchar("activeLayout", { length: 50 })
    .notNull()
    .default("operations"),
  widgetConfig: json("widgetConfig").$type<WidgetConfig[]>().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserDashboardPreferences =
  typeof userDashboardPreferences.$inferSelect;
export type InsertUserDashboardPreferences =
  typeof userDashboardPreferences.$inferInsert;

/**
 * Relations for userDashboardPreferences
 */
export const userDashboardPreferencesRelations = relations(
  userDashboardPreferences,
  ({ one }) => ({
    user: one(users, {
      fields: [userDashboardPreferences.userId],
      references: [users.id],
    }),
  })
);

// ============================================================================
// INVENTORY MODULE SCHEMA
// ============================================================================

/**
 * Batch Status Enum
 * Represents the lifecycle state of an inventory batch
 * REMOVED: QC_PENDING (per user feedback)
 * ADDED: PHOTOGRAPHY_COMPLETE (sub-status under LIVE)
 */
export const batchStatusEnum = mysqlEnum("batchStatus", [
  "AWAITING_INTAKE",
  "LIVE",
  "PHOTOGRAPHY_COMPLETE",
  "ON_HOLD",
  "QUARANTINED",
  "SOLD_OUT",
  "CLOSED",
]);

/**
 * COGS Mode Enum
 * Defines how cost of goods sold is calculated
 * SIMPLIFIED: Removed FLOOR, kept only FIXED and RANGE
 */
export const cogsModeEnum = mysqlEnum("cogsMode", ["FIXED", "RANGE"]);

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
  "PARTIAL",
]);

/**
 * Ownership Type Enum (MEET-006)
 * Defines how inventory is owned - consigned from vendor, office-owned, or sample
 */
export const ownershipTypeEnum = mysqlEnum("ownership_type", [
  "CONSIGNED",     // Inventory consigned from vendor - payable due when sold
  "OFFICE_OWNED",  // Office purchased outright - no payable to vendor
  "SAMPLE",        // Sample inventory - not for sale
]);

/**
 * Vendors table
 * Represents suppliers/vendors who provide products
 * 
 * @deprecated As of 2025-12-16, vendors have been migrated to the unified clients table.
 * Use clients with isSeller=true and supplier_profiles for vendor data.
 * 
 * Migration mapping:
 * - Vendor data → clients table (with isSeller=true)
 * - Vendor-specific fields → supplier_profiles table
 * - Legacy vendor ID → supplier_profiles.legacy_vendor_id
 * 
 * To get client ID for a vendor: 
 *   SELECT client_id FROM supplier_profiles WHERE legacy_vendor_id = ?
 * 
 * This table will be removed in a future release after all references are updated.
 */
export const vendors = mysqlTable("vendors", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 50 }),
  paymentTerms: varchar("paymentTerms", { length: 100 }), // e.g., "Net 30", "Net 60", "Due on Receipt"
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Vendor = typeof vendors.$inferSelect;
export type InsertVendor = typeof vendors.$inferInsert;

/**
 * Vendor Notes table
 * Timestamped notes for vendors with user attribution
 * Feature: MF-016 Vendor Notes & History
 */
export const vendorNotes = mysqlTable("vendorNotes", {
  id: int("id").autoincrement().primaryKey(),
  vendorId: int("vendorId")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  note: text("note").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type VendorNote = typeof vendorNotes.$inferSelect;
export type InsertVendorNote = typeof vendorNotes.$inferInsert;
// Add this after vendorNotes table (around line 175)

/**
 * Purchase Order Status Enum
 * Tracks the lifecycle of a purchase order
 */
export const purchaseOrderStatusEnum = mysqlEnum("purchaseOrderStatus", [
  "DRAFT", // Being created
  "SENT", // Sent to vendor
  "CONFIRMED", // Vendor confirmed
  "RECEIVING", // Partially received
  "RECEIVED", // Fully received
  "CANCELLED", // Cancelled before completion
]);

/**
 * Purchase Orders table
 * Optional documents created from intake sessions for vendor communication
 * Feature: MF-018 Purchase Order Creation
 */
export const purchaseOrders = mysqlTable(
  "purchaseOrders",
  {
    id: int("id").autoincrement().primaryKey(),
    poNumber: varchar("poNumber", { length: 50 }).notNull().unique(),

    // Supplier relationship (canonical - uses clients table)
    supplierClientId: int("supplier_client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),

    // Vendor relationship (DEPRECATED - use supplierClientId instead)
    // Kept for backward compatibility during migration
    vendorId: int("vendorId")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),

    // Optional link to intake session (if PO created from intake)
    intakeSessionId: int("intakeSessionId").references(
      () => intakeSessions.id,
      { onDelete: "set null" }
    ),

    // Status and dates
    purchaseOrderStatus: purchaseOrderStatusEnum.notNull().default("DRAFT"),
    orderDate: date("orderDate").notNull(),
    expectedDeliveryDate: date("expectedDeliveryDate"),
    actualDeliveryDate: date("actualDeliveryDate"),

    // Financial
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).default("0"),
    tax: decimal("tax", { precision: 15, scale: 2 }).default("0"),
    shipping: decimal("shipping", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).default("0"),

    // Payment
    paymentTerms: varchar("paymentTerms", { length: 100 }),
    paymentDueDate: date("paymentDueDate"),

    // Notes
    notes: text("notes"),
    vendorNotes: text("vendorNotes"), // Notes visible to vendor

    // Tracking
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    sentAt: timestamp("sentAt"),
    confirmedAt: timestamp("confirmedAt"),
  },
  table => ({
    supplierClientIdIdx: index("idx_po_supplier_client_id").on(
      table.supplierClientId
    ),
    vendorIdIdx: index("idx_po_vendor_id").on(table.vendorId),
    statusIdx: index("idx_po_status").on(table.purchaseOrderStatus),
    orderDateIdx: index("idx_po_order_date").on(table.orderDate),
    // Composite indexes for common query patterns
    supplierStatusIdx: index("idx_po_supplier_status").on(
      table.supplierClientId,
      table.purchaseOrderStatus
    ),
    vendorStatusIdx: index("idx_po_vendor_status").on(
      table.vendorId,
      table.purchaseOrderStatus
    ),
    statusDateIdx: index("idx_po_status_date").on(
      table.purchaseOrderStatus,
      table.orderDate
    ),
  })
);

export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;

/**
 * Purchase Order Line Items table
 * Individual items/products on a purchase order
 */
export const purchaseOrderItems = mysqlTable(
  "purchaseOrderItems",
  {
    id: int("id").autoincrement().primaryKey(),
    purchaseOrderId: int("purchaseOrderId")
      .notNull()
      .references(() => purchaseOrders.id, { onDelete: "cascade" }),

    // Product reference
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    // Quantities
    quantityOrdered: decimal("quantityOrdered", {
      precision: 15,
      scale: 4,
    }).notNull(),
    quantityReceived: decimal("quantityReceived", {
      precision: 15,
      scale: 4,
    }).default("0"),

    // Pricing
    unitCost: decimal("unitCost", { precision: 15, scale: 4 }).notNull(),
    totalCost: decimal("totalCost", { precision: 15, scale: 4 }).notNull(),

    // Item-specific notes
    notes: text("notes"),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    poIdIdx: index("idx_poi_po_id").on(table.purchaseOrderId),
    productIdIdx: index("idx_poi_product_id").on(table.productId),
  })
);

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;

/**
 * Sequences table
 * Manages atomic, sequential generation of codes (lot codes, batch codes, etc.)
 * Uses database-level atomicity to prevent collisions
 */
export const sequences = mysqlTable("sequences", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013) // e.g., "lot_code", "batch_code"
  prefix: varchar("prefix", { length: 20 }).notNull(), // e.g., "LOT-", "BATCH-"
  currentValue: int("currentValue").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Sequence = typeof sequences.$inferSelect;
export type InsertSequence = typeof sequences.$inferInsert;

/**
 * Brands table
 * Represents product brands (may be same as vendor or different)
 */
export const brands = mysqlTable("brands", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  vendorId: int("vendorId"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Brand = typeof brands.$inferSelect;
export type InsertBrand = typeof brands.$inferInsert;

/**
 * Strain Library table
 * Centralized library of cannabis strains for standardization
 * UPDATED: Added OpenTHC VDB integration fields
 */
export const strains = mysqlTable("strains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  standardizedName: varchar("standardizedName", { length: 255 }).notNull(),
  aliases: text("aliases"), // JSON array of alternative names
  category: varchar("category", { length: 50 }), // Indica, Sativa, Hybrid
  description: text("description"),
  // OpenTHC VDB Integration
  openthcId: varchar("openthcId", { length: 255 }), // OpenTHC Universal Unique ID
  openthcStub: varchar("openthcStub", { length: 255 }), // OpenTHC URL slug
  // Strain Family Support
  parentStrainId: int("parentStrainId"), // Links to parent strain for variants (e.g., "White Runtz" -> "Runtz")
  baseStrainName: varchar("baseStrainName", { length: 255 }), // Extracted base name for family grouping
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Strain = typeof strains.$inferSelect;
export type InsertStrain = typeof strains.$inferInsert;

/**
 * Products table
 * Represents sellable product definitions
 * ADDED: strainId for linking to strain library
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  brandId: int("brandId").notNull(),
  strainId: int("strainId"), // Link to strain library
  nameCanonical: varchar("nameCanonical", { length: 500 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
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
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductSynonym = typeof productSynonyms.$inferSelect;
export type InsertProductSynonym = typeof productSynonyms.$inferInsert;

/**
 * Product Media table
 * Stores media files (images, documents) associated with products
 */
export const productMedia = mysqlTable("productMedia", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  type: varchar("type", { length: 50 }).notNull(), // image, document, video, etc.
  filename: varchar("filename", { length: 255 }).notNull(),
  size: int("size"), // File size in bytes
  uploadedBy: int("uploadedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ProductMedia = typeof productMedia.$inferSelect;
export type InsertProductMedia = typeof productMedia.$inferInsert;

/**
 * Tags table
 * Stores product tags for categorization and search
 * Includes strain types (Indica, Sativa, Hybrid) and custom tags
 */
export const tags = mysqlTable("tags", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  standardizedName: varchar("standardizedName", { length: 100 }).notNull(),
  category: varchar("category", { length: 50 }), // strain_type, flavor, effect, etc.
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tag = typeof tags.$inferSelect;
export type InsertTag = typeof tags.$inferInsert;

/**
 * Product Tags junction table
 * Links products to tags (many-to-many relationship)
 */
export const productTags = mysqlTable("productTags", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  tagId: int("tagId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),

  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
});

export type ProductTag = typeof productTags.$inferSelect;
export type InsertProductTag = typeof productTags.$inferInsert;

/**
 * Lots table
 * Represents a single vendor intake event (system-only, not client-facing)
 * REMOVED: siteCode (moved to settings-based location management)
 */
export const lots = mysqlTable(
  "lots",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)

    // Supplier reference (canonical - uses clients table)
    // Added via backfill-supplier-client-ids.ts script
    supplierClientId: int("supplier_client_id").references(() => clients.id, {
      onDelete: "restrict",
    }),

    // Vendor reference (DEPRECATED - use supplierClientId instead)
    vendorId: int("vendorId").notNull(),

    date: timestamp("date").notNull(),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    supplierClientIdIdx: index("idx_lots_supplier_client_id").on(
      table.supplierClientId
    ),
  })
);

export type Lot = typeof lots.$inferSelect;
export type InsertLot = typeof lots.$inferInsert;

/**
 * Batches table
 * Represents sellable units of a specific product within a lot
 * ADDED: amountPaid for COD/Partial payment tracking
 * REMOVED: unitCogsFloor (FLOOR mode removed)
 */
export const batches = mysqlTable(
  "batches",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
    version: int("version").notNull().default(1), // Optimistic locking (DATA-005)
    sku: varchar("sku", { length: 100 }).notNull().unique(),
    productId: int("productId").notNull(),
    lotId: int("lotId").notNull(),
    batchStatus: batchStatusEnum.notNull().default("AWAITING_INTAKE"),
    statusId: int("statusId").references(() => workflowStatuses.id, {
      onDelete: "set null",
    }), // New workflow queue status (nullable for backward compatibility)
    grade: varchar("grade", { length: 10 }),
    isSample: int("isSample").notNull().default(0), // 0 = false, 1 = true
    sampleOnly: int("sampleOnly").notNull().default(0), // 0 = false, 1 = true (batch can only be sampled, not sold)
    sampleAvailable: int("sampleAvailable").notNull().default(0), // 0 = false, 1 = true (batch can be used for samples)
    cogsMode: cogsModeEnum.notNull(),
    unitCogs: varchar("unitCogs", { length: 20 }), // FIXED
    unitCogsMin: varchar("unitCogsMin", { length: 20 }), // RANGE
    unitCogsMax: varchar("unitCogsMax", { length: 20 }), // RANGE
    paymentTerms: paymentTermsEnum.notNull(),
    ownershipType: ownershipTypeEnum.notNull().default("CONSIGNED"), // MEET-006: Track inventory ownership
    amountPaid: varchar("amountPaid", { length: 20 }).default("0"), // For COD/Partial tracking
    metadata: text("metadata"), // JSON string: test results, harvest code, COA, etc.

    // v3.2: Link to PHOTOGRAPHY calendar event if batch had photo session
    photoSessionEventId: int("photo_session_event_id").references(
      () => calendarEvents.id,
      { onDelete: "set null" }
    ),

    onHandQty: varchar("onHandQty", { length: 20 }).notNull().default("0"),
    sampleQty: varchar("sampleQty", { length: 20 }).notNull().default("0"),
    reservedQty: varchar("reservedQty", { length: 20 }).notNull().default("0"),
    quarantineQty: varchar("quarantineQty", { length: 20 })
      .notNull()
      .default("0"),
    holdQty: varchar("holdQty", { length: 20 }).notNull().default("0"),
    defectiveQty: varchar("defectiveQty", { length: 20 })
      .notNull()
      .default("0"),
    publishEcom: int("publishEcom").notNull().default(0), // 0 = false, 1 = true
    publishB2b: int("publishB2b").notNull().default(0), // 0 = false, 1 = true
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    productIdIdx: index("idx_batches_product_id").on(table.productId),
    // Composite indexes for common query patterns
    productStatusIdx: index("idx_batches_product_status").on(
      table.productId,
      table.batchStatus
    ),
    statusCreatedIdx: index("idx_batches_status_created").on(
      table.batchStatus,
      table.createdAt
    ),
  })
);

export type Batch = typeof batches.$inferSelect;
export type InsertBatch = typeof batches.$inferInsert;

/**
 * Payment History table
 * Tracks all payments made to vendors for batches
 */
export const paymentHistory = mysqlTable("paymentHistory", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  vendorId: int("vendorId").notNull(),
  amount: varchar("amount", { length: 20 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  paymentDate: timestamp("paymentDate").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  notes: text("notes"),
  recordedBy: int("recordedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PaymentHistory = typeof paymentHistory.$inferSelect;
export type InsertPaymentHistory = typeof paymentHistory.$inferInsert;

/**
 * Batch Locations table
 * Tracks physical location of batch quantities
 */
export const batchLocations = mysqlTable("batchLocations", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  site: varchar("site", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
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
 * Sales table
 * Tracks all sales with COGS snapshot at time of sale
 */
// FK constraints added as part of Canonical Model Unification (Phase 2, Tasks 10.4, 10.5)
export const sales = mysqlTable(
  "sales",
  {
    id: int("id").autoincrement().primaryKey(),
    batchId: int("batchId").notNull(),
    productId: int("productId").notNull(),
    quantity: varchar("quantity", { length: 20 }).notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
    cogsAtSale: varchar("cogsAtSale", { length: 20 }).notNull(), // COGS snapshot
    salePrice: varchar("salePrice", { length: 20 }).notNull(),
    cogsOverride: int("cogsOverride").notNull().default(0), // 0 = false, 1 = true
    // FK added: customerId → clients.id (Task 10.4)
    customerId: int("customerId").references(() => clients.id, {
      onDelete: "restrict",
    }),
    saleDate: timestamp("saleDate").notNull(),
    notes: text("notes"),
    // FK added: createdBy → users.id (Task 10.5)
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    customerIdIdx: index("idx_sales_customer_id").on(table.customerId),
    createdByIdx: index("idx_sales_created_by").on(table.createdBy),
    // Composite indexes for common query patterns
    customerDateIdx: index("idx_sales_customer_date").on(
      table.customerId,
      table.saleDate
    ),
    createdByDateIdx: index("idx_sales_created_by_date").on(
      table.createdBy,
      table.saleDate
    ),
    saleDateIdx: index("idx_sales_sale_date").on(table.saleDate),
  })
);

export type Sale = typeof sales.$inferSelect;
export type InsertSale = typeof sales.$inferInsert;

/**
 * COGS History table
 * Tracks all COGS changes for audit trail
 */
export const cogsHistory = mysqlTable("cogsHistory", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  oldCogs: varchar("oldCogs", { length: 20 }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  newCogs: varchar("newCogs", { length: 20 }).notNull(),
  changeType: varchar("changeType", { length: 50 }).notNull(), // prospective, retroactive, both
  affectedSalesCount: int("affectedSalesCount").default(0),
  reason: text("reason"),
  changedBy: int("changedBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CogsHistory = typeof cogsHistory.$inferSelect;
export type InsertCogsHistory = typeof cogsHistory.$inferInsert;

/**
 * Audit Log table
 * Immutable append-only log of all inventory actions
 */
export const auditLogs = mysqlTable(
  "auditLogs",
  {
    id: int("id").autoincrement().primaryKey(),
    actorId: int("actorId").notNull(),
    entity: varchar("entity", { length: 50 }).notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
    entityId: int("entityId").notNull(),
    action: varchar("action", { length: 100 }).notNull(),
    before: text("before"), // JSON string
    after: text("after"), // JSON string
    reason: text("reason"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    // Composite indexes for common query patterns
    entityLookupIdx: index("idx_audit_entity_lookup").on(
      table.entity,
      table.entityId
    ),
    actorTimeIdx: index("idx_audit_actor_time").on(
      table.actorId,
      table.createdAt
    ),
    entityTimeIdx: index("idx_audit_entity_time").on(
      table.entity,
      table.createdAt
    ),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// SETTINGS TABLES
// ============================================================================

/**
 * Locations table
 * Centralized location definitions for warehouse management
 */
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  site: varchar("site", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  zone: varchar("zone", { length: 100 }),
  rack: varchar("rack", { length: 100 }),
  shelf: varchar("shelf", { length: 100 }),
  bin: varchar("bin", { length: 100 }),
  isActive: int("isActive").notNull().default(1), // 0 = false, 1 = true
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Categories table
 * Customizable product categories
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  description: text("description"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Subcategories table
 * Customizable product subcategories per category
 */
export const subcategories = mysqlTable("subcategories", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  description: text("description"),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subcategory = typeof subcategories.$inferSelect;
export type InsertSubcategory = typeof subcategories.$inferInsert;

/**
 * Grades table
 * Customizable product grading system
 */
export const grades = mysqlTable("grades", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  description: text("description"),
  sortOrder: int("sortOrder").default(0),
  isActive: int("isActive").notNull().default(1),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Grade = typeof grades.$inferSelect;
export type InsertGrade = typeof grades.$inferInsert;

// ============================================================================
// DASHBOARD MODULE SCHEMA
// ============================================================================

/**
 * Scratch Pad Notes table
 * Stores user's personal notes in an infinite scroll diary format
 * Newest notes appear at the bottom (like chat/messaging apps)
 */
export const scratchPadNotes = mysqlTable("scratch_pad_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  content: text("content").notNull(),
  isCompleted: boolean("isCompleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  completedAt: timestamp("completedAt"),
});

export type ScratchPadNote = typeof scratchPadNotes.$inferSelect;
export type InsertScratchPadNote = typeof scratchPadNotes.$inferInsert;

/**
 * Dashboard Widget Layouts table
 * Stores user's customized widget positions and configurations
 * Each user can have their own layout, with role-based defaults
 */
export const dashboardWidgetLayouts = mysqlTable("dashboard_widget_layouts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  role: mysqlEnum("role", ["user", "admin"]),
  widgetType: varchar("widgetType", { length: 100 }).notNull(),
  position: int("position").notNull(),
  width: int("width").default(1).notNull(),
  height: int("height").default(1).notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  config: json("config"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardWidgetLayout = typeof dashboardWidgetLayouts.$inferSelect;
export type InsertDashboardWidgetLayout =
  typeof dashboardWidgetLayouts.$inferInsert;

/**
 * Dashboard KPI Configurations table
 * Stores role-based KPI configurations (which KPIs to show, in what order)
 * Admins can set defaults for each role
 */
export const dashboardKpiConfigs = mysqlTable("dashboard_kpi_configs", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["user", "admin"]).notNull(),
  kpiType: varchar("kpiType", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  position: int("position").notNull(),
  isVisible: boolean("isVisible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DashboardKpiConfig = typeof dashboardKpiConfigs.$inferSelect;
export type InsertDashboardKpiConfig = typeof dashboardKpiConfigs.$inferInsert;

// ============================================================================
// ACCOUNTING MODULE SCHEMA - PHASE 1: CORE ACCOUNTING
// ============================================================================

/**
 * Chart of Accounts
 * Hierarchical account structure for double-entry accounting
 */
export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  accountNumber: varchar("accountNumber", { length: 20 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountType: mysqlEnum("accountType", [
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "EXPENSE",
  ]).notNull(),
  parentAccountId: int("parentAccountId"),
  isActive: boolean("isActive").default(true).notNull(),
  normalBalance: mysqlEnum("normalBalance", ["DEBIT", "CREDIT"]).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

/**
 * General Ledger Entries
 * Immutable double-entry accounting records
 */
// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)
export const ledgerEntries = mysqlTable(
  "ledgerEntries",
  {
    id: int("id").autoincrement().primaryKey(),
    entryNumber: varchar("entryNumber", { length: 50 }).notNull().unique(),
    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
    entryDate: date("entryDate").notNull(),
    accountId: int("accountId").notNull(),
    debit: decimal("debit", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    credit: decimal("credit", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    description: text("description"),
    referenceType: varchar("referenceType", { length: 50 }), // INVOICE, BILL, PAYMENT, EXPENSE, ADJUSTMENT
    referenceId: int("referenceId"),
    fiscalPeriodId: int("fiscalPeriodId").notNull(),
    isManual: boolean("isManual").default(false).notNull(),
    isPosted: boolean("isPosted").default(false).notNull(),
    postedAt: timestamp("postedAt"),
    postedBy: int("postedBy"),
    createdBy: int("createdBy").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    accountIdIdx: index("idx_ledger_entries_account_id").on(table.accountId),
  })
);

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;

/**
 * Fiscal Periods
 * Defines accounting periods for financial reporting and period close
 */
export const fiscalPeriods = mysqlTable("fiscalPeriods", {
  id: int("id").autoincrement().primaryKey(),
  periodName: varchar("periodName", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  fiscalYear: int("fiscalYear").notNull(),
  status: mysqlEnum("status", ["OPEN", "CLOSED", "LOCKED"])
    .default("OPEN")
    .notNull(),
  closedAt: timestamp("closedAt"),
  closedBy: int("closedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FiscalPeriod = typeof fiscalPeriods.$inferSelect;
export type InsertFiscalPeriod = typeof fiscalPeriods.$inferInsert;

// ============================================================================
// ACCOUNTING MODULE SCHEMA - PHASE 2: AR/AP
// ============================================================================

/**
 * Invoices (Accounts Receivable)
 * Customer invoices for sales transactions
 */
// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)
export const invoices = mysqlTable(
  "invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
    // SCHEMA DRIFT FIX: Re-added deletedAt - column exists in production database
    deletedAt: timestamp("deleted_at"),
    version: int("version").notNull().default(1), // Optimistic locking (DATA-005)
    // FK added as part of Canonical Model Unification (Phase 2, Task 10.1)
    customerId: int("customerId")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    invoiceDate: date("invoiceDate").notNull(),
    dueDate: date("dueDate").notNull(),
    subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
    taxAmount: decimal("taxAmount", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    discountAmount: decimal("discountAmount", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
    amountPaid: decimal("amountPaid", { precision: 12, scale: 2 })
      .default("0.00")
      .notNull(),
    amountDue: decimal("amountDue", { precision: 12, scale: 2 }).notNull(),
    status: mysqlEnum("status", [
      "DRAFT",
      "SENT",
      "VIEWED",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ])
      .default("DRAFT")
      .notNull(),
    paymentTerms: varchar("paymentTerms", { length: 100 }),
    notes: text("notes"),
    referenceType: varchar("referenceType", { length: 50 }), // SALE, ORDER, CONTRACT
    referenceId: int("referenceId"),
    // FK added as part of Canonical Model Unification (Phase 2, Task 10.2)
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    customerIdIdx: index("idx_invoices_customer_id").on(table.customerId),
    createdByIdx: index("idx_invoices_created_by").on(table.createdBy),
    // Composite indexes for common query patterns
    customerStatusIdx: index("idx_invoices_customer_status").on(
      table.customerId,
      table.status
    ),
    statusDueDateIdx: index("idx_invoices_status_due_date").on(
      table.status,
      table.dueDate
    ),
    statusCreatedIdx: index("idx_invoices_status_created").on(
      table.status,
      table.createdAt
    ),
  })
);

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Invoice Line Items
 * Individual items on an invoice
 */
// FK constraints added as part of Canonical Model Unification (Phase 2, Task 10.3)
export const invoiceLineItems = mysqlTable(
  "invoiceLineItems",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceId: int("invoiceId")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    productId: int("productId").references(() => products.id, {
      onDelete: "restrict",
    }),
    batchId: int("batchId").references(() => batches.id, {
      onDelete: "restrict",
    }),
    description: text("description").notNull(),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
    unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
    taxRate: decimal("taxRate", { precision: 5, scale: 2 })
      .default("0.00")
      .notNull(),
    discountPercent: decimal("discountPercent", { precision: 5, scale: 2 })
      .default("0.00")
      .notNull(),
    lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    invoiceIdIdx: index("idx_invoice_line_items_invoice_id").on(table.invoiceId),
    productIdIdx: index("idx_invoice_line_items_product_id").on(table.productId),
    batchIdIdx: index("idx_invoice_line_items_batch_id").on(table.batchId),
  })
);

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;

/**
 * Bills (Accounts Payable)
 * Vendor bills for purchases
 */
export const bills = mysqlTable("bills", {
  id: int("id").autoincrement().primaryKey(),
  billNumber: varchar("billNumber", { length: 50 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  vendorId: int("vendorId").notNull(),
  billDate: date("billDate").notNull(),
  dueDate: date("dueDate").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  amountDue: decimal("amountDue", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", [
    "DRAFT",
    "PENDING",
    "APPROVED",
    "PARTIAL",
    "PAID",
    "OVERDUE",
    "VOID",
  ])
    .default("DRAFT")
    .notNull(),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  notes: text("notes"),
  referenceType: varchar("referenceType", { length: 50 }), // LOT, PURCHASE_ORDER, SERVICE
  referenceId: int("referenceId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Bill = typeof bills.$inferSelect;
export type InsertBill = typeof bills.$inferInsert;

/**
 * Bill Line Items
 * Individual items on a bill
 */
export const billLineItems = mysqlTable("billLineItems", {
  id: int("id").autoincrement().primaryKey(),
  billId: int("billId").notNull(),
  productId: int("productId"),
  lotId: int("lotId"),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 })
    .default("0.00")
    .notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 })
    .default("0.00")
    .notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BillLineItem = typeof billLineItems.$inferSelect;
export type InsertBillLineItem = typeof billLineItems.$inferInsert;

/**
 * Payments
 * Unified payment tracking for both AR and AP
 */
// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)
// FK constraints added as part of Canonical Model Unification (Phase 2, Tasks 11.1-11.5)
export const payments = mysqlTable(
  "payments",
  {
    id: int("id").autoincrement().primaryKey(),
    paymentNumber: varchar("paymentNumber", { length: 50 }).notNull().unique(),
    // SCHEMA DRIFT FIX: Re-added deletedAt - column exists in production database
    deletedAt: timestamp("deleted_at"),
    paymentType: mysqlEnum("paymentType", ["RECEIVED", "SENT"]).notNull(), // RECEIVED = AR, SENT = AP
    paymentDate: date("paymentDate").notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMethod: mysqlEnum("paymentMethod", [
      "CASH",
      "CHECK",
      "WIRE",
      "ACH",
      "CREDIT_CARD",
      "DEBIT_CARD",
      "OTHER",
    ]).notNull(),
    referenceNumber: varchar("referenceNumber", { length: 100 }),
    // FK added: bankAccountId → bankAccounts.id (Task 11.3)
    bankAccountId: int("bankAccountId").references(() => bankAccounts.id, {
      onDelete: "restrict",
    }),
    // FK added: customerId → clients.id for AR payments (Task 11.1)
    customerId: int("customerId").references(() => clients.id, {
      onDelete: "restrict",
    }),
    // FK added: vendorId → clients.id for AP payments (Task 11.2)
    // NOTE: This references clients.id (as supplier), NOT vendors.id
    // The supplier should have isSeller=true in the clients table
    vendorId: int("vendorId").references(() => clients.id, {
      onDelete: "restrict",
    }),
    // FK added: invoiceId → invoices.id for AR payments (Task 11.4)
    invoiceId: int("invoiceId").references(() => invoices.id, {
      onDelete: "restrict",
    }),
    // FK added: billId → bills.id for AP payments (Task 11.5)
    billId: int("billId").references(() => bills.id, {
      onDelete: "restrict",
    }),
    notes: text("notes"),
    isReconciled: boolean("isReconciled").default(false).notNull(),
    reconciledAt: timestamp("reconciledAt"),
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    customerIdIdx: index("idx_payments_customer_id").on(table.customerId),
    vendorIdIdx: index("idx_payments_vendor_id").on(table.vendorId),
    bankAccountIdIdx: index("idx_payments_bank_account_id").on(
      table.bankAccountId
    ),
    invoiceIdIdx: index("idx_payments_invoice_id").on(table.invoiceId),
    billIdIdx: index("idx_payments_bill_id").on(table.billId),
    createdByIdx: index("idx_payments_created_by").on(table.createdBy),
    // Composite indexes for common query patterns
    customerDateIdx: index("idx_payments_customer_date").on(
      table.customerId,
      table.paymentDate
    ),
    vendorDateIdx: index("idx_payments_vendor_date").on(
      table.vendorId,
      table.paymentDate
    ),
    typeDateIdx: index("idx_payments_type_date").on(
      table.paymentType,
      table.paymentDate
    ),
    reconcileStatusIdx: index("idx_payments_reconcile_status").on(
      table.isReconciled,
      table.paymentDate
    ),
  })
);

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

// ============================================================================
// ACCOUNTING MODULE SCHEMA - PHASE 3: CASH & EXPENSES
// ============================================================================

/**
 * Bank Accounts
 * Company bank accounts for cash management
 */
export const bankAccounts = mysqlTable("bankAccounts", {
  id: int("id").autoincrement().primaryKey(),
  accountName: varchar("accountName", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  accountNumber: varchar("accountNumber", { length: 50 }).notNull(),
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountType: mysqlEnum("accountType", [
    "CHECKING",
    "SAVINGS",
    "MONEY_MARKET",
    "CREDIT_CARD",
  ]).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  currentBalance: decimal("currentBalance", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  ledgerAccountId: int("ledgerAccountId"), // Link to Chart of Accounts
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BankAccount = typeof bankAccounts.$inferSelect;
export type InsertBankAccount = typeof bankAccounts.$inferInsert;

/**
 * Bank Transactions
 * Individual transactions in bank accounts
 */
export const bankTransactions = mysqlTable("bankTransactions", {
  id: int("id").autoincrement().primaryKey(),
  bankAccountId: int("bankAccountId").notNull(),
  transactionDate: date("transactionDate").notNull(),
  transactionType: mysqlEnum("transactionType", [
    "DEPOSIT",
    "WITHDRAWAL",
    "TRANSFER",
    "FEE",
    "INTEREST",
  ]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  description: text("description"),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  paymentId: int("paymentId"), // Link to payments table
  isReconciled: boolean("isReconciled").default(false).notNull(),
  reconciledAt: timestamp("reconciledAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BankTransaction = typeof bankTransactions.$inferSelect;
export type InsertBankTransaction = typeof bankTransactions.$inferInsert;

/**
 * Expense Categories
 * Hierarchical expense categorization
 */
export const expenseCategories = mysqlTable("expenseCategories", {
  id: int("id").autoincrement().primaryKey(),
  categoryName: varchar("categoryName", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  parentCategoryId: int("parentCategoryId"),
  ledgerAccountId: int("ledgerAccountId"), // Link to Chart of Accounts
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseCategory = typeof expenseCategories.$inferSelect;
export type InsertExpenseCategory = typeof expenseCategories.$inferInsert;

/**
 * Expenses
 * Business expenses tracking
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  expenseNumber: varchar("expenseNumber", { length: 50 }).notNull().unique(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  expenseDate: date("expenseDate").notNull(),
  categoryId: int("categoryId").notNull(),
  vendorId: int("vendorId"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 })
    .default("0.00")
    .notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", [
    "CASH",
    "CHECK",
    "CREDIT_CARD",
    "DEBIT_CARD",
    "BANK_TRANSFER",
    "OTHER",
  ]).notNull(),
  bankAccountId: int("bankAccountId"),
  description: text("description"),
  receiptUrl: varchar("receiptUrl", { length: 500 }),
  billId: int("billId"), // Link to bills if expense is from a bill
  isReimbursable: boolean("isReimbursable").default(false).notNull(),
  isReimbursed: boolean("isReimbursed").default(false).notNull(),
  reimbursedAt: timestamp("reimbursedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

// ============================================================================
// FREEFORM NOTES MODULE SCHEMA
// ============================================================================

/**
 * Freeform Notes table
 * Advanced rich-text notes with Tiptap editor (JSON content)
 * Supports hierarchical lists, checkboxes, templates, and collaboration
 */
export const freeformNotes = mysqlTable("freeform_notes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  title: varchar("title", { length: 500 }).notNull().default("Untitled Note"),
  content: json("content"), // Tiptap JSON content (rich text, nested lists, checkboxes)
  templateType: varchar("templateType", { length: 100 }), // TO_DO, MEETING_NOTES, BRAINSTORM, GOALS, MESSAGE_BOARD, CUSTOM
  tags: json("tags"), // Array of tag strings for categorization
  isPinned: boolean("isPinned").default(false).notNull(),
  isArchived: boolean("isArchived").default(false).notNull(),
  sharedWith: json("sharedWith"), // Array of user IDs who have access
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastViewedAt: timestamp("lastViewedAt"),
});

export type FreeformNote = typeof freeformNotes.$inferSelect;
export type InsertFreeformNote = typeof freeformNotes.$inferInsert;

/**
 * Note Comments table
 * Collaboration feature: async comments on notes
 */
export const noteComments = mysqlTable("note_comments", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("noteId")
    .notNull()
    .references(() => freeformNotes.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  parentCommentId: int("parentCommentId"), // For threaded replies
  isResolved: boolean("isResolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type NoteComment = typeof noteComments.$inferSelect;
export type InsertNoteComment = typeof noteComments.$inferInsert;

/**
 * Note Activity table
 * Activity log for collaboration and audit trail
 */
export const noteActivity = mysqlTable("note_activity", {
  id: int("id").autoincrement().primaryKey(),
  noteId: int("noteId")
    .notNull()
    .references(() => freeformNotes.id, { onDelete: "cascade" }),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013),
  userId: int("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  activityType: mysqlEnum("activityType", [
    "CREATED",
    "UPDATED",
    "COMMENTED",
    "SHARED",
    "ARCHIVED",
    "RESTORED",
    "PINNED",
    "UNPINNED",
    "TEMPLATE_APPLIED",
  ]).notNull(),
  metadata: json("metadata"), // Additional context (e.g., template name, user shared with)
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type NoteActivity = typeof noteActivity.$inferSelect;
export type InsertNoteActivity = typeof noteActivity.$inferInsert;

// ============================================================================
// CLIENT MANAGEMENT SYSTEM
// ============================================================================

/**
 * Credit Limit Source Enum
 * Tracks whether credit limit was calculated by system or manually set
 */
export const creditLimitSourceEnum = mysqlEnum("creditLimitSource", [
  "CALCULATED",
  "MANUAL",
]);

/**
 * COGS Adjustment Type Enum
 * Types of COGS adjustments at client level
 */
export const cogsAdjustmentTypeEnum = mysqlEnum("cogsAdjustmentType", [
  "NONE",
  "PERCENTAGE",
  "FIXED_AMOUNT",
]);

export const clients = mysqlTable(
  "clients",
  {
    id: int("id").primaryKey().autoincrement(),
    version: int("version").notNull().default(1), // Optimistic locking (DATA-005)
    teriCode: varchar("teri_code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    phone: varchar("phone", { length: 50 }),
    address: text("address"),

    // Client types (multi-role support)
    isBuyer: boolean("is_buyer").default(false),
    isSeller: boolean("is_seller").default(false),
    isBrand: boolean("is_brand").default(false),
    isReferee: boolean("is_referee").default(false),
    isContractor: boolean("is_contractor").default(false),

    // Tags and metadata
    tags: json("tags").$type<string[]>(),

    // Pricing configuration
    pricingProfileId: int("pricing_profile_id"),
    customPricingRules: json("custom_pricing_rules"),

    // COGS configuration
    cogsAdjustmentType: cogsAdjustmentTypeEnum.default("NONE"),
    cogsAdjustmentValue: decimal("cogs_adjustment_value", {
      precision: 10,
      scale: 4,
    }).default("0"),
    autoDeferConsignment: boolean("auto_defer_consignment").default(false),

    // Computed stats (updated via triggers or application logic)
    totalSpent: decimal("total_spent", { precision: 15, scale: 2 }).default(
      "0"
    ),
    totalProfit: decimal("total_profit", { precision: 15, scale: 2 }).default(
      "0"
    ),
    avgProfitMargin: decimal("avg_profit_margin", {
      precision: 5,
      scale: 2,
    }).default("0"),
    totalOwed: decimal("total_owed", { precision: 15, scale: 2 }).default("0"),
    oldestDebtDays: int("oldest_debt_days").default(0),

    // Credit limit fields (synced from client_credit_limits for fast access)
    creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).default(
      "0"
    ),
    creditLimitUpdatedAt: timestamp("credit_limit_updated_at"),
    creditLimitSource: creditLimitSourceEnum.default("CALCULATED"),
    creditLimitOverrideReason: text("credit_limit_override_reason"),

    // VIP Portal fields
    vipPortalEnabled: boolean("vip_portal_enabled").default(false),
    vipPortalLastLogin: timestamp("vip_portal_last_login"),

    // Customer wishlist/preferences (WS-015)
    wishlist: text("wishlist"), // Free-form text for customer product wishes/preferences

    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    teriCodeIdx: index("idx_teri_code").on(table.teriCode),
    totalOwedIdx: index("idx_total_owed").on(table.totalOwed),
  })
);

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Communication Type Enum
 * Types of client communications
 */
export const communicationTypeEnum = mysqlEnum("communicationType", [
  "CALL",
  "EMAIL",
  "MEETING",
  "NOTE",
]);

/**
 * Client Communications Table
 * Tracks all communications with clients
 */
export const clientCommunications = mysqlTable(
  "client_communications",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    communicationType: communicationTypeEnum.notNull(),
    subject: varchar("subject", { length: 255 }).notNull(),
    notes: text("notes"),
    communicatedAt: timestamp("communicated_at").notNull(),
    loggedBy: int("logged_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    communicatedAtIdx: index("idx_communicated_at").on(table.communicatedAt),
    typeIdx: index("idx_type").on(table.communicationType),
  })
);

export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertClientCommunication =
  typeof clientCommunications.$inferInsert;

/**
 * Supplier Profiles Table
 * Extension table for supplier-specific fields, keyed by clients.id
 * Part of Canonical Model Unification - stores vendor-specific data for clients with isSeller=true
 */
export const supplierProfiles = mysqlTable(
  "supplier_profiles",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Supplier-specific fields (migrated from vendors table)
    contactName: varchar("contact_name", { length: 255 }),
    contactEmail: varchar("contact_email", { length: 320 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    paymentTerms: varchar("payment_terms", { length: 100 }),
    supplierNotes: text("supplier_notes"),

    // Legacy vendor mapping (for migration tracking)
    legacyVendorId: int("legacy_vendor_id"),

    // Supplier-specific metadata
    preferredPaymentMethod: mysqlEnum("preferred_payment_method", [
      "CASH",
      "CHECK",
      "WIRE",
      "ACH",
      "CREDIT_CARD",
      "OTHER",
    ]),
    taxId: varchar("tax_id", { length: 50 }),
    licenseNumber: varchar("license_number", { length: 100 }),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_supplier_profiles_client_id").on(table.clientId),
    legacyVendorIdx: index("idx_supplier_profiles_legacy_vendor").on(
      table.legacyVendorId
    ),
  })
);

export type SupplierProfile = typeof supplierProfiles.$inferSelect;
export type InsertSupplierProfile = typeof supplierProfiles.$inferInsert;

export const clientTransactions = mysqlTable(
  "client_transactions",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    transactionType: mysqlEnum("transaction_type", [
      "INVOICE",
      "PAYMENT",
      "QUOTE",
      "ORDER",
      "REFUND",
      "CREDIT",
    ]).notNull(),
    transactionNumber: varchar("transaction_number", { length: 100 }),
    transactionDate: date("transaction_date").notNull(),
    amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),

    // Payment tracking
    paymentStatus: mysqlEnum("payment_status", [
      "PAID",
      "PENDING",
      "OVERDUE",
      "PARTIAL",
    ]).default("PENDING"),
    paymentDate: date("payment_date"),
    paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }),

    notes: text("notes"),
    metadata: json("metadata"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    transactionDateIdx: index("idx_transaction_date").on(table.transactionDate),
    paymentStatusIdx: index("idx_payment_status").on(table.paymentStatus),
  })
);

export type ClientTransaction = typeof clientTransactions.$inferSelect;
export type InsertClientTransaction = typeof clientTransactions.$inferInsert;

// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)
export const clientActivity = mysqlTable(
  "client_activity",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    activityType: mysqlEnum("activity_type", [
      "CREATED",
      "UPDATED",
      "TRANSACTION_ADDED",
      "PAYMENT_RECORDED",
      "NOTE_ADDED",
      "TAG_ADDED",
      "TAG_REMOVED",
    ]).notNull(),

    metadata: json("metadata"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
  })
);

export type ClientActivity = typeof clientActivity.$inferSelect;
export type InsertClientActivity = typeof clientActivity.$inferInsert;

export const clientNotes = mysqlTable(
  "client_notes",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    noteId: int("note_id")
      .notNull()
      .references(() => freeformNotes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    uniqueClientNote: unique("unique_client_note").on(
      table.clientId,
      table.noteId
    ),
  })
);

export type ClientNote = typeof clientNotes.$inferSelect;
export type InsertClientNote = typeof clientNotes.$inferInsert;

// ============================================================================
// CLIENT LEDGER SYSTEM (FEAT-009 / MEET-010)
// ============================================================================

/**
 * Client Ledger Adjustments table
 * For manual credits/debits not tied to orders or payments
 * Supports the unified client ledger view (MEET-010)
 */
export const clientLedgerAdjustments = mysqlTable(
  "client_ledger_adjustments",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    transactionType: mysqlEnum("transaction_type", [
      "CREDIT",
      "DEBIT",
    ]).notNull(),
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description").notNull(),
    effectiveDate: date("effective_date").notNull(),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_ledger_adj_client_id").on(table.clientId),
    effectiveDateIdx: index("idx_ledger_adj_effective_date").on(table.effectiveDate),
    typeIdx: index("idx_ledger_adj_type").on(table.transactionType),
  })
);

export type ClientLedgerAdjustment = typeof clientLedgerAdjustments.$inferSelect;
export type InsertClientLedgerAdjustment = typeof clientLedgerAdjustments.$inferInsert;

// ============================================================================
// CREDIT INTELLIGENCE SYSTEM
// ============================================================================

/**
 * Credit Limit Configuration
 * Stores the calculated credit limit and health metrics for each client
 */
export const clientCreditLimits = mysqlTable(
  "client_credit_limits",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" })
      .unique(),

    // Credit limit calculation
    creditLimit: decimal("credit_limit", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    currentExposure: decimal("current_exposure", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),
    utilizationPercent: decimal("utilization_percent", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),

    // Composite credit health score (0-100)
    creditHealthScore: decimal("credit_health_score", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),

    // Base capacity anchor
    baseCapacity: decimal("base_capacity", { precision: 15, scale: 2 })
      .notNull()
      .default("0"),

    // Adjustment factors
    riskModifier: decimal("risk_modifier", { precision: 5, scale: 4 })
      .notNull()
      .default("1"),
    directionalFactor: decimal("directional_factor", { precision: 5, scale: 4 })
      .notNull()
      .default("1"),

    // System state
    mode: mysqlEnum("mode", ["LEARNING", "ACTIVE"])
      .notNull()
      .default("LEARNING"),
    confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    dataReadiness: decimal("data_readiness", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    // Trend tracking
    trend: mysqlEnum("trend", ["IMPROVING", "STABLE", "WORSENING"])
      .notNull()
      .default("STABLE"),

    lastCalculated: timestamp("last_calculated").defaultNow().onUpdateNow(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
  })
);

export type ClientCreditLimit = typeof clientCreditLimits.$inferSelect;
export type InsertClientCreditLimit = typeof clientCreditLimits.$inferInsert;

/**
 * Credit Signal History
 * Stores historical signal values for trend analysis and transparency
 */
export const creditSignalHistory = mysqlTable(
  "credit_signal_history",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Signal scores (0-100 each)
    revenueMomentum: decimal("revenue_momentum", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    cashCollectionStrength: decimal("cash_collection_strength", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    profitabilityQuality: decimal("profitability_quality", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("0"),
    debtAgingRisk: decimal("debt_aging_risk", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    repaymentVelocity: decimal("repayment_velocity", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    tenureDepth: decimal("tenure_depth", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    // Directional indicators (-1, 0, 1 for down, stable, up)
    revenueMomentumTrend: int("revenue_momentum_trend").notNull().default(0),
    cashCollectionTrend: int("cash_collection_trend").notNull().default(0),
    profitabilityTrend: int("profitability_trend").notNull().default(0),
    debtAgingTrend: int("debt_aging_trend").notNull().default(0),
    repaymentVelocityTrend: int("repayment_velocity_trend")
      .notNull()
      .default(0),

    // Metadata for debugging
    calculationMetadata: json("calculation_metadata"),

    calculatedAt: timestamp("calculated_at").defaultNow(),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    calculatedAtIdx: index("idx_calculated_at").on(table.calculatedAt),
  })
);

export type CreditSignalHistory = typeof creditSignalHistory.$inferSelect;
export type InsertCreditSignalHistory = typeof creditSignalHistory.$inferInsert;

/**
 * Credit System Settings
 * Global configuration for credit limit calculation weights
 */
export const creditSystemSettings = mysqlTable("credit_system_settings", {
  id: int("id").primaryKey().autoincrement(),

  // Signal weights (must sum to 100)
  revenueMomentumWeight: int("revenue_momentum_weight").notNull().default(20),
  cashCollectionWeight: int("cash_collection_weight").notNull().default(25),
  profitabilityWeight: int("profitability_weight").notNull().default(20),
  debtAgingWeight: int("debt_aging_weight").notNull().default(15),
  repaymentVelocityWeight: int("repayment_velocity_weight")
    .notNull()
    .default(10),
  tenureWeight: int("tenure_weight").notNull().default(10),

  // System parameters
  learningModeThreshold: int("learning_mode_threshold").notNull().default(3), // months
  minInvoicesForActivation: int("min_invoices_for_activation")
    .notNull()
    .default(15),
  directionalSensitivity: decimal("directional_sensitivity", {
    precision: 5,
    scale: 4,
  })
    .notNull()
    .default("0.1"),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)

  // Capacity calculation parameters
  revenueMultiplier: decimal("revenue_multiplier", { precision: 5, scale: 2 })
    .notNull()
    .default("2"),
  marginMultiplier: decimal("margin_multiplier", { precision: 5, scale: 2 })
    .notNull()
    .default("2.5"),

  // Global limits
  globalMinLimit: decimal("global_min_limit", { precision: 15, scale: 2 })
    .notNull()
    .default("1000"),
  globalMaxLimit: decimal("global_max_limit", { precision: 15, scale: 2 })
    .notNull()
    .default("1000000"),

  updatedBy: int("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type CreditSystemSettings = typeof creditSystemSettings.$inferSelect;
export type InsertCreditSystemSettings =
  typeof creditSystemSettings.$inferInsert;

/**
 * Credit Audit Log
 * Tracks significant changes to credit limits for compliance and analysis
 */
export const creditAuditLog = mysqlTable(
  "credit_audit_log",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    eventType: mysqlEnum("event_type", [
      "LIMIT_CALCULATED",
      "LIMIT_INCREASED",
      "LIMIT_DECREASED",
      "MODE_CHANGED",
      "MANUAL_OVERRIDE",
      "EXPOSURE_EXCEEDED",
    ]).notNull(),

    oldValue: decimal("old_value", { precision: 15, scale: 2 }),
    newValue: decimal("new_value", { precision: 15, scale: 2 }),
    changePercent: decimal("change_percent", { precision: 5, scale: 2 }),

    reason: text("reason"),
    metadata: json("metadata"),

    triggeredBy: int("triggered_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
  })
);

export type CreditAuditLog = typeof creditAuditLog.$inferSelect;
export type InsertCreditAuditLog = typeof creditAuditLog.$inferInsert;

/**
 * Credit Enforcement Mode Enum
 * Defines how credit limits are enforced during order creation
 */
export const creditEnforcementModeEnum = mysqlEnum("creditEnforcementMode", [
  "WARNING",     // Show warning but allow order
  "SOFT_BLOCK",  // Block by default, allow override with reason
  "HARD_BLOCK",  // Block completely, no override
]);

/**
 * Credit Visibility Settings
 * Controls which credit UI elements are shown and enforcement behavior
 * Can be configured globally (locationId = null) or per-location
 */
export const creditVisibilitySettings = mysqlTable(
  "credit_visibility_settings",
  {
    id: int("id").primaryKey().autoincrement(),
    locationId: int("location_id"), // NULL = global default

    // UI Element Visibility
    showCreditInClientList: boolean("show_credit_in_client_list")
      .default(true)
      .notNull(),
    showCreditBannerInOrders: boolean("show_credit_banner_in_orders")
      .default(true)
      .notNull(),
    showCreditWidgetInProfile: boolean("show_credit_widget_in_profile")
      .default(true)
      .notNull(),
    showSignalBreakdown: boolean("show_signal_breakdown")
      .default(true)
      .notNull(),
    showAuditLog: boolean("show_audit_log").default(true).notNull(),

    // Enforcement Settings
    creditEnforcementMode: creditEnforcementModeEnum
      .default("WARNING")
      .notNull(),
    warningThresholdPercent: int("warning_threshold_percent")
      .default(75)
      .notNull(),
    alertThresholdPercent: int("alert_threshold_percent")
      .default(90)
      .notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    locationIdIdx: index("idx_location_id").on(table.locationId),
  })
);

export type CreditVisibilitySettings =
  typeof creditVisibilitySettings.$inferSelect;
export type InsertCreditVisibilitySettings =
  typeof creditVisibilitySettings.$inferInsert;

// ============================================================================
// PRICING RULES & SALES SHEETS
// ============================================================================

/**
 * Pricing Rules
 * Define pricing adjustments based on conditions (category, strain, grade, etc.)
 */
export const pricingRules = mysqlTable(
  "pricing_rules",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Adjustment configuration
    adjustmentType: mysqlEnum("adjustment_type", [
      "PERCENT_MARKUP",
      "PERCENT_MARKDOWN",
      "DOLLAR_MARKUP",
      "DOLLAR_MARKDOWN",
    ]).notNull(),
    adjustmentValue: decimal("adjustment_value", {
      precision: 10,
      scale: 2,
    }).notNull(),

    // Conditions (JSON: { category: "Flower", grade: "A", ... })
    conditions: json("conditions").notNull(),
    logicType: mysqlEnum("logic_type", ["AND", "OR"]).default("AND"),
    priority: int("priority").default(0),

    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    priorityIdx: index("idx_priority").on(table.priority),
  })
);

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = typeof pricingRules.$inferInsert;

/**
 * Pricing Profiles
 * Named collections of pricing rules for reuse across clients
 */
export const pricingProfiles = mysqlTable("pricing_profiles", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  description: text("description"),

  // Array of rule IDs with priorities: [{ ruleId: 1, priority: 1 }, ...]
  rules: json("rules").notNull(),

  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type PricingProfile = typeof pricingProfiles.$inferSelect;
export type InsertPricingProfile = typeof pricingProfiles.$inferInsert;

/**
 * Order Price Adjustments (FEAT-004-BE)
 * Tracks all price adjustments made during order creation for audit trail
 */
export const orderPriceAdjustmentTypeEnum = mysqlEnum(
  "order_price_adjustment_type",
  ["ITEM", "CATEGORY", "ORDER"]
);

export const orderPriceAdjustmentModeEnum = mysqlEnum(
  "order_price_adjustment_mode",
  ["PERCENT", "FIXED"]
);

export const orderPriceAdjustments = mysqlTable(
  "order_price_adjustments",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    adjustmentType: orderPriceAdjustmentTypeEnum.notNull(),
    targetId: int("target_id"), // productId for ITEM, null for CATEGORY/ORDER
    targetCategory: varchar("target_category", { length: 100 }), // category name for CATEGORY type
    adjustmentMode: orderPriceAdjustmentModeEnum.notNull(),
    adjustmentValue: decimal("adjustment_value", {
      precision: 10,
      scale: 2,
    }).notNull(), // negative for discount, positive for markup
    originalPrice: decimal("original_price", { precision: 15, scale: 2 }),
    adjustedPrice: decimal("adjusted_price", { precision: 15, scale: 2 }),
    reason: text("reason"),
    notes: text("notes"), // MEET-038: Notes on product pricing
    adjustedBy: int("adjusted_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    orderIdIdx: index("idx_opa_order").on(table.orderId),
    adjustmentTypeIdx: index("idx_opa_type").on(table.adjustmentType),
    targetCategoryIdx: index("idx_opa_category").on(table.targetCategory),
  })
);

export type OrderPriceAdjustment = typeof orderPriceAdjustments.$inferSelect;
export type InsertOrderPriceAdjustment =
  typeof orderPriceAdjustments.$inferInsert;

/**
 * Variable Markup Rules (MEET-014)
 * Configurable age-based and quantity-based markup/discount rules
 */
export const variableMarkupRules = mysqlTable(
  "variable_markup_rules",
  {
    id: int("id").primaryKey().autoincrement(),
    profileId: int("profile_id").references(() => pricingProfiles.id, {
      onDelete: "cascade",
    }),
    ruleType: mysqlEnum("rule_type", ["AGE", "QUANTITY"]).notNull(),
    // For AGE: days threshold, For QUANTITY: units threshold
    thresholdMin: int("threshold_min").notNull().default(0),
    thresholdMax: int("threshold_max"), // null = unlimited
    adjustmentMode: orderPriceAdjustmentModeEnum.notNull(),
    adjustmentValue: decimal("adjustment_value", {
      precision: 10,
      scale: 2,
    }).notNull(),
    category: varchar("category", { length: 100 }), // Optional category filter
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    profileIdIdx: index("idx_vmr_profile").on(table.profileId),
    ruleTypeIdx: index("idx_vmr_type").on(table.ruleType),
  })
);

export type VariableMarkupRule = typeof variableMarkupRules.$inferSelect;
export type InsertVariableMarkupRule = typeof variableMarkupRules.$inferInsert;

/**
 * Credit Override Requests (FEAT-004-BE)
 * Tracks credit limit override requests and approvals
 */
export const creditOverrideRequests = mysqlTable(
  "credit_override_requests",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    requestedAmount: decimal("requested_amount", {
      precision: 15,
      scale: 2,
    }).notNull(),
    availableCredit: decimal("available_credit", {
      precision: 15,
      scale: 2,
    }).notNull(),
    shortfall: decimal("shortfall", { precision: 15, scale: 2 }).notNull(),
    reason: text("reason").notNull(),
    status: mysqlEnum("status", ["PENDING", "APPROVED", "REJECTED"])
      .notNull()
      .default("PENDING"),
    requestedBy: int("requested_by")
      .notNull()
      .references(() => users.id),
    reviewedBy: int("reviewed_by").references(() => users.id),
    reviewNotes: text("review_notes"),
    requestedAt: timestamp("requested_at").defaultNow(),
    reviewedAt: timestamp("reviewed_at"),
  },
  table => ({
    orderIdIdx: index("idx_cor_order").on(table.orderId),
    clientIdIdx: index("idx_cor_client").on(table.clientId),
    statusIdx: index("idx_cor_status").on(table.status),
  })
);

export type CreditOverrideRequest = typeof creditOverrideRequests.$inferSelect;
export type InsertCreditOverrideRequest =
  typeof creditOverrideRequests.$inferInsert;

/**
 * Price History (MEET-061, MEET-062)
 * Tracks historical prices for products by client
 */
export const priceHistory = mysqlTable(
  "price_history",
  {
    id: int("id").primaryKey().autoincrement(),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    batchId: int("batch_id").references(() => batches.id, {
      onDelete: "set null",
    }),
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "set null",
    }), // null for general price history
    orderId: int("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    transactionType: mysqlEnum("transaction_type", [
      "PURCHASE",
      "SALE",
    ]).notNull(),
    unitPrice: decimal("unit_price", { precision: 15, scale: 4 }).notNull(),
    quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
    totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),
    // Supplier info for PURCHASE transactions
    supplierId: int("supplier_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    productIdIdx: index("idx_ph_product").on(table.productId),
    clientIdIdx: index("idx_ph_client").on(table.clientId),
    supplierIdIdx: index("idx_ph_supplier").on(table.supplierId),
    transactionTypeIdx: index("idx_ph_type").on(table.transactionType),
    createdAtIdx: index("idx_ph_created").on(table.createdAt),
    // Composite index for last sale price lookup
    productClientIdx: index("idx_ph_product_client").on(
      table.productId,
      table.clientId,
      table.transactionType
    ),
  })
);

export type PriceHistory = typeof priceHistory.$inferSelect;
export type InsertPriceHistory = typeof priceHistory.$inferInsert;

/**
 * Sales Sheet Templates
 * Saved configurations for quick sales sheet creation
 */
export const salesSheetTemplates = mysqlTable(
  "sales_sheet_templates",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // NULL for universal templates, specific ID for client-specific
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),

    // Configuration JSON
    filters: json("filters").notNull(), // { category: "Flower", grade: "A", ... }
    selectedItems: json("selected_items").notNull(), // Array of inventory item IDs
    columnVisibility: json("column_visibility").notNull(), // { price: true, vendor: false, ... }

    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    lastUsedAt: timestamp("last_used_at"),
    expirationDate: timestamp("expiration_date"),
    isActive: int("is_active").notNull().default(1), // 0 = inactive, 1 = active
    currentVersion: int("current_version").notNull().default(1),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    createdByIdx: index("idx_created_by").on(table.createdBy),
  })
);

export type SalesSheetTemplate = typeof salesSheetTemplates.$inferSelect;
export type InsertSalesSheetTemplate = typeof salesSheetTemplates.$inferInsert;

/**
 * Sales Sheet History
 * Record of completed sales sheets sent to clients
 */
export const salesSheetHistory = mysqlTable(
  "sales_sheet_history",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    templateId: int("template_id").references(() => salesSheetTemplates.id, {
      onDelete: "set null",
    }),

    // Items with pricing: [{ itemId: 1, price: 150, quantity: 10, overridePrice: 140 }, ...]
    items: json("items").notNull(),
    totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
    itemCount: int("item_count").notNull(),

    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),

    // Sharing: Public share token and expiration
    shareToken: varchar("share_token", { length: 64 }),
    shareExpiresAt: timestamp("share_expires_at"),
    viewCount: int("view_count").notNull().default(0),
    lastViewedAt: timestamp("last_viewed_at"),

    // USP: Link to converted order (when sales sheet becomes a quote/order)
    // Note: FK constraint added via migration, not inline reference (avoids circular dependency)
    convertedToOrderId: int("converted_to_order_id"),
    // USP: Link to converted live shopping session
    convertedToSessionId: varchar("converted_to_session_id", { length: 36 }),
    // USP: Soft delete support for sales sheets
    deletedAt: timestamp("deleted_at"),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    createdByIdx: index("idx_created_by").on(table.createdBy),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
    // Sharing: Index for share token lookups
    shareTokenIdx: index("idx_sales_sheet_share_token").on(table.shareToken),
    // USP: Index for converted order lookups
    convertedToOrderIdIdx: index("idx_converted_to_order_id").on(table.convertedToOrderId),
    // USP: Index for soft delete filtering
    deletedAtIdx: index("idx_deleted_at").on(table.deletedAt),
  })
);

export type SalesSheetHistory = typeof salesSheetHistory.$inferSelect;
export type InsertSalesSheetHistory = typeof salesSheetHistory.$inferInsert;

/**
 * Sales Sheet Drafts
 * Auto-saved drafts for sales sheets in progress
 * QA-062: Implements draft/auto-save functionality
 */
export const salesSheetDrafts = mysqlTable(
  "sales_sheet_drafts",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    
    // Draft metadata
    name: varchar("name", { length: 255 }).notNull(),
    
    // Items with pricing (same structure as salesSheetHistory)
    items: json("items").notNull().$type<Array<{
      id: number;
      name: string;
      category?: string;
      subcategory?: string;
      strain?: string;
      basePrice: number;
      retailPrice: number;
      quantity: number;
      grade?: string;
      vendor?: string;
      priceMarkup: number;
      appliedRules?: Array<{
        ruleId: number;
        ruleName: string;
        adjustment: string;
      }>;
    }>>(),
    totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
    itemCount: int("item_count").notNull(),
    
    // Timestamps
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_drafts_client_id").on(table.clientId),
    createdByIdx: index("idx_drafts_created_by").on(table.createdBy),
    updatedAtIdx: index("idx_drafts_updated_at").on(table.updatedAt),
  })
);

export type SalesSheetDraft = typeof salesSheetDrafts.$inferSelect;
export type InsertSalesSheetDraft = typeof salesSheetDrafts.$inferInsert;

// ============================================================================
// QUOTE/SALES MODULE SCHEMA
// ============================================================================

/**
 * Order Type Enum
 * Unified type for quotes and sales
 */
export const orderTypeEnum = mysqlEnum("orderType", ["QUOTE", "SALE"]);

/**
 * Quote Status Enum
 * Lifecycle states for quotes
 */
export const quoteStatusEnum = mysqlEnum("quoteStatus", [
  "DRAFT",
  "SENT",
  "VIEWED",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
  "CONVERTED",
]);

/**
 * Sale Status Enum
 * Lifecycle states for sales (PAYMENT STATUS)
 */
export const saleStatusEnum = mysqlEnum("saleStatus", [
  "PENDING",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "CANCELLED",
]);

/**
 * Fulfillment Status Enum
 * Lifecycle states for order fulfillment (SHIPPING STATUS)
 * Separate from payment status to track physical order processing
 */
export const fulfillmentStatusEnum = mysqlEnum("fulfillmentStatus", [
  "PENDING",
  "PACKED",
  "SHIPPED",
]);

/**
 * WS-003: Pick & Pack Status Enum
 * Tracks the warehouse picking/packing workflow status
 */
export const pickPackStatusEnum = mysqlEnum("pickPackStatus", [
  "PENDING",   // Order confirmed, waiting to be picked
  "PICKING",   // Currently being picked
  "PACKED",    // All items packed into bags
  "READY",     // Ready for shipping/pickup
]);

/**
 * Orders Table (Unified Quotes + Sales)
 * Combines quotes and sales into a single table for simplicity
 */
export const orders = mysqlTable(
  "orders",
  {
    id: int("id").primaryKey().autoincrement(),
    version: int("version").notNull().default(1), // Optimistic locking (DATA-005)
    orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
    orderType: orderTypeEnum.notNull(),
    isDraft: boolean("is_draft").notNull().default(true),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    clientNeedId: int("client_need_id"), // Link to client need if order was created from a need

    // v3.2: Link to INTAKE calendar event if order was created from appointment
    intakeEventId: int("intake_event_id").references(() => calendarEvents.id, {
      onDelete: "set null",
    }),

    // Items (same structure for both quotes and sales)
    items: json("items").notNull(),

    // Financials
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
    tax: decimal("tax", { precision: 15, scale: 2 }).default("0"),
    discount: decimal("discount", { precision: 15, scale: 2 }).default("0"),
    total: decimal("total", { precision: 15, scale: 2 }).notNull(),
    totalCogs: decimal("total_cogs", { precision: 15, scale: 2 }),
    totalMargin: decimal("total_margin", { precision: 15, scale: 2 }),
    avgMarginPercent: decimal("avg_margin_percent", { precision: 5, scale: 2 }),

    // Quote-specific fields (NULL for sales)
    validUntil: date("valid_until"),
    quoteStatus: quoteStatusEnum,

    // Sale-specific fields (NULL for quotes)
    paymentTerms: paymentTermsEnum,
    cashPayment: decimal("cash_payment", { precision: 15, scale: 2 }).default(
      "0"
    ),
    dueDate: date("due_date"),
    saleStatus: saleStatusEnum,
    invoiceId: int("invoice_id"),

    // Fulfillment tracking (for SALE orders)
    fulfillmentStatus: fulfillmentStatusEnum.default("PENDING"),
    packedAt: timestamp("packed_at"),
    packedBy: int("packed_by").references(() => users.id),
    shippedAt: timestamp("shipped_at"),
    shippedBy: int("shipped_by").references(() => users.id),

    // WS-003: Pick & Pack tracking
    pickPackStatus: pickPackStatusEnum.default("PENDING"),

    // WS-004: Referral tracking
    referredByClientId: int("referred_by_client_id").references(() => clients.id),
    isReferralOrder: boolean("is_referral_order").default(false),

    // Conversion tracking
    convertedFromOrderId: int("converted_from_order_id").references(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (): any => orders.id
    ),
    // USP: Link back to original sales sheet (when order was created from sales sheet)
    // Note: FK constraint added via migration, not inline reference (avoids circular dependency)
    convertedFromSalesSheetId: int("converted_from_sales_sheet_id"),
    convertedAt: timestamp("converted_at"),
    confirmedAt: timestamp("confirmed_at"),
    relatedSampleRequestId: int("related_sample_request_id"), // Link to sample request if order came from sample

    // FEAT-004-BE: Credit Override fields
    creditOverrideApproved: boolean("credit_override_approved").default(false),
    creditOverrideBy: int("credit_override_by").references(() => users.id),
    creditOverrideReason: text("credit_override_reason"),
    creditOverrideRequestId: int("credit_override_request_id"),

    // USP: Soft delete support for orders
    deletedAt: timestamp("deleted_at"),

    // Metadata
    notes: text("notes"),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    orderTypeIdx: index("idx_order_type").on(table.orderType),
    isDraftIdx: index("idx_is_draft").on(table.isDraft),
    quoteStatusIdx: index("idx_quote_status").on(table.quoteStatus),
    saleStatusIdx: index("idx_sale_status").on(table.saleStatus),
    fulfillmentStatusIdx: index("idx_fulfillment_status").on(
      table.fulfillmentStatus
    ),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
    // USP: Index for sales sheet origin lookups
    convertedFromSalesSheetIdIdx: index("idx_converted_from_sales_sheet_id").on(
      table.convertedFromSalesSheetId
    ),
    // USP: Index for soft delete filtering
    deletedAtIdx: index("idx_orders_deleted_at").on(table.deletedAt),
  })
);

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order Status History
 * Tracks all fulfillment status changes for orders
 */
// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)
export const orderStatusHistory = mysqlTable(
  "order_status_history",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "restrict" }), // QUAL-004: Protect audit trail
    fulfillmentStatus: fulfillmentStatusEnum.notNull().default("PENDING"),
    changedBy: int("changed_by")
      .notNull()
      .references(() => users.id),
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    notes: text("notes"),
    deletedAt: timestamp("deleted_at"), // Soft delete support (DATA-010)
  },
  table => ({
    orderIdIdx: index("idx_order_id").on(table.orderId),
    changedAtIdx: index("idx_changed_at").on(table.changedAt),
  })
);

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

/**
 * WS-003: Order Bags Table
 * Tracks bags/containers used for packing orders
 */
export const orderBags = mysqlTable(
  "order_bags",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    bagIdentifier: varchar("bag_identifier", { length: 50 }).notNull(), // e.g., "BAG-001"
    notes: text("notes"),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    orderIdIdx: index("idx_order_bags_order_id").on(table.orderId),
    uniqueBagPerOrder: uniqueIndex("unique_bag_per_order").on(table.orderId, table.bagIdentifier),
  })
);

export type OrderBag = typeof orderBags.$inferSelect;
export type InsertOrderBag = typeof orderBags.$inferInsert;

/**
 * WS-003: Order Item Bags Table
 * Tracks which items are assigned to which bags
 */
export const orderItemBags = mysqlTable(
  "order_item_bags",
  {
    id: int("id").primaryKey().autoincrement(),
    orderItemId: int("order_item_id").notNull(), // References order line item (JSON items array index or orderLineItems.id)
    bagId: int("bag_id")
      .notNull()
      .references(() => orderBags.id, { onDelete: "cascade" }),
    packedAt: timestamp("packed_at").defaultNow(),
    packedBy: int("packed_by").references(() => users.id),
  },
  table => ({
    bagIdIdx: index("idx_order_item_bags_bag_id").on(table.bagId),
    uniqueItemBag: uniqueIndex("unique_item_bag").on(table.orderItemId, table.bagId),
  })
);

export type OrderItemBag = typeof orderItemBags.$inferSelect;
export type InsertOrderItemBag = typeof orderItemBags.$inferInsert;

// WS-003: Relations for order bags
export const orderBagsRelations = relations(orderBags, ({ one, many }) => ({
  order: one(orders, {
    fields: [orderBags.orderId],
    references: [orders.id],
  }),
  createdByUser: one(users, {
    fields: [orderBags.createdBy],
    references: [users.id],
  }),
  items: many(orderItemBags),
}));

export const orderItemBagsRelations = relations(orderItemBags, ({ one }) => ({
  bag: one(orderBags, {
    fields: [orderItemBags.bagId],
    references: [orderBags.id],
  }),
  packedByUser: one(users, {
    fields: [orderItemBags.packedBy],
    references: [users.id],
  }),
}));

/**
 * Return Reason Enum
 * Reasons for order returns
 */
export const returnReasonEnum = mysqlEnum("returnReason", [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "CUSTOMER_CHANGED_MIND",
  "OTHER",
]);

/**
 * Returns Table
 * Tracks returns for orders with automatic inventory restocking
 */
export const returns = mysqlTable(
  "returns",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    items: json("items").notNull(), // Array of { batchId, quantity, reason }
    returnReason: returnReasonEnum.notNull(),
    notes: text("notes"),
    processedBy: int("processed_by")
      .notNull()
      .references(() => users.id),
    processedAt: timestamp("processed_at").defaultNow().notNull(),
  },
  table => ({
    orderIdIdx: index("idx_order_id").on(table.orderId),
    processedAtIdx: index("idx_processed_at").on(table.processedAt),
  })
);

export type Return = typeof returns.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;

/**
 * Sample Inventory Log
 * Tracks sample inventory allocations and consumption
 */
export const sampleInventoryLog = mysqlTable(
  "sample_inventory_log",
  {
    id: int("id").primaryKey().autoincrement(),
    batchId: int("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    orderId: int("order_id").references(() => orders.id, {
      onDelete: "cascade",
    }),

    quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
    action: mysqlEnum("action", [
      "ALLOCATED",
      "RELEASED",
      "CONSUMED",
    ]).notNull(),

    notes: text("notes"),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    batchIdIdx: index("idx_batch_id").on(table.batchId),
    orderIdIdx: index("idx_order_id").on(table.orderId),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
  })
);

export type SampleInventoryLog = typeof sampleInventoryLog.$inferSelect;
export type InsertSampleInventoryLog = typeof sampleInventoryLog.$inferInsert;

/**
 * COGS Rules (Optional - Simple Version)
 * Global rules for COGS calculation
 */
export const cogsRules = mysqlTable(
  "cogs_rules",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Simple condition (not complex engine)
    conditionField: mysqlEnum("condition_field", [
      "QUANTITY",
      "TOTAL_VALUE",
      "CLIENT_TIER",
      "PAYMENT_TERMS",
    ]),
    conditionOperator: mysqlEnum("condition_operator", [
      "GT",
      "GTE",
      "LT",
      "LTE",
      "EQ",
    ]),
    conditionValue: decimal("condition_value", { precision: 15, scale: 4 }),

    // Adjustment
    adjustmentType: mysqlEnum("adjustment_type", [
      "PERCENTAGE",
      "FIXED_AMOUNT",
      "USE_MIN",
      "USE_MAX",
    ]),
    adjustmentValue: decimal("adjustment_value", { precision: 10, scale: 4 }),

    priority: int("priority").default(0),
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    priorityIdx: index("idx_priority").on(table.priority),
    isActiveIdx: index("idx_is_active").on(table.isActive),
  })
);

export type CogsRule = typeof cogsRules.$inferSelect;
export type InsertCogsRule = typeof cogsRules.$inferInsert;

// ============================================================================
// TRANSACTION RELATIONSHIP MODEL
// ============================================================================

/**
 * Transaction Type Enum
 * Defines all possible transaction types in the system
 */
export const transactionTypeEnum = mysqlEnum("transactionType", [
  "INVOICE",
  "PAYMENT",
  "REFUND",
  "CREDIT",
  "QUOTE",
  "ORDER",
  "SALE",
]);

/**
 * Transaction Status Enum
 * Defines the lifecycle status of a transaction
 */
export const transactionStatusEnum = mysqlEnum("transactionStatus", [
  "DRAFT",
  "PENDING",
  "CONFIRMED",
  "COMPLETED",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "VOID",
  "WRITTEN_OFF",
]);

/**
 * Base Transactions Table
 * Central table that all transaction types reference
 * Provides a unified view of all business transactions
 */
export const transactions = mysqlTable(
  "transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    transactionNumber: varchar("transactionNumber", { length: 50 })
      .notNull()
      .unique(),
    transactionType: transactionTypeEnum.notNull(), // DB column name matches
    clientId: int("clientId")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    transactionDate: timestamp("transactionDate").notNull(),
    amount: varchar("amount", { length: 20 }).notNull(),
    transactionStatus: transactionStatusEnum.notNull(),
    notes: text("notes"),
    metadata: text("metadata"), // JSON string for type-specific data
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_transactions_client_id").on(table.clientId),
    transactionTypeIdx: index("idx_transactions_type").on(
      table.transactionType
    ),
    transactionDateIdx: index("idx_transactions_date").on(
      table.transactionDate
    ),
    statusIdx: index("idx_transactions_status").on(table.transactionStatus),
  })
);

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Transaction Link Type Enum
 * Defines the type of relationship between transactions
 */
export const transactionLinkTypeEnum = mysqlEnum("transactionLinkType", [
  "REFUND_OF", // Child is a refund of parent
  "PAYMENT_FOR", // Child is a payment for parent
  "CREDIT_APPLIED_TO", // Child credit is applied to parent invoice
  "CONVERTED_FROM", // Child is converted from parent (e.g., quote to order)
  "PARTIAL_OF", // Child is a partial payment/refund of parent
  "RELATED_TO", // General relationship
]);

/**
 * Transaction Links Table
 * Establishes parent-child relationships between transactions
 * Enables tracking of refunds to original sales, payments to invoices, etc.
 */
export const transactionLinks = mysqlTable(
  "transactionLinks",
  {
    id: int("id").autoincrement().primaryKey(),
    parentTransactionId: int("parentTransactionId")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    childTransactionId: int("childTransactionId")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    transactionLinkType: transactionLinkTypeEnum.notNull(),
    linkAmount: varchar("linkAmount", { length: 20 }), // Amount of the link (for partial payments/refunds)
    notes: text("notes"),
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    parentIdIdx: index("idx_transaction_links_parent").on(
      table.parentTransactionId
    ),
    childIdIdx: index("idx_transaction_links_child").on(
      table.childTransactionId
    ),
    linkTypeIdx: index("idx_transaction_links_type").on(
      table.transactionLinkType
    ),
  })
);

export type TransactionLink = typeof transactionLinks.$inferSelect;
export type InsertTransactionLink = typeof transactionLinks.$inferInsert;

// ============================================================================
// CREDIT MANAGEMENT SYSTEM
// ============================================================================

/**
 * Credit Status Enum
 * Defines the lifecycle status of a credit
 */
export const creditStatusEnum = mysqlEnum("creditStatus", [
  "ACTIVE",
  "PARTIALLY_USED",
  "FULLY_USED",
  "EXPIRED",
  "VOID",
]);

/**
 * Credits Table
 * Manages customer credits (store credit, promotional credits, goodwill gestures)
 */
export const credits = mysqlTable(
  "credits",
  {
    id: int("id").autoincrement().primaryKey(),
    creditNumber: varchar("creditNumber", { length: 50 }).notNull().unique(),
    clientId: int("clientId")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    transactionId: int("transactionId").references(() => transactions.id), // Link to base transaction
    creditAmount: varchar("creditAmount", { length: 20 }).notNull(),
    amountUsed: varchar("amountUsed", { length: 20 }).notNull().default("0"),
    amountRemaining: varchar("amountRemaining", { length: 20 }).notNull(),
    creditReason: varchar("creditReason", { length: 100 }),
    expirationDate: timestamp("expirationDate"),
    creditStatus: creditStatusEnum.notNull().default("ACTIVE"),
    notes: text("notes"),
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_credits_client_id").on(table.clientId),
    statusIdx: index("idx_credits_status").on(table.creditStatus),
    expirationDateIdx: index("idx_credits_expiration").on(table.expirationDate),
  })
);

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

/**
 * Credit Applications Table
 * Tracks when credits are applied to invoices
 */
export const creditApplications = mysqlTable(
  "creditApplications",
  {
    id: int("id").autoincrement().primaryKey(),
    creditId: int("creditId")
      .notNull()
      .references(() => credits.id, { onDelete: "cascade" }),
    invoiceId: int("invoiceId")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    amountApplied: varchar("amountApplied", { length: 20 }).notNull(),
    appliedDate: timestamp("appliedDate").notNull(),
    notes: text("notes"),
    appliedBy: int("appliedBy")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    creditIdIdx: index("idx_credit_applications_credit").on(table.creditId),
    invoiceIdIdx: index("idx_credit_applications_invoice").on(table.invoiceId),
  })
);

export type CreditApplication = typeof creditApplications.$inferSelect;
export type InsertCreditApplication = typeof creditApplications.$inferInsert;

// ============================================================================
// CUSTOMIZABLE PAYMENT METHODS
// ============================================================================

/**
 * Payment Methods Table
 * Allows customizable payment methods instead of hardcoded enum
 */
export const paymentMethods = mysqlTable(
  "paymentMethods",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    isActive: int("isActive").notNull().default(1),
    sortOrder: int("sortOrder").notNull().default(0),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    isActiveIdx: index("idx_payment_methods_active").on(table.isActive),
    sortOrderIdx: index("idx_payment_methods_sort").on(table.sortOrder),
  })
);

export type PaymentMethod = typeof paymentMethods.$inferSelect;
export type InsertPaymentMethod = typeof paymentMethods.$inferInsert;

// ============================================================================
// INVENTORY MOVEMENT TRACKING (Phase 2 Preparation)
// ============================================================================

/**
 * Inventory Movement Type Enum
 * Defines all types of inventory quantity changes
 */
export const inventoryMovementTypeEnum = mysqlEnum("inventoryMovementType", [
  "INTAKE",
  "SALE",
  "RETURN",
  "REFUND_RETURN",
  "ADJUSTMENT",
  "QUARANTINE",
  "RELEASE_FROM_QUARANTINE",
  "DISPOSAL",
  "TRANSFER",
  "SAMPLE",
]);

/**
 * Inventory Adjustment Reason Enum
 * Reasons for manual inventory adjustments
 */
export const adjustmentReasonEnum = mysqlEnum("adjustmentReason", [
  "DAMAGED",
  "EXPIRED",
  "LOST",
  "THEFT",
  "COUNT_DISCREPANCY",
  "QUALITY_ISSUE",
  "REWEIGH",
  "OTHER",
]);

/**
 * Inventory Movements Table
 * Comprehensive audit trail of all inventory quantity changes
 * Links inventory changes to business transactions
 */
// SCHEMA DRIFT FIX: Updated to match actual database structure (SEED-001)
// PILOT FIX: Added deletedAt to align with database (migration 0039)
export const inventoryMovements = mysqlTable(
  "inventoryMovements",
  {
    id: int("id").autoincrement().primaryKey(),
    batchId: int("batchId")
      .notNull()
      .references(() => batches.id, { onDelete: "restrict" }), // QUAL-004: Protect audit trail
    inventoryMovementType: inventoryMovementTypeEnum.notNull(),
    quantityChange: varchar("quantityChange", { length: 20 }).notNull(), // Can be negative
    quantityBefore: varchar("quantityBefore", { length: 20 }).notNull(),
    quantityAfter: varchar("quantityAfter", { length: 20 }).notNull(),
    referenceType: varchar("referenceType", { length: 50 }), // "ORDER", "REFUND", "ADJUSTMENT", etc.
    referenceId: int("referenceId"),
    adjustmentReason: adjustmentReasonEnum, // Reason for manual adjustments (DATA-010)
    notes: text("notes"), // Additional context (renamed from reason per migration 0030)
    performedBy: int("performedBy")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  },
  table => ({
    batchIdIdx: index("idx_inventory_movements_batch").on(table.batchId),
    movementTypeIdx: index("idx_inventory_movements_type").on(
      table.inventoryMovementType
    ),
    referenceIdx: index("idx_inventory_movements_reference").on(
      table.referenceType,
      table.referenceId
    ),
    createdAtIdx: index("idx_inventory_movements_created").on(table.createdAt),
  })
);

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;

// ============================================================================
// SAMPLE MANAGEMENT MODULE (Phase 6)
// ============================================================================

/**
 * Sample Request Status Enum
 * Tracks the lifecycle of a sample request
 * Extended with return workflow statuses (SAMPLE-006, SAMPLE-007)
 */
export const sampleRequestStatusEnum = mysqlEnum("sampleRequestStatus", [
  "PENDING",
  "FULFILLED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURN_APPROVED",
  "RETURNED",
  "VENDOR_RETURN_REQUESTED",
  "SHIPPED_TO_VENDOR",
  "VENDOR_CONFIRMED",
]);

/**
 * Sample Location Enum (SAMPLE-008)
 * Tracks where each sample is physically located
 */
export const sampleLocationEnum = mysqlEnum("sampleLocation", [
  "WAREHOUSE",
  "WITH_CLIENT",
  "WITH_SALES_REP",
  "RETURNED",
  "LOST",
]);

/**
 * Sample Requests Table
 * Tracks all sample requests from clients
 * Includes monthly allocation tracking and conversion metrics
 * Extended with return workflow, location, and expiration fields (SAMPLE-006 to SAMPLE-009)
 */
export const sampleRequests = mysqlTable(
  "sampleRequests",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("clientId")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    requestedBy: int("requestedBy")
      .notNull()
      .references(() => users.id),
    requestDate: timestamp("requestDate").defaultNow().notNull(),
    products: json("products")
      .$type<Array<{ productId: number; quantity: string }>>()
      .notNull(), // Array of {productId, quantity}
    sampleRequestStatus: sampleRequestStatusEnum.notNull().default("PENDING"),
    fulfilledDate: timestamp("fulfilledDate"),
    fulfilledBy: int("fulfilledBy").references(() => users.id),
    cancelledDate: timestamp("cancelledDate"),
    cancelledBy: int("cancelledBy").references(() => users.id),
    cancellationReason: text("cancellationReason"),
    notes: text("notes"),
    totalCost: decimal("totalCost", { precision: 10, scale: 2 }), // COGS of samples
    relatedOrderId: int("relatedOrderId").references(() => orders.id), // If sample led to order
    conversionDate: timestamp("conversionDate"), // When sample converted to sale
    // Return workflow fields (SAMPLE-006)
    returnRequestedDate: timestamp("returnRequestedDate"),
    returnRequestedBy: int("returnRequestedBy").references(() => users.id),
    returnReason: text("returnReason"),
    returnCondition: varchar("returnCondition", { length: 50 }), // e.g., "GOOD", "DAMAGED", "OPENED"
    returnApprovedDate: timestamp("returnApprovedDate"),
    returnApprovedBy: int("returnApprovedBy").references(() => users.id),
    returnDate: timestamp("returnDate"),
    // Vendor return workflow fields (SAMPLE-007)
    vendorReturnTrackingNumber: varchar("vendorReturnTrackingNumber", { length: 100 }),
    vendorShippedDate: timestamp("vendorShippedDate"),
    vendorConfirmedDate: timestamp("vendorConfirmedDate"),
    // Location tracking (SAMPLE-008)
    location: sampleLocationEnum.default("WAREHOUSE"),
    // Expiration tracking (SAMPLE-009)
    expirationDate: timestamp("expirationDate"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_sample_requests_client").on(table.clientId),
    statusIdx: index("idx_sample_requests_status").on(
      table.sampleRequestStatus
    ),
    requestDateIdx: index("idx_sample_requests_date").on(table.requestDate),
    relatedOrderIdx: index("idx_sample_requests_order").on(
      table.relatedOrderId
    ),
    locationIdx: index("idx_sample_requests_location").on(table.location),
    expirationIdx: index("idx_sample_requests_expiration").on(table.expirationDate),
  })
);

export type SampleRequest = typeof sampleRequests.$inferSelect;
export type InsertSampleRequest = typeof sampleRequests.$inferInsert;

/**
 * Sample Allocations Table
 * Tracks monthly sample allocation limits per client
 */
export const sampleAllocations = mysqlTable(
  "sampleAllocations",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("clientId")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    monthYear: varchar("monthYear", { length: 7 }).notNull(), // Format: "2025-10"
    allocatedQuantity: varchar("allocatedQuantity", { length: 20 }).notNull(), // e.g., "7.0" grams
    usedQuantity: varchar("usedQuantity", { length: 20 })
      .notNull()
      .default("0"),
    remainingQuantity: varchar("remainingQuantity", { length: 20 }).notNull(), // computed
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientMonthIdx: index("idx_sample_allocations_client_month").on(
      table.clientId,
      table.monthYear
    ),
    uniqueClientMonth: index("idx_sample_allocations_unique").on(
      table.clientId,
      table.monthYear
    ),
  })
);

export type SampleAllocation = typeof sampleAllocations.$inferSelect;
export type InsertSampleAllocation = typeof sampleAllocations.$inferInsert;

/**
 * Sample Location History Table (SAMPLE-008)
 * Tracks the history of location changes for each sample
 */
export const sampleLocationHistory = mysqlTable(
  "sampleLocationHistory",
  {
    id: int("id").autoincrement().primaryKey(),
    sampleRequestId: int("sampleRequestId")
      .notNull()
      .references(() => sampleRequests.id, { onDelete: "cascade" }),
    fromLocation: sampleLocationEnum,
    toLocation: sampleLocationEnum.notNull(),
    changedBy: int("changedBy")
      .notNull()
      .references(() => users.id),
    changedAt: timestamp("changedAt").defaultNow().notNull(),
    notes: text("notes"),
  },
  table => ({
    sampleIdIdx: index("idx_sample_location_history_sample").on(table.sampleRequestId),
    changedAtIdx: index("idx_sample_location_history_date").on(table.changedAt),
  })
);

export type SampleLocationHistory = typeof sampleLocationHistory.$inferSelect;
export type InsertSampleLocationHistory = typeof sampleLocationHistory.$inferInsert;

// ============================================================================
// DASHBOARD ENHANCEMENTS (Phase 7)
// ============================================================================

/**
 * Inventory Alert Type Enum
 * Defines different types of inventory alerts
 */
export const inventoryAlertTypeEnum = mysqlEnum("inventoryAlertType", [
  "LOW_STOCK",
  "EXPIRING",
  "OVERSTOCK",
  "SLOW_MOVING",
]);

/**
 * Alert Severity Enum
 */
export const alertSeverityEnum = mysqlEnum("alertSeverity", [
  "LOW",
  "MEDIUM",
  "HIGH",
]);

/**
 * Alert Status Enum
 */
export const alertStatusEnum = mysqlEnum("alertStatus", [
  "ACTIVE",
  "ACKNOWLEDGED",
  "RESOLVED",
]);

/**
 * Inventory Alerts Table
 * Tracks inventory-related alerts for dashboard
 */
export const inventoryAlerts = mysqlTable(
  "inventoryAlerts",
  {
    id: int("id").autoincrement().primaryKey(),
    inventoryAlertType: inventoryAlertTypeEnum.notNull(),
    batchId: int("batchId")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    threshold: decimal("threshold", { precision: 10, scale: 2 }),
    currentValue: decimal("currentValue", { precision: 10, scale: 2 }),
    alertSeverity: alertSeverityEnum.notNull(),
    alertStatus: alertStatusEnum.notNull().default("ACTIVE"),
    message: text("message"),
    acknowledgedBy: int("acknowledgedBy").references(() => users.id),
    acknowledgedAt: timestamp("acknowledgedAt"),
    resolvedAt: timestamp("resolvedAt"),
    resolution: text("resolution"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    batchIdIdx: index("idx_inventory_alerts_batch").on(table.batchId),
    statusIdx: index("idx_inventory_alerts_status").on(table.alertStatus),
    alertTypeIdx: index("idx_inventory_alerts_type").on(
      table.inventoryAlertType
    ),
    severityIdx: index("idx_inventory_alerts_severity").on(table.alertSeverity),
  })
);

export type InventoryAlert = typeof inventoryAlerts.$inferSelect;
export type InsertInventoryAlert = typeof inventoryAlerts.$inferInsert;

/**
 * Inventory Saved Views Table
 * Stores user-defined filter combinations for quick access
 */
export const inventoryViews = mysqlTable(
  "inventoryViews",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    filters: json("filters").notNull(), // Stores filter state as JSON
    createdBy: int("createdBy").references(() => users.id, {
      onDelete: "cascade",
    }),
    isShared: int("isShared").notNull().default(0), // 0 = private, 1 = shared
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    createdByIdx: index("idx_inventory_views_created_by").on(table.createdBy),
  })
);

export type InventoryView = typeof inventoryViews.$inferSelect;
export type InsertInventoryView = typeof inventoryViews.$inferInsert;

// NOTE: userDashboardPreferences table is now defined in the DASHBOARD PREFERENCES section
// at the top of this file (after users table) with a new structure using JSON for widget config

// ============================================================================
// SALES SHEET ENHANCEMENTS (Phase 8)
// ============================================================================

/**
 * Sales Sheet Versions Table
 * Tracks version history of sales sheet templates
 */
export const salesSheetVersions = mysqlTable(
  "salesSheetVersions",
  {
    id: int("id").autoincrement().primaryKey(),
    templateId: int("templateId")
      .notNull()
      .references(() => salesSheetTemplates.id, { onDelete: "cascade" }),
    versionNumber: int("versionNumber").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    filters: json("filters").notNull(),
    selectedItems: json("selected_items").notNull(),
    columnVisibility: json("column_visibility").notNull(),
    changes: text("changes"), // Description of what changed
    createdBy: int("createdBy")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    templateVersionIdx: index("idx_sales_sheet_versions_template").on(
      table.templateId,
      table.versionNumber
    ),
  })
);

export type SalesSheetVersion = typeof salesSheetVersions.$inferSelect;
export type InsertSalesSheetVersion = typeof salesSheetVersions.$inferInsert;

// ============================================================================
// ADVANCED TAG FEATURES (Phase 9)
// ============================================================================

/**
 * Tag Hierarchy Table
 * Supports parent-child relationships for tags
 */
export const tagHierarchy = mysqlTable(
  "tagHierarchy",
  {
    id: int("id").autoincrement().primaryKey(),
    parentTagId: int("parentTagId")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    childTagId: int("childTagId")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    parentChildIdx: index("idx_tag_hierarchy_parent_child").on(
      table.parentTagId,
      table.childTagId
    ),
    uniqueRelation: index("idx_tag_hierarchy_unique").on(
      table.parentTagId,
      table.childTagId
    ),
  })
);

export type TagHierarchy = typeof tagHierarchy.$inferSelect;
export type InsertTagHierarchy = typeof tagHierarchy.$inferInsert;

/**
 * Tag Groups Table
 * Logical groupings of tags for easier management
 */
export const tagGroups = mysqlTable("tagGroups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  deletedAt: timestamp("deleted_at"), // Soft delete support (ST-013)
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color code
  createdBy: int("createdBy")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TagGroup = typeof tagGroups.$inferSelect;
export type InsertTagGroup = typeof tagGroups.$inferInsert;

/**
 * Tag Group Members Table
 * Many-to-many relationship between tags and tag groups
 */
export const tagGroupMembers = mysqlTable(
  "tagGroupMembers",
  {
    id: int("id").autoincrement().primaryKey(),
    groupId: int("groupId")
      .notNull()
      .references(() => tagGroups.id, { onDelete: "cascade" }),
    tagId: int("tagId")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    groupTagIdx: index("idx_tag_group_members_group_tag").on(
      table.groupId,
      table.tagId
    ),
  })
);

export type TagGroupMember = typeof tagGroupMembers.$inferSelect;
export type InsertTagGroupMember = typeof tagGroupMembers.$inferInsert;

/**
 * Product Intake Sessions
 * Tracks intake sessions where multiple batches are received from a vendor
 */
export const intakeSessions = mysqlTable(
  "intake_sessions",
  {
    id: int("id").primaryKey().autoincrement(),
    sessionNumber: varchar("session_number", { length: 50 }).notNull().unique(),
    vendorId: int("vendor_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),
    status: mysqlEnum("status", ["IN_PROGRESS", "COMPLETED", "CANCELLED"])
      .notNull()
      .default("IN_PROGRESS"),

    // Session-level details
    receiveDate: date("receive_date").notNull(),
    receivedBy: int("received_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Payment terms for entire session
    paymentTerms: paymentTermsEnum.notNull(),
    paymentDueDate: date("payment_due_date"),
    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default(
      "0"
    ),
    amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default(
      "0"
    ),

    // Notes
    internalNotes: text("internal_notes"),
    vendorNotes: text("vendor_notes"), // Shared with vendor on receipt

    // Receipt generation
    receiptGenerated: boolean("receipt_generated").default(false),
    receiptGeneratedAt: timestamp("receipt_generated_at"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    completedAt: timestamp("completed_at"),
  },
  table => ({
    vendorIdIdx: index("idx_vendor_id").on(table.vendorId),
    statusIdx: index("idx_status").on(table.status),
    receiveDateIdx: index("idx_receive_date").on(table.receiveDate),
  })
);

export type IntakeSession = typeof intakeSessions.$inferSelect;
export type InsertIntakeSession = typeof intakeSessions.$inferInsert;

/**
 * Intake Session Batches
 * Links batches to intake sessions with batch-specific details
 */
export const intakeSessionBatches = mysqlTable(
  "intake_session_batches",
  {
    id: int("id").primaryKey().autoincrement(),
    intakeSessionId: int("intake_session_id")
      .notNull()
      .references(() => intakeSessions.id, { onDelete: "cascade" }),
    batchId: int("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),

    // Batch-specific intake details
    receivedQty: decimal("received_qty", { precision: 15, scale: 4 }).notNull(),
    unitCost: decimal("unit_cost", { precision: 15, scale: 4 }).notNull(),
    totalCost: decimal("total_cost", { precision: 15, scale: 4 }).notNull(),

    // Batch-specific notes
    internalNotes: text("internal_notes"),
    vendorNotes: text("vendor_notes"), // Shared with vendor on receipt

    // COGS agreement for this batch
    cogsAgreement: text("cogs_agreement"),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    intakeSessionIdIdx: index("idx_intake_session_id").on(
      table.intakeSessionId
    ),
    batchIdIdx: index("idx_batch_id").on(table.batchId),
  })
);

export type IntakeSessionBatch = typeof intakeSessionBatches.$inferSelect;
export type InsertIntakeSessionBatch = typeof intakeSessionBatches.$inferInsert;

/**
 * Recurring Orders
 * Defines automatic recurring orders for clients
 */
export const recurringOrders = mysqlTable(
  "recurring_orders",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Schedule configuration
    frequency: mysqlEnum("frequency", [
      "DAILY",
      "WEEKLY",
      "BIWEEKLY",
      "MONTHLY",
      "QUARTERLY",
    ]).notNull(),
    dayOfWeek: int("day_of_week"), // 0-6 for weekly
    dayOfMonth: int("day_of_month"), // 1-31 for monthly

    // Order template
    orderTemplate: json("order_template")
      .$type<{
        items: Array<{
          productId: number;
          quantity: number;
          notes?: string;
        }>;
      }>()
      .notNull(),

    // Status and dates
    status: mysqlEnum("status", ["ACTIVE", "PAUSED", "CANCELLED"])
      .notNull()
      .default("ACTIVE"),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    lastGeneratedDate: date("last_generated_date"),
    nextGenerationDate: date("next_generation_date").notNull(),

    // Notifications
    notifyClient: boolean("notify_client").default(true),
    notifyEmail: varchar("notify_email", { length: 255 }),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    statusIdx: index("idx_status").on(table.status),
    nextGenerationDateIdx: index("idx_next_generation_date").on(
      table.nextGenerationDate
    ),
  })
);

export type RecurringOrder = typeof recurringOrders.$inferSelect;
export type InsertRecurringOrder = typeof recurringOrders.$inferInsert;

/**
 * Alert Configurations
 * User-defined alert rules and thresholds
 */
export const alertConfigurations = mysqlTable(
  "alert_configurations",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Alert type and target
    alertType: mysqlEnum("alert_type", [
      "LOW_STOCK",
      "EXPIRING_BATCH",
      "OVERDUE_PAYMENT",
      "HIGH_VALUE_ORDER",
      "SAMPLE_CONVERSION",
      "CUSTOM",
    ]).notNull(),

    // Target specification
    targetType: mysqlEnum("target_type", [
      "GLOBAL",
      "PRODUCT",
      "BATCH",
      "CLIENT",
      "CATEGORY",
    ]).notNull(),
    targetId: int("target_id"), // NULL for GLOBAL, specific ID for others

    // Threshold configuration
    thresholdValue: decimal("threshold_value", {
      precision: 15,
      scale: 4,
    }).notNull(),
    thresholdOperator: mysqlEnum("threshold_operator", [
      "LESS_THAN",
      "GREATER_THAN",
      "EQUALS",
    ]).notNull(),

    // Alert delivery
    deliveryMethod: mysqlEnum("delivery_method", ["DASHBOARD", "EMAIL", "BOTH"])
      .notNull()
      .default("DASHBOARD"),
    emailAddress: varchar("email_address", { length: 255 }),

    // Status
    isActive: boolean("is_active").default(true),

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    userIdIdx: index("idx_user_id").on(table.userId),
    alertTypeIdx: index("idx_alert_type").on(table.alertType),
    isActiveIdx: index("idx_is_active").on(table.isActive),
  })
);

export type AlertConfiguration = typeof alertConfigurations.$inferSelect;
export type InsertAlertConfiguration = typeof alertConfigurations.$inferInsert;

// ============================================================================
// NEEDS & MATCHING MODULE SCHEMA
// ============================================================================

/**
 * Client Needs
 * Tracks what clients are looking for (explicit needs)
 */
export const clientNeeds = mysqlTable(
  "client_needs",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Need specification
    strain: varchar("strain", { length: 255 }),
    productName: varchar("product_name", { length: 255 }), // Product name for non-flower items
    strainId: int("strainId").references(() => strains.id, {
      onDelete: "set null",
    }),
    strainType: mysqlEnum("strain_type", [
      "INDICA",
      "SATIVA",
      "HYBRID",
      "CBD",
      "ANY",
    ]), // Strain type preference
    category: varchar("category", { length: 100 }),
    subcategory: varchar("subcategory", { length: 100 }),
    grade: varchar("grade", { length: 50 }),

    // Quantity and pricing
    quantityMin: decimal("quantity_min", { precision: 15, scale: 4 }),
    quantityMax: decimal("quantity_max", { precision: 15, scale: 4 }),
    priceMax: decimal("price_max", { precision: 15, scale: 2 }),

    // Status and priority
    status: mysqlEnum("status", ["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"])
      .notNull()
      .default("ACTIVE"),
    priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"])
      .notNull()
      .default("MEDIUM"),

    // Dates
    neededBy: date("needed_by"),
    expiresAt: timestamp("expires_at"),
    fulfilledAt: timestamp("fulfilled_at"),

    // Notes
    notes: text("notes"),
    internalNotes: text("internal_notes"), // Staff only

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    // Attribution - either internal user OR VIP portal client (BUG-037)
    createdBy: int("created_by")
      .references(() => users.id, { onDelete: "restrict" }), // Internal user (nullable for VIP portal)
    createdByClientId: int("created_by_client_id")
      .references(() => clients.id, { onDelete: "restrict" }), // VIP portal client (nullable for internal)
  },
  table => ({
    clientIdIdx: index("idx_client_id").on(table.clientId),
    statusIdx: index("idx_status").on(table.status),
    strainIdx: index("idx_strain").on(table.strain),
    productNameIdx: index("idx_product_name_cn").on(table.productName),
    categoryIdx: index("idx_category").on(table.category),
    priorityIdx: index("idx_priority").on(table.priority),
  })
);

export type ClientNeed = typeof clientNeeds.$inferSelect;
export type InsertClientNeed = typeof clientNeeds.$inferInsert;

/**
 * Vendor Supply
 * Tracks what vendors have available (not yet in inventory)
 */
export const vendorSupply = mysqlTable(
  "vendor_supply",
  {
    id: int("id").primaryKey().autoincrement(),
    vendorId: int("vendor_id")
      .notNull()
      .references(() => vendors.id, { onDelete: "cascade" }),

    // Product specification
    strain: varchar("strain", { length: 255 }),
    productName: varchar("product_name", { length: 255 }), // Product name for non-flower items
    strainType: mysqlEnum("strain_type", ["INDICA", "SATIVA", "HYBRID", "CBD"]), // Strain type (Indica, Sativa, Hybrid, CBD)
    category: varchar("category", { length: 100 }),
    subcategory: varchar("subcategory", { length: 100 }),
    grade: varchar("grade", { length: 50 }),

    // Quantity and pricing
    quantityAvailable: decimal("quantity_available", {
      precision: 15,
      scale: 4,
    }).notNull(),
    unitPrice: decimal("unit_price", { precision: 15, scale: 2 }),

    // Status and dates
    status: mysqlEnum("status", [
      "AVAILABLE",
      "RESERVED",
      "PURCHASED",
      "EXPIRED",
    ])
      .notNull()
      .default("AVAILABLE"),
    availableUntil: timestamp("available_until"),
    reservedAt: timestamp("reserved_at"),
    purchasedAt: timestamp("purchased_at"),

    // Notes
    notes: text("notes"),
    internalNotes: text("internal_notes"), // Staff only

    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
    // Attribution - either internal user OR VIP portal client (BUG-037)
    createdBy: int("created_by")
      .references(() => users.id, { onDelete: "restrict" }), // Internal user (nullable for VIP portal)
    createdByClientId: int("created_by_client_id")
      .references(() => clients.id, { onDelete: "restrict" }), // VIP portal client (nullable for internal)
  },
  table => ({
    vendorIdIdx: index("idx_vendor_id").on(table.vendorId),
    statusIdx: index("idx_status").on(table.status),
    strainIdx: index("idx_strain").on(table.strain),
    productNameIdx: index("idx_product_name_vs").on(table.productName),
    categoryIdx: index("idx_category").on(table.category),
  })
);

export type VendorSupply = typeof vendorSupply.$inferSelect;
export type InsertVendorSupply = typeof vendorSupply.$inferInsert;

/**
 * Match Records
 * Tracks matches for learning and analytics
 */
export const matchRecords = mysqlTable(
  "match_records",
  {
    id: int("id").primaryKey().autoincrement(),

    // Match participants
    clientNeedId: int("client_need_id").references(() => clientNeeds.id, {
      onDelete: "set null",
    }),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Match source (one of these will be set)
    inventoryBatchId: int("inventory_batch_id").references(() => batches.id, {
      onDelete: "set null",
    }),
    vendorSupplyId: int("vendor_supply_id").references(() => vendorSupply.id, {
      onDelete: "set null",
    }),
    historicalOrderId: int("historical_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),

    // Match details
    matchType: mysqlEnum("match_type", [
      "EXACT",
      "CLOSE",
      "HISTORICAL",
    ]).notNull(),
    confidenceScore: decimal("confidence_score", {
      precision: 5,
      scale: 2,
    }).notNull(), // 0-100
    matchReasons: json("match_reasons").$type<string[]>().notNull(),

    // User actions
    userAction: mysqlEnum("user_action", [
      "CREATED_QUOTE",
      "CONTACTED_VENDOR",
      "DISMISSED",
      "NONE",
    ]),
    actionedAt: timestamp("actioned_at"),
    actionedBy: int("actioned_by").references(() => users.id, {
      onDelete: "set null",
    }),

    // Result tracking
    resultedInSale: boolean("resulted_in_sale").default(false),
    saleOrderId: int("sale_order_id").references(() => orders.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    clientNeedIdIdx: index("idx_client_need_id").on(table.clientNeedId),
    clientIdIdx: index("idx_client_id").on(table.clientId),
    matchTypeIdx: index("idx_match_type").on(table.matchType),
    userActionIdx: index("idx_user_action").on(table.userAction),
  })
);

export type MatchRecord = typeof matchRecords.$inferSelect;
export type InsertMatchRecord = typeof matchRecords.$inferInsert;

// ============================================================================
// VIP CLIENT PORTAL MODULE SCHEMA
// ============================================================================

/**
 * VIP Portal Configurations
 * Stores per-client portal customization settings
 */
export const vipPortalConfigurations = mysqlTable(
  "vip_portal_configurations",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Module-level toggles
    moduleDashboardEnabled: boolean("module_dashboard_enabled")
      .default(true)
      .notNull(),
    moduleLiveCatalogEnabled: boolean("module_live_catalog_enabled")
      .default(false)
      .notNull(),
    moduleArEnabled: boolean("module_ar_enabled").default(true).notNull(),
    moduleApEnabled: boolean("module_ap_enabled").default(true).notNull(),
    moduleTransactionHistoryEnabled: boolean(
      "module_transaction_history_enabled"
    )
      .default(true)
      .notNull(),
    moduleVipTierEnabled: boolean("module_vip_tier_enabled")
      .default(true)
      .notNull(),
    moduleCreditCenterEnabled: boolean("module_credit_center_enabled")
      .default(true)
      .notNull(),
    moduleMarketplaceNeedsEnabled: boolean("module_marketplace_needs_enabled")
      .default(true)
      .notNull(),
    moduleMarketplaceSupplyEnabled: boolean("module_marketplace_supply_enabled")
      .default(true)
      .notNull(),
    // NOTE: moduleLeaderboardEnabled and leaderboard columns removed - not in database
    // If needed, create a migration to add them

    // Feature-level controls (stored as JSON for flexibility)
    featuresConfig: json("features_config").$type<{
      dashboard?: {
        showGreeting?: boolean;
        showCurrentBalance?: boolean;
        showYtdSpend?: boolean;
        showQuickLinks?: boolean;
      };
      ar?: {
        showSummaryTotals?: boolean;
        showInvoiceDetails?: boolean;
        allowPdfDownloads?: boolean;
        highlightOverdue?: boolean;
      };
      ap?: {
        showSummaryTotals?: boolean;
        showBillDetails?: boolean;
        allowPdfDownloads?: boolean;
        highlightOverdue?: boolean;
      };
      transactionHistory?: {
        showAllTypes?: boolean;
        allowDateFilter?: boolean;
        allowTypeFilter?: boolean;
        allowStatusFilter?: boolean;
        showDetails?: boolean;
        allowPdfDownloads?: boolean;
      };
      vipTier?: {
        showBadge?: boolean;
        showRequirements?: boolean;
        showRewards?: boolean;
        showProgress?: boolean;
        showRecommendations?: boolean;
      };
      creditCenter?: {
        showCreditLimit?: boolean;
        showCreditUsage?: boolean;
        showAvailableCredit?: boolean;
        showUtilizationVisual?: boolean;
        showHistory?: boolean;
        showRecommendations?: boolean;
      };
      marketplaceNeeds?: {
        allowCreate?: boolean;
        showActiveListings?: boolean;
        allowEdit?: boolean;
        allowCancel?: boolean;
        showTemplates?: boolean;
        requireExpiration?: boolean;
      };
      marketplaceSupply?: {
        allowCreate?: boolean;
        showActiveListings?: boolean;
        allowEdit?: boolean;
        allowCancel?: boolean;
        showTemplates?: boolean;
        allowNewStrain?: boolean;
        showTags?: boolean;
      };
      leaderboard?: {
        enabled?: boolean;
        showSuggestions?: boolean;
        showRankings?: boolean;
        type?:
          | "ytd_spend"
          | "payment_speed"
          | "order_frequency"
          | "credit_utilization"
          | "ontime_payment_rate";
        displayMode?: "blackbox" | "transparent" | "black_box";
        minimumClients?: number;
        metrics?: string[];
      };
    }>(),

    // NOTE: Leaderboard settings are stored in featuresConfig.leaderboard JSON
    // The following columns do NOT exist in the database:
    // - moduleLeaderboardEnabled
    // - leaderboardType
    // - leaderboardDisplayMode
    // - leaderboardShowSuggestions
    // - leaderboardMinimumClients
    // All leaderboard config should be read from featuresConfig.leaderboard

    // Advanced options
    advancedOptions: json("advanced_options").$type<{
      transactionHistoryLimit?: "ALL" | "12_MONTHS" | "6_MONTHS" | "3_MONTHS";
      defaultNeedsExpiration?: "1_DAY" | "5_DAYS" | "1_WEEK" | "1_MONTH";
      defaultSupplyExpiration?: "1_DAY" | "5_DAYS" | "1_WEEK" | "1_MONTH";
      priceInputType?: "SINGLE" | "RANGE" | "BOTH";
    }>(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_vip_portal_client_id").on(table.clientId),
  })
);

export type VipPortalConfiguration =
  typeof vipPortalConfigurations.$inferSelect;
export type InsertVipPortalConfiguration =
  typeof vipPortalConfigurations.$inferInsert;

/**
 * VIP Portal Authentication
 * Stores portal-specific authentication credentials
 */
export const vipPortalAuth = mysqlTable(
  "vip_portal_auth",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .unique()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Authentication methods
    email: varchar("email", { length: 320 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }), // bcrypt hash

    // SSO identifiers
    googleId: varchar("google_id", { length: 255 }),
    microsoftId: varchar("microsoft_id", { length: 255 }),

    // Session management
    sessionToken: varchar("session_token", { length: 255 }),
    sessionExpiresAt: timestamp("session_expires_at"),

    // Password reset
    resetToken: varchar("reset_token", { length: 255 }),
    resetTokenExpiresAt: timestamp("reset_token_expires_at"),

    // Tracking
    lastLoginAt: timestamp("last_login_at"),
    loginCount: int("login_count").default(0).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    emailIdx: index("idx_vip_portal_email").on(table.email),
    sessionTokenIdx: index("idx_vip_portal_session_token").on(
      table.sessionToken
    ),
  })
);

export type VipPortalAuth = typeof vipPortalAuth.$inferSelect;
export type InsertVipPortalAuth = typeof vipPortalAuth.$inferInsert;

// VIP Portal Relations
export const vipPortalAuthRelations = relations(vipPortalAuth, ({ one }) => ({
  client: one(clients, {
    fields: [vipPortalAuth.clientId],
    references: [clients.id],
  }),
}));

export const vipPortalConfigurationsRelations = relations(
  vipPortalConfigurations,
  ({ one }) => ({
    client: one(clients, {
      fields: [vipPortalConfigurations.clientId],
      references: [clients.id],
    }),
  })
);

// Order Line Items (v2.0 Sales Order Enhancements)
export const orderLineItems = mysqlTable(
  "order_line_items",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id").notNull(),
    batchId: int("batch_id").notNull(),
    productDisplayName: varchar("product_display_name", { length: 255 }),
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
    cogsPerUnit: decimal("cogs_per_unit", {
      precision: 10,
      scale: 2,
    }).notNull(),
    originalCogsPerUnit: decimal("original_cogs_per_unit", {
      precision: 10,
      scale: 2,
    }).notNull(),
    isCogsOverridden: boolean("is_cogs_overridden").notNull().default(false),
    cogsOverrideReason: text("cogs_override_reason"),
    marginPercent: decimal("margin_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    marginDollar: decimal("margin_dollar", {
      precision: 10,
      scale: 2,
    }).notNull(),
    isMarginOverridden: boolean("is_margin_overridden")
      .notNull()
      .default(false),
    marginSource: mysqlEnum("margin_source", [
      "CUSTOMER_PROFILE",
      "DEFAULT",
      "MANUAL",
    ]).notNull(),
    unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull(),
    lineTotal: decimal("line_total", { precision: 10, scale: 2 }).notNull(),
    isSample: boolean("is_sample").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    orderIdIdx: index("idx_order_id").on(table.orderId),
    batchIdIdx: index("idx_batch_id").on(table.batchId),
  })
);

export type OrderLineItem = typeof orderLineItems.$inferSelect;
export type InsertOrderLineItem = typeof orderLineItems.$inferInsert;

// Order Audit Log (v2.0 Sales Order Enhancements)
export const orderAuditLog = mysqlTable(
  "order_audit_log",
  {
    id: int("id").primaryKey().autoincrement(),
    orderId: int("order_id").notNull(),
    action: varchar("action", { length: 50 }).notNull(),
    changes: json("changes"),
    userId: int("user_id"),
    reason: text("reason"),
    timestamp: timestamp("timestamp").defaultNow().notNull(),
  },
  table => ({
    orderIdIdx: index("idx_order_id").on(table.orderId),
    timestampIdx: index("idx_timestamp").on(table.timestamp),
  })
);

export type OrderAuditLogEntry = typeof orderAuditLog.$inferSelect;
export type InsertOrderAuditLogEntry = typeof orderAuditLog.$inferInsert;

// Pricing Defaults (v2.0 Sales Order Enhancements)
export const pricingDefaults = mysqlTable(
  "pricing_defaults",
  {
    id: int("id").primaryKey().autoincrement(),
    productCategory: varchar("product_category", { length: 100 })
      .notNull()
      .unique(),
    defaultMarginPercent: decimal("default_margin_percent", {
      precision: 5,
      scale: 2,
    }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    categoryIdx: index("idx_product_category").on(table.productCategory),
  })
);

export type PricingDefault = typeof pricingDefaults.$inferSelect;
export type InsertPricingDefault = typeof pricingDefaults.$inferInsert;

// ============================================================================
// TO-DO LISTS MODULE SCHEMA
// ============================================================================

/**
 * Todo Lists table
 * Stores task list containers (personal and shared)
 */
export const todoLists = mysqlTable(
  "todo_lists",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    ownerId: int("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    isShared: boolean("is_shared").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdIdx: index("idx_owner_id").on(table.ownerId),
    isSharedIdx: index("idx_is_shared").on(table.isShared),
  })
);

export type TodoList = typeof todoLists.$inferSelect;
export type InsertTodoList = typeof todoLists.$inferInsert;

/**
 * Todo List Members table
 * Access control for shared lists
 */
export const todoListMembers = mysqlTable(
  "todo_list_members",
  {
    id: int("id").primaryKey().autoincrement(),
    listId: int("list_id")
      .notNull()
      .references(() => todoLists.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: mysqlEnum("role", ["owner", "editor", "viewer"])
      .notNull()
      .default("editor"),
    addedAt: timestamp("added_at").defaultNow().notNull(),
    addedBy: int("added_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  table => ({
    userIdIdx: index("idx_user_id").on(table.userId),
    listIdIdx: index("idx_list_id").on(table.listId),
    uniqueListMember: unique("unique_list_member").on(
      table.listId,
      table.userId
    ),
  })
);

export type TodoListMember = typeof todoListMembers.$inferSelect;
export type InsertTodoListMember = typeof todoListMembers.$inferInsert;

/**
 * Todo Tasks table
 * Individual tasks within lists
 */
export const todoTasks = mysqlTable(
  "todo_tasks",
  {
    id: int("id").primaryKey().autoincrement(),
    listId: int("list_id")
      .notNull()
      .references(() => todoLists.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["todo", "in_progress", "done"])
      .notNull()
      .default("todo"),
    priority: mysqlEnum("priority", [
      "low",
      "medium",
      "high",
      "urgent",
    ]).default("medium"),
    dueDate: timestamp("due_date"),
    assignedTo: int("assigned_to").references(() => users.id, {
      onDelete: "set null",
    }),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    position: int("position").notNull().default(0),
    isCompleted: boolean("is_completed").notNull().default(false),
    completedAt: timestamp("completed_at"),
    completedBy: int("completed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    listIdIdx: index("idx_list_id").on(table.listId),
    assignedToIdx: index("idx_assigned_to").on(table.assignedTo),
    statusIdx: index("idx_status").on(table.status),
    dueDateIdx: index("idx_due_date").on(table.dueDate),
    createdByIdx: index("idx_created_by").on(table.createdBy),
  })
);

export type TodoTask = typeof todoTasks.$inferSelect;
export type InsertTodoTask = typeof todoTasks.$inferInsert;

/**
 * Todo Task Activity table
 * Audit trail for task changes
 */
export const todoTaskActivity = mysqlTable(
  "todo_task_activity",
  {
    id: int("id").primaryKey().autoincrement(),
    taskId: int("task_id")
      .notNull()
      .references(() => todoTasks.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    action: mysqlEnum("action", [
      "created",
      "updated",
      "status_changed",
      "assigned",
      "completed",
      "deleted",
    ]).notNull(),
    fieldChanged: varchar("field_changed", { length: 100 }),
    oldValue: text("old_value"),
    newValue: text("new_value"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    taskIdIdx: index("idx_task_id").on(table.taskId),
    userIdIdx: index("idx_user_id").on(table.userId),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
  })
);

export type TodoTaskActivity = typeof todoTaskActivity.$inferSelect;
export type InsertTodoTaskActivity = typeof todoTaskActivity.$inferInsert;

// ============================================================================
// UNIVERSAL COMMENTS SYSTEM SCHEMA
// ============================================================================

/**
 * Comments table (polymorphic)
 * Universal commenting on any entity in TERP
 */
export const comments = mysqlTable(
  "comments",
  {
    id: int("id").primaryKey().autoincrement(),
    commentableType: varchar("commentable_type", { length: 50 }).notNull(),
    commentableId: int("commentable_id").notNull(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: int("resolved_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    commentableIdx: index("idx_commentable").on(
      table.commentableType,
      table.commentableId
    ),
    userIdIdx: index("idx_user_id").on(table.userId),
    isResolvedIdx: index("idx_is_resolved").on(table.isResolved),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
  })
);

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * Comment Mentions table
 * Tracks @mentions in comments
 */
export const commentMentions = mysqlTable(
  "comment_mentions",
  {
    id: int("id").primaryKey().autoincrement(),
    commentId: int("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    mentionedUserId: int("mentioned_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    mentionedByUserId: int("mentioned_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    mentionedUserIdIdx: index("idx_mentioned_user_id").on(
      table.mentionedUserId
    ),
    commentIdIdx: index("idx_comment_id").on(table.commentId),
    uniqueMention: unique("unique_mention").on(
      table.commentId,
      table.mentionedUserId
    ),
  })
);

export type CommentMention = typeof commentMentions.$inferSelect;
export type InsertCommentMention = typeof commentMentions.$inferInsert;

// ============================================================================
// SMART INBOX SYSTEM SCHEMA
// ============================================================================

/**
 * Unified notifications table
 * Supports multi-channel delivery with soft deletes
 */
export const notifications = mysqlTable(
  "notifications",
  {
    id: int("id").primaryKey().autoincrement(),
    recipientType: mysqlEnum("recipient_type", ["user", "client"])
      .notNull()
      .default("user"),
    userId: int("user_id").references(() => users.id, { onDelete: "cascade" }),
    clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
    type: mysqlEnum("type", ["info", "warning", "success", "error"]).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    message: text("message"),
    link: varchar("link", { length: 500 }),
    channel: mysqlEnum("channel", ["in_app", "email", "sms"])
      .notNull()
      .default("in_app"),
    read: boolean("read").notNull().default(false),
    metadata: json("metadata"),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    recipientChannelIdx: index("idx_notifications_recipient_channel").on(
      table.recipientType,
      table.userId,
      table.clientId,
      table.channel
    ),
    recipientReadIdx: index("idx_notifications_recipient_read").on(
      table.recipientType,
      table.userId,
      table.clientId,
      table.read
    ),
    recipientCreatedIdx: index("idx_notifications_recipient_created").on(
      table.recipientType,
      table.userId,
      table.clientId,
      table.createdAt
    ),
  })
);

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Notification preferences table
 * Stores per-user delivery controls
 */
export const notificationPreferences = mysqlTable(
  "notification_preferences",
  {
    id: int("id").primaryKey().autoincrement(),
    recipientType: mysqlEnum("recipient_type", ["user", "client"])
      .notNull()
      .default("user"),
    userId: int("user_id").references(() => users.id, { onDelete: "cascade" }),
    clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
    inAppEnabled: boolean("in_app_enabled").notNull().default(true),
    emailEnabled: boolean("email_enabled").notNull().default(true),
    appointmentReminders: boolean("appointment_reminders")
      .notNull()
      .default(true),
    orderUpdates: boolean("order_updates").notNull().default(true),
    systemAlerts: boolean("system_alerts").notNull().default(true),
    isDeleted: boolean("is_deleted").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    recipientIdx: index("idx_notification_preferences_recipient").on(
      table.recipientType,
      table.userId,
      table.clientId
    ),
    recipientUnique: uniqueIndex(
      "uid_notification_preferences_recipient"
    ).on(table.recipientType, table.userId, table.clientId),
  })
);

export type NotificationPreference = typeof notificationPreferences.$inferSelect;
export type InsertNotificationPreference =
  typeof notificationPreferences.$inferInsert;

/**
 * Inbox Items table
 * Unified inbox for mentions and task assignments
 */
export const inboxItems = mysqlTable(
  "inbox_items",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sourceType: mysqlEnum("source_type", [
      "mention",
      "task_assignment",
      "task_update",
    ]).notNull(),
    sourceId: int("source_id").notNull(),
    referenceType: varchar("reference_type", { length: 50 }).notNull(),
    referenceId: int("reference_id").notNull(),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description"),
    status: mysqlEnum("status", ["unread", "seen", "completed"])
      .notNull()
      .default("unread"),
    seenAt: timestamp("seen_at"),
    completedAt: timestamp("completed_at"),
    isArchived: boolean("is_archived").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdIdx: index("idx_user_id").on(table.userId),
    statusIdx: index("idx_status").on(table.status),
    sourceIdx: index("idx_source").on(table.sourceType, table.sourceId),
    referenceIdx: index("idx_reference").on(
      table.referenceType,
      table.referenceId
    ),
    createdAtIdx: index("idx_created_at").on(table.createdAt),
    isArchivedIdx: index("idx_is_archived").on(table.isArchived),
  })
);

export type InboxItem = typeof inboxItems.$inferSelect;
export type InsertInboxItem = typeof inboxItems.$inferInsert;

// ============================================================================
// CALENDAR & SCHEDULING MODULE SCHEMA
// ============================================================================

/**
 * Calendar Events table
 * Core table for all calendar events with improved timezone handling
 * Version 2.0 - Post-Adversarial QA
 */
export const calendarEvents = mysqlTable(
  "calendar_events",
  {
    id: int("id").autoincrement().primaryKey(),

    // Basic event information
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    location: varchar("location", { length: 500 }),

    // Date and time storage (field-based, not UTC)
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: varchar("start_time", { length: 8 }), // HH:MM:SS format, nullable for all-day events
    endTime: varchar("end_time", { length: 8 }), // HH:MM:SS format, nullable for all-day events

    // Timezone handling
    timezone: varchar("timezone", { length: 50 }), // IANA timezone identifier (e.g., "America/Los_Angeles")
    isFloatingTime: boolean("is_floating_time").default(false).notNull(), // True for all-day or location-independent events

    // Event classification
    module: mysqlEnum("module", [
      "INVENTORY",
      "ACCOUNTING",
      "CLIENTS",
      "VENDORS",
      "ORDERS",
      "SAMPLES",
      "COMPLIANCE",
      "GENERAL",
    ]).notNull(),
    eventType: mysqlEnum("event_type", [
      "MEETING",
      "DEADLINE",
      "TASK",
      "DELIVERY",
      "PAYMENT_DUE",
      "FOLLOW_UP",
      "AUDIT",
      "INTAKE",
      "PHOTOGRAPHY",
      "BATCH_EXPIRATION",
      "RECURRING_ORDER",
      "SAMPLE_REQUEST",
      "OTHER",
      "AR_COLLECTION", // v3.2: Customer payment collection
      "AP_PAYMENT", // v3.2: Vendor payment
    ]).notNull(),

    // Status and priority
    status: mysqlEnum("status", [
      "SCHEDULED",
      "IN_PROGRESS",
      "COMPLETED",
      "CANCELLED",
    ])
      .default("SCHEDULED")
      .notNull(),
    priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"])
      .default("MEDIUM")
      .notNull(),

    // Recurrence
    isRecurring: boolean("is_recurring").default(false).notNull(),

    // Entity linking (polymorphic)
    entityType: varchar("entity_type", { length: 50 }), // e.g., "order", "invoice", "client"
    entityId: int("entity_id"),

    // v3.2: Explicit foreign keys for common entities (alongside polymorphic)
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    vendorId: int("vendor_id").references(() => vendors.id, {
      onDelete: "set null",
    }),

    // CAL-001: Multi-calendar support - links event to a specific calendar
    calendarId: int("calendar_id"),

    // v3.2: JSON metadata for v3.1 metadata system
    metadata: json("metadata"),

    // Ownership and permissions
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    assignedTo: int("assigned_to").references(() => users.id), // Who is responsible for this event
    visibility: mysqlEnum("visibility", [
      "PRIVATE",
      "TEAM",
      "COMPANY",
      "PUBLIC",
    ])
      .default("COMPANY")
      .notNull(),

    // Auto-generation tracking
    isAutoGenerated: boolean("is_auto_generated").default(false).notNull(),
    autoGenerationRule: varchar("auto_generation_rule", { length: 100 }), // e.g., "invoice_due_date"

    // Optimistic locking (CHAOS-006)
    version: int("version").notNull().default(1),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"), // Soft delete support
  },
  table => ({
    // Indexes for performance
    dateRangeIdx: index("idx_calendar_date_range").on(
      table.startDate,
      table.endDate
    ),
    moduleIdx: index("idx_calendar_module").on(table.module),
    entityIdx: index("idx_calendar_entity").on(
      table.entityType,
      table.entityId
    ),
    assignedIdx: index("idx_calendar_assigned").on(table.assignedTo),
    statusIdx: index("idx_calendar_status").on(table.status),
    createdByIdx: index("idx_calendar_created_by").on(table.createdBy),
    // v3.2: Indexes for explicit foreign keys
    clientIdIdx: index("idx_calendar_events_client_id").on(table.clientId),
    vendorIdIdx: index("idx_calendar_events_vendor_id").on(table.vendorId),
    // CAL-001: Index for calendar filtering
    calendarIdIdx: index("idx_calendar_events_calendar_id").on(table.calendarId),
  })
);

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = typeof calendarEvents.$inferInsert;

/**
 * Calendar Recurrence Rules table
 * Defines recurrence patterns for recurring events
 */
export const calendarRecurrenceRules = mysqlTable(
  "calendar_recurrence_rules",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" })
      .unique(),

    // Recurrence pattern
    frequency: mysqlEnum("frequency", [
      "DAILY",
      "WEEKLY",
      "MONTHLY",
      "YEARLY",
    ]).notNull(),
    interval: int("interval").default(1).notNull(), // Every X days/weeks/months/years

    // Weekly recurrence
    byDay: json("by_day").$type<number[]>(), // [0-6] where 0=Sunday, 6=Saturday

    // Monthly recurrence
    byMonthDay: json("by_month_day").$type<number[]>(), // [1-31] or [-31 to -1] for counting from end
    byWeekOfMonth: json("by_week_of_month").$type<number[]>(), // [1-5] or [-5 to -1] for counting from end
    byDayOfWeekInMonth: json("by_day_of_week_in_month").$type<
      { week: number; day: number }[]
    >(), // e.g., "2nd Tuesday"

    // Yearly recurrence
    byMonth: json("by_month").$type<number[]>(), // [1-12]

    // Recurrence bounds
    startDate: date("start_date").notNull(),
    endDate: date("end_date"), // Nullable for "no end date"
    count: int("count"), // Maximum number of occurrences

    // Exception dates (dates to skip)
    exceptionDates: json("exception_dates").$type<string[]>().default([]), // Array of ISO date strings

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    eventIdx: index("idx_recurrence_event").on(table.eventId),
  })
);

export type CalendarRecurrenceRule =
  typeof calendarRecurrenceRules.$inferSelect;
export type InsertCalendarRecurrenceRule =
  typeof calendarRecurrenceRules.$inferInsert;

/**
 * Calendar Recurrence Instances table (Materialized)
 * Pre-computed instances of recurring events for performance
 * CRITICAL: This is the key performance optimization
 */
export const calendarRecurrenceInstances = mysqlTable(
  "calendar_recurrence_instances",
  {
    id: int("id").autoincrement().primaryKey(),
    parentEventId: int("parent_event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),

    // Instance-specific date/time (inherits from parent but can be modified)
    instanceDate: date("instance_date").notNull(),
    startTime: varchar("start_time", { length: 8 }), // HH:MM:SS format
    endTime: varchar("end_time", { length: 8 }), // HH:MM:SS format
    timezone: varchar("timezone", { length: 50 }),

    // Instance status
    status: mysqlEnum("status", ["GENERATED", "MODIFIED", "CANCELLED"])
      .default("GENERATED")
      .notNull(),

    // If modified, store the modifications (otherwise inherit from parent)
    modifiedTitle: varchar("modified_title", { length: 255 }),
    modifiedDescription: text("modified_description"),
    modifiedLocation: varchar("modified_location", { length: 500 }),
    modifiedAssignedTo: int("modified_assigned_to").references(() => users.id),

    // Metadata
    generatedAt: timestamp("generated_at").defaultNow().notNull(),
    modifiedAt: timestamp("modified_at"),
    modifiedBy: int("modified_by").references(() => users.id),
  },
  table => ({
    // Critical indexes for performance
    parentDateIdx: index("idx_instance_parent_date").on(
      table.parentEventId,
      table.instanceDate
    ),
    dateRangeIdx: index("idx_instance_date_range").on(
      table.instanceDate,
      table.startTime
    ),
    statusIdx: index("idx_instance_status").on(table.status),
  })
);

export type CalendarRecurrenceInstance =
  typeof calendarRecurrenceInstances.$inferSelect;
export type InsertCalendarRecurrenceInstance =
  typeof calendarRecurrenceInstances.$inferInsert;

/**
 * Calendar Event Participants table
 * Multi-user event support with RSVP functionality
 */
export const calendarEventParticipants = mysqlTable(
  "calendar_event_participants",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Participation details
    role: mysqlEnum("role", ["ORGANIZER", "REQUIRED", "OPTIONAL", "OBSERVER"])
      .default("REQUIRED")
      .notNull(),
    responseStatus: mysqlEnum("response_status", [
      "PENDING",
      "ACCEPTED",
      "DECLINED",
      "TENTATIVE",
    ])
      .default("PENDING")
      .notNull(),
    respondedAt: timestamp("responded_at"),

    // Notifications
    notifyOnCreation: boolean("notify_on_creation").default(true).notNull(),
    notifyOnUpdate: boolean("notify_on_update").default(true).notNull(),

    // Metadata
    addedBy: int("added_by")
      .notNull()
      .references(() => users.id),
    addedAt: timestamp("added_at").defaultNow().notNull(),
  },
  table => ({
    eventUserIdx: unique("idx_participant_event_user").on(
      table.eventId,
      table.userId
    ),
    userIdx: index("idx_participant_user").on(table.userId),
  })
);

export type CalendarEventParticipant =
  typeof calendarEventParticipants.$inferSelect;
export type InsertCalendarEventParticipant =
  typeof calendarEventParticipants.$inferInsert;

/**
 * Calendar Reminders table
 * Event reminders with delivery tracking
 */
export const calendarReminders = mysqlTable(
  "calendar_reminders",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Reminder timing
    reminderTime: timestamp("reminder_time").notNull(), // Absolute time to send reminder
    relativeMinutes: int("relative_minutes"), // Minutes before event (for reference)

    // Delivery method
    method: mysqlEnum("method", ["IN_APP", "EMAIL", "BOTH"])
      .default("IN_APP")
      .notNull(),

    // Status
    status: mysqlEnum("status", ["PENDING", "SENT", "FAILED", "CANCELLED"])
      .default("PENDING")
      .notNull(),
    sentAt: timestamp("sent_at"),
    failureReason: varchar("failure_reason", { length: 500 }),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    reminderTimeIdx: index("idx_reminder_time").on(
      table.reminderTime,
      table.status
    ),
    eventIdx: index("idx_reminder_event").on(table.eventId),
    userIdx: index("idx_reminder_user").on(table.userId),
  })
);

export type CalendarReminder = typeof calendarReminders.$inferSelect;
export type InsertCalendarReminder = typeof calendarReminders.$inferInsert;

/**
 * Calendar Event History table
 * Audit trail for all event changes
 */
export const calendarEventHistory = mysqlTable(
  "calendar_event_history",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),

    // Change tracking
    changeType: mysqlEnum("change_type", [
      "CREATED",
      "UPDATED",
      "DELETED",
      "RESCHEDULED",
      "CANCELLED",
      "COMPLETED",
    ]).notNull(),
    changedBy: int("changed_by")
      .notNull()
      .references(() => users.id),
    changedAt: timestamp("changed_at").defaultNow().notNull(),

    // Change details
    fieldChanged: varchar("field_changed", { length: 100 }), // e.g., "startDate", "title"
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    changeReason: text("change_reason"), // Optional user-provided reason

    // Full snapshot (for major changes)
    fullSnapshot: json("full_snapshot").$type<Partial<CalendarEvent>>(),
  },
  table => ({
    eventIdx: index("idx_history_event").on(table.eventId),
    changedAtIdx: index("idx_history_changed_at").on(table.changedAt),
  })
);

export type CalendarEventHistoryEntry =
  typeof calendarEventHistory.$inferSelect;
export type InsertCalendarEventHistoryEntry =
  typeof calendarEventHistory.$inferInsert;

/**
 * Calendar Event Attachments table
 * File attachments for events
 */
export const calendarEventAttachments = mysqlTable(
  "calendar_event_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),

    // File information
    filename: varchar("filename", { length: 255 }).notNull(),
    originalFilename: varchar("original_filename", { length: 255 }).notNull(),
    url: varchar("url", { length: 1000 }).notNull(), // S3 or local storage URL
    fileSize: int("file_size").notNull(), // Bytes
    mimeType: varchar("mime_type", { length: 100 }).notNull(),

    // Metadata
    uploadedBy: int("uploaded_by")
      .notNull()
      .references(() => users.id),
    uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  },
  table => ({
    eventIdx: index("idx_attachment_event").on(table.eventId),
  })
);

export type CalendarEventAttachment =
  typeof calendarEventAttachments.$inferSelect;
export type InsertCalendarEventAttachment =
  typeof calendarEventAttachments.$inferInsert;

/**
 * Calendar Views table
 * User-specific calendar view configurations
 */
export const calendarViews = mysqlTable(
  "calendar_views",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // View details
    name: varchar("name", { length: 100 }).notNull(),
    isDefault: boolean("is_default").default(false).notNull(),

    // Filter configuration (stored as JSON for flexibility)
    filters: json("filters")
      .$type<{
        modules?: string[];
        eventTypes?: string[];
        statuses?: string[];
        priorities?: string[];
        assignedTo?: number[];
        showAutoGenerated?: boolean;
      }>()
      .notNull(),

    // Display preferences
    defaultViewType: mysqlEnum("default_view_type", [
      "MONTH",
      "WEEK",
      "DAY",
      "AGENDA",
    ])
      .default("MONTH")
      .notNull(),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("idx_view_user").on(table.userId),
    userDefaultIdx: index("idx_view_user_default").on(
      table.userId,
      table.isDefault
    ),
  })
);

export type CalendarView = typeof calendarViews.$inferSelect;
export type InsertCalendarView = typeof calendarViews.$inferInsert;

/**
 * Calendar Event Permissions table
 * RBAC for calendar events
 * CRITICAL: Addresses security gap from v1.0
 */
export const calendarEventPermissions = mysqlTable(
  "calendar_event_permissions",
  {
    id: int("id").autoincrement().primaryKey(),
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),

    // Permission grant (can be user or role)
    grantType: mysqlEnum("grant_type", ["USER", "ROLE", "TEAM"]).notNull(),
    granteeId: int("grantee_id").notNull(), // userId, roleId, or teamId

    // Permission level
    permission: mysqlEnum("permission", [
      "VIEW",
      "EDIT",
      "DELETE",
      "MANAGE",
    ]).notNull(),

    // Metadata
    grantedBy: int("granted_by")
      .notNull()
      .references(() => users.id),
    grantedAt: timestamp("granted_at").defaultNow().notNull(),
  },
  table => ({
    eventGranteeIdx: index("idx_permission_event_grantee").on(
      table.eventId,
      table.grantType,
      table.granteeId
    ),
  })
);

export type CalendarEventPermission =
  typeof calendarEventPermissions.$inferSelect;
export type InsertCalendarEventPermission =
  typeof calendarEventPermissions.$inferInsert;

/**
 * Client Meeting History table (V2.1 Addition)
 * Dedicated table for confirmed client meeting records
 */
export const clientMeetingHistory = mysqlTable(
  "client_meeting_history",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id").notNull(),
    calendarEventId: int("calendar_event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    meetingDate: timestamp("meeting_date").notNull(),
    meetingType: varchar("meeting_type", { length: 100 }).notNull(), // 'sales', 'collections', 'review'
    attendees:
      json("attendees").$type<
        Array<{ userId?: number; contactId?: number; name: string }>
      >(), // Array of user IDs and client contact IDs
    outcome: varchar("outcome", { length: 50 }).notNull(), // 'completed', 'no-show', 'rescheduled', 'cancelled'
    notes: text("notes"),
    actionItems:
      json("action_items").$type<
        Array<{ text: string; completed: boolean; assignedTo?: number }>
      >(), // Array of action items
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdx: index("idx_meeting_history_client").on(table.clientId),
    eventIdx: index("idx_meeting_history_event").on(table.calendarEventId),
    meetingDateIdx: index("idx_meeting_history_date").on(table.meetingDate),
  })
);

export type ClientMeetingHistoryEntry =
  typeof clientMeetingHistory.$inferSelect;
export type InsertClientMeetingHistoryEntry =
  typeof clientMeetingHistory.$inferInsert;

// ============================================================================
// EVENT INVITATION WORKFLOW TABLES (QA-044)
// ============================================================================

/**
 * Calendar Event Invitations table
 * Formal invitation workflow layer on top of participant system
 * Supports auto-accept functionality and admin controls
 */
export const calendarEventInvitations = mysqlTable(
  "calendar_event_invitations",
  {
    id: int("id").autoincrement().primaryKey(),

    // Event reference
    eventId: int("event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),

    // Invitee information (polymorphic)
    inviteeType: mysqlEnum("invitee_type", [
      "USER",
      "CLIENT",
      "EXTERNAL",
    ]).notNull(),
    userId: int("user_id").references(() => users.id, { onDelete: "cascade" }),
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "cascade",
    }),
    externalEmail: varchar("external_email", { length: 320 }),
    externalName: varchar("external_name", { length: 255 }),

    // Invitation details
    role: mysqlEnum("role", ["ORGANIZER", "REQUIRED", "OPTIONAL", "OBSERVER"])
      .default("REQUIRED")
      .notNull(),
    message: text("message"),

    // Status tracking
    status: mysqlEnum("status", [
      "DRAFT",
      "PENDING",
      "ACCEPTED",
      "DECLINED",
      "AUTO_ACCEPTED",
      "CANCELLED",
      "EXPIRED",
    ])
      .default("DRAFT")
      .notNull(),

    // Auto-accept functionality
    autoAccept: boolean("auto_accept").default(false).notNull(),
    autoAcceptReason: varchar("auto_accept_reason", { length: 255 }),

    // Admin controls
    adminOverride: boolean("admin_override").default(false).notNull(),
    overriddenBy: int("overridden_by").references(() => users.id),
    overrideReason: text("override_reason"),
    overriddenAt: timestamp("overridden_at"),

    // Timestamps
    sentAt: timestamp("sent_at"),
    respondedAt: timestamp("responded_at"),
    expiresAt: timestamp("expires_at"),

    // Metadata
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),

    // Link to participant record (created after acceptance)
    participantId: int("participant_id"),
  },
  table => ({
    // Indexes for performance
    eventIdx: index("idx_invitation_event").on(table.eventId),
    userIdx: index("idx_invitation_user").on(table.userId),
    clientIdx: index("idx_invitation_client").on(table.clientId),
    statusIdx: index("idx_invitation_status").on(table.status),
    createdByIdx: index("idx_invitation_created_by").on(table.createdBy),

    // Unique constraint: one invitation per invitee per event
    uniqueInvitation: unique("idx_unique_invitation").on(
      table.eventId,
      table.inviteeType,
      table.userId,
      table.clientId,
      table.externalEmail
    ),
  })
);

export type CalendarEventInvitation =
  typeof calendarEventInvitations.$inferSelect;
export type InsertCalendarEventInvitation =
  typeof calendarEventInvitations.$inferInsert;

/**
 * Calendar Invitation Settings table
 * User-level settings for auto-accepting invitations
 */
export const calendarInvitationSettings = mysqlTable(
  "calendar_invitation_settings",
  {
    id: int("id").autoincrement().primaryKey(),

    userId: int("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    // Auto-accept rules
    autoAcceptAll: boolean("auto_accept_all").default(false).notNull(),
    autoAcceptFromOrganizers: json("auto_accept_from_organizers").$type<
      number[]
    >(),
    autoAcceptByEventType: json("auto_accept_by_event_type").$type<string[]>(),
    autoAcceptByModule: json("auto_accept_by_module").$type<string[]>(),

    // Notification preferences
    notifyOnInvitation: boolean("notify_on_invitation").default(true).notNull(),
    notifyOnAutoAccept: boolean("notify_on_auto_accept")
      .default(true)
      .notNull(),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  }
);

export type CalendarInvitationSettings =
  typeof calendarInvitationSettings.$inferSelect;
export type InsertCalendarInvitationSettings =
  typeof calendarInvitationSettings.$inferInsert;

/**
 * Calendar Invitation History table
 * Audit trail for invitation actions
 */
export const calendarInvitationHistory = mysqlTable(
  "calendar_invitation_history",
  {
    id: int("id").autoincrement().primaryKey(),

    invitationId: int("invitation_id").notNull(),

    action: mysqlEnum("action", [
      "CREATED",
      "SENT",
      "ACCEPTED",
      "DECLINED",
      "AUTO_ACCEPTED",
      "CANCELLED",
      "EXPIRED",
      "ADMIN_OVERRIDE",
      "RESENT",
    ]).notNull(),

    performedBy: int("performed_by").references(() => users.id),
    performedAt: timestamp("performed_at").defaultNow().notNull(),

    notes: text("notes"),
    metadata: json("metadata"),
  },
  table => ({
    invitationIdx: index("idx_history_invitation").on(table.invitationId),
    performedByIdx: index("idx_history_performed_by").on(table.performedBy),
  })
);

export type CalendarInvitationHistory =
  typeof calendarInvitationHistory.$inferSelect;
export type InsertCalendarInvitationHistory =
  typeof calendarInvitationHistory.$inferInsert;

// ============================================================================
// CAL-001: MULTI-CALENDAR ARCHITECTURE (Calendar Foundation)
// ============================================================================

/**
 * Calendars table (CAL-001)
 * Stores calendar definitions for multi-calendar support
 * Enables segregation of duties (Accounting vs Office/Sales calendars)
 */
export const calendars = mysqlTable(
  "calendars",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }).notNull().default("#3B82F6"),
    type: varchar("type", { length: 50 }).notNull().default("workspace"), // workspace, personal
    isDefault: boolean("is_default").notNull().default(false),
    isArchived: boolean("is_archived").notNull().default(false),
    ownerId: int("owner_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    ownerIdx: index("idx_calendars_owner").on(table.ownerId),
    isArchivedIdx: index("idx_calendars_archived").on(table.isArchived),
    isDefaultIdx: index("idx_calendars_default").on(table.isDefault),
  })
);

export type Calendar = typeof calendars.$inferSelect;
export type InsertCalendar = typeof calendars.$inferInsert;

/**
 * Calendar User Access table (CAL-001)
 * Manages user permissions for each calendar (view, edit, admin)
 */
export const calendarUserAccess = mysqlTable(
  "calendar_user_access",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarId: int("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    accessLevel: varchar("access_level", { length: 20 }).notNull().default("view"), // view, edit, admin
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    calendarIdx: index("idx_calendar_access_calendar").on(table.calendarId),
    userIdx: index("idx_calendar_access_user").on(table.userId),
    uniqueUserCalendar: unique("unique_user_calendar").on(table.calendarId, table.userId),
  })
);

export type CalendarUserAccess = typeof calendarUserAccess.$inferSelect;
export type InsertCalendarUserAccess = typeof calendarUserAccess.$inferInsert;

// Relations for calendars
export const calendarsRelations = relations(calendars, ({ one, many }) => ({
  owner: one(users, {
    fields: [calendars.ownerId],
    references: [users.id],
  }),
  userAccess: many(calendarUserAccess),
  events: many(calendarEvents),
  appointmentTypes: many(appointmentTypes),
  availability: many(calendarAvailability),
  blockedDates: many(calendarBlockedDates),
}));

export const calendarUserAccessRelations = relations(calendarUserAccess, ({ one }) => ({
  calendar: one(calendars, {
    fields: [calendarUserAccess.calendarId],
    references: [calendars.id],
  }),
  user: one(users, {
    fields: [calendarUserAccess.userId],
    references: [users.id],
  }),
}));

// ============================================================================
// CAL-002: AVAILABILITY SYSTEM (Availability & Booking Foundation)
// ============================================================================

/**
 * Appointment Types table (CAL-002)
 * Defines the types of bookable events (e.g., "Payment Pickup", "Client Demo")
 */
export const appointmentTypes = mysqlTable(
  "appointment_types",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarId: int("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    duration: int("duration").notNull(), // Duration in minutes
    bufferBefore: int("buffer_before").notNull().default(0), // Prep time before event in minutes
    bufferAfter: int("buffer_after").notNull().default(0), // Wrap-up time after event in minutes
    minNoticeHours: int("min_notice_hours").notNull().default(24), // Minimum hours in advance for booking
    maxAdvanceDays: int("max_advance_days").notNull().default(30), // Maximum days in the future for booking
    color: varchar("color", { length: 7 }).notNull().default("#F59E0B"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    calendarIdx: index("idx_appointment_types_calendar").on(table.calendarId),
    isActiveIdx: index("idx_appointment_types_active").on(table.isActive),
  })
);

export type AppointmentType = typeof appointmentTypes.$inferSelect;
export type InsertAppointmentType = typeof appointmentTypes.$inferInsert;

/**
 * Calendar Availability table (CAL-002)
 * Defines recurring weekly availability for a calendar
 * dayOfWeek: 0 = Sunday, 6 = Saturday (JavaScript convention)
 */
export const calendarAvailability = mysqlTable(
  "calendar_availability",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarId: int("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    dayOfWeek: int("day_of_week").notNull(), // 0-6 where 0=Sunday, 6=Saturday
    startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS format
    endTime: varchar("end_time", { length: 8 }).notNull(), // HH:MM:SS format
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    calendarIdx: index("idx_availability_calendar").on(table.calendarId),
    dayIdx: index("idx_availability_day").on(table.dayOfWeek),
  })
);

export type CalendarAvailabilityRow = typeof calendarAvailability.$inferSelect;
export type InsertCalendarAvailability = typeof calendarAvailability.$inferInsert;

/**
 * Calendar Blocked Dates table (CAL-002)
 * Defines specific dates on which a calendar is unavailable (holidays, etc.)
 */
export const calendarBlockedDates = mysqlTable(
  "calendar_blocked_dates",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarId: int("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    reason: varchar("reason", { length: 255 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    calendarIdx: index("idx_blocked_dates_calendar").on(table.calendarId),
    dateIdx: index("idx_blocked_dates_date").on(table.date),
  })
);

export type CalendarBlockedDate = typeof calendarBlockedDates.$inferSelect;
export type InsertCalendarBlockedDate = typeof calendarBlockedDates.$inferInsert;

// Relations for availability system
export const appointmentTypesRelations = relations(appointmentTypes, ({ one }) => ({
  calendar: one(calendars, {
    fields: [appointmentTypes.calendarId],
    references: [calendars.id],
  }),
}));

export const calendarAvailabilityRelations = relations(calendarAvailability, ({ one }) => ({
  calendar: one(calendars, {
    fields: [calendarAvailability.calendarId],
    references: [calendars.id],
  }),
}));

export const calendarBlockedDatesRelations = relations(calendarBlockedDates, ({ one }) => ({
  calendar: one(calendars, {
    fields: [calendarBlockedDates.calendarId],
    references: [calendars.id],
  }),
}));

// ============================================================================
// CAL-003: APPOINTMENT REQUESTS (Request/Approval Workflow)
// ============================================================================

/**
 * Appointment Requests table (CAL-003)
 * Manages the request/approval workflow for appointment bookings
 * VIP clients submit requests, staff approves/rejects them
 */
export const appointmentRequests = mysqlTable(
  "appointment_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarId: int("calendar_id")
      .notNull()
      .references(() => calendars.id, { onDelete: "cascade" }),
    appointmentTypeId: int("appointment_type_id")
      .notNull()
      .references(() => appointmentTypes.id, { onDelete: "cascade" }),
    requestedById: int("requested_by_id").notNull(), // Client ID who requested
    requestedSlot: timestamp("requested_slot").notNull(),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected, cancelled
    notes: text("notes"), // Notes from the client
    responseNotes: text("response_notes"), // Notes from manager when responding
    createdAt: timestamp("created_at").defaultNow().notNull(),
    respondedAt: timestamp("responded_at"),
    respondedById: int("responded_by_id").references(() => users.id, { onDelete: "set null" }),
    calendarEventId: int("calendar_event_id").references(() => calendarEvents.id, { onDelete: "set null" }), // Populated upon approval
  },
  table => ({
    calendarIdx: index("idx_appointment_requests_calendar").on(table.calendarId),
    statusIdx: index("idx_appointment_requests_status").on(table.status),
    requestedByIdx: index("idx_appointment_requests_requested_by").on(table.requestedById),
    respondedByIdx: index("idx_appointment_requests_responded_by").on(table.respondedById),
    createdAtIdx: index("idx_appointment_requests_created_at").on(table.createdAt),
  })
);

export type AppointmentRequest = typeof appointmentRequests.$inferSelect;
export type InsertAppointmentRequest = typeof appointmentRequests.$inferInsert;

// Relations for appointment requests
export const appointmentRequestsRelations = relations(appointmentRequests, ({ one }) => ({
  calendar: one(calendars, {
    fields: [appointmentRequests.calendarId],
    references: [calendars.id],
  }),
  appointmentType: one(appointmentTypes, {
    fields: [appointmentRequests.appointmentTypeId],
    references: [appointmentTypes.id],
  }),
  respondedBy: one(users, {
    fields: [appointmentRequests.respondedById],
    references: [users.id],
  }),
  calendarEvent: one(calendarEvents, {
    fields: [appointmentRequests.calendarEventId],
    references: [calendarEvents.id],
  }),
}));

// ============================================================================
// CAL-004: TIME OFF REQUESTS (Enhanced Features)
// ============================================================================

/**
 * Time Off Requests table (CAL-004)
 * Manages vacation, sick, and personal time-off requests
 * Integrates with calendar availability to block booking slots
 */
export const timeOffRequests = mysqlTable(
  "time_off_requests",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    timeOffType: varchar("time_off_type", { length: 20 }).notNull(), // vacation, sick, personal
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: varchar("start_time", { length: 8 }), // HH:MM:SS for partial day off
    endTime: varchar("end_time", { length: 8 }), // HH:MM:SS for partial day off
    isFullDay: boolean("is_full_day").notNull().default(true),
    status: varchar("status", { length: 20 }).notNull().default("pending"), // pending, approved, rejected
    notes: text("notes"), // Employee notes
    responseNotes: text("response_notes"), // Manager response notes
    calendarEventId: int("calendar_event_id").references(() => calendarEvents.id, { onDelete: "set null" }), // Created upon approval
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    respondedAt: timestamp("responded_at"),
    respondedById: int("responded_by_id").references(() => users.id, { onDelete: "set null" }),
  },
  table => ({
    userIdx: index("idx_time_off_requests_user").on(table.userId),
    statusIdx: index("idx_time_off_requests_status").on(table.status),
    startDateIdx: index("idx_time_off_requests_start_date").on(table.startDate),
    endDateIdx: index("idx_time_off_requests_end_date").on(table.endDate),
    typeIdx: index("idx_time_off_requests_type").on(table.timeOffType),
  })
);

export type TimeOffRequest = typeof timeOffRequests.$inferSelect;
export type InsertTimeOffRequest = typeof timeOffRequests.$inferInsert;

// Relations for time off requests
export const timeOffRequestsRelations = relations(timeOffRequests, ({ one }) => ({
  user: one(users, {
    fields: [timeOffRequests.userId],
    references: [users.id],
  }),
  respondedBy: one(users, {
    fields: [timeOffRequests.respondedById],
    references: [users.id],
    relationName: "timeOffResponder",
  }),
  calendarEvent: one(calendarEvents, {
    fields: [timeOffRequests.calendarEventId],
    references: [calendarEvents.id],
  }),
}));

// ============================================================================
// WORKFLOW QUEUE MANAGEMENT TABLES (Initiative 1.3)
// ============================================================================

/**
 * Workflow Statuses table
 * Defines the available workflow statuses for batch management
 * Replaces the legacy batchStatusEnum with a flexible, database-driven approach
 */
export const workflowStatuses = mysqlTable(
  "workflow_statuses",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 50 }).notNull().unique(),
    color: varchar("color", { length: 20 }).notNull().default("#6B7280"),
    order: int("order").notNull().default(0),
    isActive: int("isActive").notNull().default(1), // 0 = deleted, 1 = active
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    orderIdx: index("idx_workflow_statuses_order").on(table.order),
    isActiveIdx: index("idx_workflow_statuses_isActive").on(table.isActive),
  })
);

export type WorkflowStatus = typeof workflowStatuses.$inferSelect;
export type InsertWorkflowStatus = typeof workflowStatuses.$inferInsert;

/**
 * Batch Status History table
 * Audit log for all batch status changes
 * Tracks who changed what, when, and why
 */
export const batchStatusHistory = mysqlTable(
  "batch_status_history",
  {
    id: int("id").autoincrement().primaryKey(),
    batchId: int("batchId")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    fromStatusId: int("fromStatusId").references(() => workflowStatuses.id, {
      onDelete: "set null",
    }),
    toStatusId: int("toStatusId")
      .notNull()
      .references(() => workflowStatuses.id, { onDelete: "restrict" }),
    changedBy: int("changedBy")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    notes: text("notes"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => ({
    batchIdIdx: index("idx_batch_status_history_batchId").on(table.batchId),
    toStatusIdIdx: index("idx_batch_status_history_toStatusId").on(
      table.toStatusId
    ),
    changedByIdx: index("idx_batch_status_history_changedBy").on(
      table.changedBy
    ),
    createdAtIdx: index("idx_batch_status_history_createdAt").on(
      table.createdAt
    ),
  })
);

export type BatchStatusHistory = typeof batchStatusHistory.$inferSelect;
export type InsertBatchStatusHistory = typeof batchStatusHistory.$inferInsert;

/**
 * Relations for workflow queue tables
 */
export const workflowStatusesRelations = relations(
  workflowStatuses,
  ({ many }) => ({
    batches: many(batches),
    historyTo: many(batchStatusHistory, { relationName: "toStatus" }),
    historyFrom: many(batchStatusHistory, { relationName: "fromStatus" }),
  })
);

export const batchStatusHistoryRelations = relations(
  batchStatusHistory,
  ({ one }) => ({
    batch: one(batches, {
      fields: [batchStatusHistory.batchId],
      references: [batches.id],
    }),
    fromStatus: one(workflowStatuses, {
      fields: [batchStatusHistory.fromStatusId],
      references: [workflowStatuses.id],
      relationName: "fromStatus",
    }),
    toStatus: one(workflowStatuses, {
      fields: [batchStatusHistory.toStatusId],
      references: [workflowStatuses.id],
      relationName: "toStatus",
    }),
    changedByUser: one(users, {
      fields: [batchStatusHistory.changedBy],
      references: [users.id],
    }),
  })
);

// ============================================================================
// VIP PORTAL LIVE CATALOG TABLES (Re-exported from schema-vip-portal.ts)
// ============================================================================
export {
  clientCatalogViews,
  clientInterestLists,
  clientInterestListItems,
  clientDraftInterests,
  clientPriceAlerts,
  type ClientCatalogView,
  type InsertClientCatalogView,
  type ClientInterestList,
  type InsertClientInterestList,
  type ClientInterestListItem,
  type InsertClientInterestListItem,
  type ClientDraftInterest,
  type InsertClientDraftInterest,
  type ClientPriceAlert,
  type InsertClientPriceAlert,
  // Admin Impersonation Audit Tables (FEATURE-012)
  adminImpersonationSessions,
  adminImpersonationActions,
  type AdminImpersonationSession,
  type InsertAdminImpersonationSession,
  type AdminImpersonationAction,
  type InsertAdminImpersonationAction,
} from "./schema-vip-portal";

// ============================================================================
// DEPLOYMENT MONITORING
// ============================================================================

export const deployments = mysqlTable(
  "deployments",
  {
    id: int("id").primaryKey().autoincrement(),

    // Git information
    commitSha: varchar("commitSha", { length: 40 }).notNull(),
    commitMessage: text("commitMessage").notNull(),
    commitTimestamp: timestamp("commitTimestamp").notNull(),
    branch: varchar("branch", { length: 255 }).notNull(),
    author: varchar("author", { length: 255 }).notNull(),
    pusher: varchar("pusher", { length: 255 }).notNull(),

    // Deployment status
    status: varchar("status", { length: 50 }).notNull().default("pending"),
    startedAt: timestamp("startedAt").notNull().defaultNow(),
    completedAt: timestamp("completedAt"),
    duration: int("duration"), // seconds

    // DigitalOcean information
    doDeploymentId: varchar("doDeploymentId", { length: 255 }),
    buildLogs: text("buildLogs"),
    deploymentUrl: varchar("deploymentUrl", { length: 500 }),
    errorMessage: text("errorMessage"),

    // Metadata
    githubDeliveryId: varchar("githubDeliveryId", { length: 255 }),
    webhookPayload: json("webhookPayload"),
  },
  table => ({
    statusIdx: index("idx_deployments_status").on(table.status),
    branchIdx: index("idx_deployments_branch").on(table.branch),
    startedAtIdx: index("idx_deployments_started_at").on(table.startedAt),
    commitShaIdx: index("idx_deployments_commit_sha").on(table.commitSha),
  })
);

export type Deployment = typeof deployments.$inferSelect;
export type InsertDeployment = typeof deployments.$inferInsert;

// ============================================================================
// RBAC TABLES (Role-Based Access Control)
// ============================================================================
export {
  roles,
  permissions,
  rolePermissions,
  userRoles,
  userPermissionOverrides,
  rolesRelations,
  permissionsRelations,
  rolePermissionsRelations,
  userRolesRelations,
  userPermissionOverridesRelations,
} from "./schema-rbac";


// ============================================================================
// LEADERBOARD SYSTEM SCHEMA
// ============================================================================

/**
 * Client Type Enum for Leaderboard
 * Defines the type of clients for leaderboard filtering
 * 
 * FIX-011: The enum name "leaderboard_client_type" was being used as the column name,
 * but the database column is actually "client_type" (from migration 0041).
 * We keep this enum definition for type inference but use explicit column names in tables.
 */
export const leaderboardClientTypeEnum = mysqlEnum("leaderboard_client_type", [
  "CUSTOMER",
  "SUPPLIER",
  "ALL",
]);

/**
 * Leaderboard Weight Configurations
 * Stores user-specific weight preferences for the internal leaderboard
 */
export const leaderboardWeightConfigs = mysqlTable(
  "leaderboard_weight_configs",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    configName: varchar("config_name", { length: 100 }).notNull().default("default"),
    // FIX-011: Explicitly specify column name as 'client_type' to match database (migration 0041)
    clientType: mysqlEnum("client_type", ["CUSTOMER", "SUPPLIER", "ALL"]).notNull().default("ALL"),
    weights: json("weights").$type<Record<string, number>>().notNull(),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  table => ({
    userConfigTypeIdx: unique("idx_user_config_type").on(
      table.userId,
      table.configName,
      table.clientType
    ),
    userActiveIdx: index("idx_user_active").on(table.userId, table.isActive),
  })
);

export type LeaderboardWeightConfig = typeof leaderboardWeightConfigs.$inferSelect;
export type InsertLeaderboardWeightConfig = typeof leaderboardWeightConfigs.$inferInsert;

/**
 * Leaderboard Default Weights
 * System-wide default weights (admin-configurable)
 */
export const leaderboardDefaultWeights = mysqlTable(
  "leaderboard_default_weights",
  {
    id: int("id").primaryKey().autoincrement(),
    // FIX-011: Explicitly specify column name as 'client_type' to match database (migration 0041)
    clientType: mysqlEnum("client_type", ["CUSTOMER", "SUPPLIER", "ALL"]).notNull(),
    weights: json("weights").$type<Record<string, number>>().notNull(),
    updatedBy: int("updated_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientTypeIdx: unique("idx_default_weights_client_type").on(table.clientType),
  })
);

export type LeaderboardDefaultWeight = typeof leaderboardDefaultWeights.$inferSelect;
export type InsertLeaderboardDefaultWeight = typeof leaderboardDefaultWeights.$inferInsert;

/**
 * Leaderboard Metric Cache
 * Cached metric calculations for performance
 */
export const leaderboardMetricCache = mysqlTable(
  "leaderboard_metric_cache",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    metricType: varchar("metric_type", { length: 50 }).notNull(),
    metricValue: decimal("metric_value", { precision: 15, scale: 4 }),
    sampleSize: int("sample_size").notNull().default(0),
    isSignificant: boolean("is_significant").notNull().default(false),
    rawData: json("raw_data").$type<{
      numerator?: number;
      denominator?: number;
      dataPoints?: number[];
    }>(),
    calculatedAt: timestamp("calculated_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  table => ({
    clientMetricIdx: unique("idx_client_metric").on(table.clientId, table.metricType),
    expiresIdx: index("idx_expires").on(table.expiresAt),
    metricTypeIdx: index("idx_metric_type").on(table.metricType),
  })
);

export type LeaderboardMetricCache = typeof leaderboardMetricCache.$inferSelect;
export type InsertLeaderboardMetricCache = typeof leaderboardMetricCache.$inferInsert;

/**
 * Leaderboard Rank History
 * Historical ranking snapshots for trend analysis
 */
export const leaderboardRankHistory = mysqlTable(
  "leaderboard_rank_history",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    snapshotDate: date("snapshot_date").notNull(),
    masterRank: int("master_rank"),
    masterScore: decimal("master_score", { precision: 10, scale: 4 }),
    financialRank: int("financial_rank"),
    engagementRank: int("engagement_rank"),
    reliabilityRank: int("reliability_rank"),
    growthRank: int("growth_rank"),
    totalClients: int("total_clients").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    clientDateIdx: unique("idx_client_date").on(table.clientId, table.snapshotDate),
    snapshotDateIdx: index("idx_snapshot_date").on(table.snapshotDate),
  })
);

export type LeaderboardRankHistory = typeof leaderboardRankHistory.$inferSelect;
export type InsertLeaderboardRankHistory = typeof leaderboardRankHistory.$inferInsert;

/**
 * Dashboard Widget Configurations
 * Stores user-specific dashboard widget preferences
 */
export const dashboardWidgetConfigs = mysqlTable(
  "dashboard_widget_configs",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    widgetType: varchar("widget_type", { length: 50 }).notNull(),
    config: json("config").$type<{
      metric?: string;
      mode?: "top" | "bottom";
      limit?: number;
      clientType?: "ALL" | "CUSTOMER" | "SUPPLIER";
      [key: string]: unknown;
    }>().notNull(),
    position: int("position").notNull().default(0),
    isVisible: boolean("is_visible").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userWidgetIdx: unique("idx_user_widget").on(table.userId, table.widgetType),
  })
);

export type DashboardWidgetConfig = typeof dashboardWidgetConfigs.$inferSelect;
export type InsertDashboardWidgetConfig = typeof dashboardWidgetConfigs.$inferInsert;

// Leaderboard Relations
export const leaderboardWeightConfigsRelations = relations(
  leaderboardWeightConfigs,
  ({ one }) => ({
    user: one(users, {
      fields: [leaderboardWeightConfigs.userId],
      references: [users.id],
    }),
  })
);

export const leaderboardDefaultWeightsRelations = relations(
  leaderboardDefaultWeights,
  ({ one }) => ({
    updatedByUser: one(users, {
      fields: [leaderboardDefaultWeights.updatedBy],
      references: [users.id],
    }),
  })
);

export const leaderboardMetricCacheRelations = relations(
  leaderboardMetricCache,
  ({ one }) => ({
    client: one(clients, {
      fields: [leaderboardMetricCache.clientId],
      references: [clients.id],
    }),
  })
);

export const leaderboardRankHistoryRelations = relations(
  leaderboardRankHistory,
  ({ one }) => ({
    client: one(clients, {
      fields: [leaderboardRankHistory.clientId],
      references: [clients.id],
    }),
  })
);

export const dashboardWidgetConfigsRelations = relations(
  dashboardWidgetConfigs,
  ({ one }) => ({
    user: one(users, {
      fields: [dashboardWidgetConfigs.userId],
      references: [users.id],
    }),
  })
);

// ============================================================================
// WS-004: REFERRAL CREDITS MODULE
// ============================================================================

/**
 * Referral Credit Status Enum
 * Tracks the lifecycle of referral credits
 */
export const referralCreditStatusEnum = mysqlEnum("referralCreditStatus", [
  "PENDING",    // Created when referred order created, waiting for finalization
  "AVAILABLE",  // Referred order finalized, credit available for use
  "APPLIED",    // Credit applied to VIP's order
  "EXPIRED",    // Credit expired (if expiry configured)
  "CANCELLED",  // Referred order was cancelled
]);

/**
 * Referral Credits Table
 * Tracks referral credits earned by VIP customers
 */
export const referralCredits = mysqlTable(
  "referral_credits",
  {
    id: int("id").primaryKey().autoincrement(),
    referrerClientId: int("referrer_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    referredClientId: int("referred_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    referredOrderId: int("referred_order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    creditPercentage: decimal("credit_percentage", { precision: 5, scale: 2 })
      .notNull()
      .default("10.00"),
    orderTotal: decimal("order_total", { precision: 12, scale: 2 }).notNull(),
    creditAmount: decimal("credit_amount", { precision: 12, scale: 2 }).notNull(),
    status: referralCreditStatusEnum.notNull().default("PENDING"),
    appliedToOrderId: int("applied_to_order_id").references(() => orders.id),
    appliedAmount: decimal("applied_amount", { precision: 12, scale: 2 }),
    appliedAt: timestamp("applied_at"),
    appliedBy: int("applied_by").references(() => users.id),
    expiresAt: timestamp("expires_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    referrerIdx: index("idx_referral_referrer").on(table.referrerClientId),
    referredOrderIdx: index("idx_referral_referred_order").on(table.referredOrderId),
    statusIdx: index("idx_referral_status").on(table.status),
  })
);

export type ReferralCredit = typeof referralCredits.$inferSelect;
export type InsertReferralCredit = typeof referralCredits.$inferInsert;

/**
 * Referral Settings Table
 * Configures referral credit percentages (global and per-tier)
 */
export const referralSettings = mysqlTable(
  "referral_settings",
  {
    id: int("id").primaryKey().autoincrement(),
    clientTier: varchar("client_tier", { length: 50 }), // NULL for global default
    creditPercentage: decimal("credit_percentage", { precision: 5, scale: 2 })
      .notNull()
      .default("10.00"),
    minOrderAmount: decimal("min_order_amount", { precision: 12, scale: 2 }).default("0"),
    maxCreditAmount: decimal("max_credit_amount", { precision: 12, scale: 2 }), // NULL for no limit
    creditExpiryDays: int("credit_expiry_days"), // NULL for no expiry
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    tierIdx: uniqueIndex("unique_tier").on(table.clientTier),
  })
);

export type ReferralSetting = typeof referralSettings.$inferSelect;
export type InsertReferralSetting = typeof referralSettings.$inferInsert;

// WS-004: Relations for referral credits
export const referralCreditsRelations = relations(referralCredits, ({ one }) => ({
  referrer: one(clients, {
    fields: [referralCredits.referrerClientId],
    references: [clients.id],
    relationName: "referrer",
  }),
  referredClient: one(clients, {
    fields: [referralCredits.referredClientId],
    references: [clients.id],
    relationName: "referredClient",
  }),
  referredOrder: one(orders, {
    fields: [referralCredits.referredOrderId],
    references: [orders.id],
    relationName: "referredOrder",
  }),
  appliedToOrder: one(orders, {
    fields: [referralCredits.appliedToOrderId],
    references: [orders.id],
    relationName: "appliedToOrder",
  }),
  appliedByUser: one(users, {
    fields: [referralCredits.appliedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// WS-006: RECEIPTS MODULE
// ============================================================================

// Receipt transaction type enum
export const receiptTransactionTypeEnum = mysqlEnum("receipt_transaction_type", [
  "PAYMENT",
  "CREDIT",
  "ADJUSTMENT",
  "STATEMENT",
]);

// Receipts table for tracking generated receipts
export const receipts = mysqlTable(
  "receipts",
  {
    id: int("id").primaryKey().autoincrement(),
    receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
    clientId: int("client_id").notNull().references(() => clients.id),
    transactionType: receiptTransactionTypeEnum.notNull(),
    transactionId: int("transaction_id"), // Reference to payment/credit/etc.
    previousBalance: decimal("previous_balance", { precision: 12, scale: 2 }).notNull(),
    transactionAmount: decimal("transaction_amount", { precision: 12, scale: 2 }).notNull(),
    newBalance: decimal("new_balance", { precision: 12, scale: 2 }).notNull(),
    note: text("note"),
    pdfUrl: varchar("pdf_url", { length: 500 }),
    emailedTo: varchar("emailed_to", { length: 255 }),
    emailedAt: timestamp("emailed_at"),
    smsSentTo: varchar("sms_sent_to", { length: 20 }),
    smsSentAt: timestamp("sms_sent_at"),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    clientIdx: index("idx_receipt_client").on(table.clientId),
    receiptNumberIdx: index("idx_receipt_number").on(table.receiptNumber),
  })
);

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;

// ============================================================================
// WS-010: PHOTOGRAPHY MODULE
// ============================================================================

/**
 * Image Status Enum
 * Tracks the approval status of product images
 */
export const imageStatusEnum = mysqlEnum("image_status", [
  "PENDING",
  "APPROVED",
  "REJECTED",
  "ARCHIVED",
]);

/**
 * Product Images Table
 * Stores images associated with batches and products for photography module
 * Feature: WS-010 Photography Module
 */
export const productImages = mysqlTable(
  "product_images",
  {
    id: int("id").primaryKey().autoincrement(),
    batchId: int("batch_id").references(() => batches.id, { onDelete: "cascade" }),
    productId: int("product_id").references(() => products.id, { onDelete: "cascade" }),
    imageUrl: varchar("image_url", { length: 500 }).notNull(),
    thumbnailUrl: varchar("thumbnail_url", { length: 500 }),
    caption: varchar("caption", { length: 255 }),
    isPrimary: boolean("is_primary").default(false),
    sortOrder: int("sort_order").default(0),
    status: imageStatusEnum.default("APPROVED"),
    uploadedBy: int("uploaded_by").references(() => users.id),
    uploadedAt: timestamp("uploaded_at").defaultNow(),
  },
  table => ({
    batchIdx: index("idx_batch_images").on(table.batchId),
    productIdx: index("idx_product_images").on(table.productId),
  })
);

export type ProductImage = typeof productImages.$inferSelect;
export type InsertProductImage = typeof productImages.$inferInsert;

// Relations for productImages
export const productImagesRelations = relations(productImages, ({ one }) => ({
  batch: one(batches, {
    fields: [productImages.batchId],
    references: [batches.id],
  }),
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
  uploader: one(users, {
    fields: [productImages.uploadedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// WS-014: VENDOR HARVEST REMINDERS MODULE
// ============================================================================

/**
 * Reminder Status Enum
 * Tracks the status of vendor harvest reminders
 */
export const reminderStatusEnum = mysqlEnum("reminder_status", [
  "PENDING",
  "CONTACTED",
  "COMPLETED",
  "CANCELLED",
]);

/**
 * Vendor Harvest Reminders Table
 * Tracks expected harvest dates and reminder schedules for vendor outreach
 * Feature: WS-014 Vendor Harvest Reminders
 */
export const vendorHarvestReminders = mysqlTable(
  "vendor_harvest_reminders",
  {
    id: int("id").primaryKey().autoincrement(),
    vendorId: int("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    expectedHarvestDate: date("expected_harvest_date").notNull(),
    reminderDate: date("reminder_date").notNull(),
    strain: varchar("strain", { length: 100 }),
    estimatedQuantity: decimal("estimated_quantity", { precision: 12, scale: 2 }),
    actualQuantity: decimal("actual_quantity", { precision: 12, scale: 2 }),
    notes: text("notes"),
    status: reminderStatusEnum.default("PENDING"),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    contactedAt: timestamp("contacted_at"),
    contactedBy: int("contacted_by").references(() => users.id),
    contactNotes: text("contact_notes"),
    completedAt: timestamp("completed_at"),
    completionNotes: text("completion_notes"),
  },
  table => ({
    vendorStatusIdx: index("idx_vendor_reminders").on(table.vendorId, table.status),
    reminderDateIdx: index("idx_reminder_date").on(table.reminderDate, table.status),
  })
);

export type VendorHarvestReminder = typeof vendorHarvestReminders.$inferSelect;
export type InsertVendorHarvestReminder = typeof vendorHarvestReminders.$inferInsert;

// Relations for vendorHarvestReminders
export const vendorHarvestRemindersRelations = relations(vendorHarvestReminders, ({ one }) => ({
  vendor: one(vendors, {
    fields: [vendorHarvestReminders.vendorId],
    references: [vendors.id],
  }),
  creator: one(users, {
    fields: [vendorHarvestReminders.createdBy],
    references: [users.id],
    relationName: "reminderCreator",
  }),
  contacter: one(users, {
    fields: [vendorHarvestReminders.contactedBy],
    references: [users.id],
    relationName: "reminderContacter",
  }),
}));

// ============================================================================
// USER PREFERENCES (FEAT-010: Default Warehouse Selection)
// ============================================================================

/**
 * User Preferences Table
 * Stores user-specific preferences including default warehouse
 */
export const userPreferences = mysqlTable(
  "user_preferences",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    defaultWarehouseId: int("default_warehouse_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    defaultLocationId: int("default_location_id").references(() => locations.id, {
      onDelete: "set null",
    }),
    showCogsInOrders: boolean("show_cogs_in_orders").notNull().default(true),
    showMarginInOrders: boolean("show_margin_in_orders").notNull().default(true),
    showGradeField: boolean("show_grade_field").notNull().default(true),
    hideExpectedDelivery: boolean("hide_expected_delivery").notNull().default(false),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdIdx: index("idx_user_preferences_user_id").on(table.userId),
  })
);

export type UserPreference = typeof userPreferences.$inferSelect;
export type InsertUserPreference = typeof userPreferences.$inferInsert;

// ============================================================================
// ORGANIZATION SETTINGS (FEAT-012 & FEAT-014)
// ============================================================================

/**
 * Organization Settings Table
 * Stores organization-wide configuration options
 */
export const organizationSettings = mysqlTable(
  "organization_settings",
  {
    id: int("id").autoincrement().primaryKey(),
    settingKey: varchar("setting_key", { length: 100 }).notNull().unique(),
    settingValue: json("setting_value"),
    settingType: mysqlEnum("setting_type", ["BOOLEAN", "STRING", "NUMBER", "JSON"])
      .notNull()
      .default("STRING"),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    // FEAT-021/FEAT-023: Scope for system vs user level settings
    scope: mysqlEnum("scope", ["SYSTEM", "USER", "TEAM"]).notNull().default("SYSTEM"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  }
);

export type OrganizationSetting = typeof organizationSettings.$inferSelect;
export type InsertOrganizationSetting = typeof organizationSettings.$inferInsert;

// ============================================================================
// UNIT TYPES (FEAT-013: Packaged Unit Type)
// ============================================================================

/**
 * Unit Type Category Enum
 */
export const unitTypeCategoryEnum = mysqlEnum("unitTypeCategory", [
  "WEIGHT",
  "COUNT",
  "VOLUME",
  "PACKAGED",
]);

/**
 * Unit Types Table
 * Customizable unit types including packaged products
 */
export const unitTypes = mysqlTable(
  "unit_types",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),
    category: unitTypeCategoryEnum.notNull(),
    conversionFactor: decimal("conversion_factor", { precision: 15, scale: 6 }).default("1"),
    baseUnitCode: varchar("base_unit_code", { length: 20 }),
    isActive: boolean("is_active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  }
);

export type UnitType = typeof unitTypes.$inferSelect;
export type InsertUnitType = typeof unitTypes.$inferInsert;

// ============================================================================
// CUSTOM FINANCE STATUSES (FEAT-015)
// ============================================================================

/**
 * Finance Entity Type Enum
 */
export const financeEntityTypeEnum = mysqlEnum("financeEntityType", [
  "INVOICE",
  "ORDER",
  "PAYMENT",
  "BILL",
  "CREDIT",
]);

/**
 * Custom Finance Statuses Table
 * Allows customization of finance status options per entity type
 */
export const customFinanceStatuses = mysqlTable(
  "custom_finance_statuses",
  {
    id: int("id").autoincrement().primaryKey(),
    entityType: financeEntityTypeEnum.notNull(),
    statusCode: varchar("status_code", { length: 50 }).notNull(),
    statusLabel: varchar("status_label", { length: 100 }).notNull(),
    description: text("description"),
    color: varchar("color", { length: 7 }).default("#6B7280"),
    sortOrder: int("sort_order").notNull().default(0),
    isDefault: boolean("is_default").notNull().default(false),
    isTerminal: boolean("is_terminal").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    entityTypeIdx: index("idx_custom_finance_statuses_entity").on(table.entityType),
    activeIdx: index("idx_custom_finance_statuses_active").on(table.isActive),
    uniqueEntityStatus: unique("unique_entity_status").on(table.entityType, table.statusCode),
  })
);

export type CustomFinanceStatus = typeof customFinanceStatuses.$inferSelect;
export type InsertCustomFinanceStatus = typeof customFinanceStatuses.$inferInsert;

// ============================================================================
// CASH AUDIT MODULE (FEAT-007)
// ============================================================================

/**
 * Cash Locations Table
 * Tracks multiple physical cash locations (e.g., "Location 1", "Location 2")
 * Each location maintains its own balance
 * Feature: MEET-002 Multi-Location Cash Tracking
 */
export const cashLocations = mysqlTable(
  "cash_locations",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    currentBalance: decimal("current_balance", { precision: 12, scale: 2 }).default("0"),
    isActive: boolean("is_active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  table => ({
    nameIdx: index("idx_cash_locations_name").on(table.name),
    activeIdx: index("idx_cash_locations_active").on(table.isActive),
  })
);

export type CashLocation = typeof cashLocations.$inferSelect;
export type InsertCashLocation = typeof cashLocations.$inferInsert;

/**
 * Cash Location Transactions Table
 * Records all cash movements (IN, OUT, TRANSFER) with audit trail
 * Feature: MEET-002 Multi-Location Cash Tracking
 */
export const cashLocationTransactions = mysqlTable(
  "cash_location_transactions",
  {
    id: int("id").autoincrement().primaryKey(),
    locationId: int("location_id").references(() => cashLocations.id),
    transactionType: varchar("transaction_type", { length: 20 }).notNull(), // 'IN', 'OUT', 'TRANSFER'
    amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
    description: text("description"),
    referenceType: varchar("reference_type", { length: 50 }), // 'ORDER', 'VENDOR_PAYMENT', 'TRANSFER', 'MANUAL'
    referenceId: int("reference_id"),
    // For transfers: the other location involved
    transferToLocationId: int("transfer_to_location_id").references(() => cashLocations.id),
    transferFromLocationId: int("transfer_from_location_id").references(() => cashLocations.id),
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    locationIdIdx: index("idx_cash_loc_tx_location").on(table.locationId),
    typeIdx: index("idx_cash_loc_tx_type").on(table.transactionType),
    createdAtIdx: index("idx_cash_loc_tx_created").on(table.createdAt),
    referenceIdx: index("idx_cash_loc_tx_reference").on(table.referenceType, table.referenceId),
  })
);

export type CashLocationTransaction = typeof cashLocationTransactions.$inferSelect;
export type InsertCashLocationTransaction = typeof cashLocationTransactions.$inferInsert;

// Relations for cash audit module
export const cashLocationsRelations = relations(cashLocations, ({ many }) => ({
  transactions: many(cashLocationTransactions),
}));

export const cashLocationTransactionsRelations = relations(cashLocationTransactions, ({ one }) => ({
  location: one(cashLocations, {
    fields: [cashLocationTransactions.locationId],
    references: [cashLocations.id],
  }),
  createdByUser: one(users, {
    fields: [cashLocationTransactions.createdBy],
    references: [users.id],
  }),
  transferToLocation: one(cashLocations, {
    fields: [cashLocationTransactions.transferToLocationId],
    references: [cashLocations.id],
    relationName: "transferTo",
  }),
  transferFromLocation: one(cashLocations, {
    fields: [cashLocationTransactions.transferFromLocationId],
    references: [cashLocations.id],
    relationName: "transferFrom",
  }),
}));

/**
 * Shift Audits Table
 * Tracks shift-based cash reconciliation with variance detection
 * Feature: MEET-004 Shift Payment Tracking with Reset
 */
export const shiftAudits = mysqlTable(
  "shift_audits",
  {
    id: int("id").autoincrement().primaryKey(),
    locationId: int("location_id").references(() => cashLocations.id),
    shiftStart: timestamp("shift_start").notNull(),
    shiftEnd: timestamp("shift_end"),
    // Balance tracking
    startingBalance: decimal("starting_balance", { precision: 12, scale: 2 }),
    expectedBalance: decimal("expected_balance", { precision: 12, scale: 2 }),
    actualCount: decimal("actual_count", { precision: 12, scale: 2 }),
    variance: decimal("variance", { precision: 12, scale: 2 }),
    // Metadata
    notes: text("notes"),
    status: varchar("status", { length: 20 }).default("ACTIVE"), // 'ACTIVE', 'CLOSED'
    // Reset tracking
    resetBy: int("reset_by").references(() => users.id),
    resetAt: timestamp("reset_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  table => ({
    locationIdIdx: index("idx_shift_audits_location").on(table.locationId),
    statusIdx: index("idx_shift_audits_status").on(table.status),
    shiftStartIdx: index("idx_shift_audits_start").on(table.shiftStart),
  })
);

export type ShiftAudit = typeof shiftAudits.$inferSelect;
export type InsertShiftAudit = typeof shiftAudits.$inferInsert;

// Relations for shift audits
export const shiftAuditsRelations = relations(shiftAudits, ({ one }) => ({
  location: one(cashLocations, {
    fields: [shiftAudits.locationId],
    references: [cashLocations.id],
  }),
  resetByUser: one(users, {
    fields: [shiftAudits.resetBy],
    references: [users.id],
  }),
}));

// ============================================================================
// SPRINT 3 TRACK D: PAYABLES LOGIC (MEET-005, MEET-006, FEAT-007)
// ============================================================================

/**
 * Vendor Payable Status Enum (MEET-005)
 * Tracks the status of payables to vendors for consigned inventory
 */
export const vendorPayableStatusEnum = mysqlEnum("vendor_payable_status", [
  "PENDING",  // Inventory still on hand, payable not yet due
  "DUE",      // Inventory sold out, payable is now due to vendor
  "PARTIAL",  // Some payment made, balance remaining
  "PAID",     // Fully paid
  "VOID",     // Voided (e.g., inventory returned or destroyed)
]);

/**
 * Payable Notification Type Enum (MEET-005)
 * Types of notifications for payables
 */
export const payableNotificationTypeEnum = mysqlEnum("payable_notification_type", [
  "GRACE_PERIOD_WARNING",  // Warning before payable becomes due
  "PAYABLE_DUE",           // Payable is now due
  "PAYMENT_REMINDER",      // Reminder for outstanding payable
  "OVERDUE",               // Payable is past due
]);

/**
 * Vendor Payables Table (MEET-005)
 * Tracks payables to vendors for consigned inventory
 * When a consigned batch's inventory reaches zero, the payable becomes "DUE"
 */
export const vendorPayables = mysqlTable(
  "vendor_payables",
  {
    id: int("id").autoincrement().primaryKey(),
    deletedAt: timestamp("deleted_at"),
    version: int("version").notNull().default(1),

    // Vendor reference (supplier client)
    vendorClientId: int("vendor_client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),

    // Batch reference
    batchId: int("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "restrict" }),
    lotId: int("lot_id")
      .notNull()
      .references(() => lots.id, { onDelete: "restrict" }),

    // Payable details
    payableNumber: varchar("payable_number", { length: 50 }).notNull().unique(),
    unitsSold: decimal("units_sold", { precision: 15, scale: 2 }).notNull().default("0"),
    cogsPerUnit: decimal("cogs_per_unit", { precision: 15, scale: 2 }).notNull(),
    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull().default("0"),
    amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).notNull().default("0"),
    amountDue: decimal("amount_due", { precision: 15, scale: 2 }).notNull().default("0"),

    // Status tracking
    status: vendorPayableStatusEnum.notNull().default("PENDING"),
    dueDate: date("due_date"),
    paidDate: date("paid_date"),

    // Grace period tracking for notifications
    inventoryZeroAt: timestamp("inventory_zero_at"),
    notificationSentAt: timestamp("notification_sent_at"),
    gracePeriodHours: int("grace_period_hours").notNull().default(24),

    // Audit fields
    notes: text("notes"),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    vendorIdx: index("idx_vendor_payables_vendor").on(table.vendorClientId),
    batchIdx: index("idx_vendor_payables_batch").on(table.batchId),
    statusIdx: index("idx_vendor_payables_status").on(table.status),
    dueDateIdx: index("idx_vendor_payables_due_date").on(table.dueDate),
  })
);

export type VendorPayable = typeof vendorPayables.$inferSelect;
export type InsertVendorPayable = typeof vendorPayables.$inferInsert;

/**
 * Payable Notifications Table (MEET-005)
 * Tracks notifications sent to accounting for due payables
 */
export const payableNotifications = mysqlTable(
  "payable_notifications",
  {
    id: int("id").autoincrement().primaryKey(),
    deletedAt: timestamp("deleted_at"),

    payableId: int("payable_id")
      .notNull()
      .references(() => vendorPayables.id, { onDelete: "cascade" }),
    notificationType: payableNotificationTypeEnum.notNull(),
    sentToUserId: int("sent_to_user_id").references(() => users.id, { onDelete: "set null" }),
    sentToRole: varchar("sent_to_role", { length: 50 }),

    // Notification content
    subject: varchar("subject", { length: 255 }).notNull(),
    message: text("message").notNull(),

    // Status
    sentAt: timestamp("sent_at").defaultNow().notNull(),
    readAt: timestamp("read_at"),
    acknowledgedBy: int("acknowledged_by").references(() => users.id, { onDelete: "set null" }),
    acknowledgedAt: timestamp("acknowledged_at"),
  },
  table => ({
    payableIdx: index("idx_payable_notifications_payable").on(table.payableId),
    typeIdx: index("idx_payable_notifications_type").on(table.notificationType),
  })
);

export type PayableNotification = typeof payableNotifications.$inferSelect;
export type InsertPayableNotification = typeof payableNotifications.$inferInsert;

/**
 * Invoice Payments Junction Table (FEAT-007)
 * Allows payments to be allocated across multiple invoices
 * Supports partial payments and batch payment allocation
 */
export const invoicePayments = mysqlTable(
  "invoice_payments",
  {
    id: int("id").autoincrement().primaryKey(),
    deletedAt: timestamp("deleted_at"),

    paymentId: int("payment_id")
      .notNull()
      .references(() => payments.id, { onDelete: "cascade" }),
    invoiceId: int("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    allocatedAmount: decimal("allocated_amount", { precision: 15, scale: 2 }).notNull(),

    // Allocation metadata
    allocatedAt: timestamp("allocated_at").defaultNow().notNull(),
    allocatedBy: int("allocated_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    notes: text("notes"),
  },
  table => ({
    paymentIdx: index("idx_invoice_payments_payment").on(table.paymentId),
    invoiceIdx: index("idx_invoice_payments_invoice").on(table.invoiceId),
    uniqueAllocation: uniqueIndex("uk_invoice_payments").on(table.paymentId, table.invoiceId),
  })
);

export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = typeof invoicePayments.$inferInsert;

// Relations for vendor payables
export const vendorPayablesRelations = relations(vendorPayables, ({ one, many }) => ({
  vendor: one(clients, {
    fields: [vendorPayables.vendorClientId],
    references: [clients.id],
  }),
  batch: one(batches, {
    fields: [vendorPayables.batchId],
    references: [batches.id],
  }),
  lot: one(lots, {
    fields: [vendorPayables.lotId],
    references: [lots.id],
  }),
  createdByUser: one(users, {
    fields: [vendorPayables.createdBy],
    references: [users.id],
  }),
  notifications: many(payableNotifications),
}));

// Relations for payable notifications
export const payableNotificationsRelations = relations(payableNotifications, ({ one }) => ({
  payable: one(vendorPayables, {
    fields: [payableNotifications.payableId],
    references: [vendorPayables.id],
  }),
  sentToUser: one(users, {
    fields: [payableNotifications.sentToUserId],
    references: [users.id],
  }),
  acknowledgedByUser: one(users, {
    fields: [payableNotifications.acknowledgedBy],
    references: [users.id],
  }),
}));

// Relations for invoice payments
export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  payment: one(payments, {
    fields: [invoicePayments.paymentId],
    references: [payments.id],
  }),
  invoice: one(invoices, {
    fields: [invoicePayments.invoiceId],
    references: [invoices.id],
  }),
  allocatedByUser: one(users, {
    fields: [invoicePayments.allocatedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// LIVE SHOPPING MODULE (Phase 0)
// ============================================================================
export * from "./schema-live-shopping";


// ============================================================================
// FEATURE FLAGS MODULE
// ============================================================================
export * from "./schema-feature-flags";

// ============================================================================
// ACCOUNTING MODULE RELATIONS (BUG-046 FIX)
// ============================================================================

// Relations for invoices
export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  customer: one(clients, {
    fields: [invoices.customerId],
    references: [clients.id],
  }),
  createdByUser: one(users, {
    fields: [invoices.createdBy],
    references: [users.id],
  }),
  lineItems: many(invoiceLineItems),
}));

// Relations for invoiceLineItems
export const invoiceLineItemsRelations = relations(invoiceLineItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceLineItems.invoiceId],
    references: [invoices.id],
  }),
}));

// Relations for bills
export const billsRelations = relations(bills, ({ one, many }) => ({
  vendor: one(vendors, {
    fields: [bills.vendorId],
    references: [vendors.id],
  }),
  createdByUser: one(users, {
    fields: [bills.createdBy],
    references: [users.id],
  }),
  lineItems: many(billLineItems),
}));

// Relations for billLineItems
export const billLineItemsRelations = relations(billLineItems, ({ one }) => ({
  bill: one(bills, {
    fields: [billLineItems.billId],
    references: [bills.id],
  }),
}));

// Relations for payments
export const paymentsRelations = relations(payments, ({ one }) => ({
  client: one(clients, {
    fields: [payments.customerId],
    references: [clients.id],
  }),
  createdByUser: one(users, {
    fields: [payments.createdBy],
    references: [users.id],
  }),
}));

// Relations for orders
export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  createdByUser: one(users, {
    fields: [orders.createdBy],
    references: [users.id],
  }),
  lineItems: many(orderLineItems),
}));

// Relations for orderLineItems
export const orderLineItemsRelations = relations(orderLineItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderLineItems.orderId],
    references: [orders.id],
  }),
  batch: one(batches, {
    fields: [orderLineItems.batchId],
    references: [batches.id],
  }),
}));

// Relations for clients
export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(orders),
  invoices: many(invoices),
  payments: many(payments),
}));

// ============================================================================
// INTAKE VERIFICATION SYSTEM (FEAT-008: MEET-064 to MEET-066)
// ============================================================================

/**
 * Intake Receipt Status Enum
 * Tracks the lifecycle of an intake receipt through verification
 */
export const intakeReceiptStatusEnum = mysqlEnum("intake_receipt_status", [
  "PENDING",          // Initial state - awaiting farmer verification
  "FARMER_VERIFIED",  // Farmer has acknowledged the receipt
  "STACKER_VERIFIED", // Stacker has verified actual quantities
  "FINALIZED",        // Both parties verified, inventory updated
  "DISPUTED",         // Discrepancy requires admin resolution
]);

/**
 * Intake Receipt Verification Status Enum
 * Status for individual line items
 */
export const intakeVerificationStatusEnum = mysqlEnum("intake_verification_status", [
  "PENDING",     // Not yet verified
  "VERIFIED",    // Verified as correct
  "DISCREPANCY", // Quantity mismatch found
]);

/**
 * Intake Discrepancy Resolution Enum
 * How a discrepancy was resolved
 */
export const intakeResolutionEnum = mysqlEnum("intake_resolution", [
  "ACCEPTED",  // Accept actual quantity
  "ADJUSTED",  // Adjust to expected quantity
  "REJECTED",  // Reject the item entirely
]);

/**
 * Intake Receipts Table
 * Primary document for intake verification workflow
 * FEAT-008: MEET-064 - Intake Receipt Tool
 */
export const intakeReceipts = mysqlTable(
  "intake_receipts",
  {
    id: int("id").autoincrement().primaryKey(),
    receiptNumber: varchar("receipt_number", { length: 50 }).notNull().unique(),
    supplierId: int("supplier_id").references(() => clients.id),
    status: varchar("status", { length: 30 }).notNull().default("PENDING"),
    // Status: 'PENDING', 'FARMER_VERIFIED', 'STACKER_VERIFIED', 'FINALIZED', 'DISPUTED'

    // Farmer verification
    farmerVerifiedAt: timestamp("farmer_verified_at"),
    farmerVerifiedBy: int("farmer_verified_by").references(() => users.id),

    // Stacker verification
    stackerVerifiedAt: timestamp("stacker_verified_at"),
    stackerVerifiedBy: int("stacker_verified_by").references(() => users.id),

    // Finalization
    finalizedAt: timestamp("finalized_at"),
    finalizedBy: int("finalized_by").references(() => users.id),

    // Additional info
    notes: text("notes"),
    shareableToken: varchar("shareable_token", { length: 100 }),

    // Track creator for discrepancy notifications
    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  },
  (table) => ({
    supplierIdx: index("idx_intake_receipts_supplier").on(table.supplierId),
    statusIdx: index("idx_intake_receipts_status").on(table.status),
    createdIdx: index("idx_intake_receipts_created").on(table.createdAt),
    tokenIdx: index("idx_intake_receipts_token").on(table.shareableToken),
  })
);

export type IntakeReceipt = typeof intakeReceipts.$inferSelect;
export type InsertIntakeReceipt = typeof intakeReceipts.$inferInsert;

/**
 * Intake Receipt Items Table
 * Line items for an intake receipt
 * FEAT-008: MEET-064 - Intake Receipt Tool
 */
export const intakeReceiptItems = mysqlTable(
  "intake_receipt_items",
  {
    id: int("id").autoincrement().primaryKey(),
    receiptId: int("receipt_id")
      .notNull()
      .references(() => intakeReceipts.id, { onDelete: "cascade" }),
    productId: int("product_id").references(() => products.id),
    productName: varchar("product_name", { length: 255 }).notNull(),
    expectedQuantity: decimal("expected_quantity", { precision: 12, scale: 4 }).notNull(),
    actualQuantity: decimal("actual_quantity", { precision: 12, scale: 4 }),
    unit: varchar("unit", { length: 20 }).notNull(),
    expectedPrice: decimal("expected_price", { precision: 12, scale: 2 }),
    verificationStatus: varchar("verification_status", { length: 20 }).default("PENDING"),
    // Status: 'PENDING', 'VERIFIED', 'DISCREPANCY'
    discrepancyNotes: text("discrepancy_notes"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    receiptIdx: index("idx_intake_receipt_items_receipt").on(table.receiptId),
    productIdx: index("idx_intake_receipt_items_product").on(table.productId),
  })
);

export type IntakeReceiptItem = typeof intakeReceiptItems.$inferSelect;
export type InsertIntakeReceiptItem = typeof intakeReceiptItems.$inferInsert;

/**
 * Intake Discrepancies Table
 * Records discrepancies found during verification
 * FEAT-008: MEET-065 - Verification Process
 */
export const intakeDiscrepancies = mysqlTable(
  "intake_discrepancies",
  {
    id: int("id").autoincrement().primaryKey(),
    receiptId: int("receipt_id")
      .notNull()
      .references(() => intakeReceipts.id, { onDelete: "cascade" }),
    itemId: int("item_id")
      .notNull()
      .references(() => intakeReceiptItems.id, { onDelete: "cascade" }),
    expectedQuantity: decimal("expected_quantity", { precision: 12, scale: 4 }),
    actualQuantity: decimal("actual_quantity", { precision: 12, scale: 4 }),
    difference: decimal("difference", { precision: 12, scale: 4 }),
    resolution: varchar("resolution", { length: 50 }),
    // Resolution: 'ACCEPTED', 'ADJUSTED', 'REJECTED'
    resolutionNotes: text("resolution_notes"),
    resolvedBy: int("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").defaultNow(),
  },
  (table) => ({
    receiptIdx: index("idx_intake_discrepancies_receipt").on(table.receiptId),
    itemIdx: index("idx_intake_discrepancies_item").on(table.itemId),
    resolutionIdx: index("idx_intake_discrepancies_resolution").on(table.resolution),
  })
);

export type IntakeDiscrepancy = typeof intakeDiscrepancies.$inferSelect;
export type InsertIntakeDiscrepancy = typeof intakeDiscrepancies.$inferInsert;

// Relations for intake receipts
export const intakeReceiptsRelations = relations(intakeReceipts, ({ one, many }) => ({
  supplier: one(clients, {
    fields: [intakeReceipts.supplierId],
    references: [clients.id],
  }),
  creator: one(users, {
    fields: [intakeReceipts.createdBy],
    references: [users.id],
    relationName: "intakeReceiptCreator",
  }),
  farmerVerifier: one(users, {
    fields: [intakeReceipts.farmerVerifiedBy],
    references: [users.id],
    relationName: "intakeReceiptFarmerVerifier",
  }),
  stackerVerifier: one(users, {
    fields: [intakeReceipts.stackerVerifiedBy],
    references: [users.id],
    relationName: "intakeReceiptStackerVerifier",
  }),
  finalizer: one(users, {
    fields: [intakeReceipts.finalizedBy],
    references: [users.id],
    relationName: "intakeReceiptFinalizer",
  }),
  items: many(intakeReceiptItems),
  discrepancies: many(intakeDiscrepancies),
}));

// Relations for intake receipt items
export const intakeReceiptItemsRelations = relations(intakeReceiptItems, ({ one, many }) => ({
  receipt: one(intakeReceipts, {
    fields: [intakeReceiptItems.receiptId],
    references: [intakeReceipts.id],
  }),
  product: one(products, {
    fields: [intakeReceiptItems.productId],
    references: [products.id],
  }),
  discrepancies: many(intakeDiscrepancies),
}));

// Relations for intake discrepancies
export const intakeDiscrepanciesRelations = relations(intakeDiscrepancies, ({ one }) => ({
  receipt: one(intakeReceipts, {
    fields: [intakeDiscrepancies.receiptId],
    references: [intakeReceipts.id],
  }),
  item: one(intakeReceiptItems, {
    fields: [intakeDiscrepancies.itemId],
    references: [intakeReceiptItems.id],
  }),
  resolver: one(users, {
    fields: [intakeDiscrepancies.resolvedBy],
    references: [users.id],
  }),
}));
