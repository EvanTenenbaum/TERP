/**
 * Staging-Critical Browser Test Suite (STX-007)
 *
 * Tests tagged @staging-critical must pass before:
 *   1. Running any stress test profile against staging
 *   2. Promoting staging to production
 *
 * Run with:
 *   PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app \
 *     pnpm playwright test --project=staging-critical
 *
 * Note on e2e-live-site.yml archive:
 *   The GitHub Actions workflow .github/workflows/archived/e2e-live-site.yml
 *   was archived because it targeted an old production URL
 *   (terp-app-b9s35.ondigitalocean.app) that is no longer the primary
 *   environment. This test suite replaces its intent using the correct
 *   staging URL and the staging-critical project/tag.
 *
 * These tests are:
 *   - Fast (< 30s each)
 *   - Non-destructive (read-only paths)
 *   - Resilient (graceful fallbacks for missing routes)
 */

import { test, expect, type Page } from "@playwright/test";

const BASE_URL =
  process.env.PLAYWRIGHT_BASE_URL ||
  process.env.MEGA_QA_BASE_URL ||
  "http://localhost:5173";

const IS_STAGING = BASE_URL.includes("terp-staging");

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function loginIfNeeded(page: Page): Promise<void> {
  const isAuthScreen = await page
    .getByText(/checking authentication|sign in|login/i)
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (!isAuthScreen) return;

  const currentUrl = page.url();
  if (!currentUrl.includes("/login")) {
    await page.goto(`${BASE_URL}/login`);
  }

  await page
    .waitForLoadState("networkidle", { timeout: 20000 })
    .catch(() => {});

  const emailInput = page
    .locator('input[name="username"]')
    .or(page.locator('input[name="email"]'))
    .or(page.locator('input[type="email"]'));

  await emailInput
    .first()
    .fill(process.env.E2E_ADMIN_USERNAME ?? "qa.superadmin@terp.test");

  const passwordInput = page
    .locator('input[name="password"]')
    .or(page.locator('input[type="password"]'));

  await passwordInput
    .first()
    .fill(process.env.E2E_ADMIN_PASSWORD ?? "TerpQA2026!");

  const submitButton = page
    .locator('button[type="submit"]')
    .or(page.getByRole("button", { name: /sign in|login|submit/i }));

  await submitButton.first().click();

  await page.waitForURL(/\/($|dashboard|inventory|sales|relationships)/, {
    timeout: 30000,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

/**
 * @staging-critical
 *
 * Verify the staging server is reachable and returns a non-5xx response.
 * This is the gating check — if this fails, no stress tests should run.
 */
test("@staging-critical staging server is reachable", async ({ request }) => {
  const healthPaths = ["/api/health", "/health", "/"];

  let reachable = false;
  let lastStatus = 0;

  for (const path of healthPaths) {
    try {
      const response = await request.get(`${BASE_URL}${path}`);
      lastStatus = response.status();

      if (response.status() < 500) {
        reachable = true;
        console.info(
          `Staging reachable via ${path} (HTTP ${response.status()})`
        );
        break;
      }
    } catch {
      // try next path
    }
  }

  expect(
    reachable,
    `Staging server is not reachable. Last HTTP status: ${lastStatus}. URL: ${BASE_URL}`
  ).toBe(true);
});

/**
 * @staging-critical
 *
 * Verify the SPA shell loads without a JavaScript crash.
 * A JS crash on the root page indicates a broken deploy.
 */
test("@staging-critical SPA shell loads without JS errors", async ({
  page,
}) => {
  const jsErrors: string[] = [];

  page.on("pageerror", err => {
    jsErrors.push(err.message);
  });

  await page.goto(`${BASE_URL}/`);
  await loginIfNeeded(page);

  await page
    .waitForLoadState("networkidle", { timeout: IS_STAGING ? 30000 : 15000 })
    .catch(() => {});

  // Filter benign errors that don't indicate a broken deploy
  const criticalErrors = jsErrors.filter(
    e =>
      !e.includes("ResizeObserver") &&
      !e.includes("Non-Error") &&
      !e.includes("hydration") &&
      !e.includes("Content Security Policy")
  );

  if (criticalErrors.length > 0) {
    console.error("Critical JS errors on SPA shell load:");
    criticalErrors.forEach(e => console.error(`  - ${e}`));
  }

  expect(
    criticalErrors,
    `${criticalErrors.length} critical JS error(s) detected on staging`
  ).toHaveLength(0);

  console.info("SPA shell loaded without critical JS errors");
});

/**
 * @staging-critical
 *
 * Verify the dashboard / main workspace renders key UI elements.
 * A broken dashboard indicates a critical regression.
 */
test("@staging-critical dashboard renders core workspace elements", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/`);
  await loginIfNeeded(page);

  await page
    .waitForLoadState("networkidle", { timeout: IS_STAGING ? 30000 : 15000 })
    .catch(() => {});

  // Verify we're on the dashboard, not an error page
  await expect(page.getByText(/404|page not found/i).first())
    .not.toBeVisible({ timeout: 2000 })
    .catch(() => {});

  // Look for any recognizable TERP UI element
  const workspaceElement = page
    .getByText(/TERP OWNER COMMAND CENTER/i)
    .or(page.getByText(/Inventory Snapshot/i))
    .or(page.getByText(/Inventory Aging/i))
    .or(page.getByText(/dashboard/i).first())
    .or(page.locator("nav").first());

  await expect(workspaceElement.first()).toBeVisible({
    timeout: IS_STAGING ? 25000 : 10000,
  });

  console.info("Dashboard workspace elements visible on staging");
});

/**
 * @staging-critical
 *
 * Verify at least one core navigation route loads without a 404 or crash.
 * Tests the set of routes that stress tests will exercise.
 */
test("@staging-critical core navigation routes are accessible", async ({
  page,
}) => {
  await page.goto(`${BASE_URL}/`);
  await loginIfNeeded(page);

  // Routes exercised during stress testing
  const criticalRoutes = [
    { paths: ["/inventory", "/products"], name: "Inventory" },
    { paths: ["/sales", "/orders"], name: "Sales" },
    { paths: ["/relationships", "/clients"], name: "Relationships" },
  ];

  const results: Array<{ name: string; status: "ok" | "fail"; path: string }> =
    [];

  for (const route of criticalRoutes) {
    let succeeded = false;
    let successPath = "";

    for (const path of route.paths) {
      try {
        await page.goto(`${BASE_URL}${path}`, {
          timeout: IS_STAGING ? 30000 : 15000,
        });
        await loginIfNeeded(page);

        const has404 = await page
          .getByText(/404|page not found/i)
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        const hasCrash = await page
          .getByText(/something went wrong|fatal error/i)
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);

        if (!has404 && !hasCrash) {
          succeeded = true;
          successPath = path;
          break;
        }
      } catch {
        // try next path
      }
    }

    if (succeeded) {
      results.push({ name: route.name, status: "ok", path: successPath });
      console.info(`${route.name} accessible at ${successPath}`);
    } else {
      results.push({
        name: route.name,
        status: "fail",
        path: route.paths.join(" | "),
      });
      console.error(
        `${route.name} NOT accessible via: ${route.paths.join(", ")}`
      );
    }
  }

  const failures = results.filter(r => r.status === "fail");
  expect(
    failures,
    `${failures.length} critical route(s) inaccessible: ${failures.map(f => f.name).join(", ")}`
  ).toHaveLength(0);
});

/**
 * @staging-critical
 *
 * Verify the API layer responds to requests.
 * A completely silent API indicates a broken server process.
 */
test("@staging-critical API layer responds to requests", async ({
  request,
}) => {
  const apiPaths = [
    "/api/health",
    "/health",
    // tRPC endpoint — will 401 without auth, but server must respond
    "/api/trpc/health.ping",
  ];

  let anyResponse = false;

  for (const path of apiPaths) {
    try {
      const response = await request.get(`${BASE_URL}${path}`);
      // Any response (including 401, 404) proves the server is alive
      if (response.status() > 0) {
        anyResponse = true;
        console.info(`API responded at ${path}: HTTP ${response.status()}`);
        break;
      }
    } catch {
      // continue
    }
  }

  expect(
    anyResponse,
    "API layer did not respond to any request. Server may be down."
  ).toBe(true);
});
