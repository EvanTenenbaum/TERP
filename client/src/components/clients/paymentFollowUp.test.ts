import {
  PAYMENT_FOLLOW_UP_SUBJECT_PREFIX,
  buildPaymentFollowUpNotes,
  buildPaymentFollowUpSubject,
  isPaymentFollowUpCommunication,
} from "./paymentFollowUp";

describe("payment follow-up helpers", () => {
  it("builds stable subjects per communication type", () => {
    expect(buildPaymentFollowUpSubject("CALL")).toBe(
      `${PAYMENT_FOLLOW_UP_SUBJECT_PREFIX}: call`
    );
    expect(buildPaymentFollowUpSubject("EMAIL")).toBe(
      `${PAYMENT_FOLLOW_UP_SUBJECT_PREFIX}: email`
    );
  });

  it("detects payment follow-up entries by subject prefix", () => {
    expect(
      isPaymentFollowUpCommunication("Payment follow-up: call")
    ).toBe(true);
    expect(isPaymentFollowUpCommunication(" PAYMENT FOLLOW-UP: note")).toBe(
      true
    );
    expect(isPaymentFollowUpCommunication("Relationship intro")).toBe(false);
  });

  it("builds hybrid follow-up notes with money context", () => {
    expect(
      buildPaymentFollowUpNotes({
        mode: "hybrid",
        receivableAmount: 1250,
        payableAmount: 360,
        openPayableCount: 2,
        netPosition: 890,
      })
    ).toContain("Receivable: $1,250.00");

    expect(
      buildPaymentFollowUpNotes({
        mode: "supplier",
        payableAmount: 360,
        openPayableCount: 2,
      })
    ).toContain("Open payables: 2");
  });
});
