import { eq, and, isNull } from "drizzle-orm";
import {
  batches,
  clients,
  orders,
  users,
  InsertOrder,
  InsertUser,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { logger } from "../../_core/logger";

const SEED_USER: InsertUser = {
  openId: "pickpack-seed-user",
  name: "Pick Pack Seed User",
  email: "pickpack@terp.app",
  role: "admin",
  loginMethod: "seed-script",
};

type OrderItem = {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  unitCogs: number;
  cogsMode: "FIXED";
  cogsSource: "FIXED";
  unitMargin: number;
  marginPercent: number;
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
};

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

async function upsertSeedUser(): Promise<number> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  await db
    .insert(users)
    .values(SEED_USER)
    .onDuplicateKeyUpdate({
      set: {
        name: SEED_USER.name,
        email: SEED_USER.email,
        role: SEED_USER.role,
        loginMethod: SEED_USER.loginMethod,
      },
    });

  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.openId, SEED_USER.openId))
    .limit(1);

  if (!user) {
    throw new Error("Failed to upsert seed user");
  }

  return user.id;
}

/**
 * Seed test data for Pick & Pack page
 * Creates orders with fulfillmentStatus="CONFIRMED" and pickPackStatus="PENDING"
 */
export async function seedPickPackTestData(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  logger.info("Checking for existing pick pack test data");

  // Check if test data already exists (orders with our test order numbers)
  const existingTestOrders = await db.query.orders.findMany({
    where: and(
      eq(orders.fulfillmentStatus, "CONFIRMED"),
      eq(orders.pickPackStatus, "PENDING"),
      isNull(orders.deletedAt)
    ),
    limit: 1,
  });

  if (existingTestOrders.length > 0) {
    logger.info(
      `Pick pack test data already exists (${existingTestOrders.length} orders found with CONFIRMED/PENDING status)`
    );
    logger.info("Skipping seed to avoid duplicates");
    return;
  }

  logger.info("No existing pick pack test data found, creating new data");

  // Get seed user
  const createdBy = await upsertSeedUser();

  // Get first 5 buyer clients
  const buyerClients = await db.query.clients.findMany({
    where: and(eq(clients.isBuyer, true), isNull(clients.deletedAt)),
    limit: 5,
  });

  if (buyerClients.length === 0) {
    throw new Error(
      "No buyer clients found. Run production seed first: pnpm db:seed:production"
    );
  }

  // Get available batches with inventory
  const availableBatches = await db
    .select({
      id: batches.id,
      sku: batches.sku,
      productId: batches.productId,
      unitCogs: batches.unitCogs,
      onHandQty: batches.onHandQty,
    })
    .from(batches)
    .where(eq(batches.batchStatus, "LIVE"))
    .limit(20);

  if (availableBatches.length === 0) {
    throw new Error(
      "No batches found. Run production seed first: pnpm db:seed:production"
    );
  }

  logger.info(
    `Found ${buyerClients.length} clients and ${availableBatches.length} batches`
  );

  // Create 4 test orders
  const orderCount = Math.min(4, buyerClients.length);
  const today = new Date();
  const orderDate = new Date(today);
  orderDate.setHours(10, 0, 0, 0); // 10 AM today

  for (let i = 0; i < orderCount; i++) {
    const client = buyerClients[i];
    const orderNumber = `PP-TEST-${String(i + 1).padStart(4, "0")}`;

    // Select 2-4 random batches for this order
    const itemCount = 2 + Math.floor(Math.random() * 3); // 2-4 items
    const orderItems: OrderItem[] = [];

    for (let j = 0; j < itemCount; j++) {
      const batchIndex = (i * itemCount + j) % availableBatches.length;
      const batch = availableBatches[batchIndex];

      if (!batch || !batch.unitCogs) continue;

      const quantity = 5 + Math.floor(Math.random() * 20); // 5-24 units
      const unitCogs = parseFloat(batch.unitCogs);
      const unitPrice = unitCogs * (1.3 + Math.random() * 0.4); // 30-70% markup
      const lineTotal = unitPrice * quantity;
      const lineCogs = unitCogs * quantity;
      const unitMargin = unitPrice - unitCogs;
      const marginPercent = (unitMargin / unitPrice) * 100;

      orderItems.push({
        batchId: batch.id,
        displayName: `Product ${batch.sku}`,
        originalName: batch.sku,
        quantity,
        unitPrice,
        isSample: false,
        unitCogs,
        cogsMode: "FIXED",
        cogsSource: "FIXED",
        unitMargin,
        marginPercent,
        lineTotal,
        lineCogs,
        lineMargin: lineTotal - lineCogs,
      });
    }

    if (orderItems.length === 0) {
      logger.warn(`No items for order ${orderNumber}, skipping`);
      continue;
    }

    const subtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const totalCogs = orderItems.reduce((sum, item) => sum + item.lineCogs, 0);
    const totalMargin = subtotal - totalCogs;
    const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    // Create due date (NET_30)
    const dueDate = new Date(orderDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const orderPayload: InsertOrder = {
      orderNumber,
      orderType: "SALE",
      isDraft: false,
      clientId: client.id,
      items: orderItems,
      subtotal: toDecimalString(subtotal),
      tax: toDecimalString(tax),
      discount: "0",
      total: toDecimalString(total),
      totalCogs: toDecimalString(totalCogs),
      totalMargin: toDecimalString(totalMargin),
      avgMarginPercent: toDecimalString(avgMarginPercent),
      validUntil: null,
      quoteStatus: null,
      paymentTerms: "NET_30",
      cashPayment: "0",
      dueDate,
      saleStatus: "PENDING", // Payment pending
      invoiceId: null,
      fulfillmentStatus: "CONFIRMED", // KEY: Ready for pick/pack
      packedAt: null,
      packedBy: null,
      shippedAt: null,
      shippedBy: null,
      pickPackStatus: "PENDING", // KEY: Waiting to be picked
      referredByClientId: null,
      isReferralOrder: false,
      convertedFromOrderId: null,
      convertedFromSalesSheetId: null,
      convertedAt: null,
      confirmedAt: orderDate,
      relatedSampleRequestId: null,
      deletedAt: null,
      notes: `Test order for Pick & Pack page - ${itemCount} items`,
      createdBy,
      createdAt: orderDate,
      updatedAt: orderDate,
    };

    await db.insert(orders).values(orderPayload);

    logger.info(
      `Created pick pack test order ${orderNumber} for client ${client.name} (${orderItems.length} items)`
    );
  }

  logger.info("✅ Pick pack test data seeded successfully");
}

// Allow running directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedPickPackTestData().catch(error => {
    logger.error({ err: error }, "Failed to seed pick pack test data");
    process.exit(1);
  });
}
