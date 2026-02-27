/**
 * Sequence Generation Test Suite
 * ✅ TERP-INIT-005 Phase 3 - Test atomic sequence generation
 */

import { beforeEach, describe, it, expect, vi } from "vitest";

// Mock the database before importing sequenceDb
vi.mock("../db", () => ({
  getDb: vi.fn(),
}));

import { getDb } from "../db";
import {
  getCurrentSequence,
  getNextSequence,
  initializeSequence,
} from "../sequenceDb";

type SequenceRow = {
  id: number;
  name: string;
  prefix: string;
  currentValue: number;
};

function extractEqFilter(condition: unknown): {
  column: string;
  value: unknown;
} | null {
  if (!condition || typeof condition !== "object") return null;
  const sqlCondition = condition as { queryChunks?: unknown[] };
  if (!Array.isArray(sqlCondition.queryChunks)) return null;

  const chunks = sqlCondition.queryChunks as Array<Record<string, unknown>>;
  const columnChunk = chunks.find(
    chunk => typeof chunk?.name === "string" && "table" in chunk
  );
  const valueChunk = chunks.find(
    chunk =>
      "value" in chunk && !Array.isArray((chunk as { value?: unknown }).value)
  );

  if (!columnChunk?.name || !valueChunk || !("value" in valueChunk)) {
    return null;
  }

  return {
    column: columnChunk.name as string,
    value: valueChunk.value,
  };
}

function createSequenceDbMock() {
  let nextId = 1;
  const rows: SequenceRow[] = [];
  const lockModes: string[] = [];
  let transactionQueue = Promise.resolve();

  const buildSelectBuilder = () => {
    let filteredRows = rows;
    const builder: {
      from: ReturnType<typeof vi.fn>;
      where: ReturnType<typeof vi.fn>;
      for: ReturnType<typeof vi.fn>;
      limit: ReturnType<typeof vi.fn>;
      then: (resolve: (value: SequenceRow[]) => unknown) => unknown;
    } = {
      from: vi.fn(() => builder),
      where: vi.fn(condition => {
        const filter = extractEqFilter(condition);
        if (filter) {
          filteredRows = filteredRows.filter(
            row =>
              row[filter.column as keyof SequenceRow] ===
              (filter.value as SequenceRow[keyof SequenceRow])
          );
        }
        return builder;
      }),
      for: vi.fn(mode => {
        if (typeof mode === "string") {
          lockModes.push(mode);
        }
        return builder;
      }),
      limit: vi.fn(limit => {
        if (typeof limit === "number") {
          filteredRows = filteredRows.slice(0, limit);
        }
        return builder;
      }),
      then: resolve => resolve(filteredRows.map(row => ({ ...row }))),
    };

    return builder;
  };

  const db: Record<string, unknown> = {
    select: vi.fn(() => buildSelectBuilder()),
    insert: vi.fn(() => ({
      values: vi.fn((value: Partial<SequenceRow>) => {
        const row: SequenceRow = {
          id: value.id ?? nextId++,
          name: value.name ?? "",
          prefix: value.prefix ?? "",
          currentValue: value.currentValue ?? 0,
        };
        rows.push(row);
        return {
          $returningId: vi.fn(async () => [{ id: row.id }]),
        };
      }),
    })),
    update: vi.fn(() => ({
      set: vi.fn((values: Partial<SequenceRow>) => ({
        where: vi.fn(condition => {
          const filter = extractEqFilter(condition);
          if (filter) {
            for (const row of rows) {
              if (
                row[filter.column as keyof SequenceRow] ===
                (filter.value as SequenceRow[keyof SequenceRow])
              ) {
                Object.assign(row, values);
              }
            }
          }
          return Promise.resolve({ success: true });
        }),
      })),
    })),
    transaction: vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => {
      const task = transactionQueue.then(() => callback(db));
      transactionQueue = task.then(
        () => undefined,
        () => undefined
      );
      return await task;
    }),
  };

  return {
    db,
    rows,
    lockModes,
  };
}

describe("Sequence Generation", () => {
  let mockDb: ReturnType<typeof createSequenceDbMock>;

  beforeEach(() => {
    mockDb = createSequenceDbMock();
    vi.mocked(getDb).mockResolvedValue(
      mockDb.db as unknown as Awaited<ReturnType<typeof getDb>>
    );
  });

  describe("getNextSequence", () => {
    it("should generate sequential codes", async () => {
      const sequenceName = "lot_seq";
      await initializeSequence(sequenceName, "LOT-", 0);

      const first = await getNextSequence(sequenceName, 6);
      const second = await getNextSequence(sequenceName, 6);
      const third = await getNextSequence(sequenceName, 6);

      expect(first).toBe("LOT-000001");
      expect(second).toBe("LOT-000002");
      expect(third).toBe("LOT-000003");
    });

    it("should handle concurrent requests without collisions", async () => {
      const sequenceName = "batch_seq";
      await initializeSequence(sequenceName, "BATCH-", 0);

      const results = await Promise.all(
        Array.from({ length: 25 }, () => getNextSequence(sequenceName, 4))
      );

      expect(new Set(results).size).toBe(25);
      expect(results).toHaveLength(25);

      const numericValues = results
        .map(code => Number.parseInt(code.replace("BATCH-", ""), 10))
        .sort((a, b) => a - b);

      expect(numericValues[0]).toBe(1);
      expect(numericValues[numericValues.length - 1]).toBe(25);
      expect(numericValues).toEqual(
        Array.from({ length: 25 }, (_, index) => index + 1)
      );
    });

    it("should create sequence if not exists", async () => {
      const sequenceName = "custom_code";
      const generated = await getNextSequence(sequenceName, 3);
      const current = await getCurrentSequence(sequenceName);

      expect(generated).toBe(`${sequenceName.toUpperCase()}-001`);
      expect(current).toMatchObject({
        name: sequenceName,
        prefix: `${sequenceName.toUpperCase()}-`,
        currentValue: 1,
      });
    });

    it("should format codes with correct padding", async () => {
      const sequenceName = "pad_seq";
      await initializeSequence(sequenceName, "PAD-", 9);

      const code4 = await getNextSequence(sequenceName, 4);
      expect(code4).toBe("PAD-0010");

      const code8 = await getNextSequence(sequenceName, 8);
      expect(code8).toBe("PAD-00000011");
    });

    it("should use row-level locking", async () => {
      const sequenceName = "lock_seq";
      await initializeSequence(sequenceName, "LOCK-", 0);
      await getNextSequence(sequenceName, 6);

      expect(mockDb.lockModes).toContain("update");
    });
  });

  describe("initializeSequence", () => {
    it("should create new sequence with default values", async () => {
      const sequenceName = "init_seq";
      const created = await initializeSequence(sequenceName, "INV-", 500);

      expect(created).toMatchObject({
        name: sequenceName,
        prefix: "INV-",
        currentValue: 500,
      });
    });

    it("should not duplicate existing sequences", async () => {
      const sequenceName = "dup_seq";
      await initializeSequence(sequenceName, "DUP-", 7);
      const updated = await initializeSequence(sequenceName, "DUP-", 15);

      const matchingRows = mockDb.rows.filter(row => row.name === sequenceName);

      expect(matchingRows).toHaveLength(1);
      expect(updated.currentValue).toBe(15);
      expect(matchingRows[0]?.currentValue).toBe(15);
    });
  });
});
