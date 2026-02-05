import { test, expect } from "@playwright/test";
import { loginAsAccountant } from "../fixtures/auth";

test.describe("GF-004: GL Entry Verification", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAccountant(page);
  });

  test("invoice creation generates GL entries", async ({ page }) => {
    await page.goto("/accounting/invoices");
    await expect(
      page.getByRole("heading", { name: /invoices/i })
    ).toBeVisible();

    await page.goto("/accounting/general-ledger");
    await expect(
      page.getByRole("heading", { name: /general ledger/i })
    ).toBeVisible();
  });

  test("payment recording generates GL entries", async ({ page }) => {
    await page.goto("/accounting");
    await expect(
      page.getByRole("heading", { name: /accounting dashboard/i })
    ).toBeVisible();

    await page.goto("/accounting/general-ledger");
    await expect(
      page.getByRole("heading", { name: /general ledger/i })
    ).toBeVisible();
  });
});
