/**
 * TDD coverage for VIP Portal appointments, notifications, and PDF downloads.
 *
 * These tests are authored before implementation to drive the required API
 * surface within the vipPortal router. They rely on the mocked database
 * provided by testDb utilities to avoid touching a real datasource.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { setupDbMock } from "../test-utils/testDb";
import { eq } from "drizzle-orm";

// Mock database layer before importing application code
vi.mock("../db", () => setupDbMock());

// Provide lightweight drizzle-orm operators for the mock database
vi.mock("drizzle-orm", async importOriginal => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    eq: (col: unknown, val: unknown) => ({ op: "eq", col, val }),
    and: (...args: unknown[]) => ({ op: "and", args }),
    or: (...args: unknown[]) => ({ op: "or", args }),
    gte: (col: unknown, val: unknown) => ({ op: "gte", col, val }),
    lte: (col: unknown, val: unknown) => ({ op: "lte", col, val }),
    gt: (col: unknown, val: unknown) => ({ op: "gt", col, val }),
    inArray: (col: unknown, values: unknown[]) => ({
      op: "inArray",
      col,
      values,
    }),
    isNull: (col: unknown) => ({ op: "isNull", col }),
    desc: (col: unknown) => ({ op: "desc", col }),
    sql: <T>(strings: TemplateStringsArray) => ({
      op: "sql",
      sql: strings.join(""),
      type: null as T,
    }),
  };
});

import { appRouter } from "../routers";
import { db, getDb } from "../db";
import {
  appointmentTypes,
  billLineItems,
  bills,
  calendarAvailability,
  calendars,
  clients,
  invoiceLineItems,
  invoices,
  notifications,
  users,
  vipPortalAuth,
} from "../../drizzle/schema";

type MockRequest = { headers: Record<string, string> };
type MockResponse = Record<string, unknown>;

const sessionToken = "vip-session-token";

const createCaller = () =>
  appRouter.createCaller({
    req: { headers: { "x-vip-session-token": sessionToken } } as MockRequest,
    res: {} as MockResponse,
  });

describe("VIP Portal appointments and notifications (TDD)", () => {
  const appointmentDate = new Date();
  appointmentDate.setDate(appointmentDate.getDate() + 2);
  const appointmentDateStr = appointmentDate.toISOString().split("T")[0];

  beforeAll(async () => {
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    // Seed core records
    const [{ id: userId }] = await database
      .insert(users)
      .values({
        openId: "user-open-id",
        name: "Test User",
        email: "user@example.com",
        role: "admin",
        loginMethod: "password",
      })
      .$returningId();

    const [{ id: clientId }] = await database
      .insert(clients)
      .values({
        teriCode: "VIP-001",
        name: "VIP Client",
        email: "vip@example.com",
        vipPortalEnabled: true,
        isBuyer: true,
      })
      .$returningId();

    await database.insert(vipPortalAuth).values({
      clientId,
      email: "vip@example.com",
      passwordHash: "hash",
      sessionToken,
      sessionExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      loginCount: 1,
    });

    const [{ id: calendarId }] = await database
      .insert(calendars)
      .values({
        name: "VIP Calendar",
        description: "Client-facing calendar",
        color: "#0EA5E9",
        type: "workspace",
        ownerId: userId,
      })
      .$returningId();

    const [{ id: _appointmentTypeId }] = await database
      .insert(appointmentTypes)
      .values({
        calendarId,
        name: "Payment Pickup",
        description: "Schedule a payment pickup",
        duration: 30,
        bufferBefore: 0,
        bufferAfter: 0,
        minNoticeHours: 1,
        maxAdvanceDays: 30,
        color: "#22C55E",
        isActive: true,
      })
      .$returningId();

    // Add availability for all days of the week to make test date-agnostic
    const availabilityRecords = [0, 1, 2, 3, 4, 5, 6].map(dayOfWeek => ({
      calendarId,
      dayOfWeek,
      startTime: "09:00:00",
      endTime: "11:00:00",
    }));
    await database.insert(calendarAvailability).values(availabilityRecords);

    // Notification seed
    await database.insert(notifications).values({
      recipientType: "client",
      clientId,
      type: "info",
      title: "Welcome",
      message: "Your portal is ready",
      channel: "in_app",
      read: false,
    });

    // Invoice seed
    const [{ id: invoiceId }] = await database
      .insert(invoices)
      .values({
        invoiceNumber: "INV-100",
        customerId: clientId,
        invoiceDate: appointmentDateStr,
        dueDate: appointmentDateStr,
        subtotal: "100.00",
        taxAmount: "10.00",
        discountAmount: "0.00",
        totalAmount: "110.00",
        amountPaid: "0.00",
        amountDue: "110.00",
        status: "SENT",
        createdBy: userId,
      })
      .$returningId();

    await database.insert(invoiceLineItems).values({
      invoiceId,
      description: "Consulting",
      quantity: "1",
      unitPrice: "100.00",
      taxRate: "10.00",
      discountPercent: "0.00",
      lineTotal: "110.00",
    });

    // Bill seed for PDF
    const [{ id: billId }] = await database
      .insert(bills)
      .values({
        billNumber: "BILL-200",
        vendorId: clientId,
        billDate: appointmentDateStr,
        dueDate: appointmentDateStr,
        subtotal: "50.00",
        taxAmount: "5.00",
        discountAmount: "0.00",
        totalAmount: "55.00",
        amountPaid: "0.00",
        amountDue: "55.00",
        status: "PENDING",
        createdBy: userId,
      })
      .$returningId();

    await database.insert(billLineItems).values({
      billId,
      description: "Supplies",
      quantity: "5",
      unitPrice: "10.00",
      taxRate: "10.00",
      discountPercent: "0.00",
      lineTotal: "55.00",
    });
  });

  it("returns available calendars with appointment types for VIP clients", async () => {
    const caller = createCaller();
    const calendarsResponse =
      await caller.vipPortal.appointments.listCalendars();

    expect(calendarsResponse).toHaveLength(1);
    expect(calendarsResponse[0]?.appointmentTypes).toHaveLength(1);
    expect(calendarsResponse[0]?.appointmentTypes[0]?.name).toBe(
      "Payment Pickup"
    );
  });

  it("provides available slots for the configured calendar and type", async () => {
    const caller = createCaller();
    const slots = await caller.vipPortal.appointments.getSlots({
      calendarId: 1,
      appointmentTypeId: 1,
      startDate: appointmentDateStr,
      endDate: appointmentDateStr,
    });

    expect(Object.keys(slots)).toContain(appointmentDateStr);
    expect(slots[appointmentDateStr]).toContain("09:00");
  });

  it("creates appointment requests and lists them for the VIP client", async () => {
    const caller = createCaller();
    const requestTime = `${appointmentDateStr}T09:00:00.000Z`;

    const created = await caller.vipPortal.appointments.request({
      calendarId: 1,
      appointmentTypeId: 1,
      requestedSlot: requestTime,
      notes: "Need a quick pickup",
    });

    expect(created.success).toBe(true);
    expect(created.requestId).toBeGreaterThan(0);

    const requests = await caller.vipPortal.appointments.listMyRequests();
    expect(requests).toHaveLength(1);
    expect(requests[0]?.notes).toBe("Need a quick pickup");
  });

  it("lists notifications and marks them as read", async () => {
    const caller = createCaller();

    const notificationList = await caller.vipPortal.notifications.list({
      limit: 5,
    });
    expect(notificationList.items.length).toBeGreaterThan(0);
    const firstNotificationId = notificationList.items[0]?.id;

    await caller.vipPortal.notifications.markRead({ id: firstNotificationId });
    const updated = await db?.query.notifications.findMany({
      where: eq(notifications.id, firstNotificationId ?? 0),
    });

    expect(updated?.[0]?.read).toBe(true);
  });

  it("generates invoice and bill PDFs for the VIP client", async () => {
    const caller = createCaller();

    const invoicePdf = await caller.vipPortal.documents.downloadInvoicePdf({
      invoiceId: 1,
    });
    expect(invoicePdf.pdf.length).toBeGreaterThan(50);
    expect(invoicePdf.fileName).toContain("INV-100");

    const billPdf = await caller.vipPortal.documents.downloadBillPdf({
      billId: 1,
    });
    expect(billPdf.pdf.length).toBeGreaterThan(50);
    expect(billPdf.fileName).toContain("BILL-200");
  });

  it("prevents PDF access for invoices that do not belong to the client", async () => {
    const caller = createCaller();
    const database = await getDb();
    if (!database) {
      throw new Error("Database not available");
    }

    const [{ id: otherClientId }] = await database
      .insert(clients)
      .values({
        teriCode: "VIP-002",
        name: "Other Client",
        email: "other@example.com",
        vipPortalEnabled: true,
      })
      .$returningId();

    const [{ id: otherInvoiceId }] = await database
      .insert(invoices)
      .values({
        invoiceNumber: "INV-999",
        customerId: otherClientId,
        invoiceDate: appointmentDateStr,
        dueDate: appointmentDateStr,
        subtotal: "10.00",
        taxAmount: "0.00",
        discountAmount: "0.00",
        totalAmount: "10.00",
        amountPaid: "0.00",
        amountDue: "10.00",
        status: "SENT",
        createdBy: 1,
      })
      .$returningId();

    await expect(
      caller.vipPortal.documents.downloadInvoicePdf({
        invoiceId: otherInvoiceId,
      })
    ).rejects.toThrow();
  });
});
