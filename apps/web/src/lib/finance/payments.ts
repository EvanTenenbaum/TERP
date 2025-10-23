import type { Prisma } from '@prisma/client';
import prisma from '../prisma';
import { ERPError } from '../errors';
import { getCurrentUserId } from '../auth';

interface ApplyPaymentInput {
  paymentId: string;
  customerId: string;
}

interface ApplyPaymentResult {
  ok: boolean;
  applied: Array<{
    invoiceId: string;
    amountApplied: number;
  }>;
  remainingBalance: number;
}

/**
 * Apply payment to customer invoices using FIFO (First In, First Out) method
 * Oldest unpaid invoices are paid first
 */
export async function applyPaymentFIFO(input: ApplyPaymentInput): Promise<ApplyPaymentResult> {
  const { paymentId, customerId } = input;
  const userId = getCurrentUserId();

  return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Fetch payment
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
    });

    if (!payment) {
      throw new ERPError('NOT_FOUND', 'payment_not_found');
    }

    if (payment.customerId !== customerId) {
      throw new ERPError('BAD_REQUEST', 'payment_customer_mismatch');
    }

    // Calculate already applied amount
    const applications = await tx.paymentApplication.findMany({
      where: { paymentId },
    });

    const totalApplied = applications.reduce((sum: number, app: any) => sum + app.amountCents, 0);
    let remainingBalance = payment.amountCents - totalApplied;

    if (remainingBalance <= 0) {
      return {
        ok: true,
        applied: [],
        remainingBalance: 0,
      };
    }

    // Fetch unpaid or partially paid invoices (FIFO order)
    const invoices = await tx.invoice.findMany({
      where: {
        customerId,
        status: { in: ['OPEN', 'PARTIAL'] },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        paymentApplications: true,
      },
    });

    const applied: Array<{ invoiceId: string; amountApplied: number }> = [];

    for (const invoice of invoices) {
      if (remainingBalance <= 0) break;

      // Calculate invoice balance
      const invoiceApplied = invoice.paymentApplications.reduce(
        (sum: number, app: any) => sum + app.amountCents,
        0
      );
      const invoiceBalance = invoice.totalCents - invoiceApplied;

      if (invoiceBalance <= 0) continue;

      // Apply payment to this invoice
      const amountToApply = Math.min(remainingBalance, invoiceBalance);

      await tx.paymentApplication.create({
        data: {
          paymentId,
          invoiceId: invoice.id,
          amountCents: amountToApply,
          createdBy: userId,
        },
      });

      // Update invoice status
      const newInvoiceBalance = invoiceBalance - amountToApply;
      const newStatus =
        newInvoiceBalance === 0 ? 'PAID' : newInvoiceBalance < invoice.totalCents ? 'PARTIAL' : 'OPEN';

      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: newStatus },
      });

      applied.push({
        invoiceId: invoice.id,
        amountApplied: amountToApply,
      });

      remainingBalance -= amountToApply;
    }

    // Update payment status
    const paymentStatus = remainingBalance === 0 ? 'APPLIED' : remainingBalance < payment.amountCents ? 'PARTIAL' : 'UNAPPLIED';
    await tx.payment.update({
      where: { id: paymentId },
      data: { status: paymentStatus },
    });

    return {
      ok: true,
      applied,
      remainingBalance,
    };
  });
}
