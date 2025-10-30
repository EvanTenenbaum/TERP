import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, boolean, json, date, index, unique } from "drizzle-orm/mysql-core";

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
  "CLOSED"
]);

/**
 * COGS Mode Enum
 * Defines how cost of goods sold is calculated
 * SIMPLIFIED: Removed FLOOR, kept only FIXED and RANGE
 */
export const cogsModeEnum = mysqlEnum("cogsMode", [
  "FIXED",
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
 * Strain Library table
 * Centralized library of cannabis strains for standardization
 * UPDATED: Added OpenTHC VDB integration fields
 */
export const strains = mysqlTable("strains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
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
 * Product Media table
 * Stores media files (images, documents) associated with products
 */
export const productMedia = mysqlTable("productMedia", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  url: varchar("url", { length: 1000 }).notNull(),
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
});

export type ProductTag = typeof productTags.$inferSelect;
export type InsertProductTag = typeof productTags.$inferInsert;

/**
 * Lots table
 * Represents a single vendor intake event (system-only, not client-facing)
 * REMOVED: siteCode (moved to settings-based location management)
 */
export const lots = mysqlTable("lots", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  vendorId: int("vendorId").notNull(),
  date: timestamp("date").notNull(),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Lot = typeof lots.$inferSelect;
export type InsertLot = typeof lots.$inferInsert;

/**
 * Batches table
 * Represents sellable units of a specific product within a lot
 * ADDED: amountPaid for COD/Partial payment tracking
 * REMOVED: unitCogsFloor (FLOOR mode removed)
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
  sampleOnly: int("sampleOnly").notNull().default(0), // 0 = false, 1 = true (batch can only be sampled, not sold)
  sampleAvailable: int("sampleAvailable").notNull().default(0), // 0 = false, 1 = true (batch can be used for samples)
  cogsMode: cogsModeEnum.notNull(),
  unitCogs: varchar("unitCogs", { length: 20 }), // FIXED
  unitCogsMin: varchar("unitCogsMin", { length: 20 }), // RANGE
  unitCogsMax: varchar("unitCogsMax", { length: 20 }), // RANGE
  paymentTerms: paymentTermsEnum.notNull(),
  amountPaid: varchar("amountPaid", { length: 20 }).default("0"), // For COD/Partial tracking
  metadata: text("metadata"), // JSON string: test results, harvest code, COA, etc.
  onHandQty: varchar("onHandQty", { length: 20 }).notNull().default("0"),
  sampleQty: varchar("sampleQty", { length: 20 }).notNull().default("0"),
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
 * Payment History table
 * Tracks all payments made to vendors for batches
 */
export const paymentHistory = mysqlTable("paymentHistory", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  vendorId: int("vendorId").notNull(),
  amount: varchar("amount", { length: 20 }).notNull(),
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
export const sales = mysqlTable("sales", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull(),
  productId: int("productId").notNull(),
  quantity: varchar("quantity", { length: 20 }).notNull(),
  cogsAtSale: varchar("cogsAtSale", { length: 20 }).notNull(), // COGS snapshot
  salePrice: varchar("salePrice", { length: 20 }).notNull(),
  cogsOverride: int("cogsOverride").notNull().default(0), // 0 = false, 1 = true
  customerId: int("customerId"),
  saleDate: timestamp("saleDate").notNull(),
  notes: text("notes"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
export type InsertDashboardWidgetLayout = typeof dashboardWidgetLayouts.$inferInsert;

/**
 * Dashboard KPI Configurations table
 * Stores role-based KPI configurations (which KPIs to show, in what order)
 * Admins can set defaults for each role
 */
export const dashboardKpiConfigs = mysqlTable("dashboard_kpi_configs", {
  id: int("id").autoincrement().primaryKey(),
  role: mysqlEnum("role", ["user", "admin"]).notNull(),
  kpiType: varchar("kpiType", { length: 100 }).notNull(),
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
  accountName: varchar("accountName", { length: 255 }).notNull(),
  accountType: mysqlEnum("accountType", ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).notNull(),
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
export const ledgerEntries = mysqlTable("ledgerEntries", {
  id: int("id").autoincrement().primaryKey(),
  entryNumber: varchar("entryNumber", { length: 50 }).notNull().unique(),
  entryDate: date("entryDate").notNull(),
  accountId: int("accountId").notNull(),
  debit: decimal("debit", { precision: 12, scale: 2 }).default("0.00").notNull(),
  credit: decimal("credit", { precision: 12, scale: 2 }).default("0.00").notNull(),
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
});

export type LedgerEntry = typeof ledgerEntries.$inferSelect;
export type InsertLedgerEntry = typeof ledgerEntries.$inferInsert;

/**
 * Fiscal Periods
 * Defines accounting periods for financial reporting and period close
 */
export const fiscalPeriods = mysqlTable("fiscalPeriods", {
  id: int("id").autoincrement().primaryKey(),
  periodName: varchar("periodName", { length: 100 }).notNull(),
  startDate: date("startDate").notNull(),
  endDate: date("endDate").notNull(),
  fiscalYear: int("fiscalYear").notNull(),
  status: mysqlEnum("status", ["OPEN", "CLOSED", "LOCKED"]).default("OPEN").notNull(),
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
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull().unique(),
  customerId: int("customerId").notNull(), // Will link to clients table when created
  invoiceDate: date("invoiceDate").notNull(),
  dueDate: date("dueDate").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).default("0.00").notNull(),
  amountDue: decimal("amountDue", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["DRAFT", "SENT", "VIEWED", "PARTIAL", "PAID", "OVERDUE", "VOID"]).default("DRAFT").notNull(),
  paymentTerms: varchar("paymentTerms", { length: 100 }),
  notes: text("notes"),
  referenceType: varchar("referenceType", { length: 50 }), // SALE, ORDER, CONTRACT
  referenceId: int("referenceId"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Invoice Line Items
 * Individual items on an invoice
 */
export const invoiceLineItems = mysqlTable("invoiceLineItems", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  productId: int("productId"),
  batchId: int("batchId"),
  description: text("description").notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type InvoiceLineItem = typeof invoiceLineItems.$inferSelect;
export type InsertInvoiceLineItem = typeof invoiceLineItems.$inferInsert;

/**
 * Bills (Accounts Payable)
 * Vendor bills for purchases
 */
export const bills = mysqlTable("bills", {
  id: int("id").autoincrement().primaryKey(),
  billNumber: varchar("billNumber", { length: 50 }).notNull().unique(),
  vendorId: int("vendorId").notNull(),
  billDate: date("billDate").notNull(),
  dueDate: date("dueDate").notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  discountAmount: decimal("discountAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  amountPaid: decimal("amountPaid", { precision: 12, scale: 2 }).default("0.00").notNull(),
  amountDue: decimal("amountDue", { precision: 12, scale: 2 }).notNull(),
  status: mysqlEnum("status", ["DRAFT", "PENDING", "APPROVED", "PARTIAL", "PAID", "OVERDUE", "VOID"]).default("DRAFT").notNull(),
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
  unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("0.00").notNull(),
  discountPercent: decimal("discountPercent", { precision: 5, scale: 2 }).default("0.00").notNull(),
  lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type BillLineItem = typeof billLineItems.$inferSelect;
export type InsertBillLineItem = typeof billLineItems.$inferInsert;

/**
 * Payments
 * Unified payment tracking for both AR and AP
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  paymentNumber: varchar("paymentNumber", { length: 50 }).notNull().unique(),
  paymentType: mysqlEnum("paymentType", ["RECEIVED", "SENT"]).notNull(), // RECEIVED = AR, SENT = AP
  paymentDate: date("paymentDate").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["CASH", "CHECK", "WIRE", "ACH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]).notNull(),
  referenceNumber: varchar("referenceNumber", { length: 100 }),
  bankAccountId: int("bankAccountId"),
  customerId: int("customerId"), // For AR payments
  vendorId: int("vendorId"), // For AP payments
  invoiceId: int("invoiceId"), // For AR payments
  billId: int("billId"), // For AP payments
  notes: text("notes"),
  isReconciled: boolean("isReconciled").default(false).notNull(),
  reconciledAt: timestamp("reconciledAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

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
  accountNumber: varchar("accountNumber", { length: 50 }).notNull(),
  bankName: varchar("bankName", { length: 255 }).notNull(),
  accountType: mysqlEnum("accountType", ["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"]).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  currentBalance: decimal("currentBalance", { precision: 12, scale: 2 }).default("0.00").notNull(),
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
  transactionType: mysqlEnum("transactionType", ["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"]).notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
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
  expenseDate: date("expenseDate").notNull(),
  categoryId: int("categoryId").notNull(),
  vendorId: int("vendorId"),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 2 }).default("0.00").notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 2 }).notNull(),
  paymentMethod: mysqlEnum("paymentMethod", ["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]).notNull(),
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
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  noteId: int("noteId").notNull().references(() => freeformNotes.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
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
  noteId: int("noteId").notNull().references(() => freeformNotes.id, { onDelete: "cascade" }),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  activityType: mysqlEnum("activityType", [
    "CREATED",
    "UPDATED",
    "COMMENTED",
    "SHARED",
    "ARCHIVED",
    "RESTORED",
    "PINNED",
    "UNPINNED",
    "TEMPLATE_APPLIED"
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
 * COGS Adjustment Type Enum
 * Types of COGS adjustments at client level
 */
export const cogsAdjustmentTypeEnum = mysqlEnum("cogsAdjustmentType", [
  "NONE",
  "PERCENTAGE",
  "FIXED_AMOUNT"
]);

export const clients = mysqlTable("clients", {
  id: int("id").primaryKey().autoincrement(),
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
  cogsAdjustmentValue: decimal("cogs_adjustment_value", { precision: 10, scale: 4 }).default("0"),
  autoDeferConsignment: boolean("auto_defer_consignment").default(false),
  
  // Computed stats (updated via triggers or application logic)
  totalSpent: decimal("total_spent", { precision: 15, scale: 2 }).default("0"),
  totalProfit: decimal("total_profit", { precision: 15, scale: 2 }).default("0"),
  avgProfitMargin: decimal("avg_profit_margin", { precision: 5, scale: 2 }).default("0"),
  totalOwed: decimal("total_owed", { precision: 15, scale: 2 }).default("0"),
  oldestDebtDays: int("oldest_debt_days").default(0),
  
  // VIP Portal fields
  vipPortalEnabled: boolean("vip_portal_enabled").default(false),
  vipPortalLastLogin: timestamp("vip_portal_last_login"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  teriCodeIdx: index("idx_teri_code").on(table.teriCode),
  totalOwedIdx: index("idx_total_owed").on(table.totalOwed),
}));

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
  "NOTE"
]);

/**
 * Client Communications Table
 * Tracks all communications with clients
 */
export const clientCommunications = mysqlTable("client_communications", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  type: communicationTypeEnum.notNull(),
  subject: varchar("subject", { length: 255 }).notNull(),
  notes: text("notes"),
  communicatedAt: timestamp("communicated_at").notNull(),
  loggedBy: int("logged_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  communicatedAtIdx: index("idx_communicated_at").on(table.communicatedAt),
  typeIdx: index("idx_type").on(table.type),
}));

export type ClientCommunication = typeof clientCommunications.$inferSelect;
export type InsertClientCommunication = typeof clientCommunications.$inferInsert;

export const clientTransactions = mysqlTable("client_transactions", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  transactionType: mysqlEnum("transaction_type", ["INVOICE", "PAYMENT", "QUOTE", "ORDER", "REFUND", "CREDIT"]).notNull(),
  transactionNumber: varchar("transaction_number", { length: 100 }),
  transactionDate: date("transaction_date").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  
  // Payment tracking
  paymentStatus: mysqlEnum("payment_status", ["PAID", "PENDING", "OVERDUE", "PARTIAL"]).default("PENDING"),
  paymentDate: date("payment_date"),
  paymentAmount: decimal("payment_amount", { precision: 15, scale: 2 }),
  
  notes: text("notes"),
  metadata: json("metadata"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  transactionDateIdx: index("idx_transaction_date").on(table.transactionDate),
  paymentStatusIdx: index("idx_payment_status").on(table.paymentStatus),
}));

export type ClientTransaction = typeof clientTransactions.$inferSelect;
export type InsertClientTransaction = typeof clientTransactions.$inferInsert;

export const clientActivity = mysqlTable("client_activity", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  activityType: mysqlEnum("activity_type", [
    "CREATED",
    "UPDATED",
    "TRANSACTION_ADDED",
    "PAYMENT_RECORDED",
    "NOTE_ADDED",
    "TAG_ADDED",
    "TAG_REMOVED"
  ]).notNull(),
  
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
}));

export type ClientActivity = typeof clientActivity.$inferSelect;
export type InsertClientActivity = typeof clientActivity.$inferInsert;

export const clientNotes = mysqlTable("client_notes", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  noteId: int("note_id").notNull().references(() => freeformNotes.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  uniqueClientNote: unique("unique_client_note").on(table.clientId, table.noteId),
}));

export type ClientNote = typeof clientNotes.$inferSelect;
export type InsertClientNote = typeof clientNotes.$inferInsert;


// ============================================================================
// CREDIT INTELLIGENCE SYSTEM
// ============================================================================

/**
 * Credit Limit Configuration
 * Stores the calculated credit limit and health metrics for each client
 */
export const clientCreditLimits = mysqlTable("client_credit_limits", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }).unique(),
  
  // Credit limit calculation
  creditLimit: decimal("credit_limit", { precision: 15, scale: 2 }).notNull().default("0"),
  currentExposure: decimal("current_exposure", { precision: 15, scale: 2 }).notNull().default("0"),
  utilizationPercent: decimal("utilization_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  
  // Composite credit health score (0-100)
  creditHealthScore: decimal("credit_health_score", { precision: 5, scale: 2 }).notNull().default("0"),
  
  // Base capacity anchor
  baseCapacity: decimal("base_capacity", { precision: 15, scale: 2 }).notNull().default("0"),
  
  // Adjustment factors
  riskModifier: decimal("risk_modifier", { precision: 5, scale: 4 }).notNull().default("1"),
  directionalFactor: decimal("directional_factor", { precision: 5, scale: 4 }).notNull().default("1"),
  
  // System state
  mode: mysqlEnum("mode", ["LEARNING", "ACTIVE"]).notNull().default("LEARNING"),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull().default("0"),
  dataReadiness: decimal("data_readiness", { precision: 5, scale: 2 }).notNull().default("0"),
  
  // Trend tracking
  trend: mysqlEnum("trend", ["IMPROVING", "STABLE", "WORSENING"]).notNull().default("STABLE"),
  
  lastCalculated: timestamp("last_calculated").defaultNow().onUpdateNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
}));

export type ClientCreditLimit = typeof clientCreditLimits.$inferSelect;
export type InsertClientCreditLimit = typeof clientCreditLimits.$inferInsert;

/**
 * Credit Signal History
 * Stores historical signal values for trend analysis and transparency
 */
export const creditSignalHistory = mysqlTable("credit_signal_history", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  // Signal scores (0-100 each)
  revenueMomentum: decimal("revenue_momentum", { precision: 5, scale: 2 }).notNull().default("0"),
  cashCollectionStrength: decimal("cash_collection_strength", { precision: 5, scale: 2 }).notNull().default("0"),
  profitabilityQuality: decimal("profitability_quality", { precision: 5, scale: 2 }).notNull().default("0"),
  debtAgingRisk: decimal("debt_aging_risk", { precision: 5, scale: 2 }).notNull().default("0"),
  repaymentVelocity: decimal("repayment_velocity", { precision: 5, scale: 2 }).notNull().default("0"),
  tenureDepth: decimal("tenure_depth", { precision: 5, scale: 2 }).notNull().default("0"),
  
  // Directional indicators (-1, 0, 1 for down, stable, up)
  revenueMomentumTrend: int("revenue_momentum_trend").notNull().default(0),
  cashCollectionTrend: int("cash_collection_trend").notNull().default(0),
  profitabilityTrend: int("profitability_trend").notNull().default(0),
  debtAgingTrend: int("debt_aging_trend").notNull().default(0),
  repaymentVelocityTrend: int("repayment_velocity_trend").notNull().default(0),
  
  // Metadata for debugging
  calculationMetadata: json("calculation_metadata"),
  
  calculatedAt: timestamp("calculated_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  calculatedAtIdx: index("idx_calculated_at").on(table.calculatedAt),
}));

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
  repaymentVelocityWeight: int("repayment_velocity_weight").notNull().default(10),
  tenureWeight: int("tenure_weight").notNull().default(10),
  
  // System parameters
  learningModeThreshold: int("learning_mode_threshold").notNull().default(3), // months
  minInvoicesForActivation: int("min_invoices_for_activation").notNull().default(15),
  directionalSensitivity: decimal("directional_sensitivity", { precision: 5, scale: 4 }).notNull().default("0.1"),
  
  // Capacity calculation parameters
  revenueMultiplier: decimal("revenue_multiplier", { precision: 5, scale: 2 }).notNull().default("2"),
  marginMultiplier: decimal("margin_multiplier", { precision: 5, scale: 2 }).notNull().default("2.5"),
  
  // Global limits
  globalMinLimit: decimal("global_min_limit", { precision: 15, scale: 2 }).notNull().default("1000"),
  globalMaxLimit: decimal("global_max_limit", { precision: 15, scale: 2 }).notNull().default("1000000"),
  
  updatedBy: int("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

export type CreditSystemSettings = typeof creditSystemSettings.$inferSelect;
export type InsertCreditSystemSettings = typeof creditSystemSettings.$inferInsert;

/**
 * Credit Audit Log
 * Tracks significant changes to credit limits for compliance and analysis
 */
export const creditAuditLog = mysqlTable("credit_audit_log", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  eventType: mysqlEnum("event_type", [
    "LIMIT_CALCULATED",
    "LIMIT_INCREASED",
    "LIMIT_DECREASED",
    "MODE_CHANGED",
    "MANUAL_OVERRIDE",
    "EXPOSURE_EXCEEDED"
  ]).notNull(),
  
  oldValue: decimal("old_value", { precision: 15, scale: 2 }),
  newValue: decimal("new_value", { precision: 15, scale: 2 }),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }),
  
  reason: text("reason"),
  metadata: json("metadata"),
  
  triggeredBy: int("triggered_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  createdAtIdx: index("idx_created_at").on(table.createdAt),
}));

export type CreditAuditLog = typeof creditAuditLog.$inferSelect;
export type InsertCreditAuditLog = typeof creditAuditLog.$inferInsert;


// ============================================================================
// PRICING RULES & SALES SHEETS
// ============================================================================

/**
 * Pricing Rules
 * Define pricing adjustments based on conditions (category, strain, grade, etc.)
 */
export const pricingRules = mysqlTable("pricing_rules", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Adjustment configuration
  adjustmentType: mysqlEnum("adjustment_type", [
    "PERCENT_MARKUP",
    "PERCENT_MARKDOWN", 
    "DOLLAR_MARKUP",
    "DOLLAR_MARKDOWN"
  ]).notNull(),
  adjustmentValue: decimal("adjustment_value", { precision: 10, scale: 2 }).notNull(),
  
  // Conditions (JSON: { category: "Flower", grade: "A", ... })
  conditions: json("conditions").notNull(),
  logicType: mysqlEnum("logic_type", ["AND", "OR"]).default("AND"),
  priority: int("priority").default(0),
  
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  priorityIdx: index("idx_priority").on(table.priority),
}));

