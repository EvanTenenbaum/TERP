import { getDb } from "../db";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { logger } from "../_core/logger";

/**
 * RBAC Seeding Service
 *
 * This module provides functions to seed RBAC roles, permissions, and mappings.
 * It's designed to be idempotent and safe to call multiple times.
 */

// Import role and permission definitions from the original seed script
import {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSION_MAPPINGS,
} from "./rbacDefinitions";

/**
 * Helper function to get permission IDs by names
 */
function getPermissionIds(permissionNames: string[], allPermissions: Array<{ name: string; id: number }>) {
  return allPermissions
    .filter(p => permissionNames.includes(p.name))
    .map(p => p.id);
}

/**
 * Seed RBAC roles, permissions, and role-permission mappings
 * This is idempotent - safe to call multiple times
 *
 * Can be bypassed by setting SKIP_SEEDING=true environment variable.
 */
export async function seedRBACDefaults() {
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    logger.info("⏭️  SKIP_SEEDING is set - skipping RBAC seeding");
    return;
  }

  logger.info("🌱 Seeding RBAC defaults...");

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping RBAC seeding");
    return;
  }

  try {
    const existingRoles = await db.select().from(roles);
    const existingRoleNames = new Set(existingRoles.map(role => role.name));
    const missingRoles = ROLES.filter(role => !existingRoleNames.has(role.name));

    const existingPermissions = await db.select().from(permissions);
    const existingPermissionNames = new Set(
      existingPermissions.map(permission => permission.name)
    );
    const missingPermissions = PERMISSIONS.filter(
      permission => !existingPermissionNames.has(permission.name)
    );

    if (missingPermissions.length > 0) {
      logger.info(`📝 Inserting ${missingPermissions.length} missing permissions...`);
      await db.insert(permissions).values(missingPermissions);
    }

    if (missingRoles.length > 0) {
      logger.info(`👥 Inserting ${missingRoles.length} missing roles...`);
      await db.insert(roles).values(missingRoles);
    }

    const allPermissions = await db.select().from(permissions);
    const allRoles = await db.select().from(roles);
    logger.info(
      `✅ RBAC definitions available: ${allRoles.length} roles, ${allPermissions.length} permissions`
    );

    const existingMappings = await db.select().from(rolePermissions);
    const existingMappingKeys = new Set(
      existingMappings.map(mapping => `${mapping.roleId}:${mapping.permissionId}`)
    );

    // Create any missing role-permission mappings without duplicating existing ones.
    logger.info("🔗 Reconciling role-permission mappings...");

    for (const mapping of ROLE_PERMISSION_MAPPINGS) {
      const role = allRoles.find(r => r.name === mapping.roleName);
      if (!role) {
        logger.error(`❌ Role not found: ${mapping.roleName}`);
        continue;
      }

      const permissionIds = getPermissionIds(
        mapping.permissionNames,
        allPermissions
      );

      const rolePermissionRecords = permissionIds
        .filter(permissionId => !existingMappingKeys.has(`${role.id}:${permissionId}`))
        .map(permissionId => ({
          roleId: role.id,
          permissionId,
        }));

      if (rolePermissionRecords.length > 0) {
        await db.insert(rolePermissions).values(rolePermissionRecords);
        for (const record of rolePermissionRecords) {
          existingMappingKeys.add(`${record.roleId}:${record.permissionId}`);
        }
      }

      logger.info(
        `✅ ${mapping.roleName}: ${permissionIds.length} required permissions, ${rolePermissionRecords.length} inserted`
      );
    }

    logger.info("✅ RBAC defaults reconciled successfully!");
  } catch (error) {
    // Log the error but DON'T throw - RBAC seeding failure should not crash the server
    // This is critical for deployment health checks to succeed
    logger.error({
      msg: "Error seeding RBAC defaults (non-fatal, server will continue)",
      error: error instanceof Error ? error.message : String(error),
    });
    logger.warn("⚠️ RBAC may be incomplete - some permission checks may fail");
  }
}

/**
 * Assign a role to a user by openId
 * @param userOpenId - The user's openId (from users.openId)
 * @param roleName - The name of the role to assign (e.g., "Super Admin")
 */
export async function assignRoleToUser(userOpenId: string, roleName: string) {
  logger.info(`🔑 Assigning role "${roleName}" to user ${userOpenId}...`);

  const db = await getDb();
  if (!db) {
    logger.warn("Database not available, skipping role assignment");
    return;
  }

  try {
    // Find the role by name
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (!role) {
      logger.error(`❌ Role not found: ${roleName}`);
      return;
    }

    // Check if user already has this role
    const existingAssignment = await db
      .select()
      .from(userRoles)
      .where(and(eq(userRoles.userId, userOpenId), eq(userRoles.roleId, role.id)))
      .limit(1);

    if (existingAssignment.length > 0) {
      logger.info(`✅ User already has role "${roleName}", skipping...`);
      return;
    }

    // Assign the role
    await db.insert(userRoles).values({
      userId: userOpenId,
      roleId: role.id,
    });

    logger.info(
      `✅ Successfully assigned role "${roleName}" to user ${userOpenId}`
    );
  } catch (error) {
    // Log the error and re-throw so the caller can decide how to handle it
    logger.error({ msg: "Error assigning role to user", error: error instanceof Error ? error.message : String(error) });
    logger.warn(`⚠️ User ${userOpenId} may not have the expected permissions`);
    throw error; // Re-throw the error
  }
}
