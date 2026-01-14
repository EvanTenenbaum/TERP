/**
 * Sprint 4 Track B: Client 360 View Schema Extensions
 *
 * This file contains database schema extensions for:
 * - 4.B.4: Client Referrer Tagging (referredByClientId on clients)
 * - 4.B.6: Client Wants/Needs Tracking
 * - 4.B.9: Office Needs Auto-Population
 */

import {
  mysqlTable,
  int,
  varchar,
  text,
  timestamp,
  boolean,
  decimal,
  json,
  index,
  mysqlEnum,
} from "drizzle-orm/mysql-core";
import { clients, products, categories, users } from "./schema";

// ============================================================================
// Client Wants/Needs Tracking (4.B.6 - MEET-021)
// ============================================================================

/**
 * Priority levels for client wants
 */
export const clientWantPriorityEnum = mysqlEnum("client_want_priority", [
  "LOW",
  "MEDIUM",
  "HIGH",
  "URGENT",
]);

/**
 * Status of client wants
 */
export const clientWantStatusEnum = mysqlEnum("client_want_status", [
  "ACTIVE",
  "MATCHED",
  "FULFILLED",
  "EXPIRED",
  "CANCELLED",
]);

/**
 * Client Wants Table
 * Tracks what products/categories clients want to purchase
 */