export type PricingRule = typeof pricingRules.$inferSelect;
export type InsertPricingRule = typeof pricingRules.$inferInsert;

/**
 * Pricing Profiles
 * Named collections of pricing rules for reuse across clients
 */
export const pricingProfiles = mysqlTable("pricing_profiles", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
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
 * Sales Sheet Templates
 * Saved configurations for quick sales sheet creation
 */
export const salesSheetTemplates = mysqlTable("sales_sheet_templates", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // NULL for universal templates, specific ID for client-specific
  clientId: int("client_id").references(() => clients.id, { onDelete: "cascade" }),
  
  // Configuration JSON
  filters: json("filters").notNull(), // { category: "Flower", grade: "A", ... }
  selectedItems: json("selected_items").notNull(), // Array of inventory item IDs
  columnVisibility: json("column_visibility").notNull(), // { price: true, vendor: false, ... }
  
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  lastUsedAt: timestamp("last_used_at"),
  expirationDate: timestamp("expiration_date"),
  isActive: int("is_active").notNull().default(1), // 0 = inactive, 1 = active
  currentVersion: int("current_version").notNull().default(1),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  createdByIdx: index("idx_created_by").on(table.createdBy),
}));

export type SalesSheetTemplate = typeof salesSheetTemplates.$inferSelect;
export type InsertSalesSheetTemplate = typeof salesSheetTemplates.$inferInsert;

