import { getDb } from "./db";
import { sql } from "drizzle-orm";
import { logger } from "./_core/logger";

let db: Awaited<ReturnType<typeof getDb>>;

/**
 * Auto-migration script
 * Runs on app startup to ensure database schema is up to date
 */

let migrationRun = false;

export async function runAutoMigrations() {
  // Only run once per app lifecycle
  if (migrationRun) {
    console.log("✅ Migrations already run in this session");
    return;
  }

  console.log("🔄 Running auto-migrations...");
  const startTime = Date.now();

  // Initialize database connection
  db = await getDb();
  if (!db) {
    logger.error("Database connection failed during auto-migration");
    return;
  }

  try {
    // Create matching/needs tables if they don't exist
    // NOTE: Indexes are NOT created here to avoid conflicts with migration 0019_slippery_dust.sql
    // The migration file handles index creation. This fallback only creates base tables.

    // Check if matching tables already exist (created by migration 0019 or previous autoMigrate run)
    let matchingTablesExist = false;
    try {
      await db.execute(sql`SELECT 1 FROM client_needs LIMIT 1`);
      matchingTablesExist = true;
      console.log(
        "  ℹ️  Matching/needs tables already exist - skipping creation"
      );
    } catch {
      // client_needs table doesn't exist, proceed with table creation
      console.log(
        "  ℹ️  Matching/needs tables not found - will create as fallback"
      );
    }

    if (!matchingTablesExist) {
      // Create client_needs table if it doesn't exist
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS client_needs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            clientId INT NOT NULL,
            strain VARCHAR(100) DEFAULT NULL,
            category VARCHAR(100) DEFAULT NULL,
            subcategory VARCHAR(100) DEFAULT NULL,
            grade VARCHAR(20) DEFAULT NULL,
            quantityMin VARCHAR(20) DEFAULT NULL,
            quantityMax VARCHAR(20) DEFAULT NULL,
            priceMax VARCHAR(20) DEFAULT NULL,
            neededBy TIMESTAMP NULL DEFAULT NULL,
            priority ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT') NOT NULL DEFAULT 'MEDIUM',
            status ENUM('ACTIVE', 'FULFILLED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
            notes TEXT DEFAULT NULL,
            createdBy INT NOT NULL,
            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created client_needs table");
      } catch (error) {
        if (
          error instanceof Error
            ? error.message
            : String(error).includes("already exists")
        ) {
          console.log("  ℹ️  client_needs table already exists");
        } else {
          console.log(
            "  ⚠️  client_needs table:",
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Create vendor_supply table if it doesn't exist
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS vendor_supply (
            id INT AUTO_INCREMENT PRIMARY KEY,
            vendorId INT NOT NULL,
            strain VARCHAR(100) DEFAULT NULL,
            category VARCHAR(100) DEFAULT NULL,
            subcategory VARCHAR(100) DEFAULT NULL,
            grade VARCHAR(20) DEFAULT NULL,
            quantityAvailable VARCHAR(20) DEFAULT NULL,
            pricePerUnit VARCHAR(20) DEFAULT NULL,
            availableUntil TIMESTAMP NULL DEFAULT NULL,
            status ENUM('AVAILABLE', 'RESERVED', 'SOLD', 'EXPIRED') NOT NULL DEFAULT 'AVAILABLE',
            notes TEXT DEFAULT NULL,
            createdBy INT NOT NULL,
            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created vendor_supply table");
      } catch (error) {
        if (
          error instanceof Error
            ? error.message
            : String(error).includes("already exists")
        ) {
          console.log("  ℹ️  vendor_supply table already exists");
        } else {
          console.log(
            "  ⚠️  vendor_supply table:",
            error instanceof Error ? error.message : String(error)
          );
        }
      }

      // Create match_records table if it doesn't exist
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS match_records (
            id INT AUTO_INCREMENT PRIMARY KEY,
            clientId INT NOT NULL,
            clientNeedId INT DEFAULT NULL,
            inventoryBatchId INT DEFAULT NULL,
            vendorSupplyId INT DEFAULT NULL,
            matchType ENUM('EXACT', 'CLOSE', 'HISTORICAL') NOT NULL,
            confidenceScore VARCHAR(10) DEFAULT NULL,
            matchReasons JSON DEFAULT NULL,
            userAction ENUM('CREATED_QUOTE', 'CONTACTED_VENDOR', 'DISMISSED') DEFAULT NULL,
            actionAt TIMESTAMP NULL DEFAULT NULL,
            actionBy INT DEFAULT NULL,
            resultedInSale BOOLEAN NOT NULL DEFAULT FALSE,
            saleOrderId INT DEFAULT NULL,
            createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created match_records table");
      } catch (error) {
        if (
          error instanceof Error
            ? error.message
            : String(error).includes("already exists")
        ) {
          console.log("  ℹ️  match_records table already exists");
        } else {
          console.log(
            "  ⚠️  match_records table:",
            error instanceof Error ? error.message : String(error)
          );
        }
      }
    }

    // Add openthcId column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL`
      );
      console.log("  ✅ Added openthcId column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  openthcId column already exists");
      } else {
        console.log("  ⚠️  openthcId:", errMsg);
      }
    }

    // Add openthcStub column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL`
      );
      console.log("  ✅ Added openthcStub column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  openthcStub column already exists");
      } else {
        console.log("  ⚠️  openthcStub:", errMsg);
      }
    }

    // Add parentStrainId column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN parentStrainId INT NULL`
      );
      console.log("  ✅ Added parentStrainId column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  parentStrainId column already exists");
      } else {
        console.log("  ⚠️  parentStrainId:", errMsg);
      }
    }

    // Add baseStrainName column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL`
      );
      console.log("  ✅ Added baseStrainName column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  baseStrainName column already exists");
      } else {
        console.log("  ⚠️  baseStrainName:", errMsg);
      }
    }

    // Add strainId to client_needs
    try {
      await db.execute(
        sql`ALTER TABLE client_needs ADD COLUMN strainId INT NULL`
      );
      console.log("  ✅ Added strainId to client_needs");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  client_needs.strainId already exists");
      } else {
        console.log("  ⚠️  client_needs.strainId:", errMsg);
      }
    }

    // Add indexes
    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_openthc_id ON strains(openthcId)`
      );
      console.log("  ✅ Created index on openthcId");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.log("  ℹ️  Index on openthcId already exists");
      } else {
        console.log("  ⚠️  Index openthcId:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_parent ON strains(parentStrainId)`
      );
      console.log("  ✅ Created index on parentStrainId");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.log("  ℹ️  Index on parentStrainId already exists");
      } else {
        console.log("  ⚠️  Index parentStrainId:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_base_name ON strains(baseStrainName)`
      );
      console.log("  ✅ Created index on baseStrainName");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.log("  ℹ️  Index on baseStrainName already exists");
      } else {
        console.log("  ⚠️  Index baseStrainName:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_client_needs_strain ON client_needs(strainId)`
      );
      console.log("  ✅ Created index on client_needs.strainId");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.log("  ℹ️  Index on client_needs.strainId already exists");
      } else {
        console.log("  ⚠️  Index client_needs.strainId:", errMsg);
      }
    }

    // Add foreign keys
    try {
      await db.execute(sql`
        ALTER TABLE strains 
        ADD CONSTRAINT fk_parent_strain 
        FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
      `);
      console.log("  ✅ Added foreign key fk_parent_strain");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.log("  ℹ️  Foreign key fk_parent_strain already exists");
      } else {
        console.log("  ⚠️  Foreign key fk_parent_strain:", errMsg);
      }
    }

    try {
      await db.execute(sql`
        ALTER TABLE client_needs
        ADD CONSTRAINT fk_client_needs_strain
        FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
      `);
      console.log("  ✅ Added foreign key fk_client_needs_strain");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.log("  ℹ️  Foreign key fk_client_needs_strain already exists");
      } else {
        console.log("  ⚠️  Foreign key fk_client_needs_strain:", errMsg);
      }
    }

    // Add VIP Portal columns to clients table (fixes schema drift)
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN vip_portal_enabled BOOLEAN DEFAULT FALSE`
      );
      console.log("  ✅ Added vip_portal_enabled column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  clients.vip_portal_enabled already exists");
      } else {
        console.log("  ⚠️  clients.vip_portal_enabled:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN vip_portal_last_login TIMESTAMP NULL`
      );
      console.log("  ✅ Added vip_portal_last_login column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  clients.vip_portal_last_login already exists");
      } else {
        console.log("  ⚠️  clients.vip_portal_last_login:", errMsg);
      }
    }

    // Add statusId column to batches table (Workflow Queue feature)
    // NOTE: Schema uses camelCase "statusId" not snake_case
    try {
      await db.execute(sql`ALTER TABLE batches ADD COLUMN statusId INT NULL`);
      console.log("  ✅ Added statusId column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  batches.statusId already exists");
      } else {
        logger.error("batches.statusId migration failed", { error: errMsg, fullError: error });
      }
    }

    // Add deleted_at column to batches table (ST-013 soft delete support)
    try {
      await db.execute(
        sql`ALTER TABLE batches ADD COLUMN deleted_at TIMESTAMP NULL`
      );
      console.log("  ✅ Added deleted_at column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  batches.deleted_at already exists");
      } else {
        logger.error("batches.deleted_at migration failed", { error: errMsg, fullError: error });
      }
    }

    // Add photo_session_event_id column to batches table (Calendar v3.2 feature)
    try {
      await db.execute(
        sql`ALTER TABLE batches ADD COLUMN photo_session_event_id INT NULL`
      );
      console.log("  ✅ Added photo_session_event_id column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  batches.photo_session_event_id already exists");
      } else {
        logger.error("batches.photo_session_event_id migration failed", { error: errMsg, fullError: error });
      }
    }

    // Create RBAC tables if they don't exist
    // NOTE: Indexes are NOT created here to avoid conflicts with migration 0022_create_rbac_tables.sql
    // The migration file handles index creation. This fallback only creates base tables for
    // environments where migrations never ran (e.g., completely blank database).

    // Check if RBAC tables already exist (created by migration 0022 or previous autoMigrate run)
    // We check for the roles table instead of __drizzle_migrations because Railway uses
    // drizzle-kit push which doesn't create the migrations table
    let rbacTablesExist = false;
    try {
      await db.execute(sql`SELECT 1 FROM roles LIMIT 1`);
      rbacTablesExist = true;
      console.log("  ℹ️  RBAC tables already exist - skipping creation");
    } catch {
      // roles table doesn't exist, proceed with table creation
      console.log("  ℹ️  RBAC tables not found - will create as fallback");
    }

    if (!rbacTablesExist) {
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            is_system_role INT NOT NULL DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created roles table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.log("  ℹ️  roles table already exists");
        } else {
          console.log("  ⚠️  roles table:", errMsg);
        }
      }

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(100) NOT NULL UNIQUE,
            description TEXT,
            module VARCHAR(50) NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created permissions table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.log("  ℹ️  permissions table already exists");
        } else {
          console.log("  ⚠️  permissions table:", errMsg);
        }
      }

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS role_permissions (
            id INT AUTO_INCREMENT PRIMARY KEY,
            role_id INT NOT NULL,
            permission_id INT NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created role_permissions table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.log("  ℹ️  role_permissions table already exists");
        } else {
          console.log("  ⚠️  role_permissions table:", errMsg);
        }
      }

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS user_roles (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            role_id INT NOT NULL,
            assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            assigned_by VARCHAR(255),
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created user_roles table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.log("  ℹ️  user_roles table already exists");
        } else {
          console.log("  ⚠️  user_roles table:", errMsg);
        }
      }

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS user_permission_overrides (
            id INT AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(255) NOT NULL,
            permission_id INT NOT NULL,
            granted INT NOT NULL,
            granted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            granted_by VARCHAR(255),
            FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created user_permission_overrides table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.log("  ℹ️  user_permission_overrides table already exists");
        } else {
          console.log("  ⚠️  user_permission_overrides table:", errMsg);
        }
      }
    }

    // Create VIP Portal tables if they don't exist
    // NOTE: Indexes are NOT created here to avoid conflicts with migration 0020_flimsy_makkari.sql
    // The migration file handles index creation. This fallback only creates base tables.

    // Check if VIP Portal tables already exist (created by migration 0020 or previous autoMigrate run)
    let vipPortalTablesExist = false;
    try {
      await db.execute(sql`SELECT 1 FROM vip_portal_configurations LIMIT 1`);
      vipPortalTablesExist = true;
      console.log("  ℹ️  VIP Portal tables already exist - skipping creation");
    } catch {
      // vip_portal_configurations table doesn't exist, proceed with table creation
      console.log(
        "  ℹ️  VIP Portal tables not found - will create as fallback"
      );
    }

    if (!vipPortalTablesExist) {
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS vip_portal_configurations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL UNIQUE,
            module_live_catalog_enabled BOOLEAN DEFAULT TRUE,
            module_draft_order_enabled BOOLEAN DEFAULT TRUE,
            module_order_history_enabled BOOLEAN DEFAULT TRUE,
            module_invoice_enabled BOOLEAN DEFAULT TRUE,
            module_price_alerts_enabled BOOLEAN DEFAULT TRUE,
            module_analytics_enabled BOOLEAN DEFAULT FALSE,
            theme_primary_color VARCHAR(20) DEFAULT '#10b981',
            theme_logo_url VARCHAR(500) DEFAULT NULL,
            custom_welcome_message TEXT DEFAULT NULL,
            catalog_categories JSON DEFAULT NULL,
            catalog_show_prices BOOLEAN DEFAULT TRUE,
            catalog_show_cogs BOOLEAN DEFAULT FALSE,
            catalog_allow_draft_orders BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created vip_portal_configurations table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.log("  ℹ️  vip_portal_configurations table already exists");
        } else {
          console.log("  ⚠️  vip_portal_configurations table:", errMsg);
        }
      }

      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS vip_portal_auth (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_id INT NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            session_token VARCHAR(255) DEFAULT NULL,
            session_expires_at TIMESTAMP NULL DEFAULT NULL,
            reset_token VARCHAR(255) DEFAULT NULL,
            reset_token_expires_at TIMESTAMP NULL DEFAULT NULL,
            last_login TIMESTAMP NULL DEFAULT NULL,
            login_count INT DEFAULT 0,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.log("  ✅ Created vip_portal_auth table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.log("  ℹ️  vip_portal_auth table already exists");
        } else {
          console.log("  ⚠️  vip_portal_auth table:", errMsg);
        }
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Auto-migrations completed in ${duration}ms`);
    migrationRun = true;
  } catch (error) {
    logger.error("Auto-migration error", { error: error instanceof Error ? error.message : String(error) });
    // Don't throw - allow app to start even if migrations fail
  }
}
