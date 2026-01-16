/**
 * Sprint 5 Track D Schema Extensions
 * Transaction & Product Features
 *
 * Includes:
 * - 5.D.1: MEET-017 - Invoice Disputes
 * - 5.D.2: MEET-018 - Transaction Fees Per Client
 * - 5.D.3: MEET-035 - Payment Terms
 * - 5.D.4: MEET-032 - Customizable Categories (hierarchy)
 * - 5.D.5: MEET-070 - Product Grades
 * - 5.D.6: MEET-009 - Service Billing
 * - 5.D.7: MEET-019 - Crypto Payment Tracking
 * - 5.D.8: MEET-036 - Installment Payments
 */

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
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { users, clients, invoices, products, orders } from "./schema";

// ============================================================================
// 5.D.1: MEET-017 - Invoice Disputes
// ============================================================================

/**
 * Dispute Status Enum
 * Tracks lifecycle of an invoice dispute
 */
export const disputeStatusEnum = mysqlEnum("dispute_status", [
  "OPEN",
  "UNDER_REVIEW",
  "RESOLVED",
  "REJECTED",
  "ESCALATED",
]);

/**
 * Invoice Disputes Table
 * Tracks disputes raised against invoices for debt reconciliation
 */
export const invoiceDisputes = mysqlTable(
  "invoice_disputes",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceId: int("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Dispute details
    disputeNumber: varchar("dispute_number", { length: 50 }).notNull().unique(),
    disputeStatus: disputeStatusEnum.notNull().default("OPEN"),
    disputeReason: text("dispute_reason").notNull(),
    disputedAmount: decimal("disputed_amount", { precision: 15, scale: 2 }).notNull(),

    // Resolution tracking
    resolutionNotes: text("resolution_notes"),
    adjustmentAmount: decimal("adjustment_amount", { precision: 15, scale: 2 }),
    resolvedAt: timestamp("resolved_at"),
    resolvedBy: int("resolved_by").references(() => users.id),

    // Tracking
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    assignedTo: int("assigned_to").references(() => users.id),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    invoiceIdIdx: index("idx_invoice_disputes_invoice").on(table.invoiceId),
    clientIdIdx: index("idx_invoice_disputes_client").on(table.clientId),
    statusIdx: index("idx_invoice_disputes_status").on(table.disputeStatus),
    createdAtIdx: index("idx_invoice_disputes_created").on(table.createdAt),
  })
);

export type InvoiceDispute = typeof invoiceDisputes.$inferSelect;
export type InsertInvoiceDispute = typeof invoiceDisputes.$inferInsert;

/**
 * Dispute Attachments Table
 * Stores file attachments for dispute evidence
 */
export const disputeAttachments = mysqlTable(
  "dispute_attachments",
  {
    id: int("id").autoincrement().primaryKey(),
    disputeId: int("dispute_id")
      .notNull()
      .references(() => invoiceDisputes.id, { onDelete: "cascade" }),
    filename: varchar("filename", { length: 255 }).notNull(),
    fileUrl: varchar("file_url", { length: 1000 }).notNull(),
    fileType: varchar("file_type", { length: 100 }),
    fileSize: int("file_size"),
    uploadedBy: int("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    disputeIdIdx: index("idx_dispute_attachments_dispute").on(table.disputeId),
  })
);

export type DisputeAttachment = typeof disputeAttachments.$inferSelect;
export type InsertDisputeAttachment = typeof disputeAttachments.$inferInsert;

/**
 * Dispute Notes Table
 * Timeline of notes and updates on a dispute
 */
export const disputeNotes = mysqlTable(
  "dispute_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    disputeId: int("dispute_id")
      .notNull()
      .references(() => invoiceDisputes.id, { onDelete: "cascade" }),
    note: text("note").notNull(),
    isInternal: boolean("is_internal").default(true).notNull(),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    disputeIdIdx: index("idx_dispute_notes_dispute").on(table.disputeId),
    createdAtIdx: index("idx_dispute_notes_created").on(table.createdAt),
  })
);

export type DisputeNote = typeof disputeNotes.$inferSelect;
export type InsertDisputeNote = typeof disputeNotes.$inferInsert;

// ============================================================================
// 5.D.2: MEET-018 - Transaction Fees Per Client
// ============================================================================

