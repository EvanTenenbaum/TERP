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

// Location enum for type safety
const sampleLocationSchema = z.enum([
  "WAREHOUSE",
  "WITH_CLIENT",
  "WITH_SALES_REP",
  "RETURNED",
  "LOST",
]);

// Return condition enum
const returnConditionSchema = z.enum([
  "GOOD",
  "DAMAGED",
  "OPENED",
  "EXPIRED",
]);

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

  // ============================================================================
  // SAMPLE RETURN WORKFLOW (SAMPLE-006)
  // ============================================================================

  // Request a sample return
  requestReturn: strictlyProtectedProcedure
    .use(requirePermission("samples:return"))
    .input(z.object({
      requestId: z.number(),
      requestedBy: z.number(),
      reason: z.string().min(1, "Reason is required"),
      condition: returnConditionSchema,
      returnDate: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.requestSampleReturn(
        input.requestId,
        input.requestedBy,
        input.reason,
        input.condition,
        input.returnDate ? new Date(input.returnDate) : undefined
      );
    }),

  // Approve a sample return
  approveReturn: strictlyProtectedProcedure
    .use(requirePermission("samples:approve"))
    .input(z.object({
      requestId: z.number(),
      approvedBy: z.number()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.approveSampleReturn(input.requestId, input.approvedBy);
    }),

  // Complete a sample return
  completeReturn: strictlyProtectedProcedure
    .use(requirePermission("samples:return"))
    .input(z.object({
      requestId: z.number(),
      completedBy: z.number()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.completeSampleReturn(input.requestId, input.completedBy);
    }),

  // ============================================================================
  // VENDOR RETURN WORKFLOW (SAMPLE-007)
  // ============================================================================

  // Request a vendor return
  requestVendorReturn: strictlyProtectedProcedure
    .use(requirePermission("samples:vendorReturn"))
    .input(z.object({
      requestId: z.number(),
      requestedBy: z.number(),
      reason: z.string().min(1, "Reason is required")
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.requestVendorReturn(
        input.requestId,
        input.requestedBy,
        input.reason
      );
    }),

  // Ship sample to vendor
  shipToVendor: strictlyProtectedProcedure
    .use(requirePermission("samples:vendorReturn"))
    .input(z.object({
      requestId: z.number(),
      shippedBy: z.number(),
      trackingNumber: z.string().min(1, "Tracking number is required")
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.shipToVendor(
        input.requestId,
        input.shippedBy,
        input.trackingNumber
      );
    }),

  // Confirm vendor received the sample
  confirmVendorReturn: strictlyProtectedProcedure
    .use(requirePermission("samples:vendorReturn"))
    .input(z.object({
      requestId: z.number(),
      confirmedBy: z.number()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.confirmVendorReturn(input.requestId, input.confirmedBy);
    }),

  // ============================================================================
  // LOCATION TRACKING (SAMPLE-008)
  // ============================================================================

  // Update sample location
  updateLocation: strictlyProtectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      requestId: z.number(),
      location: sampleLocationSchema,
      changedBy: z.number(),
      notes: z.string().optional()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.updateSampleLocation(
        input.requestId,
        input.location,
        input.changedBy,
        input.notes
      );
    }),

  // Get location history for a sample
  getLocationHistory: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(z.object({
      requestId: z.number()
    }))
    .query(async ({ input }) => {
      return await samplesDb.getSampleLocationHistory(input.requestId);
    }),

  // ============================================================================
  // EXPIRATION TRACKING (SAMPLE-009)
  // ============================================================================

  // Get samples expiring within N days
  getExpiring: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(z.object({
      daysAhead: z.number().default(30)
    }))
    .query(async ({ input }) => {
      return await samplesDb.getExpiringSamples(input.daysAhead);
    }),

  // Set expiration date for a sample
  setExpirationDate: strictlyProtectedProcedure
    .use(requirePermission("samples:track"))
    .input(z.object({
      requestId: z.number(),
      expirationDate: z.string()
    }))
    .mutation(async ({ input }) => {
      return await samplesDb.setSampleExpirationDate(
        input.requestId,
        new Date(input.expirationDate)
      );
    }),

  // ============================================================================
  // ADDITIONAL ENDPOINTS
  // ============================================================================

  // Get all sample requests (not just pending)
  getAll: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(z.object({
      limit: z.number().optional()
    }))
    .query(async ({ input, ctx }) => {
      // Debug logging for QA-050
      console.log('[samples.getAll] Input:', {
        limit: input.limit,
        userId: ctx.user?.id,
      });

      const requests = await samplesDb.getAllSampleRequests(input.limit);

      // Debug logging for QA-050
      console.log('[samples.getAll] Result:', {
        requestsCount: requests.length,
        hasRequests: requests.length > 0,
      });

      // Warn if unexpected empty result
      if (requests.length === 0) {
        console.warn('[samples.getAll] Zero samples returned - possible data issue');
      }

      return createSafeUnifiedResponse(requests, requests.length, input.limit || 100, 0);
    }),

  // Get a single sample request by ID
  getById: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(z.object({
      requestId: z.number()
    }))
    .query(async ({ input }) => {
      return await samplesDb.getSampleRequestById(input.requestId);
    }),
});
