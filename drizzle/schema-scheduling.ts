/**
 * Sprint 4 Track D: Scheduling System Schema Extensions
 * TASK-IDs: FEAT-005-BE, MEET-046, MEET-047, MEET-050, MEET-034
 */

import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  boolean,
  json,
  date,
  index,
  foreignKey,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";
import { users, clients, calendarEvents } from "./schema";

// ============================================================================
// MEET-047: Room/Resource Management
// ============================================================================

/**
 * Rooms table
 * Manages physical spaces for appointments (meeting rooms, loading docks)
 */
export const rooms = mysqlTable(
  "rooms",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Room type: meeting or loading
    roomType: mysqlEnum("room_type", ["meeting", "loading"]).notNull(),

    // Capacity and features
    capacity: int("capacity").default(1),
    features: json("features").$type<string[]>().default([]), // e.g., ["projector", "whiteboard", "forklift_access"]

    // Display settings
    color: varchar("color", { length: 7 }).notNull().default("#3B82F6"),
    displayOrder: int("display_order").default(0),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Location reference (optional)
    locationId: int("location_id"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
    deletedAt: timestamp("deleted_at"),
  },
  table => ({
    roomTypeIdx: index("idx_rooms_type").on(table.roomType),
    isActiveIdx: index("idx_rooms_active").on(table.isActive),
    locationIdx: index("idx_rooms_location").on(table.locationId),
  })
);

export type Room = typeof rooms.$inferSelect;
export type InsertRoom = typeof rooms.$inferInsert;

/**
 * Room Bookings table
 * Links appointments/events to specific rooms
 */
export const roomBookings = mysqlTable(
  "room_bookings",
  {
    id: int("id").autoincrement().primaryKey(),
    roomId: int("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),

    // Can be linked to calendar event or standalone
    calendarEventId: int("calendar_event_id").references(
      () => calendarEvents.id,
      { onDelete: "cascade" }
    ),

    // Booking details (for standalone bookings)
    title: varchar("title", { length: 255 }),
    description: text("description"),

    // Time slot
    bookingDate: date("booking_date").notNull(),
    startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS
    endTime: varchar("end_time", { length: 8 }).notNull(), // HH:MM:SS

    // Status
    status: mysqlEnum("status", [
      "pending",
      "confirmed",
      "in_progress",
      "completed",
      "cancelled",
    ])
      .notNull()
      .default("pending"),

    // Booking owner
    bookedById: int("booked_by_id")
      .notNull()
      .references(() => users.id),
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    // Notes
    notes: text("notes"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    roomIdx: index("idx_room_bookings_room").on(table.roomId),
    dateIdx: index("idx_room_bookings_date").on(table.bookingDate),
    statusIdx: index("idx_room_bookings_status").on(table.status),
    clientIdx: index("idx_room_bookings_client").on(table.clientId),
    eventIdx: index("idx_room_bookings_event").on(table.calendarEventId),
  })
);

export type RoomBooking = typeof roomBookings.$inferSelect;
export type InsertRoomBooking = typeof roomBookings.$inferInsert;

// ============================================================================
// MEET-050: Shift/Vacation Tracking
// ============================================================================

/**
 * Employee Shifts table
 * Tracks employee work schedules
 */
export const employeeShifts = mysqlTable(
  "employee_shifts",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Shift timing
    shiftDate: date("shift_date").notNull(),
    startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS
    endTime: varchar("end_time", { length: 8 }).notNull(), // HH:MM:SS

    // Break time (optional)
    breakStart: varchar("break_start", { length: 8 }), // HH:MM:SS
    breakEnd: varchar("break_end", { length: 8 }), // HH:MM:SS

    // Shift type
    shiftType: mysqlEnum("shift_type", [
      "regular",
      "overtime",
      "on_call",
      "training",
    ])
      .notNull()
      .default("regular"),

    // Location
    locationId: int("location_id"),

    // Status
    status: mysqlEnum("status", [
      "scheduled",
      "started",
      "completed",
      "absent",
      "cancelled",
    ])
      .notNull()
      .default("scheduled"),

    // Actual check-in/out times
    actualStartTime: timestamp("actual_start_time"),
    actualEndTime: timestamp("actual_end_time"),

    // Notes
    notes: text("notes"),

    // Created by (manager who assigned shift)
    createdById: int("created_by_id").references(() => users.id),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("idx_employee_shifts_user").on(table.userId),
    dateIdx: index("idx_employee_shifts_date").on(table.shiftDate),
    statusIdx: index("idx_employee_shifts_status").on(table.status),
    locationIdx: index("idx_employee_shifts_location").on(table.locationId),
  })
);

