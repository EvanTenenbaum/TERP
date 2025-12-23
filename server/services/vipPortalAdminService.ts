/**
 * VIP Portal Admin Service
 * 
 * Extracted business logic from vipPortalAdmin router to improve maintainability
 * and reduce file size. Contains all VIP portal management functions.
 */

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

// ============================================================================
// CLIENT MANAGEMENT SERVICES
// ============================================================================

export interface VipClientListOptions {
  limit?: number;
  offset?: number;
}

export async function getVipClients(options: VipClientListOptions = {}) {
  const { limit = 50, offset = 0 } = options;
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const vipClients = await db.query.clients.findMany({
    where: eq(clients.vipPortalEnabled, true),
    limit,
    offset,
    orderBy: (clients, { desc }) => [desc(clients.vipPortalLastLogin)],
  });

  return { clients: vipClients };
}

export interface EnableVipPortalOptions {
  clientId: number;
  email: string;
  initialPassword: string;
}

export async function enableVipPortal(options: EnableVipPortalOptions) {
  const { clientId, email, initialPassword } = options;
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  // Check if client exists
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
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
    .where(eq(clients.id, clientId));

  // Create auth record
  const passwordHash = await bcrypt.hash(initialPassword, 10);
  await db.insert(vipPortalAuth).values({
    clientId,
    email,
    passwordHash,
  });

  // Create default configuration
  await db.insert(vipPortalConfigurations).values({
    clientId,
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
}

export async function disableVipPortal(clientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  await db.update(clients)
    .set({ vipPortalEnabled: false })
    .where(eq(clients.id, clientId));

  return { success: true };
}

export async function getClientLastLogin(clientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });

  const authRecord = await db.query.vipPortalAuth.findFirst({
    where: eq(vipPortalAuth.clientId, clientId),
  });

  return {
    lastLogin: client?.vipPortalLastLogin,
    loginCount: authRecord?.loginCount || 0,
  };
}

/**
 * Create an impersonation session for an admin to view the portal as a client
 * This creates a temporary session token that allows viewing the portal
 * without affecting the client's actual session or login count
 */
export async function createImpersonationSession(clientId: number, adminUserId?: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  // Verify client exists and has VIP portal enabled
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, clientId),
  });

  if (!client) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Client not found",
    });
  }

  if (!client.vipPortalEnabled) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "VIP Portal is not enabled for this client",
    });
  }

  // Check if auth record exists
  const authRecord = await db.query.vipPortalAuth.findFirst({
    where: eq(vipPortalAuth.clientId, clientId),
  });

  if (!authRecord) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "VIP Portal authentication not configured for this client",
    });
  }

  // Generate impersonation session token (prefixed to identify as impersonation)
  const sessionToken = `imp_${crypto.randomUUID()}`;
  const sessionExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours for impersonation

  // Update auth record with impersonation session
  // Note: This overwrites any existing session, but impersonation sessions are short-lived
  await db.update(vipPortalAuth)
    .set({
      sessionToken,
      sessionExpiresAt,
      // Don't update lastLoginAt or loginCount for impersonation
    })
    .where(eq(vipPortalAuth.id, authRecord.id));

  // Log the impersonation for audit purposes
  console.log(`[VIP Portal] Admin ${adminUserId || 'unknown'} started impersonation session for client ${clientId} (${client.name})`);

  return {
    sessionToken,
    clientId,
    clientName: client.name,
    expiresAt: sessionExpiresAt,
    isImpersonation: true,
  };
}

// ============================================================================
// CONFIGURATION MANAGEMENT SERVICES
// ============================================================================

export async function getVipPortalConfiguration(clientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const config = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, clientId),
  });

  if (!config) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "VIP portal configuration not found for this client",
    });
  }

  return config;
}

export interface UpdateVipPortalConfigOptions {
  clientId: number;
  moduleDashboardEnabled?: boolean;
  moduleArEnabled?: boolean;
  moduleApEnabled?: boolean;
  moduleTransactionHistoryEnabled?: boolean;
  moduleVipTierEnabled?: boolean;
  moduleCreditCenterEnabled?: boolean;
  moduleMarketplaceNeedsEnabled?: boolean;
  moduleMarketplaceSupplyEnabled?: boolean;
  moduleLiveCatalogEnabled?: boolean;
  moduleLeaderboardEnabled?: boolean;
  featuresConfig?: any;
  advancedOptions?: any;
}

export async function updateVipPortalConfiguration(options: UpdateVipPortalConfigOptions) {
  const { clientId, moduleLeaderboardEnabled, ...updateData } = options;
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  // Handle moduleLeaderboardEnabled specially - store in featuresConfig.leaderboard.enabled
  if (moduleLeaderboardEnabled !== undefined) {
    const existingConfig = await db.query.vipPortalConfigurations.findFirst({
      where: eq(vipPortalConfigurations.clientId, clientId),
    });
    const featuresConfig = (existingConfig?.featuresConfig as Record<string, unknown>) || {};
    if (!featuresConfig.leaderboard) {
      featuresConfig.leaderboard = {};
    }
    (featuresConfig.leaderboard as Record<string, unknown>).enabled = moduleLeaderboardEnabled;
    updateData.featuresConfig = featuresConfig;
  }

  await db.update(vipPortalConfigurations)
    .set(updateData)
    .where(eq(vipPortalConfigurations.clientId, clientId));

  return { success: true };
}

