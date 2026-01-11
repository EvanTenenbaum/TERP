import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
  json,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { users } from "./schema";
import { clients, products, batches } from "./schema"; // Assuming these exist in main schema based on context
import { orders } from "./schema"; // Assuming orders exists, see schema extensions

// ============================================================================
// LIVE SHOPPING SCHEMA (Phase 0)
// ============================================================================

/**
 * Session Status Enum
 */
export const liveSessionStatusEnum = mysqlEnum("liveSessionStatus", [
  "SCHEDULED", // Future session
  "ACTIVE",    // Currently live
  "PAUSED",    // Temporarily halted
  "ENDED",     // Finished, cart locked
  "CONVERTED", // Converted to Order
  "CANCELLED", // Voided
]);

/**
 * Cart Item Status Enum
 * Represents the customer's intent for each product in their cart
 */
export const cartItemStatusEnum = mysqlEnum("cartItemStatus", [
  "SAMPLE_REQUEST",  // Customer wants to see a sample brought out
  "INTERESTED",      // Customer is interested, may want to negotiate price
  "TO_PURCHASE",     // Customer intends to buy this item
]);

/**
 * Live Shopping Sessions
 * Represents a real-time sales engagement between a Staff Host and a Client.
 */
export const liveShoppingSessions = mysqlTable(
  "liveShoppingSessions",
  {
    id: int("id").autoincrement().primaryKey(),
    
    // The Staff member hosting the session
    hostUserId: int("hostUserId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
      
    // The VIP Client participating
    clientId: int("clientId")
      .notNull()
      .references(() => clients.id, { onDelete: "restrict" }),

    // Session State
    status: liveSessionStatusEnum.notNull().default("SCHEDULED"),
    
    // Unique room identifier for Socket/Video rooms (UUID)
    roomCode: varchar("roomCode", { length: 64 }).notNull().unique(),
    
    // Optional scheduled time
    scheduledAt: timestamp("scheduledAt"),
    
    // Actual start/end times for reporting
    startedAt: timestamp("startedAt"),
    endedAt: timestamp("endedAt"),
    
    // User-facing notes/title
    title: varchar("title", { length: 255 }),
    internalNotes: text("internalNotes"),
    
    // Configuration snapshot (prices, allowed categories, etc - serialized)
    sessionConfig: json("sessionConfig"),

    // Standard audit fields
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"), // snake_case to match legacy TERP schema
  },
  (table) => ({
    hostIdx: index("idx_lss_host").on(table.hostUserId),
    clientIdx: index("idx_lss_client").on(table.clientId),
    statusIdx: index("idx_lss_status").on(table.status),
    roomCodeIdx: index("idx_lss_room").on(table.roomCode),
  })
);

export type LiveShoppingSession = typeof liveShoppingSessions.$inferSelect;
export type InsertLiveShoppingSession = typeof liveShoppingSessions.$inferInsert;

/**
 * Session Cart Items
 * Items added to the temporary "cart" during a live session.
 * These are NOT reserved inventory until order conversion, but act as a draft.
 */
export const sessionCartItems = mysqlTable(
  "sessionCartItems",
  {
    id: int("id").autoincrement().primaryKey(),
    
    sessionId: int("sessionId")
      .notNull()
      .references(() => liveShoppingSessions.id, { onDelete: "cascade" }),

    // Reference to specific physical inventory (Batch)
    batchId: int("batchId")
      .notNull()
      .references(() => batches.id, { onDelete: "restrict" }),
      
    // Denormalized product ID for easier querying
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "restrict" }),

    // Quantity can be decimal for weight-based items
    quantity: decimal("quantity", { precision: 15, scale: 4 }).notNull().default("1.0000"),
    
    // The price at the moment it was added (snapshot)
    unitPrice: decimal("unitPrice", { precision: 15, scale: 2 }).notNull(),
    
    // Who added this item? (Host or Client)
    addedByRole: mysqlEnum("addedByRole", ["HOST", "CLIENT"]).notNull(),
    
    // Is this a sample item? (P4-T03)
    isSample: boolean("isSample").default(false).notNull(),
    
    // Is this item "pinned" or "highlighted" in the UI?
    isHighlighted: boolean("isHighlighted").default(false),
    
    // Customer intent status for this item
    // SAMPLE_REQUEST: Customer wants to see sample
    // INTERESTED: Customer interested, may negotiate price
    // TO_PURCHASE: Customer intends to buy
    itemStatus: cartItemStatusEnum.default("INTERESTED"),

    // FEATURE-003: Price Negotiation fields
    // Status of price negotiation for this item
    negotiationStatus: mysqlEnum("negotiationStatus", [
      "PENDING",        // Awaiting response
      "COUNTER_OFFERED", // Seller made counter-offer
      "ACCEPTED",       // Price agreed
      "REJECTED",       // Negotiation rejected
    ]),
    // JSON field to store negotiation history and details
    negotiationData: json("negotiationData").$type<{
      status: string;
      originalPrice: number;
      proposedPrice: number;
      proposedQuantity?: number;
      counterPrice?: number;
      counterQuantity?: number;
      finalPrice?: number;
      reason?: string;
      requestedBy?: number;
      requestedAt?: string;
      acceptedAt?: string;
      acceptedBy?: number;
      rejectedAt?: string;
      rejectedBy?: number;
      rejectionReason?: string;
      history: Array<{
        action: string;
        price?: number | null;
        quantity?: number;
        by: number;
        at: string;
        reason?: string;
      }>;
    }>(),

    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"), // snake_case to match legacy TERP schema
  },
  (table) => ({
    sessionIdx: index("idx_sci_session").on(table.sessionId),
    batchIdx: index("idx_sci_batch").on(table.batchId),
  })
);

