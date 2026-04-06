import { describe, expect, it } from "vitest";

import { formatInvoiceNumberForDisplay } from "./invoiceNumber";

describe("formatInvoiceNumberForDisplay", () => {
  it("normalizes canonical yearly invoice numbers into a compact display", () => {
    expect(formatInvoiceNumberForDisplay("INV-2026-000123")).toBe("INV-000123");
  });

  it("preserves already-compact invoice numbers", () => {
    expect(formatInvoiceNumberForDisplay("INV-000034")).toBe("INV-000034");
  });

  it("keeps non-invoice identifiers untouched", () => {
    expect(formatInvoiceNumberForDisplay("PAY-INV-000034")).toBe(
      "PAY-INV-000034"
    );
  });
});
