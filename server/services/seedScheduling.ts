/**
 * Scheduling Module Seed Data
 * DATA-014: Seeds the database with default scheduling configuration
 *
 * Includes:
 * - Room definitions (meeting rooms, loading docks)
 * - Shift templates (Day, Opening, Closing)
 * - Overtime rules (US labor law defaults)
 *
 * Note: AppointmentTypes require a calendar reference and are seeded
 * per-calendar when calendars are created.
 *
 * RELATIONSHIP WITH scripts/seed/seeders/seed-scheduling-defaults.ts:
 * ====================================================================
 * There are TWO scheduling seeders in this codebase:
 *
 * 1. THIS FILE (server/services/seedScheduling.ts):
 *    - Standalone seeder in the server services directory
 *    - Run via: npx tsx server/services/seedScheduling.ts
 *    - Simpler data set (5 shift templates)
 *    - Only creates if not exists (never updates)
 *
 * 2. scripts/seed/seeders/seed-scheduling-defaults.ts (unified seeder):
 *    - Part of the unified scripts/seed/ seeding system
 *    - Run via: npx tsx scripts/seed/seeders/seed-all-defaults.ts --module=scheduling
 *    - More comprehensive data set (9 shift templates, warehouse-specific options)
 *    - Can update existing records if descriptions/details change
 *
 * Both seeders are safe to run in any order. They check for existing records
 * by name before inserting, ensuring idempotent behavior.
 */

import { getDb } from "../db";
import {
  rooms,
  shiftTemplates,
  overtimeRules,
} from "../../drizzle/schema-scheduling";
import { logger } from "../_core/logger";
import { eq } from "drizzle-orm";

/**
 * Default room definitions
 */
const DEFAULT_ROOMS = [
  // Meeting rooms
  {
    name: "Conference Room A",
    description: "Main conference room with projector and video conferencing",
    roomType: "meeting" as const,
    capacity: 12,
    features: ["projector", "video_conferencing", "whiteboard"],
    color: "#3B82F6",
    displayOrder: 1,
  },
  {
    name: "Conference Room B",
    description: "Smaller meeting room for team discussions",
    roomType: "meeting" as const,
    capacity: 6,
    features: ["whiteboard", "tv_display"],
    color: "#10B981",
    displayOrder: 2,
  },
  {
    name: "Huddle Room",
    description: "Quick meetings and private calls",
    roomType: "meeting" as const,
    capacity: 4,
    features: ["tv_display"],
    color: "#F59E0B",
    displayOrder: 3,
  },

  // Loading docks
  {
    name: "Loading Dock 1",
    description: "Main receiving dock with forklift access",
    roomType: "loading" as const,
    capacity: 1,
    features: ["forklift_access", "pallet_jack", "dock_leveler"],
    color: "#EF4444",
    displayOrder: 10,
  },
  {
    name: "Loading Dock 2",
    description: "Secondary dock for outgoing shipments",
    roomType: "loading" as const,
    capacity: 1,
    features: ["forklift_access", "pallet_jack"],
    color: "#F97316",
    displayOrder: 11,
  },
  {
    name: "Client Pickup Bay",
    description: "Designated area for client order pickups",
    roomType: "loading" as const,
    capacity: 2,
    features: ["parking", "security_camera"],
    color: "#8B5CF6",
    displayOrder: 12,
  },
];

/**
 * Default shift templates
 */
const DEFAULT_SHIFT_TEMPLATES = [
  {
    name: "Opening Shift",
    description: "Early morning shift for opening procedures",
    startTime: "06:00:00",
    endTime: "14:00:00",
    breakStart: "10:00:00",
    breakEnd: "10:30:00",
    color: "#F59E0B",
  },
  {
    name: "Day Shift",
    description: "Standard business hours shift",
    startTime: "09:00:00",
    endTime: "17:00:00",
    breakStart: "12:00:00",
    breakEnd: "13:00:00",
    color: "#10B981",
  },
  {
    name: "Mid Shift",
    description: "Mid-day overlap shift for peak hours",
    startTime: "11:00:00",
    endTime: "19:00:00",
    breakStart: "14:30:00",
    breakEnd: "15:00:00",
    color: "#3B82F6",
  },
  {
    name: "Closing Shift",
    description: "Evening shift for closing procedures",
    startTime: "14:00:00",
    endTime: "22:00:00",
    breakStart: "18:00:00",
    breakEnd: "18:30:00",
    color: "#8B5CF6",
  },
  {
    name: "Split Shift",
    description: "Split shift with extended break",
    startTime: "08:00:00",
    endTime: "20:00:00",
    breakStart: "12:00:00",
    breakEnd: "16:00:00",
    color: "#EC4899",
  },
];

