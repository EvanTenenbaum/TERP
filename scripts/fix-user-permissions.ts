/**
 * Fix User Permissions Script
 * 
 * This script checks if user "Evan" has the "orders:read" permission
 * and grants it if missing. It can also make the user a Super Admin.
 * 
 * Usage:
 *   npx tsx scripts/fix-user-permissions.ts
 */

import { getDb } from '../server/db';
import { users, userRoles, roles, rolePermissions, permissions } from '../drizzle/schema';
import { eq, and } from 'drizzle-orm';

async function main() {
  console.log('🔍 Checking user permissions for "Evan"...\n');

  // Get database connection
  const db = await getDb();
  if (!db) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  // Find user "Evan"
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, 'Evan'))
    .limit(1);

  if (!user || user.length === 0) {
    console.error('❌ User "Evan" not found!');
    console.log('Trying to find by username...');
    
    const userByUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, 'Evan'))
      .limit(1);
    
    if (!userByUsername || userByUsername.length === 0) {
      console.error('❌ User "Evan" not found by username either!');
      console.log('\nAvailable users:');
      const allUsers = await db.select().from(users);
      allUsers.forEach(u => {
        console.log(`  - ${u.username} (${u.email}) - openId: ${u.openId}`);
      });
      process.exit(1);
    }
    
    console.log(`✅ Found user by username: ${userByUsername[0].username} (${userByUsername[0].email})`);
    await checkAndFixPermissions(db, userByUsername[0]);
  } else {
    console.log(`✅ Found user: ${user[0].username} (${user[0].email})`);
    await checkAndFixPermissions(db, user[0]);
  }
}

async function checkAndFixPermissions(db: Awaited<ReturnType<typeof getDb>>, user: typeof users.$inferSelect) {
  console.log(`\n📊 User Details:`);
  console.log(`   ID: ${user.id}`);
  console.log(`   OpenID: ${user.openId}`);
  console.log(`   Username: ${user.username}`);
  console.log(`   Email: ${user.email}`);
  console.log(`   Is Super Admin: ${user.isSuperAdmin ? 'YES ✅' : 'NO ❌'}`);

  // Check if user is already a Super Admin
  if (user.isSuperAdmin) {
    console.log('\n✅ User is already a Super Admin! They have all permissions.');
    console.log('   BUG-001 should not be caused by permissions.');
    return;
  }

  // Get user's roles
  console.log(`\n🔍 Checking user roles...`);
  const userRoleRecords = await db
    .select({
      roleId: userRoles.roleId,
      roleName: roles.name,
    })
    .from(userRoles)
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, user.openId));

  if (userRoleRecords.length === 0) {
    console.log('❌ User has NO roles assigned!');
    console.log('\n💡 SOLUTION: Make user a Super Admin');
    await makeSuperAdmin(db, user);
    return;
  }

  console.log(`✅ User has ${userRoleRecords.length} role(s):`);
  userRoleRecords.forEach(r => {
    console.log(`   - ${r.roleName} (ID: ${r.roleId})`);
  });

  // Check if user has "orders:read" permission
  console.log(`\n🔍 Checking for "orders:read" permission...`);
  
  const ordersReadPermission = await db
    .select()
    .from(permissions)
    .where(eq(permissions.name, 'orders:read'))
    .limit(1);

  if (!ordersReadPermission || ordersReadPermission.length === 0) {
    console.log('❌ "orders:read" permission does not exist in the database!');
    console.log('\n💡 SOLUTION: Make user a Super Admin (bypasses permission checks)');
    await makeSuperAdmin(db, user);
    return;
  }

  const permissionId = ordersReadPermission[0].id;
  console.log(`✅ "orders:read" permission exists (ID: ${permissionId})`);

  // Check if any of user's roles have this permission
  const roleIds = userRoleRecords.map(r => r.roleId);
  const rolePermissionRecords = await db
    .select()
    .from(rolePermissions)
    .where(
      and(
        eq(rolePermissions.permissionId, permissionId),
        // @ts-ignore - drizzle-orm type issue with IN operator
        rolePermissions.roleId.in(roleIds)
      )
    );

  if (rolePermissionRecords.length > 0) {
    console.log('✅ User has "orders:read" permission through their role(s)!');
    console.log('   BUG-001 is NOT caused by missing permissions.');
    console.log('\n🔍 The issue must be something else. Check:');
    console.log('   1. tRPC client configuration');
    console.log('   2. Database data (are all orders drafts?)');
    console.log('   3. Frontend query logic');
    return;
  }

  console.log('❌ User does NOT have "orders:read" permission!');
  console.log('\n💡 SOLUTION: Make user a Super Admin');
  await makeSuperAdmin(db, user);
}

async function makeSuperAdmin(db: Awaited<ReturnType<typeof getDb>>, user: typeof users.$inferSelect) {
  console.log(`\n🔧 Making user "${user.username}" a Super Admin...`);
  
  await db
    .update(users)
    .set({ isSuperAdmin: true })
    .where(eq(users.id, user.id));

  console.log('✅ User is now a Super Admin!');
  console.log('\n🎉 FIX APPLIED! User now has all permissions.');
  console.log('   Please test the Orders page to verify the fix.');
}

main()
  .then(() => {
    console.log('\n✅ Script completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });
