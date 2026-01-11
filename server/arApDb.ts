import { eq, and, gte, lte, desc, asc, sql, or, like, inArray } from "drizzle-orm";
import { getDb } from "./db";
import {
  invoices,
  invoiceLineItems,
  bills,
  billLineItems,
  payments,
  InsertInvoice,
  Invoice,
  InsertInvoiceLineItem,
  InvoiceLineItem,
  InsertBill,
  Bill,
  InsertBillLineItem,
  BillLineItem,
  InsertPayment,
  Payment,
} from "../drizzle/schema";

// ============================================================================
// INVOICES (ACCOUNTS RECEIVABLE)
// ============================================================================

/**
 * Get all invoices with optional filtering
 */
export async function getInvoices(filters?: {
  customerId?: number;
  status?: "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  searchTerm?: string;
}) {
  const db = await getDb();
  if (!db) return { invoices: [], total: 0 };

  const conditions = [];

  // Filter out soft-deleted records
  conditions.push(sql`${invoices.deletedAt} IS NULL`);

  if (filters?.customerId) {
    conditions.push(eq(invoices.customerId, filters.customerId));
  }
  if (filters?.status) {
    conditions.push(eq(invoices.status, filters.status));
  }
  if (filters?.startDate) {
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    conditions.push(sql`${invoices.invoiceDate} >= ${startDateStr}`);
  }
  if (filters?.endDate) {
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(sql`${invoices.invoiceDate} <= ${endDateStr}`);
  }
  if (filters?.searchTerm) {
    conditions.push(
      or(
        like(invoices.invoiceNumber, `%${filters.searchTerm}%`),
        like(invoices.notes, `%${filters.searchTerm}%`)
      )!
    );
  }

  let query = db.select().from(invoices);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(invoices)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const countResult = await countQuery;
  const total = Number(countResult[0]?.count || 0);

  // Apply pagination and sorting
  query = query.orderBy(desc(invoices.invoiceDate), desc(invoices.id)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }

  const invoiceList = await query;

  return { invoices: invoiceList, total };
}

/**
 * Get invoice by ID with line items
 */
export async function getInvoiceById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const invoice = await db.select().from(invoices).where(and(
    eq(invoices.id, id),
    sql`${invoices.deletedAt} IS NULL`
  )).limit(1);

  if (!invoice[0]) return null;

  const lineItems = await db
    .select()
    .from(invoiceLineItems)
    .where(eq(invoiceLineItems.invoiceId, id));

  return {
    ...invoice[0],
    lineItems,
  };
}

/**
 * Create invoice with line items
 */
