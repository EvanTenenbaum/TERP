import { getDb } from "./db";
import { scratchPadNotes } from "../drizzle/schema";
import { eq, desc, and, lt } from "drizzle-orm";

/**
 * Scratch Pad Database Access Layer
 * Handles all database operations for scratch pad notes
 */

/**
 * Get paginated notes for a user (infinite scroll)
 * Returns notes in descending order (newest first in DB, but UI shows newest at bottom)
 */
export async function getUserNotes(
  userId: number,
  limit: number = 50,
  cursor?: number
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const whereConditions = cursor
    ? and(eq(scratchPadNotes.userId, userId), lt(scratchPadNotes.id, cursor))
    : eq(scratchPadNotes.userId, userId);

  const notes = await db
    .select()
    .from(scratchPadNotes)
    .where(whereConditions)
    .orderBy(desc(scratchPadNotes.createdAt))
    .limit(limit);

  return {
    notes,
    nextCursor: notes.length === limit ? notes[notes.length - 1].id : null,
  };
}

/**
 * Create a new note
 */
export async function createNote(userId: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const [note] = await db.insert(scratchPadNotes).values({
    userId,
    content,
    isCompleted: false,
  });

  return note;
}

/**
 * Update note content
 */
export async function updateNote(
  noteId: number,
  userId: number,
  content: string
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .update(scratchPadNotes)
    .set({ content, updatedAt: new Date() })
    .where(
      and(eq(scratchPadNotes.id, noteId), eq(scratchPadNotes.userId, userId))
    );

  return { success: true };
}

/**
 * Toggle note completion status
 */
export async function toggleNoteCompletion(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get current note
  const [note] = await db
    .select()
    .from(scratchPadNotes)
    .where(
      and(eq(scratchPadNotes.id, noteId), eq(scratchPadNotes.userId, userId))
    )
    .limit(1);

  if (!note) {
    throw new Error("Note not found");
  }

  // Toggle completion
  const newCompletedStatus = !note.isCompleted;

  await db
    .update(scratchPadNotes)
    .set({
      isCompleted: newCompletedStatus,
      completedAt: newCompletedStatus ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(
      and(eq(scratchPadNotes.id, noteId), eq(scratchPadNotes.userId, userId))
    );

  return { success: true, isCompleted: newCompletedStatus };
}

/**
 * Delete a note
 */
export async function deleteNote(noteId: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db
    .delete(scratchPadNotes)
    .where(
      and(eq(scratchPadNotes.id, noteId), eq(scratchPadNotes.userId, userId))
    );

  return { success: true };
}

/**
 * Get note count for a user
 */
export async function getNoteCount(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const notes = await db
    .select()
    .from(scratchPadNotes)
    .where(eq(scratchPadNotes.userId, userId));

  return notes.length;
}
