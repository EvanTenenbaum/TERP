/**
 * Calculate and update computed fields after seeding
 */

import { db } from "../drizzle/db.js";
import { clients, invoices } from "../drizzle/schema.js";
import { eq } from "drizzle-orm";

async function calculateClientStats(clientId: number) {
  // This is a placeholder. In a real scenario, you would query orders and invoices
  // to calculate these stats.
  return {
    totalSpent: "1000.00",
    totalProfit: "200.00",
    avgProfitMargin: "20.00",
    totalOwed: "100.00",
    oldestDebtDays: 30,
  };
}

async function calculateARAging(invoice: any) {
  const dueDate = new Date(invoice.dueDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - dueDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let arBucket = "CURRENT";
  if (diffDays > 120) {
    arBucket = "120+";
  } else if (diffDays > 90) {
    arBucket = "91-120";
  } else if (diffDays > 60) {
    arBucket = "61-90";
  } else if (diffDays > 30) {
    arBucket = "31-60";
  } else if (diffDays > 0) {
    arBucket = "1-30";
  }

  return {
    daysOverdue: diffDays,
    arBucket: arBucket,
  };
}

async function updateComputedFields() {
  console.log("📊 Calculating computed fields...");

  // 1. Calculate client stats
  const allClients = await db.select().from(clients);
  for (const client of allClients) {
    const stats = await calculateClientStats(client.id);
    await db.update(clients).set(stats).where(eq(clients.id, client.id));
  }

  // 2. Calculate invoice AR aging
  const allInvoices = await db.select().from(invoices);
  for (const invoice of allInvoices) {
    const aging = await calculateARAging(invoice);
    await db.update(invoices).set(aging).where(eq(invoices.id, invoice.id));
  }

  console.log("   ✓ Computed fields updated\n");
}

updateComputedFields().catch((err) => {
  console.error("Error updating computed fields:", err);
  process.exit(1);
});
