/**
 * Database Utility for Testing
 *
 * Provides functions to manage the test database lifecycle:
 * - Start/stop Docker test database
 * - Reset database (drop, recreate, migrate, seed)
 * - Run migrations
 * - Seed with different scenarios
 * - Preflight connectivity check (local or remote)
 */

import { execSync, spawnSync } from "child_process";
import mysql from "mysql2/promise";
import { seedDefaultChartOfAccounts } from "../server/services/seedDefaults";

const TEST_DB_CONFIG = {
  host: "127.0.0.1",
  port: 3307,
  user: "root",
  password: "rootpassword",
  database: "terp-test",
};

const TRANSIENT_DB_PATTERNS = [
  /PROTOCOL_CONNECTION_LOST/i,
  /Connection lost: The server closed the connection/i,
  /server closed the connection/i,
];
type CommandEnv = Record<string, string | undefined>;

function hasTransientDbFailure(output: string): boolean {
  return TRANSIENT_DB_PATTERNS.some(pattern => pattern.test(output));
}

function runCommandWithRetry(
  command: string,
  options: {
    env: CommandEnv;
    label: string;
    maxAttempts?: number;
  }
): void {
  const maxAttempts = options.maxAttempts ?? 3;
  let attempt = 1;

  while (attempt <= maxAttempts) {
    const result = spawnSync(command, {
      shell: true,
      encoding: "utf8",
      env: options.env,
    });

    const stdout = result.stdout || "";
    const stderr = result.stderr || "";
    const combinedOutput = `${stdout}\n${stderr}`;

    if (stdout) process.stdout.write(stdout);
    if (stderr) process.stderr.write(stderr);

    const transientFailure = hasTransientDbFailure(combinedOutput);
    const commandFailed = result.status !== 0 || transientFailure;

    if (!commandFailed) return;

    if (!transientFailure || attempt === maxAttempts) {
      throw new Error(
        `${options.label} failed (attempt ${attempt}/${maxAttempts})` +
          `${result.status !== 0 ? ` with exit code ${result.status}` : ""}`
      );
    }

    const delaySeconds = attempt * 3;
    console.warn(
      `⚠️  ${options.label} hit transient DB disconnect ` +
        `(attempt ${attempt}/${maxAttempts}). Retrying in ${delaySeconds}s...`
    );
    execSync(`sleep ${delaySeconds}`);
    attempt += 1;
  }
}

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function getTestDatabaseUrl(): string {
  // Prefer a dedicated test DB URL, but allow DATABASE_URL (cloud / live DB)
  return process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || "";
}

function getLocalTestDatabaseUrl(): string {
  return `mysql://${TEST_DB_CONFIG.user}:${TEST_DB_CONFIG.password}@${TEST_DB_CONFIG.host}:${TEST_DB_CONFIG.port}/${TEST_DB_CONFIG.database}`;
}

function isRemoteDatabaseUrl(databaseUrl: string): boolean {
  if (!databaseUrl) return false;
  try {
    const u = new URL(databaseUrl);
    const host = u.hostname;
    return host !== "localhost" && host !== "127.0.0.1";
  } catch {
    return false;
  }
}

function getDockerBinary(): string {
  const candidates = [
    "docker",
    "/Applications/Docker.app/Contents/Resources/bin/docker",
  ];

  for (const candidate of candidates) {
    try {
      execSync(`${candidate} --version`, { stdio: "ignore" });
      return candidate;
    } catch {
      // Try next candidate.
    }
  }

  throw new Error(
    "Docker CLI not found. Install Docker Desktop or add docker to PATH."
  );
}

function getComposeCommand(): string {
  // Prefer Docker Compose v2 if available; fallback to docker-compose (v1).
  const dockerBinary = getDockerBinary();
  try {
    execSync(`${dockerBinary} compose version`, { stdio: "ignore" });
    return `${dockerBinary} compose`;
  } catch {
    execSync("docker-compose version", { stdio: "ignore" });
    return "docker-compose";
  }
}

