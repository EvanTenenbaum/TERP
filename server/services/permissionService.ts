import { getDb } from "../db";
import { 
  roles, 
  permissions, 
  rolePermissions, 
  userRoles, 
  userPermissionOverrides,
  users
} from "../../drizzle/schema";
import { eq, and, inArray } from "drizzle-orm";
import { logger } from "../_core/logger";

/**
 * Permission Service
 * 
 * This service provides functions for checking user permissions against the RBAC system.
 * It implements caching for performance and supports per-user permission overrides.
 * 
 * FIX-001: Added fallback for admin users with no roles assigned.
 * This ensures the initial admin user can access the system before RBAC roles are seeded.
 */

// In-memory cache for user permissions with automatic cleanup
// Key: userId, Value: { permissions: Set<string>, timestamp: number }
const permissionCache = new Map<string, { permissions: Set<string>; timestamp: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const MAX_PERMISSION_CACHE_SIZE = 50; // Prevent unbounded growth

// Cleanup expired permission cache entries
function cleanupExpiredPermissionCache() {
  const now = Date.now();
  const expiredKeys: string[] = [];
  
  for (const [key, entry] of permissionCache.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      expiredKeys.push(key);
    }
  }
  
  expiredKeys.forEach(key => permissionCache.delete(key));
  
  // If still too large, remove oldest entries
  if (permissionCache.size > MAX_PERMISSION_CACHE_SIZE) {
    const entries = Array.from(permissionCache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    const toRemove = entries.slice(0, permissionCache.size - MAX_PERMISSION_CACHE_SIZE);
    toRemove.forEach(([key]) => permissionCache.delete(key));
  }
}

// Run cleanup every 2 minutes
setInterval(cleanupExpiredPermissionCache, 2 * 60 * 1000);

/**
 * Clear the permission cache for a specific user or all users
 */
export function clearPermissionCache(userId?: string) {
  if (userId) {
    permissionCache.delete(userId);
    logger.info({ msg: "Permission cache cleared for user", userId });
  } else {
    permissionCache.clear();
    logger.info({ msg: "Permission cache cleared for all users" });
  }
}

/**
 * FIX-001: Check if a user is an admin in the users table
 * This is a fallback for users who have admin role but no RBAC roles assigned yet.
 */
async function isUserAdmin(userId: string): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    
    // Check if the user has admin role in the users table
    const userRecord = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.openId, userId))
      .limit(1);
    
    if (userRecord.length > 0 && userRecord[0].role === 'admin') {
      logger.info({ msg: "User is admin in users table (fallback check)", userId });
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error({ msg: "Error checking user admin status", userId, error });
    return false;
  }
}

/**
 * FIX-001: Get all permissions from the database
 * Used as a fallback for admin users with no RBAC roles assigned.
 */
async function getAllPermissions(): Promise<Set<string>> {
  try {
    const db = await getDb();
    if (!db) return new Set<string>();
    
    const allPermissions = await db
      .select({ name: permissions.name })
      .from(permissions);
    
    return new Set(allPermissions.map(p => p.name));
  } catch (error) {
    logger.error({ msg: "Error fetching all permissions", error });
    return new Set<string>();
  }
}

/**
 * Get all permissions for a user
 * This function checks:
 * 1. User's assigned roles and their permissions
 * 2. User-specific permission overrides (grants and revocations)
 * 3. FIX-001: Fallback for admin users with no RBAC roles
 * 
 * Results are cached for performance.
 */
