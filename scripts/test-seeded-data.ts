import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== TESTING SEEDED DATA ===\n");

interface TestResult {
  category: string;
  test: string;
  status: "PASS" | "FAIL" | "WARN";
  details: string;
}

const results: TestResult[] = [];

async function runTests() {
  try {
    console.log("🧪 Running comprehensive data validation tests...\n");

    // ========================================
    // INVENTORY MANAGEMENT TESTS
    // ========================================
    console.log("📦 Testing Inventory Management...");

    // Test 1: Batch-Lot relationships
    const batchLotTest = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM batches b
      LEFT JOIN lots l ON b.lotId = l.id
      WHERE l.id IS NULL
    `);
    const orphanedBatches = (batchLotTest[0] as { count: number }[])[0].count;
    results.push({
      category: "Inventory",
      test: "Batch-Lot Relationships",
      status: orphanedBatches === 0 ? "PASS" : "FAIL",
      details: `${orphanedBatches} orphaned batches found`,
    });

    // Test 2: Inventory movement quantities
    const movementTest = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN CAST(quantityBefore AS SIGNED) < 0 THEN 1 ELSE 0 END) as negative_before,
        SUM(CASE WHEN CAST(quantityAfter AS SIGNED) < 0 THEN 1 ELSE 0 END) as negative_after
      FROM inventoryMovements
    `);
    const movementData = (
      movementTest[0] as {
        total: number;
        negative_before: number;
        negative_after: number;
      }[]
    )[0];
    results.push({
      category: "Inventory",
      test: "Movement Quantities Valid",
      status:
        movementData.negative_before === 0 && movementData.negative_after === 0
          ? "PASS"
          : "WARN",
      details: `${movementData.total} movements, ${movementData.negative_before + movementData.negative_after} with negative quantities`,
    });

    // Test 3: Batch inventory consistency
    const batchConsistency = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN onHandQty < 0 THEN 1 ELSE 0 END) as negative_qty
      FROM batches
    `);
    const batchData = (
      batchConsistency[0] as { total: number; negative_qty: number }[]
    )[0];
    results.push({
      category: "Inventory",
      test: "Batch Quantities Positive",
      status: batchData.negative_qty === 0 ? "PASS" : "FAIL",
      details: `${batchData.total} batches, ${batchData.negative_qty} with negative quantities`,
    });

    // ========================================
    // ORDER MANAGEMENT TESTS
    // ========================================
    console.log("📋 Testing Order Management...");

    // Test 4: Order totals match line items
    const orderTotalTest = await db.execute(sql`
      SELECT 
        o.id,
        o.order_number,
        o.subtotal as order_subtotal,
        COALESCE(SUM(oli.line_total), 0) as line_items_total,
        ABS(o.subtotal - COALESCE(SUM(oli.line_total), 0)) as difference
      FROM orders o
      LEFT JOIN order_line_items oli ON o.id = oli.order_id
      GROUP BY o.id
      HAVING ABS(difference) > 0.01
    `);
    const mismatchedOrders = (orderTotalTest[0] as unknown[]).length;
    results.push({
      category: "Orders",
      test: "Order Totals Match Line Items",
      status: mismatchedOrders === 0 ? "PASS" : "FAIL",
      details: `${mismatchedOrders} orders with mismatched totals`,
    });

    // Test 5: Order line items have valid batches
    const orderLineItemTest = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM order_line_items oli
      LEFT JOIN batches b ON oli.batch_id = b.id
      WHERE b.id IS NULL
    `);
    const orphanedLineItems = (orderLineItemTest[0] as { count: number }[])[0]
      .count;
    results.push({
      category: "Orders",
      test: "Line Items Have Valid Batches",
      status: orphanedLineItems === 0 ? "PASS" : "FAIL",
      details: `${orphanedLineItems} line items with invalid batch references`,
    });

    // Test 6: Order status history exists
    const statusHistoryTest = await db.execute(sql`
      SELECT 
        COUNT(DISTINCT o.id) as orders_with_history,
        (SELECT COUNT(*) FROM orders) as total_orders
      FROM orders o
      JOIN order_status_history osh ON o.id = osh.order_id
    `);
    const historyData = (
      statusHistoryTest[0] as {
        orders_with_history: number;
        total_orders: number;
      }[]
    )[0];
    results.push({
      category: "Orders",
      test: "All Orders Have Status History",
      status:
        historyData.orders_with_history === historyData.total_orders
          ? "PASS"
          : "WARN",
      details: `${historyData.orders_with_history}/${historyData.total_orders} orders have status history`,
    });

    // ========================================
    // CRM TESTS
    // ========================================
    console.log("👥 Testing CRM Features...");

    // Test 7: Client communications have valid clients
    const commTest = await db.execute(sql`
      SELECT COUNT(*) as count
      FROM client_communications cc
      LEFT JOIN clients c ON cc.client_id = c.id
      WHERE c.id IS NULL
    `);
    const orphanedComms = (commTest[0] as { count: number }[])[0].count;
    results.push({
      category: "CRM",
      test: "Communications Have Valid Clients",
      status: orphanedComms === 0 ? "PASS" : "FAIL",
      details: `${orphanedComms} communications with invalid client references`,
    });

    // Test 8: Client activities have valid metadata
    const activityTest = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN metadata IS NULL OR metadata = '' THEN 1 ELSE 0 END) as missing_metadata
      FROM client_activity
    `);
    const activityData = (
      activityTest[0] as { total: number; missing_metadata: number }[]
    )[0];
    results.push({
      category: "CRM",
      test: "Activities Have Metadata",
      status: activityData.missing_metadata === 0 ? "PASS" : "WARN",
      details: `${activityData.total} activities, ${activityData.missing_metadata} missing metadata`,
    });

    // ========================================
    // PRICING TESTS
    // ========================================
    console.log("💰 Testing Pricing Features...");

    // Test 9: Price alerts have valid clients and batches
    const alertTest = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN c.id IS NULL THEN 1 ELSE 0 END) as invalid_clients,
        SUM(CASE WHEN b.id IS NULL THEN 1 ELSE 0 END) as invalid_batches
      FROM client_price_alerts cpa
      LEFT JOIN clients c ON cpa.client_id = c.id
      LEFT JOIN batches b ON cpa.batch_id = b.id
    `);
    const alertData = (
      alertTest[0] as {
        total: number;
        invalid_clients: number;
        invalid_batches: number;
      }[]
    )[0];
    results.push({
      category: "Pricing",
      test: "Price Alerts Have Valid References",
      status:
        alertData.invalid_clients === 0 && alertData.invalid_batches === 0
          ? "PASS"
          : "FAIL",
      details: `${alertData.total} alerts, ${alertData.invalid_clients} invalid clients, ${alertData.invalid_batches} invalid batches`,
    });

    // Test 10: Pricing profiles have valid JSON
    const profileTest = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN rules IS NULL OR rules = '' THEN 1 ELSE 0 END) as missing_rules
      FROM pricing_profiles
    `);
    const profileData = (
      profileTest[0] as { total: number; missing_rules: number }[]
    )[0];
    results.push({
      category: "Pricing",
      test: "Pricing Profiles Have Rules",
      status: profileData.missing_rules === 0 ? "PASS" : "WARN",
      details: `${profileData.total} profiles, ${profileData.missing_rules} missing rules`,
    });

    // ========================================
    // COMMENTING TESTS
    // ========================================
    console.log("💬 Testing Commenting Features...");

    // Test 11: Comments have valid entities
    const commentTest = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN commentable_id IS NULL THEN 1 ELSE 0 END) as missing_entity
      FROM comments
    `);
    const commentData = (
      commentTest[0] as { total: number; missing_entity: number }[]
    )[0];
    results.push({
      category: "Comments",
      test: "Comments Have Valid Entities",
      status: commentData.missing_entity === 0 ? "PASS" : "FAIL",
      details: `${commentData.total} comments, ${commentData.missing_entity} missing entity references`,
    });

    // Test 12: Comment mentions have valid users
    const mentionTest = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN u.id IS NULL THEN 1 ELSE 0 END) as invalid_users
      FROM comment_mentions cm
      LEFT JOIN users u ON cm.mentioned_user_id = u.id
    `);
    const mentionData = (
      mentionTest[0] as { total: number; invalid_users: number }[]
    )[0];
    results.push({
      category: "Comments",
      test: "Mentions Have Valid Users",
      status: mentionData.invalid_users === 0 ? "PASS" : "FAIL",
      details: `${mentionData.total} mentions, ${mentionData.invalid_users} invalid user references`,
    });

    // ========================================
    // DASHBOARD TESTS
    // ========================================
    console.log("📊 Testing Dashboard Features...");

    // Test 13: Dashboard preferences have valid users
    const dashboardTest = await db.execute(sql`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN u.id IS NULL THEN 1 ELSE 0 END) as invalid_users
      FROM userDashboardPreferences udp
      LEFT JOIN users u ON udp.userId = u.id
    `);
    const dashboardData = (
      dashboardTest[0] as { total: number; invalid_users: number }[]
    )[0];
    results.push({
      category: "Dashboard",
      test: "Preferences Have Valid Users",
      status: dashboardData.invalid_users === 0 ? "PASS" : "FAIL",
      details: `${dashboardData.total} preferences, ${dashboardData.invalid_users} invalid user references`,
    });

    // ========================================
    // DATA INTEGRITY TESTS
    // ========================================
    console.log("🔍 Testing Data Integrity...");

    // Test 14: Timestamp consistency
    const timestampTest = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM orders WHERE created_at > NOW()) as future_orders,
        (SELECT COUNT(*) FROM inventoryMovements WHERE createdAt > NOW()) as future_movements,
        (SELECT COUNT(*) FROM client_communications WHERE communicated_at > NOW()) as future_comms
    `);
    const timestampData = (
      timestampTest[0] as {
        future_orders: number;
        future_movements: number;
        future_comms: number;
      }[]
    )[0];
    const futureRecords =
      timestampData.future_orders +
      timestampData.future_movements +
      timestampData.future_comms;
    results.push({
      category: "Integrity",
      test: "No Future Timestamps",
      status: futureRecords === 0 ? "PASS" : "WARN",
      details: `${futureRecords} records with future timestamps`,
    });

    // Test 15: Data distribution
    const distributionTest = await db.execute(sql`
      SELECT 
        (SELECT COUNT(*) FROM orders) as orders,
        (SELECT COUNT(*) FROM order_line_items) as line_items,
        (SELECT COUNT(*) FROM batches) as batches,
        (SELECT COUNT(*) FROM inventoryMovements) as movements,
        (SELECT COUNT(*) FROM client_communications) as communications,
        (SELECT COUNT(*) FROM client_price_alerts) as alerts
    `);
    const distData = (
      distributionTest[0] as {
        orders: number;
        line_items: number;
        batches: number;
        movements: number;
        communications: number;
        alerts: number;
      }[]
    )[0];
    const totalRecords =
      distData.orders +
      distData.line_items +
      distData.batches +
      distData.movements +
      distData.communications +
      distData.alerts;
    results.push({
      category: "Integrity",
      test: "Data Distribution",
      status: totalRecords > 200 ? "PASS" : "WARN",
      details: `${totalRecords} total records across key tables`,
    });

    // ========================================
    // PRINT RESULTS
    // ========================================
    console.log("\n" + "=".repeat(80));
    console.log("TEST RESULTS SUMMARY");
    console.log("=".repeat(80) + "\n");

    const passed = results.filter(r => r.status === "PASS").length;
    const failed = results.filter(r => r.status === "FAIL").length;
    const warned = results.filter(r => r.status === "WARN").length;

    console.log(`✅ PASSED: ${passed}/${results.length}`);
    console.log(`❌ FAILED: ${failed}/${results.length}`);
    console.log(`⚠️  WARNINGS: ${warned}/${results.length}\n`);

    // Group by category
    const categories = [...new Set(results.map(r => r.category))];
    categories.forEach(category => {
      console.log(`\n📁 ${category}:`);
      const categoryResults = results.filter(r => r.category === category);
      categoryResults.forEach(result => {
        const icon =
          result.status === "PASS"
            ? "✅"
            : result.status === "FAIL"
              ? "❌"
              : "⚠️ ";
        console.log(`  ${icon} ${result.test}: ${result.details}`);
      });
    });

    console.log("\n" + "=".repeat(80));
    console.log(
      `OVERALL STATUS: ${failed === 0 ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`
    );
    console.log("=".repeat(80) + "\n");

    // Return summary
    return {
      total: results.length,
      passed,
      failed,
      warned,
      results,
    };
  } catch (error) {
    console.error("❌ Error during testing:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

runTests();
