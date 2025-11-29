/**
 * Test the seed API endpoint by directly calling the router
 * This simulates an API call without needing a running server
 */

import { appRouter } from "../server/routers.js";
import { createContext } from "../server/_core/context.js";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";

// Create a mock request/response for context
const mockReq = {
  headers: {},
  cookies: {},
  url: "/api/trpc/settings.seedDatabase",
} as any;

const mockRes = {
  status: () => mockRes,
  json: () => mockRes,
  setHeader: () => {},
} as any;

const mockContextOptions: CreateExpressContextOptions = {
  req: mockReq as any,
  res: mockRes as any,
};

async function testSeedAPI() {
  try {
    console.log("🧪 Testing Seed API Endpoint (Direct Router Call)");
    console.log("=".repeat(50));
    console.log("📍 Testing 'light' scenario");
    console.log("");

    // Create context
    const ctx = await createContext(mockContextOptions);
    
    // Create caller
    const caller = appRouter.createCaller(ctx);

    console.log("🚀 Starting seed with 'light' scenario...");
    console.log("⏳ This may take 30-60 seconds...");
    console.log("");

    const startTime = Date.now();

    // Call the seed endpoint (tRPC mutations are called directly
    const result = await caller.settings.seedDatabase({
      scenario: "light",
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log("");
    console.log("=".repeat(50));
    console.log("✅ SEED COMPLETED SUCCESSFULLY");
    console.log("=".repeat(50));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📋 Result:`, JSON.stringify(result, null, 2));
    console.log("=".repeat(50));

    return { success: true, result, duration };
  } catch (error: any) {
    console.error("");
    console.error("=".repeat(50));
    console.error("❌ SEED FAILED");
    console.error("=".repeat(50));
    console.error("Error Type:", error?.constructor?.name || "Unknown");
    console.error("Error Message:", error?.message || "Unknown error");
    
    if (error?.data) {
      console.error("Error Data:", JSON.stringify(error.data, null, 2));
    }
    
    if (error?.code) {
      console.error("Error Code:", error.code);
    }
    
    if (error?.stack) {
      console.error("\nStack Trace:");
      console.error(error.stack);
    }

    console.error("=".repeat(50));
    
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
