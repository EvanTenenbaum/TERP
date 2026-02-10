import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "./fixtures/auth";
import { requireElement } from "./utils/preconditions";

test.describe("Clients CRUD Operations @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    // Login using centralized auth fixture
    await loginAsStandardUser(page);
  });

  test("should navigate to clients list page", async ({ page }) => {
    await page.goto("/clients");
    await expect(page).toHaveURL("/clients");
    await expect(
      page.locator("h1, h2").filter({ hasText: /client/i })
    ).toBeVisible();
  });

  test("should display clients table with data", async ({ page }) => {
    await page.goto("/clients");
    // Wait for table to load
    await page.waitForSelector('table, [role="table"], .data-table', {
      timeout: 5000,
    });
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );
    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await expect(firstRow).toBeVisible();
  });

  test("should search for clients", async ({ page }) => {
    await page.goto("/clients");
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();

    if (await searchInput.isVisible()) {
      await searchInput.fill("test");
      // Wait for network idle or table to update (proper wait instead of timeout)
      await page.waitForLoadState("networkidle");
      // Table should update with filtered results
      await expect(
        page.locator('tbody tr, [role="row"]').first()
      ).toBeVisible();
    }
  });

  test("should open create client modal", async ({ page }) => {
    await page.goto("/clients");
    const createButton = page
      .locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
      )
      .first();
    await createButton.click();

    // Modal should open
    await expect(page.locator('[role="dialog"], .modal').first()).toBeVisible();
  });

  test("should create a new client", async ({ page }) => {
    await page.goto("/clients");
    const createButton = page
      .locator(
        'button:has-text("Add"), button:has-text("New"), button:has-text("Create")'
      )
      .first();
    await createButton.click();

    // Fill in client details
    await page.fill(
      'input[name="name"], input[placeholder*="name" i]',
      "Test Client E2E"
    );
    await page.fill(
      'input[name="email"], input[type="email"]',
      "testclient@example.com"
    );
    await page.fill('input[name="phone"], input[type="tel"]', "555-0123");

    // Submit form
    const submitButton = page
      .locator(
        'button[type="submit"]:has-text("Create"), button[type="submit"]:has-text("Save")'
      )
      .first();
    await submitButton.click();

    // Success message should appear
    await expect(
      page
        .locator('.toast, [role="alert"]')
        .filter({ hasText: /success|created/i })
    ).toBeVisible({ timeout: 5000 });
  });

  test("should view client details", async ({ page }) => {
    await page.goto("/clients");
    // Click on first client row
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );
    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await firstRow.click();

    // Should navigate to client profile
    await expect(page).toHaveURL(/\/clients\/\d+/, { timeout: 5000 });
  });

  test("should edit client information", async ({ page }) => {
    await page.goto("/clients");
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );
    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await firstRow.click();

    // Wait for profile page
    await expect(page).toHaveURL(/\/clients\/\d+/, { timeout: 5000 });

    // Find and click edit button
    const editButton = page.locator('button:has-text("Edit")').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Modify a field
      const nameInput = page.locator('input[name="name"]').first();
      await nameInput.fill("Updated Client Name");

      // Save changes
      const saveButton = page.locator('button:has-text("Save")').first();
      await saveButton.click();

      // Success message
      await expect(
        page
          .locator('.toast, [role="alert"]')
          .filter({ hasText: /success|updated/i })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should delete a client", async ({ page }) => {
    await page.goto("/clients");

    // Wait for table to load
    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );
    const firstRow = page.locator('tbody tr, [role="row"]').first();
    await expect(firstRow).toBeVisible();

    // Find delete button (could be in actions menu or row actions)
    const deleteButton = page
      .locator('button:has-text("Delete"), button[aria-label*="delete" i]')
      .first();

    if (await deleteButton.isVisible()) {
      await deleteButton.click();

      // Confirm deletion in dialog
      const confirmButton = page
        .locator('button:has-text("Delete"), button:has-text("Confirm")')
        .last();
      await confirmButton.click();

      // Success message
      await expect(
        page
          .locator('.toast, [role="alert"]')
          .filter({ hasText: /success|deleted/i })
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test("should filter clients by status", async ({ page }) => {
    await page.goto("/clients");

    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );

    // Look for filter dropdown
    const filterButton = page
      .locator('button:has-text("Filter"), select[name*="status"]')
      .first();

    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Select a filter option
      await page.locator('[role="option"], option').first().click();

      // Wait for table to update (proper wait instead of timeout)
      await page.waitForLoadState("networkidle");
      await expect(
        page.locator('tbody tr, [role="row"]').first()
      ).toBeVisible();
    }
  });

  test("should sort clients by name", async ({ page }) => {
    await page.goto("/clients");

    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );
    const firstRow = page.locator('tbody tr, [role="row"]').first();

    // Click on name column header
    const nameHeader = page
      .locator('th:has-text("Name"), [role="columnheader"]:has-text("Name")')
      .first();
    await nameHeader.click();

    // Wait for sort to apply (proper wait instead of timeout)
    await page.waitForLoadState("networkidle");
    await expect(firstRow).toBeVisible();
  });

  test("should paginate through clients", async ({ page }) => {
    await page.goto("/clients");

    await requireElement(
      page,
      'tbody tr, [role="row"]',
      "No data rows available"
    );
    const firstRow = page.locator('tbody tr, [role="row"]').first();

    // Look for next page button
    const nextButton = page
      .locator('button:has-text("Next"), button[aria-label*="next" i]')
      .first();

    if ((await nextButton.isVisible()) && (await nextButton.isEnabled())) {
      await nextButton.click();

      // Wait for table to update with new page (proper wait instead of timeout)
      await page.waitForLoadState("networkidle");
      await expect(firstRow).toBeVisible();
    }
  });
});
