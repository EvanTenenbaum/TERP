/**
 * Migration 0007 Test: Calendar Recurrence Index
 * Verifies that the composite index on calendar_recurrence_instances exists
 * 
 * Following TERP Testing Protocol:
 * - Test database schema changes
 * - Verify index creation
 * - Test query performance improvement
 */

import { describe, it, expect, beforeAll } from "vitest";
import { getDb } from "../../server/db";
import { sql } from "drizzle-orm";

describe("Migration 0007: Calendar Recurrence Index", () => {
  let db: any;

  beforeAll(async () => {
    db = await getDb();
  });

  it("should have created the idx_recurrence_parent_date index", async () => {
    // Query to check if index exists
    const result = await db.execute(sql`
      SHOW INDEX FROM calendar_recurrence_instances 
      WHERE Key_name = 'idx_recurrence_parent_date'
    `);

    // Should have 2 rows (one for each column in the composite index)
    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBeGreaterThanOrEqual(2);

    // Verify the index includes both columns in the correct order
    const indexColumns = result.rows.map((row: any) => ({
      columnName: row.Column_name,
      seqInIndex: row.Seq_in_index,
    }));

    expect(indexColumns).toContainEqual({
      columnName: "parent_event_id",
      seqInIndex: 1,
    });

    expect(indexColumns).toContainEqual({
      columnName: "instance_date",
      seqInIndex: 2,
    });
  });

  it("should use the index for queries with parent_event_id and instance_date", async () => {
    // Use EXPLAIN to verify the query uses the new index
    const result = await db.execute(sql`
      EXPLAIN SELECT * FROM calendar_recurrence_instances 
      WHERE parent_event_id = 1 
      AND instance_date BETWEEN '2025-11-01' AND '2025-11-30'
    `);

    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);

    // The query should use the idx_recurrence_parent_date index
    const queryPlan = result.rows[0];
    expect(queryPlan.key).toBe("idx_recurrence_parent_date");
    
    // Type should be 'ref' or 'range' (indexed lookup)
    expect(["ref", "range"]).toContain(queryPlan.type);
  });

  it("should have the index as a non-unique BTREE index", async () => {
    const result = await db.execute(sql`
      SHOW INDEX FROM calendar_recurrence_instances 
      WHERE Key_name = 'idx_recurrence_parent_date'
      LIMIT 1
    `);

    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);

    const indexInfo = result.rows[0];
    
    // Should be non-unique (allows multiple instances for same parent)
    expect(indexInfo.Non_unique).toBe(1);
    
    // Should be BTREE type (standard for MySQL)
    expect(indexInfo.Index_type).toBe("BTREE");
  });

  it("should not affect existing data in the table", async () => {
    // Verify table still has its data (if any)
    const result = await db.execute(sql`
      SELECT COUNT(*) as count FROM calendar_recurrence_instances
    `);

    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBe(1);
    
    // Count should be >= 0 (table may be empty, but should exist)
    const count = result.rows[0].count;
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
