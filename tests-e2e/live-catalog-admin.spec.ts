import { test, expect, type Page } from "@playwright/test";
import { checkAccessibility } from "./utils/accessibility";
import { loginAsAdmin } from "./fixtures/auth";
import { trpcQuery } from "./utils/golden-flow-helpers";

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

interface Client {
  id: number;
  name: string;
}

interface ClientListResponse {
  items: Client[];
}

/**
 * Get the first available client for testing
 */
async function getFirstClient(page: Page): Promise<Client | null> {
  try {
    const response = await trpcQuery<ClientListResponse>(page, "clients.list", {
      limit: 1,
    });
    return response.items[0] ?? null;
  } catch (error) {
    console.error("Failed to fetch first client:", error);
    return null;
  }
}

test.describe("Live Catalog - Admin Workflows", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should configure Live Catalog for client", async ({ page }) => {
    // Get first available client
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    // Navigate to client profile
    await page.goto(`/clients/${client?.id}`);

    // Click Live Catalog tab
    await page.getByRole("tab", { name: "Live Catalog" }).click();

    // Check accessibility
    await checkAccessibility(page);

    // Take initial screenshot
    await takeScreenshot(page, "live-catalog-admin-config-initial");

    // Enable Live Catalog
    await page.getByLabel("Enable Live Catalog").check();

    // Configure attribute visibility
    await page.getByLabel("Show Quantity Available").check();
    await page.getByLabel("Show Brand").check();
    await page.getByLabel("Show Grade").check();
    await page.getByLabel("Show Base Price").check();

    // Enable price alerts
    await page.getByLabel("Enable Price Alerts").check();

    // Take configured screenshot
    await takeScreenshot(page, "live-catalog-admin-config-enabled");

    // Save configuration
    await page.getByRole("button", { name: "Save Configuration" }).click();

    // Verify success message
    await expect(
      page.getByText(/Configuration saved successfully/i)
    ).toBeVisible();
  });

  test("should view submitted interest lists", async ({ page }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();

    // Switch to Interest Lists tab
    await page.getByRole("tab", { name: "Interest Lists" }).click();

    // Verify interest lists table is visible
    await expect(page.getByRole("table")).toBeVisible();

    // Verify table has data
    const rows = await page.getByRole("row").count();
    expect(rows).toBeGreaterThan(1); // Header + at least one data row

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-interest-lists");
  });

  test("should view interest list details with change detection", async ({
    page,
  }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();
    await page.getByRole("tab", { name: "Interest Lists" }).click();

    // Click View Details on first interest list
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "View Details" })
      .click();

    // Verify modal is visible
    await expect(
      page.getByRole("dialog", { name: "Interest List Details" })
    ).toBeVisible();

    // Verify items table is visible
    await expect(page.getByTestId("interest-list-items-table")).toBeVisible();

    // Check for change indicators
    const changeIndicators = await page.getByTestId("change-indicator").count();

    if (changeIndicators > 0) {
      // Verify red bold text for changes
      const changedText = await page.getByTestId("changed-value").first();
      await expect(changedText).toHaveCSS("color", /rgb\(220, 38, 38\)/); // red-600
      await expect(changedText).toHaveCSS("font-weight", "700"); // bold
    }

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-interest-list-details");

    // Check accessibility
    await checkAccessibility(page);
  });

  test("should add interest list items to new order", async ({ page }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();
    await page.getByRole("tab", { name: "Interest Lists" }).click();

    // Open interest list details
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "View Details" })
      .click();

    // Select all items
    await page.getByLabel("Select All").check();

    // Click Add to New Order
    await page.getByRole("button", { name: "Add to New Order" }).click();

    // Verify success message
    await expect(page.getByText(/Order created successfully/i)).toBeVisible();

    // Verify order number is displayed
    await expect(page.getByText(/Order #\d+/)).toBeVisible();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-order-created");
  });

  test("should add interest list items to existing draft order", async ({
    page,
  }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();
    await page.getByRole("tab", { name: "Interest Lists" }).click();

    // Open interest list details
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "View Details" })
      .click();

    // Select items
    await page.getByTestId("item-checkbox").first().check();
    await page.getByTestId("item-checkbox").nth(1).check();

    // Click Add to Draft Order
    await page.getByRole("button", { name: "Add to Draft Order" }).click();

    // Enter draft order ID
    await page.getByLabel("Draft Order ID").fill("123");

    // Confirm
    await page.getByRole("button", { name: "Add Items" }).click();

    // Verify success message
    await expect(
      page.getByText(/Items added to order successfully/i)
    ).toBeVisible();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-items-added-to-draft");
  });

  test("should update interest list status", async ({ page }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();
    await page.getByRole("tab", { name: "Interest Lists" }).click();

    // Open interest list details
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "View Details" })
      .click();

    // Update status
    await page.getByLabel("Status").selectOption("REVIEWED");

    // Verify status updated
    await expect(page.getByText("Status: REVIEWED")).toBeVisible();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-status-updated");
  });

  test("should view client draft interests", async ({ page }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();

    // Switch to Current Draft tab
    await page.getByRole("tab", { name: "Current Draft" }).click();

    // Verify draft items table is visible
    await expect(page.getByRole("table")).toBeVisible();

    // Verify total value is displayed
    await expect(page.getByTestId("draft-total-value")).toBeVisible();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-current-draft");

    // Check accessibility
    await checkAccessibility(page);
  });

  test("should view and manage price alerts", async ({ page }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();

    // Switch to Price Alerts tab
    await page.getByRole("tab", { name: "Price Alerts" }).click();

    // Verify price alerts table is visible
    await expect(page.getByRole("table")).toBeVisible();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-price-alerts");

    // Deactivate an alert
    const deactivateButtons = await page
      .getByRole("button", { name: "Deactivate" })
      .count();

    if (deactivateButtons > 0) {
      await page.getByRole("button", { name: "Deactivate" }).first().click();

      // Confirm deactivation
      await page.getByRole("button", { name: "Confirm" }).click();

      // Verify success message
      await expect(
        page.getByText(/Alert deactivated successfully/i)
      ).toBeVisible();
    }
  });

  test("should support partial item selection for orders", async ({ page }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();
    await page.getByRole("tab", { name: "Interest Lists" }).click();

    // Open interest list details
    await page
      .getByRole("row")
      .nth(1)
      .getByRole("button", { name: "View Details" })
      .click();

    // Select only some items
    await page.getByTestId("item-checkbox").first().check();
    await page.getByTestId("item-checkbox").nth(2).check();

    // Verify selected count
    const selectedCount = await page
      .getByTestId("selected-items-count")
      .textContent();
    expect(selectedCount).toContain("2");

    // Click Add to New Order
    await page.getByRole("button", { name: "Add to New Order" }).click();

    // Verify only selected items are added
    await expect(page.getByText(/2 items added to order/i)).toBeVisible();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-partial-selection");
  });

  test("should disable configuration when Live Catalog is off", async ({
    page,
  }) => {
    const client = await getFirstClient(page);
    test.skip(!client, "No clients available for testing");

    await page.goto(`/clients/${client?.id}`);
    await page.getByRole("tab", { name: "Live Catalog" }).click();

    // Disable Live Catalog
    await page.getByLabel("Enable Live Catalog").uncheck();

    // Verify attribute checkboxes are disabled
    await expect(page.getByLabel("Show Quantity Available")).toBeDisabled();
    await expect(page.getByLabel("Show Brand")).toBeDisabled();
    await expect(page.getByLabel("Show Grade")).toBeDisabled();

    // Take screenshot
    await takeScreenshot(page, "live-catalog-admin-config-disabled");
  });
});
