/**
 * TER-1149: Logout enforcement
 *
 * Verifies that after `auth.logout`:
 *   1. the browser is no longer authenticated (auth.me resolves to the
 *      public demo user OR 401), not the Super Admin,
 *   2. protected mutations reject (UNAUTHORIZED / FORBIDDEN),
 *   3. navigating back into the app redirects to /login,
 *   4. replaying the pre-logout JWT via a raw fetch is rejected (blacklist).
 *
 * Also exercises the DEMO_MODE-specific regression: on staging (DEMO_MODE=true)
 * a logged-out browser must NOT be silently re-authenticated as Super Admin
 * on the next tRPC call. Fresh visitors (no cookie) are still allowed to
 * auto-auth under DEMO_MODE.
 *
 * Tag: @deep @auth
 */

import { expect, test, type APIResponse } from "@playwright/test";
import { AUTH_ROUTES, TEST_USERS, loginAsAdmin } from "../fixtures/auth";
import { trpcMutation, trpcQuery } from "../utils/golden-flow-helpers";

test.describe("TER-1149: auth.logout enforces unauthenticated state", () => {
  test.describe.configure({ tag: "@deep" });

  test("logout → me returns non-admin, protected writes fail, /dashboard redirects", async ({
    page,
  }) => {
    test.setTimeout(120_000);

    // 1) Login as Super Admin via the API.
    await loginAsAdmin(page);

    // 2) auth.me should report the authenticated admin (NOT the public demo).
    const meBefore = await trpcQuery<{
      id: number;
      email: string | null;
      role: string | null;
    }>(page, "auth.me");
    expect(
      meBefore.id,
      "pre-logout user id should be authenticated"
    ).toBeGreaterThan(0);
    expect(meBefore.email).toBe(TEST_USERS.admin.email);

    // 3) Snapshot the session cookie so we can replay it after logout.
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find(c => c.name === "terp_session");
    if (!sessionCookie) {
      throw new Error("terp_session cookie must exist after login");
    }
    const preLogoutToken = sessionCookie.value;
    expect(preLogoutToken.length).toBeGreaterThan(10);

    // 4) Logout.
    await trpcMutation(page, "auth.logout", {});

    // 5) auth.me must no longer report the admin.
    //    Under DEMO_MODE=false we expect the public demo user.
    //    Under DEMO_MODE=true (staging) the server should fall through to the
    //    public user path as well — the whole point of this ticket.
    const meAfter = await trpcQuery<{
      id: number;
      email: string | null;
      role: string | null;
    }>(page, "auth.me");
    expect(meAfter.id, "post-logout user must NOT be the Super Admin").not.toBe(
      meBefore.id
    );
    expect(
      meAfter.email,
      "post-logout user must NOT be the Super Admin email"
    ).not.toBe(TEST_USERS.admin.email);

    // 6) A strictlyProtected mutation must reject. updateProfile is the
    //    simplest — it does not mutate financial state, and it's guarded by
    //    strictlyProtectedProcedure which rejects public/demo users.
    let threw = false;
    try {
      await trpcMutation(page, "auth.updateProfile", { name: "should fail" });
    } catch (error) {
      threw = true;
      expect(String(error)).toMatch(
        /401|403|unauthorized|forbidden|UNAUTHORIZED|FORBIDDEN/i
      );
    }
    expect(threw, "strictlyProtected mutation must reject after logout").toBe(
      true
    );

    // 7) Navigating /dashboard must land on /login.
    await page.goto("/dashboard");
    await page.waitForURL(/\/login(\?.*)?$/, { timeout: 15_000 });

    // 8) Replay the pre-logout JWT in a raw fetch to /api/auth/me.
    //    Must be rejected by the blacklist.
    const baseUrl = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173";
    const replay: APIResponse = await page.request.get(
      `${baseUrl}${AUTH_ROUTES.apiMe}`,
      {
        headers: { Cookie: `terp_session=${preLogoutToken}` },
      }
    );
    expect(
      replay.status(),
      "pre-logout JWT must NOT re-authenticate (blacklist)"
    ).toBe(401);
  });

  test("fresh visitor (no cookie) still authenticates under DEMO_MODE", async ({
    browser,
  }) => {
    // This test only asserts the non-regression of the DEMO_MODE convenience
    // path: a brand-new incognito context with NO terp_session cookie must
    // still succeed against auth.me. It's a no-op against non-DEMO_MODE
    // deployments (public demo user is also valid there).
    test.setTimeout(60_000);

    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    try {
      const me = await trpcQuery<{
        id: number;
        email: string | null;
      }>(page, "auth.me");
      // In DEMO_MODE staging: id > 0 (admin auto-provisioned).
      // Otherwise: id <= 0 (public demo user). Either is acceptable here;
      // the only failure mode we're guarding against is an error/500.
      expect(typeof me.id).toBe("number");
    } finally {
      await ctx.close();
    }
  });
});
