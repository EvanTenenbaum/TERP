import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { strainService } from "../services/strainService";
import { requirePermission } from "../_core/permissionMiddleware";
import { db } from "../db";
import { orders, clients, batches } from "../../drizzle/schema";
import { count, sum, isNull } from "drizzle-orm";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/** Summary analytics data for dashboard */
interface AnalyticsSummary {
  totalRevenue: number;
  totalOrders: number;
  totalClients: number;
  totalInventoryItems: number;
}

/** Client strain preference data */
interface ClientStrainPreference {
  familyId: number;
  familyName: string;
  purchaseCount: number;
  totalQuantity: number;
  lastPurchaseDate: Date | null;
}

/** Top strain family data */
interface TopStrainFamily {
  familyId: number;
  familyName: string;
  totalSales: number;
  orderCount: number;
}

/** Strain family trend data point */
interface StrainFamilyTrend {
  month: string;
  sales: number;
  orderCount: number;
}

// ============================================================================
// INPUT SCHEMAS
// ============================================================================

const clientStrainPreferencesInput = z.object({ clientId: z.number() });

const topStrainFamiliesInput = z.object({
  limit: z.number().min(1).max(50).optional().default(10),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
});

const strainFamilyTrendsInput = z.object({
  familyId: z.number(),
  months: z.number().min(1).max(24).optional().default(6),
});

// ============================================================================
// ROUTER
// ============================================================================

export const analyticsRouter = router({
  // Get summary analytics for dashboard
  getSummary: protectedProcedure.use(requirePermission("analytics:read"))
    .query(async (): Promise<AnalyticsSummary> => {
      try {
        if (!db) {
          return {
            totalRevenue: 0,
            totalOrders: 0,
            totalClients: 0,
            totalInventoryItems: 0,
          };
        }

        // Get order stats (total revenue and count)
        const [orderStats] = await db
          .select({
            totalOrders: count(),
            totalRevenue: sum(orders.total),
          })
          .from(orders);

        // Get client count
        const [clientStats] = await db
          .select({ totalClients: count() })
          .from(clients);

        // Get inventory count (batches not soft-deleted)
        const [inventoryStats] = await db
          .select({ totalInventoryItems: count() })
          .from(batches)
          .where(isNull(batches.deletedAt));

        return {
          totalRevenue: Number(orderStats?.totalRevenue || 0),
          totalOrders: Number(orderStats?.totalOrders || 0),
          totalClients: Number(clientStats?.totalClients || 0),
          totalInventoryItems: Number(inventoryStats?.totalInventoryItems || 0),
        };
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get analytics summary',
          cause: error,
        });
      }
    }),

  // Get client's strain family preferences
  clientStrainPreferences: protectedProcedure.use(requirePermission("analytics:read"))
    .input(clientStrainPreferencesInput)
    .query(async ({ input }): Promise<ClientStrainPreference[]> => {
      try {
        const result = await strainService.getClientPreferences(input.clientId);
        return result as ClientStrainPreference[];
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
    .input(topStrainFamiliesInput)
    .query(async ({ input }): Promise<TopStrainFamily[]> => {
      try {
        const result = await strainService.getTopFamilies(input.limit, input.startDate, input.endDate);
        return result as TopStrainFamily[];
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
    .input(strainFamilyTrendsInput)
    .query(async ({ input }): Promise<StrainFamilyTrend[]> => {
      try {
        const result = await strainService.getFamilyTrends(input.familyId, input.months);
        return result as StrainFamilyTrend[];
      } catch (error) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Failed to get family trends',
          cause: error,
        });
      }
    }),
});

