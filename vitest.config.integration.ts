import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    include: ['server/**/*.test.ts'],
    setupFiles: ['./testing/setup-integration.ts'],
    testTimeout: 30000, // Increase timeout for DB operations
  },
});