/**
 * Fee Type Enum
 * Defines how transaction fees are calculated
 */
export const feeTypeEnum = mysqlEnum("fee_type", [
  "PERCENTAGE",
  "FLAT",
]);

/**
 * Client Transaction Fees Table
 * Configurable transaction fees per client
 */
export const clientTransactionFees = mysqlTable(
  "client_transaction_fees",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" })
      .unique(),

    // Fee configuration
    feeType: feeTypeEnum.notNull().default("PERCENTAGE"),
    feeValue: decimal("fee_value", { precision: 10, scale: 4 }).notNull().default("0"),
    minFee: decimal("min_fee", { precision: 10, scale: 2 }),
    maxFee: decimal("max_fee", { precision: 10, scale: 2 }),

    // Application rules
    applyToAllOrders: boolean("apply_to_all_orders").default(true).notNull(),
    isActive: boolean("is_active").default(true).notNull(),

    // Notes
    notes: text("notes"),

    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    createdBy: int("created_by").references(() => users.id),
  },
  (table) => ({
    clientIdIdx: index("idx_client_fees_client").on(table.clientId),
    isActiveIdx: index("idx_client_fees_active").on(table.isActive),
  })
);

export type ClientTransactionFee = typeof clientTransactionFees.$inferSelect;
export type InsertClientTransactionFee = typeof clientTransactionFees.$inferInsert;

/**
 * Order Transaction Fees Table
 * Tracks fees applied to individual orders
 */
export const orderTransactionFees = mysqlTable(
  "order_transaction_fees",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    clientFeeConfigId: int("client_fee_config_id")
      .references(() => clientTransactionFees.id, { onDelete: "set null" }),

    // Fee details at time of order
    feeType: feeTypeEnum.notNull(),
    feeRate: decimal("fee_rate", { precision: 10, scale: 4 }).notNull(),
    orderSubtotal: decimal("order_subtotal", { precision: 15, scale: 2 }).notNull(),
    feeAmount: decimal("fee_amount", { precision: 15, scale: 2 }).notNull(),

    // Override tracking
    isOverridden: boolean("is_overridden").default(false).notNull(),
    overrideReason: text("override_reason"),
    overriddenBy: int("overridden_by").references(() => users.id),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    orderIdIdx: index("idx_order_fees_order").on(table.orderId),
    clientFeeIdx: index("idx_order_fees_client_config").on(table.clientFeeConfigId),
  })
);

export type OrderTransactionFee = typeof orderTransactionFees.$inferSelect;
export type InsertOrderTransactionFee = typeof orderTransactionFees.$inferInsert;

// ============================================================================
// 5.D.3: MEET-035 - Payment Terms
// ============================================================================

/**
 * Payment Terms Enum (Extended)
 * Comprehensive payment term options
 */
export const clientPaymentTermsEnum = mysqlEnum("client_payment_terms", [
  "CASH",
  "COD",
  "NET_7",
  "NET_15",
  "NET_30",
  "NET_45",
  "NET_60",
  "CONSIGNMENT",
  "INSTALLMENT",
  "PREPAID",
]);

/**
 * Client Payment Terms Table
 * Stores payment terms configuration per client
 */
export const clientPaymentTermsConfig = mysqlTable(
  "client_payment_terms_config",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" })
      .unique(),

    // Default payment terms
    defaultPaymentTerms: clientPaymentTermsEnum.notNull().default("NET_30"),

    // Consignment settings
    consignmentDueDays: int("consignment_due_days").default(60),
    consignmentLimit: decimal("consignment_limit", { precision: 15, scale: 2 }),

    // Cash discount
    earlyPaymentDiscount: decimal("early_payment_discount", { precision: 5, scale: 2 }),
    earlyPaymentDays: int("early_payment_days"),

    // Late fee
    lateFeePercent: decimal("late_fee_percent", { precision: 5, scale: 2 }),
    lateFeeGraceDays: int("late_fee_grace_days").default(0),

    // Display settings
    showTermsOnInvoice: boolean("show_terms_on_invoice").default(true).notNull(),
    customTermsText: text("custom_terms_text"),

    notes: text("notes"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    clientIdIdx: index("idx_payment_terms_client").on(table.clientId),
  })
);

export type ClientPaymentTermsConfig = typeof clientPaymentTermsConfig.$inferSelect;
export type InsertClientPaymentTermsConfig = typeof clientPaymentTermsConfig.$inferInsert;

