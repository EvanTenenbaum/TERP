// @ts-nocheck - TEMPORARY: Schema mismatch errors, needs Wave 1 fix
import fs from "fs/promises";
import path from "path";
import { eq, inArray } from "drizzle-orm";
import {
  batches,
  brands,
  clients,
  InsertBrand,
  InsertBatch,
  InsertClient,
  InsertOrder,
  InsertProduct,
  InsertStrain,
  InsertUser,
  lots,
  orders,
  products,
  strains,
  users,
  vendors,
} from "../../../drizzle/schema";
import { getDb } from "../../db";
import { logger } from "../../_core/logger";

type PaymentTerms =
  | "COD"
  | "NET_7"
  | "NET_15"
  | "NET_30"
  | "CONSIGNMENT"
  | "PARTIAL";

interface SeedClient {
  code: string;
  name: string;
  contactName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  isBuyer: boolean;
  isSeller: boolean;
  tags: string[];
  tier: string;
}

interface SeedInventoryItem {
  sku: string;
  strain: string;
  strainType: string;
  category: string;
  subcategory: string;
  brand: string;
  unitCogs: number;
  unitPrice: number;
  onHandQty: number;
  reservedQty: number;
  sampleQty: number;
  harvestDate: string;
  packageDate: string;
  potency: { thc: number; cbd: number };
  lotCode: string;
}

interface SeedOrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
  unitCogs: number;
  isSample?: boolean;
}

interface SeedOrder {
  orderNumber: string;
  clientCode: string;
  orderDate: string;
  paymentTerms: PaymentTerms;
  saleStatus: string;
  fulfillmentStatus: string;
  items: SeedOrderItem[];
  notes?: string;
}

type BuiltOrderItem = {
  batchId: number;
  displayName: string;
  originalName: string;
  quantity: number;
  unitPrice: number;
  isSample: boolean;
  unitCogs: number;
  cogsMode: "FIXED";
  cogsSource: "FIXED";
  appliedRule?: string;
  unitMargin: number;
  marginPercent: number;
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
};

interface SeedData {
  clients: SeedClient[];
  inventory: SeedInventoryItem[];
  orders: SeedOrder[];
}

const DATA_DIR = path.join(process.cwd(), "server", "db", "seed", "seedData");
const SEED_USER: InsertUser = {
  openId: "demo-production-seed",
  name: "Demo Seed User",
  email: "seed@terp.app",
  role: "admin",
  loginMethod: "seed-script",
};

async function loadSeedData(): Promise<SeedData> {
  const [clientsRaw, inventoryRaw, ordersRaw] = await Promise.all([
    fs.readFile(path.join(DATA_DIR, "clients.json"), "utf-8"),
    fs.readFile(path.join(DATA_DIR, "inventory.json"), "utf-8"),
    fs.readFile(path.join(DATA_DIR, "orders.json"), "utf-8"),
  ]);

  return {
    clients: JSON.parse(clientsRaw) as SeedClient[],
    inventory: JSON.parse(inventoryRaw) as SeedInventoryItem[],
    orders: JSON.parse(ordersRaw) as SeedOrder[],
  };
}

function toDecimalString(value: number): string {
  return value.toFixed(2);
}

