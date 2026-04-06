export function formatInvoiceNumberForDisplay(
  invoiceNumber: string | null | undefined
): string {
  if (!invoiceNumber) {
    return "-";
  }

  const trimmed = invoiceNumber.trim();
  if (!trimmed) {
    return "-";
  }

  const upper = trimmed.toUpperCase();
  if (!upper.startsWith("INV-")) {
    return trimmed;
  }

  const parts = upper.split("-");
  const lastNumericPart = [...parts].reverse().find(part => /^\d+$/.test(part));

  if (!lastNumericPart) {
    return upper;
  }

  return `INV-${lastNumericPart.slice(-6).padStart(6, "0")}`;
}
