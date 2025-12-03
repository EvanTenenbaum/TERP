/**
 * Monitor deployment and run augmentation scripts via API
 * 
 * This script:
 * 1. Waits for deployment to complete
 * 2. Verifies API endpoint is available
 * 3. Runs augmentation scripts
 * 4. Monitors execution and retries on failure
 * 5. Self-heals by checking deployment status and retrying
 */

import { config } from "dotenv";
import { execSync } from "child_process";
config();

const APP_ID = "1fd40be5-b9af-4e71-ab1d-3af0864a7da4";
const API_URL = process.env.NEXT_PUBLIC_API_URL || process.env.VITE_API_URL || "https://terp-app-b9s35.ondigitalocean.app";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 30000; // 30 seconds

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function checkDeploymentStatus(): string {
  try {
    const output = execSync(
      `doctl apps list-deployments ${APP_ID} --format Phase --no-header 2>&1 | head -1`,
      { encoding: "utf-8", timeout: 10000 }
    );
    return output.trim();
  } catch (error) {
    console.error("Failed to check deployment status:", error);
    return "UNKNOWN";
  }
}

async function waitForDeployment(maxWaitMinutes = 10) {
  console.log("⏳ Waiting for deployment to complete...");
  const startTime = Date.now();
  const maxWaitMs = maxWaitMinutes * 60 * 1000;

  while (Date.now() - startTime < maxWaitMs) {
    const phase = checkDeploymentStatus();
    console.log(`   Current phase: ${phase}`);

    if (phase === "ACTIVE") {
      console.log("✅ Deployment is active!");
      await sleep(10000); // Wait 10 more seconds for app to be ready
      return true;
    }

    if (phase === "ERROR") {
      console.error("❌ Deployment failed!");
      return false;
    }

    await sleep(15000); // Check every 15 seconds
  }

  console.warn("⚠️  Deployment timeout - proceeding anyway");
  return false;
}

async function checkAPIHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/health/live`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

async function callAPI(endpoint: string, input?: unknown, retries = MAX_RETRIES): Promise<any> {
  const url = `${API_URL}/api/trpc/${endpoint}`;
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          json: input || {},
        }),
        signal: AbortSignal.timeout(300000), // 5 minutes timeout
      });

      if (!response.ok) {
        const text = await response.text();
        if (attempt < retries && response.status >= 500) {
          console.warn(`   Attempt ${attempt} failed (${response.status}), retrying...`);
          await sleep(RETRY_DELAY_MS * attempt);
          continue;
        }
        throw new Error(`API call failed: ${response.status} ${response.statusText}\n${text}`);
      }

      const data = await response.json();
      return data.result?.data?.json || data;
    } catch (error: any) {
      if (attempt < retries && (error.name === "TimeoutError" || error.message?.includes("fetch"))) {
        console.warn(`   Attempt ${attempt} failed, retrying...`);
        await sleep(RETRY_DELAY_MS * attempt);
        continue;
      }
      throw error;
    }
  }
  
  throw new Error("Max retries exceeded");
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
        console.log(`   Duration: ${(scriptResult.duration / 1000).toFixed(2)}s`);
      }
      if (scriptResult.output) {
        const outputLines = scriptResult.output.split("\n").slice(-10);
        console.log(`   Output (last 10 lines):`);
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
    console.error("❌ Failed to run scripts via API:", error.message);
    return false;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("🔍 MONITORING & RUNNING DATA AUGMENTATION");
  console.log("=".repeat(60) + "\n");

  // Step 1: Wait for deployment
  const deploymentOk = await waitForDeployment(10);
  if (!deploymentOk) {
    console.error("❌ Deployment check failed - aborting");
    process.exit(1);
  }

  // Step 2: Check API health
  console.log("\n🏥 Checking API health...");
  let apiHealthy = false;
  for (let i = 0; i < 5; i++) {
    apiHealthy = await checkAPIHealth();
    if (apiHealthy) {
      console.log("✅ API is healthy!");
      break;
    }
    console.log(`   Attempt ${i + 1}/5 failed, retrying...`);
    await sleep(10000);
  }

  if (!apiHealthy) {
    console.error("❌ API health check failed - aborting");
    process.exit(1);
  }

  // Step 3: Run scripts with retries
  console.log("\n🚀 Starting augmentation scripts...\n");
  let success = false;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    console.log(`\n📋 Attempt ${attempt}/${MAX_RETRIES}:`);
    success = await runAllScripts();
    
    if (success) {
      break;
    }

    if (attempt < MAX_RETRIES) {
      console.log(`\n⏳ Waiting ${RETRY_DELAY_MS / 1000}s before retry...`);
      await sleep(RETRY_DELAY_MS);
      
      // Re-check deployment status
      const phase = checkDeploymentStatus();
      console.log(`   Deployment phase: ${phase}`);
      
      if (phase !== "ACTIVE") {
        console.log("   ⚠️  Deployment not active, waiting...");
        await waitForDeployment(5);
      }
    }
  }

  console.log("\n" + "=".repeat(60));
  if (success) {
    console.log("✅ AUGMENTATION COMPLETED SUCCESSFULLY");
  } else {
    console.log("❌ AUGMENTATION FAILED AFTER ALL RETRIES");
  }
  console.log("=".repeat(60));

  process.exit(success ? 0 : 1);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