function buildDueDate(orderDate: Date, terms: PaymentTerms): Date | null {
  const result = new Date(orderDate);
  switch (terms) {
    case "COD":
      return orderDate;
    case "NET_7":
      result.setDate(result.getDate() + 7);
      return result;
    case "NET_15":
      result.setDate(result.getDate() + 15);
      return result;
    case "NET_30":
      result.setDate(result.getDate() + 30);
      return result;
    case "CONSIGNMENT":
    case "PARTIAL":
      result.setDate(result.getDate() + 45);
      return result;
    default:
      return null;
  }
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

async function seedClients(
  seedClients: SeedClient[]
): Promise<Map<string, number>> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  for (const client of seedClients) {
    const payload: InsertClient = {
      teriCode: client.code,
      name: client.name,
      email: client.email,
      phone: client.phone,
      address: client.address,
      isBuyer: client.isBuyer,
      isSeller: client.isSeller,
      tags: client.tags,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .insert(clients)
      .values(payload)
      .onDuplicateKeyUpdate({
        set: {
          name: payload.name,
          email: payload.email,
          phone: payload.phone,
          address: payload.address,
          isBuyer: payload.isBuyer,
          isSeller: payload.isSeller,
          tags: payload.tags,
          updatedAt: new Date(),
        },
      });
  }

  const clientCodes = seedClients.map(client => client.code);
  const clientRows = await db
    .select({ id: clients.id, teriCode: clients.teriCode })
    .from(clients)
    .where(inArray(clients.teriCode, clientCodes));

  const codeToId = new Map<string, number>();
  clientRows.forEach(row => codeToId.set(row.teriCode, row.id));

  if (codeToId.size !== seedClients.length) {
    throw new Error(
      `Client seeding incomplete: expected ${seedClients.length}, found ${codeToId.size}`
    );
  }

  return codeToId;
}

async function seedStrains(
  seedInventory: SeedInventoryItem[]
): Promise<Map<string, number>> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const uniqueStrains = Array.from(
    new Set(seedInventory.map(item => item.strain))
  );
  for (const strainName of uniqueStrains) {
    const payload: InsertStrain = {
      name: strainName,
      standardizedName: strainName.toUpperCase(),
      aliases: "[]",
      category: null,
      description: null,
      openthcId: null,
      openthcStub: null,
      parentStrainId: null,
      baseStrainName: strainName,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .insert(strains)
      .values(payload)
      .onDuplicateKeyUpdate({
        set: {
          standardizedName: payload.standardizedName,
          baseStrainName: payload.baseStrainName,
          updatedAt: new Date(),
        },
      });
  }

  const strainRows = await db
    .select({ id: strains.id, name: strains.name })
    .from(strains)
    .where(inArray(strains.name, uniqueStrains));

  const map = new Map<string, number>();
  strainRows.forEach(row => map.set(row.name, row.id));
  return map;
}

async function seedVendorsAndBrands(
  seedInventory: SeedInventoryItem[]
): Promise<{
  brandIds: Map<string, number>;
  vendorIds: Map<string, number>;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const uniqueBrands = Array.from(
    new Set(seedInventory.map(item => item.brand))
  );
  const brandIds = new Map<string, number>();
  const vendorIds = new Map<string, number>();

  for (const brandName of uniqueBrands) {
    const vendorName = `${brandName} Supply`;
    await db
      .insert(vendors)
      .values({
        name: vendorName,
        contactName: brandName,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onDuplicateKeyUpdate({
        set: { contactName: vendorName, updatedAt: new Date() },
      });
  }

  const vendorRows = await db
    .select({ id: vendors.id, name: vendors.name })
    .from(vendors)
    .where(
      inArray(
        vendors.name,
        uniqueBrands.map(name => `${name} Supply`)
      )
    );
  vendorRows.forEach(row =>
    vendorIds.set(row.name.replace(/ Supply$/, ""), row.id)
  );
  if (vendorIds.size !== uniqueBrands.length) {
    throw new Error(
      `Vendor seeding incomplete: expected ${uniqueBrands.length}, found ${vendorIds.size}`
    );
  }

  for (const brandName of uniqueBrands) {
    const vendorId = vendorIds.get(brandName);
    const payload: InsertBrand = {
      name: brandName,
      vendorId,
      description: `${brandName} catalog for demo data`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .insert(brands)
      .values({
        name: payload.name,
        vendorId: payload.vendorId ?? undefined,
        description: payload.description,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt,
      })
      .onDuplicateKeyUpdate({
        set: {
          description: payload.description,
          updatedAt: new Date(),
          vendorId: payload.vendorId ?? null,
        },
      });
  }

  const brandRows = await db
    .select({ id: brands.id, name: brands.name })
    .from(brands)
    .where(inArray(brands.name, uniqueBrands));
  brandRows.forEach(row => brandIds.set(row.name, row.id));
  if (brandIds.size !== uniqueBrands.length) {
    throw new Error(
      `Brand seeding incomplete: expected ${uniqueBrands.length}, found ${brandIds.size}`
    );
  }

  return { brandIds, vendorIds };
}

async function seedProductsAndLots(
  seedInventory: SeedInventoryItem[],
  brandIds: Map<string, number>,
  strainIds: Map<string, number>,
  vendorIds: Map<string, number>
): Promise<{
  productIds: Map<string, number>;
  lotIds: Map<string, number>;
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  for (const item of seedInventory) {
    const productPayload: InsertProduct = {
      brandId: brandIds.get(item.brand) ?? 1,
      strainId: strainIds.get(item.strain) ?? null,
      nameCanonical: `${item.strain} ${item.category} (${item.sku})`,
      category: item.category,
      subcategory: item.subcategory,
      uomSellable: "EA",
      description: `${item.brand} ${item.strain} - ${item.category}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db
      .insert(products)
      .values(productPayload)
      .onDuplicateKeyUpdate({
        set: {
          description: productPayload.description,
          updatedAt: new Date(),
          strainId: productPayload.strainId,
        },
      });

    const vendorId = vendorIds.get(item.brand);
    if (!vendorId) {
      throw new Error(`Missing vendor for brand ${item.brand}`);
    }

    const lotPayload = {
      code: item.lotCode,
      vendorId,
      supplierClientId: null,
      date: new Date(item.harvestDate),
      notes: `${item.brand} ${item.strain} lot`,
      createdAt: new Date(),
    };

    await db
      .insert(lots)
      .values(lotPayload)
      .onDuplicateKeyUpdate({
        set: { notes: lotPayload.notes, date: lotPayload.date },
      });
  }

  const productRows = await db
    .select({ id: products.id, name: products.nameCanonical })
    .from(products)
    .where(
      inArray(
        products.nameCanonical,
        seedInventory.map(
          item => `${item.strain} ${item.category} (${item.sku})`
        )
      )
    );
  const lotRows = await db
    .select({ id: lots.id, code: lots.code })
    .from(lots)
    .where(
      inArray(
        lots.code,
        seedInventory.map(item => item.lotCode)
      )
    );

  const productIds = new Map<string, number>();
  productRows.forEach(row => productIds.set(row.name, row.id));

  const lotIds = new Map<string, number>();
  lotRows.forEach(row => lotIds.set(row.code, row.id));

  return { productIds, lotIds };
}

async function seedBatches(
  seedInventory: SeedInventoryItem[],
  productIds: Map<string, number>,
  lotIds: Map<string, number>
): Promise<Map<string, number>> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  for (const item of seedInventory) {
    const productKey = `${item.strain} ${item.category} (${item.sku})`;
    const productId = productIds.get(productKey);
    const lotId = lotIds.get(item.lotCode);

    if (!productId || !lotId) {
      throw new Error(`Missing product or lot mapping for SKU ${item.sku}`);
    }

    const payload: InsertBatch = {
      code: `${item.lotCode}-${item.sku.slice(-4)}`,
      sku: item.sku,
      productId,
      lotId,
      batchStatus: "LIVE",
      statusId: null,
      grade: "A",
      isSample: item.sampleQty > 0 ? 1 : 0,
      sampleOnly: 0,
      sampleAvailable: 1,
      cogsMode: "FIXED",
      unitCogs: toDecimalString(item.unitCogs),
      unitCogsMin: null,
      unitCogsMax: null,
      paymentTerms: "NET_30",
      amountPaid: "0",
      metadata: JSON.stringify({ potency: item.potency }),
      onHandQty: toDecimalString(item.onHandQty),
      sampleQty: toDecimalString(item.sampleQty),
      reservedQty: toDecimalString(item.reservedQty),
      quarantineQty: "0.00",
      holdQty: "0.00",
      defectiveQty: "0.00",
      publishEcom: 0,
      publishB2b: 1,
      createdAt: new Date(item.packageDate),
      updatedAt: new Date(item.packageDate),
    };

    await db
      .insert(batches)
      .values(payload)
      .onDuplicateKeyUpdate({
        set: {
          grade: payload.grade,
          unitCogs: payload.unitCogs,
          onHandQty: payload.onHandQty,
          reservedQty: payload.reservedQty,
          sampleQty: payload.sampleQty,
          metadata: payload.metadata,
          updatedAt: new Date(),
        },
      });
  }

  const batchRows = await db
    .select({ id: batches.id, sku: batches.sku })
    .from(batches)
    .where(
      inArray(
        batches.sku,
        seedInventory.map(item => item.sku)
      )
    );

  const batchIds = new Map<string, number>();
  batchRows.forEach(row => batchIds.set(row.sku, row.id));
  return batchIds;
}

function buildOrderItems(
  order: SeedOrder,
  inventoryBySku: Map<string, SeedInventoryItem>,
  batchIds: Map<string, number>
): BuiltOrderItem[] {
  const mappedItems = order.items
    .map(item => {
      const inventoryItem = inventoryBySku.get(item.sku);
      const batchId = batchIds.get(item.sku);
      if (!inventoryItem || !batchId) {
        return null;
      }
      const lineTotal = item.unitPrice * item.quantity;
      const lineCogs = item.unitCogs * item.quantity;
      const unitMargin = item.unitPrice - item.unitCogs;
      const marginPercent =
        item.unitPrice > 0 ? (unitMargin / item.unitPrice) * 100 : 0;

      return {
        batchId,
        displayName: `${inventoryItem.brand} ${inventoryItem.strain}`,
        originalName: inventoryItem.strain,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        isSample: item.isSample ?? false,
        unitCogs: item.unitCogs,
        cogsMode: "FIXED" as const,
        cogsSource: "FIXED" as const,
        appliedRule: undefined,
        unitMargin,
        marginPercent,
        lineTotal,
        lineCogs,
        lineMargin: lineTotal - lineCogs,
      };
    })
    .filter((item): item is BuiltOrderItem => Boolean(item));

  return mappedItems;
}

async function seedOrders(
  seedOrders: SeedOrder[],
  clientIds: Map<string, number>,
  batchIds: Map<string, number>,
  inventory: SeedInventoryItem[],
  createdBy: number
): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const inventoryBySku = new Map(inventory.map(item => [item.sku, item]));
  for (const order of seedOrders) {
    const clientId = clientIds.get(order.clientCode);
    if (!clientId) {
      throw new Error(
        `Missing client for order ${order.orderNumber} (${order.clientCode})`
      );
    }

    const orderDate = new Date(order.orderDate);
    const itemPayloads = buildOrderItems(order, inventoryBySku, batchIds);
    if (
      itemPayloads.length === 0 ||
      itemPayloads.length !== order.items.length
    ) {
      throw new Error(`Order ${order.orderNumber} has unresolved items`);
    }

    const subtotal = itemPayloads.reduce(
      (sum, item) => sum + item.lineTotal,
      0
    );
    const totalCogs = itemPayloads.reduce(
      (sum, item) => sum + item.lineCogs,
      0
    );
    const totalMargin = subtotal - totalCogs;
    const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
    const dueDate = buildDueDate(orderDate, order.paymentTerms);

    const orderPayload: InsertOrder = {
      orderNumber: order.orderNumber,
      orderType: "SALE",
      isDraft: false,
      clientId,
      items: itemPayloads,
      subtotal: toDecimalString(subtotal),
      tax: toDecimalString(subtotal * 0.08),
      discount: "0",
      total: toDecimalString(subtotal * 1.08),
      totalCogs: toDecimalString(totalCogs),
      totalMargin: toDecimalString(totalMargin),
      avgMarginPercent: toDecimalString(avgMarginPercent),
      validUntil: null,
      quoteStatus: null,
      paymentTerms: order.paymentTerms,
      cashPayment: "0",
      dueDate: dueDate ?? null,
      saleStatus: order.saleStatus as InsertOrder["saleStatus"],
      invoiceId: null,
      fulfillmentStatus:
        order.fulfillmentStatus as InsertOrder["fulfillmentStatus"],
      packedAt: order.fulfillmentStatus !== "PENDING" ? orderDate : null,
      packedBy: null,
      shippedAt:
        order.fulfillmentStatus === "SHIPPED"
          ? new Date(orderDate.getTime() + 2 * 24 * 60 * 60 * 1000)
          : null,
      shippedBy: null,
      pickPackStatus: "READY",
      referredByClientId: null,
      isReferralOrder: false,
      convertedFromOrderId: null,
      convertedFromSalesSheetId: null,
      convertedAt: null,
      confirmedAt: orderDate,
      relatedSampleRequestId: null,
      deletedAt: null,
      notes: order.notes ?? null,
      createdBy,
      createdAt: orderDate,
      updatedAt: orderDate,
    };

    await db
      .insert(orders)
      .values(orderPayload)
      .onDuplicateKeyUpdate({
        set: {
          items: orderPayload.items,
          subtotal: orderPayload.subtotal,
          total: orderPayload.total,
          totalCogs: orderPayload.totalCogs,
          totalMargin: orderPayload.totalMargin,
          avgMarginPercent: orderPayload.avgMarginPercent,
          saleStatus: orderPayload.saleStatus,
          fulfillmentStatus: orderPayload.fulfillmentStatus,
          paymentTerms: orderPayload.paymentTerms,
          updatedAt: new Date(),
        },
      });
  }
}

export async function seedProductionData(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  logger.info("Loading production seed data from JSON files");
  const {
    clients: clientSeed,
    inventory,
    orders: orderSeed,
  } = await loadSeedData();
  const createdBy = await upsertSeedUser();

  logger.info("Upserting clients");
  const clientIds = await seedClients(clientSeed);

  logger.info("Upserting strains");
  const strainIds = await seedStrains(inventory);

  logger.info("Upserting vendors and brands");
  const { brandIds, vendorIds } = await seedVendorsAndBrands(inventory);

  logger.info("Upserting products and lots");
  const { productIds, lotIds } = await seedProductsAndLots(
    inventory,
    brandIds,
    strainIds,
    vendorIds
  );

  logger.info("Upserting batches");
  const batchIds = await seedBatches(inventory, productIds, lotIds);

  logger.info("Creating orders");
  await seedOrders(orderSeed, clientIds, batchIds, inventory, createdBy);

  logger.info("✅ Production demo data seeded successfully");
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
  seedProductionData().catch(error => {
    logger.error({ err: error }, "Failed to seed production data");
    process.exit(1);
  });
}
