/**
 * Scheduling Defaults Seeder
 *
 * Seeds default rooms, shift templates, and overtime rules.
 * DATA-014: Seed Scheduling Module Defaults
 *
 * Dependencies: drizzle/schema-scheduling.ts
 * Usage: npx tsx scripts/seed/seeders/seed-scheduling-defaults.ts
 */

import { db } from "../../../server/_core/db";
import {
  rooms,
  shiftTemplates,
  overtimeRules,
} from "../../../drizzle/schema-scheduling";
import { eq } from "drizzle-orm";

// ============================================================================
// Room Definitions
// ============================================================================

interface RoomDefinition {
  name: string;
  description: string;
  roomType: "meeting" | "loading";
  capacity: number;
  features: string[];
  color: string;
  displayOrder: number;
}

const ROOMS: RoomDefinition[] = [
  // Meeting Rooms
  {
    name: "Conference Room A",
    description: "Main conference room with projector and video conferencing",
    roomType: "meeting",
    capacity: 10,
    features: ["projector", "video_conferencing", "whiteboard", "speakerphone"],
    color: "#3B82F6",
    displayOrder: 1,
  },
  {
    name: "Conference Room B",
    description: "Medium meeting room for team discussions",
    roomType: "meeting",
    capacity: 6,
    features: ["tv_display", "whiteboard"],
    color: "#10B981",
    displayOrder: 2,
  },
  {
    name: "Huddle Room C",
    description: "Small room for quick meetings and 1-on-1s",
    roomType: "meeting",
    capacity: 4,
    features: ["tv_display"],
    color: "#F59E0B",
    displayOrder: 3,
  },
  // Loading Docks
  {
    name: "Loading Dock 1",
    description: "Primary loading dock for receiving shipments",
    roomType: "loading",
    capacity: 1,
    features: ["forklift_access", "pallet_jack", "scale"],
    color: "#EF4444",
    displayOrder: 10,
  },
  {
    name: "Loading Dock 2",
    description: "Secondary loading dock for outgoing shipments",
    roomType: "loading",
    capacity: 1,
    features: ["forklift_access", "pallet_jack"],
    color: "#F97316",
    displayOrder: 11,
  },
  {
    name: "Receiving Bay",
    description: "Covered receiving area for supplier deliveries",
    roomType: "loading",
    capacity: 2,
    features: ["covered", "pallet_jack", "inspection_area"],
    color: "#8B5CF6",
    displayOrder: 12,
  },
];

// ============================================================================
// Shift Template Definitions
// ============================================================================

interface ShiftTemplateDefinition {
  name: string;
  description: string;
  startTime: string; // HH:MM:SS format
  endTime: string;
  breakStart?: string;
  breakEnd?: string;
  color: string;
}

const SHIFT_TEMPLATES: ShiftTemplateDefinition[] = [
  {
    name: "Day Shift",
    description: "Standard day shift (9 AM - 5 PM)",
    startTime: "09:00:00",
    endTime: "17:00:00",
    breakStart: "12:00:00",
    breakEnd: "13:00:00",
    color: "#3B82F6",
  },
  {
    name: "Opening Shift",
    description: "Early morning shift (6 AM - 2 PM)",
    startTime: "06:00:00",
    endTime: "14:00:00",
    breakStart: "10:00:00",
    breakEnd: "10:30:00",
    color: "#F59E0B",
  },
  {
    name: "Closing Shift",
    description: "Afternoon to evening shift (2 PM - 10 PM)",
    startTime: "14:00:00",
    endTime: "22:00:00",
    breakStart: "18:00:00",
    breakEnd: "18:30:00",
    color: "#8B5CF6",
  },
  {
    name: "Flex Morning",
    description: "Flexible morning shift (7 AM - 3 PM)",
    startTime: "07:00:00",
    endTime: "15:00:00",
    breakStart: "11:00:00",
    breakEnd: "11:45:00",
    color: "#10B981",
  },
  {
    name: "Flex Afternoon",
    description: "Flexible afternoon shift (11 AM - 7 PM)",
    startTime: "11:00:00",
    endTime: "19:00:00",
    breakStart: "14:30:00",
    breakEnd: "15:15:00",
    color: "#06B6D4",
  },
  {
    name: "Half Day (AM)",
    description: "Morning half-day shift (9 AM - 1 PM)",
    startTime: "09:00:00",
    endTime: "13:00:00",
    color: "#EC4899",
  },
  {
    name: "Half Day (PM)",
    description: "Afternoon half-day shift (1 PM - 5 PM)",
    startTime: "13:00:00",
    endTime: "17:00:00",
    color: "#F43F5E",
  },
  {
    name: "Warehouse Early",
    description: "Warehouse early shift for receiving (5 AM - 1 PM)",
    startTime: "05:00:00",
    endTime: "13:00:00",
    breakStart: "09:00:00",
    breakEnd: "09:30:00",
    color: "#84CC16",
  },
  {
    name: "Warehouse Late",
    description: "Warehouse late shift for shipping (1 PM - 9 PM)",
    startTime: "13:00:00",
    endTime: "21:00:00",
    breakStart: "17:00:00",
    breakEnd: "17:30:00",
    color: "#22C55E",
  },
];

