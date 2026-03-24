/**
 * Environment detection utilities for E2E tests.
 *
 * Centralizes environment checks so preconditions and test guards
 * can skip or adjust behavior based on the target environment.
 */

const baseUrl =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.MEGA_QA_BASE_URL ||
  "http://localhost:5173";

/** Running against localhost / 127.0.0.1 */
export const IS_LOCAL =
  baseUrl.includes("localhost") || baseUrl.includes("127.0.0.1");

/** Running against a remote URL (staging, production, etc.) */
export const IS_REMOTE = !IS_LOCAL;

/** Running against the production environment */
export const IS_PRODUCTION =
  baseUrl.includes("terp-app") && !baseUrl.includes("staging");

/** Running against staging */
export const IS_STAGING = baseUrl.includes("staging");

/** DEMO_MODE is active — all users auto-authenticate as Super Admin */
export const DEMO_MODE_EXPECTED =
  process.env.DEMO_MODE === "true" || process.env.DEMO_MODE === "1";

/** CI environment */
export const IS_CI = process.env.CI === "true";
