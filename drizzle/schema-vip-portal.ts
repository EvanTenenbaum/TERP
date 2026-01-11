import { mysqlTable, int, boolean, json, timestamp, varchar, text, index, decimal, unique } from "drizzle-orm/mysql-core";
import { clients, users } from "./schema";

/**
 * VIP Portal Configurations
 * Stores per-client portal customization settings
 */
export const vipPortalConfigurations = mysqlTable("vip_portal_configurations", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().unique().references(() => clients.id, { onDelete: "cascade" }),
  
  // Module-level toggles
  moduleDashboardEnabled: boolean("module_dashboard_enabled").default(true).notNull(),
  moduleLiveCatalogEnabled: boolean("module_live_catalog_enabled").default(false).notNull(),
  moduleLiveShoppingEnabled: boolean("module_live_shopping_enabled").default(true).notNull(),
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
    liveCatalog?: {
      visibleCategories?: number[];
      visibleSubcategories?: number[];
      visibleItems?: number[];
      hiddenItems?: number[];
      showQuantity?: boolean;
      showBrand?: boolean;
      showGrade?: boolean;
      showDate?: boolean;
      showBasePrice?: boolean;
      showMarkup?: boolean;
      enablePriceAlerts?: boolean;
    };
    liveShopping?: {
      allowProductSearch?: boolean;
      autoJoinActive?: boolean;
      showPriceHistory?: boolean;
    };
    leaderboard?: {
      enabled?: boolean;
      type?: 'ytd_spend' | 'payment_speed' | 'order_frequency' | 'credit_utilization' | 'ontime_payment_rate';
      displayMode?: 'black_box' | 'transparent';
      minimumClients?: number;
      metrics?: string[];
      showSuggestions?: boolean;
      showRankings?: boolean;
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

// ============================================================================
// LIVE CATALOG MODULE SCHEMA
// ============================================================================

/**
 * Client Catalog Views
 * Stores saved filter combinations for quick access in the Live Catalog
 */
export const clientCatalogViews = mysqlTable("client_catalog_views", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  filters: json("filters").$type<{
    category?: string | null;
    brand?: string[];
    grade?: string[];
    stockLevel?: "all" | "in_stock" | "low_stock";
    priceMin?: number;
    priceMax?: number;
    search?: string;
  }>().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_client_catalog_views_client_id").on(table.clientId),
}));

export type ClientCatalogView = typeof clientCatalogViews.$inferSelect;
export type InsertClientCatalogView = typeof clientCatalogViews.$inferInsert;

/**
 * Client Interest Lists (Submitted Lists)
 * Stores submitted interest lists from clients
 */
export const clientInterestLists = mysqlTable("client_interest_lists", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  submittedAt: timestamp("submitted_at").defaultNow().notNull(),
  status: varchar("status", { length: 20 }).notNull().default("NEW"), // NEW, REVIEWED, CONVERTED, ARCHIVED
  totalItems: int("total_items").notNull(),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  reviewedAt: timestamp("reviewed_at"),
  reviewedBy: int("reviewed_by"),
  convertedToOrderId: int("converted_to_order_id"),
  convertedAt: timestamp("converted_at"),
  convertedBy: int("converted_by"),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_client_interest_lists_client_id").on(table.clientId),
  statusIdx: index("idx_client_interest_lists_status").on(table.status),
}));

export type ClientInterestList = typeof clientInterestLists.$inferSelect;
export type InsertClientInterestList = typeof clientInterestLists.$inferInsert;

/**
 * Client Interest List Items
 * Individual items in submitted interest lists with snapshot data
 */
export const clientInterestListItems = mysqlTable("client_interest_list_items", {
  id: int("id").primaryKey().autoincrement(),
  interestListId: int("interest_list_id").notNull().references(() => clientInterestLists.id, { onDelete: "cascade" }),
  batchId: int("batch_id").notNull(),
  // Snapshot data at time of interest
  itemName: varchar("item_name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  subcategory: varchar("subcategory", { length: 100 }),
  priceAtInterest: decimal("price_at_interest", { precision: 10, scale: 2 }).notNull(),
  quantityAtInterest: decimal("quantity_at_interest", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  interestListIdIdx: index("idx_interest_list_items_list_id").on(table.interestListId),
  batchIdIdx: index("idx_interest_list_items_batch_id").on(table.batchId),
}));

export type ClientInterestListItem = typeof clientInterestListItems.$inferSelect;
export type InsertClientInterestListItem = typeof clientInterestListItems.$inferInsert;

/**
 * Client Draft Interests
 * Temporary storage for items clients are considering (not yet submitted)
 */
export const clientDraftInterests = mysqlTable("client_draft_interests", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  batchId: int("batch_id").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index("idx_client_draft_interests_client_id").on(table.clientId),
  batchIdIdx: index("idx_client_draft_interests_batch_id").on(table.batchId),
  uniqueClientBatch: unique("idx_client_draft_unique").on(table.clientId, table.batchId),
}));

