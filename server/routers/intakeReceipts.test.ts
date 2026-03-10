import { describe, expect, it } from "vitest";
import { shouldFallbackListReceiptsSchemaDrift } from "./intakeReceipts";

describe("intakeReceipts schema drift fallback", () => {
  it("recognizes missing receiving schema paths from production", () => {
    expect(
      shouldFallbackListReceiptsSchemaDrift(
        new Error("Table 'defaultdb.intake_receipts' doesn't exist")
      )
    ).toBe(true);
    expect(
      shouldFallbackListReceiptsSchemaDrift(
        new Error("Unknown column 'intake_receipts.farmer_verified_at'")
      )
    ).toBe(true);
    expect(
      shouldFallbackListReceiptsSchemaDrift(
        new Error("Unknown column 'intake_receipt_items.receipt_id'")
      )
    ).toBe(true);
  });

  it("does not hide non-schema failures", () => {
    expect(
      shouldFallbackListReceiptsSchemaDrift(new Error("read ECONNRESET"))
    ).toBe(false);
  });
});
