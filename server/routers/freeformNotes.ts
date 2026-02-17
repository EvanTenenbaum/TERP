import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import * as freeformNotesDb from "../freeformNotesDb";
import { requirePermission } from "../_core/permissionMiddleware";

export const freeformNotesRouter = router({
  // Get all notes for user
  list: protectedProcedure
    .use(requirePermission("notes:read"))
    .input(
      z.object({
        limit: z.number().optional().default(50),
        offset: z.number().optional().default(0),
        includeArchived: z.boolean().optional().default(false),
      })
    )
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
    .use(requirePermission("notes:read"))
    .input(z.object({ noteId: z.number() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.getNoteById(input.noteId, ctx.user.id);
    }),

  // Create new note
  create: protectedProcedure
    .use(requirePermission("notes:create"))
    .input(
      z.object({
        title: z.string().min(1).max(500),
        content: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional(),
        templateType: z.string().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.createNote(ctx.user.id, input);
    }),

  // Update note
  update: protectedProcedure
    .use(requirePermission("notes:update"))
    .input(
      z.object({
        noteId: z.number(),
        title: z.string().min(1).max(500).optional(),
        content: z
          .union([z.string(), z.record(z.string(), z.unknown())])
          .optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      const { noteId, ...data } = input;
      return await freeformNotesDb.updateNote(noteId, ctx.user.id, data);
    }),

  // Delete note
  delete: protectedProcedure
    .use(requirePermission("notes:delete"))
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.deleteNote(input.noteId, ctx.user.id);
    }),

  // Toggle pin
  togglePin: protectedProcedure
    .use(requirePermission("notes:read"))
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.togglePin(input.noteId, ctx.user.id);
    }),

  // Toggle archive
  toggleArchive: protectedProcedure
    .use(requirePermission("notes:read"))
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.toggleArchive(input.noteId, ctx.user.id);
    }),

  // Share note
  share: protectedProcedure
    .use(requirePermission("notes:read"))
    .input(
      z.object({
        noteId: z.number(),
        shareWithUserIds: z.array(z.number()),
      })
    )
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
    .use(requirePermission("notes:update"))
    .input(z.object({ noteId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.updateLastViewed(input.noteId, ctx.user.id);
    }),

  // Search notes
  search: protectedProcedure
    .use(requirePermission("notes:read"))
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().optional().default(20),
      })
    )
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.searchNotes(
        ctx.user.id,
        input.query,
        input.limit
      );
    }),

  // Get notes by template
  getByTemplate: protectedProcedure
    .use(requirePermission("notes:read"))
    .input(z.object({ templateType: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.getNotesByTemplate(
        ctx.user.id,
        input.templateType
      );
    }),

  // Get notes by tag
  getByTag: protectedProcedure
    .use(requirePermission("notes:read"))
    .input(z.object({ tag: z.string() }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) throw new Error("Unauthorized");
      return await freeformNotesDb.getNotesByTag(ctx.user.id, input.tag);
    }),

  // Comments
  comments: router({
    list: protectedProcedure
      .use(requirePermission("notes:read"))
      .input(z.object({ noteId: z.number() }))
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNoteComments(input.noteId, ctx.user.id);
      }),

    add: protectedProcedure
      .use(requirePermission("notes:create"))
      .input(
        z.object({
          noteId: z.number(),
          content: z.string().min(1).max(5000),
          parentCommentId: z.number().optional(),
        })
      )
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
      .use(requirePermission("notes:read"))
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.resolveComment(
          input.commentId,
          ctx.user.id
        );
      }),
  }),

  // Activity log
  activity: router({
    list: protectedProcedure
      .use(requirePermission("notes:read"))
      .input(
        z.object({
          noteId: z.number(),
          limit: z.number().optional().default(50),
        })
      )
      .query(async ({ input, ctx }) => {
        if (!ctx.user) throw new Error("Unauthorized");
        return await freeformNotesDb.getNoteActivity(
          input.noteId,
          ctx.user.id,
          input.limit
        );
      }),
  }),
});
