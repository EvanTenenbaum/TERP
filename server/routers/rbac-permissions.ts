import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { 
  permissions, 
  rolePermissions,
  roles,
  userPermissionOverrides 
} from "../../drizzle/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { logger } from "../_core/logger";

/**
 * RBAC Permissions Router
 * 
 * This router provides endpoints for managing permissions and viewing permission assignments.
 * All endpoints require appropriate RBAC permissions.
 */

export const rbacPermissionsRouter = router({
  /**
   * List all permissions with optional filtering by module
   * Requires: rbac:permissions:read permission
   */
  list: protectedProcedure
    .use(requirePermission("rbac:permissions:read"))
    .input(z.object({
      limit: z.number().optional().default(500),
      offset: z.number().optional().default(0),
      module: z.string().optional(),
      search: z.string().optional(),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });


        
        // Build query - use conditional where clause
        const permissionRecords = input.module
          ? await db
              .select({
                id: permissions.id,
                name: permissions.name,
                description: permissions.description,
                module: permissions.module,
                createdAt: permissions.createdAt,
              })
              .from(permissions)
              .where(eq(permissions.module, input.module))
              .limit(input.limit)
              .offset(input.offset)
          : await db
              .select({
                id: permissions.id,
                name: permissions.name,
                description: permissions.description,
                module: permissions.module,
                createdAt: permissions.createdAt,
              })
              .from(permissions)
              .limit(input.limit)
              .offset(input.offset);

        // Filter by search term if specified (client-side for simplicity)
        let filteredPermissions = permissionRecords;
        if (input.search) {
          const searchLower = input.search.toLowerCase();
          filteredPermissions = permissionRecords.filter(p => 
            p.name.toLowerCase().includes(searchLower) ||
            (p.description?.toLowerCase() || '').includes(searchLower)
          );
        }

        // FEAT-022: Get role names for each permission instead of just counts
        const permissionIds = filteredPermissions.map(p => p.id);

        // Get role details for each permission
        const roleAssignments = permissionIds.length > 0
          ? await db
              .select({
                permissionId: rolePermissions.permissionId,
                roleId: roles.id,
                roleName: roles.name,
              })
              .from(rolePermissions)
              .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
              .where(inArray(rolePermissions.permissionId, permissionIds))
          : [];

        // Group role names by permission ID
        const rolesByPermission = new Map<number, { roleId: number; roleName: string }[]>();
        for (const ra of roleAssignments) {
          if (!rolesByPermission.has(ra.permissionId)) {
            rolesByPermission.set(ra.permissionId, []);
          }
          rolesByPermission.get(ra.permissionId)!.push({
            roleId: ra.roleId,
            roleName: ra.roleName,
          });
        }

        const permissionsWithCounts = filteredPermissions.map(permission => {
          const permRoles = rolesByPermission.get(permission.id) || [];
          return {
            ...permission,
            roleCount: permRoles.length,
            // FEAT-022: Include role names for display
            roleNames: permRoles.map(r => r.roleName),
            roles: permRoles,
          };
        });

        logger.info({ 
          msg: "Listed permissions", 
          count: permissionsWithCounts.length,
          module: input.module,
        });

        return {
          permissions: permissionsWithCounts,
          total: permissionsWithCounts.length,
        };
      } catch (error) {
        logger.error({ msg: "Error listing permissions", error });
        throw error;
      }
    }),

  /**
   * Get all unique modules
   * Requires: rbac:permissions:read permission
   */
  getModules: protectedProcedure
    .use(requirePermission("rbac:permissions:read"))
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });


        const modules = await db
          .selectDistinct({
            module: permissions.module,
          })
          .from(permissions)
          .orderBy(permissions.module);

        logger.info({ 
          msg: "Retrieved permission modules", 
          count: modules.length 
        });

        return {
          modules: modules.map(m => m.module),
        };
      } catch (error) {
        logger.error({ msg: "Error getting permission modules", error });
        throw error;
      }
    }),

  /**
   * Get a specific permission with its role assignments
   * Requires: rbac:permissions:read permission
   */
  getById: protectedProcedure
    .use(requirePermission("rbac:permissions:read"))
    .input(z.object({ permissionId: z.number() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });


        // Get permission details
        const permission = await db
          .select({
            id: permissions.id,
            name: permissions.name,
            description: permissions.description,
            module: permissions.module,
            createdAt: permissions.createdAt,
          })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        if (permission.length === 0) {
          throw new Error(`Permission with ID ${input.permissionId} not found`);
        }

        // Get roles that have this permission
        const roleRecords = await db
          .select({
            roleId: rolePermissions.roleId,
            roleName: roles.name,
            roleDescription: roles.description,
            isSystemRole: roles.isSystemRole,
            assignedAt: rolePermissions.createdAt,
          })
          .from(rolePermissions)
          .innerJoin(roles, eq(rolePermissions.roleId, roles.id))
          .where(eq(rolePermissions.permissionId, input.permissionId));

        // Get user override count
        const overrideCount = await db
          .select({
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(userPermissionOverrides)
          .where(eq(userPermissionOverrides.permissionId, input.permissionId));

        logger.info({ 
          msg: "Retrieved permission details", 
          permissionId: input.permissionId,
          roleCount: roleRecords.length,
        });

        return {
          ...permission[0],
          roles: roleRecords.map(r => ({
            roleId: r.roleId,
            roleName: r.roleName,
            roleDescription: r.roleDescription,
            isSystemRole: r.isSystemRole === 1,
            assignedAt: r.assignedAt,
          })),
          userOverrideCount: Number(overrideCount[0]?.count || 0),
        };
      } catch (error) {
        logger.error({ msg: "Error getting permission details", permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Create a new custom permission
   * Requires: rbac:permissions:create permission
   */
  create: protectedProcedure
    .use(requirePermission("rbac:permissions:create"))
    .input(z.object({
      name: z.string().min(1).max(100),
      description: z.string().optional(),
      module: z.string().min(1).max(50),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // Check if permission name already exists
        const existing = await db
          .select({ id: permissions.id })
          .from(permissions)
          .where(eq(permissions.name, input.name))
          .limit(1);

        if (existing.length > 0) {
          throw new Error(`Permission with name "${input.name}" already exists`);
        }

        // Create permission
        const result = await db.insert(permissions).values({
          name: input.name,
          description: input.description || null,
          module: input.module,
        });

        const permissionId = Number(Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0);

        logger.info({ 
          msg: "Permission created", 
          permissionId,
          permissionName: input.name,
          module: input.module,
          createdBy: ctx.user?.id,
        });

        return {
          success: true,
          permissionId,
          message: `Permission "${input.name}" created successfully`,
        };
      } catch (error) {
        logger.error({ msg: "Error creating permission", permissionName: input.name, error });
        throw error;
      }
    }),

  /**
   * Update a permission's details
   * Requires: rbac:permissions:update permission
   */
  update: protectedProcedure
    .use(requirePermission("rbac:permissions:update"))
    .input(z.object({
      permissionId: z.number(),
      name: z.string().min(1).max(100).optional(),
      description: z.string().optional(),
      module: z.string().min(1).max(50).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // Check if permission exists
        const permission = await db
          .select({ 
            id: permissions.id, 
            name: permissions.name 
          })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        if (permission.length === 0) {
          throw new Error(`Permission with ID ${input.permissionId} not found`);
        }

        // If name is being changed, check for conflicts
        if (input.name && input.name !== permission[0].name) {
          const existing = await db
            .select({ id: permissions.id })
            .from(permissions)
            .where(eq(permissions.name, input.name))
            .limit(1);

          if (existing.length > 0) {
            throw new Error(`Permission with name "${input.name}" already exists`);
          }
        }

        // Update permission
        const updateData: any = {};
        if (input.name !== undefined) updateData.name = input.name;
        if (input.description !== undefined) updateData.description = input.description;
        if (input.module !== undefined) updateData.module = input.module;

        await db
          .update(permissions)
          .set(updateData)
          .where(eq(permissions.id, input.permissionId));

        logger.info({ 
          msg: "Permission updated", 
          permissionId: input.permissionId,
          updatedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Permission updated successfully`,
        };
      } catch (error) {
        logger.error({ msg: "Error updating permission", permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Delete a custom permission
   * Requires: rbac:permissions:delete permission
   */
  delete: protectedProcedure
    .use(requirePermission("rbac:permissions:delete"))
    .input(z.object({ permissionId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // Check if permission exists
        const permission = await db
          .select({ 
            id: permissions.id, 
            name: permissions.name 
          })
          .from(permissions)
          .where(eq(permissions.id, input.permissionId))
          .limit(1);

        if (permission.length === 0) {
          throw new Error(`Permission with ID ${input.permissionId} not found`);
        }

        // Delete permission (cascade will handle role_permissions and user_permission_overrides)
        await db
          .delete(permissions)
          .where(eq(permissions.id, input.permissionId));

        logger.info({ 
          msg: "Permission deleted", 
          permissionId: input.permissionId,
          permissionName: permission[0].name,
          deletedBy: ctx.user?.id,
        });

        return {
          success: true,
          message: `Permission "${permission[0].name}" deleted successfully`,
        };
      } catch (error) {
        logger.error({ msg: "Error deleting permission", permissionId: input.permissionId, error });
        throw error;
      }
    }),

  /**
   * Get permissions grouped by module
   * Requires: rbac:permissions:read permission
   */
  getByModule: protectedProcedure
    .use(requirePermission("rbac:permissions:read"))
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });


        // Get all permissions
        const allPermissions = await db
          .select({
            id: permissions.id,
            name: permissions.name,
            description: permissions.description,
            module: permissions.module,
            createdAt: permissions.createdAt,
          })
          .from(permissions)
          .orderBy(permissions.module, permissions.name);

        // Group by module
        const moduleMap = new Map<string, Array<{
          id: number;
          name: string;
          description: string | null;
          createdAt: Date;
        }>>();

        for (const perm of allPermissions) {
          if (!moduleMap.has(perm.module)) {
            moduleMap.set(perm.module, []);
          }
          moduleMap.get(perm.module)!.push({
            id: perm.id,
            name: perm.name,
            description: perm.description,
            createdAt: perm.createdAt,
          });
        }

        const groupedPermissions = Array.from(moduleMap.entries()).map(([module, perms]) => ({
          module,
          permissions: perms,
          count: perms.length,
        }));

        logger.info({ 
          msg: "Retrieved permissions grouped by module", 
          moduleCount: groupedPermissions.length,
          totalPermissions: allPermissions.length,
        });

        return {
          modules: groupedPermissions,
          totalPermissions: allPermissions.length,
        };
      } catch (error) {
        logger.error({ msg: "Error getting permissions by module", error });
        throw error;
      }
    }),

  /**
   * Search permissions by name or description
   * Requires: rbac:permissions:read permission
   */
  search: protectedProcedure
    .use(requirePermission("rbac:permissions:read"))
    .input(z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });


        // Get all permissions (we'll filter client-side for simplicity)
        const allPermissions = await db
          .select({
            id: permissions.id,
            name: permissions.name,
            description: permissions.description,
            module: permissions.module,
            createdAt: permissions.createdAt,
          })
          .from(permissions);

        // Filter by search query
        const queryLower = input.query.toLowerCase();
        const filteredPermissions = allPermissions
          .filter(p => 
            p.name.toLowerCase().includes(queryLower) ||
            (p.description?.toLowerCase() || '').includes(queryLower) ||
            p.module.toLowerCase().includes(queryLower)
          )
          .slice(0, input.limit);

        logger.info({ 
          msg: "Searched permissions", 
          query: input.query,
          resultCount: filteredPermissions.length,
        });

        return {
          permissions: filteredPermissions,
          total: filteredPermissions.length,
        };
      } catch (error) {
        logger.error({ msg: "Error searching permissions", query: input.query, error });
        throw error;
      }
    }),

  /**
   * Get permission statistics
   * Requires: rbac:permissions:read permission
   */
  getStats: protectedProcedure
    .use(requirePermission("rbac:permissions:read"))
    .query(async () => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });


        // Total permissions
        const totalPermissions = await db
          .select({
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(permissions);

        // Permissions by module
        const permissionsByModule = await db
          .select({
            module: permissions.module,
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(permissions)
          .groupBy(permissions.module);

        // Most assigned permissions
        const mostAssignedPermissions = await db
          .select({
            permissionId: rolePermissions.permissionId,
            permissionName: permissions.name,
            count: sql<number>`COUNT(*)`.as('count'),
          })
          .from(rolePermissions)
          .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
          .groupBy(rolePermissions.permissionId, permissions.name)
          .orderBy(sql`COUNT(*) DESC`)
          .limit(10);

        logger.info({ 
          msg: "Retrieved permission statistics", 
        });

        return {
          totalPermissions: Number(totalPermissions[0]?.count || 0),
          permissionsByModule: permissionsByModule.map(m => ({
            module: m.module,
            count: Number(m.count),
          })),
          mostAssignedPermissions: mostAssignedPermissions.map(p => ({
            permissionId: p.permissionId,
            permissionName: p.permissionName,
            assignmentCount: Number(p.count),
          })),
        };
      } catch (error) {
        logger.error({ msg: "Error getting permission statistics", error });
        throw error;
      }
    }),
});
