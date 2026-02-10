/**
 * Environment detection utilities for E2E tests.
 * Centralizes environment-aware behavior so individual specs don't reinvent it.
 */

export type TestEnvironment = "local" | "staging" | "production";

/** Detect current environment from env vars and base URL */
export function detectEnvironment(): TestEnvironment {
  const baseURL =
    process.env.PLAYWRIGHT_BASE_URL ||
    process.env.MEGA_QA_BASE_URL ||
    "http://localhost:5173";

  if (baseURL.includes("localhost") || baseURL.includes("127.0.0.1")) {
    return "local";
  }

  if (
    baseURL.includes("staging") ||
    baseURL.includes("preview") ||
    process.env.E2E_ENVIRONMENT === "staging"
  ) {
    return "staging";
  }

  return "production";
}

export const ENV = detectEnvironment();

export const IS_LOCAL = ENV === "local";
export const IS_STAGING = ENV === "staging";
export const IS_PRODUCTION = ENV === "production";
export const IS_REMOTE = !IS_LOCAL;

/** Whether DEMO_MODE is expected on the server */
export const DEMO_MODE_EXPECTED =
  process.env.DEMO_MODE === "true" || process.env.E2E_DEMO_MODE === "true";

/** Whether the cloud/live-db setup path should be used */
export const IS_CLOUD =
  process.env.MEGA_QA_CLOUD === "1" ||
  process.env.MEGA_QA_CLOUD === "true" ||
  process.env.E2E_CLOUD === "1" ||
  process.env.E2E_CLOUD === "true" ||
  process.env.E2E_USE_LIVE_DB === "1" ||
  process.env.SKIP_E2E_SETUP === "1";

/** The base URL being targeted */
export const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.MEGA_QA_BASE_URL ||
  "http://localhost:5173";
