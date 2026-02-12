/**
 * Payment Terms Router (MEET-035)
 * Sprint 5 Track D.3: Payment Terms (Consignment/Cash/COD)
 *
 * Flexible payment terms:
 * - Term types: Cash, COD, Consignment, Net 30, etc.
 * - Store terms on client record
 * - Apply terms to orders automatically
 * - Display terms on invoices
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";

import { getDb } from "../db";
import { clients } from "../../drizzle/schema";
import { clientPaymentTermsConfig } from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Constants
// ============================================================================

const PAYMENT_TERMS_CONFIG = {
  CASH: { dueDays: 0, description: "Cash - Payment due immediately" },
  COD: { dueDays: 0, description: "Cash on Delivery - Payment due upon delivery" },
  NET_7: { dueDays: 7, description: "Net 7 - Payment due in 7 days" },
  NET_15: { dueDays: 15, description: "Net 15 - Payment due in 15 days" },
  NET_30: { dueDays: 30, description: "Net 30 - Payment due in 30 days" },
  NET_45: { dueDays: 45, description: "Net 45 - Payment due in 45 days" },
  NET_60: { dueDays: 60, description: "Net 60 - Payment due in 60 days" },
  CONSIGNMENT: { dueDays: 60, description: "Consignment - Payment due when goods sold" },
  INSTALLMENT: { dueDays: null, description: "Installment - Payment in scheduled installments" },
  PREPAID: { dueDays: -1, description: "Prepaid - Payment required before shipment" },
};

// ============================================================================
// Input Schemas
// ============================================================================

const setPaymentTermsSchema = z.object({
  clientId: z.number(),
  defaultPaymentTerms: z.enum([
    "CASH", "COD", "NET_7", "NET_15", "NET_30", "NET_45", "NET_60",
    "CONSIGNMENT", "INSTALLMENT", "PREPAID",
  ]),
  consignmentDueDays: z.number().min(1).max(365).optional(),
  consignmentLimit: z.number().min(0).optional(),
  earlyPaymentDiscount: z.number().min(0).max(100).optional(),
  earlyPaymentDays: z.number().min(1).max(30).optional(),
  lateFeePercent: z.number().min(0).max(50).optional(),
  lateFeeGraceDays: z.number().min(0).max(30).optional(),
  showTermsOnInvoice: z.boolean().default(true),
  customTermsText: z.string().optional(),
  notes: z.string().optional(),
});

// ============================================================================
// Helper Functions
// ============================================================================

function calculateDueDate(
  paymentTerms: keyof typeof PAYMENT_TERMS_CONFIG,
  invoiceDate: Date,
  consignmentDueDays?: number
): Date {
  const config = PAYMENT_TERMS_CONFIG[paymentTerms];
  let dueDays = config.dueDays;

  // Handle special cases
  if (paymentTerms === "CONSIGNMENT" && consignmentDueDays) {
    dueDays = consignmentDueDays;
  }

  if (dueDays === null) {
    // For installment plans, default to 30 days (first installment)
    dueDays = 30;
  }

  if (dueDays === -1) {
    // Prepaid - due date is the invoice date
    return new Date(invoiceDate);
  }

  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + dueDays);
  return dueDate;
}

function formatTermsForDisplay(
  terms: keyof typeof PAYMENT_TERMS_CONFIG,
  customText?: string | null
): string {
  if (customText) {
    return customText;
  }
  return PAYMENT_TERMS_CONFIG[terms]?.description || terms;
}

// ============================================================================
// Router
// ============================================================================

export const paymentTermsRouter = router({
  /**
   * Get available payment terms options
   */
  getOptions: protectedProcedure
    .use(requirePermission("clients:read"))
    .query(async () => {
      return Object.entries(PAYMENT_TERMS_CONFIG).map(([key, config]) => ({
        value: key,
        label: config.description,
        dueDays: config.dueDays,
      }));
    }),

  /**
   * Get client payment terms configuration
   */
  getClientTerms: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [config] = await db
        .select()
        .from(clientPaymentTermsConfig)
        .where(
          and(
            eq(clientPaymentTermsConfig.clientId, input.clientId),
            isNull(clientPaymentTermsConfig.deletedAt)
          )
        )
        .limit(1);

      if (!config) {
        // Return default terms
        return {
          hasCustomConfig: false,
          defaultPaymentTerms: "NET_30" as const,
          displayText: PAYMENT_TERMS_CONFIG.NET_30.description,
          dueDays: 30,
        };
      }

      const terms = config.defaultPaymentTerms as keyof typeof PAYMENT_TERMS_CONFIG;

      return {
        hasCustomConfig: true,
        ...config,
        displayText: formatTermsForDisplay(terms, config.customTermsText),
        dueDays: PAYMENT_TERMS_CONFIG[terms]?.dueDays || 30,
      };
    }),

  /**
   * Set or update client payment terms
   */
  setClientTerms: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(setPaymentTermsSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Check if client exists
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Check if config already exists
      const [existing] = await db
        .select()
        .from(clientPaymentTermsConfig)
        .where(eq(clientPaymentTermsConfig.clientId, input.clientId))
        .limit(1);

      const { clientId, ...configData } = input;

      if (existing) {
        await db
          .update(clientPaymentTermsConfig)
          .set({
            ...configData,
            consignmentLimit: configData.consignmentLimit?.toString(),
            earlyPaymentDiscount: configData.earlyPaymentDiscount?.toString(),
            lateFeePercent: configData.lateFeePercent?.toString(),
            deletedAt: null,
          })
          .where(eq(clientPaymentTermsConfig.id, existing.id));

        logger.info({
          msg: "[PaymentTerms] Updated client payment terms",
          clientId,
          terms: input.defaultPaymentTerms,
        });

        return { id: existing.id, updated: true };
      } else {
        const result = await db.insert(clientPaymentTermsConfig).values({
          clientId,
          ...configData,
          consignmentLimit: configData.consignmentLimit?.toString(),
          earlyPaymentDiscount: configData.earlyPaymentDiscount?.toString(),
          lateFeePercent: configData.lateFeePercent?.toString(),
        });

        logger.info({
          msg: "[PaymentTerms] Created client payment terms",
          clientId,
          terms: input.defaultPaymentTerms,
        });

        return { id: Number(result[0].insertId), updated: false };
      }
    }),

  /**
   * Remove client payment terms (revert to default)
   */
  removeClientTerms: protectedProcedure
    .use(requirePermission("clients:delete"))
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(clientPaymentTermsConfig)
        .set({ deletedAt: new Date() })
        .where(eq(clientPaymentTermsConfig.clientId, input.clientId));

      return { success: true };
    }),

  /**
   * Calculate due date for an invoice based on client terms
   */
  calculateDueDate: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({
      clientId: z.number(),
      invoiceDate: z.string(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [config] = await db
        .select()
        .from(clientPaymentTermsConfig)
        .where(
          and(
            eq(clientPaymentTermsConfig.clientId, input.clientId),
            isNull(clientPaymentTermsConfig.deletedAt)
          )
        )
        .limit(1);

      const invoiceDate = new Date(input.invoiceDate);
      const terms = (config?.defaultPaymentTerms || "NET_30") as keyof typeof PAYMENT_TERMS_CONFIG;
      const dueDate = calculateDueDate(
        terms,
        invoiceDate,
        config?.consignmentDueDays || undefined
      );

      return {
        invoiceDate: invoiceDate.toISOString(),
        dueDate: dueDate.toISOString(),
        paymentTerms: terms,
        displayText: formatTermsForDisplay(terms, config?.customTermsText),
      };
    }),

  /**
   * Get terms text for invoice display
   */
  getInvoiceTermsText: protectedProcedure
    .use(requirePermission("accounting:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [config] = await db
        .select()
        .from(clientPaymentTermsConfig)
        .where(
          and(
            eq(clientPaymentTermsConfig.clientId, input.clientId),
            isNull(clientPaymentTermsConfig.deletedAt)
          )
        )
        .limit(1);

      if (!config || !config.showTermsOnInvoice) {
        return { showTerms: false, termsText: null };
      }

      const terms = config.defaultPaymentTerms as keyof typeof PAYMENT_TERMS_CONFIG;
      let termsText = formatTermsForDisplay(terms, config.customTermsText);

      // Add early payment discount info
      if (config.earlyPaymentDiscount && config.earlyPaymentDays) {
        termsText += `\n${config.earlyPaymentDiscount}% discount if paid within ${config.earlyPaymentDays} days.`;
      }

      // Add late fee info
      if (config.lateFeePercent && parseFloat(config.lateFeePercent) > 0) {
        const gracePeriod = config.lateFeeGraceDays || 0;
        termsText += `\n${config.lateFeePercent}% late fee applied after ${gracePeriod} days past due.`;
      }

      return { showTerms: true, termsText };
    }),

  /**
   * List all clients with custom payment terms
   */
  listClientsWithCustomTerms: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({
      paymentTerms: z.enum([
        "CASH", "COD", "NET_7", "NET_15", "NET_30", "NET_45", "NET_60",
        "CONSIGNMENT", "INSTALLMENT", "PREPAID",
      ]).optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(clientPaymentTermsConfig.deletedAt)];

      if (input.paymentTerms) {
        conditions.push(eq(clientPaymentTermsConfig.defaultPaymentTerms, input.paymentTerms));
      }

      const results = await db
        .select({
          config: clientPaymentTermsConfig,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(clientPaymentTermsConfig)
        .leftJoin(clients, eq(clientPaymentTermsConfig.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(clientPaymentTermsConfig.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      const countResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(clientPaymentTermsConfig)
        .where(and(...conditions));

      return {
        items: results.map(r => ({
          ...r.config,
          client: r.client,
          displayText: formatTermsForDisplay(
            r.config.defaultPaymentTerms as keyof typeof PAYMENT_TERMS_CONFIG,
            r.config.customTermsText
          ),
        })),
        total: Number(countResult[0]?.count || 0),
      };
    }),

  /**
   * Get consignment clients nearing limit
   */
  getConsignmentAlerts: protectedProcedure
    .use(requirePermission("accounting:read"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get consignment clients with their current outstanding
      const results = await db
        .select({
          config: clientPaymentTermsConfig,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
            totalOwed: clients.totalOwed,
          },
        })
        .from(clientPaymentTermsConfig)
        .leftJoin(clients, eq(clientPaymentTermsConfig.clientId, clients.id))
        .where(
          and(
            eq(clientPaymentTermsConfig.defaultPaymentTerms, "CONSIGNMENT"),
            isNull(clientPaymentTermsConfig.deletedAt)
          )
        );

      // Filter to those near or over limit
      const alerts = results
        .filter(r => {
          if (!r.config.consignmentLimit) return false;
          const limit = parseFloat(r.config.consignmentLimit);
          const owed = parseFloat(r.client?.totalOwed?.toString() || "0");
          return owed >= limit * 0.8; // 80% of limit
        })
        .map(r => {
          const limit = parseFloat(r.config.consignmentLimit || "0");
          const owed = parseFloat(r.client?.totalOwed?.toString() || "0");
          const utilization = limit > 0 ? (owed / limit) * 100 : 0;

          return {
            clientId: r.client?.id,
            clientName: r.client?.name,
            teriCode: r.client?.teriCode,
            consignmentLimit: limit,
            currentOwed: owed,
            utilization: Math.round(utilization * 100) / 100,
            isOverLimit: owed > limit,
          };
        })
        .sort((a, b) => b.utilization - a.utilization);

      return alerts;
    }),
});
