import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import * as accountingDb from "../accountingDb";
import * as arApDb from "../arApDb";
import * as cashExpensesDb from "../cashExpensesDb";
import { requirePermission } from "../_core/permissionMiddleware";
import {
  createPaginatedResponse,
  getPaginationParams,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  createSafeUnifiedResponse,
} from "../_core/pagination";
import { getDb } from "../db";
import {
  invoices,
  bills,
  payments,
  clients,
  supplierProfiles,
} from "../../drizzle/schema";
import { eq, and, sql, desc, asc, inArray } from "drizzle-orm";
import { logger } from "../_core/logger";
import {
  onInvoiceCreated,
  onPaymentReceived,
} from "../services/notificationTriggers";
import { postInvoiceGLEntries, postPaymentGLEntries } from "../accountingHooks";

export const accountingRouter = router({
  // ============================================================================
  // AR/AP DASHBOARD (Wave 5C - ACC-1)
  // ============================================================================
  arApDashboard: router({
    // Get comprehensive AR summary with aging and top debtors
    getARSummary: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        logger.info({ msg: "[Accounting] Getting AR summary" });

        // Get AR aging buckets
        const aging = await arApDb.calculateARAging();

        // Calculate total AR
        const totalAR =
          aging.current +
          aging.days30 +
          aging.days60 +
          aging.days90 +
          aging.days90Plus;

        // Get outstanding receivables
        const outstanding = await arApDb.getOutstandingReceivables();

        // Get top debtors from outstanding invoices to avoid stale client totals
        // Include VIEWED status - invoices viewed but not yet paid are still receivables
        const topDebtorsResult = await db
          .select({
            clientId: invoices.customerId,
            clientName: clients.name,
            totalOwed: sql<number>`SUM(CAST(${invoices.amountDue} AS DECIMAL(15,2)))`,
          })
          .from(invoices)
          .leftJoin(clients, eq(invoices.customerId, clients.id))
          .where(
            and(
              inArray(invoices.status, [
                "SENT",
                "VIEWED",
                "PARTIAL",
                "OVERDUE",
              ]),
              sql`CAST(${invoices.amountDue} AS DECIMAL(15,2)) > 0`,
              sql`${invoices.deletedAt} IS NULL`
            )
          )
          .groupBy(invoices.customerId, clients.name)
          .orderBy(desc(sql`SUM(CAST(${invoices.amountDue} AS DECIMAL(15,2)))`))
          .limit(10);

        // Count invoices by status
        const statusCounts = await db
          .select({
            status: invoices.status,
            count: sql<number>`COUNT(*)`,
          })
          .from(invoices)
          .where(sql`${invoices.deletedAt} IS NULL`)
          .groupBy(invoices.status);

        return {
          totalAR,
          aging: {
            current: aging.current,
            days1to30: aging.days30,
            days31to60: aging.days60,
            days61to90: aging.days90,
            days90Plus: aging.days90Plus,
          },
          topDebtors: topDebtorsResult.map(d => ({
            clientId: d.clientId,
            clientName: d.clientName,
            totalOwed: Number(d.totalOwed || 0),
          })),
          invoiceCount: outstanding.invoices.length,
          statusCounts: statusCounts.reduce(
            (acc, s) => {
              acc[s.status] = Number(s.count);
              return acc;
            },
            {} as Record<string, number>
          ),
        };
      }),

    // Get comprehensive AP summary by vendor
    getAPSummary: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        logger.info({ msg: "[Accounting] Getting AP summary" });

        // Get AP aging buckets
        const aging = await arApDb.calculateAPAging();

        // Calculate total AP
        const totalAP =
          aging.current +
          aging.days30 +
          aging.days60 +
          aging.days90 +
          aging.days90Plus;

        // Get outstanding payables
        const outstanding = await arApDb.getOutstandingPayables();

        // Group bills by vendor
        // Join through supplier_profiles→clients to resolve vendor names
        const byVendorResult = await db
          .select({
            vendorId: bills.vendorId,
            vendorName: sql<string>`COALESCE(${clients.name}, CONCAT('Vendor #', ${bills.vendorId}))`,
            totalOwed: sql<number>`SUM(CAST(${bills.amountDue} AS DECIMAL(15,2)))`,
            billCount: sql<number>`COUNT(*)`,
          })
          .from(bills)
          .leftJoin(
            supplierProfiles,
            eq(bills.vendorId, supplierProfiles.legacyVendorId)
          )
          .leftJoin(clients, eq(supplierProfiles.clientId, clients.id))
          .where(
            and(
              inArray(bills.status, ["PENDING", "PARTIAL", "OVERDUE"]),
              sql`CAST(${bills.amountDue} AS DECIMAL(15,2)) > 0`,
              sql`${bills.deletedAt} IS NULL`
            )
          )
          .groupBy(bills.vendorId, clients.name)
          .orderBy(desc(sql`SUM(CAST(${bills.amountDue} AS DECIMAL(15,2)))`));

        // Count bills by status
        const statusCounts = await db
          .select({
            status: bills.status,
            count: sql<number>`COUNT(*)`,
          })
          .from(bills)
          .where(sql`${bills.deletedAt} IS NULL`)
          .groupBy(bills.status);

        return {
          totalAP,
          aging: {
            current: aging.current,
            days1to30: aging.days30,
            days31to60: aging.days60,
            days61to90: aging.days90,
            days90Plus: aging.days90Plus,
          },
          byVendor: byVendorResult.map(v => ({
            vendorId: v.vendorId,
            vendorName: v.vendorName || "Unknown Vendor",
            totalOwed: Number(v.totalOwed || 0),
            billCount: Number(v.billCount || 0),
          })),
          billCount: outstanding.bills.length,
          statusCounts: statusCounts.reduce(
            (acc, s) => {
              acc[s.status] = Number(s.count);
              return acc;
            },
            {} as Record<string, number>
          ),
        };
      }),

    // Get overdue invoices list
    getOverdueInvoices: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        // Get overdue invoices with client info
        const overdueInvoices = await db
          .select({
            id: invoices.id,
            invoiceNumber: invoices.invoiceNumber,
            customerId: invoices.customerId,
            customerName: clients.name,
            invoiceDate: invoices.invoiceDate,
            dueDate: invoices.dueDate,
            totalAmount: invoices.totalAmount,
            amountDue: invoices.amountDue,
            status: invoices.status,
          })
          .from(invoices)
          .leftJoin(clients, eq(invoices.customerId, clients.id))
          .where(
            and(
              sql`CAST(${invoices.amountDue} AS DECIMAL(15,2)) > 0`,
              sql`${invoices.dueDate} < ${todayStr}`,
              sql`${invoices.deletedAt} IS NULL`
            )
          )
          .orderBy(asc(invoices.dueDate))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(invoices)
          .where(
            and(
              sql`CAST(${invoices.amountDue} AS DECIMAL(15,2)) > 0`,
              sql`${invoices.dueDate} < ${todayStr}`,
              sql`${invoices.deletedAt} IS NULL`
            )
          );

        // Calculate days overdue for each invoice
        const invoicesWithDaysOverdue = overdueInvoices.map(inv => {
          const dueDate = new Date(inv.dueDate);
          const daysOverdue = Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            ...inv,
            totalAmount: Number(inv.totalAmount),
            amountDue: Number(inv.amountDue),
            daysOverdue,
          };
        });

        return createSafeUnifiedResponse(
          invoicesWithDaysOverdue,
          Number(countResult[0]?.count || 0),
          input.limit,
          input.offset
        );
      }),

    // Get client statement with invoices and payments
    getClientStatement: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          clientId: z.number(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        logger.info({
          msg: "[Accounting] Getting client statement",
          clientId: input.clientId,
        });

        // Get client info
        const [client] = await db
          .select({
            id: clients.id,
            name: clients.name,
            email: clients.email,
            phone: clients.phone,
            totalOwed: clients.totalOwed,
          })
          .from(clients)
          .where(eq(clients.id, input.clientId));

        if (!client) {
          throw new Error("Client not found");
        }

        // Build date conditions for invoices
        const invoiceConditions = [
          eq(invoices.customerId, input.clientId),
          sql`${invoices.deletedAt} IS NULL`,
        ];
        if (input.startDate) {
          const startDateStr = input.startDate.toISOString().split("T")[0];
          invoiceConditions.push(
            sql`${invoices.invoiceDate} >= ${startDateStr}`
          );
        }
        if (input.endDate) {
          const endDateStr = input.endDate.toISOString().split("T")[0];
          invoiceConditions.push(sql`${invoices.invoiceDate} <= ${endDateStr}`);
        }

        // Get client invoices
        const clientInvoices = await db
          .select()
          .from(invoices)
          .where(and(...invoiceConditions))
          .orderBy(desc(invoices.invoiceDate));

        // Build date conditions for payments
        const paymentConditions = [
          eq(payments.customerId, input.clientId),
          sql`${payments.deletedAt} IS NULL`,
        ];
        if (input.startDate) {
          const startDateStr = input.startDate.toISOString().split("T")[0];
          paymentConditions.push(
            sql`${payments.paymentDate} >= ${startDateStr}`
          );
        }
        if (input.endDate) {
          const endDateStr = input.endDate.toISOString().split("T")[0];
          paymentConditions.push(sql`${payments.paymentDate} <= ${endDateStr}`);
        }

        // Get client payments
        const clientPayments = await db
          .select()
          .from(payments)
          .where(and(...paymentConditions))
          .orderBy(desc(payments.paymentDate));

        // Calculate summary
        const totalInvoiced = clientInvoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount),
          0
        );
        const totalPaid = clientPayments.reduce(
          (sum, pmt) => sum + Number(pmt.amount),
          0
        );
        const currentBalance = Number(client.totalOwed || 0);

        return {
          client: {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
          },
          invoices: clientInvoices.map(inv => ({
            ...inv,
            totalAmount: Number(inv.totalAmount),
            amountDue: Number(inv.amountDue),
            amountPaid: Number(inv.amountPaid),
          })),
          payments: clientPayments.map(pmt => ({
            ...pmt,
            amount: Number(pmt.amount),
          })),
          summary: {
            totalInvoiced,
            totalPaid,
            currentBalance,
            invoiceCount: clientInvoices.length,
            paymentCount: clientPayments.length,
          },
        };
      }),

    // Get overdue bills (AP) list
    getOverdueBills: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          limit: z.number().min(1).max(100).default(50),
          offset: z.number().min(0).default(0),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const today = new Date();
        const todayStr = today.toISOString().split("T")[0];

        // Get overdue bills with vendor info
        const overdueBills = await db
          .select({
            id: bills.id,
            billNumber: bills.billNumber,
            vendorId: bills.vendorId,
            vendorName: clients.name,
            billDate: bills.billDate,
            dueDate: bills.dueDate,
            totalAmount: bills.totalAmount,
            amountDue: bills.amountDue,
            status: bills.status,
          })
          .from(bills)
          .leftJoin(clients, eq(bills.vendorId, clients.id))
          .where(
            and(
              sql`CAST(${bills.amountDue} AS DECIMAL(15,2)) > 0`,
              sql`${bills.dueDate} < ${todayStr}`,
              sql`${bills.deletedAt} IS NULL`
            )
          )
          .orderBy(asc(bills.dueDate))
          .limit(input.limit)
          .offset(input.offset);

        // Get total count
        const countResult = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(bills)
          .where(
            and(
              sql`CAST(${bills.amountDue} AS DECIMAL(15,2)) > 0`,
              sql`${bills.dueDate} < ${todayStr}`,
              sql`${bills.deletedAt} IS NULL`
            )
          );

        // Calculate days overdue for each bill
        const billsWithDaysOverdue = overdueBills.map(bill => {
          const dueDate = new Date(bill.dueDate);
          const daysOverdue = Math.floor(
            (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            ...bill,
            totalAmount: Number(bill.totalAmount),
            amountDue: Number(bill.amountDue),
            daysOverdue,
          };
        });

        return createSafeUnifiedResponse(
          billsWithDaysOverdue,
          Number(countResult[0]?.count || 0),
          input.limit,
          input.offset
        );
      }),
  }),

  // Chart of Accounts
  // PERF-003: Chart of Accounts with pagination
  accounts: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          accountType: z
            .enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"])
            .optional(),
          isActive: z.boolean().optional(),
          parentAccountId: z.number().optional(),
          limit: z
            .number()
            .min(1)
            .max(MAX_PAGE_SIZE)
            .default(DEFAULT_PAGE_SIZE)
            .optional(),
          offset: z.number().min(0).default(0).optional(),
        })
      )
      .query(async ({ input }) => {
        const { limit, offset } = getPaginationParams(input);
        const { accountType, isActive, parentAccountId } = input;

        // Get all accounts (for now, until accountingDb supports pagination)
        const allAccounts = await accountingDb.getAccounts({
          accountType,
          isActive,
          parentAccountId,
        });

        // Apply pagination in memory (for small datasets like chart of accounts)
        const total = allAccounts.length;
        const items = allAccounts.slice(offset, offset + limit);

        return createPaginatedResponse(items, total, limit, offset);
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await accountingDb.getAccountById(input.id);
      }),

    getByNumber: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ accountNumber: z.string() }))
      .query(async ({ input }) => {
        return await accountingDb.getAccountByNumber(input.accountNumber);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          accountNumber: z.string(),
          accountName: z.string(),
          accountType: z.enum([
            "ASSET",
            "LIABILITY",
            "EQUITY",
            "REVENUE",
            "EXPENSE",
          ]),
          normalBalance: z.enum(["DEBIT", "CREDIT"]),
          description: z.string().optional(),
          parentAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await accountingDb.createAccount(input);
      }),

    update: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          accountName: z.string().optional(),
          description: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await accountingDb.updateAccount(id, data);
      }),

    getBalance: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          accountId: z.number(),
          asOfDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await accountingDb.getAccountBalance(
          input.accountId,
          input.asOfDate
        );
      }),

    getChartOfAccounts: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await accountingDb.getChartOfAccounts();
      }),
  }),

  // General Ledger
  ledger: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          accountId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          fiscalPeriodId: z.number().optional(),
          isPosted: z.boolean().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const result = await accountingDb.getLedgerEntries(input);
        // BUG-034: Standardized pagination response
        const entries = result.entries || [];
        return createSafeUnifiedResponse(
          entries,
          result.total || -1,
          input.limit || 50,
          input.offset || 0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await accountingDb.getLedgerEntryById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          entryNumber: z.string(),
          entryDate: z.date(),
          accountId: z.number(),
          debit: z.string(),
          credit: z.string(),
          description: z.string(),
          fiscalPeriodId: z.number(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          isManual: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await accountingDb.createLedgerEntry({
          ...input,
          createdBy: getAuthenticatedUserId(ctx),
        });
      }),

    postJournalEntry: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          entryDate: z.date(),
          debitAccountId: z.number(),
          creditAccountId: z.number(),
          amount: z.number(),
          description: z.string(),
          fiscalPeriodId: z.number(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await accountingDb.postJournalEntry({
          ...input,
          createdBy: getAuthenticatedUserId(ctx),
        });
      }),

    getTrialBalance: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          fiscalPeriodId: z.number(),
        })
      )
      .query(async ({ input }) => {
        return await accountingDb.getTrialBalance(input.fiscalPeriodId);
      }),
  }),

  // Fiscal Periods
  fiscalPeriods: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          status: z.enum(["OPEN", "CLOSED", "LOCKED"]).optional(),
          year: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        return await accountingDb.getFiscalPeriods(input);
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await accountingDb.getFiscalPeriodById(input.id);
      }),

    getCurrent: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await accountingDb.getCurrentFiscalPeriod();
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          periodName: z.string(),
          startDate: z.date(),
          endDate: z.date(),
          fiscalYear: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await accountingDb.createFiscalPeriod(input);
      }),

    close: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await accountingDb.closeFiscalPeriod(
          input.id,
          getAuthenticatedUserId(ctx)
        );
      }),

    lock: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await accountingDb.lockFiscalPeriod(input.id);
      }),

    reopen: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await accountingDb.reopenFiscalPeriod(input.id);
      }),
  }),

  // Invoices (Accounts Receivable)
  invoices: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          customerId: z.number().optional(),
          status: z
            .enum([
              "DRAFT",
              "SENT",
              "VIEWED",
              "PARTIAL",
              "PAID",
              "OVERDUE",
              "VOID",
            ])
            .optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const result = await arApDb.getInvoices(input);
        // BUG-034: Standardized pagination response
        const invoices = result.invoices || result;
        return createSafeUnifiedResponse(
          invoices,
          result.total || -1,
          input.limit || 50,
          input.offset || 0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await arApDb.getInvoiceById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          invoiceNumber: z.string(),
          customerId: z.number(),
          invoiceDate: z.date(),
          dueDate: z.date(),
          subtotal: z.string(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          lineItems: z.array(
            z.object({
              productId: z.number().optional(),
              batchId: z.number().optional(),
              description: z.string(),
              quantity: z.string(),
              unitPrice: z.string(),
              taxRate: z.string().optional(),
              discountPercent: z.string().optional(),
              lineTotal: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { lineItems, ...invoiceData } = input;
        // Calculate amountDue (initially equals totalAmount)
        const totalAmount = parseFloat(invoiceData.totalAmount);
        const invoiceId = await arApDb.createInvoice(
          {
            ...invoiceData,
            amountPaid: "0.00",
            amountDue: totalAmount.toFixed(2),
            createdBy: getAuthenticatedUserId(ctx),
          },
          lineItems
        );

        await postInvoiceGLEntries({
          invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          clientId: invoiceData.customerId,
          amount: totalAmount.toFixed(2),
          invoiceDate: invoiceData.invoiceDate,
          userId: getAuthenticatedUserId(ctx),
        });

        // ARCH-002: Sync client balance after invoice creation
        const { syncClientBalance } =
          await import("../services/clientBalanceService");
        await syncClientBalance(invoiceData.customerId);

        // Trigger notification for new invoice
        onInvoiceCreated({
          id: invoiceId,
          invoiceNumber: invoiceData.invoiceNumber,
          clientId: invoiceData.customerId,
          totalAmount: invoiceData.totalAmount,
          amountDue: totalAmount.toFixed(2),
          dueDate: invoiceData.dueDate,
        }).catch(error => {
          // Don't fail the mutation if notification fails
          console.error("Failed to send invoice created notification:", error);
        });

        return invoiceId;
      }),

    update: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          invoiceDate: z.date().optional(),
          dueDate: z.date().optional(),
          subtotal: z.string().optional(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await arApDb.updateInvoice(id, data);
      }),

    updateStatus: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "DRAFT",
            "SENT",
            "VIEWED",
            "PARTIAL",
            "PAID",
            "OVERDUE",
            "VOID",
          ]),
        })
      )
      .mutation(async ({ input }) => {
        return await arApDb.updateInvoiceStatus(input.id, input.status);
      }),

    recordPayment: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          invoiceId: z.number(),
          amount: z.number(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const result = await arApDb.recordInvoicePayment(
          input.invoiceId,
          input.amount
        );

        // Get invoice details for notification
        const invoice = await arApDb.getInvoiceById(input.invoiceId);
        if (invoice) {
          await postPaymentGLEntries({
            transactionId: input.invoiceId,
            transactionNumber: invoice.invoiceNumber,
            clientId: invoice.customerId,
            amount: input.amount.toFixed(2),
            transactionDate: new Date(),
            userId: getAuthenticatedUserId(ctx),
          });

          onPaymentReceived({
            id: input.invoiceId, // Use invoice ID as reference
            clientId: invoice.customerId,
            amount: input.amount,
            invoiceId: input.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
          }).catch(error => {
            // Don't fail the mutation if notification fails
            console.error(
              "Failed to send payment received notification:",
              error
            );
          });
        }

        return result;
      }),

    getOutstandingReceivables: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await arApDb.getOutstandingReceivables();
      }),

    getARAging: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await arApDb.calculateARAging();
      }),

    generateNumber: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await arApDb.generateInvoiceNumber();
      }),
  }),

  // Bills (Accounts Payable)
  bills: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          vendorId: z.number().optional(),
          status: z
            .enum([
              "DRAFT",
              "PENDING",
              "APPROVED",
              "PARTIAL",
              "PAID",
              "OVERDUE",
              "VOID",
            ])
            .optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const result = await arApDb.getBills(input);
        // BUG-034: Standardized pagination response
        const bills = result.bills || result;
        return createSafeUnifiedResponse(
          bills,
          result.total || -1,
          input.limit || 50,
          input.offset || 0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await arApDb.getBillById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          billNumber: z.string(),
          vendorId: z.number(),
          billDate: z.date(),
          dueDate: z.date(),
          subtotal: z.string(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
          referenceType: z.string().optional(),
          referenceId: z.number().optional(),
          lineItems: z.array(
            z.object({
              productId: z.number().optional(),
              lotId: z.number().optional(),
              description: z.string(),
              quantity: z.string(),
              unitPrice: z.string(),
              taxRate: z.string().optional(),
              discountPercent: z.string().optional(),
              lineTotal: z.string(),
            })
          ),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { lineItems, ...billData } = input;
        // Calculate amountDue (initially equals totalAmount)
        const totalAmount = parseFloat(billData.totalAmount);
        return await arApDb.createBill(
          {
            ...billData,
            amountPaid: "0.00",
            amountDue: totalAmount.toFixed(2),
            createdBy: getAuthenticatedUserId(ctx),
          },
          lineItems
        );
      }),

    update: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          billDate: z.date().optional(),
          dueDate: z.date().optional(),
          subtotal: z.string().optional(),
          taxAmount: z.string().optional(),
          discountAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          paymentTerms: z.string().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await arApDb.updateBill(id, data);
      }),

    updateStatus: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          status: z.enum([
            "DRAFT",
            "PENDING",
            "APPROVED",
            "PARTIAL",
            "PAID",
            "OVERDUE",
            "VOID",
          ]),
        })
      )
      .mutation(async ({ input }) => {
        return await arApDb.updateBillStatus(input.id, input.status);
      }),

    recordPayment: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          billId: z.number(),
          amount: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await arApDb.recordBillPayment(input.billId, input.amount);
      }),

    getOutstandingPayables: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await arApDb.getOutstandingPayables();
      }),

    getAPAging: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await arApDb.calculateAPAging();
      }),

    generateNumber: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await arApDb.generateBillNumber();
      }),
  }),

  // Payments
  payments: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          paymentType: z.enum(["RECEIVED", "SENT"]).optional(),
          customerId: z.number().optional(),
          vendorId: z.number().optional(),
          invoiceId: z.number().optional(),
          billId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
        })
      )
      .query(async ({ input }) => {
        const result = await arApDb.getPayments(input);
        // BUG-034: Standardized pagination response
        const payments = result.payments || result;
        return createSafeUnifiedResponse(
          payments,
          result.total || -1,
          input.limit || 50,
          input.offset || 0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await arApDb.getPaymentById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          paymentNumber: z.string(),
          paymentType: z.enum(["RECEIVED", "SENT"]),
          paymentDate: z.date(),
          amount: z.string(),
          paymentMethod: z.enum([
            "CASH",
            "CHECK",
            "WIRE",
            "ACH",
            "CREDIT_CARD",
            "DEBIT_CARD",
            "OTHER",
          ]),
          referenceNumber: z.string().optional(),
          customerId: z.number().optional(),
          vendorId: z.number().optional(),
          invoiceId: z.number().optional(),
          billId: z.number().optional(),
          bankAccountId: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await arApDb.createPayment({
          ...input,
          createdBy: getAuthenticatedUserId(ctx),
        });
      }),

    generateNumber: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          type: z.enum(["RECEIVED", "SENT"]),
        })
      )
      .query(async ({ input }) => {
        return await arApDb.generatePaymentNumber(input.type);
      }),

    getForInvoice: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ invoiceId: z.number() }))
      .query(async ({ input }) => {
        return await arApDb.getPaymentsForInvoice(input.invoiceId);
      }),

    getForBill: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ billId: z.number() }))
      .query(async ({ input }) => {
        return await arApDb.getPaymentsForBill(input.billId);
      }),
  }),

  // Bank Accounts
  bankAccounts: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          accountType: z
            .enum(["CHECKING", "SAVINGS", "MONEY_MARKET", "CREDIT_CARD"])
            .optional(),
          isActive: z.boolean().optional(),
        })
      )
      .query(async ({ input }) => {
        const accounts = await cashExpensesDb.getBankAccounts(input);
        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(
          accounts,
          accounts?.length || 0,
          50,
          0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await cashExpensesDb.getBankAccountById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          accountName: z.string(),
          accountType: z.enum([
            "CHECKING",
            "SAVINGS",
            "MONEY_MARKET",
            "CREDIT_CARD",
          ]),
          accountNumber: z.string(),
          bankName: z.string(),
          currentBalance: z.string().optional(),
          isActive: z.boolean().optional(),
          ledgerAccountId: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await cashExpensesDb.createBankAccount(input);
      }),

    update: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          accountName: z.string().optional(),
          currentBalance: z.string().optional(),
          isActive: z.boolean().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await cashExpensesDb.updateBankAccount(id, data);
      }),

    updateBalance: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          newBalance: z.number(),
        })
      )
      .mutation(async ({ input }) => {
        return await cashExpensesDb.updateBankAccountBalance(
          input.id,
          input.newBalance
        );
      }),

    getTotalCashBalance: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await cashExpensesDb.getTotalCashBalance();
      }),
  }),

  // Bank Transactions
  bankTransactions: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          bankAccountId: z.number().optional(),
          transactionType: z
            .enum(["DEPOSIT", "WITHDRAWAL", "TRANSFER", "FEE", "INTEREST"])
            .optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          isReconciled: z.boolean().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const result = await cashExpensesDb.getBankTransactions(input);
        // BUG-034: Standardized pagination response
        const transactions = result.transactions || [];
        return createSafeUnifiedResponse(
          transactions,
          result.total || -1,
          input.limit || 50,
          input.offset || 0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await cashExpensesDb.getBankTransactionById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          bankAccountId: z.number(),
          transactionDate: z.date(),
          transactionType: z.enum([
            "DEPOSIT",
            "WITHDRAWAL",
            "TRANSFER",
            "FEE",
            "INTEREST",
          ]),
          amount: z.string(),
          description: z.string().optional(),
          referenceNumber: z.string().optional(),
          paymentId: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await cashExpensesDb.createBankTransaction(input);
      }),

    reconcile: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await cashExpensesDb.reconcileBankTransaction(input.id);
      }),

    getUnreconciled: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ bankAccountId: z.number() }))
      .query(async ({ input }) => {
        return await cashExpensesDb.getUnreconciledTransactions(
          input.bankAccountId
        );
      }),

    getBalanceAtDate: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          bankAccountId: z.number(),
          asOfDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        return await cashExpensesDb.getBankAccountBalanceAtDate(
          input.bankAccountId,
          input.asOfDate
        );
      }),
  }),

  // Expense Categories
  expenseCategories: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          isActive: z.boolean().optional(),
        })
      )
      .query(async ({ input }) => {
        const categories = await cashExpensesDb.getExpenseCategories(input);
        // BUG-034: Standardized pagination response
        return createSafeUnifiedResponse(
          categories,
          categories?.length || 0,
          50,
          0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await cashExpensesDb.getExpenseCategoryById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          categoryName: z.string(),
          description: z.string().optional(),
          ledgerAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await cashExpensesDb.createExpenseCategory(input);
      }),

    update: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          categoryName: z.string().optional(),
          description: z.string().optional(),
          ledgerAccountId: z.number().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await cashExpensesDb.updateExpenseCategory(id, data);
      }),
  }),

  // Expenses
  expenses: router({
    list: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          categoryId: z.number().optional(),
          vendorId: z.number().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
          limit: z.number().optional(),
          offset: z.number().optional(),
          searchTerm: z.string().optional(),
        })
      )
      .query(async ({ input }) => {
        const result = await cashExpensesDb.getExpenses(input);
        // BUG-034: Standardized pagination response
        const expenseList = result.expenses || [];
        return createSafeUnifiedResponse(
          expenseList,
          result.total || -1,
          input.limit || 50,
          input.offset || 0
        );
      }),

    getById: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await cashExpensesDb.getExpenseById(input.id);
      }),

    create: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          expenseNumber: z.string(),
          expenseDate: z.date(),
          categoryId: z.number(),
          vendorId: z.number().optional(),
          amount: z.string(),
          taxAmount: z.string().optional(),
          totalAmount: z.string(),
          paymentMethod: z.enum([
            "CASH",
            "CHECK",
            "CREDIT_CARD",
            "DEBIT_CARD",
            "BANK_TRANSFER",
            "OTHER",
          ]),
          bankAccountId: z.number().optional(),
          description: z.string().optional(),
          receiptUrl: z.string().optional(),
          billId: z.number().optional(),
          isReimbursable: z.boolean().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await cashExpensesDb.createExpense({
          ...input,
          createdBy: getAuthenticatedUserId(ctx),
        });
      }),

    update: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(
        z.object({
          id: z.number(),
          expenseDate: z.date().optional(),
          categoryId: z.number().optional(),
          vendorId: z.number().optional(),
          amount: z.string().optional(),
          taxAmount: z.string().optional(),
          totalAmount: z.string().optional(),
          description: z.string().optional(),
          receiptUrl: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await cashExpensesDb.updateExpense(id, data);
      }),

    markReimbursed: protectedProcedure
      .use(requirePermission("accounting:update"))
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        return await cashExpensesDb.markExpenseReimbursed(input.id);
      }),

    getPendingReimbursements: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await cashExpensesDb.getPendingReimbursements();
      }),

    getBreakdownByCategory: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await cashExpensesDb.getExpenseBreakdownByCategory(
          input.startDate,
          input.endDate
        );
      }),

    getTotalExpenses: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        return await cashExpensesDb.getTotalExpenses(
          input.startDate,
          input.endDate
        );
      }),

    generateNumber: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        return await cashExpensesDb.generateExpenseNumber();
      }),
  }),

  // WS-001 & WS-002: Quick Actions for common accounting tasks
  quickActions: router({
    // WS-001: Preview client balance before payment
    previewPaymentBalance: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          clientId: z.number(),
          amount: z.number().positive(),
        })
      )
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { clients } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        const client = await db
          .select({
            id: clients.id,
            name: clients.name,
            totalOwed: clients.totalOwed,
          })
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);

        if (!client[0]) throw new Error("Client not found");

        const currentBalance = Number(client[0].totalOwed || 0);
        const projectedBalance = currentBalance - input.amount;

        return {
          clientId: client[0].id,
          clientName: client[0].name,
          currentBalance,
          paymentAmount: input.amount,
          projectedBalance,
          willCreateCredit: projectedBalance < 0,
        };
      }),

    // WS-001: Receive client payment (cash drop-off)
    receiveClientPayment: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          clientId: z.number(),
          amount: z.number().positive(),
          paymentMethod: z.enum(["CASH", "CHECK", "WIRE", "ACH", "OTHER"]),
          note: z.string().optional(),
          generateReceipt: z.boolean().default(true),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");

        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { clients, payments, clientTransactions } =
          await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");

        // 1. Get current client balance
        const client = await db
          .select({
            id: clients.id,
            name: clients.name,
            totalOwed: clients.totalOwed,
          })
          .from(clients)
          .where(eq(clients.id, input.clientId))
          .limit(1);

        if (!client[0]) throw new Error("Client not found");

        const previousBalance = Number(client[0].totalOwed || 0);
        const _newBalance = previousBalance - input.amount;

        // 2. Generate payment number
        const paymentNumber = await arApDb.generatePaymentNumber("RECEIVED");

        // 3. Create payment record
        const paymentResult = await db.insert(payments).values({
          paymentNumber,
          paymentType: "RECEIVED",
          paymentDate: new Date(),
          amount: input.amount.toFixed(2),
          paymentMethod: input.paymentMethod,
          customerId: input.clientId,
          notes: input.note || `Quick payment from ${client[0].name}`,
          createdBy: getAuthenticatedUserId(ctx),
        });

        const paymentId = Number(paymentResult[0].insertId);

        // 4. Create client transaction record for audit trail
        await db.insert(clientTransactions).values({
          clientId: input.clientId,
          transactionType: "PAYMENT",
          transactionDate: new Date(),
          amount: input.amount.toFixed(2),
          paymentStatus: "PAID",
          notes: input.note || `Quick payment - ${input.paymentMethod}`,
          metadata: {
            referenceType: "PAYMENT",
            referenceId: paymentId,
          },
        });

        // 5. ARCH-002: Sync client balance from invoices (canonical calculation)
        const { syncClientBalance } =
          await import("../services/clientBalanceService");
        const actualNewBalance = await syncClientBalance(input.clientId);

        // 6. Return result
        return {
          paymentId,
          paymentNumber,
          previousBalance,
          newBalance: actualNewBalance,
          paymentAmount: input.amount,
          clientName: client[0].name,
          timestamp: new Date().toISOString(),
          receiptUrl: input.generateReceipt
            ? `/api/receipts/payment/${paymentId}`
            : undefined,
        };
      }),

    // WS-002: Pay vendor (cash out)
    payVendor: protectedProcedure
      .use(requirePermission("accounting:create"))
      .input(
        z.object({
          vendorId: z.number(),
          amount: z.number().positive(),
          paymentMethod: z.enum(["CASH", "CHECK", "WIRE", "ACH", "OTHER"]),
          note: z.string().optional(),
          billId: z.number().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");

        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { clients, payments } = await import("../../drizzle/schema");
        const { eq, and } = await import("drizzle-orm");

        // 1. Get vendor (supplier) info
        const vendor = await db
          .select({
            id: clients.id,
            name: clients.name,
            isSeller: clients.isSeller,
          })
          .from(clients)
          .where(
            and(eq(clients.id, input.vendorId), eq(clients.isSeller, true))
          )
          .limit(1);

        if (!vendor[0]) throw new Error("Vendor not found or not a seller");

        // 2. Generate payment number
        const paymentNumber = await arApDb.generatePaymentNumber("SENT");

        // 3. Create payment record
        const paymentResult = await db.insert(payments).values({
          paymentNumber,
          paymentType: "SENT",
          paymentDate: new Date(),
          amount: input.amount.toFixed(2),
          paymentMethod: input.paymentMethod,
          vendorId: input.vendorId,
          billId: input.billId,
          notes: input.note || `Quick payment to ${vendor[0].name}`,
          createdBy: getAuthenticatedUserId(ctx),
        });

        const paymentId = Number(paymentResult[0].insertId);

        // 4. If billId provided, update bill payment status
        if (input.billId) {
          await arApDb.recordBillPayment(input.billId, input.amount);
        }

        // 5. Return result
        return {
          paymentId,
          paymentNumber,
          paymentAmount: input.amount,
          vendorName: vendor[0].name,
          timestamp: new Date().toISOString(),
        };
      }),

    // Get recent clients for quick selection
    getRecentClients: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          limit: z.number().min(1).max(20).default(10),
        })
      )
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { clients } = await import("../../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");

        // Get clients with recent payment activity
        const recentClients = await db
          .select({
            id: clients.id,
            name: clients.name,
            totalOwed: clients.totalOwed,
          })
          .from(clients)
          .where(eq(clients.isBuyer, true))
          .orderBy(desc(clients.updatedAt))
          .limit(input.limit);

        return recentClients;
      }),

    // Get recent vendors for quick selection
    getRecentVendors: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          limit: z.number().min(1).max(20).default(10),
        })
      )
      .query(async ({ input }) => {
        const db = await import("../db").then(m => m.getDb());
        if (!db) throw new Error("Database not available");

        const { clients } = await import("../../drizzle/schema");
        const { desc, eq } = await import("drizzle-orm");

        // Get vendors (sellers)
        const recentVendors = await db
          .select({
            id: clients.id,
            name: clients.name,
          })
          .from(clients)
          .where(eq(clients.isSeller, true))
          .orderBy(desc(clients.updatedAt))
          .limit(input.limit);

        return recentVendors;
      }),
  }),

  // ============================================================================
  // FINANCIAL REPORTS (BE-QA-008)
  // ============================================================================
  reports: router({
    /**
     * Generate Balance Sheet Report
     * Shows assets, liabilities, and equity at a point in time
     */
    generateBalanceSheet: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          asOfDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        const asOfDate = input.asOfDate || new Date();
        const asOfDateStr = asOfDate.toISOString().split("T")[0];

        logger.info({
          msg: "[Accounting] Generating balance sheet",
          asOfDate: asOfDateStr,
        });

        // Get all accounts with balances
        const accounts = await accountingDb.getChartOfAccounts();

        // Calculate balances for each account type
        const assets: { accountName: string; balance: number }[] = [];
        const liabilities: { accountName: string; balance: number }[] = [];
        const equity: { accountName: string; balance: number }[] = [];

        for (const account of accounts) {
          const balance = await accountingDb.getAccountBalance(
            account.id,
            asOfDate
          );
          const balanceAmount = Number(balance?.balance || 0);

          if (balanceAmount !== 0) {
            const entry = {
              accountName: account.accountName,
              balance: balanceAmount,
            };
            switch (account.accountType) {
              case "ASSET":
                assets.push(entry);
                break;
              case "LIABILITY":
                liabilities.push(entry);
                break;
              case "EQUITY":
                equity.push(entry);
                break;
            }
          }
        }

        // Get AR total (receivables are assets)
        const arAging = await arApDb.calculateARAging();
        const totalAR =
          arAging.current +
          arAging.days30 +
          arAging.days60 +
          arAging.days90 +
          arAging.days90Plus;
        if (totalAR > 0) {
          assets.push({ accountName: "Accounts Receivable", balance: totalAR });
        }

        // Get AP total (payables are liabilities)
        const apAging = await arApDb.calculateAPAging();
        const totalAP =
          apAging.current +
          apAging.days30 +
          apAging.days60 +
          apAging.days90 +
          apAging.days90Plus;
        if (totalAP > 0) {
          liabilities.push({
            accountName: "Accounts Payable",
            balance: totalAP,
          });
        }

        // Get cash balances
        const bankAccounts = await cashExpensesDb.getBankAccounts({
          isActive: true,
        });
        for (const account of bankAccounts) {
          if (Number(account.currentBalance) > 0) {
            assets.push({
              accountName: `${account.accountName} (${account.bankName})`,
              balance: Number(account.currentBalance),
            });
          }
        }

        // Calculate totals
        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce(
          (sum, l) => sum + l.balance,
          0
        );
        const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

        // Retained earnings (balancing figure)
        const retainedEarnings = totalAssets - totalLiabilities - totalEquity;
        if (retainedEarnings !== 0) {
          equity.push({
            accountName: "Retained Earnings",
            balance: retainedEarnings,
          });
        }

        return {
          asOfDate: asOfDateStr,
          assets: {
            items: assets,
            total: totalAssets,
          },
          liabilities: {
            items: liabilities,
            total: totalLiabilities,
          },
          equity: {
            items: [...equity],
            total: totalEquity + retainedEarnings,
          },
          isBalanced:
            Math.abs(
              totalAssets - (totalLiabilities + totalEquity + retainedEarnings)
            ) < 0.01,
        };
      }),

    /**
     * Generate Income Statement (Profit & Loss)
     * Shows revenue, expenses, and net income for a period
     */
    generateIncomeStatement: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");

        // BUG-407: Validate date range
        if (input.startDate > input.endDate) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "startDate must be less than or equal to endDate",
          });
        }

        // BUG-510: Validate date range is not more than 366 days
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysDiff = Math.ceil(
          (input.endDate.getTime() - input.startDate.getTime()) / msPerDay
        );
        if (daysDiff > 366) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Date range cannot exceed 366 days. Requested range: ${daysDiff} days`,
          });
        }

        const startDateStr = input.startDate.toISOString().split("T")[0];
        const endDateStr = input.endDate.toISOString().split("T")[0];

        logger.info({
          msg: "[Accounting] Generating income statement",
          startDate: startDateStr,
          endDate: endDateStr,
        });

        // Get revenue from paid invoices in period
        const invoicesResult = await arApDb.getInvoices({
          status: "PAID",
          startDate: input.startDate,
          endDate: input.endDate,
        });
        const paidInvoices = invoicesResult.invoices || [];

        const totalRevenue = paidInvoices.reduce(
          (sum, inv) => sum + Number(inv.totalAmount || 0),
          0
        );

        // Get expenses in period
        const expensesResult = await cashExpensesDb.getExpenses({
          startDate: input.startDate,
          endDate: input.endDate,
        });
        const expenses = expensesResult.expenses || [];

        // Group expenses by category
        const expenseCategories = await cashExpensesDb.getExpenseCategories({});
        const categoryMap = new Map(
          expenseCategories.map(c => [c.id, c.categoryName])
        );

        const expensesByCategory: { categoryName: string; amount: number }[] =
          [];
        const categoryTotals = new Map<number, number>();

        for (const expense of expenses) {
          const categoryId = expense.categoryId;
          const current = categoryTotals.get(categoryId) || 0;
          categoryTotals.set(
            categoryId,
            current + Number(expense.totalAmount || 0)
          );
        }

        for (const [categoryId, total] of categoryTotals) {
          expensesByCategory.push({
            categoryName: categoryMap.get(categoryId) || "Uncategorized",
            amount: total,
          });
        }

        const totalExpenses = expensesByCategory.reduce(
          (sum, e) => sum + e.amount,
          0
        );

        // BE-QA-008-FIX: Calculate COGS from confirmed/shipped order line items
        // Fixed: BUG-305, BUG-306, BUG-318, BUG-319, BUG-320, BUG-321, BUG-407
        const { orders, orderLineItems } = await import("../../drizzle/schema");
        const { isNull, ne, notInArray } = await import("drizzle-orm");

        // BUG-407: GAAP Matching Principle - Only count COGS for orders with PAID invoices
        // Revenue is recognized when invoices are paid, so COGS must match those same orders
        // Extract order IDs from paid invoices (referenceType='ORDER' or 'SALE' with valid referenceId)
        const paidOrderIds = paidInvoices
          .filter(
            inv =>
              (inv.referenceType === "ORDER" || inv.referenceType === "SALE") &&
              inv.referenceId !== null
          )
          .map(inv => inv.referenceId as number);

        let totalCOGS = 0;

        // BUG-407: Only calculate COGS if there are orders with paid invoices
        if (paidOrderIds.length > 0) {
          // Get orders that have PAID invoices and meet quality criteria
          // BUG-320: Exclude cancelled orders
          // BUG-406: Exclude RETURNED/RESTOCKED orders - COGS should not count returned goods
          const periodOrders = await db
            .select({
              orderId: orders.id,
            })
            .from(orders)
            .where(
              and(
                inArray(orders.id, paidOrderIds), // BUG-407: Only orders with PAID invoices
                eq(orders.orderType, "SALE"),
                eq(orders.isDraft, false),
                isNull(orders.deletedAt),
                ne(orders.saleStatus, "CANCELLED"), // BUG-320: Exclude cancelled orders
                // BUG-406: Only include shipped/delivered orders for COGS
                // Exclude RETURNED, RESTOCKED, RETURNED_TO_VENDOR, CANCELLED fulfillment
                notInArray(orders.fulfillmentStatus, [
                  "RETURNED",
                  "RESTOCKED",
                  "RETURNED_TO_VENDOR",
                  "CANCELLED",
                ])
              )
            );

          const orderIds = periodOrders.map(o => o.orderId);

          // Only query line items if there are matching orders
          if (orderIds.length > 0) {
            // Get line items for these orders and calculate COGS
            // BUG-319: orderLineItems does not have deletedAt column (no soft delete)
            const lineItems = await db
              .select({
                orderId: orderLineItems.orderId,
                quantity: orderLineItems.quantity,
                cogsPerUnit: orderLineItems.cogsPerUnit,
              })
              .from(orderLineItems)
              .where(inArray(orderLineItems.orderId, orderIds));

            // BUG-306: Use integer cents for precision
            // BUG-318: Handle nulls properly (schema says notNull, but log warning if found)
            // BUG-505, BUG-419: Accumulate raw values without intermediate rounding to avoid precision loss
            let totalCOGSCents = 0;
            let lineItemCount = 0;
            for (const item of lineItems) {
              // BUG-318: Log warning if unexpected null values found
              if (item.quantity === null || item.cogsPerUnit === null) {
                logger.warn({
                  msg: "[Accounting] Unexpected null COGS data found",
                  orderId: item.orderId,
                  quantity: item.quantity,
                  cogsPerUnit: item.cogsPerUnit,
                });
                continue;
              }

              const qty = parseFloat(item.quantity || "0");
              const cogsPerUnitRaw = parseFloat(item.cogsPerUnit || "0");

              if (Number.isNaN(qty) || Number.isNaN(cogsPerUnitRaw)) {
                logger.warn({
                  msg: "[Accounting] Invalid COGS data found",
                  orderId: item.orderId,
                  quantity: item.quantity,
                  cogsPerUnit: item.cogsPerUnit,
                });
                continue;
              }

              // BUG-505, BUG-419: Accumulate raw cents without intermediate rounding
              // Convert to cents (cogsPerUnit * 100) and multiply by qty, no rounding
              const cogsCents = cogsPerUnitRaw * 100;
              totalCOGSCents += qty * cogsCents;
              lineItemCount++;
            }

            // BUG-408: Log COGS calculation details for audit trail
            // Note: True reconciliation against batch-level COGS requires BUG-408 implementation
            logger.debug({
              msg: "[Accounting] COGS calculation complete",
              lineItemCount,
              totalCOGSCents,
              orderCount: orderIds.length,
            });

            // BUG-505, BUG-419: Only round at the final step to avoid cascading bias
            totalCOGS = Math.round(totalCOGSCents) / 100;
          }

          logger.info({
            msg: "[Accounting] COGS calculated for income statement",
            paidOrderIds: paidOrderIds.length,
            matchingOrders: orderIds.length,
            totalCOGS,
          });
        } else {
          logger.info({
            msg: "[Accounting] No orders with paid invoices found for COGS",
            paidOrderIds: paidOrderIds.length,
            totalCOGS: 0,
          });
        }

        const grossProfit = totalRevenue - totalCOGS;
        const netIncome = grossProfit - totalExpenses;

        return {
          period: {
            startDate: startDateStr,
            endDate: endDateStr,
          },
          revenue: {
            items: [{ name: "Sales Revenue", amount: totalRevenue }],
            total: totalRevenue,
          },
          costOfGoodsSold: {
            items:
              totalCOGS > 0
                ? [{ name: "Cost of Goods Sold", amount: totalCOGS }]
                : [],
            total: totalCOGS,
          },
          grossProfit,
          operatingExpenses: {
            items: expensesByCategory.map(e => ({
              name: e.categoryName,
              amount: e.amount,
            })),
            total: totalExpenses,
          },
          netIncome,
          grossMarginPercent:
            totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          netMarginPercent:
            totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
        };
      }),

    /**
     * Get Profit and Loss Summary
     * Quick P&L overview for dashboard
     */
    getProfitLossSummary: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(
        z.object({
          period: z.enum(["month", "quarter", "year"]).default("month"),
        })
      )
      .query(async ({ input }) => {
        const now = new Date();
        let startDate: Date;

        switch (input.period) {
          case "month":
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            break;
          case "quarter": {
            const quarter = Math.floor(now.getMonth() / 3);
            startDate = new Date(now.getFullYear(), quarter * 3, 1);
            break;
          }
          case "year":
            startDate = new Date(now.getFullYear(), 0, 1);
            break;
        }

        // Get revenue
        const invoicesResult = await arApDb.getInvoices({
          status: "PAID",
          startDate,
          endDate: now,
        });
        const totalRevenue = (invoicesResult.invoices || []).reduce(
          (sum, inv) => sum + Number(inv.totalAmount || 0),
          0
        );

        // Get expenses
        const totalExpenses = await cashExpensesDb.getTotalExpenses(
          startDate,
          now
        );

        return {
          period: input.period,
          startDate: startDate.toISOString().split("T")[0],
          endDate: now.toISOString().split("T")[0],
          revenue: totalRevenue,
          expenses: Number(totalExpenses) || 0,
          netIncome: totalRevenue - (Number(totalExpenses) || 0),
        };
      }),
  }),

  // ============================================================================
  // CLIENT BALANCE MANAGEMENT (ARCH-002: Eliminate Shadow Accounting)
  // ============================================================================
  clientBalances: router({
    /**
     * Get detailed balance information for a client
     * Shows computed balance from invoices vs stored balance
     */
    getClientBalance: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { getClientBalanceDetails } =
          await import("../services/clientBalanceService");
        return getClientBalanceDetails(input.clientId);
      }),

    /**
     * Synchronize a client's balance with the canonical calculation
     * ARCH-002: This is the proper way to update client balance
     */
    syncClientBalance: protectedProcedure
      .use(requirePermission("accounting:write"))
      .input(z.object({ clientId: z.number() }))
      .mutation(async ({ input }) => {
        const { syncClientBalance } =
          await import("../services/clientBalanceService");
        const newBalance = await syncClientBalance(input.clientId);
        return { clientId: input.clientId, newBalance };
      }),

    /**
     * Find all clients with balance discrepancies
     * Useful for auditing shadow accounting issues
     */
    findDiscrepancies: protectedProcedure
      .use(requirePermission("accounting:read"))
      .query(async () => {
        const { findBalanceDiscrepancies } =
          await import("../services/clientBalanceService");
        return findBalanceDiscrepancies();
      }),

    /**
     * Synchronize all client balances (admin operation)
     * Fixes all shadow accounting discrepancies
     */
    syncAllBalances: protectedProcedure
      .use(requirePermission("accounting:admin"))
      .mutation(async () => {
        const { syncAllClientBalances } =
          await import("../services/clientBalanceService");
        return syncAllClientBalances();
      }),

    /**
     * Verify GL balance matches client balance
     * Ensures financial integrity between AR ledger and client balances
     */
    verifyGLBalance: protectedProcedure
      .use(requirePermission("accounting:read"))
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        const { verifyClientGLBalance } =
          await import("../services/clientBalanceService");
        return verifyClientGLBalance(input.clientId);
      }),
  }),
});
