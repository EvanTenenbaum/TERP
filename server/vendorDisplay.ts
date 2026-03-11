import { eq, sql } from "drizzle-orm";

import { clients, supplierProfiles } from "../drizzle/schema";
import * as clientsDb from "./clientsDb";
import { getDb } from "./db";

export function getVendorDisplayName(
  vendorId: number,
  directClientName?: string | null,
  mappedSupplierName?: string | null
): string {
  const normalizedDirectClientName = directClientName?.trim();
  if (normalizedDirectClientName) {
    return normalizedDirectClientName;
  }

  const normalizedMappedSupplierName = mappedSupplierName?.trim();
  if (normalizedMappedSupplierName) {
    return normalizedMappedSupplierName;
  }

  return `Supplier #${vendorId}`;
}

export async function getVendorNameMap(
  vendorIds: number[]
): Promise<Map<number, string>> {
  const uniqueVendorIds = [...new Set(vendorIds.filter(id => id > 0))];
  const vendorNameMap = new Map<number, string>();

  await Promise.all(
    uniqueVendorIds.map(async vendorId => {
      const client = await clientsDb.getClientById(vendorId);
      if (client?.name?.trim()) {
        vendorNameMap.set(vendorId, client.name.trim());
      }
    })
  );

  const unresolvedVendorIds = uniqueVendorIds.filter(id => !vendorNameMap.has(id));
  if (!unresolvedVendorIds.length) {
    return vendorNameMap;
  }

  const db = await getDb();
  if (!db) {
    return vendorNameMap;
  }

  const mappedSupplierRows = await db
    .select({
      legacyVendorId: supplierProfiles.legacyVendorId,
      supplierName: clients.name,
    })
    .from(supplierProfiles)
    .innerJoin(clients, eq(supplierProfiles.clientId, clients.id))
    .where(
      sql`${supplierProfiles.legacyVendorId} IS NOT NULL AND ${supplierProfiles.legacyVendorId} IN (${sql.join(
        unresolvedVendorIds.map(id => sql`${id}`),
        sql`, `
      )})`
    );

  mappedSupplierRows.forEach(row => {
    if (row.legacyVendorId && row.supplierName?.trim()) {
      vendorNameMap.set(row.legacyVendorId, row.supplierName.trim());
    }
  });

  return vendorNameMap;
}
