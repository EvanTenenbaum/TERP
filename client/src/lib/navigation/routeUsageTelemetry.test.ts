/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it } from "vitest";
import {
  clearRouteUsageEvents,
  getLegacyRouteUsageAudit,
  getLegacyRouteUsageSummary,
  getRouteUsageEvents,
  LEGACY_ROUTE_PATHS,
  trackLegacyRouteRedirect,
  trackWorkspaceHomeVisit,
} from "./routeUsageTelemetry";

describe("routeUsageTelemetry", () => {
  beforeEach(() => {
    clearRouteUsageEvents();
  });

  it("tracks legacy route redirects", () => {
    trackLegacyRouteRedirect({
      from: "/quotes",
      to: "/sales?tab=quotes",
      tab: "quotes",
      search: "?draft=true",
    });

    const events = getRouteUsageEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: "legacy_route_redirect",
      properties: {
        from: "/quotes",
        to: "/sales?tab=quotes",
        tab: "quotes",
        search: "?draft=true",
      },
    });
  });

  it("tracks workspace home visits", () => {
    trackWorkspaceHomeVisit({
      workspace: "sales",
      path: "/sales",
      tab: "orders",
    });

    const events = getRouteUsageEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      event: "workspace_home_visit",
      properties: {
        workspace: "sales",
        path: "/sales",
        tab: "orders",
      },
    });
  });

  it("summarizes legacy route usage counts by source route", () => {
    trackLegacyRouteRedirect({ from: "/quotes", to: "/sales?tab=quotes" });
    trackLegacyRouteRedirect({ from: "/quotes", to: "/sales?tab=quotes" });
    trackLegacyRouteRedirect({
      from: "/vendors",
      to: "/relationships?tab=suppliers",
    });

    const summary = getLegacyRouteUsageSummary();
    expect(summary["/quotes"]).toBe(2);
    expect(summary["/vendors"]).toBe(1);
  });

  it("lists all legacy routes in audit and flags low usage by threshold", () => {
    trackLegacyRouteRedirect({ from: "/orders", to: "/sales?tab=orders" });
    trackLegacyRouteRedirect({ from: "/orders", to: "/sales?tab=orders" });
    trackLegacyRouteRedirect({ from: "/orders", to: "/sales?tab=orders" });
    trackLegacyRouteRedirect({ from: "/orders", to: "/sales?tab=orders" });
    trackLegacyRouteRedirect({ from: "/quotes", to: "/sales?tab=quotes" });

    const audit = getLegacyRouteUsageAudit({
      lookbackDays: 365,
      lowUsageThreshold: 3,
    });

    expect(audit).toHaveLength(LEGACY_ROUTE_PATHS.length);
    expect(audit.find(entry => entry.route === "/orders")).toMatchObject({
      count: 4,
      lowUsage: false,
    });
    expect(audit.find(entry => entry.route === "/quotes")).toMatchObject({
      count: 1,
      lowUsage: true,
    });
    expect(audit.find(entry => entry.route === "/matchmaking")).toMatchObject({
      count: 0,
      lowUsage: true,
    });
  });
});
