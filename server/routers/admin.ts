import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { strains, products } from "../../drizzle/schema";
import { sql } from "drizzle-orm";
import { importOpenTHCStrainsFromJSON } from "../import_openthc_strains";

/**
 * Admin Router
 * 
 * Administrative endpoints for system setup and maintenance.
 * Note: Using publicProcedure since authentication is currently disabled.
 */
export const adminRouter = router({
  /**
   * Setup Strain Fuzzy Matching System
   * 
   * This endpoint performs all necessary database setup for the strain
   * fuzzy matching system:
   * 1. Adds openthcId and openthcStub columns to strains table
   * 2. Creates performance indexes
   * 3. Imports 12,804 OpenTHC strains
   * 
   * Safe to run multiple times (all operations are idempotent).
   */
  setupStrainSystem: protectedProcedure
    .mutation(async () => {
      const startTime = Date.now();
      const results = {
        schemaPush: { status: 'pending' as const, message: '', duration: 0 },
        indexCreation: { status: 'pending' as const, message: '', duration: 0 },
        strainImport: { status: 'pending' as const, message: '', duration: 0 },
      };
      
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      
      try {
        // ===== STEP 1: Push Schema Changes =====
        console.log('📋 Step 1/3: Pushing schema changes...');
        const schemaStart = Date.now();
        results.schemaPush.status = 'running';
        
        try {
          // Add columns if they don't exist (PostgreSQL syntax)
          // PostgreSQL doesn't support multiple ADD COLUMN in one statement with IF NOT EXISTS
          try {
            await db.execute(sql`ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255)`);
          } catch (e) {
            // Column might already exist, that's fine
            console.log('openthcId column may already exist');
          }
          
          try {
            await db.execute(sql`ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255)`);
          } catch (e) {
            // Column might already exist, that's fine
            console.log('openthcStub column may already exist');
          }
          
          results.schemaPush.status = 'success';
          results.schemaPush.message = 'Added openthcId and openthcStub columns';
          results.schemaPush.duration = Date.now() - schemaStart;
          console.log(`✅ Schema updated in ${results.schemaPush.duration}ms`);
        } catch (error) {
          results.schemaPush.status = 'error';
          results.schemaPush.message = `Schema update failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.schemaPush.duration = Date.now() - schemaStart;
          console.error('❌ Schema update failed:', error);
          throw error;
        }
        
        // ===== STEP 2: Create Indexes =====
        console.log('📋 Step 2/3: Creating performance indexes...');
        const indexStart = Date.now();
        results.indexCreation.status = 'running';
        
        try {
          const indexes = [
            { name: 'idx_strains_standardized', sql: 'CREATE INDEX IF NOT EXISTS idx_strains_standardized ON strains(standardizedName)' },
            { name: 'idx_strains_name', sql: 'CREATE INDEX IF NOT EXISTS idx_strains_name ON strains(name)' },
            { name: 'idx_strains_openthc', sql: 'CREATE INDEX IF NOT EXISTS idx_strains_openthc ON strains(openthcId)' },
            { name: 'idx_strains_category', sql: 'CREATE INDEX IF NOT EXISTS idx_strains_category ON strains(category)' },
            { name: 'idx_products_strain', sql: 'CREATE INDEX IF NOT EXISTS idx_products_strain ON products(strainId)' },
            { name: 'idx_strains_category_name', sql: 'CREATE INDEX IF NOT EXISTS idx_strains_category_name ON strains(category, name)' },
          ];
          
          const createdIndexes = [];
          for (const index of indexes) {
            try {
              await db.execute(sql.raw(index.sql));
              createdIndexes.push(index.name);
              console.log(`  ✓ Created ${index.name}`);
            } catch (error) {
              console.warn(`  ⚠ ${index.name} may already exist or failed:`, error);
            }
          }
          
          results.indexCreation.status = 'success';
          results.indexCreation.message = `Created/verified ${createdIndexes.length} indexes: ${createdIndexes.join(', ')}`;
          results.indexCreation.duration = Date.now() - indexStart;
          console.log(`✅ Indexes created in ${results.indexCreation.duration}ms`);
        } catch (error) {
          results.indexCreation.status = 'error';
          results.indexCreation.message = `Index creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.indexCreation.duration = Date.now() - indexStart;
          console.error('❌ Index creation failed:', error);
          // Don't throw - continue to import even if indexes fail
        }
        
        // ===== STEP 3: Import OpenTHC Strains =====
        console.log('📋 Step 3/3: Importing OpenTHC strains...');
        const importStart = Date.now();
        results.strainImport.status = 'running';
        
        try {
          const importResult = await importOpenTHCStrainsFromJSON();
          
          results.strainImport.status = 'success';
          results.strainImport.message = `Imported ${importResult.imported} strains, skipped ${importResult.skipped} duplicates`;
          results.strainImport.duration = Date.now() - importStart;
          console.log(`✅ Import completed in ${results.strainImport.duration}ms`);
        } catch (error) {
          results.strainImport.status = 'error';
          results.strainImport.message = `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.strainImport.duration = Date.now() - importStart;
          console.error('❌ Import failed:', error);
          throw error;
        }
        
        // ===== SUCCESS =====
        const totalDuration = Date.now() - startTime;
        console.log(`\n🎉 Strain system setup completed in ${totalDuration}ms`);
        
        return {
          success: true,
          results,
          summary: `Strain system setup completed successfully in ${(totalDuration / 1000).toFixed(1)}s`,
          totalDuration,
        };
        
      } catch (error) {
        const totalDuration = Date.now() - startTime;
        console.error('\n❌ Strain system setup failed:', error);
        
        return {
          success: false,
          results,
          error: error instanceof Error ? error.message : 'Unknown error',
          summary: 'Strain system setup failed',
          totalDuration,
        };
      }
    }),
  
  /**
   * Verify Strain System Setup
   * 
   * Checks that all components of the strain system are properly configured:
   * - Schema columns exist
   * - Indexes are created
   * - Strains are imported
   * - Performance is acceptable
   */
  verifyStrainSystem: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      
      const checks = {
        schemaColumns: { passed: false, message: '' },
        indexes: { passed: false, message: '' },
        strainCount: { passed: false, message: '', count: 0 },
        openthcCount: { passed: false, message: '', count: 0 },
        performanceTest: { passed: false, message: '', duration: 0 },
      };
      
      try {
        // Check 1: Schema columns
        try {
          const result = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM information_schema.columns 
            WHERE table_name = 'strains' 
            AND column_name IN ('openthcId', 'openthcStub')
          `);
          const count = (result as any)[0]?.count || 0;
          checks.schemaColumns.passed = count === 2;
          checks.schemaColumns.message = count === 2 
            ? 'Both columns exist' 
            : `Only ${count}/2 columns exist`;
        } catch (error) {
          checks.schemaColumns.message = `Check failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
        
        // Check 2: Indexes
        try {
          const result = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM information_schema.statistics 
            WHERE table_name = 'strains' 
            AND index_name LIKE 'idx_strains_%'
          `);
          const count = (result as any)[0]?.count || 0;
          checks.indexes.passed = count >= 5;
          checks.indexes.message = `${count} indexes found`;
        } catch (error) {
          checks.indexes.message = `Check failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
        
        // Check 3: Total strain count
        try {
          const result = await db.select({ count: sql<number>`COUNT(*)` }).from(strains);
          const count = result[0]?.count || 0;
          checks.strainCount.count = count;
          checks.strainCount.passed = count > 100;
          checks.strainCount.message = `${count} total strains`;
        } catch (error) {
          checks.strainCount.message = `Check failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
        
        // Check 4: OpenTHC strain count
        try {
          const result = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM strains 
            WHERE openthcId IS NOT NULL
          `);
          const count = (result as any)[0]?.count || 0;
          checks.openthcCount.count = count;
          checks.openthcCount.passed = count > 10000;
          checks.openthcCount.message = `${count} OpenTHC strains`;
        } catch (error) {
          checks.openthcCount.message = `Check failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
        
        // Check 5: Performance test
        try {
          const start = Date.now();
          await db.execute(sql`
            SELECT * FROM strains 
            WHERE standardizedName LIKE 'blue%' 
            LIMIT 10
          `);
          const duration = Date.now() - start;
          checks.performanceTest.duration = duration;
          checks.performanceTest.passed = duration < 100;
          checks.performanceTest.message = `Search took ${duration}ms (target: <100ms)`;
        } catch (error) {
          checks.performanceTest.message = `Check failed: ${error instanceof Error ? error.message : 'Unknown'}`;
        }
        
        const allPassed = Object.values(checks).every(c => c.passed);
        
        return {
          allPassed,
          checks,
          summary: allPassed 
            ? '✅ All checks passed - strain system is fully operational' 
            : '⚠️ Some checks failed - see details above',
        };
        
      } catch (error) {
        return {
          allPassed: false,
          checks,
          error: error instanceof Error ? error.message : 'Unknown error',
          summary: '❌ Verification failed',
        };
      }
    }),
  
  /**
   * Get Strain System Status
   * 
   * Quick status check without running full verification.
   */
  getStrainSystemStatus: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) {
        throw new Error("Database not available");
      }
      
      try {
        const totalStrains = await db.select({ count: sql<number>`COUNT(*)` }).from(strains);
        
        // Try to count OpenTHC strains, but handle case where column doesn't exist yet
        let openthcCount = 0;
        let columnsExist = false;
        try {
          const openthcStrains = await db.execute(sql`
            SELECT COUNT(*) as count FROM strains WHERE openthcId IS NOT NULL
          `);
          openthcCount = (openthcStrains as any)[0]?.count || 0;
          columnsExist = true;
        } catch (error) {
          // Column doesn't exist yet - this is fine, system not set up
          columnsExist = false;
        }
        
        return {
          totalStrains: totalStrains[0]?.count || 0,
          openthcStrains: openthcCount,
          systemReady: openthcCount > 10000,
          columnsExist: columnsExist,
          needsSetup: !columnsExist,
        };
      } catch (error) {
        throw new Error(`Failed to get status: ${error instanceof Error ? error.message : 'Unknown'}`);
      }
    }),
});

