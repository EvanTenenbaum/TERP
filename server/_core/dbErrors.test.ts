import { describe, expect, it } from "vitest";
import { isMissingTableError, isSchemaDriftError } from "./dbErrors";

describe("isMissingTableError", () => {
  it("detects MySQL error code 1146", () => {
    const error = {
      code: "1146",
      message: "Table 'terp.vendor_payables' doesn't exist",
    };
    expect(isMissingTableError(error)).toBe(true);
  });

  it("detects ER_NO_SUCH_TABLE error code", () => {
    const error = { code: "ER_NO_SUCH_TABLE", message: "Table doesn't exist" };
    expect(isMissingTableError(error)).toBe(true);
  });

  it("detects er_no_such_table in message", () => {
    const error = {
      code: "UNKNOWN",
      message: "er_no_such_table: cash_locations",
    };
    expect(isMissingTableError(error)).toBe(true);
  });

  it("detects 'table doesn't exist' in message", () => {
    const error = { message: "Table 'terp.bills' doesn't exist" };
    expect(isMissingTableError(error)).toBe(true);
  });

  it("detects 'table does not exist' in message", () => {
    const error = { message: "Table 'terp.bills' does not exist" };
    expect(isMissingTableError(error)).toBe(true);
  });

  it("returns false for non-table errors", () => {
    const error = { code: "1045", message: "Access denied for user" };
    expect(isMissingTableError(error)).toBe(false);
  });

  it("returns false for null error", () => {
    expect(isMissingTableError(null)).toBe(false);
  });

  it("returns false for undefined error", () => {
    expect(isMissingTableError(undefined)).toBe(false);
  });

  it("returns false for string error", () => {
    expect(isMissingTableError("some string error")).toBe(false);
  });

  it("returns false for number error", () => {
    expect(isMissingTableError(42)).toBe(false);
  });

  it("narrows to specific table when tableHints provided", () => {
    const error = {
      code: "1146",
      message: "Table 'terp.vendor_payables' doesn't exist",
    };
    expect(isMissingTableError(error, ["vendor_payables"])).toBe(true);
    expect(isMissingTableError(error, ["cash_locations"])).toBe(false);
  });

  it("matches any hint in the list", () => {
    const error = { code: "1146", message: "Table 'terp.bills' doesn't exist" };
    expect(isMissingTableError(error, ["cash_locations", "bills"])).toBe(true);
  });

  it("is case-insensitive on table hints", () => {
    const error = {
      code: "1146",
      message: "Table 'terp.VENDOR_PAYABLES' doesn't exist",
    };
    expect(isMissingTableError(error, ["vendor_payables"])).toBe(true);
  });

  it("uses errno as fallback when code is missing", () => {
    const error = { errno: 1146, message: "Table doesn't exist" };
    expect(isMissingTableError(error)).toBe(true);
  });

  it("detects missing table from wrapped cause errors", () => {
    const wrappedError = {
      message: "Failed query: select * from `cash_locations`",
      cause: {
        code: "ER_NO_SUCH_TABLE",
        message: "Table 'terp.cash_locations' doesn't exist",
      },
    };

    expect(isMissingTableError(wrappedError, ["cash_locations"])).toBe(true);
  });
});

describe("isSchemaDriftError", () => {
  it("detects unknown column errors by code", () => {
    const error = {
      code: "ER_BAD_FIELD_ERROR",
      message: "Unknown column 'vendor_payable_status' in 'field list'",
    };
    expect(isSchemaDriftError(error, ["vendor_payable_status"])).toBe(true);
  });

  it("detects unknown column from wrapped driver errors", () => {
    const error = {
      message: "Failed query: select `vendor_payables`.`vendor_payable_status`",
      cause: {
        errno: 1054,
        sqlMessage:
          "Unknown column 'vendor_payables.vendor_payable_status' in 'field list'",
      },
    };
    expect(isSchemaDriftError(error, ["vendor_payables"])).toBe(true);
  });

  it("returns false for non-schema errors", () => {
    const error = { code: "1045", message: "Access denied for user" };
    expect(isSchemaDriftError(error)).toBe(false);
  });

  it("detects drift from drizzle failed-query wrapper when hint matches", () => {
    const error = {
      message:
        "Failed query: select `vendor_payables`.`vendor_payable_status` from `vendor_payables` where `vendor_payables`.`deleted_at` is null",
    };
    expect(isSchemaDriftError(error, ["vendor_payable_status"])).toBe(true);
  });
});
