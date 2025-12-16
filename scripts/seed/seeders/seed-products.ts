/**
 * Product Seeder
 *
 * Seeds the products table with realistic cannabis product data.
 * Depends on: brands (created automatically if needed)
 */

import { db } from "../../db-sync";
import { products, brands, strains } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import type { SchemaValidator } from "../lib/validation";
import type { PIIMasker } from "../lib/data-masking";
import { seedLogger, withPerformanceLogging } from "../lib/logging";
import { createSeederResult, type SeederResult } from "./index";
import { faker } from "@faker-js/faker";

// ============================================================================
// Product Data Templates
// ============================================================================

const STRAIN_NAMES = [
  "OG Kush", "Blue Dream", "Girl Scout Cookies", "Sour Diesel", "Gelato",
  "Wedding Cake", "Zkittlez", "Purple Punch", "Gorilla Glue", "Jack Herer",
  "White Widow", "Northern Lights", "AK-47", "Pineapple Express", "Granddaddy Purple",
  "Durban Poison", "Green Crack", "Trainwreck", "Bubba Kush", "Chemdawg",
  "Runtz", "Ice Cream Cake", "Mimosa", "MAC", "Gary Payton",
  "Biscotti", "London Pound Cake", "Cereal Milk", "Apple Fritter", "Jealousy",
];

const GROW_TYPES = ["Indoor", "Greenhouse", "Outdoor"];
const GRADES = ["AAA", "AA", "A"];

const PRODUCT_CATEGORIES = {
  Flower: { subcategories: ["Whole Flower", "Smalls", "Shake", "Pre-Ground"], uom: "LB" },
  Concentrates: { subcategories: ["Shatter", "Wax", "Live Resin", "Distillate", "Rosin"], uom: "G" },
  Edibles: { subcategories: ["Gummies", "Chocolates", "Baked Goods", "Beverages"], uom: "EA" },
  PreRolls: { subcategories: ["Single", "Multi-Pack", "Infused"], uom: "EA" },
  Vapes: { subcategories: ["Cartridge", "Disposable", "Pod"], uom: "EA" },
};

// ============================================================================
// Product Generation
// ============================================================================

interface ProductData {
  brandId: number;
  strainId: number | null;
  nameCanonical: string;
  category: string;
  subcategory: string | null;
  uomSellable: string;
  description: string | null;
}

/**
 * Generate a flower product
 */
function generateFlowerProduct(
  brandId: number,
  strainId: number | null,
  strainName: string,
  index: number
): ProductData {
  const growType = GROW_TYPES[index % GROW_TYPES.length];
  const grade = GRADES[Math.floor(index / GROW_TYPES.length) % GRADES.length];
  const subcategory = PRODUCT_CATEGORIES.Flower.subcategories[
    Math.floor(index / (GROW_TYPES.length * GRADES.length)) % PRODUCT_CATEGORIES.Flower.subcategories.length
  ];

  return {
    brandId,
    strainId,
    nameCanonical: `${strainName} - ${growType} ${grade} ${subcategory}`,
    category: "Flower",
    subcategory,
    uomSellable: PRODUCT_CATEGORIES.Flower.uom,
    description: `${grade} grade ${growType.toLowerCase()} grown ${strainName}. ${subcategory}.`,
  };
}

/**
 * Generate a non-flower product
 */
function generateNonFlowerProduct(
  brandId: number,
  strainId: number | null,
  strainName: string,
  index: number
): ProductData {
  const categories = Object.keys(PRODUCT_CATEGORIES).filter((c) => c !== "Flower");
  const category = categories[index % categories.length] as keyof typeof PRODUCT_CATEGORIES;
  const categoryConfig = PRODUCT_CATEGORIES[category];
  const subcategory = categoryConfig.subcategories[index % categoryConfig.subcategories.length];

  return {
    brandId,
    strainId,
    nameCanonical: `${strainName} ${category} - ${subcategory}`,
    category,
    subcategory,
    uomSellable: categoryConfig.uom,
    description: `${strainName} ${subcategory.toLowerCase()} ${category.toLowerCase()}.`,
  };
}

