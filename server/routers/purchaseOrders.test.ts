import { describe, it, expect, beforeAll, vi } from "vitest";
import type { Request, Response } from "express";
import { setupDbMock } from "../test-utils/testDb";
import { setupPermissionMock } from "../test-utils/testPermissions";

// Mock the database (MUST be before other imports)
vi.mock("../db", () => setupDbMock());

// Mock permission service (MUST be before other imports)
vi.mock("../services/permissionService", () => setupPermissionMock());

// Mock product data access
vi.mock("../productsDb");

import { appRouter } from "../routers";
import { createContext } from "../_core/context";
import * as productsDb from "../productsDb";
import { getDb } from "../db";
import {
  clients,
  products,
  purchaseOrderItems,
  purchaseOrders,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const mockUser = {
  id: 1,
  email: "test@terp.com",
  name: "Test User",
};

const createCaller = async () => {
  const req = { headers: {}, cookies: {} } as Request;
  const res = {} as Response;
  const ctx = await createContext({ req, res });

  return appRouter.createCaller({
    ...ctx,
    user: mockUser,
  });
};

const seedPurchaseOrder = async ({
  id,
  supplierClientId,
  deletedAt,
}: {
  id: number;
  supplierClientId: number;
  deletedAt: Date | null;
}) => {
  const db = await getDb();
  await db.insert(purchaseOrders).values({
    id,
    poNumber: `PO-${id}`,
    supplierClientId,
    purchaseOrderStatus: "DRAFT",
    orderDate: new Date("2026-02-01"),
    subtotal: "100.00",
    total: "100.00",
    createdBy: mockUser.id,
    createdAt: new Date("2026-02-01"),
    updatedAt: new Date("2026-02-01"),
    deletedAt,
  });
};

const seedSupplierClient = async ({
  id,
  name,
}: {
  id: number;
  name: string;
}) => {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.insert(clients).values({
    id,
    teriCode: `SUP-${id}`,
    name,
    isSeller: true,
  });
};

const hasDeletedAtNullPredicate = (value: unknown): boolean => {
  const seen = new Set<object>();
  const stack: unknown[] = [value];
  let sawDeletedAtColumn = false;
  let sawNullPredicate = false;

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current || typeof current !== "object") continue;

    const currentObj = current as Record<string, unknown>;
    if (seen.has(currentObj)) continue;
    seen.add(currentObj);

    if (currentObj.name === "deletedAt") {
      sawDeletedAtColumn = true;
    }

    if (Object.prototype.hasOwnProperty.call(currentObj, "value")) {
      const chunkValue = currentObj.value;
      if (
        Array.isArray(chunkValue) &&
        chunkValue.some(
          entry =>
            typeof entry === "string" && entry.toLowerCase().includes("is null")
        )
      ) {
        sawNullPredicate = true;
      }
      if (chunkValue === null) {
        sawNullPredicate = true;
      }
    }

    for (const child of Object.values(currentObj)) {
      if (Array.isArray(child)) {
        for (const item of child) {
          if (item && typeof item === "object") {
            stack.push(item);
          }
        }
      } else if (child && typeof child === "object") {
        stack.push(child);
      }
    }
  }

  return sawDeletedAtColumn && sawNullPredicate;
};

const getWhereConditionsFromSelectMock = (
  db: Awaited<ReturnType<typeof getDb>>
) => {
  if (!db) return [];
  return vi.mocked(db.select).mock.results.flatMap(result => {
    const builder = result.value as {
      where?: { mock?: { calls?: unknown[][] } };
    };
    return builder.where?.mock?.calls?.map(call => call[0]) ?? [];
  });
};

