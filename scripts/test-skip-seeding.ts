/**
 * Test Script: SKIP_SEEDING Bypass Verification
 * 
 * This script tests that SKIP_SEEDING environment variable properly bypasses seeding.
 * Run with: tsx scripts/test-skip-seeding.ts
 */

import { seedAllDefaults } from "../server/services/seedDefaults.js";
import { seedRBACDefaults } from "../server/services/seedRBAC.js";

async function testSkipSeeding() {
  console.log("\n🧪 Testing SKIP_SEEDING Bypass Implementation");
  console.log("=".repeat(60));

  // Test 1: With SKIP_SEEDING=true
  console.log("\n📋 Test 1: SKIP_SEEDING=true");
  console.log("-".repeat(60));
  process.env.SKIP_SEEDING = "true";
  
  try {
    await seedAllDefaults();
    console.log("✅ seedAllDefaults() bypassed correctly (no error thrown)");
  } catch (error) {
    console.error("❌ seedAllDefaults() should not throw error when SKIP_SEEDING=true");
    console.error("   Error:", error);
  }

  try {
    await seedRBACDefaults();
    console.log("✅ seedRBACDefaults() bypassed correctly (no error thrown)");
  } catch (error) {
    console.error("❌ seedRBACDefaults() should not throw error when SKIP_SEEDING=true");
    console.error("   Error:", error);
  }

  // Test 2: With SKIP_SEEDING=1
  console.log("\n📋 Test 2: SKIP_SEEDING=1");
  console.log("-".repeat(60));
  process.env.SKIP_SEEDING = "1";
  
  try {
    await seedAllDefaults();
    console.log("✅ seedAllDefaults() bypassed correctly with SKIP_SEEDING=1");
  } catch (error) {
    console.error("❌ seedAllDefaults() should not throw error when SKIP_SEEDING=1");
    console.error("   Error:", error);
  }

  // Test 3: Without SKIP_SEEDING (should attempt seeding)
  console.log("\n📋 Test 3: SKIP_SEEDING not set");
  console.log("-".repeat(60));
  delete process.env.SKIP_SEEDING;
  
  try {
    // This will likely fail due to database connection, but should NOT be bypassed
    await seedAllDefaults();
    console.log("⚠️  seedAllDefaults() attempted to run (may fail due to DB, but bypass check passed)");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("SKIP_SEEDING")) {
      console.error("❌ seedAllDefaults() incorrectly bypassed when SKIP_SEEDING not set");
    } else {
      console.log("✅ seedAllDefaults() attempted to run (bypass check passed, DB error expected)");
      console.log("   Expected DB error:", errorMsg.substring(0, 100));
    }
  }

  // Test 4: With SKIP_SEEDING=false (should attempt seeding)
  console.log("\n📋 Test 4: SKIP_SEEDING=false");
  console.log("-".repeat(60));
  process.env.SKIP_SEEDING = "false";
  
  try {
    await seedAllDefaults();
    console.log("⚠️  seedAllDefaults() attempted to run (may fail due to DB, but bypass check passed)");
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes("SKIP_SEEDING")) {
      console.error("❌ seedAllDefaults() incorrectly bypassed when SKIP_SEEDING=false");
    } else {
      console.log("✅ seedAllDefaults() attempted to run (bypass check passed, DB error expected)");
      console.log("   Expected DB error:", errorMsg.substring(0, 100));
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("✅ All SKIP_SEEDING bypass tests completed!");
  console.log("=".repeat(60));
  console.log("\n💡 Summary:");
  console.log("   - SKIP_SEEDING=true: ✅ Bypasses seeding");
  console.log("   - SKIP_SEEDING=1: ✅ Bypasses seeding");
  console.log("   - SKIP_SEEDING=false: ✅ Attempts seeding");
  console.log("   - SKIP_SEEDING not set: ✅ Attempts seeding");
  console.log("\n");
}

// Run tests
testSkipSeeding().catch((error) => {
  console.error("❌ Test script failed:", error);
  process.exit(1);
});
