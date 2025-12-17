/**
 * Internal helper (read-only): compute true counts for orphan checks.
 *
 * NOTE: This script intentionally does NOT print DATABASE_URL.
 */

import fs from "fs";
import mysql from "mysql2/promise";

function getDatabaseUrlFromDeploymentDetails() {
  const raw = fs.readFileSync("deployment_details.json", "utf8");
  const j = JSON.parse(raw);
  const envs = j?.[0]?.spec?.services?.[0]?.envs ?? [];
  const databaseUrl = envs.find((e) => e.key === "DATABASE_URL")?.value;
  if (!databaseUrl) throw new Error("DATABASE_URL not found in deployment_details.json");
  return databaseUrl;
}

function buildPool(databaseUrl) {
  const lower = databaseUrl.toLowerCase();
  const needsSSL =
    databaseUrl.includes("digitalocean.com") ||
    lower.includes("ssl=") ||
    lower.includes("ssl-mode=required") ||
    lower.includes("sslmode=require");

  const clean = databaseUrl
    .replace(/[?&]ssl=[^&]*/gi, "")
    .replace(/[?&]ssl-mode=[^&]*/gi, "")
    .replace(/[?&]sslmode=[^&]*/gi, "");

  return mysql.createPool({
    uri: clean,
    connectionLimit: 3,
    waitForConnections: true,
    ssl: needsSSL ? { rejectUnauthorized: false } : undefined,
  });
}

async function count(pool, sql) {
  const [rows] = await pool.query(sql);
  return rows?.[0]?.c ?? null;
}

async function main() {
  const databaseUrl = getDatabaseUrlFromDeploymentDetails();
  const pool = buildPool(databaseUrl);

  const c1 = await count(
    pool,
    "SELECT COUNT(*) as c FROM orders o LEFT JOIN order_line_items oli ON o.id = oli.order_id WHERE o.is_draft = 0 AND oli.id IS NULL"
  );
  const c2 = await count(
    pool,
    "SELECT COUNT(*) as c FROM invoices i LEFT JOIN invoiceLineItems ili ON i.id = ili.invoiceId WHERE ili.id IS NULL"
  );
  const c3 = await count(
    pool,
    "SELECT COUNT(*) as c FROM orders o WHERE o.orderType='SALE' AND o.is_draft=0 AND (o.invoice_id IS NULL OR o.invoice_id NOT IN (SELECT id FROM invoices))"
  );

  console.log("Orphan counts (true counts):");
  console.log("- orders without line items:", c1);
  console.log("- invoices without line items:", c2);
  console.log("- SALE orders without valid invoice:", c3);

  await pool.end();
}

main().catch((err) => {
  console.error("Failed to compute orphan counts:", err?.message ?? err);
  process.exit(1);
});




