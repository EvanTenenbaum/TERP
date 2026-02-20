#!/usr/bin/env tsx
/**
 * TERP Seed Integrity Verifier
 *
 * Validates that seeded data is relationally coherent and broad enough for
 * end-to-end testing.
 *
 * Usage:
 *   pnpm seed:verify:integrity
 *   pnpm seed:verify:integrity --strict-module
 */

import { config } from "dotenv";
config();
if (!process.env.DATABASE_URL) {
  config({ path: ".env.production" });
}

import { sql } from "drizzle-orm";

// Loaded lazily after CLI parsing so --help works without DB env.
let db: {
  execute: (query: unknown) => Promise<unknown>;
};
let testConnection: (maxRetries?: number) => Promise<boolean>;
let closePool: () => Promise<void>;

type Severity = "critical" | "warning";

interface CheckResult {
  name: string;
  severity: Severity;
  passed: boolean;
  details: string;
}

interface ColumnCache {
  [tableName: string]: Set<string>;
}

interface OrphanCheckConfig {
  name: string;
  childTable: string;
  childFkCandidates: string[];
  parentTable: string;
  parentPkCandidates?: string[];
  severity?: Severity;
}

const columnCache: ColumnCache = {};

function parseArgs(): { strictModule: boolean; help: boolean } {
  const args = process.argv.slice(2);
  return {
    strictModule: args.includes("--strict-module"),
    help: args.includes("--help") || args.includes("-h"),
  };
}

function showHelp(): void {
  console.info(`
TERP Seed Integrity Verifier
============================

Checks relational integrity and module coverage after seeding.

USAGE:
  pnpm seed:verify:integrity [OPTIONS]

OPTIONS:
  --strict-module    Treat module coverage warnings as failures
  --help, -h         Show this help
`);
}

function quoteIdentifier(id: string): string {
  return `\`${id.replace(/`/g, "``")}\``;
}

function extractCount(result: unknown): number {
  if (!Array.isArray(result) || result.length === 0) {
    return 0;
  }

  const first = result[0] as unknown;
  if (Array.isArray(first)) {
    const row = first[0] as Record<string, unknown> | undefined;
    if (!row) {
      return 0;
    }
    const value = Object.values(row)[0];
    return Number(value ?? 0);
  }

  const row = first as Record<string, unknown>;
  const value = Object.values(row)[0];
  return Number(value ?? 0);
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await db.execute(sql`
    SELECT COUNT(*) AS count
    FROM information_schema.tables
    WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
  `);
  return extractCount(result) > 0;
}

async function getTableColumns(tableName: string): Promise<Set<string>> {
  if (columnCache[tableName]) {
    return columnCache[tableName];
  }

  const result = await db.execute(sql`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = DATABASE()
      AND table_name = ${tableName}
  `);

  const rows = (Array.isArray(result) ? result[0] : []) as Array<{
    column_name?: string;
    COLUMN_NAME?: string;
  }>;

  const columns = new Set<string>();
  for (const row of rows || []) {
    const value = row.column_name || row.COLUMN_NAME;
    if (value) {
      columns.add(value.toLowerCase());
    }
  }

  columnCache[tableName] = columns;
  return columns;
}

async function resolveColumn(
  tableName: string,
  candidates: string[]
): Promise<string | null> {
  const columns = await getTableColumns(tableName);
  for (const candidate of candidates) {
    if (columns.has(candidate.toLowerCase())) {
      return candidate;
    }
  }
  return null;
}

async function runRawCount(query: string): Promise<number> {
  const result = await db.execute(sql.raw(query));
  return extractCount(result);
}

async function runOrphanCheck(config: OrphanCheckConfig): Promise<CheckResult> {
  const severity: Severity = config.severity ?? "critical";
  const parentPkCandidates = config.parentPkCandidates ?? ["id"];

  const childTableExists = await tableExists(config.childTable);
  const parentTableExists = await tableExists(config.parentTable);

  if (!childTableExists || !parentTableExists) {
    return {
      name: config.name,
      severity,
      passed: false,
      details: !childTableExists
        ? `child table missing: ${config.childTable}`
        : `parent table missing: ${config.parentTable}`,
    };
  }

  const childFk = await resolveColumn(
    config.childTable,
    config.childFkCandidates
  );
  const parentPk = await resolveColumn(config.parentTable, parentPkCandidates);

  if (!childFk || !parentPk) {
    return {
      name: config.name,
      severity,
      passed: false,
      details: !childFk
        ? `missing FK column in ${config.childTable}`
        : `missing PK column in ${config.parentTable}`,
    };
  }

  const query = `
    SELECT COUNT(*) AS orphan_count
    FROM ${quoteIdentifier(config.childTable)} c
    LEFT JOIN ${quoteIdentifier(config.parentTable)} p
      ON c.${quoteIdentifier(childFk)} = p.${quoteIdentifier(parentPk)}
    WHERE c.${quoteIdentifier(childFk)} IS NOT NULL
      AND p.${quoteIdentifier(parentPk)} IS NULL
  `;

  const orphanCount = await runRawCount(query);

  return {
    name: config.name,
    severity,
    passed: orphanCount === 0,
    details:
      orphanCount === 0
        ? "no orphaned references"
        : `${orphanCount} orphaned references`,
  };
}

