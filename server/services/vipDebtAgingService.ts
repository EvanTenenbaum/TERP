/**
 * Sprint 5 Track A - Task 5.A.2: MEET-041 - VIP Debt Aging Notifications
 *
 * Service for tracking debt age and sending notifications to VIPs at 7, 14, 30 days.
 * Messages are customized based on VIP tier.
 */

import { getDb } from "../db";
import { eq, and, isNull, or } from "drizzle-orm";
import {
  clients,
  clientTransactions,
} from "../../drizzle/schema";
import {
  vipTiers,
  clientVipStatus,
} from "../../drizzle/schema-vip-portal";
import { queueNotification } from "./notificationService";

// Notification intervals in days
const NOTIFICATION_INTERVALS = [7, 14, 30];

// Message templates by tier and interval
const MESSAGE_TEMPLATES: Record<string, Record<number, { title: string; message: string }>> = {
  diamond: {
    7: {
      title: "Friendly Payment Reminder",
      message: "Hi! This is a gentle reminder that you have an invoice due in 7 days. As a Diamond VIP, we want to ensure you maintain your excellent payment record.",
    },
    14: {
      title: "Invoice Due Soon",
      message: "Your invoice has been outstanding for 14 days. As a valued Diamond VIP, please let us know if you need any assistance or payment arrangements.",
    },
    30: {
      title: "Action Required: Invoice Past Due",
      message: "Your invoice is now 30 days past due. As a Diamond VIP, please reach out to your dedicated rep to discuss payment options.",
    },
  },
  platinum: {
    7: {
      title: "Friendly Payment Reminder",
      message: "Hi! This is a gentle reminder that you have an invoice due in 7 days. As a Platinum VIP, we appreciate your timely payments.",
    },
    14: {
      title: "Invoice Due Soon",
      message: "Your invoice has been outstanding for 14 days. Please arrange payment at your earliest convenience to maintain your Platinum status.",
    },
    30: {
      title: "Action Required: Invoice Past Due",
      message: "Your invoice is now 30 days past due. Please contact us to discuss payment options and protect your Platinum VIP status.",
    },
  },
  gold: {
    7: {
      title: "Payment Reminder",
      message: "This is a reminder that you have an invoice due in 7 days. Timely payments help you advance to higher VIP tiers.",
    },
    14: {
      title: "Invoice Due Soon",
      message: "Your invoice has been outstanding for 14 days. Please arrange payment soon to maintain your Gold VIP benefits.",
    },
    30: {
      title: "Action Required: Invoice Past Due",
      message: "Your invoice is now 30 days past due. Please contact us immediately to discuss payment options.",
    },
  },
  silver: {
    7: {
      title: "Payment Reminder",
      message: "This is a reminder that you have an invoice due in 7 days.",
    },
    14: {
      title: "Invoice Reminder",
      message: "Your invoice has been outstanding for 14 days. Please arrange payment at your earliest convenience.",
    },
    30: {
      title: "Action Required: Invoice Past Due",
      message: "Your invoice is now 30 days past due. Please contact us to discuss payment options.",
    },
  },
  bronze: {
    7: {
      title: "Payment Reminder",
      message: "This is a reminder that you have an invoice due in 7 days.",
    },
    14: {
      title: "Invoice Reminder",
      message: "Your invoice has been outstanding for 14 days. Please arrange payment at your earliest convenience.",
    },
    30: {
      title: "Action Required: Invoice Past Due",
      message: "Your invoice is now 30 days past due. Immediate payment is required to avoid account restrictions.",
    },
  },
  default: {
    7: {
      title: "Payment Reminder",
      message: "This is a reminder that you have an invoice due in 7 days.",
    },
    14: {
      title: "Invoice Reminder",
      message: "Your invoice has been outstanding for 14 days. Please arrange payment.",
    },
    30: {
      title: "Action Required: Invoice Past Due",
      message: "Your invoice is now 30 days past due. Please contact us immediately.",
    },
  },
};

export interface DebtAgingInfo {
  clientId: number;
  clientName: string;
  invoiceId: number;
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  amount: number;
  daysOverdue: number;
  tierName: string;
}

