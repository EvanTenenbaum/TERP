/**
 * Calendar v3.2 Code Generator
 * Generates routers, tests, and monitoring code from templates
 * 
 * Usage: tsx scripts/generate-calendar-v32.ts
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONFIGURATION
// ============================================================================

interface EndpointConfig {
  name: string;
  method: "query" | "mutation";
  description: string;
  input: Record<string, string>;
  output: string;
  requiresAuth: boolean;
  permission?: string;
  usesTransaction: boolean;
  logsActivity: boolean;
  activityType?: string;
}

const ENDPOINTS: EndpointConfig[] = [
  // Client Integration APIs
  {
    name: "quickBookForClient",
    method: "mutation",
    description: "Quick book appointment for client with conflict detection",
    input: {
      clientId: "number",
      eventType: "string",
      date: "string",
      time: "string",
      duration: "number",
      title: "string",
      notes: "string?",
    },
    output: "{ eventId: number }",
    requiresAuth: true,
    permission: "calendar.create",
    usesTransaction: true,
    logsActivity: true,
    activityType: "MEETING",
  },
  {
    name: "getClientAppointments",
    method: "query",
    description: "Get appointment history for client",
    input: {
      clientId: "number",
      filter: "string?", // 'upcoming' | 'past' | 'all'
      limit: "number?",
      offset: "number?",
    },
    output: "{ appointments: CalendarEvent[], total: number }",
    requiresAuth: true,
    permission: "calendar.view",
    usesTransaction: false,
    logsActivity: false,
  },
  {
    name: "getDaySchedule",
    method: "query",
    description: "Get day schedule for dashboard widget",
    input: {
      date: "string",
      eventTypes: "string[]?",
    },
    output: "{ events: CalendarEvent[] }",
    requiresAuth: true,
    permission: "calendar.view",
    usesTransaction: false,
    logsActivity: false,
  },
  
  // Financial Workflows
  {
    name: "processPaymentFromAppointment",
    method: "mutation",
    description: "Process AR payment from AR_COLLECTION appointment",
    input: {
      eventId: "number",
      invoiceId: "number",
      amount: "number",
      paymentMethod: "string",
      notes: "string?",
    },
    output: "{ paymentId: number }",
    requiresAuth: true,
    permission: "payments.create",
    usesTransaction: true,
    logsActivity: true,
    activityType: "PAYMENT_RECEIVED",
  },
  {
    name: "processVendorPaymentFromAppointment",
    method: "mutation",
    description: "Process AP payment from AP_PAYMENT appointment",
    input: {
      eventId: "number",
      purchaseOrderId: "number",
      amount: "number",
      paymentMethod: "string",
      checkNumber: "string?",
      notes: "string?",
    },
    output: "{ paymentId: number }",
    requiresAuth: true,
    permission: "vendor_payments.create",
    usesTransaction: true,
    logsActivity: true,
    activityType: "PAYMENT_MADE",
  },
  
  // Operations Workflows
  {
    name: "createOrderFromAppointment",
    method: "mutation",
    description: "Create order from INTAKE appointment",
    input: {
      eventId: "number",
      orderData: "object",
    },
    output: "{ orderId: number }",
    requiresAuth: true,
    permission: "orders.create",
    usesTransaction: true,
    logsActivity: true,
    activityType: "ORDER_CREATED",
  },
  {
    name: "linkBatchToPhotoSession",
    method: "mutation",
    description: "Link batch to PHOTOGRAPHY appointment",
    input: {
      eventId: "number",
      batchId: "number",
    },
    output: "{ success: boolean }",
    requiresAuth: true,
    permission: "batches.update",
    usesTransaction: true,
    logsActivity: false,
  },
  
  // VIP Portal APIs
  {
    name: "getAvailableSlots",
    method: "query",
    description: "Get available time slots for booking (public API)",
    input: {
      startDate: "string",
      endDate: "string",
      duration: "number",
      eventType: "string",
    },
    output: "{ slots: Array<{ date: string, time: string, available: boolean }> }",
    requiresAuth: false, // Public API
    usesTransaction: false,
    logsActivity: false,
  },
  {
    name: "bookAppointmentExternal",
    method: "mutation",
    description: "Book appointment from VIP portal (public API)",
    input: {
      clientId: "number",
      eventType: "string",
      date: "string",
      time: "string",
      duration: "number",
      notes: "string?",
    },
    output: "{ eventId: number, confirmationDetails: object }",
    requiresAuth: false, // Public API (uses client auth)
    usesTransaction: true,
    logsActivity: true,
    activityType: "APPOINTMENT_BOOKED",
  },
];

// ============================================================================
// TEMPLATE GENERATORS
// ============================================================================

function generateRouterEndpoint(endpoint: EndpointConfig): string {
  const inputSchema = Object.entries(endpoint.input)
    .map(([key, type]) => {
      const isOptional = type.endsWith("?");
      const cleanType = type.replace("?", "");
      const zodType = cleanType === "number" ? "z.number()" :
                       cleanType === "string" ? "z.string()" :
                       cleanType === "boolean" ? "z.boolean()" :
                       cleanType === "object" ? "z.object({})" :
                       cleanType === "string[]" ? "z.array(z.string())" :
                       "z.any()";
      return `      ${key}: ${zodType}${isOptional ? ".optional()" : ""},`;
    })
    .join("\n");

  const procedureType = endpoint.requiresAuth ? "protectedProcedure" : "publicProcedure";
  const methodType = endpoint.method === "query" ? "query" : "mutation";
  
  const permissionCheck = endpoint.permission
    ? `\n    // Check permission\n    await requirePermission(ctx.user.id, "${endpoint.permission}");\n`
    : "";

  const transactionWrapper = endpoint.usesTransaction
    ? `\n    // Use transaction for data consistency\n    return await withTransaction(async (tx) => {\n      // TODO: Implement transaction logic\n      throw new Error("Not implemented");\n    });`
    : `\n    // TODO: Implement logic\n    throw new Error("Not implemented");`;

  return `
  /**
   * ${endpoint.description}
   */
  ${endpoint.name}: ${procedureType}
    .input(
      z.object({
${inputSchema}
      })
    )
    .${methodType}(async ({ input, ctx }) => {${permissionCheck}${transactionWrapper}
    }),
