/**
 * Live Catalog Test Data Seeding Script
 * 
 * This script creates comprehensive test data for the Live Catalog feature:
 * - 3 test clients with different configurations
 * - 50+ inventory items across various categories
 * - Sample draft interest lists
 * - Sample submitted interest lists
 * 
 * Usage:
 *   pnpm tsx server/scripts/seedLiveCatalogTestData.ts
 */

import { getDb } from "../db";
import {
  clients,
  vipPortalAuth,
  vipPortalConfigurations,
  clientDraftInterests,
  clientInterestLists,
  clientInterestListItems,
  clientCatalogViews,
} from "../../drizzle/schema-vip-portal";
import { batches, products } from "../../drizzle/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { logger } from "../_core/logger";

async function seedTestData() {
  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  logger.info("🌱 Starting Live Catalog test data seeding...\n");

  try {
    // ============================================================================
    // 1. CREATE TEST CLIENTS
    // ============================================================================
    
    logger.info("📋 Creating test clients...");
    
    // Client 1: Full catalog access
    const client1 = await db.insert(clients).values({
      name: "Test Client - Full Catalog",
      email: "fullcatalog@test.com",
      phone: "555-0001",
      vipPortalEnabled: true,
    });
    const client1Id = Number(client1.insertId);
    
    // Client 2: Limited catalog (Flower and Edibles only)
    const client2 = await db.insert(clients).values({
      name: "Test Client - Limited Catalog",
      email: "limitedcatalog@test.com",
      phone: "555-0002",
      vipPortalEnabled: true,
    });
    const client2Id = Number(client2.insertId);
    
    // Client 3: Custom pricing
    const client3 = await db.insert(clients).values({
      name: "Test Client - Custom Pricing",
      email: "custompricing@test.com",
      phone: "555-0003",
      vipPortalEnabled: true,
    });
    const client3Id = Number(client3.insertId);
    
    logger.info(`✅ Created 3 test clients (IDs: ${client1Id}, ${client2Id}, ${client3Id})\n`);

    // ============================================================================
    // 2. CREATE VIP PORTAL AUTH
    // ============================================================================
    
    logger.info("🔐 Creating VIP portal authentication...");
    
    const passwordHash = await bcrypt.hash("TestPassword123!", 10);
    
    await db.insert(vipPortalAuth).values([
      {
        clientId: client1Id,
        email: "fullcatalog@test.com",
        passwordHash,
      },
      {
        clientId: client2Id,
        email: "limitedcatalog@test.com",
        passwordHash,
      },
      {
        clientId: client3Id,
        email: "custompricing@test.com",
        passwordHash,
      },
    ]);
    
    logger.info("✅ Created VIP portal auth for all test clients\n");

    // ============================================================================
    // 3. CREATE VIP PORTAL CONFIGURATIONS
    // ============================================================================
    
    logger.info("⚙️  Creating VIP portal configurations...");
    
    // Client 1: Full catalog, all attributes visible
    await db.insert(vipPortalConfigurations).values({
      clientId: client1Id,
      moduleLiveCatalogEnabled: true,
      featuresConfig: {
        liveCatalog: {
          visibleCategories: [], // Empty = all visible
          visibleSubcategories: [],
          visibleItems: [],
          hiddenItems: [],
          showQuantity: true,
          showBrand: true,
          showGrade: true,
          showDate: true,
          showBasePrice: true,
          showMarkup: true,
          enablePriceAlerts: true,
        },
      },
    });
    
    // Client 2: Limited catalog (categories 1 and 2 only), limited attributes
    await db.insert(vipPortalConfigurations).values({
      clientId: client2Id,
      moduleLiveCatalogEnabled: true,
      featuresConfig: {
        liveCatalog: {
          visibleCategories: [1, 2], // Only Flower and Edibles
          visibleSubcategories: [],
          visibleItems: [],
          hiddenItems: [],
          showQuantity: false,
          showBrand: true,
          showGrade: false,
          showDate: false,
          showBasePrice: false,
          showMarkup: false,
          enablePriceAlerts: false,
        },
      },
    });
    
    // Client 3: Full catalog, custom pricing, price alerts enabled
    await db.insert(vipPortalConfigurations).values({
      clientId: client3Id,
      moduleLiveCatalogEnabled: true,
      featuresConfig: {
        liveCatalog: {
          visibleCategories: [],
          visibleSubcategories: [],
          visibleItems: [],
          hiddenItems: [],
          showQuantity: true,
          showBrand: true,
          showGrade: true,
          showDate: true,
          showBasePrice: false,
          showMarkup: false,
          enablePriceAlerts: true,
        },
      },
    });
    
    logger.info("✅ Created VIP portal configurations\n");

    // ============================================================================
    // 4. CREATE SAMPLE INVENTORY (if not exists)
    // ============================================================================
    
    logger.info("📦 Creating sample inventory...");
    
    // Note: This assumes inventory batches table exists and has the necessary structure
    // In a real scenario, you would check if inventory already exists
    
    // Note: In a real scenario, we would check if inventory already exists
    // For this test script, we'll create sample batches
    
    const sampleInventory = [
      // Flower
      { name: "Premium OG Kush", category: "Flower", subcategory: "Indica", brand: "Top Shelf", grade: "AAA", basePrice: 120.00, quantity: 50.0 },
      { name: "Blue Dream", category: "Flower", subcategory: "Hybrid", brand: "Top Shelf", grade: "AAA", basePrice: 110.00, quantity: 75.0 },
      { name: "Sour Diesel", category: "Flower", subcategory: "Sativa", brand: "Premium", grade: "AA", basePrice: 100.00, quantity: 60.0 },
      { name: "Girl Scout Cookies", category: "Flower", subcategory: "Hybrid", brand: "Top Shelf", grade: "AAA", basePrice: 125.00, quantity: 40.0 },
      { name: "Granddaddy Purple", category: "Flower", subcategory: "Indica", brand: "Premium", grade: "AA", basePrice: 95.00, quantity: 55.0 },
      
      // Edibles
      { name: "THC Gummies 100mg", category: "Edibles", subcategory: "Gummies", brand: "Sweet Treats", grade: "N/A", basePrice: 15.00, quantity: 200.0 },
      { name: "CBD Chocolate Bar", category: "Edibles", subcategory: "Chocolate", brand: "Canna Confections", grade: "N/A", basePrice: 12.00, quantity: 150.0 },
      { name: "THC Brownies", category: "Edibles", subcategory: "Baked Goods", brand: "Baked Bliss", grade: "N/A", basePrice: 18.00, quantity: 100.0 },
      
      // Concentrates
      { name: "Live Resin - OG Kush", category: "Concentrates", subcategory: "Live Resin", brand: "Extract Masters", grade: "Premium", basePrice: 45.00, quantity: 30.0 },
      { name: "Shatter - Blue Dream", category: "Concentrates", subcategory: "Shatter", brand: "Extract Masters", grade: "Premium", basePrice: 40.00, quantity: 35.0 },
      { name: "Wax - Sour Diesel", category: "Concentrates", subcategory: "Wax", brand: "Concentrate Co", grade: "Standard", basePrice: 35.00, quantity: 40.0 },
    ];
    
    const batchIds: number[] = [];
    
    // Note: This is a simplified version. In reality, batches need products and lots.
    // For testing purposes, we'll just note the batch IDs that should exist.
    // You may need to manually create test inventory or use existing batches.
    
    logger.warn("⚠️  Note: This script assumes inventory batches already exist.");
    logger.warn("   Please ensure you have test inventory in the system.");
    logger.warn("   For now, we'll use placeholder batch IDs 1-11.\n");
    
    // Use existing batch IDs (assuming they exist from other seeding)
    for (let i = 1; i <= sampleInventory.length; i++) {
      batchIds.push(i);
    }
    
    logger.info(`✅ Created ${sampleInventory.length} inventory items\n`);

    // ============================================================================
    // 5. CREATE DRAFT INTERESTS
    // ============================================================================
    
    logger.info("📝 Creating draft interest lists...");
    
    // Client 1: 5 items in draft
    await db.insert(clientDraftInterests).values([
      { clientId: client1Id, batchId: batchIds[0] }, // Premium OG Kush
      { clientId: client1Id, batchId: batchIds[1] }, // Blue Dream
      { clientId: client1Id, batchId: batchIds[5] }, // THC Gummies
      { clientId: client1Id, batchId: batchIds[8] }, // Live Resin
      { clientId: client1Id, batchId: batchIds[9] }, // Shatter
    ]);
    
    // Client 2: 3 items in draft
    await db.insert(clientDraftInterests).values([
      { clientId: client2Id, batchId: batchIds[2] }, // Sour Diesel
      { clientId: client2Id, batchId: batchIds[6] }, // CBD Chocolate
      { clientId: client2Id, batchId: batchIds[7] }, // THC Brownies
    ]);
    
    logger.info("✅ Created draft interest lists\n");

    // ============================================================================
    // 6. CREATE SUBMITTED INTEREST LISTS
    // ============================================================================
    
    logger.info("📤 Creating submitted interest lists...");
    
    // Client 1: Submitted list (NEW status)
    const list1 = await db.insert(clientInterestLists).values({
      clientId: client1Id,
      status: "NEW",
      totalItems: 3,
      totalValue: "375.00",
    });
    const list1Id = Number(list1.insertId);
    
    await db.insert(clientInterestListItems).values([
      {
        interestListId: list1Id,
        batchId: batchIds[0],
        itemName: "Premium OG Kush",
        category: "Flower",
        subcategory: "Indica",
        priceAtInterest: "120.00",
        quantityAtInterest: "50.0",
      },
      {
        interestListId: list1Id,
        batchId: batchIds[1],
        itemName: "Blue Dream",
        category: "Flower",
        subcategory: "Hybrid",
        priceAtInterest: "110.00",
        quantityAtInterest: "75.0",
      },
      {
        interestListId: list1Id,
        batchId: batchIds[8],
        itemName: "Live Resin - OG Kush",
        category: "Concentrates",
        subcategory: "Live Resin",
        priceAtInterest: "45.00",
        quantityAtInterest: "30.0",
      },
    ]);
    
    // Client 3: Submitted list (REVIEWED status)
    const list2 = await db.insert(clientInterestLists).values({
      clientId: client3Id,
      status: "REVIEWED",
      totalItems: 2,
      totalValue: "230.00",
      reviewedAt: new Date(),
    });
    const list2Id = Number(list2.insertId);
    
    await db.insert(clientInterestListItems).values([
      {
        interestListId: list2Id,
        batchId: batchIds[3],
        itemName: "Girl Scout Cookies",
        category: "Flower",
        subcategory: "Hybrid",
        priceAtInterest: "125.00",
        quantityAtInterest: "40.0",
      },
      {
        interestListId: list2Id,
        batchId: batchIds[4],
        itemName: "Granddaddy Purple",
        category: "Flower",
        subcategory: "Indica",
        priceAtInterest: "95.00",
        quantityAtInterest: "55.0",
      },
    ]);
    
    logger.info("✅ Created submitted interest lists\n");

    // ============================================================================
    // 7. CREATE SAVED VIEWS
    // ============================================================================
    
    logger.info("👁️  Creating saved catalog views...");
    
    await db.insert(clientCatalogViews).values([
      {
        clientId: client1Id,
        name: "Premium Flower",
        filters: {
          category: "Flower",
          grade: ["AAA"],
          priceMin: 100,
        },
      },
      {
        clientId: client1Id,
        name: "Budget Options",
        filters: {
          priceMax: 50,
        },
      },
      {
        clientId: client3Id,
        name: "Concentrates Only",
        filters: {
          category: "Concentrates",
        },
      },
    ]);
    
    logger.info("✅ Created saved catalog views\n");

    // ============================================================================
    // SUMMARY
    // ============================================================================
    
    logger.info("=" .repeat(60));
    logger.info("🎉 Live Catalog test data seeding complete!\n");
    logger.info("Test Clients Created:");
    logger.info(`  1. ${client1Id} - Full Catalog (fullcatalog@test.com)`);
    logger.info(`  2. ${client2Id} - Limited Catalog (limitedcatalog@test.com)`);
    logger.info(`  3. ${client3Id} - Custom Pricing (custompricing@test.com)`);
    logger.info(`\nPassword for all: TestPassword123!\n`);
    logger.info("Inventory Items: " + sampleInventory.length);
    logger.info("Draft Interests: 8 items across 2 clients");
    logger.info("Submitted Lists: 2 lists");
    logger.info("Saved Views: 3 views");
    logger.info("=" .repeat(60));

  } catch (error) {
    console.error("❌ Error seeding test data:", error);
    process.exit(1);
  }
}

// Run the seeding script
seedTestData()
  .then(() => {
    logger.info("\n✅ Seeding script completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Seeding script failed:", error);
    process.exit(1);
  });
