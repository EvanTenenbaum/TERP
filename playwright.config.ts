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
const envTaggedPattern = /@prod-smoke|@prod-regression|@dev-only/;

export default defineConfig({
  testDir: ".",
  testMatch: [
    "tests-e2e/**/*.spec.ts",
    "tests/e2e/**/*.spec.ts",
    "tests/smoke/**/*.spec.ts",
  ],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // CI/remote runs should avoid high parallelism against shared environments.
  workers: process.env.CI || isRemoteExecution ? 1 : undefined,
  reporter: [
    process.env.CI ? ["dot"] : ["list"],
    ["html"],
    ["json", { outputFile: "test-results.json" }],
    [
      "@argos-ci/playwright/reporter",
      {
        uploadToArgos: !!process.env.CI,
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
    {
      name: "smoke",
      testDir: "./tests/smoke",
      use: { ...devices["Desktop Chrome"] },
    },
    // Local-only projects: broad compatibility, dev flows, and viewport matrix.
    ...(isRemoteExecution
      ? []
      : [
          {
            name: "chromium",
            // Keep untagged legacy coverage local, but avoid duplicate env-tagged runs.
            grepInvert: envTaggedPattern,
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
            use: { ...devices["Pixel 5"] },
          },
          {
            name: "Mobile Safari",
            grepInvert: envTaggedPattern,
            use: { ...devices["iPhone 13"] },
          },
          {
            name: "Tablet",
            grepInvert: envTaggedPattern,
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
          command: "pnpm dev",
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
