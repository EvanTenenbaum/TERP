/**
 * Grant orders:read Permission Script
 * 
 * This script grants the "orders:read" permission to user "Evan"
 * by adding a user permission override.
 */

import { getDb } from '../server/db';
import { users, permissions, userPermissionOverrides } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔧 Granting orders:read permission to user "Evan"...\n');

  const db = await getDb();
  if (!db) {
    console.error('❌ Failed to connect to database');
    process.exit(1);
  }

  // Step 1: Find user "Evan"
  console.log('📋 Step 1: Finding user "Evan"...');
  const userRecords = await db
    .select()
    .from(users)
    .where(eq(users.email, 'Evan'))
    .limit(1);

  if (!userRecords || userRecords.length === 0) {
    console.error('❌ User "Evan" not found!');
    process.exit(1);
  }

  const user = userRecords[0];
  console.log(`✅ Found user: ${user.email} (openId: ${user.openId})\n`);

  // Step 2: Find "orders:read" permission
  console.log('📋 Step 2: Finding "orders:read" permission...');
  const permissionRecords = await db
    .select()
    .from(permissions)
    .where(eq(permissions.name, 'orders:read'))
    .limit(1);

  if (!permissionRecords || permissionRecords.length === 0) {
    console.error('❌ Permission "orders:read" not found!');
    console.log('\nAvailable permissions:');
    const allPermissions = await db.select().from(permissions);
    allPermissions.forEach(p => {
      console.log(`  - ${p.name} (ID: ${p.id})`);
    });
    process.exit(1);
  }

  const permission = permissionRecords[0];
  console.log(`✅ Found permission: ${permission.name} (ID: ${permission.id})\n`);

  // Step 3: Check if override already exists
  console.log('📋 Step 3: Checking for existing permission override...');
  const existingOverrides = await db
    .select()
    .from(userPermissionOverrides)
    .where(eq(userPermissionOverrides.userId, user.openId));

  console.log(`Found ${existingOverrides.length} existing overrides for this user\n`);

  // Step 4: Grant the permission
  console.log('📋 Step 4: Granting permission...');
  
  try {
    await db.insert(userPermissionOverrides).values({
      userId: user.openId,
      permissionId: permission.id,
      granted: 1, // 1 = granted, 0 = revoked
    });

    console.log('✅ Permission granted successfully!\n');
    console.log('🎉 User "Evan" now has "orders:read" permission!');
    console.log('   Please refresh the Orders page to verify the fix.');
  } catch (error: any) {
    if (error.code === 'ER_DUP_ENTRY') {
      console.log('⚠️  Permission override already exists. Updating...');
      
      // Update existing override
      await db
        .update(userPermissionOverrides)
        .set({ granted: 1 })
        .where(eq(userPermissionOverrides.userId, user.openId));
      
      console.log('✅ Permission override updated to granted!\n');
      console.log('🎉 User "Evan" now has "orders:read" permission!');
    } else {
      throw error;
    }
  }
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