// ============================================================================
// Overtime Rules Definitions
// ============================================================================

interface OvertimeRuleDefinition {
  name: string;
  description: string;
  dailyThresholdMinutes: number;
  weeklyThresholdMinutes: number;
  overtimeMultiplier: number; // 150 = 1.5x
  doubleOvertimeMultiplier: number; // 200 = 2.0x
  dailyDoubleThresholdMinutes: number;
  weeklyDoubleThresholdMinutes?: number;
  isDefault: boolean;
}

const OVERTIME_RULES: OvertimeRuleDefinition[] = [
  {
    name: "California Standard",
    description:
      "California overtime rules: OT after 8hrs/day or 40hrs/week, double time after 12hrs/day",
    dailyThresholdMinutes: 480, // 8 hours
    weeklyThresholdMinutes: 2400, // 40 hours
    overtimeMultiplier: 150, // 1.5x
    doubleOvertimeMultiplier: 200, // 2.0x
    dailyDoubleThresholdMinutes: 720, // 12 hours
    isDefault: true,
  },
  {
    name: "Federal Standard",
    description: "Federal overtime rules: OT after 40hrs/week only",
    dailyThresholdMinutes: 0, // No daily OT
    weeklyThresholdMinutes: 2400, // 40 hours
    overtimeMultiplier: 150,
    doubleOvertimeMultiplier: 200,
    dailyDoubleThresholdMinutes: 0, // No daily double OT
    isDefault: false,
  },
  {
    name: "No Overtime",
    description: "Exempt employees - no overtime calculations",
    dailyThresholdMinutes: 0,
    weeklyThresholdMinutes: 0,
    overtimeMultiplier: 100, // No multiplier
    doubleOvertimeMultiplier: 100,
    dailyDoubleThresholdMinutes: 0,
    isDefault: false,
  },
];

// ============================================================================
// Seeder Functions
// ============================================================================

/**
 * Seed rooms
 */
