import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import * as ordersDb from "../ordersDb";

export const ordersRouter = router({
    // Create
    create: protectedProcedure.use(requirePermission("orders:create"))
      .input(z.object({
        orderType: z.enum(['QUOTE', 'SALE']),
        isDraft: z.boolean().optional(),
        clientId: z.number(),
        items: z.array(z.object({
          batchId: z.number(),
          displayName: z.string().optional(),
          quantity: z.number(),
          unitPrice: z.number(),
          isSample: z.boolean(),
          overridePrice: z.number().optional(),
          overrideCogs: z.number().optional(),
        })),
        validUntil: z.string().optional(),
        paymentTerms: z.enum(['NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT']).optional(),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await ordersDb.createOrder({
          ...input,
          createdBy: ctx.user?.id || 1,
        });
      }),
    // Read
    getById: protectedProcedure.use(requirePermission("orders:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await ordersDb.getOrderById(input.id);
      }),
    getByClient: protectedProcedure.use(requirePermission("orders:read"))
      .input(z.object({ 
        clientId: z.number(),
        orderType: z.enum(['QUOTE', 'SALE']).optional(),
      }))
      .query(async ({ input }) => {
        return await ordersDb.getOrdersByClient(input.clientId, input.orderType);
      }),
    getAll: protectedProcedure.use(requirePermission("orders:read"))
      .input(z.object({
        orderType: z.enum(['QUOTE', 'SALE']).optional(),
        isDraft: z.boolean().optional(),
        quoteStatus: z.string().optional(),
        saleStatus: z.string().optional(),
        fulfillmentStatus: z.string().optional(),
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional())
      .query(async ({ input }) => {
        return await ordersDb.getAllOrders(input);
      }),
    // Update
    update: protectedProcedure.use(requirePermission("orders:update"))
      .input(z.object({
        id: z.number(),
        notes: z.string().optional(),
        validUntil: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        return await ordersDb.updateOrder(id, updates);
      }),
    // Delete
    delete: protectedProcedure.use(requirePermission("orders:delete"))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await ordersDb.deleteOrder(input.id);
        return { success: true };
      }),
    // Convert (backward compatibility)
    convertToSale: protectedProcedure.use(requirePermission("orders:create"))
      .input(z.object({
        quoteId: z.number(),
        paymentTerms: z.enum(['NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT']),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await ordersDb.convertQuoteToSale(input);
      }),
    
    // Confirm Draft Order (NEW)
    confirmDraftOrder: protectedProcedure.use(requirePermission("orders:create"))
      .input(z.object({
        orderId: z.number(),
        paymentTerms: z.enum(['NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT']),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await ordersDb.confirmDraftOrder({
          ...input,
          confirmedBy: ctx.user?.id || 1,
        });
      }),
    
    // Update Draft Order (NEW)
    updateDraftOrder: protectedProcedure.use(requirePermission("orders:update"))
      .input(z.object({
        orderId: z.number(),
        items: z.array(z.object({
          batchId: z.number(),
          displayName: z.string().optional(),
          quantity: z.number(),
          unitPrice: z.number(),
          isSample: z.boolean(),
          overridePrice: z.number().optional(),
          overrideCogs: z.number().optional(),
        })).optional(),
        validUntil: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await ordersDb.updateDraftOrder(input);
      }),
    
    // Delete Draft Order (NEW)
    deleteDraftOrder: protectedProcedure.use(requirePermission("orders:delete"))
      .input(z.object({
        orderId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await ordersDb.deleteDraftOrder(input);
      }),
    // Export
    export: protectedProcedure.use(requirePermission("orders:read"))
      .input(z.object({
        id: z.number(),
        format: z.enum(['pdf', 'clipboard', 'image']),
      }))
      .mutation(async ({ input }) => {
        return await ordersDb.exportOrder(input.id, input.format);
      }),
    
    // Fulfillment Status Management
    updateOrderStatus: protectedProcedure.use(requirePermission("orders:update"))
      .input(z.object({
        orderId: z.number(),
        newStatus: z.enum(['PENDING', 'PACKED', 'SHIPPED']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await ordersDb.updateOrderStatus({
          ...input,
          userId: ctx.user?.id || 1,
        });
      }),
    
    getOrderStatusHistory: protectedProcedure.use(requirePermission("orders:read"))
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await ordersDb.getOrderStatusHistory(input.orderId);
      }),
    
    // Returns Management
    processReturn: protectedProcedure.use(requirePermission("orders:update"))
      .input(z.object({
        orderId: z.number(),
        items: z.array(z.object({
          batchId: z.number(),
          quantity: z.number(),
        })),
        reason: z.enum(['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CUSTOMER_CHANGED_MIND', 'OTHER']),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await ordersDb.processReturn({
          ...input,
          userId: ctx.user?.id || 1,
        });
      }),
    
    getOrderReturns: protectedProcedure.use(requirePermission("orders:read"))
      .input(z.object({ orderId: z.number() }))
      .query(async ({ input }) => {
        return await ordersDb.getOrderReturns(input.orderId);
      }),
    
    // Quote to Sale Conversion
    convertQuoteToSale: protectedProcedure.use(requirePermission("orders:create"))
      .input(z.object({ 
        quoteId: z.number(),
        paymentTerms: z.enum(['NET_7', 'NET_15', 'NET_30', 'COD', 'PARTIAL', 'CONSIGNMENT']).optional(),
        cashPayment: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await ordersDb.convertQuoteToSale({
          quoteId: input.quoteId,
          paymentTerms: input.paymentTerms || 'NET_30',
          cashPayment: input.cashPayment,
          notes: input.notes,
        });
      }),
  })
