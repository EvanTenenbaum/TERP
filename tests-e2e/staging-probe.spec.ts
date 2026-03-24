/**
 * Staging Probe - Quick connectivity + screenshot test
 * Run with: PLAYWRIGHT_BASE_URL=https://terp-staging-yicld.ondigitalocean.app SKIP_E2E_SETUP=1 npx playwright test tests-e2e/staging-probe.spec.ts --project=staging-critical
 */
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "./fixtures/auth";

test("@staging-critical probe: login page loads", async ({ page }) => {
  await page.goto("/login");
  await page.waitForLoadState("networkidle");
  await page.screenshot({
    path: "test-results/staging-login.png",
    fullPage: true,
  });
  const submit = page.locator('button[type="submit"]').first();
  await expect(submit).toBeVisible({ timeout: 15000 });
});

test("@staging-critical probe: can authenticate", async ({ page }) => {
  await loginAsAdmin(page);
  await page.screenshot({
    path: "test-results/staging-dashboard.png",
    fullPage: true,
  });
  await expect(page).toHaveURL(/\/(dashboard)?(\?.*)?$/, { timeout: 15000 });
});
