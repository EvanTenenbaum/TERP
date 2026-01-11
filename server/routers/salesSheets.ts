import { z } from "zod";
import { router, protectedProcedure, publicProcedure, getAuthenticatedUserId } from "../_core/trpc";
import * as salesSheetsDb from "../salesSheetsDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { randomBytes } from "crypto";

// Sales sheet item schema with full validation
const salesSheetItemSchema = z.object({
  id: z.number(),
  name: z.string().max(255),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  strain: z.string().optional(),
  basePrice: z.number().min(0).finite(),
  retailPrice: z.number().min(0).finite(),
  finalPrice: z.number().min(0).finite().optional(),
  quantity: z.number().min(0).finite(),
  grade: z.string().optional(),
  vendor: z.string().optional(),
  priceMarkup: z.number().finite(),
  appliedRules: z
    .array(
      z.object({
        ruleId: z.number(),
        ruleName: z.string(),
        adjustment: z.string(),
      })
    )
    .optional(),
});

// Draft item schema (same as sales sheet item but for drafts)
const draftItemSchema = z.object({
  id: z.number(),
  name: z.string().max(255),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  strain: z.string().optional(),
  basePrice: z.number().min(0).finite(),
  retailPrice: z.number().min(0).finite(),
  quantity: z.number().min(0).finite(),
  grade: z.string().optional(),
  vendor: z.string().optional(),
  priceMarkup: z.number().finite(),
  appliedRules: z
    .array(
      z.object({
        ruleId: z.number(),
        ruleName: z.string(),
        adjustment: z.string(),
      })
    )
    .optional(),
});

// Column config schema
const columnConfigSchema = z
  .object({
    showCategory: z.boolean().optional(),
    showBasePrice: z.boolean().optional(),
    showRetailPrice: z.boolean().optional(),
    showQuantity: z.boolean().optional(),
    showGrade: z.boolean().optional(),
    showVendor: z.boolean().optional(),
  })
  .optional();

