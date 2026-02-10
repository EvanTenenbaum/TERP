/**
 * Inventory Intake Service
 * Handles transactional batch intake operations
 *
 * TERP-INIT-005 Phase 1: Critical Fixes
 * - Entire intake flow wrapped in database transaction
 * - Atomic sequence generation for lot and batch codes
 * - All entity creation (vendor, brand, product, lot, batch, location, audit) is atomic
 * - Rollback on any failure to maintain data integrity
 */

import { getDb } from "./db";
import {
  vendors,
  brands,
  products,
  lots,
  batches,
  batchLocations,
  productImages,
  auditLogs,
  type Vendor,
  type Brand,
  type Product,
  type Lot,
  type Batch,
} from "../drizzle/schema";
import { eq } from "drizzle-orm";
import * as inventoryUtils from "./inventoryUtils";
import { findOrCreate } from "./_core/dbUtils";
import { logger } from "./_core/logger";
// MEET-005, MEET-006: Import payables service for consigned inventory tracking
import * as payablesService from "./services/payablesService";

export interface IntakeInput {
  vendorName: string;
  brandName: string;
  productName: string;
  category: string;
  subcategory?: string;
  grade?: string;
  strainId?: number | null;
  quantity: number;
  cogsMode: "FIXED" | "RANGE";
  unitCogs?: string;
  unitCogsMin?: string;
  unitCogsMax?: string;
  paymentTerms:
    | "COD"
    | "NET_7"
    | "NET_15"
    | "NET_30"
    | "CONSIGNMENT"
    | "PARTIAL";
  // MEET-006: Ownership type for inventory tracking
  ownershipType?: "CONSIGNED" | "OFFICE_OWNED" | "SAMPLE";
  location: {
    site: string;
    zone?: string;
    rack?: string;
    shelf?: string;
    bin?: string;
  };
  metadata?: Record<string, unknown>;
  mediaUrls?: Array<{
    url: string;
    fileName: string;
    fileType: string;
    fileSize: number;
  }>;
  userId: number;
}

export interface IntakeResult {
  success: boolean;
  batch: Batch;
  vendor: Vendor;
  brand: Brand;
  product: Product;
  lot: Lot;
}

/**
 * Process inventory intake with full transaction support
 * ✅ FIXED: Entire operation wrapped in transaction (TERP-INIT-005 Phase 1)
 *
 * @param input Intake parameters
 * @returns Intake result with created entities
 */