export async function getUserPermissions(userId: string): Promise<Set<string>> {
  // Check cache first
  const cached = permissionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    logger.debug({ msg: "Permission cache hit", userId });
    return cached.permissions;
  }

  logger.debug({ msg: "Permission cache miss, fetching from database", userId });

  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    // 1. Get user's roles
    const userRoleRecords = await db
      .select({
        roleId: userRoles.roleId,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    if (userRoleRecords.length === 0) {
      logger.warn({ msg: "User has no roles assigned", userId });
      
      // FIX-001: Check if user is an admin in the users table
      // This is a fallback for the initial admin user before RBAC roles are seeded
      const isAdmin = await isUserAdmin(userId);
      if (isAdmin) {
        logger.info({ 
          msg: "FIX-001: Granting all permissions to admin user with no RBAC roles", 
          userId 
        });
        
        // Grant all permissions to admin users
        const allPermissions = await getAllPermissions();
        
        // Cache the result
        permissionCache.set(userId, { permissions: allPermissions, timestamp: Date.now() });
        
        logger.info({ 
          msg: "Admin user granted all permissions (fallback)", 
          userId, 
          permissionCount: allPermissions.size 
        });
        
        return allPermissions;
      }
      
      // User has no roles and is not an admin, return empty set
      const emptySet = new Set<string>();
      permissionCache.set(userId, { permissions: emptySet, timestamp: Date.now() });
      return emptySet;
    }

    const roleIds = userRoleRecords.map((r) => r.roleId);

    // 2. Get permissions for those roles
    const rolePermissionRecords = await db
      .select({
        permissionId: rolePermissions.permissionId,
      })
      .from(rolePermissions)
      .where(inArray(rolePermissions.roleId, roleIds));

    const permissionIds = rolePermissionRecords.map((rp) => rp.permissionId);

    // 3. Get permission names
    const permissionRecords = await db
      .select({
        name: permissions.name,
      })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));

    const userPermissions = new Set(permissionRecords.map((p) => p.name));

    // 4. Apply user-specific permission overrides
    const overrideRecords = await db
      .select({
        permissionId: userPermissionOverrides.permissionId,
        granted: userPermissionOverrides.granted,
      })
      .from(userPermissionOverrides)
      .where(eq(userPermissionOverrides.userId, userId));

    if (overrideRecords.length > 0) {
      const overridePermissionIds = overrideRecords.map((o) => o.permissionId);
      const overridePermissionRecords = await db
        .select({
          id: permissions.id,
          name: permissions.name,
        })
        .from(permissions)
        .where(inArray(permissions.id, overridePermissionIds));

      for (const override of overrideRecords) {
        const permission = overridePermissionRecords.find((p) => p.id === override.permissionId);
        if (permission) {
          if (override.granted === 1) {
            // Grant permission
            userPermissions.add(permission.name);
            logger.debug({ 
              msg: "Permission override: granted", 
              userId, 
              permission: permission.name 
            });
          } else {
            // Revoke permission
            userPermissions.delete(permission.name);
            logger.debug({ 
              msg: "Permission override: revoked", 
              userId, 
              permission: permission.name 
            });
          }
        }
      }
    }

    // Clean up before adding new entry if cache is getting large
    if (permissionCache.size >= MAX_PERMISSION_CACHE_SIZE) {
      cleanupExpiredPermissionCache();
    }
    
    // Cache the result
    permissionCache.set(userId, { permissions: userPermissions, timestamp: Date.now() });

    logger.info({ 
      msg: "User permissions loaded", 
      userId, 
      permissionCount: userPermissions.size 
    });

    return userPermissions;
  } catch (error) {
    logger.error({ msg: "Error fetching user permissions", userId, error });
    throw error;
  }
}

/**
 * Check if a user has a specific permission
 */
export async function hasPermission(userId: string, permissionName: string): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const hasIt = userPermissions.has(permissionName);
  
  logger.debug({ 
    msg: "Permission check", 
    userId, 
    permission: permissionName, 
    result: hasIt 
  });
  
  return hasIt;
}

/**
 * Check if a user has ALL of the specified permissions
 */
export async function hasAllPermissions(
  userId: string, 
  permissionNames: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const hasAll = permissionNames.every((p) => userPermissions.has(p));
  
  logger.debug({ 
    msg: "Multiple permission check (AND)", 
    userId, 
    permissions: permissionNames, 
    result: hasAll 
  });
  
  return hasAll;
}

/**
 * Check if a user has ANY of the specified permissions
 */
export async function hasAnyPermission(
  userId: string, 
  permissionNames: string[]
): Promise<boolean> {
  const userPermissions = await getUserPermissions(userId);
  const hasAny = permissionNames.some((p) => userPermissions.has(p));
  
  logger.debug({ 
    msg: "Multiple permission check (OR)", 
    userId, 
    permissions: permissionNames, 
    result: hasAny 
  });
  
  return hasAny;
}

/**
 * Get all roles for a user
 */
export async function getUserRoles(userId: string): Promise<Array<{ id: number; name: string; description: string | null }>> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const userRoleRecords = await db
      .select({
        roleId: userRoles.roleId,
      })
      .from(userRoles)
      .where(eq(userRoles.userId, userId));

    if (userRoleRecords.length === 0) {
      return [];
    }

    const roleIds = userRoleRecords.map((r) => r.roleId);

    const roleRecords = await db
      .select({
        id: roles.id,
        name: roles.name,
        description: roles.description,
      })
      .from(roles)
      .where(inArray(roles.id, roleIds));

    return roleRecords;
  } catch (error) {
    logger.error({ msg: "Error fetching user roles", userId, error });
    throw error;
  }
}

/**
 * Check if a user is a Super Admin
 * Super Admins have unrestricted access to the entire system
 * 
 * FIX-001: Also checks if user is an admin in the users table as fallback
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  // First check RBAC roles
  const userRolesList = await getUserRoles(userId);
  const isSA = userRolesList.some((role) => role.name === "Super Admin");
  
  if (isSA) {
    logger.debug({ 
      msg: "Super Admin check (via RBAC role)", 
      userId, 
      result: true 
    });
    return true;
  }
  
  // FIX-001: Fallback - check if user is admin in users table
  const isAdmin = await isUserAdmin(userId);
  if (isAdmin) {
    logger.debug({ 
      msg: "Super Admin check (via users.role fallback)", 
      userId, 
      result: true 
    });
    return true;
  }
  
  logger.debug({ 
    msg: "Super Admin check", 
    userId, 
    result: false 
  });
  
  return false;
}
