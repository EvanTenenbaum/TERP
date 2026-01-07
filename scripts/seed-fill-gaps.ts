#!/usr/bin/env tsx
/**
 * TERP Safe Data Gap Filler
 * 
 * This script fills missing data areas WITHOUT breaking existing relationships.
 * It queries existing data first to ensure all foreign keys are valid.
 * 
 * Usage:
 *   pnpm seed:fill-gaps              # Run all gap fillers
 *   pnpm seed:fill-gaps --dry-run    # Preview without inserting
 *   pnpm seed:fill-gaps --only=X     # Only run specific filler (products|samples|calendar|todos|comments|bills)
 * 
 * Safe to run multiple times - checks for existing data before inserting.
 */

import { db, testConnection } from "./db-sync";
import { sql, eq, inArray } from "drizzle-orm";
import {
  products,
  batches,
  brands,
  strains,
  sampleRequests,
  calendarEvents,
  todoLists,
  todoTasks,
  comments,
  bills,
  clients,
  users,
  orders,
  vendors,
} from "../drizzle/schema";
import { faker } from "@faker-js/faker";

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  products: { count: 50 },
  samples: { count: 15 },
  calendarEvents: { count: 20 },
  todoTasks: { count: 20 },
  comments: { count: 30 },
  vendorBills: { count: 10 },
};

// Cannabis-specific data
const PRODUCT_CATEGORIES = ["Flower", "Concentrates", "Edibles", "Pre-Rolls", "Vapes", "Topicals"];
const SUBCATEGORIES: Record<string, string[]> = {
  Flower: ["Whole Flower", "Smalls", "Shake", "Pre-Ground"],
  Concentrates: ["Shatter", "Wax", "Live Resin", "Distillate", "Rosin", "Diamonds"],
  Edibles: ["Gummies", "Chocolates", "Beverages", "Baked Goods"],
  "Pre-Rolls": ["Single", "Multi-Pack", "Infused", "Mini"],
  Vapes: ["Cartridge", "Disposable", "Pod"],
  Topicals: ["Balm", "Lotion", "Oil", "Patch"],
};

const EVENT_TYPES = ["MEETING", "TASK", "DELIVERY", "FOLLOW_UP", "INTAKE", "PHOTOGRAPHY"] as const;
const EVENT_MODULES = ["INVENTORY", "ACCOUNTING", "CLIENTS", "VENDORS", "ORDERS", "SAMPLES", "GENERAL"] as const;

// ============================================================================
// CLI Argument Parsing
// ============================================================================

interface CLIFlags {
  dryRun: boolean;
  only?: string;
  help: boolean;
}

function parseArgs(): CLIFlags {
  const args = process.argv.slice(2);
  const flags: CLIFlags = {
    dryRun: false,
    only: undefined,
    help: false,
  };

  for (const arg of args) {
    if (arg === "--dry-run") flags.dryRun = true;
    if (arg === "--help" || arg === "-h") flags.help = true;
    if (arg.startsWith("--only=")) flags.only = arg.split("=")[1];
  }

  return flags;
}

function showHelp() {
  console.log(`
TERP Safe Data Gap Filler

Usage:
  pnpm seed:fill-gaps              # Run all gap fillers
  pnpm seed:fill-gaps --dry-run    # Preview without inserting
  pnpm seed:fill-gaps --only=X     # Only run specific filler

Options:
  --dry-run     Preview what would be created without inserting
  --only=X      Only run specific filler:
                  products  - Fill products table based on batch productIds
                  samples   - Create sample requests
                  calendar  - Create calendar events
                  todos     - Create todo lists and tasks
                  comments  - Create comments on orders
                  bills     - Create vendor bills
  --help, -h    Show this help message

Examples:
  pnpm seed:fill-gaps --only=products
  pnpm seed:fill-gaps --dry-run
  `);
}

// ============================================================================
// Data Fetchers - Get existing IDs to reference
// ============================================================================

