import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { 
  roles, 
  permissions, 
  rolePermissions,
  userRoles 
} from "../../drizzle/schema";
import { eq, inArray, and, sql } from "drizzle-orm";
import { logger } from "../_core/logger";
import { clearPermissionCache } from "../services/permissionService";

/**
 * RBAC Roles Router
 * 
 * This router provides endpoints for managing roles and their permission assignments.
 * All endpoints require appropriate RBAC permissions.
 */

export const rbacRolesRouter = router({
  /**
   * List all roles with their permission counts
   * Requires: rbac:roles:read permission
   */
  list: protectedProcedure
    .use(requirePermission("rbac:roles:read"))
    .input(z.object({
      limit: z.number().optional().default(100),
      offset: z.number().optional().default(0),
      includeSystemRoles: z.boolean().optional().default(true),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");


        // Get all roles - use conditional where clause
        const roleRecords = !input.includeSystemRoles
          ? await db
              .select({
                id: roles.id,
                name: roles.name,
                description: roles.description,
                isSystemRole: roles.isSystemRole,
                createdAt: roles.createdAt,
                updatedAt: roles.updatedAt,
              })
              .from(roles)
              .where(eq(roles.isSystemRole, 0))
              .limit(input.limit)
              .offset(input.offset)
          : await db
              .select({
                id: roles.id,
                name: roles.name,
                description: roles.description,
                isSystemRole: roles.isSystemRole,
                createdAt: roles.createdAt,
                updatedAt: roles.updatedAt,
              })
              .from(roles)
              .limit(input.limit)
              .offset(input.offset);

        // Get permission counts for each role
        const roleIds = roleRecords.map(r => r.id);
        
        const permissionCounts = roleIds.length > 0
          ? await db
              .select({
                roleId: rolePermissions.roleId,
                count: sql<number>`COUNT(*)`.as('count'),
              })
              .from(rolePermissions)
              .where(inArray(rolePermissions.roleId, roleIds))
              .groupBy(rolePermissions.roleId)
          : [];

        const countMap = new Map(permissionCounts.map(pc => [pc.roleId, Number(pc.count)]));

        // Get user counts for each role
        const userCounts = roleIds.length > 0
          ? await db
              .select({
                roleId: userRoles.roleId,
                count: sql<number>`COUNT(DISTINCT ${userRoles.userId})`.as('count'),
              })
              .from(userRoles)
              .where(inArray(userRoles.roleId, roleIds))
              .groupBy(userRoles.roleId)
          : [];

        const userCountMap = new Map(userCounts.map(uc => [uc.roleId, Number(uc.count)]));

        const rolesWithCounts = roleRecords.map(role => ({
          ...role,
          isSystemRole: role.isSystemRole === 1,
          permissionCount: countMap.get(role.id) || 0,
          userCount: userCountMap.get(role.id) || 0,
        }));

        logger.info({ 
          msg: "Listed roles", 
          count: rolesWithCounts.length 
        });

        return {
          roles: rolesWithCounts,
          total: rolesWithCounts.length,
        };
      } catch (error) {
        logger.error({ msg: "Error listing roles", error });
        throw error;
      }
    }),

  /**
   * Get a specific role with its permissions
   * Requires: rbac:roles:read permission
   */
  getById: protectedProcedure
    .use(requirePermission("rbac:roles:read"))
    .input(z.object({ roleId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");


        // Get role details
        const role = await db
          .select({
            id: roles.id,
            name: roles.name,
            description: roles.description,
            isSystemRole: roles.isSystemRole,
            createdAt: roles.createdAt,
            updatedAt: roles.updatedAt,
          })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        if (role.length === 0) {
          throw new Error(`Role with ID ${input.roleId} not found`);
        }

        // Get role's permissions
        const rolePermissionRecords = await db
          .select({
            permissionId: rolePermissions.permissionId,
            permissionName: permissions.name,
            permissionDescription: permissions.description,
            permissionModule: permissions.module,
            assignedAt: rolePermissions.createdAt,
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .where(eq(rolePermissions.roleId, input.roleId));

        // Get user count
        const userCount = await db
          .select({
            count: sql<number>`COUNT(DISTINCT ${userRoles.userId})`.as('count'),
          })
          .from(userRoles)
          .where(eq(userRoles.roleId, input.roleId));

        logger.info({ 
          msg: "Retrieved role details", 
          roleId: input.roleId,
          permissionCount: rolePermissionRecords.length,
        });

        return {
          ...role[0],
          isSystemRole: role[0].isSystemRole === 1,
          permissions: rolePermissionRecords.map(p => ({
            permissionId: p.permissionId,
            permissionName: p.permissionName,
            permissionDescription: p.permissionDescription,
            permissionModule: p.permissionModule,
            assignedAt: p.assignedAt,
          })),
          userCount: Number(userCount[0]?.count || 0),
        };
      } catch (error) {
        logger.error({ msg: "Error getting role details", roleId: input.roleId, error });
        throw error;
      }
    }),

  /**
   * Create a new custom role
   * Requires: rbac:roles:create permission
   */
  create: protectedProcedure
    .use(requirePermission("rbac:roles:create"))
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Check if role name already exists
        const existing = await db
          .select({ id: roles.id })
          .from(roles)
          .where(eq(roles.name, input.name))
          .limit(1);

        if (existing.length > 0) {
          throw new Error(`Role with name "${input.name}" already exists`);
        }

        // Create role
        const result = await db.insert(roles).values({
          name: input.name,
          description: input.description || null,
          isSystemRole: 0, // Custom roles are not system roles
        });

        const roleId = Number(Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0);

        logger.info({ 
          msg: "Role created", 
          roleId,
          roleName: input.name,
          createdBy: ctx.user?.id,
        });

        return {
          success: true,
          roleId,
          message: `Role "${input.name}" created successfully`,
        };
      } catch (error) {
        logger.error({ msg: "Error creating role", roleName: input.name, error });
        throw error;
      }
    }),

  /**
   * Update a role's details
   * System roles cannot be updated
   * Requires: rbac:roles:update permission
   */
  update: protectedProcedure
    .use(requirePermission("rbac:roles:update"))
    .input(z.object({
      roleId: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Check if role exists and is not a system role
        const role = await db
          .select({ 
            id: roles.id, 
            name: roles.name, 
            isSystemRole: roles.isSystemRole 
          })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        if (role.length === 0) {
          throw new Error(`Role with ID ${input.roleId} not found`);
        }

        if (role[0].isSystemRole === 1) {
          throw new Error("System roles cannot be modified");
        }

        // If name is being changed, check for conflicts
        if (input.name && input.name !== role[0].name) {
          const existing = await db
            .select({ id: roles.id })
            .from(roles)
            .where(eq(roles.name, input.name))
            .limit(1);

          if (existing.length > 0) {
            throw new Error(`Role with name "${input.name}" already exists`);
          }
        }

        // Update role
        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;

        await db
          .update(roles)
          .set(updateData)
          .where(eq(roles.id, input.roleId));

        logger.info({ 
          msg: "Role updated", 
          roleId: input.roleId,
          updatedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Role updated successfully`,
        };
      } catch (error) {
        logger.error({ msg: "Error updating role", roleId: input.roleId, error });
        throw error;
      }
    }),

  /**
   * Delete a custom role
   * System roles cannot be deleted
   * Requires: rbac:roles:delete permission
   */
  delete: protectedProcedure
    .use(requirePermission("rbac:roles:delete"))
    .input(z.object({ roleId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Check if role exists and is not a system role
        const role = await db
          .select({ 
            id: roles.id, 
            name: roles.name, 
            isSystemRole: roles.isSystemRole 
          })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        if (role.length === 0) {
          throw new Error(`Role with ID ${input.roleId} not found`);
        }

        if (role[0].isSystemRole === 1) {
          throw new Error("System roles cannot be deleted");
        }

        // Delete role (cascade will handle role_permissions and user_roles)
        await db
          .delete(roles)
          .where(eq(roles.id, input.roleId));

        // Clear permission cache for all users (since we don't know which users had this role)
        clearPermissionCache();

        logger.info({ 
          msg: "Role deleted", 
          roleId: input.roleId,
          roleName: role[0].name,
          deletedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Role "${role[0].name}" deleted successfully`,
        };
      } catch (error) {
        logger.error({ msg: "Error deleting role", roleId: input.roleId, error });
        throw error;
      }
    }),

  /**
   * Assign a permission to a role
   * Requires: rbac:roles:assign_permission permission
   */
  assignPermission: protectedProcedure
    .use(requirePermission("rbac:roles:assign_permission"))
    .input(z.object({
      roleId: z.number(),
      permissionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Validate role and permission exist
        const role = await db
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        if (role.length === 0) {
          throw new Error(`Role with ID ${input.roleId} not found`);
        }

        const permission = await db
          .select({ id: permissions.id, name: permissions.name })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        if (permission.length === 0) {
          throw new Error(`Permission with ID ${input.permissionId} not found`);
        }

        // Check if permission is already assigned
        const existing = await db
          .select({ roleId: rolePermissions.roleId })
          .from(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, input.roleId),
            eq(rolePermissions.permissionId, input.permissionId)
          ))
          .limit(1);

        if (existing.length > 0) {
          throw new Error(`Permission "${permission[0].name}" is already assigned to role "${role[0].name}"`);
        }

        // Assign permission
        await db.insert(rolePermissions).values({
          roleId: input.roleId,
          permissionId: input.permissionId,
        });

        // Clear permission cache for all users with this role
        clearPermissionCache();

        logger.info({ 
          msg: "Permission assigned to role", 
          roleId: input.roleId,
          roleName: role[0].name,
          permissionId: input.permissionId,
          permissionName: permission[0].name,
          assignedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Permission "${permission[0].name}" assigned to role "${role[0].name}"`,
        };
      } catch (error) {
        logger.error({ msg: "Error assigning permission to role", roleId: input.roleId, permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Remove a permission from a role
   * Requires: rbac:roles:remove_permission permission
   */
  removePermission: protectedProcedure
    .use(requirePermission("rbac:roles:remove_permission"))
    .input(z.object({
      roleId: z.number(),
      permissionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Get role and permission names for logging
        const role = await db
          .select({ name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        const permission = await db
          .select({ name: permissions.name })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        // Remove permission
        await db
          .delete(rolePermissions)
          .where(and(
            eq(rolePermissions.roleId, input.roleId),
            eq(rolePermissions.permissionId, input.permissionId)
          ));

        // Clear permission cache for all users with this role
        clearPermissionCache();

        logger.info({ 
          msg: "Permission removed from role", 
          roleId: input.roleId,
          roleName: role[0]?.name,
          permissionId: input.permissionId,
          permissionName: permission[0]?.name,
          removedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Permission removed from role`,
        };
      } catch (error) {
        logger.error({ msg: "Error removing permission from role", roleId: input.roleId, permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Bulk assign permissions to a role
   * Requires: rbac:roles:assign_permission permission
   */
  bulkAssignPermissions: protectedProcedure
    .use(requirePermission("rbac:roles:assign_permission"))
    .input(z.object({
      roleId: z.number(),
      permissionIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Validate role exists
        const role = await db
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        if (role.length === 0) {
          throw new Error(`Role with ID ${input.roleId} not found`);
        }

        // BUG-120 FIX: Return early if no permissions to assign (empty array crashes inArray)
        if (input.permissionIds.length === 0) {
          return {
            success: true,
            message: `No permissions to assign to role "${role[0].name}"`,
            assignedCount: 0,
          };
        }

        // Validate all permissions exist
        const existingPermissions = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(inArray(permissions.id, input.permissionIds));

        if (existingPermissions.length !== input.permissionIds.length) {
          throw new Error("One or more permission IDs are invalid");
        }

        // Get currently assigned permissions
        const currentPermissions = await db
          .select({ permissionId: rolePermissions.permissionId })
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, input.roleId));

        const currentPermissionIds = new Set(currentPermissions.map(p => p.permissionId));
        const newPermissionIds = input.permissionIds.filter(id => !currentPermissionIds.has(id));

        // Insert new permission assignments
        if (newPermissionIds.length > 0) {
          await db.insert(rolePermissions).values(
            newPermissionIds.map(permissionId => ({
              roleId: input.roleId,
              permissionId,
            }))
          );
        }

        // Clear permission cache for all users with this role
        clearPermissionCache();

        logger.info({ 
          msg: "Bulk permissions assigned to role", 
          roleId: input.roleId,
          roleName: role[0].name,
          permissionIds: newPermissionIds,
          assignedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `${newPermissionIds.length} permission(s) assigned to role "${role[0].name}"`,
          assignedCount: newPermissionIds.length,
        };
      } catch (error) {
        logger.error({ msg: "Error bulk assigning permissions to role", roleId: input.roleId, error });
        throw error;
      }
    }),

  /**
   * Replace all permissions for a role
   * Requires: rbac:roles:assign_permission permission
   */
  replacePermissions: protectedProcedure
    .use(requirePermission("rbac:roles:assign_permission"))
    .input(z.object({
      roleId: z.number(),
      permissionIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Validate role exists
        const role = await db
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        if (role.length === 0) {
          throw new Error(`Role with ID ${input.roleId} not found`);
        }

        // BUG-120 FIX: Only validate permissions if array is non-empty (empty array crashes inArray)
        if (input.permissionIds.length > 0) {
          // Validate all permissions exist
          const existingPermissions = await db
            .select({ id: permissions.id })
            .from(permissions)
            .where(inArray(permissions.id, input.permissionIds));

          if (existingPermissions.length !== input.permissionIds.length) {
            throw new Error("One or more permission IDs are invalid");
          }
        }

        // Delete all current permission assignments
        await db
          .delete(rolePermissions)
          .where(eq(rolePermissions.roleId, input.roleId));

        // Insert new permission assignments
        if (input.permissionIds.length > 0) {
          await db.insert(rolePermissions).values(
            input.permissionIds.map(permissionId => ({
              roleId: input.roleId,
              permissionId,
            }))
          );
        }

        // Clear permission cache for all users with this role
        clearPermissionCache();

        logger.info({ 
          msg: "Role permissions replaced", 
          roleId: input.roleId,
          roleName: role[0].name,
          newPermissionIds: input.permissionIds,
          replacedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Role "${role[0].name}" permissions updated to ${input.permissionIds.length} permission(s)`,
        };
      } catch (error) {
        logger.error({ msg: "Error replacing role permissions", roleId: input.roleId, error });
        throw error;
      }
    }),
});
