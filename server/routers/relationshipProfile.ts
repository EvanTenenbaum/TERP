import { TRPCError } from "@trpc/server";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
  batches,
  clientActivity,
  clientCommunications,
  clientCreditLimits,
  clientLedgerAdjustments,
  clientNeeds,
  clientTransactions,
  clients,
  orders,
  payments,
  products,
  purchaseOrders,
  salesSheetHistory,
  supplierProfiles,
  users,
  vendorPayables,
  lots,
} from "../../drizzle/schema";
import { getDb } from "../db";
import * as inventoryDb from "../inventoryDb";
import * as pricingEngine from "../pricingEngine";
import * as salesSheetsDb from "../salesSheetsDb";
import * as vendorContextDb from "../vendorContextDb";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  getAuthenticatedUserId,
  protectedProcedure,
  router,
} from "../_core/trpc";
import { getClientBalanceDetails } from "../services/clientBalanceService";

const clientIdSchema = z.object({
  clientId: z.number().int().positive(),
});

const parseMoney = (value: unknown): number => {
  if (value === null || value === undefined) return 0;
  const parsed =
    typeof value === "number"
      ? value
      : Number.parseFloat(String(value).replace(/,/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

const normalizeDate = (
  value: Date | string | null | undefined
): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

const formatRoleLabel = (client: {
  isBuyer?: boolean | null;
  isSeller?: boolean | null;
  isBrand?: boolean | null;
  isReferee?: boolean | null;
  isContractor?: boolean | null;
}) => {
  const labels: string[] = [];
  if (client.isBuyer) labels.push("Customer");
  if (client.isSeller) labels.push("Supplier");
  if (client.isBrand) labels.push("Brand");
  if (client.isReferee) labels.push("Referee");
  if (client.isContractor) labels.push("Contractor");
  return labels;
};

type LedgerEntry = {
  id: string;
  sourceType: "ORDER" | "PURCHASE_ORDER" | "PAYMENT" | "ADJUSTMENT";
  sourceId: number;
  date: string | null;
  label: string;
  transactionType:
    | "SALE"
    | "PURCHASE"
    | "PAYMENT_RECEIVED"
    | "PAYMENT_SENT"
    | "CREDIT"
    | "DEBIT";
  debitAmount: number;
  creditAmount: number;
  netEffect: number;
  actorName: string | null;
  description: string | null;
};

type RelationshipMoneyMode = "customer" | "supplier" | "hybrid" | "neutral";

type VendorPayablesSummary = {
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  payableCount: number;
  openPayableCount: number;
};

function getRelationshipMoneyMode(client: {
  isBuyer?: boolean | null;
  isSeller?: boolean | null;
}): RelationshipMoneyMode {
  if (client.isBuyer && client.isSeller) {
    return "hybrid";
  }

  if (client.isSeller) {
    return "supplier";
  }

  if (client.isBuyer) {
    return "customer";
  }

  return "neutral";
}

async function getVendorPayablesSummary(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  clientId: number
): Promise<VendorPayablesSummary> {
  const [row] = await db
    .select({
      totalAmount: sql<number>`COALESCE(SUM(CAST(${vendorPayables.totalAmount} AS DECIMAL(15,2))), 0)`,
      amountPaid: sql<number>`COALESCE(SUM(CAST(${vendorPayables.amountPaid} AS DECIMAL(15,2))), 0)`,
      amountDue: sql<number>`COALESCE(SUM(CAST(${vendorPayables.amountDue} AS DECIMAL(15,2))), 0)`,
      payableCount: sql<number>`COUNT(*)`,
      openPayableCount: sql<number>`SUM(CASE WHEN ${vendorPayables.status} IN ('PENDING', 'DUE', 'PARTIAL') AND CAST(${vendorPayables.amountDue} AS DECIMAL(15,2)) > 0 THEN 1 ELSE 0 END)`,
    })
    .from(vendorPayables)
    .where(
      and(
        eq(vendorPayables.vendorClientId, clientId),
        isNull(vendorPayables.deletedAt),
        sql`${vendorPayables.status} != 'VOID'`
      )
    );

  return {
    totalAmount: Number(row?.totalAmount || 0),
    amountPaid: Number(row?.amountPaid || 0),
    amountDue: Number(row?.amountDue || 0),
    payableCount: Number(row?.payableCount || 0),
    openPayableCount: Number(row?.openPayableCount || 0),
  };
}

async function getClientOrThrow(clientId: number) {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  const [client] = await db
    .select({
      id: clients.id,
      teriCode: clients.teriCode,
      name: clients.name,
      email: clients.email,
      phone: clients.phone,
      address: clients.address,
      businessType: clients.businessType,
      preferredContact: clients.preferredContact,
      paymentTerms: clients.paymentTerms,
      isBuyer: clients.isBuyer,
      isSeller: clients.isSeller,
      isBrand: clients.isBrand,
      isReferee: clients.isReferee,
      isContractor: clients.isContractor,
      tags: clients.tags,
      pricingProfileId: clients.pricingProfileId,
      totalSpent: clients.totalSpent,
      totalProfit: clients.totalProfit,
      avgProfitMargin: clients.avgProfitMargin,
      totalOwed: clients.totalOwed,
      oldestDebtDays: clients.oldestDebtDays,
      creditLimit: clients.creditLimit,
      creditLimitSource: clients.creditLimitSource,
      creditLimitUpdatedAt: clients.creditLimitUpdatedAt,
      creditLimitOverrideReason: clients.creditLimitOverrideReason,
      vipPortalEnabled: clients.vipPortalEnabled,
      vipPortalLastLogin: clients.vipPortalLastLogin,
      wishlist: clients.wishlist,
      referredByClientId: clients.referredByClientId,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
    })
    .from(clients)
    .where(and(eq(clients.id, clientId), isNull(clients.deletedAt)))
    .limit(1);

  if (!client) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
  }

  return { client, db };
}

async function buildLedgerPreview(clientId: number): Promise<{
  entries: LedgerEntry[];
  totals: { debits: number; credits: number; netBalance: number };
}> {
  const db = await getDb();
  if (!db) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Database not available",
    });
  }

  const [salesRows, purchaseRows, paymentRows, adjustmentRows] =
    await Promise.all([
      db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          total: orders.total,
          confirmedAt: orders.confirmedAt,
          createdAt: orders.createdAt,
          createdByName: users.name,
          notes: orders.notes,
        })
        .from(orders)
        .leftJoin(users, eq(orders.createdBy, users.id))
        .where(
          and(
            eq(orders.clientId, clientId),
            eq(orders.orderType, "SALE"),
            isNull(orders.deletedAt),
            sql`(${orders.saleStatus} IS NULL OR ${orders.saleStatus} != 'CANCELLED')`
          )
        ),
      db
        .select({
          id: purchaseOrders.id,
          poNumber: purchaseOrders.poNumber,
          total: purchaseOrders.total,
          confirmedAt: purchaseOrders.confirmedAt,
          createdAt: purchaseOrders.createdAt,
          createdByName: users.name,
          notes: purchaseOrders.notes,
        })
        .from(purchaseOrders)
        .leftJoin(users, eq(purchaseOrders.createdBy, users.id))
        .where(
          and(
            eq(purchaseOrders.supplierClientId, clientId),
            isNull(purchaseOrders.deletedAt),
            sql`${purchaseOrders.purchaseOrderStatus} IN ('CONFIRMED', 'RECEIVING', 'RECEIVED')`
          )
        ),
      db
        .select({
          id: payments.id,
          paymentNumber: payments.paymentNumber,
          amount: payments.amount,
          paymentType: payments.paymentType,
          paymentDate: payments.paymentDate,
          createdByName: users.name,
          notes: payments.notes,
        })
        .from(payments)
        .leftJoin(users, eq(payments.createdBy, users.id))
        .where(
          and(
            isNull(payments.deletedAt),
            sql`(${payments.customerId} = ${clientId} OR ${payments.vendorId} = ${clientId})`
          )
        ),
      db
        .select({
          id: clientLedgerAdjustments.id,
          transactionType: clientLedgerAdjustments.transactionType,
          amount: clientLedgerAdjustments.amount,
          effectiveDate: clientLedgerAdjustments.effectiveDate,
          description: clientLedgerAdjustments.description,
          createdByName: users.name,
        })
        .from(clientLedgerAdjustments)
        .leftJoin(users, eq(clientLedgerAdjustments.createdBy, users.id))
        .where(eq(clientLedgerAdjustments.clientId, clientId)),
    ]);

  const entries: LedgerEntry[] = [
    ...salesRows.map(row => ({
      id: `ORDER:${row.id}`,
      sourceType: "ORDER" as const,
      sourceId: row.id,
      date: normalizeDate(row.confirmedAt ?? row.createdAt),
      label: row.orderNumber ? `Sale ${row.orderNumber}` : `Sale #${row.id}`,
      transactionType: "SALE" as const,
      debitAmount: parseMoney(row.total),
      creditAmount: 0,
      netEffect: parseMoney(row.total),
      actorName: row.createdByName ?? "System",
      description: row.notes,
    })),
    ...purchaseRows.map(row => ({
      id: `PURCHASE_ORDER:${row.id}`,
      sourceType: "PURCHASE_ORDER" as const,
      sourceId: row.id,
      date: normalizeDate(row.confirmedAt ?? row.createdAt),
      label: row.poNumber ? `PO ${row.poNumber}` : `PO #${row.id}`,
      transactionType: "PURCHASE" as const,
      debitAmount: 0,
      creditAmount: parseMoney(row.total),
      netEffect: -parseMoney(row.total),
      actorName: row.createdByName ?? "System",
      description: row.notes,
    })),
    ...paymentRows.map(row => {
      const amount = parseMoney(row.amount);
      const received = row.paymentType === "RECEIVED";
      return {
        id: `PAYMENT:${row.id}`,
        sourceType: "PAYMENT" as const,
        sourceId: row.id,
        date: normalizeDate(row.paymentDate),
        label: row.paymentNumber
          ? `Payment ${row.paymentNumber}`
          : `Payment #${row.id}`,
        transactionType: received
          ? ("PAYMENT_RECEIVED" as const)
          : ("PAYMENT_SENT" as const),
        debitAmount: received ? 0 : amount,
        creditAmount: received ? amount : 0,
        netEffect: received ? -amount : amount,
        actorName: row.createdByName ?? "System",
        description: row.notes,
      };
    }),
    ...adjustmentRows.map(row => {
      const amount = parseMoney(row.amount);
      const credit = row.transactionType === "CREDIT";
      return {
        id: `ADJUSTMENT:${row.id}`,
        sourceType: "ADJUSTMENT" as const,
        sourceId: row.id,
        date: normalizeDate(row.effectiveDate),
        label: credit ? "Manual credit" : "Manual debit",
        transactionType: row.transactionType,
        debitAmount: credit ? 0 : amount,
        creditAmount: credit ? amount : 0,
        netEffect: credit ? -amount : amount,
        actorName: row.createdByName ?? "System",
        description: row.description,
      };
    }),
  ].sort((a, b) => {
    const aTime = a.date ? new Date(a.date).getTime() : 0;
    const bTime = b.date ? new Date(b.date).getTime() : 0;
    return bTime - aTime;
  });

  return {
    entries,
    totals: {
      debits: entries.reduce((sum, entry) => sum + entry.debitAmount, 0),
      credits: entries.reduce((sum, entry) => sum + entry.creditAmount, 0),
      netBalance: entries.reduce((sum, entry) => sum + entry.netEffect, 0),
    },
  };
}

