import { z } from "zod";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { handleError, ErrorCatalog } from "../_core/errors";
import { inventoryLogger } from "../_core/logger";
import {
  intakeSchema,
  batchUpdateSchema,
  listQuerySchema,
  validators,
} from "../_core/validation";
import * as inventoryDb from "../inventoryDb";
import * as inventoryUtils from "../inventoryUtils";
import type { BatchStatus } from "../inventoryUtils";
import { requirePermission } from "../_core/permissionMiddleware";
import { storagePut, storageDelete } from "../storage";
import { createSafeUnifiedResponse } from "../_core/pagination";
import { getDb } from "../db";

// =============================================================================
// SPRINT 4 TRACK A - Enhanced Inventory APIs
// =============================================================================

/**
 * Stock level status calculation
 * @param onHand - Current on-hand quantity
 * @param reserved - Reserved quantity
 * @param lowThreshold - Low stock threshold (default 50)
 * @param criticalThreshold - Critical stock threshold (default 10)
 */
function calculateStockStatus(
  onHand: number,
  reserved: number,
  lowThreshold = 50,
  criticalThreshold = 10
): "CRITICAL" | "LOW" | "OPTIMAL" | "OUT_OF_STOCK" {
  const available = onHand - reserved;
  if (available <= 0) return "OUT_OF_STOCK";
  if (available <= criticalThreshold) return "CRITICAL";
  if (available <= lowThreshold) return "LOW";
  return "OPTIMAL";
}

/**
 * Calculate days since a date (for aging)
 * Returns 0 for future dates (not yet received)
 */
