/**
 * Enhanced RBAC Router
 * Sprint 5 Track E: MEET-051 - User Roles & Permissions Enhancement
 *
 * Provides:
 * - Role templates (Admin, Manager, Staff, VIP)
 * - Permission audit log
 * - Quick role assignment
 * - Bulk permission management
 * - Sprint 4/5 permission initialization
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";

import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from "../../drizzle/schema-rbac";
import { users } from "../../drizzle/schema";
import { eq, and, sql, inArray, desc } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// ROLE TEMPLATES
// ============================================================================

/**
 * Predefined role templates with their permissions
 */
const ROLE_TEMPLATES = {
  admin: {
    name: "Administrator",
    description: "Full system access with all permissions",
    permissions: [
      // All permissions
      "admin",
      "rbac:*",
      "inventory:*",
      "orders:*",
      "accounting:*",
      "clients:*",
      "scheduling:*",
      "reports:*",
      "system:*",
    ],
  },
  manager: {
    name: "Manager",
    description: "Department management with limited admin access",
    permissions: [
      "inventory:read",
      "inventory:create",
      "inventory:update",
      "orders:read",
      "orders:create",
      "orders:update",
      "orders:approve",
      "clients:read",
      "clients:create",
      "clients:update",
      "scheduling:read",
      "scheduling:create",
      "scheduling:manage",
      "reports:read",
      "reports:generate",
      "rbac:users:read",
      "rbac:users:assign",
    ],
  },
  staff: {
    name: "Staff",
    description: "Standard employee access for daily operations",
    permissions: [
      "inventory:read",
      "orders:read",
      "orders:create",
      "clients:read",
      "scheduling:read",
      "reports:read",
    ],
  },
  vip: {
    name: "VIP User",
    description: "External VIP client with portal access",
    permissions: [
      "vip-portal:access",
      "vip-portal:orders:read",
      "vip-portal:orders:create",
      "vip-portal:catalog:read",
      "vip-portal:profile:read",
      "vip-portal:profile:update",
    ],
  },
  warehouse: {
    name: "Warehouse Staff",
    description: "Inventory and shipping operations",
    permissions: [
      "inventory:read",
      "inventory:create",
      "inventory:update",
      "inventory:locations:manage",
      "pick-pack:read",
      "pick-pack:manage",
      "shipping:read",
      "shipping:create",
    ],
  },
  accounting: {
    name: "Accounting",
    description: "Financial operations and reporting",
    permissions: [
      "accounting:read",
      "accounting:create",
      "accounting:update",
      "accounting:reports:generate",
      "orders:read",
      "clients:read",
      "clients:ledger:read",
      "clients:ledger:manage",
      "reports:read",
      "reports:generate",
    ],
  },
};

/**
 * Sprint 4/5 feature permissions to add
 */
const SPRINT_PERMISSIONS = [
  // Storage & Location (5.E.1, 5.E.2)
  {
    name: "storage:zones:read",
    module: "storage",
    description: "View storage zones",
  },
  {
    name: "storage:zones:manage",
    module: "storage",
    description: "Create/edit/delete storage zones",
  },
  {
    name: "storage:sites:read",
    module: "storage",
    description: "View site information",
  },
  {
    name: "storage:sites:manage",
    module: "storage",
    description: "Create/edit/delete sites",
  },
  {
    name: "storage:transfers:read",
    module: "storage",
    description: "View site transfers",
  },
  {
    name: "storage:transfers:manage",
    module: "storage",
    description: "Create/approve site transfers",
  },

  // Hour Tracking (5.E.4)
  {
    name: "hour-tracking:read",
    module: "scheduling",
    description: "View time entries and timesheets",
  },
  {
    name: "hour-tracking:clock",
    module: "scheduling",
    description: "Clock in/out functionality",
  },
  {
    name: "hour-tracking:manage",
    module: "scheduling",
    description: "Manage and approve time entries",
  },
  {
    name: "hour-tracking:reports",
    module: "scheduling",
    description: "View hour tracking reports",
  },

  // Task Management (5.E.7)
  {
    name: "tasks:read",
    module: "tasks",
    description: "View tasks",
  },
  {
    name: "tasks:create",
    module: "tasks",
    description: "Create new tasks",
  },
  {
    name: "tasks:update",
    module: "tasks",
    description: "Update task status and details",
  },
  {
    name: "tasks:delete",
    module: "tasks",
    description: "Delete tasks",
  },
  {
    name: "tasks:assign",
    module: "tasks",
    description: "Assign tasks to users",
  },

  // Vendor Management
  {
    name: "vendors:harvest:read",
    module: "vendors",
    description: "View vendor harvest schedules",
  },
  {
    name: "vendors:harvest:manage",
    module: "vendors",
    description: "Manage vendor harvest reminders",
  },

  // Office Needs (5.E.6)
  {
    name: "office-needs:read",
    module: "office",
    description: "View office supply needs",
  },
  {
    name: "office-needs:create",
    module: "office",
    description: "Create office supply requests",
  },
  {
    name: "office-needs:bulk",
    module: "office",
    description: "Bulk import office supply items",
  },

  // Categories (5.E.3)
  {
    name: "categories:cascade",
    module: "inventory",
    description: "Perform cascading category operations",
  },
  {
    name: "categories:reports",
    module: "inventory",
    description: "View category reports",
  },

  // Gamification
  {
    name: "gamification:read",
    module: "gamification",
    description: "View gamification data",
  },
  {
    name: "gamification:manage",
    module: "gamification",
    description: "Manage gamification settings",
  },

  // VIP Portal enhancements
  {
    name: "vip-portal:debt:view",
    module: "vip-portal",
    description: "View debt information in VIP portal",
  },
  {
    name: "vip-portal:tier:view",
    module: "vip-portal",
    description: "View VIP tier information",
  },
];