/**
 * Sales Sheet History
 * Record of completed sales sheets sent to clients
 */
export const salesSheetHistory = mysqlTable("sales_sheet_history", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  createdBy: int("created_by").notNull().references(() => users.id),
  templateId: int("template_id").references(() => salesSheetTemplates.id, { onDelete: "set null" }),
  
  // Items with pricing: [{ itemId: 1, price: 150, quantity: 10, overridePrice: 140 }, ...]
  items: json("items").notNull(),
  totalValue: decimal("total_value", { precision: 15, scale: 2 }).notNull(),
  itemCount: int("item_count").notNull(),
  
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  createdByIdx: index("idx_created_by").on(table.createdBy),
  createdAtIdx: index("idx_created_at").on(table.createdAt),
}));

export type SalesSheetHistory = typeof salesSheetHistory.$inferSelect;
export type InsertSalesSheetHistory = typeof salesSheetHistory.$inferInsert;



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
  "CONVERTED"
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
  "CANCELLED"
]);

/**
 * Fulfillment Status Enum
 * Lifecycle states for order fulfillment (SHIPPING STATUS)
 * Separate from payment status to track physical order processing
 */
export const fulfillmentStatusEnum = mysqlEnum("fulfillmentStatus", [
  "PENDING",
  "PACKED",
  "SHIPPED"
]);

