import { execSync } from "child_process";

function isTruthy(value: string | undefined): boolean {
  return value === "1" || value === "true" || value === "yes";
}

function isRemoteUrl(url: string | undefined): boolean {
  if (!url) return false;
  return !url.includes("localhost") && !url.includes("127.0.0.1");
}

async function globalSetup() {
  console.info("\nSetting up E2E test environment...");

  // Skip all setup when running AI agent tests against external URLs
  if (isTruthy(process.env.SKIP_E2E_SETUP)) {
    console.info("✅ Skipping E2E setup (SKIP_E2E_SETUP=1).\n");
    return;
  }

  const targetBaseUrl =
    process.env.PLAYWRIGHT_BASE_URL || process.env.MEGA_QA_BASE_URL;
  if (isRemoteUrl(targetBaseUrl)) {
    console.info(
      `✅ Skipping local DB setup for remote target (${targetBaseUrl}).\n`
    );
    return;
  }

  const cloudMode =
    isTruthy(process.env.MEGA_QA_CLOUD) ||
    isTruthy(process.env.E2E_CLOUD) ||
    isTruthy(process.env.E2E_USE_LIVE_DB) ||
    isTruthy(process.env.MEGA_QA_USE_LIVE_DB);

  if (cloudMode) {
    // Cloud-first / live DB mode:
    // - Do NOT start Docker
    // - Do NOT reset/seed (potentially destructive on live DB)
    // Just ensure we can connect to the configured DB.
    execSync("pnpm test:db:preflight", { stdio: "inherit" });
    console.info("✅ E2E environment ready (cloud/live DB mode).\n");
    return;
  }

  // Local dev mode: start Docker test DB and reset seed data.
  execSync("pnpm test:env:up", { stdio: "inherit" });
  execSync("pnpm test:db:reset:full", { stdio: "inherit" });

  console.info("✅ E2E test environment ready.\n");
}

export default globalSetup;
