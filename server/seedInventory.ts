import * as inventoryDb from "./inventoryDb";
import { logger } from "./_core/logger";

export async function seedInventoryData() {
  logger.info("Seeding inventory data...");

  // Create vendors
  const vendors = [
    { name: "Green Valley Farms" },
    { name: "Pacific Northwest Growers" },
    { name: "Sunrise Botanicals" },
  ];

  for (const vendor of vendors) {
    await inventoryDb.createVendor(vendor);
  }

  logger.info("✓ Created vendors");

  // Create brands
  const brands = [
    { name: "Premium Organics", vendorId: 1 },
    { name: "Craft Cannabis Co", vendorId: 1 },
    { name: "Northwest Reserve", vendorId: 2 },
    { name: "Botanical Excellence", vendorId: 3 },
  ];

  for (const brand of brands) {
    await inventoryDb.createBrand(brand);
  }

  logger.info("✓ Created brands");

  // Create products
  const products = [
    { brandId: 1, nameCanonical: "Gelato #41", category: "Flower", subcategory: "Hybrid" },
    { brandId: 1, nameCanonical: "Blue Dream", category: "Flower", subcategory: "Sativa" },
    { brandId: 2, nameCanonical: "Wedding Cake", category: "Flower", subcategory: "Indica" },
    { brandId: 2, nameCanonical: "Live Resin Cart", category: "Vape", subcategory: "Concentrate" },
    { brandId: 3, nameCanonical: "OG Kush", category: "Flower", subcategory: "Indica" },
    { brandId: 4, nameCanonical: "Sour Diesel", category: "Flower", subcategory: "Sativa" },
  ];

  for (const product of products) {
    await inventoryDb.createProduct(product);
  }

  logger.info("✓ Created products");

  // Create lots
  const today = new Date();
  const lots = [
    { code: "LOT-WH1-20250123", vendorId: 1, date: today },
    { code: "LOT-WH1-20250122", vendorId: 2, date: new Date(today.getTime() - 86400000) },
    { code: "LOT-WH2-20250123", vendorId: 3, date: today },
  ];

  for (const lot of lots) {
    await inventoryDb.createLot(lot);
  }

  logger.info("✓ Created lots");

  // Create batches
  const batches = [
    {
      code: "LOT-WH1-20250123-001",
      sku: "PREM-GELA-250123-001",
      productId: 1,
      lotId: 1,
      status: "LIVE" as const,
      grade: "A",
      isSample: 0,
      cogsMode: "FIXED" as const,
      unitCogs: "25.00",
      paymentTerms: "NET_30" as const,
      onHandQty: "1000.00",
      reservedQty: "200.00",
      quarantineQty: "0.00",
      holdQty: "0.00",
      defectiveQty: "0.00",
    },
    {
      code: "LOT-WH1-20250123-002",
      sku: "PREM-BLUE-250123-002",
      productId: 2,
      lotId: 1,
      status: "LIVE" as const,
      grade: "A",
      isSample: 0,
      cogsMode: "RANGE" as const,
      unitCogsMin: "18.00",
      unitCogsMax: "22.00",
      paymentTerms: "NET_30" as const,
      onHandQty: "750.00",
      reservedQty: "100.00",
      quarantineQty: "0.00",
      holdQty: "0.00",
      defectiveQty: "0.00",
    },
    {
      code: "LOT-WH1-20250122-001",
      sku: "CRAF-WEDD-250122-001",
      productId: 3,
      lotId: 2,
      status: "LIVE" as const,
      grade: "B",
      isSample: 0,
      cogsMode: "RANGE" as const,
      unitCogsMin: "18.00",
      unitCogsMax: "28.00",
      paymentTerms: "NET_15" as const,
      onHandQty: "500.00",
      reservedQty: "0.00",
      quarantineQty: "50.00",
      holdQty: "0.00",
      defectiveQty: "0.00",
    },
    {
      code: "LOT-WH2-20250123-001",
      sku: "NORT-OGKU-250123-001",
      productId: 5,
      lotId: 3,
      status: "LIVE" as const,
      grade: "A",
      isSample: 0,
      cogsMode: "FIXED" as const,
      unitCogs: "30.00",
      paymentTerms: "COD" as const,
      onHandQty: "300.00",
      reservedQty: "50.00",
      quarantineQty: "0.00",
      holdQty: "0.00",
      defectiveQty: "0.00",
    },
    {
      code: "LOT-WH2-20250123-002",
      sku: "BOTA-SOUR-250123-002",
      productId: 6,
      lotId: 3,
      status: "AWAITING_INTAKE" as const,
      grade: "A",
      isSample: 0,
      cogsMode: "FIXED" as const,
      unitCogs: "22.00",
      paymentTerms: "NET_30" as const,
      onHandQty: "0.00",
      reservedQty: "0.00",
      quarantineQty: "0.00",
      holdQty: "0.00",
      defectiveQty: "0.00",
    },
  ];

  for (const batch of batches) {
    await inventoryDb.createBatch(batch);
  }

  logger.info("✓ Created batches");

  // Create batch locations
  const locations = [
    { batchId: 1, site: "Warehouse 1", zone: "A", rack: "R1", shelf: "S3", bin: "B12", qty: "1000.00" },
    { batchId: 2, site: "Warehouse 1", zone: "A", rack: "R1", shelf: "S4", bin: "B13", qty: "750.00" },
    { batchId: 3, site: "Warehouse 1", zone: "B", rack: "R2", shelf: "S1", bin: "B5", qty: "500.00" },
    { batchId: 4, site: "Warehouse 2", zone: "A", rack: "R1", shelf: "S2", bin: "B8", qty: "300.00" },
  ];

  for (const location of locations) {
    await inventoryDb.createBatchLocation(location);
  }

  logger.info("✓ Created batch locations");

  // Create audit logs
  const auditLogs = [
    {
      actorId: 1,
      entity: "Batch" as const,
      entityId: 1,
      action: "CREATED" as const,
      after: JSON.stringify({ status: "LIVE", onHandQty: "1000.00" }),
      reason: "Initial intake",
    },
    {
      actorId: 1,
      entity: "Batch" as const,
      entityId: 2,
      action: "CREATED" as const,
      after: JSON.stringify({ status: "LIVE", onHandQty: "750.00" }),
      reason: "Initial intake",
    },
    {
      actorId: 1,
      entity: "Batch" as const,
      entityId: 3,
      action: "CREATED" as const,
      after: JSON.stringify({ status: "LIVE", onHandQty: "500.00" }),
      reason: "Initial intake - now live",
    },
  ];

  for (const log of auditLogs) {
    await inventoryDb.createAuditLog(log);
  }

  logger.info("✓ Created audit logs");
  logger.info("✅ Inventory seed data complete!");
}