export type ConfigTemplate = "FULL_ACCESS" | "FINANCIAL_ONLY" | "MARKETPLACE_ONLY" | "BASIC";

export async function applyConfigurationTemplate(clientId: number, template: ConfigTemplate) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  let templateConfig: any = {};

  switch (template) {
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
    .where(eq(vipPortalConfigurations.clientId, clientId));

  return { success: true };
}

export async function copyConfiguration(sourceClientId: number, targetClientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const sourceConfig = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, sourceClientId),
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
    .where(eq(vipPortalConfigurations.clientId, targetClientId));

  return { success: true };
}

// ============================================================================
// VIP TIER MANAGEMENT SERVICES
// ============================================================================

export async function getVipTierConfiguration() {
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
}

export async function updateVipTierConfiguration(tiers: any[]) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  
  // TODO: Implement tier configuration storage
  return { success: true };
}

// ============================================================================
// LEADERBOARD CONFIGURATION SERVICES
// ============================================================================

export async function getLeaderboardConfiguration(clientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const config = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, clientId),
  });

  // Read leaderboard settings from featuresConfig JSON
  const leaderboardConfig = config?.featuresConfig?.leaderboard;
  
  if (!config) {
    return {
      moduleLeaderboardEnabled: false,
      leaderboardMetrics: [],
      leaderboardDisplayMode: 'black_box',
      leaderboardType: 'ytd_spend',
      minimumClients: 5,
    };
  }

  return {
    moduleLeaderboardEnabled: leaderboardConfig?.enabled ?? false,
    leaderboardMetrics: leaderboardConfig?.metrics ?? [],
    leaderboardDisplayMode: leaderboardConfig?.displayMode ?? 'black_box',
    leaderboardType: leaderboardConfig?.type ?? 'ytd_spend',
    minimumClients: leaderboardConfig?.minimumClients ?? 5,
  };
}

export interface UpdateLeaderboardConfigOptions {
  clientId: number;
  moduleLeaderboardEnabled: boolean;
  leaderboardMetrics: string[];
  leaderboardDisplayMode: 'black_box' | 'transparent';
  leaderboardType?: 'ytd_spend' | 'payment_speed' | 'order_frequency' | 'credit_utilization' | 'ontime_payment_rate';
  minimumClients?: number;
}

export async function updateLeaderboardConfiguration(options: UpdateLeaderboardConfigOptions) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  // Get existing config
  const existingConfig = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, options.clientId),
  });

  // Store all leaderboard settings in featuresConfig.leaderboard JSON
  const featuresConfig = (existingConfig?.featuresConfig as Record<string, unknown>) || {};
  featuresConfig.leaderboard = {
    enabled: options.moduleLeaderboardEnabled,
    metrics: options.leaderboardMetrics,
    displayMode: options.leaderboardDisplayMode,
    type: options.leaderboardType ?? 'ytd_spend',
    minimumClients: options.minimumClients ?? 5,
    showSuggestions: true,
    showRankings: true,
  };

  if (existingConfig) {
    // Update existing config
    await db
      .update(vipPortalConfigurations)
      .set({
        featuresConfig: featuresConfig,
        updatedAt: new Date(),
      })
      .where(eq(vipPortalConfigurations.clientId, options.clientId));
  } else {
    // Create new config
    await db.insert(vipPortalConfigurations).values({
      clientId: options.clientId,
      featuresConfig: featuresConfig,
    });
  }

  return { success: true };
}

// ============================================================================
// LIVE CATALOG MANAGEMENT SERVICES
// ============================================================================

export interface SaveLiveCatalogConfigOptions {
  clientId: number;
  enabled: boolean;
  visibleCategories?: number[];
  visibleSubcategories?: number[];
  visibleItems?: number[];
  hiddenItems?: number[];
  showQuantity?: boolean;
  showBrand?: boolean;
  showGrade?: boolean;
  showDate?: boolean;
  showBasePrice?: boolean;
  showMarkup?: boolean;
  enablePriceAlerts?: boolean;
}

