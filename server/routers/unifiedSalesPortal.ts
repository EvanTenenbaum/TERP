/**
 * Unified Sales Portal (USP) Router
 * 
 * Provides a unified pipeline view combining sales sheets, quotes, and orders
 * with conversion tracking and drag-and-drop stage management.
 * 
 * USP-001: Initial Implementation
 * - Pipeline view with all sales items
 * - Sales sheet to quote conversion
 * - Quote to sale conversion
 * - Soft delete support
 */

import { z } from "zod";
import { router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { orders, salesSheetHistory, clients, users } from "../../drizzle/schema";
import { eq, desc, isNull, and, or, sql, inArray } from "drizzle-orm";

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
  validUntil?: Date | null;
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
  includeDeleted: z.boolean().default(false),
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
});

// ============================================================================
// UNIFIED SALES PORTAL ROUTER
// ============================================================================

export const unifiedSalesPortalRouter = router({
  /**
   * Get unified pipeline view
   * Combines sales sheets, quotes, and orders into a single timeline
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

      // Build date filter conditions
      const dateConditions = [];
      if (input.dateFrom) {
        dateConditions.push(sql`created_at >= ${input.dateFrom}`);
      }
      if (input.dateTo) {
        dateConditions.push(sql`created_at <= ${input.dateTo}`);
      }

      // Fetch Sales Sheets
      if (fetchSalesSheets) {
        const salesSheetConditions = [
          input.includeDeleted ? sql`1=1` : isNull(salesSheetHistory.deletedAt),
        ];
        
        if (input.clientIds?.length) {
          salesSheetConditions.push(inArray(salesSheetHistory.clientId, input.clientIds));
        }
        if (input.createdByIds?.length) {
          salesSheetConditions.push(inArray(salesSheetHistory.createdBy, input.createdByIds));
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
            stage: sheet.convertedToOrderId ? 'QUOTE' : 'SALES_SHEET',
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

        if (input.clientIds?.length) {
          orderConditions.push(inArray(orders.clientId, input.clientIds));
        }
        if (input.createdByIds?.length) {
          orderConditions.push(inArray(orders.createdBy, input.createdByIds));
        }

        // Filter by order type based on stages
        const orderTypes: string[] = [];
        if (fetchQuotes) orderTypes.push('QUOTE');
        if (fetchSales) orderTypes.push('SALE');
        
        if (orderTypes.length > 0 && orderTypes.length < 2) {
          orderConditions.push(eq(orders.orderType, orderTypes[0] as 'QUOTE' | 'SALE'));
        }

        const ordersResult = await db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            orderType: orders.orderType,
            orderStatus: orders.orderStatus,
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
          } else if (order.orderStatus === 'FULFILLED' || order.orderStatus === 'DELIVERED') {
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
            validUntil: order.validUntil,
            deletedAt: order.deletedAt,
          });
        }
      }

      // Sort by createdAt descending
      items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Apply offset and limit
      const paginatedItems = items.slice(input.offset, input.offset + input.limit);

      return {
        items: paginatedItems,
        total: items.length,
        hasMore: input.offset + input.limit < items.length,
        stages: {
          SALES_SHEET: items.filter(i => i.stage === 'SALES_SHEET').length,
          QUOTE: items.filter(i => i.stage === 'QUOTE').length,
          SALE: items.filter(i => i.stage === 'SALE').length,
          FULFILLED: items.filter(i => i.stage === 'FULFILLED').length,
        },
      };
    }),

  /**
   * Convert a sales sheet to a quote
   * Creates a new quote order and links it to the original sales sheet
   */
  convertSalesSheetToQuote: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(convertSalesSheetToQuoteSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get the sales sheet
      const [salesSheet] = await db
        .select()
        .from(salesSheetHistory)
        .where(eq(salesSheetHistory.id, input.salesSheetId))
        .limit(1);

      if (!salesSheet) {
        throw new Error("Sales sheet not found");
      }

      if (salesSheet.convertedToOrderId) {
        throw new Error("Sales sheet has already been converted to a quote");
      }

      // Parse items from sales sheet
      const items = typeof salesSheet.items === 'string'
        ? JSON.parse(salesSheet.items)
        : salesSheet.items;

      // Generate order number
      const orderNumber = `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // Create the quote order
      const [newOrder] = await db
        .insert(orders)
        .values({
          orderNumber,
          orderType: 'QUOTE',
          orderStatus: 'DRAFT',
          clientId: salesSheet.clientId,
          totalAmount: String(salesSheet.totalValue),
          subtotal: String(salesSheet.totalValue),
          validUntil: input.validUntil ? new Date(input.validUntil) : null,
          notes: input.notes || `Converted from Sales Sheet #${salesSheet.id}`,
          createdBy: userId,
          convertedFromSalesSheetId: salesSheet.id,
          convertedAt: new Date(),
        })
        .$returningId();

      // Update the sales sheet with the conversion reference
      await db
        .update(salesSheetHistory)
        .set({
          convertedToOrderId: newOrder.id,
        })
        .where(eq(salesSheetHistory.id, input.salesSheetId));

      return {
        success: true,
        orderId: newOrder.id,
        orderNumber,
        message: `Sales sheet converted to quote ${orderNumber}`,
      };
    }),

  /**
   * Convert a quote to a sale
   * Updates the order type and status
   */
  convertQuoteToSale: protectedProcedure
    .use(requirePermission("orders:create"))
    .input(convertQuoteToSaleSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get the quote
      const [quote] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!quote) {
        throw new Error("Quote not found");
      }

      if (quote.orderType !== 'QUOTE') {
        throw new Error("Order is not a quote");
      }

      // Generate new order number for the sale
      const saleOrderNumber = quote.orderNumber.replace('Q-', 'S-');

      // Update the order to a sale
      await db
        .update(orders)
        .set({
          orderType: 'SALE',
          orderStatus: 'PENDING',
          orderNumber: saleOrderNumber,
          paymentTerms: input.paymentTerms || quote.paymentTerms,
          cashPayment: input.cashPayment ? String(input.cashPayment) : quote.cashPayment,
          notes: input.notes || quote.notes,
          convertedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(orders.id, input.orderId));

      return {
        success: true,
        orderId: input.orderId,
        orderNumber: saleOrderNumber,
        message: `Quote converted to sale ${saleOrderNumber}`,
      };
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
        throw new Error("Invalid item ID");
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
        throw new Error("Unknown item type");
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
        throw new Error("Invalid item ID");
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
        throw new Error("Unknown item type");
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
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Get sales sheet stats
      const salesSheetStats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(total_value), 0)`,
        })
        .from(salesSheetHistory)
        .where(isNull(salesSheetHistory.deletedAt));

      // Get quote stats
      const quoteStats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL(15,2))), 0)`,
        })
        .from(orders)
        .where(and(
          eq(orders.orderType, 'QUOTE'),
          isNull(orders.deletedAt)
        ));

      // Get sale stats
      const saleStats = await db
        .select({
          count: sql<number>`COUNT(*)`,
          totalValue: sql<number>`COALESCE(SUM(CAST(total_amount AS DECIMAL(15,2))), 0)`,
        })
        .from(orders)
        .where(and(
          eq(orders.orderType, 'SALE'),
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
        conversionRate: {
          salesSheetToQuote: 0, // Would need more complex query
          quoteToSale: 0,
        },
      };
    }),
});
