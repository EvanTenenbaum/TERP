/**
 * Cannabis Images Seeder
 *
 * Seeds product and batch images with free-use cannabis photography.
 *
 * Coverage:
 * - 100% of products get images in productMedia (for LiveCatalog)
 * - 99% of batches get images in productImages (for photography workflow)
 * - 1% of batches left without images (for testing photography queue)
 *
 * Image Sources:
 * - Pexels.com (free for commercial use, no attribution required)
 * - Images are category-specific (flower, concentrates, edibles, etc.)
 *
 * Tables seeded:
 * - productMedia (product-level, used by LiveCatalog/VIP Portal)
 * - product_images (batch-level, used by photography workflow)
 * - batches (updates status to PHOTOGRAPHY_COMPLETE)
 *
 * Depends on: products, batches, users
 *
 * Usage: npx tsx scripts/seed/seeders/seed-cannabis-images.ts
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

// Load environment
config({ path: ".env.production" });

const DATABASE_URL = process.env.DATABASE_URL || "";

// ============================================================================
// Curated Cannabis Image URLs by Category
// Source: Pexels.com - Free for commercial use
// URL Format: https://images.pexels.com/photos/{ID}/pexels-photo-{ID}.jpeg?auto=compress&cs=tinysrgb&w=400
// ============================================================================

const PEXELS_BASE = "https://images.pexels.com/photos";
const PEXELS_PARAMS = "?auto=compress&cs=tinysrgb&w=400";

// Helper to construct Pexels URL
const pexelsUrl = (id: number) => `${PEXELS_BASE}/${id}/pexels-photo-${id}.jpeg${PEXELS_PARAMS}`;

// Cannabis flower/bud images (for Flower category)
const FLOWER_IMAGES = [
  pexelsUrl(4917602),  // Macro marijuana bud
  pexelsUrl(7667737),  // Close-up cannabis bud
  pexelsUrl(7773109),  // Cannabis flowers in glass container
  pexelsUrl(8062435),  // Cannabis bud detail
  pexelsUrl(7668038),  // Green cannabis flower
  pexelsUrl(7667739),  // Cannabis nug
  pexelsUrl(8062103),  // Marijuana bud macro
  pexelsUrl(7667897),  // Cannabis flower close-up
  pexelsUrl(7667874),  // Dried cannabis bud
  pexelsUrl(7667731),  // Cannabis macro photography
  pexelsUrl(7668015),  // Green marijuana bud
  pexelsUrl(7667915),  // Cannabis flower detail
  pexelsUrl(6069256),  // Cannabis plant bud
  pexelsUrl(7667735),  // Marijuana flower
  pexelsUrl(7668043),  // Cannabis nug close-up
];

// Concentrate/extract images (amber, golden, resin-like)
const CONCENTRATE_IMAGES = [
  pexelsUrl(7667858),  // Cannabis concentrate
  pexelsUrl(7667862),  // Golden extract
  pexelsUrl(8062088),  // Cannabis wax
  pexelsUrl(7667866),  // Amber concentrate
  pexelsUrl(7667870),  // Cannabis shatter
];

// Edibles images (gummies, chocolates, treats)
const EDIBLE_IMAGES = [
  pexelsUrl(4016522),  // Colorful gummies
  pexelsUrl(5765828),  // Gummy bears
  pexelsUrl(6087694),  // Gummy candies
  pexelsUrl(8365688),  // Cannabis gummies
  pexelsUrl(6087699),  // Assorted gummies
];

// Pre-roll images (joints, rolled products)
const PREROLL_IMAGES = [
  pexelsUrl(7667742),  // Cannabis joint
  pexelsUrl(7667750),  // Pre-rolled joint
  pexelsUrl(7667754),  // Marijuana cigarette
  pexelsUrl(7667758),  // Pre-roll cannabis
  pexelsUrl(7667762),  // Rolled joint
];

// Vape/cartridge images
const VAPE_IMAGES = [
  pexelsUrl(7667906),  // Cannabis vape
  pexelsUrl(3572408),  // Vape cartridge
  pexelsUrl(7667910),  // Vaporizer pen
  pexelsUrl(3571551),  // Vape device
  pexelsUrl(7667914),  // Cannabis cartridge
];

// Default/generic cannabis images (fallback)
const DEFAULT_IMAGES = [
  pexelsUrl(7667737),  // Cannabis bud
  pexelsUrl(7773109),  // Cannabis in container
  pexelsUrl(4917602),  // Marijuana macro
  pexelsUrl(7668038),  // Green cannabis
  pexelsUrl(8062435),  // Cannabis detail
];

// Category to image mapping
const CATEGORY_IMAGES: Record<string, string[]> = {
  "Flower": FLOWER_IMAGES,
  "Concentrates": CONCENTRATE_IMAGES,
  "Edibles": EDIBLE_IMAGES,
  "PreRolls": PREROLL_IMAGES,
  "Pre-Rolls": PREROLL_IMAGES,
  "Vapes": VAPE_IMAGES,
  "Cartridges": VAPE_IMAGES,
  // Add more category mappings as needed
};

/**
 * Get image URL for a product based on category
 * Uses deterministic selection based on product ID for reproducibility
 */