/**
 * Orders Table (Unified Quotes + Sales)
 * Combines quotes and sales into a single table for simplicity
 */
export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  orderType: orderTypeEnum.notNull(),
  isDraft: boolean("is_draft").notNull().default(true),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  clientNeedId: int("client_need_id"), // Link to client need if order was created from a need
  
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
  cashPayment: decimal("cash_payment", { precision: 15, scale: 2 }).default("0"),
  dueDate: date("due_date"),
  saleStatus: saleStatusEnum,
  invoiceId: int("invoice_id"),
  
  // Fulfillment tracking (for SALE orders)
  fulfillmentStatus: fulfillmentStatusEnum.default("PENDING"),
  packedAt: timestamp("packed_at"),
  packedBy: int("packed_by").references(() => users.id),
  shippedAt: timestamp("shipped_at"),
  shippedBy: int("shipped_by").references(() => users.id),
  
  // Conversion tracking
  convertedFromOrderId: int("converted_from_order_id").references((): any => orders.id),
  convertedAt: timestamp("converted_at"),
  confirmedAt: timestamp("confirmed_at"),
  relatedSampleRequestId: int("related_sample_request_id"), // Link to sample request if order came from sample
  
  // Metadata
  notes: text("notes"),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  orderTypeIdx: index("idx_order_type").on(table.orderType),
  isDraftIdx: index("idx_is_draft").on(table.isDraft),
  quoteStatusIdx: index("idx_quote_status").on(table.quoteStatus),
  saleStatusIdx: index("idx_sale_status").on(table.saleStatus),
  fulfillmentStatusIdx: index("idx_fulfillment_status").on(table.fulfillmentStatus),
  createdAtIdx: index("idx_created_at").on(table.createdAt),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order Status History
 * Tracks all fulfillment status changes for orders
 */
export const orderStatusHistory = mysqlTable("order_status_history", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  fromStatus: fulfillmentStatusEnum,
  toStatus: fulfillmentStatusEnum.notNull(),
  changedBy: int("changed_by").notNull().references(() => users.id),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
  notes: text("notes"),
}, (table) => ({
  orderIdIdx: index("idx_order_id").on(table.orderId),
  changedAtIdx: index("idx_changed_at").on(table.changedAt),
}));

export type OrderStatusHistory = typeof orderStatusHistory.$inferSelect;
export type InsertOrderStatusHistory = typeof orderStatusHistory.$inferInsert;

/**
 * Return Reason Enum
 * Reasons for order returns
 */
export const returnReasonEnum = mysqlEnum("returnReason", [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "CUSTOMER_CHANGED_MIND",
  "OTHER"
]);

/**
 * Returns Table
 * Tracks returns for orders with automatic inventory restocking
 */
export const returns = mysqlTable("returns", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  items: json("items").notNull(), // Array of { batchId, quantity, reason }
  reason: returnReasonEnum.notNull(),
  notes: text("notes"),
  processedBy: int("processed_by").notNull().references(() => users.id),
  processedAt: timestamp("processed_at").defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index("idx_order_id").on(table.orderId),
  processedAtIdx: index("idx_processed_at").on(table.processedAt),
}));

export type Return = typeof returns.$inferSelect;
export type InsertReturn = typeof returns.$inferInsert;

/**
 * Sample Inventory Log
 * Tracks sample inventory allocations and consumption
 */
export const sampleInventoryLog = mysqlTable("sample_inventory_log", {
  id: int("id").primaryKey().autoincrement(),
  batchId: int("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  orderId: int("order_id").references(() => orders.id, { onDelete: "cascade" }),
  
  quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),
  action: mysqlEnum("action", ["ALLOCATED", "RELEASED", "CONSUMED"]).notNull(),
  
  notes: text("notes"),
  createdBy: int("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  batchIdIdx: index("idx_batch_id").on(table.batchId),
  orderIdIdx: index("idx_order_id").on(table.orderId),
  createdAtIdx: index("idx_created_at").on(table.createdAt),
}));

export type SampleInventoryLog = typeof sampleInventoryLog.$inferSelect;
export type InsertSampleInventoryLog = typeof sampleInventoryLog.$inferInsert;

/**
 * COGS Rules (Optional - Simple Version)
 * Global rules for COGS calculation
 */
export const cogsRules = mysqlTable("cogs_rules", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  
  // Simple condition (not complex engine)
  conditionField: mysqlEnum("condition_field", [
    "QUANTITY",
    "TOTAL_VALUE",
    "CLIENT_TIER",
    "PAYMENT_TERMS"
  ]),
  conditionOperator: mysqlEnum("condition_operator", ["GT", "GTE", "LT", "LTE", "EQ"]),
  conditionValue: decimal("condition_value", { precision: 15, scale: 4 }),
  
  // Adjustment
  adjustmentType: mysqlEnum("adjustment_type", [
    "PERCENTAGE",
    "FIXED_AMOUNT",
    "USE_MIN",
    "USE_MAX"
  ]),
  adjustmentValue: decimal("adjustment_value", { precision: 10, scale: 4 }),
  
  priority: int("priority").default(0),
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  priorityIdx: index("idx_priority").on(table.priority),
  isActiveIdx: index("idx_is_active").on(table.isActive),
}));

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
  "SALE"
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
  "WRITTEN_OFF"
]);