function buildMySqlConnectionOptionsFromUrl(
  databaseUrl: string
): mysql.ConnectionOptions {
  const needsSSL =
    databaseUrl.includes("ssl-mode=REQUIRED") ||
    databaseUrl.includes("sslmode=require") ||
    databaseUrl.includes("ssl=true");

  // mysql2 does not understand ssl-mode/sslmode query params as connection options.
  // Strip them from the URI and provide an explicit ssl config instead.
  const cleanDatabaseUrl = databaseUrl
    .replace(/[?&]ssl-mode=[^&]*/gi, "")
    .replace(/[?&]sslmode=[^&]*/gi, "")
    .replace(/[?&]ssl=true/gi, "");

  return {
    uri: cleanDatabaseUrl,
    connectTimeout: 15000,
    ...(needsSSL
      ? {
          ssl: {
            rejectUnauthorized: false,
          },
        }
      : {}),
  } as mysql.ConnectionOptions;
}

/**
 * Start the test database using Docker Compose
 */
export function startTestDatabase() {
  console.info("🚀 Starting test database...");
  try {
    const compose = getComposeCommand();
    execSync(`${compose} -f testing/docker-compose.yml up -d`, {
      stdio: "inherit",
    });
    console.info("✅ Test database started successfully");

    // Wait for database to be ready
    console.info("⏳ Waiting for database to be ready...");
    execSync("sleep 5"); // Give MySQL time to initialize
    console.info("✅ Database is ready");
  } catch (error) {
    console.error("❌ Failed to start test database:", error);
    throw error;
  }
}

/**
 * Stop the test database using Docker Compose
 */
export function stopTestDatabase() {
  console.info("🛑 Stopping test database...");
  try {
    const compose = getComposeCommand();
    execSync(`${compose} -f testing/docker-compose.yml down`, {
      stdio: "inherit",
    });
    console.info("✅ Test database stopped successfully");
  } catch (error) {
    console.error("❌ Failed to stop test database:", error);
    throw error;
  }
}

/**
 * Run database migrations using Drizzle
 */
export function runMigrations() {
  console.info("📦 Running database migrations...");
  try {
    const databaseUrl = getTestDatabaseUrl() || getLocalTestDatabaseUrl();

    // Use test-schema push to keep test DB aligned with current code schema.
    // `push:mysql` is deprecated and can no-op in current drizzle-kit versions,
    // while migrate-only can lag behind newer schema columns expected by seeds.
    runCommandWithRetry(
      "pnpm drizzle-kit push --config drizzle.config.test.ts",
      {
        label: "Migration push",
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        } as CommandEnv,
      }
    );
    console.info("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Failed to run migrations:", error);
    throw error;
  }
}

/**
 * Seed the database with a specific scenario
 */
export function seedDatabase(scenario: string = "light") {
  console.info(`🌱 Seeding database with scenario: ${scenario}...`);
  try {
    const databaseUrl = getTestDatabaseUrl() || getLocalTestDatabaseUrl();

    runCommandWithRetry(`pnpm seed:${scenario}`, {
      label: `Seed (${scenario})`,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      } as CommandEnv,
    });
    console.info("✅ Database seeded successfully");
  } catch (error) {
    console.error("❌ Failed to seed database:", error);
    throw error;
  }
}

/**
 * Ensure RBAC + QA role accounts exist for deterministic E2E/oracle auth.
 */
export function seedQaAuthAccounts() {
  console.info("🔐 Ensuring RBAC + QA auth accounts...");
  try {
    const databaseUrl = getTestDatabaseUrl() || getLocalTestDatabaseUrl();
    const seededEnv = {
      ...process.env,
      DATABASE_URL: databaseUrl,
    };

    // Idempotent RBAC reconcile (safe to run on every reset).
    execSync("pnpm seed:rbac:reconcile", {
      stdio: "inherit",
      env: seededEnv,
    });

    // QA role accounts expected by tests-e2e/fixtures/auth.ts and oracle role fixtures.
    execSync("pnpm seed:qa-accounts", {
      stdio: "inherit",
      env: seededEnv,
    });

    console.info("✅ QA auth accounts ready");
  } catch (error) {
    console.error("❌ Failed to seed QA auth accounts:", error);
    throw error;
  }
}

