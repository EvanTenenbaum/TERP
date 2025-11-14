#!/usr/bin/env tsx
/**
 * Dashboard Data Check Script
 *
 * Verifies that the database has sufficient data for dashboard widgets to display.
 * Provides guidance if data is missing.
 *
 * Usage: pnpm run check:dashboard
 */

import { db } from "./db-sync.js";
import {
  clients,
  orders,
  invoices,
  batches,
  users,
} from "../drizzle/schema.js";
import { count } from "drizzle-orm";

async function checkDashboardData() {
  console.log("\n📊 Dashboard Data Check");
  console.log("=".repeat(50));

  try {
    // Check for users
    const userCount = await db.select({ count: count() }).from(users);
    const usersTotal = userCount[0]?.count || 0;
    console.log(`${usersTotal > 0 ? "✅" : "❌"} Users: ${usersTotal}`);

    // Check for clients
    const clientCount = await db.select({ count: count() }).from(clients);
    const clientsTotal = clientCount[0]?.count || 0;
    console.log(`${clientsTotal > 0 ? "✅" : "❌"} Clients: ${clientsTotal}`);

    // Check for orders
    const orderCount = await db.select({ count: count() }).from(orders);
    const ordersTotal = orderCount[0]?.count || 0;
    console.log(`${ordersTotal > 0 ? "✅" : "❌"} Orders: ${ordersTotal}`);

    // Check for invoices
    const invoiceCount = await db.select({ count: count() }).from(invoices);
    const invoicesTotal = invoiceCount[0]?.count || 0;
    console.log(
      `${invoicesTotal > 0 ? "✅" : "❌"} Invoices: ${invoicesTotal}`
    );

    // Check for inventory
    const batchCount = await db.select({ count: count() }).from(batches);
    const batchesTotal = batchCount[0]?.count || 0;
    console.log(
      `${batchesTotal > 0 ? "✅" : "❌"} Inventory (Batches): ${batchesTotal}`
    );

    console.log("=".repeat(50));

    // Determine if data is sufficient
    const hasData =
      usersTotal > 0 &&
      clientsTotal > 0 &&
      ordersTotal > 0 &&
      invoicesTotal > 0 &&
      batchesTotal > 0;

    if (hasData) {
      console.log("\n✅ Dashboard data is ready!");
      console.log("\nYou can now:");
      console.log("  1. Start the dev server: pnpm dev");
      console.log("  2. Navigate to /dashboard");
      console.log("  3. View populated widgets\n");
      process.exit(0);
    } else {
      console.log("\n⚠️  Insufficient data for dashboard widgets.");
      console.log("\nTo populate the database, run:");
      console.log("  pnpm seed:light    # Fast seed (~30s)");
      console.log("  pnpm seed:full     # Complete seed (~2min)");
      console.log("\nAfter seeding, run this check again:");
      console.log("  pnpm run check:dashboard\n");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error checking database:");
    console.error((error as Error).message);
    console.log("\nPossible issues:");
    console.log("  1. Database not running");
    console.log("  2. DATABASE_URL not configured in .env");
    console.log("  3. Schema not applied (run: pnpm db:push)");
    console.log("\nSee docs/DATABASE_SETUP.md for help\n");
    process.exit(1);
  }
}

checkDashboardData();
