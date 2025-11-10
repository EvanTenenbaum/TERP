/**
 * TimezoneService Tests
 * Comprehensive test suite for timezone handling including DST edge cases
 */

import { describe, it, expect } from "vitest";
import { TimezoneService } from "./timezoneService";
import { TRPCError } from "@trpc/server";

describe("TimezoneService", () => {
  describe("isValidTimezone", () => {
    it("should return true for valid IANA timezones", () => {
      expect(TimezoneService.isValidTimezone("America/New_York")).toBe(true);
      expect(TimezoneService.isValidTimezone("Europe/London")).toBe(true);
      expect(TimezoneService.isValidTimezone("Asia/Tokyo")).toBe(true);
      expect(TimezoneService.isValidTimezone("UTC")).toBe(true);
    });

    it("should return false for invalid timezones", () => {
      expect(TimezoneService.isValidTimezone("Invalid/Timezone")).toBe(false);
      expect(TimezoneService.isValidTimezone("NotATimezone")).toBe(false);
      expect(TimezoneService.isValidTimezone("")).toBe(false);
    });
  });

  describe("validateTimezone", () => {
    it("should not throw for valid timezones", () => {
      expect(() => TimezoneService.validateTimezone("America/New_York")).not.toThrow();
    });

    it("should throw TRPCError for invalid timezones", () => {
      expect(() => TimezoneService.validateTimezone("Invalid/Timezone")).toThrow(TRPCError);
    });
  });

  describe("convertTimezone", () => {
    it("should convert time between timezones", () => {
      const result = TimezoneService.convertTimezone(
        "2025-01-15",
        "12:00:00",
        "America/New_York",
        "America/Los_Angeles"
      );

      expect(result.date).toBe("2025-01-15");
      expect(result.time).toBe("09:00:00"); // 3 hours behind
    });

    it("should handle all-day events (no time)", () => {
      const result = TimezoneService.convertTimezone(
        "2025-01-15",
        null,
        "America/New_York",
        "America/Los_Angeles"
      );

      expect(result.date).toBe("2025-01-15");
      expect(result.time).toBeNull();
    });

    it("should handle date changes when converting across timezones", () => {
      const result = TimezoneService.convertTimezone(
        "2025-01-15",
        "01:00:00",
        "America/New_York",
        "Asia/Tokyo"
      );

      expect(result.date).toBe("2025-01-15"); // Tokyo is ahead, so same day at later time
      expect(result.time).toBe("15:00:00"); // 14 hours ahead
    });
  });

  describe("validateDateTime - DST Ghost Times", () => {
    it("should reject ghost time during spring-forward in America/New_York (2:30 AM doesn't exist)", () => {
      // March 9, 2025 at 2:00 AM, clocks spring forward to 3:00 AM
      expect(() => {
        TimezoneService.validateDateTime("2025-03-09", "02:30:00", "America/New_York");
      }).toThrow(TRPCError);
    });

    it("should accept valid time just before spring-forward", () => {
      // March 9, 2025 at 1:59 AM is valid (before spring-forward)
      expect(() => {
        TimezoneService.validateDateTime("2025-03-09", "01:59:00", "America/New_York");
      }).not.toThrow();
    });

    it("should accept valid time just after spring-forward", () => {
      // March 9, 2025 at 3:00 AM is valid (after spring-forward)
      expect(() => {
        TimezoneService.validateDateTime("2025-03-09", "03:00:00", "America/New_York");
      }).not.toThrow();
    });

    it("should accept normal times not affected by DST", () => {
      // November 10, 2025 at 9:00 AM is NOT a DST transition
      expect(() => {
        TimezoneService.validateDateTime("2025-11-10", "09:00:00", "America/New_York");
      }).not.toThrow();
    });
  });

  describe("validateDateTime - DST Fall-Back (Ambiguous Times)", () => {
    it("should accept ambiguous time during fall-back (occurs twice)", () => {
      // November 2, 2025 at 1:30 AM occurs twice (fall-back)
      // Luxon defaults to the first occurrence, which is valid
      expect(() => {
        TimezoneService.validateDateTime("2025-11-02", "01:30:00", "America/New_York");
      }).not.toThrow();
    });
  });

  describe("getCurrentTime", () => {
    it("should return current time in specified timezone", () => {
      const result = TimezoneService.getCurrentTime("America/New_York");

      expect(result.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(result.time).toMatch(/^\d{2}:\d{2}:\d{2}$/);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });

  describe("formatDateTime", () => {
    it("should format date/time for display", () => {
      const result = TimezoneService.formatDateTime(
        "2025-01-15",
        "12:00:00",
        "America/New_York",
        "DATETIME_MED"
      );

      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2025");
    });

    it("should format all-day events", () => {
      const result = TimezoneService.formatDateTime(
        "2025-01-15",
        null,
        "America/New_York"
      );

      expect(result).toContain("Jan");
      expect(result).toContain("15");
    });
  });

  describe("calculateDuration", () => {
    it("should calculate duration between two times", () => {
      const result = TimezoneService.calculateDuration(
        "2025-01-15",
        "09:00:00",
        "2025-01-15",
        "10:30:00",
        "America/New_York"
      );

      expect(result.hours).toBe(1);
      expect(result.minutes).toBe(30);
      expect(result.totalMinutes).toBe(90);
    });

    it("should handle duration across days", () => {
      const result = TimezoneService.calculateDuration(
        "2025-01-15",
        "23:00:00",
        "2025-01-16",
        "01:00:00",
        "America/New_York"
      );

      expect(result.hours).toBe(2);
      expect(result.minutes).toBe(0);
      expect(result.totalMinutes).toBe(120);
    });
  });

  describe("isInDST", () => {
    it("should return true for dates in DST", () => {
      // July is in DST for America/New_York
      const result = TimezoneService.isInDST("2025-07-15", "12:00:00", "America/New_York");
      expect(result).toBe(true);
    });

    it("should return false for dates not in DST", () => {
      // January is not in DST for America/New_York
      const result = TimezoneService.isInDST("2025-01-15", "12:00:00", "America/New_York");
      expect(result).toBe(false);
    });
  });

  describe("getTimezoneOffset", () => {
    it("should return timezone offset", () => {
      const result = TimezoneService.getTimezoneOffset(
        "2025-01-15",
        "12:00:00",
        "America/New_York"
      );

      expect(result.offset).toBe(-300); // EST is UTC-5 (300 minutes)
      expect(result.offsetString).toMatch(/EST|EDT/);
    });

    it("should return different offset during DST", () => {
      const result = TimezoneService.getTimezoneOffset(
        "2025-07-15",
        "12:00:00",
        "America/New_York"
      );

      expect(result.offset).toBe(-240); // EDT is UTC-4 (240 minutes)
      expect(result.offsetString).toMatch(/EDT/);
    });
  });
});
