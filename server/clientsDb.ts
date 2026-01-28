/**
 * Clients Data Access Layer
 * Handles all database operations for the Client Management System
 */

import { eq, and, desc, like, or, sql, SQL, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  clients,
  clientTransactions,
  clientActivity,
  clientNotes,
  InsertClient,
  InsertClientTransaction,
  InsertClientActivity,
  InsertClientNote,
  users,
  clientAssignments,
} from "../drizzle/schema";

// ============================================================================
// CLIENTS CRUD
// ============================================================================

/**
 * Get all clients (with pagination and filters)
 */
export async function getClients(user: { id: number; role: string; }, options: {
  limit?: number;
  offset?: number;
  search?: string;
  clientTypes?: ("buyer" | "seller" | "brand" | "referee" | "contractor")[];
  tags?: string[];
  hasDebt?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const {
    limit = 50,
    offset = 0,
    search,
    clientTypes,
    tags,
    hasDebt,
  } = options;

  let query = db
    .select({
      id: clients.id,
      version: clients.version,
      teriCode: clients.teriCode,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      address: clients.address,
      isBuyer: clients.isBuyer,
      isSeller: clients.isSeller,
      isBrand: clients.isBrand,
      isReferee: clients.isReferee,
      isContractor: clients.isContractor,
      pricingProfileId: clients.pricingProfileId,
      cogsAdjustmentType: clients.cogsAdjustmentType,
      cogsAdjustmentValue: clients.cogsAdjustmentValue,
      autoDeferConsignment: clients.autoDeferConsignment,
      totalSpent: clients.totalSpent,
      totalProfit: clients.totalProfit,
      avgProfitMargin: clients.avgProfitMargin,
      totalOwed: clients.totalOwed,
      oldestDebtDays: clients.oldestDebtDays,
      creditLimit: clients.creditLimit,
      creditLimitUpdatedAt: clients.creditLimitUpdatedAt,
      creditLimitSource: clients.creditLimitSource,
      creditLimitOverrideReason: clients.creditLimitOverrideReason,
      vipPortalEnabled: clients.vipPortalEnabled,
      vipPortalLastLogin: clients.vipPortalLastLogin,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
    })
    .from(clients);

  const conditions: (SQL<unknown> | undefined)[] = [];

  if (user.role === 'Sales Rep') {
    const assignedClientIds = await db
      .select({ clientId: clientAssignments.clientId })
      .from(clientAssignments)
      .where(eq(clientAssignments.userId, user.id));

    if (assignedClientIds.length === 0) {
      return [];
    }

    const clientIds = assignedClientIds.map(ac => ac.clientId);
    conditions.push(inArray(clients.id, clientIds));
  }

  conditions.push(sql`${clients.deletedAt} IS NULL`);

  if (search) {
    conditions.push(
      or(
        like(clients.teriCode, `%${search}%`),
        like(clients.name, `%${search}%`),
        like(clients.email, `%${search}%`),
        like(clients.phone, `%${search}%`),
        like(clients.address, `%${search}%`)
      )
    );
  }

  if (clientTypes && clientTypes.length > 0) {
    const typeConditions: SQL<unknown>[] = [];
    if (clientTypes.includes("buyer"))
      typeConditions.push(eq(clients.isBuyer, true));
    if (clientTypes.includes("seller"))
      typeConditions.push(eq(clients.isSeller, true));
    if (clientTypes.includes("brand"))
      typeConditions.push(eq(clients.isBrand, true));
    if (clientTypes.includes("referee"))
      typeConditions.push(eq(clients.isReferee, true));
    if (clientTypes.includes("contractor"))
      typeConditions.push(eq(clients.isContractor, true));
    if (typeConditions.length > 0) {
      const orCondition = or(...typeConditions);
      if (orCondition) conditions.push(orCondition);
    }
  }

  if (hasDebt !== undefined) {
    if (hasDebt) {
      conditions.push(sql`${clients.totalOwed} > 0`);
    } else {
      conditions.push(sql`${clients.totalOwed} = 0`);
    }
  }

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      conditions.push(
        sql`JSON_CONTAINS(${clients.tags}, ${JSON.stringify([tag])})`
      );
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const results = await query
    .orderBy(desc(clients.createdAt))
    .limit(limit)
    .offset(offset);

  return results;
}

export async function getClientCount(user: { id: number; role: string; }, options: {
  search?: string;
  clientTypes?: ("buyer" | "seller" | "brand" | "referee" | "contractor")[];
  tags?: string[];
  hasDebt?: boolean;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const { search, clientTypes, tags, hasDebt } = options;

  let query = db.select({ count: sql<number>`count(*)` }).from(clients);

  const conditions: (SQL<unknown> | undefined)[] = [];

  if (user.role === 'Sales Rep') {
    const assignedClientIds = await db
      .select({ clientId: clientAssignments.clientId })
      .from(clientAssignments)
      .where(eq(clientAssignments.userId, user.id));

    if (assignedClientIds.length === 0) {
      return 0;
    }

    const clientIds = assignedClientIds.map(ac => ac.clientId);
    conditions.push(inArray(clients.id, clientIds));
  }

  conditions.push(sql`${clients.deletedAt} IS NULL`);

  if (search) {
    conditions.push(
      or(
        like(clients.teriCode, `%${search}%`),
        like(clients.name, `%${search}%`),
        like(clients.email, `%${search}%`),
        like(clients.phone, `%${search}%`),
        like(clients.address, `%${search}%`)
      )
    );
  }

  if (clientTypes && clientTypes.length > 0) {
    const typeConditions: SQL<unknown>[] = [];
    if (clientTypes.includes("buyer"))
      typeConditions.push(eq(clients.isBuyer, true));
    if (clientTypes.includes("seller"))
      typeConditions.push(eq(clients.isSeller, true));
    if (clientTypes.includes("brand"))
      typeConditions.push(eq(clients.isBrand, true));
    if (clientTypes.includes("referee"))
      typeConditions.push(eq(clients.isReferee, true));
    if (clientTypes.includes("contractor"))
      typeConditions.push(eq(clients.isContractor, true));
    if (typeConditions.length > 0) {
      const orCondition = or(...typeConditions);
      if (orCondition) conditions.push(orCondition);
    }
  }

  if (hasDebt !== undefined) {
    if (hasDebt) {
      conditions.push(sql`${clients.totalOwed} > 0`);
    } else {
      conditions.push(sql`${clients.totalOwed} = 0`);
    }
  }

  if (tags && tags.length > 0) {
    for (const tag of tags) {
      conditions.push(
        sql`JSON_CONTAINS(${clients.tags}, ${JSON.stringify([tag])})`
      );
    }
  }

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const result = await query;
  return result[0]?.count || 0;
}
