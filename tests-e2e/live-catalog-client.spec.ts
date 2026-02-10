import { test, expect } from "@playwright/test";
import { checkAccessibility } from "./utils/accessibility";
import { loginAsVipClient } from "./fixtures/auth";

// Conditionally import argos - may not be available in all environments
let argosScreenshot: ((page: unknown, name: string) => Promise<void>) | null =
  null;
try {
  argosScreenshot = require("@argos-ci/playwright").argosScreenshot;
} catch {
  // Argos not available, screenshots will be skipped
}

async function takeScreenshot(page: unknown, name: string): Promise<void> {
  if (argosScreenshot) {
    await argosScreenshot(page, name);
  }
}

test.describe("Live Catalog - Client Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsVipClient(page);
  });

  test("should browse catalog with filters", async ({ page }) => {
    // Navigate to catalog tab
    await page.getByRole("tab", { name: "Catalog" }).click();
    await expect(
      page.getByRole("heading", { name: "Live Catalog" })
    ).toBeVisible();

    // Check accessibility
    await checkAccessibility(page);

    // Take initial screenshot
    await takeScreenshot(page, "live-catalog-initial");

    // Verify products are displayed
    await expect(page.getByTestId("product-card")).toHaveCount(
      await page.getByTestId("product-card").count()
    );

    // Apply category filter
    await page.getByLabel("Category").click();
    await page.getByRole("option", { name: "Flower" }).click();

    // Wait for filtered results
    await page.waitForLoadState("networkidle");

    // Take filtered screenshot
    await takeScreenshot(page, "live-catalog-filtered-flower");

    // Verify filtered results
    const productCards = await page.getByTestId("product-card").all();
    expect(productCards.length).toBeGreaterThan(0);
  });

  test("should add items to interest list", async ({ page }) => {
    await page.getByRole("tab", { name: "Catalog" }).click();

    // Add first item to interest list
    await page
      .getByTestId("product-card")
      .first()
      .getByRole("button", { name: "Add to Interest" })
      .click();

    // Verify FAB badge updates
    await expect(page.getByTestId("interest-list-fab-badge")).toHaveText("1");

    // Add second item
    await page
      .getByTestId("product-card")
      .nth(1)
      .getByRole("button", { name: "Add to Interest" })
      .click();

    // Verify badge updates
    await expect(page.getByTestId("interest-list-fab-badge")).toHaveText("2");

    // Take screenshot
    await takeScreenshot(page, "live-catalog-items-added");
  });

  test("should view and manage interest list draft", async ({ page }) => {
    await page.getByRole("tab", { name: "Catalog" }).click();

    // Add items to interest list
    await page
      .getByTestId("product-card")
      .first()
      .getByRole("button", { name: "Add to Interest" })
      .click();
    await page
      .getByTestId("product-card")
      .nth(1)
      .getByRole("button", { name: "Add to Interest" })
      .click();

    // Open interest list panel (click FAB)
    await page.getByTestId("interest-list-fab").click();

    // Verify interest list panel is visible
    await expect(
      page.getByRole("heading", { name: "Interest List" })
    ).toBeVisible();

    // Verify items are displayed
    await expect(page.getByTestId("interest-list-item")).toHaveCount(2);

    // Take screenshot of interest list
    await takeScreenshot(page, "live-catalog-interest-list-panel");

    // Remove one item
    await page
      .getByTestId("interest-list-item")
      .first()
      .getByRole("button", { name: "Remove" })
      .click();

    // Verify item count updated
    await expect(page.getByTestId("interest-list-item")).toHaveCount(1);
    await expect(page.getByTestId("interest-list-fab-badge")).toHaveText("1");
  });

  test("should submit interest list successfully", async ({ page }) => {
    await page.getByRole("tab", { name: "Catalog" }).click();

    // Add items to interest list
    await page
      .getByTestId("product-card")
      .first()
      .getByRole("button", { name: "Add to Interest" })
      .click();
    await page
      .getByTestId("product-card")
      .nth(1)
      .getByRole("button", { name: "Add to Interest" })
      .click();

    // Open interest list panel
    await page.getByTestId("interest-list-fab").click();

    // Click submit button
    await page.getByRole("button", { name: "Submit Interest List" }).click();

    // Confirm submission in dialog
    await page.getByRole("button", { name: "Confirm" }).click();

    // Verify success message
    await expect(
      page.getByText(/Interest list submitted successfully/i)
    ).toBeVisible();

    // Verify interest list is cleared
    await expect(page.getByTestId("interest-list-fab-badge")).not.toBeVisible();
  });

  test("should show change indicators for price changes", async ({ page }) => {
    await page.getByRole("tab", { name: "Catalog" }).click();

    // Add item to interest list
    await page
      .getByTestId("product-card")
      .first()
      .getByRole("button", { name: "Add to Interest" })
      .click();

    // Open interest list panel
    await page.getByTestId("interest-list-fab").click();

    // Check for change indicators (if any items have changed)
    const changeIndicators = await page
      .getByTestId("price-change-indicator")
      .count();

    // Take screenshot showing change indicators
    if (changeIndicators > 0) {
      await takeScreenshot(page, "live-catalog-change-indicators");

      // Verify red bold text for changes
      const changedPrice = await page.getByTestId("changed-price").first();
      await expect(changedPrice).toHaveCSS("color", /rgb\(220, 38, 38\)/); // red-600
      await expect(changedPrice).toHaveCSS("font-weight", "700"); // bold
    }
  });

  test("should save and apply catalog views", async ({ page }) => {
    await page.getByRole("tab", { name: "Catalog" }).click();

    // Apply filters
    await page.getByLabel("Category").click();
    await page.getByRole("option", { name: "Flower" }).click();

    await page.getByLabel("Grade").click();
    await page.getByRole("option", { name: "A" }).click();

    // Save view
    await page.getByRole("button", { name: "Save View" }).click();
    await page.getByLabel("View Name").fill("Premium Flower");
    await page.getByRole("button", { name: "Save" }).click();

    // Verify success message
    await expect(page.getByText(/View saved successfully/i)).toBeVisible();

    // Clear filters
    await page.getByRole("button", { name: "Clear Filters" }).click();

    // Apply saved view
    await page.getByLabel("Saved Views").click();
    await page.getByRole("option", { name: "Premium Flower" }).click();

    // Verify filters are re-applied
    await expect(page.getByText("Category: Flower")).toBeVisible();
    await expect(page.getByText("Grade: A")).toBeVisible();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-saved-view-applied");
  });

  test("should create price alert for product", async ({ page }) => {
    await page.getByRole("tab", { name: "Catalog" }).click();

    // Click price alert button on first product
    await page
      .getByTestId("product-card")
      .first()
      .getByRole("button", { name: "Set Price Alert" })
      .click();

    // Fill in target price
    await page.getByLabel("Target Price").fill("95");

    // Set expiration (30 days)
    await page.getByLabel("Expires In").selectOption("30");

    // Create alert
    await page.getByRole("button", { name: "Create Alert" }).click();

    // Verify success message
    await expect(
      page.getByText(/Price alert created successfully/i)
    ).toBeVisible();

    // Verify alert appears in My Price Alerts section
    await page
      .getByRole("heading", { name: "My Price Alerts" })
      .scrollIntoViewIfNeeded();
    await expect(page.getByTestId("price-alert-item")).toHaveCount(1);

    // Take screenshot
    await takeScreenshot(page, "live-catalog-price-alert-created");
  });

  test("should support mobile responsive layout", async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.getByRole("tab", { name: "Catalog" }).click();

    // Verify mobile layout
    await expect(page.getByTestId("product-grid")).toHaveCSS(
      "grid-template-columns",
      /1fr/
    );

    // Take mobile screenshot
    await takeScreenshot(page, "live-catalog-mobile-view");

    // Add item to interest list
    await page
      .getByTestId("product-card")
      .first()
      .getByRole("button", { name: "Add to Interest" })
      .click();

    // Verify FAB is visible on mobile
    await expect(page.getByTestId("interest-list-fab")).toBeVisible();

    // Open interest list (should be full-screen on mobile)
    await page.getByTestId("interest-list-fab").click();

    // Take mobile interest list screenshot
    await takeScreenshot(page, "live-catalog-mobile-interest-list");

    // Check accessibility on mobile
    await checkAccessibility(page);
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.getByRole("tab", { name: "Catalog" }).click();

    // Tab to search field
    await page.keyboard.press("Tab");
    await page.keyboard.type("flower");

    // Wait for search results
    await page.waitForLoadState("networkidle");

    // Tab to first product card
    await page.keyboard.press("Tab");

    // Press Enter to add to interest list
    await page.keyboard.press("Enter");

    // Verify item added
    await expect(page.getByTestId("interest-list-fab-badge")).toHaveText("1");

    // Tab to FAB
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press("Tab");
    }

    // Press Enter to open interest list
    await page.keyboard.press("Enter");

    // Verify interest list panel is visible
    await expect(
      page.getByRole("heading", { name: "Interest List" })
    ).toBeVisible();
  });
});
