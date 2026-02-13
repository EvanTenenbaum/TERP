import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission, requireAnyPermission } from "../_core/permissionMiddleware";


import { getDb } from "../db";
import { 
  userRoles, 
  roles, 
  userPermissionOverrides, 
  permissions,
  rolePermissions
} from "../../drizzle/schema";
import { eq, inArray, and } from "drizzle-orm";
import { logger } from "../_core/logger";
import { clearPermissionCache } from "../services/permissionService";

/**
 * RBAC Users Router
 * 
 * This router provides endpoints for managing user role assignments and permission overrides.
 * All endpoints require appropriate RBAC permissions.
 */

export const rbacUsersRouter = router({
  /**
   * List all users with their assigned roles
   * Requires: rbac:users:read permission
   */
  list: protectedProcedure
    .use(requirePermission("rbac:users:read"))
    .input(z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");


        // Get all user-role assignments
        const userRoleRecords = await db
          .select({
            userId: userRoles.userId,
            roleId: userRoles.roleId,
            roleName: roles.name,
            roleDescription: roles.description,
            assignedAt: userRoles.assignedAt,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .limit(input.limit)
          .offset(input.offset);

        // Group by user
        const userMap = new Map<string, {
          userId: string;
          roles: Array<{
            roleId: number;
            roleName: string;
            roleDescription: string | null;
            assignedAt: Date;
          }>;
        }>();

        for (const record of userRoleRecords) {
          let userEntry = userMap.get(record.userId);
          if (!userEntry) {
            userEntry = {
              userId: record.userId,
              roles: [],
            };
            userMap.set(record.userId, userEntry);
          }
          userEntry.roles.push({
            roleId: record.roleId,
            roleName: record.roleName,
            roleDescription: record.roleDescription,
            assignedAt: record.assignedAt,
          });
        }

        const users = Array.from(userMap.values());

        logger.info({ 
          msg: "Listed users with roles", 
          count: users.length 
        });

        return {
          users,
          total: users.length,
        };
      } catch (error) {
        logger.error({ msg: "Error listing users", error });
        throw error;
      }
    }),

  /**
   * Get a specific user's roles and permissions
   * Requires: rbac:users:read permission
   */
  getById: protectedProcedure
    .use(requirePermission("rbac:users:read"))
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");


        // Get user's roles
        const userRoleRecords = await db
          .select({
            roleId: userRoles.roleId,
            roleName: roles.name,
            roleDescription: roles.description,
            assignedAt: userRoles.assignedAt,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, input.userId));

        // Get user's permission overrides
        const overrideRecords = await db
          .select({
            permissionId: userPermissionOverrides.permissionId,
            permissionName: permissions.name,
            permissionDescription: permissions.description,
            granted: userPermissionOverrides.granted,
            grantedAt: userPermissionOverrides.grantedAt,
          })
          .from(userPermissionOverrides)
          .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id))
          .where(eq(userPermissionOverrides.userId, input.userId));

        logger.info({ 
          msg: "Retrieved user details", 
          userId: input.userId,
          roleCount: userRoleRecords.length,
          overrideCount: overrideRecords.length,
        });

        return {
          userId: input.userId,
          roles: userRoleRecords.map(r => ({
            roleId: r.roleId,
            roleName: r.roleName,
            roleDescription: r.roleDescription,
            assignedAt: r.assignedAt,
          })),
          permissionOverrides: overrideRecords.map(o => ({
            permissionId: o.permissionId,
            permissionName: o.permissionName,
            permissionDescription: o.permissionDescription,
            granted: o.granted === 1,
            createdAt: o.grantedAt,
          })),
        };
      } catch (error) {
        logger.error({ msg: "Error getting user details", userId: input.userId, error });
        throw error;
      }
    }),

  /**
   * Assign a role to a user
   * Requires: rbac:users:assign_role permission
   */
  assignRole: protectedProcedure
    .use(requirePermission("rbac:users:assign_role"))
    .input(z.object({
      userId: z.string(),
      roleId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Check if role exists
        const role = await db
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        if (role.length === 0) {
          throw new Error(`Role with ID ${input.roleId} not found`);
        }

        // Check if user already has this role
        const existing = await db
          .select({ userId: userRoles.userId })
          .from(userRoles)
          .where(and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId)
          ))
          .limit(1);

        if (existing.length > 0) {
          throw new Error(`User already has role ${role[0].name}`);
        }

        // Assign role
        await db.insert(userRoles).values({
          userId: input.userId,
          roleId: input.roleId,
        });

        // Clear permission cache for this user
        clearPermissionCache(input.userId);

        logger.info({ 
          msg: "Role assigned to user", 
          userId: input.userId,
          roleId: input.roleId,
          roleName: role[0].name,
          assignedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Role ${role[0].name} assigned to user`,
        };
      } catch (error) {
        logger.error({ msg: "Error assigning role", userId: input.userId, roleId: input.roleId, error });
        throw error;
      }
    }),

  /**
   * Remove a role from a user
   * Requires: rbac:users:remove_role permission
   */
  removeRole: protectedProcedure
    .use(requirePermission("rbac:users:remove_role"))
    .input(z.object({
      userId: z.string(),
      roleId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Get role name for logging
        const role = await db
          .select({ name: roles.name })
          .from(roles)
          .where(eq(roles.id, input.roleId))
          .limit(1);

        // Remove role assignment
        const result = await db
          .delete(userRoles)
          .where(and(
            eq(userRoles.userId, input.userId),
            eq(userRoles.roleId, input.roleId)
          ));

        // Clear permission cache for this user
        clearPermissionCache(input.userId);

        logger.info({ 
          msg: "Role removed from user", 
          userId: input.userId,
          roleId: input.roleId,
          roleName: role[0]?.name,
          removedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Role ${role[0]?.name || input.roleId} removed from user`,
        };
      } catch (error) {
        logger.error({ msg: "Error removing role", userId: input.userId, roleId: input.roleId, error });
        throw error;
      }
    }),

  /**
   * Grant a permission override to a user
   * Requires: rbac:users:grant_permission permission
   */
  grantPermission: protectedProcedure
    .use(requirePermission("rbac:users:grant_permission"))
    .input(z.object({
      userId: z.string(),
      permissionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Check if permission exists
        const permission = await db
          .select({ id: permissions.id, name: permissions.name })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        if (permission.length === 0) {
          throw new Error(`Permission with ID ${input.permissionId} not found`);
        }

        // Insert or update permission override (grant)
        await db
          .insert(userPermissionOverrides)
          .values({
            userId: input.userId,
            permissionId: input.permissionId,
            granted: 1,
          })
          .onDuplicateKeyUpdate({
            set: { granted: 1 },
          });

        // Clear permission cache for this user
        clearPermissionCache(input.userId);

        logger.info({ 
          msg: "Permission granted to user", 
          userId: input.userId,
          permissionId: input.permissionId,
          permissionName: permission[0].name,
          grantedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Permission ${permission[0].name} granted to user`,
        };
      } catch (error) {
        logger.error({ msg: "Error granting permission", userId: input.userId, permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Revoke a permission override from a user
   * Requires: rbac:users:revoke_permission permission
   */
  revokePermission: protectedProcedure
    .use(requirePermission("rbac:users:revoke_permission"))
    .input(z.object({
      userId: z.string(),
      permissionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Check if permission exists
        const permission = await db
          .select({ id: permissions.id, name: permissions.name })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        if (permission.length === 0) {
          throw new Error(`Permission with ID ${input.permissionId} not found`);
        }

        // Insert or update permission override (revoke)
        await db
          .insert(userPermissionOverrides)
          .values({
            userId: input.userId,
            permissionId: input.permissionId,
            granted: 0,
          })
          .onDuplicateKeyUpdate({
            set: { granted: 0 },
          });

        // Clear permission cache for this user
        clearPermissionCache(input.userId);

        logger.info({ 
          msg: "Permission revoked from user", 
          userId: input.userId,
          permissionId: input.permissionId,
          permissionName: permission[0].name,
          revokedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Permission ${permission[0].name} revoked from user`,
        };
      } catch (error) {
        logger.error({ msg: "Error revoking permission", userId: input.userId, permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Remove a permission override from a user (delete the override entirely)
   * Requires: rbac:users:remove_permission_override permission
   */
  removePermissionOverride: protectedProcedure
    .use(requirePermission("rbac:users:remove_permission_override"))
    .input(z.object({
      userId: z.string(),
      permissionId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        // Get permission name for logging
        const permission = await db
          .select({ name: permissions.name })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        // Delete permission override
        await db
          .delete(userPermissionOverrides)
          .where(and(
            eq(userPermissionOverrides.userId, input.userId),
            eq(userPermissionOverrides.permissionId, input.permissionId)
          ));

        // Clear permission cache for this user
        clearPermissionCache(input.userId);

        logger.info({ 
          msg: "Permission override removed from user", 
          userId: input.userId,
          permissionId: input.permissionId,
          permissionName: permission[0]?.name,
          removedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Permission override for ${permission[0]?.name || input.permissionId} removed from user`,
        };
      } catch (error) {
        logger.error({ msg: "Error removing permission override", userId: input.userId, permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Bulk assign roles to a user
   * Requires: rbac:users:assign_role permission
   */
  bulkAssignRoles: protectedProcedure
    .use(requirePermission("rbac:users:assign_role"))
    .input(z.object({
      userId: z.string(),
      roleIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // BUG-120 FIX: Return early if no roles to assign (empty array crashes inArray)
        if (input.roleIds.length === 0) {
          return {
            success: true,
            message: `No roles to assign to user`,
            assignedCount: 0,
          };
        }

        // Validate all roles exist
        const existingRoles = await db
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(inArray(roles.id, input.roleIds));

        if (existingRoles.length !== input.roleIds.length) {
          throw new Error("One or more role IDs are invalid");
        }

        // Get currently assigned roles
        const currentRoles = await db
          .select({ roleId: userRoles.roleId })
          .from(userRoles)
          .where(eq(userRoles.userId, input.userId));

        const currentRoleIds = new Set(currentRoles.map(r => r.roleId));
        const newRoleIds = input.roleIds.filter(id => !currentRoleIds.has(id));

        // Insert new role assignments
        if (newRoleIds.length > 0) {
          await db.insert(userRoles).values(
            newRoleIds.map(roleId => ({
              userId: input.userId,
              roleId,
            }))
          );
        }

        // Clear permission cache for this user
        clearPermissionCache(input.userId);

        logger.info({ 
          msg: "Bulk roles assigned to user", 
          userId: input.userId,
          roleIds: newRoleIds,
          assignedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `${newRoleIds.length} role(s) assigned to user`,
          assignedCount: newRoleIds.length,
        };
      } catch (error) {
        logger.error({ msg: "Error bulk assigning roles", userId: input.userId, error });
        throw error;
      }
    }),

  /**
   * Replace all roles for a user
   * Requires: rbac:users:assign_role and rbac:users:remove_role permissions
   */
  replaceRoles: protectedProcedure
    .use(requireAnyPermission(["rbac:users:assign_role", "rbac:users:remove_role"]))
    .input(z.object({
      userId: z.string(),
      roleIds: z.array(z.number()),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // BUG-120 FIX: Only validate roles if array is non-empty (empty array crashes inArray)
        if (input.roleIds.length > 0) {
          // Validate all roles exist
          const existingRoles = await db
            .select({ id: roles.id, name: roles.name })
            .from(roles)
            .where(inArray(roles.id, input.roleIds));

          if (existingRoles.length !== input.roleIds.length) {
            throw new Error("One or more role IDs are invalid");
          }
        }

        // Delete all current role assignments
        await db
          .delete(userRoles)
          .where(eq(userRoles.userId, input.userId));

        // Insert new role assignments
        if (input.roleIds.length > 0) {
          await db.insert(userRoles).values(
            input.roleIds.map(roleId => ({
              userId: input.userId,
              roleId,
            }))
          );
        }

        // Clear permission cache for this user
        clearPermissionCache(input.userId);

        logger.info({ 
          msg: "User roles replaced", 
          userId: input.userId,
          newRoleIds: input.roleIds,
          replacedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `User roles updated to ${input.roleIds.length} role(s)`,
        };
      } catch (error) {
        logger.error({ msg: "Error replacing user roles", userId: input.userId, error });
        throw error;
      }
    }),

  /**
   * Get current user's permissions
   * Requires authentication - returns the authenticated user's permissions
   */
  getMyPermissions: protectedProcedure
    .query(async ({ ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        
        // Authentication is enforced by protectedProcedure
        const userId = String(ctx.user.id);

        // Check if user is Super Admin (check by role name since isSuperAdmin column doesn't exist)
        const userRoleRecords = await db
          .select({
            roleId: userRoles.roleId,
            roleName: roles.name,
          })
          .from(userRoles)
          .innerJoin(roles, eq(userRoles.roleId, roles.id))
          .where(eq(userRoles.userId, userId));

        const isSuperAdmin = userRoleRecords.some(r => r.roleName === 'Super Admin');

        // If Super Admin, return all permissions
        if (isSuperAdmin) {
          const allPermissions = await db
            .select({ name: permissions.name })
            .from(permissions);
          
          return {
            userId,
            isSuperAdmin: true,
            permissions: allPermissions.map(p => p.name),
            roles: userRoleRecords.map(r => r.roleName),
          };
        }

        // Get permissions from roles
        const roleIds = userRoleRecords.map(r => r.roleId);
        const rolePerms = roleIds.length > 0
          ? await db
              .select({ permissionName: permissions.name })
              .from(rolePermissions)
              .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
              .where(inArray(rolePermissions.roleId, roleIds))
          : [];

        // Get permission overrides
        const overrides = await db
          .select({
            permissionName: permissions.name,
            granted: userPermissionOverrides.granted,
          })
          .from(userPermissionOverrides)
          .innerJoin(permissions, eq(userPermissionOverrides.permissionId, permissions.id))
          .where(eq(userPermissionOverrides.userId, userId));

        // Combine permissions
        const permissionSet = new Set<string>();
        
        // Add role permissions
        rolePerms.forEach(p => permissionSet.add(p.permissionName));
        
        // Apply overrides
        overrides.forEach(override => {
          if (override.granted) {
            permissionSet.add(override.permissionName);
          } else {
            permissionSet.delete(override.permissionName);
          }
        });

        return {
          userId,
          isSuperAdmin: false,
          permissions: Array.from(permissionSet),
          roles: userRoleRecords.map(r => r.roleName),
        };
      } catch (error) {
        logger.error({ msg: "Error getting user permissions", userId: ctx.user?.id, error });
        throw error;
      }
    }),
});
