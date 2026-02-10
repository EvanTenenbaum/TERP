/**
 * Test tag system for suite separation.
 *
 * Tags allow filtering tests into different suites:
 * - prod-smoke: Safe to run against production (read-only, no mutations)
 * - prod-regression: Extended production tests (may need specific data)
 * - dev-only: Only runs in local/staging (creates/mutates data)
 * - rbac: Role-based access control tests
 * - golden-flow: Critical business flow tests
 * - feature-flag: Tests that depend on feature flags
 */
import { test } from "@playwright/test";

/** Available test suite tags */
export type TestTag =
  | "prod-smoke"
  | "prod-regression"
  | "dev-only"
  | "rbac"
  | "golden-flow"
  | "feature-flag"
  | "crud"
  | "navigation"
  | "accounting"
  | "inventory"
  | "orders"
  | "clients"
  | "fulfillment";

/**
 * Tag a test.describe block with suite membership.
 * Usage:
 *   test.describe("My tests", () => {
 *     tagSuite("prod-smoke", "navigation");
 *     test("...", async () => { ... });
 *   });
 *
 * Run tagged suites:
 *   npx playwright test --grep @prod-smoke
 */
export function tagSuite(...tags: TestTag[]): void {
  // Playwright uses @tag annotations in test titles for filtering.
  // We annotate via test.info() for reporting.
  test.beforeEach((_fixtures, testInfo) => {
    for (const tag of tags) {
      testInfo.annotations.push({ type: "tag", description: tag });
    }
  });
}

/**
 * Create a test.describe with tags automatically applied.
 * Usage:
 *   taggedDescribe(["prod-smoke", "clients"], "Client CRUD", () => {
 *     test("...", async () => { ... });
 *   });
 */
export function taggedDescribe(
  tags: TestTag[],
  title: string,
  fn: () => void
): void {
  // Append @tags to title for Playwright --grep filtering
  const tagStr = tags.map(t => `@${t}`).join(" ");
  test.describe(`${title} ${tagStr}`, fn);
}
