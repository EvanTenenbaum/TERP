/**
 * TER-1297 — Unit tests for the breadcrumb route registry.
 *
 * These tests exercise `matchRoute` and `buildBreadcrumbTrail` directly so we
 * can prove:
 *  - Static patterns resolve to their titles (e.g. `/accounting/invoices`).
 *  - Dynamic patterns capture ids and surface the entity type + id.
 *  - Unknown segments fall back to the navigation items / humanised form.
 *  - The TER-1297 acceptance criteria (ClientProfile P0, OrderCreator UX-4)
 *    are satisfied by the trail output.
 */

import { describe, it, expect } from "vitest";

import { matchRoute, buildBreadcrumbTrail } from "./routes";

describe("matchRoute", () => {
  it("matches static routes and returns no params", () => {
    const match = matchRoute("/accounting/invoices");
    expect(match?.entry.pattern).toBe("/accounting/invoices");
    expect(match?.entry.title).toBe("Invoices");
    expect(match?.params).toEqual({});
  });

  it("returns null for unknown paths", () => {
    expect(matchRoute("/this/does/not/exist")).toBeNull();
  });

  it("ignores query strings and fragments", () => {
    const match = matchRoute("/clients?tab=active");
    expect(match?.entry.pattern).toBe("/clients");
  });

  it("matches dynamic client detail routes and captures :id", () => {
    const match = matchRoute("/clients/123");
    expect(match?.entry.pattern).toBe("/clients/:id");
    expect(match?.entry.entityType).toBe("client");
    expect(match?.params.id).toBe("123");
  });

  it("matches nested dynamic client ledger routes with :clientId", () => {
    const match = matchRoute("/clients/42/ledger");
    expect(match?.entry.pattern).toBe("/clients/:clientId/ledger");
    expect(match?.entry.entityType).toBe("client");
    expect(match?.params.clientId).toBe("42");
  });

  it("strips trailing slashes before matching", () => {
    const match = matchRoute("/orders/");
    expect(match?.entry.pattern).toBe("/orders");
  });
});

describe("buildBreadcrumbTrail", () => {
  it("returns an empty trail for the root path", () => {
    expect(buildBreadcrumbTrail("/")).toEqual([]);
  });

  it("derives static titles from the registry", () => {
    const trail = buildBreadcrumbTrail("/accounting/invoices");
    expect(trail.map(t => t.title)).toEqual(["Accounting", "Invoices"]);
    expect(trail.at(-1)?.isLast).toBe(true);
  });

  it("marks dynamic client detail pages with an entityType and entityId (P0 fix)", () => {
    // UX-2 P0: ClientProfilePage must show the client's context in the
    // breadcrumb so users know which client they are on.
    const trail = buildBreadcrumbTrail("/clients/123");
    expect(trail).toHaveLength(2);
    expect(trail[0]).toMatchObject({
      path: "/clients",
      title: "Clients",
      isLast: false,
    });
    expect(trail[1]).toMatchObject({
      path: "/clients/123",
      title: "Client",
      entityType: "client",
      entityId: "123",
      isLast: true,
    });
  });

  it("resolves intermediate client context in nested routes", () => {
    const trail = buildBreadcrumbTrail("/clients/42/ledger");
    expect(trail).toHaveLength(3);
    // The `/clients/:clientId/ledger` pattern is registered with an entity
    // type so the deepest crumb still carries the id — but the intermediate
    // `/clients/42` crumb is *also* matched against the `/clients/:id`
    // pattern and carries the entity id, which is what we want for labeling.
    expect(trail[1].entityType).toBe("client");
    expect(trail[1].entityId).toBe("42");
    expect(trail[2]).toMatchObject({
      path: "/clients/42/ledger",
      title: "Ledger",
      isLast: true,
    });
  });

  it("renders the Order Creator page as 'New Order' (UX-4)", () => {
    // UX-4: breadcrumb shows "New Order" not "Sales" for /sales/new.
    const trail = buildBreadcrumbTrail("/sales/new");
    expect(trail.map(t => t.title)).toEqual(["Sales", "New Order"]);
    expect(trail[1].entityType).toBeUndefined();
  });

  it("covers the minimum detail-entity routes required by TER-1297", () => {
    expect(buildBreadcrumbTrail("/orders/5").at(-1)).toMatchObject({
      entityType: "order",
      entityId: "5",
      title: "Order",
    });
    expect(buildBreadcrumbTrail("/invoices/7").at(-1)).toMatchObject({
      entityType: "invoice",
      entityId: "7",
      title: "Invoice",
    });
    expect(buildBreadcrumbTrail("/bills/9").at(-1)).toMatchObject({
      entityType: "bill",
      entityId: "9",
      title: "Bill",
    });
    expect(buildBreadcrumbTrail("/products/11").at(-1)).toMatchObject({
      entityType: "product",
      entityId: "11",
      title: "Product",
    });
    expect(
      buildBreadcrumbTrail("/accounting/invoices/21").at(-1)
    ).toMatchObject({
      entityType: "invoice",
      entityId: "21",
      title: "Invoice",
    });
    expect(buildBreadcrumbTrail("/accounting/bills/33").at(-1)).toMatchObject({
      entityType: "bill",
      entityId: "33",
      title: "Bill",
    });
  });

  it("humanises unknown segments as a last resort", () => {
    const trail = buildBreadcrumbTrail("/made-up-route/sub-page");
    expect(trail[0].title).toBe("Made Up Route");
    expect(trail[1].title).toBe("Sub Page");
    // Unknown segments must not carry an entity type.
    expect(trail[0].entityType).toBeUndefined();
    expect(trail[1].entityType).toBeUndefined();
  });

  it("formats numeric unknown segments as #<id> to keep the legacy contract", () => {
    const trail = buildBreadcrumbTrail("/made-up-route/99");
    expect(trail[1].title).toBe("#99");
  });
});
