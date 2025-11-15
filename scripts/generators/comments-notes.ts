/**
 * Comments and Notes Generator
 *
 * Generates realistic comments and notes across the system:
 * - General comments (on orders, invoices, etc.)
 * - Comment mentions (@user)
 * - Client notes
 * - Vendor notes
 * - Freeform notes
 *
 * Generates 500+ comments/notes spanning 22 months
 */

import { CONFIG } from "./config.js";
import { faker } from "@faker-js/faker";

export interface CommentData {
  id?: number;
  referenceType: string;
  referenceId?: number;
  userId: number;
  comment: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentMentionData {
  id?: number;
  commentId?: number;
  userId: number;
  createdAt: Date;
}

export interface ClientNoteData {
  id?: number;
  clientId: number;
  userId: number;
  note: string;
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorNoteData {
  id?: number;
  vendorId: number;
  userId: number;
  note: string;
  isPinned?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface FreeformNoteData {
  id?: number;
  userId: number;
  title: string;
  content: string;
  tags?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CommentsNotesCascadeResult {
  comments: CommentData[];
  commentMentions: CommentMentionData[];
  clientNotes: ClientNoteData[];
  vendorNotes: VendorNoteData[];
  freeformNotes: FreeformNoteData[];
}

const REFERENCE_TYPES = [
  "ORDER",
  "INVOICE",
  "PAYMENT",
  "BATCH",
  "LOT",
  "PURCHASE_ORDER",
  "EVENT",
];

const NOTE_TEMPLATES = [
  "Great customer, always pays on time",
  "Prefers delivery on Tuesdays",
  "Interested in new strains",
  "Request for bulk discount",
  "Follow up on pending order",
  "Quality concerns addressed",
  "Positive feedback on recent delivery",
  "Requested product samples",
  "Negotiating payment terms",
  "VIP customer - priority service",
];

/**
 * Generate comments and notes
 */
export function generateCommentsNotes(
  clientIds: number[],
  vendorIds: number[],
  orderCount: number,
  startDate: Date = CONFIG.startDate,
  endDate: Date = CONFIG.endDate
): CommentsNotesCascadeResult {
  const comments: CommentData[] = [];
  const commentMentions: CommentMentionData[] = [];
  const clientNotes: ClientNoteData[] = [];
  const vendorNotes: VendorNoteData[] = [];
  const freeformNotes: FreeformNoteData[] = [];

  // Generate 500+ general comments
  const commentCount = 500 + Math.floor(Math.random() * 200);

  for (let i = 0; i < commentCount; i++) {
    const commentDate = new Date(
      startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime())
    );

    const referenceType =
      REFERENCE_TYPES[Math.floor(Math.random() * REFERENCE_TYPES.length)];
    const referenceId = Math.floor(Math.random() * orderCount) + 1;

    const comment: CommentData = {
      referenceType,
      referenceId,
      userId: 1,
      comment: faker.lorem.sentence(),
      createdAt: commentDate,
      updatedAt: commentDate,
    };
    comments.push(comment);

    // 20% of comments have mentions
    if (Math.random() < 0.2) {
      commentMentions.push({
        userId: 1,
        createdAt: commentDate,
      });
    }
  }

  // Generate client notes (2-5 per client)
  for (const clientId of clientIds) {
    const noteCount = 2 + Math.floor(Math.random() * 4);

    for (let i = 0; i < noteCount; i++) {
      const noteDate = new Date(
        startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime())
      );

      const isPinned = i === 0 && Math.random() < 0.2; // First note has 20% chance to be pinned

      clientNotes.push({
        clientId,
        userId: 1,
        note:
          NOTE_TEMPLATES[Math.floor(Math.random() * NOTE_TEMPLATES.length)] ||
          faker.lorem.sentence(),
        isPinned,
        createdAt: noteDate,
        updatedAt: noteDate,
      });
    }
  }

  // Generate vendor notes (2-4 per vendor)
  for (const vendorId of vendorIds) {
    const noteCount = 2 + Math.floor(Math.random() * 3);

    for (let i = 0; i < noteCount; i++) {
      const noteDate = new Date(
        startDate.getTime() +
          Math.random() * (endDate.getTime() - startDate.getTime())
      );

      const isPinned = i === 0 && Math.random() < 0.15; // First note has 15% chance to be pinned

      vendorNotes.push({
        vendorId,
        userId: 1,
        note: faker.helpers.arrayElement([
          "Reliable supplier, consistent quality",
          "Occasional delays in delivery",
          "Excellent pricing on bulk orders",
          "New strains available next month",
          "Prefers ACH payment",
          "Contact for special requests",
        ]),
        isPinned,
        createdAt: noteDate,
        updatedAt: noteDate,
      });
    }
  }

  // Generate freeform notes (50-100 total)
  const freeformCount = 50 + Math.floor(Math.random() * 50);

  for (let i = 0; i < freeformCount; i++) {
    const noteDate = new Date(
      startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime())
    );

    freeformNotes.push({
      userId: 1,
      title: faker.lorem.words(3),
      content: faker.lorem.paragraphs(2),
      tags: faker.helpers.arrayElement([
        "important",
        "todo",
        "idea",
        "meeting",
        "follow-up",
        undefined,
      ]),
      createdAt: noteDate,
      updatedAt: noteDate,
    });
  }

  return {
    comments,
    commentMentions,
    clientNotes,
    vendorNotes,
    freeformNotes,
  };
}
