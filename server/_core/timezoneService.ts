/**
 * Timezone Service
 * Handles IANA timezone conversions, DST transitions, and ghost time prevention
 * 
 * Critical for Calendar & Scheduling Module
 * Version 3.0 - Rewritten with Luxon for proper DST handling
 */

import { TRPCError } from "@trpc/server";
import { DateTime, IANAZone } from "luxon";

/**
 * List of valid IANA timezone identifiers
 * This is a subset of commonly used timezones
 * For production, consider using a complete list or validation library
 */
const _VALID_TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Asia/Shanghai",
  "Asia/Dubai",
  "Australia/Sydney",
  "UTC",
] as const;

export type ValidTimezone = typeof _VALID_TIMEZONES[number];

/**
 * Timezone Service
 * Provides timezone conversion and validation utilities using Luxon
 */
export class TimezoneService {
  /**
   * Validate IANA timezone identifier
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      const zone = IANAZone.create(timezone);
      return zone.isValid;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Validate timezone and throw error if invalid
   */
  static validateTimezone(timezone: string): void {
    if (!this.isValidTimezone(timezone)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid timezone identifier: ${timezone}. Must be a valid IANA timezone.`,
      });
    }
  }

  /**
   * Convert a date and time from one timezone to another
   * Returns ISO string in target timezone
   */
  static convertTimezone(
    date: string,
    time: string | null,
    fromTimezone: string,
    toTimezone: string
  ): { date: string; time: string | null } {
    this.validateTimezone(fromTimezone);
    this.validateTimezone(toTimezone);

    // If no time specified (all-day event), just return the date
    if (!time) {
      return { date, time: null };
    }

    // Parse the date and time in the source timezone using Luxon
    const dateTimeString = `${date}T${time}`;
    const sourceDateTime = DateTime.fromISO(dateTimeString, { zone: fromTimezone });

    if (!sourceDateTime.isValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid date/time: ${dateTimeString} in timezone ${fromTimezone}`,
      });
    }

    // Convert to target timezone
    const targetDateTime = sourceDateTime.setZone(toTimezone);

    return {
      date: targetDateTime.toISODate() || date,
      time: targetDateTime.toFormat("HH:mm:ss"),
    };
  }

  /**
   * Get current time in a specific timezone
   */
  static getCurrentTime(timezone: string): {
    date: string;
    time: string;
    timestamp: number;
  } {
    this.validateTimezone(timezone);

    const now = DateTime.now().setZone(timezone);

    return {
      date: now.toISODate() || "",
      time: now.toFormat("HH:mm:ss"),
      timestamp: now.toMillis(),
    };
  }

  /**
   * Validate date/time combination in a specific timezone
   * Checks for DST ghost times (spring-forward) and ambiguous times (fall-back)
   * 
   * @throws TRPCError if the date/time is invalid or is a DST ghost time
   * @param date - Date string in YYYY-MM-DD format
   * @param time - Time string in HH:mm or HH:mm:ss format
   * @param timezone - IANA timezone identifier
   */
  static validateDateTime(date: string, time: string, timezone: string): void {
    this.validateTimezone(timezone);

    // Parse the date and time in the specified timezone
    const dateTimeString = `${date}T${time}`;
    const dt = DateTime.fromISO(dateTimeString, { zone: timezone });

    // Check if the DateTime is valid
    if (!dt.isValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid date/time: ${dateTimeString} in timezone ${timezone}. ${dt.invalidReason || ""}`,
      });
    }

    // Check for DST ghost time (spring-forward)
    // A ghost time is when the clock jumps forward (e.g., 2:00 AM -> 3:00 AM)
    // These times don't exist in the timezone
    const inputTime = time.split(":").slice(0, 2).join(":"); // Get HH:mm
    const parsedTime = dt.toFormat("HH:mm");

    if (inputTime !== parsedTime) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid time ${time} on ${date} in timezone ${timezone}. This time does not exist due to DST transition (spring-forward). The clock jumps from ${inputTime} to ${parsedTime}.`,
      });
    }

    // Check for ambiguous time (fall-back)
    // An ambiguous time occurs twice when the clock falls back (e.g., 1:00 AM -> 1:00 AM again)
    // Luxon handles this by defaulting to the first occurrence
    // We'll just warn about this in the logs but allow it
    if (dt.isInDST !== undefined) {
      const oneHourLater = dt.plus({ hours: 1 });
      const oneHourEarlier = dt.minus({ hours: 1 });

      // If adding/subtracting an hour changes DST status, we're near a transition
      if (dt.isInDST !== oneHourLater.isInDST || dt.isInDST !== oneHourEarlier.isInDST) {
        console.warn(
          `Ambiguous time detected: ${time} on ${date} in ${timezone}. ` +
          `This time occurs twice due to DST fall-back. Using the first occurrence.`
        );
      }
    }
  }

  /**
   * Format a date/time for display in a specific timezone
   */
  static formatDateTime(
    date: string,
    time: string | null,
    timezone: string,
    format: string = "DATETIME_MED"
  ): string {
    this.validateTimezone(timezone);

    if (!time) {
      // All-day event
      const dt = DateTime.fromISO(date, { zone: timezone });
      return dt.toLocaleString(DateTime.DATE_MED);
    }

    const dateTimeString = `${date}T${time}`;
    const dt = DateTime.fromISO(dateTimeString, { zone: timezone });

    if (!dt.isValid) {
      return "Invalid Date";
    }

    // Use Luxon's built-in formats
    switch (format) {
      case "DATETIME_SHORT":
        return dt.toLocaleString(DateTime.DATETIME_SHORT);
      case "DATETIME_MED":
        return dt.toLocaleString(DateTime.DATETIME_MED);
      case "DATETIME_FULL":
        return dt.toLocaleString(DateTime.DATETIME_FULL);
      default:
        return dt.toFormat(format);
    }
  }

  /**
   * Calculate duration between two date/times in a specific timezone
   */
  static calculateDuration(
    startDate: string,
    startTime: string,
    endDate: string,
    endTime: string,
    timezone: string
  ): {
    hours: number;
    minutes: number;
    totalMinutes: number;
  } {
    this.validateTimezone(timezone);

    const start = DateTime.fromISO(`${startDate}T${startTime}`, { zone: timezone });
    const end = DateTime.fromISO(`${endDate}T${endTime}`, { zone: timezone });

    if (!start.isValid || !end.isValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid start or end date/time",
      });
    }

    const diff = end.diff(start, ["hours", "minutes"]);

    return {
      hours: Math.floor(diff.hours),
      minutes: Math.floor(diff.minutes % 60),
      totalMinutes: Math.floor(diff.as("minutes")),
    };
  }

  /**
   * Check if a date/time is in DST for a given timezone
   */
  static isInDST(date: string, time: string, timezone: string): boolean {
    this.validateTimezone(timezone);

    const dt = DateTime.fromISO(`${date}T${time}`, { zone: timezone });

    if (!dt.isValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid date/time",
      });
    }

    return dt.isInDST;
  }

  /**
   * Get timezone offset for a specific date/time
   */
  static getTimezoneOffset(date: string, time: string, timezone: string): {
    offset: number;
    offsetString: string;
  } {
    this.validateTimezone(timezone);

    const dt = DateTime.fromISO(`${date}T${time}`, { zone: timezone });

    if (!dt.isValid) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid date/time",
      });
    }

    return {
      offset: dt.offset,
      offsetString: dt.offsetNameShort || "",
    };
  }
}

// Default export for compatibility
export default TimezoneService;