// ============================================================================
// Seeder Implementation
// ============================================================================

/**
 * Seed products table
 */
export async function seedProducts(
  count: number,
  validator: SchemaValidator,
  masker: PIIMasker
): Promise<SeederResult> {
  const result = createSeederResult("products");
  const startTime = Date.now();

  return withPerformanceLogging("seed:products", async () => {
    try {
      seedLogger.tableSeeding("products", count);

      // Ensure default brand exists
      let defaultBrandId: number;
      const existingBrands = await db.select({ id: brands.id }).from(brands).limit(1);
      
      if (existingBrands.length === 0) {
        const [insertedBrand] = await db.insert(brands).values({
          name: "TERP House Brand",
          description: "Default brand for all products",
          vendorId: null,
          deletedAt: null,
        });
        defaultBrandId = insertedBrand.insertId;
        seedLogger.foreignKeyResolved("products", "brandId", "brands", defaultBrandId);
      } else {
        defaultBrandId = existingBrands[0].id;
      }

      // Ensure strains exist
      const existingStrains = await db.select({ id: strains.id, name: strains.name }).from(strains);
      let strainMap: Map<string, number> = new Map();

      if (existingStrains.length === 0) {
        // Create strains
        for (const strainName of STRAIN_NAMES) {
          const [inserted] = await db.insert(strains).values({
            name: strainName,
            standardizedName: strainName.toLowerCase().trim(),
            category: faker.helpers.arrayElement(["Indica", "Sativa", "Hybrid"]),
          });
          strainMap.set(strainName, inserted.insertId);
        }
      } else {
        existingStrains.forEach((s) => strainMap.set(s.name, s.id));
      }

      const strainNames = Array.from(strainMap.keys());
      const records: ProductData[] = [];
      const batchSize = 50;

      // 90% flower products, 10% non-flower
      const flowerCount = Math.floor(count * 0.9);
      const nonFlowerCount = count - flowerCount;

      // Generate flower products
      for (let i = 0; i < flowerCount; i++) {
        const strainName = strainNames[i % strainNames.length];
        const strainId = strainMap.get(strainName) ?? null;
        const product = generateFlowerProduct(defaultBrandId, strainId, strainName, i);

        const validation = await validator.validateColumns("products", product);
        if (!validation.valid) {
          result.errors.push(
            `Flower ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(product);
      }

      // Generate non-flower products
      for (let i = 0; i < nonFlowerCount; i++) {
        const strainName = strainNames[i % strainNames.length];
        const strainId = strainMap.get(strainName) ?? null;
        const product = generateNonFlowerProduct(defaultBrandId, strainId, strainName, i);

        const validation = await validator.validateColumns("products", product);
        if (!validation.valid) {
          result.errors.push(
            `NonFlower ${i}: ${validation.errors.map((e) => e.message).join(", ")}`
          );
          result.skipped++;
          continue;
        }

        records.push(product);
      }

      // Insert in batches
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await db.insert(products).values(batch);
        result.inserted += batch.length;

        if (count > 100 && (i + batchSize) % 100 === 0) {
          seedLogger.operationProgress(
            "seed:products",
            Math.min(i + batchSize, records.length),
            records.length
          );
        }
      }

      result.duration = Date.now() - startTime;
      seedLogger.tableSeeded("products", result.inserted, result.duration);

      return result;
    } catch (error) {
      result.duration = Date.now() - startTime;
      result.errors.push(error instanceof Error ? error.message : String(error));
      seedLogger.operationFailure(
        "seed:products",
        error instanceof Error ? error : new Error(String(error)),
        { inserted: result.inserted }
      );
      return result;
    }
  });
}