/**
 * Base Transactions Table
 * Central table that all transaction types reference
 * Provides a unified view of all business transactions
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  transactionNumber: varchar("transactionNumber", { length: 50 }).notNull().unique(),
  transactionType: transactionTypeEnum.notNull(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  transactionDate: timestamp("transactionDate").notNull(),
  amount: varchar("amount", { length: 20 }).notNull(),
  status: transactionStatusEnum.notNull(),
  notes: text("notes"),
  metadata: text("metadata"), // JSON string for type-specific data
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_transactions_client_id").on(table.clientId),
  transactionTypeIdx: index("idx_transactions_type").on(table.transactionType),
  transactionDateIdx: index("idx_transactions_date").on(table.transactionDate),
  statusIdx: index("idx_transactions_status").on(table.status),
}));

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Transaction Link Type Enum
 * Defines the type of relationship between transactions
 */
export const transactionLinkTypeEnum = mysqlEnum("transactionLinkType", [
  "REFUND_OF",          // Child is a refund of parent
  "PAYMENT_FOR",        // Child is a payment for parent
  "CREDIT_APPLIED_TO",  // Child credit is applied to parent invoice
  "CONVERTED_FROM",     // Child is converted from parent (e.g., quote to order)
  "PARTIAL_OF",         // Child is a partial payment/refund of parent
  "RELATED_TO"          // General relationship
]);

/**
 * Transaction Links Table
 * Establishes parent-child relationships between transactions
 * Enables tracking of refunds to original sales, payments to invoices, etc.
 */
export const transactionLinks = mysqlTable("transactionLinks", {
  id: int("id").autoincrement().primaryKey(),
  parentTransactionId: int("parentTransactionId").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  childTransactionId: int("childTransactionId").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  linkType: transactionLinkTypeEnum.notNull(),
  linkAmount: varchar("linkAmount", { length: 20 }), // Amount of the link (for partial payments/refunds)
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  parentIdIdx: index("idx_transaction_links_parent").on(table.parentTransactionId),
  childIdIdx: index("idx_transaction_links_child").on(table.childTransactionId),
  linkTypeIdx: index("idx_transaction_links_type").on(table.linkType),
}));

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
  "VOID"
]);

/**
 * Credits Table
 * Manages customer credits (store credit, promotional credits, goodwill gestures)
 */
export const credits = mysqlTable("credits", {
  id: int("id").autoincrement().primaryKey(),
  creditNumber: varchar("creditNumber", { length: 50 }).notNull().unique(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  transactionId: int("transactionId").references(() => transactions.id), // Link to base transaction
  creditAmount: varchar("creditAmount", { length: 20 }).notNull(),
  amountUsed: varchar("amountUsed", { length: 20 }).notNull().default("0"),
  amountRemaining: varchar("amountRemaining", { length: 20 }).notNull(),
  creditReason: varchar("creditReason", { length: 100 }),
  expirationDate: timestamp("expirationDate"),
  status: creditStatusEnum.notNull().default("ACTIVE"),
  notes: text("notes"),
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_credits_client_id").on(table.clientId),
  statusIdx: index("idx_credits_status").on(table.status),
  expirationDateIdx: index("idx_credits_expiration").on(table.expirationDate),
}));

export type Credit = typeof credits.$inferSelect;
export type InsertCredit = typeof credits.$inferInsert;

/**
 * Credit Applications Table
 * Tracks when credits are applied to invoices
 */
export const creditApplications = mysqlTable("creditApplications", {
  id: int("id").autoincrement().primaryKey(),
  creditId: int("creditId").notNull().references(() => credits.id, { onDelete: "cascade" }),
  invoiceId: int("invoiceId").notNull().references(() => transactions.id, { onDelete: "cascade" }),
  amountApplied: varchar("amountApplied", { length: 20 }).notNull(),
  appliedDate: timestamp("appliedDate").notNull(),
  notes: text("notes"),
  appliedBy: int("appliedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  creditIdIdx: index("idx_credit_applications_credit").on(table.creditId),
  invoiceIdIdx: index("idx_credit_applications_invoice").on(table.invoiceId),
}));

export type CreditApplication = typeof creditApplications.$inferSelect;
export type InsertCreditApplication = typeof creditApplications.$inferInsert;

// ============================================================================
// CUSTOMIZABLE PAYMENT METHODS
// ============================================================================

/**
 * Payment Methods Table
 * Allows customizable payment methods instead of hardcoded enum
 */
export const paymentMethods = mysqlTable("paymentMethods", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isActive: int("isActive").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  isActiveIdx: index("idx_payment_methods_active").on(table.isActive),
  sortOrderIdx: index("idx_payment_methods_sort").on(table.sortOrder),
}));

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
  "SAMPLE"
]);

/**
 * Inventory Movements Table
 * Comprehensive audit trail of all inventory quantity changes
 * Links inventory changes to business transactions
 */
export const inventoryMovements = mysqlTable("inventoryMovements", {
  id: int("id").autoincrement().primaryKey(),
  batchId: int("batchId").notNull().references(() => batches.id, { onDelete: "cascade" }),
  movementType: inventoryMovementTypeEnum.notNull(),
  quantityChange: varchar("quantityChange", { length: 20 }).notNull(), // Can be negative
  quantityBefore: varchar("quantityBefore", { length: 20 }).notNull(),
  quantityAfter: varchar("quantityAfter", { length: 20 }).notNull(),
  referenceType: varchar("referenceType", { length: 50 }), // "ORDER", "REFUND", "ADJUSTMENT", etc.
  referenceId: int("referenceId"),
  reason: text("reason"),
  performedBy: int("performedBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  batchIdIdx: index("idx_inventory_movements_batch").on(table.batchId),
  movementTypeIdx: index("idx_inventory_movements_type").on(table.movementType),
  referenceIdx: index("idx_inventory_movements_reference").on(table.referenceType, table.referenceId),
  createdAtIdx: index("idx_inventory_movements_created").on(table.createdAt),
}));

export type InventoryMovement = typeof inventoryMovements.$inferSelect;
export type InsertInventoryMovement = typeof inventoryMovements.$inferInsert;


// ============================================================================
// SAMPLE MANAGEMENT MODULE (Phase 6)
// ============================================================================

/**
 * Sample Request Status Enum
 * Tracks the lifecycle of a sample request
 */
export const sampleRequestStatusEnum = mysqlEnum("sampleRequestStatus", [
  "PENDING",
  "FULFILLED",
  "CANCELLED"
]);

/**
 * Sample Requests Table
 * Tracks all sample requests from clients
 * Includes monthly allocation tracking and conversion metrics
 */
