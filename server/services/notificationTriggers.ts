/**
 * Notification Triggers
 *
 * Service that triggers notifications for key business events.
 * Uses the notification service to create and queue notifications for users/clients.
 *
 * @module server/services/notificationTriggers
 */

import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { roles, userRoles } from "../../drizzle/schema-rbac";
import { eq, inArray } from "drizzle-orm";
import { logger } from "../_core/logger";
import { sendNotification, sendBulkNotification } from "./notificationService";
import type {
  NotificationType,
  NotificationCategory,
} from "./notificationRepository";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface OrderInfo {
  id: number;
  orderNumber: string;
  clientId: number;
  clientName?: string;
  total?: string | number;
  orderType?: string;
}

interface InvoiceInfo {
  id: number;
  invoiceNumber: string;
  clientId: number;
  clientName?: string;
  totalAmount?: string | number;
  amountDue?: string | number;
  dueDate?: Date | string | null;
}

interface PaymentInfo {
  id: number;
  paymentNumber?: string;
  clientId: number;
  clientName?: string;
  amount: string | number;
  invoiceId?: number;
  invoiceNumber?: string;
}

interface BatchInfo {
  id: number;
  batchCode?: string;
  productName?: string;
  quantity: number;
  lowStockThreshold?: number;
}

interface TaskInfo {
  id: number;
  title: string;
  assigneeId: number;
  assigneeName?: string;
  dueDate?: Date | string | null;
}

interface AppointmentInfo {
  id: number;
  title: string;
  userId: number;
  clientId?: number;
  startDate: Date | string;
  startTime?: string;
}

interface CreditInfo {
  id: number;
  creditNumber: string;
  clientId: number;
  clientName?: string;
  creditAmount: string | number;
  reason?: string;
}

interface InterestListInfo {
  id: number;
  clientId: number;
  clientName?: string;
  itemCount: number;
  totalValue?: string | number;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get user IDs by role name (uses RBAC tables)
 */
async function getUserIdsByRoleName(roleName: string): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  try {
    // First, find the role ID
    const roleRecord = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (!roleRecord[0]) return [];

    // Then get all users with that role
    const usersWithRole = await db
      .select({ userId: userRoles.userId })
      .from(userRoles)
      .where(eq(userRoles.roleId, roleRecord[0].id));

    // Convert Clerk user IDs to database user IDs
    const userClerkIds = usersWithRole.map(u => u.userId);
    if (userClerkIds.length === 0) return [];

    const userRecords = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.openId, userClerkIds));

    return userRecords.map(u => u.id);
  } catch (error) {
    logger.warn({
      msg: "[NotificationTriggers] Failed to get users by role",
      roleName,
      error: String(error),
    });
    return [];
  }
}

/**
 * Get all admin user IDs (fallback to basic admin role if RBAC not available)
 */
async function getAdminUserIds(): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  // Try RBAC first
  const rbacAdmins = await getUserIdsByRoleName("Administrator");
  if (rbacAdmins.length > 0) return rbacAdmins;

  // Fallback to basic users table role
  const basicAdmins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"));

  return basicAdmins.map(u => u.id);
}

/**
 * Get all sales user IDs
 */
async function getSalesUserIds(): Promise<number[]> {
  const admins = await getAdminUserIds();
  const sales = await getUserIdsByRoleName("Sales Rep");
  const salesManagers = await getUserIdsByRoleName("Sales Manager");
  return [...new Set([...admins, ...sales, ...salesManagers])];
}

/**
 * Get all accounting user IDs
 */
async function getAccountingUserIds(): Promise<number[]> {
  const admins = await getAdminUserIds();
  const accounting = await getUserIdsByRoleName("Accountant");
  return [...new Set([...admins, ...accounting])];
}

/**
 * Get all inventory user IDs
 */
async function getInventoryUserIds(): Promise<number[]> {
  const admins = await getAdminUserIds();
  const inventory = await getUserIdsByRoleName("Inventory Manager");
  return [...new Set([...admins, ...inventory])];
}

// ============================================================================
// ORDER TRIGGERS
// ============================================================================

/**
 * Trigger notification when a new order is created
 */
