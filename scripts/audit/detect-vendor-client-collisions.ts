/**
 * Vendor-to-Client Collision Detection Script
 *
 * Detects vendors with names matching existing clients to identify
 * potential merge vs rename candidates during migration.
 *
 * Usage: npx tsx scripts/audit/detect-vendor-client-collisions.ts
 * Output: docs/audits/vendor-client-collisions.json
 */

import { getDb } from "../../server/db";
import { sql } from "drizzle-orm";
import * as fs from "fs";
import * as path from "path";

interface Collision {
  vendorId: number;
  vendorName: string;
  clientId: number;
  clientName: string;
  clientTeriCode: string | null;
  matchType: "exact" | "case_insensitive" | "trimmed" | "fuzzy";
  recommendation: "merge" | "rename" | "manual_review";
}

interface CollisionReport {
  timestamp: string;
  totalVendors: number;
  totalClients: number;
  exactMatches: number;
  caseInsensitiveMatches: number;
  trimmedMatches: number;
  collisions: Collision[];
  vendorsWithoutCollision: number;
}

async function getVendorCount(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.execute(sql`SELECT COUNT(*) as cnt FROM vendors`);
    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    return Number((rows as unknown as Array<{ cnt: number }>)[0]?.cnt ?? 0);
  } catch {
    return 0;
  }
}

async function getClientCount(): Promise<number> {
  try {
    const db = await getDb();
    if (!db) return 0;
    const result = await db.execute(sql`SELECT COUNT(*) as cnt FROM clients`);
    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    return Number((rows as unknown as Array<{ cnt: number }>)[0]?.cnt ?? 0);
  } catch {
    return 0;
  }
}

async function findExactMatches(): Promise<Collision[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT 
        v.id as vendorId,
        v.name as vendorName,
        c.id as clientId,
        c.name as clientName,
        c.teriCode as clientTeriCode
      FROM vendors v
      INNER JOIN clients c ON v.name = c.name
      ORDER BY v.name
    `);

    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    return (
      rows as unknown as Array<{
        vendorId: number;
        vendorName: string;
        clientId: number;
        clientName: string;
        clientTeriCode: string | null;
      }>
    ).map(row => ({
      ...row,
      matchType: "exact" as const,
      recommendation: "merge" as const,
    }));
  } catch {
    return [];
  }
}

async function findCaseInsensitiveMatches(): Promise<Collision[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT 
        v.id as vendorId,
        v.name as vendorName,
        c.id as clientId,
        c.name as clientName,
        c.teriCode as clientTeriCode
      FROM vendors v
      INNER JOIN clients c ON LOWER(v.name) = LOWER(c.name)
      WHERE v.name != c.name
      ORDER BY v.name
    `);

    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    return (
      rows as unknown as Array<{
        vendorId: number;
        vendorName: string;
        clientId: number;
        clientName: string;
        clientTeriCode: string | null;
      }>
    ).map(row => ({
      ...row,
      matchType: "case_insensitive" as const,
      recommendation: "manual_review" as const,
    }));
  } catch {
    return [];
  }
}

async function findTrimmedMatches(): Promise<Collision[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    const result = await db.execute(sql`
      SELECT 
        v.id as vendorId,
        v.name as vendorName,
        c.id as clientId,
        c.name as clientName,
        c.teriCode as clientTeriCode
      FROM vendors v
      INNER JOIN clients c ON LOWER(TRIM(v.name)) = LOWER(TRIM(c.name))
      WHERE LOWER(v.name) != LOWER(c.name)
      ORDER BY v.name
    `);

    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    return (
      rows as unknown as Array<{
        vendorId: number;
        vendorName: string;
        clientId: number;
        clientName: string;
        clientTeriCode: string | null;
      }>
    ).map(row => ({
      ...row,
      matchType: "trimmed" as const,
      recommendation: "manual_review" as const,
    }));
  } catch {
    return [];
  }
}

async function getVendorsWithoutCollision(
  collisionVendorIds: number[]
): Promise<number> {
  try {
    if (collisionVendorIds.length === 0) {
      return await getVendorCount();
    }

    const db = await getDb();
    if (!db) return 0;

    const idList = collisionVendorIds.join(",");
    const query = sql.raw(`
      SELECT COUNT(*) as cnt 
      FROM vendors 
      WHERE id NOT IN (${idList})
    `);

    const result = await db.execute(query);
    const rows =
      Array.isArray(result) && result.length > 0 ? result[0] : result;
    return Number((rows as unknown as Array<{ cnt: number }>)[0]?.cnt ?? 0);
  } catch {
    return 0;
  }
}

