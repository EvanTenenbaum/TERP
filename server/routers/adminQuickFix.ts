import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Quick fix router for handling missing columns gracefully
 */

export const adminQuickFixRouter = router({
  /**
   * Check if columns exist
   */
  checkColumns: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database connection failed");

    try {
      const strainsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'strains'
      `);

      const columnNames = (
        strainsColumns as unknown as Array<{ COLUMN_NAME: string }>
      ).map(row => row.COLUMN_NAME);

      return {
        hasOpenthcId: columnNames.includes("openthcId"),
        hasOpenthcStub: columnNames.includes("openthcStub"),
        hasParentStrainId: columnNames.includes("parentStrainId"),
        hasBaseStrainName: columnNames.includes("baseStrainName"),
        allColumns: columnNames,
      };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }),

  /**
   * Add missing columns one by one
   */
  addMissingColumns: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database connection failed");

    const results: Array<{
      column?: string;
      index?: string;
      constraint?: string;
      status: string;
      message?: string;
    }> = [];

    try {
      // Add openthcId
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL
        `);
        results.push({ column: "openthcId", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate column")) {
          results.push({ column: "openthcId", status: "already_exists" });
        } else {
          results.push({
            column: "openthcId",
            status: "error",
            message: errorMessage,
          });
        }
      }

      // Add openthcStub
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL
        `);
        results.push({ column: "openthcStub", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate column")) {
          results.push({ column: "openthcStub", status: "already_exists" });
        } else {
          results.push({
            column: "openthcStub",
            status: "error",
            message: errorMessage,
          });
        }
      }

      // Add parentStrainId
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN parentStrainId INT NULL
        `);
        results.push({ column: "parentStrainId", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate column")) {
          results.push({ column: "parentStrainId", status: "already_exists" });
        } else {
          results.push({
            column: "parentStrainId",
            status: "error",
            message: errorMessage,
          });
        }
      }

      // Add baseStrainName
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL
        `);
        results.push({ column: "baseStrainName", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate column")) {
          results.push({ column: "baseStrainName", status: "already_exists" });
        } else {
          results.push({
            column: "baseStrainName",
            status: "error",
            message: errorMessage,
          });
        }
      }

      // Add indexes
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_openthc_id ON strains(openthcId)
        `);
        results.push({ index: "idx_strains_openthc_id", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          index: "idx_strains_openthc_id",
          status: "error",
          message: errorMessage,
        });
      }

      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_parent ON strains(parentStrainId)
        `);
        results.push({ index: "idx_strains_parent", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          index: "idx_strains_parent",
          status: "error",
          message: errorMessage,
        });
      }

      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_base_name ON strains(baseStrainName)
        `);
        results.push({ index: "idx_strains_base_name", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          index: "idx_strains_base_name",
          status: "error",
          message: errorMessage,
        });
      }

      // Add foreign key constraint
      try {
        await db.execute(sql`
          ALTER TABLE strains 
          ADD CONSTRAINT fk_parent_strain 
          FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ constraint: "fk_parent_strain", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate")) {
          results.push({
            constraint: "fk_parent_strain",
            status: "already_exists",
          });
        } else {
          results.push({
            constraint: "fk_parent_strain",
            status: "error",
            message: errorMessage,
          });
        }
      }

      return {
        success: true,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      };
    }
  }),

  /**
   * Add strainId to client_needs
   */
  addStrainIdToClientNeeds: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database connection failed");

    const results: Array<{
      column?: string;
      index?: string;
      constraint?: string;
      status: string;
      message?: string;
    }> = [];

    try {
      // Add strainId column
      try {
        await db.execute(sql`
          ALTER TABLE client_needs ADD COLUMN strainId INT NULL
        `);
        results.push({ column: "strainId", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate column")) {
          results.push({ column: "strainId", status: "already_exists" });
        } else {
          results.push({
            column: "strainId",
            status: "error",
            message: errorMessage,
          });
        }
      }

      // Add index
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_client_needs_strain ON client_needs(strainId)
        `);
        results.push({ index: "idx_client_needs_strain", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        results.push({
          index: "idx_client_needs_strain",
          status: "error",
          message: errorMessage,
        });
      }

      // Add foreign key
      try {
        await db.execute(sql`
          ALTER TABLE client_needs 
          ADD CONSTRAINT fk_client_needs_strain 
          FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ constraint: "fk_client_needs_strain", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate")) {
          results.push({
            constraint: "fk_client_needs_strain",
            status: "already_exists",
          });
        } else {
          results.push({
            constraint: "fk_client_needs_strain",
            status: "error",
            message: errorMessage,
          });
        }
      }

      return {
        success: true,
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      };
    }
  }),

  /**
   * SCHEMA-016: Add strainId to products table
   * This is the ROOT CAUSE fix for the inventory query failures.
   * The strainId column is defined in the Drizzle schema but missing from production DB.
   */
  addStrainIdToProducts: adminProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const results: Array<{
      column?: string;
      index?: string;
      constraint?: string;
      status: string;
      message?: string;
    }> = [];

    try {
      // Add strainId column
      try {
        await db.execute(sql`
          ALTER TABLE products ADD COLUMN strainId INT NULL
        `);
        results.push({ column: "strainId", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate column")) {
          results.push({ column: "strainId", status: "already_exists" });
        } else {
          results.push({
            column: "strainId",
            status: "error",
            message: errorMessage,
          });
        }
      }

      // Add index for efficient lookups
      try {
        await db.execute(sql`
          CREATE INDEX idx_products_strainId ON products(strainId)
        `);
        results.push({ index: "idx_products_strainId", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate")) {
          results.push({
            index: "idx_products_strainId",
            status: "already_exists",
          });
        } else {
          results.push({
            index: "idx_products_strainId",
            status: "error",
            message: errorMessage,
          });
        }
      }

      // Add foreign key constraint
      try {
        await db.execute(sql`
          ALTER TABLE products
          ADD CONSTRAINT fk_products_strainId
          FOREIGN KEY (strainId) REFERENCES strains(id)
          ON DELETE SET NULL
        `);
        results.push({ constraint: "fk_products_strainId", status: "added" });
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        if (errorMessage.includes("Duplicate")) {
          results.push({
            constraint: "fk_products_strainId",
            status: "already_exists",
          });
        } else {
          results.push({
            constraint: "fk_products_strainId",
            status: "error",
            message: errorMessage,
          });
        }
      }

      return {
        success: results.every(
          r => r.status === "added" || r.status === "already_exists"
        ),
        message:
          "SCHEMA-016 fix applied. The products.strainId column should now exist.",
        results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        results,
      };
    }
  }),
});
