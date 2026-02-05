/**
 * Invoice PDF Service
 * TER-36: Fix Invoice PDF Generation (GF-004)
 *
 * Generates professional PDF invoices using jsPDF
 */

import { getDb } from "../db";
import { invoices, invoiceLineItems, clients } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { logger } from "../_core/logger";

interface InvoiceLineItem {
  description: string;
  quantity: string;
  unitPrice: string;
  lineTotal: string;
}

interface InvoicePdfData {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: string;
  clientName: string;
  clientAddress?: string;
  clientEmail?: string;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  amountDue: number;
  lineItems: InvoiceLineItem[];
  notes?: string;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format date for display
 */
function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

/**
 * Generate PDF from invoice data using jsPDF
 * Returns base64 encoded PDF data URI
 */
export async function generateInvoicePdf(
  data: InvoicePdfData
): Promise<string> {
  // Dynamic import of jsPDF for server-side usage
  const { jsPDF } = await import("jspdf");

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Header - Company Name
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("INVOICE", pageWidth / 2, y, { align: "center" });
  y += 12;

  // Invoice Number and Status
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100, 100, 100);
  doc.text(`#${data.invoiceNumber}`, pageWidth / 2, y, { align: "center" });
  y += 7;

  // Status badge
  const statusColors: Record<string, [number, number, number]> = {
    DRAFT: [156, 163, 175],
    SENT: [59, 130, 246],
    VIEWED: [99, 102, 241],
    PARTIAL: [245, 158, 11],
    PAID: [34, 197, 94],
    OVERDUE: [239, 68, 68],
    VOID: [156, 163, 175],
  };
  const statusColor = statusColors[data.status] || [100, 100, 100];
  doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.text(data.status, pageWidth / 2, y, { align: "center" });
  y += 15;

  // Divider line
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  // Two column layout for dates and client info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  // Left column - Dates
  doc.setFont("helvetica", "bold");
  doc.text("Invoice Date:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(data.invoiceDate), margin + 35, y);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.text("Due Date:", margin, y);
  doc.setFont("helvetica", "normal");
  doc.text(formatDate(data.dueDate), margin + 35, y);
  y += 15;

  // Client info section
  doc.setFont("helvetica", "bold");
  doc.text("Bill To:", margin, y);
  y += 6;
  doc.setFont("helvetica", "normal");
  doc.text(data.clientName, margin, y);
  y += 5;
  if (data.clientAddress) {
    doc.text(data.clientAddress, margin, y);
    y += 5;
  }
  if (data.clientEmail) {
    doc.text(data.clientEmail, margin, y);
    y += 5;
  }
  y += 10;

  // Line items table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, y, contentWidth, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  y += 5;
  doc.text("Description", margin + 2, y);
  doc.text("Qty", margin + 100, y, { align: "right" });
  doc.text("Unit Price", margin + 125, y, { align: "right" });
  doc.text("Total", pageWidth - margin - 2, y, { align: "right" });
  y += 8;

  // Line items
  doc.setFont("helvetica", "normal");
  for (const item of data.lineItems) {
    // Check if we need a new page
    if (y > 250) {
      doc.addPage();
      y = margin;
    }

    doc.text(item.description.substring(0, 50), margin + 2, y);
    doc.text(item.quantity, margin + 100, y, { align: "right" });
    doc.text(formatCurrency(parseFloat(item.unitPrice)), margin + 125, y, {
      align: "right",
    });
    doc.text(
      formatCurrency(parseFloat(item.lineTotal)),
      pageWidth - margin - 2,
      y,
      {
        align: "right",
      }
    );
    y += 6;

    // Light divider
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.1);
    doc.line(margin, y, pageWidth - margin, y);
    y += 4;
  }

  y += 5;

  // Totals section
  const totalsX = pageWidth - margin - 60;
  doc.setFontSize(10);

  // Subtotal
  doc.text("Subtotal:", totalsX, y);
  doc.text(formatCurrency(data.subtotal), pageWidth - margin - 2, y, {
    align: "right",
  });
  y += 6;

  // Tax
  if (data.taxAmount > 0) {
    doc.text("Tax:", totalsX, y);
    doc.text(formatCurrency(data.taxAmount), pageWidth - margin - 2, y, {
      align: "right",
    });
    y += 6;
  }

  // Total
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(totalsX - 5, y, pageWidth - margin, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Total:", totalsX, y);
  doc.text(formatCurrency(data.totalAmount), pageWidth - margin - 2, y, {
    align: "right",
  });
  y += 8;

  // Amount Paid
  if (data.amountPaid > 0) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(34, 197, 94);
    doc.text("Amount Paid:", totalsX, y);
    doc.text(formatCurrency(data.amountPaid), pageWidth - margin - 2, y, {
      align: "right",
    });
    y += 6;
    doc.setTextColor(0, 0, 0);
  }

  // Amount Due
  if (data.amountDue > 0) {
    doc.setFont("helvetica", "bold");
    doc.setTextColor(239, 68, 68);
    doc.text("Amount Due:", totalsX, y);
    doc.text(formatCurrency(data.amountDue), pageWidth - margin - 2, y, {
      align: "right",
    });
    doc.setTextColor(0, 0, 0);
  }

  y += 15;

  // Notes section
  if (data.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setFillColor(249, 249, 249);
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, "F");
    y += 6;
    doc.setTextColor(100, 100, 100);
    doc.text(`Notes: ${data.notes.substring(0, 200)}`, margin + 3, y);
    y += 20;
  }

  // Footer
  y = doc.internal.pageSize.getHeight() - 25;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(150, 150, 150);
  doc.text("Thank you for your business!", pageWidth / 2, y, {
    align: "center",
  });
  y += 4;
  doc.text("Questions? Contact us at support@terp.app", pageWidth / 2, y, {
    align: "center",
  });

  // Return as base64 data URI
  return doc.output("datauristring");
}

