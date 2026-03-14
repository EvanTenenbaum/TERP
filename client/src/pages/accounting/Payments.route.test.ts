import { describe, expect, it } from "vitest";

import {
  parsePaymentRouteContext,
  paymentMatchesSearch,
} from "./Payments";

describe("parsePaymentRouteContext", () => {
  it("hydrates canonical payment deep links", () => {
    expect(parsePaymentRouteContext("?tab=payments&id=12")).toEqual({
      paymentId: 12,
      invoiceId: null,
      orderId: null,
      initialSearchQuery: "12",
    });
  });

  it("hydrates invoice-filtered payment links", () => {
    expect(parsePaymentRouteContext("?tab=payments&invoiceId=91")).toEqual({
      paymentId: null,
      invoiceId: 91,
      orderId: null,
      initialSearchQuery: "",
    });
  });
});

describe("paymentMatchesSearch", () => {
  const payment = {
    id: 12,
    paymentNumber: "PMT-00012",
    referenceNumber: "ORD-91",
    invoiceId: 91,
  } as const;

  it("matches by payment id, payment number, reference number, and invoice id", () => {
    expect(paymentMatchesSearch(payment, "12")).toBe(true);
    expect(paymentMatchesSearch(payment, "pmt-00012")).toBe(true);
    expect(paymentMatchesSearch(payment, "ord-91")).toBe(true);
    expect(paymentMatchesSearch(payment, "91")).toBe(true);
  });

  it("returns false for unrelated terms", () => {
    expect(paymentMatchesSearch(payment, "missing")).toBe(false);
  });
});
