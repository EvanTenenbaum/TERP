import { simpleAuth } from "../server/_core/simpleAuth";
import * as db from "../server/db";

async function createAdmin() {
  try {
    console.log("Creating admin user...");
    
    // Initialize database connection
    await db.getDb();
    
    // Create admin user
    const user = await simpleAuth.createUser("Evan", "admin", "Evan (Admin)");
    
    console.log("✅ Admin user created successfully!");
    console.log("Username:", user.email);
    console.log("Name:", user.name);
    console.log("\nYou can now login at /login with:");
    console.log("  Username: Evan");
    console.log("  Password: admin");
    
    process.exit(0);
  } catch (error) {
    if (error instanceof Error && error.message.includes("already exists")) {
      console.log("ℹ️  Admin user already exists");
      process.exit(0);
    }
    console.error("❌ Error creating admin user:", error);
    process.exit(1);
  }
}

createAdmin();

