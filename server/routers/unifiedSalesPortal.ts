/**
 * Unified Sales Portal (USP) Router
 * 
 * Provides a unified pipeline view combining sales sheets, quotes, and orders
 * with conversion tracking and drag-and-drop stage management.
 * 
 * USP-001: Initial Implementation
 * USP-004: Critical Bug Fixes
 * - Use existing ordersDb.convertQuoteToSale for proper inventory handling
 * - Copy line items during sales sheet to quote conversion
 * - Add terminal status filtering (exclude REJECTED, EXPIRED, CANCELLED by default)
 * - Use authenticated user ID instead of hardcoded value
 */

import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { orders, salesSheetHistory, clients, users, orderLineItems } from "../../drizzle/schema";
import { eq, desc, isNull, and, or, sql, inArray, notInArray, ne } from "drizzle-orm";
import { convertQuoteToSale as convertQuoteToSaleDb } from "../ordersDb";
import { TRPCError } from "@trpc/server";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Pipeline stages for the unified view
 */
const PipelineStage = {
  SALES_SHEET: 'SALES_SHEET',
  QUOTE: 'QUOTE',
  SALE: 'SALE',
  FULFILLED: 'FULFILLED',
} as const;

type PipelineStageType = typeof PipelineStage[keyof typeof PipelineStage];

/**
 * Terminal statuses that should be excluded by default
 */
const TERMINAL_QUOTE_STATUSES = ['REJECTED', 'EXPIRED', 'CONVERTED'];
const TERMINAL_SALE_STATUSES = ['CANCELLED'];

/**
 * Unified pipeline item representing any sales document
 */
interface PipelineItem {
  id: string; // Prefixed ID: SS-{id}, Q-{id}, S-{id}
  sourceType: 'SALES_SHEET' | 'QUOTE' | 'SALE';
  sourceId: number;
  stage: PipelineStageType;
  clientId: number;
  clientName: string;
  clientTeriCode: string;
  totalValue: number;
  itemCount: number;
  createdAt: Date;
  createdBy: number;
  createdByName: string;
  updatedAt: Date | null;
  // Conversion tracking
  convertedFromId: string | null;
  convertedToId: string | null;
  convertedAt: Date | null;
  // Order-specific fields
  orderNumber?: string;
  orderStatus?: string;
  quoteStatus?: string;
  saleStatus?: string;
  validUntil?: Date | null;
  isExpired?: boolean;
  // Soft delete
  deletedAt: Date | null;
}

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const pipelineFilterSchema = z.object({
  stages: z.array(z.enum(['SALES_SHEET', 'QUOTE', 'SALE', 'FULFILLED'])).optional(),
  clientIds: z.array(z.number()).optional(),
  createdByIds: z.array(z.number()).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  minValue: z.number().optional(),
  maxValue: z.number().optional(),
  includeDeleted: z.boolean().default(false),
  includeClosed: z.boolean().default(false), // Include terminal statuses
  search: z.string().optional(),
  limit: z.number().min(1).max(500).default(100),
  offset: z.number().min(0).default(0),
});

const convertSalesSheetToQuoteSchema = z.object({
  salesSheetId: z.number().positive(),
  validUntil: z.string().optional(), // ISO date string
  notes: z.string().optional(),
});

const convertQuoteToSaleSchema = z.object({
  orderId: z.number().positive(),
  paymentTerms: z.enum(['NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT']).optional(),
  cashPayment: z.number().min(0).optional(),
  notes: z.string().optional(),
  confirmExpired: z.boolean().optional(), // Confirm conversion of expired quote
});

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate subtotal from items array
 */
function calculateSubtotal(items: any[]): number {
  if (!Array.isArray(items)) return 0;
  return items.reduce((sum, item) => {
    const price = parseFloat(item.price || item.unitPrice || 0);
    const qty = parseFloat(item.quantity || item.qty || 0);
    return sum + (price * qty);
  }, 0);
}

/**
 * Check if a quote is expired
 */
function isQuoteExpired(validUntil: Date | string | null): boolean {
  if (!validUntil) return false;
  const expirationDate = new Date(validUntil);
  return expirationDate < new Date();
}

// ============================================================================
// UNIFIED SALES PORTAL ROUTER
// ============================================================================

