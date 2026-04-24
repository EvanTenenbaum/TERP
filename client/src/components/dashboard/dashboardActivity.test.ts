import { describe, expect, it } from "vitest";
import {
  buildDashboardActivityFeed,
  buildDashboardOperationalKpis,
  getDashboardActivityCutoff,
} from "./dashboardActivity";

describe("dashboardActivity helpers", () => {
  it("builds operational KPI counts from expected deliveries, fulfillment, and appointments", () => {
    const now = new Date("2026-04-08T10:00:00.000Z");

    const metrics = buildDashboardOperationalKpis({
      now,
      orders: [
        {
          id: 1,
          orderNumber: "O-1001",
          orderType: "SALE",
          isDraft: false,
          fulfillmentStatus: "READY_FOR_PACKING",
        },
        {
          id: 2,
          orderNumber: "O-1002",
          orderType: "SALE",
          isDraft: false,
          fulfillmentStatus: "PACKED",
        },
        {
          id: 3,
          orderNumber: "O-1003",
          orderType: "SALE",
          isDraft: false,
          fulfillmentStatus: "SHIPPED",
        },
      ],
      purchaseOrders: [
        {
          id: 10,
          poNumber: "PO-2001",
          purchaseOrderStatus: "CONFIRMED",
          expectedDeliveryDate: "2026-04-09",
        },
        {
          id: 11,
          poNumber: "PO-2002",
          purchaseOrderStatus: "RECEIVING",
          expectedDeliveryDate: "2026-04-13",
        },
        {
          id: 12,
          poNumber: "PO-2003",
          purchaseOrderStatus: "RECEIVED",
          expectedDeliveryDate: "2026-04-09",
        },
      ],
      appointments: [
        {
          id: 20,
          clientName: "Acme",
          requestedSlot: "2026-04-08T14:30:00.000Z",
          status: "approved",
        },
        {
          id: 21,
          clientName: "Bravo",
          requestedSlot: "2026-04-08T16:00:00.000Z",
          status: "pending",
        },
        {
          id: 22,
          clientName: "Skip",
          requestedSlot: "2026-04-08T12:00:00.000Z",
          status: "cancelled",
        },
      ],
    });

    expect(metrics.expectedDeliveries).toBe(2);
    expect(metrics.pendingFulfillment).toBe(2);
    expect(metrics.appointmentsToday).toBe(2);
    expect(metrics.nextExpectedDeliveryLabel).toContain("Apr");
    expect(metrics.nextAppointmentLabel).toContain("Next at");
  });

  it("builds a recent activity feed from orders, payments, and intake updates after the cutoff", () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const cutoff = "2026-04-08T09:00:00.000Z";

    const items = buildDashboardActivityFeed({
      now,
      lastVisitedAt: cutoff,
      orders: [
        {
          id: 1,
          orderNumber: "O-1001",
          orderType: "SALE",
          isDraft: false,
          fulfillmentStatus: "READY_FOR_PACKING",
          client: { name: "Acme" },
          createdAt: "2026-04-08T11:30:00.000Z",
        },
      ],
      payments: [
        {
          id: 2,
          paymentNumber: "PMT-RCV-2026-000123",
          paymentType: "RECEIVED",
          amount: "3250",
          createdAt: "2026-04-08T10:45:00.000Z",
        },
      ],
      purchaseOrders: [
        {
          id: 3,
          poNumber: "PO-2001",
          purchaseOrderStatus: "RECEIVING",
          expectedDeliveryDate: "2026-04-09",
          updatedAt: "2026-04-08T10:15:00.000Z",
        },
        {
          id: 4,
          poNumber: "PO-2000",
          purchaseOrderStatus: "CONFIRMED",
          expectedDeliveryDate: "2026-04-09",
          updatedAt: "2026-04-08T08:15:00.000Z",
        },
      ],
    });

    expect(items).toHaveLength(3);
    expect(items.map(item => item.kind)).toEqual(["order", "payment", "intake"]);
    expect(items[0]?.title).toContain("O-1001");
    expect(items[1]?.detail).toContain("$3,250");
    expect(items[2]?.detail).toContain("Receiving");
  });

  it("falls back to a 24 hour activity window when no previous session timestamp exists", () => {
    const now = new Date("2026-04-08T12:00:00.000Z");
    const cutoff = getDashboardActivityCutoff(undefined, now);

    expect(cutoff.toISOString()).toBe("2026-04-07T12:00:00.000Z");
  });
});