export async function createInvoice(
  invoiceData: InsertInvoice,
  lineItems: Omit<InsertInvoiceLineItem, "invoiceId">[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert invoice
  const result = await db.insert(invoices).values(invoiceData);
  const invoiceId = Number(result[0].insertId);

  // Insert line items
  if (lineItems.length > 0) {
    const lineItemsWithInvoiceId = lineItems.map((item) => ({
      ...item,
      invoiceId,
    }));
    await db.insert(invoiceLineItems).values(lineItemsWithInvoiceId);
  }

  return invoiceId;
}

/**
 * Update invoice
 */
export async function updateInvoice(id: number, data: Partial<InsertInvoice>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(invoices).set(data).where(eq(invoices.id, id));
}

/**
 * Update invoice status
 */
export async function updateInvoiceStatus(
  id: number,
  status: "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(invoices).set({ status }).where(eq(invoices.id, id));
}

/**
 * Record payment for invoice
 */
export async function recordInvoicePayment(invoiceId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const invoice = await db.select().from(invoices).where(and(
    eq(invoices.id, invoiceId),
    sql`${invoices.deletedAt} IS NULL`
  )).limit(1);

  if (!invoice[0]) throw new Error("Invoice not found or deleted");

  const currentAmountPaid = Number(invoice[0].amountPaid);
  const newAmountPaid = currentAmountPaid + amount;
  const totalAmount = Number(invoice[0].totalAmount);
  const newAmountDue = totalAmount - newAmountPaid;

  // Determine new status
  let newStatus: "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID" = "PARTIAL";
  if (newAmountDue <= 0.01) {
    newStatus = "PAID";
  } else if (newAmountPaid > 0) {
    newStatus = "PARTIAL";
  }

  await db
    .update(invoices)
    .set({
      amountPaid: newAmountPaid.toFixed(2),
      amountDue: newAmountDue.toFixed(2),
      status: newStatus,
    })
    .where(eq(invoices.id, invoiceId));
}

/**
 * Get outstanding receivables (unpaid/partial invoices)
 */
export async function getOutstandingReceivables() {
  const db = await getDb();
  if (!db) return { total: 0, invoices: [] };

  const result = await db
    .select()
    .from(invoices)
    .where(
      and(
        inArray(invoices.status, ["SENT", "PARTIAL", "OVERDUE"]),
        sql`${invoices.amountDue} > 0`,
        sql`${invoices.deletedAt} IS NULL`
      )
    )
    .orderBy(asc(invoices.dueDate));

  const total = result.reduce((sum, inv) => sum + Number(inv.amountDue), 0);

  return { total, invoices: result };
}

/**
 * Calculate AR aging buckets
 * BUG-096 FIX: Improved error handling with proper error propagation
 */
export async function calculateARAging() {
  const db = await getDb();
  // BUG-096 FIX: Throw error instead of returning zeros when DB unavailable
  // This allows the frontend to properly show error state
  if (!db) {
    throw new Error("Database not available for AR aging calculation");
  }

  try {
    const today = new Date();

    const result = await db
      .select({
        invoiceId: invoices.id,
        dueDate: invoices.dueDate,
        amountDue: invoices.amountDue,
      })
      .from(invoices)
      .where(
        and(
          inArray(invoices.status, ["SENT", "PARTIAL", "OVERDUE"]),
          sql`CAST(${invoices.amountDue} AS DECIMAL(15,2)) > 0`,
          sql`${invoices.deletedAt} IS NULL`
        )
      );

    let current = 0;
    let days30 = 0;
    let days60 = 0;
    let days90 = 0;
    let days90Plus = 0;

    result.forEach((inv) => {
      const amountDue = Number(inv.amountDue) || 0;
      const dueDate = new Date(inv.dueDate);
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysPastDue < 0) {
        current += amountDue;
      } else if (daysPastDue <= 30) {
        days30 += amountDue;
      } else if (daysPastDue <= 60) {
        days60 += amountDue;
      } else if (daysPastDue <= 90) {
        days90 += amountDue;
      } else {
        days90Plus += amountDue;
      }
    });

    return { current, days30, days60, days90, days90Plus };
  } catch (error) {
    // Log the error for debugging but rethrow for frontend to handle
    console.error("[arApDb] calculateARAging error:", error);
    throw error;
  }
}

/**
 * Generate unique invoice number
 */
export async function generateInvoiceNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
    .from(invoices)
    .where(sql`${invoices.deletedAt} IS NULL`);

  const nextId = (Number(result[0]?.maxId) || 0) + 1;
  const year = new Date().getFullYear();
  return `INV-${year}-${String(nextId).padStart(6, "0")}`;
}

// ============================================================================
// BILLS (ACCOUNTS PAYABLE)
// ============================================================================

/**
 * Get all bills with optional filtering
 */
export async function getBills(filters?: {
  vendorId?: number;
  status?: "DRAFT" | "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
  searchTerm?: string;
}) {
  const db = await getDb();
  if (!db) return { bills: [], total: 0 };

  const conditions = [];

  // Filter out soft-deleted records
  conditions.push(sql`${bills.deletedAt} IS NULL`);

  if (filters?.vendorId) {
    conditions.push(eq(bills.vendorId, filters.vendorId));
  }
  if (filters?.status) {
    conditions.push(eq(bills.status, filters.status));
  }
  if (filters?.startDate) {
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    conditions.push(sql`${bills.billDate} >= ${startDateStr}`);
  }
  if (filters?.endDate) {
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(sql`${bills.billDate} <= ${endDateStr}`);
  }
  if (filters?.searchTerm) {
    conditions.push(
      or(
        like(bills.billNumber, `%${filters.searchTerm}%`),
        like(bills.notes, `%${filters.searchTerm}%`)
      )!
    );
  }

  let query = db.select().from(bills);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(bills)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const countResult = await countQuery;
  const total = Number(countResult[0]?.count || 0);

  // Apply pagination and sorting
  query = query.orderBy(desc(bills.billDate), desc(bills.id)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }

  const billList = await query;

  return { bills: billList, total };
}