describe("Purchase Orders Router", () => {
  let caller: Awaited<ReturnType<typeof createCaller>>;

  beforeAll(async () => {
    caller = await createCaller();
  });

  it("returns product options for PO dropdown", async () => {
    const mockProducts = [
      {
        id: 1,
        brandId: 10,
        strainId: null,
        nameCanonical: "Blue Dream",
        category: "Flower",
        subcategory: null,
        uomSellable: "EA",
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        brandName: "Evergreen Farms",
        strainName: null,
      },
    ];

    vi.mocked(productsDb.getProducts).mockResolvedValue(mockProducts);
    vi.mocked(productsDb.getProductCount).mockResolvedValue(1);

    const result = await caller.purchaseOrders.products({
      search: "blue",
      limit: 25,
    });

    expect(productsDb.getProducts).toHaveBeenCalledWith({
      search: "blue",
      limit: 25,
      offset: 0,
      includeDeleted: false,
    });
    expect(productsDb.getProductCount).toHaveBeenCalledWith({
      search: "blue",
      includeDeleted: false,
    });
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.nameCanonical).toBe("Blue Dream");
  });

  it("applies deletedAt null guard in list/getAll/getById queries", async () => {
    const supplierClientId = 91001;
    const activePoId = 910001;
    const preDeletedPoId = 910002;

    await seedPurchaseOrder({
      id: activePoId,
      supplierClientId,
      deletedAt: null,
    });
    await seedPurchaseOrder({
      id: preDeletedPoId,
      supplierClientId,
      deletedAt: new Date("2026-02-15"),
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    vi.mocked(db.select).mockClear();
    await caller.purchaseOrders.list({
      supplierClientId,
      limit: 50,
      offset: 0,
    });
    const listWhereConditions = getWhereConditionsFromSelectMock(db);
    expect(
      listWhereConditions.some(condition =>
        hasDeletedAtNullPredicate(condition)
      )
    ).toBe(true);

    vi.mocked(db.select).mockClear();
    await caller.purchaseOrders.getAll({
      supplierClientId,
      limit: 50,
      offset: 0,
    });
    const getAllWhereConditions = getWhereConditionsFromSelectMock(db);
    expect(
      getAllWhereConditions.some(condition =>
        hasDeletedAtNullPredicate(condition)
      )
    ).toBe(true);

    vi.mocked(db.select).mockClear();
    await expect(
      caller.purchaseOrders.getById({ id: activePoId })
    ).resolves.toMatchObject({ id: activePoId });
    const getByIdWhereConditions = getWhereConditionsFromSelectMock(db);
    expect(
      getByIdWhereConditions.some(condition =>
        hasDeletedAtNullPredicate(condition)
      )
    ).toBe(true);
  });

  it("supports delete then restore lifecycle for purchase orders", async () => {
    const supplierClientId = 92001;
    const activePoId = 920001;

    await seedPurchaseOrder({
      id: activePoId,
      supplierClientId,
      deletedAt: null,
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    await caller.purchaseOrders.delete({ id: activePoId });

    const [deletedPo] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, activePoId));
    expect(deletedPo?.deletedAt).toBeInstanceOf(Date);

    const restoreResult = await caller.purchaseOrders.restore({
      id: activePoId,
    });
    expect(restoreResult).toEqual({ success: true });

    const [restoredPo] = await db
      .select()
      .from(purchaseOrders)
      .where(eq(purchaseOrders.id, activePoId));
    expect(restoredPo?.deletedAt).toBeNull();
  });

  it("creates PO lines from typed product names and defaults payment terms to consignment", async () => {
    const supplierClientId = 93001;
    await seedSupplierClient({
      id: supplierClientId,
      name: "Redwood Supply",
    });

    const result = await caller.purchaseOrders.create({
      supplierClientId,
      orderDate: "2026-03-10",
      items: [
        {
          productName: "Moonlight Runtz",
          category: "Flower",
          quantityOrdered: 12,
          cogsMode: "FIXED",
          unitCost: 87.5,
        },
      ],
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const createdPo = (await db.select().from(purchaseOrders)).find(
      po => po.id === result.id
    );
    expect(createdPo?.paymentTerms).toBe("CONSIGNMENT");

    const createdItem = (await db.select().from(purchaseOrderItems)).find(
      item => item.purchaseOrderId === result.id
    );
    expect(createdItem?.productId).toBeGreaterThan(0);
    expect(createdItem?.cogsMode).toBe("FIXED");
    expect(Number(createdItem?.unitCost)).toBe(87.5);

    const createdProduct = (await db.select().from(products)).find(
      product => product.id === (createdItem?.productId ?? -1)
    );
    expect(createdProduct?.nameCanonical).toBe("Moonlight Runtz");
    expect(createdProduct?.supplierClientId).toBe(supplierClientId);
  });

  it("persists range COGS on PO items for receiving", async () => {
    const supplierClientId = 93002;
    await seedSupplierClient({
      id: supplierClientId,
      name: "Peak Range Farms",
    });

    const result = await caller.purchaseOrders.create({
      supplierClientId,
      orderDate: "2026-03-10",
      paymentTerms: "NET_15",
      items: [
        {
          productName: "Range Resin",
          category: "Concentrates",
          quantityOrdered: 5,
          cogsMode: "RANGE",
          unitCostMin: 42,
          unitCostMax: 58,
        },
      ],
    });

    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const createdItem = (await db.select().from(purchaseOrderItems)).find(
      item => item.purchaseOrderId === result.id
    );

    expect(createdItem?.cogsMode).toBe("RANGE");
    expect(Number(createdItem?.unitCostMin)).toBe(42);
    expect(Number(createdItem?.unitCostMax)).toBe(58);
    expect(Number(createdItem?.unitCost)).toBe(50);
    expect(Number(createdItem?.totalCost)).toBe(250);
  });
});
