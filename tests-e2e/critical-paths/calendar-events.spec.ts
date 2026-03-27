/**
 * Calendar Events Critical Path Tests
 *
 * Route-accurate smoke coverage for the calendar workspace.
 */

import { test, expect, type Page } from "@playwright/test";
import { loginAsStandardUser } from "../fixtures/auth";

const MONTH_YEAR_PATTERN =
  /(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/;

async function waitForAppShell(page: Page) {
  await page.waitForLoadState("domcontentloaded");
  await expect(page.locator("body")).not.toContainText(
    /Loading TERP\.\.\.|Loading page\.\.\./,
    {
      timeout: 30000,
    }
  );
}

async function gotoCalendar(page: Page) {
  await page.goto("/calendar");
  await waitForAppShell(page);
  await expect(page).not.toHaveURL(/404/);
  await expect(page.getByRole("button", { name: "Create Event" })).toBeVisible({
    timeout: 30000,
  });
  await expect(page.getByRole("heading", { name: "Calendar" })).toBeVisible({
    timeout: 10000,
  });
}

function currentPeriod(page: Page) {
  return page.getByText(MONTH_YEAR_PATTERN).last();
}

test.describe("Calendar Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should display the current period and calendar grid", async ({
    page,
  }) => {
    await gotoCalendar(page);

    await expect(currentPeriod(page)).toBeVisible();
    await expect(page.getByText(/^Sun$/)).toBeVisible();
    await expect(page.getByText(/^Sat$/)).toBeVisible();
  });

  test("should show the calendar view switcher", async ({ page }) => {
    await gotoCalendar(page);

    await expect(page.locator("button[aria-pressed]")).toHaveCount(4);
  });
});

test.describe("Calendar View Switching", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should switch to Week view", async ({ page }) => {
    await gotoCalendar(page);

    const viewButtons = page.locator("button[aria-pressed]");
    await viewButtons.nth(1).click();

    await expect(viewButtons.nth(1)).toHaveAttribute("aria-pressed", "true");
  });

  test("should switch to Day view", async ({ page }) => {
    await gotoCalendar(page);

    const viewButtons = page.locator("button[aria-pressed]");
    await viewButtons.nth(2).click();

    await expect(viewButtons.nth(2)).toHaveAttribute("aria-pressed", "true");
  });

  test("should switch to Agenda view", async ({ page }) => {
    await gotoCalendar(page);

    const viewButtons = page.locator("button[aria-pressed]");
    await viewButtons.nth(3).click();

    await expect(viewButtons.nth(3)).toHaveAttribute("aria-pressed", "true");
  });
});

test.describe("Calendar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to the previous and next period", async ({ page }) => {
    await gotoCalendar(page);

    const originalPeriod = await currentPeriod(page).textContent();

    await page.getByRole("button", { name: "Previous period" }).click();
    await expect(currentPeriod(page)).not.toHaveText(originalPeriod ?? "");

    const previousPeriod = await currentPeriod(page).textContent();
    await page.getByRole("button", { name: "Next period" }).click();
    await expect(currentPeriod(page)).not.toHaveText(previousPeriod ?? "");
  });

  test("should return to today", async ({ page }) => {
    await gotoCalendar(page);

    await page.getByRole("button", { name: "Next period" }).click();
    await page.getByRole("button", { name: "Today" }).click();

    const currentMonth = new Date().toLocaleString("default", {
      month: "long",
    });
    await expect(currentPeriod(page)).toContainText(currentMonth);
  });
});

test.describe("Calendar Events", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should open the event form from Create Event", async ({ page }) => {
    await gotoCalendar(page);

    await page.getByRole("button", { name: "Create Event" }).click();

    await expect(page.getByRole("dialog")).toBeVisible({ timeout: 5000 });
  });
});