export async function processIntake(input: IntakeInput): Promise<IntakeResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  try {
    // Validate COGS before starting transaction
    const cogsValidation = inventoryUtils.validateCOGS(
      input.cogsMode,
      input.unitCogs,
      input.unitCogsMin,
      input.unitCogsMax
    );
    if (!cogsValidation.valid) {
      throw new Error(cogsValidation.error);
    }

    // Wrap entire intake operation in transaction
    const result = await db.transaction(async tx => {
      // 1. Find or create vendor
      // ✅ REFACTORED: TERP-INIT-005 Phase 4 - Use reusable findOrCreate utility
      const vendor = await findOrCreate<typeof vendors, Vendor>(
        tx,
        vendors,
        [eq(vendors.name, input.vendorName)],
        { name: input.vendorName }
      );

      // 2. Find or create brand
      // ✅ REFACTORED: TERP-INIT-005 Phase 4 - Use reusable findOrCreate utility
      const brand = await findOrCreate<typeof brands, Brand>(
        tx,
        brands,
        [eq(brands.name, input.brandName), eq(brands.vendorId, vendor.id)],
        { name: input.brandName, vendorId: vendor.id }
      );

      // 3. Find or create product
      // ✅ REFACTORED: TERP-INIT-005 Phase 4 - Use reusable findOrCreate utility
      const normalizedProductName = inventoryUtils.normalizeProductName(
        input.productName
      );
      // SCHEMA-016: Removed strainId from insert - column doesn't exist in production
      // strainId will be added when migration is run
      const product = await findOrCreate<typeof products, Product>(
        tx,
        products,
        [
          eq(products.nameCanonical, normalizedProductName),
          eq(products.brandId, brand.id),
        ],
        {
          brandId: brand.id,
          nameCanonical: normalizedProductName,
          category: input.category,
          subcategory: input.subcategory,
          // Note: strainId omitted - column pending migration (SCHEMA-016)
        }
      );

      // 4. Generate lot code and create lot
      // Note: Sequence generation happens outside transaction but is atomic
      const lotCode = await inventoryUtils.generateLotCode();

      const [existingLot] = await tx
        .select()
        .from(lots)
        .where(eq(lots.code, lotCode))
        .limit(1);

      let lot: Lot;
      if (existingLot) {
        lot = existingLot;
      } else {
        const [created] = await tx
          .insert(lots)
          .values({
            code: lotCode,
            vendorId: vendor.id,
            date: new Date(),
          })
          .$returningId();

        const [newLot] = await tx
          .select()
          .from(lots)
          .where(eq(lots.id, created.id));

        lot = newLot;
      }

      // 5. Generate batch code and SKU
      const batchCode = await inventoryUtils.generateBatchCode();
      const brandKey = inventoryUtils.normalizeToKey(brand.name);
      const productKey = inventoryUtils.normalizeToKey(product.nameCanonical);
      const sku = inventoryUtils.generateSKU(
        brandKey,
        productKey,
        new Date(),
        1
      );

      // 6. Create batch
      // MEET-006: Determine ownership type based on payment terms if not explicitly set
      const ownershipType =
        input.ownershipType ||
        (input.paymentTerms === "CONSIGNMENT" ? "CONSIGNED" : "OFFICE_OWNED");

      const [batchCreated] = await tx
        .insert(batches)
        .values({
          code: batchCode,
          sku: sku,
          productId: product.id,
          lotId: lot.id,
          batchStatus: "AWAITING_INTAKE",
          grade: input.grade,
          isSample: 0,
          sampleOnly: 0,
          sampleAvailable: 0,
          cogsMode: input.cogsMode,
          unitCogs: input.unitCogs,
          unitCogsMin: input.unitCogsMin,
          unitCogsMax: input.unitCogsMax,
          paymentTerms: input.paymentTerms,
          ownershipType: ownershipType, // MEET-006
          metadata: (() => {
            const metadata = input.metadata || {};
            if (input.mediaUrls && input.mediaUrls.length > 0) {
              metadata.mediaFiles = input.mediaUrls;
            }
            return Object.keys(metadata).length > 0
              ? inventoryUtils.stringifyMetadata(metadata)
              : null;
          })(),
          onHandQty: inventoryUtils.formatQty(input.quantity),
          sampleQty: "0",
          reservedQty: "0",
          quarantineQty: "0",
          holdQty: "0",
          defectiveQty: "0",
          publishEcom: 0,
          publishB2b: 0,
        })
        .$returningId();

      const [batch] = await tx
        .select()
        .from(batches)
        .where(eq(batches.id, batchCreated.id));

      if (!batch) {
        throw new Error("Failed to create batch");
      }

      // Persist intake media onto the batch's canonical media table.
      // Intake uploads happen before the batch exists (client uploads -> gets URLs),
      // so we link them here transactionally.
      if (input.mediaUrls && input.mediaUrls.length > 0) {
        await tx.insert(productImages).values(
          input.mediaUrls.map((media, index) => ({
            batchId: batch.id,
            productId: product.id,
            imageUrl: media.url,
            caption: media.fileName,
            isPrimary: index === 0,
            sortOrder: index,
            status: "APPROVED",
            uploadedBy: input.userId,
            uploadedAt: new Date(),
          }))
        );
      }

      // 7. Create batch location
      await tx.insert(batchLocations).values({
        batchId: batch.id,
        site: input.location.site,
        zone: input.location.zone,
        rack: input.location.rack,
        shelf: input.location.shelf,
        bin: input.location.bin,
        qty: inventoryUtils.formatQty(input.quantity),
      });

      // 8. Create audit log
      await tx.insert(auditLogs).values({
        actorId: input.userId,
        entity: "Batch",
        entityId: batch.id,
        action: "CREATED",
        after: inventoryUtils.createAuditSnapshot(batch),
        reason: "Initial intake",
      });

      // 9. MEET-005: Create payable for consigned inventory
      if (ownershipType === "CONSIGNED") {
        try {
          // Get COGS for payable calculation
          const cogsPerUnit =
            parseFloat(input.unitCogs || "0") ||
            (parseFloat(input.unitCogsMin || "0") +
              parseFloat(input.unitCogsMax || "0")) /
              2;

          // Find supplier client ID for the vendor
          const { clients } = await import("../drizzle/schema");
          const [supplierClient] = await tx
            .select()
            .from(clients)
            .where(eq(clients.name, input.vendorName))
            .limit(1);

          if (supplierClient) {
            await payablesService.createPayable(
              {
                batchId: batch.id,
                lotId: lot.id,
                vendorClientId: supplierClient.id,
                cogsPerUnit,
              },
              input.userId
            );
            logger.info({
              msg: "[MEET-005] Created payable for consigned batch",
              batchId: batch.id,
              vendorClientId: supplierClient.id,
              cogsPerUnit,
            });
          } else {
            logger.warn({
              msg: "[MEET-005] Supplier client not found, payable not created",
              vendorName: input.vendorName,
              batchId: batch.id,
            });
          }
        } catch (payableError) {
          logger.error({
            msg: "[MEET-005] Failed to create payable (non-fatal)",
            error:
              payableError instanceof Error
                ? payableError.message
                : String(payableError),
            batchId: batch.id,
          });
        }
      }

      return {
        success: true,
        batch,
        vendor,
        brand,
        product,
        lot,
      };
    });

    return result;
  } catch (error) {
    logger.error({ error }, "Error processing intake");
    throw new Error(
      `Failed to process intake: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}
