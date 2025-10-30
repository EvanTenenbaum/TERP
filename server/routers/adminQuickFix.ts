import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Quick fix router for handling missing columns gracefully
 */

export const adminQuickFixRouter = router({
  /**
   * Check if columns exist
   */
  checkColumns: publicProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    
    try {
      const strainsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'strains'
      `);
      
      const columnNames = (strainsColumns as any[]).map((row: any) => row.COLUMN_NAME);
      
      return {
        hasOpenthcId: columnNames.includes('openthcId'),
        hasOpenthcStub: columnNames.includes('openthcStub'),
        hasParentStrainId: columnNames.includes('parentStrainId'),
        hasBaseStrainName: columnNames.includes('baseStrainName'),
        allColumns: columnNames
      };
    } catch (error: any) {
      return {
        error: error.message
      };
    }
  }),

  /**
   * Add missing columns one by one
   */
  addMissingColumns: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    
    const results: any[] = [];

    try{
      // Add openthcId
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL
        `);
        results.push({ column: 'openthcId', status: 'added' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ column: 'openthcId', status: 'already_exists' });
        } else {
          results.push({ column: 'openthcId', status: 'error', message: error.message });
        }
      }

      // Add openthcStub
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL
        `);
        results.push({ column: 'openthcStub', status: 'added' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ column: 'openthcStub', status: 'already_exists' });
        } else {
          results.push({ column: 'openthcStub', status: 'error', message: error.message });
        }
      }

      // Add parentStrainId
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN parentStrainId INT NULL
        `);
        results.push({ column: 'parentStrainId', status: 'added' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ column: 'parentStrainId', status: 'already_exists' });
        } else {
          results.push({ column: 'parentStrainId', status: 'error', message: error.message });
        }
      }

      // Add baseStrainName
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL
        `);
        results.push({ column: 'baseStrainName', status: 'added' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ column: 'baseStrainName', status: 'already_exists' });
        } else {
          results.push({ column: 'baseStrainName', status: 'error', message: error.message });
        }
      }

      // Add indexes
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_openthc_id ON strains(openthcId)
        `);
        results.push({ index: 'idx_strains_openthc_id', status: 'added' });
      } catch (error: any) {
        results.push({ index: 'idx_strains_openthc_id', status: 'error', message: error.message });
      }

      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_parent ON strains(parentStrainId)
        `);
        results.push({ index: 'idx_strains_parent', status: 'added' });
      } catch (error: any) {
        results.push({ index: 'idx_strains_parent', status: 'error', message: error.message });
      }

      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_base_name ON strains(baseStrainName)
        `);
        results.push({ index: 'idx_strains_base_name', status: 'added' });
      } catch (error: any) {
        results.push({ index: 'idx_strains_base_name', status: 'error', message: error.message });
      }

      // Add foreign key constraint
      try {
        await db.execute(sql`
          ALTER TABLE strains 
          ADD CONSTRAINT fk_parent_strain 
          FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ constraint: 'fk_parent_strain', status: 'added' });
      } catch (error: any) {
        if (error.message.includes('Duplicate')) {
          results.push({ constraint: 'fk_parent_strain', status: 'already_exists' });
        } else {
          results.push({ constraint: 'fk_parent_strain', status: 'error', message: error.message });
        }
      }

      return {
        success: true,
        results
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        results
      };
    }
  }),

  /**
   * Add strainId to client_needs
   */
  addStrainIdToClientNeeds: publicProcedure.mutation(async () => {
    const results: any[] = [];

    try {
      // Add strainId column
      try {
        await db.execute(sql`
          ALTER TABLE client_needs ADD COLUMN strainId INT NULL
        `);
        results.push({ column: 'strainId', status: 'added' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ column: 'strainId', status: 'already_exists' });
        } else {
          results.push({ column: 'strainId', status: 'error', message: error.message });
        }
      }

      // Add index
      try {
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_client_needs_strain ON client_needs(strainId)
        `);
        results.push({ index: 'idx_client_needs_strain', status: 'added' });
      } catch (error: any) {
        results.push({ index: 'idx_client_needs_strain', status: 'error', message: error.message });
      }

      // Add foreign key
      try {
        await db.execute(sql`
          ALTER TABLE client_needs 
          ADD CONSTRAINT fk_client_needs_strain 
          FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ constraint: 'fk_client_needs_strain', status: 'added' });
      } catch (error: any) {
        if (error.message.includes('Duplicate')) {
          results.push({ constraint: 'fk_client_needs_strain', status: 'already_exists' });
        } else {
          results.push({ constraint: 'fk_client_needs_strain', status: 'error', message: error.message });
        }
      }

      return {
        success: true,
        results
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        results
      };
    }
  })
});

