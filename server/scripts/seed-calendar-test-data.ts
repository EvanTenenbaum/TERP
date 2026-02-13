/**
 * Seed Calendar Test Data
 * Creates comprehensive, realistic test data for the calendar module
 * 
 * Usage: pnpm tsx server/scripts/seed-calendar-test-data.ts
 */

import { getDb } from "../db";
import { calendarEvents, calendarRecurrenceRules, calendarRecurrenceInstances } from "../../drizzle/schema";
import { DateTime } from "luxon";
import { logger } from "../_core/logger";

const TIMEZONE = "America/New_York";

// Sample event data
const eventTemplates = [
  {
    title: "Team Standup",
    description: "Daily team standup meeting to discuss progress and blockers",
    eventType: "MEETING",
    priority: "MEDIUM",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "COMPANY",
    duration: 30, // minutes
  },
  {
    title: "Client Presentation",
    description: "Quarterly business review with key client stakeholders",
    eventType: "MEETING",
    priority: "HIGH",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "COMPANY",
    location: "Conference Room A",
    duration: 90,
  },
  {
    title: "Project Deadline",
    description: "Final deliverables due for Q4 project",
    eventType: "TASK",
    priority: "URGENT",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "COMPANY",
    duration: 0, // All-day event
  },
  {
    title: "Invoice Payment Due",
    description: "Payment due for vendor invoice #12345",
    eventType: "PAYMENT_DUE",
    priority: "HIGH",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "PRIVATE",
    duration: 0,
  },
  {
    title: "Training Session: Advanced Excel",
    description: "Learn advanced Excel formulas and pivot tables",
    eventType: "TRAINING",
    priority: "MEDIUM",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "COMPANY",
    location: "Training Room B",
    duration: 120,
  },
  {
    title: "Product Launch Event",
    description: "Official launch event for new product line",
    eventType: "MILESTONE",
    priority: "URGENT",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "COMPANY",
    location: "Main Auditorium",
    duration: 180,
  },
  {
    title: "Weekly Team Lunch",
    description: "Casual team lunch to build camaraderie",
    eventType: "MEETING",
    priority: "LOW",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "COMPANY",
    location: "Cafeteria",
    duration: 60,
  },
  {
    title: "Performance Review",
    description: "Quarterly performance review with manager",
    eventType: "MEETING",
    priority: "HIGH",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "PRIVATE",
    duration: 60,
  },
  {
    title: "System Maintenance Window",
    description: "Scheduled system maintenance and updates",
    eventType: "REMINDER",
    priority: "MEDIUM",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "COMPANY",
    duration: 240,
  },
  {
    title: "Board Meeting",
    description: "Monthly board of directors meeting",
    eventType: "MEETING",
    priority: "URGENT",
    module: "GENERAL",
    status: "SCHEDULED",
    visibility: "PRIVATE",
    location: "Executive Boardroom",
    duration: 120,
  },
];

