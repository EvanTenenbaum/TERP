/**
 * Inventory Intake Service
 * Handles transactional batch intake operations
 *
 * TERP-INIT-005 Phase 1: Critical Fixes
 * - Entire intake flow wrapped in database transaction
 * - Atomic sequence generation for lot and batch codes
 * - All entity creation (vendor, brand, product, lot, batch, location, audit) is atomic
 * - Rollback on any failure to maintain data integrity
 *
 * TER-1228: Progress tracking and rollback UX
 * - Track each step of the multi-entity transaction
 * - Return progress information for UI display
 * - Support rollback of partially completed transactions
 */

import { TRPCError } from "@trpc/server";
import type {
  IntakeProgress,
  IntakeStepName,
  IntakeProgressUpdate,
} from "@shared/intakeProgress";
import { createInitialProgress, updateProgress } from "@shared/intakeProgress";
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
  clients,
  type Vendor,
  type Brand,
  type Product,
  type Lot,
  type Batch,
} from "../drizzle/schema";
import { eq, isNull, and } from "drizzle-orm";
import * as inventoryUtils from "./inventoryUtils";
import { findOrCreate } from "./_core/dbUtils";
import { logger } from "./_core/logger";
import { withRetryableTransaction } from "./dbTransaction";
import {
  buildInsertedBatchSnapshot,
  insertBatchWithCompatibility,
} from "./lib/batchInsertCompatibility";
// MEET-005, MEET-006: Import payables service for consigned inventory tracking
import * as payablesService from "./services/payablesService";

type SqlErrorLike = {
  code?: string;
  errno?: number | string;
  message?: string;
  sqlMessage?: string;
  cause?: unknown;
};

function isDuplicateEntryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const sqlError = error as SqlErrorLike;
  const code = (sqlError.code ?? "").toUpperCase();
  const errno = String(sqlError.errno ?? "");
  const message =
    (typeof sqlError.message === "string" ? sqlError.message : "") +
    " " +
    (typeof sqlError.sqlMessage === "string" ? sqlError.sqlMessage : "");

  if (
    code === "ER_DUP_ENTRY" ||
    errno === "1062" ||
    message.toLowerCase().includes("duplicate entry")
  ) {
    return true;
  }

  return isDuplicateEntryError(sqlError.cause);
}

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
  actorId: number;
}

export interface IntakeResult {
  success: boolean;
  batch: Batch;
  vendor: Vendor;
  brand: Brand;
  product: Product;
  lot: Lot;
  progress: IntakeProgress;
}

export interface IntakeError extends Error {
  progress: IntakeProgress;
}

/**
 * Process inventory intake with full transaction support
 * ✅ FIXED: Entire operation wrapped in transaction (TERP-INIT-005 Phase 1)
 * ✅ TER-1228: Progress tracking and rollback support
 *
 * @param input Intake parameters
 * @returns Intake result with created entities and progress information
 */