/**
 * Get bill by ID with line items
 */
export async function getBillById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const bill = await db.select().from(bills).where(and(
    eq(bills.id, id),
    sql`${bills.deletedAt} IS NULL`
  )).limit(1);

  if (!bill[0]) return null;

  const lineItems = await db
    .select()
    .from(billLineItems)
    .where(eq(billLineItems.billId, id));

  return {
    ...bill[0],
    lineItems,
  };
}

/**
 * Create bill with line items
 */
export async function createBill(
  billData: InsertBill,
  lineItems: Omit<InsertBillLineItem, "billId">[]
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Insert bill
  const result = await db.insert(bills).values(billData);
  const billId = Number(result[0].insertId);

  // Insert line items
  if (lineItems.length > 0) {
    const lineItemsWithBillId = lineItems.map((item) => ({
      ...item,
      billId,
    }));
    await db.insert(billLineItems).values(lineItemsWithBillId);
  }

  return billId;
}

/**
 * Update bill
 */
export async function updateBill(id: number, data: Partial<InsertBill>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(bills).set(data).where(eq(bills.id, id));
}

/**
 * Update bill status
 */
export async function updateBillStatus(
  id: number,
  status: "DRAFT" | "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID"
) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(bills).set({ status }).where(eq(bills.id, id));
}

/**
 * Record payment for bill
 */
export async function recordBillPayment(billId: number, amount: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const bill = await db.select().from(bills).where(and(
    eq(bills.id, billId),
    sql`${bills.deletedAt} IS NULL`
  )).limit(1);

  if (!bill[0]) throw new Error("Bill not found or deleted");

  const currentAmountPaid = Number(bill[0].amountPaid);
  const newAmountPaid = currentAmountPaid + amount;
  const totalAmount = Number(bill[0].totalAmount);
  const newAmountDue = totalAmount - newAmountPaid;

  // Determine new status
  let newStatus: "DRAFT" | "PENDING" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID" = "PARTIAL";
  if (newAmountDue <= 0.01) {
    newStatus = "PAID";
  } else if (newAmountPaid > 0) {
    newStatus = "PARTIAL";
  }

  await db
    .update(bills)
    .set({
      amountPaid: newAmountPaid.toFixed(2),
      amountDue: newAmountDue.toFixed(2),
      status: newStatus,
    })
    .where(eq(bills.id, billId));
}

/**
 * Get outstanding payables (unpaid/partial bills)
 */
export async function getOutstandingPayables() {
  const db = await getDb();
  if (!db) return { total: 0, bills: [] };

  const result = await db
    .select()
    .from(bills)
    .where(
      and(
        inArray(bills.status, ["PENDING", "PARTIAL", "OVERDUE"]),
        sql`${bills.amountDue} > 0`,
        sql`${bills.deletedAt} IS NULL`
      )
    )
    .orderBy(asc(bills.dueDate));

  const total = result.reduce((sum, bill) => sum + Number(bill.amountDue), 0);

  return { total, bills: result };
}

/**
 * Calculate AP aging buckets
 * BUG-096 FIX: Improved error handling with proper error propagation
 */
export async function calculateAPAging() {
  const db = await getDb();
  // BUG-096 FIX: Throw error instead of returning zeros when DB unavailable
  // This allows the frontend to properly show error state
  if (!db) {
    throw new Error("Database not available for AP aging calculation");
  }

  try {
    const today = new Date();

    const result = await db
      .select({
        billId: bills.id,
        dueDate: bills.dueDate,
        amountDue: bills.amountDue,
      })
      .from(bills)
      .where(
        and(
          inArray(bills.status, ["PENDING", "PARTIAL", "OVERDUE"]),
          sql`CAST(${bills.amountDue} AS DECIMAL(15,2)) > 0`,
          sql`${bills.deletedAt} IS NULL`
        )
      );

    let current = 0;
    let days30 = 0;
    let days60 = 0;
    let days90 = 0;
    let days90Plus = 0;

    result.forEach((bill) => {
      const amountDue = Number(bill.amountDue) || 0;
      const dueDate = new Date(bill.dueDate);
      const daysPastDue = Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysPastDue < 0) {
        current += amountDue;
      } else if (daysPastDue <= 30) {
        days30 += amountDue;
      } else if (daysPastDue <= 60) {
        days60 += amountDue;
      } else if (daysPastDue <= 90) {
        days90 += amountDue;
      } else {
        days90Plus += amountDue;
      }
    });

    return { current, days30, days60, days90, days90Plus };
  } catch (error) {
    // Log the error for debugging but rethrow for frontend to handle
    console.error("[arApDb] calculateAPAging error:", error);
    throw error;
  }
}

