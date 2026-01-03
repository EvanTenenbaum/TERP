import { router } from "../../_core/trpc";
import { calendarsCoreRouter } from "./calendarsCore";
import { calendarsAccessRouter } from "./calendarsAccess";
import { calendarsAppointmentsRouter } from "./calendarsAppointments";
import { calendarsAvailabilityRouter } from "./calendarsAvailability";

/**
 * Calendars Management Router
 * CAL-001: Multi-Calendar Architecture
 * CAL-002: Availability & Booking Foundation
 *
 * Refactored per QA review (PR #110):
 * - Split into sub-routers for maintainability
 * - calendarsCore: Calendar CRUD operations
 * - calendarsAccess: User access and permissions
 * - calendarsAppointments: Appointment type management
 * - calendarsAvailability: Availability, blocked dates, and slots
 */
export const calendarsManagementRouter = router({
  // CAL-001: Calendar CRUD operations
  list: calendarsCoreRouter.list,
  getById: calendarsCoreRouter.getById,
  create: calendarsCoreRouter.create,
  update: calendarsCoreRouter.update,
  archive: calendarsCoreRouter.archive,
  restore: calendarsCoreRouter.restore,

  // CAL-001: User access management
  listUsers: calendarsAccessRouter.listUsers,
  addUser: calendarsAccessRouter.addUser,
  removeUser: calendarsAccessRouter.removeUser,

  // CAL-002: Appointment type management
  listAppointmentTypes: calendarsAppointmentsRouter.listAppointmentTypes,
  createAppointmentType: calendarsAppointmentsRouter.createAppointmentType,
  updateAppointmentType: calendarsAppointmentsRouter.updateAppointmentType,
  deleteAppointmentType: calendarsAppointmentsRouter.deleteAppointmentType,

  // CAL-002: Availability and slot management
  listAvailability: calendarsAvailabilityRouter.listAvailability,
  setAvailability: calendarsAvailabilityRouter.setAvailability,
  listBlockedDates: calendarsAvailabilityRouter.listBlockedDates,
  addBlockedDate: calendarsAvailabilityRouter.addBlockedDate,
  removeBlockedDate: calendarsAvailabilityRouter.removeBlockedDate,
  getSlots: calendarsAvailabilityRouter.getSlots,
});

// Re-export sub-routers for direct access if needed
export {
  calendarsCoreRouter,
  calendarsAccessRouter,
  calendarsAppointmentsRouter,
  calendarsAvailabilityRouter,
};
