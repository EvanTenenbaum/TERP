import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== QA: TESTING FEATURE DATA FLOWS ===\n");

interface TestResult {
  feature: string;
  status: "PASS" | "FAIL" | "WARN";
  message: string;
  recordCount?: number;
}

const results: TestResult[] = [];

async function testFeature(
  feature: string,
  query: string,
  minExpected: number = 1
): Promise<TestResult> {
  try {
    const result = await db.execute(sql.raw(query));
    const rows = result[0] as unknown[];
    const count = rows.length;

    if (count >= minExpected) {
      return {
        feature,
        status: "PASS",
        message: `✅ ${count} records found`,
        recordCount: count,
      };
    } else if (count > 0) {
      return {
        feature,
        status: "WARN",
        message: `⚠️  Only ${count} records (expected ${minExpected}+)`,
        recordCount: count,
      };
    } else {
      return {
        feature,
        status: "FAIL",
        message: `❌ No data found`,
        recordCount: 0,
      };
    }
  } catch (error) {
    return {
      feature,
      status: "FAIL",
      message: `❌ Query error: ${error}`,
      recordCount: 0,
    };
  }
}

async function runQA() {
  console.log("📊 PHASE 1: CORE FEATURES\n");

  // 1. Dashboard Widgets
  console.log("1. Dashboard Widgets");
  results.push(
    await testFeature(
      "  - Cash Flow (invoices)",
      "SELECT * FROM invoices LIMIT 1",
      1
    )
  );
  results.push(
    await testFeature(
      "  - Cash Flow (payments)",
      "SELECT * FROM payments LIMIT 1",
      1
    )
  );
  results.push(
    await testFeature(
      "  - Sales by Client",
      "SELECT customerId, SUM(totalAmount) as total FROM invoices GROUP BY customerId",
      5
    )
  );

  // 2. Inventory Page
  console.log("\n2. Inventory Page");
  results.push(await testFeature("  - Batches", "SELECT * FROM batches", 10));
  results.push(await testFeature("  - Lots", "SELECT * FROM lots", 10));
  results.push(
    await testFeature("  - Products", "SELECT * FROM products LIMIT 1", 1)
  );
  results.push(
    await testFeature(
      "  - Inventory Movements",
      "SELECT * FROM inventoryMovements",
      10
    )
  );

  // 3. Orders Page
  console.log("\n3. Orders Page");
  results.push(await testFeature("  - Orders", "SELECT * FROM orders", 10));
  results.push(
    await testFeature(
      "  - Order Line Items",
      "SELECT * FROM order_line_items",
      10
    )
  );
  results.push(
    await testFeature(
      "  - Order Status History",
      "SELECT * FROM order_status_history",
      10
    )
  );

  // 4. Client Profile Page
  console.log("\n4. Client Profile Page");
  results.push(await testFeature("  - Clients", "SELECT * FROM clients", 10));
  results.push(
    await testFeature(
      "  - Client Orders",
      "SELECT o.* FROM orders o JOIN clients c ON o.client_id = c.id LIMIT 1",
      1
    )
  );
  results.push(
    await testFeature(
      "  - Client Invoices",
      "SELECT i.* FROM invoices i JOIN clients c ON i.customerId = c.id LIMIT 1",
      1
    )
  );
  results.push(
    await testFeature(
      "  - Client Communications",
      "SELECT * FROM client_communications",
      10
    )
  );
  results.push(
    await testFeature(
      "  - Client Activities",
      "SELECT * FROM client_activity",
      10
    )
  );
  results.push(
    await testFeature(
      "  - Client Comments",
      "SELECT * FROM comments WHERE commentable_type = 'Client'",
      10
    )
  );
  results.push(
    await testFeature(
      "  - Client Price Alerts",
      "SELECT * FROM client_price_alerts",
      10
    )
  );

  // 5. Pricing Pages
  console.log("\n5. Pricing Pages");
  results.push(
    await testFeature("  - Pricing Rules", "SELECT * FROM pricing_rules", 5)
  );
  results.push(
    await testFeature(
      "  - Pricing Profiles",
      "SELECT * FROM pricing_profiles",
      3
    )
  );
  results.push(
    await testFeature(
      "  - Pricing Defaults",
      "SELECT * FROM pricing_defaults",
      5
    )
  );

  console.log("\n📊 PHASE 2: SECONDARY FEATURES\n");

  // 6. Accounting Invoices
  console.log("6. Accounting Invoices");
  results.push(
    await testFeature(
      "  - Invoices with Clients",
      "SELECT i.*, c.name FROM invoices i JOIN clients c ON i.customerId = c.id",
      10
    )
  );
  results.push(
    await testFeature(
      "  - Invoice Payments",
      "SELECT * FROM payments WHERE paymentType = 'RECEIVED'",
      1
    )
  );

  // 7. Calendar Page
  console.log("\n7. Calendar Page");
  results.push(
    await testFeature(
      "  - Calendar Events",
      "SELECT * FROM calendar_events",
      10
    )
  );
  results.push(
    await testFeature(
      "  - Event Comments",
      "SELECT * FROM comments WHERE commentable_type = 'CalendarEvent'",
      10
    )
  );

  // 8. Inbox Page
  console.log("\n8. Inbox Page");
  results.push(
    await testFeature(
      "  - Comment Mentions",
      "SELECT * FROM comment_mentions",
      10
    )
  );

  // 9. Workflow Queue
  console.log("\n9. Workflow Queue");
  results.push(
    await testFeature(
      "  - Batches by Status",
      "SELECT batchStatus, COUNT(*) as count FROM batches GROUP BY batchStatus",
      1
    )
  );

  // 10. Analytics Page
  console.log("\n10. Analytics Page");
  results.push(
    await testFeature(
      "  - Order Analytics",
      "SELECT DATE(created_at) as date, COUNT(*) as count FROM orders GROUP BY DATE(created_at)",
      1
    )
  );

  console.log("\n📊 PHASE 3: TERTIARY FEATURES\n");

  // 11. Vendors Page
  console.log("11. Vendors Page");
  results.push(await testFeature("  - Vendors", "SELECT * FROM vendors", 1));

  // 12. Matchmaking
  console.log("\n12. Matchmaking");
  results.push(
    await testFeature("  - Client Needs", "SELECT * FROM client_needs", 1)
  );

  // 13. Todo Lists
  console.log("\n13. Todo Lists");
  results.push(
    await testFeature("  - Todo Lists", "SELECT * FROM todo_lists", 1)
  );

  // 14. Locations
  console.log("\n14. Locations");
  results.push(
    await testFeature("  - Locations", "SELECT * FROM locations", 1)
  );

  // 15. VIP Portal
  console.log("\n15. VIP Portal");
  results.push(
    await testFeature(
      "  - VIP Configurations",
      "SELECT * FROM vip_portal_configurations",
      1
    )
  );

  console.log("\n📊 PHASE 4: EMPTY FEATURES (EXPECTED)\n");

  // 16. Bills
  console.log("16. Accounting Bills");
  results.push(await testFeature("  - Bills", "SELECT * FROM bills", 0));

  // 17. Expenses
  console.log("\n17. Accounting Expenses");
  results.push(await testFeature("  - Expenses", "SELECT * FROM expenses", 0));

  // 18. Returns
  console.log("\n18. Returns");
  results.push(await testFeature("  - Returns", "SELECT * FROM returns", 0));

  // Print Summary
  console.log("\n" + "=".repeat(60));
  console.log("QA SUMMARY");
  console.log("=".repeat(60) + "\n");

  const passed = results.filter(r => r.status === "PASS").length;
  const warned = results.filter(r => r.status === "WARN").length;
  const failed = results.filter(r => r.status === "FAIL").length;

  console.log(`✅ PASS: ${passed}`);
  console.log(`⚠️  WARN: ${warned}`);
  console.log(`❌ FAIL: ${failed}`);
  console.log(`📊 TOTAL: ${results.length}\n`);

  // Print all results
  results.forEach(r => {
    const icon =
      r.status === "PASS" ? "✅" : r.status === "WARN" ? "⚠️ " : "❌";
    console.log(`${icon} ${r.feature}: ${r.message}`);
  });

  // Critical failures
  const criticalFailures = results.filter(
    r =>
      r.status === "FAIL" &&
      !["Bills", "Expenses", "Returns"].some(name => r.feature.includes(name))
  );

  if (criticalFailures.length > 0) {
    console.log("\n⚠️  CRITICAL FAILURES (Need Attention):\n");
    criticalFailures.forEach(r => {
      console.log(`  ❌ ${r.feature}: ${r.message}`);
    });
  }

  process.exit(0);
}

runQA();
