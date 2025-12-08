import { getDb } from "./db";
import { sql } from "drizzle-orm";

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
    console.error("❌ Database connection failed");
    return;
  }

  try {
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
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_client (clientId),
          INDEX idx_status (status),
          INDEX idx_priority (priority),
          INDEX idx_needed_by (neededBy)
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
          updatedAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_vendor (vendorId),
          INDEX idx_status (status),
          INDEX idx_available_until (availableUntil)
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
          createdAt TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_client (clientId),
          INDEX idx_need (clientNeedId),
          INDEX idx_batch (inventoryBatchId),
          INDEX idx_vendor_supply (vendorSupplyId),
          INDEX idx_match_type (matchType),
          INDEX idx_user_action (userAction)
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

    // Add openthcId column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL`
      );
      console.log("  ✅ Added openthcId column");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate column")
      ) {
        console.log("  ℹ️  openthcId column already exists");
      } else {
        console.log("  ⚠️  openthcId:", error.message);
      }
    }

    // Add openthcStub column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL`
      );
      console.log("  ✅ Added openthcStub column");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate column")
      ) {
        console.log("  ℹ️  openthcStub column already exists");
      } else {
        console.log("  ⚠️  openthcStub:", error.message);
      }
    }

    // Add parentStrainId column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN parentStrainId INT NULL`
      );
      console.log("  ✅ Added parentStrainId column");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate column")
      ) {
        console.log("  ℹ️  parentStrainId column already exists");
      } else {
        console.log("  ⚠️  parentStrainId:", error.message);
      }
    }

    // Add baseStrainName column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL`
      );
      console.log("  ✅ Added baseStrainName column");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate column")
      ) {
        console.log("  ℹ️  baseStrainName column already exists");
      } else {
        console.log("  ⚠️  baseStrainName:", error.message);
      }
    }

    // Add strainId to client_needs
    try {
      await db.execute(
        sql`ALTER TABLE client_needs ADD COLUMN strainId INT NULL`
      );
      console.log("  ✅ Added strainId to client_needs");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate column")
      ) {
        console.log("  ℹ️  client_needs.strainId already exists");
      } else {
        console.log("  ⚠️  client_needs.strainId:", error.message);
      }
    }

    // Add indexes
    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_openthc_id ON strains(openthcId)`
      );
      console.log("  ✅ Created index on openthcId");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate") ||
            error.message.includes("already exists")
      ) {
        console.log("  ℹ️  Index on openthcId already exists");
      } else {
        console.log("  ⚠️  Index openthcId:", error.message);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_parent ON strains(parentStrainId)`
      );
      console.log("  ✅ Created index on parentStrainId");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate") ||
            error.message.includes("already exists")
      ) {
        console.log("  ℹ️  Index on parentStrainId already exists");
      } else {
        console.log("  ⚠️  Index parentStrainId:", error.message);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_base_name ON strains(baseStrainName)`
      );
      console.log("  ✅ Created index on baseStrainName");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate") ||
            error.message.includes("already exists")
      ) {
        console.log("  ℹ️  Index on baseStrainName already exists");
      } else {
        console.log("  ⚠️  Index baseStrainName:", error.message);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_client_needs_strain ON client_needs(strainId)`
      );
      console.log("  ✅ Created index on client_needs.strainId");
    } catch (error) {
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate") ||
            error.message.includes("already exists")
      ) {
        console.log("  ℹ️  Index on client_needs.strainId already exists");
      } else {
        console.log("  ⚠️  Index client_needs.strainId:", error.message);
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
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate") ||
            error.message.includes("already exists")
      ) {
        console.log("  ℹ️  Foreign key fk_parent_strain already exists");
      } else {
        console.log("  ⚠️  Foreign key fk_parent_strain:", error.message);
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
      if (
        error instanceof Error
          ? error.message
          : String(error).includes("Duplicate") ||
            error.message.includes("already exists")
      ) {
        console.log("  ℹ️  Foreign key fk_client_needs_strain already exists");
      } else {
        console.log("  ⚠️  Foreign key fk_client_needs_strain:", error.message);
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

    // Add statusId column to batches table (fixes schema drift)
    try {
      await db.execute(
        sql`ALTER TABLE batches ADD COLUMN statusId INT NULL`
      );
      console.log("  ✅ Added statusId column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.log("  ℹ️  batches.statusId already exists");
      } else {
        console.log("  ⚠️  batches.statusId:", errMsg);
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
        console.log("  ⚠️  batches.deleted_at:", errMsg);
      }
    }

    // Create VIP Portal tables if they don't exist
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS vip_portal_configurations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          client_id INT NOT NULL,
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
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_vip_portal_client_id (client_id)
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
          client_id INT NOT NULL,
          email VARCHAR(255) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          session_token VARCHAR(255) DEFAULT NULL,
          session_expires_at TIMESTAMP NULL DEFAULT NULL,
          reset_token VARCHAR(255) DEFAULT NULL,
          reset_token_expires_at TIMESTAMP NULL DEFAULT NULL,
          last_login TIMESTAMP NULL DEFAULT NULL,
          login_count INT DEFAULT 0,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_vip_portal_auth_client (client_id),
          UNIQUE KEY idx_vip_portal_auth_email (email),
          INDEX idx_vip_portal_auth_session (session_token)
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

    const duration = Date.now() - startTime;
    console.log(`✅ Auto-migrations completed in ${duration}ms`);
    migrationRun = true;
  } catch (error) {
    console.error(
      "❌ Auto-migration error:",
      error instanceof Error ? error.message : String(error)
    );
    // Don't throw - allow app to start even if migrations fail
  }
}
