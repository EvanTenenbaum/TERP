/**
 * Sprint 5 Track E: Storage & Location Schema Extensions
 *
 * TASK-IDs: MEET-067, MEET-068
 *
 * This file contains database schema extensions for:
 * - MEET-067: Storage Zones (A, B, C, D or custom names)
 * - MEET-068: Three Sites (Samples, Storage, Shipping)
 */

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
  json,
  index,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { users, batches } from "./schema";

// ============================================================================
// MEET-067: Storage Zones
// ============================================================================

/**
 * Temperature control enum for zones
 */
export const temperatureControlEnum = mysqlEnum("temperature_control", [
  "ambient",
  "cool",
  "cold",
  "frozen",
  "controlled",
]);

/**
 * Access level enum for zones
 */
export const zoneAccessLevelEnum = mysqlEnum("zone_access_level", [
  "public",
  "restricted",
  "secure",
  "high_security",
]);

/**
 * Storage Zones table
 * Defines physical storage zones within a site (A, B, C, D or custom)
 */
export const storageZones = mysqlTable(
  "storage_zones",
  {
    id: int("id").autoincrement().primaryKey(),

    // Zone identification
    code: varchar("code", { length: 10 }).notNull(), // A, B, C, D or custom
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Site reference (for multi-site support)
    siteId: int("site_id").references(() => sites.id, { onDelete: "cascade" }),

    // Zone properties
    temperatureControl: temperatureControlEnum.notNull().default("ambient"),
    accessLevel: zoneAccessLevelEnum.notNull().default("public"),

    // Capacity management
    maxCapacity: decimal("max_capacity", { precision: 15, scale: 2 }), // Max units/weight
    currentCapacity: decimal("current_capacity", {
      precision: 15,
      scale: 2,
    }).default("0"),
    capacityUnit: varchar("capacity_unit", { length: 50 }).default("units"), // units, lbs, kg, cubic_ft

    // Temperature range (for controlled zones)
    minTemp: decimal("min_temp", { precision: 5, scale: 2 }), // Celsius
    maxTemp: decimal("max_temp", { precision: 5, scale: 2 }), // Celsius

    // Display settings
    color: varchar("color", { length: 7 }).notNull().default("#6B7280"),
    displayOrder: int("display_order").default(0),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Metadata
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  table => ({
    siteIdx: index("idx_storage_zones_site").on(table.siteId),
    codeIdx: index("idx_storage_zones_code").on(table.code),
    isActiveIdx: index("idx_storage_zones_active").on(table.isActive),
  })
);

export type StorageZone = typeof storageZones.$inferSelect;
export type InsertStorageZone = typeof storageZones.$inferInsert;

/**
 * Batch Zone Assignments table
 * Links batches to specific storage zones with quantity tracking
 */
export const batchZoneAssignments = mysqlTable(
  "batch_zone_assignments",
  {
    id: int("id").autoincrement().primaryKey(),

    batchId: int("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    zoneId: int("zone_id")
      .notNull()
      .references(() => storageZones.id, { onDelete: "cascade" }),

    // Quantity in this zone
    quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),

    // Location details within zone
    rack: varchar("rack", { length: 50 }),
    shelf: varchar("shelf", { length: 50 }),
    bin: varchar("bin", { length: 50 }),

    // Assignment details
    assignedById: int("assigned_by_id").references(() => users.id),
    assignedAt: timestamp("assigned_at").defaultNow().notNull(),

    // Notes
    notes: text("notes"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    batchIdx: index("idx_batch_zone_batch").on(table.batchId),
    zoneIdx: index("idx_batch_zone_zone").on(table.zoneId),
    batchZoneIdx: index("idx_batch_zone_composite").on(
      table.batchId,
      table.zoneId
    ),
  })
);

export type BatchZoneAssignment = typeof batchZoneAssignments.$inferSelect;
export type InsertBatchZoneAssignment =
  typeof batchZoneAssignments.$inferInsert;

// ============================================================================
// MEET-068: Three Sites (Samples, Storage, Shipping)
// ============================================================================

/**
 * Site type enum
 */
export const siteTypeEnum = mysqlEnum("site_type", [
  "samples",
  "storage",
  "shipping",
  "warehouse",
  "office",
  "custom",
]);

/**
 * Sites table
 * Defines physical locations: Samples, Main Storage, Shipping Dock, etc.
 */
export const sites = mysqlTable(
  "sites",
  {
    id: int("id").autoincrement().primaryKey(),

    // Site identification
    code: varchar("code", { length: 20 }).notNull().unique(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Site type
    siteType: siteTypeEnum.notNull().default("storage"),

    // Address info
    address: text("address"),
    city: varchar("city", { length: 100 }),
    state: varchar("state", { length: 50 }),
    zipCode: varchar("zip_code", { length: 20 }),
    country: varchar("country", { length: 100 }).default("USA"),

    // Contact info
    contactName: varchar("contact_name", { length: 255 }),
    contactPhone: varchar("contact_phone", { length: 50 }),
    contactEmail: varchar("contact_email", { length: 320 }),

    // Operating hours
    operatingHours: json("operating_hours").$type<{
      monday?: { open: string; close: string };
      tuesday?: { open: string; close: string };
      wednesday?: { open: string; close: string };
      thursday?: { open: string; close: string };
      friday?: { open: string; close: string };
      saturday?: { open: string; close: string };
      sunday?: { open: string; close: string };
    }>(),

    // Display settings
    color: varchar("color", { length: 7 }).notNull().default("#3B82F6"),
    displayOrder: int("display_order").default(0),

    // Default site flag
    isDefault: boolean("is_default").notNull().default(false),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  table => ({
    codeIdx: index("idx_sites_code").on(table.code),
    typeIdx: index("idx_sites_type").on(table.siteType),
    isActiveIdx: index("idx_sites_active").on(table.isActive),
  })
);

export type Site = typeof sites.$inferSelect;
export type InsertSite = typeof sites.$inferInsert;

/**
 * Site transfer status enum
 */
export const siteTransferStatusEnum = mysqlEnum("site_transfer_status", [
  "pending",
  "in_transit",
  "received",
  "cancelled",
]);

/**
 * Site Transfers table
 * Tracks inventory transfers between sites
 */
export const siteTransfers = mysqlTable(
  "site_transfers",
  {
    id: int("id").autoincrement().primaryKey(),

    // Transfer number for reference
    transferNumber: varchar("transfer_number", { length: 50 })
      .notNull()
      .unique(),

    // Source and destination sites
    fromSiteId: int("from_site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "restrict" }),
    toSiteId: int("to_site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "restrict" }),

    // Batch being transferred
    batchId: int("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "restrict" }),

    // Quantity being transferred
    quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull(),

    // Status tracking
    status: siteTransferStatusEnum.notNull().default("pending"),

    // Timing
    requestedAt: timestamp("requested_at").defaultNow().notNull(),
    shippedAt: timestamp("shipped_at"),
    receivedAt: timestamp("received_at"),
    expectedArrival: timestamp("expected_arrival"),

    // Personnel
    requestedById: int("requested_by_id")
      .notNull()
      .references(() => users.id),
    shippedById: int("shipped_by_id").references(() => users.id),
    receivedById: int("received_by_id").references(() => users.id),

    // Carrier/tracking
    carrier: varchar("carrier", { length: 255 }),
    trackingNumber: varchar("tracking_number", { length: 255 }),

    // Notes
    notes: text("notes"),

    // Destination zone (optional)
    destinationZoneId: int("destination_zone_id").references(
      () => storageZones.id
    ),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    fromSiteIdx: index("idx_site_transfers_from").on(table.fromSiteId),
    toSiteIdx: index("idx_site_transfers_to").on(table.toSiteId),
    batchIdx: index("idx_site_transfers_batch").on(table.batchId),
    statusIdx: index("idx_site_transfers_status").on(table.status),
    transferNumberIdx: index("idx_site_transfers_number").on(
      table.transferNumber
    ),
  })
);

export type SiteTransfer = typeof siteTransfers.$inferSelect;
export type InsertSiteTransfer = typeof siteTransfers.$inferInsert;

/**
 * Site Inventory Counts table
 * Tracks inventory counts per site for quick lookups
 */
export const siteInventoryCounts = mysqlTable(
  "site_inventory_counts",
  {
    id: int("id").autoincrement().primaryKey(),

    siteId: int("site_id")
      .notNull()
      .references(() => sites.id, { onDelete: "cascade" }),
    batchId: int("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),

    // Current quantity at site
    quantity: decimal("quantity", { precision: 15, scale: 4 })
      .notNull()
      .default("0"),

    // Reserved quantity (for pending transfers/orders)
    reservedQuantity: decimal("reserved_quantity", {
      precision: 15,
      scale: 4,
    }).default("0"),

    // Last inventory check
    lastCountAt: timestamp("last_count_at"),
    lastCountById: int("last_count_by_id").references(() => users.id),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    siteIdx: index("idx_site_inventory_site").on(table.siteId),
    batchIdx: index("idx_site_inventory_batch").on(table.batchId),
    siteBatchIdx: index("idx_site_inventory_site_batch").on(
      table.siteId,
      table.batchId
    ),
  })
);

export type SiteInventoryCount = typeof siteInventoryCounts.$inferSelect;
export type InsertSiteInventoryCount = typeof siteInventoryCounts.$inferInsert;

// ============================================================================
// Relations
// ============================================================================

export const storageZonesRelations = relations(
  storageZones,
  ({ one, many }) => ({
    site: one(sites, {
      fields: [storageZones.siteId],
      references: [sites.id],
    }),
    batchAssignments: many(batchZoneAssignments),
  })
);

export const batchZoneAssignmentsRelations = relations(
  batchZoneAssignments,
  ({ one }) => ({
    batch: one(batches, {
      fields: [batchZoneAssignments.batchId],
      references: [batches.id],
    }),
    zone: one(storageZones, {
      fields: [batchZoneAssignments.zoneId],
      references: [storageZones.id],
    }),
    assignedBy: one(users, {
      fields: [batchZoneAssignments.assignedById],
      references: [users.id],
    }),
  })
);

export const sitesRelations = relations(sites, ({ many }) => ({
  zones: many(storageZones),
  transfersFrom: many(siteTransfers, { relationName: "fromSite" }),
  transfersTo: many(siteTransfers, { relationName: "toSite" }),
  inventoryCounts: many(siteInventoryCounts),
}));

export const siteTransfersRelations = relations(siteTransfers, ({ one }) => ({
  fromSite: one(sites, {
    fields: [siteTransfers.fromSiteId],
    references: [sites.id],
    relationName: "fromSite",
  }),
  toSite: one(sites, {
    fields: [siteTransfers.toSiteId],
    references: [sites.id],
    relationName: "toSite",
  }),
  batch: one(batches, {
    fields: [siteTransfers.batchId],
    references: [batches.id],
  }),
  requestedBy: one(users, {
    fields: [siteTransfers.requestedById],
    references: [users.id],
  }),
  shippedBy: one(users, {
    fields: [siteTransfers.shippedById],
    references: [users.id],
  }),
  receivedBy: one(users, {
    fields: [siteTransfers.receivedById],
    references: [users.id],
  }),
  destinationZone: one(storageZones, {
    fields: [siteTransfers.destinationZoneId],
    references: [storageZones.id],
  }),
}));

export const siteInventoryCountsRelations = relations(
  siteInventoryCounts,
  ({ one }) => ({
    site: one(sites, {
      fields: [siteInventoryCounts.siteId],
      references: [sites.id],
    }),
    batch: one(batches, {
      fields: [siteInventoryCounts.batchId],
      references: [batches.id],
    }),
    lastCountBy: one(users, {
      fields: [siteInventoryCounts.lastCountById],
      references: [users.id],
    }),
  })
);
