import { z } from "zod";
import { publicProcedure, router, vipPortalProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { 
  clients, 
  vipPortalAuth, 
  vipPortalConfigurations,
  clientNeeds,
  vendorSupply,
  invoices,
  bills,
  clientTransactions,
  clientDraftInterests,
  clientInterestLists,
  clientInterestListItems,
  clientCatalogViews,
  batches,
  products,
} from "../../drizzle/schema";
import * as liveCatalogService from "../services/liveCatalogService";
import * as pricingEngine from "../pricingEngine";
import * as priceAlertsService from "../services/priceAlertsService";
import { eq, and, desc, gte, lte, sql, like, or, inArray } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";
import { requirePermission } from "../_core/permissionMiddleware";

/**
 * VIP Portal Router
 * Client-facing endpoints for the VIP Client Portal
 */
export const vipPortalRouter = router({
  // ============================================================================
  // AUTHENTICATION
  // ============================================================================
  
  auth: router({
    // Login with email and password
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: eq(vipPortalAuth.email, input.email),
          with: {
            client: true,
          },
        });

        if (!authRecord || !authRecord.passwordHash) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        const isValid = await bcrypt.compare(input.password, authRecord.passwordHash);
        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid email or password",
          });
        }

        // Generate session token
        const sessionToken = crypto.randomUUID();
        const sessionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

        // Update auth record
        await db.update(vipPortalAuth)
          .set({
            sessionToken,
            sessionExpiresAt,
            lastLoginAt: new Date(),
            loginCount: sql`${vipPortalAuth.loginCount} + 1`,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        // Update client last login
        await db.update(clients)
          .set({ vipPortalLastLogin: new Date() })
          .where(eq(clients.id, authRecord.clientId));

        return {
          sessionToken,
          clientId: authRecord.clientId,
          clientName: authRecord.client?.name,
        };
      }),

    // Verify session token
    verifySession: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: and(
            eq(vipPortalAuth.sessionToken, input.sessionToken),
            gte(vipPortalAuth.sessionExpiresAt, new Date())
          ),
          with: {
            client: true,
          },
        });

        if (!authRecord) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid or expired session",
          });
        }

        return {
          clientId: authRecord.clientId,
          clientName: authRecord.client?.name,
          email: authRecord.email,
        };
      }),

    // Logout
    logout: publicProcedure
      .input(z.object({
        sessionToken: z.string(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(vipPortalAuth)
          .set({
            sessionToken: null,
            sessionExpiresAt: null,
          })
          .where(eq(vipPortalAuth.sessionToken, input.sessionToken));

        return { success: true };
      }),

    // Request password reset
    requestPasswordReset: publicProcedure
      .input(z.object({
        email: z.string().email(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: eq(vipPortalAuth.email, input.email),
        });

        if (!authRecord) {
          // Don't reveal if email exists
          return { success: true };
        }

        const resetToken = crypto.randomUUID();
        const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

        await db.update(vipPortalAuth)
          .set({
            resetToken,
            resetTokenExpiresAt,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        // TODO: Send password reset email
        // For now, just return the token (in production, this would be emailed)
        return { success: true, resetToken };
      }),

    // Reset password with token
    resetPassword: publicProcedure
      .input(z.object({
        resetToken: z.string(),
        newPassword: z.string().min(8),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const authRecord = await db.query.vipPortalAuth.findFirst({
          where: and(
            eq(vipPortalAuth.resetToken, input.resetToken),
            gte(vipPortalAuth.resetTokenExpiresAt, new Date())
          ),
        });

        if (!authRecord) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired reset token",
          });
        }

        const passwordHash = await bcrypt.hash(input.newPassword, 10);

        await db.update(vipPortalAuth)
          .set({
            passwordHash,
            resetToken: null,
            resetTokenExpiresAt: null,
          })
          .where(eq(vipPortalAuth.id, authRecord.id));

        return { success: true };
      }),
  }),

  // ============================================================================
  // CONFIGURATION
  // ============================================================================
  
  config: router({
    // Get portal configuration
    get: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        if (!config) {
          // Return default configuration with all fields matching schema
          return {
            id: 0,
            clientId: input.clientId,
            moduleDashboardEnabled: true as boolean,
            moduleLiveCatalogEnabled: false as boolean,
            moduleArEnabled: true as boolean,
            moduleApEnabled: true as boolean,
            moduleTransactionHistoryEnabled: true as boolean,
            moduleVipTierEnabled: false as boolean,
            moduleCreditCenterEnabled: false as boolean,
            moduleMarketplaceNeedsEnabled: true as boolean,
            moduleMarketplaceSupplyEnabled: true as boolean,
            featuresConfig: null as null,
            advancedOptions: null as null,
            createdAt: new Date(),
            updatedAt: new Date(),
          };
        }

        return config;
      }),
  }),

  // ============================================================================
  // DASHBOARD
  // ============================================================================
  
  dashboard: router({
    // Get dashboard KPIs
    getKPIs: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const client = await db.query.clients.findFirst({
          where: eq(clients.id, input.clientId),
        });

        if (!client) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found",
          });
        }

        // Calculate YTD spend from transactions
        const ytdStart = new Date(new Date().getFullYear(), 0, 1);
        const ytdTransactions = await db
          .select()
          .from(clientTransactions)
          .where(and(
            eq(clientTransactions.clientId, input.clientId),
            sql`${clientTransactions.transactionDate} >= ${ytdStart.toISOString().split('T')[0]}`,
            eq(clientTransactions.transactionType, "INVOICE")
          ));

        const ytdSpend = ytdTransactions.reduce(
          (sum, tx) => sum + parseFloat(tx.amount.toString()), 
          0
        );

        // Count active needs and supply
        const activeNeeds = await db
          .select({ count: sql<number>`count(*)` })
          .from(clientNeeds)
          .where(and(
            eq(clientNeeds.clientId, input.clientId),
            eq(clientNeeds.status, "ACTIVE")
          ));

        return {
          currentBalance: parseFloat(client.totalOwed || "0"),
          ytdSpend,
          creditUtilization: 0, // TODO: Calculate based on credit limit
          activeNeedsCount: Number(activeNeeds[0]?.count || 0),
          activeSupplyCount: 0, // TODO: Count active supply when schema is updated
        };
      }),
  }),

  // ============================================================================
  // ACCOUNTS RECEIVABLE
  // ============================================================================
  
  ar: router({
    getInvoices: publicProcedure
      .input(z.object({
        clientId: z.number(),
        search: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { clientId, search, status } = input;
        
        // Build query conditions
        let conditions = [eq(invoices.customerId, clientId)];
        
        if (search) {
          conditions.push(like(invoices.invoiceNumber, `%${search}%`));
        }
        
        if (status) {
          conditions.push(eq(invoices.status, status as any));
        }
        
        // Fetch invoices
        const clientInvoices = await db
          .select()
          .from(invoices)
          .where(and(...conditions))
          .orderBy(desc(invoices.invoiceDate));
        
        // Calculate summary
        const totalOutstanding = clientInvoices
          .filter(inv => inv.status !== "PAID" && inv.status !== "VOID")
          .reduce((sum, inv) => sum + parseFloat(inv.amountDue.toString()), 0);
        
        const overdueAmount = clientInvoices
          .filter(inv => inv.status === "OVERDUE")
          .reduce((sum, inv) => sum + parseFloat(inv.amountDue.toString()), 0);
        
        const openInvoiceCount = clientInvoices
          .filter(inv => inv.status !== "PAID" && inv.status !== "VOID")
          .length;
        
        return {
          summary: {
            totalOutstanding,
            overdueAmount,
            openInvoiceCount,
          },
          invoices: clientInvoices,
        };
      }),
  }),

  // ============================================================================
  // ACCOUNTS PAYABLE
  // ============================================================================
  
  ap: router({
    getBills: publicProcedure
      .input(z.object({
        clientId: z.number(),
        search: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { clientId, search, status } = input;
        
        // Build query conditions
        let conditions = [eq(bills.vendorId, clientId)];
        
        if (search) {
          conditions.push(like(bills.billNumber, `%${search}%`));
        }
        
        if (status) {
          conditions.push(eq(bills.status, status as any));
        }
        
        // Fetch bills
        const clientBills = await db
          .select()
          .from(bills)
          .where(and(...conditions))
          .orderBy(desc(bills.billDate));
        
        // Calculate summary
        const totalOwed = clientBills
          .filter(bill => bill.status !== "PAID" && bill.status !== "VOID")
          .reduce((sum, bill) => sum + parseFloat(bill.amountDue.toString()), 0);
        
        const overdueAmount = clientBills
          .filter(bill => bill.status === "OVERDUE")
          .reduce((sum, bill) => sum + parseFloat(bill.amountDue.toString()), 0);
        
        const openBillCount = clientBills
          .filter(bill => bill.status !== "PAID" && bill.status !== "VOID")
          .length;
        
        return {
          summary: {
            totalOwed,
            overdueAmount,
            openBillCount,
          },
          bills: clientBills,
        };
      }),
  }),

  // ============================================================================
  // TRANSACTION HISTORY
  // ============================================================================
  
  transactions: router({
    getHistory: publicProcedure
      .input(z.object({
        clientId: z.number(),
        search: z.string().optional(),
        type: z.string().optional(),
        status: z.string().optional(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { clientId, search, type, status } = input;
        
        // Build query conditions
        let conditions = [eq(clientTransactions.clientId, clientId)];
        
        if (search) {
          conditions.push(like(clientTransactions.transactionNumber, `%${search}%`));
        }
        
        if (type) {
          conditions.push(eq(clientTransactions.transactionType, type as any));
        }
        
        if (status) {
          conditions.push(eq(clientTransactions.paymentStatus, status as any));
        }
        
        // Fetch transactions
        const txList = await db
          .select()
          .from(clientTransactions)
          .where(and(...conditions))
          .orderBy(desc(clientTransactions.transactionDate))
          .limit(100);
        
        // Calculate summary
        const totalCount = txList.length;
        const totalValue = txList.reduce(
          (sum, tx) => sum + parseFloat(tx.amount.toString()), 
          0
        );
        const lastTransactionDate = txList.length > 0 
          ? txList[0].transactionDate 
          : null;
        
        return {
          summary: {
            totalCount,
            totalValue,
            lastTransactionDate,
          },
          transactions: txList,
        };
      }),
  }),

  // ============================================================================
  // MARKETPLACE - NEEDS
  // ============================================================================
  
  marketplace: router({
    // Get client needs
    getNeeds: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const needs = await db
          .select()
          .from(clientNeeds)
          .where(eq(clientNeeds.clientId, input.clientId))
          .orderBy(desc(clientNeeds.createdAt));

        return needs;
      }),

    // Create client need
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    createNeed: vipPortalProcedure
      .input(z.object({
        strain: z.string().optional(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
        expiresInDays: z.number().default(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get clientId from verified VIP portal session (not from input)
        const clientId = ctx.clientId;
        
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

        const [result] = await db.insert(clientNeeds).values({
          clientId,
          strain: input.strain,
          category: input.category,
          quantityMin: input.quantity?.toString(),
          quantityMax: input.quantity?.toString(),
          priceMax: input.priceMax?.toString(),
          notes: input.notes,
          expiresAt: expiresAt,
          status: "ACTIVE",
          priority: "MEDIUM",
          createdBy: clientId, // Use clientId for actor attribution
        });

        return { needId: Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0 };
      }),

    // Update client need
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    updateNeed: vipPortalProcedure
      .input(z.object({
        id: z.number(),
        strain: z.string().optional(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get clientId from verified VIP portal session (not from input)
        const clientId = ctx.clientId;
        const { id, ...updateData } = input;

        await db.update(clientNeeds)
          .set({
            strain: updateData.strain,
            category: updateData.category,
            quantityMin: updateData.quantity?.toString(),
            quantityMax: updateData.quantity?.toString(),
            priceMax: updateData.priceMax?.toString(),
            notes: updateData.notes,
          })
          .where(and(
            eq(clientNeeds.id, id),
            eq(clientNeeds.clientId, clientId)
          ));

        return { success: true };
      }),

    // Cancel client need
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    cancelNeed: vipPortalProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Get clientId from verified VIP portal session (not from input)
        const clientId = ctx.clientId;
        
        await db.update(clientNeeds)
          .set({ status: "CANCELLED" })
          .where(and(
            eq(clientNeeds.id, input.id),
            eq(clientNeeds.clientId, clientId)
          ));

        return { success: true };
      }),

    // Get client supply listings
    getSupply: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // For now, returning empty array as vendorSupply uses vendorId
        // In production, this would require a schema update or junction table
        // to link clients to their supply listings
        return [];
      }),

    // Create supply listing
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    createSupply: vipPortalProcedure
      .input(z.object({
        strain: z.string(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
        expiresInDays: z.number().default(5),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // clientId available from ctx.clientId via vipPortalProcedure
        // TODO: Implement supply creation when schema is updated
        return { supplyId: 0 };
      }),

    // Update supply listing
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    updateSupply: vipPortalProcedure
      .input(z.object({
        id: z.number(),
        strain: z.string(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // clientId available from ctx.clientId via vipPortalProcedure
        // TODO: Implement supply update when schema is updated
        return { success: true };
      }),

    // Cancel supply listing
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    cancelSupply: vipPortalProcedure
      .input(z.object({
        id: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // clientId available from ctx.clientId via vipPortalProcedure
        // TODO: Implement supply cancellation when schema is updated
        return { success: true };
      }),
  }),

  // ============================================================================
  // LEADERBOARD
  // ============================================================================
  
  leaderboard: router({
    // Get leaderboard data for client
    getLeaderboard: publicProcedure
      .input(z.object({
        clientId: z.number(),
      }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // Get client's VIP portal configuration
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        // Read leaderboard settings from featuresConfig JSON (not from non-existent columns)
        const leaderboardConfig = config?.featuresConfig?.leaderboard;
        const isLeaderboardEnabled = leaderboardConfig?.enabled ?? false;

        if (!config || !isLeaderboardEnabled) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Leaderboard not enabled for this client",
          });
        }

        const leaderboardType = (leaderboardConfig?.type || 'ytd_spend') as 'ytd_spend' | 'payment_speed' | 'order_frequency' | 'credit_utilization' | 'ontime_payment_rate';
        const displayMode = (leaderboardConfig?.displayMode || 'blackbox') as 'blackbox' | 'transparent';
        const showSuggestions = leaderboardConfig?.showSuggestions ?? true;
        const minimumClients = leaderboardConfig?.minimumClients ?? 5;

        // Get all VIP clients
        const vipClients = await db.query.clients.findMany({
          where: eq(clients.vipPortalEnabled, true),
        });

        if (vipClients.length < minimumClients) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Leaderboard requires at least ${minimumClients} VIP clients`,
          });
        }

        // Calculate metrics for each client
        const clientMetrics = await Promise.all(
          vipClients.map(async (client) => {
            let metricValue = 0;

            switch (leaderboardType) {
              case 'ytd_spend': {
                // Calculate YTD spend from invoices
                const ytdStart = new Date(new Date().getFullYear(), 0, 1);
                const result = await db
                  .select({ total: sql<number>`COALESCE(SUM(${invoices.totalAmount}), 0)` })
                  .from(invoices)
                  .where(
                    and(
                      eq(invoices.customerId, client.id),
                      gte(invoices.invoiceDate, ytdStart)
                    )
                  );
                metricValue = result[0]?.total || 0;
                break;
              }

              case 'payment_speed': {
                // Calculate average days to pay
                const result = await db
                  .select({
                    avgDays: sql<number>`AVG(JULIANDAY(${clientTransactions.paymentDate}) - JULIANDAY(${clientTransactions.transactionDate}))`
                  })
                  .from(clientTransactions)
                  .where(
                    and(
                      eq(clientTransactions.clientId, client.id),
                      eq(clientTransactions.transactionType, 'PAYMENT'),
                      sql`${clientTransactions.paymentDate} IS NOT NULL`
                    )
                  );
                metricValue = result[0]?.avgDays || 0;
                break;
              }

              case 'order_frequency': {
                // Count orders in last 90 days
                const ninetyDaysAgo = new Date();
                ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
                const result = await db
                  .select({ count: sql<number>`COUNT(*)` })
                  .from(invoices)
                  .where(
                    and(
                      eq(invoices.customerId, client.id),
                      gte(invoices.invoiceDate, ninetyDaysAgo)
                    )
                  );
                metricValue = result[0]?.count || 0;
                break;
              }

              case 'credit_utilization': {
                // Calculate credit utilization percentage
                // Note: creditLimit field doesn't exist in schema yet
                // Using totalOwed as current exposure, but no credit limit to compare against
                // TODO: Add creditLimit field to clients table schema
                const currentExposure = Number(client.totalOwed) || 0;
                // For now, return 0 since we don't have a credit limit to calculate against
                metricValue = 0;
                break;
              }

              case 'ontime_payment_rate': {
                // Calculate on-time payment rate
                // Note: dueDate field doesn't exist in client_transactions schema yet
                // TODO: Add dueDate field or use transaction_date + payment_terms to calculate
                const totalPayments = await db
                  .select({ count: sql<number>`COUNT(*)` })
                  .from(clientTransactions)
                  .where(
                    and(
                      eq(clientTransactions.clientId, client.id),
                      eq(clientTransactions.transactionType, 'PAYMENT')
                    )
                  );

                // For now, assume all payments are on-time since we don't have dueDate
                const total = totalPayments[0]?.count || 0;
                metricValue = total > 0 ? 100 : 0;
                break;
              }
            }

            return {
              clientId: client.id,
              metricValue,
            };
          })
        );

        // Sort by metric value (higher is better for most, except payment_speed)
        const sortedMetrics = clientMetrics.sort((a, b) => {
          if (leaderboardType === 'payment_speed') {
            return a.metricValue - b.metricValue; // Lower is better
          }
          return b.metricValue - a.metricValue; // Higher is better
        });

        // Assign ranks
        const rankedClients = sortedMetrics.map((metric, index) => ({
          ...metric,
          rank: index + 1,
        }));

        // Find current client's rank
        const clientRank = rankedClients.find(r => r.clientId === input.clientId);
        if (!clientRank) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Client not found in leaderboard",
          });
        }

        // Get entries to display (top 3, client's position, and surrounding ranks)
        const entriesToShow = new Set<number>();
        
        // Add top 3
        entriesToShow.add(1);
        entriesToShow.add(2);
        entriesToShow.add(3);
        
        // Add client's rank and surrounding
        entriesToShow.add(clientRank.rank);
        if (clientRank.rank > 1) entriesToShow.add(clientRank.rank - 1);
        if (clientRank.rank < rankedClients.length) entriesToShow.add(clientRank.rank + 1);
        
        // Add last place
        entriesToShow.add(rankedClients.length);

        const entries = rankedClients
          .filter(r => entriesToShow.has(r.rank))
          .map(r => ({
            rank: r.rank,
            clientId: r.clientId,
            metricValue: r.metricValue,
            isCurrentClient: r.clientId === input.clientId,
          }));

        // Generate suggestions using the recommendations engine
        const { generateLeaderboardRecommendations } = await import('../lib/leaderboardRecommendations');
        const recommendations = generateLeaderboardRecommendations(
          {
            leaderboardType,
            displayMode,
            clientRank: clientRank.rank,
            totalClients: rankedClients.length,
            clientMetricValue: clientRank.metricValue,
            entries,
          },
          showSuggestions
        );

        return {
          leaderboardType,
          displayMode,
          clientRank: clientRank.rank,
          totalClients: rankedClients.length,
          entries,
          suggestions: recommendations.suggestions,
          lastUpdated: new Date().toISOString(),
        };
      }),
  }),

  // ============================================================================
  // LIVE CATALOG (CLIENT-FACING)
  // ============================================================================
  
  liveCatalog: router({
    // Get catalog with filters
    get: publicProcedure
      .input(z.object({
        category: z.string().optional(),
        brand: z.array(z.string()).optional(),
        grade: z.array(z.string()).optional(),
        stockLevel: z.enum(['all', 'in_stock', 'low_stock']).optional(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'price', 'category', 'date']).optional(),
        sortOrder: z.enum(['asc', 'desc']).optional(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
      }))
      .query(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.vipPortalClientId;
        if (!clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }
        
        // Get client configuration
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, clientId),
        });
        
        // If Live Catalog is disabled, return empty
        if (!config || !config.moduleLiveCatalogEnabled) {
          return {
            items: [],
            total: 0,
            appliedFilters: input,
          };
        }
        
        // Get catalog using service
        const result = await liveCatalogService.getCatalog(clientId, input);
        
        return {
          items: result.items,
          total: result.total,
          appliedFilters: input,
        };
      }),
    
    // Get filter options
    getFilterOptions: publicProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.vipPortalClientId;
        if (!clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }
        
        // Get filter options using service
        return await liveCatalogService.getFilterOptions(clientId);
      }),
    
    // Get draft interests
    getDraftInterests: publicProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new Error("Database not available");
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        const clientId = ctx.vipPortalClientId;
        if (!clientId) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Not authenticated",
          });
        }
        
        const drafts = await db.query.clientDraftInterests.findMany({
          where: eq(clientDraftInterests.clientId, clientId),
        });
        
        if (drafts.length === 0) {
          return {
            items: [],
            totalItems: 0,
            totalValue: '0.00',
            hasChanges: false,
          };
        }
        
        // Get batch details
        const batchIds = drafts.map(d => d.batchId);
        const batchesData = await db
          .select({
            batch: batches,
            product: products,
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .where(inArray(batches.id, batchIds));
        
        // Get client pricing
        const clientRules = await pricingEngine.getClientPricingRules(clientId);
        
        // Calculate current prices
        const inventoryItems = batchesData.map(({ batch, product }) => ({
          id: batch.id,
          name: batch.sku || `Batch #${batch.id}`,
          category: product?.category,
          subcategory: product?.subcategory ?? undefined,
          strain: undefined,
          basePrice: parseFloat(batch.unitCogs || '0'),
          quantity: parseFloat(batch.onHandQty || '0'),
          grade: batch.grade || undefined,
          vendor: undefined,
        }));
        
        let pricedItems;
        try {
          pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);
        } catch (error) {
          pricedItems = inventoryItems.map(item => ({
            ...item,
            retailPrice: item.basePrice,
            priceMarkup: 0,
            appliedRules: [],
          }));
        }
        
        // Build items with change detection
        const items = drafts.map(draft => {
          const pricedItem = pricedItems.find(p => p.id === draft.batchId);
          const batchData = batchesData.find(b => b.batch.id === draft.batchId);
          
          if (!pricedItem || !batchData) {
            return null;
          }
          
          const currentPrice = pricedItem.retailPrice;
          const currentQuantity = pricedItem.quantity ?? 0;
          const stillAvailable = currentQuantity > 0;
          
          // For simplicity, assume no price/quantity at add time (no historical tracking yet)
          // In production, you'd store these values when adding to draft
          const priceChanged = false;
          const quantityChanged = false;
          
          return {
            id: draft.id,
            batchId: draft.batchId,
            itemName: pricedItem.name,
            category: pricedItem.category,
            subcategory: pricedItem.subcategory,
            retailPrice: currentPrice.toFixed(2),
            quantity: currentQuantity.toFixed(2),
            addedAt: draft.addedAt,
            priceChanged,
            priceAtAdd: undefined,
            quantityChanged,
            quantityAtAdd: undefined,
            stillAvailable,
          };
        }).filter(item => item !== null);
        
        const totalValue = items.reduce((sum, item) => sum + parseFloat(item.retailPrice), 0);
        const hasChanges = items.some(item => item.priceChanged || item.quantityChanged || !item.stillAvailable);
        
        return {
          items,
          totalItems: items.length,
          totalValue: totalValue.toFixed(2),
          hasChanges,
        };
      }),
    
    // Add to draft
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    addToDraft: vipPortalProcedure
      .input(z.object({
        batchId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        // Check if batch exists
        const batch = await db.query.batches.findFirst({
          where: eq(batches.id, input.batchId),
        });
        
        if (!batch) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Batch not found",
          });
        }
        
        // Check if already in draft
        const existing = await db.query.clientDraftInterests.findFirst({
          where: and(
            eq(clientDraftInterests.clientId, clientId),
            eq(clientDraftInterests.batchId, input.batchId)
          ),
        });
        
        if (existing) {
          return {
            success: true,
            draftId: existing.id,
          };
        }
        
        // Add to draft
        const result = await db.insert(clientDraftInterests).values({
          clientId,
          batchId: input.batchId,
        });
        
        return {
          success: true,
          draftId: Number(Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0),
        };
      }),
    
    // Remove from draft
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    removeFromDraft: vipPortalProcedure
      .input(z.object({
        draftId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        // Check if draft exists and belongs to client
        const draft = await db.query.clientDraftInterests.findFirst({
          where: eq(clientDraftInterests.id, input.draftId),
        });
        
        if (!draft) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Draft item not found",
          });
        }
        
        if (draft.clientId !== clientId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "Draft item belongs to a different client",
          });
        }
        
        await db.delete(clientDraftInterests).where(eq(clientDraftInterests.id, input.draftId));
        
        return { success: true };
      }),
    
    // Clear draft
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    clearDraft: vipPortalProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        const result = await db.delete(clientDraftInterests).where(eq(clientDraftInterests.clientId, clientId));
        
        return {
          success: true,
          itemsCleared: Array.isArray(result) ? (result[0] as { affectedRows?: number })?.affectedRows ?? 0 : 0 || 0,
        };
      }),
    
    // Submit interest list
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    submitInterestList: vipPortalProcedure
      .mutation(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;
        
        // Get draft items
        const drafts = await db.query.clientDraftInterests.findMany({
          where: eq(clientDraftInterests.clientId, clientId),
        });
        
        if (drafts.length === 0) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Draft is empty",
          });
        }
        
        // Get batch details and calculate prices
        const batchIds = drafts.map(d => d.batchId);
        const batchesData = await db
          .select({
            batch: batches,
            product: products,
          })
          .from(batches)
          .leftJoin(products, eq(batches.productId, products.id))
          .where(inArray(batches.id, batchIds));
        
        // Get client pricing
        const clientRules = await pricingEngine.getClientPricingRules(clientId);
        
        // Calculate current prices
        const inventoryItems = batchesData.map(({ batch, product }) => ({
          id: batch.id,
          name: batch.sku || `Batch #${batch.id}`,
          category: product?.category,
          subcategory: product?.subcategory ?? undefined,
          strain: undefined,
          basePrice: parseFloat(batch.unitCogs || '0'),
          quantity: parseFloat(batch.onHandQty || '0'),
          grade: batch.grade || undefined,
          vendor: undefined,
        }));
        
        let pricedItems;
        try {
          pricedItems = await pricingEngine.calculateRetailPrices(inventoryItems, clientRules);
        } catch (error) {
          pricedItems = inventoryItems.map(item => ({
            ...item,
            retailPrice: item.basePrice,
            priceMarkup: 0,
            appliedRules: [],
          }));
        }
        
        // Calculate totals
        const totalValue = pricedItems.reduce((sum, item) => sum + item.retailPrice, 0);
        
        // Use transaction to create interest list and items
        const result = await db.transaction(async (tx) => {
          // Create interest list
          const listResult = await tx.insert(clientInterestLists).values({
            clientId,
            status: 'NEW',
            totalItems: drafts.length,
            totalValue: totalValue.toFixed(2),
          });
          
          const interestListId = Number((listResult as unknown as { insertId: number }).insertId);
          
          // Create interest list items
          const itemsToInsert = drafts.map(draft => {
            const pricedItem = pricedItems.find(p => p.id === draft.batchId);
            const batchData = batchesData.find(b => b.batch.id === draft.batchId);
            
            if (!pricedItem || !batchData) {
              throw new Error(`Batch ${draft.batchId} not found`);
            }
            
            return {
              interestListId,
              batchId: draft.batchId,
              itemName: pricedItem.name,
              category: pricedItem.category || null,
              subcategory: pricedItem.subcategory || null,
              priceAtInterest: pricedItem.retailPrice.toFixed(2),
              quantityAtInterest: (pricedItem.quantity ?? 0).toFixed(2),
            };
          });
          
          await tx.insert(clientInterestListItems).values(itemsToInsert);
          
          // Clear draft
          await tx.delete(clientDraftInterests).where(eq(clientDraftInterests.clientId, clientId));
          
          return {
            interestListId,
            totalItems: drafts.length,
            totalValue: totalValue.toFixed(2),
          };
        });
        
        return {
          success: true,
          ...result,
        };
      }),
    
    // Saved views
    views: router({
      // List saved views
      list: publicProcedure
        .query(async ({ ctx }) => {
          const db = await getDb();
        if (!db) throw new Error("Database not available");
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          const clientId = ctx.vipPortalClientId;
          if (!clientId) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Not authenticated",
            });
          }
          
          const views = await db.query.clientCatalogViews.findMany({
            where: eq(clientCatalogViews.clientId, clientId),
            orderBy: (clientCatalogViews, { desc }) => [desc(clientCatalogViews.createdAt)],
          });
          
          return { views };
        }),
      
      // Save a view
      // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
      save: vipPortalProcedure
        .input(z.object({
          name: z.string().min(1).max(100),
          filters: z.object({
            category: z.string().optional().nullable(),
            brand: z.array(z.string()).optional(),
            grade: z.array(z.string()).optional(),
            stockLevel: z.enum(['all', 'in_stock', 'low_stock']).optional(),
            priceMin: z.number().optional(),
            priceMax: z.number().optional(),
            search: z.string().optional(),
          }),
        }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;
          
          // Check if name already exists
          const existing = await db.query.clientCatalogViews.findFirst({
            where: and(
              eq(clientCatalogViews.clientId, clientId),
              eq(clientCatalogViews.name, input.name)
            ),
          });
          
          if (existing) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A view with this name already exists",
            });
          }
          
          const result = await db.insert(clientCatalogViews).values({
            clientId,
            name: input.name,
            filters: input.filters,
          });
          
          return {
            success: true,
            viewId: Number(Array.isArray(result) ? (result[0] as { insertId?: number })?.insertId ?? 0 : 0),
          };
        }),
      
      // Delete a view
      // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
      delete: vipPortalProcedure
        .input(z.object({
          viewId: z.number(),
        }))
        .mutation(async ({ input, ctx }) => {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
          
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;
          
          // Check if view exists and belongs to client
          const view = await db.query.clientCatalogViews.findFirst({
            where: eq(clientCatalogViews.id, input.viewId),
          });
          
          if (!view) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "View not found",
            });
          }
          
          if (view.clientId !== clientId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "View belongs to a different client",
            });
          }
          
          await db.delete(clientCatalogViews).where(eq(clientCatalogViews.id, input.viewId));
          
          return { success: true };
        }),
    }),

    // ============================================================================
    // PRICE ALERTS
    // Updated to use vipPortalProcedure for proper session verification (Task 21.2)
    // ============================================================================
    priceAlerts: router({
      // Get all active price alerts for the client
      list: vipPortalProcedure.query(async ({ ctx }) => {
        // clientId is guaranteed by vipPortalProcedure
        const clientId = ctx.clientId;

        const alerts = await priceAlertsService.getClientPriceAlerts(clientId);
        return alerts;
      }),

      // Create a new price alert
      create: vipPortalProcedure
        .input(
          z.object({
            batchId: z.number(),
            targetPrice: z.number().positive(),
          })
        )
        .mutation(async ({ ctx, input }) => {
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;

          const result = await priceAlertsService.createPriceAlert(
            clientId,
            input.batchId,
            input.targetPrice
          );

          if (!result.success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: result.message || "Failed to create price alert",
            });
          }

          return result;
        }),

      // Deactivate a price alert
      deactivate: vipPortalProcedure
        .input(z.object({ alertId: z.number() }))
        .mutation(async ({ ctx, input }) => {
          // clientId is guaranteed by vipPortalProcedure
          const clientId = ctx.clientId;

          const result = await priceAlertsService.deactivatePriceAlert(
            input.alertId,
            clientId
          );

          if (!result.success) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: result.message || "Failed to deactivate price alert",
            });
          }

          return result;
        }),
    }),
  }),
});