export type EmployeeShift = typeof employeeShifts.$inferSelect;
export type InsertEmployeeShift = typeof employeeShifts.$inferInsert;

/**
 * Shift Templates table
 * Predefined shift patterns for easy scheduling
 */
export const shiftTemplates = mysqlTable(
  "shift_templates",
  {
    id: int("id").autoincrement().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Time configuration
    startTime: varchar("start_time", { length: 8 }).notNull(), // HH:MM:SS
    endTime: varchar("end_time", { length: 8 }).notNull(), // HH:MM:SS
    breakStart: varchar("break_start", { length: 8 }), // HH:MM:SS
    breakEnd: varchar("break_end", { length: 8 }), // HH:MM:SS

    // Color for calendar display
    color: varchar("color", { length: 7 }).notNull().default("#10B981"),

    // Status
    isActive: boolean("is_active").notNull().default(true),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    isActiveIdx: index("idx_shift_templates_active").on(table.isActive),
  })
);

export type ShiftTemplate = typeof shiftTemplates.$inferSelect;
export type InsertShiftTemplate = typeof shiftTemplates.$inferInsert;

// ============================================================================
// MEET-046: Live Appointments
// ============================================================================

/**
 * Appointment Status History table
 * Tracks real-time status changes for appointments
 */
export const appointmentStatusHistory = mysqlTable(
  "appointment_status_history",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarEventId: int("calendar_event_id").notNull(),

    // Status transition
    previousStatus: varchar("previous_status", { length: 50 }),
    newStatus: varchar("new_status", { length: 50 }).notNull(),

    // Timing
    changedAt: timestamp("changed_at").defaultNow().notNull(),
    changedById: int("changed_by_id"),

    // Additional info
    notes: text("notes"),
    metadata: json("metadata"),
  },
  table => ({
    eventIdx: index("idx_appointment_status_history_event").on(
      table.calendarEventId
    ),
    changedAtIdx: index("idx_appointment_status_history_changed").on(
      table.changedAt
    ),
    // FKs with explicit short names to avoid MySQL 64-char identifier limit
    eventFk: foreignKey({
      name: "fk_appt_status_hist_event",
      columns: [table.calendarEventId],
      foreignColumns: [calendarEvents.id],
    }).onDelete("cascade"),
    changedByFk: foreignKey({
      name: "fk_appt_status_hist_user",
      columns: [table.changedById],
      foreignColumns: [users.id],
    }),
  })
);

export type AppointmentStatusHistory =
  typeof appointmentStatusHistory.$inferSelect;
export type InsertAppointmentStatusHistory =
  typeof appointmentStatusHistory.$inferInsert;

/**
 * Appointment Check-ins table
 * Tracks client check-in/check-out for appointments
 */
