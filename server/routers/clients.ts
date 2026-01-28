import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as clientsDb from "../clientsDb";
import * as transactionsDb from "../transactionsDb";
import { requirePermission } from "../_core/permissionMiddleware";
import { createSafeUnifiedResponse } from "../_core/pagination";

export const clientsRouter = router({
  list: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        search: z.string().optional(),
        clientTypes: z
          .array(z.enum(["buyer", "seller", "brand", "referee", "contractor"]))
          .optional(),
        tags: z.array(z.string()).optional(),
        hasDebt: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const clients = await clientsDb.getClients(ctx.user, input);
      return createSafeUnifiedResponse(clients, -1, input.limit, input.offset);
    }),

  count: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        search: z.string().optional(),
        clientTypes: z
          .array(z.enum(["buyer", "seller", "brand", "referee", "contractor"]))
          .optional(),
        tags: z.array(z.string()).optional(),
        hasDebt: z.boolean().optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      return await clientsDb.getClientCount(ctx.user, input);
    }),

  getById: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await clientsDb.getClientById(input.clientId);
    }),

  getByTeriCode: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({ teriCode: z.string() }))
    .query(async ({ input }) => {
      return await clientsDb.getClientByTeriCode(input.teriCode);
    }),

  checkTeriCodeAvailable: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(
      z.object({
        teriCode: z.string().min(1).max(50),
        excludeClientId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const existing = await clientsDb.getClientByTeriCode(input.teriCode);
      if (!existing) {
        return { available: true, message: null };
      }
      if (input.excludeClientId && existing.id === input.excludeClientId) {
        return { available: true, message: null };
      }
      return {
        available: false,
        message: `TERI code "${input.teriCode}" is already in use.`,
      };
    }),

  create: protectedProcedure
    .use(requirePermission("clients:create"))
    .input(
      z.object({
        teriCode: z.string().min(1).max(50),
        name: z.string().min(1).max(255),
        email: z.string().email().optional(),
        phone: z.string().max(50).optional(),
        address: z.string().optional(),
        businessType: z.enum(["RETAIL", "WHOLESALE", "DISPENSARY", "DELIVERY", "MANUFACTURER", "DISTRIBUTOR", "OTHER"]).optional(),
        preferredContact: z.enum(["EMAIL", "PHONE", "TEXT", "ANY"]).optional(),
        paymentTerms: z.number().int().positive().optional().default(30),
        isBuyer: z.boolean().optional(),
        isSeller: z.boolean().optional(),
        isBrand: z.boolean().optional(),
        isReferee: z.boolean().optional(),
        isContractor: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        wishlist: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Authentication required to create a client.",
        });
      }
      try {
        return await clientsDb.createClient(ctx.user.id, input);
      } catch (error) {
        if (
          error instanceof Error &&
          error.message.includes("TERI code already exists")
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A client with TERI code "${input.teriCode}" already exists. Please use a different code.`,
            cause: error,
          });
        }
        throw error;
      }
    }),

  update: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(
      z.object({
        clientId: z.number(),
        version: z.number().optional(),
        name: z.string().min(1).max(255).optional(),
        email: z.string().email().optional(),
        phone: z.string().max(50).optional(),
        address: z.string().optional(),
        businessType: z.enum(["RETAIL", "WHOLESALE", "DISPENSARY", "DELIVERY", "MANUFACTURER", "DISTRIBUTOR", "OTHER"]).optional(),
        preferredContact: z.enum(["EMAIL", "PHONE", "TEXT", "ANY"]).optional(),
        paymentTerms: z.number().int().positive().optional(),
        isBuyer: z.boolean().optional(),
        isSeller: z.boolean().optional(),
        isBrand: z.boolean().optional(),
        isReferee: z.boolean().optional(),
        isContractor: z.boolean().optional(),
        tags: z.array(z.string()).optional(),
        wishlist: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { clientId, version, ...data } = input;
      return await clientsDb.updateClient(clientId, ctx.user.id, data, version);
    }),

  delete: protectedProcedure
    .use(requirePermission("clients:delete"))
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await clientsDb.deleteClient(input.clientId, ctx.user.id);
    }),

  archive: protectedProcedure
    .use(requirePermission("clients:delete"))
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await clientsDb.deleteClient(input.clientId, ctx.user.id);
    }),

  restore: protectedProcedure
    .use(requirePermission("clients:delete"))
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await clientsDb.restoreClient(input.clientId, ctx.user.id);
    }),

  transactions: router({
    list: protectedProcedure
      .use(requirePermission("clients:read"))
      .input(
        z.object({
          clientId: z.number(),
          limit: z.number().optional().default(50),
          offset: z.number().optional().default(0),
          search: z.string().optional(),
          transactionType: z.string().optional(),
          paymentStatus: z.string().optional(),
          startDate: z.date().optional(),
          endDate: z.date().optional(),
        })
      )
      .query(async ({ input }) => {
        const { clientId, ...options } = input;
        return await clientsDb.getClientTransactions(clientId, options);
      }),

    getById: protectedProcedure
      .use(requirePermission("clients:read"))
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ input }) => {
        return await clientsDb.getTransactionById(input.transactionId);
      }),

    create: protectedProcedure
      .use(requirePermission("clients:create"))
      .input(
        z.object({
          clientId: z.number(),
          transactionType: z.enum([
            "INVOICE",
            "PAYMENT",
            "QUOTE",
            "ORDER",
            "REFUND",
            "CREDIT",
          ]),
          transactionNumber: z.string().optional(),
          transactionDate: z.date(),
          amount: z.number(),
          paymentStatus: z
            .enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"])
            .optional(),
          paymentDate: z.date().optional(),
          paymentAmount: z.number().optional(),
          notes: z.string().optional(),
          metadata: z.record(z.string(), z.unknown()).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.createTransaction(ctx.user.id, input);
      }),

    update: protectedProcedure
      .use(requirePermission("clients:update"))
      .input(
        z.object({
          transactionId: z.number(),
          transactionDate: z.date().optional(),
          amount: z.number().optional(),
          paymentStatus: z
            .enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"])
            .optional(),
          paymentDate: z.date().optional(),
          paymentAmount: z.number().optional(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { transactionId, ...data } = input;
        return await clientsDb.updateTransaction(transactionId, ctx.user.id, data);
      }),
  }),
});
