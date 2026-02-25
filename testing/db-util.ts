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

/* eslint-disable no-console -- CLI utility, console output is intentional */
import { execSync, spawnSync } from "child_process";
import mysql from "mysql2/promise";

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

function hasTransientDbFailure(output: string): boolean {
  return TRANSIENT_DB_PATTERNS.some(pattern => pattern.test(output));
}

function runCommandWithRetry(
  command: string,
  options: {
    env: Record<string, string | undefined>;
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
  console.log("🚀 Starting test database...");
  try {
    const compose = getComposeCommand();
    execSync(`${compose} -f testing/docker-compose.yml up -d`, {
      stdio: "inherit",
    });
    console.log("✅ Test database started successfully");

    // Wait for database to be ready
    console.log("⏳ Waiting for database to be ready...");
    execSync("sleep 5"); // Give MySQL time to initialize
    console.log("✅ Database is ready");
  } catch (error) {
    console.error("❌ Failed to start test database:", error);
    throw error;
  }
}

/**
 * Stop the test database using Docker Compose
 */
export function stopTestDatabase() {
  console.log("🛑 Stopping test database...");
  try {
    const compose = getComposeCommand();
    execSync(`${compose} -f testing/docker-compose.yml down`, {
      stdio: "inherit",
    });
    console.log("✅ Test database stopped successfully");
  } catch (error) {
    console.error("❌ Failed to stop test database:", error);
    throw error;
  }
}

/**
 * Run database migrations using Drizzle
 */
export function runMigrations() {
  console.log("📦 Running database migrations...");
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
        },
      }
    );
    console.log("✅ Migrations completed successfully");
  } catch (error) {
    console.error("❌ Failed to run migrations:", error);
    throw error;
  }
}

/**
 * Seed the database with a specific scenario
 */
export function seedDatabase(scenario: string = "light") {
  console.log(`🌱 Seeding database with scenario: ${scenario}...`);
  try {
    const databaseUrl = getTestDatabaseUrl() || getLocalTestDatabaseUrl();

    runCommandWithRetry(`pnpm seed:${scenario}`, {
      label: `Seed (${scenario})`,
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    });
    console.log("✅ Database seeded successfully");
  } catch (error) {
    console.error("❌ Failed to seed database:", error);
    throw error;
  }
}

/**
 * Ensure RBAC + QA role accounts exist for deterministic E2E/oracle auth.
 */
export function seedQaAuthAccounts() {
  console.log("🔐 Ensuring RBAC + QA auth accounts...");
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

    console.log("✅ QA auth accounts ready");
  } catch (error) {
    console.error("❌ Failed to seed QA auth accounts:", error);
    throw error;
  }
}

/**
 * Reset the test database (drop, recreate, migrate, seed)
 */
export async function resetTestDatabase(scenario: string = "light") {
  console.log("\n🔄 Resetting test database...");
  console.log("=".repeat(50));

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
    console.log("📊 Step 1: Dropping and recreating database...");
    await connection.execute("DROP DATABASE IF EXISTS `terp-test`;");
    await connection.execute("CREATE DATABASE `terp-test`;");
    console.log("   ✓ Database recreated");

    await connection.end();

    // 2. Run migrations
    console.log("\n📦 Step 2: Running migrations...");
    runMigrations();

    // 3. Seed data
    console.log(`\n🌱 Step 3: Seeding data with scenario: ${scenario}...`);
    seedDatabase(scenario);

    // 4. Ensure deterministic QA credentials and RBAC role mappings
    // used by v4 oracle and E2E fixtures.
    console.log("\n🔐 Step 4: Seeding QA auth accounts...");
    seedQaAuthAccounts();

    console.log("\n" + "=".repeat(50));
    console.log("✅ Test database reset complete!");
    console.log("=".repeat(50) + "\n");
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    throw error;
  }
}

/**
 * Run preflight checks to verify database state
 */
export async function runPreflight() {
  console.log("🔍 Running preflight checks...");

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
        const resultRows = rows as Array<{ count: number }>;
        const count = resultRows[0].count;

        if (count > 0) {
          console.log(`  ✅ ${table}: ${count} rows`);
        } else {
          console.error(`  ❌ ${table}: 0 rows (Expected > 0)`);
          allPassed = false;
        }
      } catch (err: unknown) {
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

    console.log("✅ Preflight checks passed!");
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
          console.log("Usage: tsx testing/db-util.ts <command> [scenario]");
          console.log("Commands:");
          console.log("  start         - Start test database");
          console.log("  stop          - Stop test database");
          console.log("  reset [scenario] - Reset database (default: light)");
          console.log("  migrate       - Run migrations");
          console.log("  seed [scenario]  - Seed database (default: light)");
          console.log(
            "  preflight     - Verify database connectivity (local or remote)"
          );
          console.log("\nScenarios: light, full, edge, chaos");
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
    console.log(
      "🔍 Preflight: checking DB via DATABASE_URL/TEST_DATABASE_URL..."
    );
    const isRemote = isRemoteDatabaseUrl(databaseUrl);
    console.log(`   Target: ${isRemote ? "remote" : "local"} url`);
    const masked = databaseUrl.replace(/:[^:@]+@/, ":****@");
    console.log(`   URL:    ${masked}`);
    const conn = await mysql.createConnection(
      buildMySqlConnectionOptionsFromUrl(databaseUrl)
    );
    try {
      await conn.query("SELECT 1 as health_check");
      console.log("✅ Database preflight passed");
    } finally {
      await conn.end();
    }
    return;
  }

  // Fallback to host/port defaults (local Docker)
  console.log("🔍 Preflight: checking DB via host/port config...");
  const conn = await mysql.createConnection({
    ...TEST_DB_CONFIG,
    connectTimeout: 15000,
  });
  try {
    await conn.query("SELECT 1 as health_check");
    console.log("✅ Database preflight passed");
  } finally {
    await conn.end();
  }
}