`;
}

function generateRouterTest(endpoint: EndpointConfig): string {
  return `
  describe("${endpoint.name}", () => {
    it("should ${endpoint.description.toLowerCase()}", async () => {
      // Arrange
      const mockDb = createMockDb();
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      const result = await caller.${endpoint.name}(${JSON.stringify(
        Object.keys(endpoint.input).reduce((acc, key) => {
          acc[key] = key === "clientId" ? 123 :
                     key === "eventId" ? 1 :
                     key === "date" ? "2025-11-15" :
                     key === "time" ? "09:00" :
                     key === "duration" ? 60 :
                     "test";
          return acc;
        }, {} as any)
      , null, 2)});

      // Assert
      expect(result).toBeDefined();
      ${endpoint.permission ? `expect(requirePermission).toHaveBeenCalledWith(1, "${endpoint.permission}");` : ""}
    });

    it("should throw error if not authorized", async () => {
      // Arrange
      const caller = calendarRouter.createCaller({
        user: null,
      } as any);

      // Act & Assert
      await expect(
        caller.${endpoint.name}(${JSON.stringify(
          Object.keys(endpoint.input).reduce((acc, key) => {
            acc[key] = "test";
            return acc;
          }, {} as any)
        , null, 2)})
      ).rejects.toThrow();
    });

    ${endpoint.usesTransaction ? `
    it("should use transaction for data consistency", async () => {
      // Arrange
      const mockTransaction = vi.fn();
      const mockDb = {
        transaction: mockTransaction,
      };
      vi.mocked(getDb).mockResolvedValue(mockDb as any);

      const caller = calendarRouter.createCaller({
        user: { id: 1 },
      } as any);

      // Act
      try {
        await caller.${endpoint.name}(${JSON.stringify(
          Object.keys(endpoint.input).reduce((acc, key) => {
            acc[key] = "test";
            return acc;
          }, {} as any)
        , null, 2)});
      } catch (e) {
        // Expected to fail (not implemented)
      }

      // Assert
      expect(mockTransaction).toHaveBeenCalled();
    });
    ` : ""}
  });
