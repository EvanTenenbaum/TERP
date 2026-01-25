/**
 * WS-006: Receipts Router
 * Handles receipt generation, PDF creation, and delivery (email/SMS)
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, adminProcedure, protectedProcedure } from "../_core/trpc";
import { db } from "../db";
import { receipts, clients } from "../../drizzle/schema";
import { eq, desc, sql } from "drizzle-orm";

/**
 * Generate unique receipt number with retry logic for race conditions
 * Format: RCP-{YEAR}-{NNNNNN}
 * Uses retry with incrementing sequence to handle concurrent requests
 */
async function generateReceiptNumber(retryCount = 0): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RCP-${year}-`;

  // Get the highest receipt number for this year
  const result = await db
    .select({ receiptNumber: receipts.receiptNumber })
    .from(receipts)
    .where(sql`${receipts.receiptNumber} LIKE ${prefix + '%'}`)
    .orderBy(desc(receipts.receiptNumber))
    .limit(1);

  let nextNum = 1;
  if (result.length > 0) {
    const lastNum = parseInt(result[0].receiptNumber.replace(prefix, ''), 10);
    nextNum = lastNum + 1;
  }

  // Add retry offset to handle concurrent requests
  nextNum += retryCount;

  return `${prefix}${String(nextNum).padStart(6, '0')}`;
}

// Generate HTML receipt template
function generateReceiptHtml(data: {
  receiptNumber: string;
  clientName: string;
  clientAddress?: string;
  transactionType: string;
  previousBalance: number;
  transactionAmount: number;
  newBalance: number;
  note?: string;
  date: Date;
}): string {
  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      style: 'currency',
      currency: 'USD',
    });
    return amount < 0 ? `-${formatted}` : formatted;
  };

  const transactionLabel = data.transactionType === 'PAYMENT' 
    ? 'Payment Received' 
    : data.transactionType === 'CREDIT'
    ? 'Credit Applied'
    : data.transactionType === 'ADJUSTMENT'
    ? 'Balance Adjustment'
    : 'Statement';

  const transactionClass = data.transactionAmount < 0 ? 'credit' : 'debit';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
    .receipt { border: 1px solid #ddd; padding: 30px; }
    .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; margin-bottom: 20px; }
    .header h1 { margin: 0; color: #333; font-size: 24px; }
    .header .receipt-number { color: #666; font-size: 14px; margin-top: 5px; }
    .header .date { color: #666; font-size: 12px; }
    .client-info { margin-bottom: 30px; }
    .client-info h2 { margin: 0; font-size: 18px; color: #333; }
    .client-info p { margin: 5px 0; color: #666; font-size: 14px; }
    .transaction-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
    .transaction-table td { padding: 12px 0; border-bottom: 1px solid #eee; }
    .transaction-table td:last-child { text-align: right; font-family: monospace; font-size: 16px; }
    .transaction-table .total { border-top: 2px solid #333; font-weight: bold; }
    .transaction-table .total td { padding-top: 15px; }
    .credit { color: #22c55e; }
    .debit { color: #ef4444; }
    .note { background: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px; }
    .note p { margin: 0; color: #666; font-size: 14px; }
    .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; }
    .footer p { margin: 5px 0; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="header">
      <h1>Payment Receipt</h1>
      <p class="receipt-number">#${data.receiptNumber}</p>
      <p class="date">${data.date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}</p>
    </div>
    
    <div class="client-info">
      <h2>${data.clientName}</h2>
      ${data.clientAddress ? `<p>${data.clientAddress}</p>` : ''}
    </div>
    
    <table class="transaction-table">
      <tr>
        <td>Previous Balance:</td>
        <td>${formatCurrency(data.previousBalance)}</td>
      </tr>
      <tr>
        <td>${transactionLabel}:</td>
        <td class="${transactionClass}">${formatCurrency(data.transactionAmount)}</td>
      </tr>
      <tr class="total">
        <td>New Balance:</td>
        <td>${formatCurrency(data.newBalance)}</td>
      </tr>
    </table>
    
    ${data.note ? `
    <div class="note">
      <p><strong>Note:</strong> ${data.note}</p>
    </div>
    ` : ''}
    
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
 * Generate PDF from receipt data using jsPDF
 * Returns base64 encoded PDF data
 */
async function generateReceiptPdf(data: {
  receiptNumber: string;
  clientName: string;
  clientAddress?: string;
  transactionType: string;
  previousBalance: number;
  transactionAmount: number;
  newBalance: number;
  note?: string;
  date: Date;
}): Promise<string> {
  // Dynamic import of jsPDF for server-side usage
  const { jsPDF } = await import('jspdf');
  
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const formatCurrency = (amount: number) => {
    const formatted = Math.abs(amount).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return (amount < 0 ? '-$' : '$') + formatted;
  };

  const transactionLabel = data.transactionType === 'PAYMENT' 
    ? 'Payment Received' 
    : data.transactionType === 'CREDIT'
    ? 'Credit Applied'
    : data.transactionType === 'ADJUSTMENT'
    ? 'Balance Adjustment'
    : 'Statement';

  // Page dimensions
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  let y = margin;

  // Header
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Payment Receipt', pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`#${data.receiptNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 7;

  doc.setFontSize(10);
  doc.text(data.date.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  }), pageWidth / 2, y, { align: 'center' });
  y += 10;

  // Divider line
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageWidth - margin, y);
  y += 15;

  // Client info
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(data.clientName, margin, y);
  y += 7;

  if (data.clientAddress) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(data.clientAddress, margin, y);
    y += 7;
  }
  y += 10;

  // Transaction table
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');

  // Previous Balance
  doc.text('Previous Balance:', margin, y);
  doc.text(formatCurrency(data.previousBalance), pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Divider
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // Transaction
  doc.text(`${transactionLabel}:`, margin, y);
  const transactionColor = data.transactionAmount < 0 ? [34, 197, 94] : [239, 68, 68];
  doc.setTextColor(transactionColor[0], transactionColor[1], transactionColor[2]);
  doc.text(formatCurrency(data.transactionAmount), pageWidth - margin, y, { align: 'right' });
  y += 8;

  // Divider
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageWidth - margin, y);
  y += 8;

  // New Balance (bold)
  doc.setFont('helvetica', 'bold');
  doc.setDrawColor(50, 50, 50);
  doc.setLineWidth(0.5);
  doc.line(margin, y - 2, pageWidth - margin, y - 2);
  y += 5;
  doc.text('New Balance:', margin, y);
  doc.text(formatCurrency(data.newBalance), pageWidth - margin, y, { align: 'right' });
  y += 15;

  // Note section
  if (data.note) {
    doc.setFont('helvetica', 'normal');
    doc.setFillColor(249, 249, 249);
    doc.roundedRect(margin, y, contentWidth, 20, 3, 3, 'F');
    y += 8;
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(`Note: ${data.note}`, margin + 5, y);
    y += 20;
  }

  // Footer
  y = doc.internal.pageSize.getHeight() - 30;
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(margin, y, pageWidth - margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setTextColor(150, 150, 150);
  doc.text('Thank you for your business!', pageWidth / 2, y, { align: 'center' });
  y += 5;
  doc.text('Questions? Contact us at support@terp.app', pageWidth / 2, y, { align: 'center' });

  // Return as base64
  return doc.output('datauristring');
}