/**
 * Ensure baseline chart-of-accounts exists for accounting golden flows.
 * Uses the canonical idempotent default seeder.
 */
export async function seedDefaultAccountingAccounts() {
  console.info("📊 Ensuring default chart of accounts...");
  try {
    const databaseUrl = getTestDatabaseUrl() || getLocalTestDatabaseUrl();
    process.env.DATABASE_URL = databaseUrl;
    await seedDefaultChartOfAccounts();
    console.info("✅ Default chart of accounts ready");
  } catch (error) {
    console.error("❌ Failed to seed default chart of accounts:", error);
    throw error;
  }
}

/**
 * Ensure at least one OPEN fiscal period exists for ledger postings.
 */
export async function seedDefaultFiscalPeriod() {
  console.info("📅 Ensuring default fiscal period...");
  const databaseUrl = getTestDatabaseUrl() || getLocalTestDatabaseUrl();
  const connection = await mysql.createConnection(
    buildMySqlConnectionOptionsFromUrl(databaseUrl)
  );

  try {
    const [existingRows] = await connection.execute(
      "SELECT COUNT(*) as count FROM fiscalPeriods WHERE deleted_at IS NULL"
    );
    const existingCount = Number(
      (existingRows as Array<{ count: number }>)[0]?.count || 0
    );

    if (existingCount > 0) {
      console.info("✅ Fiscal period already present");
      return;
    }

    await connection.execute(
      `INSERT INTO fiscalPeriods (periodName, startDate, endDate, fiscalYear, status)
       VALUES (?, ?, ?, ?, ?)`,
      ["FY 2026 Open", "2026-01-01", "2026-12-31", 2026, "OPEN"]
    );
    console.info("✅ Default fiscal period created");
  } catch (error) {
    console.error("❌ Failed to seed default fiscal period:", error);
    throw error;
  } finally {
    await connection.end();
  }
}

/**
 * Reset the test database (drop, recreate, migrate, seed)
 */
export async function resetTestDatabase(scenario: string = "light") {
  console.info("\n🔄 Resetting test database...");
  console.info("=".repeat(50));

  try {
    const databaseUrl = getTestDatabaseUrl();
    const remoteDb = isRemoteDatabaseUrl(databaseUrl);
    const allowRemoteReset = isTruthy(process.env.ALLOW_REMOTE_DB_RESET);
    if (remoteDb && !allowRemoteReset) {
      throw new Error(
        "Refusing to reset a remote database. Set ALLOW_REMOTE_DB_RESET=1 to override (dangerous)."
      );
    }

    // Connect to MySQL server (not specific database)
    const connection = await mysql.createConnection({
      host: TEST_DB_CONFIG.host,
      port: TEST_DB_CONFIG.port,
      user: TEST_DB_CONFIG.user,
      password: TEST_DB_CONFIG.password,
    });

    // 1. Drop and recreate the database
    console.info("📊 Step 1: Dropping and recreating database...");
    await connection.execute("DROP DATABASE IF EXISTS `terp-test`;");
    await connection.execute("CREATE DATABASE `terp-test`;");
    console.info("   ✓ Database recreated");

    await connection.end();

    // 2. Run migrations
    console.info("\n📦 Step 2: Running migrations...");
    runMigrations();

    // 3. Seed data
    console.info(`\n🌱 Step 3: Seeding data with scenario: ${scenario}...`);
    seedDatabase(scenario);

    // 4. Ensure baseline accounting chart for invoice/payment flows.
    console.info("\n📊 Step 4: Seeding default chart of accounts...");
    await seedDefaultAccountingAccounts();

    console.info("\n📅 Step 5: Seeding default fiscal period...");
    await seedDefaultFiscalPeriod();

    // 6. Ensure deterministic QA credentials and RBAC role mappings
    // used by v4 oracle and E2E fixtures.
    console.info("\n🔐 Step 6: Seeding QA auth accounts...");
    seedQaAuthAccounts();

    console.info("\n" + "=".repeat(50));
    console.info("✅ Test database reset complete!");
    console.info("=".repeat(50) + "\n");
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    throw error;
  }
}

/**
 * Run preflight checks to verify database state
 */
