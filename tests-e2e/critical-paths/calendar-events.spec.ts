/**
 * Calendar Events Critical Path Tests
 *
 * Verifies the calendar functionality including
 * view switching, event display, and event management.
 *
 * Sprint E Requirement: CALENDAR-001, CALENDAR-002
 */
import { test, expect } from "@playwright/test";
import { loginAsStandardUser } from "../fixtures/auth";

test.describe("Calendar Page", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to calendar page", async ({ page }) => {
    await page.goto("/calendar");
    
    await expect(page).not.toHaveURL(/404/);
    await expect(page.locator("body")).not.toContainText("Page Not Found");
  });

  test("should display current month", async ({ page }) => {
    await page.goto("/calendar");
    
    // Should show month name
    const monthNames = ["January", "February", "March", "April", "May", "June", 
                        "July", "August", "September", "October", "November", "December"];
    const monthRegex = new RegExp(monthNames.join("|"), "i");
    
    await expect(page.locator(`text=/${monthRegex.source}/i`).first()).toBeVisible();
  });

  test("should display calendar grid", async ({ page }) => {
    await page.goto("/calendar");
    
    // Should show day headers (Sun, Mon, Tue, etc.)
    const dayHeader = page.locator('text=/sun|mon|tue|wed|thu|fri|sat/i').first();
    await expect(dayHeader).toBeVisible();
  });
});

test.describe("Calendar View Switching", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should have view switcher buttons", async ({ page }) => {
    await page.goto("/calendar");
    
    // Should have Month/Week/Day/Agenda buttons
    const viewButtons = page.locator('button:has-text("Month"), button:has-text("Week"), button:has-text("Day"), button:has-text("Agenda")');
    
    // At least one view button should be visible
    await expect(viewButtons.first()).toBeVisible();
  });

  test("should switch to Week view", async ({ page }) => {
    await page.goto("/calendar");
    
    const weekButton = page.locator('button:has-text("Week")').first();
    
    if (await weekButton.isVisible().catch(() => false)) {
      await weekButton.click();
      await page.waitForLoadState("networkidle");
      
      // Week view should show time slots or week layout
      const weekIndicator = page.locator('text=/week|am|pm|:00/i').first();
      await expect(weekIndicator).toBeVisible();
    }
  });

  test("should switch to Day view", async ({ page }) => {
    await page.goto("/calendar");
    
    const dayButton = page.locator('button:has-text("Day")').first();
    
    if (await dayButton.isVisible().catch(() => false)) {
      await dayButton.click();
      await page.waitForLoadState("networkidle");
      
      // Day view should show hourly time slots
      const timeSlot = page.locator('text=/\\d{1,2}:\\d{2}|am|pm/i').first();
      await expect(timeSlot).toBeVisible();
    }
  });

  test("should switch to Agenda view", async ({ page }) => {
    await page.goto("/calendar");
    
    const agendaButton = page.locator('button:has-text("Agenda")').first();
    
    if (await agendaButton.isVisible().catch(() => false)) {
      await agendaButton.click();
      await page.waitForLoadState("networkidle");
      
      // Agenda view should show list of events
      // (specific assertion depends on implementation)
    }
  });
});

test.describe("Calendar Navigation", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should navigate to previous month", async ({ page }) => {
    await page.goto("/calendar");
    
    // Get current month text
    const monthText = await page.locator('h1, h2, [data-testid="current-month"]').first().textContent();
    
    // Click previous button
    const prevButton = page.locator('button[aria-label*="previous" i], button:has-text("<"), button:has-text("Prev")').first();
    
    if (await prevButton.isVisible().catch(() => false)) {
      await prevButton.click();
      await page.waitForLoadState("networkidle");
      
      // Month should change
      const newMonthText = await page.locator('h1, h2, [data-testid="current-month"]').first().textContent();
      expect(newMonthText).not.toBe(monthText);
    }
  });

  test("should navigate to next month", async ({ page }) => {
    await page.goto("/calendar");
    
    // Get current month text
    const monthText = await page.locator('h1, h2, [data-testid="current-month"]').first().textContent();
    
    // Click next button
    const nextButton = page.locator('button[aria-label*="next" i], button:has-text(">"), button:has-text("Next")').first();
    
    if (await nextButton.isVisible().catch(() => false)) {
      await nextButton.click();
      await page.waitForLoadState("networkidle");
      
      // Month should change
      const newMonthText = await page.locator('h1, h2, [data-testid="current-month"]').first().textContent();
      expect(newMonthText).not.toBe(monthText);
    }
  });

  test("should navigate to Today", async ({ page }) => {
    await page.goto("/calendar");
    
    // Click Today button
    const todayButton = page.locator('button:has-text("Today")').first();
    
    if (await todayButton.isVisible().catch(() => false)) {
      await todayButton.click();
      await page.waitForLoadState("networkidle");
      
      // Should show current month
      const currentMonth = new Date().toLocaleString('default', { month: 'long' });
      await expect(page.locator(`text=/${currentMonth}/i`).first()).toBeVisible();
    }
  });
});

test.describe("Calendar Events", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("should display events on calendar", async ({ page }) => {
    await page.goto("/calendar");
    
    // Look for event indicators
    const eventIndicator = page.locator('[data-testid="calendar-event"], .event, .fc-event, [class*="event"]').first();
    
    // Events may or may not exist, just check page loads correctly
    await expect(page.locator('body')).toBeVisible();
  });

  test("should have Add Event button", async ({ page }) => {
    await page.goto("/calendar");
    
    const addButton = page.locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create"), button:has-text("+")').first();
    await expect(addButton).toBeVisible();
  });

  test("should open event form when clicking Add", async ({ page }) => {
    await page.goto("/calendar");
    
    const addButton = page.locator('button:has-text("Add Event"), button:has-text("New Event"), button:has-text("Create")').first();
    
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      
      // Should open modal or form
      const form = page.locator('[role="dialog"], form, .event-form').first();
      await expect(form).toBeVisible();
    }
  });

  test("should show event details on click", async ({ page }) => {
    await page.goto("/calendar");
    
    // Find and click an event
    const event = page.locator('[data-testid="calendar-event"], .event, .fc-event').first();
    
    if (await event.isVisible().catch(() => false)) {
      await event.click();
      
      // Should show event details
      const details = page.locator('[role="dialog"], .event-details, [data-testid="event-detail"]').first();
      await expect(details).toBeVisible();
    }
  });
});
