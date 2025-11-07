import { mysqlTable, int, text, varchar, timestamp, primaryKey } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * RBAC Schema for TERP
 * 
 * This schema implements Role-Based Access Control (RBAC) for the TERP application.
 * It defines four core tables: roles, permissions, role_permissions, and user_roles.
 * 
 * Design Principles:
 * - Flexible: Custom roles can be created beyond the 10 predefined roles
 * - Granular: 255 permissions provide fine-grained control
 * - Scalable: Many-to-many relationships support complex permission structures
 * - Auditable: Timestamps track when roles and permissions are assigned
 */

// ============================================================================
// ROLES TABLE
// ============================================================================

export const roles = mysqlTable("roles", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isSystemRole: int("is_system_role").notNull().default(0), // 1 for the 10 predefined roles, 0 for custom
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const rolesRelations = relations(roles, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userRoles: many(userRoles),
}));

// ============================================================================
// PERMISSIONS TABLE
// ============================================================================

export const permissions = mysqlTable("permissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(), // e.g., 'orders:create', 'inventory:delete'
  description: text("description"),
  module: varchar("module", { length: 50 }).notNull(), // e.g., 'orders', 'inventory', 'accounting'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const permissionsRelations = relations(permissions, ({ many }) => ({
  rolePermissions: many(rolePermissions),
  userPermissionOverrides: many(userPermissionOverrides),
}));

// ============================================================================
// ROLE_PERMISSIONS TABLE (Many-to-Many)
// ============================================================================

export const rolePermissions = mysqlTable(
  "role_permissions",
  {
    roleId: int("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: int("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.roleId, table.permissionId] }),
  })
);

export const rolePermissionsRelations = relations(rolePermissions, ({ one }) => ({
  role: one(roles, {
    fields: [rolePermissions.roleId],
    references: [roles.id],
  }),
  permission: one(permissions, {
    fields: [rolePermissions.permissionId],
    references: [permissions.id],
  }),
}));

// ============================================================================
// USER_ROLES TABLE (Many-to-Many)
// ============================================================================

export const userRoles = mysqlTable(
  "user_roles",
  {
    userId: varchar("user_id", { length: 255 }).notNull(), // Clerk user ID
    roleId: int("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.roleId] }),
  })
);

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  role: one(roles, {
    fields: [userRoles.roleId],
    references: [roles.id],
  }),
}));

// ============================================================================
// USER_PERMISSION_OVERRIDES TABLE (For per-user exceptions)
// ============================================================================

export const userPermissionOverrides = mysqlTable(
  "user_permission_overrides",
  {
    userId: varchar("user_id", { length: 255 }).notNull(), // Clerk user ID
    permissionId: int("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
    granted: int("granted").notNull().default(1), // 1 to grant, 0 to revoke
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.permissionId] }),
  })
);

export const userPermissionOverridesRelations = relations(userPermissionOverrides, ({ one }) => ({
  permission: one(permissions, {
    fields: [userPermissionOverrides.permissionId],
    references: [permissions.id],
  }),
}));
