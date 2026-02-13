/**
 * Freeform Notes Data Access Layer
 * Handles all database operations for advanced rich-text notes
 */

import { eq, and, desc, sql } from "drizzle-orm";
import { getDb } from "./db";
import { 
  freeformNotes, 
  noteComments, 
  noteActivity,
  InsertFreeformNote,
  InsertNoteComment,
  InsertNoteActivity,
  users
} from "../drizzle/schema";

// ============================================================================
// FREEFORM NOTES CRUD
// ============================================================================

/**
 * Get all notes for a user (with pagination)
 */
export async function getUserNotes(
  userId: number,
  limit: number = 50,
  offset: number = 0,
  includeArchived: boolean = false
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const conditions = includeArchived
    ? [eq(freeformNotes.userId, userId)]
    : [eq(freeformNotes.userId, userId), eq(freeformNotes.isArchived, false)];

  const notes = await db
    .select()
    .from(freeformNotes)
    .where(and(...conditions))
    .orderBy(desc(freeformNotes.isPinned), desc(freeformNotes.updatedAt))
    .limit(limit)
    .offset(offset);

  return notes;
}

/**
 * Get a single note by ID (with access check)
 */
export async function getNoteById(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const note = await db
    .select()
    .from(freeformNotes)
    .where(eq(freeformNotes.id, noteId))
    .limit(1);

  if (note.length === 0) return null;

  // Access check: user must be owner or in sharedWith list
  const noteData = note[0];
  const sharedWith = (noteData.sharedWith as number[] | null) || [];
  
  if (noteData.userId !== userId && !sharedWith.includes(userId)) {
    throw new Error("Access denied");
  }

  return noteData;
}

/**
 * Create a new note
 */
