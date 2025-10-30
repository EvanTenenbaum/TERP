import { getDb } from "./db";
import { sql } from "drizzle-orm";

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

  try {
    // Add openthcId column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255) NULL`);
      console.log("  ✅ Added openthcId column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        console.log("  ℹ️  openthcId column already exists");
      } else {
        console.log("  ⚠️  openthcId:", error.message);
      }
    }

    // Add openthcStub column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255) NULL`);
      console.log("  ✅ Added openthcStub column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        console.log("  ℹ️  openthcStub column already exists");
      } else {
        console.log("  ⚠️  openthcStub:", error.message);
      }
    }

    // Add parentStrainId column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN parentStrainId INT NULL`);
      console.log("  ✅ Added parentStrainId column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        console.log("  ℹ️  parentStrainId column already exists");
      } else {
        console.log("  ⚠️  parentStrainId:", error.message);
      }
    }

    // Add baseStrainName column
    try {
      await db.execute(sql`ALTER TABLE strains ADD COLUMN baseStrainName VARCHAR(255) NULL`);
      console.log("  ✅ Added baseStrainName column");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        console.log("  ℹ️  baseStrainName column already exists");
      } else {
        console.log("  ⚠️  baseStrainName:", error.message);
      }
    }

    // Add strainId to client_needs
    try {
      await db.execute(sql`ALTER TABLE client_needs ADD COLUMN strainId INT NULL`);
      console.log("  ✅ Added strainId to client_needs");
    } catch (error: any) {
      if (error.message.includes('Duplicate column')) {
        console.log("  ℹ️  client_needs.strainId already exists");
      } else {
        console.log("  ⚠️  client_needs.strainId:", error.message);
      }
    }

    // Add indexes
    try {
      await db.execute(sql`CREATE INDEX idx_strains_openthc_id ON strains(openthcId)`);
      console.log("  ✅ Created index on openthcId");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log("  ℹ️  Index on openthcId already exists");
      } else {
        console.log("  ⚠️  Index openthcId:", error.message);
      }
    }

    try {
      await db.execute(sql`CREATE INDEX idx_strains_parent ON strains(parentStrainId)`);
      console.log("  ✅ Created index on parentStrainId");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log("  ℹ️  Index on parentStrainId already exists");
      } else {
        console.log("  ⚠️  Index parentStrainId:", error.message);
      }
    }

    try {
      await db.execute(sql`CREATE INDEX idx_strains_base_name ON strains(baseStrainName)`);
      console.log("  ✅ Created index on baseStrainName");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log("  ℹ️  Index on baseStrainName already exists");
      } else {
        console.log("  ⚠️  Index baseStrainName:", error.message);
      }
    }

    try {
      await db.execute(sql`CREATE INDEX idx_client_needs_strain ON client_needs(strainId)`);
      console.log("  ✅ Created index on client_needs.strainId");
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
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
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
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
    } catch (error: any) {
      if (error.message.includes('Duplicate') || error.message.includes('already exists')) {
        console.log("  ℹ️  Foreign key fk_client_needs_strain already exists");
      } else {
        console.log("  ⚠️  Foreign key fk_client_needs_strain:", error.message);
      }
    }

    const duration = Date.now() - startTime;
    console.log(`✅ Auto-migrations completed in ${duration}ms`);
    migrationRun = true;
  } catch (error: any) {
    console.error("❌ Auto-migration error:", error.message);
    // Don't throw - allow app to start even if migrations fail
  }
}