/**
 * Generate HTML version of invoice (for email/preview)
 */
export function generateInvoiceHtml(data: InvoicePdfData): string {
  const statusColors: Record<string, string> = {
    DRAFT: "#9ca3af",
    SENT: "#3b82f6",
    VIEWED: "#6366f1",
    PARTIAL: "#f59e0b",
    PAID: "#22c55e",
    OVERDUE: "#ef4444",
    VOID: "#9ca3af",
  };

  const lineItemsHtml = data.lineItems
    .map(
      item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(parseFloat(item.unitPrice))}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(parseFloat(item.lineTotal))}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; }
    .invoice { border: 1px solid #ddd; padding: 30px; }
    .header { text-align: center; margin-bottom: 30px; }
    .header h1 { margin: 0; font-size: 28px; }
    .header .invoice-number { color: #666; margin-top: 5px; }
    .status { display: inline-block; padding: 5px 15px; border-radius: 20px; color: white; font-size: 12px; font-weight: bold; }
    .dates-client { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .dates, .client { width: 45%; }
    .label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; }
    .table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .table th { background: #f5f5f5; padding: 10px; text-align: left; font-size: 12px; }
    .table th:not(:first-child) { text-align: right; }
    .totals { text-align: right; margin-top: 20px; }
    .totals .row { margin-bottom: 8px; }
    .totals .total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
    .amount-due { color: #ef4444; }
    .amount-paid { color: #22c55e; }
    .notes { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="invoice">
    <div class="header">
      <h1>INVOICE</h1>
      <p class="invoice-number">#${data.invoiceNumber}</p>
      <span class="status" style="background: ${statusColors[data.status] || "#666"}">${data.status}</span>
    </div>

    <div class="dates-client">
      <div class="dates">
        <p><span class="label">Invoice Date:</span> ${formatDate(data.invoiceDate)}</p>
        <p><span class="label">Due Date:</span> ${formatDate(data.dueDate)}</p>
      </div>
      <div class="client">
        <p class="label">Bill To:</p>
        <p><strong>${data.clientName}</strong></p>
        ${data.clientAddress ? `<p>${data.clientAddress}</p>` : ""}
        ${data.clientEmail ? `<p>${data.clientEmail}</p>` : ""}
      </div>
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Description</th>
          <th>Qty</th>
          <th>Unit Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${lineItemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="row"><span class="label">Subtotal:</span> ${formatCurrency(data.subtotal)}</div>
      ${data.taxAmount > 0 ? `<div class="row"><span class="label">Tax:</span> ${formatCurrency(data.taxAmount)}</div>` : ""}
      <div class="row total"><span>Total:</span> ${formatCurrency(data.totalAmount)}</div>
      ${data.amountPaid > 0 ? `<div class="row amount-paid"><span class="label">Amount Paid:</span> ${formatCurrency(data.amountPaid)}</div>` : ""}
      ${data.amountDue > 0 ? `<div class="row amount-due"><span class="label">Amount Due:</span> ${formatCurrency(data.amountDue)}</div>` : ""}
    </div>

    ${data.notes ? `<div class="notes"><strong>Notes:</strong> ${data.notes}</div>` : ""}

    <div class="footer">
      <p>Thank you for your business!</p>
      <p>Questions? Contact us at support@terp.app</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Get invoice data for PDF generation
 */
export async function getInvoicePdfData(
  invoiceId: number
): Promise<InvoicePdfData | null> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get invoice with client
  const [result] = await db
    .select({
      invoice: invoices,
      client: clients,
    })
    .from(invoices)
    .leftJoin(clients, eq(invoices.customerId, clients.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  if (!result) {
    return null;
  }

  // Get line items
  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, invoiceId));

  const invoice = result.invoice;
  const client = result.client;

  return {
    invoiceNumber: invoice.invoiceNumber,
    invoiceDate: invoice.invoiceDate
      ? new Date(invoice.invoiceDate)
      : new Date(),
    dueDate: invoice.dueDate ? new Date(invoice.dueDate) : new Date(),
    status: invoice.status,
    clientName: client?.name || "Unknown Client",
    clientAddress: client?.address || undefined,
    clientEmail: client?.email || undefined,
    subtotal: parseFloat(invoice.subtotal || "0"),
    taxAmount: parseFloat(invoice.taxAmount || "0"),
    totalAmount: parseFloat(invoice.totalAmount || "0"),
    amountPaid: parseFloat(invoice.amountPaid || "0"),
    amountDue: parseFloat(invoice.amountDue || "0"),
    lineItems: lineItems.map(item => ({
      description: item.description || "",
      quantity: item.quantity || "1",
      unitPrice: item.unitPrice || "0",
      lineTotal: item.lineTotal || "0",
    })),
    notes: invoice.notes || undefined,
  };
}

/**
 * Generate and return invoice PDF
 */
export async function downloadInvoicePdf(
  invoiceId: number
): Promise<{ pdfDataUri: string; filename: string; html: string } | null> {
  const data = await getInvoicePdfData(invoiceId);
  if (!data) {
    return null;
  }

  logger.info({
    msg: "[InvoicePDF] Generating PDF",
    invoiceId,
    invoiceNumber: data.invoiceNumber,
  });

  const pdfDataUri = await generateInvoicePdf(data);
  const html = generateInvoiceHtml(data);

  return {
    pdfDataUri,
    filename: `invoice-${data.invoiceNumber}.pdf`,
    html,
  };
}
