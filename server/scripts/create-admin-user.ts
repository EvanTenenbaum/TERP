import bcrypt from "bcrypt";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { logger } from "../_core/logger";

async function createAdminUser() {
  logger.info("Creating admin user with admin/admin credentials...");
  
  const db = await getDb();
  
  // Hash the password "admin"
  const passwordHash = await bcrypt.hash("admin", 10);
  
  // Check if admin user already exists
  const existingUsers = await db.execute(sql`SELECT * FROM users WHERE email = 'admin'`);
  const existing = existingUsers[0] as unknown as Array<{ id: number }>;
  
  if (existing && existing.length > 0) {
    logger.info("Admin user already exists, updating password...");
    
    // Update existing user
    await db.execute(sql`
      UPDATE users 
      SET loginMethod = ${passwordHash}, 
          openId = 'admin', 
          name = 'Admin User' 
      WHERE email = 'admin'
    `);
    
    const userId = existing[0].id;
    logger.info(`Updated user ID: ${userId}`);
    
    // Check if user has Super Admin role
    const roleCheck = await db.execute(sql`
      SELECT * FROM user_roles 
      WHERE user_id = ${userId} AND role_id = 1
    `);
    const hasRole = (roleCheck[0] as unknown as Array<unknown>).length > 0;
    
    if (!hasRole) {
      // Assign Super Admin role (role_id = 1)
      await db.execute(sql`
        INSERT INTO user_roles (user_id, role_id, assigned_by) 
        VALUES (${userId}, 1, 'system')
      `);
      logger.info("Assigned Super Admin role");
    } else {
      logger.info("User already has Super Admin role");
    }
  } else {
    logger.info("Creating new admin user...");
    
    // Create new user
    await db.execute(sql`
      INSERT INTO users (openId, email, name, loginMethod, role, createdAt, updatedAt, lastSignedIn) 
      VALUES ('admin', 'admin', 'Admin User', ${passwordHash}, 'admin', NOW(), NOW(), NOW())
    `);
    
    // Get the newly created user ID
    const newUserResult = await db.execute(sql`SELECT id FROM users WHERE email = 'admin'`);
    const newUser = (newUserResult[0] as unknown as Array<{ id: number }>)[0];
    const userId = newUser.id;
    
    logger.info(`Created user ID: ${userId}`);
    
    // Assign Super Admin role (role_id = 1)
    await db.execute(sql`
      INSERT INTO user_roles (user_id, role_id, assigned_by) 
      VALUES (${userId}, 1, 'system')
    `);
    logger.info("Assigned Super Admin role");
  }
  
  // Verify the setup
  const verifyResult = await db.execute(sql`
    SELECT u.id, u.email, u.name, r.name as role_name
    FROM users u
    LEFT JOIN user_roles ur ON u.id = ur.user_id
    LEFT JOIN roles r ON ur.role_id = r.id
    WHERE u.email = 'admin'
  `);
  
  logger.info("✅ Admin user setup complete!");
  logger.info("Credentials: admin / admin");
  logger.info("User details:", verifyResult[0]);
  
  process.exit(0);
}

createAdminUser().catch((error) => {
  console.error("Error creating admin user:", error);
  process.exit(1);
});
