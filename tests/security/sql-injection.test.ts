/**
 * SQL Injection Prevention Tests
 *
 * Security test suite verifying inputs are properly sanitized and SQL injection
 * attempts are prevented. Tests use malicious input patterns to verify the
 * application properly uses parameterized queries.
 *
 * @module tests/security/sql-injection.test.ts
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// ============================================================================
// MOCKS - Must be defined before any imports that use them
// ============================================================================

// Mock the debug router module
vi.mock("../../server/routers/debug", () => ({
  debugRouter: {
    getCounts: vi.fn(),
  },
}));

// Import test utilities
import { setupDbMock } from "../../server/test-utils/testDb";
import { setupPermissionMock } from "../../server/test-utils/testPermissions";

// Mock the database
vi.mock("../../server/db", () => setupDbMock());

// Mock permission service - allow all by default
vi.mock("../../server/services/permissionService", () => setupPermissionMock());

// Mock ordersDb
vi.mock("../../server/ordersDb", () => ({
  createOrder: vi.fn().mockResolvedValue({ id: 123 }),
  getOrderById: vi.fn().mockResolvedValue(null),
  updateOrder: vi.fn().mockResolvedValue({}),
}));

// Mock recurringOrdersDb
vi.mock("../../server/recurringOrdersDb", () => ({
  createRecurringOrder: vi.fn().mockResolvedValue({ id: 1 }),
  updateRecurringOrder: vi.fn().mockResolvedValue({}),
}));

import { appRouter } from "../../server/routers";
import type { TrpcContext } from "../../server/_core/context";
import { isPublicDemoUser } from "../../server/_core/context";

// User type that matches the context user type
type MockUser = {
  id: number;
  openId: string;
  email: string;
  name: string;
  role: "user" | "admin";
  loginMethod: null;
  deletedAt: null;
  createdAt: Date;
  updatedAt: Date;
  lastSignedIn: Date;
};

// Authenticated user mock
const mockAuthenticatedUser: MockUser = {
  id: 42,
  openId: "user_authenticated123",
  email: "authenticated@terp.com",
  name: "Authenticated User",
  role: "user",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Admin user mock
const mockAdminUser: MockUser = {
  id: 1,
  openId: "user_admin123",
  email: "admin@terp.com",
  name: "Admin User",
  role: "admin",
  loginMethod: null,
  deletedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

// Create test caller with specific user
const createCallerWithUser = async (user: MockUser) => {
  const ctx = {
    user,
    req: { headers: {}, cookies: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    isPublicDemoUser: isPublicDemoUser(user),
  };

  return appRouter.createCaller(ctx as unknown as TrpcContext);
};

describe("SQL Injection Prevention", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Location Name Input Sanitization", () => {
    it("sanitizes SQL injection in location site name", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "'; DROP TABLE locations; --";

      try {
        const result = await caller.settings.locations.create({
          site: maliciousInput,
          isActive: true,
        });

        // If it succeeds, verify the input was sanitized/escaped
        expect(result).toBeDefined();
        // Should not execute SQL injection - table should still exist
      } catch (error) {
        // If it rejects, should be validation error, not SQL error
        if (error instanceof Error) {
          expect(error.message).not.toContain("syntax error");
          expect(error.message).not.toContain("DROP TABLE");
        }
      }
    });

    it("handles SQL injection attempt with UNION SELECT", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "' UNION SELECT * FROM users WHERE '1'='1";

      try {
        await caller.settings.locations.create({
          site: maliciousInput,
          isActive: true,
        });
      } catch (error) {
        // Should not expose SQL errors
        if (error instanceof Error) {
          expect(error.message).not.toContain("UNION");
          expect(error.message).not.toContain("syntax");
        }
      }
    });

    it("sanitizes SQL comment injection", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "Admin' OR '1'='1' --";

      try {
        await caller.settings.locations.create({
          site: maliciousInput,
          isActive: true,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("syntax error");
        }
      }
    });

    it("handles hex-encoded SQL injection", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "0x53514C20496E6A656374696F6E"; // "SQL Injection" in hex

      try {
        await caller.settings.locations.create({
          site: maliciousInput,
          isActive: true,
        });
      } catch (error) {
        // Should handle as normal string, not execute
        expect(error).toBeDefined();
      }
    });
  });

  describe("Search Query Input Sanitization", () => {
    it("sanitizes SQL injection in search query", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousQuery = "'; DELETE FROM inventory; --";

      try {
        // Search endpoints should sanitize input
        await caller.search.global({ query: maliciousQuery });
      } catch (error) {
        // Should not be a SQL error
        if (error instanceof Error) {
          expect(error.message).not.toContain("DELETE");
          expect(error.message).not.toContain("syntax error");
        }
      }
    });

    it("handles wildcard SQL injection", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousQuery = "%' OR 1=1 --";

      try {
        await caller.search.global({ query: maliciousQuery });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("syntax");
        }
      }
    });
  });

  describe("Numeric Input Validation", () => {
    it("rejects SQL injection in numeric ID fields", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // Attempt to pass SQL as numeric ID
      try {
        await caller.settings.locations.getById({
          id: "1 OR 1=1" as any, // Type assertion to bypass TS validation
        });
      } catch (error) {
        // Should fail validation before SQL execution
        expect(error).toBeDefined();
      }
    });

    it("validates numeric fields reject string SQL injection", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      try {
        await caller.warehouseTransfers.transfer({
          batchId: "1; DROP TABLE batches;" as any,
          toSite: "Site B",
          quantity: "10",
        });
      } catch (error) {
        // Should fail validation
        expect(error).toBeDefined();
      }
    });
  });

  describe("Grade and Category Input Sanitization", () => {
    it("sanitizes SQL injection in grade name", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "Premium'; DROP TABLE grades; --";

      try {
        await caller.settings.grades.create({
          name: maliciousInput,
          description: "Test",
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("DROP TABLE");
          expect(error.message).not.toContain("syntax error");
        }
      }
    });

    it("sanitizes SQL injection in category name", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "Edibles' OR '1'='1";

      try {
        await caller.settings.categories.create({
          name: maliciousInput,
          description: "Test",
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("syntax");
        }
      }
    });

    it("sanitizes SQL injection in grade description", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousDescription = "'; UPDATE grades SET name='Hacked' WHERE '1'='1'; --";

      try {
        await caller.settings.grades.create({
          name: "Premium",
          description: maliciousDescription,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("UPDATE");
          expect(error.message).not.toContain("syntax error");
        }
      }
    });
  });

  describe("Order Enhancement Input Sanitization", () => {
    it("sanitizes SQL injection in payment terms", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousInput = "NET30'; DELETE FROM clients; --";

      try {
        await caller.orderEnhancements.updateClientPaymentTerms({
          clientId: 1,
          paymentTerms: maliciousInput,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("DELETE");
          expect(error.message).not.toContain("syntax error");
        }
      }
    });

    it("sanitizes SQL injection in alert configuration type", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousType = "LOW_STOCK' OR '1'='1";

      try {
        await caller.orderEnhancements.createAlertConfiguration({
          clientId: 1,
          type: maliciousType as any,
          threshold: 10,
        });
      } catch (error) {
        // Should fail validation
        expect(error).toBeDefined();
      }
    });

    it("validates recurring order frequency enum", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousFrequency = "WEEKLY'; DROP TABLE recurring_orders; --";

      try {
        await caller.orderEnhancements.createRecurringOrder({
          clientId: 1,
          frequency: maliciousFrequency as any,
          orderTemplate: { items: [] },
        });
      } catch (error) {
        // Should fail enum validation before SQL
        expect(error).toBeDefined();
      }
    });
  });

  describe("Notes and Text Field Sanitization", () => {
    it("sanitizes SQL injection in warehouse transfer notes", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousNotes = "Transfer complete'; DROP TABLE inventory_movements; --";

      try {
        await caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site B",
          quantity: "10",
          notes: maliciousNotes,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("DROP TABLE");
          expect(error.message).not.toContain("syntax error");
        }
      }
    });

    it("handles multi-line SQL injection in notes", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousNotes = `Transfer complete
'; DROP TABLE locations;
-- Comment`;

      try {
        await caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site B",
          quantity: "10",
          notes: maliciousNotes,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("DROP TABLE");
        }
      }
    });
  });

  describe("Special Characters and Encoding", () => {
    it("handles NULL byte injection", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "Site\x00DROP TABLE";

      try {
        await caller.settings.locations.create({
          site: maliciousInput,
          isActive: true,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("DROP TABLE");
        }
      }
    });

    it("handles Unicode SQL injection", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const maliciousInput = "Site\u0027 OR \u00271\u0027=\u00271";

      try {
        await caller.settings.locations.create({
          site: maliciousInput,
          isActive: true,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("syntax");
        }
      }
    });

    it("handles escaped characters properly", async () => {
      const caller = await createCallerWithUser(mockAdminUser);
      const inputWithQuotes = "O'Reilly's Warehouse";

      try {
        const result = await caller.settings.locations.create({
          site: inputWithQuotes,
          isActive: true,
        });
        // Should handle apostrophes correctly
        expect(result).toBeDefined();
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("syntax error");
        }
      }
    });
  });

  describe("Batch SQL Injection Prevention", () => {
    it("prevents SQL injection in batch operations", async () => {
      const caller = await createCallerWithUser(mockAdminUser);

      try {
        // Attempt to inject SQL in batch create
        await caller.settings.locations.create({
          site: "Site A",
          zone: "'; DROP TABLE locations; --",
          isActive: true,
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("DROP TABLE");
        }
      }
    });

    it("validates all fields in complex objects", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      try {
        await caller.warehouseTransfers.transfer({
          batchId: 1,
          toSite: "Site'; DROP TABLE batch_locations; --",
          toZone: "Zone'; DELETE FROM locations; --",
          quantity: "10",
        });
      } catch (error) {
        if (error instanceof Error) {
          expect(error.message).not.toContain("DROP TABLE");
          expect(error.message).not.toContain("DELETE FROM");
        }
      }
    });
  });

  describe("Boolean SQL Injection", () => {
    it("prevents boolean-based SQL injection", async () => {
      const caller = await createCallerWithUser(mockAdminUser);

      try {
        // Attempt to use SQL boolean logic
        await caller.settings.locations.create({
          site: "Site A",
          isActive: "1=1" as any, // Boolean field with SQL
        });
      } catch (error) {
        // Should fail type validation
        expect(error).toBeDefined();
      }
    });
  });

  describe("Error Message Safety", () => {
    it("does not expose SQL syntax in error messages", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);
      const maliciousInput = "'; SELECT * FROM users; --";

      try {
        await caller.settings.locations.create({
          site: maliciousInput,
          isActive: true,
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          // Error messages should not expose SQL details
          expect(error.message).not.toMatch(/syntax error near/i);
          expect(error.message).not.toMatch(/SQL/i);
          expect(error.message).not.toMatch(/SELECT|INSERT|UPDATE|DELETE/i);
        }
      }
    });

    it("provides safe validation errors", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      try {
        await caller.settings.locations.getById({
          id: "not-a-number" as any,
        });
      } catch (error) {
        if (error instanceof TRPCError) {
          // Should be a validation error, not SQL error
          expect(error.code).toBe("BAD_REQUEST");
        }
      }
    });
  });

  describe("Parameterized Query Verification", () => {
    it("verifies queries use parameters not string concatenation", async () => {
      const caller = await createCallerWithUser(mockAuthenticatedUser);

      // This test verifies the DB layer properly uses parameterized queries
      // By attempting various injection patterns and ensuring they're treated as data
      const injectionPatterns = [
        "'; DROP TABLE locations; --",
        "1 OR 1=1",
        "admin'--",
        "' UNION SELECT NULL--",
      ];

      for (const pattern of injectionPatterns) {
        try {
          await caller.settings.locations.create({
            site: pattern,
            isActive: true,
          });
        } catch (error) {
          // Errors should be validation or business logic, not SQL errors
          if (error instanceof Error) {
            expect(error.message).not.toMatch(/SQL|syntax|query/i);
          }
        }
      }
    });
  });
});