export const relationshipProfileRouter = router({
  getShell: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(clientIdSchema)
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const { client, db } = await getClientOrThrow(input.clientId);
      const [
        referrer,
        supplierProfile,
        balance,
        payables,
        recentCommunication,
        recentActivity,
        transactionStats,
        draftStats,
        salesSheetStats,
        orderStats,
        needsStats,
        paymentStats,
      ] = await Promise.all([
        client.referredByClientId
          ? db
              .select({
                id: clients.id,
                name: clients.name,
                teriCode: clients.teriCode,
              })
              .from(clients)
              .where(eq(clients.id, client.referredByClientId))
              .limit(1)
          : Promise.resolve([]),
        db
          .select({
            contactName: supplierProfiles.contactName,
            contactEmail: supplierProfiles.contactEmail,
            contactPhone: supplierProfiles.contactPhone,
            paymentTerms: supplierProfiles.paymentTerms,
            preferredPaymentMethod: supplierProfiles.preferredPaymentMethod,
            supplierNotes: supplierProfiles.supplierNotes,
            licenseNumber: supplierProfiles.licenseNumber,
            taxId: supplierProfiles.taxId,
          })
          .from(supplierProfiles)
          .where(eq(supplierProfiles.clientId, input.clientId))
          .limit(1),
        getClientBalanceDetails(input.clientId),
        getVendorPayablesSummary(db, input.clientId),
        db
          .select({
            id: clientCommunications.id,
            communicationType: clientCommunications.communicationType,
            subject: clientCommunications.subject,
            communicatedAt: clientCommunications.communicatedAt,
          })
          .from(clientCommunications)
          .where(eq(clientCommunications.clientId, input.clientId))
          .orderBy(desc(clientCommunications.communicatedAt))
          .limit(1),
        db
          .select({
            id: clientActivity.id,
            activityType: clientActivity.activityType,
            createdAt: clientActivity.createdAt,
          })
          .from(clientActivity)
          .where(eq(clientActivity.clientId, input.clientId))
          .orderBy(desc(clientActivity.createdAt))
          .limit(1),
        db
          .select({
            totalTransactions: sql<number>`COUNT(*)`,
            overdueTransactions: sql<number>`SUM(CASE WHEN ${clientTransactions.paymentStatus} = 'OVERDUE' THEN 1 ELSE 0 END)`,
          })
          .from(clientTransactions)
          .where(eq(clientTransactions.clientId, input.clientId)),
        salesSheetsDb.getDrafts(userId, input.clientId),
        db
          .select({
            sentSalesSheets: sql<number>`COUNT(*)`,
          })
          .from(salesSheetHistory)
          .where(
            and(
              eq(salesSheetHistory.clientId, input.clientId),
              isNull(salesSheetHistory.deletedAt)
            )
          ),
        db
          .select({
            openOrderDrafts: sql<number>`SUM(CASE WHEN ${orders.isDraft} = 1 THEN 1 ELSE 0 END)`,
            openQuotes: sql<number>`SUM(CASE WHEN ${orders.orderType} = 'QUOTE' AND ${orders.isDraft} = 0 AND ${orders.quoteStatus} IN ('UNSENT', 'SENT', 'VIEWED') THEN 1 ELSE 0 END)`,
            totalOrders: sql<number>`SUM(CASE WHEN ${orders.orderType} = 'SALE' AND ${orders.isDraft} = 0 THEN 1 ELSE 0 END)`,
          })
          .from(orders)
          .where(
            and(eq(orders.clientId, input.clientId), isNull(orders.deletedAt))
          ),
        db
          .select({
            activeNeeds: sql<number>`SUM(CASE WHEN ${clientNeeds.status} = 'ACTIVE' THEN 1 ELSE 0 END)`,
          })
          .from(clientNeeds)
          .where(eq(clientNeeds.clientId, input.clientId)),
        db
          .select({
            receivedCount: sql<number>`SUM(CASE WHEN ${payments.customerId} = ${input.clientId} AND ${payments.paymentType} = 'RECEIVED' THEN 1 ELSE 0 END)`,
            sentCount: sql<number>`SUM(CASE WHEN ${payments.vendorId} = ${input.clientId} AND ${payments.paymentType} = 'SENT' THEN 1 ELSE 0 END)`,
          })
          .from(payments)
          .where(
            and(
              isNull(payments.deletedAt),
              sql`(${payments.customerId} = ${input.clientId} OR ${payments.vendorId} = ${input.clientId})`
            )
          ),
      ]);

      const lastTouchCandidates = [
        normalizeDate(client.updatedAt),
        normalizeDate(recentCommunication[0]?.communicatedAt),
        normalizeDate(recentActivity[0]?.createdAt),
      ].filter((value): value is string => Boolean(value));

      const lastTouchAt =
        lastTouchCandidates.sort(
          (a, b) => new Date(b).getTime() - new Date(a).getTime()
        )[0] ?? null;

      const alerts: Array<{
        tone: "warning" | "info";
        label: string;
        detail: string;
      }> = [];
      const moneyMode = getRelationshipMoneyMode(client);

      const storedCreditLimit = parseMoney(client.creditLimit);
      if (
        (moneyMode === "customer" || moneyMode === "hybrid") &&
        storedCreditLimit > 0 &&
        balance.computedBalance > storedCreditLimit
      ) {
        alerts.push({
          tone: "warning",
          label: "Credit exposure",
          detail:
            "Current receivable balance is above the stored credit limit.",
        });
      }

      if (Number(transactionStats[0]?.overdueTransactions || 0) > 0) {
        alerts.push({
          tone: "warning",
          label: "Overdue transactions",
          detail: `${Number(transactionStats[0]?.overdueTransactions || 0)} legacy transactions are marked overdue.`,
        });
      }

      if (client.isSeller && !supplierProfile[0]) {
        alerts.push({
          tone: "info",
          label: "Supplier details missing",
          detail:
            "This supplier does not yet have a populated supplier profile.",
        });
      }

      if (
        (moneyMode === "supplier" || moneyMode === "hybrid") &&
        payables.amountDue > 0
      ) {
        alerts.push({
          tone: "info",
          label: "Outstanding supplier payables",
          detail: `${payables.openPayableCount} supplier payable${payables.openPayableCount === 1 ? "" : "s"} remain open for $${payables.amountDue.toFixed(2)}.`,
        });
      }

      return {
        id: client.id,
        name: client.name,
        teriCode: client.teriCode,
        roles: formatRoleLabel(client),
        businessType: client.businessType,
        preferredContact: client.preferredContact,
        email: client.email,
        phone: client.phone,
        address: client.address,
        paymentTermsDays: client.paymentTerms,
        tags: client.tags ?? [],
        vipPortalEnabled: Boolean(client.vipPortalEnabled),
        vipPortalLastLogin: normalizeDate(client.vipPortalLastLogin),
        liveCatalogEnabled: Boolean(client.vipPortalEnabled),
        wishlist: client.wishlist,
        referrer: referrer[0] ?? null,
        supplierProfile: supplierProfile[0] ?? null,
        financials: {
          lifetimeValue: parseMoney(client.totalSpent),
          profitability: parseMoney(client.totalProfit),
          averageMarginPercent: parseMoney(client.avgProfitMargin),
          creditLimit: parseMoney(client.creditLimit),
          balance,
          moneySummary: {
            mode: moneyMode,
            receivable: balance,
            payable: payables,
            netPosition: balance.computedBalance - payables.amountDue,
          },
        },
        openArtifacts: {
          salesSheetDrafts: draftStats.length,
          sentSalesSheets: Number(salesSheetStats[0]?.sentSalesSheets || 0),
          orderDrafts: Number(orderStats[0]?.openOrderDrafts || 0),
          openQuotes: Number(orderStats[0]?.openQuotes || 0),
          activeNeeds: Number(needsStats[0]?.activeNeeds || 0),
        },
        metrics: {
          totalTransactions: Number(
            transactionStats[0]?.totalTransactions || 0
          ),
          totalOrders: Number(orderStats[0]?.totalOrders || 0),
          receivedPayments: Number(paymentStats[0]?.receivedCount || 0),
          sentPayments: Number(paymentStats[0]?.sentCount || 0),
        },
        lastTouchAt,
        alerts,
        createdAt: normalizeDate(client.createdAt),
        updatedAt: normalizeDate(client.updatedAt),
      };
    }),

  getSalesPricing: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(clientIdSchema)
    .query(async ({ ctx, input }) => {
      const userId = getAuthenticatedUserId(ctx);
      const { client, db } = await getClientOrThrow(input.clientId);

      const [
        profile,
        rules,
        profiles,
        salesSheetHistoryRows,
        draftRows,
        orderDraftRows,
        needsRows,
      ] = await Promise.all([
        client.pricingProfileId
          ? pricingEngine.getPricingProfileById(client.pricingProfileId)
          : Promise.resolve(null),
        pricingEngine.getClientPricingRules(input.clientId),
        pricingEngine.getPricingProfiles(),
        db
          .select({
            id: salesSheetHistory.id,
            totalValue: salesSheetHistory.totalValue,
            itemCount: salesSheetHistory.itemCount,
            createdAt: salesSheetHistory.createdAt,
            shareToken: salesSheetHistory.shareToken,
            convertedToOrderId: salesSheetHistory.convertedToOrderId,
          })
          .from(salesSheetHistory)
          .where(
            and(
              eq(salesSheetHistory.clientId, input.clientId),
              isNull(salesSheetHistory.deletedAt)
            )
          )
          .orderBy(desc(salesSheetHistory.createdAt))
          .limit(12),
        salesSheetsDb.getDrafts(userId, input.clientId),
        db
          .select({
            id: orders.id,
            orderNumber: orders.orderNumber,
            orderType: orders.orderType,
            total: orders.total,
            quoteStatus: orders.quoteStatus,
            createdAt: orders.createdAt,
            updatedAt: orders.updatedAt,
          })
          .from(orders)
          .where(
            and(
              eq(orders.clientId, input.clientId),
              eq(orders.isDraft, true),
              isNull(orders.deletedAt)
            )
          )
          .orderBy(desc(orders.updatedAt), desc(orders.createdAt))
          .limit(12),
        db
          .select({
            id: clientNeeds.id,
            strain: clientNeeds.strain,
            productName: clientNeeds.productName,
            category: clientNeeds.category,
            subcategory: clientNeeds.subcategory,
            grade: clientNeeds.grade,
            quantityMin: clientNeeds.quantityMin,
            quantityMax: clientNeeds.quantityMax,
            priceMax: clientNeeds.priceMax,
            priority: clientNeeds.priority,
            status: clientNeeds.status,
            neededBy: clientNeeds.neededBy,
            updatedAt: clientNeeds.updatedAt,
          })
          .from(clientNeeds)
          .where(eq(clientNeeds.clientId, input.clientId))
          .orderBy(desc(clientNeeds.updatedAt))
          .limit(20),
      ]);

      const mergedArtifacts = [
        ...salesSheetHistoryRows.map(row => ({
          id: `sales-sheet:${row.id}`,
          kind: "sent_sales_sheet" as const,
          label: `Sales sheet #${row.id}`,
          sublabel: row.convertedToOrderId
            ? `Converted to order #${row.convertedToOrderId}`
            : row.shareToken
              ? "Shared with client"
              : "Saved history",
          amount: parseMoney(row.totalValue),
          count: row.itemCount,
          updatedAt: normalizeDate(row.createdAt),
        })),
        ...draftRows.map(row => ({
          id: `sales-sheet-draft:${row.id}`,
          kind: "sales_sheet_draft" as const,
          label: row.name,
          sublabel: "Sales sheet draft",
          amount: parseMoney(row.totalValue),
          count: row.itemCount,
          updatedAt: normalizeDate(row.updatedAt),
        })),
        ...orderDraftRows.map(row => ({
          id: `order-draft:${row.id}`,
          kind:
            row.orderType === "QUOTE"
              ? ("quote_draft" as const)
              : ("order_draft" as const),
          label: row.orderNumber,
          sublabel:
            row.orderType === "QUOTE" ? "Quote draft" : "Sales order draft",
          amount: parseMoney(row.total),
          count: null,
          updatedAt: normalizeDate(row.updatedAt ?? row.createdAt),
        })),
      ].sort((a, b) => {
        const aTime = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        const bTime = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        return bTime - aTime;
      });

      return {
        pricingProfile: profile
          ? {
              id: profile.id,
              name: profile.name,
              description: profile.description,
            }
          : null,
        availableProfiles: profiles.map(profileRow => ({
          id: profileRow.id,
          name: profileRow.name,
          description: profileRow.description,
        })),
        rules,
        salesSheetHistory: salesSheetHistoryRows.map(row => ({
          id: row.id,
          totalValue: parseMoney(row.totalValue),
          itemCount: row.itemCount,
          createdAt: normalizeDate(row.createdAt),
          shareToken: row.shareToken,
          convertedToOrderId: row.convertedToOrderId,
        })),
        salesSheetDrafts: draftRows.map(row => ({
          id: row.id,
          name: row.name,
          itemCount: row.itemCount,
          totalValue: parseMoney(row.totalValue),
          createdAt: normalizeDate(row.createdAt),
          updatedAt: normalizeDate(row.updatedAt),
        })),
        orderDrafts: orderDraftRows.map(row => ({
          id: row.id,
          orderNumber: row.orderNumber,
          orderType: row.orderType,
          quoteStatus: row.quoteStatus,
          total: parseMoney(row.total),
          createdAt: normalizeDate(row.createdAt),
          updatedAt: normalizeDate(row.updatedAt),
        })),
        needs: needsRows.map(row => ({
          id: row.id,
          label:
            row.productName ||
            row.strain ||
            [row.category, row.subcategory, row.grade]
              .filter(Boolean)
              .join(" / ") ||
            "Open need",
          status: row.status,
          priority: row.priority,
          quantityMin: parseMoney(row.quantityMin),
          quantityMax: parseMoney(row.quantityMax),
          priceMax: parseMoney(row.priceMax),
          neededBy: normalizeDate(row.neededBy),
          updatedAt: normalizeDate(row.updatedAt),
        })),
        mergedArtifacts,
        wishlist: client.wishlist,
      };
    }),

  getMoney: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(clientIdSchema)
    .query(async ({ input }) => {
      const { client, db } = await getClientOrThrow(input.clientId);
      const [
        balance,
        payables,
        creditLimitRow,
        transactions,
        paymentRows,
        ledger,
      ] = await Promise.all([
        getClientBalanceDetails(input.clientId),
        getVendorPayablesSummary(db, input.clientId),
        db
          .select({
            creditLimit: clientCreditLimits.creditLimit,
            currentExposure: clientCreditLimits.currentExposure,
            utilizationPercent: clientCreditLimits.utilizationPercent,
            creditHealthScore: clientCreditLimits.creditHealthScore,
            updatedAt: clientCreditLimits.updatedAt,
          })
          .from(clientCreditLimits)
          .where(eq(clientCreditLimits.clientId, input.clientId))
          .limit(1),
        db
          .select({
            id: clientTransactions.id,
            transactionType: clientTransactions.transactionType,
            transactionNumber: clientTransactions.transactionNumber,
            transactionDate: clientTransactions.transactionDate,
            amount: clientTransactions.amount,
            paymentStatus: clientTransactions.paymentStatus,
            paymentDate: clientTransactions.paymentDate,
            paymentAmount: clientTransactions.paymentAmount,
            notes: clientTransactions.notes,
          })
          .from(clientTransactions)
          .where(eq(clientTransactions.clientId, input.clientId))
          .orderBy(desc(clientTransactions.transactionDate))
          .limit(50),
        db
          .select({
            id: payments.id,
            paymentNumber: payments.paymentNumber,
            paymentType: payments.paymentType,
            paymentDate: payments.paymentDate,
            amount: payments.amount,
            paymentMethod: payments.paymentMethod,
            referenceNumber: payments.referenceNumber,
            notes: payments.notes,
            createdByName: users.name,
          })
          .from(payments)
          .leftJoin(users, eq(payments.createdBy, users.id))
          .where(
            and(
              isNull(payments.deletedAt),
              sql`(${payments.customerId} = ${input.clientId} OR ${payments.vendorId} = ${input.clientId})`
            )
          )
          .orderBy(desc(payments.paymentDate))
          .limit(50),
        buildLedgerPreview(input.clientId),
      ]);

      const moneyMode = getRelationshipMoneyMode(client);

      return {
        summary: {
          mode: moneyMode,
          receivable: balance,
          payable: payables,
          netPosition: balance.computedBalance - payables.amountDue,
        },
        balance,
        credit: creditLimitRow[0]
          ? {
              creditLimit: parseMoney(creditLimitRow[0].creditLimit),
              currentExposure: parseMoney(creditLimitRow[0].currentExposure),
              utilizationPercent: parseMoney(
                creditLimitRow[0].utilizationPercent
              ),
              creditHealthScore: parseMoney(
                creditLimitRow[0].creditHealthScore
              ),
              updatedAt: normalizeDate(creditLimitRow[0].updatedAt),
            }
          : null,
        transactionHistory: transactions
          // Deduplicate by ID — guard against any duplicate rows from the DB
          .filter(
            (row, index, self) => index === self.findIndex(t => t.id === row.id)
          )
          .map(row => ({
            id: row.id,
            transactionType: row.transactionType,
            transactionNumber: row.transactionNumber,
            transactionDate: normalizeDate(row.transactionDate),
            amount: parseMoney(row.amount),
            paymentStatus: row.paymentStatus,
            paymentDate: normalizeDate(row.paymentDate),
            paymentAmount: parseMoney(row.paymentAmount),
            notes: row.notes,
          })),
        paymentHistory: paymentRows
          // Deduplicate by ID — a dual-role client can appear as both customerId and vendorId
          .filter(
            (row, index, self) => index === self.findIndex(p => p.id === row.id)
          )
          .map(row => ({
            id: row.id,
            paymentNumber: row.paymentNumber,
            paymentType: row.paymentType,
            paymentDate: normalizeDate(row.paymentDate),
            amount: parseMoney(row.amount),
            paymentMethod: row.paymentMethod,
            referenceNumber: row.referenceNumber,
            notes: row.notes,
            createdByName: row.createdByName,
          })),
        ledgerTimeline: ledger.entries,
        ledgerTotals: ledger.totals,
      };
    }),

  getSupplyInventory: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(clientIdSchema)
    .query(async ({ input }) => {
      const { client, db } = await getClientOrThrow(input.clientId);
      const [
        inventoryPreview,
        needsRows,
        supplierBatches,
        purchaseOrderRows,
        supplierContextResult,
      ] = await Promise.all([
        inventoryDb.getBatchesWithDetails(50, undefined, { status: "LIVE" }),
        db
          .select({
            id: clientNeeds.id,
            productName: clientNeeds.productName,
            strain: clientNeeds.strain,
            category: clientNeeds.category,
            subcategory: clientNeeds.subcategory,
            grade: clientNeeds.grade,
            priority: clientNeeds.priority,
            status: clientNeeds.status,
            updatedAt: clientNeeds.updatedAt,
          })
          .from(clientNeeds)
          .where(eq(clientNeeds.clientId, input.clientId))
          .orderBy(desc(clientNeeds.updatedAt))
          .limit(12),
        client.isSeller
          ? db
              .select({
                id: batches.id,
                sku: batches.sku,
                batchStatus: batches.batchStatus,
                onHandQty: batches.onHandQty,
                unitCogs: batches.unitCogs,
                createdAt: batches.createdAt,
                productName: products.nameCanonical,
              })
              .from(batches)
              .leftJoin(lots, eq(batches.lotId, lots.id))
              .leftJoin(products, eq(batches.productId, products.id))
              .where(
                and(
                  eq(lots.supplierClientId, input.clientId),
                  isNull(batches.deletedAt)
                )
              )
              .orderBy(desc(batches.createdAt))
              .limit(20)
          : Promise.resolve([]),
        client.isSeller
          ? db
              .select({
                id: purchaseOrders.id,
                poNumber: purchaseOrders.poNumber,
                purchaseOrderStatus: purchaseOrders.purchaseOrderStatus,
                orderDate: purchaseOrders.orderDate,
                expectedDeliveryDate: purchaseOrders.expectedDeliveryDate,
                total: purchaseOrders.total,
              })
              .from(purchaseOrders)
              .where(
                and(
                  eq(purchaseOrders.supplierClientId, input.clientId),
                  isNull(purchaseOrders.deletedAt)
                )
              )
              .orderBy(desc(purchaseOrders.createdAt))
              .limit(20)
          : Promise.resolve([]),
        client.isSeller
          ? vendorContextDb
              .getVendorContext({
                clientId: input.clientId,
                includeActiveInventory: true,
                includePaymentHistory: true,
              })
              .then(data => ({ data, error: null as string | null }))
              .catch(error => ({
                data: null,
                error:
                  error instanceof Error
                    ? error.message
                    : "Supplier context could not be loaded.",
              }))
          : Promise.resolve(null),
      ]);

      return {
        systemInventory: inventoryPreview.items.map(item => ({
          id: item.batch.id,
          sku: item.batch.sku,
          productName: item.product?.nameCanonical ?? "Unknown product",
          category: item.product?.category ?? null,
          supplierName:
            "vendor" in item &&
            item.vendor &&
            typeof item.vendor === "object" &&
            "name" in item.vendor &&
            typeof item.vendor.name === "string"
              ? item.vendor.name
              : null,
          status: item.batch.batchStatus,
          onHandQty: parseMoney(item.batch.onHandQty),
          unitCogs: parseMoney(item.batch.unitCogs),
        })),
        buyerNeeds: needsRows.map(row => ({
          id: row.id,
          label:
            row.productName ||
            row.strain ||
            [row.category, row.subcategory, row.grade]
              .filter(Boolean)
              .join(" / ") ||
            "Open need",
          priority: row.priority,
          status: row.status,
          updatedAt: normalizeDate(row.updatedAt),
        })),
        supplier: client.isSeller
          ? {
              batches: supplierBatches.map(row => ({
                id: row.id,
                sku: row.sku,
                status: row.batchStatus,
                onHandQty: parseMoney(row.onHandQty),
                unitCogs: parseMoney(row.unitCogs),
                productName: row.productName,
                createdAt: normalizeDate(row.createdAt),
              })),
              purchaseOrders: purchaseOrderRows.map(row => ({
                id: row.id,
                poNumber: row.poNumber,
                status: row.purchaseOrderStatus,
                orderDate: normalizeDate(row.orderDate),
                expectedDeliveryDate: normalizeDate(row.expectedDeliveryDate),
                total: parseMoney(row.total),
              })),
              context: supplierContextResult?.data
                ? {
                    aggregateMetrics:
                      supplierContextResult.data.aggregateMetrics,
                    activeInventory:
                      supplierContextResult.data.activeInventory ?? [],
                    relatedBrands: supplierContextResult.data.relatedBrands,
                  }
                : null,
              contextError: supplierContextResult?.error ?? null,
            }
          : null,
      };
    }),

  getActivity: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(clientIdSchema)
    .query(async ({ input }) => {
      const { db } = await getClientOrThrow(input.clientId);
      const [activityRows, communicationRows] = await Promise.all([
        db
          .select({
            id: clientActivity.id,
            activityType: clientActivity.activityType,
            metadata: clientActivity.metadata,
            createdAt: clientActivity.createdAt,
            userName: users.name,
          })
          .from(clientActivity)
          .leftJoin(users, eq(clientActivity.userId, users.id))
          .where(eq(clientActivity.clientId, input.clientId))
          .orderBy(desc(clientActivity.createdAt))
          .limit(50),
        db
          .select({
            id: clientCommunications.id,
            communicationType: clientCommunications.communicationType,
            subject: clientCommunications.subject,
            notes: clientCommunications.notes,
            communicatedAt: clientCommunications.communicatedAt,
            loggedByName: users.name,
          })
          .from(clientCommunications)
          .leftJoin(users, eq(clientCommunications.loggedBy, users.id))
          .where(eq(clientCommunications.clientId, input.clientId))
          .orderBy(desc(clientCommunications.communicatedAt))
          .limit(50),
      ]);

      return {
        activity: activityRows.map(row => ({
          id: row.id,
          activityType: row.activityType,
          metadata: row.metadata,
          createdAt: normalizeDate(row.createdAt),
          userName: row.userName,
        })),
        communications: communicationRows.map(row => ({
          id: row.id,
          communicationType: row.communicationType,
          subject: row.subject,
          notes: row.notes,
          communicatedAt: normalizeDate(row.communicatedAt),
          loggedByName: row.loggedByName,
        })),
      };
    }),
});
