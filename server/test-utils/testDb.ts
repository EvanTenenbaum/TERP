/* eslint-disable @typescript-eslint/no-unused-vars, eqeqeq */
/**
 * Test Database Utility
 *
 * Provides a properly mocked database for testing that matches the real db interface.
 * This utility solves the "db is not defined" errors in tests.
 */

import { vi } from "vitest";

type MockRow = Record<string, unknown>;

interface MockCondition {
  op: string;
  col: { table?: unknown; name: string };
  val?: unknown;
  values?: unknown[];
  args?: MockCondition[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isMockCondition(value: unknown): value is MockCondition {
  return (
    isRecord(value) && typeof value.op === "string" && isColumnLike(value.col)
  );
}

function isSqlLike(value: unknown): value is { queryChunks: unknown[] } {
  return isRecord(value) && Array.isArray(value.queryChunks);
}

function isColumnLike(
  value: unknown
): value is { table?: unknown; name: string } {
  return isRecord(value) && typeof value.name === "string";
}

function getStringChunkValue(chunk: unknown): string | null {
  if (!isRecord(chunk) || !Array.isArray(chunk.value)) {
    return null;
  }

  const values = chunk.value;
  return values.every(value => typeof value === "string")
    ? values.join("")
    : null;
}

function unwrapSqlValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(entry => unwrapSqlValue(entry));
  }

  if (isColumnLike(value)) {
    return value;
  }

  if (isRecord(value) && "value" in value) {
    return unwrapSqlValue(value.value);
  }

  return value;
}

function splitSqlChunks(
  chunks: unknown[],
  separator: " and " | " or "
): unknown[][] | null {
  const groups: unknown[][] = [];
  let current: unknown[] = [];

  for (const chunk of chunks) {
    if (getStringChunkValue(chunk) === separator) {
      groups.push(current);
      current = [];
      continue;
    }
    current.push(chunk);
  }

  if (groups.length === 0) {
    return null;
  }

  groups.push(current);
  return groups;
}

function normalizeCondition(condition: unknown): MockCondition | null {
  if (!condition) return null;

  if (isMockCondition(condition)) {
    return condition;
  }

  if (!isSqlLike(condition)) {
    return null;
  }

  const compactChunks = condition.queryChunks.filter(chunk => {
    const value = getStringChunkValue(chunk);
    return value === null || value.length > 0;
  });

  if (compactChunks.length === 1 && isSqlLike(compactChunks[0])) {
    return normalizeCondition(compactChunks[0]);
  }

  if (
    getStringChunkValue(compactChunks[0]) === "(" &&
    getStringChunkValue(compactChunks[compactChunks.length - 1]) === ")"
  ) {
    return normalizeCondition({
      queryChunks: compactChunks.slice(1, -1),
    });
  }

  const andGroups = splitSqlChunks(compactChunks, " and ");
  if (andGroups) {
    return {
      op: "and",
      col: { name: "__group__" },
      args: andGroups
        .map(group => normalizeCondition({ queryChunks: group }))
        .filter((group): group is MockCondition => group !== null),
    };
  }

  const orGroups = splitSqlChunks(compactChunks, " or ");
  if (orGroups) {
    return {
      op: "or",
      col: { name: "__group__" },
      args: orGroups
        .map(group => normalizeCondition({ queryChunks: group }))
        .filter((group): group is MockCondition => group !== null),
    };
  }

  if (compactChunks.length < 2 || !isColumnLike(compactChunks[0])) {
    return null;
  }

  const operator = getStringChunkValue(compactChunks[1]);
  if (!operator) {
    return null;
  }

  if (operator === " is null") {
    return {
      op: "isNull",
      col: compactChunks[0],
    };
  }

  const right = compactChunks[2];
  if (right === undefined) {
    return null;
  }

  switch (operator) {
    case " = ":
      return {
        op: "eq",
        col: compactChunks[0],
        val: unwrapSqlValue(right),
      };
    case " in ":
      return {
        op: "inArray",
        col: compactChunks[0],
        values: Array.isArray(right)
          ? right.map(entry => unwrapSqlValue(entry))
          : [],
      };
    case " > ":
      return {
        op: "gt",
        col: compactChunks[0],
        val: unwrapSqlValue(right),
      };
    case " >= ":
      return {
        op: "gte",
        col: compactChunks[0],
        val: unwrapSqlValue(right),
      };
    case " <= ":
      return {
        op: "lte",
        col: compactChunks[0],
        val: unwrapSqlValue(right),
      };
    default:
      return null;
  }
}

