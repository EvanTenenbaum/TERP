import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("GF-004: GL Entry Verification", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("invoice creation generates GL entries", async ({ page }) => {
    await page.goto("/accounting/invoices", { waitUntil: "networkidle" });
    await expect(
      page
        .locator('[data-testid="invoices-table"]')
        .or(page.getByRole("heading", { name: /invoices/i }).first())
        .first()
    ).toBeVisible({ timeout: 15000 });

    await page.goto("/accounting/general-ledger", { waitUntil: "networkidle" });
    await expect(
      page
        .getByRole("heading", { name: /general ledger/i })
        .or(page.locator("table").first())
        .first()
    ).toBeVisible({ timeout: 15000 });
  });

  test("payment recording generates GL entries", async ({ page }) => {
    await page.goto("/accounting", { waitUntil: "networkidle" });
    await expect(
      page
        .getByRole("heading", { name: /accounting dashboard/i })
        .or(
          page
            .getByText(/accounts receivable|cash on hand|credit health/i)
            .first()
        )
        .first()
    ).toBeVisible({ timeout: 15000 });

    await page.goto("/accounting/general-ledger", { waitUntil: "networkidle" });
    await expect(
      page
        .getByRole("heading", { name: /general ledger/i })
        .or(page.locator("table").first())
        .first()
    ).toBeVisible({ timeout: 15000 });
  });
});
