/**
 * Realistic Product Media Seeder
 *
 * Seeds the productMedia table with category-specific images using Loremflickr.
 * Each category gets relevant search terms for more realistic demo images.
 *
 * Depends on: products, users (uploadedBy)
 *
 * Usage: npx tsx scripts/seed/seeders/seed-product-media-realistic.ts
 */

import mysql from "mysql2/promise";
import { config } from "dotenv";
import { existsSync } from "fs";

// Try multiple env file locations
const envPaths = [".env", ".env.local", ".env.production"];
for (const envPath of envPaths) {
  if (existsSync(envPath)) {
    config({ path: envPath });
    console.log(`📁 Loaded environment from ${envPath}`);
    break;
  }
}

const DATABASE_URL = process.env.DATABASE_URL || "";

// ============================================================================
// Category-specific image configuration
// ============================================================================

interface CategoryImageConfig {
  keywords: string[];
  imageCount: number;
}

const CATEGORY_IMAGES: Record<string, CategoryImageConfig> = {
  // Flower - cannabis buds, marijuana flower
  "Flower": {
    keywords: ["cannabis,flower,bud", "marijuana,plant,green", "hemp,flower,natural"],
    imageCount: 2,
  },
  // Concentrates - wax, shatter, extracts
  "Concentrates": {
    keywords: ["amber,resin,gold", "honey,wax,golden", "crystal,extract,glass"],
    imageCount: 1,
  },
  // Edibles - gummies, chocolates, candy
  "Edibles": {
    keywords: ["gummy,candy,colorful", "chocolate,treat,sweet", "brownie,food,dessert"],
    imageCount: 1,
  },
  // PreRolls - joints, cigarettes
  "PreRolls": {
    keywords: ["cigarette,roll,paper", "joint,tobacco,smoke", "cigar,rolled,natural"],
    imageCount: 1,
  },
  // Vapes - cartridges, vaporizers
  "Vapes": {
    keywords: ["vape,cartridge,device", "vaporizer,electronic,modern", "pen,sleek,tech"],
    imageCount: 1,
  },
};

// Default for any unknown category
const DEFAULT_CONFIG: CategoryImageConfig = {
  keywords: ["product,package,modern"],
  imageCount: 1,
};

/**
 * Generate a Loremflickr URL with category-specific keywords
 * Using product ID as a lock parameter for some consistency
 */
function generateImageUrl(productId: number, category: string, imageIndex: number): string {
  const config = CATEGORY_IMAGES[category] || DEFAULT_CONFIG;
  const keywordSet = config.keywords[imageIndex % config.keywords.length];
  // Add lock parameter for some image consistency per product
  const lock = productId * 10 + imageIndex;
  return `https://loremflickr.com/400/400/${keywordSet}?lock=${lock}`;
}

/**
 * Generate filename for the image
 */
function generateFilename(productId: number, imageIndex: number): string {
  return `product-${productId}-image-${imageIndex}.jpg`;
}

/**
 * Get image count for a category
 */
function getImageCount(category: string): number {
  return (CATEGORY_IMAGES[category] || DEFAULT_CONFIG).imageCount;
}

// ============================================================================
// Main Seeder
// ============================================================================

async function main() {
  console.log("🌱 Starting Realistic Product Media Seeder...\n");
  console.log("📸 Using Loremflickr with category-specific keywords:\n");

  for (const [category, config] of Object.entries(CATEGORY_IMAGES)) {
    console.log(`   ${category}: ${config.keywords.join(" | ")}`);
  }
  console.log("");

  if (!DATABASE_URL) {
    console.error("❌ DATABASE_URL not found. Please ensure .env file exists.");
    console.error("   Tried: " + envPaths.join(", "));
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
      console.log(`   To re-seed, first run: DELETE FROM productMedia;\n`);

      const readline = await import("readline");
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await new Promise<string>((resolve) => {
        rl.question("   Do you want to DELETE existing records and re-seed? (yes/no): ", resolve);
      });
      rl.close();

      if (answer.toLowerCase() === "yes") {
        console.log("\n🗑️  Deleting existing productMedia records...");
        await connection.query("DELETE FROM productMedia");
        console.log("   Done.\n");
      } else {
        console.log("\n   Exiting without changes.");
        await connection.end();
        process.exit(0);
      }
    }

    // Get all products with their categories
    const [products] = await connection.query(
      "SELECT id, category, nameCanonical FROM products WHERE deletedAt IS NULL ORDER BY id"
    ) as any;

    if (products.length === 0) {
      console.error("❌ No products found. Seed products first.");
      await connection.end();
      process.exit(1);
    }

    console.log(`📦 Found ${products.length} products to seed images for...\n`);

    // Count by category
    const categoryCounts: Record<string, number> = {};
    for (const product of products) {
      categoryCounts[product.category] = (categoryCounts[product.category] || 0) + 1;
    }
    console.log("   Category breakdown:");
    for (const [cat, count] of Object.entries(categoryCounts)) {
      console.log(`   - ${cat}: ${count} products`);
    }
    console.log("");

    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const uploadedBy = 1; // System user
    let inserted = 0;

    // Generate and insert images
    for (const product of products) {
      const imageCount = getImageCount(product.category);

      for (let i = 0; i < imageCount; i++) {
        const url = generateImageUrl(product.id, product.category, i);
        const filename = generateFilename(product.id, i);
        const size = 50000 + Math.floor(Math.random() * 50000); // 50-100KB

        await connection.query(
          `INSERT INTO productMedia (productId, url, type, filename, size, uploadedBy, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [product.id, url, "image", filename, size, uploadedBy, now]
        );
        inserted++;
      }

      // Progress indicator every 50 products
      if (inserted % 50 === 0) {
        console.log(`   Progress: ${inserted} images inserted...`);
      }
    }

    console.log(`\n✅ Successfully seeded ${inserted} product images!`);
    console.log(`\n💡 Note: Loremflickr images load dynamically. First page load may be slow.`);

  } catch (error: any) {
    console.error("❌ Seeding failed:", error.message);
    process.exit(1);
  } finally {
    await connection.end();
  }
}

main();
