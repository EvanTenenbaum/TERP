import { jsPDF } from "jspdf";

export interface InvoicePdfLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate?: Date | null;
  clientName: string;
  clientAddress?: string | null;
  subtotal: string;
  taxAmount?: string | null;
  discountAmount?: string | null;
  totalAmount: string;
  amountDue: string;
  notes?: string | null;
  lineItems: InvoicePdfLineItem[];
}

function formatCurrency(value: string | number | null | undefined): string {
  const numeric = typeof value === "string" ? parseFloat(value) : (value ?? 0);
  if (!Number.isFinite(numeric)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numeric);
}

function formatDate(value: Date | null | undefined): string {
  if (!value) return "-";
  return value.toLocaleDateString("en-US");
}

export function generateInvoicePdf(data: InvoicePdfData): string {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const marginX = 40;
  let y = 40;

  doc.setFontSize(18);
  doc.text(`Invoice ${data.invoiceNumber}`, marginX, y);

  doc.setFontSize(10);
  y += 18;
  doc.text(`Invoice Date: ${formatDate(data.invoiceDate)}`, marginX, y);
  y += 14;
  doc.text(`Due Date: ${formatDate(data.dueDate ?? null)}`, marginX, y);

  y += 22;
  doc.setFontSize(12);
  doc.text("Bill To:", marginX, y);
  y += 14;
  doc.setFontSize(10);
  doc.text(data.clientName, marginX, y);
  if (data.clientAddress) {
    y += 12;
    doc.text(data.clientAddress, marginX, y);
  }

  y += 24;
  doc.setFontSize(12);
  doc.text("Line Items", marginX, y);
  y += 12;

  doc.setFontSize(10);
  doc.text("Description", marginX, y);
  doc.text("Qty", marginX + 260, y);
  doc.text("Unit Price", marginX + 310, y);
  doc.text("Total", marginX + 400, y);
  y += 8;
  doc.line(marginX, y, marginX + 500, y);
  y += 14;

  data.lineItems.forEach(item => {
    doc.text(item.description, marginX, y);
    doc.text(item.quantity, marginX + 260, y, { align: "right" });
    doc.text(formatCurrency(item.unitPrice), marginX + 360, y, {
      align: "right",
    });
    doc.text(formatCurrency(item.lineTotal), marginX + 500, y, {
      align: "right",
    });
    y += 14;
    if (y > 700) {
      doc.addPage();
      y = 40;
    }
  });

  y += 12;
  doc.line(marginX, y, marginX + 500, y);
  y += 16;

  doc.text(`Subtotal: ${formatCurrency(data.subtotal)}`, marginX + 300, y);
  y += 14;
  if (data.taxAmount) {
    doc.text(`Tax: ${formatCurrency(data.taxAmount)}`, marginX + 300, y);
    y += 14;
  }
  if (data.discountAmount) {
    doc.text(
      `Discount: ${formatCurrency(data.discountAmount)}`,
      marginX + 300,
      y
    );
    y += 14;
  }
  doc.setFontSize(12);
  doc.text(`Total: ${formatCurrency(data.totalAmount)}`, marginX + 300, y);
  y += 16;
  doc.text(`Amount Due: ${formatCurrency(data.amountDue)}`, marginX + 300, y);

  if (data.notes) {
    y += 24;
    doc.setFontSize(10);
    doc.text("Notes:", marginX, y);
    y += 12;
    doc.text(data.notes, marginX, y);
  }

  const dataUri = doc.output("datauristring");
  const base64 = dataUri.split(",")[1];
  if (!base64) {
    throw new Error("Failed to generate invoice PDF");
  }
  return base64;
}