/**
 * Generate unique bill number
 */
export async function generateBillNumber(): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
    .from(bills)
    .where(sql`${bills.deletedAt} IS NULL`);

  const nextId = (Number(result[0]?.maxId) || 0) + 1;
  const year = new Date().getFullYear();
  return `BILL-${year}-${String(nextId).padStart(6, "0")}`;
}

// ============================================================================
// PAYMENTS
// ============================================================================

/**
 * Get all payments with optional filtering
 */
export async function getPayments(filters?: {
  paymentType?: "RECEIVED" | "SENT";
  customerId?: number;
  vendorId?: number;
  invoiceId?: number;
  billId?: number;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { payments: [], total: 0 };

  const conditions = [];

  // Filter out soft-deleted records
  conditions.push(sql`${payments.deletedAt} IS NULL`);

  if (filters?.paymentType) {
    conditions.push(eq(payments.paymentType, filters.paymentType));
  }
  if (filters?.customerId) {
    conditions.push(eq(payments.customerId, filters.customerId));
  }
  if (filters?.vendorId) {
    conditions.push(eq(payments.vendorId, filters.vendorId));
  }
  if (filters?.invoiceId) {
    conditions.push(eq(payments.invoiceId, filters.invoiceId));
  }
  if (filters?.billId) {
    conditions.push(eq(payments.billId, filters.billId));
  }
  if (filters?.startDate) {
    const startDateStr = filters.startDate.toISOString().split("T")[0];
    conditions.push(sql`${payments.paymentDate} >= ${startDateStr}`);
  }
  if (filters?.endDate) {
    const endDateStr = filters.endDate.toISOString().split("T")[0];
    conditions.push(sql`${payments.paymentDate} <= ${endDateStr}`);
  }

  let query = db.select().from(payments);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }

  // Get total count
  const countQuery = db
    .select({ count: sql<number>`COUNT(*)` })
    .from(payments)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  const countResult = await countQuery;
  const total = Number(countResult[0]?.count || 0);

  // Apply pagination and sorting
  query = query.orderBy(desc(payments.paymentDate), desc(payments.id)) as any;

  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  if (filters?.offset) {
    query = query.offset(filters.offset) as any;
  }

  const paymentList = await query;

  return { payments: paymentList, total };
}

/**
 * Get payment by ID
 */
export async function getPaymentById(id: number) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.select().from(payments).where(and(
    eq(payments.id, id),
    sql`${payments.deletedAt} IS NULL`
  )).limit(1);
  return result[0] || null;
}

/**
 * Create payment
 */
export async function createPayment(data: InsertPayment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(payments).values(data);
  return Number(result[0].insertId);
}

/**
 * Generate unique payment number
 */
export async function generatePaymentNumber(type: "RECEIVED" | "SENT"): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db
    .select({ maxId: sql<number>`COALESCE(MAX(id), 0)` })
    .from(payments)
    .where(sql`${payments.deletedAt} IS NULL`);

  const nextId = (Number(result[0]?.maxId) || 0) + 1;
  const year = new Date().getFullYear();
  const prefix = type === "RECEIVED" ? "PMT-RCV" : "PMT-SNT";
  return `${prefix}-${year}-${String(nextId).padStart(6, "0")}`;
}

/**
 * Get payments for invoice
 */
export async function getPaymentsForInvoice(invoiceId: number) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(payments)
    .where(and(
      eq(payments.invoiceId, invoiceId),
      sql`${payments.deletedAt} IS NULL`
    ))
    .orderBy(desc(payments.paymentDate));
}

/**
 * Get payments for bill
 */
export async function getPaymentsForBill(billId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(payments)
    .where(and(
      eq(payments.billId, billId),
      sql`${payments.deletedAt} IS NULL`
    ))
    .orderBy(desc(payments.paymentDate));
}

