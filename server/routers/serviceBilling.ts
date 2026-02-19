/**
 * Service Billing Router (MEET-009)
 * Sprint 5 Track D.6: Billing for Services
 *
 * Non-product billing:
 * - Service types: Shipping, Consulting, Processing, Storage
 * - Add service charges to orders
 * - Separate service invoice option
 * - Service revenue tracking
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";

import { orders, clients } from "../../drizzle/schema";
import {
  serviceDefinitions,
  orderServiceCharges,
  serviceInvoices,
  serviceInvoiceLineItems,
} from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, desc, asc, gte, lte } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Constants
// ============================================================================

const SERVICE_TYPES = [
  "SHIPPING",
  "HANDLING",
  "CONSULTING",
  "PROCESSING",
  "STORAGE",
  "PACKAGING",
  "TESTING",
  "INSURANCE",
  "RUSH_FEE",
  "OTHER",
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

async function generateServiceInvoiceNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");

  const result = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(serviceInvoices)
    .where(
      sql`YEAR(created_at) = ${year} AND MONTH(created_at) = ${today.getMonth() + 1}`
    );

  const count = Number(result[0]?.count || 0) + 1;
  return `SVC-${year}${month}-${String(count).padStart(5, "0")}`;
}

// ============================================================================
// Input Schemas
// ============================================================================

const createServiceDefinitionSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(50),
  description: z.string().optional(),
  serviceType: z.enum(SERVICE_TYPES),
  defaultPrice: z.number().min(0),
  pricingUnit: z.string().default("each"),
  isTaxable: z.boolean().default(true),
  taxRate: z.number().min(0).max(100).optional(),
});

const addServiceToOrderSchema = z.object({
  orderId: z.number(),
  serviceDefinitionId: z.number().optional(),
  serviceName: z.string().min(1).max(100),
  serviceType: z.enum(SERVICE_TYPES),
  description: z.string().optional(),
  quantity: z.number().positive().default(1),
  unitPrice: z.number().min(0),
  isTaxable: z.boolean().default(true),
});

const createServiceInvoiceSchema = z.object({
  clientId: z.number(),
  invoiceDate: z.string(),
  dueDate: z.string(),
  lineItems: z.array(
    z.object({
      serviceDefinitionId: z.number().optional(),
      serviceName: z.string().min(1),
      serviceType: z.enum(SERVICE_TYPES),
      description: z.string().optional(),
      quantity: z.number().positive().default(1),
      unitPrice: z.number().min(0),
    })
  ),
  notes: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const serviceBillingRouter = router({
  // ==========================================================================
  // Service Definitions
  // ==========================================================================

  /**
   * List all service definitions
   */
  listServices: protectedProcedure
    .use(requirePermission("settings:read"))
    .input(
      z
        .object({
          serviceType: z.enum(SERVICE_TYPES).optional(),
          includeInactive: z.boolean().default(false),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [isNull(serviceDefinitions.deletedAt)];

      if (!input?.includeInactive) {
        conditions.push(eq(serviceDefinitions.isActive, true));
      }

      if (input?.serviceType) {
        conditions.push(eq(serviceDefinitions.serviceType, input.serviceType));
      }

      const services = await db
        .select()
        .from(serviceDefinitions)
        .where(and(...conditions))
        .orderBy(
          asc(serviceDefinitions.serviceType),
          asc(serviceDefinitions.name)
        );

      return services;
    }),

  /**
   * Get service definition by ID
   */
  getServiceById: protectedProcedure
    .use(requirePermission("settings:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [service] = await db
        .select()
        .from(serviceDefinitions)
        .where(eq(serviceDefinitions.id, input.id))
        .limit(1);

      if (!service) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Service not found",
        });
      }

      return service;
    }),

  /**
   * Create a new service definition
   */
  createService: protectedProcedure
    .use(requirePermission("settings:create"))
    .input(createServiceDefinitionSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Check for duplicate code
      const [existing] = await db
        .select({ id: serviceDefinitions.id })
        .from(serviceDefinitions)
        .where(eq(serviceDefinitions.code, input.code.toUpperCase()))
        .limit(1);

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Service code "${input.code}" already exists`,
        });
      }

      const result = await db.insert(serviceDefinitions).values({
        name: input.name,
        code: input.code.toUpperCase(),
        description: input.description,
        serviceType: input.serviceType,
        defaultPrice: input.defaultPrice.toFixed(2),
        pricingUnit: input.pricingUnit,
        isTaxable: input.isTaxable,
        taxRate: input.taxRate?.toFixed(2),
      });

      logger.info({
        msg: "[ServiceBilling] Created service definition",
        code: input.code,
        name: input.name,
      });

      return { id: Number(result[0].insertId), code: input.code.toUpperCase() };
    }),

  /**
   * Update a service definition
   */
  updateService: protectedProcedure
    .use(requirePermission("settings:update"))
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        defaultPrice: z.number().min(0).optional(),
        pricingUnit: z.string().optional(),
        isTaxable: z.boolean().optional(),
        taxRate: z.number().min(0).max(100).optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const { id, ...updates } = input;

      const updateData: Record<string, unknown> = {};

      if (updates.name !== undefined) updateData.name = updates.name;
      if (updates.description !== undefined)
        updateData.description = updates.description;
      if (updates.defaultPrice !== undefined)
        updateData.defaultPrice = updates.defaultPrice.toFixed(2);
      if (updates.pricingUnit !== undefined)
        updateData.pricingUnit = updates.pricingUnit;
      if (updates.isTaxable !== undefined)
        updateData.isTaxable = updates.isTaxable;
      if (updates.taxRate !== undefined)
        updateData.taxRate = updates.taxRate.toFixed(2);
      if (updates.isActive !== undefined)
        updateData.isActive = updates.isActive;

      await db
        .update(serviceDefinitions)
        .set(updateData)
        .where(eq(serviceDefinitions.id, id));

      return { success: true, id };
    }),

  /**
   * Delete a service definition (soft delete)
   */
  deleteService: protectedProcedure
    .use(requirePermission("settings:delete"))
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .update(serviceDefinitions)
        .set({ deletedAt: new Date(), isActive: false })
        .where(eq(serviceDefinitions.id, input.id));

      return { success: true };
    }),

  // ==========================================================================
  // Order Service Charges
  // ==========================================================================

  /**
   * Add service charge to order
   */
  addToOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(addServiceToOrderSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Verify order exists
      const [order] = await db
        .select({ id: orders.id })
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      const totalPrice = input.quantity * input.unitPrice;
      const taxAmount = input.isTaxable ? totalPrice * 0.0 : 0; // Tax calculated later

      const result = await db.insert(orderServiceCharges).values({
        orderId: input.orderId,
        serviceDefinitionId: input.serviceDefinitionId,
        serviceName: input.serviceName,
        serviceType: input.serviceType,
        description: input.description,
        quantity: input.quantity.toFixed(2),
        unitPrice: input.unitPrice.toFixed(2),
        totalPrice: totalPrice.toFixed(2),
        isTaxable: input.isTaxable,
        taxAmount: taxAmount.toFixed(2),
        createdBy: userId,
      });

      logger.info({
        msg: "[ServiceBilling] Added service charge to order",
        orderId: input.orderId,
        serviceName: input.serviceName,
        totalPrice,
      });

      return { id: Number(result[0].insertId), totalPrice };
    }),

  /**
   * Get service charges for an order
   */
  getOrderServices: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const charges = await db
        .select()
        .from(orderServiceCharges)
        .where(eq(orderServiceCharges.orderId, input.orderId))
        .orderBy(asc(orderServiceCharges.createdAt));

      const total = charges.reduce(
        (sum, c) => sum + parseFloat(c.totalPrice || "0"),
        0
      );

      return {
        items: charges,
        total,
        count: charges.length,
      };
    }),

  /**
   * Remove service charge from order
   */
  removeFromOrder: protectedProcedure
    .use(requirePermission("orders:update"))
    .input(z.object({ serviceChargeId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      await db
        .delete(orderServiceCharges)
        .where(eq(orderServiceCharges.id, input.serviceChargeId));

      return { success: true };
    }),

  // ==========================================================================
  // Service Invoices
  // ==========================================================================

  /**
   * Create a standalone service invoice
   */
  createInvoice: protectedProcedure
    .use(requirePermission("accounting:create"))
    .input(createServiceInvoiceSchema)
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const userId = getAuthenticatedUserId(ctx);

      // Verify client exists
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const invoiceNumber = await generateServiceInvoiceNumber();

      // Calculate totals
      const subtotal = input.lineItems.reduce(
        (sum, item) => sum + item.quantity * item.unitPrice,
        0
      );
      const totalAmount = subtotal; // Tax could be added later
      const amountDue = totalAmount;

      // Create invoice
      const invoiceResult = await db.insert(serviceInvoices).values({
        invoiceNumber,
        clientId: input.clientId,
        invoiceDate: new Date(input.invoiceDate),
        dueDate: new Date(input.dueDate),
        subtotal: subtotal.toFixed(2),
        taxAmount: "0",
        totalAmount: totalAmount.toFixed(2),
        amountPaid: "0",
        amountDue: amountDue.toFixed(2),
        notes: input.notes,
        createdBy: userId,
      });

      const invoiceId = Number(invoiceResult[0].insertId);

      // Create line items
      for (const item of input.lineItems) {
        await db.insert(serviceInvoiceLineItems).values({
          serviceInvoiceId: invoiceId,
          serviceDefinitionId: item.serviceDefinitionId,
          serviceName: item.serviceName,
          serviceType: item.serviceType,
          description: item.description,
          quantity: item.quantity.toFixed(2),
          unitPrice: item.unitPrice.toFixed(2),
          lineTotal: (item.quantity * item.unitPrice).toFixed(2),
        });
      }

      logger.info({
        msg: "[ServiceBilling] Created service invoice",
        invoiceNumber,
        clientId: input.clientId,
        totalAmount,
      });

      return { id: invoiceId, invoiceNumber, totalAmount };
    }),

  /**
   * List service invoices
   */
  listInvoices: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        clientId: z.number().optional(),
        status: z
          .enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"])
          .optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const conditions = [isNull(serviceInvoices.deletedAt)];

      if (input.clientId) {
        conditions.push(eq(serviceInvoices.clientId, input.clientId));
      }

      if (input.status) {
        conditions.push(eq(serviceInvoices.status, input.status));
      }

      if (input.startDate) {
        conditions.push(
          gte(serviceInvoices.invoiceDate, new Date(input.startDate))
        );
      }

      if (input.endDate) {
        conditions.push(
          lte(serviceInvoices.invoiceDate, new Date(input.endDate))
        );
      }

      const invoices = await db
        .select({
          invoice: serviceInvoices,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(serviceInvoices)
        .leftJoin(clients, eq(serviceInvoices.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(serviceInvoices.invoiceDate))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(serviceInvoices)
        .where(and(...conditions));

      return {
        items: invoices.map(i => ({
          ...i.invoice,
          client: i.client,
        })),
        total: Number(countResult?.count || 0),
      };
    }),

  /**
   * Get service invoice by ID with line items
   */
  getInvoiceById: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const [invoice] = await db
        .select({
          invoice: serviceInvoices,
          client: clients,
        })
        .from(serviceInvoices)
        .leftJoin(clients, eq(serviceInvoices.clientId, clients.id))
        .where(eq(serviceInvoices.id, input.id))
        .limit(1);

      if (!invoice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invoice not found",
        });
      }

      const lineItems = await db
        .select()
        .from(serviceInvoiceLineItems)
        .where(eq(serviceInvoiceLineItems.serviceInvoiceId, input.id));

      return {
        ...invoice.invoice,
        client: invoice.client,
        lineItems,
      };
    }),

  /**
   * Update service invoice status
   */
  updateInvoiceStatus: protectedProcedure
    .use(requirePermission("accounting:update"))
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]),
        amountPaid: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const updateData: Record<string, unknown> = { status: input.status };

      if (input.amountPaid !== undefined) {
        const [invoice] = await db
          .select()
          .from(serviceInvoices)
          .where(eq(serviceInvoices.id, input.id))
          .limit(1);

        if (invoice) {
          const totalAmount = parseFloat(invoice.totalAmount || "0");
          const amountDue = totalAmount - input.amountPaid;
          updateData.amountPaid = input.amountPaid.toFixed(2);
          updateData.amountDue = amountDue.toFixed(2);

          // Auto-update status based on payment
          if (amountDue <= 0) {
            updateData.status = "PAID";
          } else if (input.amountPaid > 0) {
            updateData.status = "PARTIAL";
          }
        }
      }

      await db
        .update(serviceInvoices)
        .set(updateData)
        .where(eq(serviceInvoices.id, input.id));

      return { success: true };
    }),

  // ==========================================================================
  // Reports
  // ==========================================================================

  /**
   * Get service revenue report
   */
  getRevenueReport: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        groupBy: z
          .enum(["serviceType", "month", "client"])
          .default("serviceType"),
      })
    )
    .query(async () => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Get revenue from order service charges
      const orderServiceRevenue = await db
        .select({
          serviceType: orderServiceCharges.serviceType,
          total: sql<string>`SUM(CAST(total_price AS DECIMAL(15,2)))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(orderServiceCharges)
        .groupBy(orderServiceCharges.serviceType);

      // Get revenue from service invoices
      const invoiceRevenue = await db
        .select({
          total: sql<string>`SUM(CAST(amount_paid AS DECIMAL(15,2)))`,
          count: sql<number>`COUNT(*)`,
        })
        .from(serviceInvoices)
        .where(and(isNull(serviceInvoices.deletedAt), sql`status != 'VOID'`));

      const orderTotal = orderServiceRevenue.reduce(
        (sum, r) => sum + parseFloat(r.total || "0"),
        0
      );
      const invoiceTotal = parseFloat(invoiceRevenue[0]?.total || "0");

      return {
        byServiceType: orderServiceRevenue.map(r => ({
          serviceType: r.serviceType,
          revenue: parseFloat(r.total || "0"),
          count: Number(r.count),
        })),
        totals: {
          orderServiceRevenue: orderTotal,
          invoiceRevenue: invoiceTotal,
          totalRevenue: orderTotal + invoiceTotal,
        },
      };
    }),

  /**
   * Get service types
   */
  getServiceTypes: protectedProcedure
    .use(requirePermission("settings:read"))
    .query(async () => {
      return SERVICE_TYPES.map(type => ({
        value: type,
        label: type.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      }));
    }),
});