async function getExistingData() {
  console.log("📊 Fetching existing data for reference...\n");

  // Get distinct productIds from batches that need products created
  const batchProductIds = await db
    .selectDistinct({ productId: batches.productId })
    .from(batches)
    .where(sql`${batches.deletedAt} IS NULL`);

  // Get existing product IDs
  const existingProducts = await db
    .select({ id: products.id })
    .from(products)
    .where(sql`${products.deletedAt} IS NULL`);
  const existingProductIds = new Set(existingProducts.map((p) => p.id));

  // Find productIds that need to be created
  const missingProductIds = batchProductIds
    .map((b) => b.productId)
    .filter((id) => !existingProductIds.has(id));

  // Get brands
  const allBrands = await db.select({ id: brands.id, name: brands.name }).from(brands).limit(20);

  // Get strains
  const allStrains = await db
    .select({ id: strains.id, name: strains.name })
    .from(strains)
    .limit(100);

  // Get clients (buyers for samples)
  const buyerClients = await db
    .select({ id: clients.id, name: clients.name })
    .from(clients)
    .where(eq(clients.isBuyer, 1))
    .limit(20);

  // Get users
  const allUsers = await db.select({ id: users.id, email: users.email }).from(users).limit(10);

  // Get orders (for comments)
  const allOrders = await db.select({ id: orders.id }).from(orders).limit(50);

  // Get vendors (for bills)
  const allVendors = await db.select({ id: vendors.id, name: vendors.name }).from(vendors).limit(20);

  // Get existing sample count
  const sampleCount = await db.select({ count: sql<number>`COUNT(*)` }).from(sampleRequests);

  // Get existing calendar event count
  const eventCount = await db.select({ count: sql<number>`COUNT(*)` }).from(calendarEvents);

  // Get existing todo list count
  const todoListCount = await db.select({ count: sql<number>`COUNT(*)` }).from(todoLists);

  // Get existing comment count
  const commentCount = await db.select({ count: sql<number>`COUNT(*)` }).from(comments);

  // Get existing bill count
  const billCount = await db.select({ count: sql<number>`COUNT(*)` }).from(bills);

  console.log("  Existing data summary:");
  console.log(`    - Products: ${existingProductIds.size} (${missingProductIds.length} missing from batches)`);
  console.log(`    - Brands: ${allBrands.length}`);
  console.log(`    - Strains: ${allStrains.length}`);
  console.log(`    - Buyer Clients: ${buyerClients.length}`);
  console.log(`    - Users: ${allUsers.length}`);
  console.log(`    - Orders: ${allOrders.length}`);
  console.log(`    - Vendors: ${allVendors.length}`);
  console.log(`    - Samples: ${sampleCount[0]?.count || 0}`);
  console.log(`    - Calendar Events: ${eventCount[0]?.count || 0}`);
  console.log(`    - Todo Lists: ${todoListCount[0]?.count || 0}`);
  console.log(`    - Comments: ${commentCount[0]?.count || 0}`);
  console.log(`    - Vendor Bills: ${billCount[0]?.count || 0}`);
  console.log();

  return {
    missingProductIds,
    existingProductIds,
    brands: allBrands,
    strains: allStrains,
    clients: buyerClients,
    users: allUsers,
    orders: allOrders,
    vendors: allVendors,
    counts: {
      samples: sampleCount[0]?.count || 0,
      events: eventCount[0]?.count || 0,
      todoLists: todoListCount[0]?.count || 0,
      comments: commentCount[0]?.count || 0,
      bills: billCount[0]?.count || 0,
    },
  };
}

// ============================================================================
// Gap Fillers
// ============================================================================

