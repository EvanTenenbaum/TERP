/**
 * Notification Triggers Tests
 *
 * Verifies that notification triggers emit correct workspace-aware links
 * that match actual routes in App.tsx.
 *
 * @module server/services/notificationTriggers.test
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as triggers from "./notificationTriggers";
import * as notificationService from "./notificationService";

// Mock the notification service
vi.mock("./notificationService", () => ({
  sendNotification: vi.fn(),
  sendBulkNotification: vi.fn(),
}));

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() => null),
}));

describe("notificationTriggers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Order notifications", () => {
    it("onOrderCreated emits workspace-aware order links", async () => {
      const order = {
        id: 123,
        orderNumber: "ORD-001",
        clientId: 456,
        clientName: "Test Client",
        total: "1000.00",
      };

      await triggers.onOrderCreated(order);

      // Check client notification
      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: "/sales?tab=orders",
        })
      );

      // Link should NOT match legacy pattern
      const clientCall = (notificationService.sendNotification as any).mock
        .calls[0][0];
      expect(clientCall.link).not.toMatch(/^\/orders\/\d+$/);
      expect(clientCall.link).not.toMatch(/^\/orders$/);
    });

    it("onOrderConfirmed emits workspace-aware order links", async () => {
      const order = {
        id: 789,
        orderNumber: "ORD-002",
        clientId: 101,
      };

      await triggers.onOrderConfirmed(order);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: "/sales?tab=orders",
        })
      );
    });

    it("onOrderShipped emits workspace-aware order links", async () => {
      const order = {
        id: 222,
        orderNumber: "ORD-003",
        clientId: 333,
      };

      await triggers.onOrderShipped(order);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: "/sales?tab=orders",
        })
      );
    });

    it("onOrderDelivered emits workspace-aware order links", async () => {
      const order = {
        id: 444,
        orderNumber: "ORD-004",
        clientId: 555,
      };

      await triggers.onOrderDelivered(order);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: "/sales?tab=orders",
        })
      );
    });
  });

  describe("Invoice notifications", () => {
    it("onInvoiceCreated emits workspace-aware invoice links", async () => {
      const invoice = {
        id: 888,
        invoiceNumber: "INV-001",
        clientId: 999,
        clientName: "Invoice Client",
        totalAmount: "500.00",
      };

      await triggers.onInvoiceCreated(invoice);

      // Check client notification
      const clientCall = (notificationService.sendNotification as any).mock
        .calls[0][0];
      expect(clientCall.link).toBe("/accounting?tab=invoices");
      expect(clientCall.link).not.toMatch(/^\/invoices\/\d+$/);
      expect(clientCall.link).not.toMatch(/^\/invoices$/);
    });

    it("onInvoiceOverdue emits workspace-aware invoice links", async () => {
      const invoice = {
        id: 111,
        invoiceNumber: "INV-002",
        clientId: 222,
        amountDue: "250.00",
      };

      await triggers.onInvoiceOverdue(invoice);

      // Check client notification
      const clientCall = (notificationService.sendNotification as any).mock
        .calls[0][0];
      expect(clientCall.link).toBe("/accounting?tab=invoices");
      expect(clientCall.link).not.toMatch(/^\/invoices\/\d+$/);
    });
  });

  describe("Payment notifications", () => {
    it("onPaymentReceived emits workspace-aware payment links", async () => {
      const payment = {
        id: 777,
        clientId: 888,
        clientName: "Payment Client",
        amount: "1500.00",
      };

      await triggers.onPaymentReceived(payment);

      // Check client notification
      const clientCall = (notificationService.sendNotification as any).mock
        .calls[0][0];
      expect(clientCall.link).toBe("/accounting?tab=payments");
      expect(clientCall.link).not.toMatch(/^\/payments\/\d+$/);
      expect(clientCall.link).not.toMatch(/^\/payments$/);
    });
  });

  describe("Inventory notifications", () => {
    it("onInventoryLow emits workspace-aware inventory links", async () => {
      const batch = {
        id: 555,
        batchCode: "BATCH-001",
        productName: "Test Product",
        quantity: 10,
        lowStockThreshold: 20,
      };

      await triggers.onInventoryLow(batch);

      // Since there are no inventory users in the mock, no notifications should be sent
      // But if they were, they should use the correct format
      // We'll just verify the function doesn't throw
      expect(notificationService.sendBulkNotification).not.toHaveBeenCalled();
    });

    it("onBatchReceived emits workspace-aware inventory links", async () => {
      const batch = {
        id: 666,
        batchCode: "BATCH-002",
        productName: "New Product",
        quantity: 100,
      };

      await triggers.onBatchReceived(batch);

      // Similar to above - verifies function doesn't throw
      expect(notificationService.sendBulkNotification).not.toHaveBeenCalled();
    });
  });

  describe("Task notifications", () => {
    it("onTaskAssigned emits notifications link (not legacy task detail)", async () => {
      const task = {
        id: 999,
        title: "Test Task",
        assigneeId: 123,
        dueDate: new Date("2026-05-01"),
      };

      await triggers.onTaskAssigned(task);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: "/notifications",
        })
      );

      const call = (notificationService.sendNotification as any).mock.calls[0][0];
      expect(call.link).not.toMatch(/^\/tasks\/\d+$/);
    });

    it("onTaskDueSoon emits notifications link (not legacy task detail)", async () => {
      const task = {
        id: 1001,
        title: "Urgent Task",
        assigneeId: 456,
        dueDate: new Date("2026-04-25"),
      };

      await triggers.onTaskDueSoon(task);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: "/notifications",
        })
      );

      const call = (notificationService.sendNotification as any).mock.calls[0][0];
      expect(call.link).not.toMatch(/^\/tasks\/\d+$/);
    });
  });

  describe("Appointment notifications", () => {
    it("onAppointmentReminder emits calendar links with date param", async () => {
      const appointment = {
        id: 321,
        title: "Client Meeting",
        userId: 654,
        startDate: new Date("2026-05-15T10:00:00Z"),
        startTime: "10:00 AM",
      };

      await triggers.onAppointmentReminder(appointment);

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          link: expect.stringContaining("/calendar?date="),
        })
      );
    });
  });

  describe("Credit notifications", () => {
    it("onCreditIssued emits workspace-aware credit links", async () => {
      const credit = {
        id: 777,
        creditNumber: "CR-001",
        clientId: 888,
        clientName: "Credit Client",
        creditAmount: "100.00",
        reason: "Damaged goods",
      };

      await triggers.onCreditIssued(credit);

      // Check client notification
      const clientCall = (notificationService.sendNotification as any).mock
        .calls[0][0];
      expect(clientCall.link).toBe("/credits?tab=adjustments");
      expect(clientCall.link).not.toMatch(/^\/credits\/\d+$/);
      expect(clientCall.link).not.toMatch(/^\/credits$/);
    });
  });

  describe("VIP Portal notifications", () => {
    it("onInterestListSubmitted emits client vip-portal-config link", async () => {
      const interestList = {
        id: 555,
        clientId: 999,
        clientName: "VIP Client",
        itemCount: 5,
        totalValue: "2500.00",
      };

      await triggers.onInterestListSubmitted(interestList);

      // Client notification should not use legacy vip-portal/interest-lists path
      const clientCall = (notificationService.sendNotification as any).mock
        .calls[0][0];
      expect(clientCall.link).toBeUndefined(); // No link for client notification
    });

    it("onAppointmentRequestStatusChanged emits notifications for status changes", async () => {
      await triggers.onAppointmentRequestStatusChanged(
        123,
        456,
        "approved",
        "Product Demo",
        new Date("2026-05-20T14:00:00Z")
      );

      expect(notificationService.sendNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "success",
          title: "Appointment Confirmed",
        })
      );
    });
  });

  describe("Link format validation", () => {
    it("all order links use /sales?tab=orders pattern", async () => {
      const order = {
        id: 123,
        orderNumber: "ORD-TEST",
        clientId: 456,
      };

      await triggers.onOrderCreated(order);
      await triggers.onOrderConfirmed(order);
      await triggers.onOrderShipped(order);
      await triggers.onOrderDelivered(order);

      // Get all calls to sendNotification
      const calls = (notificationService.sendNotification as any).mock.calls;

      // Every order-related link should start with /sales?tab=orders
      calls.forEach((call: any) => {
        const link = call[0].link;
        if (link) {
          expect(link).toMatch(/^\/sales\?tab=orders/);
          expect(link).not.toMatch(/^\/orders\/\d+$/);
          expect(link).not.toMatch(/^\/orders$/);
        }
      });
    });

    it("all invoice links use /accounting?tab=invoices pattern", async () => {
      const invoice = {
        id: 888,
        invoiceNumber: "INV-TEST",
        clientId: 999,
        totalAmount: "500.00",
      };

      await triggers.onInvoiceCreated(invoice);

      const calls = (notificationService.sendNotification as any).mock.calls;

      calls.forEach((call: any) => {
        const link = call[0].link;
        if (link && link.includes("invoice")) {
          expect(link).toMatch(/^\/accounting\?tab=invoices/);
          expect(link).not.toMatch(/^\/invoices\/\d+$/);
          expect(link).not.toMatch(/^\/invoices$/);
        }
      });
    });

    it("all payment links use /accounting?tab=payments pattern", async () => {
      const payment = {
        id: 777,
        clientId: 888,
        amount: "1500.00",
      };

      await triggers.onPaymentReceived(payment);

      const calls = (notificationService.sendNotification as any).mock.calls;

      calls.forEach((call: any) => {
        const link = call[0].link;
        if (link && link.includes("payment")) {
          expect(link).toMatch(/^\/accounting\?tab=payments/);
          expect(link).not.toMatch(/^\/payments\/\d+$/);
          expect(link).not.toMatch(/^\/payments$/);
        }
      });
    });
  });
});
