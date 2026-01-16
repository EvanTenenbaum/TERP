/**
 * Crypto Payments Router (MEET-019)
 * Sprint 5 Track D.7: Crypto Payment Tracking
 *
 * Track cryptocurrency payments:
 * - Add crypto payment type (BTC, ETH, etc.)
 * - Wallet address storage
 * - Transaction hash recording
 * - Conversion rate at time of payment
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  protectedProcedure,
  getAuthenticatedUserId,
} from "../_core/trpc";
import { requirePermission } from "../_core/permissionMiddleware";
import { getDb } from "../db";
import { clients, payments } from "../../drizzle/schema";
import {
  cryptoPayments,
  clientCryptoWallets,
} from "../../drizzle/schema-sprint5-trackd";
import { eq, and, sql, isNull, desc } from "drizzle-orm";
import { logger } from "../_core/logger";

// ============================================================================
// Constants
// ============================================================================

const CRYPTO_CURRENCIES = [
  { value: "BTC", label: "Bitcoin", symbol: "BTC" },
  { value: "ETH", label: "Ethereum", symbol: "ETH" },
  { value: "USDT", label: "Tether USD", symbol: "USDT" },
  { value: "USDC", label: "USD Coin", symbol: "USDC" },
  { value: "SOL", label: "Solana", symbol: "SOL" },
  { value: "XRP", label: "Ripple", symbol: "XRP" },
  { value: "OTHER", label: "Other", symbol: "" },
] as const;

type CryptoCurrency = typeof CRYPTO_CURRENCIES[number]["value"];

// ============================================================================
// Input Schemas
// ============================================================================

const recordCryptoPaymentSchema = z.object({
  clientId: z.number(),
  paymentId: z.number().optional(),
  cryptoCurrency: z.enum(["BTC", "ETH", "USDT", "USDC", "SOL", "XRP", "OTHER"]),
  cryptoAmount: z.number().positive(),
  usdAmount: z.number().positive(),
  exchangeRate: z.number().positive(),
  walletAddress: z.string().optional(),
  transactionHash: z.string().optional(),
  networkFee: z.number().optional(),
  paymentDate: z.string(),
  notes: z.string().optional(),
});

const addWalletSchema = z.object({
  clientId: z.number(),
  cryptoCurrency: z.enum(["BTC", "ETH", "USDT", "USDC", "SOL", "XRP", "OTHER"]),
  walletAddress: z.string().min(1),
  walletLabel: z.string().optional(),
  isDefault: z.boolean().default(false),
});

const updateConfirmationSchema = z.object({
  cryptoPaymentId: z.number(),
  confirmations: z.number().min(0),
  isConfirmed: z.boolean(),
  transactionHash: z.string().optional(),
});

// ============================================================================
// Router
// ============================================================================

export const cryptoPaymentsRouter = router({
  /**
   * Get available cryptocurrencies
   */
  getCurrencies: protectedProcedure
    .use(requirePermission("payments:read"))
    .query(async () => {
      return CRYPTO_CURRENCIES;
    }),

  /**
   * Record a crypto payment
   */
  record: protectedProcedure
    .use(requirePermission("payments:create"))
    .input(recordCryptoPaymentSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify client exists
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const result = await db.insert(cryptoPayments).values({
        clientId: input.clientId,
        paymentId: input.paymentId,
        cryptoCurrency: input.cryptoCurrency,
        cryptoAmount: input.cryptoAmount.toFixed(8),
        usdAmount: input.usdAmount.toFixed(2),
        exchangeRate: input.exchangeRate.toFixed(8),
        walletAddress: input.walletAddress,
        transactionHash: input.transactionHash,
        networkFee: input.networkFee?.toFixed(8),
        paymentDate: new Date(input.paymentDate),
        notes: input.notes,
        isConfirmed: !!input.transactionHash, // Auto-confirm if hash provided
        confirmedAt: input.transactionHash ? new Date() : null,
      });

      logger.info({
        msg: "[CryptoPayments] Recorded crypto payment",
        clientId: input.clientId,
        currency: input.cryptoCurrency,
        usdAmount: input.usdAmount,
        cryptoAmount: input.cryptoAmount,
      });

      return {
        id: Number(result[0].insertId),
        cryptoCurrency: input.cryptoCurrency,
        usdAmount: input.usdAmount,
      };
    }),

  /**
   * Get crypto payment by ID
   */
  getById: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [payment] = await db
        .select({
          payment: cryptoPayments,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(cryptoPayments)
        .leftJoin(clients, eq(cryptoPayments.clientId, clients.id))
        .where(eq(cryptoPayments.id, input.id))
        .limit(1);

      if (!payment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Payment not found" });
      }

      return {
        ...payment.payment,
        client: payment.client,
      };
    }),

  /**
   * List crypto payments
   */
  list: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({
      clientId: z.number().optional(),
      cryptoCurrency: z.enum(["BTC", "ETH", "USDT", "USDC", "SOL", "XRP", "OTHER"]).optional(),
      isConfirmed: z.boolean().optional(),
      limit: z.number().min(1).max(100).default(50),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [isNull(cryptoPayments.deletedAt)];

      if (input.clientId) {
        conditions.push(eq(cryptoPayments.clientId, input.clientId));
      }

      if (input.cryptoCurrency) {
        conditions.push(eq(cryptoPayments.cryptoCurrency, input.cryptoCurrency));
      }

      if (input.isConfirmed !== undefined) {
        conditions.push(eq(cryptoPayments.isConfirmed, input.isConfirmed));
      }

      const payments = await db
        .select({
          payment: cryptoPayments,
          client: {
            id: clients.id,
            name: clients.name,
            teriCode: clients.teriCode,
          },
        })
        .from(cryptoPayments)
        .leftJoin(clients, eq(cryptoPayments.clientId, clients.id))
        .where(and(...conditions))
        .orderBy(desc(cryptoPayments.paymentDate))
        .limit(input.limit)
        .offset(input.offset);

      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(cryptoPayments)
        .where(and(...conditions));

      return {
        items: payments.map(p => ({
          ...p.payment,
          client: p.client,
        })),
        total: Number(countResult?.count || 0),
      };
    }),

  /**
   * Update confirmation status
   */
  updateConfirmation: protectedProcedure
    .use(requirePermission("payments:update"))
    .input(updateConfirmationSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const updateData: Record<string, unknown> = {
        confirmations: input.confirmations,
        isConfirmed: input.isConfirmed,
      };

      if (input.isConfirmed) {
        updateData.confirmedAt = new Date();
      }

      if (input.transactionHash) {
        updateData.transactionHash = input.transactionHash;
      }

      await db
        .update(cryptoPayments)
        .set(updateData)
        .where(eq(cryptoPayments.id, input.cryptoPaymentId));

      logger.info({
        msg: "[CryptoPayments] Updated confirmation",
        paymentId: input.cryptoPaymentId,
        confirmations: input.confirmations,
        isConfirmed: input.isConfirmed,
      });

      return { success: true };
    }),

  // ==========================================================================
  // Client Wallets
  // ==========================================================================

  /**
   * Add wallet address for client
   */
  addWallet: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(addWalletSchema)
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verify client exists
      const [client] = await db
        .select({ id: clients.id })
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);

      if (!client) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // If setting as default, unset other defaults for this currency
      if (input.isDefault) {
        await db
          .update(clientCryptoWallets)
          .set({ isDefault: false })
          .where(
            and(
              eq(clientCryptoWallets.clientId, input.clientId),
              eq(clientCryptoWallets.cryptoCurrency, input.cryptoCurrency)
            )
          );
      }

      const result = await db.insert(clientCryptoWallets).values({
        clientId: input.clientId,
        cryptoCurrency: input.cryptoCurrency,
        walletAddress: input.walletAddress,
        walletLabel: input.walletLabel,
        isDefault: input.isDefault,
      });

      return { id: Number(result[0].insertId) };
    }),

  /**
   * Get client wallets
   */
  getClientWallets: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({
      clientId: z.number(),
      cryptoCurrency: z.enum(["BTC", "ETH", "USDT", "USDC", "SOL", "XRP", "OTHER"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [
        eq(clientCryptoWallets.clientId, input.clientId),
        isNull(clientCryptoWallets.deletedAt),
      ];

      if (input.cryptoCurrency) {
        conditions.push(eq(clientCryptoWallets.cryptoCurrency, input.cryptoCurrency));
      }

      const wallets = await db
        .select()
        .from(clientCryptoWallets)
        .where(and(...conditions))
        .orderBy(desc(clientCryptoWallets.isDefault), desc(clientCryptoWallets.createdAt));

      return wallets;
    }),

  /**
   * Remove wallet
   */
  removeWallet: protectedProcedure
    .use(requirePermission("clients:delete"))
    .input(z.object({ walletId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(clientCryptoWallets)
        .set({ deletedAt: new Date() })
        .where(eq(clientCryptoWallets.id, input.walletId));

      return { success: true };
    }),

  /**
   * Verify wallet (mark as verified)
   */
  verifyWallet: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(z.object({
      walletId: z.number(),
      isVerified: z.boolean(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      await db
        .update(clientCryptoWallets)
        .set({ isVerified: input.isVerified })
        .where(eq(clientCryptoWallets.id, input.walletId));

      return { success: true };
    }),

  // ==========================================================================
  // Reports
  // ==========================================================================

  /**
   * Get crypto payment statistics
   */
  getStats: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get totals by currency
      const byCurrency = await db
        .select({
          cryptoCurrency: cryptoPayments.cryptoCurrency,
          totalUsd: sql<string>`SUM(CAST(usd_amount AS DECIMAL(15,2)))`,
          count: sql<number>`COUNT(*)`,
          confirmedCount: sql<number>`SUM(CASE WHEN is_confirmed = 1 THEN 1 ELSE 0 END)`,
        })
        .from(cryptoPayments)
        .where(isNull(cryptoPayments.deletedAt))
        .groupBy(cryptoPayments.cryptoCurrency);

      // Get overall totals
      const [totals] = await db
        .select({
          totalUsd: sql<string>`SUM(CAST(usd_amount AS DECIMAL(15,2)))`,
          totalCount: sql<number>`COUNT(*)`,
          pendingCount: sql<number>`SUM(CASE WHEN is_confirmed = 0 THEN 1 ELSE 0 END)`,
          pendingUsd: sql<string>`SUM(CASE WHEN is_confirmed = 0 THEN CAST(usd_amount AS DECIMAL(15,2)) ELSE 0 END)`,
        })
        .from(cryptoPayments)
        .where(isNull(cryptoPayments.deletedAt));

      return {
        byCurrency: byCurrency.map(c => ({
          currency: c.cryptoCurrency,
          totalUsd: parseFloat(c.totalUsd || "0"),
          count: Number(c.count),
          confirmedCount: Number(c.confirmedCount),
          pendingCount: Number(c.count) - Number(c.confirmedCount),
        })),
        totals: {
          totalUsd: parseFloat(totals?.totalUsd || "0"),
          totalCount: Number(totals?.totalCount || 0),
          pendingCount: Number(totals?.pendingCount || 0),
          pendingUsd: parseFloat(totals?.pendingUsd || "0"),
        },
      };
    }),

  /**
   * Get payment by transaction hash
   */
  getByTransactionHash: protectedProcedure
    .use(requirePermission("payments:read"))
    .input(z.object({ transactionHash: z.string() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [payment] = await db
        .select()
        .from(cryptoPayments)
        .where(eq(cryptoPayments.transactionHash, input.transactionHash))
        .limit(1);

      return payment || null;
    }),
});
