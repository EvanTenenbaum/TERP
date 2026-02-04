/**
 * BUG-132: Product dropdown should not be empty when strainId is provided.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import * as productsDb from "../productsDb";
import { getDb } from "../db";

vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

type ProductRow = {
  id: number;
  brandId: number | null;
  strainId: number | null;
  nameCanonical: string;
  category: string;
  subcategory: string | null;
  uomSellable: string | null;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
  brandName: string | null;
  strainName: string | null;
};

type ProductQueryChain = {
  select: (fields: unknown) => ProductQueryChain;
  from: (table: unknown) => ProductQueryChain;
  leftJoin: (table: unknown, on: unknown) => ProductQueryChain;
  where: (condition?: unknown) => ProductQueryChain;
  orderBy: (order: unknown) => ProductQueryChain;
  limit: (value: number) => ProductQueryChain;
  offset: (value: number) => Promise<ProductRow[]>;
};

type CountQueryChain = {
  select: (fields: unknown) => CountQueryChain;
  from: (table: unknown) => CountQueryChain;
  where: (condition?: unknown) => Promise<Array<{ count: number }>>;
};

const createProductQueryChain = (rows: ProductRow[]): ProductQueryChain => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  leftJoin: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  offset: vi.fn().mockResolvedValue(rows),
});

const createCountQueryChain = (count: number): CountQueryChain => ({
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockResolvedValue([{ count }]),
});

describe("productsDb", (): void => {
  beforeEach((): void => {
    vi.clearAllMocks();
  });

  it("returns products even when strainId filter is provided", async (): Promise<void> => {
    const rows: ProductRow[] = [
      {
        id: 1,
        brandId: 2,
        strainId: null,
        nameCanonical: "Blue Dream",
        category: "Flower",
        subcategory: null,
        uomSellable: "EA",
        description: null,
        createdAt: new Date("2025-01-01"),
        updatedAt: new Date("2025-01-02"),
        deletedAt: null,
        brandName: "Acme",
        strainName: null,
      },
    ];

    const mockDb = createProductQueryChain(rows);
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await productsDb.getProducts({ strainId: 99 });

    expect(result).toEqual(rows);
  });

  it("returns product count even when strainId filter is provided", async (): Promise<void> => {
    const mockDb = createCountQueryChain(5);
    vi.mocked(getDb).mockResolvedValue(
      mockDb as unknown as Awaited<ReturnType<typeof getDb>>
    );

    const result = await productsDb.getProductCount({ strainId: 99 });

    expect(result).toBe(5);
  });
});
