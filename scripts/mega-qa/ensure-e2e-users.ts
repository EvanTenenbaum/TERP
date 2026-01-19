#!/usr/bin/env tsx
/**
 * Ensure E2E users exist in the live/prod DB for Mega QA cloud runs.
 *
 * This is intentionally idempotent and non-destructive:
 * - Creates users only if missing
 * - Updates role to admin for the admin user (so admin-only UI tests can pass)
 *
 * Auth model note:
 * - Simple auth uses `users.email` as username and stores password hash in `users.loginMethod`
 * - `users.openId` is set to the username for simple auth users
 */
import { simpleAuth } from "../../server/_core/simpleAuth";
import { getDb } from "../../server/db";
import { sql } from "drizzle-orm";
import { closeConnectionPool } from "../../server/_core/connectionPool";

const truthy = (v: string | undefined) =>
  v === "1" || v === "true" || v === "yes";

async function main(): Promise<void> {
  try {
    if (
      !truthy(process.env.MEGA_QA_CLOUD) &&
      !truthy(process.env.MEGA_QA_USE_LIVE_DB)
    ) {
      console.info("Skipping ensure-e2e-users: not in cloud/live mode.");
      return;
    }

    if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL) {
      throw new Error("DATABASE_URL (or TEST_DATABASE_URL) is required");
    }

    // Use QA test accounts - these match the credentials in tests-e2e/fixtures/auth.ts
    // Password for all QA accounts: TerpQA2026!
    const QA_PASSWORD = "TerpQA2026!";

    const adminUsername =
      process.env.E2E_ADMIN_USERNAME || "qa.superadmin@terp.test";
    const adminPassword = process.env.E2E_ADMIN_PASSWORD || QA_PASSWORD;
    const standardUsername =
      process.env.E2E_STANDARD_USERNAME || "qa.salesmanager@terp.test";
    const standardPassword = process.env.E2E_STANDARD_PASSWORD || QA_PASSWORD;
    const vipUsername = process.env.E2E_VIP_USERNAME || "client@greenleaf.com";
    const vipPassword = process.env.E2E_VIP_PASSWORD || "password123";

    // Ensure DB is reachable
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    console.info("Ensuring E2E users exist (idempotent)...");

    // Create missing users
    await ensureUser(
      adminUsername,
      adminPassword,
      `${adminUsername} (E2E Admin)`
    );
    await ensureUser(
      standardUsername,
      standardPassword,
      `${standardUsername} (E2E Standard)`
    );
    await ensureUser(vipUsername, vipPassword, `${vipUsername} (E2E VIP)`);

    // Ensure passwords match what the Playwright tests will use (even if users already existed).
    await ensurePassword(adminUsername, adminPassword);
    await ensurePassword(standardUsername, standardPassword);
    await ensurePassword(vipUsername, vipPassword);

    // Ensure admin role for admin user
    await db.execute(
      sql`UPDATE users SET role='admin' WHERE openId = ${adminUsername} LIMIT 1`
    );

    console.info("✅ E2E users ensured.");
  } finally {
    // IMPORTANT: server connectionPool sets a periodic stats interval which keeps
    // the Node process alive. For one-off scripts we must close it explicitly.
    await closeConnectionPool().catch(() => {});
  }
}

async function ensureUser(
  username: string,
  password: string,
  name: string
): Promise<void> {
  try {
    await simpleAuth.createUser(username, password, name);
    console.info(`  ✅ created ${username}`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("already exists")) {
      console.info(`  ℹ️  exists ${username}`);
      return;
    }
    throw e;
  }
}

async function ensurePassword(
  username: string,
  password: string
): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const hash = await simpleAuth.hashPassword(password);
  // Users created via simple auth use openId=username and email=username.
  await db.execute(
    sql`UPDATE users SET loginMethod = ${hash} WHERE openId = ${username} OR email = ${username}`
  );
  console.info(`  🔐 ensured password for ${username}`);
}

main().catch(err => {
  console.error("❌ ensure-e2e-users failed:", err);
  process.exit(1);
});
