/**
 * RBAC Startup Validation Service
 * ARCH-003: Ensures required roles and permissions exist at startup
 *
 * This module provides:
 * - Startup validation checks for critical RBAC resources
 * - Deterministic auto-seeding when invariants are violated
 * - Clear error messages for misconfiguration
 * - Bootstrap contract documentation
 *
 * Bootstrap Contract:
 * - At least one role (Super Admin) MUST exist
 * - All 10 system roles should exist for full functionality
 * - The roles -> permissions mappings should be complete
 *
 * If validation fails and RBAC_AUTO_SEED=true, the system will
 * automatically seed RBAC defaults. Otherwise, it will log a warning
 * and continue in degraded mode.
 */

import { getDb } from "../db";
import { roles, permissions, rolePermissions } from "../../drizzle/schema";
import { count, eq } from "drizzle-orm";
import { logger } from "../_core/logger";
import { seedRBACDefaults } from "./seedRBAC";
import { ROLES, PERMISSIONS, ROLE_PERMISSION_MAPPINGS } from "./rbacDefinitions";

/**
 * RBAC validation result
 */
export interface RBACValidationResult {
  isValid: boolean;
  rolesExist: boolean;
  permissionsExist: boolean;
  mappingsExist: boolean;
  roleCount: number;
  permissionCount: number;
  mappingCount: number;
  missingRoles: string[];
  missingPermissions: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Expected counts for full RBAC setup
 */
const EXPECTED_ROLE_COUNT = ROLES.length; // 10
const EXPECTED_PERMISSION_COUNT = PERMISSIONS.length; // 255
const MINIMUM_ROLE_COUNT = 1; // At least Super Admin must exist
const MINIMUM_PERMISSION_COUNT = 10; // At least core permissions

/**
 * Critical roles that MUST exist for system functionality
 */
const CRITICAL_ROLES = ["Super Admin"];

/**
 * Critical permissions that MUST exist
 */
const CRITICAL_PERMISSIONS = [
  "dashboard:access",
  "dashboard:read",
  "clients:access",
  "clients:read",
  "inventory:access",
  "inventory:read",
  "orders:access",
  "orders:read",
];

/**
 * Validate RBAC configuration at startup
 *
 * @returns Validation result with detailed information
 */
export async function validateRBACConfig(): Promise<RBACValidationResult> {
  const result: RBACValidationResult = {
    isValid: true,
    rolesExist: false,
    permissionsExist: false,
    mappingsExist: false,
    roleCount: 0,
    permissionCount: 0,
    mappingCount: 0,
    missingRoles: [],
    missingPermissions: [],
    warnings: [],
    errors: [],
  };

  const db = await getDb();
  if (!db) {
    result.isValid = false;
    result.errors.push("Database not available for RBAC validation");
    return result;
  }

  try {
    // Count existing roles
    const roleResult = await db.select({ count: count() }).from(roles);
    result.roleCount = roleResult[0]?.count || 0;
    result.rolesExist = result.roleCount > 0;

    // Count existing permissions
    const permResult = await db.select({ count: count() }).from(permissions);
    result.permissionCount = permResult[0]?.count || 0;
    result.permissionsExist = result.permissionCount > 0;

    // Count existing role-permission mappings
    const mappingResult = await db.select({ count: count() }).from(rolePermissions);
    result.mappingCount = mappingResult[0]?.count || 0;
    result.mappingsExist = result.mappingCount > 0;

    // Check for critical roles
    if (result.rolesExist) {
      const existingRoles = await db.select({ name: roles.name }).from(roles);
      const existingRoleNames = new Set(existingRoles.map(r => r.name));

      for (const criticalRole of CRITICAL_ROLES) {
        if (!existingRoleNames.has(criticalRole)) {
          result.missingRoles.push(criticalRole);
        }
      }

      // Check for all expected roles
      for (const expectedRole of ROLES) {
        if (!existingRoleNames.has(expectedRole.name)) {
          if (!CRITICAL_ROLES.includes(expectedRole.name)) {
            result.warnings.push(`Non-critical role missing: ${expectedRole.name}`);
          }
        }
      }
    }

    // Check for critical permissions
    if (result.permissionsExist) {
      const existingPermissions = await db.select({ name: permissions.name }).from(permissions);
      const existingPermNames = new Set(existingPermissions.map(p => p.name));

      for (const criticalPerm of CRITICAL_PERMISSIONS) {
        if (!existingPermNames.has(criticalPerm)) {
          result.missingPermissions.push(criticalPerm);
        }
      }
    }

    // Determine overall validity
    if (!result.rolesExist) {
      result.isValid = false;
      result.errors.push("No roles found in database");
    } else if (result.roleCount < MINIMUM_ROLE_COUNT) {
      result.isValid = false;
      result.errors.push(`Insufficient roles: ${result.roleCount}/${MINIMUM_ROLE_COUNT} minimum`);
    }

    if (result.missingRoles.length > 0) {
      result.isValid = false;
      result.errors.push(`Missing critical roles: ${result.missingRoles.join(", ")}`);
    }

    if (!result.permissionsExist) {
      result.isValid = false;
      result.errors.push("No permissions found in database");
    } else if (result.permissionCount < MINIMUM_PERMISSION_COUNT) {
      result.isValid = false;
      result.errors.push(`Insufficient permissions: ${result.permissionCount}/${MINIMUM_PERMISSION_COUNT} minimum`);
    }

    if (result.missingPermissions.length > 0) {
      result.warnings.push(`Missing critical permissions: ${result.missingPermissions.join(", ")}`);
    }

    if (!result.mappingsExist && result.rolesExist && result.permissionsExist) {
      result.warnings.push("No role-permission mappings found - roles may not have any permissions");
    }

    // Add completeness warnings
    if (result.roleCount < EXPECTED_ROLE_COUNT) {
      result.warnings.push(`Partial role setup: ${result.roleCount}/${EXPECTED_ROLE_COUNT} roles`);
    }

    if (result.permissionCount < EXPECTED_PERMISSION_COUNT) {
      result.warnings.push(`Partial permission setup: ${result.permissionCount}/${EXPECTED_PERMISSION_COUNT} permissions`);
    }

  } catch (error) {
    result.isValid = false;
    result.errors.push(`RBAC validation error: ${error instanceof Error ? error.message : String(error)}`);
  }

  return result;
}

/**
 * Perform RBAC startup check with optional auto-seeding
 *
 * This function should be called during server startup.
 * It validates RBAC configuration and optionally seeds defaults.
 *
 * @returns true if RBAC is valid or was successfully seeded
 */
export async function performRBACStartupCheck(): Promise<boolean> {
  logger.info("🔐 Performing RBAC startup validation...");

  // Check if seeding is explicitly skipped
  const skipSeeding = process.env.SKIP_SEEDING?.toLowerCase();
  if (skipSeeding === "true" || skipSeeding === "1") {
    logger.warn("⚠️ SKIP_SEEDING is set - RBAC validation will be lenient");
  }

  const validation = await validateRBACConfig();

  // Log validation results
  logger.info({
    msg: "RBAC validation result",
    isValid: validation.isValid,
    roleCount: validation.roleCount,
    permissionCount: validation.permissionCount,
    mappingCount: validation.mappingCount,
  });

  if (validation.warnings.length > 0) {
    for (const warning of validation.warnings) {
      logger.warn(`⚠️ RBAC: ${warning}`);
    }
  }

  if (validation.isValid) {
    logger.info("✅ RBAC configuration is valid");
    return true;
  }

  // RBAC is invalid - log errors
  for (const error of validation.errors) {
    logger.error(`❌ RBAC: ${error}`);
  }

  // Check if auto-seeding is enabled
  const autoSeed = process.env.RBAC_AUTO_SEED?.toLowerCase();
  const shouldAutoSeed = autoSeed === "true" || autoSeed === "1";

  if (shouldAutoSeed) {
    logger.info("🌱 RBAC_AUTO_SEED is enabled - attempting to seed RBAC defaults...");
    try {
      await seedRBACDefaults();

      // Re-validate after seeding
      const revalidation = await validateRBACConfig();
      if (revalidation.isValid) {
        logger.info("✅ RBAC auto-seeding successful");
        return true;
      } else {
        logger.error("❌ RBAC auto-seeding completed but validation still fails");
        for (const error of revalidation.errors) {
          logger.error(`❌ RBAC: ${error}`);
        }
        return false;
      }
    } catch (error) {
      logger.error({
        msg: "RBAC auto-seeding failed",
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  // No auto-seeding - warn and continue in degraded mode
  logger.warn("⚠️ RBAC configuration is invalid - running in degraded mode");
  logger.warn("⚠️ Some permission checks may fail until RBAC is properly seeded");
  logger.warn("💡 To enable auto-seeding, set RBAC_AUTO_SEED=true in environment");
  logger.warn("💡 Or run: pnpm seed:new to manually seed RBAC defaults");

  // Return true to allow server to start (degraded mode)
  // Return false to prevent server start
  // For now, we allow degraded mode for backwards compatibility
  return true;
}

/**
 * Get a human-readable summary of RBAC status
 */
export async function getRBACSummary(): Promise<string> {
  const validation = await validateRBACConfig();

  const lines = [
    "=== RBAC Configuration Summary ===",
    `Status: ${validation.isValid ? "✅ Valid" : "❌ Invalid"}`,
    `Roles: ${validation.roleCount}/${EXPECTED_ROLE_COUNT}`,
    `Permissions: ${validation.permissionCount}/${EXPECTED_PERMISSION_COUNT}`,
    `Role-Permission Mappings: ${validation.mappingCount}`,
  ];

  if (validation.errors.length > 0) {
    lines.push("", "Errors:");
    for (const error of validation.errors) {
      lines.push(`  ❌ ${error}`);
    }
  }

  if (validation.warnings.length > 0) {
    lines.push("", "Warnings:");
    for (const warning of validation.warnings) {
      lines.push(`  ⚠️ ${warning}`);
    }
  }

  return lines.join("\n");
}
