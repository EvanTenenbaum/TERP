import { describe, expect, it } from "vitest";

import { normalizeNotificationLink } from "./notificationLinks";

describe("normalizeNotificationLink", () => {
  it("rewrites legacy order and accounting links to canonical workspace routes", () => {
    expect(normalizeNotificationLink("/orders/55")).toBe(
      "/sales?tab=orders&id=55"
    );
    expect(normalizeNotificationLink("/invoices/91")).toBe(
      "/accounting?tab=invoices&id=91"
    );
    expect(normalizeNotificationLink("/payments/12")).toBe(
      "/accounting?tab=payments&id=12"
    );
  });

  it("normalizes routes that lost dedicated pages during workspace consolidation", () => {
    expect(normalizeNotificationLink("/tasks/5")).toBe("/notifications");
    expect(normalizeNotificationLink("/credits/8")).toBe(
      "/credits?tab=adjustments&id=8"
    );
    expect(normalizeNotificationLink("/inventory/478")).toBe(
      "/inventory?tab=inventory&batchId=478"
    );
  });

  it("falls back to metadata when a notification has no link", () => {
    expect(
      normalizeNotificationLink(null, {
        entityType: "order",
        entityId: 77,
      })
    ).toBe("/sales?tab=orders&id=77");
  });

  it("preserves already-valid calendar links", () => {
    expect(normalizeNotificationLink("/calendar?date=2026-04-06")).toBe(
      "/calendar?date=2026-04-06"
    );
  });
});
