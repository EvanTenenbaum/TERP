import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";
import { requirePermission } from "../_core/permissionMiddleware";

/**
 * Admin Schema Push Router
 * Pushes schema changes to the production database
 */

export const adminSchemaPushRouter = router({
  /**
   * Push all schema changes to database
   */
  pushSchema: adminProcedure.mutation(async () => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database connection failed");
    
    const results: Array<{ step: string; status: string; message?: string }> = [];
    const startTime = Date.now();

    try {
      // Step 1: Add openthcId column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL
        `);
        results.push({ step: 'add_openthcId', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_openthcId', status: 'already_exists' });
        } else {
          results.push({ step: 'add_openthcId', status: 'error', message: errorMessage });
        }
      }

      // Step 2: Add openthcStub column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL
        `);
        results.push({ step: 'add_openthcStub', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_openthcStub', status: 'already_exists' });
        } else {
          results.push({ step: 'add_openthcStub', status: 'error', message: errorMessage });
        }
      }

      // Step 3: Add parentStrainId column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN parentStrainId INT NULL
        `);
        results.push({ step: 'add_parentStrainId', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_parentStrainId', status: 'already_exists' });
        } else {
          results.push({ step: 'add_parentStrainId', status: 'error', message: errorMessage });
        }
      }

      // Step 4: Add baseStrainName column
      try {
        await db.execute(sql`
          ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL
        `);
        results.push({ step: 'add_baseStrainName', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_baseStrainName', status: 'already_exists' });
        } else {
          results.push({ step: 'add_baseStrainName', status: 'error', message: errorMessage });
        }
      }

      // Step 5: Add strainId to client_needs
      try {
        await db.execute(sql`
          ALTER TABLE client_needs ADD COLUMN strainId INT NULL
        `);
        results.push({ step: 'add_client_needs_strainId', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_client_needs_strainId', status: 'already_exists' });
        } else {
          results.push({ step: 'add_client_needs_strainId', status: 'error', message: errorMessage });
        }
      }

      // Step 6: Add indexes
      try {
        await db.execute(sql`CREATE INDEX idx_strains_openthc_id ON strains(openthcId)`);
        results.push({ step: 'index_openthcId', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_openthcId', status: 'already_exists' });
        } else {
          results.push({ step: 'index_openthcId', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_strains_parent ON strains(parentStrainId)`);
        results.push({ step: 'index_parentStrainId', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_parentStrainId', status: 'already_exists' });
        } else {
          results.push({ step: 'index_parentStrainId', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_strains_base_name ON strains(baseStrainName)`);
        results.push({ step: 'index_baseStrainName', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_baseStrainName', status: 'already_exists' });
        } else {
          results.push({ step: 'index_baseStrainName', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_client_needs_strain ON client_needs(strainId)`);
        results.push({ step: 'index_client_needs_strain', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_client_needs_strain', status: 'already_exists' });
        } else {
          results.push({ step: 'index_client_needs_strain', status: 'error', message: errorMessage });
        }
      }

      // Step 7: Add missing clients columns (FIX-010: Migration 0025 incomplete)
      try {
        await db.execute(sql`
          ALTER TABLE clients ADD COLUMN credit_limit_updated_at TIMESTAMP NULL
        `);
        results.push({ step: 'add_clients_credit_limit_updated_at', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_clients_credit_limit_updated_at', status: 'already_exists' });
        } else {
          results.push({ step: 'add_clients_credit_limit_updated_at', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE clients ADD COLUMN creditLimitSource ENUM('CALCULATED','MANUAL') DEFAULT 'CALCULATED'
        `);
        results.push({ step: 'add_clients_creditLimitSource', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_clients_creditLimitSource', status: 'already_exists' });
        } else {
          results.push({ step: 'add_clients_creditLimitSource', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE clients ADD COLUMN credit_limit_override_reason TEXT NULL
        `);
        results.push({ step: 'add_clients_credit_limit_override_reason', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate column')) {
          results.push({ step: 'add_clients_credit_limit_override_reason', status: 'already_exists' });
        } else {
          results.push({ step: 'add_clients_credit_limit_override_reason', status: 'error', message: errorMessage });
        }
      }

      // Step 8: Add foreign keys
      try {
        await db.execute(sql`
          ALTER TABLE strains 
          ADD CONSTRAINT fk_parent_strain 
          FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ step: 'fk_parent_strain', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'fk_parent_strain', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_parent_strain', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE client_needs 
          ADD CONSTRAINT fk_client_needs_strain 
          FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        results.push({ step: 'fk_client_needs_strain', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'fk_client_needs_strain', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_client_needs_strain', status: 'error', message: errorMessage });
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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
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
  verifySchema: adminProcedure.query(async () => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database connection failed");
    
    try {
      // Check strains columns
      const strainsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'strains'
      `);
      
      const strainsCols = (strainsColumns as unknown as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME);
      
      // Check client_needs columns
      const clientNeedsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'client_needs'
      `);
      
      const clientNeedsCols = (clientNeedsColumns as unknown as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME);

      // FIX-012: Check clients columns (from migration 0025/0042)
      const clientsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'clients'
      `);
      
      const clientsCols = (clientsColumns as unknown as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME);

      const verification = {
        strains: {
          openthcId: strainsCols.includes('openthcId'),
          openthcStub: strainsCols.includes('openthcStub'),
          parentStrainId: strainsCols.includes('parentStrainId'),
          baseStrainName: strainsCols.includes('baseStrainName')
        },
        client_needs: {
          strainId: clientNeedsCols.includes('strainId')
        },
        // FIX-012: Verify clients columns from migration 0025/0042
        clients: {
          credit_limit_updated_at: clientsCols.includes('credit_limit_updated_at'),
          creditLimitSource: clientsCols.includes('creditLimitSource'),
          credit_limit_override_reason: clientsCols.includes('credit_limit_override_reason')
        }
      };

      const allPresent = 
        verification.strains.openthcId &&
        verification.strains.openthcStub &&
        verification.strains.parentStrainId &&
        verification.strains.baseStrainName &&
        verification.client_needs.strainId &&
        // FIX-012: Include clients columns in verification
        verification.clients.credit_limit_updated_at &&
        verification.clients.creditLimitSource &&
        verification.clients.credit_limit_override_reason;

      return {
        allPresent,
        verification,
        message: allPresent ? 'All schema changes applied successfully' : 'Some columns are missing'
      };
    } catch (error) {
      return {
        allPresent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })
});

