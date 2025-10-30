import { mysqlTable, int, varchar, boolean, json, timestamp, text, index } from "drizzle-orm/mysql-core";
import { clients } from "./schema";

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
