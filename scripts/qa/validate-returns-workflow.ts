/**
 * WF-003: Returns Workflow Validation
 * 
 * Validates the complete returns flow:
 * 1. Order lookup → item selection
 * 2. Return creation → inventory restock
 * 3. Audit trail verification
 * 
 * Run: npx tsx scripts/qa/validate-returns-workflow.ts
 */

import { getDb } from "../../server/db";
import { orders, returns, inventoryMovements } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

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

async function validateReturnsWorkflow() {
  console.log("========================================");
  console.log("WF-003: Returns Workflow Validation");
  console.log("========================================\n");

  const db = await getDb();
  if (!db) {
    log({ step: "Database", status: "FAIL", message: "Could not connect to database" });
    return;
  }

  // Step 1: Verify orders exist for returns
  console.log("\n--- Step 1: Order Lookup ---");
  const confirmedOrders = await db
    .select()
    .from(orders)
    .where(eq(orders.isDraft, false))
    .orderBy(desc(orders.createdAt))
    .limit(10);

  if (confirmedOrders.length === 0) {
    log({ step: "Order Lookup", status: "WARN", message: "No confirmed orders found for returns testing" });
  } else {
    log({
      step: "Order Lookup",
      status: "PASS",
      message: `Found ${confirmedOrders.length} confirmed orders available for returns`,
      details: { 
        sampleOrders: confirmedOrders.slice(0, 3).map(o => ({ 
          id: o.id, 
          orderNumber: o.orderNumber,
          fulfillmentStatus: o.fulfillmentStatus
        }))
      }
    });
  }

  // Step 2: Verify returns table exists and has data
  console.log("\n--- Step 2: Returns Processing ---");
  const returnsList = await db
    .select()
    .from(returns)
    .orderBy(desc(returns.processedAt))
    .limit(10);

  if (returnsList.length === 0) {
    log({ step: "Returns", status: "WARN", message: "No returns found - returns workflow may not have been tested" });
  } else {
    const sampleReturn = returnsList[0];
    
    log({
      step: "Returns",
      status: "PASS",
      message: `Found ${returnsList.length} returns in system`,
      details: {
        latestReturn: {
          id: sampleReturn.id,
          orderId: sampleReturn.orderId,
          returnReason: sampleReturn.returnReason,
          processedAt: sampleReturn.processedAt
        }
      }
    });

    // Verify return items structure
    const items = typeof sampleReturn.items === 'string' 
      ? JSON.parse(sampleReturn.items) 
      : sampleReturn.items;
    
    if (Array.isArray(items) && items.length > 0) {
      log({
        step: "Return Items",
        status: "PASS",
        message: `Return items properly structured (${items.length} items)`,
        details: { sampleItem: items[0] }
      });
    } else {
      log({
        step: "Return Items",
        status: "WARN",
        message: "Return items may be empty or improperly structured"
      });
    }
  }

  // Step 3: Verify inventory movements for returns
  console.log("\n--- Step 3: Inventory Restock ---");
  const returnMovements = await db
    .select()
    .from(inventoryMovements)
    .where(sql`${inventoryMovements.inventoryMovementType} = 'RETURN' OR ${inventoryMovements.inventoryMovementType} = 'REFUND_RETURN'`)
    .orderBy(desc(inventoryMovements.createdAt))
    .limit(10);

  if (returnMovements.length === 0) {
    log({ step: "Inventory Restock", status: "WARN", message: "No return inventory movements found" });
  } else {
    log({
      step: "Inventory Restock",
      status: "PASS",
      message: `Found ${returnMovements.length} return inventory movements`,
      details: {
        latestMovement: {
          id: returnMovements[0].id,
          batchId: returnMovements[0].batchId,
          quantityChange: returnMovements[0].quantityChange
        }
      }
    });
  }

  // Step 4: Verify return reasons are valid
  console.log("\n--- Step 4: Return Reason Validation ---");
  const validReasons = ['DEFECTIVE', 'WRONG_ITEM', 'NOT_AS_DESCRIBED', 'CUSTOMER_CHANGED_MIND', 'OTHER'];
  
  if (returnsList.length > 0) {
    const invalidReasons = returnsList.filter(r => !validReasons.includes(r.returnReason));
    
    if (invalidReasons.length > 0) {
      log({
        step: "Return Reasons",
        status: "WARN",
        message: `Found ${invalidReasons.length} returns with non-standard reasons`,
        details: { invalidReasons: invalidReasons.map(r => r.returnReason) }
      });
    } else {
      log({
        step: "Return Reasons",
        status: "PASS",
        message: "All return reasons are valid"
      });
    }
  } else {
    log({ step: "Return Reasons", status: "WARN", message: "No returns to validate reasons" });
  }

  // Step 5: Verify audit trail (inventory movements have references)
  console.log("\n--- Step 5: Audit Trail ---");
  const movementsWithRefs = await db
    .select()
    .from(inventoryMovements)
    .where(sql`${inventoryMovements.referenceType} IS NOT NULL`)
    .limit(10);

  if (movementsWithRefs.length === 0) {
    log({ step: "Audit Trail", status: "WARN", message: "No inventory movements with reference tracking found" });
  } else {
    log({
      step: "Audit Trail",
      status: "PASS",
      message: `Found ${movementsWithRefs.length} inventory movements with reference tracking`,
      details: {
        sampleMovement: {
          id: movementsWithRefs[0].id,
          referenceType: movementsWithRefs[0].referenceType,
          referenceId: movementsWithRefs[0].referenceId
        }
      }
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

validateReturnsWorkflow().catch(console.error);
