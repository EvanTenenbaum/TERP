#!/usr/bin/env tsx
/**
 * First-time setup script for TERP
 * 
 * This script:
 * 1. Seeds default master data (locations, categories, grades, etc.)
 * 2. Creates the admin user (Evan / oliver)
 * 
 * Safe to run multiple times - checks for existing data before seeding
 */

import { seedAllDefaults } from "../server/services/seedDefaults";
import { simpleAuth } from "../server/_core/simpleAuth";
import * as db from "../server/db";

async function setup() {
  console.log("🚀 Starting TERP first-time setup...\n");

  try {
    // Step 1: Seed default master data
    console.log("📊 Step 1: Seeding default master data");
    await seedAllDefaults();
    console.log("");

    // Step 2: Create admin user
    console.log("👤 Step 2: Creating admin user");
    const existingUser = await db.getUserByEmail("Evan");
    
    if (existingUser) {
      console.log("✅ Admin user 'Evan' already exists, skipping...");
    } else {
      await simpleAuth.createUser("Evan", "oliver", "Evan (Admin)");
      console.log("✅ Admin user created: Evan / oliver");
    }
    console.log("");

    console.log("🎉 Setup complete! TERP is ready to use.");
    console.log("\n📝 Login credentials:");
    console.log("   Username: Evan");
    console.log("   Password: oliver");
    console.log("\n🌐 Access TERP at: http://localhost:8080");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup failed:", error);
    process.exit(1);
  }
}

setup();