async function seedRooms(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  console.info("\n🏢 Seeding rooms...");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const room of ROOMS) {
    const existing = await db.query.rooms.findFirst({
      where: eq(rooms.name, room.name),
    });

    if (existing) {
      if (
        existing.description !== room.description ||
        existing.capacity !== room.capacity
      ) {
        await db
          .update(rooms)
          .set({
            description: room.description,
            capacity: room.capacity,
            features: room.features,
            color: room.color,
            displayOrder: room.displayOrder,
          })
          .where(eq(rooms.name, room.name));
        updated++;
        console.info(`  ↻ Updated: ${room.name}`);
      } else {
        skipped++;
      }
    } else {
      await db.insert(rooms).values({
        name: room.name,
        description: room.description,
        roomType: room.roomType,
        capacity: room.capacity,
        features: room.features,
        color: room.color,
        displayOrder: room.displayOrder,
        isActive: true,
      });
      inserted++;
      console.info(`  ✓ Created: ${room.name}`);
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Seed shift templates
 */
async function seedShiftTemplates(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  console.info("\n⏰ Seeding shift templates...");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const template of SHIFT_TEMPLATES) {
    const existing = await db.query.shiftTemplates.findFirst({
      where: eq(shiftTemplates.name, template.name),
    });

    if (existing) {
      if (
        existing.description !== template.description ||
        existing.startTime !== template.startTime ||
        existing.endTime !== template.endTime
      ) {
        await db
          .update(shiftTemplates)
          .set({
            description: template.description,
            startTime: template.startTime,
            endTime: template.endTime,
            breakStart: template.breakStart,
            breakEnd: template.breakEnd,
            color: template.color,
          })
          .where(eq(shiftTemplates.name, template.name));
        updated++;
        console.info(`  ↻ Updated: ${template.name}`);
      } else {
        skipped++;
      }
    } else {
      await db.insert(shiftTemplates).values({
        name: template.name,
        description: template.description,
        startTime: template.startTime,
        endTime: template.endTime,
        breakStart: template.breakStart,
        breakEnd: template.breakEnd,
        color: template.color,
        isActive: true,
      });
      inserted++;
      console.info(`  ✓ Created: ${template.name}`);
    }
  }

  return { inserted, updated, skipped };
}

/**
 * Seed overtime rules
 */
async function seedOvertimeRules(): Promise<{
  inserted: number;
  updated: number;
  skipped: number;
}> {
  console.info("\n⏱️ Seeding overtime rules...");

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const rule of OVERTIME_RULES) {
    const existing = await db.query.overtimeRules.findFirst({
      where: eq(overtimeRules.name, rule.name),
    });

    if (existing) {
      if (
        existing.description !== rule.description ||
        existing.dailyThresholdMinutes !== rule.dailyThresholdMinutes ||
        existing.weeklyThresholdMinutes !== rule.weeklyThresholdMinutes
      ) {
        await db
          .update(overtimeRules)
          .set({
            description: rule.description,
            dailyThresholdMinutes: rule.dailyThresholdMinutes,
            weeklyThresholdMinutes: rule.weeklyThresholdMinutes,
            overtimeMultiplier: rule.overtimeMultiplier,
            doubleOvertimeMultiplier: rule.doubleOvertimeMultiplier,
            dailyDoubleThresholdMinutes: rule.dailyDoubleThresholdMinutes,
            weeklyDoubleThresholdMinutes: rule.weeklyDoubleThresholdMinutes,
          })
          .where(eq(overtimeRules.name, rule.name));
        updated++;
        console.info(`  ↻ Updated: ${rule.name}`);
      } else {
        skipped++;
      }
    } else {
      await db.insert(overtimeRules).values({
        name: rule.name,
        description: rule.description,
        dailyThresholdMinutes: rule.dailyThresholdMinutes,
        weeklyThresholdMinutes: rule.weeklyThresholdMinutes,
        overtimeMultiplier: rule.overtimeMultiplier,
        doubleOvertimeMultiplier: rule.doubleOvertimeMultiplier,
        dailyDoubleThresholdMinutes: rule.dailyDoubleThresholdMinutes,
        weeklyDoubleThresholdMinutes: rule.weeklyDoubleThresholdMinutes,
        isActive: true,
        isDefault: rule.isDefault,
      });
      inserted++;
      console.info(`  ✓ Created: ${rule.name}`);
    }
  }

  return { inserted, updated, skipped };
}

// ============================================================================
// Main Seeder
// ============================================================================

export async function seedSchedulingDefaults(): Promise<void> {
  console.info("📅 Seeding scheduling defaults...");

  const roomResults = await seedRooms();
  const shiftResults = await seedShiftTemplates();
  const overtimeResults = await seedOvertimeRules();

  console.info(`\n✅ Scheduling seeding complete:`);
  console.info(
    `   Rooms: ${roomResults.inserted} created, ${roomResults.updated} updated, ${roomResults.skipped} skipped`
  );
  console.info(
    `   Shift Templates: ${shiftResults.inserted} created, ${shiftResults.updated} updated, ${shiftResults.skipped} skipped`
  );
  console.info(
    `   Overtime Rules: ${overtimeResults.inserted} created, ${overtimeResults.updated} updated, ${overtimeResults.skipped} skipped`
  );
}

// ============================================================================
// CLI Entry Point
// ============================================================================

if (require.main === module) {
  seedSchedulingDefaults()
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Failed to seed scheduling defaults:", err);
      process.exit(1);
    });
}
