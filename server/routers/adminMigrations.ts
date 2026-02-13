import { router, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

/**
 * Admin Migrations Router
 * Provides endpoints to run database migrations
 */

export const adminMigrationsRouter = router({
  /**
   * Run all pending migrations
   */
  runAllMigrations: adminProcedure.mutation(async () => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database connection failed");
    
    const results: unknown[] = [];
    const startTime = Date.now();

    try {
      // Migration 1: Add strain family support
      try {
        await db.execute(sql`
          ALTER TABLE strains 
          ADD COLUMN IF NOT EXISTS parentStrainId INT,
          ADD COLUMN IF NOT EXISTS baseStrainName VARCHAR(255),
          ADD CONSTRAINT IF NOT EXISTS fk_parent_strain 
            FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_parent ON strains(parentStrainId)
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_strains_base_name ON strains(baseStrainName)
        `);
        
        results.push({
          migration: "add_strain_family_support",
          status: "success",
          message: "Added parentStrainId and baseStrainName columns with indexes"
        });
      } catch (error) {
        results.push({
          migration: "add_strain_family_support",
          status: "error",
          message: error instanceof Error ? error.message : String(error)
        });
      }

      // Migration 2: Add strainId to client_needs
      try {
        await db.execute(sql`
          ALTER TABLE client_needs 
          ADD COLUMN IF NOT EXISTS strainId INT,
          ADD CONSTRAINT IF NOT EXISTS fk_client_needs_strain 
            FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
        `);
        
        await db.execute(sql`
          CREATE INDEX IF NOT EXISTS idx_client_needs_strain ON client_needs(strainId)
        `);
        
        results.push({
          migration: "add_strainId_to_client_needs",
          status: "success",
          message: "Added strainId column to client_needs with index"
        });
      } catch (error) {
        results.push({
          migration: "add_strainId_to_client_needs",
          status: "error",
          message: error instanceof Error ? error.message : String(error)
        });
      }

      // Migration 3: Create userDashboardPreferences table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS userDashboardPreferences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            userId INT NOT NULL UNIQUE,
            activeLayout VARCHAR(50) NOT NULL DEFAULT 'operations',
            widgetConfig JSON NOT NULL,
            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            
            CONSTRAINT fk_userDashboardPreferences_userId 
              FOREIGN KEY (userId) 
              REFERENCES users (id) 
              ON DELETE CASCADE,
              
            INDEX idx_userDashboardPreferences_userId (userId)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        results.push({
          migration: "create_user_dashboard_preferences",
          status: "success",
          message: "Created userDashboardPreferences table for cross-device sync"
        });
      } catch (error) {
        results.push({
          migration: "create_user_dashboard_preferences",
          status: "error",
          message: error instanceof Error ? error.message : String(error)
        });
      }

      // Migration 4: Create database views
      try {
        // Drop views if they exist
        await db.execute(sql`DROP VIEW IF EXISTS products_with_strain_family`);
        await db.execute(sql`DROP VIEW IF EXISTS client_strain_preferences`);
        await db.execute(sql`DROP VIEW IF EXISTS strain_family_stats`);

        // Create products_with_strain_family view
        await db.execute(sql`
          CREATE VIEW products_with_strain_family AS
          SELECT 
            p.*,
            s.name as strain_name,
            s.baseStrainName as base_strain_name,
            s.category as strain_category,
            parent.id as parent_strain_id,
            parent.name as parent_strain_name
          FROM products p
          LEFT JOIN strains s ON p.strainId = s.id
          LEFT JOIN strains parent ON s.parentStrainId = parent.id
        `);

        // Create client_strain_preferences view
        await db.execute(sql`
          CREATE VIEW client_strain_preferences AS
          SELECT 
            cn.clientId,
            s.id as strain_id,
            s.name as strain_name,
            s.baseStrainName,
            parent.id as family_id,
            parent.name as family_name,
            COUNT(*) as preference_count
          FROM client_needs cn
          LEFT JOIN strains s ON cn.strainId = s.id
          LEFT JOIN strains parent ON s.parentStrainId = parent.id
          WHERE cn.strainId IS NOT NULL
          GROUP BY cn.clientId, s.id, s.name, s.baseStrainName, parent.id, parent.name
        `);

        // Create strain_family_stats view
        await db.execute(sql`
          CREATE VIEW strain_family_stats AS
          SELECT 
            parent.id as family_id,
            parent.name as family_name,
            COUNT(DISTINCT s.id) as variant_count,
            COUNT(DISTINCT p.id) as product_count,
            COALESCE(SUM(CAST(b.onHandQty AS DECIMAL(10,2))), 0) as total_inventory
          FROM strains parent
          LEFT JOIN strains s ON s.parentStrainId = parent.id OR s.id = parent.id
          LEFT JOIN products p ON p.strainId = s.id
          LEFT JOIN batches b ON b.productId = p.id AND b.status = 'active'
          WHERE parent.parentStrainId IS NULL
          GROUP BY parent.id, parent.name
        `);

        results.push({
          migration: "create_strain_views",
          status: "success",
          message: "Created 3 database views successfully"
        });
      } catch (error) {
        results.push({
          migration: "create_strain_views",
          status: "error",
          message: error instanceof Error ? error.message : String(error)
        });
      }

      // Migration 5: Create admin_impersonation_sessions table (FEATURE-012)
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS admin_impersonation_sessions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_guid VARCHAR(36) NOT NULL UNIQUE,
            admin_user_id INT NOT NULL,
            client_id INT NOT NULL,
            start_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            end_at TIMESTAMP NULL,
            ip_address VARCHAR(45) NULL,
            user_agent VARCHAR(500) NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
            revoked_by INT NULL,
            revoked_at TIMESTAMP NULL,
            revoke_reason VARCHAR(255) NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_imp_sessions_admin_user_id (admin_user_id),
            INDEX idx_admin_imp_sessions_client_id (client_id),
            INDEX idx_admin_imp_sessions_status (status),
            INDEX idx_admin_imp_sessions_guid (session_guid)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        results.push({
          migration: "create_admin_impersonation_sessions",
          status: "success",
          message: "Created admin_impersonation_sessions table for VIP Portal audit"
        });
      } catch (error) {
        results.push({
          migration: "create_admin_impersonation_sessions",
          status: "error",
          message: error instanceof Error ? error.message : String(error)
        });
      }

      // Migration 6: Create admin_impersonation_actions table (FEATURE-012)
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS admin_impersonation_actions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            session_id INT NOT NULL,
            action_type VARCHAR(100) NOT NULL,
            action_path VARCHAR(255) NULL,
            action_method VARCHAR(10) NULL,
            action_details JSON NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_admin_imp_actions_session_id (session_id),
            INDEX idx_admin_imp_actions_action_type (action_type),
            INDEX idx_admin_imp_actions_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);

        results.push({
          migration: "create_admin_impersonation_actions",
          status: "success",
          message: "Created admin_impersonation_actions table for VIP Portal audit log"
        });
      } catch (error) {
        results.push({
          migration: "create_admin_impersonation_actions",
          status: "error",
          message: error instanceof Error ? error.message : String(error)
        });
      }

      const duration = Date.now() - startTime;

      return {
        success: true,
        results,
        duration,
        summary: `Ran ${results.length} migrations in ${duration}ms`
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        results,
        duration: Date.now() - startTime
      };
    }
  }),

  /**
   * Check migration status
   */
  checkMigrationStatus: adminProcedure.query(async () => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database connection failed");
    
    const checks: unknown[] = [];

    try {
      // Check if parentStrainId column exists
      const strainsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'strains'
      `);
      
      const hasParentStrainId = (strainsColumns as unknown as Array<{ COLUMN_NAME: string }>).some(
        (row) => row.COLUMN_NAME === 'parentStrainId'
      );
      const hasBaseStrainName = (strainsColumns as unknown as Array<{ COLUMN_NAME: string }>).some(
        (row) => row.COLUMN_NAME === 'baseStrainName'
      );

      checks.push({
        check: "strains_family_columns",
        status: hasParentStrainId && hasBaseStrainName ? "exists" : "missing",
        details: {
          parentStrainId: hasParentStrainId,
          baseStrainName: hasBaseStrainName
        }
      });

      // Check if strainId column exists in client_needs
      const clientNeedsColumns = await db.execute(sql`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'client_needs'
      `);
      
      const hasStrainId = (clientNeedsColumns as unknown as Array<{ COLUMN_NAME: string }>).some(
        (row) => row.COLUMN_NAME === 'strainId'
      );

      checks.push({
        check: "client_needs_strainId",
        status: hasStrainId ? "exists" : "missing"
      });

      // Check if userDashboardPreferences table exists
      const dashboardPrefsTable = await db.execute(sql`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'userDashboardPreferences'
      `);
      
      const resultArray = dashboardPrefsTable as unknown as Array<Record<string, unknown>>;
      const hasDashboardPrefsTable = resultArray.length > 0;

      checks.push({
        check: "userDashboardPreferences_table",
        status: hasDashboardPrefsTable ? "exists" : "missing"
      });

      // Check if views exist
      const views = await db.execute(sql`
        SELECT TABLE_NAME 
        FROM INFORMATION_SCHEMA.VIEWS 
        WHERE TABLE_SCHEMA = DATABASE()
      `);
      
      const viewNames = (views as unknown as Array<{ TABLE_NAME: string }>).map((row) => row.TABLE_NAME);
      const hasProductsView = viewNames.includes('products_with_strain_family');
      const hasPreferencesView = viewNames.includes('client_strain_preferences');
      const hasStatsView = viewNames.includes('strain_family_stats');

      checks.push({
        check: "database_views",
        status: hasProductsView && hasPreferencesView && hasStatsView ? "exists" : "missing",
        details: {
          products_with_strain_family: hasProductsView,
          client_strain_preferences: hasPreferencesView,
          strain_family_stats: hasStatsView
        }
      });

      const allPassed = (checks as Array<{ status: string }>).every((c) => c.status === "exists");

      return {
        allPassed,
        checks,
        summary: allPassed ? "All migrations applied" : "Some migrations pending"
      };
    } catch (error) {
      return {
        allPassed: false,
        error: error instanceof Error ? error.message : String(error),
        checks
      };
    }
  })
});