export const clientWants = mysqlTable(
  "client_wants",
  {
    id: int("id").primaryKey().autoincrement(),
    clientId: int("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),

    // Product/Category targeting
    productId: int("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    categoryId: int("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    strainName: varchar("strain_name", { length: 255 }),
    productKeywords: varchar("product_keywords", { length: 500 }), // Comma-separated keywords

    // Quantity and price preferences
    minQuantity: decimal("min_quantity", { precision: 10, scale: 2 }),
    maxQuantity: decimal("max_quantity", { precision: 10, scale: 2 }),
    maxPricePerUnit: decimal("max_price_per_unit", { precision: 10, scale: 2 }),

    // Priority and status
    priority: clientWantPriorityEnum.notNull().default("MEDIUM"),
    status: clientWantStatusEnum.notNull().default("ACTIVE"),

    // Notes
    notes: text("notes"),
    internalNotes: text("internal_notes"),

    // Notification preferences
    notifyOnMatch: boolean("notify_on_match").default(true),
    notifyEmail: boolean("notify_email").default(false),

    // Timing
    neededByDate: timestamp("needed_by_date"),
    expiresAt: timestamp("expires_at"),

    // Tracking
    createdBy: int("created_by").references(() => users.id),
    lastMatchedAt: timestamp("last_matched_at"),
    matchCount: int("match_count").default(0),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientIdIdx: index("idx_client_wants_client_id").on(table.clientId),
    statusIdx: index("idx_client_wants_status").on(table.status),
    priorityIdx: index("idx_client_wants_priority").on(table.priority),
    productIdIdx: index("idx_client_wants_product_id").on(table.productId),
    categoryIdIdx: index("idx_client_wants_category_id").on(table.categoryId),
    expiresAtIdx: index("idx_client_wants_expires_at").on(table.expiresAt),
  })
);

export type ClientWant = typeof clientWants.$inferSelect;
export type InsertClientWant = typeof clientWants.$inferInsert;

// ============================================================================
// Client Want Matches (for tracking which products matched wants)
// ============================================================================

/**
 * Client Want Match Status
 */
export const clientWantMatchStatusEnum = mysqlEnum("client_want_match_status", [
  "NEW",
  "NOTIFIED",
  "VIEWED",
  "CONVERTED",
  "DISMISSED",
]);

/**
 * Client Want Matches Table
 * Tracks products that match client wants
 */
export const clientWantMatches = mysqlTable(
  "client_want_matches",
  {
    id: int("id").primaryKey().autoincrement(),
    clientWantId: int("client_want_id")
      .notNull()
      .references(() => clientWants.id, { onDelete: "cascade" }),
    inventoryItemId: int("inventory_item_id").notNull(),

    // Match quality
    matchScore: decimal("match_score", { precision: 5, scale: 2 }), // 0-100 percentage
    matchReasons: json("match_reasons").$type<string[]>(),

    // Status tracking
    status: clientWantMatchStatusEnum.notNull().default("NEW"),
    notifiedAt: timestamp("notified_at"),
    viewedAt: timestamp("viewed_at"),
    convertedToOrderId: int("converted_to_order_id"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    clientWantIdIdx: index("idx_cwm_client_want_id").on(table.clientWantId),
    inventoryItemIdIdx: index("idx_cwm_inventory_item_id").on(
      table.inventoryItemId
    ),
    statusIdx: index("idx_cwm_status").on(table.status),
  })
);

export type ClientWantMatch = typeof clientWantMatches.$inferSelect;
export type InsertClientWantMatch = typeof clientWantMatches.$inferInsert;

// ============================================================================
// Office Supply Items (4.B.9 - MEET-055)
// ============================================================================

/**
 * Office Supply Items Table
 * Tracks office supply products for auto-reorder
 */
export const officeSupplyItems = mysqlTable(
  "office_supply_items",
  {
    id: int("id").primaryKey().autoincrement(),
    productId: int("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),

    // Reorder settings
    reorderPoint: decimal("reorder_point", {
      precision: 10,
      scale: 2,
    }).notNull(),
    reorderQuantity: decimal("reorder_quantity", {
      precision: 10,
      scale: 2,
    }).notNull(),
    preferredSupplierId: int("preferred_supplier_id").references(
      () => clients.id
    ),

    // Auto-reorder settings
    autoReorderEnabled: boolean("auto_reorder_enabled").default(false),
    lastReorderDate: timestamp("last_reorder_date"),
    nextScheduledReorder: timestamp("next_scheduled_reorder"),

    // Tracking
    isActive: boolean("is_active").default(true),
    notes: text("notes"),

    createdBy: int("created_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    productIdIdx: index("idx_office_supply_product_id").on(table.productId),
    preferredSupplierIdx: index("idx_office_supply_preferred_supplier").on(
      table.preferredSupplierId
    ),
    activeIdx: index("idx_office_supply_active").on(table.isActive),
  })
);

export type OfficeSupplyItem = typeof officeSupplyItems.$inferSelect;
export type InsertOfficeSupplyItem = typeof officeSupplyItems.$inferInsert;

// ============================================================================
// Office Supply Needs (generated reorder suggestions)
// ============================================================================

/**
 * Office Supply Need Status
 */
export const officeSupplyNeedStatusEnum = mysqlEnum(
  "office_supply_need_status",
  ["PENDING", "APPROVED", "ORDERED", "RECEIVED", "CANCELLED"]
);

/**
 * Office Supply Needs Table
 * Auto-generated reorder suggestions for office supplies
 */
export const officeSupplyNeeds = mysqlTable(
  "office_supply_needs",
  {
    id: int("id").primaryKey().autoincrement(),
    officeSupplyItemId: int("office_supply_item_id")
      .notNull()
      .references(() => officeSupplyItems.id, { onDelete: "cascade" }),

    // Quantities
    currentStock: decimal("current_stock", {
      precision: 10,
      scale: 2,
    }).notNull(),
    suggestedQuantity: decimal("suggested_quantity", {
      precision: 10,
      scale: 2,
    }).notNull(),

    // Status
    status: officeSupplyNeedStatusEnum.notNull().default("PENDING"),

    // Linked purchase order (when ordered)
    purchaseOrderId: int("purchase_order_id"),

    // Processing
    approvedBy: int("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    officeSupplyItemIdIdx: index("idx_osn_office_supply_item_id").on(
      table.officeSupplyItemId
    ),
    statusIdx: index("idx_osn_status").on(table.status),
  })
);

export type OfficeSupplyNeed = typeof officeSupplyNeeds.$inferSelect;
export type InsertOfficeSupplyNeed = typeof officeSupplyNeeds.$inferInsert;