export const appointmentCheckIns = mysqlTable(
  "appointment_check_ins",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarEventId: int("calendar_event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),
    clientId: int("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    // Check-in/out times
    checkInTime: timestamp("check_in_time"),
    checkOutTime: timestamp("check_out_time"),

    // Status
    status: mysqlEnum("status", [
      "waiting",
      "checked_in",
      "in_progress",
      "completed",
      "no_show",
    ])
      .notNull()
      .default("waiting"),

    // Staff member handling
    handledById: int("handled_by_id").references(() => users.id),

    // Queue position (for waiting room)
    queuePosition: int("queue_position"),

    // Notes
    notes: text("notes"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    eventIdx: index("idx_appointment_check_ins_event").on(
      table.calendarEventId
    ),
    clientIdx: index("idx_appointment_check_ins_client").on(table.clientId),
    statusIdx: index("idx_appointment_check_ins_status").on(table.status),
  })
);

export type AppointmentCheckIn = typeof appointmentCheckIns.$inferSelect;
export type InsertAppointmentCheckIn = typeof appointmentCheckIns.$inferInsert;

// ============================================================================
// MEET-072: Notification System for Tagging
// ============================================================================

/**
 * User Mentions table
 * Tracks @mentions of users in comments, notes, appointments
 */
export const userMentions = mysqlTable(
  "user_mentions",
  {
    id: int("id").autoincrement().primaryKey(),

    // Who was mentioned
    mentionedUserId: int("mentioned_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Who made the mention
    mentionedById: int("mentioned_by_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Source of mention (polymorphic)
    sourceType: mysqlEnum("source_type", [
      "appointment",
      "comment",
      "note",
      "order",
      "task",
    ]).notNull(),
    sourceId: int("source_id").notNull(),

    // Context (snippet of text around mention)
    context: text("context"),

    // Status
    isRead: boolean("is_read").notNull().default(false),
    readAt: timestamp("read_at"),

    // Notification sent?
    notificationSent: boolean("notification_sent").notNull().default(false),
    notificationSentAt: timestamp("notification_sent_at"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  table => ({
    mentionedUserIdx: index("idx_user_mentions_mentioned").on(
      table.mentionedUserId
    ),
    mentionedByIdx: index("idx_user_mentions_by").on(table.mentionedById),
    sourceIdx: index("idx_user_mentions_source").on(
      table.sourceType,
      table.sourceId
    ),
    isReadIdx: index("idx_user_mentions_read").on(table.isRead),
  })
);

export type UserMention = typeof userMentions.$inferSelect;
export type InsertUserMention = typeof userMentions.$inferInsert;

// ============================================================================
// MEET-034: Expected Delivery Date
// ============================================================================

/**
 * Delivery Schedules table
 * Tracks expected delivery dates for orders/purchases
 */
export const deliverySchedules = mysqlTable(
  "delivery_schedules",
  {
    id: int("id").autoincrement().primaryKey(),

    // Link to order or purchase order (polymorphic)
    referenceType: mysqlEnum("reference_type", [
      "order",
      "purchase_order",
      "sample",
    ]).notNull(),
    referenceId: int("reference_id").notNull(),

    // Delivery dates
    expectedDate: date("expected_date").notNull(),
    confirmedDate: date("confirmed_date"),
    actualDate: date("actual_date"),

    // Time window (optional)
    expectedTimeStart: varchar("expected_time_start", { length: 8 }), // HH:MM:SS
    expectedTimeEnd: varchar("expected_time_end", { length: 8 }), // HH:MM:SS

    // Status
    status: mysqlEnum("status", [
      "pending",
      "confirmed",
      "in_transit",
      "delivered",
      "delayed",
      "cancelled",
    ])
      .notNull()
      .default("pending"),

    // Carrier/logistics info
    carrier: varchar("carrier", { length: 255 }),
    trackingNumber: varchar("tracking_number", { length: 255 }),

    // Delivery address
    deliveryAddress: text("delivery_address"),
    deliveryNotes: text("delivery_notes"),

    // Alert settings
    alertDaysBefore: int("alert_days_before").default(1),
    overdueAlertSent: boolean("overdue_alert_sent").notNull().default(false),

    // Metadata
    createdById: int("created_by_id").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    referenceIdx: index("idx_delivery_schedules_reference").on(
      table.referenceType,
      table.referenceId
    ),
    expectedDateIdx: index("idx_delivery_schedules_expected").on(
      table.expectedDate
    ),
    statusIdx: index("idx_delivery_schedules_status").on(table.status),
  })
);

export type DeliverySchedule = typeof deliverySchedules.$inferSelect;
export type InsertDeliverySchedule = typeof deliverySchedules.$inferInsert;

// ============================================================================
// FEAT-005-BE: Referral Tracking in Appointments
// ============================================================================

/**
 * Appointment Referrals table
 * Tracks how clients were referred for appointments
 */
export const appointmentReferrals = mysqlTable(
  "appointment_referrals",
  {
    id: int("id").autoincrement().primaryKey(),
    calendarEventId: int("calendar_event_id")
      .notNull()
      .references(() => calendarEvents.id, { onDelete: "cascade" }),

    // Referral source
    referralSource: mysqlEnum("referral_source", [
      "existing_client",
      "employee",
      "website",
      "social_media",
      "advertisement",
      "trade_show",
      "other",
    ]).notNull(),

    // If referred by client
    referringClientId: int("referring_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),

    // If referred by employee
    referringEmployeeId: int("referring_employee_id").references(
      () => users.id,
      { onDelete: "set null" }
    ),

    // Additional info
    referralCode: varchar("referral_code", { length: 50 }),
    referralNotes: text("referral_notes"),

    // Attribution tracking
    attributionDate: date("attribution_date"),
    conversionValue: int("conversion_value"), // Optional value in cents

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    eventIdx: index("idx_appointment_referrals_event").on(
      table.calendarEventId
    ),
    referringClientIdx: index("idx_appointment_referrals_client").on(
      table.referringClientId
    ),
    referringEmployeeIdx: index("idx_appointment_referrals_employee").on(
      table.referringEmployeeId
    ),
    sourceIdx: index("idx_appointment_referrals_source").on(
      table.referralSource
    ),
  })
);

export type AppointmentReferral = typeof appointmentReferrals.$inferSelect;
export type InsertAppointmentReferral =
  typeof appointmentReferrals.$inferInsert;

// ============================================================================
// Relations
// ============================================================================

export const roomsRelations = relations(rooms, ({ many }) => ({
  bookings: many(roomBookings),
}));

export const roomBookingsRelations = relations(roomBookings, ({ one }) => ({
  room: one(rooms, {
    fields: [roomBookings.roomId],
    references: [rooms.id],
  }),
  calendarEvent: one(calendarEvents, {
    fields: [roomBookings.calendarEventId],
    references: [calendarEvents.id],
  }),
  bookedBy: one(users, {
    fields: [roomBookings.bookedById],
    references: [users.id],
  }),
  client: one(clients, {
    fields: [roomBookings.clientId],
    references: [clients.id],
  }),
}));

export const employeeShiftsRelations = relations(employeeShifts, ({ one }) => ({
  user: one(users, {
    fields: [employeeShifts.userId],
    references: [users.id],
  }),
  createdBy: one(users, {
    fields: [employeeShifts.createdById],
    references: [users.id],
    relationName: "shiftCreator",
  }),
}));

export const appointmentCheckInsRelations = relations(
  appointmentCheckIns,
  ({ one }) => ({
    calendarEvent: one(calendarEvents, {
      fields: [appointmentCheckIns.calendarEventId],
      references: [calendarEvents.id],
    }),
    client: one(clients, {
      fields: [appointmentCheckIns.clientId],
      references: [clients.id],
    }),
    handledBy: one(users, {
      fields: [appointmentCheckIns.handledById],
      references: [users.id],
    }),
  })
);

export const userMentionsRelations = relations(userMentions, ({ one }) => ({
  mentionedUser: one(users, {
    fields: [userMentions.mentionedUserId],
    references: [users.id],
    relationName: "mentionedUser",
  }),
  mentionedBy: one(users, {
    fields: [userMentions.mentionedById],
    references: [users.id],
    relationName: "mentioner",
  }),
}));

export const appointmentReferralsRelations = relations(
  appointmentReferrals,
  ({ one }) => ({
    calendarEvent: one(calendarEvents, {
      fields: [appointmentReferrals.calendarEventId],
      references: [calendarEvents.id],
    }),
    referringClient: one(clients, {
      fields: [appointmentReferrals.referringClientId],
      references: [clients.id],
    }),
    referringEmployee: one(users, {
      fields: [appointmentReferrals.referringEmployeeId],
      references: [users.id],
    }),
  })
);

// QA Fix: Add missing relations for deliverySchedules
export const deliverySchedulesRelations = relations(
  deliverySchedules,
  ({ one }) => ({
    createdBy: one(users, {
      fields: [deliverySchedules.createdById],
      references: [users.id],
    }),
  })
);

// QA Fix: Add missing relations for appointmentStatusHistory
export const appointmentStatusHistoryRelations = relations(
  appointmentStatusHistory,
  ({ one }) => ({
    calendarEvent: one(calendarEvents, {
      fields: [appointmentStatusHistory.calendarEventId],
      references: [calendarEvents.id],
    }),
    changedBy: one(users, {
      fields: [appointmentStatusHistory.changedById],
      references: [users.id],
    }),
  })
);

// ============================================================================
// MEET-048: Hour Tracking (Sprint 5 Track E)
// ============================================================================

/**
 * Time Entries table
 * Tracks clock in/out for employees
 */
export const timeEntries = mysqlTable(
  "time_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Date of entry
    entryDate: date("entry_date").notNull(),

    // Clock in/out times
    clockIn: timestamp("clock_in").notNull(),
    clockOut: timestamp("clock_out"),

    // Break tracking
    breakStart: timestamp("break_start"),
    breakEnd: timestamp("break_end"),
    totalBreakMinutes: int("total_break_minutes").default(0),

    // Calculated hours
    regularHours: int("regular_hours_minutes").default(0), // in minutes
    overtimeHours: int("overtime_hours_minutes").default(0), // in minutes
    totalHours: int("total_hours_minutes").default(0), // in minutes

    // Entry type
    entryType: mysqlEnum("entry_type", [
      "regular",
      "overtime",
      "holiday",
      "sick",
      "vacation",
      "training",
    ])
      .notNull()
      .default("regular"),

    // Status
    status: mysqlEnum("status", [
      "active",
      "completed",
      "adjusted",
      "approved",
      "rejected",
    ])
      .notNull()
      .default("active"),

    // Linked to shift (optional)
    shiftId: int("shift_id").references(() => employeeShifts.id, {
      onDelete: "set null",
    }),

    // Notes and adjustments
    notes: text("notes"),
    adjustmentReason: text("adjustment_reason"),
    adjustedById: int("adjusted_by_id").references(() => users.id),
    adjustedAt: timestamp("adjusted_at"),

    // Approval
    approvedById: int("approved_by_id").references(() => users.id),
    approvedAt: timestamp("approved_at"),

    // IP/device tracking (optional)
    clockInIp: varchar("clock_in_ip", { length: 45 }),
    clockOutIp: varchar("clock_out_ip", { length: 45 }),
    clockInDevice: varchar("clock_in_device", { length: 255 }),
    clockOutDevice: varchar("clock_out_device", { length: 255 }),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("idx_time_entries_user").on(table.userId),
    dateIdx: index("idx_time_entries_date").on(table.entryDate),
    statusIdx: index("idx_time_entries_status").on(table.status),
    typeIdx: index("idx_time_entries_type").on(table.entryType),
    userDateIdx: index("idx_time_entries_user_date").on(
      table.userId,
      table.entryDate
    ),
  })
);

export type TimeEntry = typeof timeEntries.$inferSelect;
export type InsertTimeEntry = typeof timeEntries.$inferInsert;

/**
 * Timesheet Periods table
 * Defines pay periods for timesheet grouping
 */
export const timesheetPeriods = mysqlTable(
  "timesheet_periods",
  {
    id: int("id").autoincrement().primaryKey(),

    // Period dates
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),

    // Period type
    periodType: mysqlEnum("period_type", ["weekly", "biweekly", "monthly"])
      .notNull()
      .default("biweekly"),

    // Status
    status: mysqlEnum("status", ["open", "closed", "locked"])
      .notNull()
      .default("open"),

    // Closing info
    closedById: int("closed_by_id").references(() => users.id),
    closedAt: timestamp("closed_at"),

    // Notes
    notes: text("notes"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    periodStartIdx: index("idx_timesheet_periods_start").on(table.periodStart),
    periodEndIdx: index("idx_timesheet_periods_end").on(table.periodEnd),
    statusIdx: index("idx_timesheet_periods_status").on(table.status),
  })
);

export type TimesheetPeriod = typeof timesheetPeriods.$inferSelect;
export type InsertTimesheetPeriod = typeof timesheetPeriods.$inferInsert;

/**
 * Employee Timesheets table
 * Aggregated timesheet data per employee per period
 */
export const employeeTimesheets = mysqlTable(
  "employee_timesheets",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    periodId: int("period_id")
      .notNull()
      .references(() => timesheetPeriods.id, { onDelete: "cascade" }),

    // Totals (in minutes)
    totalRegularMinutes: int("total_regular_minutes").default(0),
    totalOvertimeMinutes: int("total_overtime_minutes").default(0),
    totalHolidayMinutes: int("total_holiday_minutes").default(0),
    totalSickMinutes: int("total_sick_minutes").default(0),
    totalVacationMinutes: int("total_vacation_minutes").default(0),
    totalTrainingMinutes: int("total_training_minutes").default(0),

    // Grand total
    grandTotalMinutes: int("grand_total_minutes").default(0),

    // Status
    status: mysqlEnum("status", [
      "draft",
      "submitted",
      "approved",
      "rejected",
      "paid",
    ])
      .notNull()
      .default("draft"),

    // Submission
    submittedAt: timestamp("submitted_at"),

    // Approval
    approvedById: int("approved_by_id").references(() => users.id),
    approvedAt: timestamp("approved_at"),
    rejectionReason: text("rejection_reason"),

    // Notes
    employeeNotes: text("employee_notes"),
    managerNotes: text("manager_notes"),

    // Metadata
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    userIdx: index("idx_employee_timesheets_user").on(table.userId),
    periodIdx: index("idx_employee_timesheets_period").on(table.periodId),
    statusIdx: index("idx_employee_timesheets_status").on(table.status),
    userPeriodIdx: index("idx_employee_timesheets_user_period").on(
      table.userId,
      table.periodId
    ),
  })
);