export const sampleRequests = mysqlTable("sampleRequests", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  requestedBy: int("requestedBy").notNull().references(() => users.id),
  requestDate: timestamp("requestDate").defaultNow().notNull(),
  products: json("products").$type<Array<{productId: number, quantity: string}>>().notNull(), // Array of {productId, quantity}
  status: sampleRequestStatusEnum.notNull().default("PENDING"),
  fulfilledDate: timestamp("fulfilledDate"),
  fulfilledBy: int("fulfilledBy").references(() => users.id),
  cancelledDate: timestamp("cancelledDate"),
  cancelledBy: int("cancelledBy").references(() => users.id),
  cancellationReason: text("cancellationReason"),
  notes: text("notes"),
  totalCost: decimal("totalCost", { precision: 10, scale: 2 }), // COGS of samples
  relatedOrderId: int("relatedOrderId").references(() => orders.id), // If sample led to order
  conversionDate: timestamp("conversionDate"), // When sample converted to sale
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_sample_requests_client").on(table.clientId),
  statusIdx: index("idx_sample_requests_status").on(table.status),
  requestDateIdx: index("idx_sample_requests_date").on(table.requestDate),
  relatedOrderIdx: index("idx_sample_requests_order").on(table.relatedOrderId),
}));

export type SampleRequest = typeof sampleRequests.$inferSelect;
export type InsertSampleRequest = typeof sampleRequests.$inferInsert;

/**
 * Sample Allocations Table
 * Tracks monthly sample allocation limits per client
 */
export const sampleAllocations = mysqlTable("sampleAllocations", {
  id: int("id").autoincrement().primaryKey(),
  clientId: int("clientId").notNull().references(() => clients.id, { onDelete: "cascade" }),
  monthYear: varchar("monthYear", { length: 7 }).notNull(), // Format: "2025-10"
  allocatedQuantity: varchar("allocatedQuantity", { length: 20 }).notNull(), // e.g., "7.0" grams
  usedQuantity: varchar("usedQuantity", { length: 20 }).notNull().default("0"),
  remainingQuantity: varchar("remainingQuantity", { length: 20 }).notNull(), // computed
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientMonthIdx: index("idx_sample_allocations_client_month").on(table.clientId, table.monthYear),
  uniqueClientMonth: index("idx_sample_allocations_unique").on(table.clientId, table.monthYear),
}));

export type SampleAllocation = typeof sampleAllocations.$inferSelect;
export type InsertSampleAllocation = typeof sampleAllocations.$inferInsert;



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
  "SLOW_MOVING"
]);

/**
 * Alert Severity Enum
 */
export const alertSeverityEnum = mysqlEnum("alertSeverity", [
  "LOW",
  "MEDIUM",
  "HIGH"
]);

/**
 * Alert Status Enum
 */
export const alertStatusEnum = mysqlEnum("alertStatus", [
  "ACTIVE",
  "ACKNOWLEDGED",
  "RESOLVED"
]);

/**
 * Inventory Alerts Table
 * Tracks inventory-related alerts for dashboard
 */
export const inventoryAlerts = mysqlTable("inventoryAlerts", {
  id: int("id").autoincrement().primaryKey(),
  alertType: inventoryAlertTypeEnum.notNull(),
  batchId: int("batchId").notNull().references(() => batches.id, { onDelete: "cascade" }),
  threshold: decimal("threshold", { precision: 10, scale: 2 }),
  currentValue: decimal("currentValue", { precision: 10, scale: 2 }),
  severity: alertSeverityEnum.notNull(),
  status: alertStatusEnum.notNull().default("ACTIVE"),
  message: text("message"),
  acknowledgedBy: int("acknowledgedBy").references(() => users.id),
  acknowledgedAt: timestamp("acknowledgedAt"),
  resolvedAt: timestamp("resolvedAt"),
  resolution: text("resolution"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  batchIdIdx: index("idx_inventory_alerts_batch").on(table.batchId),
  statusIdx: index("idx_inventory_alerts_status").on(table.status),
  alertTypeIdx: index("idx_inventory_alerts_type").on(table.alertType),
  severityIdx: index("idx_inventory_alerts_severity").on(table.severity),
}));

export type InventoryAlert = typeof inventoryAlerts.$inferSelect;
export type InsertInventoryAlert = typeof inventoryAlerts.$inferInsert;

/**
 * Inventory Saved Views Table
 * Stores user-defined filter combinations for quick access
 */
export const inventoryViews = mysqlTable("inventoryViews", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  filters: json("filters").notNull(), // Stores filter state as JSON
  createdBy: int("createdBy").references(() => users.id, { onDelete: "cascade" }),
  isShared: int("isShared").notNull().default(0), // 0 = private, 1 = shared
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByIdx: index("idx_inventory_views_created_by").on(table.createdBy),
}));

export type InventoryView = typeof inventoryViews.$inferSelect;
export type InsertInventoryView = typeof inventoryViews.$inferInsert;

/**
 * User Dashboard Preferences Table
 * Stores per-user dashboard widget visibility and configuration
 */
export const userDashboardPreferences = mysqlTable("userDashboardPreferences", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().references(() => users.id, { onDelete: "cascade" }),
  widgetId: varchar("widgetId", { length: 100 }).notNull(), // e.g., "sales_performance", "ar_aging"
  isVisible: int("isVisible").notNull().default(1), // 0 = hidden, 1 = visible
  sortOrder: int("sortOrder").notNull().default(0),
  config: json("config"), // Widget-specific configuration
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userWidgetIdx: index("idx_user_dashboard_prefs_user_widget").on(table.userId, table.widgetId),
}));

export type UserDashboardPreference = typeof userDashboardPreferences.$inferSelect;
export type InsertUserDashboardPreference = typeof userDashboardPreferences.$inferInsert;



// ============================================================================
// SALES SHEET ENHANCEMENTS (Phase 8)
// ============================================================================

/**
 * Sales Sheet Versions Table
 * Tracks version history of sales sheet templates
 */
export const salesSheetVersions = mysqlTable("salesSheetVersions", {
  id: int("id").autoincrement().primaryKey(),
  templateId: int("templateId").notNull().references(() => salesSheetTemplates.id, { onDelete: "cascade" }),
  versionNumber: int("versionNumber").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  filters: json("filters").notNull(),
  selectedItems: json("selected_items").notNull(),
  columnVisibility: json("column_visibility").notNull(),
  changes: text("changes"), // Description of what changed
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  templateVersionIdx: index("idx_sales_sheet_versions_template").on(table.templateId, table.versionNumber),
}));

export type SalesSheetVersion = typeof salesSheetVersions.$inferSelect;
export type InsertSalesSheetVersion = typeof salesSheetVersions.$inferInsert;



// ============================================================================
// ADVANCED TAG FEATURES (Phase 9)
// ============================================================================

/**
 * Tag Hierarchy Table
 * Supports parent-child relationships for tags
 */
export const tagHierarchy = mysqlTable("tagHierarchy", {
  id: int("id").autoincrement().primaryKey(),
  parentTagId: int("parentTagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
  childTagId: int("childTagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  parentChildIdx: index("idx_tag_hierarchy_parent_child").on(table.parentTagId, table.childTagId),
  uniqueRelation: index("idx_tag_hierarchy_unique").on(table.parentTagId, table.childTagId),
}));

export type TagHierarchy = typeof tagHierarchy.$inferSelect;
export type InsertTagHierarchy = typeof tagHierarchy.$inferInsert;

/**
 * Tag Groups Table
 * Logical groupings of tags for easier management
 */
export const tagGroups = mysqlTable("tagGroups", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }), // Hex color code
  createdBy: int("createdBy").notNull().references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TagGroup = typeof tagGroups.$inferSelect;
