import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getDb } from "../db";
import { roles, permissions, rolePermissions, userRoles } from "../../drizzle/schema";
import { seedRBACDefaults, assignRoleToUser } from "./seedRBAC";
import { eq } from "drizzle-orm";

/**
 * RBAC Seeding Tests
 * 
 * These tests verify that:
 * 1. RBAC defaults are seeded correctly (roles, permissions, mappings)
 * 2. Seeding is idempotent (safe to call multiple times)
 * 3. Role assignment works correctly
 * 4. Super Admin role has all permissions
 */

describe("RBAC Seeding", () => {
  let db: Awaited<ReturnType<typeof getDb>>;

  beforeEach(async () => {
    db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up RBAC tables before each test
    await db.delete(userRoles);
    await db.delete(rolePermissions);
    await db.delete(roles);
    await db.delete(permissions);
  });

  afterEach(async () => {
    // Clean up after tests
    if (db) {
      await db.delete(userRoles);
      await db.delete(rolePermissions);
      await db.delete(roles);
      await db.delete(permissions);
    }
  });

  describe("seedRBACDefaults", () => {
    it("should seed 10 roles", async () => {
      await seedRBACDefaults();

      const allRoles = await db.select().from(roles);
      expect(allRoles).toHaveLength(10);

      const roleNames = allRoles.map((r) => r.name);
      expect(roleNames).toContain("Super Admin");
      expect(roleNames).toContain("Owner/Executive");
      expect(roleNames).toContain("Operations Manager");
      expect(roleNames).toContain("Sales Manager");
      expect(roleNames).toContain("Accountant");
      expect(roleNames).toContain("Inventory Manager");
      expect(roleNames).toContain("Buyer/Procurement");
      expect(roleNames).toContain("Customer Service");
      expect(roleNames).toContain("Warehouse Staff");
      expect(roleNames).toContain("Read-Only Auditor");
    });

    it("should seed 255 permissions", async () => {
      await seedRBACDefaults();

      const allPermissions = await db.select().from(permissions);
      expect(allPermissions.length).toBeGreaterThanOrEqual(250); // Allow for slight variations
      expect(allPermissions.length).toBeLessThanOrEqual(260);
    });

    it("should create role-permission mappings", async () => {
      await seedRBACDefaults();

      const mappings = await db.select().from(rolePermissions);
      expect(mappings.length).toBeGreaterThan(0);
    });

    it("should assign ALL permissions to Super Admin", async () => {
      await seedRBACDefaults();

      const [superAdminRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Super Admin"))
        .limit(1);

      expect(superAdminRole).toBeDefined();

      const superAdminPermissions = await db
        .select()
        .from(rolePermissions)
        .where(eq(rolePermissions.roleId, superAdminRole.id));

      const allPermissions = await db.select().from(permissions);

      // Super Admin should have all permissions
      expect(superAdminPermissions.length).toBe(allPermissions.length);
    });

    it("should be idempotent (safe to call multiple times)", async () => {
      // Seed once
      await seedRBACDefaults();
      const firstRoles = await db.select().from(roles);
      const firstPermissions = await db.select().from(permissions);

      // Seed again
      await seedRBACDefaults();
      const secondRoles = await db.select().from(roles);
      const secondPermissions = await db.select().from(permissions);

      // Should have same counts (no duplicates)
      expect(secondRoles).toHaveLength(firstRoles.length);
      expect(secondPermissions).toHaveLength(firstPermissions.length);
    });

    it("should mark all roles as system roles", async () => {
      await seedRBACDefaults();

      const allRoles = await db.select().from(roles);
      allRoles.forEach((role) => {
        expect(role.isSystemRole).toBe(1);
      });
    });

    it("should create permissions across multiple modules", async () => {
      await seedRBACDefaults();

      const allPermissions = await db.select().from(permissions);
      const modules = new Set(allPermissions.map((p) => p.module));

      // Should have permissions for multiple modules
      expect(modules.size).toBeGreaterThan(10);
      expect(modules).toContain("dashboard");
      expect(modules).toContain("orders");
      expect(modules).toContain("inventory");
      expect(modules).toContain("clients");
      expect(modules).toContain("accounting");
    });
  });

  describe("assignRoleToUser", () => {
    beforeEach(async () => {
      // Seed RBAC before testing role assignment
      await seedRBACDefaults();
    });

    it("should assign a role to a user", async () => {
      const testUserId = "test-user-123";

      await assignRoleToUser(testUserId, "Super Admin");

      const assignment = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, testUserId))
        .limit(1);

      expect(assignment).toHaveLength(1);

      const [superAdminRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Super Admin"))
        .limit(1);

      expect(assignment[0].roleId).toBe(superAdminRole.id);
    });

    it("should be idempotent (not create duplicate assignments)", async () => {
      const testUserId = "test-user-456";

      // Assign once
      await assignRoleToUser(testUserId, "Operations Manager");

      // Assign again
      await assignRoleToUser(testUserId, "Operations Manager");

      const assignments = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, testUserId));

      // Should only have one assignment
      expect(assignments).toHaveLength(1);
    });

    it("should handle non-existent role gracefully", async () => {
      const testUserId = "test-user-789";

      // Should not throw, just log error
      await expect(
        assignRoleToUser(testUserId, "Non-Existent Role")
      ).resolves.not.toThrow();

      const assignments = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, testUserId));

      // Should have no assignments
      expect(assignments).toHaveLength(0);
    });

    it("should allow assigning multiple roles to same user", async () => {
      const testUserId = "test-user-multi";

      await assignRoleToUser(testUserId, "Sales Manager");
      await assignRoleToUser(testUserId, "Customer Service");

      const assignments = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, testUserId));

      expect(assignments).toHaveLength(2);
    });
  });

  describe("Role Permission Verification", () => {
    beforeEach(async () => {
      await seedRBACDefaults();
    });

    it("Operations Manager should have inventory and orders permissions", async () => {
      const [opsManagerRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Operations Manager"))
        .limit(1);

      const opsPermissions = await db
        .select({
          permissionName: permissions.name,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, opsManagerRole.id));

      const permissionNames = opsPermissions.map((p) => p.permissionName);

      expect(permissionNames).toContain("inventory:read");
      expect(permissionNames).toContain("orders:read");
      expect(permissionNames).toContain("purchase_orders:read");
    });

    it("Read-Only Auditor should have read permissions but not write", async () => {
      const [auditorRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Read-Only Auditor"))
        .limit(1);

      const auditorPermissions = await db
        .select({
          permissionName: permissions.name,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, auditorRole.id));

      const permissionNames = auditorPermissions.map((p) => p.permissionName);

      // Should have read permissions
      expect(permissionNames).toContain("orders:read");
      expect(permissionNames).toContain("inventory:read");
      expect(permissionNames).toContain("clients:read");

      // Should NOT have write permissions
      expect(permissionNames).not.toContain("orders:create");
      expect(permissionNames).not.toContain("inventory:create");
      expect(permissionNames).not.toContain("clients:create");
    });

    it("Accountant should have accounting permissions", async () => {
      const [accountantRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, "Accountant"))
        .limit(1);

      const accountantPermissions = await db
        .select({
          permissionName: permissions.name,
        })
        .from(rolePermissions)
        .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
        .where(eq(rolePermissions.roleId, accountantRole.id));

      const permissionNames = accountantPermissions.map((p) => p.permissionName);

      expect(permissionNames).toContain("accounting:access");
      expect(permissionNames).toContain("accounting:transactions:read");
      expect(permissionNames).toContain("accounting:gl:view");
      expect(permissionNames).toContain("credits:access");
    });
  });
});
