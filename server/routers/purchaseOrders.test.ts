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
});
