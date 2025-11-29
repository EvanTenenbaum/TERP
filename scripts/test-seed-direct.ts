/**
 * Direct test of the seed function to monitor for errors
 * This simulates what the API endpoint does
 */

import { seedRealisticData } from "./seed-realistic-main.js";

console.log("🧪 Testing Seed Function Directly");
console.log("=".repeat(50));
console.log("📍 Testing 'light' scenario");
console.log("");

async function testSeed() {
  try {
    // Set process.argv to simulate API call
    const originalArgv = process.argv;
    process.argv = ["node", "script", "light"];

    console.log("🚀 Starting seed...");
    console.log("⏳ This may take 30-60 seconds...");
    console.log("");

    const startTime = Date.now();

    // Call the seed function directly
    await seedRealisticData();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("");
    console.log("=".repeat(50));
    console.log("✅ SEED COMPLETED SUCCESSFULLY");
    console.log("=".repeat(50));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log("=".repeat(50));

    // Restore original argv
    process.argv = originalArgv;

    return { success: true, duration };
  } catch (error: any) {
    console.error("");
    console.error("=".repeat(50));
    console.error("❌ SEED FAILED");
    console.error("=".repeat(50));
    console.error("Error Type:", error?.constructor?.name || "Unknown");
    console.error("Error Message:", error?.message || "Unknown error");
    
    if (error?.code) {
      console.error("Error Code:", error.code);
    }
    
    if (error?.sql) {
      console.error("SQL:", error.sql);
    }
    
    if (error?.stack) {
      console.error("\nStack Trace:");
      console.error(error.stack);
    }

    console.error("=".repeat(50));
    
    // Restore original argv
    process.argv = originalArgv;
    
    throw error;
  }
}

// Run the test
testSeed()
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed");
    process.exit(1);
  });
