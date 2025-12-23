import { describe, it, expect, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";

// Mock the db module before importing the functions
vi.mock("../db", () => ({
  db: {
    query: {
      fiscalPeriods: {
        findFirst: vi.fn(),
      },
    },
  },
}));

import {
  getFiscalPeriodId,
  getCurrentFiscalPeriodId,
  getFiscalPeriodIdOrDefault,
} from "./fiscalPeriod";
import { db } from "../db";

// Type assertion for mocked db
const mockedDb = db as unknown as {
  query: {
    fiscalPeriods: {
      findFirst: ReturnType<typeof vi.fn>;
    };
  };
};

describe("fiscalPeriod", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFiscalPeriodId", () => {
    it("should return period ID for valid date within a period", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue({
        id: 5,
        periodName: "Q1 2025",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-03-31"),
        fiscalYear: 2025,
        status: "OPEN" as const,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        closedBy: null,
      });

      const result = await getFiscalPeriodId(new Date("2025-02-15"));
      expect(result).toBe(5);
      expect(mockedDb.query.fiscalPeriods.findFirst).toHaveBeenCalled();
    });

    it("should throw NOT_FOUND for date with no matching period", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue(undefined);

      await expect(getFiscalPeriodId(new Date("1990-01-01"))).rejects.toThrow(
        TRPCError
      );
      await expect(getFiscalPeriodId(new Date("1990-01-01"))).rejects.toThrow(
        "No fiscal period found for date"
      );
    });

    it("should handle edge case at period boundary (start date)", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue({
        id: 1,
        periodName: "January 2025",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-31"),
        fiscalYear: 2025,
        status: "OPEN" as const,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        closedBy: null,
      });

      const result = await getFiscalPeriodId(new Date("2025-01-01"));
      expect(result).toBe(1);
    });

    it("should handle edge case at period boundary (end date)", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue({
        id: 1,
        periodName: "January 2025",
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-01-31"),
        fiscalYear: 2025,
        status: "OPEN" as const,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        closedBy: null,
      });

      const result = await getFiscalPeriodId(new Date("2025-01-31"));
      expect(result).toBe(1);
    });
  });

  describe("getCurrentFiscalPeriodId", () => {
    it("should return period ID for current date", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue({
        id: 12,
        periodName: "December 2025",
        startDate: new Date("2025-12-01"),
        endDate: new Date("2025-12-31"),
        fiscalYear: 2025,
        status: "OPEN" as const,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        closedBy: null,
      });

      const result = await getCurrentFiscalPeriodId();
      expect(result).toBe(12);
    });

    it("should throw NOT_FOUND if no period exists for today", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue(undefined);

      await expect(getCurrentFiscalPeriodId()).rejects.toThrow(TRPCError);
    });
  });

  describe("getFiscalPeriodIdOrDefault", () => {
    it("should return period ID when period exists", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue({
        id: 7,
        periodName: "July 2025",
        startDate: new Date("2025-07-01"),
        endDate: new Date("2025-07-31"),
        fiscalYear: 2025,
        status: "OPEN" as const,
        deletedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        closedAt: null,
        closedBy: null,
      });

      const result = await getFiscalPeriodIdOrDefault(new Date("2025-07-15"));
      expect(result).toBe(7);
    });

    it("should return default (1) when no period found", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue(undefined);

      const result = await getFiscalPeriodIdOrDefault(new Date("1990-01-01"));
      expect(result).toBe(1);
    });

    it("should return custom default when specified", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockResolvedValue(undefined);

      const result = await getFiscalPeriodIdOrDefault(
        new Date("1990-01-01"),
        99
      );
      expect(result).toBe(99);
    });

    it("should return default when database throws error", async () => {
      mockedDb.query.fiscalPeriods.findFirst.mockRejectedValue(
        new Error("Database connection failed")
      );

      const result = await getFiscalPeriodIdOrDefault(new Date("2025-01-01"));
      expect(result).toBe(1);
    });
  });
});