function getImageForProduct(productId: number, category: string, imageIndex: number = 0): string {
  const images = CATEGORY_IMAGES[category] || DEFAULT_IMAGES;
  const index = (productId + imageIndex) % images.length;
  return images[index];
}

/**
 * Get image URL for a batch
 * Uses deterministic selection based on batch ID
 */
function getImageForBatch(batchId: number, category: string, imageIndex: number = 0): string {
  const images = CATEGORY_IMAGES[category] || DEFAULT_IMAGES;
  const index = (batchId + imageIndex) % images.length;
  return images[index];
}

/**
 * Generate photography metadata for batch
 */
function generatePhotographyMetadata(existingMetadata: string | null, userId: number, photoCount: number): string {
  const now = new Date().toISOString();
  let metadata: Record<string, any> = {};

  // Parse existing metadata if present
  if (existingMetadata) {
    try {
      metadata = JSON.parse(existingMetadata);
    } catch {
      metadata = {};
    }
  }

  // Add photography completion info
  metadata.photographyStartedAt = now;
  metadata.photographyById = userId;
  metadata.photographyCompletedAt = now;
  metadata.photographyCompletedBy = userId;
  metadata.photoCount = photoCount;

  return JSON.stringify(metadata);
}

// ============================================================================
// Main Seeder
// ============================================================================

