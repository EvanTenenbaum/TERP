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

export default defineConfig({
  testDir: ".",
  testMatch: ["tests-e2e/**/*.spec.ts", "tests/e2e/**/*.spec.ts", "tests/smoke/**/*.spec.ts"],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // Cloud/live runs should avoid parallelizing against production.
  workers: process.env.CI || isCloud ? 1 : undefined,
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
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "smoke",
      testDir: "./tests/smoke",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "ai-generated",
      testDir: "./tests-e2e/ai-generated",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 13"] },
    },
    {
      name: "Tablet",
      use: { ...devices["iPad (gen 7)"] },
    },
  ],
  // In CI, we start the server manually before running tests
  // In local dev, Playwright starts the dev server automatically
  // In cloud/remote mode, never start a local dev server.
  webServer:
    process.env.CI || isRemoteBaseURL || isCloud
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
