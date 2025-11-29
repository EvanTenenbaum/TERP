/**
 * Test the seed API endpoint via HTTP
 * This simulates what the frontend does when calling the API
 */

const API_URL = process.env.API_URL || "http://localhost:3000";

async function testSeedAPI() {
  try {
    console.log("🧪 Testing Seed API Endpoint via HTTP");
    console.log("=".repeat(50));
    console.log(`📍 API URL: ${API_URL}`);
    console.log("");

    // tRPC batch request format
    const requestBody = {
      "0": {
        json: {
          scenario: "light"
        }
      }
    };

    const url = `${API_URL}/api/trpc/settings.seedDatabase?batch=1&input=${encodeURIComponent(JSON.stringify({ "0": { json: { scenario: "light" } } }))}`;

    console.log("🚀 Starting seed with 'light' scenario...");
    console.log("⏳ This may take 30-60 seconds...");
    console.log("");

    const startTime = Date.now();

    // Make the HTTP request
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log("");
    console.log("=".repeat(50));
    console.log("✅ SEED COMPLETED SUCCESSFULLY");
    console.log("=".repeat(50));
    console.log(`⏱️  Duration: ${duration}s`);
    console.log(`📋 Response Status: ${response.status}`);
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
