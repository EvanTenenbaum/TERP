import { defineConfig, devices } from "@playwright/test";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.MEGA_QA_BASE_URL ||
  "http://localhost:5173";
const isRemoteBaseURL =
  !baseURL.includes("localhost") && !baseURL.includes("127.0.0.1");
const isCloud =
  process.env.MEGA_QA_CLOUD === "1" ||
  process.env.MEGA_QA_CLOUD === "true" ||
  process.env.MEGA_QA_USE_LIVE_DB === "1" ||
  process.env.MEGA_QA_USE_LIVE_DB === "true" ||
  process.env.SKIP_E2E_SETUP === "1" ||
  process.env.SKIP_E2E_SETUP === "true";
const isRemoteExecution = isRemoteBaseURL || isCloud;
const isOracleRun = Boolean(process.env.ORACLE_RUN_MODE);
const envTaggedPattern =
  /@prod-smoke|@prod-regression|@dev-only|@staging-critical|@deep|@rbac/;
const shouldUploadToArgos = Boolean(process.env.CI && process.env.ARGOS_TOKEN);

// Parse HTTP(S) proxy for Playwright browser context when running in proxied environments
function getProxyConfig():
  | { server: string; username?: string; password?: string }
  | undefined {
  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY;
  if (!proxyUrl) return undefined;
  try {
    const parsed = new URL(proxyUrl);
    return {
      server: `${parsed.protocol}//${parsed.hostname}:${parsed.port}`,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
    };
  } catch {
    return undefined;
  }
}
const proxyConfig = getProxyConfig();

export default defineConfig({
  testDir: ".",
  testMatch: [
    "tests-e2e/**/*.spec.ts",
    "tests/smoke/**/*.spec.ts",
    "tests/stress/**/*.spec.ts",
  ],
  // Oracle flow execution is intentionally serialized for determinism.
  fullyParallel: !isOracleRun,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI/remote/oracle runs should avoid high parallelism against shared environments.
  workers: process.env.CI || isRemoteExecution || isOracleRun ? 1 : undefined,
  reporter: [
    process.env.CI ? ["dot"] : ["list"],
    ["html"],
    ["json", { outputFile: "test-results.json" }],
    [
      "@argos-ci/playwright/reporter",
      {
        uploadToArgos: shouldUploadToArgos,
        token: process.env.ARGOS_TOKEN,
      },
    ],
  ],
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "prod-smoke",
      grep: /@prod-smoke/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "prod-regression",
      grep: /@prod-regression/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Staging-critical project: tests that must pass before any stress run
    // and before any production promotion. Run with:
    //   pnpm playwright test --project=staging-critical
    // Or tag individual tests with @staging-critical.
    // Note: e2e-live-site.yml was archived because it targeted an old prod URL
    // (terp-app-b9s35.ondigitalocean.app) rather than staging. The staging-critical
    // project replaces that workflow's intent using the correct staging URL.
    {
      name: "staging-critical",
      grep: /@staging-critical/,
      use: {
        ...devices["Desktop Chrome"],
        // Longer timeouts for staging — cold starts and DB queries are slower
        actionTimeout: 30000,
        navigationTimeout: 60000,
        // Use proxy when available (e.g. sandboxed CI environments)
        ...(proxyConfig ? { proxy: proxyConfig } : {}),
        // Accept proxy TLS certificates in sandboxed environments
        ignoreHTTPSErrors: !!proxyConfig,
      },
    },
    // Deep business-logic tests run first with full admin access.
    // RBAC permission tests run separately after, so auth issues never
    // block accurate findings about business logic.
    {
      name: "deep",
      testDir: "./tests-e2e/deep",
      grepInvert: /@rbac/,
      use: {
        ...devices["Desktop Chrome"],
        actionTimeout: 30000,
        navigationTimeout: 60000,
        ...(proxyConfig ? { proxy: proxyConfig } : {}),
        ignoreHTTPSErrors: !!proxyConfig,
      },
    },
    {
      name: "deep-rbac",
      testDir: "./tests-e2e/deep",
      grep: /@rbac/,
      dependencies: ["deep"],
      use: {
        ...devices["Desktop Chrome"],
        actionTimeout: 30000,
        navigationTimeout: 60000,
        ...(proxyConfig ? { proxy: proxyConfig } : {}),
        ignoreHTTPSErrors: !!proxyConfig,
      },
    },
    {
      name: "smoke",
      testDir: "./tests/smoke",
      use: { ...devices["Desktop Chrome"] },
    },
    // Dedicated oracle runtime project for deterministic flow execution.
    {
      name: "runtime-oracle",
      testMatch: /tests-e2e\/oracles\/oracle-runner\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Local-only projects: broad compatibility, dev flows, and viewport matrix.
    ...(isRemoteExecution
      ? []
      : [
          {
            name: "chromium",
            // Keep untagged legacy coverage local, but avoid duplicate env-tagged and deep runs.
            grepInvert: envTaggedPattern,
            testIgnore: /tests-e2e\/deep\//,
            use: { ...devices["Desktop Chrome"] },
          },
          {
            name: "dev-only",
            grep: /@dev-only/,
            use: { ...devices["Desktop Chrome"] },
          },
          {
            name: "ai-generated",
            testDir: "./tests-e2e/ai-generated",
            use: { ...devices["Desktop Chrome"] },
          },
          {
            name: "Mobile Chrome",
            grepInvert: envTaggedPattern,
            testIgnore: /tests-e2e\/deep\//,
            use: { ...devices["Pixel 5"] },
          },
          {
            name: "Mobile Safari",
            grepInvert: envTaggedPattern,
            testIgnore: /tests-e2e\/deep\//,
            use: { ...devices["iPhone 13"] },
          },
          {
            name: "Tablet",
            grepInvert: envTaggedPattern,
            testIgnore: /tests-e2e\/deep\//,
            use: { ...devices["iPad (gen 7)"] },
          },
        ]),
  ],
  // In CI, we start the server manually before running tests
  // In local dev, Playwright starts the dev server automatically
  // In cloud/remote mode, never start a local dev server.
  webServer:
    process.env.CI || isRemoteExecution
      ? undefined
      : {
          command:
            'pnpm test:env:up && JWT_SECRET="${JWT_SECRET:-terp-local-e2e-jwt-secret-2026-000000000000}" DATABASE_URL="${DATABASE_URL:-mysql://root:rootpassword@127.0.0.1:3307/terp-test}" TEST_DATABASE_URL="${TEST_DATABASE_URL:-mysql://root:rootpassword@127.0.0.1:3307/terp-test}" PORT=5173 pnpm dev',
          url: "http://localhost:5173",
          reuseExistingServer: true,
        },
  globalSetup: resolve(__dirname, "./testing/setup-e2e.ts"),
  metadata: {
    aiAgentsEnabled: true,
    plannerVersion: "1.0",
    generatorVersion: "1.0",
    healerVersion: "1.0",
  },
});
