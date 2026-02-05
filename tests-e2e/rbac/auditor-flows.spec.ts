import { test, expect } from "@playwright/test";
import { loginAsAuditor } from "../fixtures/auth";

test.describe("Auditor Role RBAC Verification", () => {
  test.beforeEach(async ({ page }) => {
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
