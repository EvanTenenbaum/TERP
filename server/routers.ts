import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as inventoryDb from "./inventoryDb";
import * as inventoryUtils from "./inventoryUtils";
import * as scratchPadDb from "./scratchPadDb";
import * as dashboardDb from "./dashboardDb";
import { seedStrainsFromCSV } from "./seedStrains";
import type { Batch } from "../drizzle/schema";
import * as accountingDb from "./accountingDb";
import * as arApDb from "./arApDb";
import * as cashExpensesDb from "./cashExpensesDb";
import * as freeformNotesDb from "./freeformNotesDb";
import * as clientsDb from "./clientsDb";
import * as creditEngine from "./creditEngine";
import * as pricingEngine from "./pricingEngine";
import * as salesSheetsDb from "./salesSheetsDb";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Inventory Module Router
  inventory: router({
    // Get all batches with details
    list: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        limit: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        if (input.query) {
          return await inventoryDb.searchBatches(input.query, input.limit);
        }
        return await inventoryDb.getBatchesWithDetails(input.limit);
      }),

    // Get dashboard statistics
    dashboardStats: protectedProcedure
      .query(async () => {
        const stats = await inventoryDb.getDashboardStats();
        if (!stats) throw new Error("Failed to fetch dashboard statistics");
        return stats;
      }),

    // Get single batch by ID
    getById: protectedProcedure
      .input(z.number())
      .query(async ({ input }) => {
        const batch = await inventoryDb.getBatchById(input);
        if (!batch) throw new Error("Batch not found");
        
        const locations = await inventoryDb.getBatchLocations(input);
        const auditLogs = await inventoryDb.getAuditLogsForEntity("Batch", input);
        
        return {
          batch,
          locations,
          auditLogs,
          availableQty: inventoryUtils.calculateAvailableQty(batch),
        };
      }),

    // Create new batch (intake)
    intake: protectedProcedure
      .input(z.object({
        vendorName: z.string(),
        brandName: z.string(),
        productName: z.string(),
        category: z.string(),
        subcategory: z.string().optional(),
        grade: z.string().optional(),
        quantity: z.number(),
        cogsMode: z.enum(["FIXED", "RANGE"]),
        unitCogs: z.string().optional(),
        unitCogsMin: z.string().optional(),
        unitCogsMax: z.string().optional(),
        paymentTerms: z.enum(["COD", "NET_7", "NET_15", "NET_30", "CONSIGNMENT", "PARTIAL"]),
        location: z.object({
          site: z.string(),
          zone: z.string().optional(),
          rack: z.string().optional(),
          shelf: z.string().optional(),
          bin: z.string().optional(),
        }),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Validate COGS
        const cogsValidation = inventoryUtils.validateCOGS(
          input.cogsMode,
          input.unitCogs,
          input.unitCogsMin,
          input.unitCogsMax
        );
        if (!cogsValidation.valid) {
          throw new Error(cogsValidation.error);
        }

        // Find or create vendor
        let vendors = await inventoryDb.searchVendors(input.vendorName);
        let vendor = vendors.find(v => v.name === input.vendorName);
        if (!vendor) {
          await inventoryDb.createVendor({ name: input.vendorName });
          vendors = await inventoryDb.searchVendors(input.vendorName);
          vendor = vendors[0];
        }

        // Find or create brand
        let brands = await inventoryDb.searchBrands(input.brandName);
        let brand = brands.find(b => b.name === input.brandName);
        if (!brand) {
          await inventoryDb.createBrand({ name: input.brandName, vendorId: vendor.id });
          brands = await inventoryDb.searchBrands(input.brandName);
          brand = brands[0];
        }

        // Normalize and find/create product
        const normalizedProductName = inventoryUtils.normalizeProductName(input.productName);
        let product = await inventoryDb.findProductByNameAndBrand(normalizedProductName, brand.id);
        if (!product) {
          await inventoryDb.createProduct({
            brandId: brand.id,
            nameCanonical: normalizedProductName,
            category: input.category,
            subcategory: input.subcategory,
          });
          product = await inventoryDb.findProductByNameAndBrand(normalizedProductName, brand.id);
        }

        if (!product) throw new Error("Failed to create product");

        // Create or find lot
        const lotCode = inventoryUtils.generateLotCode(new Date());
        let lot = await inventoryDb.getLotByCode(lotCode);
        if (!lot) {
          await inventoryDb.createLot({
            code: lotCode,
            vendorId: vendor.id,
            date: new Date(),
          });
          lot = await inventoryDb.getLotByCode(lotCode);
        }

        if (!lot) throw new Error("Failed to create lot");

        // Generate batch code and SKU
        const batchSequence = 1; // TODO: Get actual sequence from DB
        const batchCode = inventoryUtils.generateBatchCode(lotCode, batchSequence);
        const brandKey = inventoryUtils.normalizeToKey(brand.name);
        const productKey = inventoryUtils.normalizeToKey(product.nameCanonical);
        const sku = inventoryUtils.generateSKU(brandKey, productKey, new Date(), batchSequence);

        // Create batch
        await inventoryDb.createBatch({
          code: batchCode,
          sku: sku,
          productId: product.id,
          lotId: lot.id,
          status: "AWAITING_INTAKE",
          grade: input.grade,
          isSample: 0,
          cogsMode: input.cogsMode,
          unitCogs: input.unitCogs,
          unitCogsMin: input.unitCogsMin,
          unitCogsMax: input.unitCogsMax,
          paymentTerms: input.paymentTerms,
          metadata: input.metadata ? inventoryUtils.stringifyMetadata(input.metadata) : null,
          onHandQty: inventoryUtils.formatQty(input.quantity),
          reservedQty: "0",
          quarantineQty: "0",
          holdQty: "0",
          defectiveQty: "0",
        });

        const batch = await inventoryDb.getBatchByCode(batchCode);
        if (!batch) throw new Error("Failed to create batch");

        // Create batch location
        await inventoryDb.createBatchLocation({
          batchId: batch.id,
          site: input.location.site,
          zone: input.location.zone,
          rack: input.location.rack,
          shelf: input.location.shelf,
          bin: input.location.bin,
          qty: inventoryUtils.formatQty(input.quantity),
        });

        // Create audit log
        await inventoryDb.createAuditLog({
          actorId: ctx.user?.id || 0,
          entity: "Batch",
          entityId: batch.id,
          action: "CREATED",
          after: inventoryUtils.createAuditSnapshot(batch),
          reason: "Initial intake",
        });

        return { success: true, batch };
      }),

    // Update batch status
    updateStatus: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["AWAITING_INTAKE", "LIVE", "ON_HOLD", "QUARANTINED", "SOLD_OUT", "CLOSED"]),
        reason: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const batch = await inventoryDb.getBatchById(input.id);
        if (!batch) throw new Error("Batch not found");

        // Validate transition
        if (!inventoryUtils.isValidStatusTransition(batch.status as any, input.status)) {
          throw new Error(`Invalid status transition from ${batch.status} to ${input.status}`);
        }

        const before = inventoryUtils.createAuditSnapshot(batch);
        await inventoryDb.updateBatchStatus(input.id, input.status);
        const after = await inventoryDb.getBatchById(input.id);

        // Create audit log
        await inventoryDb.createAuditLog({
          actorId: ctx.user?.id || 0,
          entity: "Batch",
          entityId: input.id,
          action: "STATUS_CHANGE",
          before,
          after: inventoryUtils.createAuditSnapshot(after),
          reason: input.reason,
        });

        return { success: true };
      }),

    // Adjust batch quantity
    adjustQty: protectedProcedure
      .input(z.object({
        id: z.number(),
        field: z.enum(["onHandQty", "reservedQty", "quarantineQty", "holdQty", "defectiveQty"]),
        adjustment: z.number(),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const batch = await inventoryDb.getBatchById(input.id);
        if (!batch) throw new Error("Batch not found");

        const currentQty = inventoryUtils.parseQty(batch[input.field]);
        const newQty = currentQty + input.adjustment;

        if (newQty < 0) {
          throw new Error("Quantity cannot be negative");
        }

        const before = inventoryUtils.createAuditSnapshot(batch);
        await inventoryDb.updateBatchQty(input.id, input.field, inventoryUtils.formatQty(newQty));
        const after = await inventoryDb.getBatchById(input.id);

        // Create audit log
        await inventoryDb.createAuditLog({
          actorId: ctx.user?.id || 0,
          entity: "Batch",
          entityId: input.id,
          action: "QTY_ADJUST",
          before,
          after: inventoryUtils.createAuditSnapshot(after),
          reason: input.reason,
        });

        return { success: true };
      }),

    // Get vendors (for autocomplete)
    vendors: protectedProcedure
      .input(z.object({ query: z.string().optional() }))
      .query(async ({ input }) => {
        if (input.query) {
          return await inventoryDb.searchVendors(input.query);
        }
        return await inventoryDb.getAllVendors();
      }),

    // Get brands (for autocomplete)
    brands: protectedProcedure
      .input(z.object({ query: z.string().optional() }))
      .query(async ({ input }) => {
        if (input.query) {
          return await inventoryDb.searchBrands(input.query);
        }
        return await inventoryDb.getAllBrands();
      }),

    // Seed inventory data
    seed: protectedProcedure
      .mutation(async () => {
        await inventoryDb.seedInventoryData();
        return { success: true };
      }),
  }),

  // Settings Module Router
  settings: router({
    // Locations
    locations: router({
      list: protectedProcedure.query(async () => {
        return await inventoryDb.getAllLocations();
      }),
      create: protectedProcedure
        .input(z.object({
          site: z.string(),
          zone: z.string().optional(),
          rack: z.string().optional(),
          shelf: z.string().optional(),
          bin: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createLocation(input);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          site: z.string(),
          zone: z.string().optional(),
          rack: z.string().optional(),
          shelf: z.string().optional(),
          bin: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateLocation(input);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteLocation(input.id);
        }),
    }),

    // Categories
    categories: router({
      list: protectedProcedure.query(async () => {
        return await inventoryDb.getAllCategoriesWithSubcategories();
      }),
      create: protectedProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createCategory(input.name);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateCategory(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteCategory(input.id);
        }),
    }),

    // Subcategories
    subcategories: router({
      create: protectedProcedure
        .input(z.object({
          categoryId: z.number(),
          name: z.string(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createSubcategory(input.categoryId, input.name);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateSubcategory(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteSubcategory(input.id);
        }),
    }),

    // Grades
    grades: router({
      list: protectedProcedure.query(async () => {
        return await inventoryDb.getAllGrades();
      }),
      create: protectedProcedure
        .input(z.object({ name: z.string() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.createGrade(input.name);
        }),
      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          name: z.string(),
          updateProducts: z.boolean(),
        }))
        .mutation(async ({ input }) => {
          return await inventoryDb.updateGrade(input.id, input.name, input.updateProducts);
        }),
      delete: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await inventoryDb.deleteGrade(input.id);
        }),
    }),
  }),

  // Strains Module Router
  strains: router({
    // Seed strains from CSV
    seed: protectedProcedure.mutation(async () => {
      return await seedStrainsFromCSV();
    }),
    // List all strains
    list: protectedProcedure
      .input(z.object({
        query: z.string().optional(),
        category: z.enum(["indica", "sativa", "hybrid"]).optional(),
        limit: z.number().optional().default(100),
      }))
      .query(async ({ input }) => {
        return await inventoryDb.getAllStrains(input.query, input.category, input.limit);
      }),
    // Get strain by ID
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await inventoryDb.getStrainById(input.id);
      }),
    // Search strains (for autocomplete)
    search: protectedProcedure
      .input(z.object({ query: z.string() }))
      .query(async ({ input }) => {
        return await inventoryDb.searchStrains(input.query);
      }),
    // Create custom strain
    create: protectedProcedure
      .input(z.object({
        name: z.string(),
        category: z.enum(["indica", "sativa", "hybrid"]),
        description: z.string().optional(),
        aliases: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await inventoryDb.createStrain(input);
      }),
  }),

  // COGS Management Router
  cogs: router({
    // Calculate COGS impact
    calculateImpact: protectedProcedure
      .input(z.object({
        batchId: z.number(),
        newCogs: z.string(),
      }))
      .query(async ({ input }) => {
        const { calculateCogsImpact } = await import("./cogsManagement");
        return await calculateCogsImpact(input.batchId, input.newCogs);
      }),
    
    // Update batch COGS
    updateBatchCogs: protectedProcedure
      .input(z.object({
        batchId: z.number(),
        newCogs: z.string(),
        applyTo: z.enum(["PAST_SALES", "FUTURE_SALES", "BOTH"]),
        reason: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { updateBatchCogs } = await import("./cogsManagement");
        const userId = ctx.user?.id || 0;
        return await updateBatchCogs(
          input.batchId,
          input.newCogs,
          input.applyTo,
          input.reason,
          userId
        );
      }),
    
    // Get COGS history
    getHistory: protectedProcedure
      .input(z.object({ batchId: z.number() }))
      .query(async ({ input }) => {
        const { getCogHistory } = await import("./cogsManagement");
        return await getCogHistory(input.batchId);
      }),
  }),

  // Scratch Pad Router
  scratchPad: router({
    // Get user's notes (infinite scroll)
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        cursor: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.getUserNotes(ctx.user.id, input.limit, input.cursor);
      }),

    // Create new note
    create: protectedProcedure
      .input(z.object({
        content: z.string().min(1).max(10000),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.createNote(ctx.user.id, input.content);
      }),

    // Update note content
    update: protectedProcedure
      .input(z.object({
        noteId: z.number(),
        content: z.string().min(1).max(10000),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.updateNote(input.noteId, ctx.user.id, input.content);
      }),

    // Toggle note completion
    toggleComplete: protectedProcedure
      .input(z.object({
        noteId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.toggleNoteCompletion(input.noteId, ctx.user.id);
      }),

    // Delete note
    delete: protectedProcedure
      .input(z.object({
        noteId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.deleteNote(input.noteId, ctx.user.id);
      }),

    // Get note count
    count: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.getNoteCount(ctx.user.id);
      }),
  }),

  // Dashboard Router
  dashboard: router({
    // Get real-time KPI data
    getKpis: protectedProcedure
      .query(async () => {
        // Get inventory stats
        const inventoryStats = await inventoryDb.getDashboardStats();
        
        // Get accounting data
        const outstandingReceivables = await arApDb.getOutstandingReceivables();
        const paidInvoicesResult = await arApDb.getInvoices({ status: 'PAID' });
        
        // Calculate total revenue from paid invoices
        const paidInvoices = paidInvoicesResult.invoices || [];
        const totalRevenue = paidInvoices.reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);
        
        // Calculate active orders (non-paid invoices)
        const activeInvoicesResult = await arApDb.getInvoices({ status: 'SENT' });
        const activeOrders = activeInvoicesResult.invoices?.length || 0;
        
        // Calculate inventory value
        const inventoryValue = inventoryStats?.totalInventoryValue || 0;
        
        // Low stock count (estimate from status counts)
        const lowStockCount = 0; // TODO: Add low stock threshold logic
        
        return {
          totalRevenue,
          revenueChange: 0, // TODO: Calculate from previous period
          activeOrders,
          ordersChange: 0, // TODO: Calculate from previous period
          inventoryValue,
          inventoryChange: 0, // TODO: Calculate from previous period
          lowStockCount,
        };
      }),
    // Get user's widget layout
    getLayout: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.getUserWidgetLayout(ctx.user.id);
      }),

    // Save user's widget layout
    saveLayout: protectedProcedure
      .input(z.object({
        widgets: z.array(z.object({
          widgetType: z.string(),
          position: z.number(),
          width: z.number(),
          height: z.number(),
          isVisible: z.boolean(),
          config: z.any().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.saveUserWidgetLayout(ctx.user.id, input.widgets);
      }),

    // Reset user's layout to role default
    resetLayout: protectedProcedure
      .mutation(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.resetUserWidgetLayout(ctx.user.id);
      }),

    // Get role default layout (admin only)
    getRoleDefault: protectedProcedure
      .input(z.object({
        role: z.enum(["user", "admin"]),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.getRoleDefaultLayout(input.role);
      }),

    // Save role default layout (admin only)
    saveRoleDefault: protectedProcedure
      .input(z.object({
        role: z.enum(["user", "admin"]),
        widgets: z.array(z.object({
          widgetType: z.string(),
          position: z.number(),
          width: z.number(),
          height: z.number(),
          isVisible: z.boolean(),
          config: z.any().optional(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.saveRoleDefaultLayout(input.role, input.widgets);
      }),

    // Get KPI configuration for user's role
    getKpiConfig: protectedProcedure
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await dashboardDb.getRoleKpiConfig(ctx.user.role);
      }),

    // Save KPI configuration for a role (admin only)
    saveKpiConfig: protectedProcedure
      .input(z.object({
        role: z.enum(["user", "admin"]),
        kpis: z.array(z.object({
          kpiType: z.string(),
          position: z.number(),
          isVisible: z.boolean(),
        })),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new Error("Forbidden: Admin only");
        }
        return await dashboardDb.saveRoleKpiConfig(input.role, input.kpis);
      }),

    // Widget Data Endpoints
    
    // Sales by Client (with time period filter)
    getSalesByClient: protectedProcedure
      .input(z.object({
        timePeriod: z.enum(["LIFETIME", "YEAR", "QUARTER", "MONTH"]).default("LIFETIME"),
      }))
      .query(async ({ input }) => {
        const invoices = await arApDb.getInvoices({});
        const allInvoices = invoices.invoices || [];
        
        // Group by customer and sum total sales
        const salesByClient = allInvoices.reduce((acc: any, inv: any) => {
          const customerId = inv.customerId;
          if (!acc[customerId]) {
            acc[customerId] = {
              customerId,
              customerName: `Customer ${customerId}`, // TODO: Join with customers table
              totalSales: 0,
            };
          }
          acc[customerId].totalSales += Number(inv.totalAmount || 0);
          return acc;
        }, {});
        
        return Object.values(salesByClient).sort((a: any, b: any) => b.totalSales - a.totalSales);
      }),

    // Cash Collected (24 months by client)
    getCashCollected: protectedProcedure
      .input(z.object({
        months: z.number().default(24),
      }))
      .query(async ({ input }) => {
        const paymentsResult = await arApDb.getPayments({ paymentType: 'RECEIVED' });
        const allPayments = paymentsResult.payments || [];
        
        // Group by customer
        const cashByClient = allPayments.reduce((acc: any, pmt: any) => {
          const customerId = pmt.customerId;
          if (customerId) {
            if (!acc[customerId]) {
              acc[customerId] = {
                customerId,
                customerName: `Customer ${customerId}`,
                cashCollected: 0,
              };
            }
            acc[customerId].cashCollected += Number(pmt.amount || 0);
          }
          return acc;
        }, {});
        
        return Object.values(cashByClient).sort((a: any, b: any) => b.cashCollected - a.cashCollected);
      }),

    // Client Debt (current debt + aging)
    getClientDebt: protectedProcedure
      .query(async () => {
        const receivablesResult = await arApDb.getOutstandingReceivables();
        const receivables = receivablesResult.invoices || [];
        const agingResult = await arApDb.calculateARAging();
        const aging = agingResult; // Aging returns the buckets directly
        
        // Combine debt and aging data
        return receivables.map((r: any) => ({
          customerId: r.customerId,
          customerName: `Customer ${r.customerId}`,
          currentDebt: Number(r.amountDue || 0),
          oldestDebt: 0, // TODO: Calculate oldest invoice age from invoice dates
        }));
      }),

    // Client Profit Margin
    getClientProfitMargin: protectedProcedure
      .query(async () => {
        const invoices = await arApDb.getInvoices({});
        const allInvoices = invoices.invoices || [];
        
        // Calculate profit margin by client (simplified)
        const marginByClient = allInvoices.reduce((acc: any, inv: any) => {
          const customerId = inv.customerId;
          if (!acc[customerId]) {
            acc[customerId] = {
              customerId,
              customerName: `Customer ${customerId}`,
              revenue: 0,
              cost: 0,
            };
          }
          acc[customerId].revenue += Number(inv.totalAmount || 0);
          // Simplified: assume 60% margin
          acc[customerId].cost += Number(inv.totalAmount || 0) * 0.4;
          return acc;
        }, {});
        
        return Object.values(marginByClient).map((c: any) => ({
          ...c,
          profitMargin: c.revenue > 0 ? ((c.revenue - c.cost) / c.revenue) * 100 : 0,
        })).sort((a: any, b: any) => b.profitMargin - a.profitMargin);
      }),

    // Transaction Snapshot (Today vs This Week)
    getTransactionSnapshot: protectedProcedure
      .query(async () => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const invoices = await arApDb.getInvoices({});
        const paymentsResult = await arApDb.getPayments({ paymentType: 'RECEIVED' });
        const allInvoices = invoices.invoices || [];
        const allPayments = paymentsResult.payments || [];
        
        // Calculate today's metrics
        const todaySales = allInvoices
          .filter((i: any) => new Date(i.invoiceDate) >= today)
          .reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
        
        const todayCash = allPayments
          .filter((p: any) => new Date(p.paymentDate) >= today)
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        
        const todayUnits = allInvoices
          .filter((i: any) => new Date(i.invoiceDate) >= today)
          .length;
        
        // Calculate this week's metrics
        const weekSales = allInvoices
          .filter((i: any) => new Date(i.invoiceDate) >= weekAgo)
          .reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
        
        const weekCash = allPayments
          .filter((p: any) => new Date(p.paymentDate) >= weekAgo)
          .reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        
        const weekUnits = allInvoices
          .filter((i: any) => new Date(i.invoiceDate) >= weekAgo)
          .length;
        
        return {
          today: { sales: todaySales, cashCollected: todayCash, unitsSold: todayUnits },
          thisWeek: { sales: weekSales, cashCollected: weekCash, unitsSold: weekUnits },
        };
      }),

    // Inventory Snapshot (by category)
    getInventorySnapshot: protectedProcedure
      .query(async () => {
        const stats = await inventoryDb.getDashboardStats();
        return {
          categories: stats?.categoryStats || [],
          totalUnits: stats?.totalUnits || 0,
          totalValue: stats?.totalInventoryValue || 0,
        };
      }),

    // Sales Time Period Comparison
    getSalesComparison: protectedProcedure
      .query(async () => {
        const invoices = await arApDb.getInvoices({});
        const allInvoices = invoices.invoices || [];
        
        const now = new Date();
        const last7Days = new Date(now);
        last7Days.setDate(last7Days.getDate() - 7);
        const prior7Days = new Date(last7Days);
        prior7Days.setDate(prior7Days.getDate() - 7);
        
        const last30Days = new Date(now);
        last30Days.setDate(last30Days.getDate() - 30);
        const prior30Days = new Date(last30Days);
        prior30Days.setDate(prior30Days.getDate() - 30);
        
        const last6Months = new Date(now);
        last6Months.setMonth(last6Months.getMonth() - 6);
        const prior6Months = new Date(last6Months);
        prior6Months.setMonth(prior6Months.getMonth() - 6);
        
        const last365 = new Date(now);
        last365.setDate(last365.getDate() - 365);
        const prior365 = new Date(last365);
        prior365.setDate(prior365.getDate() - 365);
        
        const calculateSales = (start: Date, end: Date) => {
          return allInvoices
            .filter((i: any) => {
              const date = new Date(i.invoiceDate);
              return date >= start && date < end;
            })
            .reduce((sum: number, i: any) => sum + Number(i.totalAmount || 0), 0);
        };
        
        return {
          weekly: {
            last7Days: calculateSales(last7Days, now),
            prior7Days: calculateSales(prior7Days, last7Days),
          },
          monthly: {
            last30Days: calculateSales(last30Days, now),
            prior30Days: calculateSales(prior30Days, last30Days),
          },
          sixMonth: {
            last6Months: calculateSales(last6Months, now),
            prior6Months: calculateSales(prior6Months, last6Months),
          },
          yearly: {
            last365: calculateSales(last365, now),
            prior365: calculateSales(prior365, last365),
          },
        };
      }),

    // Cash Flow (with time period filter)
    getCashFlow: protectedProcedure
      .input(z.object({
        timePeriod: z.enum(["LIFETIME", "YEAR", "QUARTER", "MONTH"]).default("LIFETIME"),
      }))
      .query(async ({ input }) => {
        const receivedPaymentsResult = await arApDb.getPayments({ paymentType: 'RECEIVED' });
        const sentPaymentsResult = await arApDb.getPayments({ paymentType: 'SENT' });
        
        const cashCollected = (receivedPaymentsResult.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        const cashSpent = (sentPaymentsResult.payments || []).reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);
        
        return {
          cashCollected,
          cashSpent,
          netCashFlow: cashCollected - cashSpent,
        };
      }),

    // Total Debt (AR vs AP)
    getTotalDebt: protectedProcedure
      .query(async () => {
        const receivablesResult = await arApDb.getOutstandingReceivables();
        const payablesResult = await arApDb.getOutstandingPayables();
        
        const receivables = receivablesResult.invoices || [];
        const payables = payablesResult.bills || [];
        
        const totalAR = receivables.reduce((sum: number, r: any) => sum + Number(r.amountDue || 0), 0);
        const totalAP = payables.reduce((sum: number, p: any) => sum + Number(p.amountDue || 0), 0);
        
        return {
          totalDebtOwedToMe: totalAR,
          totalDebtIOwevVendors: totalAP,
          netPosition: totalAR - totalAP,
        };
      }),
  }),

  // Accounting Module - Core Accounting Router
  accounting: router({
    // Chart of Accounts
    accounts: router({
      list: protectedProcedure
        .input(z.object({
          accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]).optional(),
          isActive: z.boolean().optional(),
          parentAccountId: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getAccounts(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await accountingDb.getAccountById(input.id);
        }),

      getByNumber: protectedProcedure
        .input(z.object({ accountNumber: z.string() }))
        .query(async ({ input }) => {
          return await accountingDb.getAccountByNumber(input.accountNumber);
        }),

      create: protectedProcedure
        .input(z.object({
          accountNumber: z.string(),
          accountName: z.string(),
          accountType: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
          normalBalance: z.enum(["DEBIT", "CREDIT"]),
          description: z.string().optional(),
          parentAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.createAccount(input);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          accountName: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await accountingDb.updateAccount(id, data);
        }),

      getBalance: protectedProcedure
        .input(z.object({
          accountId: z.number(),
          asOfDate: z.date(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getAccountBalance(input.accountId, input.asOfDate);
        }),

      getChartOfAccounts: protectedProcedure
        .query(async () => {
          return await accountingDb.getChartOfAccounts();
        }),
    }),

    // General Ledger
    ledger: router({
      list: protectedProcedure
        .input(z.object({
          accountId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          fiscalPeriodId: z.number().optional(),
          isPosted: z.boolean().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getLedgerEntries(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await accountingDb.getLedgerEntryById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          entryNumber: z.string(),
          entryDate: z.date(),
          accountId: z.number(),
          debit: z.string(),
          credit: z.string(),
          description: z.string(),
          fiscalPeriodId: z.number(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          isManual: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.createLedgerEntry({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      postJournalEntry: protectedProcedure
        .input(z.object({
          entryDate: z.date(),
          debitAccountId: z.number(),
          creditAccountId: z.number(),
          amount: z.number(),
          description: z.string(),
          fiscalPeriodId: z.number(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.postJournalEntry({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      getTrialBalance: protectedProcedure
        .input(z.object({
          fiscalPeriodId: z.number(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getTrialBalance(input.fiscalPeriodId);
        }),
    }),

    // Fiscal Periods
    fiscalPeriods: router({
      list: protectedProcedure
        .input(z.object({
          status: z.enum(["OPEN", "CLOSED", "LOCKED"]).optional(),
          year: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await accountingDb.getFiscalPeriods(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await accountingDb.getFiscalPeriodById(input.id);
        }),

      getCurrent: protectedProcedure
        .query(async () => {
          return await accountingDb.getCurrentFiscalPeriod();
        }),

      create: protectedProcedure
        .input(z.object({
          periodName: z.string(),
          startDate: z.date(),
          endDate: z.date(),
          fiscalYear: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.createFiscalPeriod(input);
        }),

      close: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await accountingDb.closeFiscalPeriod(input.id, ctx.user.id);
        }),

      lock: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await accountingDb.lockFiscalPeriod(input.id);
        }),

      reopen: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await accountingDb.reopenFiscalPeriod(input.id);
        }),
    }),

    // Invoices (Accounts Receivable)
    invoices: router({
      list: protectedProcedure
        .input(z.object({
          customerId: z.number().optional(),
          status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await arApDb.getInvoices(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getInvoiceById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          invoiceNumber: z.string(),
          customerId: z.number(),
          invoiceDate: z.date(),
          dueDate: z.date(),
          subtotal: z.string(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          lineItems: z.array(z.object({
            productId: z.number().optional(),
            batchId: z.number().optional(),
            description: z.string(),
            quantity: z.string(),
            unitPrice: z.string(),
            taxRate: z.string().optional(),
            discountPercent: z.string().optional(),
            lineTotal: z.string(),
          })),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { lineItems, ...invoiceData } = input;
          // Calculate amountDue (initially equals totalAmount)
          const totalAmount = parseFloat(invoiceData.totalAmount);
          return await arApDb.createInvoice(
            { 
              ...invoiceData, 
              amountPaid: "0.00",
              amountDue: totalAmount.toFixed(2),
              createdBy: ctx.user.id 
            },
            lineItems
          );
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          invoiceDate: z.date().optional(),
          dueDate: z.date().optional(),
          subtotal: z.string().optional(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await arApDb.updateInvoice(id, data);
        }),

      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "VOID"]),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.updateInvoiceStatus(input.id, input.status);
        }),

      recordPayment: protectedProcedure
        .input(z.object({
          invoiceId: z.number(),
          amount: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.recordInvoicePayment(input.invoiceId, input.amount);
        }),

      getOutstandingReceivables: protectedProcedure
        .query(async () => {
          return await arApDb.getOutstandingReceivables();
        }),

      getARAging: protectedProcedure
        .query(async () => {
          return await arApDb.calculateARAging();
        }),

      generateNumber: protectedProcedure
        .query(async () => {
          return await arApDb.generateInvoiceNumber();
        }),
    }),

    // Bills (Accounts Payable)
    bills: router({
      list: protectedProcedure
        .input(z.object({
          vendorId: z.number().optional(),
          status: z.enum(["DRAFT", "PENDING", "PARTIAL", "PAID", "OVERDUE", "VOID"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await arApDb.getBills(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getBillById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          billNumber: z.string(),
          vendorId: z.number(),
          billDate: z.date(),
          dueDate: z.date(),
          subtotal: z.string(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          lineItems: z.array(z.object({
            productId: z.number().optional(),
            lotId: z.number().optional(),
            description: z.string(),
            quantity: z.string(),
            unitPrice: z.string(),
            taxRate: z.string().optional(),
            discountPercent: z.string().optional(),
            lineTotal: z.string(),
          })),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { lineItems, ...billData } = input;
          // Calculate amountDue (initially equals totalAmount)
          const totalAmount = parseFloat(billData.totalAmount);
          return await arApDb.createBill(
            { 
              ...billData, 
              amountPaid: "0.00",
              amountDue: totalAmount.toFixed(2),
              createdBy: ctx.user.id 
            },
            lineItems
          );
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          billDate: z.date().optional(),
          dueDate: z.date().optional(),
          subtotal: z.string().optional(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await arApDb.updateBill(id, data);
        }),

      updateStatus: protectedProcedure
        .input(z.object({
          id: z.number(),
          status: z.enum(["DRAFT", "PENDING", "PARTIAL", "PAID", "OVERDUE", "VOID"]),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.updateBillStatus(input.id, input.status);
        }),

      recordPayment: protectedProcedure
        .input(z.object({
          billId: z.number(),
          amount: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await arApDb.recordBillPayment(input.billId, input.amount);
        }),

      getOutstandingPayables: protectedProcedure
        .query(async () => {
          return await arApDb.getOutstandingPayables();
        }),

      getAPAging: protectedProcedure
        .query(async () => {
          return await arApDb.calculateAPAging();
        }),

      generateNumber: protectedProcedure
        .query(async () => {
          return await arApDb.generateBillNumber();
        }),
    }),

    // Payments
    payments: router({
      list: protectedProcedure
        .input(z.object({
          paymentType: z.enum(["RECEIVED", "SENT"]).optional(),
          customerId: z.number().optional(),
          vendorId: z.number().optional(),
          invoiceId: z.number().optional(),
          billId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        }))
        .query(async ({ input }) => {
          return await arApDb.getPayments(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getPaymentById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          paymentNumber: z.string(),
          paymentType: z.enum(["RECEIVED", "SENT"]),
          paymentDate: z.date(),
          amount: z.string(),
          paymentMethod: z.enum(["CASH", "CHECK", "WIRE", "ACH", "CREDIT_CARD", "DEBIT_CARD", "OTHER"]),
          referenceNumber: z.string().optional(),
          customerId: z.number().optional(),
          vendorId: z.number().optional(),
          invoiceId: z.number().optional(),
          billId: z.number().optional(),
          bankAccountId: z.number().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await arApDb.createPayment({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      generateNumber: protectedProcedure
        .input(z.object({
          type: z.enum(["RECEIVED", "SENT"]),
        }))
        .query(async ({ input }) => {
          return await arApDb.generatePaymentNumber(input.type);
        }),

      getForInvoice: protectedProcedure
        .input(z.object({ invoiceId: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getPaymentsForInvoice(input.invoiceId);
        }),

      getForBill: protectedProcedure
        .input(z.object({ billId: z.number() }))
        .query(async ({ input }) => {
          return await arApDb.getPaymentsForBill(input.billId);
        }),
    }),

    // Bank Accounts
    bankAccounts: router({
      list: protectedProcedure
        .input(z.object({
          accountType: z.enum(["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"]).optional(),
          isActive: z.boolean().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankAccounts(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankAccountById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          accountName: z.string(),
          accountType: z.enum(["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"]),
          accountNumber: z.string(),
          bankName: z.string(),
          currentBalance: z.string().optional(),
          isActive: z.boolean().optional(),
          ledgerAccountId: z.number().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.createBankAccount(input);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          accountName: z.string().optional(),
          currentBalance: z.string().optional(),
          isActive: z.boolean().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await cashExpensesDb.updateBankAccount(id, data);
        }),

      updateBalance: protectedProcedure
        .input(z.object({
          id: z.number(),
          newBalance: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.updateBankAccountBalance(input.id, input.newBalance);
        }),

      getTotalCashBalance: protectedProcedure
        .query(async () => {
          return await cashExpensesDb.getTotalCashBalance();
        }),
    }),

    // Bank Transactions
    bankTransactions: router({
      list: protectedProcedure
        .input(z.object({
          bankAccountId: z.number().optional(),
          transactionType: z.enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"]).optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          isReconciled: z.boolean().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankTransactions(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankTransactionById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          bankAccountId: z.number(),
          transactionDate: z.date(),
          transactionType: z.enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"]),
          amount: z.string(),
          description: z.string().optional(),
          referenceNumber: z.string().optional(),
          paymentId: z.number().optional(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.createBankTransaction(input);
        }),

      reconcile: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.reconcileBankTransaction(input.id);
        }),

      getUnreconciled: protectedProcedure
        .input(z.object({ bankAccountId: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getUnreconciledTransactions(input.bankAccountId);
        }),

      getBalanceAtDate: protectedProcedure
        .input(z.object({
          bankAccountId: z.number(),
          asOfDate: z.date(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getBankAccountBalanceAtDate(input.bankAccountId, input.asOfDate);
        }),
    }),

    // Expense Categories
    expenseCategories: router({
      list: protectedProcedure
        .input(z.object({
          isActive: z.boolean().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseCategories(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseCategoryById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          categoryName: z.string(),
          description: z.string().optional(),
          ledgerAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.createExpenseCategory(input);
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          categoryName: z.string().optional(),
          description: z.string().optional(),
          ledgerAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await cashExpensesDb.updateExpenseCategory(id, data);
        }),
    }),

    // Expenses
    expenses: router({
      list: protectedProcedure
        .input(z.object({
          categoryId: z.number().optional(),
          vendorId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenses(input);
        }),

      getById: protectedProcedure
        .input(z.object({ id: z.number() }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseById(input.id);
        }),

      create: protectedProcedure
        .input(z.object({
          expenseNumber: z.string(),
          expenseDate: z.date(),
          categoryId: z.number(),
          vendorId: z.number().optional(),
          amount: z.string(),
          taxAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentMethod: z.enum(["CASH", "CHECK", "CREDIT_CARD", "DEBIT_CARD", "BANK_TRANSFER", "OTHER"]),
          bankAccountId: z.number().optional(),
          description: z.string().optional(),
          receiptUrl: z.string().optional(),
          billId: z.number().optional(),
          isReimbursable: z.boolean().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await cashExpensesDb.createExpense({
            ...input,
            createdBy: ctx.user.id,
          });
        }),

      update: protectedProcedure
        .input(z.object({
          id: z.number(),
          expenseDate: z.date().optional(),
          categoryId: z.number().optional(),
          vendorId: z.number().optional(),
          amount: z.string().optional(),
          taxAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          description: z.string().optional(),
          receiptUrl: z.string().optional(),
        }))
        .mutation(async ({ input }) => {
          const { id, ...data } = input;
          return await cashExpensesDb.updateExpense(id, data);
        }),

      markReimbursed: protectedProcedure
        .input(z.object({ id: z.number() }))
        .mutation(async ({ input }) => {
          return await cashExpensesDb.markExpenseReimbursed(input.id);
        }),

      getPendingReimbursements: protectedProcedure
        .query(async () => {
          return await cashExpensesDb.getPendingReimbursements();
        }),

      getBreakdownByCategory: protectedProcedure
        .input(z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getExpenseBreakdownByCategory(input.startDate, input.endDate);
        }),

      getTotalExpenses: protectedProcedure
        .input(z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }))
        .query(async ({ input }) => {
          return await cashExpensesDb.getTotalExpenses(input.startDate, input.endDate);
        }),

      generateNumber: protectedProcedure
        .query(async () => {
          return await cashExpensesDb.generateExpenseNumber();
        }),
    }),
  }),

  // Freeform Notes Router (Advanced Rich Text Notes)
  freeformNotes: router({
    // Get all notes for user
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        includeArchived: z.boolean().optional().default(false),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getUserNotes(
          ctx.user.id,
          input.limit,
          input.offset,
          input.includeArchived
        );
      }),

    // Get single note by ID
    getById: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNoteById(input.noteId, ctx.user.id);
      }),

    // Create new note
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        content: z.any().optional(),
        templateType: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.createNote(ctx.user.id, input);
      }),

    // Update note
    update: protectedProcedure
      .input(z.object({
        noteId: z.number(),
        title: z.string().min(1).max(500).optional(),
        content: z.any().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { noteId, ...data } = input;
        return await freeformNotesDb.updateNote(noteId, ctx.user.id, data);
      }),

    // Delete note
    delete: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.deleteNote(input.noteId, ctx.user.id);
      }),

    // Toggle pin
    togglePin: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.togglePin(input.noteId, ctx.user.id);
      }),

    // Toggle archive
    toggleArchive: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.toggleArchive(input.noteId, ctx.user.id);
      }),

    // Share note
    share: protectedProcedure
      .input(z.object({
        noteId: z.number(),
        shareWithUserIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.shareNote(
          input.noteId,
          ctx.user.id,
          input.shareWithUserIds
        );
      }),

    // Update last viewed
    updateLastViewed: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.updateLastViewed(input.noteId, ctx.user.id);
      }),

    // Search notes
    search: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.searchNotes(ctx.user.id, input.query, input.limit);
      }),

    // Get notes by template
    getByTemplate: protectedProcedure
      .input(z.object({ templateType: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNotesByTemplate(ctx.user.id, input.templateType);
      }),

    // Get notes by tag
    getByTag: protectedProcedure
      .input(z.object({ tag: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNotesByTag(ctx.user.id, input.tag);
      }),

    // Comments
    comments: router({
      list: protectedProcedure
        .input(z.object({ noteId: z.number() }))
        .query(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.getNoteComments(input.noteId, ctx.user.id);
        }),

      add: protectedProcedure
        .input(z.object({
          noteId: z.number(),
          content: z.string().min(1).max(5000),
          parentCommentId: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.addComment(
            input.noteId,
            ctx.user.id,
            input.content,
            input.parentCommentId
          );
        }),

      resolve: protectedProcedure
        .input(z.object({ commentId: z.number() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.resolveComment(input.commentId, ctx.user.id);
        }),
    }),

    // Activity log
    activity: router({
      list: protectedProcedure
        .input(z.object({
          noteId: z.number(),
          limit: z.number().optional().default(50),
        }))
        .query(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.getNoteActivity(
            input.noteId,
            ctx.user.id,
            input.limit
          );
        }),
    }),
  }),

  // Client Management System Router
  clients: router({    // List clients with pagination and filters
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        search: z.string().optional(),
        clientTypes: z.array(z.enum(["buyer", "seller", "brand", "referee", "contractor"])).optional(),
        tags: z.array(z.string()).optional(),
        hasDebt: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return await clientsDb.getClients(input);
      }),

    // Get total count for pagination
    count: protectedProcedure
      .input(z.object({
        search: z.string().optional(),
        clientTypes: z.array(z.enum(["buyer", "seller", "brand", "referee", "contractor"])).optional(),
        tags: z.array(z.string()).optional(),
        hasDebt: z.boolean().optional(),
      }))
      .query(async ({ input }) => {
        return await clientsDb.getClientCount(input);
      }),

    // Get single client by ID
    getById: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await clientsDb.getClientById(input.clientId);
      }),

    // Get client by TERI code
    getByTeriCode: protectedProcedure
      .input(z.object({ teriCode: z.string() }))
      .query(async ({ input }) => {
        return await clientsDb.getClientByTeriCode(input.teriCode);
      }),

    // Create new client
    create: protectedProcedure
      .input(z.object({
        teriCode: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        email: z.string().email().optional(),
        phone: z.string().max(50).optional(),
        address: z.string().optional(),
        isBuyer: z.boolean().optional(),
        isSeller: z.boolean().optional(),
        isBrand: z.boolean().optional(),
        isReferee: z.boolean().optional(),
        isContractor: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.createClient(ctx.user.id, input);
      }),

    // Update client
    update: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(50).optional(),
        address: z.string().optional(),
        isBuyer: z.boolean().optional(),
        isSeller: z.boolean().optional(),
        isBrand: z.boolean().optional(),
        isReferee: z.boolean().optional(),
        isContractor: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { clientId, ...data } = input;
        return await clientsDb.updateClient(clientId, ctx.user.id, data);
      }),

    // Delete client
    delete: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => {
        return await clientsDb.deleteClient(input.clientId);
      }),

    // Transactions
    transactions: router({
      list: protectedProcedure
        .input(z.object({
          clientId: z.number(),
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          search: z.string().optional(),
          transactionType: z.string().optional(),
          paymentStatus: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        }))
        .query(async ({ input }) => {
          const { clientId, ...options } = input;
          return await clientsDb.getClientTransactions(clientId, options);
        }),

      getById: protectedProcedure
        .input(z.object({ transactionId: z.number() }))
        .query(async ({ input }) => {
          return await clientsDb.getTransactionById(input.transactionId);
        }),

      create: protectedProcedure
        .input(z.object({
          clientId: z.number(),
          transactionType: z.enum(["INVOICE", "PAYMENT", "QUOTE", "ORDER", "REFUND", "CREDIT"]),
          transactionNumber: z.string().optional(),
          transactionDate: z.date(),
          amount: z.number(),
          paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"]).optional(),
          paymentDate: z.date().optional(),
          paymentAmount: z.number().optional(),
          notes: z.string().optional(),
          metadata: z.any().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await clientsDb.createTransaction(ctx.user.id, input);
        }),

      update: protectedProcedure
        .input(z.object({
          transactionId: z.number(),
          transactionDate: z.date().optional(),
          amount: z.number().optional(),
          paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"]).optional(),
          paymentDate: z.date().optional(),
          paymentAmount: z.number().optional(),
          notes: z.string().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          const { transactionId, ...data } = input;
          return await clientsDb.updateTransaction(transactionId, ctx.user.id, data);
        }),

      recordPayment: protectedProcedure
        .input(z.object({
          transactionId: z.number(),
          paymentDate: z.date(),
          paymentAmount: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await clientsDb.recordPayment(
            input.transactionId,
            ctx.user.id,
            input.paymentDate,
            input.paymentAmount
          );
        }),

      delete: protectedProcedure
        .input(z.object({ transactionId: z.number() }))
        .mutation(async ({ input }) => {
          return await clientsDb.deleteTransaction(input.transactionId);
        }),
    }),

    // Activity log
    activity: router({
      list: protectedProcedure
        .input(z.object({
          clientId: z.number(),
          limit: z.number().optional().default(50),
        }))
        .query(async ({ input }) => {
          return await clientsDb.getClientActivity(input.clientId, input.limit);
        }),
    }),

    // Tags
    tags: router({
      getAll: protectedProcedure
        .query(async () => {
          return await clientsDb.getAllTags();
        }),

      add: protectedProcedure
        .input(z.object({
          clientId: z.number(),
          tag: z.string().min(1).max(50),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await clientsDb.addTag(input.clientId, ctx.user.id, input.tag);
        }),

      remove: protectedProcedure
        .input(z.object({
          clientId: z.number(),
          tag: z.string(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await clientsDb.removeTag(input.clientId, ctx.user.id, input.tag);
        }),
    }),

    // Client notes
    notes: router({
      getNoteId: protectedProcedure
        .input(z.object({ clientId: z.number() }))
        .query(async ({ input }) => {
          return await clientsDb.getClientNoteId(input.clientId);
        }),

      linkNote: protectedProcedure
        .input(z.object({
          clientId: z.number(),
          noteId: z.number(),
        }))
        .mutation(async ({ input }) => {
          return await clientsDb.linkNoteToClient(input.clientId, input.noteId);
        }),
    }),
  }),

  // Credit Intelligence System Router
  credit: router({
    // Calculate credit limit for a client
    calculate: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        customWeights: z.object({
          revenueMomentumWeight: z.number().min(0).max(100).optional(),
          cashCollectionWeight: z.number().min(0).max(100).optional(),
          profitabilityWeight: z.number().min(0).max(100).optional(),
          debtAgingWeight: z.number().min(0).max(100).optional(),
          repaymentVelocityWeight: z.number().min(0).max(100).optional(),
          tenureWeight: z.number().min(0).max(100).optional(),
        }).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const result = await creditEngine.calculateCreditLimit(input.clientId, input.customWeights);
        // Save to database if no custom weights (i.e., this is the real calculation)
        if (!input.customWeights) {
          await creditEngine.saveCreditLimit(input.clientId, result, ctx.user.id);
        }
        return result;
      }),

    // Get credit limit for a client
    getByClientId: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const db = await import("./db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { clientCreditLimits } = await import("../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const result = await db.select().from(clientCreditLimits).where(eq(clientCreditLimits.clientId, input.clientId)).limit(1);
        return result[0] || null;
      }),

    // Get signal history for a client
    getSignalHistory: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(30),
      }))
      .query(async ({ input }) => {
        const db = await import("./db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditSignalHistory } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        return await db
          .select()
          .from(creditSignalHistory)
          .where(eq(creditSignalHistory.clientId, input.clientId))
          .orderBy(desc(creditSignalHistory.calculatedAt))
          .limit(input.limit);
      }),

    // Get system settings
    getSettings: protectedProcedure
      .query(async () => {
        const db = await import("./db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditSystemSettings } = await import("../drizzle/schema");
        let settings = await db.select().from(creditSystemSettings).limit(1);
        if (settings.length === 0) {
          // Create default settings
          await db.insert(creditSystemSettings).values({});
          settings = await db.select().from(creditSystemSettings).limit(1);
        }
        return settings[0];
      }),

    // Update system settings
    updateSettings: protectedProcedure
      .input(z.object({
        revenueMomentumWeight: z.number().min(0).max(100),
        cashCollectionWeight: z.number().min(0).max(100),
        profitabilityWeight: z.number().min(0).max(100),
        debtAgingWeight: z.number().min(0).max(100),
        repaymentVelocityWeight: z.number().min(0).max(100),
        tenureWeight: z.number().min(0).max(100),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        
        // Validate weights sum to 100
        const sum = input.revenueMomentumWeight + input.cashCollectionWeight + 
                    input.profitabilityWeight + input.debtAgingWeight + 
                    input.repaymentVelocityWeight + input.tenureWeight;
        if (Math.abs(sum - 100) > 0.01) {
          throw new Error("Weights must sum to 100");
        }

        const db = await import("./db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditSystemSettings } = await import("../drizzle/schema");
        
        // Update or create settings
        const existing = await db.select().from(creditSystemSettings).limit(1);
        if (existing.length > 0) {
          await db.update(creditSystemSettings).set({
            ...input,
            updatedBy: ctx.user.id,
          });
        } else {
          await db.insert(creditSystemSettings).values({
            ...input,
            updatedBy: ctx.user.id,
          });
        }
        
        return { success: true };
      }),

    // Get audit log for a client
    getAuditLog: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        const db = await import("./db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");
        const { creditAuditLog } = await import("../drizzle/schema");
        const { eq, desc } = await import("drizzle-orm");
        return await db
          .select()
          .from(creditAuditLog)
          .where(eq(creditAuditLog.clientId, input.clientId))
          .orderBy(desc(creditAuditLog.createdAt))
          .limit(input.limit);
      }),
  }),

  // Pricing Engine Router
  pricing: router({
    // Pricing Rules
    listRules: protectedProcedure
      .query(async () => {
        return await pricingEngine.getPricingRules();
      }),

    getRuleById: protectedProcedure
      .input(z.object({ ruleId: z.number() }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingRuleById(input.ruleId);
      }),

    createRule: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]),
        adjustmentValue: z.number(),
        conditions: z.record(z.string(), z.any()),
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        return await pricingEngine.createPricingRule(input);
      }),

    updateRule: protectedProcedure
      .input(z.object({
        ruleId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        adjustmentType: z.enum(["PERCENT_MARKUP", "PERCENT_MARKDOWN", "DOLLAR_MARKUP", "DOLLAR_MARKDOWN"]).optional(),
        adjustmentValue: z.number().optional(),
        conditions: z.record(z.string(), z.any()).optional(),
        logicType: z.enum(["AND", "OR"]).optional(),
        priority: z.number().optional(),
        isActive: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { ruleId, ...data } = input;
        await pricingEngine.updatePricingRule(ruleId, data);
        return { success: true };
      }),

    deleteRule: protectedProcedure
      .input(z.object({ ruleId: z.number() }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingRule(input.ruleId);
        return { success: true };
      }),

    // Pricing Profiles
    listProfiles: protectedProcedure
      .query(async () => {
        return await pricingEngine.getPricingProfiles();
      }),

    getProfileById: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .query(async ({ input }) => {
        return await pricingEngine.getPricingProfileById(input.profileId);
      }),

    createProfile: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        rules: z.array(z.object({ ruleId: z.number(), priority: z.number() })),
      }))
      .mutation(async ({ input, ctx }) => {
        return await pricingEngine.createPricingProfile({
          ...input,
          createdBy: ctx.user?.id,
        });
      }),

    updateProfile: protectedProcedure
      .input(z.object({
        profileId: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        rules: z.array(z.object({ ruleId: z.number(), priority: z.number() })).optional(),
      }))
      .mutation(async ({ input }) => {
        const { profileId, ...data } = input;
        await pricingEngine.updatePricingProfile(profileId, data);
        return { success: true };
      }),

    deleteProfile: protectedProcedure
      .input(z.object({ profileId: z.number() }))
      .mutation(async ({ input }) => {
        await pricingEngine.deletePricingProfile(input.profileId);
        return { success: true };
      }),

    applyProfileToClient: protectedProcedure
      .input(z.object({ clientId: z.number(), profileId: z.number() }))
      .mutation(async ({ input }) => {
        await pricingEngine.applyProfileToClient(input.clientId, input.profileId);
        return { success: true };
      }),

    // Client Pricing
    getClientPricingRules: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await pricingEngine.getClientPricingRules(input.clientId);
      }),
  }),

  // Sales Sheets Router
  salesSheets: router({
    // Inventory with Pricing
    getInventory: protectedProcedure
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getInventoryWithPricing(input.clientId);
      }),

    // History
    save: protectedProcedure
      .input(z.object({
        clientId: z.number(),
        items: z.array(z.any()),
        totalValue: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await salesSheetsDb.saveSalesSheet({
          ...input,
          createdBy: ctx.user?.id,
        });
      }),

    getHistory: protectedProcedure
      .input(z.object({ 
        clientId: z.number(), 
        limit: z.number().optional() 
      }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getSalesSheetHistory(input.clientId, input.limit);
      }),

    getById: protectedProcedure
      .input(z.object({ sheetId: z.number() }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getSalesSheetById(input.sheetId);
      }),

    delete: protectedProcedure
      .input(z.object({ sheetId: z.number() }))
      .mutation(async ({ input }) => {
        await salesSheetsDb.deleteSalesSheet(input.sheetId);
        return { success: true };
      }),

    // Templates
    createTemplate: protectedProcedure
      .input(z.object({
        name: z.string(),
        clientId: z.number().optional(),
        isUniversal: z.boolean(),
        items: z.array(z.any()),
        columnConfig: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await salesSheetsDb.createTemplate({
          ...input,
          createdBy: ctx.user?.id || 1,
        });
      }),

    getTemplates: protectedProcedure
      .input(z.object({ 
        clientId: z.number().optional(), 
        includeUniversal: z.boolean().optional() 
      }))
      .query(async ({ input }) => {
        return await salesSheetsDb.getTemplates(input.clientId, input.includeUniversal);
      }),

    loadTemplate: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .query(async ({ input }) => {
        return await salesSheetsDb.loadTemplate(input.templateId);
      }),

    deleteTemplate: protectedProcedure
      .input(z.object({ templateId: z.number() }))
      .mutation(async ({ input }) => {
        await salesSheetsDb.deleteTemplate(input.templateId);
        return { success: true };
      }),
  }),
});


export type AppRouter = typeof appRouter;