export const salesSheetsRouter = router({
  // Inventory with Pricing
  getInventory: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ clientId: z.number().positive() }))
    .query(async ({ input }) => {
      return await salesSheetsDb.getInventoryWithPricing(input.clientId);
    }),

  // History
  save: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        clientId: z.number().positive(),
        items: z.array(salesSheetItemSchema).min(1).max(1000),
        totalValue: z.number().min(0).finite(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Verify total matches items
      const calculatedTotal = input.items.reduce(
        (sum, item) => sum + (item.finalPrice || item.retailPrice),
        0
      );

      if (Math.abs(calculatedTotal - input.totalValue) > 0.01) {
        throw new Error("Total value mismatch");
      }

      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.saveSalesSheet({
        ...input,
        createdBy: userId,
      });
    }),

  getHistory: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive(),
        limit: z.number().positive().max(1000).optional(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetsDb.getSalesSheetHistory(
        input.clientId,
        input.limit
      );
    }),

  getById: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ sheetId: z.number().positive() }))
    .query(async ({ input }) => {
      return await salesSheetsDb.getSalesSheetById(input.sheetId);
    }),

  delete: protectedProcedure.use(requirePermission("orders:create"))
    .input(z.object({ sheetId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await salesSheetsDb.deleteSalesSheet(input.sheetId);
      return { success: true };
    }),

  // Templates
  createTemplate: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        name: z.string().min(1).max(255),
        clientId: z.number().positive().optional(),
        isUniversal: z.boolean(),
        items: z.array(salesSheetItemSchema).min(1).max(1000),
        columnConfig: columnConfigSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.createTemplate({
        ...input,
        createdBy: userId,
      });
    }),

  getTemplates: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive().optional(),
        includeUniversal: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return await salesSheetsDb.getTemplates(
        input.clientId,
        input.includeUniversal
      );
    }),

  loadTemplate: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ templateId: z.number().positive() }))
    .query(async ({ input }) => {
      return await salesSheetsDb.loadTemplate(input.templateId);
    }),

  deleteTemplate: protectedProcedure.use(requirePermission("orders:create"))
    .input(z.object({ templateId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await salesSheetsDb.deleteTemplate(input.templateId);
      return { success: true };
    }),

  // ============================================================================
  // DRAFTS (QA-062)
  // ============================================================================

  /**
   * Save or update a draft
   * If draftId is provided, updates existing; otherwise creates new
   */
  saveDraft: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        draftId: z.number().positive().optional(),
        clientId: z.number().positive(),
        name: z.string().min(1).max(255),
        items: z.array(draftItemSchema).max(1000),
        totalValue: z.number().min(0).finite(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const draftId = await salesSheetsDb.saveDraft({
        draftId: input.draftId,
        clientId: input.clientId,
        name: input.name,
        items: input.items,
        totalValue: input.totalValue,
        createdBy: userId,
      });
      return { draftId };
    }),

  /**
   * Get all drafts for the current user
   * Optionally filter by clientId
   */
  getDrafts: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.getDrafts(userId, input?.clientId);
    }),

  /**
   * Get a specific draft by ID
   */
  getDraftById: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ draftId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.getDraftById(input.draftId, userId);
    }),

  /**
   * Delete a draft
   */
  deleteDraft: protectedProcedure.use(requirePermission("orders:create"))
    .input(z.object({ draftId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      await salesSheetsDb.deleteDraft(input.draftId, userId);
      return { success: true };
    }),

  /**
   * Convert a draft to a finalized sales sheet
   */
  convertDraftToSheet: protectedProcedure.use(requirePermission("orders:create"))
    .input(z.object({ draftId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const sheetId = await salesSheetsDb.convertDraftToSheet(input.draftId, userId);
      return { sheetId };
    }),

  // ============================================================================
  // LIST & SHARING
  // ============================================================================

  /**
   * List sales sheets with pagination
   */
  list: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive().optional(),
        limit: z.number().positive().max(100).default(20),
        offset: z.number().nonnegative().default(0),
      }).optional()
    )
    .query(async ({ input }) => {
      return await salesSheetsDb.listSalesSheets(
        input?.clientId,
        input?.limit ?? 20,
        input?.offset ?? 0
      );
    }),

  /**
   * Generate a shareable link for a sales sheet
   */
  generateShareLink: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        sheetId: z.number().positive(),
        expiresInDays: z.number().min(1).max(90).default(7),
      })
    )
    .mutation(async ({ input }) => {
      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

      await salesSheetsDb.setShareToken(input.sheetId, token, expiresAt);

      return {
        token,
        expiresAt,
        shareUrl: `/shared/sales-sheet/${token}`,
      };
    }),

  /**
   * Revoke a share link
   */
  revokeShareLink: protectedProcedure.use(requirePermission("orders:create"))
    .input(z.object({ sheetId: z.number().positive() }))
    .mutation(async ({ input }) => {
      await salesSheetsDb.revokeShareToken(input.sheetId);
      return { success: true };
    }),

  /**
   * Get a sales sheet by share token (public - no auth required)
   */
  getByToken: publicProcedure
    .input(z.object({ token: z.string().min(1) }))
    .query(async ({ input }) => {
      const sheet = await salesSheetsDb.getSalesSheetByToken(input.token);

      if (!sheet) {
        throw new Error("Sales sheet not found or link has expired");
      }

      // Increment view count
      await salesSheetsDb.incrementViewCount(sheet.id);

      // Return sanitized data (no COGS, no margin info)
      return {
        id: sheet.id,
        clientName: sheet.clientName,
        items: (sheet.items as any[]).map((item: any) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          quantity: item.quantity,
          price: item.finalPrice || item.retailPrice,
        })),
        totalValue: sheet.totalValue,
        itemCount: sheet.itemCount,
        createdAt: sheet.createdAt,
        expiresAt: sheet.shareExpiresAt,
      };
    }),

  // ============================================================================
  // CONVERSION
  // ============================================================================

  /**
   * Convert a sales sheet to an order
   */
  convertToOrder: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        sheetId: z.number().positive(),
        orderType: z.enum(["DRAFT", "QUOTE", "ORDER"]).default("DRAFT"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const orderId = await salesSheetsDb.convertToOrder(
        input.sheetId,
        userId,
        input.orderType
      );
      return { orderId };
    }),

  /**
   * Convert a sales sheet to a live shopping session
   */
  convertToLiveSession: protectedProcedure.use(requirePermission("orders:create"))
    .input(z.object({ sheetId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const sessionId = await salesSheetsDb.convertToLiveSession(
        input.sheetId,
        userId
      );
      return { sessionId };
    }),

  // ============================================================================
  // SAVED VIEWS (SALES-SHEET-IMPROVEMENTS)
  // ============================================================================

  /**
   * Save a view configuration (filters, sort, columns)
   * Reuses the templates table with filters/columnVisibility JSON fields
   */
  saveView: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        id: z.number().positive().optional(), // For updates
        name: z.string().min(1).max(255),
        description: z.string().max(500).optional(),
        clientId: z.number().positive().optional(), // null = universal view
        filters: z.object({
          search: z.string(),
          categories: z.array(z.string()),
          grades: z.array(z.string()),
          priceMin: z.number().nullable(),
          priceMax: z.number().nullable(),
          strainFamilies: z.array(z.string()),
          vendors: z.array(z.string()),
          inStockOnly: z.boolean(),
        }),
        sort: z.object({
          field: z.enum(['name', 'category', 'retailPrice', 'quantity', 'basePrice', 'grade']),
          direction: z.enum(['asc', 'desc']),
        }),
        columnVisibility: z.object({
          category: z.boolean(),
          quantity: z.boolean(),
          basePrice: z.boolean(),
          retailPrice: z.boolean(),
          markup: z.boolean(),
          grade: z.boolean(),
          vendor: z.boolean(),
          strain: z.boolean(),
        }),
        isDefault: z.boolean().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      const viewId = await salesSheetsDb.saveView({
        ...input,
        createdBy: userId,
      });
      return { viewId };
    }),

  /**
   * Get saved views for a client (includes universal views)
   */
  getViews: protectedProcedure.use(requirePermission("orders:read"))
    .input(
      z.object({
        clientId: z.number().positive().optional(),
      }).optional()
    )
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.getViews(input?.clientId, userId);
    }),

  /**
   * Load a specific view by ID
   * FIX: Now passes userId for authorization check
   */
  loadView: protectedProcedure.use(requirePermission("orders:read"))
    .input(z.object({ viewId: z.number().positive() }))
    .query(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      return await salesSheetsDb.loadViewById(input.viewId, userId);
    }),

  /**
   * Set a view as the default for a client
   */
  setDefaultView: protectedProcedure.use(requirePermission("orders:create"))
    .input(
      z.object({
        viewId: z.number().positive(),
        clientId: z.number().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      await salesSheetsDb.setDefaultView(input.viewId, input.clientId, userId);
      return { success: true };
    }),

  /**
   * Delete a saved view
   */
  deleteView: protectedProcedure.use(requirePermission("orders:create"))
    .input(z.object({ viewId: z.number().positive() }))
    .mutation(async ({ input, ctx }) => {
      const userId = getAuthenticatedUserId(ctx);
      await salesSheetsDb.deleteView(input.viewId, userId);
      return { success: true };
    }),
});
