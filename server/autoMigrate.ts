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
    logger.info("✅ Migrations already run in this session");
    return;
  }

  logger.info("🔄 Running auto-migrations...");
  const startTime = Date.now();

  // Initialize database connection
  db = await getDb();
  if (!db) {
    logger.error("❌ Database connection failed");
    return;
  }

  try {
    // Add openthcId column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL`);
      logger.info("  ✅ Added openthcId column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        logger.info("  ℹ️  openthcId column already exists");
      } else {
        logger.info("  ⚠️  openthcId:", error.message);
      }
    }

    // Add openthcStub column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL`);
      logger.info("  ✅ Added openthcStub column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        logger.info("  ℹ️  openthcStub column already exists");
      } else {
        logger.info("  ⚠️  openthcStub:", error.message);
      }
    }

    // Add parentStrainId column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN parentStrainId INT NULL`);
      logger.info("  ✅ Added parentStrainId column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        logger.info("  ℹ️  parentStrainId column already exists");
      } else {
        logger.info("  ⚠️  parentStrainId:", error.message);
      }
    }

    // Add baseStrainName column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL`);
      logger.info("  ✅ Added baseStrainName column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        logger.info("  ℹ️  baseStrainName column already exists");
      } else {
        logger.info("  ⚠️  baseStrainName:", error.message);
      }
    }

    // Add strainId to client_needs
    try {
      await db.execute(sql`ALTER TABLE client_needs ADD COLUMN strainId INT NULL`);
      logger.info("  ✅ Added strainId to client_needs");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        logger.info("  ℹ️  client_needs.strainId already exists");
      } else {
        logger.info("  ⚠️  client_needs.strainId:", error.message);
      }
    }

    // Add indexes
    try {
      await db.execute(sql`CREATE INDEX idx_strains_openthc_id ON strains(openthcId)`);
      logger.info("  ✅ Created index on openthcId");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        logger.info("  ℹ️  Index on openthcId already exists");
      } else {
        logger.info("  ⚠️  Index openthcId:", error.message);
      }
    }

    try {
      await db.execute(sql`CREATE INDEX idx_strains_parent ON strains(parentStrainId)`);
      logger.info("  ✅ Created index on parentStrainId");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        logger.info("  ℹ️  Index on parentStrainId already exists");
      } else {
        logger.info("  ⚠️  Index parentStrainId:", error.message);
      }
    }

    try {
      await db.execute(sql`CREATE INDEX idx_strains_base_name ON strains(baseStrainName)`);
      logger.info("  ✅ Created index on baseStrainName");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        logger.info("  ℹ️  Index on baseStrainName already exists");
      } else {
        logger.info("  ⚠️  Index baseStrainName:", error.message);
      }
    }

    try {
      await db.execute(sql`CREATE INDEX idx_client_needs_strain ON client_needs(strainId)`);
      logger.info("  ✅ Created index on client_needs.strainId");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        logger.info("  ℹ️  Index on client_needs.strainId already exists");
      } else {
        logger.info("  ⚠️  Index client_needs.strainId:", error.message);
      }
    }

    // Add foreign keys
    try {
      await db.execute(sql`
        ALTER TABLE strains 
        ADD CONSTRAINT fk_parent_strain 
        FOREIGN KEY (parentStrainId) REFERENCES strains(id) ON DELETE SET NULL
      `);
      logger.info("  ✅ Added foreign key fk_parent_strain");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        logger.info("  ℹ️  Foreign key fk_parent_strain already exists");
      } else {
        logger.info("  ⚠️  Foreign key fk_parent_strain:", error.message);
      }
    }

    try {
      await db.execute(sql`
        ALTER TABLE client_needs 
        ADD CONSTRAINT fk_client_needs_strain 
        FOREIGN KEY (strainId) REFERENCES strains(id) ON DELETE SET NULL
      `);
      logger.info("  ✅ Added foreign key fk_client_needs_strain");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        logger.info("  ℹ️  Foreign key fk_client_needs_strain already exists");
      } else {
        logger.info("  ⚠️  Foreign key fk_client_needs_strain:", error.message);
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`✅ Auto-migrations completed in ${duration}ms`);
    migrationRun = true;
  } catch (error: any) {
    logger.error("❌ Auto-migration error:", error.message);
    // Don't throw - allow app to start even if migrations fail
  }
}