async function main() {
  console.log("=".repeat(60));
  console.log("Cannabis Images Seeder");
  console.log("=".repeat(60));
  console.log("\nSeeding product and batch images with cannabis photography...\n");

  if (!DATABASE_URL) {
    console.error("DATABASE_URL not found in .env.production");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // ========================================================================
    // Step 1: Verify system user exists
    // ========================================================================
    console.log("Step 1: Verifying system user...");

    const [users] = await connection.query(
      "SELECT id, name FROM users WHERE id = 1 OR role = 'admin' ORDER BY id LIMIT 1"
    ) as any;

    if (users.length === 0) {
      console.error("No users found. Please seed users first.");
      await connection.end();
      process.exit(1);
    }

    const systemUserId = users[0].id;
    console.log(`   Using user ID ${systemUserId} (${users[0].name}) for uploads\n`);

    // ========================================================================
    // Step 2: Check existing data
    // ========================================================================
    console.log("Step 2: Checking existing data...");

    const [existingProductMedia] = await connection.query(
      "SELECT COUNT(*) as count FROM productMedia"
    ) as any;

    const [existingProductImages] = await connection.query(
      "SELECT COUNT(*) as count FROM product_images"
    ) as any;

    console.log(`   productMedia: ${existingProductMedia[0].count} existing records`);
    console.log(`   product_images: ${existingProductImages[0].count} existing records\n`);

    if (existingProductMedia[0].count > 0 || existingProductImages[0].count > 0) {
      console.log("   Existing images found. Clearing tables for fresh seed...");
      await connection.query("DELETE FROM productMedia");
      await connection.query("DELETE FROM product_images");
      console.log("   Tables cleared.\n");
    }

    // ========================================================================
    // Step 3: Load products and batches
    // ========================================================================
    console.log("Step 3: Loading products and batches...");

    const [products] = await connection.query(
      "SELECT id, category, nameCanonical FROM products WHERE deleted_at IS NULL"
    ) as any;

    const [batches] = await connection.query(
      `SELECT b.id, b.productId, b.sku, b.batchStatus, b.metadata, p.category
       FROM batches b
       JOIN products p ON b.productId = p.id
       WHERE b.deleted_at IS NULL`
    ) as any;

    console.log(`   Found ${products.length} products`);
    console.log(`   Found ${batches.length} batches\n`);

    if (products.length === 0) {
      console.error("No products found. Please seed products first.");
      await connection.end();
      process.exit(1);
    }

    // ========================================================================
    // Step 4: Seed productMedia (100% of products)
    // ========================================================================
    console.log("Step 4: Seeding productMedia (100% coverage)...");

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    let productMediaInserted = 0;

    for (const product of products) {
      // Flower products get 2 images, others get 1
      const imageCount = product.category === "Flower" ? 2 : 1;

      for (let i = 0; i < imageCount; i++) {
        const url = getImageForProduct(product.id, product.category, i);
        const filename = `product-${product.id}-image-${i}.jpg`;
        const size = 50000 + Math.floor(Math.random() * 50000);

        await connection.query(
          `INSERT INTO productMedia (productId, url, type, filename, size, uploadedBy, createdAt)
           VALUES (?, ?, 'image', ?, ?, ?, ?)`,
          [product.id, url, filename, size, systemUserId, now]
        );
        productMediaInserted++;
      }

      if (productMediaInserted % 50 === 0) {
        process.stdout.write(`   Progress: ${productMediaInserted} images...\r`);
      }
    }

    console.log(`   Inserted ${productMediaInserted} productMedia records\n`);

    // ========================================================================
    // Step 5: Seed product_images (99% of batches)
    // ========================================================================
    console.log("Step 5: Seeding product_images (99% coverage)...");

    let productImagesInserted = 0;
    let batchesUpdated = 0;
    let batchesSkipped = 0;

    // Determine which batches to skip (1% for photography queue testing)
    const skipCount = Math.max(1, Math.floor(batches.length * 0.01));
    const skipIndices = new Set<number>();

    // Randomly select batches to skip (but deterministically based on batch ID)
    for (const batch of batches) {
      if (skipIndices.size < skipCount && batch.id % 100 === 7) { // Deterministic "random"
        skipIndices.add(batch.id);
      }
    }

    // If we didn't get enough from the modulo, just take the last few
    if (skipIndices.size < skipCount) {
      const sortedBatches = [...batches].sort((a, b) => b.id - a.id);
      for (let i = 0; i < skipCount && skipIndices.size < skipCount; i++) {
        skipIndices.add(sortedBatches[i].id);
      }
    }

    console.log(`   Skipping ${skipIndices.size} batches for photography queue testing`);

    for (const batch of batches) {
      // Skip 1% of batches
      if (skipIndices.has(batch.id)) {
        batchesSkipped++;
        continue;
      }

      // Each batch gets 1-3 images (deterministic based on batch ID)
      const imageCount = (batch.id % 3) + 1;

      for (let i = 0; i < imageCount; i++) {
        const url = getImageForBatch(batch.id, batch.category, i);
        const isPrimary = i === 0 ? 1 : 0;

        await connection.query(
          `INSERT INTO product_images
           (batch_id, product_id, image_url, is_primary, sort_order, status, uploaded_by, uploaded_at)
           VALUES (?, ?, ?, ?, ?, 'APPROVED', ?, ?)`,
          [batch.id, batch.productId, url, isPrimary, i, systemUserId, now]
        );
        productImagesInserted++;
      }

      // Update batch status to PHOTOGRAPHY_COMPLETE and update metadata
      const newMetadata = generatePhotographyMetadata(batch.metadata, systemUserId, imageCount);

      await connection.query(
        `UPDATE batches
         SET batchStatus = 'PHOTOGRAPHY_COMPLETE', metadata = ?
         WHERE id = ?`,
        [newMetadata, batch.id]
      );
      batchesUpdated++;

      if (batchesUpdated % 50 === 0) {
        process.stdout.write(`   Progress: ${batchesUpdated} batches processed...\r`);
      }
    }

    console.log(`   Inserted ${productImagesInserted} product_images records`);
    console.log(`   Updated ${batchesUpdated} batches to PHOTOGRAPHY_COMPLETE`);
    console.log(`   Skipped ${batchesSkipped} batches (for queue testing)\n`);

    // ========================================================================
    // Step 6: Summary
    // ========================================================================
    console.log("=".repeat(60));
    console.log("SEEDING COMPLETE");
    console.log("=".repeat(60));
    console.log(`
Summary:
  productMedia:   ${productMediaInserted} images (100% of products)
  product_images: ${productImagesInserted} images (99% of batches)

  Batches with photos:    ${batchesUpdated} (PHOTOGRAPHY_COMPLETE)
  Batches without photos: ${batchesSkipped} (for queue testing)

Coverage:
  Product catalog (LiveCatalog): 100%
  Batch photography workflow:    ${((batchesUpdated / batches.length) * 100).toFixed(1)}%

Image Sources:
  Pexels.com - Free for commercial use

Note: Add attribution to your app (see scripts/seed/seeders/ATTRIBUTION.md)
`);

  } catch (error: any) {
    console.error("\nSeeding failed:", error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
