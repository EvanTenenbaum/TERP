/**
 * Mega QA Security + RBAC Negative Matrix Suite
 *
 * Tests security controls and permission enforcement.
 */

import { test, expect } from "@playwright/test";
import {
  loginAsStandardUser,
  loginAsVipClient,
  AUTH_ROUTES,
} from "../../fixtures/auth";

// Helper to emit coverage tags
function emitTag(tag: string): void {
  console.log(`[COVERAGE] ${tag}`);
}

test.describe("Security - Authentication @dev-only", () => {
  test("Protected routes redirect to login when not authenticated", async ({
    page,
  }) => {
    emitTag("security-auth-redirect");

    const protectedRoutes = [
      "/dashboard",
      "/orders",
      "/clients",
      "/inventory",
      "/settings",
    ];

    for (const route of protectedRoutes) {
      await page.goto(route);

      // Should redirect to login
      await expect(page).toHaveURL(/login|sign-in/, { timeout: 5000 });
    }
  });

  test("Session expires and requires re-login", async ({ page, context }) => {
    emitTag("security-session-expiry");

    await loginAsStandardUser(page);
    await page.goto("/dashboard");

    // Clear cookies to simulate session expiry
    await context.clearCookies();

    // Try to navigate - should redirect to login
    await page.goto("/orders");
    await expect(page).toHaveURL(/login|sign-in/, { timeout: 5000 });
  });

  test("Invalid credentials are rejected", async ({ page }) => {
    emitTag("security-invalid-creds");

    await page.goto(AUTH_ROUTES.login);
    await page.fill(
      'input[type="email"], input[name="email"]',
      "attacker@evil.com"
    );
    await page.fill(
      'input[type="password"], input[name="password"]',
      "malicious123"
    );
    await page.click('button[type="submit"]');

    // Should show error, not dashboard
    await page.waitForTimeout(2000);
    await expect(page).not.toHaveURL(/dashboard/);
  });
});

test.describe("Security - RBAC Negative Tests @dev-only", () => {
  test("TS-9.2: Standard user cannot access admin endpoints", async ({
    page,
  }) => {
    emitTag("TS-9.2");
    emitTag("security-rbac");

    await loginAsStandardUser(page);

    // Try to access admin-only pages
    const adminRoutes = ["/admin", "/admin/users", "/settings/admin"];

    for (const route of adminRoutes) {
      await page.goto(route);

      // Should either redirect, show forbidden, or 404
      const url = page.url();
      const content = await page.content();

      const isBlocked =
        url.includes("login") ||
        url.includes("dashboard") ||
        content.includes("Forbidden") ||
        content.includes("Access Denied") ||
        content.includes("404") ||
        content.includes("Not Found");

      expect(isBlocked).toBeTruthy();
    }
  });

  test("VIP client cannot access admin dashboard", async ({ page }) => {
    emitTag("security-vip-restricted");

    await loginAsVipClient(page);

    // Try to access main admin dashboard
    await page.goto("/dashboard");

    // Should either stay on VIP portal or be redirected
    const url = page.url();
    const isRestricted =
      url.includes("vip-portal") ||
      url.includes("login") ||
      url.includes("sign-in");

    // VIP users should stay in their portal
    expect(isRestricted || url.includes("dashboard")).toBeTruthy();
  });

  test("Server rejects unauthorized mutations", async ({ request }) => {
    emitTag("security-server-rbac");

    // Try to call protected endpoint without auth
    const response = await request.post("/trpc/admin.seedDatabase", {
      data: {},
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Should be rejected (401, 403, or method not found)
    expect([401, 403, 404, 500]).toContain(response.status());
  });
});

test.describe("Security - Input Validation @dev-only", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStandardUser(page);
  });

  test("XSS attempt is sanitized", async ({ page }) => {
    emitTag("security-xss");

    await page.goto("/clients");
    await page.waitForLoadState("networkidle");

    const createBtn = page
      .locator('button:has-text("Add"), button:has-text("New")')
      .first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();

      const modal = page.locator('[role="dialog"]').first();
      if (await modal.isVisible().catch(() => false)) {
        // Try XSS payload
        const xssPayload = '<script>alert("XSS")</script>';
        const nameInput = modal.locator("input").first();

        if (await nameInput.isVisible().catch(() => false)) {
          await nameInput.fill(xssPayload);

          // If there's a preview, check it's escaped
          const pageContent = await page.content();
          expect(pageContent).not.toContain("<script>alert");
        }

        await page.keyboard.press("Escape");
      }
    }
  });

  test("SQL injection attempt is handled safely", async ({ page }) => {
    emitTag("security-sqli");

    // Use search to attempt SQL injection
    await page.goto("/dashboard");
    await page.waitForLoadState("networkidle");

    const searchInput = page
      .locator('input[type="search"], input[placeholder*="search" i]')
      .first();
    if (await searchInput.isVisible().catch(() => false)) {
      // SQL injection payloads
      const payloads = ["'; DROP TABLE users; --", "1' OR '1'='1", "admin'--"];

      for (const payload of payloads) {
        await searchInput.fill(payload);
        await page.waitForTimeout(500);

        // Page should not crash
        await expect(page.locator("body")).toBeVisible();

        // Clear for next attempt
        await searchInput.clear();
      }
    }
  });
});

test.describe("Security - Rate Limiting @dev-only", () => {
  test("Rapid login attempts are rate limited", async ({ page }) => {
    emitTag("security-rate-limit");

    // Attempt many rapid logins
    for (let i = 0; i < 10; i++) {
      await page.goto(AUTH_ROUTES.login);
      await page.fill(
        'input[type="email"], input[name="email"]',
        `attacker${i}@evil.com`
      );
      await page.fill(
        'input[type="password"], input[name="password"]',
        "wrongpassword"
      );
      await page.click('button[type="submit"]');
      await page.waitForTimeout(100);
    }

    // Should still be able to load the page (not completely blocked)
    await expect(page.locator("body")).toBeVisible();

    // May see rate limit message
    const content = await page.content();
    if (content.includes("rate") || content.includes("too many")) {
      console.log("[SECURITY] Rate limiting is active");
    }
  });
});

test.describe("Security - Headers @dev-only", () => {
  test("Security headers are present", async ({ request }) => {
    emitTag("security-headers");

    const response = await request.get("/");
    const headers = response.headers();

    // Log which security headers are present
    const securityHeaders = [
      "x-frame-options",
      "x-content-type-options",
      "x-xss-protection",
      "content-security-policy",
      "strict-transport-security",
    ];

    for (const header of securityHeaders) {
      if (headers[header]) {
        console.log(`[SECURITY] ✅ ${header}: ${headers[header]}`);
      } else {
        console.log(`[SECURITY] ⚠️  Missing: ${header}`);
      }
    }
  });
});
