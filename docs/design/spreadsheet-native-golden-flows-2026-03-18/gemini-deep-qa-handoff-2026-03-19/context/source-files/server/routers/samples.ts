import { z } from "zod";
import {
  protectedProcedure,
  router,
  strictlyProtectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import * as samplesDb from "../samplesDb";
import * as samplesAnalytics from "../samplesAnalytics";
import * as productsDb from "../productsDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { logger } from "../_core/logger";
import { TRPCError } from "@trpc/server";

// Location enum for type safety
const sampleLocationSchema = z.enum([
  "WAREHOUSE",
  "WITH_CLIENT",
  "WITH_SALES_REP",
  "RETURNED",
  "LOST",
]);

// Return condition enum
const returnConditionSchema = z.enum(["GOOD", "DAMAGED", "OPENED", "EXPIRED"]);

export const samplesRouter = router({
  // Product options for sample requests (catalogue-backed)
  productOptions: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).optional().default(15),
          offset: z.number().min(0).optional().default(0),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const limit = input?.limit ?? 15;
      const offset = input?.offset ?? 0;
      const search = input?.search;

      const items = await productsDb.getProducts({
        search,
        limit,
        offset,
        includeDeleted: false,
      });
      const total = await productsDb.getProductCount({
        search,
        includeDeleted: false,
      });

      return createSafeUnifiedResponse(items, total, limit, offset);
    }),
  // List sample requests with pagination
  // BUG-034: Standardized .list procedure for API consistency
  list: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(
      z
        .object({
          limit: z.number().min(1).max(1000).optional().default(50),
          offset: z.number().min(0).optional().default(0),
          clientId: z.number().optional(),
          status: z
            .enum([
              "PENDING",
              "FULFILLED",
              "CANCELLED",
              "RETURN_REQUESTED",
              "RETURNED",
            ])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;

      logger.info(
        { operation: "samples.list", userId, limit, offset },
        "[Samples] Listing sample requests"
      );

      try {
        // Fetch all sample requests (we'll filter in-memory if needed)
        let requests = await samplesDb.getAllSampleRequests(limit + offset);

        // Apply client filter if provided
        if (input?.clientId) {
          requests = requests.filter(r => r.clientId === input.clientId);
        }

        // Apply status filter if provided
        if (input?.status) {
          requests = requests.filter(
            r => r.sampleRequestStatus === input.status
          );
        }

        const total = requests.length;
        const paginatedRequests = requests.slice(offset, offset + limit);

        logger.info(
          {
            operation: "samples.list",
            userId,
            count: paginatedRequests.length,
            total,
          },
          `[Samples] Listed ${paginatedRequests.length} of ${total} sample requests`
        );

        return createSafeUnifiedResponse(
          paginatedRequests,
          total,
          limit,
          offset
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        logger.error(
          { operation: "samples.list", userId, error: errorMessage },
          "[Samples] Error listing sample requests"
        );
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to list sample requests.",
          cause: error,
        });
      }
    }),

  // Create a new sample request
  createRequest: strictlyProtectedProcedure
    .use(requirePermission("samples:create"))
    .input(
      z.object({
        clientId: z.number(),
        requestedBy: z.number().optional(), // deprecated: actor is derived from auth context
        products: z.array(
          z.object({
            productId: z.number(),
            quantity: z.string(),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const requestedBy = getAuthenticatedUserId(ctx);
      return await samplesDb.createSampleRequest(
        input.clientId,
        requestedBy,
        input.products,
        input.notes
      );
    }),

  // Fulfill a sample request
  fulfillRequest: strictlyProtectedProcedure
    .use(requirePermission("samples:allocate"))
    .input(
      z.object({
        requestId: z.number(),
        fulfilledBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await samplesDb.fulfillSampleRequest(
        input.requestId,
        input.fulfilledBy
      );
    }),

  // Cancel a sample request
  cancelRequest: strictlyProtectedProcedure
    .use(requirePermission("samples:delete"))
    .input(
      z.object({
        requestId: z.number(),
        cancelledBy: z.number(),
        reason: z.string(),
      })
    )
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
    .input(
      z.object({
        orderId: z.number(),
        sampleRequestId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      await samplesDb.linkOrderToSample(input.orderId, input.sampleRequestId);
      return { success: true };
    }),

  // Get sample requests by client
  getByClient: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(
      z.object({
        clientId: z.number(),
        limit: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return await samplesDb.getSampleRequestsByClient(
        input.clientId,
        input.limit
      );
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
    .input(
      z.object({
        clientId: z.number(),
        monthYear: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return await samplesDb.getMonthlyAllocation(
        input.clientId,
        input.monthYear
      );
    }),

  // Set monthly allocation for a client
  setMonthlyAllocation: strictlyProtectedProcedure
    .use(requirePermission("samples:allocate"))
    .input(
      z.object({
        clientId: z.number(),
        monthYear: z.string(),
        allocatedQuantity: z.string(),
      })
    )
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
    .input(
      z.object({
        clientId: z.number(),
        requestedQuantity: z.string(),
      })
    )
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
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleDistributionReport(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample conversion report
  getConversionReport: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleConversionReport(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample effectiveness by product
  getEffectivenessByProduct: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleEffectivenessByProduct(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample cost by product
  getCostByProduct: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleCostByProduct(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample cost by client
  getCostByClient: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      return await samplesAnalytics.getSampleCostByClient(
        new Date(input.startDate),
        new Date(input.endDate)
      );
    }),

  // Analytics: Sample ROI analysis
  getROIAnalysis: protectedProcedure
    .use(requirePermission("samples:track"))
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
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
    .input(
      z.object({
        requestId: z.number(),
        requestedBy: z.number(),
        reason: z.string().min(1, "Reason is required"),
        condition: returnConditionSchema,
        returnDate: z.string().optional(),
      })
    )
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
    .input(
      z.object({
        requestId: z.number(),
        approvedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await samplesDb.approveSampleReturn(
        input.requestId,
        input.approvedBy
      );
    }),

  // Complete a sample return
  completeReturn: strictlyProtectedProcedure
    .use(requirePermission("samples:return"))
    .input(
      z.object({
        requestId: z.number(),
        completedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await samplesDb.completeSampleReturn(
        input.requestId,
        input.completedBy
      );
    }),

  // ============================================================================
  // VENDOR RETURN WORKFLOW (SAMPLE-007)
  // ============================================================================

  // Request a vendor return
  requestVendorReturn: strictlyProtectedProcedure
    .use(requirePermission("samples:vendorReturn"))
    .input(
      z.object({
        requestId: z.number(),
        requestedBy: z.number(),
        reason: z.string().min(1, "Reason is required"),
      })
    )
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
    .input(
      z.object({
        requestId: z.number(),
        shippedBy: z.number(),
        trackingNumber: z.string().min(1, "Tracking number is required"),
      })
    )
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
    .input(
      z.object({
        requestId: z.number(),
        confirmedBy: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      return await samplesDb.confirmVendorReturn(
        input.requestId,
        input.confirmedBy
      );
    }),

  // ============================================================================
  // LOCATION TRACKING (SAMPLE-008)
  // ============================================================================

  // Update sample location
  updateLocation: strictlyProtectedProcedure
    .use(requirePermission("samples:track"))
    .input(
      z.object({
        requestId: z.number(),
        location: sampleLocationSchema,
        changedBy: z.number(),
        notes: z.string().optional(),
      })
    )
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
    .input(
      z.object({
        requestId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await samplesDb.getSampleLocationHistory(input.requestId);
    }),

  // ============================================================================
  // EXPIRATION TRACKING (SAMPLE-009)
  // ============================================================================

  // Get samples expiring within N days
  getExpiring: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(
      z.object({
        daysAhead: z.number().default(30),
      })
    )
    .query(async ({ input }) => {
      return await samplesDb.getExpiringSamples(input.daysAhead);
    }),

  // Set expiration date for a sample
  setExpirationDate: strictlyProtectedProcedure
    .use(requirePermission("samples:track"))
    .input(
      z.object({
        requestId: z.number(),
        expirationDate: z.string(),
      })
    )
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
  // Wave 4C: Enhanced logging for database error investigation
  getAll: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(
      z.object({
        limit: z.number().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      const limit = input.limit || 100;

      logger.info(
        { operation: "samples.getAll", userId, limit },
        "[Samples] Fetching all sample requests"
      );

      try {
        const requests = await samplesDb.getAllSampleRequests(limit);

        logger.info(
          { operation: "samples.getAll", userId, count: requests.length },
          `[Samples] Successfully fetched ${requests.length} sample requests`
        );

        // Warn if unexpected empty result but don't throw - empty can be valid
        if (requests.length === 0) {
          logger.warn(
            { operation: "samples.getAll", userId },
            "[Samples] Zero samples returned - this may be expected for new installations"
          );
        }

        return createSafeUnifiedResponse(requests, requests.length, limit, 0);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;

        logger.error(
          {
            operation: "samples.getAll",
            userId,
            error: errorMessage,
            stack: errorStack,
            limit,
          },
          "[Samples] Database error fetching sample requests"
        );

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to fetch sample requests. Database error.",
          cause: error,
        });
      }
    }),

  // Get a single sample request by ID
  getById: protectedProcedure
    .use(requirePermission("samples:read"))
    .input(
      z.object({
        requestId: z.number(),
      })
    )
    .query(async ({ input }) => {
      return await samplesDb.getSampleRequestById(input.requestId);
    }),
});