async function main() {
  console.log("=".repeat(60));
  console.log("VENDOR-TO-CLIENT COLLISION DETECTION");
  console.log("=".repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  console.log("");

  // Get counts
  const totalVendors = await getVendorCount();
  const totalClients = await getClientCount();

  console.log(`Total vendors: ${totalVendors}`);
  console.log(`Total clients: ${totalClients}`);
  console.log("");

  if (totalVendors === 0) {
    console.log("No vendors found. Nothing to check.");
    process.exit(0);
  }

  // Find collisions
  console.log("Checking for exact name matches...");
  const exactMatches = await findExactMatches();
  console.log(`  Found ${exactMatches.length} exact matches`);

  console.log("Checking for case-insensitive matches...");
  const caseInsensitiveMatches = await findCaseInsensitiveMatches();
  console.log(
    `  Found ${caseInsensitiveMatches.length} case-insensitive matches`
  );

  console.log("Checking for trimmed matches...");
  const trimmedMatches = await findTrimmedMatches();
  console.log(`  Found ${trimmedMatches.length} trimmed matches`);

  // Combine and dedupe collisions
  const allCollisions: Collision[] = [];
  const seenPairs = new Set<string>();

  for (const collision of [
    ...exactMatches,
    ...caseInsensitiveMatches,
    ...trimmedMatches,
  ]) {
    const key = `${collision.vendorId}-${collision.clientId}`;
    if (!seenPairs.has(key)) {
      seenPairs.add(key);
      allCollisions.push(collision);
    }
  }

  // Get vendors without collision
  const collisionVendorIds = [...new Set(allCollisions.map(c => c.vendorId))];
  const vendorsWithoutCollision =
    await getVendorsWithoutCollision(collisionVendorIds);

  // Generate report
  const report: CollisionReport = {
    timestamp: new Date().toISOString(),
    totalVendors,
    totalClients,
    exactMatches: exactMatches.length,
    caseInsensitiveMatches: caseInsensitiveMatches.length,
    trimmedMatches: trimmedMatches.length,
    collisions: allCollisions,
    vendorsWithoutCollision,
  };

  // Write report
  const outputDir = path.join(process.cwd(), "docs", "audits");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportPath = path.join(outputDir, "vendor-client-collisions.json");
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nReport written to: ${reportPath}`);

  // Write CSV for manual review
  const csvPath = path.join(outputDir, "vendor-client-collisions.csv");
  const csvHeader =
    "vendor_id,vendor_name,client_id,client_name,client_teri_code,match_type,recommendation\n";
  const csvRows = allCollisions
    .map(
      c =>
        `${c.vendorId},"${c.vendorName.replace(/"/g, '""')}",${c.clientId},"${c.clientName.replace(/"/g, '""')}",${c.clientTeriCode || ""},${c.matchType},${c.recommendation}`
    )
    .join("\n");
  fs.writeFileSync(csvPath, csvHeader + csvRows);
  console.log(`CSV written to: ${csvPath}`);

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("SUMMARY");
  console.log("=".repeat(60));

  if (allCollisions.length === 0) {
    console.log("✅ No collisions found! All vendors can be migrated safely.");
  } else {
    console.log(`⚠️  Found ${allCollisions.length} potential collisions:`);
    console.log(`  - Exact matches: ${exactMatches.length} (recommend: merge)`);
    console.log(
      `  - Case-insensitive: ${caseInsensitiveMatches.length} (recommend: manual review)`
    );
    console.log(
      `  - Trimmed: ${trimmedMatches.length} (recommend: manual review)`
    );
    console.log("");
    console.log(
      `Vendors without collision: ${vendorsWithoutCollision} (can migrate directly)`
    );
    console.log("");
    console.log("⚠️  IMPORTANT: Review collisions before migration!");
    console.log(
      '   - "merge" = Same entity, merge vendor into existing client'
    );
    console.log(
      '   - "rename" = Different entity, rename vendor before migration'
    );
    console.log('   - "manual_review" = Ambiguous, requires human decision');
  }

  console.log(`\nCompleted: ${new Date().toISOString()}`);
  process.exit(allCollisions.length > 0 ? 1 : 0);
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});