// ============================================================================
// 5.D.4: MEET-032 - Customizable Categories (Hierarchy)
// ============================================================================

/**
 * Product Categories Table (Extended)
 * Hierarchical categories with parent-child relationships
 */
export const productCategories = mysqlTable(
  "product_categories",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull().unique(),
    description: text("description"),

    // Hierarchy
    parentId: int("parent_id"),
    level: int("level").notNull().default(0),
    path: varchar("path", { length: 500 }), // e.g., "1/5/12" for breadcrumb

    // Display
    sortOrder: int("sort_order").default(0).notNull(),
    iconName: varchar("icon_name", { length: 50 }),
    color: varchar("color", { length: 20 }),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    // Metadata
    metadata: json("metadata"),

    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    parentIdIdx: index("idx_product_categories_parent").on(table.parentId),
    levelIdx: index("idx_product_categories_level").on(table.level),
    slugIdx: index("idx_product_categories_slug").on(table.slug),
    sortOrderIdx: index("idx_product_categories_sort").on(table.sortOrder),
  })
);

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

/**
 * Product Category Assignments Table
 * Links products to categories (many-to-many)
 */
export const productCategoryAssignments = mysqlTable(
  "product_category_assignments",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    categoryId: int("category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
    isPrimary: boolean("is_primary").default(false).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    productIdIdx: index("idx_pca_product").on(table.productId),
    categoryIdIdx: index("idx_pca_category").on(table.categoryId),
    uniqueAssignment: unique("unique_product_category").on(
      table.productId,
      table.categoryId
    ),
  })
);

export type ProductCategoryAssignment = typeof productCategoryAssignments.$inferSelect;
export type InsertProductCategoryAssignment = typeof productCategoryAssignments.$inferInsert;

// ============================================================================
// 5.D.5: MEET-070 - Product Grades
// ============================================================================

/**
 * Product Grades Table (Extended)
 * Quality grading system for products/batches
 */
export const productGrades = mysqlTable(
  "product_grades",
  {
    id: int("id").autoincrement().primaryKey(),
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 100 }).notNull(),
    description: text("description"),

    // Ordering and display
    sortOrder: int("sort_order").notNull().default(0),
    color: varchar("color", { length: 20 }),

    // Pricing modifiers
    pricingMultiplier: decimal("pricing_multiplier", { precision: 5, scale: 4 }).default("1.0000"),
    suggestedMarkupPercent: decimal("suggested_markup_percent", { precision: 5, scale: 2 }),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    codeIdx: index("idx_product_grades_code").on(table.code),
    sortOrderIdx: index("idx_product_grades_sort").on(table.sortOrder),
  })
);

export type ProductGrade = typeof productGrades.$inferSelect;
export type InsertProductGrade = typeof productGrades.$inferInsert;

// ============================================================================
// 5.D.6: MEET-009 - Service Billing
// ============================================================================

/**
 * Service Type Enum
 * Types of non-product services that can be billed
 */
export const serviceTypeEnum = mysqlEnum("service_type", [
  "SHIPPING",
  "HANDLING",
  "CONSULTING",
  "PROCESSING",
  "STORAGE",
  "PACKAGING",
  "TESTING",
  "INSURANCE",
  "RUSH_FEE",
  "OTHER",
]);

/**
 * Service Definitions Table
 * Predefined services that can be added to orders
 */
export const serviceDefinitions = mysqlTable(
  "service_definitions",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 50 }).notNull().unique(),
    description: text("description"),

    serviceType: serviceTypeEnum.notNull(),

    // Default pricing
    defaultPrice: decimal("default_price", { precision: 15, scale: 2 }).notNull().default("0"),
    pricingUnit: varchar("pricing_unit", { length: 50 }).default("each"), // each, per lb, per hour, etc.

    // Tax settings
    isTaxable: boolean("is_taxable").default(true).notNull(),
    taxRate: decimal("tax_rate", { precision: 5, scale: 2 }),

    // Status
    isActive: boolean("is_active").default(true).notNull(),

    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    codeIdx: index("idx_service_definitions_code").on(table.code),
    typeIdx: index("idx_service_definitions_type").on(table.serviceType),
    isActiveIdx: index("idx_service_definitions_active").on(table.isActive),
  })
);

