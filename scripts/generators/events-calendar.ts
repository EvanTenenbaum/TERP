/**
 * Events and Calendar Generator
 *
 * Generates realistic calendar events with:
 * - Events (meetings, calls, deliveries, etc.)
 * - Participants with RSVP status
 * - Reminders
 * - Event history (changes, cancellations)
 * - Client-linked events for relationship tracking
 *
 * Generates 200-300 events spanning 22 months
 */

import { CONFIG } from "./config.js";
import { faker } from "@faker-js/faker";

export interface CalendarEventData {
  id?: number;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  location?: string;
  eventType: string;
  clientId?: number;
  createdBy: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CalendarEventParticipantData {
  id?: number;
  eventId?: number;
  userId?: number;
  email?: string;
  rsvpStatus: string;
  createdAt: Date;
}

export interface CalendarReminderData {
  id?: number;
  eventId?: number;
  reminderTime: Date;
  reminderType: string;
  sent: boolean;
  createdAt: Date;
}

export interface CalendarEventHistoryData {
  id?: number;
  eventId?: number;
  action: string;
  performedBy: number;
  notes?: string;
  createdAt: Date;
}

export interface EventsCascadeResult {
  events: CalendarEventData[];
  participants: CalendarEventParticipantData[];
  reminders: CalendarReminderData[];
  eventHistory: CalendarEventHistoryData[];
}

const EVENT_TYPES = [
  "MEETING",
  "CALL",
  "DELIVERY",
  "PICKUP",
  "SITE_VISIT",
  "TASTING",
  "REVIEW",
  "OTHER",
];

const RSVP_STATUSES = ["PENDING", "ACCEPTED", "DECLINED", "TENTATIVE"];

/**
 * Generate events spanning the time period
 */
export function generateEventsCalendar(
  clientIds: number[],
  startDate: Date = CONFIG.startDate,
  endDate: Date = CONFIG.endDate
): EventsCascadeResult {
  const events: CalendarEventData[] = [];
  const participants: CalendarEventParticipantData[] = [];
  const reminders: CalendarReminderData[] = [];
  const eventHistory: CalendarEventHistoryData[] = [];

  // Generate 200-300 events
  const eventCount = 200 + Math.floor(Math.random() * 100);

  for (let i = 0; i < eventCount; i++) {
    // Random date within period
    const eventDate = new Date(
      startDate.getTime() +
        Math.random() * (endDate.getTime() - startDate.getTime())
    );

    // Set to business hours (9 AM - 5 PM)
    const hour = 9 + Math.floor(Math.random() * 8);
    eventDate.setHours(hour, 0, 0, 0);

    // Event duration (30 min to 2 hours)
    const durationMinutes = [30, 60, 90, 120][Math.floor(Math.random() * 4)];
    const endTime = new Date(eventDate.getTime() + durationMinutes * 60 * 1000);

    // Event type
    const eventType = EVENT_TYPES[Math.floor(Math.random() * EVENT_TYPES.length)];

    // 70% of events are client-related
    const isClientRelated = Math.random() < 0.7;
    const clientId = isClientRelated
      ? clientIds[Math.floor(Math.random() * clientIds.length)]
      : undefined;

    // Generate title based on type
    const title = generateEventTitle(eventType, clientId);

    const event: CalendarEventData = {
      title,
      description: Math.random() < 0.5 ? faker.lorem.sentence() : undefined,
      startTime: eventDate,
      endTime,
      location: generateLocation(eventType),
      eventType,
      clientId,
      createdBy: 1,
      createdAt: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000), // Created 1 week before
      updatedAt: new Date(eventDate.getTime() - 7 * 24 * 60 * 60 * 1000),
    };
    events.push(event);

    // Add participants (1-4 per event)
    const participantCount = 1 + Math.floor(Math.random() * 3);
    for (let j = 0; j < participantCount; j++) {
      participants.push({
        userId: 1, // Default user
        rsvpStatus:
          RSVP_STATUSES[Math.floor(Math.random() * RSVP_STATUSES.length)],
        createdAt: event.createdAt,
      });
    }

    // Add reminders (1-2 per event)
    const reminderCount = Math.random() < 0.7 ? 1 : 2;
    for (let j = 0; j < reminderCount; j++) {
      const minutesBefore = j === 0 ? 15 : 60; // 15 min and 1 hour before
      const reminderTime = new Date(
        eventDate.getTime() - minutesBefore * 60 * 1000
      );

      reminders.push({
        reminderTime,
        reminderType: "EMAIL",
        sent: reminderTime < new Date(), // Sent if in the past
        createdAt: event.createdAt,
      });
    }

    // Add event history
    eventHistory.push({
      action: "CREATED",
      performedBy: 1,
      notes: "Event created",
      createdAt: event.createdAt,
    });

    // 10% of events get rescheduled
    if (Math.random() < 0.1) {
      const rescheduleDate = new Date(
        event.createdAt.getTime() + 2 * 24 * 60 * 60 * 1000
      );
      eventHistory.push({
        action: "RESCHEDULED",
        performedBy: 1,
        notes: "Event rescheduled",
        createdAt: rescheduleDate,
      });
      event.updatedAt = rescheduleDate;
    }

    // 5% of events get cancelled
    if (Math.random() < 0.05) {
      const cancelDate = new Date(
        event.createdAt.getTime() + 3 * 24 * 60 * 60 * 1000
      );
      eventHistory.push({
        action: "CANCELLED",
        performedBy: 1,
        notes: "Event cancelled",
        createdAt: cancelDate,
      });
      event.updatedAt = cancelDate;
    }
  }

  return {
    events,
    participants,
    reminders,
    eventHistory,
  };
}

function generateEventTitle(eventType: string, clientId?: number): string {
  const clientPrefix = clientId ? `Client ${clientId} - ` : "";

  switch (eventType) {
    case "MEETING":
      return `${clientPrefix}${faker.helpers.arrayElement([
        "Product Review Meeting",
        "Quarterly Business Review",
        "Strategy Session",
        "Planning Meeting",
      ])}`;
    case "CALL":
      return `${clientPrefix}${faker.helpers.arrayElement([
        "Follow-up Call",
        "Check-in Call",
        "Sales Call",
        "Support Call",
      ])}`;
    case "DELIVERY":
      return `${clientPrefix}Delivery - Order #${Math.floor(Math.random() * 10000)}`;
    case "PICKUP":
      return `${clientPrefix}Pickup Appointment`;
    case "SITE_VISIT":
      return `${clientPrefix}Site Visit`;
    case "TASTING":
      return `${clientPrefix}Product Tasting`;
    case "REVIEW":
      return `${clientPrefix}Account Review`;
    default:
      return `${clientPrefix}${faker.lorem.words(3)}`;
  }
}

function generateLocation(eventType: string): string | undefined {
  if (Math.random() < 0.3) return undefined; // 30% no location

  switch (eventType) {
    case "MEETING":
      return faker.helpers.arrayElement([
        "Conference Room A",
        "Conference Room B",
        "Main Office",
        "Zoom",
      ]);
    case "CALL":
      return "Phone";
    case "DELIVERY":
    case "PICKUP":
    case "SITE_VISIT":
      return faker.location.streetAddress();
    case "TASTING":
      return "Tasting Room";
    default:
      return faker.helpers.arrayElement([
        "Office",
        "Zoom",
        faker.location.streetAddress(),
      ]);
  }
}
