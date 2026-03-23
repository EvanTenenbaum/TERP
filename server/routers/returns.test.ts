import { describe, expect, it } from "vitest";
import {
  pickReturnAccountingInvoice,
  validateReceivedReturnQuantities,
  isValidReturnStatusTransition,
  extractReturnStatus,
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

  describe("DISC-RET-001: double-credit prevention", () => {
    it("PROCESSED is a terminal state — prevents re-processing a return", () => {
      // Once a return is PROCESSED (credit issued), the state machine must
      // block any further transition, including a second PROCESSED attempt.
      expect(isValidReturnStatusTransition("PROCESSED", "PROCESSED")).toBe(
        false
      );
      expect(isValidReturnStatusTransition("PROCESSED", "RECEIVED")).toBe(
        false
      );
      expect(isValidReturnStatusTransition("PROCESSED", "CANCELLED")).toBe(
        false
      );
    });

    it("extractReturnStatus detects PROCESSED even when preceded by earlier statuses", () => {
      // The create path may append notes; the process path appends [PROCESSED].
      // Both credit paths must see the same terminal state.
      const notes =
        "[APPROVED by User #1 at 2026-03-01] | [RECEIVED by User #2 at 2026-03-02] | [PROCESSED by User #3 at 2026-03-03] | Credit issued: Credit #42";
      expect(extractReturnStatus(notes)).toBe("PROCESSED");
    });

    it("only RECEIVED can transition to PROCESSED — skipping steps is blocked", () => {
      // Ensures that a return cannot jump straight to PROCESSED from earlier states
      expect(isValidReturnStatusTransition("PENDING", "PROCESSED")).toBe(false);
      expect(isValidReturnStatusTransition("APPROVED", "PROCESSED")).toBe(
        false
      );
      // Only RECEIVED -> PROCESSED is valid
      expect(isValidReturnStatusTransition("RECEIVED", "PROCESSED")).toBe(true);
    });

    it("pickReturnAccountingInvoice returns the same invoice for both create and process paths", () => {
      // Both returns.create and returns.process use pickReturnAccountingInvoice
      // to find the target invoice. The idempotency guard in both paths checks
      // (clientId, creditReason=RETURN, transactionId=invoiceId). If the same
      // invoice is selected, the guard catches duplicates.
      const invoices = [
        { id: 10, status: "SENT", hasLedgerEntries: 1 },
        { id: 11, status: "DRAFT", hasLedgerEntries: 0 },
        { id: 12, status: "SENT", hasLedgerEntries: 0 },
      ];

      // Call twice — must return the same invoice both times
      const first = pickReturnAccountingInvoice(invoices);
      const second = pickReturnAccountingInvoice(invoices);
      expect(first?.id).toBe(second?.id);
      // And it should be the posted non-draft invoice
      expect(first?.id).toBe(10);
    });
  });
});