export type ServiceDefinition = typeof serviceDefinitions.$inferSelect;
export type InsertServiceDefinition = typeof serviceDefinitions.$inferInsert;

/**
 * Order Service Charges Table
 * Service charges applied to orders
 */
export const orderServiceCharges = mysqlTable(
  "order_service_charges",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    serviceDefinitionId: int("service_definition_id")
      .references(() => serviceDefinitions.id, { onDelete: "set null" }),

    // Service details
    serviceName: varchar("service_name", { length: 100 }).notNull(),
    serviceType: serviceTypeEnum.notNull(),
    description: text("description"),

    // Pricing
    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
    totalPrice: decimal("total_price", { precision: 15, scale: 2 }).notNull(),

    // Tax
    isTaxable: boolean("is_taxable").default(true).notNull(),
    taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    createdBy: int("created_by").references(() => users.id),
  },
  (table) => ({
    orderIdIdx: index("idx_order_services_order").on(table.orderId),
    serviceDefIdx: index("idx_order_services_definition").on(table.serviceDefinitionId),
    typeIdx: index("idx_order_services_type").on(table.serviceType),
  })
);

export type OrderServiceCharge = typeof orderServiceCharges.$inferSelect;
export type InsertOrderServiceCharge = typeof orderServiceCharges.$inferInsert;

/**
 * Standalone Service Invoices Table
 * For service-only invoices not tied to product orders
 */
export const serviceInvoices = mysqlTable(
  "service_invoices",
  {
    id: int("id").autoincrement().primaryKey(),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull().unique(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),

    // Dates
    invoiceDate: date("invoice_date").notNull(),
    dueDate: date("due_date").notNull(),

    // Amounts
    subtotal: decimal("subtotal", { precision: 15, scale: 2 }).notNull(),
    taxAmount: decimal("tax_amount", { precision: 15, scale: 2 }).default("0"),
    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
    amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default("0"),
    amountDue: decimal("amount_due", { precision: 15, scale: 2 }).notNull(),

    // Status
    status: mysqlEnum("service_invoice_status", [
      "DRAFT",
      "SENT",
      "PARTIAL",
      "PAID",
      "OVERDUE",
      "VOID",
    ])
      .notNull()
      .default("DRAFT"),

    notes: text("notes"),

    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => ({
    clientIdIdx: index("idx_service_invoices_client").on(table.clientId),
    statusIdx: index("idx_service_invoices_status").on(table.status),
    dateIdx: index("idx_service_invoices_date").on(table.invoiceDate),
  })
);

export type ServiceInvoice = typeof serviceInvoices.$inferSelect;
export type InsertServiceInvoice = typeof serviceInvoices.$inferInsert;

/**
 * Service Invoice Line Items Table
 */
export const serviceInvoiceLineItems = mysqlTable(
  "service_invoice_line_items",
  {
    id: int("id").autoincrement().primaryKey(),
    serviceInvoiceId: int("service_invoice_id")
      .notNull()
      .references(() => serviceInvoices.id, { onDelete: "cascade" }),
    serviceDefinitionId: int("service_definition_id")
      .references(() => serviceDefinitions.id, { onDelete: "set null" }),

    serviceName: varchar("service_name", { length: 100 }).notNull(),
    serviceType: serviceTypeEnum.notNull(),
    description: text("description"),

    quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1"),
    unitPrice: decimal("unit_price", { precision: 15, scale: 2 }).notNull(),
    lineTotal: decimal("line_total", { precision: 15, scale: 2 }).notNull(),

    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    invoiceIdIdx: index("idx_sili_invoice").on(table.serviceInvoiceId),
  })
);

export type ServiceInvoiceLineItem = typeof serviceInvoiceLineItems.$inferSelect;
export type InsertServiceInvoiceLineItem = typeof serviceInvoiceLineItems.$inferInsert;

// ============================================================================
// 5.D.7: MEET-019 - Crypto Payment Tracking
// ============================================================================

/**
 * Cryptocurrency Type Enum
 */
export const cryptoCurrencyEnum = mysqlEnum("crypto_currency", [
  "BTC",
  "ETH",
  "USDT",
  "USDC",
  "SOL",
  "XRP",
  "OTHER",
]);

/**
 * Crypto Payments Table
 * Tracks cryptocurrency payment details
 */
