/**
 * Script to Apply RBAC Permissions to All Routers
 * 
 * This script automatically updates all router files to use requirePermission
 * middleware instead of protectedProcedure, based on the permission mapping.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Permission mapping for each router
const ROUTER_PERMISSIONS: Record<string, Record<string, string>> = {
  // Accounting & Financial
  "accounting.ts": { default: "accounting:read", create: "accounting:create", update: "accounting:update" },
  "accountingHooks.ts": { default: "accounting:manage" },
  "badDebt.ts": { default: "accounting:manage" },
  "credit.ts": { default: "credits:read", create: "credits:create", update: "credits:update" },
  "credits.ts": { default: "credits:read", create: "credits:create", update: "credits:update", delete: "credits:delete" },
  "refunds.ts": { default: "refunds:read", create: "refunds:create", update: "refunds:update" },

  // Calendar & Scheduling
  "calendar.ts": { default: "calendar:read", create: "calendar:create", update: "calendar:update", delete: "calendar:delete" },
  "calendarFinancials.ts": { default: "calendar:read" },
  "calendarMeetings.ts": { default: "calendar:read", create: "calendar:create", update: "calendar:update" },
  "calendarParticipants.ts": { default: "calendar:read", update: "calendar:update" },
  "calendarRecurrence.ts": { default: "calendar:read", create: "calendar:create", update: "calendar:update" },
  "calendarReminders.ts": { default: "calendar:read", create: "calendar:create", update: "calendar:update", delete: "calendar:delete" },
  "calendarViews.ts": { default: "calendar:read" },

  // Client Management
  "clients.ts": { default: "clients:read", create: "clients:create", update: "clients:update", delete: "clients:delete" },
  "clientNeeds.ts": { default: "clients:read", update: "clients:update" },
  "clientNeedsEnhanced.ts": { default: "clients:read", update: "clients:update" },

  // Inventory & Products
  "inventory.ts": { default: "inventory:read", create: "inventory:create", update: "inventory:update", delete: "inventory:delete" },
  "inventoryMovements.ts": { default: "inventory:read", update: "inventory:update" },
  "locations.ts": { default: "inventory:read", manage: "settings:manage" },
  "productIntake.ts": { default: "inventory:create", update: "inventory:update" },
  "strains.ts": { default: "inventory:read", create: "inventory:create", update: "inventory:update", delete: "inventory:delete" },
  "warehouseTransfers.ts": { default: "inventory:read", create: "inventory:create", update: "inventory:update" },

  // Orders & Sales
  "orders.ts": { default: "orders:read", create: "orders:create", update: "orders:update", delete: "orders:delete" },
  "orderEnhancements.ts": { default: "orders:read", update: "orders:update" },
  "ordersEnhancedV2.ts": { default: "orders:read", create: "orders:create", update: "orders:update" },
  "salesSheets.ts": { default: "orders:read", create: "orders:create", update: "orders:update" },
  "salesSheetEnhancements.ts": { default: "orders:read", update: "orders:update" },
  "returns.ts": { default: "orders:read", create: "orders:create", update: "orders:update" },
  "samples.ts": { default: "orders:read", create: "orders:create", update: "orders:update" },

  // Purchase Orders & Vendors
  "purchaseOrders.ts": { default: "purchase_orders:read", create: "purchase_orders:create", update: "purchase_orders:update", delete: "purchase_orders:delete" },
  "poReceiving.ts": { default: "purchase_orders:read", update: "purchase_orders:update" },
  "vendors.ts": { default: "vendors:read", create: "vendors:create", update: "vendors:update", delete: "vendors:delete" },
  "vendorSupply.ts": { default: "vendors:read", update: "vendors:update" },

  // Pricing & COGS
  "pricing.ts": { default: "pricing:read", create: "pricing:create", update: "pricing:update" },
  "pricingDefaults.ts": { default: "pricing:read", manage: "settings:manage" },
  "cogs.ts": { default: "cogs:read", create: "cogs:create", update: "cogs:update" },
  "matching.ts": { default: "cogs:read", update: "cogs:update" },
  "matchingEnhanced.ts": { default: "cogs:read", update: "cogs:update" },

  // Dashboard & Analytics
  "dashboard.ts": { default: "dashboard:read" },
  "dashboardEnhanced.ts": { default: "dashboard:read" },
  "dashboardPreferences.ts": { default: "dashboard:read" },
  "dataCardMetrics.ts": { default: "dashboard:read" },
  "analytics.ts": { default: "analytics:read" },

  // Task Management
  "todoLists.ts": { default: "todos:read", create: "todos:create", update: "todos:update", delete: "todos:delete" },
  "todoTasks.ts": { default: "todos:read", create: "todos:create", update: "todos:update", delete: "todos:delete" },
  "todoActivity.ts": { default: "todos:read" },
  "inbox.ts": { default: "todos:read", update: "todos:update" },

  // Communication & Collaboration
  "comments.ts": { default: "comments:read", create: "comments:create", update: "comments:update", delete: "comments:delete" },
  "freeformNotes.ts": { default: "notes:read", create: "notes:create", update: "notes:update", delete: "notes:delete" },
  "scratchPad.ts": { default: "notes:read", create: "notes:create", update: "notes:update", delete: "notes:delete" },

  // Admin & System
  "admin.ts": { default: "system:manage" },
  "adminImport.ts": { default: "system:manage" },
  "adminMigrations.ts": { default: "system:manage" },
  "adminQuickFix.ts": { default: "system:manage" },
  "adminSchemaPush.ts": { default: "system:manage" },
  "auditLogs.ts": { default: "audit:read" },
  "configuration.ts": { default: "settings:manage" },
  "settings.ts": { default: "settings:read", manage: "settings:manage" },
  "userManagement.ts": { default: "users:manage" },

  // RBAC Management
  "rbac-users.ts": { default: "rbac:manage" },
  "rbac-roles.ts": { default: "rbac:manage" },
  "rbac-permissions.ts": { default: "rbac:manage" },

  // VIP Portal
  "vipPortal.ts": { default: "vip_portal:read", create: "vip_portal:create" },
  "vipPortalAdmin.ts": { default: "vip_portal:manage" },

  // Advanced Features
  "advancedTagFeatures.ts": { default: "tags:read", create: "tags:create", update: "tags:update", delete: "tags:delete" },
};

// Routers that should skip RBAC (public endpoints)
const SKIP_ROUTERS = ["auth.ts"];

function determinePermission(routerName: string, procedureName: string): string {
  const permissions = ROUTER_PERMISSIONS[routerName];
  if (!permissions) {
    console.warn(`⚠️  No permission mapping for ${routerName}, using default read permission`);
    const module = routerName.replace(".ts", "");
    return `${module}:read`;
  }

  // Try to match procedure name to action
  const lowerName = procedureName.toLowerCase();
  
  if (lowerName.includes("create") || lowerName.includes("add") || lowerName.includes("insert")) {
    return permissions.create || permissions.default;
  }
  if (lowerName.includes("update") || lowerName.includes("edit") || lowerName.includes("modify") || lowerName.includes("set")) {
    return permissions.update || permissions.default;
  }
  if (lowerName.includes("delete") || lowerName.includes("remove") || lowerName.includes("destroy")) {
    return permissions.delete || permissions.default;
  }
  if (lowerName.includes("manage") || lowerName.includes("admin")) {
    return permissions.manage || permissions.default;
  }

  // Default to read permission
  return permissions.default;
}

function processRouterFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  
  if (SKIP_ROUTERS.includes(fileName)) {
    console.log(`⏭️  Skipping ${fileName} (public router)`);
    return false;
  }

  if (!ROUTER_PERMISSIONS[fileName]) {
    console.log(`⏭️  Skipping ${fileName} (no permission mapping)`);
    return false;
  }

  let content = fs.readFileSync(filePath, "utf-8");
  let modified = false;

  // Check if already using requirePermission
  if (content.includes('requirePermission')) {
    console.log(`✅ ${fileName} already uses requirePermission`);
    return false;
  }

  // Add import if not present
  if (!content.includes('requirePermission')) {
    const importLine = 'import { requirePermission } from "../_core/permissionMiddleware";';
    const lines = content.split('\n');
    
    // Find the last import statement
    let lastImportIndex = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().startsWith('import ')) {
        lastImportIndex = i;
      }
    }
    
    if (lastImportIndex >= 0) {
      lines.splice(lastImportIndex + 1, 0, importLine);
      content = lines.join('\n');
      modified = true;
    }
  }

  // Replace protectedProcedure with requirePermission
  // This is a simplified approach - for production, you'd want more sophisticated parsing
  const procedureRegex = /(\w+):\s*protectedProcedure/g;
  const matches = [...content.matchAll(procedureRegex)];
  
  for (const match of matches) {
    const procedureName = match[1];
    const permission = determinePermission(fileName, procedureName);
    const replacement = `${procedureName}: requirePermission("${permission}")`;
    content = content.replace(match[0], replacement);
    modified = true;
    console.log(`  📝 ${procedureName} → ${permission}`);
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf-8");
    console.log(`✅ Updated ${fileName}`);
    return true;
  }

  return false;
}

function main() {
  const routersDir = path.join(__dirname, "../server/routers");
  const files = fs.readdirSync(routersDir)
    .filter(f => f.endsWith(".ts") && !f.endsWith(".test.ts"))
    .map(f => path.join(routersDir, f));

  console.log(`\n🔒 Applying RBAC to ${files.length} router files...\n`);

  let updatedCount = 0;
  for (const file of files) {
    if (processRouterFile(file)) {
      updatedCount++;
    }
  }

  console.log(`\n✅ Updated ${updatedCount} router files`);
  console.log(`⏭️  Skipped ${files.length - updatedCount} router files`);
}

main();
