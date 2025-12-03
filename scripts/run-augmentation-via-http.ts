/**
 * Run DATA-002-AUGMENT scripts via HTTP endpoint
 * 
 * This calls the production server HTTP endpoint which bypasses tRPC authentication
 * Usage: pnpm tsx scripts/run-augmentation-via-http.ts
 */

import { config } from "dotenv";
config();

const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "https://terp-app-b9s35.ondigitalocean.app";

async function runScripts(scripts?: string[]) {
  console.log("🚀 Running DATA-002-AUGMENT scripts via HTTP endpoint...");
  console.log(`   API URL: ${API_URL}\n`);

  try {
    const url = `${API_URL}/api/data-augment/run`;
    const body = scripts ? { scripts } : {};
    
    console.log(`📡 POST ${url}`);
    if (scripts) {
      console.log(`   Scripts: ${scripts.join(", ")}\n`);
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(1800000), // 30 minutes total timeout
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    const result = await response.json();

    console.log("\n" + "=".repeat(60));
    console.log("📊 EXECUTION RESULTS");
    console.log("=".repeat(60) + "\n");

    console.log(`✅ Success: ${result.success}`);
    console.log(`📈 Summary:`);
    console.log(`   Total: ${result.summary.total}`);
    console.log(`   Success: ${result.summary.success}`);
    console.log(`   Errors: ${result.summary.errors}\n`);

    console.log("📋 Detailed Results:");
    for (const scriptResult of result.results) {
      const icon = scriptResult.status === "success" ? "✅" : "❌";
      console.log(`\n${icon} ${scriptResult.script}`);
      console.log(`   Status: ${scriptResult.status}`);
      if (scriptResult.duration) {
        console.log(`   Duration: ${(scriptResult.duration / 1000).toFixed(2)}s`);
      }
      if (scriptResult.output) {
        const outputLines = scriptResult.output.split("\n").slice(-15);
        console.log(`   Output (last 15 lines):`);
        outputLines.forEach((line: string) => {
          if (line.trim()) console.log(`     ${line}`);
        });
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

    return result.success;
  } catch (error: any) {
    console.error("❌ Failed to run scripts:", error.message);
    return false;
  }
}

// Run all scripts or specific ones from command line
const scripts = process.argv.slice(2).length > 0 ? process.argv.slice(2) : undefined;

runScripts(scripts)
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