export async function createNote(userId: number, data: {
  title: string;
  content?: string | Record<string, unknown> | unknown[];
  templateType?: string;
  tags?: string[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const noteData: InsertFreeformNote = {
    userId,
    title: data.title,
    content: data.content || null,
    templateType: data.templateType || null,
    tags: data.tags || null,
  };

  const result = await db.insert(freeformNotes).values(noteData);
  const noteId = Number(result[0].insertId);

  // Log activity
  await logActivity(noteId, userId, "CREATED", null);

  return noteId;
}

/**
 * Update note content and title
 */
export async function updateNote(
  noteId: number,
  userId: number,
  data: {
    title?: string;
    content?: string | Record<string, unknown> | unknown[];
    tags?: string[];
  }
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Access check
  const note = await getNoteById(noteId, userId);
  if (!note) throw new Error("Note not found or access denied");

  const updateData: { updatedAt: Date; title?: string; content?: string | Record<string, unknown> | unknown[] | null; tags?: string[] | null } = {
    updatedAt: new Date(),
  };

  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.tags !== undefined) updateData.tags = data.tags;

  await db
    .update(freeformNotes)
    .set(updateData)
    .where(eq(freeformNotes.id, noteId));

  // Log activity
  await logActivity(noteId, userId, "UPDATED", null);

  return true;
}

/**
 * Delete a note (only owner can delete)
 */
export async function deleteNote(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Access check: only owner can delete
  const note = await db
    .select()
    .from(freeformNotes)
    .where(and(eq(freeformNotes.id, noteId), eq(freeformNotes.userId, userId)))
    .limit(1);

  if (note.length === 0) {
    throw new Error("Note not found or you don't have permission to delete");
  }

  await db.delete(freeformNotes).where(eq(freeformNotes.id, noteId));

  return true;
}

/**
 * Toggle pin status
 */
export async function togglePin(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const note = await getNoteById(noteId, userId);
  if (!note) throw new Error("Note not found or access denied");

  const newPinStatus = !note.isPinned;

  await db
    .update(freeformNotes)
    .set({ isPinned: newPinStatus })
    .where(eq(freeformNotes.id, noteId));

  // Log activity
  await logActivity(noteId, userId, newPinStatus ? "PINNED" : "UNPINNED", null);

  return newPinStatus;
}

/**
 * Toggle archive status
 */
export async function toggleArchive(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const note = await getNoteById(noteId, userId);
  if (!note) throw new Error("Note not found or access denied");

  const newArchiveStatus = !note.isArchived;

  await db
    .update(freeformNotes)
    .set({ isArchived: newArchiveStatus })
    .where(eq(freeformNotes.id, noteId));

  // Log activity
  await logActivity(noteId, userId, newArchiveStatus ? "ARCHIVED" : "RESTORED", null);

  return newArchiveStatus;
}

/**
 * Share note with other users
 */
export async function shareNote(
  noteId: number,
  userId: number,
  shareWithUserIds: number[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Access check: only owner can share
  const note = await db
    .select()
    .from(freeformNotes)
    .where(and(eq(freeformNotes.id, noteId), eq(freeformNotes.userId, userId)))
    .limit(1);

  if (note.length === 0) {
    throw new Error("Note not found or you don't have permission to share");
  }

  await db
    .update(freeformNotes)
    .set({ sharedWith: shareWithUserIds })
    .where(eq(freeformNotes.id, noteId));

  // Log activity
  await logActivity(noteId, userId, "SHARED", { sharedWith: shareWithUserIds });

  return true;
}

/**
 * Update last viewed timestamp
 */
export async function updateLastViewed(noteId: number, _userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(freeformNotes)
    .set({ lastViewedAt: new Date() })
    .where(eq(freeformNotes.id, noteId));

  return true;
}

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * Get all comments for a note
 */
export async function getNoteComments(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Access check
  const note = await getNoteById(noteId, userId);
  if (!note) throw new Error("Note not found or access denied");

  const comments = await db
    .select({
      id: noteComments.id,
      noteId: noteComments.noteId,
      userId: noteComments.userId,
      userName: users.name,
      content: noteComments.content,
      parentCommentId: noteComments.parentCommentId,
      isResolved: noteComments.isResolved,
      createdAt: noteComments.createdAt,
      updatedAt: noteComments.updatedAt,
    })
    .from(noteComments)
    .leftJoin(users, eq(noteComments.userId, users.id))
    .where(eq(noteComments.noteId, noteId))
    .orderBy(noteComments.createdAt);

  return comments;
}

/**
 * Add a comment to a note
 */
export async function addComment(
  noteId: number,
  userId: number,
  content: string,
  parentCommentId?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Access check
  const note = await getNoteById(noteId, userId);
  if (!note) throw new Error("Note not found or access denied");

  const commentData: InsertNoteComment = {
    noteId,
    userId,
    content,
    parentCommentId: parentCommentId || null,
  };

  const result = await db.insert(noteComments).values(commentData);
  const commentId = Number(result[0].insertId);

  // Log activity
  await logActivity(noteId, userId, "COMMENTED", { commentId });

  return commentId;
}

/**
 * Resolve a comment
 */
export async function resolveComment(commentId: number, _userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(noteComments)
    .set({ isResolved: true })
    .where(eq(noteComments.id, commentId));

  return true;
}

// ============================================================================
// ACTIVITY LOG
// ============================================================================

/**
 * Log an activity
 */
export async function logActivity(
  noteId: number,
  userId: number,
  activityType: "CREATED" | "UPDATED" | "COMMENTED" | "SHARED" | "ARCHIVED" | "RESTORED" | "PINNED" | "UNPINNED" | "TEMPLATE_APPLIED",
  metadata: Record<string, unknown> | null | undefined
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const activityData: InsertNoteActivity = {
    noteId,
    userId,
    activityType,
    metadata: metadata || null,
  };

  await db.insert(noteActivity).values(activityData);

  return true;
}

/**
 * Get activity log for a note
 */
export async function getNoteActivity(noteId: number, userId: number, limit: number = 50) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Access check
  const note = await getNoteById(noteId, userId);
  if (!note) throw new Error("Note not found or access denied");

  const activities = await db
    .select({
      id: noteActivity.id,
      noteId: noteActivity.noteId,
      userId: noteActivity.userId,
      userName: users.name,
      activityType: noteActivity.activityType,
      metadata: noteActivity.metadata,
      createdAt: noteActivity.createdAt,
    })
    .from(noteActivity)
    .leftJoin(users, eq(noteActivity.userId, users.id))
    .where(eq(noteActivity.noteId, noteId))
    .orderBy(desc(noteActivity.createdAt))
    .limit(limit);

  return activities;
}

// ============================================================================
// SEARCH & FILTERS
// ============================================================================

/**
 * Search notes by title or content
 */
export async function searchNotes(userId: number, query: string, limit: number = 20) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Search in title (content is JSON, so we'll search title only for now)
  const notes = await db
    .select()
    .from(freeformNotes)
    .where(
      and(
        eq(freeformNotes.userId, userId),
        eq(freeformNotes.isArchived, false),
        sql`${freeformNotes.title} LIKE ${`%${query}%`}`
      )
    )
    .orderBy(desc(freeformNotes.updatedAt))
    .limit(limit);

  return notes;
}

/**
 * Get notes by template type
 */
export async function getNotesByTemplate(userId: number, templateType: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const notes = await db
    .select()
    .from(freeformNotes)
    .where(
      and(
        eq(freeformNotes.userId, userId),
        eq(freeformNotes.isArchived, false),
        eq(freeformNotes.templateType, templateType)
      )
    )
    .orderBy(desc(freeformNotes.updatedAt));

  return notes;
}

/**
 * Get notes by tag
 */
export async function getNotesByTag(userId: number, tag: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // JSON search for tag in tags array
  const notes = await db
    .select()
    .from(freeformNotes)
    .where(
      and(
        eq(freeformNotes.userId, userId),
        eq(freeformNotes.isArchived, false),
        sql`JSON_CONTAINS(${freeformNotes.tags}, ${JSON.stringify([tag])})`
      )
    )
    .orderBy(desc(freeformNotes.updatedAt));

  return notes;
}