export async function saveLiveCatalogConfiguration(options: SaveLiveCatalogConfigOptions) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  
  // Check if client exists
  const client = await db.query.clients.findFirst({
    where: eq(clients.id, options.clientId),
  });
  
  if (!client) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Client not found",
    });
  }
  
  // Check if configuration exists
  const existingConfig = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, options.clientId),
  });
  
  const liveCatalogConfig = {
    visibleCategories: options.visibleCategories,
    visibleSubcategories: options.visibleSubcategories,
    visibleItems: options.visibleItems,
    hiddenItems: options.hiddenItems,
    showQuantity: options.showQuantity,
    showBrand: options.showBrand,
    showGrade: options.showGrade,
    showDate: options.showDate,
    showBasePrice: options.showBasePrice,
    showMarkup: options.showMarkup,
    enablePriceAlerts: options.enablePriceAlerts,
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
        moduleLiveCatalogEnabled: options.enabled,
        featuresConfig: updatedFeaturesConfig,
        updatedAt: new Date(),
      })
      .where(eq(vipPortalConfigurations.clientId, options.clientId));
  } else {
    // Create new configuration
    await db.insert(vipPortalConfigurations).values({
      clientId: options.clientId,
      moduleLiveCatalogEnabled: options.enabled,
      featuresConfig: {
        liveCatalog: liveCatalogConfig,
      } as typeof vipPortalConfigurations.$inferInsert.featuresConfig
    });
  }
  
  return { success: true };
}

export async function getLiveCatalogConfiguration(clientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  
  const config = await db.query.vipPortalConfigurations.findFirst({
    where: eq(vipPortalConfigurations.clientId, clientId),
  });
  
  return config || null;
}

// ============================================================================
// INTEREST LISTS MANAGEMENT SERVICES
// ============================================================================

export interface GetInterestListsByClientOptions {
  clientId: number;
  status?: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'ARCHIVED';
  limit?: number;
  offset?: number;
}

export async function getInterestListsByClient(options: GetInterestListsByClientOptions) {
  const { clientId, status, limit = 50, offset = 0 } = options;
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  
  // Build where clause
  let whereClause = eq(clientInterestLists.clientId, clientId);
  if (status) {
    whereClause = and(
      eq(clientInterestLists.clientId, clientId),
      eq(clientInterestLists.status, status)
    )!;
  }
  
  const lists = await db.query.clientInterestLists.findMany({
    where: whereClause,
    limit,
    offset,
    orderBy: (clientInterestLists, { desc }) => [desc(clientInterestLists.submittedAt)],
  });
  
  // Get total count
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(clientInterestLists)
    .where(whereClause);
  
  const total = countResult[0]?.count || 0;
  
  return { lists, total };
}

export async function getInterestListById(listId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  
  const list = await db.query.clientInterestLists.findFirst({
    where: eq(clientInterestLists.id, listId),
  });
  
  if (!list) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Interest list not found",
    });
  }
  
  // Get items
  const items = await db.query.clientInterestListItems.findMany({
    where: eq(clientInterestListItems.interestListId, listId),
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
    subcategory: product?.subcategory || undefined,
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
    const currentQuantity = pricedItem.quantity ?? 0;
    const snapshotPrice = parseFloat(item.priceAtInterest || '0');
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
}

export interface UpdateInterestListStatusOptions {
  listId: number;
  status: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'ARCHIVED';
  notes?: string;
}

export async function updateInterestListStatus(options: UpdateInterestListStatusOptions) {
  const { listId, status, notes } = options;
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  
  const list = await db.query.clientInterestLists.findFirst({
    where: eq(clientInterestLists.id, listId),
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
      status,
      notes,
      reviewedAt: status === 'REVIEWED' ? new Date() : list.reviewedAt,
      updatedAt: new Date(),
    })
    .where(eq(clientInterestLists.id, listId));
  
  return { success: true };
}

// ============================================================================
// DRAFT INTERESTS MANAGEMENT SERVICES
// ============================================================================

export async function getDraftInterestsByClient(clientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
  
  const drafts = await db.query.clientDraftInterests.findMany({
    where: eq(clientDraftInterests.clientId, clientId),
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
  const clientRules = await pricingEngine.getClientPricingRules(clientId);
  
  // Calculate current prices
  const inventoryItems = batchesData.map(({ batch, product }) => ({
    id: batch.id,
    name: batch.sku || `Batch #${batch.id}`,
    category: product?.category,
    subcategory: product?.subcategory || undefined,
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
      quantity: (pricedItem.quantity ?? 0).toFixed(2),
      addedAt: draft.addedAt,
    };
  }).filter(item => item !== null);
  
  const totalValue = items.reduce((sum, item) => sum + parseFloat(item.retailPrice), 0);
  
  return {
    items,
    totalItems: items.length,
    totalValue: totalValue.toFixed(2),
  };
}

// ============================================================================
// PRICE ALERTS MANAGEMENT SERVICES
// ============================================================================

export async function getClientPriceAlerts(clientId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const { getClientPriceAlerts } = await import('./priceAlertsService');
  return await getClientPriceAlerts(clientId);
}

export async function deactivateClientPriceAlert(alertId: number) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

  const { deactivatePriceAlert } = await import('./priceAlertsService');
  
  // Get the alert to find the clientId
  const alert = await db.query.clientPriceAlerts.findFirst({
    where: eq(clientPriceAlerts.id, alertId),
  });

  if (!alert) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Price alert not found" });
  }

  await deactivatePriceAlert(alertId, alert.clientId);

  return { success: true };
}