/**
 * Default overtime rules (US labor law compliant)
 */
const DEFAULT_OVERTIME_RULES = [
  {
    name: "Federal Standard",
    description: "US Federal overtime rules - 40 hours/week, 1.5x after",
    dailyThresholdMinutes: null, // No daily threshold for federal
    weeklyThresholdMinutes: 2400, // 40 hours
    overtimeMultiplier: 150, // 1.5x
    doubleOvertimeMultiplier: null,
    dailyDoubleThresholdMinutes: null,
    weeklyDoubleThresholdMinutes: null,
    isDefault: true,
  },
  {
    name: "California Standard",
    description:
      "California overtime rules - 8hr/day and 40hr/week, double OT after 12hr/day",
    dailyThresholdMinutes: 480, // 8 hours
    weeklyThresholdMinutes: 2400, // 40 hours
    overtimeMultiplier: 150, // 1.5x
    doubleOvertimeMultiplier: 200, // 2x
    dailyDoubleThresholdMinutes: 720, // 12 hours
    weeklyDoubleThresholdMinutes: null,
    isDefault: false,
  },
  {
    name: "No Overtime",
    description: "Exempt employees - no overtime calculation",
    dailyThresholdMinutes: null,
    weeklyThresholdMinutes: null,
    overtimeMultiplier: 100, // 1x (no overtime)
    doubleOvertimeMultiplier: null,
    dailyDoubleThresholdMinutes: null,
    weeklyDoubleThresholdMinutes: null,
    isDefault: false,
  },
];

/**
 * Seed scheduling data into the database
 *
 * This function is idempotent - it will only create entries that don't exist.
 * Existing entries will not be modified.
 *
 * @returns Object with counts of created and skipped items
 */
export async function seedScheduling(): Promise<{
  rooms: { created: number; skipped: number };
  shiftTemplates: { created: number; skipped: number };
  overtimeRules: { created: number; skipped: number };
  errors: string[];
}> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  const result = {
    rooms: { created: 0, skipped: 0 },
    shiftTemplates: { created: 0, skipped: 0 },
    overtimeRules: { created: 0, skipped: 0 },
    errors: [] as string[],
  };

  logger.info("[Scheduling] Starting seed");

  // Seed rooms
  for (const room of DEFAULT_ROOMS) {
    try {
      const [existing] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.name, room.name))
        .limit(1);

      if (existing) {
        result.rooms.skipped++;
        continue;
      }

      await db.insert(rooms).values(room);
      result.rooms.created++;
      logger.debug({ name: room.name }, "[Scheduling] Room created");
    } catch (error) {
      const msg = `Failed to seed room ${room.name}: ${error}`;
      logger.error({ error }, msg);
      result.errors.push(msg);
    }
  }

  // Seed shift templates
  for (const template of DEFAULT_SHIFT_TEMPLATES) {
    try {
      const [existing] = await db
        .select()
        .from(shiftTemplates)
        .where(eq(shiftTemplates.name, template.name))
        .limit(1);

      if (existing) {
        result.shiftTemplates.skipped++;
        continue;
      }

      await db.insert(shiftTemplates).values(template);
      result.shiftTemplates.created++;
      logger.debug(
        { name: template.name },
        "[Scheduling] Shift template created"
      );
    } catch (error) {
      const msg = `Failed to seed shift template ${template.name}: ${error}`;
      logger.error({ error }, msg);
      result.errors.push(msg);
    }
  }

  // Seed overtime rules
  for (const rule of DEFAULT_OVERTIME_RULES) {
    try {
      const [existing] = await db
        .select()
        .from(overtimeRules)
        .where(eq(overtimeRules.name, rule.name))
        .limit(1);

      if (existing) {
        result.overtimeRules.skipped++;
        continue;
      }

      await db.insert(overtimeRules).values(rule);
      result.overtimeRules.created++;
      logger.debug({ name: rule.name }, "[Scheduling] Overtime rule created");
    } catch (error) {
      const msg = `Failed to seed overtime rule ${rule.name}: ${error}`;
      logger.error({ error }, msg);
      result.errors.push(msg);
    }
  }

  logger.info(
    {
      rooms: result.rooms,
      shiftTemplates: result.shiftTemplates,
      overtimeRules: result.overtimeRules,
      errorCount: result.errors.length,
    },
    "[Scheduling] Seed complete"
  );

  return result;
}

// Allow running directly
if (require.main === module) {
  seedScheduling()
    .then(result => {
      console.info(
        "Scheduling seed complete:",
        JSON.stringify(result, null, 2)
      );
      process.exit(result.errors.length > 0 ? 1 : 0);
    })
    .catch(error => {
      console.error("Scheduling seed failed:", error);
      process.exit(1);
    });
}
