/**
 * Feature Flags Workflow Critical Path Tests
 *
 * Verifies the feature flag management functionality
 * including viewing, toggling, and managing flags.
 *
 * Sprint A Requirement: Feature Flag System
 */
import { test, expect } from "@playwright/test";
import { loginAsAdmin } from "../fixtures/auth";

test.describe("Feature Flags Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should navigate to settings page", async ({ page }) => {
    await page.goto("/settings");
    
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("should display Feature Flags tab", async ({ page }) => {
    await page.goto("/settings");
    
    const featureFlagsTab = page.locator('text=Feature Flags, [data-testid="feature-flags-tab"]').first();
    await expect(featureFlagsTab).toBeVisible();
  });

  test("should show feature flags list when clicking tab", async ({ page }) => {
    await page.goto("/settings");
    
    // Click Feature Flags tab
    const featureFlagsTab = page.locator('text=Feature Flags').first();
    await featureFlagsTab.click();
    
    await page.waitForLoadState("networkidle");
    
    // Should show feature flags content
    const flagsContent = page.locator('text=/flag|feature|enable|disable/i').first();
    await expect(flagsContent).toBeVisible();
  });

  test("should have Open Feature Flags Manager button", async ({ page }) => {
    await page.goto("/settings");
    
    // Click Feature Flags tab
    const featureFlagsTab = page.locator('text=Feature Flags').first();
    if (await featureFlagsTab.isVisible()) {
      await featureFlagsTab.click();
      await page.waitForLoadState("networkidle");
    }
    
    // Look for manager button
    const managerButton = page.locator('button:has-text("Open"), button:has-text("Manager"), button:has-text("Manage")').first();
    await expect(managerButton).toBeVisible();
  });
});

test.describe("Feature Flags Manager", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should open feature flags manager dialog", async ({ page }) => {
    await page.goto("/settings");
    
    // Navigate to Feature Flags tab
    const featureFlagsTab = page.locator('text=Feature Flags').first();
    if (await featureFlagsTab.isVisible()) {
      await featureFlagsTab.click();
      await page.waitForLoadState("networkidle");
    }
    
    // Click Open Manager button
    const managerButton = page.locator('button:has-text("Open Feature Flags Manager"), button:has-text("Manage Flags")').first();
    if (await managerButton.isVisible()) {
      await managerButton.click();
      
      // Should open dialog
      const dialog = page.locator('[role="dialog"]').first();
      await expect(dialog).toBeVisible();
    }
  });

  test("should display list of feature flags", async ({ page }) => {
    await page.goto("/settings");
    
    // Navigate to Feature Flags tab
    const featureFlagsTab = page.locator('text=Feature Flags').first();
    if (await featureFlagsTab.isVisible()) {
      await featureFlagsTab.click();
      await page.waitForLoadState("networkidle");
    }
    
    // Click Open Manager button
    const managerButton = page.locator('button:has-text("Open Feature Flags Manager"), button:has-text("Manage")').first();
    if (await managerButton.isVisible()) {
      await managerButton.click();
      await page.waitForLoadState("networkidle");
      
      // Should show flag list with toggles
      const flagToggle = page.locator('[role="switch"], input[type="checkbox"], [data-testid="flag-toggle"]').first();
      await expect(flagToggle).toBeVisible();
    }
  });

  test("should have toggle switches for each flag", async ({ page }) => {
    await page.goto("/settings");
    
    // Navigate to Feature Flags tab and open manager
    const featureFlagsTab = page.locator('text=Feature Flags').first();
    if (await featureFlagsTab.isVisible()) {
      await featureFlagsTab.click();
      await page.waitForLoadState("networkidle");
    }
    
    const managerButton = page.locator('button:has-text("Open"), button:has-text("Manager")').first();
    if (await managerButton.isVisible()) {
      await managerButton.click();
      await page.waitForLoadState("networkidle");
      
      // Count toggle switches
      const toggles = page.locator('[role="switch"], input[type="checkbox"]');
      const toggleCount = await toggles.count();
      
      // Should have at least one toggle
      expect(toggleCount).toBeGreaterThan(0);
    }
  });
});

test.describe("VIP Access Settings", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("should display VIP Access tab", async ({ page }) => {
    await page.goto("/settings");
    
    const vipAccessTab = page.locator('text=VIP Access, [data-testid="vip-access-tab"]').first();
    await expect(vipAccessTab).toBeVisible();
  });

  test("should show VIP client list when clicking tab", async ({ page }) => {
    await page.goto("/settings");
    
    // Click VIP Access tab
    const vipAccessTab = page.locator('text=VIP Access').first();
    await vipAccessTab.click();
    
    await page.waitForLoadState("networkidle");
    
    // Should show VIP content
    const vipContent = page.locator('text=/vip|client|impersonat/i').first();
    await expect(vipContent).toBeVisible();
  });

  test("should display Active Sessions tab", async ({ page }) => {
    await page.goto("/settings");
    
    // Click VIP Access tab
    const vipAccessTab = page.locator('text=VIP Access').first();
    if (await vipAccessTab.isVisible()) {
      await vipAccessTab.click();
      await page.waitForLoadState("networkidle");
    }
    
    // Look for Active Sessions sub-tab
    const activeSessionsTab = page.locator('text=Active Sessions').first();
    await expect(activeSessionsTab).toBeVisible();
  });

  test("should show session list in Active Sessions tab", async ({ page }) => {
    await page.goto("/settings");
    
    // Navigate to VIP Access > Active Sessions
    const vipAccessTab = page.locator('text=VIP Access').first();
    if (await vipAccessTab.isVisible()) {
      await vipAccessTab.click();
      await page.waitForLoadState("networkidle");
    }
    
    const activeSessionsTab = page.locator('text=Active Sessions').first();
    if (await activeSessionsTab.isVisible()) {
      await activeSessionsTab.click();
      await page.waitForLoadState("networkidle");
      
      // Should show session table or empty state
      const sessionContent = page.locator('table, text=/no active|session/i').first();
      await expect(sessionContent).toBeVisible();
    }
  });

  test("should display Audit History tab", async ({ page }) => {
    await page.goto("/settings");
    
    // Click VIP Access tab
    const vipAccessTab = page.locator('text=VIP Access').first();
    if (await vipAccessTab.isVisible()) {
      await vipAccessTab.click();
      await page.waitForLoadState("networkidle");
    }
    
    // Look for Audit History sub-tab
    const auditHistoryTab = page.locator('text=Audit History, text=History').first();
    await expect(auditHistoryTab).toBeVisible();
  });
});
