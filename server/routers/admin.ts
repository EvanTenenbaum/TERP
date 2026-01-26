import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  strains,
  users,
  permissions,
  userPermissionOverrides,
} from "../../drizzle/schema";
import { roles, userRoles } from "../../drizzle/schema-rbac";
import { sql, eq, or, and } from "drizzle-orm";
import { importOpenTHCStrainsFromJSON } from "../import_openthc_strains";
import { requirePermission } from "../_core/permissionMiddleware";
import { logger } from "../_core/logger";

/**
 * Admin Router
 *
 * Administrative endpoints for system setup and maintenance.
 * All endpoints require admin privileges via protectedProcedure + permission middleware.
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
    .use(requirePermission("system:manage"))
    .mutation(async () => {
      const startTime = Date.now();
      const results = {
        schemaPush: {
          status: "pending" as "pending" | "running" | "success" | "error",
          message: "",
          duration: 0,
        },
        indexCreation: {
          status: "pending" as "pending" | "running" | "success" | "error",
          message: "",
          duration: 0,
        },
        strainImport: {
          status: "pending" as "pending" | "running" | "success" | "error",
          message: "",
          duration: 0,
        },
      };

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        // ===== STEP 1: Push Schema Changes =====
        logger.info("📋 Step 1/3: Pushing schema changes...");
        const schemaStart = Date.now();
        results.schemaPush.status = "running";

        try {
          // Add columns if they don't exist (PostgreSQL syntax)
          // PostgreSQL doesn't support multiple ADD COLUMN in one statement with IF NOT EXISTS
          try {
            await db.execute(
              sql`ALTER TABLE strains ADD COLUMN openthcId VARCHAR(255)`
            );
          } catch (_e) {
            // Column might already exist, that's fine
            logger.info("openthcId column may already exist");
          }

          try {
            await db.execute(
              sql`ALTER TABLE strains ADD COLUMN openthcStub VARCHAR(255)`
            );
          } catch (_e) {
            // Column might already exist, that's fine
            logger.info("openthcStub column may already exist");
          }

          results.schemaPush.status = "success";
          results.schemaPush.message =
            "Added openthcId and openthcStub columns";
          results.schemaPush.duration = Date.now() - schemaStart;
          logger.info(`✅ Schema updated in ${results.schemaPush.duration}ms`);
        } catch (error) {
          results.schemaPush.status = "error";
          results.schemaPush.message = `Schema update failed: ${error instanceof Error ? error.message : "Unknown error"}`;
          results.schemaPush.duration = Date.now() - schemaStart;
          console.error("❌ Schema update failed:", error);
          throw error;
        }

        // ===== STEP 2: Create Indexes =====
        logger.info("📋 Step 2/3: Creating performance indexes...");
        const indexStart = Date.now();
        results.indexCreation.status = "running";

        try {
          const indexes = [
            {
              name: "idx_strains_standardized",
              sql: "CREATE INDEX IF NOT EXISTS idx_strains_standardized ON strains(standardizedName)",
            },
            {
              name: "idx_strains_name",
              sql: "CREATE INDEX IF NOT EXISTS idx_strains_name ON strains(name)",
            },
            {
              name: "idx_strains_openthc",
              sql: "CREATE INDEX IF NOT EXISTS idx_strains_openthc ON strains(openthcId)",
            },
            {
              name: "idx_strains_category",
              sql: "CREATE INDEX IF NOT EXISTS idx_strains_category ON strains(category)",
            },
            {
              name: "idx_products_strain",
              sql: "CREATE INDEX IF NOT EXISTS idx_products_strain ON products(strainId)",
            },
            {
              name: "idx_strains_category_name",
              sql: "CREATE INDEX IF NOT EXISTS idx_strains_category_name ON strains(category, name)",
            },
          ];

          const createdIndexes = [];
          for (const index of indexes) {
            try {
              await db.execute(sql.raw(index.sql));
              createdIndexes.push(index.name);
              logger.info(`  ✓ Created ${index.name}`);
            } catch (error) {
              console.warn(
                `  ⚠ ${index.name} may already exist or failed:`,
                error
              );
            }
          }

          results.indexCreation.status = "success";
          results.indexCreation.message = `Created/verified ${createdIndexes.length} indexes: ${createdIndexes.join(", ")}`;
          results.indexCreation.duration = Date.now() - indexStart;
          logger.info(
            `✅ Indexes created in ${results.indexCreation.duration}ms`
          );
        } catch (error) {
          results.indexCreation.status = "error";
          results.indexCreation.message = `Index creation failed: ${error instanceof Error ? error.message : "Unknown error"}`;
          results.indexCreation.duration = Date.now() - indexStart;
          console.error("❌ Index creation failed:", error);
          // Don't throw - continue to import even if indexes fail
        }

        // ===== STEP 3: Import OpenTHC Strains =====
        logger.info("📋 Step 3/3: Importing OpenTHC strains...");
        const importStart = Date.now();
        results.strainImport.status = "running";

        try {
          const importResult = await importOpenTHCStrainsFromJSON();

          results.strainImport.status = "success";
          results.strainImport.message = `Imported ${importResult.imported} strains, skipped ${importResult.skipped} duplicates`;
          results.strainImport.duration = Date.now() - importStart;
          logger.info(
            `✅ Import completed in ${results.strainImport.duration}ms`
          );
        } catch (error) {
          results.strainImport.status = "error";
          results.strainImport.message = `Import failed: ${error instanceof Error ? error.message : "Unknown error"}`;
          results.strainImport.duration = Date.now() - importStart;
          console.error("❌ Import failed:", error);
          throw error;
        }

        // ===== SUCCESS =====
        const totalDuration = Date.now() - startTime;
        logger.info(`🎉 Strain system setup completed in ${totalDuration}ms`);

        return {
          success: true,
          results,
          summary: `Strain system setup completed successfully in ${(totalDuration / 1000).toFixed(1)}s`,
          totalDuration,
        };
      } catch (error) {
        const totalDuration = Date.now() - startTime;
        console.error("\n❌ Strain system setup failed:", error);

        return {
          success: false,
          results,
          error: error instanceof Error ? error.message : "Unknown error",
          summary: "Strain system setup failed",
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
    .use(requirePermission("system:manage"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        throw new Error("Database not available");
      }

      const checks = {
        schemaColumns: { passed: false, message: "" },
        indexes: { passed: false, message: "" },
        strainCount: { passed: false, message: "", count: 0 },
        openthcCount: { passed: false, message: "", count: 0 },
        performanceTest: { passed: false, message: "", duration: 0 },
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MySQL raw query result lacks type info
          const count = (result as any)[0]?.count || 0;
          checks.schemaColumns.passed = count === 2;
          checks.schemaColumns.message =
            count === 2
              ? "Both columns exist"
              : `Only ${count}/2 columns exist`;
        } catch (error) {
          checks.schemaColumns.message = `Check failed: ${error instanceof Error ? error.message : "Unknown"}`;
        }

        // Check 2: Indexes
        try {
          const result = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM information_schema.statistics 
            WHERE table_name = 'strains' 
            AND index_name LIKE 'idx_strains_%'
          `);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MySQL raw query result lacks type info
          const count = (result as any)[0]?.count || 0;
          checks.indexes.passed = count >= 5;
          checks.indexes.message = `${count} indexes found`;
        } catch (error) {
          checks.indexes.message = `Check failed: ${error instanceof Error ? error.message : "Unknown"}`;
        }

        // Check 3: Total strain count
        try {
          const result = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(strains);
          const count = result[0]?.count || 0;
          checks.strainCount.count = count;
          checks.strainCount.passed = count > 100;
          checks.strainCount.message = `${count} total strains`;
        } catch (error) {
          checks.strainCount.message = `Check failed: ${error instanceof Error ? error.message : "Unknown"}`;
        }

        // Check 4: OpenTHC strain count
        try {
          const result = await db.execute(sql`
            SELECT COUNT(*) as count 
            FROM strains 
            WHERE openthcId IS NOT NULL
          `);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MySQL raw query result lacks type info
          const count = (result as any)[0]?.count || 0;
          checks.openthcCount.count = count;
          checks.openthcCount.passed = count > 10000;
          checks.openthcCount.message = `${count} OpenTHC strains`;
        } catch (error) {
          checks.openthcCount.message = `Check failed: ${error instanceof Error ? error.message : "Unknown"}`;
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
          checks.performanceTest.message = `Check failed: ${error instanceof Error ? error.message : "Unknown"}`;
        }

        const allPassed = Object.values(checks).every(c => c.passed);

        return {
          allPassed,
          checks,
          summary: allPassed
            ? "✅ All checks passed - strain system is fully operational"
            : "⚠️ Some checks failed - see details above",
        };
      } catch (error) {
        return {
          allPassed: false,
          checks,
          error: error instanceof Error ? error.message : "Unknown error",
          summary: "❌ Verification failed",
        };
      }
    }),

  /**
   * Get Strain System Status
   *
   * Quick status check without running full verification.
   */
  getStrainSystemStatus: protectedProcedure
    .use(requirePermission("system:manage"))
    .query(async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        throw new Error("Database not available");
      }

      try {
        const totalStrains = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(strains);

        // Try to count OpenTHC strains, but handle case where column doesn't exist yet
        let openthcCount = 0;
        let columnsExist = false;
        try {
          const openthcStrains = await db.execute(sql`
            SELECT COUNT(*) as count FROM strains WHERE openthcId IS NOT NULL
          `);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MySQL raw query result lacks type info
          openthcCount = (openthcStrains as any)[0]?.count || 0;
          columnsExist = true;
        } catch (_error) {
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
        throw new Error(
          `Failed to get status: ${error instanceof Error ? error.message : "Unknown"}`
        );
      }
    }),

  /**
   * Fix User Permissions (BUG-001)
   *
   * Makes a user a Super Admin to grant them all permissions.
   * Requires admin authentication (BUG-035 fix).
   */
  fixUserPermissions: adminProcedure
    .input(
      z.object({
        username: z.string().optional(),
        email: z.string().optional(),
        makeAdmin: z.boolean().default(true),
      })
    )
    .mutation(async ({ input }) => {
      logger.info({ msg: "[Admin] fixUserPermissions called", input });

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        logger.error("[Admin] Database connection failed");
        throw new Error("Database connection failed");
      }

      // Find user by name or email
      const conditions = [];
      if (input.username) {
        conditions.push(eq(users.name, input.username));
      }
      if (input.email) {
        conditions.push(eq(users.email, input.email));
      }

      if (conditions.length === 0) {
        throw new Error("Must provide username or email");
      }

      const userRecords = await db
        .select()
        .from(users)
        .where(or(...conditions))
        .limit(1);

      if (!userRecords || userRecords.length === 0) {
        logger.error({ msg: "[Admin] User not found", input });
        throw new Error("User not found");
      }

      const user = userRecords[0];
      logger.info({
        msg: "[Admin] Found user",
        userId: user.id,
        username: user.name,
        email: user.email,
        role: user.role,
      });

      // Check if already an admin
      if (user.role === "admin") {
        logger.info("[Admin] User is already an admin");
        return {
          success: true,
          message: "User is already an admin",
          user: {
            id: user.id,
            username: user.name,
            email: user.email,
            role: user.role,
          },
        };
      }

      // Make user an admin
      if (input.makeAdmin) {
        await db
          .update(users)
          .set({ role: "admin" })
          .where(eq(users.id, user.id));

        logger.info({
          msg: "[Admin] User promoted to admin",
          userId: user.id,
        });

        return {
          success: true,
          message: "User is now an admin",
          user: {
            id: user.id,
            username: user.name,
            email: user.email,
            role: "admin",
          },
        };
      }

      return {
        success: true,
        message: "No changes made",
        user: {
          id: user.id,
          username: user.name,
          email: user.email,
          role: user.role,
        },
      };
    }),

  /**
   * List All Users
   *
   * Returns all users for debugging.
   * Requires admin authentication (BUG-035 fix).
   */
  listUsers: adminProcedure.query(async () => {
    logger.info("[Admin] listUsers called");

    const db = await getDb();
    if (!db) throw new Error("Database not available");
    if (!db) {
      throw new Error("Database connection failed");
    }

    const allUsers = await db.select().from(users);

    return {
      success: true,
      count: allUsers.length,
      users: allUsers.map(u => ({
        id: u.id,
        username: u.name,
        email: u.email,
        openId: u.openId,
        role: u.role,
      })),
    };
  }),

  /**
   * Grant Permission to User (BUG-001)
   *
   * Grants a specific permission to a user via permission override.
   * Requires admin authentication (BUG-035 fix).
   */
  grantPermission: adminProcedure
    .input(
      z.object({
        email: z.string(),
        permissionName: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      logger.info({ msg: "[Admin] grantPermission called", input });

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        logger.error("[Admin] Database connection failed");
        throw new Error("Database connection failed");
      }

      // Find user
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!userRecords || userRecords.length === 0) {
        logger.error({ msg: "[Admin] User not found", email: input.email });
        throw new Error("User not found");
      }

      const user = userRecords[0];

      // Find permission
      const permissionRecords = await db
        .select()
        .from(permissions)
        .where(eq(permissions.name, input.permissionName))
        .limit(1);

      if (!permissionRecords || permissionRecords.length === 0) {
        logger.error({
          msg: "[Admin] Permission not found",
          permissionName: input.permissionName,
        });
        throw new Error(`Permission "${input.permissionName}" not found`);
      }

      const permission = permissionRecords[0];

      // Grant permission via override
      try {
        await db.insert(userPermissionOverrides).values({
          userId: user.openId,
          permissionId: permission.id,
          granted: 1,
        });

        logger.info({
          msg: "[Admin] Permission granted",
          userId: user.openId,
          permissionName: input.permissionName,
        });

        return {
          success: true,
          message: `Permission "${input.permissionName}" granted to user "${user.email}"`,
          user: {
            id: user.id,
            email: user.email,
            openId: user.openId,
          },
          permission: {
            id: permission.id,
            name: permission.name,
          },
        };
      } catch (error: unknown) {
        const mysqlError = error as { code?: string };
        if (mysqlError.code === "ER_DUP_ENTRY") {
          // Update existing override
          await db
            .update(userPermissionOverrides)
            .set({ granted: 1 })
            .where(
              and(
                eq(userPermissionOverrides.userId, user.openId),
                eq(userPermissionOverrides.permissionId, permission.id)
              )
            );

          logger.info({
            msg: "[Admin] Permission override updated",
            userId: user.openId,
            permissionName: input.permissionName,
          });

          return {
            success: true,
            message: `Permission "${input.permissionName}" already granted (override updated)`,
            user: {
              id: user.id,
              email: user.email,
              openId: user.openId,
            },
            permission: {
              id: permission.id,
              name: permission.name,
            },
          };
        }
        throw error;
      }
    }),

  /**
   * Clear Permission Cache (BUG-001)
   *
   * Clears the permission cache for a specific user or all users.
   * Requires admin authentication (BUG-035 fix).
   */
  clearPermissionCache: adminProcedure
    .input(
      z.object({
        userId: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      logger.info({ msg: "[Admin] clearPermissionCache called", input });

      const { clearPermissionCache } =
        await import("../services/permissionService");

      if (input.userId) {
        clearPermissionCache(input.userId);
        return {
          success: true,
          message: `Permission cache cleared for user "${input.userId}"`,
        };
      } else {
        clearPermissionCache();
        return {
          success: true,
          message: "Permission cache cleared for all users",
        };
      }
    }),

  /**
   * Assign Super Admin Role (BUG-001 FINAL FIX)
   *
   * Assigns the "Super Admin" role to a user by creating a record in user_roles table.
   * This is the correct way to grant full permissions in the RBAC system.
   * Requires admin authentication (BUG-035 fix).
   */
  assignSuperAdminRole: adminProcedure
    .input(
      z.object({
        email: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      logger.info({ msg: "[Admin] assignSuperAdminRole called", input });

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      if (!db) {
        logger.error("[Admin] Database connection failed");
        throw new Error("Database connection failed");
      }

      // Find user
      const userRecords = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email))
        .limit(1);

      if (!userRecords || userRecords.length === 0) {
        logger.error({ msg: "[Admin] User not found", email: input.email });
        throw new Error("User not found");
      }

      const user = userRecords[0];

      // Find Super Admin role
      const roleRecords = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Super Admin"))
        .limit(1);

      if (!roleRecords || roleRecords.length === 0) {
        logger.error("[Admin] Super Admin role not found in database");
        throw new Error("Super Admin role not found");
      }

      const superAdminRole = roleRecords[0];

      // Check if already assigned
      const existingAssignment = await db
        .select()
        .from(userRoles)
        .where(
          and(
            eq(userRoles.userId, user.openId),
            eq(userRoles.roleId, superAdminRole.id)
          )
        )
        .limit(1);

      if (existingAssignment && existingAssignment.length > 0) {
        logger.info("[Admin] User already has Super Admin role");
        return {
          success: true,
          message: "User already has Super Admin role",
          user: {
            id: user.id,
            email: user.email,
            openId: user.openId,
          },
          role: {
            id: superAdminRole.id,
            name: superAdminRole.name,
          },
        };
      }

      // Assign Super Admin role
      try {
        await db.insert(userRoles).values({
          userId: user.openId,
          roleId: superAdminRole.id,
          assignedBy: "admin-api",
        });

        logger.info({
          msg: "[Admin] Super Admin role assigned",
          userId: user.openId,
          roleId: superAdminRole.id,
        });

        return {
          success: true,
          message: `Super Admin role assigned to user "${user.email}"`,
          user: {
            id: user.id,
            email: user.email,
            openId: user.openId,
          },
          role: {
            id: superAdminRole.id,
            name: superAdminRole.name,
          },
        };
      } catch (error) {
        logger.error({ msg: "[Admin] Failed to assign role", error });
        throw new Error(
          `Failed to assign role: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      }
    }),
});
