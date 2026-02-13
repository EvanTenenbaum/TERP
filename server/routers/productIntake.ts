import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import * as productIntakeDb from "../productIntakeDb";


export const productIntakeRouter = router({
  // Create new intake session
  createSession: protectedProcedure
    .input(
      z.object({
        vendorId: z.number(),
        receiveDate: z.string(),
        receivedBy: z.number(),
        paymentTerms: z.string(),
        paymentDueDate: z.string().optional(),
        internalNotes: z.string().optional(),
        vendorNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await productIntakeDb.createIntakeSession(input);
    }),

  // Add batch to intake session
  addBatch: protectedProcedure
    .input(
      z.object({
        intakeSessionId: z.number(),
        batchId: z.number(),
        receivedQty: z.number(),
        unitCost: z.number(),
        internalNotes: z.string().optional(),
        vendorNotes: z.string().optional(),
        cogsAgreement: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      return await productIntakeDb.addBatchToIntakeSession(input);
    }),

  // Update batch in intake session
  updateBatch: protectedProcedure
    .input(
      z.object({
        intakeSessionBatchId: z.number(),
        receivedQty: z.number().optional(),
        unitCost: z.number().optional(),
        internalNotes: z.string().optional(),
        vendorNotes: z.string().optional(),
        cogsAgreement: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { intakeSessionBatchId, ...data } = input;
      return await productIntakeDb.updateIntakeSessionBatch(intakeSessionBatchId, data);
    }),

  // Remove batch from intake session
  removeBatch: protectedProcedure
    .input(z.object({ intakeSessionBatchId: z.number() }))
    .mutation(async ({ input }) => {
      return await productIntakeDb.removeBatchFromIntakeSession(input.intakeSessionBatchId);
    }),

  // Complete intake session
  completeSession: protectedProcedure
    .input(z.object({ intakeSessionId: z.number() }))
    .mutation(async ({ input }) => {
      return await productIntakeDb.completeIntakeSession(input.intakeSessionId);
    }),

  // Generate vendor receipt
  generateReceipt: protectedProcedure
    .input(z.object({ intakeSessionId: z.number() }))
    .query(async ({ input }) => {
      return await productIntakeDb.generateVendorReceipt(input.intakeSessionId);
    }),

  // Get intake session details
  getSession: protectedProcedure
    .input(z.object({ intakeSessionId: z.number() }))
    .query(async ({ input }) => {
      return await productIntakeDb.getIntakeSession(input.intakeSessionId);
    }),

  // List intake sessions
  listSessions: protectedProcedure
    .input(
      z
        .object({
          vendorId: z.number().optional(),
          status: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      return await productIntakeDb.listIntakeSessions(input);
    }),

  // Cancel intake session
  cancelSession: protectedProcedure
    .input(z.object({ intakeSessionId: z.number() }))
    .mutation(async ({ input }) => {
      return await productIntakeDb.cancelIntakeSession(input.intakeSessionId);
    }),
});

