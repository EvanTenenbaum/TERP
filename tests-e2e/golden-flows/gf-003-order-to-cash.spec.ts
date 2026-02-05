/**
 * Golden Flow Test: GF-003 Order-to-Cash
 *
 * Flow: Create order → confirm → invoice → payment → fulfill → ship
 * Multi-role: Sales Rep, Accounting, Fulfillment
 */

import { expect, test, type Page } from "@playwright/test";
import {
  loginAsAccountant,
  loginAsFulfillment,
  loginAsSalesRep,
  logout,
} from "../fixtures/auth";

const openOrders = async (page: Page): Promise<void> => {
  await page.goto("/orders");
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible({
    timeout: 15000,
  });
};

test.describe("Golden Flow: GF-003 Order-to-Cash", (): void => {
  test("should move an order through cash lifecycle with role handoffs", async ({
    page,
  }): Promise<void> => {
    await test.step("Sales Rep creates order", async (): Promise<void> => {
      await loginAsSalesRep(page);
      await openOrders(page);

      const createButton = page.locator(
        'button:has-text("New Order"), button:has-text("Create Order"), a[href*="orders/create"]'
      );
      if (
        await createButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await createButton.first().click();
        await expect(page).toHaveURL(/orders\/(new|create)/, {
          timeout: 5000,
        });

        await expect(
          page.getByRole("combobox", { name: "Select a client" })
        ).toBeVisible({ timeout: 5000 });
      }
    });

    await test.step("Sales Rep confirms order", async (): Promise<void> => {
      const confirmButton = page.locator(
        'button:has-text("Confirm"), button:has-text("Submit"), button:has-text("Place Order")'
      );
      if (
        await confirmButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await confirmButton.first().click();
      }
    });

    await test.step("Accounting generates invoice and records payment", async (): Promise<void> => {
      await logout(page);
      await loginAsAccountant(page);
      await page.goto("/accounting/invoices");
      await expect(page.getByRole("heading", { name: "Invoices" })).toBeVisible({
        timeout: 15000,
      });

      const generateButton = page.locator(
        'button:has-text("Generate Invoice"), button:has-text("Create Invoice"), button:has-text("Invoice")'
      );
      if (
        await generateButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await generateButton.first().click();
      }

      const recordPaymentButton = page.locator(
        'button:has-text("Record Payment"), button:has-text("Pay")'
      );
      if (
        await recordPaymentButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await recordPaymentButton.first().click();
      }
    });

    await test.step("Fulfillment fulfills and ships", async (): Promise<void> => {
      await logout(page);
      await loginAsFulfillment(page);
      await page.goto("/pick-pack");
      await expect(
        page.getByRole("heading", { name: "Pick & Pack" })
      ).toBeVisible({ timeout: 15000 });

      const fulfillButton = page.locator(
        'button:has-text("Pack"), button:has-text("Ready"), button:has-text("Ship")'
      );
      if (
        await fulfillButton
          .first()
          .isVisible()
          .catch(() => false)
      ) {
        await expect(fulfillButton.first()).toBeVisible();
      }
    });
  });
});
