import { defineConfig, devices } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  testDir: './tests-e2e',
  testMatch: ['**/*.spec.ts', '**/ai-generated/**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    process.env.CI ? ['dot'] : ['list'],
    ['html'],
    ['json', { outputFile: 'test-results.json' }],
    [
      '@argos-ci/playwright/reporter',
      {
        uploadToArgos: !!process.env.CI,
        token: process.env.ARGOS_TOKEN,
      },
    ],
  ],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ai-generated',
      testDir: './tests-e2e/ai-generated',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // In CI, we start the server manually before running tests
  // In local dev, Playwright starts the dev server automatically
  webServer: process.env.CI ? undefined : {
    command: 'pnpm dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  globalSetup: resolve(__dirname, './testing/setup-e2e.ts'),
  metadata: {
    aiAgentsEnabled: true,
    plannerVersion: '1.0',
    generatorVersion: '1.0',
    healerVersion: '1.0',
  },
});