function calculateAgeDays(date: Date | string | null): number {
  if (!date) return 0;
  const receivedDate = new Date(date);
  if (isNaN(receivedDate.getTime())) return 0; // Invalid date
  const now = new Date();
  const diffTime = now.getTime() - receivedDate.getTime();
  if (diffTime < 0) return 0; // Future date - not yet received
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

/**
 * Get age bracket for inventory aging
 */
function getAgeBracket(
  ageDays: number
): "FRESH" | "MODERATE" | "AGING" | "CRITICAL" {
  if (ageDays <= 7) return "FRESH";
  if (ageDays <= 14) return "MODERATE";
  if (ageDays <= 30) return "AGING";
  return "CRITICAL";
}

const enhancedInventoryInputSchema = z
  .object({
    // Pagination
    page: z.number().min(1).default(1),
    pageSize: z.number().min(1).max(100).default(50),
    cursor: z.number().optional(),

    // Sorting
    sortBy: z
      .enum([
        "sku",
        "productName",
        "vendor",
        "brand",
        "status",
        "onHand",
        "available",
        "age",
        "receivedDate",
        "lastMovement",
        "stockStatus",
      ])
      .default("sku"),
    sortOrder: z.enum(["asc", "desc"]).default("desc"),

    // Filtering
    search: z.string().optional(),
    status: z.array(z.string()).optional(),
    category: z.string().optional(),
    subcategory: z.string().optional(),
    vendor: z.array(z.string()).optional(),
    brand: z.array(z.string()).optional(),
    grade: z.array(z.string()).optional(),
    stockStatus: z
      .enum(["ALL", "CRITICAL", "LOW", "OPTIMAL", "OUT_OF_STOCK"])
      .optional(),
    ageBracket: z
      .enum(["ALL", "FRESH", "MODERATE", "AGING", "CRITICAL"])
      .optional(),
    minAge: z.number().optional(),
    maxAge: z.number().optional(),
    batchId: z.string().optional(),

    // Stock thresholds
    lowStockThreshold: z.number().default(50),
    criticalStockThreshold: z.number().default(10),

    // Include options
    includeMovementHistory: z.boolean().default(false),
    movementHistoryLimit: z.number().default(10),
  })
  .default({
    page: 1,
    pageSize: 50,
    sortBy: "sku",
    sortOrder: "desc",
    lowStockThreshold: 50,
    criticalStockThreshold: 10,
    includeMovementHistory: false,
    movementHistoryLimit: 10,
  });

export const inventoryRouter = router({
  // ==========================================================================
  // 4.A.1: FEAT-001-BE - Enhanced Inventory Data API
  // ==========================================================================

  /**
   * Enhanced getInventory with pagination, sorting, filtering
   * Includes aging calculation, stock level thresholds, batch info, and movement history
   */
  getEnhanced: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(enhancedInventoryInputSchema)
    .query(async ({ input }) => {
      try {
        inventoryLogger.operationStart("getEnhanced", { input });

        // Get base inventory data
        // INV-FILTER-002: Pass all filters to database layer
        const result = await inventoryDb.getBatchesWithDetails(
          input.pageSize + 1, // Fetch one extra to check for more pages
          input.cursor,
          {
            status: input.status, // Array or undefined
            category: input.category,
            subcategory: input.subcategory,
            vendor: input.vendor, // Array of vendor names
            brand: input.brand, // Array of brand names
            grade: input.grade, // Array of grade values
          }
        );

        // Get movement data if requested
        const { inventoryMovements } = await import("../../drizzle/schema");
        const { getDb } = await import("../db");
        const { desc, eq } = await import("drizzle-orm");
        const db = await getDb();

        // Process and enhance each item
        const enhancedItems = await Promise.all(
          result.items.slice(0, input.pageSize).map(async item => {
            const batch = item.batch;
            if (!batch) return null;

            const onHand = parseFloat(batch.onHandQty || "0");
            const reserved = parseFloat(batch.reservedQty || "0");
            const quarantine = parseFloat(batch.quarantineQty || "0");
            const hold = parseFloat(batch.holdQty || "0");
            const available = Math.max(
              0,
              onHand - reserved - quarantine - hold
            );

            // Calculate aging from createdAt (intake date)
            const receivedDate = batch.createdAt;
            const ageDays = calculateAgeDays(receivedDate);
            const ageBracket = getAgeBracket(ageDays);

            // Calculate stock status
            const stockStatus = calculateStockStatus(
              onHand,
              reserved + quarantine + hold,
              input.lowStockThreshold,
              input.criticalStockThreshold
            );

            // Get last movement date
            let lastMovementDate: Date | null = null;
            let movementHistory: Array<{
              id: number;
              type: string;
              quantityChange: string;
              timestamp: Date;
              performedBy: number;
              notes: string | null;
            }> = [];

            if (db) {
              // Get last movement
              const [lastMovement] = await db
                .select()
                .from(inventoryMovements)
                .where(eq(inventoryMovements.batchId, batch.id))
                .orderBy(desc(inventoryMovements.createdAt))
                .limit(1);

              lastMovementDate = lastMovement?.createdAt || null;

              // Get movement history if requested
              if (input.includeMovementHistory) {
                const movements = await db
                  .select()
                  .from(inventoryMovements)
                  .where(eq(inventoryMovements.batchId, batch.id))
                  .orderBy(desc(inventoryMovements.createdAt))
                  .limit(input.movementHistoryLimit);

                movementHistory = movements.map(m => ({
                  id: m.id,
                  type: m.inventoryMovementType,
                  quantityChange: m.quantityChange,
                  timestamp: m.createdAt,
                  performedBy: m.performedBy,
                  notes: m.notes,
                }));
              }
            }

            // Parse batch code for batch tracking info
            const batchInfo = {
              batchId: batch.code,
              lotId: item.lot?.code || null,
              receivedDate,
              intakeDate: batch.createdAt,
            };

            return {
              // Base batch data
              id: batch.id,
              sku: batch.sku,
              code: batch.code,
              status: batch.batchStatus,
              grade: batch.grade,

              // Product info
              productName: item.product?.nameCanonical || "Unknown",
              category: item.product?.category || null,
              subcategory: item.product?.subcategory || null,

              // Relationships
              // BUG-122: Use supplierClient (canonical supplier data from clients table)
              vendorName: item.supplierClient?.name || null,
              brandName: item.brand?.name || null,

              // Quantities
              onHandQty: onHand,
              reservedQty: reserved,
              quarantineQty: quarantine,
              holdQty: hold,
              availableQty: available,

              // Costing
              unitCogs: batch.unitCogs ? parseFloat(batch.unitCogs) : null,
              totalValue: batch.unitCogs
                ? onHand * parseFloat(batch.unitCogs)
                : null,

              // Aging (4.A.1)
              receivedDate: receivedDate,
              ageDays,
              ageBracket,

              // Stock status (4.A.1)
              stockStatus,
              stockThresholds: {
                low: input.lowStockThreshold,
                critical: input.criticalStockThreshold,
              },

              // Batch tracking (4.A.6)
              batchInfo,

              // Movement history (4.A.8)
              lastMovementDate,
              movementHistory: input.includeMovementHistory
                ? movementHistory
                : undefined,
            };
          })
        );

        // Filter out nulls and apply additional filters
        let filteredItems = enhancedItems.filter(Boolean) as NonNullable<
          (typeof enhancedItems)[0]
        >[];

        // Apply search filter
        if (input.search) {
          const searchLower = input.search.toLowerCase();
          filteredItems = filteredItems.filter(
            item =>
              item.sku.toLowerCase().includes(searchLower) ||
              item.productName.toLowerCase().includes(searchLower) ||
              item.code.toLowerCase().includes(searchLower) ||
              (item.vendorName &&
                item.vendorName.toLowerCase().includes(searchLower)) ||
              (item.brandName &&
                item.brandName.toLowerCase().includes(searchLower))
          );
        }

        // INV-FILTER-003: Removed redundant status filter (now handled by DB in getBatchesWithDetails)
        // INV-FILTER-003: Removed redundant category filter (now handled by DB in getBatchesWithDetails)

        // Apply stock status filter
        if (input.stockStatus && input.stockStatus !== "ALL") {
          filteredItems = filteredItems.filter(
            item => item.stockStatus === input.stockStatus
          );
        }

        // Apply age bracket filter
        if (input.ageBracket && input.ageBracket !== "ALL") {
          filteredItems = filteredItems.filter(
            item => item.ageBracket === input.ageBracket
          );
        }

        // Apply age range filter
        if (input.minAge !== undefined) {
          const minAge = input.minAge;
          filteredItems = filteredItems.filter(item => item.ageDays >= minAge);
        }
        if (input.maxAge !== undefined) {
          const maxAge = input.maxAge;
          filteredItems = filteredItems.filter(item => item.ageDays <= maxAge);
        }

        // Apply batch ID filter
        if (input.batchId) {
          const batchIdFilter = input.batchId.toLowerCase();
          filteredItems = filteredItems.filter(item =>
            item.code.toLowerCase().includes(batchIdFilter)
          );
        }

        // Apply sorting
        filteredItems.sort((a, b) => {
          let comparison = 0;
          switch (input.sortBy) {
            case "sku":
              comparison = a.sku.localeCompare(b.sku);
              break;
            case "productName":
              comparison = a.productName.localeCompare(b.productName);
              break;
            case "vendor":
              comparison = (a.vendorName || "").localeCompare(
                b.vendorName || ""
              );
              break;
            case "brand":
              comparison = (a.brandName || "").localeCompare(b.brandName || "");
              break;
            case "status":
              comparison = a.status.localeCompare(b.status);
              break;
            case "onHand":
              comparison = a.onHandQty - b.onHandQty;
              break;
            case "available":
              comparison = a.availableQty - b.availableQty;
              break;
            case "age":
              comparison = a.ageDays - b.ageDays;
              break;
            case "receivedDate": {
              const aDate = a.receivedDate
                ? new Date(a.receivedDate).getTime()
                : 0;
              const bDate = b.receivedDate
                ? new Date(b.receivedDate).getTime()
                : 0;
              comparison =
                (isNaN(aDate) ? 0 : aDate) - (isNaN(bDate) ? 0 : bDate);
              break;
            }
            case "lastMovement": {
              const aTime = a.lastMovementDate
                ? new Date(a.lastMovementDate).getTime()
                : 0;
              const bTime = b.lastMovementDate
                ? new Date(b.lastMovementDate).getTime()
                : 0;
              comparison = aTime - bTime;
              break;
            }
            case "stockStatus": {
              const statusOrder: Record<string, number> = {
                CRITICAL: 0,
                LOW: 1,
                OPTIMAL: 2,
                OUT_OF_STOCK: 3,
              };
              comparison =
                statusOrder[a.stockStatus] - statusOrder[b.stockStatus];
              break;
            }
          }
          return input.sortOrder === "desc" ? -comparison : comparison;
        });

        // Determine if there are more pages
        const hasMore = result.items.length > input.pageSize;
        const nextCursor =
          hasMore && filteredItems.length > 0
            ? filteredItems[filteredItems.length - 1].id
            : null;

        // Calculate summary stats
        const summaryStats = {
          totalItems: filteredItems.length,
          totalOnHand: filteredItems.reduce(
            (sum, item) => sum + item.onHandQty,
            0
          ),
          totalAvailable: filteredItems.reduce(
            (sum, item) => sum + item.availableQty,
            0
          ),
          totalValue: filteredItems.reduce(
            (sum, item) => sum + (item.totalValue || 0),
            0
          ),
          byStockStatus: {
            critical: filteredItems.filter(i => i.stockStatus === "CRITICAL")
              .length,
            low: filteredItems.filter(i => i.stockStatus === "LOW").length,
            optimal: filteredItems.filter(i => i.stockStatus === "OPTIMAL")
              .length,
            outOfStock: filteredItems.filter(
              i => i.stockStatus === "OUT_OF_STOCK"
            ).length,
          },
          byAgeBracket: {
            fresh: filteredItems.filter(i => i.ageBracket === "FRESH").length,
            moderate: filteredItems.filter(i => i.ageBracket === "MODERATE")
              .length,
            aging: filteredItems.filter(i => i.ageBracket === "AGING").length,
            critical: filteredItems.filter(i => i.ageBracket === "CRITICAL")
              .length,
          },
        };

        inventoryLogger.operationSuccess("getEnhanced", {
          itemCount: filteredItems.length,
          hasMore,
        });

        return {
          items: filteredItems,
          pagination: {
            page: input.page,
            pageSize: input.pageSize,
            hasMore,
            nextCursor,
          },
          summary: summaryStats,
        };
      } catch (error) {
        inventoryLogger.operationFailure("getEnhanced", error as Error, {
          input,
        });
        handleError(error, "inventory.getEnhanced");
        throw error;
      }
    }),

  /**
   * Get aging inventory summary for dashboard widget
   * 4.A.4: MEET-025 - Dashboard Aging Quick View
   *
   * INV-CONSISTENCY-001: Updated to only show aging for sellable inventory
   * (LIVE and PHOTOGRAPHY_COMPLETE statuses). Previously showed all batches
   * which caused confusion with dashboard totals.
   */
  getAgingSummary: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      try {
        // INV-CONSISTENCY-001: Only fetch sellable inventory for aging analysis
        // This ensures aging widget matches the inventory values in dashboard
        const result = await inventoryDb.getBatchesWithDetails(
          1000,
          undefined,
          {
            // Note: getBatchesWithDetails doesn't support array status filter,
            // so we filter client-side for sellable statuses
          }
        );

        // INV-CONSISTENCY-001: Filter to only sellable statuses (LIVE, PHOTOGRAPHY_COMPLETE)
        const sellableStatuses = inventoryDb.SELLABLE_BATCH_STATUSES;

        const items = result.items
          .filter(item => {
            if (!item.batch) return false;
            const onHand = parseFloat(item.batch.onHandQty || "0");
            // Only include sellable inventory with quantity > 0
            const isSellable = sellableStatuses.includes(
              item.batch.batchStatus as (typeof sellableStatuses)[number]
            );
            return isSellable && onHand > 0;
          })
          .map(item => {
            // batch is guaranteed to exist due to the filter above
            const batch = item.batch as NonNullable<typeof item.batch>;
            const ageDays = calculateAgeDays(batch.createdAt);
            const onHand = parseFloat(batch.onHandQty || "0");
            const unitCogs = batch.unitCogs ? parseFloat(batch.unitCogs) : 0;

            return {
              id: batch.id,
              sku: batch.sku,
              productName: item.product?.nameCanonical || "Unknown",
              ageDays,
              ageBracket: getAgeBracket(ageDays),
              onHandQty: onHand,
              value: onHand * unitCogs,
            };
          });

        // Calculate summary by age bracket
        const fresh = items.filter(i => i.ageBracket === "FRESH");
        const moderate = items.filter(i => i.ageBracket === "MODERATE");
        const aging = items.filter(i => i.ageBracket === "AGING");
        const critical = items.filter(i => i.ageBracket === "CRITICAL");

        // Items >14 days (aging inventory)
        const agingItems = items.filter(i => i.ageDays > 14);

        return {
          summary: {
            fresh: {
              count: fresh.length,
              totalUnits: fresh.reduce((s, i) => s + i.onHandQty, 0),
              totalValue: fresh.reduce((s, i) => s + i.value, 0),
            },
            moderate: {
              count: moderate.length,
              totalUnits: moderate.reduce((s, i) => s + i.onHandQty, 0),
              totalValue: moderate.reduce((s, i) => s + i.value, 0),
            },
            aging: {
              count: aging.length,
              totalUnits: aging.reduce((s, i) => s + i.onHandQty, 0),
              totalValue: aging.reduce((s, i) => s + i.value, 0),
            },
            critical: {
              count: critical.length,
              totalUnits: critical.reduce((s, i) => s + i.onHandQty, 0),
              totalValue: critical.reduce((s, i) => s + i.value, 0),
            },
          },
          // Quick stats for widget
          agingItemsCount: agingItems.length,
          agingItemsValue: agingItems.reduce((s, i) => s + i.value, 0),
          oldestItem:
            items.length > 0
              ? items.reduce((oldest, item) =>
                  item.ageDays > oldest.ageDays ? item : oldest
                )
              : null,
          // Top 5 aging items for quick view
          topAgingItems: items
            .sort((a, b) => b.ageDays - a.ageDays)
            .slice(0, 5)
            .map(i => ({
              id: i.id,
              sku: i.sku,
              productName: i.productName,
              ageDays: i.ageDays,
              onHandQty: i.onHandQty,
              value: i.value,
            })),
        };
      } catch (error) {
        handleError(error, "inventory.getAgingSummary");
        throw error;
      }
    }),

  // Upload media file for batch/purchase
  // BUG-004: File upload endpoint for media files
  uploadMedia: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        fileData: z.string(), // Base64 encoded file
        fileName: z.string(),
        fileType: z.string(), // MIME type
        batchId: z.number().optional(), // Optional: link to existing batch
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      try {
        // Check if storage is configured
        const { isStorageConfigured } = await import("../storage");
        if (!isStorageConfigured()) {
          throw ErrorCatalog.STORAGE_NOT_CONFIGURED;
        }

        // Decode base64 file
        const fileBuffer = Buffer.from(input.fileData, "base64");

        // Generate storage key
        const timestamp = Date.now();
        const sanitizedFileName = input.fileName.replace(
          /[^a-zA-Z0-9.-]/g,
          "_"
        );
        const storageKey = `batch-media/${input.batchId || "temp"}/${timestamp}-${sanitizedFileName}`;

        // Upload to storage
        const { url } = await storagePut(
          storageKey,
          fileBuffer,
          input.fileType
        );

        return {
          success: true,
          url,
          fileName: input.fileName,
          fileType: input.fileType,
          fileSize: fileBuffer.length,
        };
      } catch (error) {
        inventoryLogger.operationFailure("uploadMedia", error as Error, {
          fileName: input.fileName,
        });
        handleError(error, "inventory.uploadMedia");
        throw error;
      }
    }),

  // Delete media file from storage
  // BUG-071: Rollback support for orphaned media files
  deleteMedia: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        url: z.string(), // The URL of the media file to delete
      })
    )
    .mutation(async ({ input, ctx: _ctx }) => {
      try {
        // Check if storage is configured
        const { isStorageConfigured } = await import("../storage");
        if (!isStorageConfigured()) {
          throw ErrorCatalog.STORAGE_NOT_CONFIGURED;
        }

        // Extract the storage key from the URL
        // URL format: https://.../batch-media/.../filename.ext
        const urlPath = new URL(input.url).pathname;
        const storageKey = urlPath.split("/").slice(-3).join("/"); // Get last 3 parts: batch-media/folder/file

        // Delete from storage
        await storageDelete(storageKey);

        return {
          success: true,
          url: input.url,
        };
      } catch (error) {
        inventoryLogger.operationFailure("deleteMedia", error as Error, {
          url: input.url,
        });
        handleError(error, "inventory.deleteMedia");
        throw error;
      }
    }),

  // Get all batches with details
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // ✅ ENHANCED: TERP-INIT-005 Phase 4 - Cursor-based pagination
  list: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(listQuerySchema.default({ limit: 100, offset: 0 }))
    .query(async ({ input }) => {
      try {
        inventoryLogger.operationStart("list", {
          cursor: input.cursor,
          limit: input.limit,
        });

        let result;
        if (input.query) {
          result = await inventoryDb.searchBatches(
            input.query,
            input.limit,
            input.cursor
          );
        } else {
          result = await inventoryDb.getBatchesWithDetails(
            input.limit,
            input.cursor,
            { status: input.status, category: input.category }
          );
        }

        inventoryLogger.operationSuccess("list", {
          itemCount: result.items.length,
          hasMore: result.hasMore,
          nextCursor: result.nextCursor,
        });

        return result;
      } catch (error) {
        inventoryLogger.operationFailure("list", error as Error, {
          cursor: input.cursor,
        });
        handleError(error, "inventory.list");
        throw error;
      }
    }),

  // Get dashboard statistics
  dashboardStats: protectedProcedure
    .use(requirePermission("inventory:read"))
    .query(async () => {
      try {
        const stats = await inventoryDb.getDashboardStats();
        // If stats is null (e.g., DB connection issue), return a default empty object
        // instead of throwing a hard error, which prevents the dashboard from crashing.
        if (!stats) {
          return {
            totalInventoryValue: 0,
            avgValuePerUnit: 0,
            totalUnits: 0,
            statusCounts: {
              AWAITING_INTAKE: 0,
              LIVE: 0,
              ON_HOLD: 0,
              QUARANTINED: 0,
              SOLD_OUT: 0,
              CLOSED: 0,
            },
            categoryStats: [],
            subcategoryStats: [],
          };
        }
        return stats;
      } catch (error) {
        handleError(error, "inventory.dashboardStats");
        throw error;
      }
    }),

  // Get single batch by ID
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // ✅ BUG-041 FIX: Always return arrays for locations and auditLogs (never undefined)
  getById: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(validators.positiveInt)
    .query(async ({ input }) => {
      try {
        const batch = await inventoryDb.getBatchById(input);
        if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input);

        // BUG-041 FIX: Ensure locations is always an array
        const locationsResult = await inventoryDb.getBatchLocations(input);
        const locations = Array.isArray(locationsResult) ? locationsResult : [];

        // BUG-041 FIX: Ensure auditLogs is always an array
        const auditLogsResult = await inventoryDb.getAuditLogsForEntity(
          "Batch",
          input
        );
        const auditLogs = Array.isArray(auditLogsResult) ? auditLogsResult : [];

        // Log for debugging if we had to default to empty arrays
        if (!Array.isArray(locationsResult)) {
          inventoryLogger.warn({
            msg: "[BUG-041] getBatchLocations returned non-array, defaulting to empty",
            batchId: input,
            returnedType: typeof locationsResult,
          });
        }
        if (!Array.isArray(auditLogsResult)) {
          inventoryLogger.warn({
            msg: "[BUG-041] getAuditLogsForEntity returned non-array, defaulting to empty",
            batchId: input,
            returnedType: typeof auditLogsResult,
          });
        }

        return {
          batch,
          locations,
          auditLogs,
          availableQty: inventoryUtils.calculateAvailableQty(batch),
        };
      } catch (error) {
        handleError(error, "inventory.getById");
        throw error;
      }
    }),

  // WSQA-002: Get available batches for a product (lot selection)
  getAvailableForProduct: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        productId: z.number(),
        minQuantity: z.number().optional().default(1),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const { batches } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // Get batches for product with LIVE status
        const productBatches = await db
          .select({
            id: batches.id,
            sku: batches.sku,
            code: batches.code,
            onHandQty: batches.onHandQty,
            reservedQty: batches.reservedQty,
            quarantineQty: batches.quarantineQty,
            holdQty: batches.holdQty,
            unitCogs: batches.unitCogs,
            grade: batches.grade,
            batchStatus: batches.batchStatus,
            createdAt: batches.createdAt,
            lotId: batches.lotId,
            metadata: batches.metadata,
          })
          .from(batches)
          .where(
            and(
              eq(batches.productId, input.productId),
              eq(batches.batchStatus, "LIVE")
            )
          )
          .orderBy(batches.createdAt);

        // Calculate available quantity and filter
        type BatchRow = (typeof productBatches)[number];
        const availableBatches = productBatches
          .map((batch: BatchRow) => {
            const onHand = parseFloat(String(batch.onHandQty || "0"));
            const reserved = parseFloat(String(batch.reservedQty || "0"));
            const quarantine = parseFloat(String(batch.quarantineQty || "0"));
            const hold = parseFloat(String(batch.holdQty || "0"));
            const availableQty = Math.max(
              0,
              onHand - reserved - quarantine - hold
            );

            let harvestDate: string | null = null;
            let expiryDate: string | null = null;
            if (batch.metadata) {
              try {
                const meta =
                  typeof batch.metadata === "string"
                    ? JSON.parse(batch.metadata)
                    : batch.metadata;
                harvestDate = meta.harvestDate || meta.harvest_date || null;
                expiryDate = meta.expiryDate || meta.expiry_date || null;
              } catch {
                // Ignore parse errors
              }
            }

            return {
              id: batch.id,
              sku: batch.sku,
              code: batch.code,
              availableQty,
              unitCogs: batch.unitCogs
                ? parseFloat(String(batch.unitCogs))
                : null,
              grade: batch.grade,
              harvestDate,
              expiryDate,
              lotId: batch.lotId,
            };
          })
          .filter(
            (batch: { availableQty: number }) =>
              batch.availableQty >= input.minQuantity
          );

        return availableBatches;
      } catch (error) {
        handleError(error, "inventory.getAvailableForProduct");
        throw error;
      }
    }),

  // Create new batch (intake)
  // ✅ FIXED: Uses transactional service (TERP-INIT-005 Phase 1)
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // SECURITY FIX: Changed from inventory:read to inventory:create
  intake: protectedProcedure
    .use(requirePermission("inventory:create"))
    .input(intakeSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        inventoryLogger.operationStart("intake", {
          vendorName: input.vendorName,
          brandName: input.brandName,
          productName: input.productName,
          quantity: input.quantity,
        });

        const { processIntake } = await import("../inventoryIntakeService");

        const result = await processIntake({
          ...input,
          userId: getAuthenticatedUserId(ctx),
        });

        inventoryLogger.operationSuccess("intake", {
          batchId: result.batch.id,
          batchCode: result.batch.code,
        });

        return { success: true, batch: result.batch };
      } catch (error) {
        inventoryLogger.operationFailure("intake", error as Error, { input });
        handleError(error, "inventory.intake");
        throw error;
      }
    }),

  // Update batch status
  // ✅ ENHANCED: TERP-INIT-005 Phase 2 - Comprehensive validation
  // ST-026: Added version checking for concurrent edit detection
  updateStatus: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      batchUpdateSchema.extend({
        version: z.number().optional(), // ST-026: Optional for backward compatibility
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.id);

      // ST-026: Check version if provided
      if (input.version !== undefined) {
        const { checkVersion } = await import("../_core/optimisticLocking");
        const { batches } = await import("../../drizzle/schema");
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await checkVersion(db, batches, "Batch", input.id, input.version);
      }

      // Validate transition
      if (
        !inventoryUtils.isValidStatusTransition(
          batch.batchStatus as BatchStatus,
          input.status as BatchStatus
        )
      ) {
        throw ErrorCatalog.INVENTORY.INVALID_STATUS_TRANSITION(
          batch.batchStatus as string,
          input.status
        );
      }

      const before = inventoryUtils.createAuditSnapshot(
        batch as unknown as Record<string, unknown>
      );

      // Quarantine-quantity synchronization:
      // When changing TO QUARANTINED, move onHandQty to quarantineQty
      // When changing FROM QUARANTINED to LIVE, move quarantineQty back to onHandQty
      const currentStatus = batch.batchStatus;
      const newStatus = input.status;

      if (currentStatus !== "QUARANTINED" && newStatus === "QUARANTINED") {
        // Moving TO quarantine: transfer onHandQty to quarantineQty
        const onHandQty = inventoryUtils.parseQty(batch.onHandQty);
        const currentQuarantineQty = inventoryUtils.parseQty(
          batch.quarantineQty
        );
        if (onHandQty > 0) {
          await inventoryDb.updateBatchQty(
            input.id,
            "quarantineQty",
            inventoryUtils.formatQty(currentQuarantineQty + onHandQty)
          );
          await inventoryDb.updateBatchQty(input.id, "onHandQty", "0");

          // Record the quarantine movement
          const { inventoryMovements } = await import("../../drizzle/schema");
          const { getDb } = await import("../db");
          const db = await getDb();
          if (db) {
            await db.insert(inventoryMovements).values({
              batchId: input.id,
              inventoryMovementType: "QUARANTINE",
              quantityChange: `-${onHandQty}`,
              quantityBefore: onHandQty.toString(),
              quantityAfter: "0",
              referenceType: "STATUS_CHANGE",
              notes: `Status changed to QUARANTINED: ${input.reason}`,
              performedBy: getAuthenticatedUserId(ctx),
            });
          }
        }
      } else if (currentStatus === "QUARANTINED" && newStatus === "LIVE") {
        // Moving FROM quarantine to LIVE: transfer quarantineQty back to onHandQty
        const currentOnHandQty = inventoryUtils.parseQty(batch.onHandQty);
        const quarantineQty = inventoryUtils.parseQty(batch.quarantineQty);
        if (quarantineQty > 0) {
          await inventoryDb.updateBatchQty(
            input.id,
            "onHandQty",
            inventoryUtils.formatQty(currentOnHandQty + quarantineQty)
          );
          await inventoryDb.updateBatchQty(input.id, "quarantineQty", "0");

          // Record the release from quarantine movement
          const { inventoryMovements } = await import("../../drizzle/schema");
          const { getDb } = await import("../db");
          const db = await getDb();
          if (db) {
            await db.insert(inventoryMovements).values({
              batchId: input.id,
              inventoryMovementType: "RELEASE_FROM_QUARANTINE",
              quantityChange: `+${quarantineQty}`,
              quantityBefore: currentOnHandQty.toString(),
              quantityAfter: (currentOnHandQty + quarantineQty).toString(),
              referenceType: "STATUS_CHANGE",
              notes: `Status changed from QUARANTINED to LIVE: ${input.reason}`,
              performedBy: getAuthenticatedUserId(ctx),
            });
          }
        }
      }

      await inventoryDb.updateBatchStatus(
        input.id,
        input.status,
        input.version
      );
      const after = await inventoryDb.getBatchById(input.id);

      // Create audit log
      await inventoryDb.createAuditLog({
        actorId: getAuthenticatedUserId(ctx),
        entity: "Batch",
        entityId: input.id,
        action: "STATUS_CHANGE",
        before,
        after: inventoryUtils.createAuditSnapshot(
          after as unknown as Record<string, unknown>
        ),
        reason: input.reason,
      });

      return { success: true };
    }),

  // Adjust batch quantity
  // SEC-FIX: Changed permission from inventory:read to inventory:update
  // This is a write operation that modifies inventory quantities
  adjustQty: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number(),
        field: z.enum([
          "onHandQty",
          "reservedQty",
          "quarantineQty",
          "holdQty",
          "defectiveQty",
        ]),
        // SEC-FIX: Add bounds validation to prevent overflow/precision issues
        adjustment: z
          .number()
          .min(-1000000, "Adjustment too small")
          .max(1000000, "Adjustment too large"),
        reason: z
          .string()
          .min(1, "Reason is required")
          .max(500, "Reason too long"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.id);

      const currentQty = inventoryUtils.parseQty(batch[input.field]);
      const newQty = currentQty + input.adjustment;

      // TERP-0018: Prevent negative inventory quantities
      if (newQty < 0) {
        throw new Error(
          `Adjustment would result in negative inventory. Current ${input.field}: ${currentQty}, adjustment: ${input.adjustment}`
        );
      }

      const before = inventoryUtils.createAuditSnapshot(batch);
      await inventoryDb.updateBatchQty(
        input.id,
        input.field,
        inventoryUtils.formatQty(newQty)
      );

      // Quarantine-status synchronization:
      // When quarantineQty changes, check if we need to update batch status
      if (input.field === "quarantineQty") {
        const onHandQty = inventoryUtils.parseQty(batch.onHandQty);
        const currentStatus = batch.batchStatus;

        // If all inventory is now quarantined (onHand = 0, quarantine > 0)
        // and we're increasing quarantine, auto-set status to QUARANTINED
        if (
          newQty > 0 &&
          onHandQty === 0 &&
          currentStatus !== "QUARANTINED" &&
          currentStatus !== "CLOSED" &&
          currentStatus !== "SOLD_OUT"
        ) {
          await inventoryDb.updateBatchStatus(input.id, "QUARANTINED");
        }

        // If quarantine is being reduced to 0 from QUARANTINED status,
        // and there's on-hand inventory available, release to LIVE
        if (newQty === 0 && currentStatus === "QUARANTINED" && onHandQty > 0) {
          await inventoryDb.updateBatchStatus(input.id, "LIVE");
        }

        // Record inventory movement for quarantine changes
        const { inventoryMovements } = await import("../../drizzle/schema");
        const { getDb } = await import("../db");
        const db = await getDb();
        if (db) {
          const movementType =
            input.adjustment > 0 ? "QUARANTINE" : "RELEASE_FROM_QUARANTINE";
          await db.insert(inventoryMovements).values({
            batchId: input.id,
            inventoryMovementType: movementType,
            quantityChange:
              input.adjustment > 0
                ? `+${input.adjustment}`
                : input.adjustment.toString(),
            quantityBefore: currentQty.toString(),
            quantityAfter: newQty.toString(),
            referenceType: "MANUAL_ADJUSTMENT",
            notes: input.reason,
            performedBy: getAuthenticatedUserId(ctx),
          });
        }
      }

      const after = await inventoryDb.getBatchById(input.id);

      // Create audit log
      await inventoryDb.createAuditLog({
        actorId: getAuthenticatedUserId(ctx),
        entity: "Batch",
        entityId: input.id,
        action: "QTY_ADJUST",
        before,
        after: inventoryUtils.createAuditSnapshot(
          after as unknown as Record<string, unknown>
        ),
        reason: input.reason,
      });

      return { success: true };
    }),

  // TERP-SS-009: Update batch fields (ticket/unitCogs, notes) for spreadsheet editing
  // ST-026: Added version checking for concurrent edit detection
  updateBatch: protectedProcedure
    .use(requirePermission("inventory:update"))
    .input(
      z.object({
        id: z.number(),
        version: z.number().optional(), // ST-026: Optional for backward compatibility
        ticket: z.number().min(0).optional(), // unitCogs value
        notes: z.string().nullable().optional(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const batch = await inventoryDb.getBatchById(input.id);
      if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.id);

      // ST-026: Check version if provided
      if (input.version !== undefined) {
        const { checkVersion } = await import("../_core/optimisticLocking");
        const { batches } = await import("../../drizzle/schema");
        const { getDb } = await import("../db");
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        await checkVersion(db, batches, "Batch", input.id, input.version);
      }

      const before = inventoryUtils.createAuditSnapshot(batch);
      const updates: Record<string, unknown> = {};

      // Update ticket (unitCogs) if provided
      if (input.ticket !== undefined) {
        updates.unitCogs = input.ticket.toFixed(2);
      }

      // Update notes in metadata if provided
      if (input.notes !== undefined) {
        const currentMetadata = batch.metadata
          ? JSON.parse(batch.metadata)
          : {};
        currentMetadata.notes = input.notes;
        updates.metadata = JSON.stringify(currentMetadata);
      }

      // ST-026: Increment version if version checking was used
      if (input.version !== undefined) {
        const { sql } = await import("drizzle-orm");
        const { batches } = await import("../../drizzle/schema");
        updates.version = sql`${batches.version} + 1`;
      }

      if (Object.keys(updates).length === 0) {
        return { success: true };
      }

      await inventoryDb.updateBatchFields(input.id, updates);
      const after = await inventoryDb.getBatchById(input.id);

      // Create audit log
      await inventoryDb.createAuditLog({
        actorId: getAuthenticatedUserId(ctx),
        entity: "Batch",
        entityId: input.id,
        action: "BATCH_UPDATE",
        before,
        after: inventoryUtils.createAuditSnapshot(
          after as unknown as Record<string, unknown>
        ),
        reason: input.reason,
      });

      return { success: true };
    }),

  // Get vendors (for autocomplete)
  vendors: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        const result = await inventoryDb.searchVendors(input.query);
        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
      }
      const result = await inventoryDb.getAllVendors();
      // BUG-034: Standardized pagination response
      return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
    }),

  // Get brands (for autocomplete)
  brands: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ query: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.query) {
        const result = await inventoryDb.searchBrands(input.query);
        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
      }
      const result = await inventoryDb.getAllBrands();
      // BUG-034: Standardized pagination response
      return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
    }),

  // Get batches by vendor
  // _Requirements: 7.1_
  // INV-PARTY-001: Renamed from getBatchesByVendor to align with party model
  getBatchesBySupplier: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ supplierClientId: z.number() }))
    .query(async ({ input }) => {
      try {
        inventoryLogger.operationStart("getBatchesBySupplier", {
          supplierClientId: input.supplierClientId,
        });

        const result = await inventoryDb.getBatchesBySupplier(
          input.supplierClientId
        );

        inventoryLogger.operationSuccess("getBatchesBySupplier", {
          supplierClientId: input.supplierClientId,
          batchCount: result.length,
        });

        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
      } catch (error) {
        inventoryLogger.operationFailure(
          "getBatchesBySupplier",
          error as Error,
          {
            supplierClientId: input.supplierClientId,
          }
        );
        handleError(error, "inventory.getBatchesBySupplier");
        throw error;
      }
    }),

  // Seed inventory data
  seed: protectedProcedure
    .use(requirePermission("inventory:read"))
    .mutation(async () => {
      await inventoryDb.seedInventoryData();
      return { success: true };
    }),

  // Saved Views Management
  views: router({
    // Get all views for current user
    list: protectedProcedure
      .use(requirePermission("inventory:read"))
      .query(async ({ ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          const result = await inventoryDb.getUserInventoryViews(userId);
          // BUG-034: Standardized pagination response
          return createSafeUnifiedResponse(result, result?.length || 0, 50, 0);
        } catch (error) {
          handleError(error, "inventory.views.list");
          throw error;
        }
      }),

    // Save a new view
    save: protectedProcedure
      .use(requirePermission("inventory:read"))
      .input(
        z.object({
          name: z.string().min(1).max(100),
          filters: z.any(), // JSON object
          isShared: z.boolean().optional().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          return await inventoryDb.saveInventoryView(
            {
              name: input.name,
              filters: input.filters,
              isShared: input.isShared,
            },
            getAuthenticatedUserId(ctx)
          );
        } catch (error) {
          handleError(error, "inventory.views.save");
          throw error;
        }
      }),

    // Delete a view
    delete: protectedProcedure
      .use(requirePermission("inventory:delete"))
      .input(z.number())
      .mutation(async ({ input, ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          return await inventoryDb.deleteInventoryView(input, userId);
        } catch (error) {
          handleError(error, "inventory.views.delete");
          throw error;
        }
      }),
  }),

  // Bulk operations
  bulk: router({
    // Bulk update status
    updateStatus: protectedProcedure
      .use(requirePermission("inventory:update"))
      .input(
        z.object({
          batchIds: z.array(z.number()),
          newStatus: z.enum([
            "AWAITING_INTAKE",
            "LIVE",
            "PHOTOGRAPHY_COMPLETE",
            "ON_HOLD",
            "QUARANTINED",
            "SOLD_OUT",
            "CLOSED",
          ]),
        })
      )
      .mutation(async ({ input, ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          return await inventoryDb.bulkUpdateBatchStatus(
            input.batchIds,
            input.newStatus,
            userId
          );
        } catch (error) {
          handleError(error, "inventory.bulk.updateStatus");
          throw error;
        }
      }),

    // Bulk delete
    delete: protectedProcedure
      .use(requirePermission("inventory:delete"))
      .input(z.array(z.number()))
      .mutation(async ({ input, ctx }) => {
        try {
          const userId = ctx.user?.id;
          if (!userId) throw new Error("User not authenticated");
          return await inventoryDb.bulkDeleteBatches(input, userId);
        } catch (error) {
          handleError(error, "inventory.bulk.delete");
          throw error;
        }
      }),
  }),

  // Profitability analysis
  profitability: router({
    // Get batch profitability
    batch: protectedProcedure
      .use(requirePermission("inventory:read"))
      .input(z.number())
      .query(async ({ input }) => {
        try {
          return await inventoryDb.calculateBatchProfitability(input);
        } catch (error) {
          handleError(error, "inventory.profitability.batch");
          throw error;
        }
      }),

    // Get top profitable batches
    top: protectedProcedure
      .use(requirePermission("inventory:read"))
      .input(z.number().optional().default(10))
      .query(async ({ input }) => {
        try {
          const result = await inventoryDb.getTopProfitableBatches(input);
          // BUG-034: Standardized pagination response
          return createSafeUnifiedResponse(
            result,
            result?.length || 0,
            input,
            0
          );
        } catch (error) {
          handleError(error, "inventory.profitability.top");
          throw error;
        }
      }),

    // Get overall summary
    summary: protectedProcedure
      .use(requirePermission("inventory:read"))
      .query(async () => {
        try {
          return await inventoryDb.getProfitabilitySummary();
        } catch (error) {
          handleError(error, "inventory.profitability.summary");
          throw error;
        }
      }),
  }),

  // ==========================================================================
  // API-011 & API-012: Explicit batch endpoints
  // ==========================================================================

  /**
   * API-011: Get single batch by ID
   * Alias for getById with clearer naming for API consumers
   */
  batch: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(z.object({ batchId: z.number() }))
    .query(async ({ input }) => {
      try {
        const batch = await inventoryDb.getBatchById(input.batchId);
        if (!batch) throw ErrorCatalog.INVENTORY.BATCH_NOT_FOUND(input.batchId);
        return batch;
      } catch (error) {
        handleError(error, "inventory.batch");
        throw error;
      }
    }),

  /**
   * API-012: Get multiple batches with filtering
   * Simplified endpoint for fetching batches list
   */
  batches: protectedProcedure
    .use(requirePermission("inventory:read"))
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(50),
        cursor: z.number().optional(),
        status: z.string().optional(),
        category: z.string().optional(),
        search: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        inventoryLogger.operationStart("batches", { input });

        let result;
        if (input.search) {
          result = await inventoryDb.searchBatches(
            input.search,
            input.limit,
            input.cursor
          );
        } else {
          result = await inventoryDb.getBatchesWithDetails(
            input.limit,
            input.cursor,
            { status: input.status, category: input.category }
          );
        }

        inventoryLogger.operationSuccess("batches", {
          itemCount: result.items.length,
          hasMore: result.hasMore,
        });

        return result;
      } catch (error) {
        inventoryLogger.operationFailure("batches", error as Error, { input });
        handleError(error, "inventory.batches");
        throw error;
      }
    }),
});