export const cryptoPayments = mysqlTable(
  "crypto_payments",
  {
    id: int("id").autoincrement().primaryKey(),

    // Link to standard payment record
    paymentId: int("payment_id")
      .references(() => invoices.id, { onDelete: "cascade" }), // Actually references payments table

    // Or standalone crypto record for non-invoice payments
    clientId: int("client_id")
      .references(() => clients.id, { onDelete: "cascade" }),

    // Crypto details
    cryptoCurrency: cryptoCurrencyEnum.notNull(),
    walletAddress: varchar("wallet_address", { length: 255 }),
    transactionHash: varchar("transaction_hash", { length: 255 }),

    // Amounts
    cryptoAmount: decimal("crypto_amount", { precision: 20, scale: 8 }).notNull(),
    usdAmount: decimal("usd_amount", { precision: 15, scale: 2 }).notNull(),
    exchangeRate: decimal("exchange_rate", { precision: 20, scale: 8 }).notNull(),

    // Tracking
    networkFee: decimal("network_fee", { precision: 20, scale: 8 }),
    confirmations: int("confirmations").default(0),
    isConfirmed: boolean("is_confirmed").default(false).notNull(),
    confirmedAt: timestamp("confirmed_at"),

    // Payment date
    paymentDate: timestamp("payment_date").notNull(),

    notes: text("notes"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    paymentIdIdx: index("idx_crypto_payments_payment").on(table.paymentId),
    clientIdIdx: index("idx_crypto_payments_client").on(table.clientId),
    currencyIdx: index("idx_crypto_payments_currency").on(table.cryptoCurrency),
    hashIdx: index("idx_crypto_payments_hash").on(table.transactionHash),
  })
);

export type CryptoPayment = typeof cryptoPayments.$inferSelect;
export type InsertCryptoPayment = typeof cryptoPayments.$inferInsert;

/**
 * Crypto Wallet Addresses Table
 * Stores client wallet addresses for repeat payments
 */
export const clientCryptoWallets = mysqlTable(
  "client_crypto_wallets",
  {
    id: int("id").autoincrement().primaryKey(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    cryptoCurrency: cryptoCurrencyEnum.notNull(),
    walletAddress: varchar("wallet_address", { length: 255 }).notNull(),
    walletLabel: varchar("wallet_label", { length: 100 }),
    isDefault: boolean("is_default").default(false).notNull(),
    isVerified: boolean("is_verified").default(false).notNull(),

    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    clientIdIdx: index("idx_client_wallets_client").on(table.clientId),
    currencyIdx: index("idx_client_wallets_currency").on(table.cryptoCurrency),
    uniqueWallet: unique("unique_client_wallet").on(
      table.clientId,
      table.cryptoCurrency,
      table.walletAddress
    ),
  })
);

export type ClientCryptoWallet = typeof clientCryptoWallets.$inferSelect;
export type InsertClientCryptoWallet = typeof clientCryptoWallets.$inferInsert;

// ============================================================================
// 5.D.8: MEET-036 - Installment Payments
// ============================================================================

/**
 * Installment Status Enum
 */
export const installmentStatusEnum = mysqlEnum("installment_status", [
  "SCHEDULED",
  "PENDING",
  "PAID",
  "PARTIAL",
  "OVERDUE",
  "CANCELLED",
]);

/**
 * Installment Plans Table
 * Defines payment installment plans for invoices/orders
 */
