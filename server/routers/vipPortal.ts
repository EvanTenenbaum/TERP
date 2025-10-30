import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
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
} from "../../drizzle/schema";
import { eq, and, desc, gte, lte, sql, like, or } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { TRPCError } from "@trpc/server";

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
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        if (!config) {
          // Return default configuration
          return {
            moduleArEnabled: true,
            moduleApEnabled: true,
            moduleTransactionHistoryEnabled: true,
            moduleMarketplaceNeedsEnabled: true,
            moduleMarketplaceSupplyEnabled: true,
            moduleCreditCenterEnabled: false,
            moduleVipTierEnabled: false,
            featuresConfig: {},
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
            gte(clientTransactions.transactionDate, ytdStart.toISOString().split('T')[0]),
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
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const needs = await db
          .select()
          .from(clientNeeds)
          .where(eq(clientNeeds.clientId, input.clientId))
          .orderBy(desc(clientNeeds.createdAt));

        return needs;
      }),

    // Create client need
    createNeed: publicProcedure
      .input(z.object({
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
        expiresInDays: z.number().default(5),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);

        const [result] = await db.insert(clientNeeds).values({
          clientId: input.clientId,
          strain: input.strain,
          category: input.category,
          quantityMin: input.quantity,
          quantityMax: input.quantity,
          priceMax: input.priceMax?.toString(),
          notes: input.notes,
          expiresAt: expiresAt.toISOString().split('T')[0],
          status: "ACTIVE",
          priority: "MEDIUM",
          createdBy: 1, // TODO: Get from session
        });

        return { needId: result.insertId };
      }),

    // Update client need
    updateNeed: publicProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number(),
        strain: z.string().optional(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        const { id, clientId, ...updateData } = input;

        await db.update(clientNeeds)
          .set({
            strain: updateData.strain,
            category: updateData.category,
            quantityMin: updateData.quantity,
            quantityMax: updateData.quantity,
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
    cancelNeed: publicProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        await db.update(clientNeeds)
          .set({ status: "CANCELLED" })
          .where(and(
            eq(clientNeeds.id, input.id),
            eq(clientNeeds.clientId, input.clientId)
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
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // For now, returning empty array as vendorSupply uses vendorId
        // In production, this would require a schema update or junction table
        // to link clients to their supply listings
        return [];
      }),

    // Create supply listing
    createSupply: publicProcedure
      .input(z.object({
        clientId: z.number(),
        strain: z.string(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
        expiresInDays: z.number().default(5),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // TODO: Implement supply creation when schema is updated
        return { supplyId: 0 };
      }),

    // Update supply listing
    updateSupply: publicProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number(),
        strain: z.string(),
        category: z.string(),
        quantity: z.number(),
        unit: z.string(),
        priceMin: z.number().optional(),
        priceMax: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // TODO: Implement supply update when schema is updated
        return { success: true };
      }),

    // Cancel supply listing
    cancelSupply: publicProcedure
      .input(z.object({
        id: z.number(),
        clientId: z.number(),
      }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
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
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        // Get client's VIP portal configuration
        const config = await db.query.vipPortalConfigurations.findFirst({
          where: eq(vipPortalConfigurations.clientId, input.clientId),
        });

        if (!config || !config.moduleLeaderboardEnabled) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Leaderboard not enabled for this client",
          });
        }

        const leaderboardType = config.leaderboardType || 'ytd_spend';
        const displayMode = config.leaderboardDisplayMode || 'blackbox';
        const showSuggestions = config.featuresConfig?.leaderboard?.showSuggestions ?? true;

        // Get all VIP clients
        const vipClients = await db.query.clients.findMany({
          where: eq(clients.vipPortalEnabled, true),
        });

        if (vipClients.length < (config.leaderboardMinimumClients || 5)) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Leaderboard requires at least ${config.leaderboardMinimumClients || 5} VIP clients`,
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
                      eq(invoices.clientId, client.id),
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
                      eq(invoices.clientId, client.id),
                      gte(invoices.invoiceDate, ninetyDaysAgo)
                    )
                  );
                metricValue = result[0]?.count || 0;
                break;
              }

              case 'credit_utilization': {
                // Calculate credit utilization percentage
                if (client.creditLimit && client.creditLimit > 0) {
                  const currentBalance = client.currentBalance || 0;
                  metricValue = (currentBalance / client.creditLimit) * 100;
                } else {
                  metricValue = 0;
                }
                break;
              }

              case 'ontime_payment_rate': {
                // Calculate on-time payment rate
                const totalPayments = await db
                  .select({ count: sql<number>`COUNT(*)` })
                  .from(clientTransactions)
                  .where(
                    and(
                      eq(clientTransactions.clientId, client.id),
                      eq(clientTransactions.transactionType, 'PAYMENT')
                    )
                  );

                const ontimePayments = await db
                  .select({ count: sql<number>`COUNT(*)` })
                  .from(clientTransactions)
                  .where(
                    and(
                      eq(clientTransactions.clientId, client.id),
                      eq(clientTransactions.transactionType, 'PAYMENT'),
                      sql`${clientTransactions.paymentDate} <= ${clientTransactions.dueDate}`
                    )
                  );

                const total = totalPayments[0]?.count || 0;
                const ontime = ontimePayments[0]?.count || 0;
                metricValue = total > 0 ? (ontime / total) * 100 : 0;
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
});