export async function runPreflight() {
  console.info("🔍 Running preflight checks...");

  try {
    const connection = await mysql.createConnection({
      host: TEST_DB_CONFIG.host,
      port: TEST_DB_CONFIG.port,
      user: TEST_DB_CONFIG.user,
      password: TEST_DB_CONFIG.password,
      database: TEST_DB_CONFIG.database,
    });

    // Tables that should have data after a basic seed
    const tablesToCheck = ["users", "products", "strains", "brands"];
    let allPassed = true;

    for (const table of tablesToCheck) {
      try {
        const [rows] = await connection.execute(
          `SELECT COUNT(*) as count FROM \`${table}\``
        );
        const typedRows = rows as Array<{ count: number }>;
        const count = typedRows[0]?.count ?? 0;

        if (count > 0) {
          console.info(`  ✅ ${table}: ${count} rows`);
        } else {
          console.error(`  ❌ ${table}: 0 rows (Expected > 0)`);
          allPassed = false;
        }
      } catch (err) {
        // If table doesn't exist, it will throw
        const message = err instanceof Error ? err.message : String(err);
        console.error(`  ❌ ${table}: Error checking table - ${message}`);
        allPassed = false;
      }
    }

    await connection.end();

    if (!allPassed) {
      throw new Error(
        "Preflight checks failed: Some tables are empty or missing."
      );
    }

    console.info("✅ Preflight checks passed!");
  } catch (error) {
    console.error("❌ Preflight checks failed:", error);
    throw error;
  }
}

// CLI interface - run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const scenario = process.argv[3] || "light";

  (async () => {
    try {
      switch (command) {
        case "start":
          startTestDatabase();
          break;
        case "stop":
          stopTestDatabase();
          break;
        case "reset":
          await resetTestDatabase(scenario);
          break;
        case "migrate":
          runMigrations();
          break;
        case "seed":
          seedDatabase(scenario);
          break;
        case "preflight":
          await preflightTestDatabase();
          break;
        default:
          console.info("Usage: tsx testing/db-util.ts <command> [scenario]");
          console.info("Commands:");
          console.info("  start         - Start test database");
          console.info("  stop          - Stop test database");
          console.info("  reset [scenario] - Reset database (default: light)");
          console.info("  migrate       - Run migrations");
          console.info("  seed [scenario]  - Seed database (default: light)");
          console.info(
            "  preflight     - Verify database connectivity (local or remote)"
          );
          console.info("\nScenarios: light, full, edge, chaos");
          process.exit(1);
      }
      process.exit(0);
    } catch (error) {
      console.error("❌ Command failed:", error);
      process.exit(1);
    }
  })();
}

/**
 * Preflight check: verify we can connect to the configured test database.
 *
 * Cloud mode expectation:
 * - TEST_DATABASE_URL or DATABASE_URL is set and points to the live/prod DB (your "test DB")
 * - No Docker dependency
 */
export async function preflightTestDatabase(): Promise<void> {
  const databaseUrl = getTestDatabaseUrl();

  // Prefer URL-based connectivity if present (cloud / live DB)
  if (databaseUrl) {
    console.info(
      "🔍 Preflight: checking DB via DATABASE_URL/TEST_DATABASE_URL..."
    );
    const isRemote = isRemoteDatabaseUrl(databaseUrl);
    console.info(`   Target: ${isRemote ? "remote" : "local"} url`);
    const masked = databaseUrl.replace(/:[^:@]+@/, ":****@");
    console.info(`   URL:    ${masked}`);
    const conn = await mysql.createConnection(
      buildMySqlConnectionOptionsFromUrl(databaseUrl)
    );
    try {
      await conn.query("SELECT 1 as health_check");
      console.info("✅ Database preflight passed");
    } finally {
      await conn.end();
    }
    return;
  }

  // Fallback to host/port defaults (local Docker)
  console.info("🔍 Preflight: checking DB via host/port config...");
  const conn = await mysql.createConnection({
    ...TEST_DB_CONFIG,
    connectTimeout: 15000,
  });
  try {
    await conn.query("SELECT 1 as health_check");
    console.info("✅ Database preflight passed");
  } finally {
    await conn.end();
  }
}
