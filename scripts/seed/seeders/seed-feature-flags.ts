/**
 * Feature Flags Seeder
 *
 * Seeds the feature_flags table with Work Surface and module feature flags.
 * DATA-012: Seed Work Surface Feature Flags
 *
 * Usage: npx tsx scripts/seed/seeders/seed-feature-flags.ts
 */

import { fileURLToPath } from "url";
import { db, closePool } from "../../db-sync";
import { featureFlags } from "../../../drizzle/schema-feature-flags";
import { eq } from "drizzle-orm";

// ============================================================================
// Feature Flag Definitions
// ============================================================================

interface FeatureFlagDefinition {
  key: string;
  name: string;
  description: string;
  module?: string;
  systemEnabled: boolean;
  defaultEnabled: boolean;
  dependsOn?: string;
}

/**
 * Work Surface Feature Flags
 * These control the new Work Surface UI components
 */
const WORK_SURFACE_FLAGS: FeatureFlagDefinition[] = [
  // Master toggle
  {
    key: "work-surface-enabled",
    name: "Work Surfaces",
    description: "Master toggle for all Work Surface features",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: true,
  },
  // Individual work surfaces
  {
    key: "work-surface-direct-intake",
    name: "Direct Intake Work Surface",
    description:
      "Enable the Direct Intake work surface for receiving inventory",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-purchase-orders",
    name: "Purchase Orders Work Surface",
    description: "Enable the Purchase Orders work surface",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-orders",
    name: "Orders Work Surface",
    description: "Enable the Orders work surface for sales orders",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-inventory",
    name: "Inventory Work Surface",
    description: "Enable the Inventory work surface for batch management",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-invoices",
    name: "Invoices Work Surface",
    description: "Enable the Invoices work surface",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-clients",
    name: "Clients Work Surface",
    description: "Enable the Clients work surface",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  // Work Surface features
  {
    key: "work-surface-keyboard-contract",
    name: "Keyboard Shortcuts",
    description: "Enable keyboard shortcuts in Work Surfaces",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: true,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-save-state",
    name: "Auto-save State",
    description: "Automatically save work surface state for session recovery",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: true,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-inspector-panel",
    name: "Inspector Panel",
    description: "Enable the inspector panel for detailed record views",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: true,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-validation-timing",
    name: "Validation Timing",
    description: "Show validation timing and performance metrics",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: true,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-concurrent-edit",
    name: "Concurrent Edit Detection",
    description: "Detect and warn about concurrent edits to the same record",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: true,
    dependsOn: "work-surface-enabled",
  },
  // Golden Flows
  {
    key: "work-surface-golden-flow-intake",
    name: "Golden Flow: Intake",
    description: "Enable the streamlined intake workflow",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-golden-flow-order",
    name: "Golden Flow: Order",
    description: "Enable the streamlined order creation workflow",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
  {
    key: "work-surface-golden-flow-invoice",
    name: "Golden Flow: Invoice",
    description: "Enable the streamlined invoicing workflow",
    module: "work-surfaces",
    systemEnabled: true,
    defaultEnabled: false,
    dependsOn: "work-surface-enabled",
  },
];

/**
 * Module Feature Flags
 * These control major system modules
 */
const MODULE_FLAGS: FeatureFlagDefinition[] = [
  {
    key: "module-accounting",
    name: "Accounting Module",
    description: "Enable accounting features (ledger, GL, financial reports)",
    module: "accounting",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "module-calendar",
    name: "Calendar Module",
    description: "Enable calendar and scheduling features",
    module: "calendar",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "module-gamification",
    name: "Gamification Module",
    description: "Enable achievements, points, and rewards system",
    module: "gamification",
    systemEnabled: true,
    defaultEnabled: false,
  },
  {
    key: "module-vip-portal",
    name: "VIP Portal",
    description: "Enable the client-facing VIP portal",
    module: "vip-portal",
    systemEnabled: true,
    defaultEnabled: true,
  },
  {
    key: "module-live-shopping",
    name: "Live Shopping",
    description: "Enable live shopping session features",
    module: "live-shopping",
    systemEnabled: true,
    defaultEnabled: false,
  },
  {
    key: "module-credit-management",
    name: "Credit Management",
    description: "Enable credit limits and management features",
    module: "credit",
    systemEnabled: true,
    defaultEnabled: true,
  },
];

/**
 * Communication Feature Flags
 */
const COMMUNICATION_FLAGS: FeatureFlagDefinition[] = [
  {
    key: "email-enabled",
    name: "Email Notifications",
    description: "Enable email notification sending",
    module: "notifications",
    systemEnabled: true,
    defaultEnabled: false,
  },
  {
    key: "sms-enabled",
    name: "SMS Notifications",
    description: "Enable SMS notification sending via Twilio",
    module: "notifications",
    systemEnabled: true,
    defaultEnabled: false,
  },
  {
    key: "slack-notifications",
    name: "Slack Notifications",
    description: "Enable Slack bot notifications",
    module: "notifications",
    systemEnabled: true,
    defaultEnabled: true,
  },
];

/**
 * Dashboard rollout flags
 */
const DASHBOARD_FLAGS: FeatureFlagDefinition[] = [
  {
    key: "owner-command-center-dashboard",
    name: "Owner Command Center Dashboard",
    description:
      "Replace the standard dashboard with the owner command center card layout",
    module: "dashboard",
    systemEnabled: true,
    defaultEnabled: false,
  },
];

/**
 * Beta Feature Flags
 */
const BETA_FLAGS: FeatureFlagDefinition[] = [
  {
    key: "beta-dashboard-v2",
    name: "Dashboard V2 (Beta)",
    description: "Enable the redesigned dashboard experience",
    module: "beta",
    systemEnabled: true,
    defaultEnabled: false,
  },
  {
    key: "beta-ai-suggestions",
    name: "AI Suggestions (Beta)",
    description: "Enable AI-powered suggestions in the UI",
    module: "beta",
    systemEnabled: false, // Not ready yet
    defaultEnabled: false,
  },
  {
    key: "beta-batch-operations",
    name: "Batch Operations (Beta)",
    description: "Enable bulk operations on records",
    module: "beta",
    systemEnabled: true,
    defaultEnabled: false,
  },
];

// Combine all flags
const ALL_FLAGS: FeatureFlagDefinition[] = [
  ...WORK_SURFACE_FLAGS,
  ...MODULE_FLAGS,
  ...COMMUNICATION_FLAGS,
  ...DASHBOARD_FLAGS,
  ...BETA_FLAGS,
];

// ============================================================================
// Seeder Function
// ============================================================================

export async function seedFeatureFlags(): Promise<void> {
  console.info("🚩 Seeding feature flags...");

  let inserted = 0;
  let updated = 0;
  let restored = 0;
  let skipped = 0;

  for (const flag of ALL_FLAGS) {
    try {
      // Check for ANY record with this key (including soft-deleted)
      // This prevents ER_DUP_ENTRY when a soft-deleted record holds the unique key
      const existing = await db.query.featureFlags.findFirst({
        where: eq(featureFlags.key, flag.key),
      });

      if (existing) {
        if (existing.deletedAt) {
          // Resurrect soft-deleted flag by updating and clearing deletedAt
          // QA-001: Include systemEnabled/defaultEnabled when restoring
          await db
            .update(featureFlags)
            .set({
              name: flag.name,
              description: flag.description,
              module: flag.module,
              dependsOn: flag.dependsOn,
              systemEnabled: flag.systemEnabled,
              defaultEnabled: flag.defaultEnabled,
              deletedAt: null,
            })
            .where(eq(featureFlags.id, existing.id));
          restored++;
          console.info(`  ↺ Restored: ${flag.key}`);
        } else if (
          // Update if any mutable field changed (SEED-005: check all fields that update sets)
          // QA-001: Include systemEnabled/defaultEnabled in comparison and update
          existing.description !== flag.description ||
          existing.module !== flag.module ||
          existing.name !== flag.name ||
          existing.dependsOn !== flag.dependsOn ||
          existing.systemEnabled !== flag.systemEnabled ||
          existing.defaultEnabled !== flag.defaultEnabled
        ) {
          await db
            .update(featureFlags)
            .set({
              name: flag.name,
              description: flag.description,
              module: flag.module,
              dependsOn: flag.dependsOn,
              systemEnabled: flag.systemEnabled,
              defaultEnabled: flag.defaultEnabled,
            })
            .where(eq(featureFlags.id, existing.id));
          updated++;
          console.info(`  ↻ Updated: ${flag.key}`);
        } else {
          skipped++;
        }
      } else {
        // Insert new flag
        await db.insert(featureFlags).values({
          key: flag.key,
          name: flag.name,
          description: flag.description,
          module: flag.module,
          systemEnabled: flag.systemEnabled,
          defaultEnabled: flag.defaultEnabled,
          dependsOn: flag.dependsOn,
        });
        inserted++;
        console.info(`  ✓ Created: ${flag.key}`);
      }
    } catch (error) {
      console.error(
        `  ✗ Failed: ${flag.key}`,
        error instanceof Error ? error.message : error
      );
    }
  }

  console.info(`\n✅ Feature flags seeding complete:`);
  console.info(`   - Inserted: ${inserted}`);
  console.info(`   - Updated: ${updated}`);
  console.info(`   - Restored: ${restored}`);
  console.info(`   - Skipped: ${skipped}`);
  console.info(`   - Total: ${ALL_FLAGS.length}`);
}

// ============================================================================
// CLI Entry Point
// ============================================================================

// Allow running directly (ESM-compatible pattern)
// QA-002: Use ESM pattern instead of CommonJS require.main
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  seedFeatureFlags()
    .then(async () => {
      await closePool();
      process.exit(0);
    })
    .catch(async err => {
      console.error("Failed to seed feature flags:", err);
      await closePool();
      process.exit(1);
    });
}
