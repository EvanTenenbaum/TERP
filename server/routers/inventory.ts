import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as inventoryDb from "../inventoryDb";
import * as inventoryUtils from "../inventoryUtils";
import type { Batch } from "../../drizzle/schema";

export const inventoryRouter = router({
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
  })
