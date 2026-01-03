/**
 * Feature Flag Seed Data
 * 
 * Seeds the database with default feature flags.
 * Run this during initial setup or when adding new flags.
 */

import { featureFlagsDb } from "../featureFlagsDb";
import { logger } from "../_core/logger";

/**
 * Default feature flags to seed
 * 
 * These represent the initial set of flags that should exist in the system.
 * Flags are organized by category:
 * - Module flags (module-*): Enable/disable entire modules
 * - Feature flags: Individual features within modules
 * - Legacy flags: Migrated from configurationManager.ts
 */
const DEFAULT_FLAGS = [
  // ========================================================================
  // MODULE FLAGS
  // ========================================================================
  {
    key: "module-accounting",
    name: "Accounting Module",
    description: "Enable the accounting module including GL, invoices, and financial reports",
    module: null,
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "module-inventory",
    name: "Inventory Module",
    description: "Enable inventory management, tracking, and movements",
    module: null,
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "module-sales",
    name: "Sales Module",
    description: "Enable sales features including orders, quotes, and sales sheets",
    module: null,
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "module-vip-portal",
    name: "VIP Portal Module",
    description: "Enable the VIP portal for client self-service",
    module: null,
    systemEnabled: true,
    defaultEnabled: true,
  },

  // ========================================================================
  // FEATURE FLAGS (migrated from configurationManager.ts)
  // ========================================================================
  {
    key: "credit-management",
    name: "Credit Management",
    description: "Enable credit management features for client accounts",
    module: "module-accounting",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "bad-debt-write-off",
    name: "Bad Debt Write-Off",
    description: "Enable bad debt write-off functionality",
    module: "module-accounting",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "automatic-gl-posting",
    name: "Automatic GL Posting",
    description: "Automatically post transactions to the general ledger",
    module: "module-accounting",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "cogs-calculation",
    name: "COGS Calculation",
    description: "Enable cost of goods sold calculation",
    module: "module-inventory",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "inventory-tracking",
    name: "Inventory Tracking",
    description: "Enable detailed inventory tracking and movements",
    module: "module-inventory",
    systemEnabled: true,
    defaultEnabled: true,
  },

  // ========================================================================
  // FEATURE FLAGS (migrated from featureFlags.ts)
  // ========================================================================
  {
    key: "live-catalog",
    name: "Live Catalog",
    description: "Enable the VIP Portal Live Catalog feature for browsing inventory",
    module: "module-vip-portal",
    systemEnabled: true,
    defaultEnabled: true, // Enabled by default for all users
  },
  {
    key: "vip-admin-impersonation",
    name: "VIP Admin Impersonation",
    description: "Enable admin impersonation for VIP portal access with full audit logging (FEATURE-012)",
    module: "module-vip-portal",
    systemEnabled: true,
    defaultEnabled: true, // Enabled for production use
  },

  // ========================================================================
  // NEW FEATURE FLAGS
  // ========================================================================
  {
    key: "live-shopping",
    name: "Live Shopping",
    description: "Enable live shopping sessions for real-time sales",
    module: "module-sales",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "pick-pack",
    name: "Pick & Pack",
    description: "Enable pick and pack workflow for order fulfillment",
    module: "module-inventory",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "photography",
    name: "Photography Module",
    description: "Enable product photography workflow",
    module: "module-inventory",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "leaderboard",
    name: "Leaderboard",
    description: "Enable sales leaderboard and gamification features",
    module: "module-sales",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "analytics-dashboard",
    name: "Analytics Dashboard",
    description: "Enable advanced analytics and reporting dashboard",
    module: null,
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "spreadsheet-view",
    name: "Spreadsheet View",
    description: "Enable unified spreadsheet interface for inventory, intake, and pick & pack workflows",
    module: "module-inventory",
    systemEnabled: true,
    defaultEnabled: false,
  },

  // ========================================================================
  // CALENDAR MODULE FLAGS (CAL-003/CAL-004)
  // ========================================================================
  {
    key: "module-calendar",
    name: "Calendar Module",
    description: "Enable calendar and scheduling features",
    module: null,
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "calendar-appointments",
    name: "Appointment Booking",
    description: "Enable appointment request and approval workflow",
    module: "module-calendar",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "calendar-time-off",
    name: "Time Off Management",
    description: "Enable time-off request and approval workflow with availability integration",
    module: "module-calendar",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "calendar-recurrence",
    name: "Recurring Events",
    description: "Enable recurring event patterns (daily, weekly, monthly, yearly)",
    module: "module-calendar",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "calendar-multi-calendar",
    name: "Multi-Calendar Support",
    description: "Enable multiple calendars per user with different settings",
    module: "module-calendar",
    systemEnabled: true,
    defaultEnabled: true,
  },
];

/**
 * Seed feature flags into the database
 * 
 * This function is idempotent - it will only create flags that don't exist.
 * Existing flags will not be modified.
 * 
 * @param actorOpenId - The openId of the user performing the seed (for audit)
 * @returns Object with counts of created and skipped flags
 */
export async function seedFeatureFlags(actorOpenId: string = "system"): Promise<{
  created: number;
  skipped: number;
  errors: string[];
}> {
  const result = {
    created: 0,
    skipped: 0,
    errors: [] as string[],
  };

  logger.info({ count: DEFAULT_FLAGS.length }, "[FeatureFlags] Starting seed");

  for (const flag of DEFAULT_FLAGS) {
    try {
      // Check if flag already exists
      const existing = await featureFlagsDb.getByKey(flag.key);
      
      if (existing) {
        logger.debug({ key: flag.key }, "[FeatureFlags] Flag already exists, skipping");
        result.skipped++;
        continue;
      }

      // Create the flag
      await featureFlagsDb.create(flag, actorOpenId);
      logger.info({ key: flag.key, name: flag.name }, "[FeatureFlags] Created flag");
      result.created++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error({ key: flag.key, error: message }, "[FeatureFlags] Failed to create flag");
      result.errors.push(`${flag.key}: ${message}`);
    }
  }

  logger.info({
    created: result.created,
    skipped: result.skipped,
    errors: result.errors.length,
  }, "[FeatureFlags] Seed complete");

  return result;
}

/**
 * Get the list of default flags (for documentation/testing)
 */
export function getDefaultFlags() {
  return DEFAULT_FLAGS;
}
