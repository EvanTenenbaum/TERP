/**
 * Calendar Invitations Router
 * Task: QA-044 - Event Invitation Workflow
 * PRODUCTION-READY - No placeholders
 */

import { z } from "zod";
import { adminProcedure, router, protectedProcedure, getAuthenticatedUserId } from "../_core/trpc";
import { getDb } from "../db";
import { calendarLogger } from "../_core/logger";
import {
  calendarEventInvitations,
  calendarInvitationSettings,
  calendarInvitationHistory,
  calendarEventParticipants,
  calendarEvents,

} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import PermissionService from "../_core/permissionService";

/**
 * Check if user should auto-accept invitation based on settings
 */
async function checkAutoAccept(
  userId: number,
  eventId: number,
  organizerId: number
): Promise<{ autoAccept: boolean; reason: string | null }> {
  const db = await getDb();
        if (!db) throw new Error("Database not available");
  if (!db) return { autoAccept: false, reason: null };

  // Get user's invitation settings
  const [settings] = await db
    .select()
    .from(calendarInvitationSettings)
    .where(eq(calendarInvitationSettings.userId, userId))
    .limit(1);

  if (!settings) {
    return { autoAccept: false, reason: null };
  }

  // Check auto-accept all
  if (settings.autoAcceptAll) {
    return { autoAccept: true, reason: "User setting: auto-accept all" };
  }

  // Check auto-accept from specific organizers
  if (
    settings.autoAcceptFromOrganizers &&
    Array.isArray(settings.autoAcceptFromOrganizers) &&
    settings.autoAcceptFromOrganizers.includes(organizerId)
  ) {
    return {
      autoAccept: true,
      reason: "User setting: auto-accept from organizer",
    };
  }

  // Get event details for type/module checks
  const [event] = await db
    .select()
    .from(calendarEvents)
    .where(eq(calendarEvents.id, eventId))
    .limit(1);

  if (!event) {
    return { autoAccept: false, reason: null };
  }

  // Check auto-accept by event type
  if (
    settings.autoAcceptByEventType &&
    Array.isArray(settings.autoAcceptByEventType) &&
    settings.autoAcceptByEventType.includes(event.eventType)
  ) {
    return {
      autoAccept: true,
      reason: `User setting: auto-accept ${event.eventType} events`,
    };
  }

  // Check auto-accept by module
  if (
    settings.autoAcceptByModule &&
    Array.isArray(settings.autoAcceptByModule) &&
    settings.autoAcceptByModule.includes(event.module)
  ) {
    return {
      autoAccept: true,
      reason: `User setting: auto-accept ${event.module} events`,
    };
  }

  return { autoAccept: false, reason: null };
}

/**
 * Create participant record from accepted invitation
 */
async function createParticipantFromInvitation(
  invitationId: number,
  eventId: number,
  userId: number,
  role: string,
  addedBy: number
): Promise<number> {
  const db = await getDb();
        if (!db) throw new Error("Database not available");
  if (!db) throw new Error("Database not available");

  const [participant] = await db
    .insert(calendarEventParticipants)
    .values({
      eventId,
      userId,
      role: role as "ORGANIZER" | "REQUIRED" | "OPTIONAL" | "OBSERVER",
      responseStatus: "ACCEPTED",
      notifyOnCreation: false, // Already notified via invitation
      notifyOnUpdate: true,
      addedBy,
    })
    .$returningId();

  // Link invitation to participant
  await db
    .update(calendarEventInvitations)
    .set({ participantId: participant.id })
    .where(eq(calendarEventInvitations.id, invitationId));

  return participant.id;
}

/**
 * Log invitation action to history
 */
