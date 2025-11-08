import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { strainService } from "../services/strainService";
import { requirePermission } from "../_core/permissionMiddleware";

export const analyticsRouter = router({
  // Get client's strain family preferences
  clientStrainPreferences: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      try {
        return await strainService.getClientPreferences(input.clientId);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get client preferences',
          cause: error,
        });
      }
    }),

  // Get top selling strain families
  topStrainFamilies: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({
      limit: z.number().min(1).max(50).optional().default(10),
      startDate: z.date().optional(),
      endDate: z.date().optional(),
    }))
    .query(async ({ input }) => {
      try {
        return await strainService.getTopFamilies(input.limit, input.startDate, input.endDate);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get top families',
          cause: error,
        });
      }
    }),

  // Get strain family trends over time
  strainFamilyTrends: protectedProcedure.use(requirePermission("analytics:read"))
    .input(z.object({
      familyId: z.number(),
      months: z.number().min(1).max(24).optional().default(6),
    }))
    .query(async ({ input }) => {
      try {
        return await strainService.getFamilyTrends(input.familyId, input.months);
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get family trends',
          cause: error,
        });
      }
    }),
});

