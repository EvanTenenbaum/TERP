/**
 * Unit tests for notification triggers
 *
 * Tests that notification links use valid workspace routes instead of 404 paths.
 * @see TER-851
 */

import { describe, it, expect, vi } from "vitest";
import {
  onOrderCreated,
  onInvoiceCreated,
  onPaymentReceived,
  onInventoryLow,
  onTaskAssigned,
  onCreditIssued,
  onInterestListSubmitted,
} from "./notificationTriggers";
import * as notificationService from "./notificationService";

// Mock the notification service
vi.mock("./notificationService", () => ({
  sendNotification: vi.fn(),
  sendBulkNotification: vi.fn(),
}));

// Mock the database
vi.mock("../db", () => ({
  getDb: vi.fn(() =>
    Promise.resolve({
      select: vi.fn().mockReturnThis(),
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      then: vi.fn((cb) => cb([])),
    })
  ),
}));

describe("Notification Triggers - Link Validation (TER-851)", () => {
  it("should use workspace routes instead of 404 paths", async () => {
    vi.clearAllMocks();

    // Test order notification
    await onOrderCreated({
      id: 123,
      orderNumber: "ORD-001",
      clientId: 1,
    });

    // Verify no /orders/:id links
    const allCalls = [
      ...vi.mocked(notificationService.sendNotification).mock.calls,
      ...vi.mocked(notificationService.sendBulkNotification).mock.calls.map(
        (call) => [call[1]]
      ),
    ];

    for (const call of allCalls) {
      const notification = call[0];
      if (notification?.link) {
        expect(notification.link).not.toMatch(/^\/orders\/\d+$/);
        expect(notification.link).not.toMatch(/^\/invoices\/\d+$/);
        expect(notification.link).not.toMatch(/^\/payments\/\d+$/);
        expect(notification.link).not.toMatch(/^\/inventory\/\d+$/);
        expect(notification.link).not.toMatch(/^\/tasks\/\d+$/);
      }
    }
  });
});
