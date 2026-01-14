/**
 * Calendar Invitations Router Tests
 * Task: QA-044 - Event Invitation Workflow
 * Test-Driven Development (TDD) - Tests written before implementation
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { appRouter } from "../routers";
import { getDb } from "../db";
import {
  users,
  calendarEvents,
  calendarEventInvitations,
  calendarInvitationSettings,
  calendarInvitationHistory,
  calendarEventParticipants,
  clients,
} from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { withTransaction } from "../dbTransaction";

// SKIPPED: Integration tests requiring real database connection
// These tests need to be refactored to use mocks or run in a database test environment
describe.skip("Calendar Invitations Router", () => {
  let testUserId: number;
  let testEventId: number;
  let testClientId: number;
  let inviteeUserId: number;

  beforeEach(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Create test users
    const [organizer] = await db
      .insert(users)
      .values({
        openId: `test-organizer-${Date.now()}`,
        name: "Test Organizer",
        email: "organizer@test.com",
        role: "admin",
      })
      .$returningId();
    testUserId = organizer.id;

    const [invitee] = await db
      .insert(users)
      .values({
        openId: `test-invitee-${Date.now()}`,
        name: "Test Invitee",
        email: "invitee@test.com",
        role: "user",
      })
      .$returningId();
    inviteeUserId = invitee.id;

    // Create test client
    const [client] = await db
      .insert(clients)
      .values({
        name: "Test Client",
        email: "client@test.com",
        phone: "555-0100",
        licenseNumber: "TEST-001",
        licenseType: "RETAIL",
        licenseExpiration: new Date("2025-12-31"),
        status: "ACTIVE",
        createdBy: testUserId,
      })
      .$returningId();
    testClientId = client.id;

    // Create test event
    const [event] = await db
      .insert(calendarEvents)
      .values({
        title: "Test Event for Invitations",
        description: "Testing invitation workflow",
        startDate: "2025-12-01",
        endDate: "2025-12-01",
        startTime: "10:00:00",
        endTime: "11:00:00",
        module: "GENERAL",
        eventType: "MEETING",
        status: "SCHEDULED",
        createdBy: testUserId,
      })
      .$returningId();
    testEventId = event.id;
  });

  afterEach(async () => {
    const db = await getDb();
    if (!db) return;

    // DI-003: Wrap cascading deletes in transaction to prevent orphaned test data
    await withTransaction(async (tx) => {
      // Clean up test data
      await tx
        .delete(calendarInvitationHistory)
        .where(eq(calendarInvitationHistory.invitationId, testEventId));
      await tx
        .delete(calendarEventInvitations)
        .where(eq(calendarEventInvitations.eventId, testEventId));
      await tx
        .delete(calendarEventParticipants)
        .where(eq(calendarEventParticipants.eventId, testEventId));
      await tx
        .delete(calendarEvents)
        .where(eq(calendarEvents.id, testEventId));
      await tx
        .delete(calendarInvitationSettings)
        .where(eq(calendarInvitationSettings.userId, inviteeUserId));
      await tx.delete(clients).where(eq(clients.id, testClientId));
      await tx.delete(users).where(eq(users.id, testUserId));
      await tx.delete(users).where(eq(users.id, inviteeUserId));
    });
  });

  describe("createInvitation", () => {
    it("should create a draft invitation for a user", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const invitation = await caller.calendarInvitations.createInvitation({
        eventId: testEventId,
        inviteeType: "USER",
        userId: inviteeUserId,
        role: "REQUIRED",
        message: "Please join our meeting",
      });

      expect(invitation).toBeDefined();
      expect(invitation.eventId).toBe(testEventId);
      expect(invitation.userId).toBe(inviteeUserId);
      expect(invitation.inviteeType).toBe("USER");
      expect(invitation.status).toBe("DRAFT");
      expect(invitation.role).toBe("REQUIRED");
      expect(invitation.message).toBe("Please join our meeting");
      expect(invitation.createdBy).toBe(testUserId);
    });

    it("should create a draft invitation for a client", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const invitation = await caller.calendarInvitations.createInvitation({
        eventId: testEventId,
        inviteeType: "CLIENT",
        clientId: testClientId,
        role: "OPTIONAL",
      });

      expect(invitation).toBeDefined();
      expect(invitation.clientId).toBe(testClientId);
      expect(invitation.inviteeType).toBe("CLIENT");
      expect(invitation.status).toBe("DRAFT");
    });

    it("should create a draft invitation for an external email", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const invitation = await caller.calendarInvitations.createInvitation({
        eventId: testEventId,
        inviteeType: "EXTERNAL",
        externalEmail: "external@example.com",
        externalName: "External User",
        role: "OBSERVER",
      });

      expect(invitation).toBeDefined();
      expect(invitation.externalEmail).toBe("external@example.com");
      expect(invitation.externalName).toBe("External User");
      expect(invitation.inviteeType).toBe("EXTERNAL");
    });

    it("should check auto-accept settings when creating invitation", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Set up auto-accept for invitee
      await db.insert(calendarInvitationSettings).values({
        userId: inviteeUserId,
        autoAcceptAll: true,
      });

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const invitation = await caller.calendarInvitations.createInvitation({
        eventId: testEventId,
        inviteeType: "USER",
        userId: inviteeUserId,
        role: "REQUIRED",
      });

      expect(invitation.autoAccept).toBe(true);
      expect(invitation.autoAcceptReason).toContain("User setting");
    });

    it("should prevent duplicate invitations", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      await caller.calendarInvitations.createInvitation({
        eventId: testEventId,
        inviteeType: "USER",
        userId: inviteeUserId,
        role: "REQUIRED",
      });

      await expect(
        caller.calendarInvitations.createInvitation({
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
        })
      ).rejects.toThrow();
    });
  });

  describe("sendInvitation", () => {
    it("should send a draft invitation and change status to PENDING", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create draft invitation
      const [draft] = await db
        .insert(calendarEventInvitations)
        .values({
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
          status: "DRAFT",
          createdBy: testUserId,
          autoAccept: false,
        })
        .$returningId();

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const result = await caller.calendarInvitations.sendInvitation({
        invitationId: draft.id,
      });

      expect(result.status).toBe("PENDING");
      expect(result.sentAt).toBeDefined();

      // Check history
      const history = await db
        .select()
        .from(calendarInvitationHistory)
        .where(eq(calendarInvitationHistory.invitationId, draft.id));

      expect(history.length).toBeGreaterThan(0);
      expect(history.some(h => h.action === "SENT")).toBe(true);
    });

    it("should auto-accept invitation if autoAccept is true", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create draft with auto-accept
      const [draft] = await db
        .insert(calendarEventInvitations)
        .values({
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
          status: "DRAFT",
          createdBy: testUserId,
          autoAccept: true,
          autoAcceptReason: "User setting: auto-accept all",
        })
        .$returningId();

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const result = await caller.calendarInvitations.sendInvitation({
        invitationId: draft.id,
      });

      expect(result.status).toBe("AUTO_ACCEPTED");
      expect(result.respondedAt).toBeDefined();
      expect(result.participantId).toBeDefined();

      // Check participant was created
      const participants = await db
        .select()
        .from(calendarEventParticipants)
        .where(
          and(
            eq(calendarEventParticipants.eventId, testEventId),
            eq(calendarEventParticipants.userId, inviteeUserId)
          )
        );

      expect(participants.length).toBe(1);
      expect(participants[0].responseStatus).toBe("ACCEPTED");
    });
  });

  describe("respondToInvitation", () => {
    it("should accept an invitation and create participant", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create pending invitation
      const [invitation] = await db
        .insert(calendarEventInvitations)
        .values({
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
          status: "PENDING",
          createdBy: testUserId,
          sentAt: new Date(),
        })
        .$returningId();

      const caller = appRouter.createCaller({
        user: { id: inviteeUserId, role: "user" },
      });

      const result = await caller.calendarInvitations.respondToInvitation({
        invitationId: invitation.id,
        response: "ACCEPTED",
      });

      expect(result.status).toBe("ACCEPTED");
      expect(result.respondedAt).toBeDefined();
      expect(result.participantId).toBeDefined();

      // Check participant was created
      const participants = await db
        .select()
        .from(calendarEventParticipants)
        .where(eq(calendarEventParticipants.id, result.participantId!));

      expect(participants.length).toBe(1);
      expect(participants[0].userId).toBe(inviteeUserId);
    });

    it("should decline an invitation without creating participant", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [invitation] = await db
        .insert(calendarEventInvitations)
        .values({
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
          status: "PENDING",
          createdBy: testUserId,
          sentAt: new Date(),
        })
        .$returningId();

      const caller = appRouter.createCaller({
        user: { id: inviteeUserId, role: "user" },
      });

      const result = await caller.calendarInvitations.respondToInvitation({
        invitationId: invitation.id,
        response: "DECLINED",
      });

      expect(result.status).toBe("DECLINED");
      expect(result.respondedAt).toBeDefined();
      expect(result.participantId).toBeNull();
    });
  });

  describe("getInvitationSettings", () => {
    it("should return user invitation settings", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(calendarInvitationSettings).values({
        userId: inviteeUserId,
        autoAcceptAll: true,
        autoAcceptFromOrganizers: [testUserId],
        notifyOnInvitation: true,
      });

      const caller = appRouter.createCaller({
        user: { id: inviteeUserId, role: "user" },
      });

      const settings = await caller.calendarInvitations.getInvitationSettings();

      expect(settings).toBeDefined();
      expect(settings.autoAcceptAll).toBe(true);
      expect(settings.autoAcceptFromOrganizers).toContain(testUserId);
    });

    it("should create default settings if none exist", async () => {
      const caller = appRouter.createCaller({
        user: { id: inviteeUserId, role: "user" },
      });

      const settings = await caller.calendarInvitations.getInvitationSettings();

      expect(settings).toBeDefined();
      expect(settings.autoAcceptAll).toBe(false);
      expect(settings.notifyOnInvitation).toBe(true);
    });
  });

  describe("updateInvitationSettings", () => {
    it("should update user invitation settings", async () => {
      const caller = appRouter.createCaller({
        user: { id: inviteeUserId, role: "user" },
      });

      const updated = await caller.calendarInvitations.updateInvitationSettings(
        {
          autoAcceptAll: true,
          autoAcceptByEventType: ["MEETING", "TASK"],
          notifyOnAutoAccept: false,
        }
      );

      expect(updated.autoAcceptAll).toBe(true);
      expect(updated.autoAcceptByEventType).toEqual(["MEETING", "TASK"]);
      expect(updated.notifyOnAutoAccept).toBe(false);
    });
  });

  describe("adminOverrideInvitation", () => {
    it("should allow admin to override invitation status", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [invitation] = await db
        .insert(calendarEventInvitations)
        .values({
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
          status: "PENDING",
          createdBy: testUserId,
          sentAt: new Date(),
        })
        .$returningId();

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const result = await caller.calendarInvitations.adminOverrideInvitation({
        invitationId: invitation.id,
        action: "ACCEPT",
        reason: "Critical meeting - attendance required",
      });

      expect(result.status).toBe("ACCEPTED");
      expect(result.adminOverride).toBe(true);
      expect(result.overriddenBy).toBe(testUserId);
      expect(result.overrideReason).toBe(
        "Critical meeting - attendance required"
      );
      expect(result.participantId).toBeDefined();
    });

    it("should reject non-admin override attempts", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const [invitation] = await db
        .insert(calendarEventInvitations)
        .values({
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
          status: "PENDING",
          createdBy: testUserId,
          sentAt: new Date(),
        })
        .$returningId();

      const caller = appRouter.createCaller({
        user: { id: inviteeUserId, role: "user" },
      });

      await expect(
        caller.calendarInvitations.adminOverrideInvitation({
          invitationId: invitation.id,
          action: "ACCEPT",
          reason: "Test",
        })
      ).rejects.toThrow();
    });
  });

  describe("getInvitationsByEvent", () => {
    it("should return all invitations for an event", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create multiple invitations
      await db.insert(calendarEventInvitations).values([
        {
          eventId: testEventId,
          inviteeType: "USER",
          userId: inviteeUserId,
          role: "REQUIRED",
          status: "PENDING",
          createdBy: testUserId,
        },
        {
          eventId: testEventId,
          inviteeType: "CLIENT",
          clientId: testClientId,
          role: "OPTIONAL",
          status: "DRAFT",
          createdBy: testUserId,
        },
      ]);

      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const invitations =
        await caller.calendarInvitations.getInvitationsByEvent({
          eventId: testEventId,
        });

      expect(invitations.length).toBe(2);
      expect(invitations.some(i => i.inviteeType === "USER")).toBe(true);
      expect(invitations.some(i => i.inviteeType === "CLIENT")).toBe(true);
    });
  });

  describe("getPendingInvitations", () => {
    it("should return user's pending invitations", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(calendarEventInvitations).values({
        eventId: testEventId,
        inviteeType: "USER",
        userId: inviteeUserId,
        role: "REQUIRED",
        status: "PENDING",
        createdBy: testUserId,
        sentAt: new Date(),
      });

      const caller = appRouter.createCaller({
        user: { id: inviteeUserId, role: "user" },
      });

      const pending = await caller.calendarInvitations.getPendingInvitations();

      expect(pending.length).toBe(1);
      expect(pending[0].status).toBe("PENDING");
      expect(pending[0].userId).toBe(inviteeUserId);
    });
  });

  describe("bulkSendInvitations", () => {
    it("should send multiple invitations at once", async () => {
      const caller = appRouter.createCaller({
        user: { id: testUserId, role: "admin" },
      });

      const result = await caller.calendarInvitations.bulkSendInvitations({
        eventId: testEventId,
        invitees: [
          {
            inviteeType: "USER",
            userId: inviteeUserId,
            role: "REQUIRED",
          },
          {
            inviteeType: "CLIENT",
            clientId: testClientId,
            role: "OPTIONAL",
          },
        ],
        message: "Bulk invitation test",
      });

      expect(result.sent).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.invitations.length).toBe(2);
    });
  });
});