function normalizeComparableValue(value: unknown) {
  if (value instanceof Date) {
    return value.getTime();
  }
  return value;
}

function compareValues(
  operator: "gt" | "gte" | "lte",
  leftRaw: unknown,
  rightRaw: unknown
): boolean {
  const left = normalizeComparableValue(leftRaw);
  const right = normalizeComparableValue(rightRaw);

  if (
    (typeof left !== "number" && typeof left !== "string") ||
    (typeof right !== "number" && typeof right !== "string")
  ) {
    return false;
  }

  switch (operator) {
    case "gt":
      return left > right;
    case "gte":
      return left >= right;
    case "lte":
      return left <= right;
    default:
      return false;
  }
}

// Helper to get table name from object
function getTableName(table: unknown): string {
  if (typeof table === "string") return table;
  if (!table) return "unknown";
  const symbols = Object.getOwnPropertySymbols(table);
  for (const sym of symbols) {
    if (sym.toString() === "Symbol(drizzle:Name)") {
      return (table as Record<symbol, string>)[sym];
    }
  }
  const t = table as Record<string, unknown>;
  if (t._ && typeof t._ === "object" && t._ !== null) {
    const underscore = t._ as Record<string, unknown>;
    if (underscore.name) return String(underscore.name);
  }
  return "unknown";
}

function getColValue(
  rowCtx: Record<string, unknown>,
  col: { table?: unknown; name: string } | undefined
): unknown {
  if (!col) return undefined;
  const tableName = getTableName(col.table);
  const row = rowCtx[tableName] as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return row[col.name];
}

function matchesFlatCondition(row: MockRow, cond: MockCondition): boolean {
  const normalized = normalizeCondition(cond);
  if (!normalized) return true;
  cond = normalized;

  if (!cond) return true;

  if (cond.op === "and") {
    return cond.args?.every(arg => matchesFlatCondition(row, arg)) ?? true;
  }

  if (cond.op === "or") {
    return cond.args?.some(arg => matchesFlatCondition(row, arg)) ?? false;
  }

  const val = (row as Record<string, unknown>)[cond.col?.name];
  switch (cond.op) {
    case "eq":
      return val == cond.val;
    case "isNull":
      return val === null || val === undefined;
    case "inArray":
      return (cond.values as unknown[])?.includes(val) ?? false;
    case "gt":
      return compareValues("gt", val, cond.val);
    case "gte":
      return compareValues("gte", val, cond.val);
    case "lte":
      return compareValues("lte", val, cond.val);
    default:
      return false;
  }
}

function matchesJoinedCondition(
  rowCtx: Record<string, unknown>,
  cond: MockCondition
): boolean {
  const normalized = normalizeCondition(cond);
  if (!normalized) return true;
  cond = normalized;

  if (!cond) return true;

  if (cond.op === "and") {
    return cond.args?.every(arg => matchesJoinedCondition(rowCtx, arg)) ?? true;
  }

  if (cond.op === "or") {
    return cond.args?.some(arg => matchesJoinedCondition(rowCtx, arg)) ?? false;
  }

  const val = getColValue(rowCtx, cond.col);
  switch (cond.op) {
    case "eq":
      return val == cond.val;
    case "isNull":
      return val === null || val === undefined;
    case "inArray":
      return (cond.values as unknown[])?.includes(val) ?? false;
    case "gt":
      return compareValues("gt", val, cond.val);
    case "gte":
      return compareValues("gte", val, cond.val);
    case "lte":
      return compareValues("lte", val, cond.val);
    default:
      return false;
  }
}

