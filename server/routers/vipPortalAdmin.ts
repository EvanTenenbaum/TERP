import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import * as vipPortalAdminService from "../services/vipPortalAdminService";
import {
  idSchema,
  vipFeaturesConfigSchema,
  vipAdvancedOptionsSchema,
  vipTiersArraySchema,
} from "../_core/validationSchemas";

/**
 * VIP Portal Admin Router (Streamlined)
 * Admin-facing endpoints for managing VIP client portals
 * Refactored to use service layer for better maintainability
 */
export const vipPortalAdminRouter = router({
  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================
  
  clients: router({
    listVipClients: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getVipClients({
          limit: input.limit,
          offset: input.offset,
        });
      }),

    enableVipPortal: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
        email: z.string().email(),
        initialPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.enableVipPortal({
          clientId: input.clientId,
          email: input.email,
          initialPassword: input.initialPassword,
        });
      }),

    disableVipPortal: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.disableVipPortal(input.clientId);
      }),

    getLastLogin: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getClientLastLogin(input.clientId);
      }),
  }),

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================
  
  config: router({
    get: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getVipPortalConfiguration(input.clientId);
      }),

    update: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: idSchema,
        moduleDashboardEnabled: z.boolean().optional(),
        moduleArEnabled: z.boolean().optional(),
        moduleApEnabled: z.boolean().optional(),
        moduleTransactionHistoryEnabled: z.boolean().optional(),
        moduleVipTierEnabled: z.boolean().optional(),
        moduleCreditCenterEnabled: z.boolean().optional(),
        moduleMarketplaceNeedsEnabled: z.boolean().optional(),
        moduleMarketplaceSupplyEnabled: z.boolean().optional(),
        moduleLiveCatalogEnabled: z.boolean().optional(),
        moduleLeaderboardEnabled: z.boolean().optional(),
        featuresConfig: vipFeaturesConfigSchema.optional(),
        advancedOptions: vipAdvancedOptionsSchema.optional(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.updateVipPortalConfiguration(input);
      }),

    applyTemplate: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
        template: z.enum(["FULL_ACCESS", "FINANCIAL_ONLY", "MARKETPLACE_ONLY", "BASIC"]),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.applyConfigurationTemplate(input.clientId, input.template);
      }),

    copyConfig: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        sourceClientId: z.number(),
        targetClientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.copyConfiguration(input.sourceClientId, input.targetClientId);
      }),
  }),

  // ============================================================================
  // VIP TIER MANAGEMENT
  // ============================================================================
  
  tier: router({
    getConfig: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .query(async () => {
        return await vipPortalAdminService.getVipTierConfiguration();
      }),

    updateConfig: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        tiers: vipTiersArraySchema,
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.updateVipTierConfiguration(input.tiers);
      }),
  }),

  // ============================================================================
  // LEADERBOARD CONFIGURATION
  // ============================================================================
  
  leaderboard: router({
    getConfig: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getLeaderboardConfiguration(input.clientId);
      }),

    updateConfig: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
        moduleLeaderboardEnabled: z.boolean(),
        leaderboardMetrics: z.array(z.string()),
        leaderboardDisplayMode: z.enum(['black_box', 'transparent']),
        leaderboardType: z.enum(['ytd_spend', 'payment_speed', 'order_frequency', 'credit_utilization', 'ontime_payment_rate']).optional(),
        minimumClients: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.updateLeaderboardConfiguration(input);
      }),
  }),

  // ============================================================================
  // LIVE CATALOG MANAGEMENT
  // ============================================================================
  
  liveCatalog: router({
    saveConfiguration: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
        enabled: z.boolean(),
        visibleCategories: z.array(z.number()).optional(),
        visibleSubcategories: z.array(z.number()).optional(),
        visibleItems: z.array(z.number()).optional(),
        hiddenItems: z.array(z.number()).optional(),
        showQuantity: z.boolean().optional(),
        showBrand: z.boolean().optional(),
        showGrade: z.boolean().optional(),
        showDate: z.boolean().optional(),
        showBasePrice: z.boolean().optional(),
        showMarkup: z.boolean().optional(),
        enablePriceAlerts: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.saveLiveCatalogConfiguration(input);
      }),
    
    getConfiguration: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getLiveCatalogConfiguration(input.clientId);
      }),
    
    // Interest Lists Management
    interestLists: router({
      getByClient: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          clientId: z.number(),
          status: z.enum(['NEW', 'REVIEWED', 'CONVERTED', 'ARCHIVED']).optional(),
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }))
        .query(async ({ input }) => {
          return await vipPortalAdminService.getInterestListsByClient(input);
        }),
      
      getById: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          listId: z.number(),
        }))
        .query(async ({ input }) => {
          return await vipPortalAdminService.getInterestListById(input.listId);
        }),
      
      updateStatus: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          listId: z.number(),
          status: z.enum(['NEW', 'REVIEWED', 'CONVERTED', 'ARCHIVED']),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return await vipPortalAdminService.updateInterestListStatus(input);
        }),
      
      // Note: addToNewOrder and addToDraftOrder require complex order creation logic
      // These would need additional service methods or separate order service integration
      addToNewOrder: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          listId: z.number(),
          itemIds: z.array(z.number()),
        }))
        .mutation(async ({ input, ctx }): Promise<{ orderNumber: string; itemCount: number }> => {
          // TODO: Implement in service layer with order creation integration
          throw new Error("Not yet implemented in service layer");
        }),
      
      addToDraftOrder: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          listId: z.number(),
          orderId: z.number(),
          itemIds: z.array(z.number()),
        }))
        .mutation(async ({ input }): Promise<{ itemsAdded: number; orderNumber: string }> => {
          // TODO: Implement in service layer with order update integration
          throw new Error("Not yet implemented in service layer");
        }),
    }),
    
    // Draft Interests (Admin View)
    draftInterests: router({
      getByClient: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          clientId: z.number(),
        }))
        .query(async ({ input }) => {
          return await vipPortalAdminService.getDraftInterestsByClient(input.clientId);
        }),
    }),

    // Price Alerts (Admin)
    priceAlerts: router({
      list: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          clientId: z.number(),
        }))
        .query(async ({ input }) => {
          return await vipPortalAdminService.getClientPriceAlerts(input.clientId);
        }),

      deactivate: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          alertId: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await vipPortalAdminService.deactivateClientPriceAlert(input.alertId);
        }),
    }),
  }),
});