export type SessionCartItem = typeof sessionCartItems.$inferSelect;
export type InsertSessionCartItem = typeof sessionCartItems.$inferInsert;

/**
 * Session Price Overrides
 * Allows the host to offer custom pricing for specific products *during* this session.
 */
export const sessionPriceOverrides = mysqlTable(
  "sessionPriceOverrides",
  {
    id: int("id").autoincrement().primaryKey(),
    
    sessionId: int("sessionId")
      .notNull()
      .references(() => liveShoppingSessions.id, { onDelete: "cascade" }),
      
    productId: int("productId")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
      
    // The special price offered in this session
    overridePrice: decimal("overridePrice", { precision: 15, scale: 2 }).notNull(),
    
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => ({
    uniqueOverride: index("idx_spo_unique").on(table.sessionId, table.productId),
  })
);

export type SessionPriceOverride = typeof sessionPriceOverrides.$inferSelect;
export type InsertSessionPriceOverride = typeof sessionPriceOverrides.$inferInsert;

/**
 * RELATIONS
 */

export const liveShoppingSessionsRelations = relations(
  liveShoppingSessions,
  ({ one, many }) => ({
    host: one(users, {
      fields: [liveShoppingSessions.hostUserId],
      references: [users.id],
    }),
    client: one(clients, {
      fields: [liveShoppingSessions.clientId],
      references: [clients.id],
    }),
    cartItems: many(sessionCartItems),
    priceOverrides: many(sessionPriceOverrides),
    // Inverse relation to orders (defined in logic, explicit relation optional if circular deps exist)
  })
);

export const sessionCartItemsRelations = relations(
  sessionCartItems,
  ({ one }) => ({
    session: one(liveShoppingSessions, {
      fields: [sessionCartItems.sessionId],
      references: [liveShoppingSessions.id],
    }),
    batch: one(batches, {
      fields: [sessionCartItems.batchId],
      references: [batches.id],
    }),
    product: one(products, {
      fields: [sessionCartItems.productId],
      references: [products.id],
    }),
  })
);

export const sessionPriceOverridesRelations = relations(
  sessionPriceOverrides,
  ({ one }) => ({
    session: one(liveShoppingSessions, {
      fields: [sessionPriceOverrides.sessionId],
      references: [liveShoppingSessions.id],
    }),
    product: one(products, {
      fields: [sessionPriceOverrides.productId],
      references: [products.id],
    }),
  })
);
