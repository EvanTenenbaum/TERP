import { getDb } from "../db";
import {
  roles,
  permissions,
  rolePermissions,
  userRoles,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

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
function getPermissionIds(permissionNames: string[], allPermissions: any[]) {
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
    console.log("⏭️  SKIP_SEEDING is set - skipping RBAC seeding");
    return;
  }

  console.log("🌱 Seeding RBAC defaults...");

  const db = await getDb();
  if (!db) {
    console.warn("Database not available, skipping RBAC seeding");
    return;
  }

  try {
    // Check if RBAC is already seeded
    const existingRoles = await db.select().from(roles).limit(1);
    if (existingRoles.length > 0) {
      console.log("✅ RBAC already seeded, skipping...");
      return;
    }

    // 1. Insert permissions
    console.log("📝 Inserting 255 permissions...");
    await db.insert(permissions).values(PERMISSIONS);
    const allPermissions = await db.select().from(permissions);
    console.log(`✅ Inserted ${allPermissions.length} permissions`);

    // 2. Insert roles
    console.log("👥 Inserting 10 roles...");
    await db.insert(roles).values(ROLES);
    const allRoles = await db.select().from(roles);
    console.log(`✅ Inserted ${allRoles.length} roles`);

    // 3. Create role-permission mappings
    console.log("🔗 Creating role-permission mappings...");

    for (const mapping of ROLE_PERMISSION_MAPPINGS) {
      const role = allRoles.find(r => r.name === mapping.roleName);
      if (!role) {
        console.error(`❌ Role not found: ${mapping.roleName}`);
        continue;
      }

      const permissionIds = getPermissionIds(
        mapping.permissionNames,
        allPermissions
      );

      const rolePermissionRecords = permissionIds.map(permissionId => ({
        roleId: role.id,
        permissionId,
      }));

      await db.insert(rolePermissions).values(rolePermissionRecords);
      console.log(
        `✅ Mapped ${permissionIds.length} permissions to ${mapping.roleName}`
      );
    }

    console.log("✅ RBAC defaults seeded successfully!");
  } catch (error) {
    // Log the error but DON'T throw - RBAC seeding failure should not crash the server
    // This is critical for deployment health checks to succeed
    console.error(
      "❌ Error seeding RBAC defaults (non-fatal, server will continue):",
      error
    );
    console.warn("⚠️ RBAC may be incomplete - some permission checks may fail");
  }
}

/**
 * Assign a role to a user by openId
 * @param userOpenId - The user's openId (from users.openId)
 * @param roleName - The name of the role to assign (e.g., "Super Admin")
 */
export async function assignRoleToUser(userOpenId: string, roleName: string) {
  console.log(`🔑 Assigning role "${roleName}" to user ${userOpenId}...`);

  const db = await getDb();
  if (!db) {
    console.warn("Database not available, skipping role assignment");
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
      console.error(`❌ Role not found: ${roleName}`);
      return;
    }

    // Check if user already has this role
    const existingAssignment = await db
      .select()
      .from(userRoles)
      .where(eq(userRoles.userId, userOpenId))
      .limit(1);

    if (existingAssignment.length > 0) {
      console.log(`✅ User already has role "${roleName}", skipping...`);
      return;
    }

    // Assign the role
    await db.insert(userRoles).values({
      userId: userOpenId,
      roleId: role.id,
    });

    console.log(
      `✅ Successfully assigned role "${roleName}" to user ${userOpenId}`
    );
  } catch (error) {
    // Log the error but DON'T throw - role assignment failure should not crash the server
    console.error(`❌ Error assigning role to user (non-fatal):`, error);
    console.warn(`⚠️ User ${userOpenId} may not have the expected permissions`);
  }
}
