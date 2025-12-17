import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  root: path.resolve(import.meta.dirname),
  test: {
    globals: true,
    // Use different environments for server vs client tests
    environment: "jsdom", // Use jsdom for client tests by default
    include: [
      "server/**/*.test.ts",
      "server/**/*.spec.ts",
      "client/**/*.test.{ts,tsx}",
      "client/**/*.spec.{ts,tsx}",
      "scripts/**/*.test.ts",
      "tests/property/**/*.test.ts",
      "tests/contracts/**/*.test.ts",
    ],
    environmentMatchGlobs: [
      ["server/**/*.test.ts", "node"],
      ["server/**/*.spec.ts", "node"],
      ["client/**/*.test.{ts,tsx}", "jsdom"],
      ["client/**/*.spec.{ts,tsx}", "jsdom"],
      ["tests/property/**/*.test.ts", "node"],
      ["tests/contracts/**/*.test.ts", "node"],
    ],
    setupFiles: ["./tests/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData",
        "dist/",
        "drizzle/",
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
      "@shared": path.resolve(__dirname, "./shared"),
    },
  },
});
