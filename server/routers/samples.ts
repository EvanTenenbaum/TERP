import { z } from "zod";
import {
  protectedProcedure,
  router,
  strictlyProtectedProcedure,
} from "../_core/trpc";
import * as samplesDb from "../samplesDb";
import * as samplesAnalytics from "../samplesAnalytics";
import { requirePermission } from "../_core/permissionMiddleware";
import { createSafeUnifiedResponse } from "../_core/pagination";

export const samplesRouter = router({
  // Create a new sample request
  createRequest: strictlyProtectedProcedure
    .use(requirePermission("samples:create"))
    .input(z.object({
      clientId: z.number(),
      requestedBy: z.number(),
      products: z.array(z.object({
        productId: z.number(),
        quantity: z.string()
      })),
      notes: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.createSampleRequest(
        input.clientId,
        input.requestedBy,
        input.products,
        input.notes
      );
    }),

  // Fulfill a sample request
  fulfillRequest: strictlyProtectedProcedure
    .use(requirePermission("samples:allocate"))
    .input(z.object({
      requestId: z.number(),
      fulfilledBy: z.number()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.fulfillSampleRequest(input.requestId, input.fulfilledBy);
    }),

  // Cancel a sample request
  cancelRequest: strictlyProtectedProcedure
    .use(requirePermission("samples:delete"))
    .input(z.object({
      requestId: z.number(),
      cancelledBy: z.number(),
      reason: z.string()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.cancelSampleRequest(
        input.requestId,
        input.cancelledBy,
        input.reason
      );
    }),

  // Link an order to a sample request (conversion tracking)
  linkOrderToSample: strictlyProtectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      orderId: z.number(),
      sampleRequestId: z.number()
    }))
    .mutation(async ({ input }) => {
      await samplesDb.linkOrderToSample(input.orderId, input.sampleRequestId);
      return { success: true };
    }),

  // Get sample requests by client
  getByClient: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(z.object({
      clientId: z.number(),
      limit: z.number().optional()
    }))
    .query(async ({ input }) => {
      return await samplesDb.getSampleRequestsByClient(input.clientId, input.limit);
    }),

  // Get all pending sample requests
  // BUG-034: Standardized pagination response
  getPending: protectedProcedure
    .use(requirePermission("samples:read"))
    .query(async () => {
      const requests = await samplesDb.getPendingSampleRequests();
      return createSafeUnifiedResponse(requests, requests.length, 50, 0);
    }),

  // Get monthly allocation for a client
  getMonthlyAllocation: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(z.object({
      clientId: z.number(),
      monthYear: z.string().optional()
    }))
    .query(async ({ input }) => {
      return await samplesDb.getMonthlyAllocation(input.clientId, input.monthYear);
    }),

  // Set monthly allocation for a client
  setMonthlyAllocation: strictlyProtectedProcedure
    .use(requirePermission("samples:allocate"))
    .input(z.object({
      clientId: z.number(),
      monthYear: z.string(),
      allocatedQuantity: z.string()
    }))
    .mutation(async ({ input }) => {
      await samplesDb.setMonthlyAllocation(
        input.clientId,
        input.monthYear,
        input.allocatedQuantity
      );
      return { success: true };
    }),

  // Check monthly allocation
  checkAllocation: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(z.object({
      clientId: z.number(),
      requestedQuantity: z.string()
    }))
    .query(async ({ input }) => {
      const canAllocate = await samplesDb.checkMonthlyAllocation(
        input.clientId,
        input.requestedQuantity
      );
      return { canAllocate };
    }),

  // Analytics: Sample distribution report
  getDistributionReport: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleDistributionReport(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample conversion report
  getConversionReport: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleConversionReport(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample effectiveness by product
  getEffectivenessByProduct: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleEffectivenessByProduct(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample cost by product
  getCostByProduct: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleCostByProduct(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample cost by client
  getCostByClient: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleCostByClient(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample ROI analysis
  getROIAnalysis: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      startDate: z.string(),
      endDate: z.string()
    }))
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleROIAnalysis(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),
});
