import { describe, expect, it } from "vitest";
import {
  pickReturnAccountingInvoice,
  validateReceivedReturnQuantities,
} from "./returns";

describe("returns router helpers", () => {
  describe("pickReturnAccountingInvoice", () => {
    it("prefers the newest non-draft invoice with posted ledger entries", () => {
      const candidate = pickReturnAccountingInvoice([
        { id: 9, status: "DRAFT", hasLedgerEntries: 0 },
        { id: 8, status: "SENT", hasLedgerEntries: 0 },
        { id: 7, status: "PARTIAL", hasLedgerEntries: 1 },
      ]);

      expect(candidate?.id).toBe(7);
    });

    it("falls back to the newest non-draft invoice when nothing is posted", () => {
      const candidate = pickReturnAccountingInvoice([
        { id: 4, status: "DRAFT", hasLedgerEntries: 0 },
        { id: 3, status: "SENT", hasLedgerEntries: 0 },
        { id: 2, status: "PARTIAL", hasLedgerEntries: 0 },
      ]);

      expect(candidate?.id).toBe(3);
    });
  });

  describe("validateReceivedReturnQuantities", () => {
    it("accepts quantities that stay within the original return total", () => {
      expect(() =>
        validateReceivedReturnQuantities(
          [
            { batchId: 101, quantity: "2.00" },
            { batchId: 101, quantity: "1.00" },
          ],
          [
            { batchId: 101, receivedQuantity: "1.50" },
            { batchId: 101, receivedQuantity: "1.50" },
          ]
        )
      ).not.toThrow();
    });

    it("rejects batches that were not part of the return", () => {
      expect(() =>
        validateReceivedReturnQuantities(
          [{ batchId: 101, quantity: "2.00" }],
          [{ batchId: 999, receivedQuantity: "1.00" }]
        )
      ).toThrow(/not part of this return/i);
    });

    it("rejects combined quantities that exceed the original return", () => {
      expect(() =>
        validateReceivedReturnQuantities(
          [{ batchId: 101, quantity: "2.00" }],
          [
            { batchId: 101, receivedQuantity: "1.25" },
            { batchId: 101, receivedQuantity: "1.25" },
          ]
        )
      ).toThrow(/cannot exceed the original return quantity/i);
    });
  });
});
