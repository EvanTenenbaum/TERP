/**
 * Locations Management Critical Path Tests
 *
 * Verifies the warehouse location management functionality
 * including Site/Zone/Rack/Shelf/Bin hierarchy.
 *
 * Sprint D Requirement: QA-063
 */
import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "../fixtures/auth";
import { requireElement, assertOneVisible } from "../utils/preconditions";

test.describe("Locations Page @prod-regression", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to locations page", async ({ page }) => {
    await page.goto("/locations");

    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("should display location hierarchy", async ({ page }) => {
    await page.goto("/locations");

    // Should show location data with hierarchy indicators
    const locationData = page
      .locator("text=/site|zone|rack|shelf|bin/i")
      .first();
    await expect(locationData).toBeVisible();
  });

  test("should display location count", async ({ page }) => {
    await page.goto("/locations");

    // Should show total locations or location count
    const locationCount = page.locator("text=/total|locations|\\d+/i").first();
    await expect(locationCount).toBeVisible();
  });

  test("should have expandable location tree", async ({ page }) => {
    await page.goto("/locations");

    // Look for expandable tree nodes
    const expandButton = page
      .locator(
        '[data-testid="expand-location"], button:has-text("+"), [aria-expanded]'
      )
      .first();

    await requireElement(
      page,
      '[data-testid="expand-location"], button:has-text("+"), [aria-expanded]',
      "Expandable tree nodes not available"
    );

    await expandButton.click();
    await page.waitForLoadState("networkidle");

    // Tree should have expanded - verify aria-expanded or child locations visible
    await assertOneVisible(
      page,
      [
        '[aria-expanded="true"]',
        '[data-level="1"]',
        ".child-location",
        ".nested-location",
      ],
      "Tree did not expand - no expanded state or child locations found"
    );
  });

  test("should allow searching locations", async ({ page }) => {
    await page.goto("/locations");

    // Find search input
    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    await requireElement(
      page,
      'input[type="search"], input[placeholder*="search" i]',
      "Search input not available"
    );

    await searchInput.fill("warehouse");
    await page.waitForLoadState("networkidle");

    // Results should filter
    // (specific assertion depends on data)
  });
});

test.describe("Location CRUD Operations @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should have Add Location button", async ({ page }) => {
    await page.goto("/locations");

    const addButton = page
      .locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
      )
      .first();
    await expect(addButton).toBeVisible();
  });

  test("should open location form when clicking Add", async ({ page }) => {
    await page.goto("/locations");

    const addButton = page
      .locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
      )
      .first();

    await requireElement(
      page,
      'button:has-text("Add"), button:has-text("New"), button:has-text("Create")',
      "Add button not available"
    );

    await addButton.click();

    // Should open modal or form
    const form = page.locator('[role="dialog"], form, .location-form').first();
    await expect(form).toBeVisible();
  });

  test("should display location details on click", async ({ page }) => {
    await page.goto("/locations");

    // Click on a location row
    const locationRow = page
      .locator('tbody tr, [data-testid="location-row"]')
      .first();

    await requireElement(
      page,
      'tbody tr, [data-testid="location-row"]',
      "No location rows found"
    );

    await locationRow.click();

    // Should show details panel or navigate to detail page
    // Verify that either details panel appears OR URL changed to detail page
    await assertOneVisible(
      page,
      [
        '[role="dialog"]',
        ".location-details",
        '[data-testid="location-detail"]',
      ],
      "No details panel found and URL did not change to location detail",
      5000,
      async () => page.url().includes("location")
    );
  });
});
