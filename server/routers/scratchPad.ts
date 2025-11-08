import { z } from "zod";
import { router } from "../_core/trpc";
import * as scratchPadDb from "../scratchPadDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const scratchPadRouter = router({
    // Get user's notes (infinite scroll)
    list: requirePermission("notes:read")
      .input(z.object({
        limit: z.number().optional().default(50),
        cursor: z.number().optional(),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.getUserNotes(ctx.user.id, input.limit, input.cursor);
      }),

    // Create new note
    create: requirePermission("notes:create")
      .input(z.object({
        content: z.string().min(1).max(10000),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.createNote(ctx.user.id, input.content);
      }),

    // Update note content
    update: requirePermission("notes:update")
      .input(z.object({
        noteId: z.number(),
        content: z.string().min(1).max(10000),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.updateNote(input.noteId, ctx.user.id, input.content);
      }),

    // Toggle note completion
    toggleComplete: requirePermission("notes:read")
      .input(z.object({
        noteId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.toggleNoteCompletion(input.noteId, ctx.user.id);
      }),

    // Delete note
    delete: requirePermission("notes:delete")
      .input(z.object({
        noteId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.deleteNote(input.noteId, ctx.user.id);
      }),

    // Get note count
    count: requirePermission("notes:read")
      .query(async ({ ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await scratchPadDb.getNoteCount(ctx.user.id);
      }),
  })