async function runMinimumCountCheck(
  tableName: string,
  minimum: number,
  severity: Severity = "critical"
): Promise<CheckResult> {
  const exists = await tableExists(tableName);
  if (!exists) {
    return {
      name: `count:${tableName}`,
      severity,
      passed: false,
      details: "table missing",
    };
  }

  const count = await runRawCount(
    `SELECT COUNT(*) AS row_count FROM ${quoteIdentifier(tableName)}`
  );

  return {
    name: `count:${tableName}`,
    severity,
    passed: count >= minimum,
    details:
      count >= minimum
        ? `${count} rows`
        : `expected >= ${minimum}, found ${count}`,
  };
}

async function main(): Promise<void> {
  const { strictModule, help } = parseArgs();
  if (help) {
    showHelp();
    process.exit(0);
  }

  const dbSync = await import("./db-sync");
  db = dbSync.db as typeof db;
  testConnection = dbSync.testConnection;
  closePool = dbSync.closePool;

  const connected = await testConnection(2);
  if (!connected) {
    console.error("❌ Unable to connect to database for integrity checks.");
    process.exit(1);
  }

  const results: CheckResult[] = [];

  // Critical relational checks (must pass)
  const orphanChecks: OrphanCheckConfig[] = [
    {
      name: "orders -> clients",
      childTable: "orders",
      childFkCandidates: ["client_id", "clientId"],
      parentTable: "clients",
    },
    {
      name: "order_line_items -> orders",
      childTable: "order_line_items",
      childFkCandidates: ["order_id", "orderId"],
      parentTable: "orders",
    },
    {
      name: "order_line_items -> batches",
      childTable: "order_line_items",
      childFkCandidates: ["batch_id", "batchId"],
      parentTable: "batches",
    },
    {
      name: "orders.invoice_id -> invoices",
      childTable: "orders",
      childFkCandidates: ["invoice_id", "invoiceId"],
      parentTable: "invoices",
      severity: "warning",
    },
    {
      name: "invoiceLineItems -> invoices",
      childTable: "invoiceLineItems",
      childFkCandidates: ["invoiceId", "invoice_id"],
      parentTable: "invoices",
    },
    {
      name: "payments.invoiceId -> invoices",
      childTable: "payments",
      childFkCandidates: ["invoiceId", "invoice_id"],
      parentTable: "invoices",
      severity: "warning",
    },
    {
      name: "batches -> products",
      childTable: "batches",
      childFkCandidates: ["productId", "product_id"],
      parentTable: "products",
    },
    {
      name: "products -> brands",
      childTable: "products",
      childFkCandidates: ["brandId", "brand_id"],
      parentTable: "brands",
    },
    {
      name: "client_needs -> clients",
      childTable: "client_needs",
      childFkCandidates: ["client_id", "clientId"],
      parentTable: "clients",
      severity: "warning",
    },
    {
      name: "vendor_supply -> vendors",
      childTable: "vendor_supply",
      childFkCandidates: ["vendor_id", "vendorId"],
      parentTable: "vendors",
      severity: "warning",
    },
    {
      name: "todo_tasks -> todo_lists",
      childTable: "todo_tasks",
      childFkCandidates: ["todo_list_id", "todoListId", "list_id", "listId"],
      parentTable: "todo_lists",
      severity: "warning",
    },
  ];

  for (const check of orphanChecks) {
    results.push(await runOrphanCheck(check));
  }

  // Coverage checks
  const criticalCountTables = [
    "clients",
    "vendors",
    "products",
    "batches",
    "orders",
    "invoices",
    "payments",
  ];

  for (const tableName of criticalCountTables) {
    results.push(await runMinimumCountCheck(tableName, 1, "critical"));
  }

  const moduleCountTables = [
    "calendar_events",
    "todo_lists",
    "comments",
    "sampleRequests",
    "vip_portal_configurations",
    "client_needs",
    "vendor_supply",
    "roles",
    "permissions",
  ];

  for (const tableName of moduleCountTables) {
    results.push(await runMinimumCountCheck(tableName, 1, "warning"));
  }

  const criticalFailures = results.filter(
    result => !result.passed && result.severity === "critical"
  );
  const warningFailures = results.filter(
    result => !result.passed && result.severity === "warning"
  );

  console.info("\n" + "=".repeat(78));
  console.info("TERP SEED INTEGRITY REPORT");
  console.info("=".repeat(78));

  for (const result of results) {
    const icon = result.passed
      ? "✅"
      : result.severity === "critical"
        ? "❌"
        : "⚠️";
    console.info(
      `${icon} [${result.severity}] ${result.name}: ${result.details}`
    );
  }

  console.info("-".repeat(78));
  console.info(`Critical failures: ${criticalFailures.length}`);
  console.info(`Warnings:          ${warningFailures.length}`);
  console.info("=".repeat(78) + "\n");

  await closePool();

  if (criticalFailures.length > 0) {
    process.exit(1);
  }

  if (strictModule && warningFailures.length > 0) {
    process.exit(1);
  }

  process.exit(0);
}

main().catch(async error => {
  console.error("❌ Seed integrity verification failed:", error);
  try {
    if (closePool) {
      await closePool();
    }
  } catch {
    // no-op
  }
  process.exit(1);
});
