import { z } from "zod";
import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
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

    // Impersonate a client - creates a session to view portal as the client
    impersonate: protectedProcedure.use(requirePermission("vip_portal:manage"))
      .input(z.object({
        clientId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await vipPortalAdminService.createImpersonationSession(input.clientId, ctx.user?.id);
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
        // Filter to only tiers with an id (existing tiers to update)
        const tiersWithId = input.tiers.filter((t): t is typeof t & { id: number } => typeof t.id === 'number');
        return await vipPortalAdminService.updateVipTierConfiguration(tiersWithId);
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
          // Get interest list with items
          const list = await vipPortalAdminService.getInterestListById(input.listId);
          if (!list) {
            throw new Error("Interest list not found");
          }

          // Filter to selected items
          const selectedItems = list.items?.filter((item: { id: number }) => 
            input.itemIds.includes(item.id)
          ) || [];

          if (selectedItems.length === 0) {
            throw new Error("No valid items selected");
          }

          // Create order via orders service
          const { createOrderFromInterestList } = await import("../services/orderService");
          const order = await createOrderFromInterestList({
            clientId: list.clientId,
            items: selectedItems,
            source: "vip_portal_interest_list",
          });

          // Update interest list status
          await vipPortalAdminService.updateInterestListStatus({
            listId: input.listId,
            status: "CONVERTED",
            notes: `Converted to order ${order.orderNumber}`,
          });

          return { 
            orderNumber: order.orderNumber, 
            itemCount: selectedItems.length 
          };
        }),
      
      addToDraftOrder: protectedProcedure.use(requirePermission("vip_portal:manage"))
        .input(z.object({
          listId: z.number(),
          orderId: z.number(),
          itemIds: z.array(z.number()),
        }))
        .mutation(async ({ input }): Promise<{ itemsAdded: number; orderNumber: string }> => {
          // Get interest list with items
          const list = await vipPortalAdminService.getInterestListById(input.listId);
          if (!list) {
            throw new Error("Interest list not found");
          }

          // Filter to selected items
          const selectedItems = list.items?.filter((item: { id: number }) => 
            input.itemIds.includes(item.id)
          ) || [];

          if (selectedItems.length === 0) {
            throw new Error("No valid items selected");
          }

          // Add items to existing order via orders service
          const { addItemsToOrder, getOrderById } = await import("../services/orderService");
          await addItemsToOrder({
            orderId: input.orderId,
            items: selectedItems,
          });

          const order = await getOrderById(input.orderId);

          return { 
            itemsAdded: selectedItems.length, 
            orderNumber: order?.orderNumber || `ORD-${input.orderId}` 
          };
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

  // ============================================================================
  // ADMIN IMPERSONATION AUDIT (FEATURE-012)
  // ============================================================================

  audit: router({
    // Create a new audited impersonation session
    createImpersonationSession: protectedProcedure
      .use(requirePermission("admin:impersonate"))
      .input(z.object({
        clientId: z.number(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await vipPortalAdminService.createAuditedImpersonationSession({
          adminUserId: ctx.user!.id,
          clientId: input.clientId,
          reason: input.reason,
          ipAddress: ctx.req?.ip || undefined,
          userAgent: ctx.req?.headers?.['user-agent'] || undefined,
        });
      }),

    // Exchange one-time token for session token (public endpoint for impersonation page)
    exchangeToken: publicProcedure
      .input(z.object({
        oneTimeToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.exchangeImpersonationToken({
          oneTimeToken: input.oneTimeToken,
        });
      }),

    // Log an action during impersonation
    logAction: protectedProcedure
      .use(requirePermission("admin:impersonate"))
      .input(z.object({
        sessionGuid: z.string(),
        actionType: z.string(),
        actionPath: z.string().optional(),
        actionMethod: z.string().optional(),
        actionDetails: z.record(z.string(), z.unknown()).optional(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.logImpersonationActionByGuid({
          sessionGuid: input.sessionGuid,
          actionType: input.actionType,
          actionPath: input.actionPath,
          actionMethod: input.actionMethod,
          actionDetails: input.actionDetails,
        });
      }),

    // End an impersonation session
    endSession: protectedProcedure
      .use(requirePermission("admin:impersonate"))
      .input(z.object({
        sessionGuid: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await vipPortalAdminService.endImpersonationSession({
          sessionGuid: input.sessionGuid,
        });
      }),

    // Revoke an impersonation session (super-admin action)
    revokeSession: protectedProcedure
      .use(requirePermission("admin:impersonate"))
      .input(z.object({
        sessionGuid: z.string(),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await vipPortalAdminService.revokeImpersonationSession({
          sessionGuid: input.sessionGuid,
          revokedByUserId: ctx.user!.id,
          reason: input.reason,
        });
      }),

    // Get active impersonation sessions
    getActiveSessions: protectedProcedure
      .use(requirePermission("admin:impersonate"))
      .input(z.object({
        adminUserId: z.number().optional(),
        clientId: z.number().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getActiveImpersonationSessions({
          adminUserId: input.adminUserId,
          clientId: input.clientId,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // Get session history for audit
    getSessionHistory: protectedProcedure
      .use(requirePermission("admin:impersonate"))
      .input(z.object({
        sessionGuid: z.string().optional(),
        adminUserId: z.number().optional(),
        clientId: z.number().optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getImpersonationSessionHistory({
          sessionGuid: input.sessionGuid,
          adminUserId: input.adminUserId,
          clientId: input.clientId,
          limit: input.limit,
          offset: input.offset,
        });
      }),

    // Get actions for a specific session
    getSessionActions: protectedProcedure
      .use(requirePermission("admin:impersonate"))
      .input(z.object({
        sessionId: z.number(),
        limit: z.number().optional().default(100),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        return await vipPortalAdminService.getImpersonationSessionActions({
          sessionId: input.sessionId,
          limit: input.limit,
          offset: input.offset,
        });
      }),
  }),

  // ============================================================================
  // Sprint 5 Track A - Task 5.A.2: MEET-041 - VIP Debt Aging Admin
  // ============================================================================
  debtAging: router({
    /**
     * Get all VIP clients with aging debt
     */
    getAgingDebt: protectedProcedure
      .use(requirePermission("vip_portal:manage"))
      .query(async () => {
        const { getVipClientsWithAgingDebt } = await import("../services/vipDebtAgingService");
        return await getVipClientsWithAgingDebt();
      }),

    /**
     * Send debt aging notifications to VIP clients
     */
    sendNotifications: protectedProcedure
      .use(requirePermission("vip_portal:manage"))
      .mutation(async () => {
        const { sendDebtAgingNotifications } = await import("../services/vipDebtAgingService");
        return await sendDebtAgingNotifications();
      }),

    /**
     * Get debt aging summary for a specific client
     */
    getClientSummary: protectedProcedure
      .use(requirePermission("vip_portal:manage"))
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { getClientDebtAgingSummary } = await import("../services/vipDebtAgingService");
        return await getClientDebtAgingSummary(input.clientId);
      }),
  }),
});