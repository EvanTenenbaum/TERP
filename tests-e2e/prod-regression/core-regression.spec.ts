import { test, expect } from "@playwright/test";
import { loginViaApi, TEST_USERS } from "../fixtures/auth";

test.describe("Production Core Regression @prod-regression", () => {
  test("core work surfaces render for authenticated users", async ({
    page,
  }) => {
    const loggedIn = await loginViaApi(
      page,
      TEST_USERS.admin.email,
      TEST_USERS.admin.password
    );
    expect(loggedIn).toBeTruthy();

    await page.goto("/orders", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /orders/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /new order/i }).first()
    ).toBeVisible();

    await page.goto("/clients", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /clients/i }).first()
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /add client/i }).first()
    ).toBeVisible();

    await page.goto("/accounting/invoices", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: /invoices/i }).first()
    ).toBeVisible();
    await expect(page.locator("table").first()).toBeVisible();
  });
});
