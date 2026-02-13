/**
 * Product Images Seeder (idempotent)
 *
 * Seeds `product_images` for batches that currently have zero image rows.
 * Source priority:
 * 1) batch metadata mediaFiles URLs
 * 2) productMedia image URL for that product
 * 3) deterministic placeholder URL
 */

import { db } from "../../db-sync";
import {
  batches,
  productImages,
  productMedia,
  users,
} from "../../../drizzle/schema";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";

type BatchMetadataMediaFile = {
  url?: unknown;
};

function parseMetadataFirstUrl(metadata: unknown): string | null {
  let parsed: unknown = metadata;

  if (typeof metadata === "string") {
    try {
      parsed = JSON.parse(metadata);
    } catch {
      return null;
    }
  }

  if (!parsed || typeof parsed !== "object") {
    return null;
  }

  const mediaFiles = (parsed as { mediaFiles?: unknown }).mediaFiles;
  if (!Array.isArray(mediaFiles)) {
    return null;
  }

  for (const item of mediaFiles as BatchMetadataMediaFile[]) {
    if (typeof item?.url === "string" && item.url.trim().length > 0) {
      return item.url.trim();
    }
  }

  return null;
}

function placeholderImageUrl(batchId: number): string {
  return `https://picsum.photos/seed/terp-batch-${batchId}/1200/1200`;
}

/**
 * Seed product_images using existing media first, placeholder as fallback.
 */
export async function seedProductImages(
  count: number,
  validator: SchemaValidator,
  _masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("product_images");
  const startTime = Date.now();

  return withPerformanceLogging("seed:product_images", async () => {
    try {
      if (count <= 0) {
        result.duration = Date.now() - startTime;
        return result;
      }

      seedLogger.tableSeeding("product_images", count);

      const [systemUser] = await db
        .select({ id: users.id })
        .from(users)
        .orderBy(users.id)
        .limit(1);

      const uploadedBy = systemUser?.id ?? null;

      // Idempotent target set: only batches with no product_images rows.
      const candidates = await db
        .select({
          batchId: batches.id,
          productId: batches.productId,
          metadata: batches.metadata,
        })
        .from(batches)
        .leftJoin(productImages, eq(productImages.batchId, batches.id))
        .where(and(isNull(batches.deletedAt), isNull(productImages.id)))
        .orderBy(desc(batches.id))
        .limit(count);

      if (candidates.length === 0) {
        result.duration = Date.now() - startTime;
        return result;
      }

      const productIds = Array.from(
        new Set(
          candidates
            .map(c => c.productId)
            .filter((id): id is number => typeof id === "number")
        )
      );

      const productFallbackByProductId = new Map<number, string>();
      if (productIds.length > 0) {
        const fallbackRows = await db
          .select({
            productId: productMedia.productId,
            url: productMedia.url,
          })
          .from(productMedia)
          .where(
            and(
              inArray(productMedia.productId, productIds),
              eq(productMedia.type, "image"),
              isNull(productMedia.deletedAt)
            )
          )
          .orderBy(productMedia.productId, productMedia.id);

        for (const row of fallbackRows) {
          if (!productFallbackByProductId.has(row.productId)) {
            productFallbackByProductId.set(row.productId, row.url);
          }
        }
      }

      const records: Array<{
        batchId: number;
        productId: number | null;
        imageUrl: string;
        caption: string | null;
        isPrimary: boolean;
        sortOrder: number;
        status: "APPROVED";
        uploadedBy: number | null;
        uploadedAt: Date;
      }> = [];

      for (const candidate of candidates) {
        const metadataUrl = parseMetadataFirstUrl(candidate.metadata);
        const productFallback =
          candidate.productId !== null
            ? productFallbackByProductId.get(candidate.productId)
            : undefined;
        const imageUrl =
          metadataUrl ??
          productFallback ??
          placeholderImageUrl(candidate.batchId);

        const record = {
          batchId: candidate.batchId,
          productId: candidate.productId,
          imageUrl,
          caption: null,
          isPrimary: true,
          sortOrder: 0,
          status: "APPROVED" as const,
          uploadedBy,
          uploadedAt: new Date(),
        };

        const validation = await validator.validateColumns(
          "product_images",
          record as unknown as Record<string, unknown>
        );

        if (!validation.valid) {
          result.errors.push(
            `Batch ${candidate.batchId}: ${validation.errors
              .map(e => e.message)
              .join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(record);
      }

      if (records.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < records.length; i += batchSize) {
          const chunk = records.slice(i, i + batchSize);
          await db.insert(productImages).values(chunk);
          result.inserted += chunk.length;
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded(
        "product_images",
        result.inserted,
        result.duration
      );
      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(
        error instanceof Error ? error.message : String(error)
      );
      seedLogger.operationFailure(
        "seed:product_images",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}
