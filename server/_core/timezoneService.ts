/**
 * Timezone Service
 * Handles IANA timezone conversions, DST transitions, and ghost time prevention
 * 
 * Critical for Calendar & Scheduling Module
 * Version 2.0 - Post-Adversarial QA
 */

import { TRPCError } from "@trpc/server";

/**
 * List of valid IANA timezone identifiers
 * This is a subset of commonly used timezones
 * For production, consider using a complete list or validation library
 */
const VALID_TIMEZONES = [
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

export type ValidTimezone = typeof VALID_TIMEZONES[number];

/**
 * Timezone Service
 * Provides timezone conversion and validation utilities
 */
export class TimezoneService {
  /**
   * Validate IANA timezone identifier
   */
  static isValidTimezone(timezone: string): boolean {
    try {
      // Try to create a date formatter with the timezone
      // This will throw if the timezone is invalid
      Intl.DateTimeFormat(undefined, { timeZone: timezone });
      return true;
    } catch (error) {
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

    // Parse the date and time in the source timezone
    const dateTimeString = `${date}T${time}`;
    const sourceDate = new Date(dateTimeString);

    // Format in target timezone
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: toTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(sourceDate);
    const year = parts.find(p => p.type === "year")?.value;
    const month = parts.find(p => p.type === "month")?.value;
    const day = parts.find(p => p.type === "day")?.value;
    const hour = parts.find(p => p.type === "hour")?.value;
    const minute = parts.find(p => p.type === "minute")?.value;
    const second = parts.find(p => p.type === "second")?.value;

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}:${second}`,
    };
  }

  /**
   * Check if a date/time falls in a DST transition gap (ghost time)
   * Returns true if the time doesn't exist due to DST spring-forward
   */
  static isGhostTime(date: string, time: string, timezone: string): boolean {
    this.validateTimezone(timezone);

    try {
      // Create a date object in the specified timezone
      const dateTimeString = `${date}T${time}`;
      const testDate = new Date(dateTimeString);

      // Format it back in the same timezone
      const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      });

      const parts = formatter.formatToParts(testDate);
      const formattedHour = parts.find(p => p.type === "hour")?.value;
      const formattedMinute = parts.find(p => p.type === "minute")?.value;
      const formattedTime = `${formattedHour}:${formattedMinute}`;

      // Normalize input time to HH:MM format (remove seconds if present)
      const normalizedInputTime = time.split(':').slice(0, 2).join(':');

      // If the formatted time doesn't match the input time, it's a ghost time
      return formattedTime !== normalizedInputTime;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a date/time is ambiguous due to DST fall-back
   * Returns true if the time occurs twice due to DST
   */
  static isAmbiguousTime(date: string, time: string, timezone: string): boolean {
    this.validateTimezone(timezone);

    try {
      // This is a simplified check
      // A more robust implementation would check DST transition dates
      const dateTimeString = `${date}T${time}`;
      const testDate = new Date(dateTimeString);

      // Check if we're near a DST transition
      // This is a heuristic - proper implementation would use timezone database
      const hourBefore = new Date(testDate.getTime() - 3600000);
      const hourAfter = new Date(testDate.getTime() + 3600000);

      const offsetBefore = this.getTimezoneOffset(hourBefore, timezone);
      const offsetCurrent = this.getTimezoneOffset(testDate, timezone);
      const offsetAfter = this.getTimezoneOffset(hourAfter, timezone);

      // If offset changes around this time, it might be ambiguous
      return offsetBefore !== offsetCurrent || offsetCurrent !== offsetAfter;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get timezone offset for a specific date
   * Returns offset in minutes
   */
  static getTimezoneOffset(date: Date, timezone: string): number {
    this.validateTimezone(timezone);

    const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
    const tzDate = new Date(date.toLocaleString("en-US", { timeZone: timezone }));

    return (utcDate.getTime() - tzDate.getTime()) / 60000;
  }

  /**
   * Validate date and time for a specific timezone
   * Throws error if the time is invalid (ghost time)
   */
  static validateDateTime(
    date: string,
    time: string | null,
    timezone: string
  ): void {
    this.validateTimezone(timezone);

    if (!time) {
      // All-day events don't have time validation issues
      return;
    }

    // Check for ghost time
    if (this.isGhostTime(date, time, timezone)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Invalid time ${time} on ${date} in timezone ${timezone}. This time does not exist due to DST transition (spring-forward).`,
      });
    }

    // Warn about ambiguous time (but don't throw)
    if (this.isAmbiguousTime(date, time, timezone)) {
      console.warn(
        `Ambiguous time ${time} on ${date} in timezone ${timezone}. This time occurs twice due to DST transition (fall-back).`
      );
    }
  }

  /**
   * Get current date and time in a specific timezone
   */
  static getCurrentDateTime(timezone: string): { date: string; time: string } {
    this.validateTimezone(timezone);

    const now = new Date();
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });

    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === "year")?.value;
    const month = parts.find(p => p.type === "month")?.value;
    const day = parts.find(p => p.type === "day")?.value;
    const hour = parts.find(p => p.type === "hour")?.value;
    const minute = parts.find(p => p.type === "minute")?.value;
    const second = parts.find(p => p.type === "second")?.value;

    return {
      date: `${year}-${month}-${day}`,
      time: `${hour}:${minute}:${second}`,
    };
  }

  /**
   * Format date and time for display in a specific timezone
   */
  static formatDateTime(
    date: string,
    time: string | null,
    timezone: string,
    locale: string = "en-US"
  ): string {
    this.validateTimezone(timezone);

    if (!time) {
      // All-day event
      const dateObj = new Date(date);
      return dateObj.toLocaleDateString(locale, {
        timeZone: timezone,
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }

    const dateTimeString = `${date}T${time}`;
    const dateObj = new Date(dateTimeString);

    return dateObj.toLocaleString(locale, {
      timeZone: timezone,
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }

  /**
   * Get list of common timezones for UI
   */
  static getCommonTimezones(): Array<{ value: string; label: string; offset: string }> {
    return VALID_TIMEZONES.map(tz => {
      const now = new Date();
      const offset = this.getTimezoneOffset(now, tz);
      const offsetHours = Math.floor(Math.abs(offset) / 60);
      const offsetMinutes = Math.abs(offset) % 60;
      const offsetSign = offset <= 0 ? "+" : "-";
      const offsetString = `UTC${offsetSign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`;

      return {
        value: tz,
        label: tz.replace(/_/g, " "),
        offset: offsetString,
      };
    });
  }
}

export default TimezoneService;
