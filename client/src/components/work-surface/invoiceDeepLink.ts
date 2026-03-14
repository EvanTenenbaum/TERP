export interface InvoiceDeepLinkContext {
  invoiceId: number | null;
  openRecordPayment: boolean;
}

function parsePositiveInt(value: string | null): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function parseInvoiceDeepLink(search: string): InvoiceDeepLinkContext {
  const params = new URLSearchParams(search);

  return {
    invoiceId: parsePositiveInt(params.get("id") ?? params.get("invoiceId")),
    openRecordPayment: params.get("openRecordPayment") === "true",
  };
}
