export interface InvoiceDeepLinkContext {
  invoiceId: number | null;
  openRecordPayment: boolean;
  statusFilter: InvoiceStatusFilter | null;
}

type InvoiceStatusFilter =
  | "DRAFT"
  | "SENT"
  | "VIEWED"
  | "PARTIAL"
  | "PAID"
  | "OVERDUE"
  | "VOID";

function parseInvoiceStatusFilter(value: string | null): InvoiceStatusFilter | null {
  switch (value) {
    case "DRAFT":
    case "SENT":
    case "VIEWED":
    case "PARTIAL":
    case "PAID":
    case "OVERDUE":
    case "VOID":
      return value;
    default:
      return null;
  }
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
    statusFilter: parseInvoiceStatusFilter(params.get("status")),
  };
}
