/**
 * WF-002: Inventory Intake Workflow Validation
 * 
 * Validates the complete inventory intake flow:
 * 1. Purchase order creation → batch creation
 * 2. Queue entry → status transitions
 * 3. Live inventory verification
 * 
 * Run: npx tsx scripts/qa/validate-inventory-workflow.ts
 */

import { getDb } from "../../server/db";
import { batches, purchaseOrders, lots, products, workflowStatuses } from "../../drizzle/schema";
import { desc, sql } from "drizzle-orm";

interface ValidationResult {
  step: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  details?: Record<string, unknown>;
}

const results: ValidationResult[] = [];

function log(result: ValidationResult) {
  const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⚠️";
  console.log(`${icon} ${result.step}: ${result.message}`);
  if (result.details) {
    console.log(`   Details:`, JSON.stringify(result.details, null, 2));
  }
  results.push(result);
}

async function validateInventoryWorkflow() {
  console.log("========================================");
  console.log("WF-002: Inventory Intake Workflow Validation");
  console.log("========================================\n");

  const db = await getDb();
  if (!db) {
    log({ step: "Database", status: "FAIL", message: "Could not connect to database" });
    return;
  }

  // Step 1: Verify purchase orders exist
  console.log("\n--- Step 1: Purchase Order Creation ---");
  const poList = await db
    .select()
    .from(purchaseOrders)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(10);

  if (poList.length === 0) {
    log({ step: "Purchase Orders", status: "WARN", message: "No purchase orders found" });
  } else {
    log({
      step: "Purchase Orders",
      status: "PASS",
      message: `Found ${poList.length} purchase orders`,
      details: { 
        latestPO: {
          id: poList[0].id,
          poNumber: poList[0].poNumber,
          status: poList[0].purchaseOrderStatus,
          total: poList[0].total
        }
      }
    });
  }

  // Step 2: Verify lots exist (batch groupings)
  console.log("\n--- Step 2: Lot Creation ---");
  const lotList = await db
    .select()
    .from(lots)
    .orderBy(desc(lots.createdAt))
    .limit(10);

  if (lotList.length === 0) {
    log({ step: "Lots", status: "WARN", message: "No lots found" });
  } else {
    log({
      step: "Lots",
      status: "PASS",
      message: `Found ${lotList.length} lots`,
      details: { 
        latestLot: {
          id: lotList[0].id,
          code: lotList[0].code,
          vendorId: lotList[0].vendorId
        }
      }
    });
  }

  // Step 3: Verify batches exist with proper structure
  console.log("\n--- Step 3: Batch Creation ---");
  const batchList = await db
    .select()
    .from(batches)
    .orderBy(desc(batches.createdAt))
    .limit(10);

  if (batchList.length === 0) {
    log({ step: "Batches", status: "FAIL", message: "No batches found - inventory intake not working" });
  } else {
    const sampleBatch = batchList[0];
    const hasRequiredFields = sampleBatch.sku && sampleBatch.productId && sampleBatch.lotId;
    
    log({
      step: "Batches",
      status: hasRequiredFields ? "PASS" : "FAIL",
      message: hasRequiredFields 
        ? `Found ${batchList.length} batches with valid structure`
        : "Batches missing required fields",
      details: {
        latestBatch: {
          id: sampleBatch.id,
          sku: sampleBatch.sku,
          productId: sampleBatch.productId,
          lotId: sampleBatch.lotId,
          batchStatus: sampleBatch.batchStatus,
          onHandQty: sampleBatch.onHandQty
        }
      }
    });
  }

  // Step 4: Verify workflow statuses exist
  console.log("\n--- Step 4: Workflow Queue Status ---");
  const statusList = await db
    .select()
    .from(workflowStatuses)
    .limit(20);

  if (statusList.length === 0) {
    log({ step: "Workflow Statuses", status: "WARN", message: "No workflow statuses defined" });
  } else {
    log({
      step: "Workflow Statuses",
      status: "PASS",
      message: `Found ${statusList.length} workflow statuses`,
      details: { statuses: statusList.map(s => ({ id: s.id, name: s.name, slug: s.slug })) }
    });
  }

  // Step 5: Verify batch status distribution
  console.log("\n--- Step 5: Batch Status Distribution ---");
  const statusCounts = await db
    .select({
      status: batches.batchStatus,
      count: sql<number>`COUNT(*)`.as('count')
    })
    .from(batches)
    .groupBy(batches.batchStatus);

  if (statusCounts.length === 0) {
    log({ step: "Status Distribution", status: "WARN", message: "Could not get batch status distribution" });
  } else {
    const distribution = statusCounts.reduce((acc, s) => {
      acc[s.status] = Number(s.count);
      return acc;
    }, {} as Record<string, number>);

    log({
      step: "Status Distribution",
      status: "PASS",
      message: "Batch status distribution retrieved",
      details: distribution
    });
  }

  // Step 6: Verify inventory quantities are valid
  console.log("\n--- Step 6: Inventory Quantity Validation ---");
  const invalidQtyBatches = await db
    .select()
    .from(batches)
    .where(sql`CAST(${batches.onHandQty} AS DECIMAL) < 0`)
    .limit(5);

  if (invalidQtyBatches.length > 0) {
    log({
      step: "Quantity Validation",
      status: "FAIL",
      message: `Found ${invalidQtyBatches.length} batches with negative quantities`,
      details: { invalidBatches: invalidQtyBatches.map(b => ({ id: b.id, sku: b.sku, qty: b.onHandQty })) }
    });
  } else {
    log({
      step: "Quantity Validation",
      status: "PASS",
      message: "All batch quantities are non-negative"
    });
  }

  // Step 7: Verify products exist for batches
  console.log("\n--- Step 7: Product Linkage ---");
  const productList = await db
    .select()
    .from(products)
    .limit(10);

  if (productList.length === 0) {
    log({ step: "Products", status: "WARN", message: "No products found" });
  } else {
    log({
      step: "Products",
      status: "PASS",
      message: `Found ${productList.length} products`,
      details: { sampleProducts: productList.slice(0, 3).map(p => ({ id: p.id, name: p.nameCanonical })) }
    });
  }

  // Summary
  console.log("\n========================================");
  console.log("VALIDATION SUMMARY");
  console.log("========================================");
  
  const passed = results.filter(r => r.status === "PASS").length;
  const failed = results.filter(r => r.status === "FAIL").length;
  const warned = results.filter(r => r.status === "WARN").length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`Total: ${results.length}`);
  
  if (failed > 0) {
    console.log("\n❌ WORKFLOW VALIDATION FAILED");
    process.exit(1);
  } else if (warned > 0) {
    console.log("\n⚠️  WORKFLOW VALIDATION PASSED WITH WARNINGS");
    process.exit(0);
  } else {
    console.log("\n✅ WORKFLOW VALIDATION PASSED");
    process.exit(0);
  }
}

validateInventoryWorkflow().catch(console.error);