export interface DebtNotificationResult {
  sent: number;
  skipped: number;
  errors: number;
  details: {
    clientId: number;
    invoiceId: number;
    daysOverdue: number;
    notificationType: number;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Get message template for a tier and interval
 */
function getMessageTemplate(tierName: string, daysOverdue: number): { title: string; message: string } {
  const tierTemplates = MESSAGE_TEMPLATES[tierName.toLowerCase()] || MESSAGE_TEMPLATES.default;

  // Find the appropriate interval (7, 14, or 30)
  let interval = 30; // Default to 30
  for (const int of NOTIFICATION_INTERVALS) {
    if (daysOverdue <= int + 1) { // Allow 1 day buffer
      interval = int;
      break;
    }
  }

  return tierTemplates[interval] || MESSAGE_TEMPLATES.default[interval];
}

/**
 * Check which interval notifications should be sent for
 */
function getNotificationInterval(daysOverdue: number): number | null {
  // Return the interval if the debt age matches (within 1 day buffer)
  for (const interval of NOTIFICATION_INTERVALS) {
    if (daysOverdue >= interval && daysOverdue <= interval + 1) {
      return interval;
    }
  }
  return null;
}

/**
 * Get all VIP clients with aging debt (invoices past their due date)
 *
 * Due date is calculated as: transactionDate + paymentTerms (default 30 days)
 * Only returns invoices that are actually OVERDUE (daysOverdue > 0)
 */
export async function getVipClientsWithAgingDebt(): Promise<DebtAgingInfo[]> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();

  // Get all outstanding invoices for VIP clients
  // We fetch all non-paid invoices and filter for overdue in application logic
  // (because due date = transactionDate + paymentTerms requires calculation)
  const allOutstandingInvoices = await db
    .select({
      clientId: clients.id,
      clientName: clients.name,
      invoiceId: clientTransactions.id,
      invoiceNumber: clientTransactions.transactionNumber,
      transactionDate: clientTransactions.transactionDate,
      paymentTerms: clients.paymentTerms,
      amount: clientTransactions.amount,
      tierName: vipTiers.name,
    })
    .from(clientTransactions)
    .innerJoin(clients, eq(clientTransactions.clientId, clients.id))
    .leftJoin(clientVipStatus, eq(clients.id, clientVipStatus.clientId))
    .leftJoin(vipTiers, eq(clientVipStatus.currentTierId, vipTiers.id))
    .where(
      and(
        eq(clients.vipPortalEnabled, true),
        eq(clientTransactions.transactionType, "INVOICE"),
        or(
          eq(clientTransactions.paymentStatus, "PENDING"),
          eq(clientTransactions.paymentStatus, "OVERDUE"),
          eq(clientTransactions.paymentStatus, "PARTIAL")
        ),
        isNull(clients.deletedAt)
      )
    );

  // Process invoices and calculate overdue status
  const processedInvoices = allOutstandingInvoices.map((row) => {
    // Calculate due date from transaction date + payment terms (default 30 days)
    // Payment terms of 0 or null defaults to 30 days (NET_30)
    const paymentTermsDays = row.paymentTerms || 30;
    const transactionDate = new Date(row.transactionDate);
    const dueDate = new Date(transactionDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    // Calculate days overdue (negative means not yet due)
    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      clientId: row.clientId,
      clientName: row.clientName || "Unknown",
      invoiceId: row.invoiceId,
      invoiceNumber: row.invoiceNumber || `INV-${row.invoiceId}`,
      invoiceDate: transactionDate,
      dueDate,
      amount: parseFloat(String(row.amount || "0")),
      daysOverdue, // Keep raw value for filtering
      tierName: row.tierName || "default",
    };
  });

  // Filter to only include ACTUALLY OVERDUE invoices (daysOverdue > 0)
  // and normalize daysOverdue to 0 minimum for display
  return processedInvoices
    .filter((invoice) => invoice.daysOverdue > 0)
    .map((invoice) => ({
      ...invoice,
      daysOverdue: Math.max(0, invoice.daysOverdue),
    }));
}

/**
 * Send debt aging notifications to VIP clients
 */
export async function sendDebtAgingNotifications(): Promise<DebtNotificationResult> {
  const agingDebt = await getVipClientsWithAgingDebt();

  const result: DebtNotificationResult = {
    sent: 0,
    skipped: 0,
    errors: 0,
    details: [],
  };

  for (const debt of agingDebt) {
    const interval = getNotificationInterval(debt.daysOverdue);

    if (!interval) {
      // Not at a notification interval, skip
      result.skipped++;
      continue;
    }

    try {
      const template = getMessageTemplate(debt.tierName, debt.daysOverdue);

      // Personalize the message
      const personalizedMessage = template.message
        .replace("{clientName}", debt.clientName)
        .replace("{invoiceNumber}", debt.invoiceNumber)
        .replace("{amount}", `$${debt.amount.toLocaleString()}`)
        .replace("{daysOverdue}", debt.daysOverdue.toString());

      await queueNotification({
        clientId: debt.clientId,
        recipientType: "client",
        type: interval === 30 ? "error" : interval === 14 ? "warning" : "info",
        title: template.title,
        message: personalizedMessage,
        link: `/vip-portal/invoices/${debt.invoiceId}`,
        channels: ["in_app", "email"],
        category: "order",
        metadata: {
          invoiceId: debt.invoiceId,
          invoiceNumber: debt.invoiceNumber,
          amount: debt.amount,
          daysOverdue: debt.daysOverdue,
          notificationType: "debt_aging",
          notificationInterval: interval,
          tierName: debt.tierName,
        },
      });

      result.sent++;
      result.details.push({
        clientId: debt.clientId,
        invoiceId: debt.invoiceId,
        daysOverdue: debt.daysOverdue,
        notificationType: interval,
        success: true,
      });
    } catch (error) {
      result.errors++;
      result.details.push({
        clientId: debt.clientId,
        invoiceId: debt.invoiceId,
        daysOverdue: debt.daysOverdue,
        notificationType: interval || 0,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return result;
}

/**
 * Get debt aging summary for a specific client
 */
export async function getClientDebtAgingSummary(clientId: number): Promise<{
  totalOutstanding: number;
  invoiceCount: number;
  agingBuckets: {
    current: number;
    days1to7: number;
    days8to14: number;
    days15to30: number;
    days31plus: number;
  };
  invoices: {
    invoiceId: number;
    invoiceNumber: string;
    amount: number;
    dueDate: Date;
    daysOverdue: number;
  }[];
}> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const today = new Date();

  // Get client's payment terms for due date calculation
  const [client] = await db
    .select({ paymentTerms: clients.paymentTerms })
    .from(clients)
    .where(eq(clients.id, clientId));

  const paymentTermsDays = client?.paymentTerms || 30;

  const invoices = await db
    .select({
      invoiceId: clientTransactions.id,
      invoiceNumber: clientTransactions.transactionNumber,
      amount: clientTransactions.amount,
      transactionDate: clientTransactions.transactionDate,
    })
    .from(clientTransactions)
    .where(
      and(
        eq(clientTransactions.clientId, clientId),
        eq(clientTransactions.transactionType, "INVOICE"),
        or(
          eq(clientTransactions.paymentStatus, "PENDING"),
          eq(clientTransactions.paymentStatus, "OVERDUE"),
          eq(clientTransactions.paymentStatus, "PARTIAL")
        )
      )
    );

  const agingBuckets = {
    current: 0,
    days1to7: 0,
    days8to14: 0,
    days15to30: 0,
    days31plus: 0,
  };

  const processedInvoices = invoices.map((inv) => {
    // Calculate due date from transaction date + payment terms
    const transactionDate = new Date(inv.transactionDate);
    const dueDate = new Date(transactionDate);
    dueDate.setDate(dueDate.getDate() + paymentTermsDays);

    const daysOverdue = Math.floor(
      (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const amount = parseFloat(String(inv.amount || "0"));

    // Categorize into buckets
    if (daysOverdue <= 0) {
      agingBuckets.current += amount;
    } else if (daysOverdue <= 7) {
      agingBuckets.days1to7 += amount;
    } else if (daysOverdue <= 14) {
      agingBuckets.days8to14 += amount;
    } else if (daysOverdue <= 30) {
      agingBuckets.days15to30 += amount;
    } else {
      agingBuckets.days31plus += amount;
    }

    return {
      invoiceId: inv.invoiceId,
      invoiceNumber: inv.invoiceNumber || `INV-${inv.invoiceId}`,
      amount,
      dueDate,
      daysOverdue: Math.max(0, daysOverdue),
    };
  });

  const totalOutstanding = processedInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  return {
    totalOutstanding,
    invoiceCount: processedInvoices.length,
    agingBuckets,
    invoices: processedInvoices.sort((a, b) => b.daysOverdue - a.daysOverdue),
  };
}

/**
 * Get next scheduled notification for a client
 */
export async function getNextScheduledNotification(clientId: number): Promise<{
  invoiceId: number;
  invoiceNumber: string;
  daysUntilNotification: number;
  notificationInterval: number;
} | null> {
  const summary = await getClientDebtAgingSummary(clientId);

  if (summary.invoices.length === 0) {
    return null;
  }

  // Find the oldest overdue invoice
  const oldestInvoice = summary.invoices[0];

  // Determine next notification interval
  for (const interval of NOTIFICATION_INTERVALS) {
    if (oldestInvoice.daysOverdue < interval) {
      return {
        invoiceId: oldestInvoice.invoiceId,
        invoiceNumber: oldestInvoice.invoiceNumber,
        daysUntilNotification: interval - oldestInvoice.daysOverdue,
        notificationInterval: interval,
      };
    }
  }

  // Already past all intervals
  return null;
}