// ============================================================================
// ROUTER
// ============================================================================

export const rbacEnhancedRouter = router({
  // ==========================================================================
  // ROLE TEMPLATES
  // ==========================================================================

  /**
   * Get available role templates
   */
  getRoleTemplates: protectedProcedure
    .use(requirePermission("rbac:roles:read"))
    .query(async () => {
      return Object.entries(ROLE_TEMPLATES).map(([key, template]) => ({
        key,
        name: template.name,
        description: template.description,
        permissionCount: template.permissions.length,
      }));
    }),

  /**
   * Create role from template
   */
  createRoleFromTemplate: protectedProcedure
    .use(requirePermission("rbac:roles:create"))
    .input(
      z.object({
        templateKey: z.enum([
          "admin",
          "manager",
          "staff",
          "vip",
          "warehouse",
          "accounting",
        ]),
        customName: z.string().optional(),
        customDescription: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const template = ROLE_TEMPLATES[input.templateKey];
      const userId = getAuthenticatedUserId(ctx);

      // Check if role name already exists
      const roleName = input.customName || template.name;
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, roleName))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Role "${roleName}" already exists`,
        });
      }

      // Create the role
      const [roleResult] = await db.insert(roles).values({
        name: roleName,
        description: input.customDescription || template.description,
        isSystemRole: 0,
      });

      const roleId = roleResult.insertId;

      // Get matching permissions
      const permPatterns = template.permissions;

      // For each permission pattern, find matching permissions
      for (const pattern of permPatterns) {
        if (pattern.includes("*")) {
          // Wildcard pattern - get all permissions in module
          const module = pattern.split(":")[0];
          const modulePerms = await db
            .select()
            .from(permissions)
            .where(eq(permissions.module, module));

          for (const perm of modulePerms) {
            await db.insert(rolePermissions).values({
              roleId,
              permissionId: perm.id,
            });
          }
        } else {
          // Exact match
          const [perm] = await db
            .select()
            .from(permissions)
            .where(eq(permissions.name, pattern))
            .limit(1);

          if (perm) {
            await db.insert(rolePermissions).values({
              roleId,
              permissionId: perm.id,
            });
          }
        }
      }

      logger.info({
        msg: "Role created from template",
        roleId,
        roleName,
        template: input.templateKey,
        createdBy: userId,
      });

      return {
        success: true,
        roleId,
        roleName,
        message: `Role "${roleName}" created successfully from ${input.templateKey} template`,
      };
    }),

  // ==========================================================================
  // QUICK ROLE ASSIGNMENT
  // ==========================================================================

  /**
   * Quickly assign role to multiple users
   */
  bulkAssignRole: protectedProcedure
    .use(requirePermission("rbac:users:assign"))
    .input(
      z.object({
        roleId: z.number().int(),
        userIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const assignerId = ctx.user?.id?.toString() || "system";

      // Verify role exists
      const [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, input.roleId))
        .limit(1);

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      let assignedCount = 0;
      let skippedCount = 0;

      for (const userId of input.userIds) {
        // Check if already assigned
        const [existing] = await db
          .select()
          .from(userRoles)
          .where(
            and(
              eq(userRoles.userId, userId),
              eq(userRoles.roleId, input.roleId)
            )
          )
          .limit(1);

        if (existing) {
          skippedCount++;
          continue;
        }

        await db.insert(userRoles).values({
          userId,
          roleId: input.roleId,
          assignedBy: assignerId,
        });
        assignedCount++;
      }

      logger.info({
        msg: "Bulk role assignment completed",
        roleId: input.roleId,
        roleName: role.name,
        assignedCount,
        skippedCount,
        assignedBy: assignerId,
      });

      return {
        success: true,
        assignedCount,
        skippedCount,
        message: `Assigned role "${role.name}" to ${assignedCount} users (${skippedCount} already had the role)`,
      };
    }),

  /**
   * Remove role from multiple users
   */
  bulkRemoveRole: protectedProcedure
    .use(requirePermission("rbac:users:assign"))
    .input(
      z.object({
        roleId: z.number().int(),
        userIds: z.array(z.string()).min(1).max(100),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const removerId = ctx.user?.id?.toString() || "system";

      // Verify role exists
      const [role] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, input.roleId))
        .limit(1);

      if (!role) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Role not found",
        });
      }

      const _result = await db
        .delete(userRoles)
        .where(
          and(
            inArray(userRoles.userId, input.userIds),
            eq(userRoles.roleId, input.roleId)
          )
        );

      logger.info({
        msg: "Bulk role removal completed",
        roleId: input.roleId,
        roleName: role.name,
        userCount: input.userIds.length,
        removedBy: removerId,
      });

      return {
        success: true,
        message: `Removed role "${role.name}" from users`,
      };
    }),

  /**
   * Get users by role
   */
  getUsersByRole: protectedProcedure
    .use(requirePermission("rbac:users:read"))
    .input(
      z.object({
        roleId: z.number().int(),
        limit: z.number().int().min(1).max(500).default(100),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userRoleRecords = await db
        .select({
          id: userRoles.id,
          clerkUserId: userRoles.userId,
          assignedAt: userRoles.assignedAt,
          assignedBy: userRoles.assignedBy,
          userName: users.name,
          userEmail: users.email,
        })
        .from(userRoles)
        .leftJoin(users, eq(userRoles.userId, sql`CAST(${users.id} AS CHAR)`))
        .where(eq(userRoles.roleId, input.roleId))
        .limit(input.limit)
        .offset(input.offset)
        .orderBy(desc(userRoles.assignedAt));

      return {
        users: userRoleRecords,
        total: userRoleRecords.length,
      };
    }),

  // ==========================================================================
  // PERMISSION INITIALIZATION
  // ==========================================================================

  /**
   * Initialize Sprint 4/5 permissions
   */
  initializeSprintPermissions: protectedProcedure
    .use(requirePermission("admin"))
    .mutation(async ({ ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);
      let addedCount = 0;
      let skippedCount = 0;

      for (const perm of SPRINT_PERMISSIONS) {
        // Check if permission already exists
        const [existing] = await db
          .select()
          .from(permissions)
          .where(eq(permissions.name, perm.name))
          .limit(1);

        if (existing) {
          skippedCount++;
          continue;
        }

        await db.insert(permissions).values({
          name: perm.name,
          module: perm.module,
          description: perm.description,
        });
        addedCount++;
      }

      logger.info({
        msg: "Sprint permissions initialized",
        addedCount,
        skippedCount,
        initializedBy: userId,
      });

      return {
        success: true,
        addedCount,
        skippedCount,
        message: `Added ${addedCount} new permissions (${skippedCount} already existed)`,
      };
    }),

  /**
   * Get permission summary by module
   */
  getPermissionSummary: protectedProcedure
    .use(requirePermission("rbac:permissions:read"))
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const summary = await db
        .select({
          module: permissions.module,
          count: sql<number>`COUNT(*)`,
        })
        .from(permissions)
        .groupBy(permissions.module)
        .orderBy(permissions.module);

      const totalRoles = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(roles);

      const totalUserRoles = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(userRoles);

      return {
        permissionsByModule: summary,
        totalPermissions: summary.reduce((sum, m) => sum + Number(m.count), 0),
        totalRoles: Number(totalRoles[0]?.count || 0),
        totalUserRoleAssignments: Number(totalUserRoles[0]?.count || 0),
      };
    }),

  // ==========================================================================
  // ROLE CLONING
  // ==========================================================================

  /**
   * Clone an existing role with all its permissions
   */
  cloneRole: protectedProcedure
    .use(requirePermission("rbac:roles:create"))
    .input(
      z.object({
        sourceRoleId: z.number().int(),
        newName: z.string().min(1).max(100),
        newDescription: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Get source role
      const [sourceRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.id, input.sourceRoleId))
        .limit(1);

      if (!sourceRole) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Source role not found",
        });
      }

      // Check if new name already exists
      const [existing] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, input.newName))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Role "${input.newName}" already exists`,
        });
      }

      // Create new role
      const [roleResult] = await db.insert(roles).values({
        name: input.newName,
        description: input.newDescription || `Cloned from ${sourceRole.name}`,
        isSystemRole: 0,
      });

      const newRoleId = roleResult.insertId;

      // Copy permissions
      const sourcePerms = await db
        .select({ permissionId: rolePermissions.permissionId })
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, input.sourceRoleId));

      for (const perm of sourcePerms) {
        await db.insert(rolePermissions).values({
          roleId: newRoleId,
          permissionId: perm.permissionId,
        });
      }

      logger.info({
        msg: "Role cloned",
        sourceRoleId: input.sourceRoleId,
        newRoleId,
        newRoleName: input.newName,
        permissionCount: sourcePerms.length,
        clonedBy: userId,
      });

      return {
        success: true,
        roleId: newRoleId,
        roleName: input.newName,
        permissionCount: sourcePerms.length,
        message: `Role "${input.newName}" cloned successfully with ${sourcePerms.length} permissions`,
      };
    }),

  // ==========================================================================
  // ROLE COMPARISON
  // ==========================================================================

  /**
   * Compare permissions between two roles
   */
  compareRoles: protectedProcedure
    .use(requirePermission("rbac:roles:read"))
    .input(
      z.object({
        roleId1: z.number().int(),
        roleId2: z.number().int(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get both roles
      const rolesList = await db
        .select()
        .from(roles)
        .where(inArray(roles.id, [input.roleId1, input.roleId2]));

      if (rolesList.length !== 2) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "One or both roles not found",
        });
      }

      // Get permissions for both roles
      const perms1 = await db
        .select({
          permId: rolePermissions.permissionId,
          permName: permissions.name,
          module: permissions.module,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id)
        )
        .where(eq(rolePermissions.roleId, input.roleId1));

      const perms2 = await db
        .select({
          permId: rolePermissions.permissionId,
          permName: permissions.name,
          module: permissions.module,
        })
        .from(rolePermissions)
        .innerJoin(
          permissions,
          eq(rolePermissions.permissionId, permissions.id)
        )
        .where(eq(rolePermissions.roleId, input.roleId2));

      const permIds1 = new Set(perms1.map(p => p.permId));
      const permIds2 = new Set(perms2.map(p => p.permId));

      // Find differences
      const onlyInRole1 = perms1.filter(p => !permIds2.has(p.permId));
      const onlyInRole2 = perms2.filter(p => !permIds1.has(p.permId));
      const common = perms1.filter(p => permIds2.has(p.permId));

      return {
        role1: rolesList.find(r => r.id === input.roleId1),
        role2: rolesList.find(r => r.id === input.roleId2),
        comparison: {
          onlyInRole1: onlyInRole1.map(p => ({
            id: p.permId,
            name: p.permName,
            module: p.module,
          })),
          onlyInRole2: onlyInRole2.map(p => ({
            id: p.permId,
            name: p.permName,
            module: p.module,
          })),
          common: common.map(p => ({
            id: p.permId,
            name: p.permName,
            module: p.module,
          })),
        },
        summary: {
          role1Total: perms1.length,
          role2Total: perms2.length,
          commonCount: common.length,
          uniqueToRole1: onlyInRole1.length,
          uniqueToRole2: onlyInRole2.length,
        },
      };
    }),
});
