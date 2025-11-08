import { getDb } from "../server/db";
import { roles, permissions, rolePermissions } from "../drizzle/schema";

/**
 * RBAC Role-Permission Mappings Script
 * 
 * This script creates the mappings between roles and permissions.
 * Run this after roles and permissions have been seeded.
 */

async function seedRoleMappings() {
  console.log("🔗 Starting role-permission mappings...");

  try {
    const db = await getDb();
    
    // Fetch all roles and permissions
    const allRoles = await db.select().from(roles);
    const allPermissions = await db.select().from(permissions);

    console.log(`Found ${allRoles.length} roles and ${allPermissions.length} permissions`);

    // Super Admin gets ALL permissions
    const superAdminRole = allRoles.find((r) => r.name === "Super Admin");
    if (superAdminRole) {
      console.log("📝 Assigning ALL permissions to Super Admin...");
      const superAdminMappings = allPermissions.map((p) => ({
        roleId: superAdminRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(superAdminMappings);
      console.log(`✅ Assigned ${superAdminMappings.length} permissions to Super Admin`);
    }

    // Operations Manager - Full access to operations
    const opsManagerRole = allRoles.find((r) => r.name === "Operations Manager");
    if (opsManagerRole) {
      console.log("📝 Assigning permissions to Operations Manager...");
      const opsPermissions = allPermissions.filter((p) =>
        p.module === "inventory" ||
        p.module === "orders" ||
        p.module === "purchase_orders" ||
        p.module === "vendors" ||
        p.module === "returns" ||
        p.module === "refunds" ||
        p.module === "warehouse" ||
        p.module === "dashboard" ||
        (p.module === "clients" && p.name.includes(":read")) ||
        (p.module === "accounting" && p.name.includes(":read")) ||
        (p.module === "pricing" && p.name.includes(":read"))
      );
      const opsMappings = opsPermissions.map((p) => ({
        roleId: opsManagerRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(opsMappings);
      console.log(`✅ Assigned ${opsMappings.length} permissions to Operations Manager`);
    }

    // Sales Manager - Full access to sales
    const salesManagerRole = allRoles.find((r) => r.name === "Sales Manager");
    if (salesManagerRole) {
      console.log("📝 Assigning permissions to Sales Manager...");
      const salesPermissions = allPermissions.filter((p) =>
        p.module === "clients" ||
        p.module === "orders" ||
        p.module === "quotes" ||
        p.module === "sales_sheets" ||
        p.module === "dashboard" ||
        (p.module === "inventory" && p.name.includes(":read")) ||
        (p.module === "pricing" && p.name.includes(":read"))
      );
      const salesMappings = salesPermissions.map((p) => ({
        roleId: salesManagerRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(salesMappings);
      console.log(`✅ Assigned ${salesMappings.length} permissions to Sales Manager`);
    }

    // Accountant - Full access to accounting
    const accountantRole = allRoles.find((r) => r.name === "Accountant");
    if (accountantRole) {
      console.log("📝 Assigning permissions to Accountant...");
      const accountingPermissions = allPermissions.filter((p) =>
        p.module === "accounting" ||
        p.module === "credits" ||
        p.module === "cogs" ||
        p.module === "bad_debt" ||
        p.module === "dashboard" ||
        (p.module === "orders" && p.name.includes(":read")) ||
        (p.module === "clients" && p.name.includes(":read")) ||
        (p.module === "vendors" && p.name.includes(":read"))
      );
      const accountingMappings = accountingPermissions.map((p) => ({
        roleId: accountantRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(accountingMappings);
      console.log(`✅ Assigned ${accountingMappings.length} permissions to Accountant`);
    }

    // Inventory Manager - Full inventory access
    const invManagerRole = allRoles.find((r) => r.name === "Inventory Manager");
    if (invManagerRole) {
      console.log("📝 Assigning permissions to Inventory Manager...");
      const invPermissions = allPermissions.filter((p) =>
        p.module === "inventory" ||
        p.module === "warehouse" ||
        p.module === "product_intake" ||
        p.module === "samples" ||
        p.module === "dashboard" ||
        (p.module === "purchase_orders" && (p.name.includes(":create") || p.name.includes(":read")))
      );
      const invMappings = invPermissions.map((p) => ({
        roleId: invManagerRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(invMappings);
      console.log(`✅ Assigned ${invMappings.length} permissions to Inventory Manager`);
    }

    // Buyer/Procurement - PO and vendor access
    const buyerRole = allRoles.find((r) => r.name === "Buyer/Procurement");
    if (buyerRole) {
      console.log("📝 Assigning permissions to Buyer/Procurement...");
      const buyerPermissions = allPermissions.filter((p) =>
        p.module === "purchase_orders" ||
        p.module === "vendors" ||
        p.module === "product_intake" ||
        p.module === "dashboard" ||
        (p.module === "inventory" && (p.name.includes(":read") || p.name.includes(":create")))
      );
      const buyerMappings = buyerPermissions.map((p) => ({
        roleId: buyerRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(buyerMappings);
      console.log(`✅ Assigned ${buyerMappings.length} permissions to Buyer/Procurement`);
    }

    // Customer Service - Client and order management
    const csRole = allRoles.find((r) => r.name === "Customer Service");
    if (csRole) {
      console.log("📝 Assigning permissions to Customer Service...");
      const csPermissions = allPermissions.filter((p) =>
        p.module === "clients" ||
        p.module === "orders" ||
        p.module === "returns" ||
        p.module === "refunds" ||
        p.module === "calendar" ||
        p.module === "todo" ||
        p.module === "dashboard" ||
        (p.module === "inventory" && p.name.includes(":read"))
      );
      const csMappings = csPermissions.map((p) => ({
        roleId: csRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(csMappings);
      console.log(`✅ Assigned ${csMappings.length} permissions to Customer Service`);
    }

    // Warehouse Staff - Receiving and inventory updates
    const warehouseRole = allRoles.find((r) => r.name === "Warehouse Staff");
    if (warehouseRole) {
      console.log("📝 Assigning permissions to Warehouse Staff...");
      const warehousePermissions = allPermissions.filter((p) =>
        (p.module === "purchase_orders" && p.name.includes(":receive")) ||
        (p.module === "inventory" && (p.name.includes(":update") || p.name.includes(":read"))) ||
        (p.module === "warehouse" && !p.name.includes(":delete")) ||
        (p.module === "returns" && p.name.includes(":process")) ||
        p.module === "dashboard"
      );
      const warehouseMappings = warehousePermissions.map((p) => ({
        roleId: warehouseRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(warehouseMappings);
      console.log(`✅ Assigned ${warehouseMappings.length} permissions to Warehouse Staff`);
    }

    // Read-Only Auditor - Read access to everything
    const auditorRole = allRoles.find((r) => r.name === "Read-Only Auditor");
    if (auditorRole) {
      console.log("📝 Assigning permissions to Read-Only Auditor...");
      const auditorPermissions = allPermissions.filter((p) =>
        p.name.includes(":read") ||
        p.name.includes(":view") ||
        p.name.includes(":access") ||
        p.module === "audit_logs"
      );
      const auditorMappings = auditorPermissions.map((p) => ({
        roleId: auditorRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(auditorMappings);
      console.log(`✅ Assigned ${auditorMappings.length} permissions to Read-Only Auditor`);
    }

    // Owner/Executive - Read-only access to financial data
    const ownerRole = allRoles.find((r) => r.name === "Owner/Executive");
    if (ownerRole) {
      console.log("📝 Assigning permissions to Owner/Executive...");
      const ownerPermissions = allPermissions.filter((p) =>
        p.name.includes(":read") ||
        p.name.includes(":view") ||
        p.name.includes(":access") ||
        p.module === "dashboard" ||
        p.module === "reports"
      );
      const ownerMappings = ownerPermissions.map((p) => ({
        roleId: ownerRole.id,
        permissionId: p.id,
      }));
      await db.insert(rolePermissions).values(ownerMappings);
      console.log(`✅ Assigned ${ownerMappings.length} permissions to Owner/Executive`);
    }

    console.log("\n🎉 Role-permission mappings completed successfully!");
    console.log("\nNext steps:");
    console.log("1. Assign roles to users via Settings > User Roles");
    console.log("2. Test permission checks with different user roles");
    console.log("3. Monitor logs for any permission denied errors");

  } catch (error) {
    console.error("❌ Error creating role-permission mappings:", error);
    throw error;
  }
}

// Run the seed
seedRoleMappings()
  .then(() => {
    console.log("✅ Seed completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  });
