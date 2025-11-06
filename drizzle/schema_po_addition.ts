// Add this after vendorNotes table (around line 175)

/**
 * Purchase Order Status Enum
 * Tracks the lifecycle of a purchase order
 */
export const purchaseOrderStatusEnum = mysqlEnum("purchaseOrderStatus", [
  "DRAFT",       // Being created
  "SENT",        // Sent to vendor
  "CONFIRMED",   // Vendor confirmed
  "RECEIVING",   // Partially received
  "RECEIVED",    // Fully received
  "CANCELLED",   // Cancelled before completion
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
    
    // Vendor relationship
    vendorId: int("vendorId")
      .notNull()
      .references(() => vendors.id, { onDelete: "restrict" }),
    
    // Optional link to intake session (if PO created from intake)
    intakeSessionId: int("intakeSessionId")
      .references(() => intakeSessions.id, { onDelete: "set null" }),
    
    // Status and dates
    status: purchaseOrderStatusEnum.notNull().default("DRAFT"),
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
  (table) => ({
    vendorIdIdx: index("idx_po_vendor_id").on(table.vendorId),
    statusIdx: index("idx_po_status").on(table.status),
    orderDateIdx: index("idx_po_order_date").on(table.orderDate),
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
    quantityOrdered: decimal("quantityOrdered", { precision: 15, scale: 4 }).notNull(),
    quantityReceived: decimal("quantityReceived", { precision: 15, scale: 4 }).default("0"),
    
    // Pricing
    unitCost: decimal("unitCost", { precision: 15, scale: 4 }).notNull(),
    totalCost: decimal("totalCost", { precision: 15, scale: 4 }).notNull(),
    
    // Item-specific notes
    notes: text("notes"),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    poIdIdx: index("idx_poi_po_id").on(table.purchaseOrderId),
    productIdIdx: index("idx_poi_product_id").on(table.productId),
  })
);

export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
