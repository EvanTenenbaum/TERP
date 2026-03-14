import { describe, expect, it } from "vitest";

import { parseInvoiceDeepLink } from "./invoiceDeepLink";

describe("parseInvoiceDeepLink", () => {
  it("hydrates the selected invoice id from canonical accounting links", () => {
    expect(parseInvoiceDeepLink("?tab=invoices&id=91")).toEqual({
      invoiceId: 91,
      openRecordPayment: false,
      statusFilter: null,
    });
  });

  it("hydrates record-payment intent from sales handoffs", () => {
    expect(
      parseInvoiceDeepLink(
        "?tab=invoices&id=91&openRecordPayment=true&orderId=33&from=sales"
      )
    ).toEqual({
      invoiceId: 91,
      openRecordPayment: true,
      statusFilter: null,
    });
  });

  it("ignores invalid invoice ids", () => {
    expect(parseInvoiceDeepLink("?id=abc&openRecordPayment=true")).toEqual({
      invoiceId: null,
      openRecordPayment: true,
      statusFilter: null,
    });
  });

  it("hydrates invoice status filters from dashboard handoffs", () => {
    expect(parseInvoiceDeepLink("?status=OVERDUE")).toEqual({
      invoiceId: null,
      openRecordPayment: false,
      statusFilter: "OVERDUE",
    });
  });
});