async function fillProducts(data: Awaited<ReturnType<typeof getExistingData>>, dryRun: boolean) {
  console.log("\n🏷️  PRODUCTS GAP FILLER");
  console.log("─".repeat(50));

  if (data.missingProductIds.length === 0) {
    console.log("  ✅ No missing products - all batch productIds have corresponding products");
    return { inserted: 0, skipped: 0 };
  }

  console.log(`  Found ${data.missingProductIds.length} productIds referenced by batches but missing from products table`);

  if (data.brands.length === 0) {
    console.log("  ⚠️  No brands found - cannot create products without brands");
    return { inserted: 0, skipped: data.missingProductIds.length };
  }

  const productsToInsert = data.missingProductIds.map((productId, index) => {
    const brand = data.brands[index % data.brands.length];
    const strain = data.strains[index % data.strains.length];
    const category = PRODUCT_CATEGORIES[index % PRODUCT_CATEGORIES.length];
    const subcategories = SUBCATEGORIES[category] || ["Standard"];
    const subcategory = subcategories[index % subcategories.length];

    return {
      id: productId, // Use the exact ID that batches reference
      brandId: brand.id,
      strainId: strain?.id || null,
      nameCanonical: `${strain?.name || "House"} ${category} - ${subcategory}`,
      category,
      subcategory,
      uomSellable: category === "Flower" ? "LB" : "EA",
      description: `${subcategory} ${category.toLowerCase()} product`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  console.log(`  Preparing to insert ${productsToInsert.length} products...`);

  if (dryRun) {
    console.log("  [DRY RUN] Would insert:");
    productsToInsert.slice(0, 5).forEach((p) => {
      console.log(`    - ID ${p.id}: ${p.nameCanonical} (${p.category})`);
    });
    if (productsToInsert.length > 5) {
      console.log(`    ... and ${productsToInsert.length - 5} more`);
    }
    return { inserted: 0, skipped: productsToInsert.length };
  }

  // Insert with explicit ID (requires INSERT with ID)
  let inserted = 0;
  for (const product of productsToInsert) {
    try {
      await db.execute(sql`
        INSERT INTO products (id, brandId, strainId, nameCanonical, category, subcategory, uomSellable, description, createdAt, updatedAt)
        VALUES (${product.id}, ${product.brandId}, ${product.strainId}, ${product.nameCanonical}, ${product.category}, ${product.subcategory}, ${product.uomSellable}, ${product.description}, NOW(), NOW())
        ON DUPLICATE KEY UPDATE nameCanonical = VALUES(nameCanonical)
      `);
      inserted++;
    } catch (err) {
      console.log(`    ⚠️  Failed to insert product ID ${product.id}: ${err}`);
    }
  }

  console.log(`  ✅ Inserted ${inserted} products`);
  return { inserted, skipped: productsToInsert.length - inserted };
}

async function fillSamples(data: Awaited<ReturnType<typeof getExistingData>>, dryRun: boolean) {
  console.log("\n📦 SAMPLES GAP FILLER");
  console.log("─".repeat(50));

  if (data.counts.samples > 0) {
    console.log(`  ℹ️  ${data.counts.samples} samples already exist`);
  }

  if (data.clients.length === 0 || data.users.length === 0) {
    console.log("  ⚠️  No clients or users found - cannot create samples");
    return { inserted: 0, skipped: CONFIG.samples.count };
  }

  // Get products that have batches with sampleAvailable=1
  const sampleableProducts = await db
    .selectDistinct({ productId: batches.productId })
    .from(batches)
    .where(sql`${batches.sampleAvailable} = 1 AND ${batches.deletedAt} IS NULL`)
    .limit(20);

  if (sampleableProducts.length === 0) {
    console.log("  ⚠️  No sampleable batches found - using any available products");
    // Fall back to any products
    const anyProducts = await db.select({ id: products.id }).from(products).limit(20);
    if (anyProducts.length === 0) {
      console.log("  ⚠️  No products found - cannot create samples");
      return { inserted: 0, skipped: CONFIG.samples.count };
    }
    sampleableProducts.push(...anyProducts.map((p) => ({ productId: p.id })));
  }

  const statuses = ["PENDING", "APPROVED", "FULFILLED", "RETURN_REQUESTED", "RETURNED"] as const;
  const samplesToInsert = [];

  for (let i = 0; i < CONFIG.samples.count; i++) {
    const client = data.clients[i % data.clients.length];
    const user = data.users[i % data.users.length];
    const product = sampleableProducts[i % sampleableProducts.length];
    const status = statuses[i % statuses.length];

    samplesToInsert.push({
      clientId: client.id,
      requestedBy: user.id,
      products: JSON.stringify([{ productId: product.productId, quantity: String(faker.number.int({ min: 1, max: 5 })) }]),
      sampleRequestStatus: status,
      notes: faker.lorem.sentence(),
      requestDate: faker.date.recent({ days: 30 }),
    });
  }

  console.log(`  Preparing to insert ${samplesToInsert.length} sample requests...`);

  if (dryRun) {
    console.log("  [DRY RUN] Would insert:");
    samplesToInsert.slice(0, 3).forEach((s, i) => {
      console.log(`    - Sample ${i + 1}: Client ${s.clientId}, Status: ${s.sampleRequestStatus}`);
    });
    return { inserted: 0, skipped: samplesToInsert.length };
  }

  let inserted = 0;
  for (const sample of samplesToInsert) {
    try {
      await db.execute(sql`
        INSERT INTO sampleRequests (clientId, requestedBy, products, sampleRequestStatus, notes, requestDate, createdAt, updatedAt)
        VALUES (${sample.clientId}, ${sample.requestedBy}, ${sample.products}, ${sample.sampleRequestStatus}, ${sample.notes}, ${sample.requestDate}, NOW(), NOW())
      `);
      inserted++;
    } catch (err) {
      console.log(`    ⚠️  Failed to insert sample: ${err}`);
    }
  }

  console.log(`  ✅ Inserted ${inserted} sample requests`);
  return { inserted, skipped: samplesToInsert.length - inserted };
}

async function fillCalendarEvents(data: Awaited<ReturnType<typeof getExistingData>>, dryRun: boolean) {
  console.log("\n📅 CALENDAR EVENTS GAP FILLER");
  console.log("─".repeat(50));

  if (data.counts.events > 0) {
    console.log(`  ℹ️  ${data.counts.events} calendar events already exist`);
  }

  if (data.users.length === 0) {
    console.log("  ⚠️  No users found - cannot create events");
    return { inserted: 0, skipped: CONFIG.calendarEvents.count };
  }

  const eventTitles = [
    "Client Meeting - Quarterly Review",
    "Inventory Audit",
    "Vendor Call - New Products",
    "Team Standup",
    "Photography Session",
    "Delivery Coordination",
    "Payment Follow-up",
    "Compliance Review",
    "Sales Pipeline Review",
    "New Client Onboarding",
    "Product Training",
    "Batch Intake",
    "Quality Control Check",
    "Marketing Strategy",
    "Financial Review",
    "Harvest Planning",
    "Lab Results Review",
    "Packaging Day",
    "Trade Show Prep",
    "Staff Meeting",
  ];

  const eventsToInsert = [];
  const now = new Date();

  for (let i = 0; i < CONFIG.calendarEvents.count; i++) {
    const user = data.users[i % data.users.length];
    const client = data.clients.length > 0 ? data.clients[i % data.clients.length] : null;
    const eventType = EVENT_TYPES[i % EVENT_TYPES.length];
    const module = EVENT_MODULES[i % EVENT_MODULES.length];

    // Create events spread across past week and next 2 weeks
    const daysOffset = faker.number.int({ min: -7, max: 14 });
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() + daysOffset);
    startDate.setHours(faker.number.int({ min: 8, max: 17 }), 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + faker.number.int({ min: 1, max: 3 }));

    eventsToInsert.push({
      title: eventTitles[i % eventTitles.length],
      description: faker.lorem.paragraph(),
      location: faker.helpers.arrayElement(["Office", "Warehouse", "Client Site", "Virtual", "Conference Room A"]),
      startDate: startDate.toISOString().split("T")[0],
      endDate: endDate.toISOString().split("T")[0],
      startTime: startDate.toTimeString().slice(0, 5),
      endTime: endDate.toTimeString().slice(0, 5),
      timezone: "America/Los_Angeles",
      module,
      eventType,
      status: daysOffset < 0 ? "COMPLETED" : "SCHEDULED",
      priority: faker.helpers.arrayElement(["LOW", "MEDIUM", "HIGH"]),
      visibility: "COMPANY",
      createdBy: user.id,
      assignedTo: user.id,
      clientId: client?.id || null,
    });
  }

  console.log(`  Preparing to insert ${eventsToInsert.length} calendar events...`);

  if (dryRun) {
    console.log("  [DRY RUN] Would insert:");
    eventsToInsert.slice(0, 3).forEach((e) => {
      console.log(`    - ${e.title} (${e.eventType}) on ${e.startDate}`);
    });
    return { inserted: 0, skipped: eventsToInsert.length };
  }

  let inserted = 0;
  for (const event of eventsToInsert) {
    try {
      await db.execute(sql`
        INSERT INTO calendarEvents (title, description, location, startDate, endDate, startTime, endTime, timezone, module, eventType, status, priority, visibility, createdBy, assignedTo, clientId, createdAt, updatedAt)
        VALUES (${event.title}, ${event.description}, ${event.location}, ${event.startDate}, ${event.endDate}, ${event.startTime}, ${event.endTime}, ${event.timezone}, ${event.module}, ${event.eventType}, ${event.status}, ${event.priority}, ${event.visibility}, ${event.createdBy}, ${event.assignedTo}, ${event.clientId}, NOW(), NOW())
      `);
      inserted++;
    } catch (err) {
      console.log(`    ⚠️  Failed to insert event: ${err}`);
    }
  }

  console.log(`  ✅ Inserted ${inserted} calendar events`);
  return { inserted, skipped: eventsToInsert.length - inserted };
}

async function fillTodos(data: Awaited<ReturnType<typeof getExistingData>>, dryRun: boolean) {
  console.log("\n✅ TODOS GAP FILLER");
  console.log("─".repeat(50));

  if (data.counts.todoLists > 0) {
    console.log(`  ℹ️  ${data.counts.todoLists} todo lists already exist`);
  }

  if (data.users.length === 0) {
    console.log("  ⚠️  No users found - cannot create todos");
    return { inserted: 0, skipped: CONFIG.todoTasks.count };
  }

  const user = data.users[0]; // Use first user as owner

  // First create a todo list if none exist
  let listId: number;
  if (data.counts.todoLists === 0) {
    if (dryRun) {
      console.log("  [DRY RUN] Would create todo list: 'General Tasks'");
      listId = 1;
    } else {
      const result = await db.execute(sql`
        INSERT INTO todoLists (name, description, ownerId, isShared, createdAt, updatedAt)
        VALUES ('General Tasks', 'Default task list for the team', ${user.id}, 1, NOW(), NOW())
      `);
      listId = Number((result as any)[0].insertId);
      console.log(`  ✅ Created todo list 'General Tasks' (ID: ${listId})`);
    }
  } else {
    const existingList = await db.select({ id: todoLists.id }).from(todoLists).limit(1);
    listId = existingList[0].id;
  }

  const taskTitles = [
    "Follow up with pending orders",
    "Review inventory levels",
    "Update client contact info",
    "Process outstanding invoices",
    "Schedule vendor meetings",
    "Review compliance documents",
    "Update product pricing",
    "Audit sample inventory",
    "Prepare monthly report",
    "Check batch expiration dates",
    "Update COA records",
    "Review AR aging report",
    "Contact overdue accounts",
    "Plan next week's deliveries",
    "Update employee schedules",
    "Review quality control logs",
    "Prepare tax documents",
    "Update vendor contracts",
    "Review customer feedback",
    "Plan marketing campaign",
  ];

  const tasksToInsert = [];
  const statuses = ["todo", "in_progress", "done"] as const;
  const priorities = ["low", "medium", "high", "urgent"] as const;

  for (let i = 0; i < CONFIG.todoTasks.count; i++) {
    const assignee = data.users[i % data.users.length];
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + faker.number.int({ min: -3, max: 14 }));

    tasksToInsert.push({
      listId,
      title: taskTitles[i % taskTitles.length],
      description: faker.lorem.sentence(),
      status: statuses[i % statuses.length],
      priority: priorities[i % priorities.length],
      dueDate,
      assignedTo: assignee.id,
      createdBy: user.id,
      position: i,
    });
  }

  console.log(`  Preparing to insert ${tasksToInsert.length} todo tasks...`);

  if (dryRun) {
    console.log("  [DRY RUN] Would insert:");
    tasksToInsert.slice(0, 3).forEach((t) => {
      console.log(`    - ${t.title} (${t.priority}, ${t.status})`);
    });
    return { inserted: 0, skipped: tasksToInsert.length };
  }

  let inserted = 0;
  for (const task of tasksToInsert) {
    try {
      await db.execute(sql`
        INSERT INTO todoTasks (listId, title, description, status, priority, dueDate, assignedTo, createdBy, position, createdAt, updatedAt)
        VALUES (${task.listId}, ${task.title}, ${task.description}, ${task.status}, ${task.priority}, ${task.dueDate}, ${task.assignedTo}, ${task.createdBy}, ${task.position}, NOW(), NOW())
      `);
      inserted++;
    } catch (err) {
      console.log(`    ⚠️  Failed to insert task: ${err}`);
    }
  }

  console.log(`  ✅ Inserted ${inserted} todo tasks`);
  return { inserted, skipped: tasksToInsert.length - inserted };
}

async function fillComments(data: Awaited<ReturnType<typeof getExistingData>>, dryRun: boolean) {
  console.log("\n💬 COMMENTS GAP FILLER");
  console.log("─".repeat(50));

  if (data.counts.comments > 0) {
    console.log(`  ℹ️  ${data.counts.comments} comments already exist`);
  }

  if (data.users.length === 0 || data.orders.length === 0) {
    console.log("  ⚠️  No users or orders found - cannot create comments");
    return { inserted: 0, skipped: CONFIG.comments.count };
  }

  const commentTemplates = [
    "Customer requested expedited shipping",
    "Waiting for COA verification",
    "Payment received - ready to ship",
    "Quality check completed",
    "Delivery scheduled for next week",
    "Customer asked about bulk pricing",
    "Sample sent for approval",
    "Follow up needed on payment",
    "Product substitution approved",
    "Special packaging requested",
    "Rush order - prioritize",
    "Customer very satisfied with last order",
    "Need to verify delivery address",
    "Compliance documents attached",
    "Price adjustment applied per agreement",
  ];

  const commentsToInsert = [];

  for (let i = 0; i < CONFIG.comments.count; i++) {
    const user = data.users[i % data.users.length];
    const order = data.orders[i % data.orders.length];

    commentsToInsert.push({
      commentableType: "order",
      commentableId: order.id,
      userId: user.id,
      content: commentTemplates[i % commentTemplates.length],
    });
  }

  console.log(`  Preparing to insert ${commentsToInsert.length} comments...`);

  if (dryRun) {
    console.log("  [DRY RUN] Would insert:");
    commentsToInsert.slice(0, 3).forEach((c) => {
      console.log(`    - Order ${c.commentableId}: "${c.content.slice(0, 40)}..."`);
    });
    return { inserted: 0, skipped: commentsToInsert.length };
  }

  let inserted = 0;
  for (const comment of commentsToInsert) {
    try {
      await db.execute(sql`
        INSERT INTO comments (commentableType, commentableId, userId, content, createdAt, updatedAt)
        VALUES (${comment.commentableType}, ${comment.commentableId}, ${comment.userId}, ${comment.content}, NOW(), NOW())
      `);
      inserted++;
    } catch (err) {
      console.log(`    ⚠️  Failed to insert comment: ${err}`);
    }
  }

  console.log(`  ✅ Inserted ${inserted} comments`);
  return { inserted, skipped: commentsToInsert.length - inserted };
}

async function fillVendorBills(data: Awaited<ReturnType<typeof getExistingData>>, dryRun: boolean) {
  console.log("\n📄 VENDOR BILLS GAP FILLER");
  console.log("─".repeat(50));

  if (data.counts.bills > 0) {
    console.log(`  ℹ️  ${data.counts.bills} vendor bills already exist`);
  }

  if (data.vendors.length === 0) {
    console.log("  ⚠️  No vendors found - cannot create bills");
    return { inserted: 0, skipped: CONFIG.vendorBills.count };
  }

  const billsToInsert = [];
  const statuses = ["DRAFT", "PENDING", "APPROVED", "PAID"] as const;

  for (let i = 0; i < CONFIG.vendorBills.count; i++) {
    const vendor = data.vendors[i % data.vendors.length];
    const status = statuses[i % statuses.length];
    const billDate = faker.date.recent({ days: 60 });
    const dueDate = new Date(billDate);
    dueDate.setDate(dueDate.getDate() + 30);

    const amount = faker.number.float({ min: 1000, max: 50000, fractionDigits: 2 });

    billsToInsert.push({
      vendorId: vendor.id,
      billNumber: `BILL-${faker.string.alphanumeric(8).toUpperCase()}`,
      billDate,
      dueDate,
      status,
      subtotal: amount.toFixed(2),
      taxAmount: (amount * 0.0875).toFixed(2),
      totalAmount: (amount * 1.0875).toFixed(2),
      paidAmount: status === "PAID" ? (amount * 1.0875).toFixed(2) : "0.00",
      notes: `Invoice for ${faker.commerce.productName()}`,
    });
  }

  console.log(`  Preparing to insert ${billsToInsert.length} vendor bills...`);

  if (dryRun) {
    console.log("  [DRY RUN] Would insert:");
    billsToInsert.slice(0, 3).forEach((b) => {
      console.log(`    - ${b.billNumber}: $${b.totalAmount} (${b.status})`);
    });
    return { inserted: 0, skipped: billsToInsert.length };
  }

  let inserted = 0;
  for (const bill of billsToInsert) {
    try {
      await db.execute(sql`
        INSERT INTO bills (vendorId, billNumber, billDate, dueDate, status, subtotal, taxAmount, totalAmount, paidAmount, notes, createdAt, updatedAt)
        VALUES (${bill.vendorId}, ${bill.billNumber}, ${bill.billDate}, ${bill.dueDate}, ${bill.status}, ${bill.subtotal}, ${bill.taxAmount}, ${bill.totalAmount}, ${bill.paidAmount}, ${bill.notes}, NOW(), NOW())
      `);
      inserted++;
    } catch (err) {
      console.log(`    ⚠️  Failed to insert bill: ${err}`);
    }
  }

  console.log(`  ✅ Inserted ${inserted} vendor bills`);
  return { inserted, skipped: billsToInsert.length - inserted };
}

// ============================================================================
// Main Execution
// ============================================================================

async function main() {
  const flags = parseArgs();

  if (flags.help) {
    showHelp();
    process.exit(0);
  }

  console.log("═".repeat(60));
  console.log("TERP Safe Data Gap Filler");
  console.log("═".repeat(60));
  console.log(`Started: ${new Date().toISOString()}`);
  if (flags.dryRun) console.log("🔍 DRY RUN MODE - No data will be inserted");
  if (flags.only) console.log(`📌 Only running: ${flags.only}`);
  console.log();

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error("❌ Failed to connect to database");
    process.exit(1);
  }
  console.log("✅ Database connection established\n");

  // Get existing data
  const data = await getExistingData();

  // Run gap fillers
  const results: Record<string, { inserted: number; skipped: number }> = {};

  const fillers: Record<string, () => Promise<{ inserted: number; skipped: number }>> = {
    products: () => fillProducts(data, flags.dryRun),
    samples: () => fillSamples(data, flags.dryRun),
    calendar: () => fillCalendarEvents(data, flags.dryRun),
    todos: () => fillTodos(data, flags.dryRun),
    comments: () => fillComments(data, flags.dryRun),
    bills: () => fillVendorBills(data, flags.dryRun),
  };

  if (flags.only) {
    if (fillers[flags.only]) {
      results[flags.only] = await fillers[flags.only]();
    } else {
      console.error(`❌ Unknown filler: ${flags.only}`);
      console.log(`   Available: ${Object.keys(fillers).join(", ")}`);
      process.exit(1);
    }
  } else {
    for (const [name, filler] of Object.entries(fillers)) {
      results[name] = await filler();
    }
  }

  // Summary
  console.log("\n" + "═".repeat(60));
  console.log("SUMMARY");
  console.log("═".repeat(60));

  let totalInserted = 0;
  let totalSkipped = 0;

  for (const [name, result] of Object.entries(results)) {
    console.log(`  ${name}: ${result.inserted} inserted, ${result.skipped} skipped`);
    totalInserted += result.inserted;
    totalSkipped += result.skipped;
  }

  console.log("─".repeat(60));
  console.log(`  TOTAL: ${totalInserted} inserted, ${totalSkipped} skipped`);
  console.log("═".repeat(60));

  if (flags.dryRun) {
    console.log("\n💡 Run without --dry-run to actually insert the data");
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