export type ClientDraftInterest = typeof clientDraftInterests.$inferSelect;
export type InsertClientDraftInterest = typeof clientDraftInterests.$inferInsert;

/**
 * Client Price Alerts
 * Stores price alert configurations for specific items
 */
export const clientPriceAlerts = mysqlTable("client_price_alerts", {
  id: int("id").primaryKey().autoincrement(),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  batchId: int("batch_id").notNull(),
  targetPrice: decimal("target_price", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").default(true).notNull(),
  triggeredAt: timestamp("triggered_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(), // Auto-expire after 30 days
}, (table) => ({
  clientIdIdx: index("idx_client_price_alerts_client_id").on(table.clientId),
  batchIdIdx: index("idx_client_price_alerts_batch_id").on(table.batchId),
  activeIdx: index("idx_client_price_alerts_active").on(table.active),
}));

export type ClientPriceAlert = typeof clientPriceAlerts.$inferSelect;
export type InsertClientPriceAlert = typeof clientPriceAlerts.$inferInsert;

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

// ============================================================================
// ADMIN IMPERSONATION AUDIT SCHEMA (FEATURE-012)
// ============================================================================

/**
 * Admin Impersonation Sessions
 * Tracks all admin impersonation sessions for audit and revocation purposes
 */
export const adminImpersonationSessions = mysqlTable("admin_impersonation_sessions", {
  id: int("id").primaryKey().autoincrement(),
  sessionGuid: varchar("session_guid", { length: 36 }).notNull().unique(),
  adminUserId: int("admin_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  clientId: int("client_id").notNull().references(() => clients.id, { onDelete: "cascade" }),
  startAt: timestamp("start_at").defaultNow().notNull(),
  endAt: timestamp("end_at"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: varchar("user_agent", { length: 500 }),
  status: varchar("status", { length: 20 }).notNull().default("ACTIVE"), // ACTIVE, ENDED, REVOKED, EXPIRED
  revokedBy: int("revoked_by").references(() => users.id),
  revokedAt: timestamp("revoked_at"),
  revokeReason: varchar("revoke_reason", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  adminUserIdIdx: index("idx_admin_imp_sessions_admin_user_id").on(table.adminUserId),
  clientIdIdx: index("idx_admin_imp_sessions_client_id").on(table.clientId),
  statusIdx: index("idx_admin_imp_sessions_status").on(table.status),
  sessionGuidIdx: index("idx_admin_imp_sessions_guid").on(table.sessionGuid),
}));

export type AdminImpersonationSession = typeof adminImpersonationSessions.$inferSelect;
export type InsertAdminImpersonationSession = typeof adminImpersonationSessions.$inferInsert;

/**
 * Admin Impersonation Actions
 * Logs all significant actions taken during an impersonation session
 */
export const adminImpersonationActions = mysqlTable("admin_impersonation_actions", {
  id: int("id").primaryKey().autoincrement(),
  sessionId: int("session_id").notNull().references(() => adminImpersonationSessions.id, { onDelete: "cascade" }),
  actionType: varchar("action_type", { length: 100 }).notNull(), // VIEW_PAGE, UPDATE_CONFIG, CREATE_ORDER, etc.
  actionPath: varchar("action_path", { length: 255 }), // e.g., /vip-portal/ar
  actionMethod: varchar("action_method", { length: 10 }), // GET, POST, PUT, DELETE
  actionDetails: json("action_details").$type<{
    description?: string;
    entityType?: string;
    entityId?: number;
    changes?: Record<string, unknown>;
    metadata?: Record<string, unknown>;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  sessionIdIdx: index("idx_admin_imp_actions_session_id").on(table.sessionId),
  actionTypeIdx: index("idx_admin_imp_actions_type").on(table.actionType),
  createdAtIdx: index("idx_admin_imp_actions_created_at").on(table.createdAt),
}));

export type AdminImpersonationAction = typeof adminImpersonationActions.$inferSelect;
export type InsertAdminImpersonationAction = typeof adminImpersonationActions.$inferInsert;
