import {
  mysqlTable,
  mysqlEnum,
  int,
  text,
  varchar,
  timestamp,
  boolean,
  json,
  index,
  uniqueIndex,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { roles } from "./schema-rbac";

/**
 * Feature Flags Schema for TERP
 * 
 * This schema implements a comprehensive feature flag system with:
 * - Database-driven flag definitions
 * - Role-based overrides (integrates with RBAC)
 * - User-specific overrides (uses openId for consistency with RBAC)
 * - Audit logging for all changes
 * - Soft delete support (ST-013)
 * 
 * Evaluation Priority:
 * 1. System disabled → always false
 * 2. Dependency check → if depends on disabled flag, false
 * 3. Module disabled → if module flag disabled, false
 * 4. User override → explicit user setting
 * 5. Role override → most permissive wins
 * 6. Default value → fallback
 */

// ============================================================================
// FEATURE FLAGS TABLE
// ============================================================================

export const featureFlags = mysqlTable(
  "feature_flags",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Unique identifier for the flag, e.g., "credit-management" or "module-accounting" */
    key: varchar("key", { length: 100 }).notNull().unique(),
    /** Human-readable name */
    name: varchar("name", { length: 255 }).notNull(),
    /** Detailed description of what this flag controls */
    description: text("description"),
    /** Module this flag belongs to, e.g., "module-accounting" */
    module: varchar("module", { length: 100 }),
    /** Master switch - when false, flag is disabled for everyone */
    systemEnabled: boolean("system_enabled").default(true).notNull(),
    /** Default value when no overrides apply */
    defaultEnabled: boolean("default_enabled").default(false).notNull(),
    /** Key of another flag this depends on (must be enabled for this to work) */
    dependsOn: varchar("depends_on", { length: 100 }),
    /** Additional metadata (JSON) */
    metadata: json("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    /** Soft delete support (ST-013) */
    deletedAt: timestamp("deleted_at"),
  },
  (table) => ({
    keyIdx: uniqueIndex("feature_flags_key_idx").on(table.key),
    moduleIdx: index("feature_flags_module_idx").on(table.module),
  })
);

export type FeatureFlag = typeof featureFlags.$inferSelect;
export type NewFeatureFlag = typeof featureFlags.$inferInsert;

// ============================================================================
// FEATURE FLAG ROLE OVERRIDES TABLE
// ============================================================================

export const featureFlagRoleOverrides = mysqlTable(
  "feature_flag_role_overrides",
  {
    id: int("id").autoincrement().primaryKey(),
    flagId: int("flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    roleId: int("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    /** Whether this role has the flag enabled */
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** User openId who created this override */
    createdBy: varchar("created_by", { length: 255 }),
  },
  (table) => ({
    flagRoleIdx: uniqueIndex("flag_role_unique_idx").on(table.flagId, table.roleId),
  })
);

export type FeatureFlagRoleOverride = typeof featureFlagRoleOverrides.$inferSelect;
export type NewFeatureFlagRoleOverride = typeof featureFlagRoleOverrides.$inferInsert;

// ============================================================================
// FEATURE FLAG USER OVERRIDES TABLE
// ============================================================================

/**
 * User overrides use openId (varchar) NOT numeric id
 * This matches the RBAC pattern in user_roles table
 */
export const featureFlagUserOverrides = mysqlTable(
  "feature_flag_user_overrides",
  {
    id: int("id").autoincrement().primaryKey(),
    flagId: int("flag_id")
      .notNull()
      .references(() => featureFlags.id, { onDelete: "cascade" }),
    /** User's openId (Clerk/OAuth ID) - NOT numeric id */
    userOpenId: varchar("user_open_id", { length: 255 }).notNull(),
    /** Whether this user has the flag enabled */
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    /** User openId who created this override */
    createdBy: varchar("created_by", { length: 255 }),
  },
  (table) => ({
    flagUserIdx: uniqueIndex("flag_user_unique_idx").on(table.flagId, table.userOpenId),
    userIdx: index("flag_user_open_id_idx").on(table.userOpenId),
  })
);

export type FeatureFlagUserOverride = typeof featureFlagUserOverrides.$inferSelect;
export type NewFeatureFlagUserOverride = typeof featureFlagUserOverrides.$inferInsert;

// ============================================================================
// FEATURE FLAG AUDIT LOGS TABLE
// ============================================================================

export const featureFlagAuditActionEnum = mysqlEnum("feature_flag_audit_action", [
  "created",
  "updated",
  "deleted",
  "enabled",
  "disabled",
  "override_added",
  "override_removed",
]);

export const featureFlagAuditLogs = mysqlTable(
  "feature_flag_audit_logs",
  {
    id: int("id").autoincrement().primaryKey(),
    /** Reference to the flag (nullable because flag may be deleted) */
    flagId: int("flag_id").references(() => featureFlags.id, { onDelete: "set null" }),
    /** Flag key preserved even if flag is deleted */
    flagKey: varchar("flag_key", { length: 100 }).notNull(),
    /** Type of action performed */
    action: featureFlagAuditActionEnum.notNull(),
    /** User openId who performed the action */
    actorOpenId: varchar("actor_open_id", { length: 255 }).notNull(),
    /** Previous value (JSON) */
    previousValue: json("previous_value").$type<Record<string, unknown>>(),
    /** New value (JSON) */
    newValue: json("new_value").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    flagKeyIdx: index("audit_flag_key_idx").on(table.flagKey),
    actorIdx: index("audit_actor_idx").on(table.actorOpenId),
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
  })
);

export type FeatureFlagAuditLog = typeof featureFlagAuditLogs.$inferSelect;
export type NewFeatureFlagAuditLog = typeof featureFlagAuditLogs.$inferInsert;

// ============================================================================
// RELATIONS
// ============================================================================

export const featureFlagsRelations = relations(featureFlags, ({ many }) => ({
  roleOverrides: many(featureFlagRoleOverrides),
  userOverrides: many(featureFlagUserOverrides),
  auditLogs: many(featureFlagAuditLogs),
}));

export const featureFlagRoleOverridesRelations = relations(
  featureFlagRoleOverrides,
  ({ one }) => ({
    flag: one(featureFlags, {
      fields: [featureFlagRoleOverrides.flagId],
      references: [featureFlags.id],
    }),
    role: one(roles, {
      fields: [featureFlagRoleOverrides.roleId],
      references: [roles.id],
    }),
  })
);

export const featureFlagUserOverridesRelations = relations(
  featureFlagUserOverrides,
  ({ one }) => ({
    flag: one(featureFlags, {
      fields: [featureFlagUserOverrides.flagId],
      references: [featureFlags.id],
    }),
  })
);

export const featureFlagAuditLogsRelations = relations(
  featureFlagAuditLogs,
  ({ one }) => ({
    flag: one(featureFlags, {
      fields: [featureFlagAuditLogs.flagId],
      references: [featureFlags.id],
    }),
  })
);