async function logInvitationAction(
  invitationId: number,
  action:
    | "CREATED"
    | "SENT"
    | "ACCEPTED"
    | "DECLINED"
    | "AUTO_ACCEPTED"
    | "CANCELLED"
    | "EXPIRED"
    | "ADMIN_OVERRIDE"
    | "RESENT",
  performedBy: number | null,
  notes?: string,
  metadata?: Record<string, unknown>
) {
  const db = await getDb();
        if (!db) throw new Error("Database not available");
  if (!db) return;

  await db.insert(calendarInvitationHistory).values({
    invitationId,
    action,
    performedBy,
    notes: notes || null,
    metadata: metadata || null,
  });
}

export const calendarInvitationsRouter = router({
  /**
   * Create a draft invitation
   */
  createInvitation: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        inviteeType: z.enum(["USER", "CLIENT", "EXTERNAL"]),
        userId: z.number().optional(),
        clientId: z.number().optional(),
        externalEmail: z.string().email().optional(),
        externalName: z.string().optional(),
        role: z
          .enum(["ORGANIZER", "REQUIRED", "OPTIONAL", "OBSERVER"])
          .default("REQUIRED"),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Check permission to edit event
      const hasPermission = await PermissionService.hasPermission(
        userId,
        input.eventId,
        "EDIT"
      );

      if (!hasPermission) {
        throw new Error("Permission denied: Cannot invite to this event");
      }

      // Validate invitee data based on type
      if (input.inviteeType === "USER" && !input.userId) {
        throw new Error("userId required for USER invitee type");
      }
      if (input.inviteeType === "CLIENT" && !input.clientId) {
        throw new Error("clientId required for CLIENT invitee type");
      }
      if (input.inviteeType === "EXTERNAL" && !input.externalEmail) {
        throw new Error("externalEmail required for EXTERNAL invitee type");
      }

      // Check for duplicate invitation
      const existing = await db
        .select()
        .from(calendarEventInvitations)
        .where(
          and(
            eq(calendarEventInvitations.eventId, input.eventId),
            eq(calendarEventInvitations.inviteeType, input.inviteeType),
            input.userId
              ? eq(calendarEventInvitations.userId, input.userId)
              : undefined,
            input.clientId
              ? eq(calendarEventInvitations.clientId, input.clientId)
              : undefined,
            input.externalEmail
              ? eq(calendarEventInvitations.externalEmail, input.externalEmail)
              : undefined
          )
        )
        .limit(1);

      if (existing.length > 0) {
        throw new Error("Invitation already exists for this invitee");
      }

      // Check auto-accept settings for USER invitees
      let autoAccept = false;
      let autoAcceptReason: string | null = null;

      if (input.inviteeType === "USER" && input.userId) {
        const autoAcceptCheck = await checkAutoAccept(
          input.userId,
          input.eventId,
          userId
        );
        autoAccept = autoAcceptCheck.autoAccept;
        autoAcceptReason = autoAcceptCheck.reason;
      }

      // Create invitation
      const [invitation] = await db
        .insert(calendarEventInvitations)
        .values({
          eventId: input.eventId,
          inviteeType: input.inviteeType,
          userId: input.userId || null,
          clientId: input.clientId || null,
          externalEmail: input.externalEmail || null,
          externalName: input.externalName || null,
          role: input.role,
          message: input.message || null,
          status: "DRAFT",
          autoAccept,
          autoAcceptReason,
          createdBy: userId,
        })
        .$returningId();

      // Log creation
      await logInvitationAction(invitation.id, "CREATED", userId);

      // Return full invitation
      const [created] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, invitation.id))
        .limit(1);

      return created;
    }),

  /**
   * Send invitation (changes status from DRAFT to PENDING or AUTO_ACCEPTED)
   */
  sendInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get invitation
      const [invitation] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        userId,
        invitation.eventId,
        "EDIT"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Check status
      if (invitation.status !== "DRAFT") {
        throw new Error("Can only send invitations in DRAFT status");
      }

      // Determine new status based on auto-accept
      const newStatus = invitation.autoAccept ? "AUTO_ACCEPTED" : "PENDING";
      const now = new Date();

      // Update invitation
      await db
        .update(calendarEventInvitations)
        .set({
          status: newStatus,
          sentAt: now,
          respondedAt: invitation.autoAccept ? now : null,
        })
        .where(eq(calendarEventInvitations.id, input.invitationId));

      // If auto-accepted, create participant
      if (invitation.autoAccept && invitation.userId) {
        await createParticipantFromInvitation(
          invitation.id,
          invitation.eventId,
          invitation.userId,
          invitation.role,
          userId
        );
      }

      // Log action
      await logInvitationAction(
        invitation.id,
        invitation.autoAccept ? "AUTO_ACCEPTED" : "SENT",
        userId,
        invitation.autoAccept ? invitation.autoAcceptReason || undefined : undefined
      );

      // Return updated invitation
      const [updated] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      return updated;
    }),

  /**
   * Respond to invitation (accept or decline)
   */
  respondToInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.number(),
        response: z.enum(["ACCEPTED", "DECLINED"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get invitation
      const [invitation] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Verify user is the invitee
      if (invitation.inviteeType !== "USER" || invitation.userId !== userId) {
        throw new Error("You are not the invitee of this invitation");
      }

      // Check status
      if (invitation.status !== "PENDING") {
        throw new Error("Can only respond to invitations in PENDING status");
      }

      const now = new Date();

      // Update invitation
      await db
        .update(calendarEventInvitations)
        .set({
          status: input.response,
          respondedAt: now,
        })
        .where(eq(calendarEventInvitations.id, input.invitationId));

      // If accepted, create participant
      if (input.response === "ACCEPTED") {
        await createParticipantFromInvitation(
          invitation.id,
          invitation.eventId,
          userId,
          invitation.role,
          userId
        );
      }

      // Log action
      await logInvitationAction(invitation.id, input.response, userId);

      // Return updated invitation
      const [updated] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      return updated;
    }),

  /**
   * Get user's invitation settings
   */
  getInvitationSettings: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database not available");

    const userId = getAuthenticatedUserId(ctx);

    // Get or create settings
    let [settings] = await db
      .select()
      .from(calendarInvitationSettings)
      .where(eq(calendarInvitationSettings.userId, userId))
      .limit(1);

    if (!settings) {
      // Create default settings
      const [created] = await db
        .insert(calendarInvitationSettings)
        .values({
          userId,
          autoAcceptAll: false,
          notifyOnInvitation: true,
          notifyOnAutoAccept: true,
        })
        .$returningId();

      [settings] = await db
        .select()
        .from(calendarInvitationSettings)
        .where(eq(calendarInvitationSettings.id, created.id))
        .limit(1);
    }

    return settings;
  }),

  /**
   * Update user's invitation settings
   */
  updateInvitationSettings: protectedProcedure
    .input(
      z.object({
        autoAcceptAll: z.boolean().optional(),
        autoAcceptFromOrganizers: z.array(z.number()).optional(),
        autoAcceptByEventType: z.array(z.string()).optional(),
        autoAcceptByModule: z.array(z.string()).optional(),
        notifyOnInvitation: z.boolean().optional(),
        notifyOnAutoAccept: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get or create settings
      let [settings] = await db
        .select()
        .from(calendarInvitationSettings)
        .where(eq(calendarInvitationSettings.userId, userId))
        .limit(1);

      if (!settings) {
        // Create new settings
        const [created] = await db
          .insert(calendarInvitationSettings)
          .values({
            userId,
            autoAcceptAll: input.autoAcceptAll ?? false,
            autoAcceptFromOrganizers: input.autoAcceptFromOrganizers || null,
            autoAcceptByEventType: input.autoAcceptByEventType || null,
            autoAcceptByModule: input.autoAcceptByModule || null,
            notifyOnInvitation: input.notifyOnInvitation ?? true,
            notifyOnAutoAccept: input.notifyOnAutoAccept ?? true,
          })
          .$returningId();

        [settings] = await db
          .select()
          .from(calendarInvitationSettings)
          .where(eq(calendarInvitationSettings.id, created.id))
          .limit(1);
      } else {
        // Update existing settings
        await db
          .update(calendarInvitationSettings)
          .set({
            autoAcceptAll:
              input.autoAcceptAll !== undefined
                ? input.autoAcceptAll
                : settings.autoAcceptAll,
            autoAcceptFromOrganizers:
              input.autoAcceptFromOrganizers !== undefined
                ? input.autoAcceptFromOrganizers
                : settings.autoAcceptFromOrganizers,
            autoAcceptByEventType:
              input.autoAcceptByEventType !== undefined
                ? input.autoAcceptByEventType
                : settings.autoAcceptByEventType,
            autoAcceptByModule:
              input.autoAcceptByModule !== undefined
                ? input.autoAcceptByModule
                : settings.autoAcceptByModule,
            notifyOnInvitation:
              input.notifyOnInvitation !== undefined
                ? input.notifyOnInvitation
                : settings.notifyOnInvitation,
            notifyOnAutoAccept:
              input.notifyOnAutoAccept !== undefined
                ? input.notifyOnAutoAccept
                : settings.notifyOnAutoAccept,
          })
          .where(eq(calendarInvitationSettings.userId, userId));

        [settings] = await db
          .select()
          .from(calendarInvitationSettings)
          .where(eq(calendarInvitationSettings.userId, userId))
          .limit(1);
      }

      return settings;
    }),

  /**
   * Admin override invitation status
   */
  adminOverrideInvitation: adminProcedure
    .input(
      z.object({
        invitationId: z.number(),
        action: z.enum(["ACCEPT", "DECLINE", "CANCEL"]),
        reason: z.string(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const adminId = getAuthenticatedUserId(ctx);

      // Get invitation
      const [invitation] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Determine new status
      let newStatus: "ACCEPTED" | "DECLINED" | "CANCELLED";
      if (input.action === "ACCEPT") {
        newStatus = "ACCEPTED";
      } else if (input.action === "DECLINE") {
        newStatus = "DECLINED";
      } else {
        newStatus = "CANCELLED";
      }

      const now = new Date();

      // Update invitation
      await db
        .update(calendarEventInvitations)
        .set({
          status: newStatus,
          adminOverride: true,
          overriddenBy: adminId,
          overrideReason: input.reason,
          overriddenAt: now,
          respondedAt: now,
        })
        .where(eq(calendarEventInvitations.id, input.invitationId));

      // If accepted, create participant
      if (newStatus === "ACCEPTED" && invitation.userId) {
        await createParticipantFromInvitation(
          invitation.id,
          invitation.eventId,
          invitation.userId,
          invitation.role,
          adminId
        );
      }

      // Log action
      await logInvitationAction(
        invitation.id,
        "ADMIN_OVERRIDE",
        adminId,
        `${input.action}: ${input.reason}`
      );

      // Return updated invitation
      const [updated] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      return updated;
    }),

  /**
   * Get all invitations for an event
   */
  getInvitationsByEvent: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        userId,
        input.eventId,
        "VIEW"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      const invitations = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.eventId, input.eventId));

      return invitations;
    }),

  /**
   * Get user's pending invitations
   */
  getPendingInvitations: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
        if (!db) throw new Error("Database not available");
    if (!db) throw new Error("Database not available");

    const userId = getAuthenticatedUserId(ctx);

    const invitations = await db
      .select()
      .from(calendarEventInvitations)
      .where(
        and(
          eq(calendarEventInvitations.userId, userId),
          eq(calendarEventInvitations.status, "PENDING")
        )
      );

    return invitations;
  }),

  /**
   * Bulk send invitations
   */
  bulkSendInvitations: protectedProcedure
    .input(
      z.object({
        eventId: z.number(),
        invitees: z.array(
          z.object({
            inviteeType: z.enum(["USER", "CLIENT", "EXTERNAL"]),
            userId: z.number().optional(),
            clientId: z.number().optional(),
            externalEmail: z.string().email().optional(),
            externalName: z.string().optional(),
            role: z
              .enum(["ORGANIZER", "REQUIRED", "OPTIONAL", "OBSERVER"])
              .default("REQUIRED"),
          })
        ),
        message: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        userId,
        input.eventId,
        "EDIT"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      const results: {
        sent: number;
        failed: number;
        invitations: Array<Record<string, unknown>>;
      } = {
        sent: 0,
        failed: 0,
        invitations: [],
      };

      // Process each invitee
      for (const invitee of input.invitees) {
        try {
          // Check auto-accept for USER invitees
          let autoAccept = false;
          let autoAcceptReason: string | null = null;

          if (invitee.inviteeType === "USER" && invitee.userId) {
            const autoAcceptCheck = await checkAutoAccept(
              invitee.userId,
              input.eventId,
              userId
            );
            autoAccept = autoAcceptCheck.autoAccept;
            autoAcceptReason = autoAcceptCheck.reason;
          }

          // Create and send invitation
          const [invitation] = await db
            .insert(calendarEventInvitations)
            .values({
              eventId: input.eventId,
              inviteeType: invitee.inviteeType,
              userId: invitee.userId || null,
              clientId: invitee.clientId || null,
              externalEmail: invitee.externalEmail || null,
              externalName: invitee.externalName || null,
              role: invitee.role,
              message: input.message || null,
              status: autoAccept ? "AUTO_ACCEPTED" : "PENDING",
              sentAt: new Date(),
              respondedAt: autoAccept ? new Date() : null,
              autoAccept,
              autoAcceptReason,
              createdBy: userId,
            })
            .$returningId();

          // If auto-accepted, create participant
          if (autoAccept && invitee.userId) {
            await createParticipantFromInvitation(
              invitation.id,
              input.eventId,
              invitee.userId,
              invitee.role,
              userId
            );
          }

          // Log action
          await logInvitationAction(
            invitation.id,
            autoAccept ? "AUTO_ACCEPTED" : "SENT",
            userId
          );

          // Get full invitation
          const [created] = await db
            .select()
            .from(calendarEventInvitations)
            .where(eq(calendarEventInvitations.id, invitation.id))
            .limit(1);

          results.invitations.push(created);
          results.sent++;
        } catch (error) {
          calendarLogger.operationFailure("sendInvitation", error as Error, {
            inviteeId: invitee.userId,
            eventId: input.eventId,
          });
          results.failed++;
        }
      }

      return results;
    }),

  /**
   * Cancel invitation
   */
  cancelInvitation: protectedProcedure
    .input(
      z.object({
        invitationId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get invitation
      const [invitation] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        userId,
        invitation.eventId,
        "EDIT"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      // Update status
      await db
        .update(calendarEventInvitations)
        .set({
          status: "CANCELLED",
        })
        .where(eq(calendarEventInvitations.id, input.invitationId));

      // Log action
      await logInvitationAction(invitation.id, "CANCELLED", userId);

      // Return updated invitation
      const [updated] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      return updated;
    }),

  /**
   * Get invitation history
   */
  getInvitationHistory: protectedProcedure
    .input(
      z.object({
        invitationId: z.number(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
        if (!db) throw new Error("Database not available");
      if (!db) throw new Error("Database not available");

      const userId = getAuthenticatedUserId(ctx);

      // Get invitation to check permission
      const [invitation] = await db
        .select()
        .from(calendarEventInvitations)
        .where(eq(calendarEventInvitations.id, input.invitationId))
        .limit(1);

      if (!invitation) {
        throw new Error("Invitation not found");
      }

      // Check permission
      const hasPermission = await PermissionService.hasPermission(
        userId,
        invitation.eventId,
        "VIEW"
      );

      if (!hasPermission) {
        throw new Error("Permission denied");
      }

      const history = await db
        .select()
        .from(calendarInvitationHistory)
        .where(eq(calendarInvitationHistory.invitationId, input.invitationId));

      return history;
    }),
});