export async function processIntake(input: IntakeInput): Promise<IntakeResult> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // TER-1228: Initialize progress tracking
  let progress = createInitialProgress();

  const updateStep = (update: IntakeProgressUpdate) => {
    progress = updateProgress(progress, update);
  };

  try {
    // Step 1: Validate COGS
    updateStep({ step: "VALIDATE_COGS", status: "running" });
    const cogsValidation = inventoryUtils.validateCOGS(
      input.cogsMode,
      input.unitCogs,
      input.unitCogsMin,
      input.unitCogsMax
    );
    if (!cogsValidation.valid) {
      updateStep({
        step: "VALIDATE_COGS",
        status: "failed",
        error: cogsValidation.error,
      });
      const error = new Error(cogsValidation.error) as IntakeError;
      error.progress = progress;
      throw error;
    }
    updateStep({ step: "VALIDATE_COGS", status: "complete" });

    // Wrap entire intake operation in a retryable transaction to absorb transient
    // lock waits/deadlocks under concurrent intake load.
    const result = await withRetryableTransaction(
      async tx => {
        // Step 2: Find or create vendor

        updateStep({ step: "CREATE_VENDOR", status: "running" });

        const vendor = await findOrCreate<typeof vendors, Vendor>(
          tx,
          vendors,
          [eq(vendors.name, input.vendorName)],
          { name: input.vendorName }
        );

        // Step 3: Look up supplier in clients table


        updateStep({ step: "LOOKUP_SUPPLIER", status: "running" });
        const [supplierClient] = await tx
          .select({ id: clients.id })
          .from(clients)
          .where(
            and(
              eq(clients.name, input.vendorName),
              eq(clients.isSeller, true),
              isNull(clients.deletedAt)
            )
          )
          .limit(1);

        // Step 4: Find or create brand


        updateStep({ step: "CREATE_BRAND", status: "running" });


        const brand = await findOrCreate<typeof brands, Brand>(
          tx,
          brands,
          [eq(brands.name, input.brandName), eq(brands.vendorId, vendor.id)],
          { name: input.brandName, vendorId: vendor.id }
        );

        // Step 5: Find or create product


        updateStep({ step: "CREATE_PRODUCT", status: "running" });
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

        // Step 6: Generate lot code and create lot


        updateStep({ step: "CREATE_LOT", status: "running" });
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
              supplierClientId: supplierClient?.id ?? null,
              date: new Date(),
            })
            .$returningId();

          const [newLot] = await tx
            .select()
            .from(lots)
            .where(eq(lots.id, created.id));

          lot = newLot;
        }
        updateStep({ step: "CREATE_LOT", status: "complete", entityId: lot.id });

        // Step 7: Generate batch code and create batch


        updateStep({ step: "CREATE_BATCH", status: "running" });
        let batchCode = await inventoryUtils.generateBatchCode();
        const brandKey = inventoryUtils.normalizeToKey(brand.name);
        const productKey = inventoryUtils.normalizeToKey(product.nameCanonical);
        const skuDate = new Date();
        let skuSequence = 1;
        let sku = inventoryUtils.generateSKU(
          brandKey,
          productKey,
          skuDate,
          skuSequence
        );

        // Prevent duplicate-SKU insert failures for repeated intake of the same
        // brand/product/day combination by bumping sequence until available.
        const maxSkuAttempts = 10_000;

        while (true) {
          const [existingSku] = await tx
            .select({ id: batches.id })
            .from(batches)
            .where(eq(batches.sku, sku))
            .limit(1);

          if (!existingSku) break;

          skuSequence += 1;
          if (skuSequence > maxSkuAttempts) {
            throw new Error(
              `Failed to generate unique SKU for ${brandKey}/${productKey} after ${maxSkuAttempts} attempts`
            );
          }
          sku = inventoryUtils.generateSKU(
            brandKey,
            productKey,
            skuDate,
            skuSequence
          );
        }

        // 6. Create batch
        // MEET-006: Determine ownership type based on payment terms if not explicitly set
        const ownershipType =
          input.ownershipType ||
          (input.paymentTerms === "CONSIGNMENT" ? "CONSIGNED" : "OFFICE_OWNED");

        let batch: Batch | undefined;
        while (!batch) {
          try {
            const batchPayload = {
              code: batchCode,
              sku,
              productId: product.id,
              lotId: lot.id,
              batchStatus: "AWAITING_INTAKE",
              grade: input.grade ?? null,
              isSample: 0,
              sampleOnly: 0,
              sampleAvailable: 0,
              cogsMode: input.cogsMode,
              unitCogs: input.unitCogs ?? null,
              unitCogsMin: input.unitCogsMin ?? null,
              unitCogsMax: input.unitCogsMax ?? null,
              paymentTerms: input.paymentTerms,
              ownershipType, // MEET-006
              amountPaid: "0",
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
            } as const;

            const batchId = await insertBatchWithCompatibility(
              tx,
              batchPayload
            );

            if (!batchId) {
              throw new Error("Failed to create batch");
            }

            // Legacy staging does not expose the full modern batches schema.
            // Build the newly created batch from the insert payload instead of
            // immediately re-querying incompatible columns.
            batch = buildInsertedBatchSnapshot(batchId, batchPayload);
            updateStep({
              step: "CREATE_BATCH",
              status: "complete",
              entityId: batch.id,
            });
          } catch (insertError) {
            if (!isDuplicateEntryError(insertError)) {
              throw insertError;
            }

            // Any duplicate-key race (SKU/code) gets a fresh candidate and retries.
            skuSequence += 1;
            if (skuSequence > maxSkuAttempts) {
              throw new Error(
                `Failed to generate unique SKU for ${brandKey}/${productKey} after ${maxSkuAttempts} attempts`
              );
            }
            sku = inventoryUtils.generateSKU(
              brandKey,
              productKey,
              skuDate,
              skuSequence
            );
            batchCode = await inventoryUtils.generateBatchCode();
          }
        }

        // Persist intake-uploaded media as batch images (Photography source of truth)
        if (input.mediaUrls && input.mediaUrls.length > 0) {
          await tx.insert(productImages).values(
            input.mediaUrls.map((media, index) => ({
              batchId: batch.id,
              productId: product.id,
              imageUrl: media.url,
              thumbnailUrl: null,
              caption: media.fileName ? media.fileName.slice(0, 255) : null,
              isPrimary: index === 0,
              sortOrder: index,
              status: "APPROVED" as const,
              uploadedBy: input.actorId,
              uploadedAt: new Date(),
              deletedAt: null,
            }))
          );
        }

        // Step 8: Create batch location


        updateStep({ step: "CREATE_LOCATION", status: "running" });
        const [locationResult] = await tx
          .insert(batchLocations)
          .values({
            batchId: batch.id,
            site: input.location.site,
            zone: input.location.zone,
            rack: input.location.rack,
            shelf: input.location.shelf,
            bin: input.location.bin,
            qty: inventoryUtils.formatQty(input.quantity),
            deletedAt: null,
          })
          .$returningId();
        updateStep({
          step: "CREATE_LOCATION",
          status: "complete",
          entityId: locationResult.id,
        });

        // Step 9: Create audit log


        updateStep({ step: "CREATE_AUDIT", status: "running" });
        const [auditResult] = await tx
          .insert(auditLogs)
          .values({
            actorId: input.actorId,
            entity: "Batch",
            entityId: batch.id,
            action: "CREATED",
            before: null,
            after: inventoryUtils.createAuditSnapshot(batch),
            reason: "Initial intake",
            deletedAt: null,
          })
          .$returningId();
        updateStep({
          step: "CREATE_AUDIT",
          status: "complete",
          entityId: auditResult.id,
        });

        return {
          success: true,
          batch,
          vendor,
          brand,
          product,
          lot,
          progress,
        };
      },
      // Intake can burst with parallel creates (vendor/brand/product SKU races).
      // A few extra retries on fresh snapshots removes most transient collisions.
      { maxRetries: 5, timeout: 30, retryOnDuplicateKey: true }
    );

    // Step 10: Create payable for consigned inventory (optional, non-fatal)


    if (result.batch.ownershipType === "CONSIGNED") {
      try {
        const cogsPerUnit =
          parseFloat(input.unitCogs || "0") ||
          (parseFloat(input.unitCogsMin || "0") +
            parseFloat(input.unitCogsMax || "0")) /
            2;

        const [supplierClient] = await db
          .select()
          .from(clients)
          .where(eq(clients.name, input.vendorName))
          .limit(1);

        if (supplierClient) {
          updateStep({ step: "CREATE_PAYABLE", status: "running" });
          const payableId = await payablesService.createPayable(
            {
              batchId: result.batch.id,
              lotId: result.lot.id,
              vendorClientId: supplierClient.id,
              cogsPerUnit,
            },
            input.actorId
          );
          updateStep({
            step: "CREATE_PAYABLE",
            status: "complete",
            entityId: payableId,
          });
          logger.info({
            msg: "[MEET-005] Created payable for consigned batch",
            batchId: result.batch.id,
            vendorClientId: supplierClient.id,
            cogsPerUnit,
          });
        } else {
          logger.warn({
            msg: "[MEET-005] Supplier client not found, payable not created",
            vendorName: input.vendorName,
            batchId: result.batch.id,
          });
        }
      } catch (payableError) {
        logger.error({
          msg: "[MEET-005] Failed to create payable (non-fatal)",
          error:
            payableError instanceof Error
              ? payableError.message
              : String(payableError),
          batchId: result.batch.id,
        });
      }
    }

    return result;
    return { ...result, progress };
  } catch (error) {
    logger.error({ error }, "Error processing intake");

    // If error already has progress attached, preserve it
    if (error && typeof error === "object" && "progress" in error) {
      const intakeError = error as IntakeError;
      logger.error({
        msg: "Intake failed with progress",
        progress: intakeError.progress,
      });
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Intake failed",
        cause: {
          originalError: error,
          progress: intakeError.progress,
        },
      });
    }
    if (error instanceof TRPCError) {
      throw error;
    }
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: `Failed to process intake: ${error instanceof Error ? error.message : "Unknown error"}`,
      cause: {
        originalError: error,
        progress,
      },
    });
  }
}