export const unifiedSalesPortalRouter = router({
  /**
   * Get unified pipeline view
   * Combines sales sheets, quotes, and orders into a single timeline
   * 
   * By default, excludes:
   * - Deleted items (unless includeDeleted=true)
   * - Terminal status items like REJECTED, EXPIRED, CANCELLED (unless includeClosed=true)
   */
  getPipeline: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(pipelineFilterSchema)
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const items: PipelineItem[] = [];

      // Determine which stages to fetch
      const fetchSalesSheets = !input.stages || input.stages.includes('SALES_SHEET');
      const fetchQuotes = !input.stages || input.stages.includes('QUOTE');
      const fetchSales = !input.stages || input.stages.includes('SALE') || input.stages.includes('FULFILLED');

      // Fetch Sales Sheets
      if (fetchSalesSheets) {
        const salesSheetConditions = [
          input.includeDeleted ? sql`1=1` : isNull(salesSheetHistory.deletedAt),
        ];
        
        // Exclude already-converted sales sheets unless showing closed
        if (!input.includeClosed) {
          salesSheetConditions.push(isNull(salesSheetHistory.convertedToOrderId));
        }
        
        if (input.clientIds?.length) {
          salesSheetConditions.push(inArray(salesSheetHistory.clientId, input.clientIds));
        }
        if (input.createdByIds?.length) {
          salesSheetConditions.push(inArray(salesSheetHistory.createdBy, input.createdByIds));
        }
        if (input.minValue !== undefined) {
          salesSheetConditions.push(sql`total_value >= ${input.minValue}`);
        }
        if (input.maxValue !== undefined) {
          salesSheetConditions.push(sql`total_value <= ${input.maxValue}`);
        }

        const salesSheets = await db
          .select({
            id: salesSheetHistory.id,
            clientId: salesSheetHistory.clientId,
            totalValue: salesSheetHistory.totalValue,
            items: salesSheetHistory.items,
            createdAt: salesSheetHistory.createdAt,
            createdBy: salesSheetHistory.createdBy,
            convertedToOrderId: salesSheetHistory.convertedToOrderId,
            deletedAt: salesSheetHistory.deletedAt,
            clientName: clients.name,
            clientTeriCode: clients.teriCode,
            createdByName: users.name,
          })
          .from(salesSheetHistory)
          .leftJoin(clients, eq(salesSheetHistory.clientId, clients.id))
          .leftJoin(users, eq(salesSheetHistory.createdBy, users.id))
          .where(and(...salesSheetConditions))
          .orderBy(desc(salesSheetHistory.createdAt))
          .limit(input.limit);

        for (const sheet of salesSheets) {
          const itemsArray = typeof sheet.items === 'string' 
            ? JSON.parse(sheet.items) 
            : sheet.items;
          
          items.push({
            id: `SS-${sheet.id}`,
            sourceType: 'SALES_SHEET',
            sourceId: sheet.id,
            stage: 'SALES_SHEET',
            clientId: sheet.clientId,
            clientName: sheet.clientName || 'Unknown',
            clientTeriCode: sheet.clientTeriCode || 'N/A',
            totalValue: Number(sheet.totalValue) || 0,
            itemCount: Array.isArray(itemsArray) ? itemsArray.length : 0,
            createdAt: sheet.createdAt || new Date(),
            createdBy: sheet.createdBy,
            createdByName: sheet.createdByName || 'Unknown',
            updatedAt: null,
            convertedFromId: null,
            convertedToId: sheet.convertedToOrderId ? `Q-${sheet.convertedToOrderId}` : null,
            convertedAt: null,
            deletedAt: sheet.deletedAt,
          });
        }
      }

      // Fetch Quotes and Sales (Orders)
      if (fetchQuotes || fetchSales) {
        const orderConditions = [
          input.includeDeleted ? sql`1=1` : isNull(orders.deletedAt),
        ];

        // Exclude terminal statuses unless includeClosed is true
        if (!input.includeClosed) {
          // For quotes: exclude REJECTED, EXPIRED, CONVERTED
          // For sales: exclude CANCELLED
          // This is complex because we need to handle both order types
          orderConditions.push(
            or(
              // Quotes that are NOT in terminal status
              and(
                eq(orders.orderType, 'QUOTE'),
                or(
                  isNull(orders.quoteStatus),
                  notInArray(orders.quoteStatus, TERMINAL_QUOTE_STATUSES)
                )
              ),
              // Sales that are NOT in terminal status
              and(
                eq(orders.orderType, 'SALE'),
                or(
                  isNull(orders.saleStatus),
                  notInArray(orders.saleStatus, TERMINAL_SALE_STATUSES)
                )
              )
            )!
          );
        }

        if (input.clientIds?.length) {
          orderConditions.push(inArray(orders.clientId, input.clientIds));
        }
        if (input.createdByIds?.length) {
          orderConditions.push(inArray(orders.createdBy, input.createdByIds));
        }
        if (input.minValue !== undefined) {
          orderConditions.push(sql`CAST(total_amount AS DECIMAL(15,2)) >= ${input.minValue}`);
        }
        if (input.maxValue !== undefined) {
          orderConditions.push(sql`CAST(total_amount AS DECIMAL(15,2)) <= ${input.maxValue}`);
        }

        // Filter by order type based on stages
        const orderTypes: string[] = [];
        if (fetchQuotes) orderTypes.push('QUOTE');
        if (fetchSales) orderTypes.push('SALE');
        
        if (orderTypes.length === 1) {
          orderConditions.push(eq(orders.orderType, orderTypes[0] as 'QUOTE' | 'SALE'));
        }

        const ordersResult = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            orderType: orders.orderType,
            orderStatus: orders.orderStatus,
            quoteStatus: orders.quoteStatus,
            saleStatus: orders.saleStatus,
            clientId: orders.clientId,
            totalAmount: orders.totalAmount,
            createdAt: orders.createdAt,
            createdBy: orders.createdBy,
            updatedAt: orders.updatedAt,
            validUntil: orders.validUntil,
            convertedFromOrderId: orders.convertedFromOrderId,
            convertedFromSalesSheetId: orders.convertedFromSalesSheetId,
            convertedAt: orders.convertedAt,
            deletedAt: orders.deletedAt,
            clientName: clients.name,
            clientTeriCode: clients.teriCode,
            createdByName: users.name,
          })
          .from(orders)
          .leftJoin(clients, eq(orders.clientId, clients.id))
          .leftJoin(users, eq(orders.createdBy, users.id))
          .where(and(...orderConditions))
          .orderBy(desc(orders.createdAt))
          .limit(input.limit);

        for (const order of ordersResult) {
          // Determine stage based on order type and status
          let stage: PipelineStageType;
          if (order.orderType === 'QUOTE') {
            stage = 'QUOTE';
          } else if (order.saleStatus === 'FULFILLED' || order.saleStatus === 'DELIVERED') {
            stage = 'FULFILLED';
          } else {
            stage = 'SALE';
          }

          // Skip if stage doesn't match filter
          if (input.stages && !input.stages.includes(stage)) {
            continue;
          }

          // Determine conversion source
          let convertedFromId: string | null = null;
          if (order.convertedFromSalesSheetId) {
            convertedFromId = `SS-${order.convertedFromSalesSheetId}`;
          } else if (order.convertedFromOrderId) {
            convertedFromId = `Q-${order.convertedFromOrderId}`;
          }

          items.push({
            id: order.orderType === 'QUOTE' ? `Q-${order.id}` : `S-${order.id}`,
            sourceType: order.orderType as 'QUOTE' | 'SALE',
            sourceId: order.id,
            stage,
            clientId: order.clientId,
            clientName: order.clientName || 'Unknown',
            clientTeriCode: order.clientTeriCode || 'N/A',
            totalValue: Number(order.totalAmount) || 0,
            itemCount: 0, // Would need to join with line items
            createdAt: order.createdAt || new Date(),
            createdBy: order.createdBy,
            createdByName: order.createdByName || 'Unknown',
            updatedAt: order.updatedAt,
            convertedFromId,
            convertedToId: null, // Would need reverse lookup
            convertedAt: order.convertedAt,
            orderNumber: order.orderNumber,
            orderStatus: order.orderStatus,
            quoteStatus: order.quoteStatus,
            saleStatus: order.saleStatus,
            validUntil: order.validUntil,
            isExpired: order.orderType === 'QUOTE' ? isQuoteExpired(order.validUntil) : false,
            deletedAt: order.deletedAt,
          });
        }
      }

      // Apply search filter if provided
      let filteredItems = items;
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        filteredItems = items.filter(item => 
          item.clientName.toLowerCase().includes(searchLower) ||
          item.clientTeriCode.toLowerCase().includes(searchLower) ||
          item.orderNumber?.toLowerCase().includes(searchLower) ||
          item.id.toLowerCase().includes(searchLower)
        );
      }

      // Sort by createdAt descending
      filteredItems.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply offset and limit
      const paginatedItems = filteredItems.slice(input.offset, input.offset + input.limit);

      // Calculate stage counts and values
      const stageStats = {
        SALES_SHEET: { count: 0, value: 0 },
        QUOTE: { count: 0, value: 0 },
        SALE: { count: 0, value: 0 },
        FULFILLED: { count: 0, value: 0 },
      };

      for (const item of filteredItems) {
        stageStats[item.stage].count++;
        stageStats[item.stage].value += item.totalValue;
      }

      return {
        items: paginatedItems,
        total: filteredItems.length,
        hasMore: input.offset + input.limit < filteredItems.length,
        stages: stageStats,
      };
    }),

  /**
   * Check if a quote can be converted (for confirmation dialog)
   */
  checkQuoteConversion: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({ orderId: z.number().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [quote] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!quote) {
        return { canConvert: false, reason: "Quote not found" };
      }

      if (quote.orderType !== 'QUOTE') {
        return { canConvert: false, reason: "Order is not a quote" };
      }

      const isExpired = isQuoteExpired(quote.validUntil);
      const warnings: string[] = [];

      if (isExpired) {
        warnings.push(`Quote expired on ${new Date(quote.validUntil!).toLocaleDateString()}. Pricing may be outdated.`);
      }

      if (quote.quoteStatus === 'DRAFT') {
        warnings.push("Quote is still in DRAFT status and has not been formally accepted by the client.");
      }

      return {
        canConvert: true,
        isExpired,
        warnings,
        quote: {
          id: quote.id,
          orderNumber: quote.orderNumber,
          totalAmount: quote.totalAmount,
          validUntil: quote.validUntil,
          quoteStatus: quote.quoteStatus,
        },
      };
    }),

  /**
   * Convert a sales sheet to a quote
   * Creates a new quote order and links it to the original sales sheet
   * 
   * USP-004: Now properly copies line items from sales sheet
   */
  convertSalesSheetToQuote: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(convertSalesSheetToQuoteSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      return await db.transaction(async (tx) => {
        // Get the sales sheet
        const [salesSheet] = await tx
          .select()
          .from(salesSheetHistory)
          .where(eq(salesSheetHistory.id, input.salesSheetId))
          .limit(1);

        if (!salesSheet) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Sales sheet not found",
          });
        }

        if (salesSheet.convertedToOrderId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Sales sheet has already been converted to a quote",
          });
        }

        // Parse items from sales sheet
        const salesSheetItems = typeof salesSheet.items === 'string'
          ? JSON.parse(salesSheet.items)
          : (salesSheet.items || []);

        // Calculate totals from items
        const subtotal = calculateSubtotal(salesSheetItems);
        const total = subtotal; // Add tax calculation if needed

        // Generate order number
        const orderNumber = `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

        // Create the quote order with copied items
        const [newOrder] = await tx
          .insert(orders)
          .values({
            orderNumber,
            orderType: 'QUOTE',
            orderStatus: 'DRAFT',
            quoteStatus: 'DRAFT',
            clientId: salesSheet.clientId,
            items: JSON.stringify(salesSheetItems), // Copy items from sales sheet
            subtotal: String(subtotal),
            totalAmount: String(total),
            validUntil: input.validUntil ? new Date(input.validUntil) : null,
            notes: input.notes || `Converted from Sales Sheet #${salesSheet.id}`,
            createdBy: userId,
            convertedFromSalesSheetId: salesSheet.id,
            convertedAt: new Date(),
          })
          .$returningId();

        // Update the sales sheet with the conversion reference
        await tx
          .update(salesSheetHistory)
          .set({
            convertedToOrderId: newOrder.id,
          })
          .where(eq(salesSheetHistory.id, input.salesSheetId));

        return {
          success: true,
          orderId: newOrder.id,
          orderNumber,
          itemCount: salesSheetItems.length,
          message: `Sales sheet converted to quote ${orderNumber} with ${salesSheetItems.length} items`,
        };
      });
    }),

  /**
   * Convert a quote to a sale
   * 
   * USP-004: Now uses existing ordersDb.convertQuoteToSale function
   * which properly handles:
   * - Quote expiration check
   * - Inventory reduction with row-level locking
   * - Audit log creation
   * - All edge cases
   */
  convertQuoteToSale: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(convertQuoteToSaleSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // First check if quote is expired and user hasn't confirmed
      const [quote] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!quote) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Quote not found",
        });
      }

      if (quote.orderType !== 'QUOTE') {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order is not a quote",
        });
      }

      // Check expiration - if expired and not confirmed, throw error
      if (isQuoteExpired(quote.validUntil) && !input.confirmExpired) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Quote has expired on ${new Date(quote.validUntil!).toLocaleDateString()}. Set confirmExpired=true to proceed anyway.`,
        });
      }

      // Use the existing ordersDb function which handles:
      // - Inventory reduction
      // - Audit logging
      // - Transaction safety
      try {
        const sale = await convertQuoteToSaleDb({
          quoteId: input.orderId,
          paymentTerms: input.paymentTerms || 'NET_30',
          cashPayment: input.cashPayment,
          notes: input.notes,
        });

        return {
          success: true,
          orderId: sale.id,
          orderNumber: sale.orderNumber,
          message: `Quote converted to sale ${sale.orderNumber}`,
        };
      } catch (error: any) {
        // Re-throw with proper TRPC error
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to convert quote to sale",
        });
      }
    }),

  /**
   * Soft delete a pipeline item
   */
  softDelete: protectedProcedure
    .use(requirePermission("orders:delete"))
    .input(z.object({
      itemId: z.string(), // Prefixed ID: SS-{id}, Q-{id}, S-{id}
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [prefix, idStr] = input.itemId.split('-');
      const id = parseInt(idStr, 10);

      if (isNaN(id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid item ID format",
        });
      }

      const now = new Date();

      if (prefix === 'SS') {
        await db
          .update(salesSheetHistory)
          .set({ deletedAt: now })
          .where(eq(salesSheetHistory.id, id));
      } else if (prefix === 'Q' || prefix === 'S') {
        await db
          .update(orders)
          .set({ deletedAt: now })
          .where(eq(orders.id, id));
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown item type",
        });
      }

      return {
        success: true,
        message: `Item ${input.itemId} has been deleted`,
      };
    }),

  /**
   * Restore a soft-deleted pipeline item
   */
  restore: protectedProcedure
    .use(requirePermission("orders:delete"))
    .input(z.object({
      itemId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [prefix, idStr] = input.itemId.split('-');
      const id = parseInt(idStr, 10);

      if (isNaN(id)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid item ID format",
        });
      }

      if (prefix === 'SS') {
        await db
          .update(salesSheetHistory)
          .set({ deletedAt: null })
          .where(eq(salesSheetHistory.id, id));
      } else if (prefix === 'Q' || prefix === 'S') {
        await db
          .update(orders)
          .set({ deletedAt: null })
          .where(eq(orders.id, id));
      } else {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Unknown item type",
        });
      }

      return {
        success: true,
        message: `Item ${input.itemId} has been restored`,
      };
    }),

  /**
   * Get pipeline statistics
   */
  getStats: protectedProcedure
    .use(requirePermission("orders:read"))
    .input(z.object({
      dateFrom: z.string().optional(),
      dateTo: z.string().optional(),
      includeClosed: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get sales sheet stats (excluding converted unless includeClosed)
      const salesSheetConditions = [isNull(salesSheetHistory.deletedAt)];
      if (!input.includeClosed) {
        salesSheetConditions.push(isNull(salesSheetHistory.convertedToOrderId));
      }

      const salesSheetStats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(total_value), 0)`,
        })
        .from(salesSheetHistory)
        .where(and(...salesSheetConditions));

      // Get quote stats (excluding terminal statuses unless includeClosed)
      const quoteConditions = [
        eq(orders.orderType, 'QUOTE'),
        isNull(orders.deletedAt),
      ];
      if (!input.includeClosed) {
        quoteConditions.push(
          or(
            isNull(orders.quoteStatus),
            notInArray(orders.quoteStatus, TERMINAL_QUOTE_STATUSES)
          )!
        );
      }

      const quoteStats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL(15,2))), 0)`,
        })
        .from(orders)
        .where(and(...quoteConditions));

      // Get sale stats (excluding terminal statuses unless includeClosed)
      const saleConditions = [
        eq(orders.orderType, 'SALE'),
        isNull(orders.deletedAt),
      ];
      if (!input.includeClosed) {
        saleConditions.push(
          or(
            isNull(orders.saleStatus),
            notInArray(orders.saleStatus, TERMINAL_SALE_STATUSES)
          )!
        );
      }

      const saleStats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL(15,2))), 0)`,
        })
        .from(orders)
        .where(and(...saleConditions));

      // Get fulfilled stats
      const fulfilledStats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL(15,2))), 0)`,
        })
        .from(orders)
        .where(and(
          eq(orders.orderType, 'SALE'),
          or(
            eq(orders.saleStatus, 'FULFILLED'),
            eq(orders.saleStatus, 'DELIVERED')
          ),
          isNull(orders.deletedAt)
        ));

      return {
        salesSheets: {
          count: Number(salesSheetStats[0]?.count) || 0,
          totalValue: Number(salesSheetStats[0]?.totalValue) || 0,
        },
        quotes: {
          count: Number(quoteStats[0]?.count) || 0,
          totalValue: Number(quoteStats[0]?.totalValue) || 0,
        },
        sales: {
          count: Number(saleStats[0]?.count) || 0,
          totalValue: Number(saleStats[0]?.totalValue) || 0,
        },
        fulfilled: {
          count: Number(fulfilledStats[0]?.count) || 0,
          totalValue: Number(fulfilledStats[0]?.totalValue) || 0,
        },
      };
    }),
});