export const installmentPlans = mysqlTable(
  "installment_plans",
  {
    id: int("id").autoincrement().primaryKey(),

    // Link to invoice or order
    invoiceId: int("invoice_id")
      .references(() => invoices.id, { onDelete: "cascade" }),
    orderId: int("order_id")
      .references(() => orders.id, { onDelete: "cascade" }),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Plan details
    planName: varchar("plan_name", { length: 100 }),
    totalAmount: decimal("total_amount", { precision: 15, scale: 2 }).notNull(),
    numberOfInstallments: int("number_of_installments").notNull(),
    frequency: mysqlEnum("frequency", [
      "WEEKLY",
      "BIWEEKLY",
      "MONTHLY",
      "CUSTOM",
    ]).notNull().default("MONTHLY"),

    // First payment
    firstPaymentDate: date("first_payment_date").notNull(),
    downPaymentAmount: decimal("down_payment_amount", { precision: 15, scale: 2 }).default("0"),

    // Tracking
    totalPaid: decimal("total_paid", { precision: 15, scale: 2 }).default("0"),
    remainingBalance: decimal("remaining_balance", { precision: 15, scale: 2 }).notNull(),

    // Status
    status: mysqlEnum("plan_status", [
      "ACTIVE",
      "COMPLETED",
      "DEFAULTED",
      "CANCELLED",
    ]).notNull().default("ACTIVE"),

    // Interest/fees
    interestRate: decimal("interest_rate", { precision: 5, scale: 2 }).default("0"),
    lateFeeAmount: decimal("late_fee_amount", { precision: 10, scale: 2 }).default("0"),

    notes: text("notes"),
    deletedAt: timestamp("deleted_at"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    createdBy: int("created_by")
      .notNull()
      .references(() => users.id),
  },
  (table) => ({
    invoiceIdIdx: index("idx_installment_plans_invoice").on(table.invoiceId),
    orderIdIdx: index("idx_installment_plans_order").on(table.orderId),
    clientIdIdx: index("idx_installment_plans_client").on(table.clientId),
    statusIdx: index("idx_installment_plans_status").on(table.status),
  })
);

export type InstallmentPlan = typeof installmentPlans.$inferSelect;
export type InsertInstallmentPlan = typeof installmentPlans.$inferInsert;

/**
 * Installments Table
 * Individual installment payments within a plan
 */
export const installments = mysqlTable(
  "installments",
  {
    id: int("id").autoincrement().primaryKey(),
    planId: int("plan_id")
      .notNull()
      .references(() => installmentPlans.id, { onDelete: "cascade" }),

    // Installment details
    installmentNumber: int("installment_number").notNull(),
    dueDate: date("due_date").notNull(),
    amountDue: decimal("amount_due", { precision: 15, scale: 2 }).notNull(),

    // Payment tracking
    amountPaid: decimal("amount_paid", { precision: 15, scale: 2 }).default("0"),
    paidDate: date("paid_date"),
    paymentId: int("payment_id"), // Link to payments table when paid

    // Status
    status: installmentStatusEnum.notNull().default("SCHEDULED"),

    // Late fee tracking
    lateFeeApplied: decimal("late_fee_applied", { precision: 10, scale: 2 }).default("0"),
    reminderSentAt: timestamp("reminder_sent_at"),

    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    planIdIdx: index("idx_installments_plan").on(table.planId),
    dueDateIdx: index("idx_installments_due_date").on(table.dueDate),
    statusIdx: index("idx_installments_status").on(table.status),
  })
);

export type Installment = typeof installments.$inferSelect;
export type InsertInstallment = typeof installments.$inferInsert;

// ============================================================================
// Relations
// ============================================================================

export const invoiceDisputesRelations = relations(invoiceDisputes, ({ one, many }) => ({
  invoice: one(invoices, {
    fields: [invoiceDisputes.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [invoiceDisputes.clientId],
    references: [clients.id],
  }),
  creator: one(users, {
    fields: [invoiceDisputes.createdBy],
    references: [users.id],
    relationName: "disputeCreator",
  }),
  resolver: one(users, {
    fields: [invoiceDisputes.resolvedBy],
    references: [users.id],
    relationName: "disputeResolver",
  }),
  assignee: one(users, {
    fields: [invoiceDisputes.assignedTo],
    references: [users.id],
    relationName: "disputeAssignee",
  }),
  attachments: many(disputeAttachments),
  notes: many(disputeNotes),
}));

export const productCategoriesRelations = relations(productCategories, ({ one, many }) => ({
  parent: one(productCategories, {
    fields: [productCategories.parentId],
    references: [productCategories.id],
    relationName: "categoryHierarchy",
  }),
  children: many(productCategories, { relationName: "categoryHierarchy" }),
  assignments: many(productCategoryAssignments),
}));

export const installmentPlansRelations = relations(installmentPlans, ({ one, many }) => ({
  invoice: one(invoices, {
    fields: [installmentPlans.invoiceId],
    references: [invoices.id],
  }),
  order: one(orders, {
    fields: [installmentPlans.orderId],
    references: [orders.id],
  }),
  client: one(clients, {
    fields: [installmentPlans.clientId],
    references: [clients.id],
  }),
  installments: many(installments),
}));
