import "dotenv/config";

import * as fs from "fs";
import * as path from "path";
import { getDb } from "../server/db";
import { permissions, rolePermissions, roles } from "../drizzle/schema";
import { count } from "drizzle-orm";
import {
  PERMISSIONS,
  ROLE_PERMISSION_MAPPINGS,
  ROLES,
} from "../server/services/rbacDefinitions";

type Pair = { roleId: number; permissionId: number };

const REPORT_PATH = path.join(
  process.cwd(),
  "docs",
  "audits",
  "rbac-reconcile-report.json"
);

function chunk<T>(items: T[], size: number): T[][] {
  const output: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    output.push(items.slice(i, i + size));
  }
  return output;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");

  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const existingRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
    })
    .from(roles);
  const existingRoleNames = new Set(existingRoles.map(role => role.name));

  const missingRoles = ROLES.filter(role => !existingRoleNames.has(role.name));
  if (!dryRun && missingRoles.length > 0) {
    await db.insert(roles).values(missingRoles);
  }

  const refreshedRoles = await db
    .select({
      id: roles.id,
      name: roles.name,
    })
    .from(roles);
  const roleIdByName = new Map(
    refreshedRoles.map(role => [role.name, role.id])
  );

  const existingPermissions = await db
    .select({
      id: permissions.id,
      name: permissions.name,
    })
    .from(permissions);
  const existingPermissionNames = new Set(
    existingPermissions.map(permission => permission.name)
  );

  const missingPermissions = PERMISSIONS.filter(
    permission => !existingPermissionNames.has(permission.name)
  );
  if (!dryRun && missingPermissions.length > 0) {
    await db.insert(permissions).values(missingPermissions);
  }

  const refreshedPermissions = await db
    .select({
      id: permissions.id,
      name: permissions.name,
    })
    .from(permissions);
  const permissionIdByName = new Map(
    refreshedPermissions.map(permission => [permission.name, permission.id])
  );

  const existingMappings = await db
    .select({
      roleId: rolePermissions.roleId,
      permissionId: rolePermissions.permissionId,
    })
    .from(rolePermissions);

  const existingMappingSet = new Set(
    existingMappings.map(mapping => `${mapping.roleId}:${mapping.permissionId}`)
  );

  const desiredMappings: Pair[] = [];
  const unresolvedRoles: string[] = [];
  const unresolvedPermissions: string[] = [];

  for (const mapping of ROLE_PERMISSION_MAPPINGS) {
    const roleId = roleIdByName.get(mapping.roleName);
    if (!roleId) {
      unresolvedRoles.push(mapping.roleName);
      continue;
    }

    for (const permissionName of mapping.permissionNames) {
      const permissionId = permissionIdByName.get(permissionName);
      if (!permissionId) {
        unresolvedPermissions.push(permissionName);
        continue;
      }
      desiredMappings.push({ roleId, permissionId });
    }
  }

  const missingMappings = desiredMappings.filter(
    mapping =>
      !existingMappingSet.has(`${mapping.roleId}:${mapping.permissionId}`)
  );

  if (!dryRun && missingMappings.length > 0) {
    for (const mappingChunk of chunk(missingMappings, 500)) {
      await db.insert(rolePermissions).values(mappingChunk);
    }
  }

  const roleCount =
    (await db.select({ count: count() }).from(roles))[0]?.count || 0;

  const permissionCount =
    (await db.select({ count: count() }).from(permissions))[0]?.count || 0;

  const mappingRows = await db
    .select({
      roleId: rolePermissions.roleId,
      permissionId: rolePermissions.permissionId,
    })
    .from(rolePermissions);
  const uniqueMappingCount = new Set(
    mappingRows.map(mapping => `${mapping.roleId}:${mapping.permissionId}`)
  ).size;

  const report = {
    checkedAt: new Date().toISOString(),
    dryRun,
    before: {
      roleCount: existingRoles.length,
      permissionCount: existingPermissions.length,
      mappingCount: existingMappings.length,
      uniqueMappingCount: existingMappingSet.size,
    },
    changes: {
      missingRoles: missingRoles.map(role => role.name),
      missingPermissions: missingPermissions.map(permission => permission.name),
      missingMappingsCount: missingMappings.length,
      unresolvedRoles: [...new Set(unresolvedRoles)],
      unresolvedPermissions: [...new Set(unresolvedPermissions)],
    },
    after: {
      roleCount,
      permissionCount,
      mappingCount: mappingRows.length,
      uniqueMappingCount,
      duplicateMappings: mappingRows.length - uniqueMappingCount,
    },
  };

  fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.info("RBAC reconciliation report generated:");
  console.info(`- Output: ${REPORT_PATH}`);
  console.info(`- Dry run: ${dryRun ? "yes" : "no"}`);
  console.info(
    `- Missing roles: ${report.changes.missingRoles.length}, missing permissions: ${report.changes.missingPermissions.length}, missing mappings: ${report.changes.missingMappingsCount}`
  );
  console.info(
    `- Final counts: roles=${report.after.roleCount}, permissions=${report.after.permissionCount}, mappings=${report.after.mappingCount} (unique=${report.after.uniqueMappingCount})`
  );

  if (
    report.changes.unresolvedRoles.length > 0 ||
    report.changes.unresolvedPermissions.length > 0
  ) {
    console.warn("Unresolved RBAC references detected:");
    if (report.changes.unresolvedRoles.length > 0) {
      console.warn(`- Roles: ${report.changes.unresolvedRoles.join(", ")}`);
    }
    if (report.changes.unresolvedPermissions.length > 0) {
      console.warn(
        `- Permissions: ${report.changes.unresolvedPermissions.join(", ")}`
      );
    }
  }

  process.exit(0);
}

main().catch(error => {
  console.error("RBAC reconciliation failed:", error);
  process.exit(1);
});
