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
 */
export const strains = mysqlTable("strains", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  standardizedName: varchar("standardizedName", { length: 255 }).notNull(),
  aliases: text("aliases"), // JSON array of alternative names
  category: varchar("category", { length: 50 }), // Indica, Sativa, Hybrid
  description: text("description"),
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
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  teriCodeIdx: index("idx_teri_code").on(table.teriCode),
  totalOwedIdx: index("idx_total_owed").on(table.totalOwed),
}));

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

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
 * Lifecycle states for sales
 */
export const saleStatusEnum = mysqlEnum("saleStatus", [
  "PENDING",
  "PARTIAL",
  "PAID",
  "OVERDUE",
  "CANCELLED"
]);

/**
 * Orders Table (Unified Quotes + Sales)
 * Combines quotes and sales into a single table for simplicity
 */
export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  orderNumber: varchar("order_number", { length: 50 }).notNull().unique(),
  orderType: orderTypeEnum.notNull(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  
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
  
  // Conversion tracking
  convertedFromOrderId: int("converted_from_order_id").references((): any => orders.id),
  convertedAt: timestamp("converted_at"),
  
  // Metadata
  notes: text("notes"),
  createdBy: int("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
}, (table) => ({
  clientIdIdx: index("idx_client_id").on(table.clientId),
  orderTypeIdx: index("idx_order_type").on(table.orderType),
  quoteStatusIdx: index("idx_quote_status").on(table.quoteStatus),
  saleStatusIdx: index("idx_sale_status").on(table.saleStatus),
  createdAtIdx: index("idx_created_at").on(table.createdAt),
}));

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

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

