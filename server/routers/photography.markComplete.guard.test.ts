import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";

type MockRow = Record<string, unknown>;
type MockStorage = Record<string, MockRow[]>;

type Condition =
  | { op: "eq"; col: { name?: string }; val: unknown }
  | { op: "and"; args: unknown[] }
  | { op: "inArray"; col: { name?: string }; values: unknown[] }
  | { op: string; [key: string]: unknown };

function isCondition(value: unknown): value is Condition {
  return typeof value === "object" && value !== null && "op" in value;
}

type SelectBuilder = {
  from: (table: unknown) => unknown;
};

type InsertBuilder = {
  values: (values: unknown) => unknown;
};

type UpdateBuilder = {
  set: (values: Record<string, unknown>) => {
    where: (condition: unknown) => unknown;
  };
};

type MockDbApi = {
  select: (selection?: Record<string, { name?: string }>) => SelectBuilder;
  insert: (table: unknown) => InsertBuilder;
  update: (table: unknown) => UpdateBuilder;
  transaction: (cb: (db: unknown) => unknown) => unknown;
};

// -----------------------------------------------------------------------------
// In-memory DB mock (unit-test only)
// -----------------------------------------------------------------------------
// We mock server/db.ts so unit tests never hit a real MySQL connection.
// This also keeps tests fast/consistent in local dev where DATABASE_URL is often
// set to a placeholder (see tests/setup.ts).
const { mockStorage, mockDb } = vi.hoisted(() => {
  const mockStorage: MockStorage = {};

  function getTableName(table: unknown): string {
    if (typeof table === "string") return table;
    if (!table || typeof table !== "object") return "unknown";

    const symbols = Object.getOwnPropertySymbols(table);
    for (const sym of symbols) {
      if (sym.toString() === "Symbol(drizzle:Name)") {
        return (table as Record<symbol, unknown>)[sym] as string;
      }
    }
    const maybeName = (table as { _?: { name?: unknown } })._?.name;
    if (typeof maybeName === "string") return maybeName;
    return "unknown";
  }

  function matchesCondition(row: MockRow, condition: unknown): boolean {
    if (!isCondition(condition)) return true;

    if (condition.op === "eq") {
      const colName = condition.col?.name;
      if (!colName) return false;
      // Compare against DB column name primarily, fall back to JS key.
      const left = row[colName];
      return left === condition.val;
    }

    if (condition.op === "and") {
      return (condition.args || []).every(c => matchesCondition(row, c));
    }

    if (condition.op === "inArray") {
      const colName = condition.col?.name;
      if (!colName) return false;
      const left = row[colName];
      return (condition.values || []).includes(left);
    }

    // Unknown condition type: be permissive for unit tests.
    return true;
  }

  const mockDb: Record<string, unknown> = {
    select: vi.fn((selection?: Record<string, { name?: string }>) => {
      let rows: MockRow[] = [];

      const builder: Record<string, unknown> = {
        from: vi.fn((table: unknown) => {
          const tableName = getTableName(table);
          if (!mockStorage[tableName]) mockStorage[tableName] = [];
          rows = [...mockStorage[tableName]];
          return builder;
        }),
        where: vi.fn((condition: unknown) => {
          rows = rows.filter(r => matchesCondition(r, condition));
          return builder;
        }),
        limit: vi.fn((n: number) => {
          rows = rows.slice(0, n);
          return builder;
        }),
        orderBy: vi.fn(() => builder),
        then: (resolve: (value: unknown) => void) => {
          if (selection && typeof selection === "object") {
            const projected = rows.map(r => {
              const out: Record<string, unknown> = {};
              for (const key of Object.keys(selection)) {
                const col = selection[key];
                out[key] = r[col?.name] ?? r[key];
              }
              return out;
            });
            return resolve(projected);
          }

          // By default, return rows as-is (containing both JS and DB column keys).
          return resolve(rows);
        },
      };

      return builder;
    }),

    insert: vi.fn((table: unknown) => {
      const tableName = getTableName(table);
      return {
        values: vi.fn((values: unknown) => {
          const inputRows = Array.isArray(values) ? values : [values];
          if (!mockStorage[tableName]) mockStorage[tableName] = [];
          const startId = mockStorage[tableName].length + 1;

          const tableObj =
            table && typeof table === "object"
              ? (table as Record<string, unknown>)
              : ({} as Record<string, unknown>);

          const newRows = inputRows.map((row, i: number) => {
            const mapped: MockRow = {
              ...(typeof row === "object" && row !== null
                ? (row as Record<string, unknown>)
                : {}),
            };
            // Add DB column name aliases (e.g. batchId -> batch_id)
            if (typeof row === "object" && row !== null) {
              for (const key of Object.keys(row)) {
                const col = tableObj[key];
                if (
                  col &&
                  typeof col === "object" &&
                  "name" in col &&
                  typeof (col as { name?: unknown }).name === "string"
                ) {
                  mapped[(col as { name: string }).name] = (
                    row as Record<string, unknown>
                  )[key];
                }
              }
            }
            if (mapped.id === undefined || mapped.id === null) {
              mapped.id = startId + i;
            }
            return mapped;
          });

          mockStorage[tableName].push(...newRows);

          const result = {
            insertId: newRows[0]?.id,
            changes: newRows.length,
          };
          return {
            then: (resolve: (value: unknown) => void) => resolve(result),
          };
        }),
      };
    }),

    update: vi.fn((table: unknown) => {
      const tableName = getTableName(table);
      return {
        set: vi.fn((values: Record<string, unknown>) => {
          return {
            where: vi.fn((condition: unknown) => {
              const existing = mockStorage[tableName] || [];
              let changes = 0;

              const tableObj =
                table && typeof table === "object"
                  ? (table as Record<string, unknown>)
                  : ({} as Record<string, unknown>);

              const updated = existing.map(r => {
                if (!matchesCondition(r, condition)) return r;
                changes++;

                const next: MockRow = { ...r };
                for (const key of Object.keys(values)) {
                  next[key] = values[key];
                  const col = tableObj[key];
                  if (
                    col &&
                    typeof col === "object" &&
                    "name" in col &&
                    typeof (col as { name?: unknown }).name === "string"
                  ) {
                    next[(col as { name: string }).name] = values[key];
                  }
                }
                return next;
              });

              mockStorage[tableName] = updated;
              return {
                then: (resolve: (value: unknown) => void) =>
                  resolve({ changes }),
              };
            }),
          };
        }),
      };
    }),

    transaction: vi.fn((cb: (db: unknown) => unknown) => cb(mockDb)),
  };

  return { mockStorage, mockDb };
});

