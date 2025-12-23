/**
 * Daily Batch Job: Recalculate Credit Limits for All Clients
 * 
 * This script recalculates credit limits for all active clients.
 * It skips clients with manual credit limit overrides.
 * 
 * Usage:
 *   npx tsx scripts/jobs/recalculate-all-credit.ts
 * 
 * Cron setup (daily at 2 AM):
 *   0 2 * * * cd /path/to/terp && npx tsx scripts/jobs/recalculate-all-credit.ts >> /var/log/terp-credit-recalc.log 2>&1
 * 
 * Options:
 *   --force    Recalculate even for clients with manual overrides
 *   --dry-run  Show what would be done without making changes
 *   --limit N  Only process N clients (for testing)
 */

import { getDb } from "../../server/db";
import { clients } from "../../drizzle/schema";
import { eq, and, ne } from "drizzle-orm";
import { recalculateClientCredit } from "../../server/creditEngine";

interface JobOptions {
  force: boolean;
  dryRun: boolean;
  limit?: number;
}

interface JobResult {
  totalClients: number;
  processed: number;
  skipped: number;
  errors: number;
  duration: number;
  errorDetails: Array<{ clientId: number; error: string }>;
}

async function recalculateAllCredit(options: JobOptions): Promise<JobResult> {
  const startTime = Date.now();
  const result: JobResult = {
    totalClients: 0,
    processed: 0,
    skipped: 0,
    errors: 0,
    duration: 0,
    errorDetails: [],
  };

  console.log("=".repeat(60));
  console.log("CREDIT LIMIT RECALCULATION JOB");
  console.log(`Started at: ${new Date().toISOString()}`);
  console.log(`Options: force=${options.force}, dryRun=${options.dryRun}, limit=${options.limit || "none"}`);
  console.log("=".repeat(60));

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Get all active buyer clients
  const conditions = [
    eq(clients.isBuyer, true),
  ];

  // Skip manual overrides unless force is set
  if (!options.force) {
    conditions.push(ne(clients.creditLimitSource, "MANUAL"));
  }

  const query = db
    .select({
      id: clients.id,
      name: clients.name,
      creditLimitSource: clients.creditLimitSource,
      creditLimit: clients.creditLimit,
    })
    .from(clients)
    .where(and(...conditions));

  const clientList = await query;
  result.totalClients = clientList.length;

  console.log(`\nFound ${result.totalClients} clients to process`);

  // Apply limit if specified
  const clientsToProcess = options.limit 
    ? clientList.slice(0, options.limit) 
    : clientList;

  console.log(`Processing ${clientsToProcess.length} clients...\n`);

  for (const client of clientsToProcess) {
    try {
      if (options.dryRun) {
        console.log(`[DRY RUN] Would recalculate credit for: ${client.name} (ID: ${client.id})`);
        result.processed++;
        continue;
      }

      const calcResult = await recalculateClientCredit(client.id, undefined, options.force);
      
      if (calcResult) {
        console.log(
          `✓ ${client.name} (ID: ${client.id}): ` +
          `$${Number(client.creditLimit || 0).toFixed(2)} → $${calcResult.creditLimit.toFixed(2)}`
        );
        result.processed++;
      } else {
        console.log(`- ${client.name} (ID: ${client.id}): Skipped (manual override)`);
        result.skipped++;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`✗ ${client.name} (ID: ${client.id}): Error - ${errorMessage}`);
      result.errors++;
      result.errorDetails.push({ clientId: client.id, error: errorMessage });
    }
  }

  result.duration = Date.now() - startTime;

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("JOB SUMMARY");
  console.log("=".repeat(60));
  console.log(`Total clients found:  ${result.totalClients}`);
  console.log(`Successfully processed: ${result.processed}`);
  console.log(`Skipped (manual):       ${result.skipped}`);
  console.log(`Errors:                 ${result.errors}`);
  console.log(`Duration:               ${(result.duration / 1000).toFixed(2)}s`);
  console.log(`Avg per client:         ${(result.duration / (result.processed + result.skipped + result.errors)).toFixed(0)}ms`);
  
  if (result.errorDetails.length > 0) {
    console.log("\nError Details:");
    for (const err of result.errorDetails) {
      console.log(`  - Client ${err.clientId}: ${err.error}`);
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log(`Completed at: ${new Date().toISOString()}`);
  console.log("=".repeat(60));

  return result;
}

// Parse command line arguments
function parseArgs(): JobOptions {
  const args = process.argv.slice(2);
  return {
    force: args.includes("--force"),
    dryRun: args.includes("--dry-run"),
    limit: args.includes("--limit") 
      ? parseInt(args[args.indexOf("--limit") + 1], 10) 
      : undefined,
  };
}

// Main execution
async function main() {
  try {
    const options = parseArgs();
    const result = await recalculateAllCredit(options);
    
    // Exit with error code if there were errors
    if (result.errors > 0) {
      process.exit(1);
    }
    process.exit(0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
}

main();
