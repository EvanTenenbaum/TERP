/**
 * WS-006: Receipts Router
 * Handles receipt generation, PDF creation, and delivery (email/SMS)
 */

import { z } from "zod";
import { router, adminProcedure } from "../trpc";
import { db } from "../db";
import { receipts, clients, users } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

// Helper to generate unique receipt number
async function generateReceiptNumber(): Promise<string> {
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
        createdBy: ctx.user.id,
      });

      // Generate HTML preview
      const previewHtml = generateReceiptHtml({
        receiptNumber,
        clientName: client[0].name,
        clientAddress: client[0].address || undefined,
        transactionType: input.transactionType,
        previousBalance: input.previousBalance,
        transactionAmount: input.transactionAmount,
        newBalance: input.newBalance,
        note: input.note,
        date: new Date(),
      });

      // TODO: Generate PDF and upload to S3
      // For now, return placeholder URL
      const pdfUrl = `/api/receipts/${receiptNumber}/pdf`;

      return {
        receiptId: newReceipt.insertId,
        receiptNumber,
        pdfUrl,
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
   */
  sendEmail: adminProcedure
    .input(z.object({
      receiptId: z.number(),
      email: z.string().email(),
      customMessage: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      // Update receipt with email info
      await db
        .update(receipts)
        .set({
          emailedTo: input.email,
          emailedAt: new Date(),
        })
        .where(eq(receipts.id, input.receiptId));

      // TODO: Integrate with email service (SendGrid, etc.)
      // For now, just record that it was "sent"
      
      return {
        success: true,
        sentAt: new Date(),
      };
    }),

  /**
   * Send receipt via SMS
   */
  sendSms: adminProcedure
    .input(z.object({
      receiptId: z.number(),
      phoneNumber: z.string(),
    }))
    .mutation(async ({ input }) => {
      // Update receipt with SMS info
      await db
        .update(receipts)
        .set({
          smsSentTo: input.phoneNumber,
          smsSentAt: new Date(),
        })
        .where(eq(receipts.id, input.receiptId));

      // TODO: Integrate with SMS service (Twilio, etc.)
      // For now, just record that it was "sent"
      
      return {
        success: true,
        sentAt: new Date(),
      };
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
      const baseUrl = process.env.PUBLIC_URL || 'https://terp.app';
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
   * (Returns HTML for now, PDF generation to be implemented)
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
      const html = generateReceiptHtml({
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

      // TODO: Convert HTML to PDF using puppeteer or similar
      return {
        html,
        filename: `receipt-${r.receiptNumber}.pdf`,
      };
    }),
});
