/**
 * Run DATA-002-AUGMENT scripts via API endpoint
 * 
 * This calls the production server API which has stable database connection.
 * Usage: pnpm tsx scripts/run-augmentation-via-api.ts
 */

import { config } from "dotenv";
config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "https://terp-app-b9s35.ondigitalocean.app";

async function callAPI(endpoint: string, input?: unknown) {
  const url = `${API_URL}/api/trpc/${endpoint}`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: input || {},
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API call failed: ${response.status} ${response.statusText}\n${text}`);
  }

  const data = await response.json();
  return data.result?.data?.json || data;
}

async function runAllScripts() {
  console.log("🚀 Running DATA-002-AUGMENT scripts via API...");
  console.log(`   API URL: ${API_URL}\n`);

  try {
    console.log("📡 Calling adminDataAugment.runAll...");
    const result = await callAPI("adminDataAugment.runAll");

    console.log("\n" + "=".repeat(60));
    console.log("📊 EXECUTION RESULTS");
    console.log("=".repeat(60) + "\n");

    console.log(`✅ Success: ${result.success}`);
    console.log(`📈 Summary:`);
    console.log(`   Total: ${result.summary.total}`);
    console.log(`   Success: ${result.summary.success}`);
    console.log(`   Errors: ${result.summary.errors}`);
    console.log(`   Skipped: ${result.summary.skipped}\n`);

    console.log("📋 Detailed Results:");
    for (const scriptResult of result.results) {
      const icon = scriptResult.status === "success" ? "✅" : scriptResult.status === "error" ? "❌" : "⏭️";
      console.log(`\n${icon} ${scriptResult.script}`);
      console.log(`   Status: ${scriptResult.status}`);
      if (scriptResult.duration) {
        console.log(`   Duration: ${scriptResult.duration}ms`);
      }
      if (scriptResult.output) {
        const outputLines = scriptResult.output.split("\n").slice(-10);
        console.log(`   Output (last 10 lines):`);
        outputLines.forEach((line: string) => console.log(`     ${line}`));
      }
      if (scriptResult.error) {
        console.log(`   Error: ${scriptResult.error}`);
      }
    }

    console.log("\n" + "=".repeat(60));
    if (result.success) {
      console.log("✅ All scripts completed successfully!");
    } else {
      console.log("⚠️  Some scripts failed. Check details above.");
    }
    console.log("=".repeat(60));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error("❌ Failed to run scripts via API:", error);
    process.exit(1);
  }
}

runAllScripts();
