import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import * as clientsDb from "../clientsDb";
import * as transactionsDb from "../transactionsDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const clientsRouter = router({
  // List clients with pagination and filters
  list: protectedProcedure.use(requirePermission("clients:read"))
    .input(z.object({
      limit: z.number().optional().default(50),
      offset: z.number().optional().default(0),
      search: z.string().optional(),
      clientTypes: z.array(z.enum(["buyer", "seller", "brand", "referee", "contractor"])).optional(),
      tags: z.array(z.string()).optional(),
      hasDebt: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return await clientsDb.getClients(input);
    }),

  // Get total count for pagination
  count: protectedProcedure.use(requirePermission("clients:read"))
    .input(z.object({
      search: z.string().optional(),
      clientTypes: z.array(z.enum(["buyer", "seller", "brand", "referee", "contractor"])).optional(),
      tags: z.array(z.string()).optional(),
      hasDebt: z.boolean().optional(),
    }))
    .query(async ({ input }) => {
      return await clientsDb.getClientCount(input);
    }),

  // Get single client by ID
  getById: protectedProcedure.use(requirePermission("clients:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await clientsDb.getClientById(input.clientId);
    }),

  // Get client by TERI code
  getByTeriCode: protectedProcedure.use(requirePermission("clients:read"))
    .input(z.object({ teriCode: z.string() }))
    .query(async ({ input }) => {
      return await clientsDb.getClientByTeriCode(input.teriCode);
    }),

  // Check if a TERI code is available (for real-time validation)
  // BLOCK-001: Added for proactive duplicate detection
  checkTeriCodeAvailable: protectedProcedure.use(requirePermission("clients:read"))
    .input(z.object({
      teriCode: z.string().min(1).max(50),
      excludeClientId: z.number().optional(), // For edit mode - exclude current client
    }))
    .query(async ({ input }) => {
      const existing = await clientsDb.getClientByTeriCode(input.teriCode);
      // If no existing client, code is available
      if (!existing) {
        return { available: true, message: null };
      }
      // If editing and the found client is the same as excludeClientId, it's available
      if (input.excludeClientId && existing.id === input.excludeClientId) {
        return { available: true, message: null };
      }
      // Otherwise, code is taken
      // MEDIUM-006 FIX: Don't disclose existing client name for security
      return {
        available: false,
        message: `TERI code "${input.teriCode}" is already in use.`,
      };
    }),

  // Create new client
  // BLOCK-001: Enhanced error handling for duplicate TERI codes
  create: protectedProcedure.use(requirePermission("clients:create"))
    .input(z.object({
      teriCode: z.string().min(1).max(50),
      name: z.string().min(1).max(255),
      email: z.string().email().optional(),
      phone: z.string().max(50).optional(),
      address: z.string().optional(),
      isBuyer: z.boolean().optional(),
      isSeller: z.boolean().optional(),
      isBrand: z.boolean().optional(),
      isReferee: z.boolean().optional(),
      isContractor: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    }))
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
        // Handle duplicate TERI code error with user-friendly message
        if (error instanceof Error && error.message.includes("TERI code already exists")) {
          throw new TRPCError({
            code: "CONFLICT",
            message: `A client with TERI code "${input.teriCode}" already exists. Please use a different code.`,
            cause: error,
          });
        }
        // Re-throw other errors
        throw error;
      }
    }),

  // Update client
  update: protectedProcedure.use(requirePermission("clients:update"))
    .input(z.object({
      clientId: z.number(),
      name: z.string().min(1).max(255).optional(),
      email: z.string().email().optional(),
      phone: z.string().max(50).optional(),
      address: z.string().optional(),
      isBuyer: z.boolean().optional(),
      isSeller: z.boolean().optional(),
      isBrand: z.boolean().optional(),
      isReferee: z.boolean().optional(),
      isContractor: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { clientId, ...data } = input;
      return await clientsDb.updateClient(clientId, ctx.user.id, data);
    }),

  // Delete client
  delete: protectedProcedure.use(requirePermission("clients:delete"))
    .input(z.object({ clientId: z.number() }))
    .mutation(async ({ input }) => {
      return await clientsDb.deleteClient(input.clientId);
    }),

  // Transactions
  transactions: router({
    list: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        search: z.string().optional(),
        transactionType: z.string().optional(),
        paymentStatus: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
      }))
      .query(async ({ input }) => {
        const { clientId, ...options } = input;
        return await clientsDb.getClientTransactions(clientId, options);
      }),

    getById: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ input }) => {
        return await clientsDb.getTransactionById(input.transactionId);
      }),

    create: protectedProcedure.use(requirePermission("clients:create"))
      .input(z.object({
        clientId: z.number(),
        transactionType: z.enum(["INVOICE", "PAYMENT", "QUOTE", "ORDER", "REFUND", "CREDIT"]),
        transactionNumber: z.string().optional(),
        transactionDate: z.date(),
        amount: z.number(),
        paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"]).optional(),
        paymentDate: z.date().optional(),
        paymentAmount: z.number().optional(),
        notes: z.string().optional(),
        metadata: z.any().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.createTransaction(ctx.user.id, input);
      }),

    update: protectedProcedure.use(requirePermission("clients:update"))
      .input(z.object({
        transactionId: z.number(),
        transactionDate: z.date().optional(),
        amount: z.number().optional(),
        paymentStatus: z.enum(["PAID", "PENDING", "OVERDUE", "PARTIAL"]).optional(),
        paymentDate: z.date().optional(),
        paymentAmount: z.number().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { transactionId, ...data } = input;
        return await clientsDb.updateTransaction(transactionId, ctx.user.id, data);
      }),

    recordPayment: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({
        transactionId: z.number(),
        paymentDate: z.date(),
        paymentAmount: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.recordPayment(
          input.transactionId,
          ctx.user.id,
          input.paymentDate,
          input.paymentAmount
        );
      }),

    delete: protectedProcedure.use(requirePermission("clients:delete"))
      .input(z.object({ transactionId: z.number() }))
      .mutation(async ({ input }) => {
        return await clientsDb.deleteTransaction(input.transactionId);
      }),

    // Link transactions (e.g., refund to original sale)
    linkTransaction: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({
        parentTransactionId: z.number(),
        childTransactionId: z.number(),
        linkType: z.enum(["REFUND_OF", "PAYMENT_FOR", "CREDIT_APPLIED_TO", "CONVERTED_FROM", "PARTIAL_OF", "RELATED_TO"]),
        linkAmount: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await transactionsDb.linkTransactions(
          input.parentTransactionId,
          input.childTransactionId,
          input.linkType,
          ctx.user.id,
          input.linkAmount,
          input.notes
        );
      }),

    // Get transaction with relationships
    getWithRelationships: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({ transactionId: z.number() }))
      .query(async ({ input }) => {
        return await transactionsDb.getTransactionWithRelationships(input.transactionId);
      }),

    // Get transaction history with relationship counts
    getHistory: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        return await transactionsDb.getClientTransactionHistory(input.clientId, input.limit);
      }),
  }),

  // Activity log
  activity: router({
    list: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({
        clientId: z.number(),
        limit: z.number().optional().default(50),
      }))
      .query(async ({ input }) => {
        return await clientsDb.getClientActivity(input.clientId, input.limit);
      }),
  }),

  // Tags
  tags: router({
    getAll: protectedProcedure.use(requirePermission("clients:read"))
      .query(async () => {
        return await clientsDb.getAllTags();
      }),

    add: protectedProcedure.use(requirePermission("clients:create"))
      .input(z.object({
        clientId: z.number(),
        tag: z.string().min(1).max(50),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.addTag(input.clientId, ctx.user.id, input.tag);
      }),

    remove: protectedProcedure.use(requirePermission("clients:delete"))
      .input(z.object({
        clientId: z.number(),
        tag: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.removeTag(input.clientId, ctx.user.id, input.tag);
      }),
  }),

  // Client notes
  notes: router({
    getNoteId: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({ clientId: z.number() }))
      .query(async ({ input }) => {
        return await clientsDb.getClientNoteId(input.clientId);
      }),
    linkNote: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({
        clientId: z.number(),
        noteId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.linkNoteToClient(input.clientId, input.noteId);
      }),
  }),

  // Client communications
  communications: router({
    list: protectedProcedure.use(requirePermission("clients:read"))
      .input(z.object({ 
        clientId: z.number(),
        type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE']).optional(),
      }))
      .query(async ({ input }) => {
        return await clientsDb.getClientCommunications(input.clientId, input.type);
      }),
    
    add: protectedProcedure.use(requirePermission("clients:create"))
      .input(z.object({
        clientId: z.number(),
        type: z.enum(['CALL', 'EMAIL', 'MEETING', 'NOTE']),
        subject: z.string().min(1).max(255),
        notes: z.string().optional(),
        communicatedAt: z.string(), // ISO date string
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await clientsDb.addCommunication({
          ...input,
          loggedBy: ctx.user.id,
        });
      }),
  }),

  // Supplier profile endpoints (for clients with isSeller=true)
  // Part of Canonical Model Unification - replaces vendor profile functionality
  getSupplierProfile: protectedProcedure
    .use(requirePermission("clients:read"))
    .input(z.object({ clientId: z.number() }))
    .query(async ({ input }) => {
      return await clientsDb.getSupplierProfile(input.clientId);
    }),

  updateSupplierProfile: protectedProcedure
    .use(requirePermission("clients:update"))
    .input(z.object({
      clientId: z.number(),
      contactName: z.string().optional(),
      contactEmail: z.string().email().optional().or(z.literal("")),
      contactPhone: z.string().optional(),
      licenseNumber: z.string().optional(),
      taxId: z.string().optional(),
      paymentTerms: z.string().optional(),
      preferredPaymentMethod: z.enum(['CASH', 'CHECK', 'WIRE', 'ACH', 'CREDIT_CARD', 'OTHER']).optional().or(z.literal("")),
      supplierNotes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await clientsDb.updateSupplierProfile(input.clientId, input);
    }),
});