vi.mock("../db", () => ({
  db: mockDb,
  getDb: vi.fn().mockResolvedValue(mockDb),
  upsertUser: vi.fn().mockResolvedValue(undefined),
  getUser: vi.fn().mockResolvedValue(undefined),
  getUserByEmail: vi.fn().mockResolvedValue(undefined),
  getUserById: vi.fn().mockResolvedValue(undefined),
}));

// Make drizzle operators return simple objects our mock DB can interpret.
vi.mock("drizzle-orm", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("drizzle-orm");
  return {
    ...actual,
    eq: (col: { name: string }, val: unknown) => ({ op: "eq", col, val }),
    and: (...args: unknown[]) => ({ op: "and", args }),
    inArray: (col: { name: string }, values: unknown[]) => ({
      op: "inArray",
      col,
      values,
    }),
  };
});

const adminUser = {
  id: 1,
  role: "admin" as const,
  email: "admin@terp.test",
  name: "Admin User",
};

const createHarness = async () => {
  // Avoid importing/using createContext() in unit tests.
  // createContext() provisions a "public demo user" via the DB by design.
  const [{ appRouter }, { productImages }] = await Promise.all([
    import("../routers"),
    import("../../drizzle/schema"),
  ]);

  const req = { headers: {}, cookies: {} } as unknown as Request;
  const res = { cookie: vi.fn() } as unknown as Response;

  const caller = appRouter.createCaller({
    req,
    res,
    user: adminUser,
    isPublicDemoUser: false,
  });

  return { caller, productImages };
};

describe("Photography Router - markComplete guards", () => {
  beforeEach(() => {
    // Clear storage between tests (no cross-test bleed).
    for (const key in mockStorage) {
      mockStorage[key] = [];
    }
  });

  it("rejects completion when there are zero photos", async () => {
    const { caller } = await createHarness();

    await expect(
      caller.photography.markComplete({ batchId: 12345 })
    ).rejects.toThrow(/At least one photo is required/i);
  });

  it("allows completion when imageUrls are provided (creates photos)", async () => {
    const { caller, productImages } = await createHarness();
    const batchId = 111;

    await caller.photography.markComplete({
      batchId,
      imageUrls: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });

    const db = mockDb as unknown as MockDbApi;
    const rows = (await db.select().from(productImages)) as MockRow[];
    expect(rows.length).toBe(2);
    expect(rows.some(r => Boolean(r.isPrimary))).toBe(true);
  });

  it("repairs primary when photos exist but none are primary", async () => {
    const { caller, productImages } = await createHarness();
    const batchId = 222;

    const db = mockDb as unknown as MockDbApi;
    await db.insert(productImages).values({
      batchId,
      imageUrl: "https://example.com/x.jpg",
      isPrimary: false,
      sortOrder: 0,
      status: "APPROVED",
      uploadedBy: adminUser.id,
      uploadedAt: new Date(),
    });

    await caller.photography.markComplete({ batchId });

    const rows = (await db.select().from(productImages)) as MockRow[];
    expect(rows.length).toBe(1);
    expect(rows[0]?.isPrimary).toBe(true);
  });
});
