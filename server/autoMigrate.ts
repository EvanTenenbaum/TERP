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
    console.info("✅ Migrations already run in this session");
    return;
  }

  console.info("🔄 Running auto-migrations...");
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
      console.info(
        "  ℹ️  Matching/needs tables already exist - skipping creation"
      );
    } catch {
      // client_needs table doesn't exist, proceed with table creation
      console.info(
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
        console.info("  ✅ Created client_needs table");
      } catch (error) {
        if (
          error instanceof Error
            ? error.message
            : String(error).includes("already exists")
        ) {
          console.info("  ℹ️  client_needs table already exists");
        } else {
          console.info(
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
        console.info("  ✅ Created vendor_supply table");
      } catch (error) {
        if (
          error instanceof Error
            ? error.message
            : String(error).includes("already exists")
        ) {
          console.info("  ℹ️  vendor_supply table already exists");
        } else {
          console.info(
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
        console.info("  ✅ Created match_records table");
      } catch (error) {
        if (
          error instanceof Error
            ? error.message
            : String(error).includes("already exists")
        ) {
          console.info("  ℹ️  match_records table already exists");
        } else {
          console.info(
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
      console.info("  ✅ Added openthcId column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  openthcId column already exists");
      } else {
        console.info("  ⚠️  openthcId:", errMsg);
      }
    }

    // Add openthcStub column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL`
      );
      console.info("  ✅ Added openthcStub column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  openthcStub column already exists");
      } else {
        console.info("  ⚠️  openthcStub:", errMsg);
      }
    }

    // Add parentStrainId column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN parentStrainId INT NULL`
      );
      console.info("  ✅ Added parentStrainId column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  parentStrainId column already exists");
      } else {
        console.info("  ⚠️  parentStrainId:", errMsg);
      }
    }

    // Add baseStrainName column
    try {
      await db.execute(
        sql`ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL`
      );
      console.info("  ✅ Added baseStrainName column");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  baseStrainName column already exists");
      } else {
        console.info("  ⚠️  baseStrainName:", errMsg);
      }
    }

    // Add strainId to client_needs
    try {
      await db.execute(
        sql`ALTER TABLE client_needs ADD COLUMN strainId INT NULL`
      );
      console.info("  ✅ Added strainId to client_needs");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  client_needs.strainId already exists");
      } else {
        console.info("  ⚠️  client_needs.strainId:", errMsg);
      }
    }

    // Add indexes
    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_openthc_id ON strains(openthcId)`
      );
      console.info("  ✅ Created index on openthcId");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.info("  ℹ️  Index on openthcId already exists");
      } else {
        console.info("  ⚠️  Index openthcId:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_parent ON strains(parentStrainId)`
      );
      console.info("  ✅ Created index on parentStrainId");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.info("  ℹ️  Index on parentStrainId already exists");
      } else {
        console.info("  ⚠️  Index parentStrainId:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_strains_base_name ON strains(baseStrainName)`
      );
      console.info("  ✅ Created index on baseStrainName");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.info("  ℹ️  Index on baseStrainName already exists");
      } else {
        console.info("  ⚠️  Index baseStrainName:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`CREATE INDEX idx_client_needs_strain ON client_needs(strainId)`
      );
      console.info("  ✅ Created index on client_needs.strainId");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.info("  ℹ️  Index on client_needs.strainId already exists");
      } else {
        console.info("  ⚠️  Index client_needs.strainId:", errMsg);
      }
    }

    // Add foreign keys
    try {
      await db.execute(sql`
        ALTER TABLE strains 
        ADD CONSTRAINT fk_parent_strain 
        FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
      `);
      console.info("  ✅ Added foreign key fk_parent_strain");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.info("  ℹ️  Foreign key fk_parent_strain already exists");
      } else {
        console.info("  ⚠️  Foreign key fk_parent_strain:", errMsg);
      }
    }

    try {
      await db.execute(sql`
        ALTER TABLE client_needs
        ADD CONSTRAINT fk_client_needs_strain
        FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
      `);
      console.info("  ✅ Added foreign key fk_client_needs_strain");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate") || errMsg.includes("already exists")) {
        console.info("  ℹ️  Foreign key fk_client_needs_strain already exists");
      } else {
        console.info("  ⚠️  Foreign key fk_client_needs_strain:", errMsg);
      }
    }

    // Add VIP Portal columns to clients table (fixes schema drift)
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN vip_portal_enabled BOOLEAN DEFAULT FALSE`
      );
      console.info("  ✅ Added vip_portal_enabled column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.vip_portal_enabled already exists");
      } else {
        console.info("  ⚠️  clients.vip_portal_enabled:", errMsg);
      }
    }

    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN vip_portal_last_login TIMESTAMP NULL`
      );
      console.info("  ✅ Added vip_portal_last_login column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.vip_portal_last_login already exists");
      } else {
        console.info("  ⚠️  clients.vip_portal_last_login:", errMsg);
      }
    }

    // FIX-001: Add missing columns to clients table (schema drift fix)
    // These columns exist in schema.ts but were never migrated to production

    // Add version column for optimistic locking (DATA-005)
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN version INT NOT NULL DEFAULT 1`
      );
      console.info("  ✅ Added version column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.version already exists");
      } else {
        console.info("  ⚠️  clients.version:", errMsg);
      }
    }

    // Add pricing_profile_id column
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN pricing_profile_id INT NULL`
      );
      console.info("  ✅ Added pricing_profile_id column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.pricing_profile_id already exists");
      } else {
        console.info("  ⚠️  clients.pricing_profile_id:", errMsg);
      }
    }

    // Add custom_pricing_rules column
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN custom_pricing_rules JSON NULL`
      );
      console.info("  ✅ Added custom_pricing_rules column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.custom_pricing_rules already exists");
      } else {
        console.info("  ⚠️  clients.custom_pricing_rules:", errMsg);
      }
    }

    // Add cogsAdjustmentType column (enum)
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN cogsAdjustmentType ENUM('NONE', 'PERCENTAGE', 'FIXED_AMOUNT') DEFAULT 'NONE'`
      );
      console.info("  ✅ Added cogsAdjustmentType column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.cogsAdjustmentType already exists");
      } else {
        console.info("  ⚠️  clients.cogsAdjustmentType:", errMsg);
      }
    }

    // Add cogs_adjustment_value column
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN cogs_adjustment_value DECIMAL(10,4) DEFAULT 0`
      );
      console.info("  ✅ Added cogs_adjustment_value column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.cogs_adjustment_value already exists");
      } else {
        console.info("  ⚠️  clients.cogs_adjustment_value:", errMsg);
      }
    }

    // Add auto_defer_consignment column
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN auto_defer_consignment BOOLEAN DEFAULT FALSE`
      );
      console.info("  ✅ Added auto_defer_consignment column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.auto_defer_consignment already exists");
      } else {
        console.info("  ⚠️  clients.auto_defer_consignment:", errMsg);
      }
    }

    // Add credit_limit column
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN credit_limit DECIMAL(15,2) DEFAULT 0`
      );
      console.info("  ✅ Added credit_limit column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.credit_limit already exists");
      } else {
        console.info("  ⚠️  clients.credit_limit:", errMsg);
      }
    }

    // Add credit_limit_updated_at column
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN credit_limit_updated_at TIMESTAMP NULL`
      );
      console.info("  ✅ Added credit_limit_updated_at column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.credit_limit_updated_at already exists");
      } else {
        console.info("  ⚠️  clients.credit_limit_updated_at:", errMsg);
      }
    }

    // Add creditLimitSource column (enum)
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN creditLimitSource ENUM('CALCULATED', 'MANUAL') DEFAULT 'CALCULATED'`
      );
      console.info("  ✅ Added creditLimitSource column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.creditLimitSource already exists");
      } else {
        console.info("  ⚠️  clients.creditLimitSource:", errMsg);
      }
    }

    // Add credit_limit_override_reason column
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN credit_limit_override_reason TEXT NULL`
      );
      console.info("  ✅ Added credit_limit_override_reason column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info(
          "  ℹ️  clients.credit_limit_override_reason already exists"
        );
      } else {
        console.info("  ⚠️  clients.credit_limit_override_reason:", errMsg);
      }
    }

    // Add wishlist column (WS-015)
    try {
      await db.execute(sql`ALTER TABLE clients ADD COLUMN wishlist TEXT NULL`);
      console.info("  ✅ Added wishlist column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.wishlist already exists");
      } else {
        console.info("  ⚠️  clients.wishlist:", errMsg);
      }
    }

    // GF-PHASE0-003 FIX: Add businessType column (FEAT-001)
    // This column exists in schema.ts but was never migrated to production
    // Causes inventory.getEnhanced to fail with "Unknown column 'businessType'" error
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN businessType ENUM('RETAIL', 'WHOLESALE', 'DISPENSARY', 'DELIVERY', 'MANUFACTURER', 'DISTRIBUTOR', 'OTHER') NULL`
      );
      console.info("  ✅ Added businessType column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.businessType already exists");
      } else {
        console.info("  ⚠️  clients.businessType:", errMsg);
      }
    }

    // GF-PHASE0-003 FIX: Add preferredContact column (FEAT-001)
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN preferredContact ENUM('EMAIL', 'PHONE', 'TEXT', 'ANY') NULL`
      );
      console.info("  ✅ Added preferredContact column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.preferredContact already exists");
      } else {
        console.info("  ⚠️  clients.preferredContact:", errMsg);
      }
    }

    // SCHEMA-013: Removed duplicate payment_terms migration
    // The payment_terms column is already defined in drizzle/schema.ts (line 1615)
    // and created by migration 0055_add_client_business_fields.sql
    // This autoMigrate block was redundant and has been removed.

    // GF-PHASE0-003 FIX: Add referred_by_client_id column (referral tracking)
    try {
      await db.execute(
        sql`ALTER TABLE clients ADD COLUMN referred_by_client_id INT NULL`
      );
      console.info("  ✅ Added referred_by_client_id column to clients");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  clients.referred_by_client_id already exists");
      } else {
        console.info("  ⚠️  clients.referred_by_client_id:", errMsg);
      }
    }

    // FIX-002: Add version column to batches table for optimistic locking (DATA-005)
    try {
      await db.execute(
        sql`ALTER TABLE batches ADD COLUMN version INT NOT NULL DEFAULT 1`
      );
      console.info("  ✅ Added version column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  batches.version already exists");
      } else {
        console.info("  ⚠️  batches.version:", errMsg);
      }
    }

    // FIX-002: Add version column to orders table for optimistic locking (DATA-005)
    try {
      await db.execute(
        sql`ALTER TABLE orders ADD COLUMN version INT NOT NULL DEFAULT 1`
      );
      console.info("  ✅ Added version column to orders");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  orders.version already exists");
      } else {
        console.info("  ⚠️  orders.version:", errMsg);
      }
    }

    // Add statusId column to batches table (Workflow Queue feature)
    // NOTE: Schema uses camelCase "statusId" not snake_case
    try {
      await db.execute(sql`ALTER TABLE batches ADD COLUMN statusId INT NULL`);
      console.info("  ✅ Added statusId column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  batches.statusId already exists");
      } else {
        logger.error(
          { error: errMsg, fullError: error },
          "batches.statusId migration failed"
        );
      }
    }

    // Add deleted_at column to batches table (ST-013 soft delete support)
    try {
      await db.execute(
        sql`ALTER TABLE batches ADD COLUMN deleted_at TIMESTAMP NULL`
      );
      console.info("  ✅ Added deleted_at column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  batches.deleted_at already exists");
      } else {
        logger.error(
          { error: errMsg, fullError: error },
          "batches.deleted_at migration failed"
        );
      }
    }

    // Add photo_session_event_id column to batches table (Calendar v3.2 feature)
    try {
      await db.execute(
        sql`ALTER TABLE batches ADD COLUMN photo_session_event_id INT NULL`
      );
      console.info("  ✅ Added photo_session_event_id column to batches");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("Duplicate column")) {
        console.info("  ℹ️  batches.photo_session_event_id already exists");
      } else {
        logger.error(
          { error: errMsg, fullError: error },
          "batches.photo_session_event_id migration failed"
        );
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
      console.info("  ℹ️  RBAC tables already exist - skipping creation");
    } catch {
      // roles table doesn't exist, proceed with table creation
      console.info("  ℹ️  RBAC tables not found - will create as fallback");
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
        console.info("  ✅ Created roles table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  roles table already exists");
        } else {
          console.info("  ⚠️  roles table:", errMsg);
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
        console.info("  ✅ Created permissions table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  permissions table already exists");
        } else {
          console.info("  ⚠️  permissions table:", errMsg);
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
        console.info("  ✅ Created role_permissions table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  role_permissions table already exists");
        } else {
          console.info("  ⚠️  role_permissions table:", errMsg);
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
        console.info("  ✅ Created user_roles table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  user_roles table already exists");
        } else {
          console.info("  ⚠️  user_roles table:", errMsg);
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
        console.info("  ✅ Created user_permission_overrides table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  user_permission_overrides table already exists");
        } else {
          console.info("  ⚠️  user_permission_overrides table:", errMsg);
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
      console.info("  ℹ️  VIP Portal tables already exist - skipping creation");
    } catch {
      // vip_portal_configurations table doesn't exist, proceed with table creation
      console.info(
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
        console.info("  ✅ Created vip_portal_configurations table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  vip_portal_configurations table already exists");
        } else {
          console.info("  ⚠️  vip_portal_configurations table:", errMsg);
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
        console.info("  ✅ Created vip_portal_auth table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  vip_portal_auth table already exists");
        } else {
          console.info("  ⚠️  vip_portal_auth table:", errMsg);
        }
      }
    }

    // ========================================================================
    // FEATURE FLAGS TABLES
    // ========================================================================
    // Check if feature flags tables already exist
    let featureFlagsTablesExist = false;
    try {
      await db.execute(sql`SELECT 1 FROM feature_flags LIMIT 1`);
      featureFlagsTablesExist = true;
      console.info(
        "  ℹ️  Feature flags tables already exist - skipping creation"
      );
    } catch {
      console.info("  ℹ️  Feature flags tables not found - will create");
    }

    if (!featureFlagsTablesExist) {
      // Create feature_flags table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS feature_flags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            \`key\` VARCHAR(100) NOT NULL UNIQUE,
            name VARCHAR(255) NOT NULL,
            description TEXT,
            module VARCHAR(100),
            system_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            default_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            depends_on VARCHAR(100),
            metadata JSON,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP NULL,
            INDEX idx_feature_flags_module (module),
            UNIQUE INDEX idx_feature_flags_key (\`key\`)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.info("  ✅ Created feature_flags table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  feature_flags table already exists");
        } else {
          console.info("  ⚠️  feature_flags table:", errMsg);
        }
      }

      // Create feature_flag_role_overrides table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS feature_flag_role_overrides (
            id INT AUTO_INCREMENT PRIMARY KEY,
            flag_id INT NOT NULL,
            role_id INT NOT NULL,
            enabled BOOLEAN NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(255),
            FOREIGN KEY (flag_id) REFERENCES feature_flags(id) ON DELETE CASCADE,
            FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
            UNIQUE INDEX idx_flag_role_unique (flag_id, role_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.info("  ✅ Created feature_flag_role_overrides table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info(
            "  ℹ️  feature_flag_role_overrides table already exists"
          );
        } else {
          console.info("  ⚠️  feature_flag_role_overrides table:", errMsg);
        }
      }

      // Create feature_flag_user_overrides table
      // CRITICAL: user_open_id is VARCHAR(255) to match RBAC pattern
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS feature_flag_user_overrides (
            id INT AUTO_INCREMENT PRIMARY KEY,
            flag_id INT NOT NULL,
            user_open_id VARCHAR(255) NOT NULL,
            enabled BOOLEAN NOT NULL,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            created_by VARCHAR(255),
            FOREIGN KEY (flag_id) REFERENCES feature_flags(id) ON DELETE CASCADE,
            UNIQUE INDEX idx_flag_user_unique (flag_id, user_open_id),
            INDEX idx_flag_user_open_id (user_open_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.info("  ✅ Created feature_flag_user_overrides table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info(
            "  ℹ️  feature_flag_user_overrides table already exists"
          );
        } else {
          console.info("  ⚠️  feature_flag_user_overrides table:", errMsg);
        }
      }

      // Create feature_flag_audit_logs table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS feature_flag_audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            flag_id INT,
            flag_key VARCHAR(100) NOT NULL,
            action ENUM('created', 'updated', 'deleted', 'enabled', 'disabled', 'override_added', 'override_removed') NOT NULL,
            actor_open_id VARCHAR(255) NOT NULL,
            previous_value JSON,
            new_value JSON,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (flag_id) REFERENCES feature_flags(id) ON DELETE SET NULL,
            INDEX idx_audit_flag_key (flag_key),
            INDEX idx_audit_actor (actor_open_id),
            INDEX idx_audit_created_at (created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.info("  ✅ Created feature_flag_audit_logs table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  feature_flag_audit_logs table already exists");
        } else {
          console.info("  ⚠️  feature_flag_audit_logs table:", errMsg);
        }
      }
    }
    // Create admin_impersonation_sessions table
    // Schema matches drizzle/schema-vip-portal.ts exactly
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
      console.info("  ✅ Created admin_impersonation_sessions table");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("already exists")) {
        console.info("  ℹ️  admin_impersonation_sessions table already exists");
      } else {
        console.info("  ⚠️  admin_impersonation_sessions table:", errMsg);
      }
    }

    // Create admin_impersonation_actions table (audit log)
    // Schema matches drizzle/schema-vip-portal.ts exactly
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
      console.info("  ✅ Created admin_impersonation_actions table");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("already exists")) {
        console.info("  ℹ️  admin_impersonation_actions table already exists");
      } else {
        console.info("  ⚠️  admin_impersonation_actions table:", errMsg);
      }
    }

    // ========================================================================
    // LIVE SHOPPING SESSION TIMEOUT COLUMNS (MEET-075-BE)
    // ========================================================================
    // Add timeout-related columns to liveShoppingSessions table
    // These columns are required for the session timeout cron job

    // Check if liveShoppingSessions table exists first
    let liveShoppingTableExists = false;
    try {
      await db.execute(sql`SELECT 1 FROM liveShoppingSessions LIMIT 1`);
      liveShoppingTableExists = true;
    } catch {
      console.info(
        "  ℹ️  liveShoppingSessions table not found - skipping timeout columns"
      );
    }

    if (liveShoppingTableExists) {
      // Add timeoutSeconds column
      try {
        await db.execute(
          sql`ALTER TABLE liveShoppingSessions ADD COLUMN timeoutSeconds INT DEFAULT 7200`
        );
        console.info(
          "  ✅ Added timeoutSeconds column to liveShoppingSessions"
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info(
            "  ℹ️  liveShoppingSessions.timeoutSeconds already exists"
          );
        } else {
          console.info("  ⚠️  liveShoppingSessions.timeoutSeconds:", errMsg);
        }
      }

      // Add expiresAt column
      try {
        await db.execute(
          sql`ALTER TABLE liveShoppingSessions ADD COLUMN expiresAt TIMESTAMP NULL`
        );
        console.info("  ✅ Added expiresAt column to liveShoppingSessions");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info("  ℹ️  liveShoppingSessions.expiresAt already exists");
        } else {
          console.info("  ⚠️  liveShoppingSessions.expiresAt:", errMsg);
        }
      }

      // Add autoReleaseEnabled column
      try {
        await db.execute(
          sql`ALTER TABLE liveShoppingSessions ADD COLUMN autoReleaseEnabled BOOLEAN DEFAULT TRUE`
        );
        console.info(
          "  ✅ Added autoReleaseEnabled column to liveShoppingSessions"
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info(
            "  ℹ️  liveShoppingSessions.autoReleaseEnabled already exists"
          );
        } else {
          console.info(
            "  ⚠️  liveShoppingSessions.autoReleaseEnabled:",
            errMsg
          );
        }
      }

      // Add lastActivityAt column
      try {
        await db.execute(
          sql`ALTER TABLE liveShoppingSessions ADD COLUMN lastActivityAt TIMESTAMP NULL`
        );
        console.info(
          "  ✅ Added lastActivityAt column to liveShoppingSessions"
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info(
            "  ℹ️  liveShoppingSessions.lastActivityAt already exists"
          );
        } else {
          console.info("  ⚠️  liveShoppingSessions.lastActivityAt:", errMsg);
        }
      }

      // Add extensionCount column
      try {
        await db.execute(
          sql`ALTER TABLE liveShoppingSessions ADD COLUMN extensionCount INT DEFAULT 0`
        );
        console.info(
          "  ✅ Added extensionCount column to liveShoppingSessions"
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info(
            "  ℹ️  liveShoppingSessions.extensionCount already exists"
          );
        } else {
          console.info("  ⚠️  liveShoppingSessions.extensionCount:", errMsg);
        }
      }

      // Add index for expiresAt to optimize timeout queries
      try {
        await db.execute(
          sql`CREATE INDEX idx_lss_expires ON liveShoppingSessions (expiresAt)`
        );
        console.info(
          "  ✅ Added idx_lss_expires index to liveShoppingSessions"
        );
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate key name")) {
          console.info("  ℹ️  idx_lss_expires index already exists");
        } else {
          console.info("  ⚠️  idx_lss_expires index:", errMsg);
        }
      }
    }

    // ========================================================================
    // CRON LEADER LOCK TABLE (High Memory Remediation)
    // ========================================================================
    // Create cron_leader_lock table for leader election in multi-instance deployments
    // This ensures only one instance runs cron jobs at a time
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS cron_leader_lock (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lock_name VARCHAR(100) NOT NULL UNIQUE,
          instance_id VARCHAR(255) NOT NULL,
          acquired_at TIMESTAMP NOT NULL,
          expires_at TIMESTAMP NOT NULL,
          last_heartbeat TIMESTAMP NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_cll_lock_name (lock_name),
          INDEX idx_cll_expires_at (expires_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.info("  ✅ Created cron_leader_lock table");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("already exists")) {
        console.info("  ℹ️  cron_leader_lock table already exists");
      } else {
        console.info("  ⚠️  cron_leader_lock table:", errMsg);
      }
    }

    // ========================================================================
    // NOTIFICATIONS TABLES (TERP-0004)
    // ========================================================================
    // Create notifications and notification_preferences tables if they don't exist
    let notificationsTablesExist = false;
    try {
      await db.execute(sql`SELECT 1 FROM notifications LIMIT 1`);
      notificationsTablesExist = true;
      console.info(
        "  ℹ️  Notifications tables already exist - skipping creation"
      );
    } catch {
      console.info("  ℹ️  Notifications tables not found - will create");
    }

    if (!notificationsTablesExist) {
      // Create notifications table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS notifications (
            id INT AUTO_INCREMENT PRIMARY KEY,
            recipient_type ENUM('user', 'client') NOT NULL DEFAULT 'user',
            user_id INT NULL,
            client_id INT NULL,
            type ENUM('info', 'warning', 'success', 'error') NOT NULL,
            title VARCHAR(255) NOT NULL,
            message TEXT,
            link VARCHAR(500),
            channel ENUM('in_app', 'email', 'sms') NOT NULL DEFAULT 'in_app',
            \`read\` BOOLEAN NOT NULL DEFAULT FALSE,
            metadata JSON,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_notifications_recipient_channel (recipient_type, user_id, client_id, channel),
            INDEX idx_notifications_recipient_read (recipient_type, user_id, client_id, \`read\`),
            INDEX idx_notifications_recipient_created (recipient_type, user_id, client_id, created_at)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.info("  ✅ Created notifications table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  notifications table already exists");
        } else {
          console.info("  ⚠️  notifications table:", errMsg);
        }
      }

      // Create notification_preferences table
      try {
        await db.execute(sql`
          CREATE TABLE IF NOT EXISTS notification_preferences (
            id INT AUTO_INCREMENT PRIMARY KEY,
            recipient_type ENUM('user', 'client') NOT NULL DEFAULT 'user',
            user_id INT NULL,
            client_id INT NULL,
            in_app_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
            sms_enabled BOOLEAN NOT NULL DEFAULT FALSE,
            appointment_reminders BOOLEAN NOT NULL DEFAULT TRUE,
            order_updates BOOLEAN NOT NULL DEFAULT TRUE,
            system_alerts BOOLEAN NOT NULL DEFAULT TRUE,
            is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
            created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_notif_prefs_recipient (recipient_type, user_id, client_id)
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        console.info("  ✅ Created notification_preferences table");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("already exists")) {
          console.info("  ℹ️  notification_preferences table already exists");
        } else {
          console.info("  ⚠️  notification_preferences table:", errMsg);
        }
      }
    }

    // ========================================================================
    // CALENDAR_ID COLUMN ON CALENDAR_EVENTS TABLE
    // ========================================================================
    // Add calendar_id column to calendar_events table if it doesn't exist
    // This fixes the Calendar page database error in production
    // Check if calendar_events table exists first
    let calendarEventsTableExists = false;
    try {
      await db.execute(sql`SELECT 1 FROM calendar_events LIMIT 1`);
      calendarEventsTableExists = true;
    } catch {
      console.info(
        "  ℹ️  calendar_events table not found - skipping calendar_id column"
      );
    }

    if (calendarEventsTableExists) {
      // Add calendar_id column
      try {
        await db.execute(sql`
          ALTER TABLE calendar_events
          ADD COLUMN calendar_id INT NULL
        `);
        console.info("  ✅ Added calendar_id column to calendar_events");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info("  ℹ️  calendar_events.calendar_id already exists");
        } else {
          console.warn("  ⚠️  calendar_events.calendar_id:", errMsg);
        }
      }

      // Add index for the column
      try {
        await db.execute(sql`
          CREATE INDEX idx_calendar_events_calendar_id
          ON calendar_events (calendar_id)
        `);
        console.info("  ✅ Added idx_calendar_events_calendar_id index");
      } catch (indexError) {
        const indexErrMsg =
          indexError instanceof Error ? indexError.message : String(indexError);
        if (indexErrMsg.includes("Duplicate key name")) {
          console.info(
            "  ℹ️  idx_calendar_events_calendar_id index already exists"
          );
        } else {
          console.warn(
            "  ⚠️  idx_calendar_events_calendar_id index:",
            indexErrMsg
          );
        }
      }
    }

    // ========================================================================
    // BUG-123: PURCHASE ORDERS - ADD supplier_client_id COLUMN
    // ========================================================================
    // The purchaseOrders table may be missing the supplier_client_id column
    // which is required for the canonical Party Model (clients table vs deprecated vendors)
    // Error: "Failed to load purchase orders: Failed query: select ... supplier_client_id ..."
    let purchaseOrdersTableExists = false;
    try {
      await db.execute(sql`SELECT 1 FROM purchaseOrders LIMIT 1`);
      purchaseOrdersTableExists = true;
    } catch {
      console.info(
        "  ℹ️  purchaseOrders table not found - skipping supplier_client_id column"
      );
    }

    if (purchaseOrdersTableExists) {
      // Add supplier_client_id column for canonical Party Model
      try {
        await db.execute(sql`
          ALTER TABLE purchaseOrders
          ADD COLUMN supplier_client_id INT NULL
        `);
        console.info("  ✅ Added supplier_client_id column to purchaseOrders");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info(
            "  ℹ️  purchaseOrders.supplier_client_id already exists"
          );
        } else {
          console.warn("  ⚠️  purchaseOrders.supplier_client_id:", errMsg);
        }
      }

      // Add index for the column
      try {
        await db.execute(sql`
          CREATE INDEX idx_po_supplier_client_id
          ON purchaseOrders (supplier_client_id)
        `);
        console.info("  ✅ Added idx_po_supplier_client_id index");
      } catch (indexError) {
        const indexErrMsg =
          indexError instanceof Error ? indexError.message : String(indexError);
        if (indexErrMsg.includes("Duplicate key name")) {
          console.info("  ℹ️  idx_po_supplier_client_id index already exists");
        } else {
          console.warn("  ⚠️  idx_po_supplier_client_id index:", indexErrMsg);
        }
      }

      // Add deletedAt column for soft delete support (ST-059)
      try {
        await db.execute(sql`
          ALTER TABLE purchaseOrders
          ADD COLUMN deletedAt TIMESTAMP NULL
        `);
        console.info("  ✅ Added deletedAt column to purchaseOrders");
      } catch (error) {
        const errMsg = error instanceof Error ? error.message : String(error);
        if (errMsg.includes("Duplicate column")) {
          console.info("  ℹ️  purchaseOrders.deletedAt already exists");
        } else {
          console.warn("  ⚠️  purchaseOrders.deletedAt:", errMsg);
        }
      }
    }

    // ========================================================================
    // BUG-124: TIME_ENTRIES TABLE - Create for Time Clock functionality
    // ========================================================================
    // The time_entries table is defined in schema-scheduling.ts but never migrated
    // Error: "Error Loading Data: Failed query: select ... from time_entries ..."
    // This table is required for the Time Clock page to function
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS time_entries (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          entry_date DATE NOT NULL,
          clock_in TIMESTAMP NOT NULL,
          clock_out TIMESTAMP NULL,
          break_start TIMESTAMP NULL,
          break_end TIMESTAMP NULL,
          total_break_minutes INT DEFAULT 0,
          regular_hours_minutes INT DEFAULT 0,
          overtime_hours_minutes INT DEFAULT 0,
          total_hours_minutes INT DEFAULT 0,
          entry_type ENUM('regular', 'overtime', 'holiday', 'sick', 'vacation', 'training') NOT NULL DEFAULT 'regular',
          status ENUM('active', 'completed', 'adjusted', 'approved', 'rejected') NOT NULL DEFAULT 'active',
          shift_id INT NULL,
          notes TEXT NULL,
          adjustment_reason TEXT NULL,
          adjusted_by_id INT NULL,
          adjusted_at TIMESTAMP NULL,
          approved_by_id INT NULL,
          approved_at TIMESTAMP NULL,
          clock_in_ip VARCHAR(45) NULL,
          clock_out_ip VARCHAR(45) NULL,
          clock_in_device VARCHAR(255) NULL,
          clock_out_device VARCHAR(255) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_time_entries_user (user_id),
          INDEX idx_time_entries_date (entry_date),
          INDEX idx_time_entries_status (status),
          INDEX idx_time_entries_type (entry_type),
          INDEX idx_time_entries_user_date (user_id, entry_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.info("  ✅ Created time_entries table");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("already exists")) {
        console.info("  ℹ️  time_entries table already exists");
      } else {
        console.warn("  ⚠️  time_entries table:", errMsg);
      }
    }

    // ========================================================================
    // PRODUCT_IMAGES TABLE (GF-PHASE0-006, WS-010)
    // ========================================================================
    // Create product_images table for photography module
    // This table stores images associated with batches and products
    // Required for photography workflow - missing table was blocking GF-001, GF-007
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS product_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          batch_id INT NULL,
          product_id INT NULL,
          image_url VARCHAR(500) NOT NULL,
          thumbnail_url VARCHAR(500) NULL,
          caption VARCHAR(255) NULL,
          is_primary BOOLEAN DEFAULT FALSE,
          sort_order INT DEFAULT 0,
          status ENUM('PENDING', 'APPROVED', 'REJECTED', 'ARCHIVED') DEFAULT 'APPROVED',
          uploaded_by INT NULL,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_batch_images (batch_id),
          INDEX idx_product_images (product_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.info("  ✅ Created product_images table");
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes("already exists")) {
        console.info("  ℹ️  product_images table already exists");
      } else {
        console.warn("  ⚠️  product_images table:", errMsg);
      }
    }

    const duration = Date.now() - startTime;
    console.info(`✅ Auto-migrations completed in ${duration}ms`);
    migrationRun = true;
  } catch (error) {
    logger.error(
      { error: error instanceof Error ? error.message : String(error) },
      "Auto-migration error"
    );
    // Don't throw - allow app to start even if migrations fail
  }
}
