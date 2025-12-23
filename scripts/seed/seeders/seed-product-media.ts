/**
 * Product Media Seeder
 *
 * Seeds the productMedia table with placeholder images for testing.
 * Uses picsum.photos for reliable, varied placeholder images.
 *
 * Depends on: products, users (uploadedBy)
 * 
 * Usage: npx tsx scripts/seed/seeders/seed-product-media.ts
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";

// Load production environment
config({ path: ".env.production" });

const DATABASE_URL = process.env.DATABASE_URL || "";

// ============================================================================
// Image Generation
// ============================================================================

/**
 * Generate a deterministic placeholder image URL for a product
 * Uses picsum.photos with seed for reproducible images
 */
function generateImageUrl(productId: number, imageIndex: number): string {
  // Use product ID and index as seed for deterministic, varied images
  const seed = `terp-product-${productId}-${imageIndex}`;
  // 400x400 is good for mobile and desktop cards
  return `https://picsum.photos/seed/${seed}/400/400`;
}

/**
 * Generate filename for the image
 */
function generateFilename(productId: number, imageIndex: number): string {
  return `product-${productId}-image-${imageIndex}.jpg`;
}

// ============================================================================
// Main Seeder
// ============================================================================

async function main() {
  console.log("🌱 Starting Product Media Seeder...\n");

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found in .env.production");
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    uri: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Check for existing records
    const [existingRows] = await connection.query(
      "SELECT COUNT(*) as count FROM productMedia"
    ) as any;
    
    if (existingRows[0].count > 0) {
      console.log(`⚠️  productMedia already has ${existingRows[0].count} records.`);
      console.log(`   To re-seed, first run: DELETE FROM productMedia;`);
      await connection.end();
      process.exit(0);
    }

    // Get all products
    const [products] = await connection.query(
      "SELECT id, category FROM products"
    ) as any;

    if (products.length === 0) {
      console.error("❌ No products found. Seed products first.");
      await connection.end();
      process.exit(1);
    }

    console.log(`📸 Seeding images for ${products.length} products...`);

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const uploadedBy = 1; // System user
    let inserted = 0;

    // Generate and insert images
    for (const product of products) {
      // Flower products get 2 images, others get 1
      const imageCount = product.category === "Flower" ? 2 : 1;

      for (let i = 0; i < imageCount; i++) {
        const url = generateImageUrl(product.id, i);
        const filename = generateFilename(product.id, i);
        const size = 50000 + Math.floor(Math.random() * 50000); // 50-100KB

        await connection.query(
          `INSERT INTO productMedia (productId, url, type, filename, size, uploadedBy, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [product.id, url, "image", filename, size, uploadedBy, now]
        );
        inserted++;
      }

      // Progress indicator every 20 products
      if (inserted % 40 === 0) {
        console.log(`   Progress: ${inserted} images inserted...`);
      }
    }

    console.log(`\n✅ Successfully seeded ${inserted} product images`);

  } catch (error: any) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
