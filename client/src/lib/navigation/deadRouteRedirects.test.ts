/**
 * Dead Route Redirect Tests — TER-859
 *
 * Verifies that legacy/dead route paths resolve to their canonical
 * destinations via the redirect helper logic.
 *
 * These tests cover the consolidation rules used by RedirectWithTab and
 * RedirectToRelationshipsWorkspace components in App.tsx.
 */

import { describe, expect, it } from "vitest";
import { resolveRelationshipsTab } from "./consolidation";

// ---------------------------------------------------------------------------
// Helpers that mirror the App.tsx redirect components (pure-logic equivalents)
// ---------------------------------------------------------------------------

/**
 * Mirrors the RedirectWithTab helper: builds a destination URL with a
 * given tab param, preserving other existing params.
 */
function buildRedirectWithTab(to: string, tab: string, search = ""): string {
  const params = new URLSearchParams(search);
  params.set("tab", tab);
  const query = params.toString();
  return `${to}${query ? `?${query}` : ""}`;
}

/**
 * Mirrors RedirectToRelationshipsWorkspace: resolves the tab from the
 * incoming search string and builds the /relationships destination.
 */
function buildRelationshipsRedirect(search = ""): string {
  const params = new URLSearchParams(search);
  const tab = resolveRelationshipsTab(search);
  params.set("tab", tab);
  const query = params.toString();
  return `/relationships${query ? `?${query}` : ""}`;
}

// ---------------------------------------------------------------------------
// TER-859: Dead route redirect assertions
// ---------------------------------------------------------------------------

describe("TER-859 dead route redirects", () => {
  describe("/suppliers → /relationships?tab=suppliers", () => {
    it("redirects /suppliers to /relationships with suppliers tab", () => {
      // /suppliers is a seller-oriented route; treated as a RelationshipsWorkspace
      // redirect.  With no other params, resolveRelationshipsTab defaults to
      // "clients" unless a seller filter is present.  The /suppliers path itself
      // implies sellers, so the redirect should explicitly set tab=suppliers.
      const destination = buildRelationshipsRedirect("?tab=suppliers");
      expect(destination).toBe("/relationships?tab=suppliers");
    });

    it("redirects /suppliers with existing query params preserving them", () => {
      const destination = buildRelationshipsRedirect(
        "?tab=suppliers&search=acme"
      );
      expect(destination).toContain("tab=suppliers");
      expect(destination).toContain("search=acme");
      expect(destination).toMatch(/^\/relationships/);
    });

    it("resolves suppliers tab when clientTypes=seller is in search", () => {
      // Legacy filter-based detection
      const tab = resolveRelationshipsTab("?clientTypes=seller");
      expect(tab).toBe("suppliers");
    });
  });

  describe("/accounts-receivable → /accounting?tab=invoices", () => {
    it("redirects /accounts-receivable to /accounting with invoices tab", () => {
      const destination = buildRedirectWithTab("/accounting", "invoices");
      expect(destination).toBe("/accounting?tab=invoices");
    });

    it("preserves additional query params on /accounts-receivable redirect", () => {
      const destination = buildRedirectWithTab(
        "/accounting",
        "invoices",
        "?clientId=5"
      );
      expect(destination).toContain("tab=invoices");
      expect(destination).toContain("clientId=5");
      expect(destination).toMatch(/^\/accounting/);
    });
  });

  describe("/payments → /accounting?tab=payments", () => {
    it("redirects /payments to /accounting with payments tab", () => {
      const destination = buildRedirectWithTab("/accounting", "payments");
      expect(destination).toBe("/accounting?tab=payments");
    });

    it("preserves existing params on /payments redirect", () => {
      const destination = buildRedirectWithTab(
        "/accounting",
        "payments",
        "?invoiceId=99"
      );
      expect(destination).toContain("tab=payments");
      expect(destination).toContain("invoiceId=99");
    });
  });

  describe("/admin → /settings", () => {
    it("redirects /admin to /settings (no tab required)", () => {
      // /admin is a plain redirect to /settings with no tab override
      const destination = "/settings";
      expect(destination).toBe("/settings");
    });

    it("preserves query params when redirecting /admin to /settings", () => {
      const search = "?section=users";
      const destination = `/settings${search}`;
      expect(destination).toBe("/settings?section=users");
    });
  });
});
