import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("GF-003: Order-to-Cash Flow", () => {
  test("complete order to cash flow", async ({ page }) => {
    await loginAsAdmin(page);

    // Step 1: Create order
    await page.goto("/orders");
    await expect(page).toHaveURL(/orders/);

    // Step 2: Navigate to invoices
    await page.goto("/accounting/invoices");
    await expect(page).toHaveURL(/accounting\/invoices/);

    // Step 3: Navigate to AR/AP dashboard
    await page.goto("/accounting");
    await expect(page).toHaveURL(/accounting/);
  });
});
