import { test, expect } from "@playwright/test";
import { loginAsAuditor } from "../fixtures/auth";

test.describe("Auditor Role RBAC Verification @prod-regression @rbac", () => {
  test.beforeEach(async ({ page }) => {
    const isDemoMode =
      process.env.DEMO_MODE === "true" || process.env.E2E_DEMO_MODE === "true";
    if (isDemoMode) {
      test.skip(
        true,
        "RBAC tests are meaningless in DEMO_MODE - all users are Super Admin"
      );
    }
    await loginAsAuditor(page);
  });

  test("auditor can view all modules", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/dashboard|\/$/);

    await page.goto("/clients");
    await expect(page).toHaveURL(/clients/);

    await page.goto("/orders");
    await expect(page).toHaveURL(/orders/);

    await page.goto("/accounting/invoices");
    await expect(page).toHaveURL(/accounting\/invoices/);

    await page.goto("/inventory");
    await expect(page).toHaveURL(/inventory/);
  });

  test("auditor cannot create clients", async ({ page }) => {
    await page.goto("/clients");
    const addButton = page.locator('button:has-text("Add Client")');
    const count = await addButton.count();
    if (count > 0) {
      await expect(addButton.first()).toBeDisabled();
    } else {
      await expect(addButton).toHaveCount(0);
    }
  });
});