export function createMockDb() {
  const storage: Record<string, MockRow[]> = {};

  const getStorage = (key: string) => {
    if (storage[key]) return storage[key];
    const snake = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    if (storage[snake]) return storage[snake];
    return [];
  };

  const mockDb: Record<string, unknown> & {
    transaction: typeof vi.fn;
    query: Record<string, unknown>;
  } = {
    select: vi.fn(selection => {
      let currentRows: Array<Record<string, unknown>> = [];
      let isJoined = false;

      const builder: Record<string, unknown> = {
        from: vi.fn(table => {
          const tableName = getTableName(table);
          // Start with wrapped rows: { [tableName]: row }
          currentRows = (storage[tableName] || []).map(row => ({
            [tableName]: row,
          }));
          return builder;
        }),
        leftJoin: vi.fn((table: unknown, condition: unknown) => {
          isJoined = true;
          const joinTableName = getTableName(table);
          const joinRows = storage[joinTableName] || [];

          const newRows: Array<Record<string, unknown>> = [];
          currentRows.forEach(mainRow => {
            let matchFound = false;

            joinRows.forEach(joinRow => {
              const matches = true;

              const checkCond = (cond: {
                op: string;
                col: { table?: unknown; name: string };
                val?: unknown;
                args?:
                  | Array<{
                      op: string;
                      col: { table?: unknown; name: string };
                      val?: unknown;
                    }>
                  | undefined;
              }): boolean => {
                if (!cond) return true;
                if (cond.op === "eq") {
                  const leftVal = getColValue(
                    mainRow,
                    cond.col as { table?: unknown; name: string }
                  );

                  let rightVal: unknown = cond.val;
                  if (
                    cond.val &&
                    typeof cond.val === "object" &&
                    "table" in cond.val &&
                    (cond.val as { table?: unknown }).table
                  ) {
                    const valObj = cond.val as {
                      table?: unknown;
                      name: string;
                    };
                    if (getTableName(valObj.table) === joinTableName) {
                      rightVal = (joinRow as Record<string, unknown>)[
                        valObj.name
                      ];
                    } else {
                      rightVal = getColValue(mainRow, valObj);
                    }
                  }

                  return leftVal == rightVal;
                }
                if (cond.op === "and") {
                  return cond.args?.every(checkCond) ?? true;
                }
                return true;
              };

              if (
                checkCond(
                  condition as {
                    op: string;
                    col: { table?: unknown; name: string };
                    val?: unknown;
                    args?:
                      | Array<{
                          op: string;
                          col: { table?: unknown; name: string };
                          val?: unknown;
                        }>
                      | undefined;
                  }
                )
              ) {
                newRows.push({ ...mainRow, [joinTableName]: joinRow });
                matchFound = true;
              }
            });

            if (!matchFound) {
              newRows.push({ ...mainRow, [joinTableName]: null });
            }
          });

          currentRows = newRows;
          return builder;
        }),
        where: vi.fn(condition => {
          currentRows = currentRows.filter(rowCtx =>
            matchesJoinedCondition(rowCtx, condition as MockCondition)
          );
          return builder;
        }),
        for: vi.fn(() => builder),
        limit: vi.fn(n => {
          currentRows = currentRows.slice(0, n);
          return builder;
        }),
        offset: vi.fn(() => builder),
        orderBy: vi.fn(() => builder),
        groupBy: vi.fn(() => builder),
        innerJoin: vi.fn(() => builder),
        then: (resolve: (rows: unknown) => unknown) => {
          if (isJoined) {
            if (selection && typeof selection === "object") {
              const mappedRows = currentRows.map(row => {
                const mapped: Record<string, unknown> = {};
                for (const key in selection) {
                  const targetTable = getTableName(
                    (selection as Record<string, unknown>)[key]
                  );
                  mapped[key] = row[targetTable];
                }
                return mapped;
              });
              return resolve(mappedRows);
            }
            return resolve(currentRows);
          } else {
            const flatRows = currentRows.map(r => Object.values(r)[0]);
            return resolve(flatRows);
          }
        },
        execute: vi.fn().mockResolvedValue(currentRows),
      };
      return builder;
    }),

    selectDistinct: vi.fn(_selection => {
      let currentRows: Array<Record<string, unknown>> = [];

      const builder: Record<string, unknown> = {
        from: vi.fn((table: unknown) => {
          const tableName = getTableName(table);
          currentRows = (storage[tableName] || []).map(row => ({
            [tableName]: row,
          }));
          return builder;
        }),
        where: vi.fn(() => builder),
        orderBy: vi.fn(() => builder),
        groupBy: vi.fn(() => builder),
        then: (resolve: (rows: unknown) => unknown) => {
          const flatRows = currentRows.map(r => Object.values(r)[0]);
          // Simple dedup based on JSON string
          const seen = new Set<string>();
          const unique = flatRows.filter(row => {
            const key = JSON.stringify(row);
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          return resolve(unique);
        },
      };
      return builder;
    }),

    insert: vi.fn(table => {
      const tableName = getTableName(table);
      return {
        values: vi.fn(values => {
          const rows = Array.isArray(values) ? values : [values];

          const mappedRows = rows.map((row: MockRow) => {
            const mapped: MockRow = { ...row };
            for (const key of Object.keys(row)) {
              const col = (table as Record<string, unknown>)[key];
              if (
                col &&
                typeof col === "object" &&
                (col as Record<string, unknown>).name
              ) {
                mapped[(col as Record<string, unknown>).name as string] =
                  row[key];
              }
            }
            return mapped;
          });

          if (!storage[tableName]) storage[tableName] = [];
          const startId = storage[tableName].length + 1;

          const newRows = mappedRows.map((r: MockRow, i: number) => ({
            ...r,
            id: r.id || startId + i,
          }));

          storage[tableName].push(...newRows);

          const result = { insertId: newRows[0].id, changes: newRows.length };
          const returningIds = newRows.map(r => ({ id: r.id }));
          return {
            onDuplicateKeyUpdate: vi.fn().mockResolvedValue(result),
            $returningId: vi.fn(() => Promise.resolve(returningIds)),
            then: (resolve: (result: unknown) => unknown) => resolve(result),
          };
        }),
      };
    }),

    update: vi.fn(table => {
      const tableName = getTableName(table);
      return {
        set: vi.fn(values => {
          return {
            where: vi.fn(condition => {
              const rows = storage[tableName] || [];
              let updatedCount = 0;

              const newRows = rows.map(row => {
                let match = false;
                const checkCondition = (cond: MockCondition): boolean => {
                  if (!cond) return true;
                  if (cond.op === "eq") {
                    return (
                      (row as Record<string, unknown>)[cond.col.name] ==
                      cond.val
                    );
                  } else if (cond.op === "and") {
                    return cond.args?.every(checkCondition) ?? true;
                  }
                  return true;
                };

                if (checkCondition(condition as MockCondition)) {
                  match = true;
                }

                if (match) {
                  updatedCount++;
                  const updatedRow: Record<string, unknown> = { ...row };
                  for (const key in values) {
                    updatedRow[key] = (values as Record<string, unknown>)[key];
                    const col = (table as Record<string, unknown>)[key];
                    if (
                      col &&
                      typeof col === "object" &&
                      (col as Record<string, unknown>).name
                    ) {
                      updatedRow[
                        (col as Record<string, unknown>).name as string
                      ] = (values as Record<string, unknown>)[key];
                    }
                  }
                  return updatedRow;
                }
                return row;
              });

              storage[tableName] = newRows;

              return {
                then: (r: (result: { changes: number }) => unknown) =>
                  r({ changes: updatedCount }),
              };
            }),
          };
        }),
      };
    }),

    delete: vi.fn(table => {
      const tableName = getTableName(table);
      return {
        where: vi.fn(condition => {
          if (condition && (condition as MockCondition).op === "eq") {
            const colName = (condition as MockCondition).col.name;
            const initialLen = (storage[tableName] || []).length;
            storage[tableName] = (storage[tableName] || []).filter(
              (r: MockRow) =>
                (r as Record<string, unknown>)[colName] !=
                (condition as MockCondition).val
            );
            return {
              then: (r: (result: { changes: number }) => unknown) =>
                r({ changes: initialLen - storage[tableName].length }),
            };
          }
          return {
            then: (r: (result: { changes: number }) => unknown) =>
              r({ changes: 0 }),
          };
        }),
      };
    }),

    query: new Proxy(
      {},
      {
        get: (target, prop: string) => {
          return {
            findFirst: vi.fn(args => {
              const rows = getStorage(prop);
              let result = rows;
              if (args?.where) {
                result = result.filter((row: MockRow) =>
                  matchesFlatCondition(row, args.where as MockCondition)
                );
              } else {
                process.stdout.write(`[findFirst] No where args\n`);
              }
              return Promise.resolve(result[0] || undefined);
            }),
            findMany: vi.fn(args => {
              let result = getStorage(prop);
              if (args?.where) {
                result = result.filter((row: MockRow) =>
                  matchesFlatCondition(row, args.where as MockCondition)
                );
              }
              if (args?.limit) result = result.slice(0, args.limit);
              return Promise.resolve(result);
            }),
          };
        },
      }
    ),

    transaction: vi.fn(callback => callback(mockDb)),
  };

  return mockDb;
}

export function setupDbMock() {
  const mockDb = createMockDb();
  return {
    db: mockDb,
    getDb: vi.fn().mockResolvedValue(mockDb),
  };
}

export function mockSelectQuery(
  mockDb: ReturnType<typeof createMockDb>,
  results: MockRow[]
) {
  // Basic mock
  void mockDb;
  void results;
}
