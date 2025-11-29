/**
 * Test script to call the seed API endpoint and monitor for errors
 */

import { createTRPCProxyClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "../server/routers.js";

// Get the API URL from environment or use default
const API_URL = process.env.API_URL || "http://localhost:3000/trpc";

console.log("🧪 Testing Seed API Endpoint");
console.log("=" .repeat(50));
console.log(`📍 API URL: ${API_URL}`);
console.log("");

// Create tRPC client
const trpc = createTRPCProxyClient<AppRouter>({
  links: [
    httpBatchLink({
      url: API_URL,
    }),
  ],
});

async function testSeedAPI() {
  try {
    console.log("🚀 Starting seed with 'light' scenario...");
    console.log("⏳ This may take 30-60 seconds...");
    console.log("");

    const startTime = Date.now();

    // Call the seed endpoint
    const result = await trpc.settings.seedDatabase.mutate({
      scenario: "light",
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("");
    console.log("=" .repeat(50));
    console.log("✅ SEED COMPLETED SUCCESSFULLY");
    console.log("=" .repeat(50));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📋 Result:`, result);
    console.log("=" .repeat(50));

    return { success: true, result, duration };
  } catch (error: any) {
    console.error("");
    console.error("=" .repeat(50));
    console.error("❌ SEED FAILED");
    console.error("=" .repeat(50));
    console.error("Error Type:", error?.constructor?.name || "Unknown");
    console.error("Error Message:", error?.message || "Unknown error");
    console.error("Error Stack:", error?.stack || "No stack trace");
    
    if (error?.data) {
      console.error("Error Data:", JSON.stringify(error.data, null, 2));
    }
    
    if (error?.cause) {
      console.error("Error Cause:", error.cause);
    }

    console.error("=" .repeat(50));
    
    throw error;
  }
}

// Run the test
testSeedAPI()
  .then(() => {
    console.log("\n✅ Test completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Test failed");
    process.exit(1);
  });