async function seedCalendarData() {
  logger.info("🌱 Starting calendar test data seeding...");

  const db = await getDb();
  if (!db) {
    logger.error("❌ Database not available");
    process.exit(1);
  }

  try {
    // Clear existing calendar data
    logger.info("🗑️  Clearing existing calendar data...");
    await db.delete(calendarRecurrenceInstances);
    await db.delete(calendarRecurrenceRules);
    await db.delete(calendarEvents);

    // Create events for the next 3 months
    const now = DateTime.now().setZone(TIMEZONE);
    const startDate = now.startOf("month");
    const endDate = now.plus({ months: 3 }).endOf("month");

    logger.info(`📅 Creating events from ${startDate.toISODate()} to ${endDate.toISODate()}...`);

    let eventCount = 0;
    let currentDate = startDate;

    while (currentDate <= endDate) {
      // Skip weekends for most events
      const isWeekend = currentDate.weekday === 6 || currentDate.weekday === 7;

      // Create 2-5 events per weekday, 0-2 on weekends
      const eventsPerDay = isWeekend 
        ? Math.floor(Math.random() * 3) 
        : Math.floor(Math.random() * 4) + 2;

      for (let i = 0; i < eventsPerDay; i++) {
        const template = eventTemplates[Math.floor(Math.random() * eventTemplates.length)];
        
        // Random start time between 8 AM and 5 PM
        const startHour = Math.floor(Math.random() * 9) + 8; // 8-16
        const startMinute = Math.random() < 0.5 ? 0 : 30;
        
        const eventStart = currentDate.set({ hour: startHour, minute: startMinute, second: 0 });
        const eventEnd = template.duration > 0 
          ? eventStart.plus({ minutes: template.duration })
          : eventStart;

        // All-day events
        const isAllDay = template.duration === 0;

        await db.insert(calendarEvents).values({
          title: template.title,
          description: template.description,
          startDate: eventStart.toISO() || new Date().toISOString(),
          startTime: isAllDay ? null : eventStart.toFormat("HH:mm:ss"),
          endDate: eventEnd.toISO() || new Date().toISOString(),
          endTime: isAllDay ? null : eventEnd.toFormat("HH:mm:ss"),
          timezone: TIMEZONE,
          isFloatingTime: false,
          location: template.location || null,
          eventType: template.eventType,
          status: template.status,
          priority: template.priority,
          visibility: template.visibility,
          module: template.module,
          createdBy: 1, // Admin user
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        eventCount++;
      }

      currentDate = currentDate.plus({ days: 1 });
    }

    logger.info(`✅ Created ${eventCount} calendar events`);

    // TODO: Create recurring events (requires schema migration)
    // The calendar_recurrence_rules table schema in production doesn't match the code schema
    // Skipping for now to focus on one-time events
    logger.info("⏭️  Skipping recurring events (schema mismatch)");

    /* // Daily standup (weekdays only)
    const standupStart = now.set({ hour: 9, minute: 0, second: 0 });
    const standupResult = await db.insert(calendarEvents).values({
      title: "Daily Standup (Recurring)",
      description: "Daily team standup meeting",
      startDate: standupStart.toISO()!,
      startTime: "09:00:00",
      endDate: standupStart.plus({ minutes: 30 }).toISO()!,
      endTime: "09:30:00",
      timezone: TIMEZONE,
      isFloatingTime: false,
      eventType: "MEETING",
      status: "SCHEDULED",
      priority: "MEDIUM",
      visibility: "COMPANY",
      module: "GENERAL",
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const standupEventId = Number(standupResult.insertId);

    await db.insert(calendarRecurrenceRules).values({
      eventId: standupEventId,
      frequency: "DAILY",
      interval: 1,
      byWeekday: "MO,TU,WE,TH,FR", // Weekdays only
      startDate: standupStart.toISO()!,
      endDate: endDate.toISO()!,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Weekly team meeting
    const weeklyStart = now.set({ hour: 14, minute: 0, second: 0 });
    const weeklyResult = await db.insert(calendarEvents).values({
      title: "Weekly Team Meeting (Recurring)",
      description: "Weekly team sync and planning session",
      startDate: weeklyStart.toISO()!,
      startTime: "14:00:00",
      endDate: weeklyStart.plus({ hours: 1 }).toISO()!,
      endTime: "15:00:00",
      timezone: TIMEZONE,
      isFloatingTime: false,
      location: "Conference Room A",
      eventType: "MEETING",
      status: "SCHEDULED",
      priority: "HIGH",
      visibility: "COMPANY",
      module: "GENERAL",
      createdBy: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const weeklyEventId = Number(weeklyResult.insertId);

    await db.insert(calendarRecurrenceRules).values({
      eventId: weeklyEventId,
      frequency: "WEEKLY",
      interval: 1,
      byWeekday: "MO", // Every Monday
      startDate: weeklyStart.toISO()!,
      endDate: endDate.toISO()!,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log("✅ Created 2 recurring event rules"); */

    logger.info("\n🎉 Calendar test data seeding complete!");
    logger.info(`📊 Summary:`);
    logger.info(`   - ${eventCount} one-time events`);
    logger.info(`   - 0 recurring events (skipped due to schema mismatch)`);
    logger.info(`   - Date range: ${startDate.toISODate()} to ${endDate.toISODate()}`);

  } catch (error) {
    logger.error("❌ Error seeding calendar data:", error);
    throw error;
  }
}

// Run the seed function
seedCalendarData()
  .then(() => {
    logger.info("\n✅ Seeding completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    logger.error("\n❌ Seeding failed:", error);
    process.exit(1);
  });