export async function onOrderCreated(order: OrderInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onOrderCreated",
    orderId: order.id,
  });

  try {
    // Notify sales team about new order
    const salesUserIds = await getSalesUserIds();

    if (salesUserIds.length > 0) {
      await sendBulkNotification(salesUserIds, {
        type: "info" as NotificationType,
        title: "New Order Created",
        message: `Order ${order.orderNumber} created for ${order.clientName || `Client #${order.clientId}`}${order.total ? ` - $${order.total}` : ""}`,
        link: `/orders/${order.id}`,
        category: "order" as NotificationCategory,
        metadata: {
          entityType: "order",
          entityId: order.id,
          orderNumber: order.orderNumber,
          clientId: order.clientId,
        },
      });
    }

    // Notify the client (VIP portal)
    await sendNotification({
      clientId: order.clientId,
      recipientType: "client",
      type: "info" as NotificationType,
      title: "Order Received",
      message: `Your order ${order.orderNumber} has been received and is being processed.`,
      link: `/orders`,
      category: "order" as NotificationCategory,
      channels: ["in_app"],
      metadata: {
        entityType: "order",
        entityId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Order created notifications sent",
      orderId: order.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send order created notifications",
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger notification when order is confirmed
 */
export async function onOrderConfirmed(order: OrderInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onOrderConfirmed",
    orderId: order.id,
  });

  try {
    // Notify the client
    await sendNotification({
      clientId: order.clientId,
      recipientType: "client",
      type: "success" as NotificationType,
      title: "Order Confirmed",
      message: `Your order ${order.orderNumber} has been confirmed.`,
      link: `/orders`,
      category: "order" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "order",
        entityId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Order confirmed notification sent",
      orderId: order.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send order confirmed notification",
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger notification when order is shipped
 */
export async function onOrderShipped(order: OrderInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onOrderShipped",
    orderId: order.id,
  });

  try {
    // Notify the client
    await sendNotification({
      clientId: order.clientId,
      recipientType: "client",
      type: "info" as NotificationType,
      title: "Order Shipped",
      message: `Your order ${order.orderNumber} has been shipped.`,
      link: `/orders`,
      category: "order" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "order",
        entityId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Order shipped notification sent",
      orderId: order.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send order shipped notification",
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger notification when order is delivered
 */
export async function onOrderDelivered(order: OrderInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onOrderDelivered",
    orderId: order.id,
  });

  try {
    // Notify the client
    await sendNotification({
      clientId: order.clientId,
      recipientType: "client",
      type: "success" as NotificationType,
      title: "Order Delivered",
      message: `Your order ${order.orderNumber} has been delivered.`,
      link: `/orders`,
      category: "order" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "order",
        entityId: order.id,
        orderNumber: order.orderNumber,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Order delivered notification sent",
      orderId: order.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send order delivered notification",
      orderId: order.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// INVOICE TRIGGERS
// ============================================================================

/**
 * Trigger notification when a new invoice is created
 */
export async function onInvoiceCreated(invoice: InvoiceInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onInvoiceCreated",
    invoiceId: invoice.id,
  });

  try {
    // Notify the client
    await sendNotification({
      clientId: invoice.clientId,
      recipientType: "client",
      type: "info" as NotificationType,
      title: "New Invoice",
      message: `Invoice ${invoice.invoiceNumber} for $${invoice.totalAmount || "0.00"} has been created.`,
      link: `/invoices`,
      category: "order" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "invoice",
        entityId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
      },
    });

    // Notify accounting team
    const accountingUserIds = await getAccountingUserIds();
    if (accountingUserIds.length > 0) {
      await sendBulkNotification(accountingUserIds, {
        type: "info" as NotificationType,
        title: "Invoice Created",
        message: `Invoice ${invoice.invoiceNumber} created for ${invoice.clientName || `Client #${invoice.clientId}`}`,
        link: `/invoices/${invoice.id}`,
        category: "order" as NotificationCategory,
        metadata: {
          entityType: "invoice",
          entityId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
        },
      });
    }

    logger.info({
      msg: "[NotificationTriggers] Invoice created notifications sent",
      invoiceId: invoice.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send invoice created notifications",
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger notification when an invoice is overdue
 */
export async function onInvoiceOverdue(invoice: InvoiceInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onInvoiceOverdue",
    invoiceId: invoice.id,
  });

  try {
    // Notify accounting team with high priority
    const accountingUserIds = await getAccountingUserIds();

    if (accountingUserIds.length > 0) {
      await sendBulkNotification(accountingUserIds, {
        type: "warning" as NotificationType,
        title: "Invoice Overdue",
        message: `Invoice ${invoice.invoiceNumber} for ${invoice.clientName || `Client #${invoice.clientId}`} is overdue. Amount due: $${invoice.amountDue || "0.00"}`,
        link: `/invoices/${invoice.id}`,
        category: "order" as NotificationCategory,
        metadata: {
          entityType: "invoice",
          entityId: invoice.id,
          invoiceNumber: invoice.invoiceNumber,
          priority: "high",
        },
      });
    }

    // Notify the client
    await sendNotification({
      clientId: invoice.clientId,
      recipientType: "client",
      type: "warning" as NotificationType,
      title: "Invoice Overdue",
      message: `Your invoice ${invoice.invoiceNumber} is now overdue. Amount due: $${invoice.amountDue || "0.00"}`,
      link: `/invoices`,
      category: "order" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "invoice",
        entityId: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        priority: "high",
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Invoice overdue notifications sent",
      invoiceId: invoice.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send invoice overdue notifications",
      invoiceId: invoice.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// PAYMENT TRIGGERS
// ============================================================================

/**
 * Trigger notification when a payment is received
 */
export async function onPaymentReceived(payment: PaymentInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onPaymentReceived",
    paymentId: payment.id,
  });

  try {
    // Notify accounting team
    const accountingUserIds = await getAccountingUserIds();

    if (accountingUserIds.length > 0) {
      await sendBulkNotification(accountingUserIds, {
        type: "success" as NotificationType,
        title: "Payment Received",
        message: `Payment of $${payment.amount} received from ${payment.clientName || `Client #${payment.clientId}`}${payment.invoiceNumber ? ` for Invoice ${payment.invoiceNumber}` : ""}`,
        link: `/payments/${payment.id}`,
        category: "order" as NotificationCategory,
        metadata: {
          entityType: "payment",
          entityId: payment.id,
          clientId: payment.clientId,
          amount: payment.amount,
        },
      });
    }

    // Notify the client
    await sendNotification({
      clientId: payment.clientId,
      recipientType: "client",
      type: "success" as NotificationType,
      title: "Payment Received",
      message: `Your payment of $${payment.amount} has been received. Thank you!`,
      link: `/payments`,
      category: "order" as NotificationCategory,
      channels: ["in_app"],
      metadata: {
        entityType: "payment",
        entityId: payment.id,
        amount: payment.amount,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Payment received notifications sent",
      paymentId: payment.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send payment received notifications",
      paymentId: payment.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// INVENTORY TRIGGERS
// ============================================================================

/**
 * Trigger notification when inventory is low
 */
export async function onInventoryLow(batch: BatchInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onInventoryLow",
    batchId: batch.id,
  });

  try {
    // Notify inventory team with high priority
    const inventoryUserIds = await getInventoryUserIds();

    if (inventoryUserIds.length > 0) {
      await sendBulkNotification(inventoryUserIds, {
        type: "warning" as NotificationType,
        title: "Low Inventory Alert",
        message: `${batch.productName || batch.batchCode || `Batch #${batch.id}`} is running low: ${batch.quantity} remaining${batch.lowStockThreshold ? ` (threshold: ${batch.lowStockThreshold})` : ""}`,
        link: `/inventory/${batch.id}`,
        category: "system" as NotificationCategory,
        metadata: {
          entityType: "batch",
          entityId: batch.id,
          batchCode: batch.batchCode,
          quantity: batch.quantity,
          priority: "high",
        },
      });
    }

    logger.info({
      msg: "[NotificationTriggers] Inventory low notification sent",
      batchId: batch.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send inventory low notification",
      batchId: batch.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger notification when a new batch is received
 */
export async function onBatchReceived(batch: BatchInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onBatchReceived",
    batchId: batch.id,
  });

  try {
    // Notify inventory team
    const inventoryUserIds = await getInventoryUserIds();

    if (inventoryUserIds.length > 0) {
      await sendBulkNotification(inventoryUserIds, {
        type: "info" as NotificationType,
        title: "New Batch Received",
        message: `New batch ${batch.batchCode || `#${batch.id}`} received: ${batch.productName || "Product"} - Qty: ${batch.quantity}`,
        link: `/inventory/${batch.id}`,
        category: "system" as NotificationCategory,
        metadata: {
          entityType: "batch",
          entityId: batch.id,
          batchCode: batch.batchCode,
          quantity: batch.quantity,
        },
      });
    }

    logger.info({
      msg: "[NotificationTriggers] Batch received notification sent",
      batchId: batch.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send batch received notification",
      batchId: batch.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// TASK TRIGGERS
// ============================================================================

/**
 * Trigger notification when a task is assigned
 */
export async function onTaskAssigned(task: TaskInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onTaskAssigned",
    taskId: task.id,
    assigneeId: task.assigneeId,
  });

  try {
    await sendNotification({
      userId: task.assigneeId,
      type: "info" as NotificationType,
      title: "Task Assigned",
      message: `You have been assigned: ${task.title}${task.dueDate ? ` (Due: ${new Date(task.dueDate).toLocaleDateString()})` : ""}`,
      link: `/tasks/${task.id}`,
      category: "system" as NotificationCategory,
      channels: ["in_app"],
      metadata: {
        entityType: "task",
        entityId: task.id,
        taskTitle: task.title,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Task assigned notification sent",
      taskId: task.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send task assigned notification",
      taskId: task.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger notification when a task is due soon
 */
export async function onTaskDueSoon(task: TaskInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onTaskDueSoon",
    taskId: task.id,
  });

  try {
    await sendNotification({
      userId: task.assigneeId,
      type: "warning" as NotificationType,
      title: "Task Due Soon",
      message: `Task "${task.title}" is due ${task.dueDate ? `on ${new Date(task.dueDate).toLocaleDateString()}` : "soon"}`,
      link: `/tasks/${task.id}`,
      category: "system" as NotificationCategory,
      channels: ["in_app"],
      metadata: {
        entityType: "task",
        entityId: task.id,
        taskTitle: task.title,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Task due soon notification sent",
      taskId: task.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send task due soon notification",
      taskId: task.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// APPOINTMENT TRIGGERS
// ============================================================================

/**
 * Trigger notification for appointment reminder
 */
export async function onAppointmentReminder(
  appointment: AppointmentInfo
): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onAppointmentReminder",
    appointmentId: appointment.id,
  });

  try {
    // Notify the user
    await sendNotification({
      userId: appointment.userId,
      type: "info" as NotificationType,
      title: "Appointment Reminder",
      message: `Reminder: ${appointment.title} ${appointment.startTime ? `at ${appointment.startTime}` : ""} on ${new Date(appointment.startDate).toLocaleDateString()}`,
      link: `/calendar?date=${new Date(appointment.startDate).toISOString().split("T")[0]}`,
      category: "appointment" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "appointment",
        entityId: appointment.id,
        appointmentTitle: appointment.title,
        startDate: appointment.startDate,
      },
    });

    // If there's a client, also notify them
    if (appointment.clientId) {
      await sendNotification({
        clientId: appointment.clientId,
        recipientType: "client",
        type: "info" as NotificationType,
        title: "Appointment Reminder",
        message: `Reminder: You have an appointment "${appointment.title}" ${appointment.startTime ? `at ${appointment.startTime}` : ""} on ${new Date(appointment.startDate).toLocaleDateString()}`,
        category: "appointment" as NotificationCategory,
        channels: ["in_app", "email"],
        metadata: {
          entityType: "appointment",
          entityId: appointment.id,
          appointmentTitle: appointment.title,
        },
      });
    }

    logger.info({
      msg: "[NotificationTriggers] Appointment reminder notifications sent",
      appointmentId: appointment.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send appointment reminder notifications",
      appointmentId: appointment.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// CREDIT TRIGGERS
// ============================================================================

/**
 * Trigger notification when a credit is issued
 */
export async function onCreditIssued(credit: CreditInfo): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onCreditIssued",
    creditId: credit.id,
  });

  try {
    // Notify the client
    await sendNotification({
      clientId: credit.clientId,
      recipientType: "client",
      type: "success" as NotificationType,
      title: "Credit Issued",
      message: `A credit of $${credit.creditAmount} has been issued to your account${credit.reason ? `: ${credit.reason}` : ""}`,
      link: `/credits`,
      category: "order" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "credit",
        entityId: credit.id,
        creditNumber: credit.creditNumber,
        creditAmount: credit.creditAmount,
      },
    });

    // Notify accounting team
    const accountingUserIds = await getAccountingUserIds();
    if (accountingUserIds.length > 0) {
      await sendBulkNotification(accountingUserIds, {
        type: "info" as NotificationType,
        title: "Credit Issued",
        message: `Credit ${credit.creditNumber} for $${credit.creditAmount} issued to ${credit.clientName || `Client #${credit.clientId}`}`,
        link: `/credits/${credit.id}`,
        category: "order" as NotificationCategory,
        metadata: {
          entityType: "credit",
          entityId: credit.id,
          creditNumber: credit.creditNumber,
        },
      });
    }

    logger.info({
      msg: "[NotificationTriggers] Credit issued notifications sent",
      creditId: credit.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send credit issued notifications",
      creditId: credit.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

// ============================================================================
// VIP PORTAL TRIGGERS
// ============================================================================

/**
 * Trigger notification when a new interest list is submitted
 */
export async function onInterestListSubmitted(
  interestList: InterestListInfo
): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onInterestListSubmitted",
    interestListId: interestList.id,
  });

  try {
    // Notify sales team
    const salesUserIds = await getSalesUserIds();

    if (salesUserIds.length > 0) {
      await sendBulkNotification(salesUserIds, {
        type: "info" as NotificationType,
        title: "New Interest List",
        message: `${interestList.clientName || `Client #${interestList.clientId}`} submitted an interest list with ${interestList.itemCount} items${interestList.totalValue ? ` ($${interestList.totalValue})` : ""}`,
        link: `/vip-portal/interest-lists/${interestList.id}`,
        category: "order" as NotificationCategory,
        metadata: {
          entityType: "interest_list",
          entityId: interestList.id,
          clientId: interestList.clientId,
          itemCount: interestList.itemCount,
        },
      });
    }

    // Notify the client
    await sendNotification({
      clientId: interestList.clientId,
      recipientType: "client",
      type: "success" as NotificationType,
      title: "Interest List Submitted",
      message: `Your interest list with ${interestList.itemCount} items has been submitted. Our team will review it shortly.`,
      category: "order" as NotificationCategory,
      channels: ["in_app"],
      metadata: {
        entityType: "interest_list",
        entityId: interestList.id,
        itemCount: interestList.itemCount,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Interest list submitted notifications sent",
      interestListId: interestList.id,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send interest list submitted notifications",
      interestListId: interestList.id,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Trigger notification when an appointment request status changes
 */
export async function onAppointmentRequestStatusChanged(
  requestId: number,
  clientId: number,
  newStatus: string,
  appointmentTypeName?: string,
  requestedSlot?: Date | string
): Promise<void> {
  logger.debug({
    msg: "[NotificationTriggers] onAppointmentRequestStatusChanged",
    requestId,
    newStatus,
  });

  try {
    const statusMessages: Record<
      string,
      { title: string; message: string; type: NotificationType }
    > = {
      approved: {
        title: "Appointment Confirmed",
        message: `Your appointment request${appointmentTypeName ? ` for "${appointmentTypeName}"` : ""} has been approved${requestedSlot ? ` for ${new Date(requestedSlot).toLocaleString()}` : ""}.`,
        type: "success" as NotificationType,
      },
      rejected: {
        title: "Appointment Not Available",
        message: `Your appointment request${appointmentTypeName ? ` for "${appointmentTypeName}"` : ""} could not be accommodated. Please select a different time.`,
        type: "warning" as NotificationType,
      },
      cancelled: {
        title: "Appointment Cancelled",
        message: `Your appointment${appointmentTypeName ? ` for "${appointmentTypeName}"` : ""} has been cancelled.`,
        type: "info" as NotificationType,
      },
    };

    const statusInfo = statusMessages[newStatus];
    if (!statusInfo) return;

    await sendNotification({
      clientId,
      recipientType: "client",
      type: statusInfo.type,
      title: statusInfo.title,
      message: statusInfo.message,
      category: "appointment" as NotificationCategory,
      channels: ["in_app", "email"],
      metadata: {
        entityType: "appointment_request",
        entityId: requestId,
        status: newStatus,
      },
    });

    logger.info({
      msg: "[NotificationTriggers] Appointment request status change notification sent",
      requestId,
      newStatus,
    });
  } catch (error) {
    logger.error({
      msg: "[NotificationTriggers] Failed to send appointment request status change notification",
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