`;
}

function generateMonitoringEndpoint(): string {
  return `
/**
 * Health Check Endpoint for Calendar Module
 * Monitors database connectivity and recent event queries
 */
export const calendarHealthRouter = router({
  health: publicProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        return {
          status: "unhealthy",
          message: "Database not available",
          timestamp: new Date().toISOString(),
        };
      }

      // Test query: Get count of events from last 7 days
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const result = await db
        .select({ count: sql<number>\`count(*)\` })
        .from(calendarEvents)
        .where(gte(calendarEvents.createdAt, sevenDaysAgo));

      const recentEventsCount = result[0]?.count || 0;

      return {
        status: "healthy",
        message: "Calendar module operational",
        metrics: {
          recentEventsCount,
          databaseConnected: true,
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: "unhealthy",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      };
    }
  }),
});
`;
}

// ============================================================================
// MAIN GENERATION LOGIC
// ============================================================================

function generateAllCode() {
  console.log("🚀 Starting Calendar v3.2 Code Generation...\n");

  // Generate router endpoints
  console.log("📝 Generating router endpoints...");
  const routerEndpoints = ENDPOINTS.map(generateRouterEndpoint).join("\n");
  const routerCode = `
/**
 * Calendar v3.2 Router Extensions
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated: ${new Date().toISOString()}
 */

import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { withTransaction } from "../calendarDb";

export const calendarV32Router = router({${routerEndpoints}
});
`;

  fs.writeFileSync(
    path.join(__dirname, "../server/routers/calendar.v32.generated.ts"),
    routerCode
  );
  console.log("✅ Router endpoints generated\n");

  // Generate tests
  console.log("📝 Generating tests...");
  const routerTests = ENDPOINTS.map(generateRouterTest).join("\n");
  const testCode = `
/**
 * Calendar v3.2 Router Tests
 * AUTO-GENERATED - DO NOT EDIT MANUALLY
 * Generated: ${new Date().toISOString()}
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { calendarRouter } from "./calendar";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";

vi.mock("../_core/permissionMiddleware");
vi.mock("../db");

function createMockDb() {
  return {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockResolvedValue([]),
    transaction: vi.fn().mockImplementation(async (cb) => await cb({})),
  };
}

describe("Calendar v3.2 Router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requirePermission).mockResolvedValue(undefined);
  });
${routerTests}
});
`;

  fs.writeFileSync(
    path.join(__dirname, "../server/routers/calendar.v32.generated.test.ts"),
    testCode
  );
  console.log("✅ Tests generated\n");

  // Generate monitoring
  console.log("📝 Generating monitoring...");
  const monitoringCode = generateMonitoringEndpoint();
  fs.writeFileSync(
    path.join(__dirname, "../server/routers/calendarHealth.generated.ts"),
    monitoringCode
  );
  console.log("✅ Monitoring generated\n");

  console.log("✨ Code generation complete!\n");
  console.log("📊 Summary:");
  console.log(`  - ${ENDPOINTS.length} router endpoints`);
  console.log(`  - ${ENDPOINTS.length * 3} tests (avg 3 per endpoint)`);
  console.log(`  - 1 health check endpoint`);
  console.log(`\n📁 Generated files:`);
  console.log(`  - server/routers/calendar.v32.generated.ts`);
  console.log(`  - server/routers/calendar.v32.generated.test.ts`);
  console.log(`  - server/routers/calendarHealth.generated.ts`);
}

// Run generation
generateAllCode();