export type InsertTagGroup = typeof tagGroups.$inferInsert;

/**
 * Tag Group Members Table
 * Many-to-many relationship between tags and tag groups
 */
export const tagGroupMembers = mysqlTable("tagGroupMembers", {
  id: int("id").autoincrement().primaryKey(),
  groupId: int("groupId").notNull().references(() => tagGroups.id, { onDelete: "cascade" }),
  tagId: int("tagId").notNull().references(() => tags.id, { onDelete: "cascade" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  groupTagIdx: index("idx_tag_group_members_group_tag").on(table.groupId, table.tagId),
}));

export type TagGroupMember = typeof tagGroupMembers.$inferSelect;
export type InsertTagGroupMember = typeof tagGroupMembers.$inferInsert;





/**
 * Product Intake Sessions
 * Tracks intake sessions where multiple batches are received from a vendor
 */
export const intakeSessions = mysqlTable("intake_sessions", {
  id: int("id").primaryKey().autoincrement(),
  sessionNumber: varchar("session_number", { length: 50 }).notNull().unique(),
  vendorId: int("vendor_id").notNull().references(() => clients.id, { onDelete: "restrict" }),
  status: mysqlEnum("status", ["IN_PROGRESS", "COMPLETED", "CANCELLED"]).notNull().default("IN_PROGRESS"),
  
  // Session-level details
  receiveDate: date("receive_date").notNull(),
  receivedBy: int("received_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  
  // Payment terms for entire session
  paymentTerms: paymentTermsEnum.notNull(),
  paymentDueDate: date("payment_due_date"),
  totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).default("0"),
  amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default("0"),
  
  // Notes
  internalNotes: text("internal_notes"),
  vendorNotes: text("vendor_notes"), // Shared with vendor on receipt
  
  // Receipt generation
  receiptGenerated: boolean("receipt_generated").default(false),
  receiptGeneratedAt: timestamp("receipt_generated_at"),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  completedAt: timestamp("completed_at"),
}, (table) => ({
  vendorIdIdx: index("idx_vendor_id").on(table.vendorId),
  statusIdx: index("idx_status").on(table.status),
  receiveDateIdx: index("idx_receive_date").on(table.receiveDate),
}));

export type IntakeSession = typeof intakeSessions.$inferSelect;
export type InsertIntakeSession = typeof intakeSessions.$inferInsert;

/**
 * Intake Session Batches
 * Links batches to intake sessions with batch-specific details
 */
export const intakeSessionBatches = mysqlTable("intake_session_batches", {
  id: int("id").primaryKey().autoincrement(),
  intakeSessionId: int("intake_session_id").notNull().references(() => intakeSessions.id, { onDelete: "cascade" }),
  batchId: int("batch_id").notNull().references(() => batches.id, { onDelete: "cascade" }),
  
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
}, (table) => ({
  intakeSessionIdIdx: index("idx_intake_session_id").on(table.intakeSessionId),
  batchIdIdx: index("idx_batch_id").on(table.batchId),
}));

export type IntakeSessionBatch = typeof intakeSessionBatches.$inferSelect;
export type InsertIntakeSessionBatch = typeof intakeSessionBatches.$inferInsert;

/**
 * Recurring Orders
 * Defines automatic recurring orders for clients
 */
export const recurringOrders = mysqlTable("recurring_orders", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  // Schedule configuration
  frequency: mysqlEnum("frequency", ["DAILY", "WEEKLY", "BIWEEKLY", "MONTHLY", "QUARTERLY"]).notNull(),
  dayOfWeek: int("day_of_week"), // 0-6 for weekly
  dayOfMonth: int("day_of_month"), // 1-31 for monthly
  
  // Order template
  orderTemplate: json("order_template").$type<{
    items: Array<{
      productId: number;
      quantity: number;
      notes?: string;
    }>;
  }>().notNull(),
  
  // Status and dates
  status: mysqlEnum("status", ["ACTIVE", "PAUSED", "CANCELLED"]).notNull().default("ACTIVE"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  lastGeneratedDate: date("last_generated_date"),
  nextGenerationDate: date("next_generation_date").notNull(),
  
  // Notifications
  notifyClient: boolean("notify_client").default(true),
  notifyEmail: varchar("notify_email", { length: 255 }),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  statusIdx: index("idx_status").on(table.status),
  nextGenerationDateIdx: index("idx_next_generation_date").on(table.nextGenerationDate),
}));

export type RecurringOrder = typeof recurringOrders.$inferSelect;
export type InsertRecurringOrder = typeof recurringOrders.$inferInsert;

/**
 * Alert Configurations
 * User-defined alert rules and thresholds
 */
export const alertConfigurations = mysqlTable("alert_configurations", {
  id: int("id").primaryKey().autoincrement(),
  userId: int("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  // Alert type and target
  alertType: mysqlEnum("alert_type", [
    "LOW_STOCK",
    "EXPIRING_BATCH",
    "OVERDUE_PAYMENT",
    "HIGH_VALUE_ORDER",
    "SAMPLE_CONVERSION",
    "CUSTOM"
  ]).notNull(),
  
  // Target specification
  targetType: mysqlEnum("target_type", ["GLOBAL", "PRODUCT", "BATCH", "CLIENT", "CATEGORY"]).notNull(),
  targetId: int("target_id"), // NULL for GLOBAL, specific ID for others
  
  // Threshold configuration
  thresholdValue: decimal("threshold_value", { precision: 15, scale: 4 }).notNull(),
  thresholdOperator: mysqlEnum("threshold_operator", ["LESS_THAN", "GREATER_THAN", "EQUALS"]).notNull(),
  
  // Alert delivery
  deliveryMethod: mysqlEnum("delivery_method", ["DASHBOARD", "EMAIL", "BOTH"]).notNull().default("DASHBOARD"),
  emailAddress: varchar("email_address", { length: 255 }),
  
  // Status
  isActive: boolean("is_active").default(true),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  userIdIdx: index("idx_user_id").on(table.userId),
  alertTypeIdx: index("idx_alert_type").on(table.alertType),
  isActiveIdx: index("idx_is_active").on(table.isActive),
}));

export type AlertConfiguration = typeof alertConfigurations.$inferSelect;
export type InsertAlertConfiguration = typeof alertConfigurations.$inferInsert;


// ============================================================================
// NEEDS & MATCHING MODULE SCHEMA
// ============================================================================

/**
 * Client Needs
 * Tracks what clients are looking for (explicit needs)
 */
