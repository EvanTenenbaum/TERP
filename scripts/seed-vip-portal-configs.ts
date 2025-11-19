import { db } from "./db-sync.js";
import { sql } from "drizzle-orm";

console.log("\n=== DATA-011: Seeding VIP Portal Configurations ===\n");

async function seedVIPPortalConfigs() {
  // Get some clients to make VIP
  const clientsResult = await db.execute(
    sql.raw("SELECT id, name FROM clients LIMIT 10")
  );
  const clients = clientsResult[0] as { id: number; name: string }[];

  if (clients.length === 0) {
    console.log("❌ No clients found. Cannot seed VIP portal configurations.");
    return;
  }

  console.log(`Found ${clients.length} clients to configure VIP portals for\n`);

  const configs: string[] = [];

  // Create 10 VIP portal configurations with varying feature sets
  for (let i = 0; i < Math.min(10, clients.length); i++) {
    const client = clients[i];

    // Vary the features enabled for different clients
    const dashboardEnabled = 1;
    const arEnabled = i < 8 ? 1 : 0; // Most have AR
    const apEnabled = i < 6 ? 1 : 0; // Some have AP
    const transactionHistoryEnabled = 1;
    const vipTierEnabled = i < 7 ? 1 : 0;
    const creditCenterEnabled = i < 5 ? 1 : 0;
    const marketplaceNeedsEnabled = i < 9 ? 1 : 0;
    const marketplaceSupplyEnabled = i < 4 ? 1 : 0;
    const leaderboardEnabled = i < 3 ? 1 : 0;
    const liveCatalogEnabled = i < 6 ? 1 : 0;

    const leaderboardTypes = ["ytd_spend", "monthly_spend", "total_orders"];
    const leaderboardType = leaderboardTypes[i % leaderboardTypes.length];

    const leaderboardDisplayModes = ["blackbox", "transparent", "anonymous"];
    const leaderboardDisplayMode =
      leaderboardDisplayModes[i % leaderboardDisplayModes.length];

    const featuresConfig = JSON.stringify({
      customBranding: {
        enabled: i < 5,
        primaryColor: i < 5 ? "#4F46E5" : null,
        logoUrl: i < 5 ? `/logos/client-${client.id}.png` : null,
      },
      notifications: {
        emailEnabled: true,
        smsEnabled: i < 7,
        pushEnabled: i < 4,
      },
      dataRetention: {
        transactionHistoryDays: i < 5 ? 365 : 90,
        documentRetentionDays: i < 5 ? 730 : 365,
      },
      permissions: {
        canPlaceOrders: i < 8,
        canViewPricing: true,
        canDownloadReports: i < 6,
        canManageUsers: i < 3,
      },
    });

    const advancedOptions = JSON.stringify({
      apiAccess: {
        enabled: i < 3,
        rateLimit: i < 3 ? 1000 : 100,
      },
      customFields: i < 2 ? { field1: "value1", field2: "value2" } : {},
      integrations: {
        quickbooks: i < 4,
        salesforce: i < 2,
      },
    });

    configs.push(`(
      ${client.id},
      ${dashboardEnabled},
      ${arEnabled},
      ${apEnabled},
      ${transactionHistoryEnabled},
      ${vipTierEnabled},
      ${creditCenterEnabled},
      ${marketplaceNeedsEnabled},
      ${marketplaceSupplyEnabled},
      ${leaderboardEnabled},
      '${featuresConfig}',
      '${leaderboardType}',
      '${leaderboardDisplayMode}',
      ${i < 7 ? 1 : 0},
      ${5 + (i % 5)},
      '${advancedOptions}',
      ${liveCatalogEnabled}
    )`);

    console.log(
      `✓ Configured VIP portal for client ${client.id} (${client.name})`
    );
  }

  const insertQuery = `
    INSERT INTO vip_portal_configurations (
      client_id,
      module_dashboard_enabled,
      module_ar_enabled,
      module_ap_enabled,
      module_transaction_history_enabled,
      module_vip_tier_enabled,
      module_credit_center_enabled,
      module_marketplace_needs_enabled,
      module_marketplace_supply_enabled,
      module_leaderboard_enabled,
      features_config,
      leaderboard_type,
      leaderboard_display_mode,
      leaderboard_show_suggestions,
      leaderboard_minimum_clients,
      advanced_options,
      module_live_catalog_enabled
    ) VALUES ${configs.join(",\n")}
  `;

  try {
    await db.execute(sql.raw(insertQuery));
    console.log(`\n✅ Seeded ${configs.length} VIP portal configurations\n`);

    // Verify
    const verifyResult = await db.execute(
      sql.raw(`
        SELECT 
          COUNT(*) as total,
          SUM(module_ar_enabled) as ar_enabled,
          SUM(module_ap_enabled) as ap_enabled,
          SUM(module_marketplace_needs_enabled) as marketplace_enabled,
          SUM(module_leaderboard_enabled) as leaderboard_enabled,
          SUM(module_live_catalog_enabled) as live_catalog_enabled
        FROM vip_portal_configurations
      `)
    );

    console.log("📊 VIP Portal Configuration Summary:\n");
    console.table(verifyResult[0]);

    console.log("\n✅ DATA-011 Complete!");
  } catch (error) {
    console.error("❌ Error seeding VIP portal configurations:", error);
    throw error;
  }
}

seedVIPPortalConfigs()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error);
    process.exit(1);
  });