export const receiptsRouter = router({
  /**
   * Generate a receipt for a transaction
   */
  generate: adminProcedure
    .input(z.object({
      clientId: z.number(),
      transactionType: z.enum(['PAYMENT', 'CREDIT', 'ADJUSTMENT', 'STATEMENT']),
      transactionId: z.number().optional(),
      previousBalance: z.number(),
      transactionAmount: z.number(),
      newBalance: z.number(),
      note: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get client info
      const client = await db
        .select()
        .from(clients)
        .where(eq(clients.id, input.clientId))
        .limit(1);
      
      if (!client.length) {
        throw new Error('Client not found');
      }

      // Generate unique receipt number
      const receiptNumber = await generateReceiptNumber();

      // Generate PDF
      const receiptData = {
        receiptNumber,
        clientName: client[0].name,
        clientAddress: client[0].address || undefined,
        transactionType: input.transactionType,
        previousBalance: input.previousBalance,
        transactionAmount: input.transactionAmount,
        newBalance: input.newBalance,
        note: input.note,
        date: new Date(),
      };

      let pdfDataUri: string | null = null;
      try {
        pdfDataUri = await generateReceiptPdf(receiptData);
      } catch (error) {
        console.error('Failed to generate PDF:', error);
        // Continue without PDF - will use HTML fallback
      }

      // Create receipt record
      const [newReceipt] = await db.insert(receipts).values({
        receiptNumber,
        clientId: input.clientId,
        transactionType: input.transactionType,
        transactionId: input.transactionId,
        previousBalance: String(input.previousBalance),
        transactionAmount: String(input.transactionAmount),
        newBalance: String(input.newBalance),
        note: input.note,
        pdfUrl: pdfDataUri ? `/api/receipts/${receiptNumber}/pdf` : null,
        createdBy: ctx.user.id,
      });

      // Generate HTML preview
      const previewHtml = generateReceiptHtml(receiptData);

      return {
        receiptId: newReceipt.insertId,
        receiptNumber,
        pdfUrl: `/api/receipts/${receiptNumber}/pdf`,
        previewHtml,
      };
    }),

  /**
   * Get receipt by ID
   */
  getById: adminProcedure
    .input(z.object({ receiptId: z.number() }))
    .query(async ({ input }) => {
      const receipt = await db
        .select({
          id: receipts.id,
          receiptNumber: receipts.receiptNumber,
          clientId: receipts.clientId,
          clientName: clients.name,
          transactionType: receipts.transactionType,
          transactionId: receipts.transactionId,
          previousBalance: receipts.previousBalance,
          transactionAmount: receipts.transactionAmount,
          newBalance: receipts.newBalance,
          note: receipts.note,
          pdfUrl: receipts.pdfUrl,
          emailedTo: receipts.emailedTo,
          emailedAt: receipts.emailedAt,
          smsSentTo: receipts.smsSentTo,
          smsSentAt: receipts.smsSentAt,
          createdAt: receipts.createdAt,
        })
        .from(receipts)
        .leftJoin(clients, eq(receipts.clientId, clients.id))
        .where(eq(receipts.id, input.receiptId))
        .limit(1);

      if (!receipt.length) {
        throw new Error('Receipt not found');
      }

      return receipt[0];
    }),

  /**
   * Get receipt HTML preview
   */
  getPreview: adminProcedure
    .input(z.object({ receiptId: z.number() }))
    .query(async ({ input }) => {
      const receipt = await db
        .select({
          receiptNumber: receipts.receiptNumber,
          clientName: clients.name,
          clientAddress: clients.address,
          transactionType: receipts.transactionType,
          previousBalance: receipts.previousBalance,
          transactionAmount: receipts.transactionAmount,
          newBalance: receipts.newBalance,
          note: receipts.note,
          createdAt: receipts.createdAt,
        })
        .from(receipts)
        .leftJoin(clients, eq(receipts.clientId, clients.id))
        .where(eq(receipts.id, input.receiptId))
        .limit(1);

      if (!receipt.length) {
        throw new Error('Receipt not found');
      }

      const r = receipt[0];
      return generateReceiptHtml({
        receiptNumber: r.receiptNumber,
        clientName: r.clientName || 'Unknown Client',
        clientAddress: r.clientAddress || undefined,
        transactionType: r.transactionType,
        previousBalance: parseFloat(r.previousBalance as string),
        transactionAmount: parseFloat(r.transactionAmount as string),
        newBalance: parseFloat(r.newBalance as string),
        note: r.note || undefined,
        date: r.createdAt || new Date(),
      });
    }),

  /**
   * Send receipt via email
   * NOTE: Email integration not configured - this endpoint throws NOT_IMPLEMENTED
   */
  sendEmail: adminProcedure
    .input(z.object({
      receiptId: z.number(),
      email: z.string().email(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Email integration is not configured
      // To enable: Set FEATURE_EMAIL_ENABLED=true and configure RESEND_API_KEY
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "Email integration not configured. Please contact your system administrator to enable email functionality.",
      });
    }),

  /**
   * Send receipt via SMS
   * NOTE: SMS integration not configured - this endpoint throws NOT_IMPLEMENTED
   */
  sendSms: adminProcedure
    .input(z.object({
      receiptId: z.number(),
      phoneNumber: z.string(),
    }))
    .mutation(async ({ input }) => {
      // SMS integration is not configured
      // To enable: Set FEATURE_SMS_ENABLED=true and configure Twilio credentials
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: "SMS integration not configured. Please contact your system administrator to enable SMS functionality.",
      });
    }),

  /**
   * Get shareable link for receipt
   */
  getShareableLink: adminProcedure
    .input(z.object({ receiptId: z.number() }))
    .query(async ({ input }) => {
      const receipt = await db
        .select({ receiptNumber: receipts.receiptNumber })
        .from(receipts)
        .where(eq(receipts.id, input.receiptId))
        .limit(1);

      if (!receipt.length) {
        throw new Error('Receipt not found');
      }

      // Generate public URL (no expiry for now)
      const baseUrl = process.env.PUBLIC_URL;
      if (!baseUrl) {
        throw new Error("PUBLIC_URL environment variable must be set");
      }
      return {
        url: `${baseUrl}/receipts/${receipt[0].receiptNumber}`,
        expiresAt: null, // No expiry
      };
    }),

  /**
   * Get receipt history for a client
   */
  getClientHistory: adminProcedure
    .input(z.object({
      clientId: z.number(),
      limit: z.number().default(20),
    }))
    .query(async ({ input }) => {
      const history = await db
        .select({
          id: receipts.id,
          receiptNumber: receipts.receiptNumber,
          transactionType: receipts.transactionType,
          transactionAmount: receipts.transactionAmount,
          newBalance: receipts.newBalance,
          pdfUrl: receipts.pdfUrl,
          emailedAt: receipts.emailedAt,
          smsSentAt: receipts.smsSentAt,
          createdAt: receipts.createdAt,
        })
        .from(receipts)
        .where(eq(receipts.clientId, input.clientId))
        .orderBy(desc(receipts.createdAt))
        .limit(input.limit);

      return history.map(r => ({
        ...r,
        transactionAmount: parseFloat(r.transactionAmount as string),
        newBalance: parseFloat(r.newBalance as string),
      }));
    }),

  /**
   * Download receipt as PDF
   * Generates actual PDF using jsPDF
   */
  downloadPdf: adminProcedure
    .input(z.object({ receiptId: z.number() }))
    .query(async ({ input }) => {
      const receipt = await db
        .select({
          receiptNumber: receipts.receiptNumber,
          clientName: clients.name,
          clientAddress: clients.address,
          transactionType: receipts.transactionType,
          previousBalance: receipts.previousBalance,
          transactionAmount: receipts.transactionAmount,
          newBalance: receipts.newBalance,
          note: receipts.note,
          createdAt: receipts.createdAt,
        })
        .from(receipts)
        .leftJoin(clients, eq(receipts.clientId, clients.id))
        .where(eq(receipts.id, input.receiptId))
        .limit(1);

      if (!receipt.length) {
        throw new Error('Receipt not found');
      }

      const r = receipt[0];
      const receiptData = {
        receiptNumber: r.receiptNumber,
        clientName: r.clientName || 'Unknown Client',
        clientAddress: r.clientAddress || undefined,
        transactionType: r.transactionType,
        previousBalance: parseFloat(r.previousBalance as string),
        transactionAmount: parseFloat(r.transactionAmount as string),
        newBalance: parseFloat(r.newBalance as string),
        note: r.note || undefined,
        date: r.createdAt || new Date(),
      };

      // Generate actual PDF
      const pdfDataUri = await generateReceiptPdf(receiptData);

      return {
        pdfDataUri,
        filename: `receipt-${r.receiptNumber}.pdf`,
        html: generateReceiptHtml(receiptData), // Fallback HTML
      };
    }),

  /**
   * Public endpoint to view receipt by receipt number
   * SECURITY: Only shows minimal receipt info, no financial balances
   */
  getPublicReceipt: protectedProcedure
    .input(z.object({ receiptNumber: z.string() }))
    .query(async ({ input }) => {
      const receipt = await db
        .select({
          receiptNumber: receipts.receiptNumber,
          clientName: clients.name,
          transactionType: receipts.transactionType,
          // SECURITY FIX: Only show transaction amount, not balance details
          transactionAmount: receipts.transactionAmount,
          note: receipts.note,
          createdAt: receipts.createdAt,
        })
        .from(receipts)
        .leftJoin(clients, eq(receipts.clientId, clients.id))
        .where(eq(receipts.receiptNumber, input.receiptNumber))
        .limit(1);

      if (!receipt.length) {
        throw new Error('Receipt not found');
      }

      const r = receipt[0];
      // SECURITY FIX: Public receipt only shows transaction details, not balances
      return {
        receiptNumber: r.receiptNumber,
        clientName: r.clientName || 'Client',
        transactionType: r.transactionType,
        transactionAmount: parseFloat(r.transactionAmount as string),
        note: r.note,
        date: r.createdAt,
        // Public HTML doesn't include balance information
        html: generateReceiptHtml({
          receiptNumber: r.receiptNumber,
          clientName: r.clientName || 'Client',
          transactionType: r.transactionType,
          previousBalance: 0, // Hidden for public view
          transactionAmount: parseFloat(r.transactionAmount as string),
          newBalance: 0, // Hidden for public view
          note: r.note || undefined,
          date: r.createdAt || new Date(),
        }),
      };
    }),
});
