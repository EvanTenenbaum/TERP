/**
 * FEATURE-012: VIP Portal Admin Access Tool - Post-Deployment Script
 *
 * This script performs all post-deployment tasks for FEATURE-012:
 * 1. Creates the admin_impersonation_sessions table
 * 2. Creates the admin_impersonation_actions table
 * 3. Seeds the new permissions (admin:impersonate, admin:impersonate:audit)
 * 4. Assigns permissions to Super Admin role
 *
 * Usage:
 *   npx tsx scripts/feature-012-deploy.ts
 */

import { getDb } from "../server/db";
import { permissions, roles, rolePermissions } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

async function main() {
  console.log("🚀 FEATURE-012: VIP Portal Admin Access Tool - Post-Deployment");
  console.log(
    "================================================================\n"
  );

  // Get database connection
  const db = await getDb();
  if (!db) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }

  console.log("✅ Connected to database\n");

  // Step 1: Create tables
  console.log("📦 STEP 1: Creating database tables...");
  await createTables(db);

  // Step 2: Seed permissions
  console.log("\n🔑 STEP 2: Seeding permissions...");
  await seedPermissions(db);

  // Step 3: Assign to Super Admin
  console.log("\n👑 STEP 3: Assigning permissions to Super Admin role...");
  await assignToSuperAdmin(db);

  // Step 4: Verify
  console.log("\n✅ STEP 4: Verifying deployment...");
  await verifyDeployment(db);

  console.log(
    "\n================================================================"
  );
  console.log("🎉 FEATURE-012 post-deployment complete!");
  console.log(
    "================================================================"
  );
}

async function createTables(db: Awaited<ReturnType<typeof getDb>>) {
  try {
    // Create admin_impersonation_sessions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_guid VARCHAR(36) NOT NULL UNIQUE,
        admin_user_id INT NOT NULL,
        client_id INT NOT NULL,
        status ENUM('ACTIVE', 'ENDED', 'REVOKED', 'EXPIRED') NOT NULL DEFAULT 'ACTIVE',
        start_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        end_at TIMESTAMP NULL,
        expires_at TIMESTAMP NOT NULL,
        ip_address VARCHAR(45) NULL,
        user_agent TEXT NULL,
        revoked_by INT NULL,
        revoked_at TIMESTAMP NULL,
        revoke_reason TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_admin_user_id (admin_user_id),
        INDEX idx_client_id (client_id),
        INDEX idx_status (status),
        INDEX idx_session_guid (session_guid),
        CONSTRAINT fk_impersonation_admin_user FOREIGN KEY (admin_user_id) REFERENCES users (id) ON DELETE CASCADE,
        CONSTRAINT fk_impersonation_client FOREIGN KEY (client_id) REFERENCES clients (id) ON DELETE CASCADE,
        CONSTRAINT fk_impersonation_revoked_by FOREIGN KEY (revoked_by) REFERENCES users (id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("   ✅ Created admin_impersonation_sessions table");

    // Create admin_impersonation_actions table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS admin_impersonation_actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        session_id INT NOT NULL,
        action_type VARCHAR(50) NOT NULL,
        action_details JSON NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_session_id (session_id),
        INDEX idx_action_type (action_type),
        CONSTRAINT fk_action_session FOREIGN KEY (session_id) REFERENCES admin_impersonation_sessions (id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("   ✅ Created admin_impersonation_actions table");
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "ER_TABLE_EXISTS_ERROR") {
      console.log("   ℹ️  Tables already exist (skipping)");
    } else {
      throw error;
    }
  }
}

async function seedPermissions(db: Awaited<ReturnType<typeof getDb>>) {
  const newPermissions = [
    {
      name: "admin:impersonate",
      description:
        "Can impersonate clients in VIP portal with full audit logging",
      module: "admin",
    },
    {
      name: "admin:impersonate:audit",
      description: "Can view impersonation audit logs and session history",
      module: "admin",
    },
  ];

  for (const perm of newPermissions) {
    // Check if permission already exists
    const existing = await db
      .select()
      .from(permissions)
      .where(eq(permissions.name, perm.name))
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `   ℹ️  Permission "${perm.name}" already exists (ID: ${existing[0].id})`
      );
    } else {
      await db.insert(permissions).values({
        name: perm.name,
        description: perm.description,
        module: perm.module,
      });
      console.log(`   ✅ Created permission "${perm.name}"`);
    }
  }
}

async function assignToSuperAdmin(db: Awaited<ReturnType<typeof getDb>>) {
  // Find Super Admin role
  const superAdminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "Super Admin"))
    .limit(1);

  if (superAdminRole.length === 0) {
    console.log("   ⚠️  Super Admin role not found - skipping role assignment");
    console.log("   ℹ️  Users with isSuperAdmin=true will still have access");
    return;
  }

  const roleId = superAdminRole[0].id;
  console.log(`   Found Super Admin role (ID: ${roleId})`);

  // Get the new permissions
  const newPerms = await db
    .select()
    .from(permissions)
    .where(
      sql`${permissions.name} IN ('admin:impersonate', 'admin:impersonate:audit')`
    );

  for (const perm of newPerms) {
    // Check if already assigned
    const existing = await db
      .select()
      .from(rolePermissions)
      .where(
        sql`${rolePermissions.roleId} = ${roleId} AND ${rolePermissions.permissionId} = ${perm.id}`
      )
      .limit(1);

    if (existing.length > 0) {
      console.log(
        `   ℹ️  Permission "${perm.name}" already assigned to Super Admin`
      );
    } else {
      await db.insert(rolePermissions).values({
        roleId: roleId,
        permissionId: perm.id,
      });
      console.log(`   ✅ Assigned "${perm.name}" to Super Admin role`);
    }
  }
}

async function verifyDeployment(db: Awaited<ReturnType<typeof getDb>>) {
  // Verify tables exist
  const tables = await db.execute(sql`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = DATABASE() 
      AND table_name IN ('admin_impersonation_sessions', 'admin_impersonation_actions')
  `);

  console.log(
    `   Tables created: ${Array.isArray(tables) && tables[0] ? (tables[0] as unknown[]).length : 0}/2`
  );

  // Verify permissions exist
  const perms = await db
    .select()
    .from(permissions)
    .where(
      sql`${permissions.name} IN ('admin:impersonate', 'admin:impersonate:audit')`
    );

  console.log(`   Permissions created: ${perms.length}/2`);

  // List permissions
  for (const perm of perms) {
    console.log(`     - ${perm.name} (ID: ${perm.id})`);
  }
}

main()
  .then(() => {
    console.log("\n✅ Script completed successfully!");
    process.exit(0);
  })
  .catch(error => {
    console.error("\n❌ Script failed:", error);
    process.exit(1);
  });
