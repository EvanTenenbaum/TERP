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
    
    const results: Array<{ step: string; status: string; message?: string }> = [];
    const startTime = Date.now();

    try {
      // ============================================================================
      // STRAINS COLUMNS
      // ============================================================================
      
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

      // ============================================================================
      // CLIENTS COLUMNS (FIX-010: Migration 0025 incomplete)
      // ============================================================================

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

      // ============================================================================
      // LEADERBOARD TABLES (FIX-013: Migration 0041 may not be applied)
      // ============================================================================

      // Create leaderboard_weight_configs table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS leaderboard_weight_configs (
            id int AUTO_INCREMENT NOT NULL,
            user_id int NOT NULL,
            config_name varchar(100) NOT NULL DEFAULT 'default',
            client_type enum('CUSTOMER','SUPPLIER','ALL') NOT NULL DEFAULT 'ALL',
            weights json NOT NULL,
            is_active boolean NOT NULL DEFAULT true,
            created_at timestamp NOT NULL DEFAULT (now()),
            updated_at timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
            deleted_at timestamp,
            CONSTRAINT leaderboard_weight_configs_id PRIMARY KEY(id),
            CONSTRAINT idx_user_config_type UNIQUE(user_id, config_name, client_type)
          )
        `);
        results.push({ step: 'create_leaderboard_weight_configs', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          results.push({ step: 'create_leaderboard_weight_configs', status: 'already_exists' });
        } else {
          results.push({ step: 'create_leaderboard_weight_configs', status: 'error', message: errorMessage });
        }
      }

      // Create leaderboard_default_weights table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS leaderboard_default_weights (
            id int AUTO_INCREMENT NOT NULL,
            client_type enum('CUSTOMER','SUPPLIER','ALL') NOT NULL,
            weights json NOT NULL,
            updated_by int,
            created_at timestamp NOT NULL DEFAULT (now()),
            updated_at timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT leaderboard_default_weights_id PRIMARY KEY(id),
            CONSTRAINT idx_default_weights_client_type UNIQUE(client_type)
          )
        `);
        results.push({ step: 'create_leaderboard_default_weights', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          results.push({ step: 'create_leaderboard_default_weights', status: 'already_exists' });
        } else {
          results.push({ step: 'create_leaderboard_default_weights', status: 'error', message: errorMessage });
        }
      }

      // Create leaderboard_metric_cache table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS leaderboard_metric_cache (
            id int AUTO_INCREMENT NOT NULL,
            client_id int NOT NULL,
            metric_type varchar(50) NOT NULL,
            metric_value decimal(15,4),
            sample_size int NOT NULL DEFAULT 0,
            is_significant boolean NOT NULL DEFAULT false,
            raw_data json,
            calculated_at timestamp NOT NULL DEFAULT (now()),
            expires_at timestamp NOT NULL,
            CONSTRAINT leaderboard_metric_cache_id PRIMARY KEY(id),
            CONSTRAINT idx_client_metric UNIQUE(client_id, metric_type)
          )
        `);
        results.push({ step: 'create_leaderboard_metric_cache', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          results.push({ step: 'create_leaderboard_metric_cache', status: 'already_exists' });
        } else {
          results.push({ step: 'create_leaderboard_metric_cache', status: 'error', message: errorMessage });
        }
      }

      // Create leaderboard_rank_history table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS leaderboard_rank_history (
            id int AUTO_INCREMENT NOT NULL,
            client_id int NOT NULL,
            snapshot_date date NOT NULL,
            master_rank int,
            master_score decimal(10,4),
            financial_rank int,
            engagement_rank int,
            reliability_rank int,
            growth_rank int,
            total_clients int NOT NULL,
            created_at timestamp NOT NULL DEFAULT (now()),
            CONSTRAINT leaderboard_rank_history_id PRIMARY KEY(id),
            CONSTRAINT idx_client_date UNIQUE(client_id, snapshot_date)
          )
        `);
        results.push({ step: 'create_leaderboard_rank_history', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          results.push({ step: 'create_leaderboard_rank_history', status: 'already_exists' });
        } else {
          results.push({ step: 'create_leaderboard_rank_history', status: 'error', message: errorMessage });
        }
      }

      // Create dashboard_widget_configs table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS dashboard_widget_configs (
            id int AUTO_INCREMENT NOT NULL,
            user_id int NOT NULL,
            widget_type varchar(50) NOT NULL,
            config json NOT NULL,
            position int NOT NULL DEFAULT 0,
            is_visible boolean NOT NULL DEFAULT true,
            created_at timestamp NOT NULL DEFAULT (now()),
            updated_at timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
            CONSTRAINT dashboard_widget_configs_id PRIMARY KEY(id),
            CONSTRAINT idx_user_widget UNIQUE(user_id, widget_type)
          )
        `);
        results.push({ step: 'create_dashboard_widget_configs', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('already exists')) {
          results.push({ step: 'create_dashboard_widget_configs', status: 'already_exists' });
        } else {
          results.push({ step: 'create_dashboard_widget_configs', status: 'error', message: errorMessage });
        }
      }

      // ============================================================================
      // INDEXES
      // ============================================================================

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

      // Leaderboard indexes
      try {
        await db.execute(sql`CREATE INDEX idx_user_active ON leaderboard_weight_configs (user_id, is_active)`);
        results.push({ step: 'index_leaderboard_user_active', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_leaderboard_user_active', status: 'already_exists' });
        } else {
          results.push({ step: 'index_leaderboard_user_active', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_expires ON leaderboard_metric_cache (expires_at)`);
        results.push({ step: 'index_leaderboard_expires', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_leaderboard_expires', status: 'already_exists' });
        } else {
          results.push({ step: 'index_leaderboard_expires', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_metric_type ON leaderboard_metric_cache (metric_type)`);
        results.push({ step: 'index_leaderboard_metric_type', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_leaderboard_metric_type', status: 'already_exists' });
        } else {
          results.push({ step: 'index_leaderboard_metric_type', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`CREATE INDEX idx_snapshot_date ON leaderboard_rank_history (snapshot_date)`);
        results.push({ step: 'index_leaderboard_snapshot_date', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'index_leaderboard_snapshot_date', status: 'already_exists' });
        } else {
          results.push({ step: 'index_leaderboard_snapshot_date', status: 'error', message: errorMessage });
        }
      }

      // ============================================================================
      // FOREIGN KEYS
      // ============================================================================

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

      // Leaderboard foreign keys
      try {
        await db.execute(sql`
          ALTER TABLE leaderboard_weight_configs 
          ADD CONSTRAINT leaderboard_weight_configs_user_id_users_id_fk 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        results.push({ step: 'fk_leaderboard_weight_configs_user', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'fk_leaderboard_weight_configs_user', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_leaderboard_weight_configs_user', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE leaderboard_default_weights 
          ADD CONSTRAINT leaderboard_default_weights_updated_by_users_id_fk 
          FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL
        `);
        results.push({ step: 'fk_leaderboard_default_weights_user', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'fk_leaderboard_default_weights_user', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_leaderboard_default_weights_user', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE leaderboard_metric_cache 
          ADD CONSTRAINT leaderboard_metric_cache_client_id_clients_id_fk 
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        `);
        results.push({ step: 'fk_leaderboard_metric_cache_client', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'fk_leaderboard_metric_cache_client', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_leaderboard_metric_cache_client', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE leaderboard_rank_history 
          ADD CONSTRAINT leaderboard_rank_history_client_id_clients_id_fk 
          FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
        `);
        results.push({ step: 'fk_leaderboard_rank_history_client', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'fk_leaderboard_rank_history_client', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_leaderboard_rank_history_client', status: 'error', message: errorMessage });
        }
      }

      try {
        await db.execute(sql`
          ALTER TABLE dashboard_widget_configs 
          ADD CONSTRAINT dashboard_widget_configs_user_id_users_id_fk 
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        `);
        results.push({ step: 'fk_dashboard_widget_configs_user', status: 'success' });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.includes('Duplicate') || errorMessage.includes('already exists')) {
          results.push({ step: 'fk_dashboard_widget_configs_user', status: 'already_exists' });
        } else {
          results.push({ step: 'fk_dashboard_widget_configs_user', status: 'error', message: errorMessage });
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

      // Check clients columns (from migration 0025/0042)
      const clientsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'clients'
      `);
      
      const clientsCols = (clientsColumns as unknown as Array<{ COLUMN_NAME: string }>).map((row) => row.COLUMN_NAME);

      // Check leaderboard tables exist
      const leaderboardTables = await db.execute(sql`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME LIKE 'leaderboard%'
      `);
      
      const leaderboardTableNames = (leaderboardTables as unknown as Array<{ TABLE_NAME: string }>).map((row) => row.TABLE_NAME);

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
        clients: {
          credit_limit_updated_at: clientsCols.includes('credit_limit_updated_at'),
          creditLimitSource: clientsCols.includes('creditLimitSource'),
          credit_limit_override_reason: clientsCols.includes('credit_limit_override_reason')
        },
        leaderboard: {
          leaderboard_weight_configs: leaderboardTableNames.includes('leaderboard_weight_configs'),
          leaderboard_default_weights: leaderboardTableNames.includes('leaderboard_default_weights'),
          leaderboard_metric_cache: leaderboardTableNames.includes('leaderboard_metric_cache'),
          leaderboard_rank_history: leaderboardTableNames.includes('leaderboard_rank_history')
        }
      };

      const allPresent = 
        verification.strains.openthcId &&
        verification.strains.openthcStub &&
        verification.strains.parentStrainId &&
        verification.strains.baseStrainName &&
        verification.client_needs.strainId &&
        verification.clients.credit_limit_updated_at &&
        verification.clients.creditLimitSource &&
        verification.clients.credit_limit_override_reason &&
        verification.leaderboard.leaderboard_weight_configs &&
        verification.leaderboard.leaderboard_default_weights &&
        verification.leaderboard.leaderboard_metric_cache &&
        verification.leaderboard.leaderboard_rank_history;

      return {
        allPresent,
        verification,
        message: allPresent ? 'All schema changes applied successfully' : 'Some tables or columns are missing'
      };
    } catch (error) {
      return {
        allPresent: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  })
});
