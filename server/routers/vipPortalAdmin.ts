import { z } from "zod";
import { router } from "../_core/trpc";
import { getDb } from "../db";
import { 
  clients, 
  vipPortalAuth, 
  vipPortalConfigurations,
  clientInterestLists,
  clientInterestListItems,
  clientDraftInterests,
  clientPriceAlerts,
  batches,
  products,
} from "../../drizzle/schema";
import * as pricingEngine from "../pricingEngine";
import { eq, and, inArray, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../_core/permissionMiddleware";

/**
 * VIP Portal Admin Router
 * Admin-facing endpoints for managing VIP client portals
 */
export const vipPortalAdminRouter = router({
  // ============================================================================
  // CLIENT MANAGEMENT
  // ============================================================================
  
  clients: router({
    // Get all VIP-enabled clients
    listVipClients: requirePermission("vip_portal:manage")
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const vipClients = await db.query.clients.findMany({
          where: eq(clients.vipPortalEnabled, true),
          limit: input.limit,
          offset: input.offset,
          orderBy: (clients, { desc }) => [desc(clients.vipPortalLastLogin)],
        });

        return { clients: vipClients };
      }),

    // Enable VIP portal for a client
    enableVipPortal: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
        email: z.string().email(),
        initialPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // Check if client exists
        const client = await db.query.clients.findFirst({
          where: eq(clients.id, input.clientId),
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // Enable VIP portal on client
        await db.update(clients)
          .set({ vipPortalEnabled: true })
          .where(eq(clients.id, input.clientId));

        // Create auth record
        const passwordHash = await bcrypt.hash(input.initialPassword, 10);
        await db.insert(vipPortalAuth).values({
          clientId: input.clientId,
          email: input.email,
          passwordHash,
        });

        // Create default configuration
        await db.insert(vipPortalConfigurations).values({
          clientId: input.clientId,
          moduleDashboardEnabled: true,
          moduleArEnabled: true,
          moduleApEnabled: true,
          moduleTransactionHistoryEnabled: true,
          moduleVipTierEnabled: true,
          moduleCreditCenterEnabled: true,
          moduleMarketplaceNeedsEnabled: true,
          moduleMarketplaceSupplyEnabled: true,
          featuresConfig: {
            dashboard: {
              showGreeting: true,
              showCurrentBalance: true,
              showYtdSpend: true,
              showQuickLinks: true,
            },
            ar: {
              showSummaryTotals: true,
              showInvoiceDetails: true,
              allowPdfDownloads: true,
              highlightOverdue: true,
            },
            ap: {
              showSummaryTotals: true,
              showBillDetails: true,
              allowPdfDownloads: true,
              highlightOverdue: true,
            },
            transactionHistory: {
              showAllTypes: true,
              allowDateFilter: true,
              allowTypeFilter: true,
              allowStatusFilter: true,
              showDetails: true,
              allowPdfDownloads: true,
            },
            vipTier: {
              showBadge: true,
              showRequirements: true,
              showRewards: true,
              showProgress: true,
              showRecommendations: true,
            },
            creditCenter: {
              showCreditLimit: true,
              showCreditUsage: true,
              showAvailableCredit: true,
              showUtilizationVisual: true,
              showHistory: true,
              showRecommendations: true,
            },
            marketplaceNeeds: {
              allowCreate: true,
              showActiveListings: true,
              allowEdit: true,
              allowCancel: true,
              showTemplates: true,
              requireExpiration: true,
            },
            marketplaceSupply: {
              allowCreate: true,
              showActiveListings: true,
              allowEdit: true,
              allowCancel: true,
              showTemplates: true,
              allowNewStrain: true,
              showTags: true,
            },
          },
          advancedOptions: {
            transactionHistoryLimit: "ALL",
            defaultNeedsExpiration: "5_DAYS",
            defaultSupplyExpiration: "5_DAYS",
            priceInputType: "BOTH",
          },
        });

        return { success: true };
      }),

    // Disable VIP portal for a client
    disableVipPortal: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(clients)
          .set({ vipPortalEnabled: false })
          .where(eq(clients.id, input.clientId));

        return { success: true };
      }),

    // Get last login info for a client
    getLastLogin: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const client = await db.query.clients.findFirst({
          where: eq(clients.id, input.clientId),
        });

        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: eq(vipPortalAuth.clientId, input.clientId),
        });

        return {
          lastLogin: client?.vipPortalLastLogin,
          loginCount: authRecord?.loginCount || 0,
        };
      }),
  }),

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================
  
  config: router({
    // Get configuration for a client
    get: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        if (!config) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "VIP portal configuration not found for this client",
          });
        }

        return config;
      }),

    // Update configuration for a client
    update: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
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
        featuresConfig: z.any().optional(),
        advancedOptions: z.any().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { clientId, ...updateData } = input;

        await db.update(vipPortalConfigurations)
          .set(updateData)
          .where(eq(vipPortalConfigurations.clientId, clientId));

        return { success: true };
      }),

    // Apply a template to a client's configuration
    applyTemplate: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
        template: z.enum(["FULL_ACCESS", "FINANCIAL_ONLY", "MARKETPLACE_ONLY", "BASIC"]),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        let templateConfig: any = {};

        switch (input.template) {
          case "FULL_ACCESS":
            templateConfig = {
              moduleDashboardEnabled: true,
              moduleArEnabled: true,
              moduleApEnabled: true,
              moduleTransactionHistoryEnabled: true,
              moduleVipTierEnabled: true,
              moduleCreditCenterEnabled: true,
              moduleMarketplaceNeedsEnabled: true,
              moduleMarketplaceSupplyEnabled: true,
            };
            break;

          case "FINANCIAL_ONLY":
            templateConfig = {
              moduleDashboardEnabled: true,
              moduleArEnabled: true,
              moduleApEnabled: true,
              moduleTransactionHistoryEnabled: true,
              moduleVipTierEnabled: false,
              moduleCreditCenterEnabled: true,
              moduleMarketplaceNeedsEnabled: false,
              moduleMarketplaceSupplyEnabled: false,
            };
            break;

          case "MARKETPLACE_ONLY":
            templateConfig = {
              moduleDashboardEnabled: true,
              moduleArEnabled: false,
              moduleApEnabled: false,
              moduleTransactionHistoryEnabled: false,
              moduleVipTierEnabled: false,
              moduleCreditCenterEnabled: false,
              moduleMarketplaceNeedsEnabled: true,
              moduleMarketplaceSupplyEnabled: true,
            };
            break;

          case "BASIC":
            templateConfig = {
              moduleDashboardEnabled: true,
              moduleArEnabled: true,
              moduleApEnabled: true,
              moduleTransactionHistoryEnabled: false,
              moduleVipTierEnabled: true,
              moduleCreditCenterEnabled: false,
              moduleMarketplaceNeedsEnabled: false,
              moduleMarketplaceSupplyEnabled: false,
            };
            break;
        }

        await db.update(vipPortalConfigurations)
          .set(templateConfig)
          .where(eq(vipPortalConfigurations.clientId, input.clientId));

        return { success: true };
      }),

    // Copy configuration from one client to another
    copyConfig: requirePermission("vip_portal:manage")
      .input(z.object({
        sourceClientId: z.number(),
        targetClientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const sourceConfig = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.sourceClientId),
        });

        if (!sourceConfig) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Source configuration not found",
          });
        }

        const { id, clientId, createdAt, updatedAt, ...configData } = sourceConfig;

        await db.update(vipPortalConfigurations)
          .set(configData)
          .where(eq(vipPortalConfigurations.clientId, input.targetClientId));

        return { success: true };
      }),
  }),

  // ============================================================================
  // VIP TIER MANAGEMENT
  // ============================================================================
  
  tier: router({
    // Get tier configuration (global settings)
    getConfig: requirePermission("vip_portal:manage")
      .query(async () => {
        // TODO: Implement tier configuration storage
        // For now, return hardcoded tiers
        return {
          tiers: [
            {
              name: "PLATINUM",
              requirements: {
                minYtdSpend: 100000,
                minTransactionCount: 50,
                maxOverdueDays: 0,
              },
              rewards: [
                "Priority support",
                "Exclusive pricing",
                "First access to new products",
              ],
            },
            {
              name: "GOLD",
              requirements: {
                minYtdSpend: 50000,
                minTransactionCount: 25,
                maxOverdueDays: 7,
              },
              rewards: [
                "Enhanced support",
                "Preferred pricing",
                "Early access to new products",
              ],
            },
            {
              name: "SILVER",
              requirements: {
                minYtdSpend: 10000,
                minTransactionCount: 10,
                maxOverdueDays: 30,
              },
              rewards: [
                "Standard support",
                "Standard pricing",
              ],
            },
          ],
        };
      }),

    // Update tier configuration
    updateConfig: requirePermission("vip_portal:manage")
      .input(z.object({
        tiers: z.array(z.any()),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // TODO: Implement tier configuration storage
        return { success: true };
      }),
  }),

  // ============================================================================
  // LEADERBOARD CONFIGURATION
  // ============================================================================
  
  leaderboard: router({
    // Get leaderboard configuration for a client
    getConfig: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        if (!config) {
          return {
            moduleLeaderboardEnabled: false,
            leaderboardMetrics: [],
            leaderboardDisplayMode: 'black_box',
          };
        }

        const featuresConfig = config.featuresConfig as any || {};
        return {
          moduleLeaderboardEnabled: config.moduleLeaderboardEnabled || false,
          leaderboardMetrics: featuresConfig.leaderboardMetrics || [],
          leaderboardDisplayMode: featuresConfig.leaderboardDisplayMode || 'black_box',
        };
      }),

    // Update leaderboard configuration for a client
    updateConfig: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
        moduleLeaderboardEnabled: z.boolean(),
        leaderboardMetrics: z.array(z.string()),
        leaderboardDisplayMode: z.enum(['black_box', 'transparent']),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // Get existing config
        const existingConfig = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        const featuresConfig = (existingConfig?.featuresConfig as any) || {};
        featuresConfig.leaderboardMetrics = input.leaderboardMetrics;
        featuresConfig.leaderboardDisplayMode = input.leaderboardDisplayMode;

        if (existingConfig) {
          // Update existing config
          await db
            .update(vipPortalConfigurations)
            .set({
              moduleLeaderboardEnabled: input.moduleLeaderboardEnabled,
              featuresConfig: featuresConfig,
              updatedAt: new Date(),
            })
            .where(eq(vipPortalConfigurations.clientId, input.clientId));
        } else {
          // Create new config
          await db.insert(vipPortalConfigurations).values({
            clientId: input.clientId,
            moduleLeaderboardEnabled: input.moduleLeaderboardEnabled,
            featuresConfig: featuresConfig,
          });
        }

        return { success: true };
      }),
  }),

  // ============================================================================
  // LIVE CATALOG MANAGEMENT
  // ============================================================================
  
  liveCatalog: router({
    // Save Live Catalog configuration
    saveConfiguration: requirePermission("vip_portal:manage")
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
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Check if client exists
        const client = await db.query.clients.findFirst({
          where: eq(clients.id, input.clientId),
        });
        
        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }
        
        // Check if configuration exists
        const existingConfig = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });
        
        const liveCatalogConfig = {
          visibleCategories: input.visibleCategories,
          visibleSubcategories: input.visibleSubcategories,
          visibleItems: input.visibleItems,
          hiddenItems: input.hiddenItems,
          showQuantity: input.showQuantity,
          showBrand: input.showBrand,
          showGrade: input.showGrade,
          showDate: input.showDate,
          showBasePrice: input.showBasePrice,
          showMarkup: input.showMarkup,
          enablePriceAlerts: input.enablePriceAlerts,
        };
        
        if (existingConfig) {
          // Update existing configuration
          const updatedFeaturesConfig = {
            ...existingConfig.featuresConfig,
            liveCatalog: liveCatalogConfig,
          };
          
          await db
            .update(vipPortalConfigurations)
            .set({
              moduleLiveCatalogEnabled: input.enabled,
              featuresConfig: updatedFeaturesConfig,
              updatedAt: new Date(),
            })
            .where(eq(vipPortalConfigurations.clientId, input.clientId));
        } else {
          // Create new configuration
          await db.insert(vipPortalConfigurations).values({
            clientId: input.clientId,
            moduleLiveCatalogEnabled: input.enabled,
            featuresConfig: {
              liveCatalog: liveCatalogConfig,
            },
          });
        }
        
        return { success: true };
      }),
    
    // Get Live Catalog configuration
    getConfiguration: requirePermission("vip_portal:manage")
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });
        
        return config || null;
      }),
    
    // Interest Lists Management
    interestLists: router({
      // Get interest lists by client
      getByClient: requirePermission("vip_portal:manage")
        .input(z.object({
          clientId: z.number(),
          status: z.enum(['NEW', 'REVIEWED', 'CONVERTED', 'ARCHIVED']).optional(),
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
        }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          // Build where clause
          let whereClause = eq(clientInterestLists.clientId, input.clientId);
          if (input.status) {
            whereClause = and(
              eq(clientInterestLists.clientId, input.clientId),
              eq(clientInterestLists.status, input.status)
            );
          }
          
          const lists = await db.query.clientInterestLists.findMany({
            where: whereClause,
            limit: input.limit,
            offset: input.offset,
            orderBy: (clientInterestLists, { desc }) => [desc(clientInterestLists.submittedAt)],
          });
          
          // Get total count
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(clientInterestLists)
            .where(whereClause);
          
          const total = countResult[0]?.count || 0;
          
          return { lists, total };
        }),
      
      // Get interest list by ID
      getById: requirePermission("vip_portal:manage")
        .input(z.object({
          listId: z.number(),
        }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          const list = await db.query.clientInterestLists.findFirst({
            where: eq(clientInterestLists.id, input.listId),
          });
          
          if (!list) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Interest list not found",
            });
          }
          
          // Get items
          const items = await db.query.clientInterestListItems.findMany({
            where: eq(clientInterestListItems.interestListId, input.listId),
          });
          
          if (items.length === 0) {
            return {
              ...list,
              items: [],
            };
          }
          
          // Get current batch data
          const batchIds = items.map(item => item.batchId);
          const batchesData = await db
            .select({
              batch: batches,
              product: products,
            })
            .from(batches)
            .leftJoin(products, eq(batches.productId, products.id))
            .where(inArray(batches.id, batchIds));
          
          // Get client pricing
          const clientRules = await pricingEngine.getClientPricingRules(list.clientId);
          
          // Calculate current prices
          const inventoryItems = batchesData.map(({ batch, product }) => ({
            id: batch.id,
            name: batch.sku || `Batch #${batch.id}`,
            category: product?.category,
            subcategory: product?.subcategory,
            strain: undefined,
            basePrice: parseFloat(batch.unitCogs || '0'),
            quantity: parseFloat(batch.onHandQty || '0'),
            grade: batch.grade || undefined,
            vendor: undefined,
          }));
          
          let pricedItems;
          try {
            pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);
          } catch (error) {
            pricedItems = inventoryItems.map(item => ({
              ...item,
              retailPrice: item.basePrice,
              priceMarkup: 0,
              appliedRules: [],
            }));
          }
          
          // Add change detection
          const itemsWithChangeDetection = items.map(item => {
            const pricedItem = pricedItems.find(p => p.id === item.batchId);
            const batchData = batchesData.find(b => b.batch.id === item.batchId);
            
            if (!pricedItem || !batchData) {
              return {
                ...item,
                currentPrice: item.priceAtInterest,
                currentQuantity: item.quantityAtInterest,
                currentlyAvailable: false,
                priceChanged: false,
                quantityChanged: false,
              };
            }
            
            const currentPrice = pricedItem.retailPrice;
            const currentQuantity = pricedItem.quantity;
            const snapshotPrice = parseFloat(item.priceAtInterest);
            const snapshotQuantity = parseFloat(item.quantityAtInterest || '0');
            
            const priceChanged = Math.abs(currentPrice - snapshotPrice) > 0.01;
            const quantityChanged = Math.abs(currentQuantity - snapshotQuantity) > 0.01;
            const currentlyAvailable = currentQuantity > 0;
            
            return {
              ...item,
              currentPrice: currentPrice.toFixed(2),
              currentQuantity: currentQuantity.toFixed(2),
              currentlyAvailable,
              priceChanged,
              quantityChanged,
            };
          });
          
          return {
            ...list,
            items: itemsWithChangeDetection,
          };
        }),
      
      // Update interest list status
      updateStatus: requirePermission("vip_portal:manage")
        .input(z.object({
          listId: z.number(),
          status: z.enum(['NEW', 'REVIEWED', 'CONVERTED', 'ARCHIVED']),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          const list = await db.query.clientInterestLists.findFirst({
            where: eq(clientInterestLists.id, input.listId),
          });
          
          if (!list) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Interest list not found",
            });
          }
          
          await db
            .update(clientInterestLists)
            .set({
              status: input.status,
              notes: input.notes,
              reviewedAt: input.status === 'REVIEWED' ? new Date() : list.reviewedAt,
              updatedAt: new Date(),
            })
            .where(eq(clientInterestLists.id, input.listId));
          
          return { success: true };
        }),
      
      // Add to new order
      addToNewOrder: requirePermission("vip_portal:manage")
        .input(z.object({
          listId: z.number(),
          itemIds: z.array(z.number()),
        }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          const list = await db.query.clientInterestLists.findFirst({
            where: eq(clientInterestLists.id, input.listId),
          });
          
          if (!list) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Interest list not found",
            });
          }
          
          // Get interest list items
          const items = await db.query.clientInterestListItems.findMany({
            where: eq(clientInterestListItems.interestListId, input.listId),
          });
          
          // Filter by itemIds
          const filteredItems = items.filter(item => input.itemIds.includes(item.id));
          
          if (filteredItems.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No items to add to order",
            });
          }
          
          // Get batch details for display names
          const batchIds = filteredItems.map(item => item.batchId);
          const batchesData = await db
            .select({
              batch: batches,
              product: products,
            })
            .from(batches)
            .leftJoin(products, eq(batches.productId, products.id))
            .where(inArray(batches.id, batchIds));
          
          // Create map for quick lookup
          const batchMap = new Map(
            batchesData.map(({ batch, product }) => [
              batch.id,
              {
                displayName: product?.name || batch.sku || `Batch #${batch.id}`,
                originalName: batch.sku || `Batch #${batch.id}`,
              },
            ])
          );
          
          // Convert interest list items to order items
          const orderItems = filteredItems.map(item => {
            const batchInfo = batchMap.get(item.batchId);
            return {
              batchId: item.batchId,
              displayName: batchInfo?.displayName || `Batch #${item.batchId}`,
              quantity: item.snapshotQuantity,
              unitPrice: parseFloat(item.snapshotPrice),
              isSample: false,
            };
          });
          
          // Create draft order
          const ordersDb = await import('../ordersDb');
          const order = await ordersDb.createOrder({
            orderType: 'QUOTE',
            isDraft: true,
            clientId: list.clientId,
            items: orderItems,
            notes: `Created from interest list #${list.id}`,
            createdBy: ctx.user?.id || 1,
          });
          
          return {
            success: true,
            orderId: order.id,
            orderNumber: order.orderNumber,
            itemCount: orderItems.length,
          };
        }),
      
      // Add to draft order
      addToDraftOrder: requirePermission("vip_portal:manage")
        .input(z.object({
          listId: z.number(),
          orderId: z.number(),
          itemIds: z.array(z.number()),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          const list = await db.query.clientInterestLists.findFirst({
            where: eq(clientInterestLists.id, input.listId),
          });
          
          if (!list) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Interest list not found",
            });
          }
          
          // Get the existing order
          const ordersDb = await import('../ordersDb');
          const existingOrder = await ordersDb.getOrderById(input.orderId);
          
          if (!existingOrder) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Order not found",
            });
          }
          
          if (!existingOrder.isDraft) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Can only add items to draft orders",
            });
          }
          
          if (existingOrder.clientId !== list.clientId) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Order belongs to a different client",
            });
          }
          
          // Get interest list items
          const items = await db.query.clientInterestListItems.findMany({
            where: eq(clientInterestListItems.interestListId, input.listId),
          });
          
          // Filter by itemIds
          const filteredItems = items.filter(item => input.itemIds.includes(item.id));
          
          if (filteredItems.length === 0) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "No items to add to order",
            });
          }
          
          // Get batch details for display names
          const batchIds = filteredItems.map(item => item.batchId);
          const batchesData = await db
            .select({
              batch: batches,
              product: products,
            })
            .from(batches)
            .leftJoin(products, eq(batches.productId, products.id))
            .where(inArray(batches.id, batchIds));
          
          // Create map for quick lookup
          const batchMap = new Map(
            batchesData.map(({ batch, product }) => [
              batch.id,
              {
                displayName: product?.name || batch.sku || `Batch #${batch.id}`,
                originalName: batch.sku || `Batch #${batch.id}`,
              },
            ])
          );
          
          // Convert interest list items to order items
          const newOrderItems = filteredItems.map(item => {
            const batchInfo = batchMap.get(item.batchId);
            return {
              batchId: item.batchId,
              displayName: batchInfo?.displayName || `Batch #${item.batchId}`,
              quantity: item.snapshotQuantity,
              unitPrice: parseFloat(item.snapshotPrice),
              isSample: false,
            };
          });
          
          // Parse existing order items
          const existingItems = JSON.parse(existingOrder.items as string);
          
          // Combine existing and new items
          const combinedItems = [...existingItems, ...newOrderItems];
          
          // Update the draft order
          const updatedOrder = await ordersDb.updateDraftOrder({
            orderId: input.orderId,
            items: combinedItems,
            notes: existingOrder.notes
              ? `${existingOrder.notes}\n\nAdded ${newOrderItems.length} items from interest list #${list.id}`
              : `Added ${newOrderItems.length} items from interest list #${list.id}`,
          });
          
          return {
            success: true,
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.orderNumber,
            itemsAdded: newOrderItems.length,
            totalItems: combinedItems.length,
          };
        }),
    }),
    
    // Draft Interests (Admin View)
    draftInterests: router({
      getByClient: requirePermission("vip_portal:manage")
        .input(z.object({
          clientId: z.number(),
        }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          const drafts = await db.query.clientDraftInterests.findMany({
            where: eq(clientDraftInterests.clientId, input.clientId),
          });
          
          if (drafts.length === 0) {
            return {
              items: [],
              totalItems: 0,
              totalValue: '0.00',
            };
          }
          
          // Get batch details
          const batchIds = drafts.map(d => d.batchId);
          const batchesData = await db
            .select({
              batch: batches,
              product: products,
            })
            .from(batches)
            .leftJoin(products, eq(batches.productId, products.id))
            .where(inArray(batches.id, batchIds));
          
          // Get client pricing
          const clientRules = await pricingEngine.getClientPricingRules(input.clientId);
          
          // Calculate current prices
          const inventoryItems = batchesData.map(({ batch, product }) => ({
            id: batch.id,
            name: batch.sku || `Batch #${batch.id}`,
            category: product?.category,
            subcategory: product?.subcategory,
            strain: undefined,
            basePrice: parseFloat(batch.unitCogs || '0'),
            quantity: parseFloat(batch.onHandQty || '0'),
            grade: batch.grade || undefined,
            vendor: undefined,
          }));
          
          let pricedItems;
          try {
            pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);
          } catch (error) {
            pricedItems = inventoryItems.map(item => ({
              ...item,
              retailPrice: item.basePrice,
              priceMarkup: 0,
              appliedRules: [],
            }));
          }
          
          // Build items
          const items = drafts.map(draft => {
            const pricedItem = pricedItems.find(p => p.id === draft.batchId);
            const batchData = batchesData.find(b => b.batch.id === draft.batchId);
            
            if (!pricedItem || !batchData) {
              return null;
            }
            
            return {
              id: draft.id,
              batchId: draft.batchId,
              itemName: pricedItem.name,
              category: pricedItem.category,
              subcategory: pricedItem.subcategory,
              retailPrice: pricedItem.retailPrice.toFixed(2),
              quantity: pricedItem.quantity.toFixed(2),
              addedAt: draft.addedAt,
            };
          }).filter(item => item !== null);
          
          const totalValue = items.reduce((sum, item) => sum + parseFloat(item.retailPrice), 0);
          
          return {
            items,
            totalItems: items.length,
            totalValue: totalValue.toFixed(2),
          };
        }),
    }),

    // ============================================================================
    // PRICE ALERTS (ADMIN)
    // ============================================================================

    priceAlerts: router({
      // List price alerts for a client
      list: requirePermission("vip_portal:manage")
        .input(z.object({
          clientId: z.number(),
        }))
        .query(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

          const { getClientPriceAlerts } = await import('../services/priceAlertsService');
          return await getClientPriceAlerts(input.clientId);
        }),

      // Deactivate a price alert
      deactivate: requirePermission("vip_portal:manage")
        .input(z.object({
          alertId: z.number(),
        }))
        .mutation(async ({ input }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

          const { deactivatePriceAlert } = await import('../services/priceAlertsService');
          
          // Get the alert to find the clientId
          const alert = await db.query.clientPriceAlerts.findFirst({
            where: eq(clientPriceAlerts.id, input.alertId),
          });

          if (!alert) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Price alert not found" });
          }

          await deactivatePriceAlert(input.alertId, alert.clientId);

          return { success: true };
        }),
    }),
  }),
});