export type EmployeeTimesheet = typeof employeeTimesheets.$inferSelect;
export type InsertEmployeeTimesheet = typeof employeeTimesheets.$inferInsert;

/**
 * Overtime Rules table
 * Configures overtime thresholds
 */
export const overtimeRules = mysqlTable("overtime_rules", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  // Thresholds (in minutes)
  dailyThresholdMinutes: int("daily_threshold_minutes").default(480), // 8 hours default
  weeklyThresholdMinutes: int("weekly_threshold_minutes").default(2400), // 40 hours default

  // Overtime multipliers (stored as percentage, e.g., 150 = 1.5x)
  overtimeMultiplier: int("overtime_multiplier").default(150),
  doubleOvertimeMultiplier: int("double_overtime_multiplier").default(200),

  // Double overtime thresholds
  dailyDoubleThresholdMinutes: int("daily_double_threshold_minutes").default(
    720
  ), // 12 hours default
  weeklyDoubleThresholdMinutes: int("weekly_double_threshold_minutes"), // null = no weekly double OT

  // Status
  isActive: boolean("is_active").notNull().default(true),
  isDefault: boolean("is_default").notNull().default(false),

  // Metadata
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type OvertimeRule = typeof overtimeRules.$inferSelect;
export type InsertOvertimeRule = typeof overtimeRules.$inferInsert;

// ============================================================================
// Hour Tracking Relations
// ============================================================================

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  user: one(users, {
    fields: [timeEntries.userId],
    references: [users.id],
  }),
  shift: one(employeeShifts, {
    fields: [timeEntries.shiftId],
    references: [employeeShifts.id],
  }),
  adjustedBy: one(users, {
    fields: [timeEntries.adjustedById],
    references: [users.id],
    relationName: "adjustedBy",
  }),
  approvedBy: one(users, {
    fields: [timeEntries.approvedById],
    references: [users.id],
    relationName: "approvedBy",
  }),
}));

export const timesheetPeriodsRelations = relations(
  timesheetPeriods,
  ({ one, many }) => ({
    closedBy: one(users, {
      fields: [timesheetPeriods.closedById],
      references: [users.id],
    }),
    employeeTimesheets: many(employeeTimesheets),
  })
);

export const employeeTimesheetsRelations = relations(
  employeeTimesheets,
  ({ one }) => ({
    user: one(users, {
      fields: [employeeTimesheets.userId],
      references: [users.id],
    }),
    period: one(timesheetPeriods, {
      fields: [employeeTimesheets.periodId],
      references: [timesheetPeriods.id],
    }),
    approvedBy: one(users, {
      fields: [employeeTimesheets.approvedById],
      references: [users.id],
    }),
  })
);