export const clientNeeds = mysqlTable("client_needs", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  // Need specification
  strain: varchar("strain", { length: 255 }),
  strainId: int("strainId").references(() => strains.id, { onDelete: "set null" }),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  grade: varchar("grade", { length: 50 }),
  
  // Quantity and pricing
  quantityMin: decimal("quantity_min", { precision: 15, scale: 4 }),
  quantityMax: decimal("quantity_max", { precision: 15, scale: 4 }),
  priceMax: decimal("price_max", { precision: 15, scale: 2 }),
  
  // Status and priority
  status: mysqlEnum("status", ["ACTIVE", "FULFILLED", "EXPIRED", "CANCELLED"]).notNull().default("ACTIVE"),
  priority: mysqlEnum("priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]).notNull().default("MEDIUM"),
  
  // Dates
  neededBy: date("needed_by"),
  expiresAt: timestamp("expires_at"),
  fulfilledAt: timestamp("fulfilled_at"),
  
  // Notes
  notes: text("notes"),
  internalNotes: text("internal_notes"), // Staff only
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  statusIdx: index("idx_status").on(table.status),
  strainIdx: index("idx_strain").on(table.strain),
  categoryIdx: index("idx_category").on(table.category),
  priorityIdx: index("idx_priority").on(table.priority),
}));

export type ClientNeed = typeof clientNeeds.$inferSelect;
export type InsertClientNeed = typeof clientNeeds.$inferInsert;

/**
 * Vendor Supply
 * Tracks what vendors have available (not yet in inventory)
 */
export const vendorSupply = mysqlTable("vendor_supply", {
  id: int("id").primaryKey().autoincrement(),
  vendorId: int("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
  
  // Product specification
  strain: varchar("strain", { length: 255 }),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  grade: varchar("grade", { length: 50 }),
  
  // Quantity and pricing
  quantityAvailable: decimal("quantity_available", { precision: 15, scale: 4 }).notNull(),
  unitPrice: decimal("unit_price", { precision: 15, scale: 2 }),
  
  // Status and dates
  status: mysqlEnum("status", ["AVAILABLE", "RESERVED", "PURCHASED", "EXPIRED"]).notNull().default("AVAILABLE"),
  availableUntil: timestamp("available_until"),
  reservedAt: timestamp("reserved_at"),
  purchasedAt: timestamp("purchased_at"),
  
  // Notes
  notes: text("notes"),
  internalNotes: text("internal_notes"), // Staff only
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
  createdBy: int("created_by").notNull().references(() => users.id, { onDelete: "restrict" }),
}, (table) => ({
  vendorIdIdx: index("idx_vendor_id").on(table.vendorId),
  statusIdx: index("idx_status").on(table.status),
  strainIdx: index("idx_strain").on(table.strain),
  categoryIdx: index("idx_category").on(table.category),
}));

export type VendorSupply = typeof vendorSupply.$inferSelect;
export type InsertVendorSupply = typeof vendorSupply.$inferInsert;

/**
 * Match Records
 * Tracks matches for learning and analytics
 */
export const matchRecords = mysqlTable("match_records", {
  id: int("id").primaryKey().autoincrement(),
  
  // Match participants
  clientNeedId: int("client_need_id").references(() => clientNeeds.id, { onDelete: "set null" }),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
  // Match source (one of these will be set)
  inventoryBatchId: int("inventory_batch_id").references(() => batches.id, { onDelete: "set null" }),
  vendorSupplyId: int("vendor_supply_id").references(() => vendorSupply.id, { onDelete: "set null" }),
  historicalOrderId: int("historical_order_id").references(() => orders.id, { onDelete: "set null" }),
  
  // Match details
  matchType: mysqlEnum("match_type", ["EXACT", "CLOSE", "HISTORICAL"]).notNull(),
  confidenceScore: decimal("confidence_score", { precision: 5, scale: 2 }).notNull(), // 0-100
  matchReasons: json("match_reasons").$type<string[]>().notNull(),
  
  // User actions
  userAction: mysqlEnum("user_action", ["CREATED_QUOTE", "CONTACTED_VENDOR", "DISMISSED", "NONE"]),
  actionedAt: timestamp("actioned_at"),
  actionedBy: int("actioned_by").references(() => users.id, { onDelete: "set null" }),
  
  // Result tracking
  resultedInSale: boolean("resulted_in_sale").default(false),
  saleOrderId: int("sale_order_id").references(() => orders.id, { onDelete: "set null" }),
  
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => ({
  clientNeedIdIdx: index("idx_client_need_id").on(table.clientNeedId),
  clientIdIdx: index("idx_client_id").on(table.clientId),
  matchTypeIdx: index("idx_match_type").on(table.matchType),
  userActionIdx: index("idx_user_action").on(table.userAction),
}));

export type MatchRecord = typeof matchRecords.$inferSelect;
export type InsertMatchRecord = typeof matchRecords.$inferInsert;

// ============================================================================
// VIP CLIENT PORTAL MODULE SCHEMA
// ============================================================================

/**
 * VIP Portal Configurations
 * Stores per-client portal customization settings
 */
export const vipPortalConfigurations = mysqlTable("vip_portal_configurations", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().unique().references(() => clients.id, { onDelete: "cascade" }),
  
  // Module-level toggles
  moduleDashboardEnabled: boolean("module_dashboard_enabled").default(true).notNull(),
  moduleArEnabled: boolean("module_ar_enabled").default(true).notNull(),
  moduleApEnabled: boolean("module_ap_enabled").default(true).notNull(),
  moduleTransactionHistoryEnabled: boolean("module_transaction_history_enabled").default(true).notNull(),
  moduleVipTierEnabled: boolean("module_vip_tier_enabled").default(true).notNull(),
  moduleCreditCenterEnabled: boolean("module_credit_center_enabled").default(true).notNull(),
  moduleMarketplaceNeedsEnabled: boolean("module_marketplace_needs_enabled").default(true).notNull(),
  moduleMarketplaceSupplyEnabled: boolean("module_marketplace_supply_enabled").default(true).notNull(),
  
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
  }>(),
  
  // Advanced options
  advancedOptions: json("advanced_options").$type<{
    transactionHistoryLimit?: "ALL" | "12_MONTHS" | "6_MONTHS" | "3_MONTHS";
    defaultNeedsExpiration?: "1_DAY" | "5_DAYS" | "1_WEEK" | "1_MONTH";
    defaultSupplyExpiration?: "1_DAY" | "5_DAYS" | "1_WEEK" | "1_MONTH";
    priceInputType?: "SINGLE" | "RANGE" | "BOTH";
  }>(),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_vip_portal_client_id").on(table.clientId),
}));

export type VipPortalConfiguration = typeof vipPortalConfigurations.$inferSelect;
export type InsertVipPortalConfiguration = typeof vipPortalConfigurations.$inferInsert;

/**
 * VIP Portal Authentication
 * Stores portal-specific authentication credentials
 */
export const vipPortalAuth = mysqlTable("vip_portal_auth", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().unique().references(() => clients.id, { onDelete: "cascade" }),
  
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
}, (table) => ({
  emailIdx: index("idx_vip_portal_email").on(table.email),
  sessionTokenIdx: index("idx_vip_portal_session_token").on(table.sessionToken),
}));

export type VipPortalAuth = typeof vipPortalAuth.$inferSelect;
export type InsertVipPortalAuth = typeof vipPortalAuth.$inferInsert;
