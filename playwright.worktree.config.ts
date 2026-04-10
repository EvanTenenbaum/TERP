import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

export default defineConfig({
  ...baseConfig,
  testIgnore: [],
  projects: [
    ...(baseConfig.projects ?? []),
    {
      name: "deep-firefox",
      testDir: "./tests-e2e/deep",
      grepInvert: /@rbac/,
      use: {
        ...devices["Desktop Firefox"],
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },
    {
      name: "deep-webkit",
      testDir: "./tests-e2e/deep",
      grepInvert: /@rbac/,
      use: {
        ...devices["Desktop Safari"],
        actionTimeout: 30000,
        navigationTimeout: 60000,
      },
    },
  ],
});
