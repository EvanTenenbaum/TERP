/**
 * Calendar v3.2 Router Tests
 * Comprehensive test suite following TERP Bible protocols
 * Testing Trophy: 70% integration, 20% unit, 10% E2E
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { calendarV32Router } from "./calendar.v32";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { checkConflicts } from "../calendarDb";

// Mock dependencies
vi.mock("../_core/permissionMiddleware");
vi.mock("../db");
vi.mock("../calendarDb", async () => {
  const actual = await vi.importActual("../calendarDb");
  return {
    ...actual,
    checkConflicts: vi.fn(),
    withTransaction: vi.fn().mockImplementation(async (callback) => {
      return await callback({
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      });
    }),
  };
});

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    offset: vi.fn().mockResolvedValue([]),
    leftJoin: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    $returningId: vi.fn().mockResolvedValue({ id: 1 }),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
  };
}

describe("Calendar v3.2 Router - Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockResolvedValue(undefined);
    vi.mocked(getDb).mockResolvedValue(createMockDb() as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("quickBookForClient", () => {
    it("should book appointment successfully when no conflicts", async () => {
      // Arrange
      vi.mocked(checkConflicts).mockResolvedValue([]);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.quickBookForClient({
        clientId: 123,
        eventType: "MEETING",
        date: "2025-11-15",
        time: "09:00",
        duration: 60,
        title: "Client Meeting",
        notes: "Discuss project",
      });

      // Assert
      expect(result).toHaveProperty("eventId");
      expect(requirePermission).toHaveBeenCalledWith(1, "calendar.create");
      expect(checkConflicts).toHaveBeenCalled();
    });

    it("should throw CONFLICT error when time slot is taken", async () => {
      // Arrange
      vi.mocked(checkConflicts).mockResolvedValue([
        { id: 99, title: "Existing Event" } as any,
      ]);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.quickBookForClient({
          clientId: 123,
          eventType: "MEETING",
          date: "2025-11-15",
          time: "09:00",
          duration: 60,
          title: "Client Meeting",
        })
      ).rejects.toThrow("conflicts with");
    });

    it("should enforce RBAC permission", async () => {
      // Arrange
      vi.mocked(requirePermission).mockRejectedValue(new Error("Permission denied"));

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.quickBookForClient({
          clientId: 123,
          eventType: "MEETING",
          date: "2025-11-15",
          time: "09:00",
          duration: 60,
          title: "Client Meeting",
        })
      ).rejects.toThrow("Permission denied");
    });

    it("should handle optional notes parameter", async () => {
      // Arrange
      vi.mocked(checkConflicts).mockResolvedValue([]);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.quickBookForClient({
        clientId: 123,
        eventType: "MEETING",
        date: "2025-11-15",
        time: "09:00",
        duration: 60,
        title: "Client Meeting",
        // notes omitted
      });

      // Assert
      expect(result).toHaveProperty("eventId");
    });
  });

  describe("getClientAppointments", () => {
    it("should return appointments for client with pagination", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.orderBy = vi.fn().mockReturnThis();
      mockDb.limit = vi.fn().mockReturnThis();
      mockDb.offset = vi.fn().mockResolvedValue([
        {
          id: 1,
          title: "Meeting 1",
          clientId: 123,
          startDate: "2025-11-15",
        },
        {
          id: 2,
          title: "Meeting 2",
          clientId: 123,
          startDate: "2025-11-20",
        },
      ]);

      // Mock count query
      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 2 }]),
        })
        .mockReturnThis();

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.getClientAppointments({
        clientId: 123,
        filter: "all",
        limit: 50,
        offset: 0,
      });

      // Assert
      expect(result).toHaveProperty("appointments");
      expect(result).toHaveProperty("total");
      expect(requirePermission).toHaveBeenCalledWith(1, "calendar.view");
    });

    it("should filter upcoming appointments", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        })
        .mockReturnThis();

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.getClientAppointments({
        clientId: 123,
        filter: "upcoming",
      });

      // Assert
      expect(result).toHaveProperty("appointments");
    });

    it("should filter past appointments", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 1 }]),
        })
        .mockReturnThis();

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.getClientAppointments({
        clientId: 123,
        filter: "past",
      });

      // Assert
      expect(result).toHaveProperty("appointments");
    });

    it("should use default values for optional parameters", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.select = vi
        .fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([{ count: 0 }]),
        })
        .mockReturnThis();

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.getClientAppointments({
        clientId: 123,
      });

      // Assert
      expect(result).toHaveProperty("appointments");
      expect(result.total).toBe(0);
    });
  });

  describe("getDaySchedule", () => {
    it("should return day schedule with client and vendor details", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.select = vi.fn().mockReturnThis();
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.leftJoin = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockReturnThis();
      mockDb.orderBy = vi.fn().mockResolvedValue([
        {
          id: 1,
          title: "Meeting",
          eventType: "MEETING",
          startTime: "09:00",
          endTime: "10:00",
          clientId: 123,
          clientName: "John Doe",
          vendorId: null,
          vendorName: null,
        },
      ]);

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.getDaySchedule({
        date: "2025-11-15",
      });

      // Assert
      expect(result).toHaveProperty("events");
      expect(result.events).toHaveLength(1);
      expect(result.events[0]).toHaveProperty("client");
      expect(result.events[0].client).toEqual({ id: 123, name: "John Doe" });
    });

    it("should filter by event types", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.orderBy = vi.fn().mockResolvedValue([]);

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.getDaySchedule({
        date: "2025-11-15",
        eventTypes: ["MEETING", "INTAKE"],
      });

      // Assert
      expect(result).toHaveProperty("events");
    });
  });

  describe("processPaymentFromAppointment", () => {
    it("should process AR payment successfully", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([
            { id: 1, eventType: "AR_COLLECTION", clientId: 123 },
          ])
          .mockResolvedValueOnce([
            {
              id: 1,
              invoiceNumber: "INV-001",
              total: "1000",
              amountPaid: "0",
              status: "UNPAID",
            },
          ]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.processPaymentFromAppointment({
        eventId: 1,
        invoiceId: 1,
        amount: 500,
        paymentMethod: "CREDIT_CARD",
        notes: "Payment received",
      });

      // Assert
      expect(result).toHaveProperty("paymentId");
      expect(requirePermission).toHaveBeenCalledWith(1, "payments.create");
    });

    it("should throw error if event is not AR_COLLECTION type", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValueOnce([
          { id: 1, eventType: "MEETING" }, // Wrong type
        ]),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.processPaymentFromAppointment({
          eventId: 1,
          invoiceId: 1,
          amount: 500,
          paymentMethod: "CREDIT_CARD",
        })
      ).rejects.toThrow("AR_COLLECTION");
    });

    it("should throw error if invoice not found", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1, eventType: "AR_COLLECTION" }])
          .mockResolvedValueOnce([]), // Invoice not found
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.processPaymentFromAppointment({
          eventId: 1,
          invoiceId: 1,
          amount: 500,
          paymentMethod: "CREDIT_CARD",
        })
      ).rejects.toThrow("Invoice not found");
    });

    it("should throw error if invoice already paid", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1, eventType: "AR_COLLECTION" }])
          .mockResolvedValueOnce([
            {
              id: 1,
              total: "1000",
              amountPaid: "1000",
              status: "PAID", // Already paid
            },
          ]),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.processPaymentFromAppointment({
          eventId: 1,
          invoiceId: 1,
          amount: 500,
          paymentMethod: "CREDIT_CARD",
        })
      ).rejects.toThrow("already paid");
    });

    it("should throw error if amount is invalid", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1, eventType: "AR_COLLECTION" }])
          .mockResolvedValueOnce([
            {
              id: 1,
              total: "1000",
              amountPaid: "0",
              status: "UNPAID",
            },
          ]),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.processPaymentFromAppointment({
          eventId: 1,
          invoiceId: 1,
          amount: 2000, // Exceeds invoice total
          paymentMethod: "CREDIT_CARD",
        })
      ).rejects.toThrow("Invalid payment amount");
    });
  });

  describe("processVendorPaymentFromAppointment", () => {
    it("should process AP payment successfully", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([
            { id: 1, eventType: "AP_PAYMENT", vendorId: 456 },
          ])
          .mockResolvedValueOnce([
            {
              id: 1,
              poNumber: "PO-001",
              total: "1000",
              amountPaid: "0",
              status: "UNPAID",
            },
          ]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.processVendorPaymentFromAppointment({
        eventId: 1,
        purchaseOrderId: 1,
        amount: 500,
        paymentMethod: "CHECK",
        checkNumber: "1234",
        notes: "Payment made",
      });

      // Assert
      expect(result).toHaveProperty("paymentId");
      expect(requirePermission).toHaveBeenCalledWith(1, "vendor_payments.create");
    });

    it("should handle optional checkNumber parameter", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1, eventType: "AP_PAYMENT" }])
          .mockResolvedValueOnce([
            {
              id: 1,
              total: "1000",
              amountPaid: "0",
              status: "UNPAID",
            },
          ]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.processVendorPaymentFromAppointment({
        eventId: 1,
        purchaseOrderId: 1,
        amount: 500,
        paymentMethod: "WIRE",
        // checkNumber omitted
      });

      // Assert
      expect(result).toHaveProperty("paymentId");
    });
  });

  describe("createOrderFromAppointment", () => {
    it("should create order from INTAKE appointment", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([
            { id: 1, eventType: "INTAKE", clientId: 123 },
          ])
          .mockResolvedValueOnce([]), // No existing order
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.createOrderFromAppointment({
        eventId: 1,
        orderData: {
          orderType: "SALE",
          items: [],
          subtotal: 1000,
          tax: 80,
          discount: 0,
          total: 1080,
        },
      });

      // Assert
      expect(result).toHaveProperty("orderId");
      expect(requirePermission).toHaveBeenCalledWith(1, "orders.create");
    });

    it("should throw error if order already exists for event", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1, eventType: "INTAKE", clientId: 123 }])
          .mockResolvedValueOnce([{ id: 1 }]), // Existing order
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.createOrderFromAppointment({
          eventId: 1,
          orderData: {
            orderType: "SALE",
            items: [],
            subtotal: 1000,
            total: 1000,
          },
        })
      ).rejects.toThrow("already exists");
    });
  });

  describe("linkBatchToPhotoSession", () => {
    it("should link batch to PHOTOGRAPHY event", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1, eventType: "PHOTOGRAPHY" }])
          .mockResolvedValueOnce([{ id: 1 }]),
        update: vi.fn().mockReturnThis(),
        set: vi.fn().mockReturnThis(),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.linkBatchToPhotoSession({
        eventId: 1,
        batchId: 1,
      });

      // Assert
      expect(result).toEqual({ success: true });
      expect(requirePermission).toHaveBeenCalledWith(1, "batches.update");
    });

    it("should throw error if batch not found", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi
          .fn()
          .mockResolvedValueOnce([{ id: 1, eventType: "PHOTOGRAPHY" }])
          .mockResolvedValueOnce([]), // Batch not found
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: { id: 1 },
      } as any);

      // Act & Assert
      await expect(
        caller.linkBatchToPhotoSession({
          eventId: 1,
          batchId: 1,
        })
      ).rejects.toThrow("Batch not found");
    });
  });

  describe("getAvailableSlots", () => {
    it("should return available time slots", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.select = vi.fn().mockReturnThis();
      mockDb.from = vi.fn().mockReturnThis();
      mockDb.where = vi.fn().mockResolvedValue([]);

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: null, // Public API
      } as any);

      // Act
      const result = await caller.getAvailableSlots({
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        duration: 60,
        eventType: "MEETING",
      });

      // Assert
      expect(result).toHaveProperty("slots");
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.slots[0]).toHaveProperty("available");
    });

    it("should mark conflicting slots as unavailable", async () => {
      // Arrange
      const mockDb = createMockDb();
      mockDb.where = vi.fn().mockResolvedValue([
        {
          startDate: "2025-11-15",
          startTime: "09:00",
          endTime: "10:00",
        },
      ]);

      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarV32Router.createCaller({
        user: null,
      } as any);

      // Act
      const result = await caller.getAvailableSlots({
        startDate: "2025-11-15",
        endDate: "2025-11-15",
        duration: 60,
        eventType: "MEETING",
      });

      // Assert
      const slot9am = result.slots.find(
        (s) => s.date === "2025-11-15" && s.time === "09:00"
      );
      expect(slot9am?.available).toBe(false);
    });
  });

  describe("bookAppointmentExternal", () => {
    it("should book appointment from VIP portal", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([
          { id: 123, name: "John Doe" },
        ]),
        insert: vi.fn().mockReturnThis(),
        values: vi.fn().mockReturnThis(),
        $returningId: vi.fn().mockResolvedValue([{ id: 1 }]),
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );
      vi.mocked(checkConflicts).mockResolvedValue([]);

      const caller = calendarV32Router.createCaller({
        user: null, // Public API
      } as any);

      // Act
      const result = await caller.bookAppointmentExternal({
        clientId: 123,
        eventType: "MEETING",
        date: "2025-11-15",
        time: "09:00",
        duration: 60,
        notes: "VIP portal booking",
      });

      // Assert
      expect(result).toHaveProperty("eventId");
      expect(result).toHaveProperty("confirmationDetails");
      expect(result.confirmationDetails).toHaveProperty("confirmationNumber");
    });

    it("should throw error if client not found", async () => {
      // Arrange
      const mockTx = {
        select: vi.fn().mockReturnThis(),
        from: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue([]), // Client not found
      };

      const withTransaction = await import("../calendarDb");
      vi.mocked(withTransaction.withTransaction).mockImplementation(
        async (callback: any) => await callback(mockTx)
      );

      const caller = calendarV32Router.createCaller({
        user: null,
      } as any);

      // Act & Assert
      await expect(
        caller.bookAppointmentExternal({
          clientId: 999,
          eventType: "MEETING",
          date: "2025-11-15",
          time: "09:00",
          duration: 60,
        })
      ).rejects.toThrow("Client not found");
    });
  });
});
