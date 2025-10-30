import { router, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Admin Schema Push Router
 * Pushes schema changes to the production database
 */

export const adminSchemaPushRouter = router({
  /**
   * Push all schema changes to database
   */
  pushSchema: publicProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    
    const results: any[] = [];
    const startTime = Date.now();

    try {
      // Step 1: Add openthcId column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL
        `);
        results.push({ step: 'add_openthcId', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ step: 'add_openthcId', status: 'already_exists' });
        } else {
          results.push({ step: 'add_openthcId', status: 'error', message: error.message });
        }
      }

      // Step 2: Add openthcStub column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL
        `);
        results.push({ step: 'add_openthcStub', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ step: 'add_openthcStub', status: 'already_exists' });
        } else {
          results.push({ step: 'add_openthcStub', status: 'error', message: error.message });
        }
      }

      // Step 3: Add parentStrainId column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN parentStrainId INT NULL
        `);
        results.push({ step: 'add_parentStrainId', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ step: 'add_parentStrainId', status: 'already_exists' });
        } else {
          results.push({ step: 'add_parentStrainId', status: 'error', message: error.message });
        }
      }

      // Step 4: Add baseStrainName column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL
        `);
        results.push({ step: 'add_baseStrainName', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ step: 'add_baseStrainName', status: 'already_exists' });
        } else {
          results.push({ step: 'add_baseStrainName', status: 'error', message: error.message });
        }
      }

      // Step 5: Add strainId to client_needs
      try {
        await db.execute(sql`
          ALTER TABLE client_needs ADD COLUMN strainId INT NULL
        `);
        results.push({ step: 'add_client_needs_strainId', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate column')) {
          results.push({ step: 'add_client_needs_strainId', status: 'already_exists' });
        } else {
          results.push({ step: 'add_client_needs_strainId', status: 'error', message: error.message });
        }
      }

      // Step 6: Add indexes
      try {
        await db.execute(sql`CREATE INDEX idx_strains_openthc_id ON strains(openthcId)`);
        results.push({ step: 'index_openthcId', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          results.push({ step: 'index_openthcId', status: 'already_exists' });
        } else {
          results.push({ step: 'index_openthcId', status: 'error', message: error.message });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_strains_parent ON strains(parentStrainId)`);
        results.push({ step: 'index_parentStrainId', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          results.push({ step: 'index_parentStrainId', status: 'already_exists' });
        } else {
          results.push({ step: 'index_parentStrainId', status: 'error', message: error.message });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_strains_base_name ON strains(baseStrainName)`);
        results.push({ step: 'index_baseStrainName', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          results.push({ step: 'index_baseStrainName', status: 'already_exists' });
        } else {
          results.push({ step: 'index_baseStrainName', status: 'error', message: error.message });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_client_needs_strain ON client_needs(strainId)`);
        results.push({ step: 'index_client_needs_strain', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          results.push({ step: 'index_client_needs_strain', status: 'already_exists' });
        } else {
          results.push({ step: 'index_client_needs_strain', status: 'error', message: error.message });
        }
      }

      // Step 7: Add foreign keys
      try {
        await db.execute(sql`
          ALTER TABLE strains 
          ADD CONSTRAINT fk_parent_strain 
          FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ step: 'fk_parent_strain', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          results.push({ step: 'fk_parent_strain', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_parent_strain', status: 'error', message: error.message });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE client_needs 
          ADD CONSTRAINT fk_client_needs_strain 
          FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ step: 'fk_client_needs_strain', status: 'success' });
      } catch (error: any) {
        if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
          results.push({ step: 'fk_client_needs_strain', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_client_needs_strain', status: 'error', message: error.message });
        }
      }

      const duration = Date.now() - startTime;
      const successCount = results.filter(r => r.status === 'success' || r.status === 'already_exists').length;
      const errorCount = results.filter(r => r.status === 'error').length;

      return {
        success: errorCount === 0,
        results,
        summary: {
          total: results.length,
          success: successCount,
          errors: errorCount,
          duration
        }
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message,
        results,
        summary: {
          total: results.length,
          success: 0,
          errors: 1,
          duration: Date.now() - startTime
        }
      };
    }
  }),

  /**
   * Verify schema was pushed successfully
   */
  verifySchema: publicProcedure.query(async () => {
    try {
      // Check strains columns
      const strainsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'strains'
      `);
      
      const strainsCols = (strainsColumns as any[]).map((row: any) => row.COLUMN_NAME);
      
      // Check client_needs columns
      const clientNeedsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'client_needs'
      `);
      
      const clientNeedsCols = (clientNeedsColumns as any[]).map((row: any) => row.COLUMN_NAME);

      const verification = {
        strains: {
          openthcId: strainsCols.includes('openthcId'),
          openthcStub: strainsCols.includes('openthcStub'),
          parentStrainId: strainsCols.includes('parentStrainId'),
          baseStrainName: strainsCols.includes('baseStrainName')
        },
        client_needs: {
          strainId: clientNeedsCols.includes('strainId')
        }
      };

      const allPresent = 
        verification.strains.openthcId &&
        verification.strains.openthcStub &&
        verification.strains.parentStrainId &&
        verification.strains.baseStrainName &&
        verification.client_needs.strainId;

      return {
        allPresent,
        verification,
        message: allPresent ? 'All schema changes applied successfully' : 'Some columns are missing'
      };
    } catch (error: any) {
      return {
        allPresent: false,
        error: error.message
      };
    }
  })
});

