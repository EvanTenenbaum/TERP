import { z } from "zod";
import { publicProcedure as protectedProcedure, router } from "../_core/trpc";
import * as freeformNotesDb from "../freeformNotesDb";

export const freeformNotesRouter = router({
    // Get all notes for user
    list: protectedProcedure
      .input(z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        includeArchived: z.boolean().optional().default(false),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getUserNotes(
          ctx.user.id,
          input.limit,
          input.offset,
          input.includeArchived
        );
      }),

    // Get single note by ID
    getById: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNoteById(input.noteId, ctx.user.id);
      }),

    // Create new note
    create: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(500),
        content: z.any().optional(),
        templateType: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.createNote(ctx.user.id, input);
      }),

    // Update note
    update: protectedProcedure
      .input(z.object({
        noteId: z.number(),
        title: z.string().min(1).max(500).optional(),
        content: z.any().optional(),
        tags: z.array(z.string()).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        const { noteId, ...data } = input;
        return await freeformNotesDb.updateNote(noteId, ctx.user.id, data);
      }),

    // Delete note
    delete: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.deleteNote(input.noteId, ctx.user.id);
      }),

    // Toggle pin
    togglePin: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.togglePin(input.noteId, ctx.user.id);
      }),

    // Toggle archive
    toggleArchive: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.toggleArchive(input.noteId, ctx.user.id);
      }),

    // Share note
    share: protectedProcedure
      .input(z.object({
        noteId: z.number(),
        shareWithUserIds: z.array(z.number()),
      }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.shareNote(
          input.noteId,
          ctx.user.id,
          input.shareWithUserIds
        );
      }),

    // Update last viewed
    updateLastViewed: protectedProcedure
      .input(z.object({ noteId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.updateLastViewed(input.noteId, ctx.user.id);
      }),

    // Search notes
    search: protectedProcedure
      .input(z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.searchNotes(ctx.user.id, input.query, input.limit);
      }),

    // Get notes by template
    getByTemplate: protectedProcedure
      .input(z.object({ templateType: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNotesByTemplate(ctx.user.id, input.templateType);
      }),

    // Get notes by tag
    getByTag: protectedProcedure
      .input(z.object({ tag: z.string() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNotesByTag(ctx.user.id, input.tag);
      }),

    // Comments
    comments: router({
      list: protectedProcedure
        .input(z.object({ noteId: z.number() }))
        .query(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.getNoteComments(input.noteId, ctx.user.id);
        }),

      add: protectedProcedure
        .input(z.object({
          noteId: z.number(),
          content: z.string().min(1).max(5000),
          parentCommentId: z.number().optional(),
        }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.addComment(
            input.noteId,
            ctx.user.id,
            input.content,
            input.parentCommentId
          );
        }),

      resolve: protectedProcedure
        .input(z.object({ commentId: z.number() }))
        .mutation(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.resolveComment(input.commentId, ctx.user.id);
        }),
    }),

    // Activity log
    activity: router({
      list: protectedProcedure
        .input(z.object({
          noteId: z.number(),
          limit: z.number().optional().default(50),
        }))
        .query(async ({ input, ctx }) => {
          if (!ctx.user) throw new Error("Unauthorized");
          return await freeformNotesDb.getNoteActivity(
            input.noteId,
            ctx.user.id,
            input.limit
          );
        }),
    }),
  })
